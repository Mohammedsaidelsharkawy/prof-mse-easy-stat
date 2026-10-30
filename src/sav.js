/* Prof MSE Easy Stat — SPSS system file (.sav) reader: data, variable labels, value labels, missing values, dates */
const Sav = (() => {
  const SYSMIS = -Number.MAX_VALUE;
  // print-format types that hold dates (seconds since 14 Oct 1582) and date-times
  const DATE_FMT = new Set([20, 22, 23, 24, 28, 29, 38, 39]), DATETIME_FMT = new Set([30]);
  const GREG = Date.UTC(1582, 9, 14) / 1000;

  // .zsav: the data after the dictionary are zlib blocks listed in a trailer; they are inflated and read like a byte-compressed .sav
  async function readAny(buf) {
    const dv = new DataView(buf), lc = dv.getInt32(64, true), le = lc === 2 || lc === 3;
    if (dv.getInt32(72, le) !== 2) return read(buf);
    const r = read(buf, true), u8 = new Uint8Array(buf), at = r.dataStart;
    const big = o => Number(dv.getBigInt64(o, le)), trailerOfs = big(at + 8);
    const nBlocks = dv.getInt32(trailerOfs + 20, le), parts = [];
    for (let k = 0; k < nBlocks; k++) {
      const e = trailerOfs + 24 + k * 24, cofs = big(e + 8), csize = dv.getInt32(e + 20, le);
      const stream = new Blob([u8.subarray(cofs, cofs + csize)]).stream().pipeThrough(new DecompressionStream('deflate'));
      parts.push(new Uint8Array(await new Response(stream).arrayBuffer()));
    }
    const len = parts.reduce((a, p) => a + p.length, 0), data = new Uint8Array(at + len);
    data.set(u8.subarray(0, at)); let o = at; parts.forEach(p => { data.set(p, o); o += p.length; });
    new DataView(data.buffer).setInt32(72, 1, le); // now byte-compressed data straight after the dictionary
    return read(data.buffer);
  }
  function read(buf, dictOnly) {
    const dv = new DataView(buf), u8 = new Uint8Array(buf);
    let pos = 0;
    const ascii = (p, n) => String.fromCharCode(...u8.subarray(p, p + n));
    const magic = ascii(0, 4);
    if (magic !== '$FL2' && magic !== '$FL3') throw new Error('not an SPSS .sav file');
    // the layout code is 2 or 3; when it reads otherwise the file was written on a big-endian machine
    let le = true; { const lc = dv.getInt32(64, true); if (lc !== 2 && lc !== 3) le = false; }
    const i32 = () => { const v = dv.getInt32(pos, le); pos += 4; return v; };
    const f64 = () => { const v = dv.getFloat64(pos, le); pos += 8; return v; };
    const bytes = n => { const b = u8.subarray(pos, pos + n); pos += n; return b; };
    pos = 72;
    const compression = i32(); i32(); /* weight index */ const ncases = i32(); const bias = f64();
    if (compression === 2 && !dictOnly) throw new Error('a .zsav file is read with readAny');
    pos = 176;
    const vars = []; // one entry per 8-byte slot
    const valueLabelSets = [], extras = {};
    let encoding = 'windows-1252';
    for (;;) {
      const rec = i32();
      if (rec === 2) {
        const type = i32(), hasLabel = i32(), nMiss = i32(), print = i32(); i32();
        const name = ascii(pos, 8).trim(); pos += 8;
        let label = null;
        if (hasLabel) { const len = i32(); label = bytes(len); pos += (4 - (len % 4)) % 4; }
        const miss = [];
        for (let k = 0; k < Math.abs(nMiss); k++) miss.push(f64());
        vars.push({ type, name, labelBytes: label, nMiss, miss, fmt: (print >> 16) & 0xff });
      } else if (rec === 3) {
        const n = i32(), labs = [];
        for (let k = 0; k < n; k++) { const raw = u8.slice(pos, pos + 8), val = dv.getFloat64(pos, le); pos += 8; const len = u8[pos]; pos += 1; const lb = bytes(len); pos += (8 - ((len + 1) % 8)) % 8; labs.push({ raw, val, lb }); }
        if (i32() !== 4) throw new Error('damaged value labels');
        const nv = i32(), idx = []; for (let k = 0; k < nv; k++) idx.push(i32());
        valueLabelSets.push({ labs, idx });
      } else if (rec === 6) { const n = i32(); pos += 80 * n; }
      else if (rec === 7) {
        const sub = i32(), size = i32(), count = i32(), data = u8.subarray(pos, pos + size * count); pos += size * count;
        extras[sub] = data;
      } else if (rec === 999) { i32(); if (dictOnly) return { dataStart: pos }; break; }
      else throw new Error('unexpected record ' + rec + ' in the dictionary');
    }
    if (extras[20]) { const e = new TextDecoder('ascii').decode(extras[20]).trim(); if (e) encoding = /^utf-?8$/i.test(e) ? 'utf-8' : e.toLowerCase(); }
    let dec; try { dec = new TextDecoder(encoding); } catch (e) { dec = new TextDecoder('windows-1252'); }
    const str = b => dec.decode(b).replace(/\0+$/, '').replace(/\s+$/, '');
    // long names (record 7.13) and very long strings (7.14)
    const longName = {};
    if (extras[13]) dec.decode(extras[13]).split('\t').forEach(p => { const i = p.indexOf('='); if (i > 0) longName[p.slice(0, i).trim()] = p.slice(i + 1).replace(/\0/g, '').trim(); });
    const vlsWidth = {};
    if (extras[14]) dec.decode(extras[14]).split(/[\0\t]+/).forEach(p => { const i = p.indexOf('='); if (i > 0) vlsWidth[p.slice(0, i).trim()] = +p.slice(i + 1); });
    // variables: a string longer than 8 takes continuation slots (type −1)
    const cols = [];
    vars.forEach((v, slot) => {
      if (v.type === -1) { cols[cols.length - 1].slots++; return; }
      cols.push({ short: v.name, name: longName[v.name] || v.name, string: v.type > 0, width: v.type, slot, slots: 1, label: v.labelBytes ? str(v.labelBytes) : '', nMiss: v.nMiss, miss: v.miss, fmt: v.fmt, segOf: null });
    });
    // very long strings are stored as segments of 255 bytes: the first segment carries the name, the rest are joined to it
    Object.entries(vlsWidth).forEach(([short, w]) => {
      const i = cols.findIndex(c => c.short === short); if (i < 0) return;
      const nseg = Math.ceil(w / 252);
      for (let k = 1; k < nseg && cols[i + k]; k++) cols[i + k].segOf = i;
    });
    // value labels: indices are 1-based slot numbers
    const valueLabels = {};
    valueLabelSets.forEach(({ labs, idx }) => idx.forEach(si => {
      const c = cols.find(x => x.slot === si - 1); if (!c) return;
      const m = valueLabels[c.name] = valueLabels[c.name] || {};
      labs.forEach(l => { const key = c.string ? str(l.raw) : fmtNum(l.val); m[key] = str(l.lb); });
    }));
    // data: one case = all slots; bytecode compression packs small integers, spaces and system-missing in command bytes
    const nslots = vars.length, cases = [];
    const readCase = (() => {
      if (compression !== 1) return () => { if (pos + nslots * 8 > u8.length) return null; const out = []; for (let s = 0; s < nslots; s++) out.push(u8.subarray(pos + s * 8, pos + s * 8 + 8)); pos += nslots * 8; return out; };
      let cmds = [], ci = 8, done = false;
      return () => {
        const out = [];
        while (out.length < nslots) {
          if (ci >= 8) { if (pos + 8 > u8.length) return null; cmds = u8.subarray(pos, pos + 8); pos += 8; ci = 0; }
          const c = cmds[ci++];
          if (c === 0) continue;
          if (c === 252) { done = true; return null; }
          if (c === 253) { out.push(u8.subarray(pos, pos + 8)); pos += 8; continue; }
          const b = new Uint8Array(8), d = new DataView(b.buffer);
          if (c === 254) b.fill(32); else if (c === 255) d.setFloat64(0, SYSMIS, le); else d.setFloat64(0, c - bias, le);
          out.push(b);
        }
        return done ? null : out;
      };
    })();
    const total = ncases >= 0 ? ncases : Infinity;
    for (let n = 0; n < total; n++) { const cs = readCase(); if (!cs) break; cases.push(cs); }
    const numOf = b => new DataView(b.buffer, b.byteOffset, 8).getFloat64(0, le);
    const isMiss = (c, v) => {
      if (v === SYSMIS || !isFinite(v)) return true;
      if (c.nMiss > 0) return c.miss.includes(v);
      if (c.nMiss === -2) return v >= c.miss[0] && v <= c.miss[1];
      if (c.nMiss === -3) return (v >= c.miss[0] && v <= c.miss[1]) || v === c.miss[2];
      return false;
    };
    const keep = cols.filter(c => c.segOf === null);
    const headers = keep.map(c => c.name);
    const rows = cases.map(cs => {
      const o = {};
      keep.forEach(c => {
        if (c.string) {
          const parts = [c, ...cols.filter(x => x.segOf === cols.indexOf(c))];
          const s = parts.map(p => { const all = new Uint8Array(p.slots * 8); for (let k = 0; k < p.slots; k++) all.set(cs[p.slot + k], k * 8); return dec.decode(all.subarray(0, Math.min(p.width, all.length))).replace(/\0+$/, ''); }).join('').replace(/\s+$/, '');
          o[c.name] = s === '' ? null : s;
        } else {
          const v = numOf(cs[c.slot]);
          o[c.name] = isMiss(c, v) ? null : DATE_FMT.has(c.fmt) ? isoDate(v, false) : DATETIME_FMT.has(c.fmt) ? isoDate(v, true) : v;
        }
      });
      return o;
    });
    const varLabels = Object.fromEntries(keep.filter(c => c.label).map(c => [c.name, c.label]));
    return { headers, rows, varLabels, valueLabels, encoding, compressed: compression === 1 };
  }
  const fmtNum = v => Number.isInteger(v) ? String(v) : String(+v.toPrecision(12));
  function isoDate(v, time) {
    const d = new Date((GREG + v) * 1000);
    if (isNaN(d)) return null;
    const p = n => String(n).padStart(2, '0'), day = `${d.getUTCFullYear()}-${p(d.getUTCMonth() + 1)}-${p(d.getUTCDate())}`;
    return time ? `${day} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}` : day;
  }
  return { read, readAny };
})();
if (typeof module !== 'undefined') module.exports = Sav;

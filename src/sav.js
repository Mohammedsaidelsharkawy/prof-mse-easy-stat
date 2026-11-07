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
  // Stata .dta (releases 113-115 and 117-119): data, variable labels and value labels, in the same shape as an SPSS file
  function readDta(buf) {
    const u8 = new Uint8Array(buf), dv = new DataView(buf), dec = new TextDecoder('utf-8'), dec1 = new TextDecoder('windows-1252');
    const str = (o, n, enc) => { let e = o; while (e < o + n && u8[e]) e++; return (enc || dec).decode(u8.subarray(o, e)); };
    const isNew = str(0, 11) === '<stata_dta>';
    let le, rel, K, N, pos, types, names, vlNames, vLabels, dataStart, vlStart, strlStart, nameLen, fmtLen, lblLen, isStrL;
    const find = (tag, from) => { const t = new TextEncoder().encode(tag); outer: for (let i = from || 0; i < u8.length - t.length; i++) { for (let j = 0; j < t.length; j++) if (u8[i + j] !== t[j]) continue outer; return i; } return -1; };
    if (isNew) {
      rel = +str(find('<release>') + 9, 3); le = str(find('<byteorder>') + 11, 3) === 'LSF';
      const k0 = find('<K>') + 3; K = rel === 119 ? dv.getUint32(k0, le) : dv.getUint16(k0, le);
      const n0 = find('<N>') + 3; N = rel === 117 ? dv.getUint32(n0, le) : Number(dv.getBigUint64(n0, le));
      const m0 = find('<map>') + 5, map = Array.from({ length: 14 }, (_, i) => Number(dv.getBigUint64(m0 + 8 * i, le)));
      nameLen = rel === 117 ? 33 : 129; fmtLen = rel === 117 ? 49 : 57; lblLen = rel === 117 ? 81 : 321;
      pos = map[2] + 16; types = Array.from({ length: K }, (_, i) => dv.getUint16(pos + 2 * i, le));
      pos = map[3] + 10; names = Array.from({ length: K }, (_, i) => str(pos + nameLen * i, nameLen));
      pos = map[6] + 19; vlNames = Array.from({ length: K }, (_, i) => str(pos + nameLen * i, nameLen));
      pos = map[7] + 17; vLabels = Array.from({ length: K }, (_, i) => str(pos + lblLen * i, lblLen));
      dataStart = map[9] + 6; strlStart = map[10]; vlStart = map[11];
      isStrL = t => t === 32768;
    } else {
      rel = u8[0]; if (rel < 113 || rel > 115) throw new Error(`Stata release ${rel} is not supported (save it as Stata 13 or later)`);
      le = u8[1] === 2; K = dv.getUint16(4, le); N = dv.getUint32(6, le); pos = 10 + 81 + 18;
      types = Array.from(u8.subarray(pos, pos + K)); pos += K;
      names = Array.from({ length: K }, (_, i) => str(pos + 33 * i, 33, dec1)); pos += 33 * K + 2 * (K + 1) + (rel === 113 ? 12 : 49) * K;
      vlNames = Array.from({ length: K }, (_, i) => str(pos + 33 * i, 33, dec1)); pos += 33 * K;
      vLabels = Array.from({ length: K }, (_, i) => str(pos + 81 * i, 81, dec1)); pos += 81 * K;
      for (;;) { const t = u8[pos], len = dv.getInt32(pos + 1, le); pos += 5; if (t === 0 && len === 0) break; pos += len; }
      dataStart = pos; isStrL = () => false;
      // old type codes → the new ones
      types = types.map(t => t <= 244 ? t : { 251: 65530, 252: 65529, 253: 65528, 254: 65527, 255: 65526 }[t]);
    }
    const width = t => t <= 2045 ? t : t === 32768 ? 8 : { 65526: 8, 65527: 4, 65528: 4, 65529: 2, 65530: 1 }[t];
    const rowLen = types.reduce((a, t) => a + width(t), 0), enc = isNew && rel >= 118 ? dec : dec1;
    // long strings (strL) are stored once and referenced by (variable, observation)
    const strls = new Map();
    if (isNew && types.some(isStrL)) {
      let o = strlStart + 7;
      while (str(o, 3) === 'GSO') { const v = dv.getUint32(o + 3, le), ob = rel === 117 ? dv.getUint32(o + 7, le) : Number(dv.getBigUint64(o + 7, le)), q = o + 3 + 4 + (rel === 117 ? 4 : 8), t = u8[q], len = dv.getUint32(q + 1, le);
        strls.set(`${v},${ob}`, t === 130 ? str(q + 5, len, enc) : enc.decode(u8.subarray(q + 5, q + 5 + len))); o = q + 5 + len; }
    }
    const rows = [];
    for (let r = 0; r < N; r++) {
      let o = dataStart + r * rowLen; const row = {};
      types.forEach((t, j) => {
        let v = null;
        if (t <= 2045) { v = str(o, t, enc); if (v === '') v = null; }
        else if (t === 32768) { const vv = rel === 117 ? dv.getUint32(o, le) : dv.getUint16(o, le), ob = rel === 117 ? dv.getUint32(o + 4, le) : Number(BigInt(dv.getUint32(o + 2, le)) | (BigInt(dv.getUint16(o + 6, le)) << 32n)); v = strls.get(`${vv},${ob}`) ?? null; if (v === '') v = null; }
        else if (t === 65526) { v = dv.getFloat64(o, le); if (!(v < 8.98846567431158e307)) v = null; }
        else if (t === 65527) { v = dv.getFloat32(o, le); if (!(v < 1.7014118e38)) v = null; else v = +v.toPrecision(7); }
        else if (t === 65528) { v = dv.getInt32(o, le); if (v > 2147483620) v = null; }
        else if (t === 65529) { v = dv.getInt16(o, le); if (v > 32740) v = null; }
        else if (t === 65530) { v = dv.getInt8(o); if (v > 100) v = null; }
        row[names[j]] = v; o += width(t);
      });
      rows.push(row);
    }
    // value-label tables
    const tables = {};
    let o = isNew ? vlStart + 14 : dataStart + N * rowLen;
    while (o + 8 < u8.length) {
      if (isNew) { if (str(o, 5) !== '<lbl>') break; o += 5; }
      const len = dv.getInt32(o, le); if (!(len > 0)) break;
      const name = str(o + 4, isNew ? nameLen : 33, enc), t0 = o + 4 + (isNew ? nameLen : 33) + 3, n = dv.getInt32(t0, le), txtLen = dv.getInt32(t0 + 4, le);
      const offs = Array.from({ length: n }, (_, i) => dv.getInt32(t0 + 8 + 4 * i, le)), vals = Array.from({ length: n }, (_, i) => dv.getInt32(t0 + 8 + 4 * n + 4 * i, le)), tx = t0 + 8 + 8 * n;
      tables[name] = Object.fromEntries(vals.map((v, i) => [String(v), str(tx + offs[i], txtLen - offs[i], enc)]));
      o = t0 + len; if (isNew) o += 6;
    }
    const valueLabels = {}, varLabels = {};
    names.forEach((nm, j) => { if (vLabels[j]) varLabels[nm] = vLabels[j]; if (vlNames[j] && tables[vlNames[j]]) valueLabels[nm] = tables[vlNames[j]]; });
    return { headers: names, rows, varLabels, valueLabels, encoding: isNew && rel >= 118 ? 'utf-8' : 'windows-1252', release: rel };
  }
  // a password-protected .xlsx (Office 2010 and later, "agile" encryption): the workbook inside, decrypted with the browser's AES and SHA
  function isEncryptedOoxml(buf) {
    const u8 = new Uint8Array(buf); if (!(u8[0] === 0xD0 && u8[1] === 0xCF && u8[2] === 0x11 && u8[3] === 0xE0)) return false;
    try { const c = XLSX.CFB.read(u8, { type: 'array' }); return !!XLSX.CFB.find(c, 'EncryptionInfo') && !!XLSX.CFB.find(c, 'EncryptedPackage'); } catch (e) { return false; }
  }
  async function decryptOoxml(buf, password) {
    const subtle = (globalThis.crypto || {}).subtle; if (!subtle) throw new Error('this browser cannot decrypt files here');
    const c = XLSX.CFB.read(new Uint8Array(buf), { type: 'array' }), info = new Uint8Array(XLSX.CFB.find(c, 'EncryptionInfo').content), pkg = new Uint8Array(XLSX.CFB.find(c, 'EncryptedPackage').content);
    const vMaj = info[0] | (info[1] << 8), vMin = info[2] | (info[3] << 8);
    if (!(vMaj === 4 && vMin === 4)) throw new Error('only Office 2010+ encryption is supported — open the file in Excel and save it again with the password, or remove the password');
    const xml = new TextDecoder().decode(info.subarray(8)), attr = (tag, name) => { const m = new RegExp(`<(?:\\w+:)?${tag}\\b[^>]*\\b${name}="([^"]*)"`).exec(xml); return m ? m[1] : null; };
    const b64 = t => Uint8Array.from(atob(t), ch => ch.charCodeAt(0)), algo = h => ({ SHA1: 'SHA-1', 'SHA-1': 'SHA-1', SHA256: 'SHA-256', SHA384: 'SHA-384', SHA512: 'SHA-512' }[String(h).toUpperCase().replace('-', '')] || 'SHA-512');
    const kd = { salt: b64(attr('keyData', 'saltValue')), block: +attr('keyData', 'blockSize'), bits: +attr('keyData', 'keyBits'), hash: algo(attr('keyData', 'hashAlgorithm')) };
    const ek = { salt: b64(attr('encryptedKey', 'saltValue')), spin: +attr('encryptedKey', 'spinCount'), bits: +attr('encryptedKey', 'keyBits'), hash: algo(attr('encryptedKey', 'hashAlgorithm')), value: b64(attr('encryptedKey', 'encryptedKeyValue')) };
    const cat = (...a) => { const o = new Uint8Array(a.reduce((n, x) => n + x.length, 0)); let p = 0; a.forEach(x => { o.set(x, p); p += x.length; }); return o; };
    const H = async (alg, d) => new Uint8Array(await subtle.digest(alg, d)), u32 = i => new Uint8Array([i & 255, (i >> 8) & 255, (i >> 16) & 255, (i >>> 24) & 255]);
    const fit = (b, n, pad) => { const o = new Uint8Array(n).fill(pad); o.set(b.subarray(0, n)); return o; };
    // AES-CBC without padding: WebCrypto wants PKCS#7, so a padding block is encrypted and appended first
    const aesCbcRaw = async (keyBytes, iv, data) => {
      const key = await subtle.importKey('raw', keyBytes, 'AES-CBC', false, ['encrypt', 'decrypt']), last = data.subarray(data.length - 16);
      const padBlk = new Uint8Array(await subtle.encrypt({ name: 'AES-CBC', iv: last }, key, new Uint8Array(16).fill(16))).subarray(0, 16);
      return new Uint8Array(await subtle.decrypt({ name: 'AES-CBC', iv }, key, cat(data, padBlk)));
    };
    const pw = new Uint8Array(password.length * 2); for (let i = 0; i < password.length; i++) { const cc = password.charCodeAt(i); pw[2 * i] = cc & 255; pw[2 * i + 1] = cc >> 8; }
    let h = await H(ek.hash, cat(ek.salt, pw));
    for (let i = 0; i < ek.spin; i++) h = await H(ek.hash, cat(u32(i), h));
    const kk = fit(await H(ek.hash, cat(h, new Uint8Array([0x14, 0x6e, 0x0b, 0xe7, 0xab, 0xac, 0xd0, 0xd6]))), ek.bits / 8, 0x36);
    let secret; try { secret = (await aesCbcRaw(kk, fit(ek.salt, 16, 0x36), ek.value)).subarray(0, kd.bits / 8); } catch (e) { throw new Error('wrong password'); }
    const size = Number(new DataView(pkg.buffer, pkg.byteOffset).getBigUint64(0, true)), body = pkg.subarray(8), out = new Uint8Array(body.length);
    for (let i = 0, off = 0; off < body.length; i++, off += 4096) {
      const seg = body.subarray(off, Math.min(off + 4096, body.length)), iv = fit(await H(kd.hash, cat(kd.salt, u32(i))), kd.block, 0x36);
      out.set(await aesCbcRaw(secret, iv, seg), off);
    }
    const res = out.subarray(0, size); if (!(res[0] === 0x50 && res[1] === 0x4B)) throw new Error('wrong password');
    return res;
  }
  return { read, readAny, readDta, isEncryptedOoxml, decryptOoxml };
})();
if (typeof module !== 'undefined') module.exports = Sav;

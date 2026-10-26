/* Prof MSE Easy Stat — canvas charts (bar ± error, line, box plot, CONSORT) */
const Charts = (() => {
  const PALETTES = {
    brand: ['#7B2FBE', '#1C1648', '#B57EDC', '#E08A2E', '#2E9E8F', '#C2185B'],
    classic: ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'],
    gray: ['#333333', '#777777', '#AAAAAA', '#555555', '#999999', '#CCCCCC']
  };
  const FONT = '"Segoe UI", Arial, sans-serif';
  const W = 1500, H = 820;

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function niceScale(min, max, ticks = 6) {
    if (min === max) { max = min + 1; }
    const span = max - min, raw = span / ticks;
    const mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(s => s >= raw);
    return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step };
  }
  const fmtTick = (v, step) => {
    const dec = Math.max(0, -Math.floor(Math.log10(step)) + (step % 1 && (step * 10) % 1 ? 1 : 0));
    return (+v.toFixed(Math.min(dec, 3))).toString();
  };

  function boxStats(a) {
    const q1 = Stats.quantile(a, 0.25), q3 = Stats.quantile(a, 0.75), med = Stats.median(a), iqr = q3 - q1;
    const loF = q1 - 1.5 * iqr, hiF = q3 + 1.5 * iqr;
    const inside = a.filter(v => v >= loF && v <= hiF);
    return { q1, q3, med, lo: Math.min(...inside), hi: Math.max(...inside), out: a.filter(v => v < loF || v > hiF) };
  }

  const stars = (p, alpha) => !(p <= alpha) ? '' : p <= 0.001 ? '***' : p <= 0.01 ? '**' : '*';
  // deterministic jitter so the same data always gives the same picture
  const jitter = i => ((Math.sin(i * 12.9898) * 43758.5453) % 1 + 1) % 1 - 0.5;

  function draw(spec, paletteName = 'brand') {
    if (spec.type === 'scatter') return scatter(spec, paletteName);
    const pal = PALETTES[paletteName] || PALETTES.brand;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const brackets = (spec.sig || []).filter(q => stars(q.p, spec.alpha));
    const catStars = (spec.sigCat || []).map(p => stars(p, spec.alpha));

    const perGroup = !!spec.perGroup && spec.series.length === 1;
    const legendItems = perGroup ? [] : spec.series.map((s, i) => ({ name: s.name, color: pal[i % pal.length], dash: spec.type === 'box' && i === 2 }));
    const L = 150, R = 40, T = 50, B = 120 + (legendItems.length ? 70 : 0);
    const pw = W - L - R, ph = H - T - B;

    // y range
    let lo = Infinity, hi = -Infinity;
    if (spec.type === 'box') {
      spec.series.forEach(s => s.data.forEach(arr => arr.forEach(v => { lo = Math.min(lo, v); hi = Math.max(hi, v); })));
    } else {
      spec.series.forEach(s => s.values.forEach((v, i) => {
        const up = s.err && s.err[i] != null ? v + s.err[i] : s.hi ? s.hi[i] : v;
        const dn = s.err && s.err[i] != null ? v - s.err[i] : s.lo ? s.lo[i] : v;
        hi = Math.max(hi, up); lo = Math.min(lo, dn);
      }));
    }
    if (spec.percent) { lo = 0; hi = Math.max(10, Math.min(100, hi * 1.1)); }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    if (spec.type !== 'line' && lo > 0) lo = 0;
    if (spec.type === 'line') { const pad = (hi - lo) * 0.1 || 1; lo = Math.max(lo > 0 ? 0 : -Infinity, lo - pad); }
    let sc = niceScale(lo, spec.percent ? hi : hi * (spec.labels ? 1.08 : 1.02));
    if (spec.percent && sc.max > 100) sc.max = 100;
    let y = v => T + ph - (v - sc.min) / (sc.max - sc.min) * ph;
    // room above the data for stacked significance brackets / stars
    const dataHi = hi, BR0 = spec.labels ? 70 : 34, BRSTEP = 50;
    const need = brackets.length ? BR0 + BRSTEP * brackets.length : catStars.some(Boolean) ? 70 : 0;
    for (let top = hi, tries = 0; need && y(dataHi) - need < T && tries < 12; tries++) {
      top += (top - sc.min) * 0.12;
      sc = niceScale(lo, top);
      y = v => T + ph - (v - sc.min) / (sc.max - sc.min) * ph;
    }

    // grid + y axis
    ctx.font = `600 26px ${FONT}`; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
      if (spec.percent && v > 100 + 1e-9) break;
      const yy = y(v);
      ctx.strokeStyle = '#E6E1EC'; ctx.lineWidth = 1.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(L, yy); ctx.lineTo(L + pw, yy); ctx.stroke();
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sc.step) + (spec.percent ? '%' : ''), L - 14, yy);
    }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(L, T - 20); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw + 20, T + ph); ctx.stroke();
    // axis arrows
    ctx.fillStyle = '#333';
    ctx.beginPath(); ctx.moveTo(L, T - 32); ctx.lineTo(L - 8, T - 16); ctx.lineTo(L + 8, T - 16); ctx.fill();
    ctx.beginPath(); ctx.moveTo(L + pw + 32, T + ph); ctx.lineTo(L + pw + 16, T + ph - 8); ctx.lineTo(L + pw + 16, T + ph + 8); ctx.fill();

    // y label
    ctx.save(); ctx.translate(40, T + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.font = `700 28px ${FONT}`; ctx.fillStyle = '#333';
    ctx.fillText(spec.yLabel || '', 0, 0); ctx.restore();

    const nc = spec.categories.length, ns = spec.series.length;
    const cw = pw / nc;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = `700 26px ${FONT}`; ctx.fillStyle = '#333';
    spec.categories.forEach((cat, i) => wrapText(ctx, cat, L + cw * (i + 0.5), T + ph + 16, cw - 10, 30));
    if (spec.xLabel) { ctx.font = `700 26px ${FONT}`; ctx.fillText(spec.xLabel, L + pw / 2, T + ph + 70); }

    const errBar = (x, a, b, w) => {
      ctx.strokeStyle = '#333'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x, y(a)); ctx.lineTo(x, y(b));
      ctx.moveTo(x - w, y(a)); ctx.lineTo(x + w, y(a)); ctx.moveTo(x - w, y(b)); ctx.lineTo(x + w, y(b)); ctx.stroke();
    };

    if (spec.type === 'bar') {
      const slots = perGroup ? 1 : ns;
      const gw = cw * (perGroup ? 0.42 : 0.78), bw = gw / slots;
      spec.series.forEach((s, si) => s.values.forEach((v, ci) => {
        const color = perGroup ? pal[ci % pal.length] : pal[si % pal.length];
        const x0 = L + cw * ci + (cw - gw) / 2 + bw * si + bw * 0.06, w = bw * 0.88;
        const g = ctx.createLinearGradient(0, y(v), 0, y(sc.min));
        g.addColorStop(0, shade(color, 0.25)); g.addColorStop(1, color);
        ctx.fillStyle = g; ctx.fillRect(x0, y(v), w, y(Math.max(sc.min, 0)) - y(v));
        const cx = x0 + w / 2;
        if (s.err && s.err[ci] != null && isFinite(s.err[ci])) errBar(cx, v - s.err[ci], v + s.err[ci], Math.min(14, w / 4));
        else if (s.lo && s.hi) errBar(cx, s.lo[ci], s.hi[ci], Math.min(14, w / 4));
        if (spec.labels) {
          ctx.fillStyle = '#222'; ctx.font = `700 24px ${FONT}`; ctx.textBaseline = 'bottom';
          const dec = spec.labelDec ?? 1, top = s.err && isFinite(s.err[ci]) ? v + s.err[ci] : s.hi ? s.hi[ci] : v;
          ctx.fillText((Math.round(v * 10 ** dec) / 10 ** dec) + (spec.percent ? '%' : ''), cx, y(top) - 6);
        }
      }));
    } else if (spec.type === 'line') {
      spec.series.forEach((s, si) => {
        const color = pal[si % pal.length], off = (si - (ns - 1) / 2) * Math.min(14, cw * 0.05);
        const xs = s.values.map((_, ci) => L + cw * (ci + 0.5) + off);
        s.values.forEach((v, ci) => {
          if (s.err && s.err[ci] != null) errBar(xs[ci], v - s.err[ci], v + s.err[ci], 9);
          else if (s.lo && s.hi) errBar(xs[ci], s.lo[ci], s.hi[ci], 9);
        });
        ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.setLineDash(si === 2 ? [16, 10] : []);
        ctx.beginPath(); s.values.forEach((v, ci) => ci ? ctx.lineTo(xs[ci], y(v)) : ctx.moveTo(xs[ci], y(v))); ctx.stroke();
        ctx.setLineDash([]); ctx.fillStyle = color;
        s.values.forEach((v, ci) => { ctx.beginPath(); ctx.arc(xs[ci], y(v), 10, 0, Math.PI * 2); ctx.fill(); });
      });
    } else if (spec.type === 'box') {
      const slots = perGroup ? 1 : ns;
      const gw = cw * (perGroup ? 0.36 : 0.8), bw = gw / slots;
      spec.series.forEach((s, si) => s.data.forEach((arr, ci) => {
        if (!arr.length) return;
        const color = perGroup ? pal[ci % pal.length] : pal[si % pal.length];
        const b = boxStats(arr), w = bw * 0.62, cx = L + cw * ci + (cw - gw) / 2 + bw * (si + 0.5);
        ctx.setLineDash(!perGroup && si === 2 ? [12, 7] : []);
        ctx.strokeStyle = color; ctx.lineWidth = 3.5;
        ctx.fillStyle = shade(color, 0.85); ctx.fillRect(cx - w / 2, y(b.q3), w, y(b.q1) - y(b.q3));
        ctx.strokeRect(cx - w / 2, y(b.q3), w, y(b.q1) - y(b.q3));
        ctx.beginPath();
        ctx.moveTo(cx, y(b.q3)); ctx.lineTo(cx, y(b.hi)); ctx.moveTo(cx, y(b.q1)); ctx.lineTo(cx, y(b.lo));
        ctx.moveTo(cx - w / 4, y(b.hi)); ctx.lineTo(cx + w / 4, y(b.hi)); ctx.moveTo(cx - w / 4, y(b.lo)); ctx.lineTo(cx + w / 4, y(b.lo));
        ctx.stroke();
        ctx.setLineDash([]); ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx - w / 2, y(b.med)); ctx.lineTo(cx + w / 2, y(b.med)); ctx.stroke();
        ctx.lineWidth = 2.5;
        if (spec.points) {
          // every observation as a translucent dot (outliers included)
          ctx.fillStyle = color; ctx.globalAlpha = 0.55;
          arr.forEach((v, i) => { ctx.beginPath(); ctx.arc(cx + jitter(i + 1) * w * 0.7, y(v), 6, 0, Math.PI * 2); ctx.fill(); });
          ctx.globalAlpha = 1;
        } else b.out.forEach(v => { ctx.beginPath(); ctx.arc(cx, y(v), 7, 0, Math.PI * 2); ctx.stroke(); });
      }));
    }

    // significance: brackets between groups, or stars above timepoints
    ctx.strokeStyle = '#222'; ctx.fillStyle = '#222'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = `700 30px ${FONT}`;
    [...brackets].sort((a, b) => (a.j - a.i) - (b.j - b.i)).forEach((q, n) => {
      const x1 = L + cw * (q.i + 0.5), x2 = L + cw * (q.j + 0.5), yy = y(dataHi) - BR0 - BRSTEP * n;
      ctx.beginPath(); ctx.moveTo(x1, yy + 14); ctx.lineTo(x1, yy); ctx.lineTo(x2, yy); ctx.lineTo(x2, yy + 14); ctx.stroke();
      ctx.fillText(stars(q.p, spec.alpha), (x1 + x2) / 2, yy - 2);
    });
    catStars.forEach((s, ci) => { if (s) ctx.fillText(s, L + cw * (ci + 0.5), y(dataHi) - 24); });

    // legend
    if (legendItems.length) {
      ctx.font = `600 26px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      const widths = legendItems.map(it => 60 + ctx.measureText(it.name).width + 40);
      let x = (W - widths.reduce((a, b) => a + b, 0)) / 2;
      const yy = H - 45;
      legendItems.forEach((it, i) => {
        if (spec.type === 'line' || spec.type === 'box') {
          ctx.strokeStyle = it.color; ctx.lineWidth = 5; ctx.setLineDash(i === 2 ? [12, 7] : []);
          ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 46, yy); ctx.stroke(); ctx.setLineDash([]);
        } else { ctx.fillStyle = it.color; ctx.fillRect(x + 8, yy - 14, 30, 28); }
        ctx.fillStyle = '#333'; ctx.fillText(it.name, x + 58, yy);
        x += widths[i];
      });
    }
    return c;
  }

  /* ---------- scatter plot with least-squares line ---------- */
  function scatter(spec, paletteName) {
    const pal = PALETTES[paletteName] || PALETTES.brand;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    const L = 150, R = 50, T = 60, B = 130, pw = W - L - R, ph = H - T - B;
    const { x: xs, y: ys } = spec;
    const pad = (a, b) => (b - a) * 0.05 || 1;
    const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
    const sx = niceScale(xmin - pad(xmin, xmax), xmax + pad(xmin, xmax)), sy = niceScale(ymin - pad(ymin, ymax), ymax + pad(ymin, ymax));
    const X = v => L + (v - sx.min) / (sx.max - sx.min) * pw, Y = v => T + ph - (v - sy.min) / (sy.max - sy.min) * ph;

    ctx.font = `600 26px ${FONT}`; ctx.lineWidth = 1.5;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = sy.min; v <= sy.max + 1e-9; v += sy.step) {
      ctx.strokeStyle = '#E6E1EC'; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke();
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sy.step), L - 14, Y(v));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = sx.min; v <= sx.max + 1e-9; v += sx.step) {
      ctx.strokeStyle = '#E6E1EC'; ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke();
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sx.step), X(v), T + ph + 12);
    }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.font = `700 28px ${FONT}`; ctx.fillStyle = '#333';
    ctx.fillText(spec.xLabel || '', L + pw / 2, T + ph + 60);
    ctx.save(); ctx.translate(40, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle';
    ctx.fillText(spec.yLabel || '', 0, 0); ctx.restore();

    ctx.fillStyle = pal[0]; ctx.globalAlpha = 0.6;
    xs.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(v), Y(ys[i]), 9, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    const mx = Stats.mean(xs), my = Stats.mean(ys);
    const sxx = Stats.sum(xs.map(v => (v - mx) ** 2));
    const slope = sxx > 0 ? Stats.sum(xs.map((v, i) => (v - mx) * (ys[i] - my))) / sxx : 0;
    if (sxx > 0) {
      const icpt = my - slope * mx;
      ctx.save(); ctx.beginPath(); ctx.rect(L, T, pw, ph); ctx.clip();
      ctx.strokeStyle = pal[1]; ctx.lineWidth = 5;
      ctx.beginPath(); ctx.moveTo(X(sx.min), Y(icpt + slope * sx.min)); ctx.lineTo(X(sx.max), Y(icpt + slope * sx.max)); ctx.stroke();
      ctx.restore();
    }
    if (spec.note) {
      ctx.font = `700 28px ${FONT}`; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      // put the label in the corner the points leave empty
      const tw = ctx.measureText(spec.note).width, nx = slope < 0 ? L + pw - tw - 44 : L + 20;
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(nx, T + 10, tw + 24, 44);
      ctx.fillStyle = '#222'; ctx.fillText(spec.note, nx + 12, T + 18);
    }
    return c;
  }

  function wrapText(ctx, text, x, y, maxW, lh) {
    const words = String(text).split(/\s+/), lines = [];
    let line = '';
    for (const w of words) {
      const t = line ? line + ' ' + w : w;
      if (ctx.measureText(t).width > maxW && line) { lines.push(line); line = w; } else line = t;
    }
    if (line) lines.push(line);
    lines.forEach((l, i) => ctx.fillText(l, x, y + i * lh));
    return lines.length;
  }
  function measureLines(ctx, text, maxW) {
    let n = 0;
    String(text).split('\n').forEach(par => {
      const words = par.split(/\s+/); let line = '';
      if (!par.trim()) { n++; return; }
      for (const w of words) {
        const t = line ? line + ' ' + w : w;
        if (ctx.measureText(t).width > maxW && line) { n++; line = w; } else line = t;
      }
      n++;
    });
    return n;
  }

  /* ---------- CONSORT 2010 flow diagram ---------- */
  function consort(c, groupLabels, palName = 'brand') {
    const pal = PALETTES[palName] || PALETTES.brand;
    const k = groupLabels.length;
    const cv = document.createElement('canvas');
    const CW = 1200;
    const ctx = cv.getContext('2d');
    const gutter = 80, pad = 18, colW = (CW - gutter - pad * (k + 1)) / k;
    const fs = 27, lh = 35, MIN_ROW = 175; // rows tall enough for the rotated section labels
    const boxH = (lines) => lines.reduce((h, ln) => { ctx.font = `${ln.b ? 700 : 400} ${fs}px ${FONT}`; return h + measureLines(ctx, ln.t, ln.w - 28) * lh; }, 0) + 26;

    const ex = c.excluded.filter(e => +e.n > 0);
    const exTotal = ex.reduce((s, e) => s + +e.n, 0);
    const topW = 440, exW = 500;
    const assessed = [{ t: `Assessed for eligibility (n=${c.assessed})`, b: true, w: topW }];
    const excluded = [{ t: `Excluded (n=${exTotal})`, b: true, w: exW }, ...ex.map(e => ({ t: `• ${e.text} (n=${e.n})`, w: exW }))];
    const randomized = [{ t: `Randomized (n=${c.groups.reduce((s, g) => s + (+g.allocated || 0), 0)})`, b: true, w: topW }];
    const alloc = c.groups.map((g, i) => [{ t: `${groupLabels[i]} (n=${g.allocated})`, b: true, w: colW }, { t: g.description || `Received allocated intervention (n=${g.allocated})`, w: colW }]);
    const follow = c.groups.map(g => [{ t: `Lost to follow-up (n=${+g.lost || 0})`, b: true, w: colW }, ...(g.lostReason && +g.lost ? [{ t: g.lostReason, w: colW }] : [{ t: 'No drop out', w: colW }])]);
    const anal = c.groups.map(g => [{ t: `Analysed (n=${g.analysed})`, b: true, w: colW }, { t: `Excluded from analysis (n=${+g.excludedAnalysis || 0})${g.excludedReason && +g.excludedAnalysis ? '\n' + g.excludedReason : ''}`, w: colW }]);

    const hA = boxH(assessed), hE = boxH(excluded), hR = boxH(randomized);
    const hAl = Math.max(MIN_ROW, ...alloc.map(boxH)), hF = Math.max(MIN_ROW, ...follow.map(boxH)), hAn = Math.max(MIN_ROW, ...anal.map(boxH));
    const gap = 60;
    const yA = 30, yE = yA + hA + 20, yR = Math.max(yE + hE + 20, yA + hA + gap);
    const yAl = yR + hR + gap + 20, yF = yAl + hAl + gap, yAn = yF + hF + gap;
    cv.width = CW; cv.height = yAn + hAn + 30;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);

    const midX = gutter + (CW - gutter) / 2;
    const box = (x, y, w, h, lines, align = 'center') => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
      ctx.fillRect(x, y, w, h); ctx.strokeRect(x, y, w, h);
      let yy = y + 14;
      ctx.fillStyle = '#111'; ctx.textBaseline = 'top';
      lines.forEach(ln => {
        ctx.font = `${ln.b ? 700 : 400} ${fs}px ${FONT}`;
        ln.t.split('\n').forEach(par => {
          ctx.textAlign = align;
          const n = wrapText(ctx, par, align === 'center' ? x + w / 2 : x + 14, yy, w - 28, lh);
          yy += n * lh;
        });
      });
    };
    const arrow = (x1, y1, x2, y2) => {
      ctx.strokeStyle = '#222'; ctx.fillStyle = '#222'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 16 * Math.cos(a - 0.4), y2 - 16 * Math.sin(a - 0.4));
      ctx.lineTo(x2 - 16 * Math.cos(a + 0.4), y2 - 16 * Math.sin(a + 0.4)); ctx.fill();
    };
    const pill = (label, y1, y2) => {
      ctx.fillStyle = pal[0];
      const x = 10, w = 54;
      ctx.beginPath(); ctx.roundRect(x, y1, w, y2 - y1, 18); ctx.fill();
      ctx.save(); ctx.translate(x + w / 2, (y1 + y2) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = '#fff'; ctx.font = `700 24px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(label, 0, 0); ctx.restore();
    };

    pill('Enrollment', yA, yR + hR);
    pill('Allocation', yAl, yAl + hAl);
    pill('Follow-Up', yF, yF + hF);
    pill('Analysis', yAn, yAn + hAn);

    box(midX - topW / 2, yA, topW, hA, assessed);
    if (exTotal) {
      const exX = midX + 60;
      box(exX, yE, exW, hE, excluded, 'left');
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
      arrow(midX, yE + hE / 2, exX, yE + hE / 2);
    }
    arrow(midX, yA + hA, midX, yR);
    box(midX - topW / 2, yR, topW, hR, randomized);

    const colX = i => gutter + pad + i * (colW + pad);
    const busY = yR + hR + gap / 2 + 10;
    ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(midX, yR + hR); ctx.lineTo(midX, busY);
    ctx.moveTo(colX(0) + colW / 2, busY); ctx.lineTo(colX(k - 1) + colW / 2, busY); ctx.stroke();
    for (let i = 0; i < k; i++) {
      const x = colX(i), cx = x + colW / 2;
      arrow(cx, busY, cx, yAl);
      box(x, yAl, colW, hAl, alloc[i]);
      arrow(cx, yAl + hAl, cx, yF);
      box(x, yF, colW, hF, follow[i]);
      arrow(cx, yF + hF, cx, yAn);
      box(x, yAn, colW, hAn, anal[i]);
    }
    return cv;
  }

  return { draw, consort, PALETTES };
})();

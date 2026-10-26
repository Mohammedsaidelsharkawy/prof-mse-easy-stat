/* Prof MSE Easy Stat — canvas charts (bar ± error, line, box plot, CONSORT) */
const Charts = (() => {
  const PALETTES = {
    brand: ['#7B2FBE', '#1C1648', '#B57EDC', '#E08A2E', '#2E9E8F', '#C2185B'],
    classic: ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'],
    gray: ['#333333', '#777777', '#AAAAAA', '#555555', '#999999', '#CCCCCC']
  };
  const FONT = '"Segoe UI", Arial, sans-serif';
  // figure shapes (logical canvas size before the resolution multiplier)
  const ASPECTS = { wide: [1500, 820], standard: [1500, 1125], square: [1300, 1300] };
  const TEXT = { normal: 1, large: 1.25, xlarge: 1.5 };
  const DEFAULT_STYLE = { text: 'normal', aspect: 'wide', barFill: 'gradient', grid: true, arrows: true, legend: 'bottom', res: 1, yAxis: 'auto',
    legendSize: 'normal', legendTitle: '', legendFrame: false };
  const LEGEND_SIZE = { small: 0.85, normal: 1, large: 1.2 };
  const palette = p => Array.isArray(p) && p.length ? p : PALETTES[p] || PALETTES.brand;

  // canvas with logical size W×H drawn at `res` times the pixels, and a font helper scaled by text size
  function setup(st) {
    const [W, H] = ASPECTS[st.aspect] || ASPECTS.wide, ts = TEXT[st.text] || 1, res = +st.res || 1;
    const c = document.createElement('canvas');
    c.width = W * res; c.height = H * res;
    const ctx = c.getContext('2d');
    ctx.scale(res, res);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, W, H);
    return { c, ctx, W, H, ts, F: (weight, px) => `${weight} ${Math.round(px * ts)}px ${FONT}` };
  }

  // bar fill: gradient (default), solid, outline only, or hatched for black-and-white print
  function hatch(ctx, color, idx) {
    const t = document.createElement('canvas'); t.width = t.height = 24;
    const g = t.getContext('2d');
    g.fillStyle = '#fff'; g.fillRect(0, 0, 24, 24);
    g.strokeStyle = color; g.lineWidth = 3.5;
    const kind = idx % 4;
    g.beginPath();
    if (kind === 0) { g.moveTo(-6, 30); g.lineTo(30, -6); g.moveTo(-6, 6); g.lineTo(6, -6); g.moveTo(18, 30); g.lineTo(30, 18); }
    else if (kind === 1) { g.moveTo(-6, -6); g.lineTo(30, 30); g.moveTo(18, -6); g.lineTo(30, 6); g.moveTo(-6, 18); g.lineTo(6, 30); }
    else if (kind === 2) { g.moveTo(0, 6); g.lineTo(24, 6); g.moveTo(0, 18); g.lineTo(24, 18); }
    else { g.moveTo(6, 0); g.lineTo(6, 24); g.moveTo(18, 0); g.lineTo(18, 24); g.moveTo(0, 12); g.lineTo(24, 12); }
    g.stroke();
    return ctx.createPattern(t, 'repeat');
  }
  function fillBar(ctx, st, color, idx, x, y0, w, h) {
    const mode = st.barFill || 'gradient';
    if (mode === 'gradient') {
      const g = ctx.createLinearGradient(0, y0, 0, y0 + h);
      g.addColorStop(0, shade(color, 0.25)); g.addColorStop(1, color);
      ctx.fillStyle = g;
    } else ctx.fillStyle = mode === 'solid' ? color : mode === 'outline' ? '#fff' : hatch(ctx, color, idx);
    ctx.fillRect(x, y0, w, h);
    if (mode === 'outline' || mode === 'hatched') { ctx.strokeStyle = color; ctx.lineWidth = 4; ctx.setLineDash([]); ctx.strokeRect(x, y0, w, h); }
  }

  function shade(hex, amt) {
    const n = parseInt(hex.slice(1), 16);
    let r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    const f = v => Math.round(amt >= 0 ? v + (255 - v) * amt : v * (1 + amt));
    return `rgb(${f(r)},${f(g)},${f(b)})`;
  }
  function niceScale(min, max, ticks = 6, integer = false) {
    if (min === max) { max = min + 1; }
    const span = max - min, raw = span / ticks;
    const mag = 10 ** Math.floor(Math.log10(raw));
    // counts get whole-number steps (no 2.5)
    let step = (integer ? [1, 2, 5, 10] : [1, 2, 2.5, 5, 10]).map(m => m * mag).find(s => s >= raw);
    if (integer) step = Math.max(1, step);
    return { min: Math.floor(min / step) * step, max: Math.ceil(max / step) * step, step };
  }
  // as many decimals as the step needs: 2.5 → "7.5", 0.25 → "0.75"
  const fmtTick = (v, step) => {
    const dec = (String(+step.toPrecision(6)).split('.')[1] || '').length;
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

  /* ---------- legend: bottom / top (one row), right / inside (a column), or none ---------- */
  function legendMetrics(ctx, items, st, ts) {
    const ls = ts * (LEGEND_SIZE[st.legendSize] || 1), q = ls / ts;
    const font = `600 ${Math.round(26 * ls)}px ${FONT}`, tfont = `700 ${Math.round(26 * ls)}px ${FONT}`;
    ctx.font = font;
    const names = items.map(it => ctx.measureText(it.name).width);
    ctx.font = tfont;
    const tw = st.legendTitle ? ctx.measureText(st.legendTitle).width : 0;
    const pos = items.length ? st.legend || 'bottom' : 'none', vertical = pos === 'right' || pos === 'inside', rowH = 40 * ls;
    return { pos, vertical, ls, q, font, tfont, names, tw, rowH,
      w: vertical ? Math.max(tw, 58 * q + Math.max(...names)) + 16 : 0, h: (items.length + (st.legendTitle ? 1 : 0)) * rowH + 16 };
  }
  function drawLegend(ctx, items, kind, st, m, g) {
    if (m.pos === 'none') return;
    const sw = 28 * m.ls;
    const swatch = (it, i, x, yy) => {
      if (kind === 'line') {
        ctx.strokeStyle = it.color; ctx.lineWidth = 5; ctx.setLineDash(it.dash ? [12, 7] : []);
        ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 46 * m.q, yy); ctx.stroke(); ctx.setLineDash([]);
      } else if (st.barFill === 'gradient') { ctx.fillStyle = it.color; ctx.fillRect(x + 8 * m.q, yy - sw / 2, sw + 2, sw); }
      else fillBar(ctx, st, it.color, i, x + 8 * m.q, yy - sw / 2, sw + 2, sw);
    };
    const frame = (x, y, w, h) => { ctx.strokeStyle = '#999'; ctx.lineWidth = 2; ctx.setLineDash([]); ctx.strokeRect(x, y, w, h); };
    ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    if (!m.vertical) {
      const widths = items.map((_, i) => 60 * m.q + m.names[i] + 40 * g.ts), titleW = m.tw ? m.tw + 30 * m.q : 0;
      const total = titleW + widths.reduce((a, b) => a + b, 0);
      let x = (g.W - total) / 2;
      const yy = m.pos === 'top' ? 40 * g.ts : g.H - 45 * g.ts;
      if (st.legendFrame) frame(x - 16, yy - m.rowH / 2 - 4, total - 40 * g.ts + 32, m.rowH + 8);
      if (m.tw) { ctx.font = m.tfont; ctx.fillStyle = '#333'; ctx.fillText(st.legendTitle, x, yy); x += titleW; }
      ctx.font = m.font;
      items.forEach((it, i) => { swatch(it, i, x, yy); ctx.fillStyle = '#333'; ctx.textBaseline = 'middle'; ctx.fillText(it.name, x + 58 * m.q, yy); x += widths[i]; });
      return;
    }
    const x0 = m.pos === 'right' ? g.L + g.pw + 40 : g.L + g.pw - m.w - 20, y0 = g.T + 12;
    if (m.pos === 'inside') { ctx.fillStyle = 'rgba(255,255,255,.92)'; ctx.fillRect(x0 - 12, y0, m.w + 12, m.h); }
    if (st.legendFrame) frame(x0 - 12, y0, m.w + 12, m.h);
    let yy = y0 + 8 + m.rowH / 2;
    if (m.tw) { ctx.font = m.tfont; ctx.fillStyle = '#333'; ctx.fillText(st.legendTitle, x0, yy); yy += m.rowH; }
    ctx.font = m.font;
    items.forEach((it, i) => { swatch(it, i, x0, yy); ctx.fillStyle = '#333'; ctx.fillText(it.name, x0 + 58 * m.q, yy); yy += m.rowH; });
  }

  // public entry: draws the chart, then adds the optional title band above it
  function draw(spec, paletteName = 'brand', style = {}) {
    const c = drawChart(spec, paletteName, style);
    return spec.title ? withTitle(c, spec.title, { ...DEFAULT_STYLE, ...style }) : c;
  }
  function withTitle(src, title, st) {
    const res = +st.res || 1, ts = TEXT[st.text] || 1, out = document.createElement('canvas'), ctx = out.getContext('2d');
    ctx.font = `700 ${Math.round(32 * ts * res)}px ${FONT}`;
    const lines = measureLines(ctx, title, src.width - 80 * res), band = (lines * 42 * ts + 36) * res;
    out.width = src.width; out.height = src.height + band;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, out.width, out.height);
    ctx.font = `700 ${Math.round(32 * ts * res)}px ${FONT}`; ctx.fillStyle = '#1C1648'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    wrapText(ctx, title, out.width / 2, 24 * res, src.width - 80 * res, 42 * ts * res);
    ctx.drawImage(src, 0, band);
    return out;
  }

  function drawChart(spec, paletteName = 'brand', style = {}) {
    const st = { ...DEFAULT_STYLE, ...style };
    if (spec.type === 'pie') return pieChart(spec, paletteName, st);
    if (spec.type === 'scatter') return scatter(spec, paletteName, st);
    if (spec.type === 'roc') return rocChart(spec, paletteName, st);
    if (spec.type === 'km') return kmChart(spec, paletteName, st);
    if (spec.type === 'ba') return baChart(spec, paletteName, st);
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup(st);
    const brackets = (spec.sig || []).filter(q => stars(q.p, spec.alpha));
    const catStars = (spec.sigCat || []).map(p => stars(p, spec.alpha));

    const perGroup = !!spec.perGroup && spec.series.length === 1;
    const legendItems = perGroup ? [] : spec.series.map((s, i) => ({ name: s.name, color: pal[i % pal.length], dash: spec.type === 'box' && i === 2 }));
    if (spec.type === 'stacked') spec = { ...spec, percent: true, series: spec.series.map(s => ({ ...s })) };
    const lm = legendMetrics(ctx, legendItems, st, ts);
    const L = 110 + 40 * ts, R = 40 + (lm.pos === 'right' ? lm.w + 40 : 0);
    const T = 50 + (lm.pos === 'top' ? 70 * lm.ls : 0), B = 120 * ts + (lm.pos === 'bottom' ? 70 * lm.ls : 0);
    const pw = W - L - R, ph = H - T - B;

    // y range
    let lo = Infinity, hi = -Infinity;
    if (spec.type === 'box' || spec.type === 'dot') {
      spec.series.forEach(s => s.data.forEach(arr => arr.forEach(v => { lo = Math.min(lo, v); hi = Math.max(hi, v); })));
    } else if (spec.type === 'stacked') { lo = 0; hi = 100; } else {
      spec.series.forEach(s => s.values.forEach((v, i) => {
        const up = s.err && s.err[i] != null ? v + s.err[i] : s.hi ? s.hi[i] : v;
        const dn = s.err && s.err[i] != null ? v - s.err[i] : s.lo ? s.lo[i] : v;
        hi = Math.max(hi, up); lo = Math.min(lo, dn);
      }));
    }
    if (spec.percent) { lo = 0; hi = Math.max(10, Math.min(100, hi * 1.1)); }
    if (!isFinite(lo)) { lo = 0; hi = 1; }
    // y axis: auto = bars and box plots from zero, lines fitted; 'zero' / 'fit' apply to lines and box plots (bars always start at zero)
    const fit = spec.type !== 'bar' && !spec.percent && (st.yAxis === 'fit' || (st.yAxis !== 'zero' && spec.type === 'line'));
    if (!fit && lo > 0) lo = 0;
    if (fit) { const pad = (hi - lo) * 0.1 || 1; lo = Math.max(lo > 0 && spec.type === 'line' && st.yAxis !== 'fit' ? 0 : -Infinity, lo - pad); }
    let sc = niceScale(lo, spec.percent ? hi : hi * (spec.labels ? 1.08 : 1.02), 6, spec.integer);
    if (spec.percent && sc.max > 100) sc.max = 100;
    let y = v => T + ph - (v - sc.min) / (sc.max - sc.min) * ph;
    // room above the data for stacked significance brackets / stars
    const dataHi = hi, BR0 = (spec.labels ? 70 : 34) * ts, BRSTEP = 50 * ts;
    const need = brackets.length ? BR0 + BRSTEP * brackets.length : catStars.some(Boolean) ? 70 * ts : 0;
    for (let top = hi, tries = 0; need && y(dataHi) - need < T && tries < 12; tries++) {
      top += (top - sc.min) * 0.12;
      sc = niceScale(lo, top, 6, spec.integer);
      y = v => T + ph - (v - sc.min) / (sc.max - sc.min) * ph;
    }

    // grid + y axis
    ctx.font = F(600, 26); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
      if (spec.percent && v > 100 + 1e-9) break;
      const yy = y(v);
      ctx.strokeStyle = st.grid ? '#E6E1EC' : '#333'; ctx.lineWidth = st.grid ? 1.5 : 3; ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(st.grid ? L : L - 9, yy); ctx.lineTo(st.grid ? L + pw : L, yy); ctx.stroke();
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sc.step) + (spec.percent ? '%' : ''), L - 14, yy);
    }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
    const ext = st.arrows ? 20 : 0;
    ctx.beginPath(); ctx.moveTo(L, T - ext); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw + ext, T + ph); ctx.stroke();
    if (st.arrows) {
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.moveTo(L, T - 32); ctx.lineTo(L - 8, T - 16); ctx.lineTo(L + 8, T - 16); ctx.fill();
      ctx.beginPath(); ctx.moveTo(L + pw + 32, T + ph); ctx.lineTo(L + pw + 16, T + ph - 8); ctx.lineTo(L + pw + 16, T + ph + 8); ctx.fill();
    }

    // y label
    ctx.save(); ctx.translate(40, T + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.font = F(700, 28); ctx.fillStyle = '#333';
    ctx.fillText(spec.yLabel || '', 0, 0); ctx.restore();

    const nc = spec.categories.length, ns = spec.series.length;
    const cw = pw / nc;
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = F(700, 26); ctx.fillStyle = '#333';
    const catLines = Math.max(1, ...spec.categories.map(cat => measureLines(ctx, cat, cw - 10)));
    spec.categories.forEach((cat, i) => wrapText(ctx, cat, L + cw * (i + 0.5), T + ph + 16, cw - 10, 30 * ts));
    if (spec.xLabel) { ctx.font = F(700, 26); ctx.fillText(spec.xLabel, L + pw / 2, T + ph + 16 + (catLines * 30 + 24) * ts); }

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
        fillBar(ctx, st, color, perGroup ? ci : si, x0, y(v), w, y(Math.max(sc.min, 0)) - y(v));
        const cx = x0 + w / 2;
        if (s.err && s.err[ci] != null && isFinite(s.err[ci])) errBar(cx, v - s.err[ci], v + s.err[ci], Math.min(14, w / 4));
        else if (s.lo && s.hi) errBar(cx, s.lo[ci], s.hi[ci], Math.min(14, w / 4));
        if (spec.labels) {
          ctx.fillStyle = '#222'; ctx.font = F(700, 24); ctx.textBaseline = 'bottom';
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
    } else if (spec.type === 'stacked') {
      // one 100% bar per group, segments = categories
      const w = cw * 0.5;
      spec.categories.forEach((_, ci) => {
        let base = 0;
        spec.series.forEach((s, si) => {
          const v = s.values[ci] || 0, x0 = L + cw * ci + (cw - w) / 2;
          if (v <= 0) return;
          fillBar(ctx, st, pal[si % pal.length], si, x0, y(base + v), w, y(base) - y(base + v));
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x0, y(base + v), w, y(base) - y(base + v));
          if (v >= 6) {
            ctx.font = F(700, 24); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = st.barFill === 'outline' || st.barFill === 'hatched' ? '#222' : '#fff';
            ctx.fillText(`${Math.round(v * 10) / 10}%`, x0 + w / 2, y(base + v / 2));
          }
          base += v;
        });
      });
    } else if (spec.type === 'dot') {
      // every patient as a dot, with mean ± SD (or median and IQR) as a bar and whiskers
      const gw = cw * 0.42;
      spec.series[0].data.forEach((arr, ci) => {
        if (!arr.length) return;
        const color = pal[ci % pal.length], cx = L + cw * (ci + 0.5);
        ctx.fillStyle = color; ctx.globalAlpha = 0.55;
        arr.forEach((v, i) => { ctx.beginPath(); ctx.arc(cx + jitter(i + 1) * gw * 0.8, y(v), 7, 0, Math.PI * 2); ctx.fill(); });
        ctx.globalAlpha = 1;
        const m = spec.median ? Stats.median(arr) : Stats.mean(arr);
        const a = spec.median ? Stats.quantile(arr, 0.25) : m - Stats.sd(arr), b = spec.median ? Stats.quantile(arr, 0.75) : m + Stats.sd(arr);
        ctx.strokeStyle = '#222'; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.moveTo(cx - gw / 2, y(m)); ctx.lineTo(cx + gw / 2, y(m)); ctx.stroke();
        if (isFinite(a) && isFinite(b)) errBar(cx, a, b, gw / 4);
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
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = F(700, 30);
    [...brackets].sort((a, b) => (a.j - a.i) - (b.j - b.i)).forEach((q, n) => {
      const x1 = L + cw * (q.i + 0.5), x2 = L + cw * (q.j + 0.5), yy = y(dataHi) - BR0 - BRSTEP * n;
      ctx.beginPath(); ctx.moveTo(x1, yy + 14); ctx.lineTo(x1, yy); ctx.lineTo(x2, yy); ctx.lineTo(x2, yy + 14); ctx.stroke();
      ctx.fillText(stars(q.p, spec.alpha), (x1 + x2) / 2, yy - 2);
    });
    catStars.forEach((s, ci) => { if (s) ctx.fillText(s, L + cw * (ci + 0.5), y(dataHi) - 24); });

    drawLegend(ctx, legendItems.map((it, i) => ({ ...it, dash: i === 2 })), spec.type === 'line' || spec.type === 'box' ? 'line' : 'fill', st, lm, { W, H, L, T, pw, ph, ts });
    return c;
  }

  /* ---------- donut charts: one per group, slices = categories ---------- */
  function pieChart(spec, paletteName, st) {
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup(st);
    const items = spec.series.map((s, i) => ({ name: s.name, color: pal[i % pal.length] }));
    const lm = legendMetrics(ctx, items, { ...st, legend: st.legend === 'inside' ? 'bottom' : st.legend }, ts);
    const T = 30 + (lm.pos === 'top' ? 70 * lm.ls : 0), B = 80 * ts + (lm.pos === 'bottom' ? 70 * lm.ls : 0), R = 30 + (lm.pos === 'right' ? lm.w + 40 : 0);
    const k = spec.categories.length, cw = (W - 30 - R) / k, r = Math.min(cw * 0.42, (H - T - B) / 2 - 10), r0 = r * 0.52;
    spec.categories.forEach((cat, ci) => {
      const cx = 30 + cw * (ci + 0.5), cy = T + (H - T - B) / 2;
      let a0 = -Math.PI / 2;
      spec.series.forEach((s, si) => {
        const v = (s.values[ci] || 0) / 100;
        if (v <= 0) return;
        const a1 = a0 + v * 2 * Math.PI;
        ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.arc(cx, cy, r0, a1, a0, true); ctx.closePath();
        ctx.fillStyle = st.barFill === 'hatched' ? hatch(ctx, pal[si % pal.length], si) : pal[si % pal.length]; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        if (v >= 0.06) {
          const am = (a0 + a1) / 2, rm = (r + r0) / 2;
          ctx.font = F(700, 22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = st.barFill === 'hatched' ? '#222' : '#fff';
          ctx.fillText(`${Math.round(v * 1000) / 10}%`, cx + Math.cos(am) * rm, cy + Math.sin(am) * rm);
        }
        a0 = a1;
      });
      ctx.font = F(700, 26); ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
      wrapText(ctx, cat, cx, cy + r + 14, cw - 10, 30 * ts);
    });
    drawLegend(ctx, items, 'fill', st, lm, { W, H, L: 30, T, pw: W - 30 - R, ph: H - T - B, ts });
    return c;
  }

  /* ---------- Bland–Altman plot: differences against means, with bias and 95% limits of agreement ---------- */
  function baChart(spec, paletteName, st) {
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup(st);
    const L = 110 + 40 * ts, R = 230 * ts, T = 50, B = 120 * ts, pw = W - L - R, ph = H - T - B;
    const xs = spec.x, ys = spec.y;
    const pad = (a, b) => (b - a) * 0.08 || 1;
    const x0 = Math.min(...xs), x1 = Math.max(...xs), yLo = Math.min(spec.lo, ...ys), yHi = Math.max(spec.hi, ...ys);
    const sx = niceScale(x0 - pad(x0, x1), x1 + pad(x0, x1)), sy = niceScale(yLo - pad(yLo, yHi), yHi + pad(yLo, yHi));
    const X = v => L + (v - sx.min) / (sx.max - sx.min) * pw, Y = v => T + ph - (v - sy.min) / (sy.max - sy.min) * ph;
    ctx.font = F(600, 26); ctx.lineWidth = 1.5;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = sy.min; v <= sy.max + 1e-9; v += sy.step) {
      if (st.grid) { ctx.strokeStyle = '#E6E1EC'; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); }
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sy.step), L - 14, Y(v));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = sx.min; v <= sx.max + 1e-9; v += sx.step) {
      if (st.grid) { ctx.strokeStyle = '#E6E1EC'; ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); }
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sx.step), X(v), T + ph + 12);
    }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.font = F(700, 28); ctx.fillStyle = '#333';
    ctx.fillText(spec.xLabel || '', L + pw / 2, T + ph + 60 * ts);
    ctx.save(); ctx.translate(40, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText(spec.yLabel || '', 0, 0); ctx.restore();
    ctx.fillStyle = pal[0]; ctx.globalAlpha = 0.6;
    xs.forEach((v, i) => { ctx.beginPath(); ctx.arc(X(v), Y(ys[i]), 9, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    const dec = spec.dec ?? 2, r = v => (Math.round(v * 10 ** dec) / 10 ** dec).toString();
    [[spec.hi, '+1.96 SD', [16, 10]], [spec.bias, 'Mean', []], [spec.lo, '−1.96 SD', [16, 10]]].forEach(([v, name, dash]) => {
      ctx.strokeStyle = name === 'Mean' ? pal[1] : '#C0392B'; ctx.lineWidth = 4; ctx.setLineDash(dash);
      ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); ctx.setLineDash([]);
      ctx.font = F(700, 24); ctx.fillStyle = '#222'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
      ctx.fillText(name, L + pw + 14, Y(v) - 2); ctx.textBaseline = 'top'; ctx.font = F(600, 24); ctx.fillText(r(v), L + pw + 14, Y(v) + 2);
    });
    return c;
  }

  /* ---------- Kaplan–Meier curves ---------- */
  function kmChart(spec, paletteName, st) {
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup(st);
    const items = spec.series.map((s, i) => ({ name: s.name, color: pal[i % pal.length], dash: i === 2 }));
    const lm = legendMetrics(ctx, items, st, ts);
    const L = 110 + 40 * ts, R = 50 + (lm.pos === 'right' ? lm.w + 40 : 0), T = 50 + (lm.pos === 'top' ? 70 * lm.ls : 0), B = 120 * ts + (lm.pos === 'bottom' ? 70 * lm.ls : 0);
    const pw = W - L - R, ph = H - T - B;
    const tMax = Math.max(1, ...spec.series.flatMap(s => [...s.steps.map(q => q.t), ...s.censored.map(q => q.t)]));
    const sx = niceScale(0, tMax), X = v => L + v / sx.max * pw, Y = v => T + ph - v * ph;
    ctx.font = F(600, 26); ctx.lineWidth = 1.5;
    for (let v = 0; v <= 1.0001; v += 0.2) {
      if (st.grid) { ctx.strokeStyle = '#E6E1EC'; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); }
      ctx.fillStyle = '#444'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(Math.round(v * 100) + '%', L - 14, Y(v));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = 0; v <= sx.max + 1e-9; v += sx.step) {
      if (st.grid) { ctx.strokeStyle = '#E6E1EC'; ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); }
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sx.step), X(v), T + ph + 12);
    }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.font = F(700, 28); ctx.fillStyle = '#333';
    ctx.fillText(spec.xLabel || 'Time', L + pw / 2, T + ph + 60 * ts);
    ctx.save(); ctx.translate(40, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText('Survival probability', 0, 0); ctx.restore();
    spec.series.forEach((s, i) => {
      const end = Math.max(s.steps[s.steps.length - 1].t, ...s.censored.map(q => q.t));
      ctx.strokeStyle = items[i].color; ctx.lineWidth = 5; ctx.setLineDash(items[i].dash ? [16, 10] : []);
      ctx.beginPath(); ctx.moveTo(X(0), Y(1));
      s.steps.forEach((q, k) => { if (k) { ctx.lineTo(X(q.t), Y(s.steps[k - 1].s)); ctx.lineTo(X(q.t), Y(q.s)); } });
      ctx.lineTo(X(end), Y(s.steps[s.steps.length - 1].s)); ctx.stroke(); ctx.setLineDash([]);
      // censored patients as small vertical ticks
      ctx.lineWidth = 3;
      s.censored.forEach(q => { ctx.beginPath(); ctx.moveTo(X(q.t), Y(q.s) - 12); ctx.lineTo(X(q.t), Y(q.s) + 12); ctx.stroke(); });
    });
    if (spec.note) {
      ctx.font = F(700, 28); ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillStyle = '#222';
      ctx.fillText(spec.note, L + pw - 10, T + 10);
    }
    drawLegend(ctx, items, 'line', st, lm, lm.pos === 'inside' ? { W, H, L, T: T + ph - lm.h - 24, pw, ph, ts } : { W, H, L, T, pw, ph, ts });
    return c;
  }

  /* ---------- ROC curves ---------- */
  function rocChart(spec, paletteName, st) {
    st = { ...st, legendTitle: '' }; // the legend lists test variables, not groups
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup({ ...st, aspect: st.aspect === 'wide' ? 'standard' : st.aspect });
    const items = spec.series.map((s, i) => ({ name: s.name, color: pal[i % pal.length], dash: i === 2 }));
    const lm = legendMetrics(ctx, items, { ...st, legend: st.legend === 'bottom' || st.legend === 'top' || st.legend === 'none' || st.legend === 'right' ? st.legend : 'inside' }, ts);
    const L = 110 + 40 * ts, R = 50 + (lm.pos === 'right' ? lm.w + 40 : 0), T = 50 + (lm.pos === 'top' ? 70 * lm.ls : 0), B = 120 * ts + (lm.pos === 'bottom' ? 70 * lm.ls : 0);
    const pw = W - L - R, ph = H - T - B;
    const X = v => L + v * pw, Y = v => T + ph - v * ph;
    ctx.font = F(600, 26); ctx.lineWidth = 1.5;
    for (let v = 0; v <= 1.0001; v += 0.2) {
      if (st.grid) { ctx.strokeStyle = '#E6E1EC'; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); }
      ctx.fillStyle = '#444'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(v.toFixed(1), L - 14, Y(v));
      ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(v.toFixed(1), X(v), T + ph + 12);
    }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.strokeStyle = '#999'; ctx.lineWidth = 2.5; ctx.setLineDash([12, 10]);
    ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = F(700, 28); ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('1 - Specificity', L + pw / 2, T + ph + 60 * ts);
    ctx.save(); ctx.translate(40, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText('Sensitivity', 0, 0); ctx.restore();
    spec.series.forEach((s, i) => {
      ctx.strokeStyle = items[i].color; ctx.lineWidth = 5; ctx.setLineDash(items[i].dash ? [16, 10] : []);
      const pts = [...s.points].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);
      ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(X(q.fpr), Y(q.tpr)) : ctx.moveTo(X(q.fpr), Y(q.tpr))); ctx.stroke();
    });
    ctx.setLineDash([]);
    // the inside legend sits bottom-right, where ROC curves leave space
    if (lm.pos === 'inside') drawLegend(ctx, items, 'line', st, lm, { W, H, L, T: T + ph - lm.h - 24, pw, ph, ts });
    else drawLegend(ctx, items, 'line', st, lm, { W, H, L, T, pw, ph, ts });
    return c;
  }

  /* ---------- scatter plot with least-squares line ---------- */
  function scatter(spec, paletteName, st) {
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup(st);
    const L = 110 + 40 * ts, R = 50, T = 60, B = 130 * ts, pw = W - L - R, ph = H - T - B;
    const { x: xs, y: ys } = spec;
    const pad = (a, b) => (b - a) * 0.05 || 1;
    const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
    const sx = niceScale(xmin - pad(xmin, xmax), xmax + pad(xmin, xmax)), sy = niceScale(ymin - pad(ymin, ymax), ymax + pad(ymin, ymax));
    const X = v => L + (v - sx.min) / (sx.max - sx.min) * pw, Y = v => T + ph - (v - sy.min) / (sy.max - sy.min) * ph;

    ctx.font = F(600, 26); ctx.lineWidth = 1.5;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const gridLine = (x1, y1, x2, y2) => { if (st.grid) { ctx.strokeStyle = '#E6E1EC'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); } };
    for (let v = sy.min; v <= sy.max + 1e-9; v += sy.step) {
      gridLine(L, Y(v), L + pw, Y(v));
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sy.step), L - 14, Y(v));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = sx.min; v <= sx.max + 1e-9; v += sx.step) {
      gridLine(X(v), T, X(v), T + ph);
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sx.step), X(v), T + ph + 12);
    }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.font = F(700, 28); ctx.fillStyle = '#333';
    ctx.fillText(spec.xLabel || '', L + pw / 2, T + ph + 60 * ts);
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
      ctx.font = F(700, 28); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      // put the label in the corner the points leave empty
      const tw = ctx.measureText(spec.note).width, nx = slope < 0 ? L + pw - tw - 44 : L + 20;
      ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(nx, T + 10, tw + 24, 44 * ts);
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
  // Flow diagrams: CONSORT 2010 (default), STROBE and STARD 2015 share this layout; 'simple' is a chain of steps
  function consort(c, groupLabels, palName = 'brand') {
    if (c.type === 'simple') return simpleFlow(c, groupLabels, palName);
    const pal = palette(palName), type = c.type || 'consort';
    const branches = type === 'stard' ? stardBranches(c) : null;
    const k = branches ? branches.length : groupLabels.length;
    const cv = document.createElement('canvas');
    const CW = 1200;
    const ctx = cv.getContext('2d');
    const gutter = 80, pad = 18, colW = (CW - gutter - pad * (k + 1)) / k;
    const fs = 27, lh = 35, MIN_ROW = 175; // rows tall enough for the rotated section labels
    const boxH = (lines) => lines.reduce((h, ln) => { ctx.font = `${ln.b ? 700 : 400} ${fs}px ${FONT}`; return h + measureLines(ctx, ln.t, ln.w - 28) * lh; }, 0) + 26;

    const ex = c.excluded.filter(e => +e.n > 0);
    const exTotal = ex.reduce((s, e) => s + +e.n, 0);
    const topW = 440, exW = 500;
    const strobe = type === 'strobe';
    const topText = type === 'stard' ? 'Potentially eligible participants' : strobe ? 'Potentially eligible individuals' : 'Assessed for eligibility';
    const assessed = [{ t: `${topText} (n=${c.assessed})`, b: true, w: topW }];
    const excluded = [{ t: `Excluded (n=${exTotal})`, b: true, w: exW }, ...ex.map(e => ({ t: `• ${e.text} (n=${e.n})`, w: exW }))];
    const midN = branches ? +c.stard.tested || 0 : c.groups.reduce((s, g) => s + (+g.allocated || 0), 0);
    const randomized = [{ t: `${type === 'stard' ? 'Received index test' : strobe ? 'Included in the study' : 'Randomized'} (n=${midN})`, b: true, w: topW }];
    let alloc, follow, anal;
    if (branches) {
      alloc = branches.map(b => [{ t: `Index test ${b.name.toLowerCase()} (n=${+b.n || 0})`, b: true, w: colW }]);
      follow = branches.map(b => [{ t: `No reference standard (n=${+b.noRef || 0})`, b: true, w: colW }, { t: `Reference standard (n=${(+b.present || 0) + (+b.absent || 0) + (+b.inconclusive || 0)})`, w: colW }]);
      anal = branches.map(b => [{ t: 'Final diagnosis', b: true, w: colW }, { t: `Target condition present (n=${+b.present || 0})\nTarget condition absent (n=${+b.absent || 0})${+b.inconclusive ? `\nInconclusive (n=${b.inconclusive})` : ''}`, w: colW }]);
    } else {
      alloc = c.groups.map((g, i) => [{ t: `${groupLabels[i]} (n=${g.allocated})`, b: true, w: colW }, { t: g.description || (strobe ? `Included (n=${g.allocated})` : `Received allocated intervention (n=${g.allocated})`), w: colW }]);
      follow = c.groups.map(g => [{ t: `${strobe ? 'Lost to follow-up / missing data' : 'Lost to follow-up'} (n=${+g.lost || 0})`, b: true, w: colW }, ...(g.lostReason && +g.lost ? [{ t: g.lostReason, w: colW }] : [{ t: strobe ? 'None' : 'No drop out', w: colW }])]);
      anal = c.groups.map(g => [{ t: `Analysed (n=${g.analysed})`, b: true, w: colW }, { t: `Excluded from analysis (n=${+g.excludedAnalysis || 0})${g.excludedReason && +g.excludedAnalysis ? '\n' + g.excludedReason : ''}`, w: colW }]);
    }
    const PILLS = { consort: ['Enrollment', 'Allocation', 'Follow-Up', 'Analysis'], strobe: ['Identification', 'Inclusion', 'Follow-Up', 'Analysis'], stard: ['Enrollment', 'Index test', 'Reference', 'Diagnosis'] }[type];

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

    pill(PILLS[0], yA, yR + hR);
    pill(PILLS[1], yAl, yAl + hAl);
    pill(PILLS[2], yF, yF + hF);
    pill(PILLS[3], yAn, yAn + hAn);

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

  // STARD columns: positive and negative always, inconclusive only when used
  const stardBranches = c => c.stard.branches.filter((b, i) => i < 2 || +b.n > 0);

  /* ---------- simple flowchart: a chain of steps with optional exclusions, optionally split into the groups ---------- */
  function simpleFlow(c, groupLabels, palName) {
    const pal = palette(palName);
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    const CW = 1200, fs = 27, lh = 35, boxW = 520, exW = 420, gap = 56;
    const boxH = (text, w, bold) => { ctx.font = `${bold ? 700 : 400} ${fs}px ${FONT}`; return text.split('\n').reduce((h, par) => h + measureLines(ctx, par, w - 28) * lh, 0) + 26; };
    const steps = c.steps.filter(s => String(s.text).trim());
    const midX = CW / 2 - (steps.some(s => +s.exN > 0) ? 160 : 0);
    let y = 30;
    const layout = steps.map(s => {
      const text = `${s.text} (n=${+s.n || 0})`, h = boxH(text, boxW, true);
      const ex = +s.exN > 0 ? { text: `${s.exText || 'Excluded'} (n=${s.exN})`, h: 0 } : null;
      if (ex) ex.h = boxH(ex.text, exW, false);
      const box = { text, y, h, ex };
      y += h + gap + (ex ? ex.h + 24 : 0);
      return box;
    });
    const k = groupLabels.length, split = c.splitGroups && k > 1 && c.groups;
    const pad = 18, colW = split ? Math.min(360, (CW - pad * (k + 1)) / k) : 0;
    const gH = split ? Math.max(...groupLabels.map((g, i) => boxH(`${g}\n(n=${c.groups[i].analysed})`, colW, true))) : 0;
    const busY = y - gap / 2;
    cv.width = CW; cv.height = (split ? y + gH + 30 : y - gap + 30);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);
    const box = (x, yy, w, h, text, bold, align = 'center') => {
      ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5; ctx.fillRect(x, yy, w, h); ctx.strokeRect(x, yy, w, h);
      ctx.fillStyle = '#111'; ctx.textBaseline = 'top'; ctx.font = `${bold ? 700 : 400} ${fs}px ${FONT}`; ctx.textAlign = align;
      let ty = yy + 13;
      text.split('\n').forEach(par => { ty += wrapText(ctx, par, align === 'center' ? x + w / 2 : x + 14, ty, w - 28, lh) * lh; });
    };
    const arrow = (x1, y1, x2, y2) => {
      ctx.strokeStyle = '#222'; ctx.fillStyle = '#222'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 16 * Math.cos(a - 0.4), y2 - 16 * Math.sin(a - 0.4)); ctx.lineTo(x2 - 16 * Math.cos(a + 0.4), y2 - 16 * Math.sin(a + 0.4)); ctx.fill();
    };
    layout.forEach((b, i) => {
      box(midX - boxW / 2, b.y, boxW, b.h, b.text, true);
      if (b.ex) {
        const ey = b.y + b.h + (gap + 24) / 2, ex0 = midX + 60;
        box(ex0, ey, exW, b.ex.h, b.ex.text, false, 'left');
        arrow(midX, ey + b.ex.h / 2, ex0, ey + b.ex.h / 2);
      }
      if (i < layout.length - 1) arrow(midX, b.y + b.h, midX, layout[i + 1].y);
    });
    if (split) {
      const last = layout[layout.length - 1], cx = i => pad + colW / 2 + i * ((CW - 2 * pad - colW) / (k - 1));
      ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(midX, last.y + last.h); ctx.lineTo(midX, busY); ctx.moveTo(cx(0), busY); ctx.lineTo(cx(k - 1), busY); ctx.stroke();
      groupLabels.forEach((g, i) => { arrow(cx(i), busY, cx(i), y); box(cx(i) - colW / 2, y, colW, gH, `${g}\n(n=${c.groups[i].analysed})`, true); });
    }
    return cv;
  }

  return { draw, consort, PALETTES, DEFAULT_STYLE };
})();

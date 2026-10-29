/* Prof MSE Easy Stat — canvas charts (bar ± error, line, box plot, CONSORT) */
const Charts = (() => {
  const PALETTES = {
    brand: ['#7B2FBE', '#1C1648', '#B57EDC', '#E08A2E', '#2E9E8F', '#C2185B'],
    classic: ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'],
    gray: ['#333333', '#777777', '#AAAAAA', '#555555', '#999999', '#CCCCCC'],
    // journal-style and colour-blind-safe themes
    nejm: ['#BC3C29', '#0072B5', '#E18727', '#20854E', '#7876B1', '#6F99AD'],
    lancet: ['#00468B', '#ED0000', '#42B540', '#0099B4', '#925E9F', '#FDAF91'],
    nature: ['#E64B35', '#4DBBD5', '#00A087', '#3C5488', '#F39B7F', '#8491B4'],
    jama: ['#374E55', '#DF8F44', '#00A1D5', '#B24745', '#79AF97', '#6A6599'],
    okabe: ['#E69F00', '#56B4E9', '#009E73', '#0072B2', '#D55E00', '#CC79A7'],
    viridis: ['#440154', '#3B528B', '#21918C', '#5EC962', '#B8DE29', '#2C728E'],
    pastel: ['#8DA0CB', '#FC8D62', '#66C2A5', '#E78AC3', '#A6D854', '#E5C494'],
    ocean: ['#023E8A', '#0096C7', '#48CAE4', '#03045E', '#00B4D8', '#90E0EF'],
    sunset: ['#F94144', '#F8961E', '#577590', '#F9C74F', '#90BE6D', '#43AA8B'],
    forest: ['#1B4332', '#40916C', '#95D5B2', '#2D6A4F', '#74C69D', '#52B788'],
    earth: ['#264653', '#E76F51', '#2A9D8F', '#F4A261', '#E9C46A', '#8AB17D'],
    berry: ['#7B2CBF', '#C9184A', '#FF8FA3', '#5A189A', '#FF4D6D', '#9D4EDD'],
    blues: ['#08306B', '#2171B5', '#6BAED6', '#08519C', '#4292C6', '#9ECAE1'],
    // Office-style colour sets (the six accent colours)
    office: ['#156082', '#E97132', '#196B24', '#0F9ED5', '#A02B93', '#4EA72E'],
    office2013: ['#4472C4', '#ED7D31', '#A5A5A5', '#FFC000', '#5B9BD5', '#70AD47'],
    office2007: ['#4F81BD', '#C0504D', '#9BBB59', '#8064A2', '#4BACC6', '#F79646'],
    blueWarm: ['#4A66AC', '#629DD1', '#297FD5', '#7F8FA9', '#5AA2AE', '#9D90A0'],
    blue: ['#0F6FC6', '#009DD9', '#0BD0D9', '#10CF9B', '#7CCA62', '#A5C249'],
    blue2: ['#1CADE4', '#2683C6', '#27CED7', '#42BA97', '#3E8853', '#62A39F'],
    blueGreen: ['#3494BA', '#58B6C0', '#75BDA7', '#7A8C8E', '#84ACB6', '#2683C6'],
    green: ['#549E39', '#8AB833', '#C0CF3A', '#029676', '#4AB5C4', '#0989B1'],
    greenYellow: ['#99CB38', '#63A537', '#37A76F', '#44C1A3', '#4EB3CF', '#51C3F9'],
    yellow: ['#FFCA08', '#F8931D', '#CE8D3E', '#EC7016', '#E64823', '#9C6A6A'],
    yellowOrange: ['#F0A22E', '#A5644E', '#B58B80', '#C3986D', '#A19574', '#C17529'],
    orange: ['#E48312', '#BD582C', '#865640', '#9B8357', '#C2BC80', '#94A088'],
    orangeRed: ['#D34817', '#9B2D1F', '#A28E6A', '#956251', '#918485', '#855D5D'],
    redOrange: ['#E84C22', '#FFBD47', '#B64926', '#FF8427', '#CC9900', '#B22600'],
    red: ['#A5300F', '#D55816', '#E19825', '#B19C7D', '#7F5F52', '#B27D49'],
    redViolet: ['#E32D91', '#C830CC', '#4EA6DC', '#4775E7', '#8971E1', '#D54773'],
    violet: ['#AD84C6', '#8784C7', '#5D739A', '#6997AF', '#84ACB6', '#6F8183'],
    violet2: ['#92278F', '#9B57D3', '#755DD9', '#665EB8', '#45A5ED', '#5982DB'],
    median: ['#94B6D2', '#DD8047', '#A5AB81', '#D8B25C', '#7BA79D', '#968C8C'],
    paper: ['#A5B592', '#F3A447', '#E7BC29', '#D092A7', '#9C85C0', '#809EC2'],
    marquee: ['#418AB3', '#A6B727', '#F69200', '#838383', '#FEC306', '#DF5327'],
    slipstream: ['#4E67C8', '#5ECCF3', '#A7EA52', '#5DCEAF', '#FF8021', '#F14124'],
    aspect: ['#F07F09', '#9F2936', '#1B587C', '#4E8542', '#604878', '#C19859']
  };
  const PALETTE_NAMES = { brand: 'Prof MSE (purple / navy)', classic: 'Classic Office', gray: 'Grayscale (journal print)', nejm: 'NEJM', lancet: 'Lancet', nature: 'Nature',
    jama: 'JAMA', okabe: 'Colour-blind safe (Okabe-Ito)', viridis: 'Viridis', pastel: 'Pastel', ocean: 'Ocean blues', sunset: 'Sunset', forest: 'Forest greens', earth: 'Earth tones', berry: 'Berry', blues: 'Monochrome blue',
    office: 'Office', office2013: 'Office 2013 - 2022', office2007: 'Office 2007 - 2010', blueWarm: 'Blue Warm', blue: 'Blue', blue2: 'Blue II', blueGreen: 'Blue Green',
    green: 'Green', greenYellow: 'Green Yellow', yellow: 'Yellow', yellowOrange: 'Yellow Orange', orange: 'Orange', orangeRed: 'Orange Red', redOrange: 'Red Orange', red: 'Red',
    redViolet: 'Red Violet', violet: 'Violet', violet2: 'Violet II', median: 'Median', paper: 'Paper', marquee: 'Marquee', slipstream: 'Slipstream', aspect: 'Aspect' };
  // groups of the theme menu
  const PALETTE_GROUPS = [['Scientific', ['brand', 'gray', 'nejm', 'lancet', 'nature', 'jama', 'okabe', 'viridis', 'pastel', 'ocean', 'sunset', 'forest', 'earth', 'berry', 'blues', 'classic']],
    ['Office-style colours', ['office', 'office2013', 'office2007', 'blueWarm', 'blue', 'blue2', 'blueGreen', 'green', 'greenYellow', 'yellow', 'yellowOrange', 'orange', 'orangeRed', 'redOrange', 'red', 'redViolet', 'violet', 'violet2', 'median', 'paper', 'marquee', 'slipstream', 'aspect']]];
  const FONTS = { sans: '"Segoe UI", Arial, sans-serif', arial: 'Arial, Helvetica, sans-serif', times: '"Times New Roman", Times, serif', calibri: 'Calibri, Carlito, Arial, sans-serif' };
  let FONT = FONTS.sans; // chart text font, set per chart from the style
  // figure shapes (logical canvas size before the resolution multiplier)
  const ASPECTS = { wide: [1500, 820], standard: [1500, 1125], square: [1300, 1300] };
  const TEXT = { normal: 1, large: 1.25, xlarge: 1.5 };
  const DEFAULT_STYLE = { text: 'normal', aspect: 'wide', barFill: 'gradient', grid: true, arrows: true, legend: 'bottom', res: 1, yAxis: 'auto',
    legendSize: 'normal', legendTitle: '', legendFrame: false, barWidth: 'normal', boxMean: false };
  // bar / box width multiplier, never wider than the category slot
  const BAR_W = { thin: 0.7, normal: 1, wide: 1.3 };
  const widthOf = (st, frac) => Math.min(0.95, frac * (BAR_W[st.barWidth] || 1));
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
    FONT = FONTS[style.font] || FONTS.sans;
    // a chart of one series (one-group studies) needs no legend
    const c = drawChart(spec, paletteName, spec.legend === false ? { ...style, legend: 'none' } : style);
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
    if (spec.type === 'hbar') return hbarChart(spec, paletteName, st);
    if (spec.type === 'qq') return qqChart(spec, paletteName, st);
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
    if (spec.type === 'box' || spec.type === 'dot' || spec.type === 'violin') {
      spec.series.forEach(s => s.data.forEach(arr => arr.forEach(v => { lo = Math.min(lo, v); hi = Math.max(hi, v); })));
    } else if (spec.type === 'stacked') { lo = 0; hi = 100; } else {
      (spec.individual || []).flat(2).forEach(v => { if (isFinite(v)) { lo = Math.min(lo, v); hi = Math.max(hi, v); } });
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
      const gw = cw * widthOf(st, perGroup ? 0.42 : 0.78), bw = gw / slots;
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
      // optional thin line for every patient (spaghetti plot), under the means
      if (spec.individual) spec.series.forEach((s, si) => {
        const off = (si - (ns - 1) / 2) * Math.min(14, cw * 0.05);
        ctx.strokeStyle = pal[si % pal.length]; ctx.globalAlpha = 0.22; ctx.lineWidth = 2; ctx.setLineDash([]);
        (spec.individual[si] || []).forEach(p => { ctx.beginPath(); p.forEach((v, ci) => { const x = L + cw * (ci + 0.5) + off; ci ? ctx.lineTo(x, y(v)) : ctx.moveTo(x, y(v)); }); ctx.stroke(); });
        ctx.globalAlpha = 1;
      });
      spec.series.forEach((s, si) => {
        const color = pal[si % pal.length], off = (si - (ns - 1) / 2) * Math.min(14, cw * 0.05);
        const xs = s.values.map((_, ci) => L + cw * (ci + 0.5) + off);
        s.values.forEach((v, ci) => {
          if (s.err && s.err[ci] != null) errBar(xs[ci], v - s.err[ci], v + s.err[ci], 9);
          else if (s.lo && s.hi) errBar(xs[ci], s.lo[ci], s.hi[ci], 9);
        });
        // error plot (noLine): means and their error bars only, coloured by group when the categories are the groups
        if (!spec.noLine) {
          ctx.strokeStyle = color; ctx.lineWidth = 5; ctx.setLineDash(si === 2 ? [16, 10] : []);
          ctx.beginPath(); s.values.forEach((v, ci) => ci ? ctx.lineTo(xs[ci], y(v)) : ctx.moveTo(xs[ci], y(v))); ctx.stroke();
        }
        if (spec.noLine && spec.perGroup && ns === 1) {
          ctx.setLineDash([]);
          s.values.forEach((v, ci) => { ctx.fillStyle = pal[ci % pal.length]; ctx.beginPath(); ctx.arc(xs[ci], y(v), 12, 0, Math.PI * 2); ctx.fill(); });
          return;
        }
        ctx.setLineDash([]); ctx.fillStyle = color;
        s.values.forEach((v, ci) => { ctx.beginPath(); ctx.arc(xs[ci], y(v), 10, 0, Math.PI * 2); ctx.fill(); });
      });
    } else if (spec.type === 'stacked') {
      // one 100% bar per group, segments = categories
      const w = cw * widthOf(st, 0.5);
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
    } else if (spec.type === 'violin') {
      // kernel density (Gaussian, Silverman bandwidth) mirrored around the centre, with a slim box of the median and IQR inside
      const slots = perGroup ? 1 : ns;
      const gw = cw * widthOf(st, perGroup ? 0.5 : 0.84), bw = gw / slots;
      spec.series.forEach((s, si) => s.data.forEach((arr, ci) => {
        if (!arr.length) return;
        const color = perGroup ? pal[ci % pal.length] : pal[si % pal.length];
        const cx = L + cw * ci + (cw - gw) / 2 + bw * (si + 0.5), half = bw * 0.46;
        const b = boxStats(arr), mn = Math.min(...arr), mx = Math.max(...arr);
        const sdv = arr.length > 1 ? Stats.sd(arr) : 0, iqr = b.q3 - b.q1;
        const h = 0.9 * Math.min(sdv || Infinity, (iqr || Infinity) / 1.34) * arr.length ** -0.2 || (mx - mn) / 10 || 1;
        const grid = Array.from({ length: 61 }, (_, i) => mn + (mx - mn) * i / 60);
        const dens = grid.map(g => arr.reduce((a, v) => a + Math.exp(-0.5 * ((g - v) / h) ** 2), 0));
        const dmax = Math.max(...dens) || 1, wd = dd => half * dd / dmax;
        ctx.beginPath();
        grid.forEach((g, i) => i ? ctx.lineTo(cx + wd(dens[i]), y(g)) : ctx.moveTo(cx + wd(dens[i]), y(g)));
        for (let i = grid.length - 1; i >= 0; i--) ctx.lineTo(cx - wd(dens[i]), y(grid[i]));
        ctx.closePath();
        ctx.fillStyle = shade(color, 0.7); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 3.5; ctx.setLineDash(!perGroup && si === 2 ? [12, 7] : []); ctx.stroke(); ctx.setLineDash([]);
        if (spec.points) {
          ctx.fillStyle = color; ctx.globalAlpha = 0.5;
          arr.forEach((v, i) => { ctx.beginPath(); ctx.arc(cx + jitter(i + 1) * half * 0.5, y(v), 5, 0, Math.PI * 2); ctx.fill(); });
          ctx.globalAlpha = 1;
        }
        const bwid = Math.max(8, half * 0.16);
        ctx.fillStyle = '#222'; ctx.fillRect(cx - bwid / 2, y(b.q3), bwid, y(b.q1) - y(b.q3));
        ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(cx, y(b.hi)); ctx.lineTo(cx, y(b.lo)); ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(cx, y(b.med), Math.max(5, bwid * 0.45), 0, Math.PI * 2); ctx.fill();
        if (st.boxMean) {
          const m = Stats.mean(arr), r = 10;
          ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(cx + half * 0.35, y(m) - r); ctx.lineTo(cx + half * 0.35 + r, y(m)); ctx.lineTo(cx + half * 0.35, y(m) + r); ctx.lineTo(cx + half * 0.35 - r, y(m)); ctx.closePath(); ctx.fill(); ctx.stroke();
        }
      }));
    } else if (spec.type === 'box') {
      const slots = perGroup ? 1 : ns;
      const gw = cw * widthOf(st, perGroup ? 0.36 : 0.8), bw = gw / slots;
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
        if (st.boxMean) {
          // mean as a diamond
          const m = Stats.mean(arr), r = 11;
          ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(cx, y(m) - r); ctx.lineTo(cx + r, y(m)); ctx.lineTo(cx, y(m) + r); ctx.lineTo(cx - r, y(m)); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = color;
        }
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

  /* ---------- normal Q-Q plot: each group's sorted values against normal quantiles (Blom), with the line mean + SD × z ---------- */
  function qqChart(spec, paletteName, st) {
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup(st);
    const sets = spec.series.filter(s => s.data.length >= 3).map((s, i) => {
      const a = [...s.data].sort((x, y) => x - y), n = a.length, m = Stats.mean(a), sd = Stats.sd(a);
      return { name: s.name, color: pal[spec.series.indexOf(s) % pal.length], m, sd, pts: a.map((v, j) => [jStat.normal.inv((j + 1 - 0.375) / (n + 0.25), 0, 1), v]) };
    });
    const items = spec.legend === false ? [] : sets.map(x => ({ name: x.name, color: x.color }));
    const lm = legendMetrics(ctx, items, { ...st, legend: st.legend === 'inside' ? 'bottom' : st.legend }, ts);
    const L = 110 + 40 * ts, R = 40 + (lm.pos === 'right' ? lm.w + 40 : 0), T = 40 + (lm.pos === 'top' ? 70 * lm.ls : 0), B = 120 * ts + (lm.pos === 'bottom' ? 70 * lm.ls : 0);
    const pw = W - L - R, ph = H - T - B;
    const zs = sets.flatMap(x => x.pts.map(q => q[0])), vs = sets.flatMap(x => x.pts.map(q => q[1]));
    if (!zs.length) return c;
    const sx = niceScale(Math.min(...zs), Math.max(...zs), 6), sy = niceScale(Math.min(...vs), Math.max(...vs), 6);
    const X = z => L + (z - sx.min) / (sx.max - sx.min) * pw, Y = v => T + ph - (v - sy.min) / (sy.max - sy.min) * ph;
    ctx.font = F(600, 24);
    for (let v = sy.min; v <= sy.max + 1e-9; v += sy.step) {
      if (st.grid) { ctx.strokeStyle = '#E6E1EC'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); }
      ctx.fillStyle = '#444'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(fmtTick(v, sy.step), L - 12, Y(v));
    }
    for (let z = sx.min; z <= sx.max + 1e-9; z += sx.step) { ctx.fillStyle = '#444'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(fmtTick(z, sx.step), X(z), T + ph + 10); }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.font = F(700, 26); ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText('Expected normal quantile (z)', L + pw / 2, T + ph + 52 * ts);
    ctx.save(); ctx.translate(40, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText(`Observed ${spec.yLabel || 'value'}`, 0, 0); ctx.restore();
    ctx.save(); ctx.beginPath(); ctx.rect(L, T, pw, ph); ctx.clip();
    sets.forEach(x => {
      ctx.strokeStyle = x.color; ctx.lineWidth = 3; ctx.setLineDash([12, 8]);
      ctx.beginPath(); ctx.moveTo(X(sx.min), Y(x.m + x.sd * sx.min)); ctx.lineTo(X(sx.max), Y(x.m + x.sd * sx.max)); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = x.color; ctx.globalAlpha = 0.75;
      x.pts.forEach(([z, v]) => { ctx.beginPath(); ctx.arc(X(z), Y(v), 7, 0, Math.PI * 2); ctx.fill(); });
      ctx.globalAlpha = 1;
    });
    ctx.restore();
    drawLegend(ctx, items, 'fill', st, lm, { W, H, L, T, pw, ph, ts });
    return c;
  }

  /* ---------- horizontal bars: one row per category (group or level), one bar per series, percentages ---------- */
  function hbarChart(spec, paletteName, st) {
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup(st);
    const perGroup = !!spec.perGroup && spec.series.length === 1;
    const items = perGroup ? [] : spec.series.map((s, i) => ({ name: s.name, color: pal[i % pal.length] }));
    const lm = legendMetrics(ctx, items, { ...st, legend: st.legend === 'inside' ? 'bottom' : st.legend }, ts);
    ctx.font = F(700, 26);
    const labW = Math.min(W * 0.32, Math.max(...spec.categories.map(t => ctx.measureText(t).width)) + 30);
    const L = 30 + labW, R = 90 + (lm.pos === 'right' ? lm.w + 40 : 0), T = 40 + (lm.pos === 'top' ? 70 * lm.ls : 0), B = 100 * ts + (lm.pos === 'bottom' ? 70 * lm.ls : 0);
    const pw = W - L - R, ph = H - T - B, nc = spec.categories.length, ns = spec.series.length, rh = ph / nc;
    const all = spec.series.flatMap(s => s.values), max = spec.percent === false ? Math.max(1, ...all) * 1.1 : Math.min(100, Math.max(10, Math.max(...all) * 1.15));
    const sc = niceScale(0, max, 6), x = v => L + v / sc.max * pw;
    ctx.font = F(600, 24); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = 0; v <= sc.max + 1e-9; v += sc.step) {
      if (st.grid) { ctx.strokeStyle = '#E6E1EC'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x(v), T); ctx.lineTo(x(v), T + ph); ctx.stroke(); }
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sc.step) + (spec.percent === false ? '' : '%'), x(v), T + ph + 12);
    }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.font = F(700, 26); ctx.fillStyle = '#333'; ctx.fillText(spec.yLabel || '', L + pw / 2, T + ph + 56 * ts);
    const gh = rh * widthOf(st, perGroup ? 0.55 : 0.8), bh = gh / (perGroup ? 1 : ns);
    spec.categories.forEach((cat, ci) => {
      ctx.font = F(700, 26); ctx.fillStyle = '#333'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      ctx.fillText(cat, L - 14, T + rh * (ci + 0.5));
      spec.series.forEach((s, si) => {
        const v = s.values[ci] || 0, color = perGroup ? pal[ci % pal.length] : pal[si % pal.length];
        const y0 = T + rh * ci + (rh - gh) / 2 + bh * (perGroup ? 0 : si) + bh * 0.06, h = bh * 0.88;
        fillBar(ctx, st, color, perGroup ? ci : si, L, y0, x(v) - L, h);
        ctx.font = F(700, 22); ctx.fillStyle = '#222'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
        ctx.fillText(`${Math.round(v * 10) / 10}${spec.percent === false ? '' : '%'}`, x(v) + 8, y0 + h / 2);
      });
    });
    drawLegend(ctx, items, 'fill', st, lm, { W, H, L, T, pw, ph, ts });
    return c;
  }

  /* ---------- donut charts: one per group, slices = categories ---------- */
  function pieChart(spec, paletteName, st) {
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup(st);
    const items = spec.series.map((s, i) => ({ name: s.name, color: pal[i % pal.length] }));
    const lm = legendMetrics(ctx, items, { ...st, legend: st.legend === 'inside' ? 'bottom' : st.legend }, ts);
    const T = 30 + (lm.pos === 'top' ? 70 * lm.ls : 0), B = 80 * ts + (lm.pos === 'bottom' ? 70 * lm.ls : 0), R = 30 + (lm.pos === 'right' ? lm.w + 40 : 0);
    const k = spec.categories.length, cw = (W - 30 - R) / k, r = Math.min(cw * 0.42, (H - T - B) / 2 - 10), r0 = spec.full ? 0 : r * 0.52; // full pie or donut
    spec.categories.forEach((cat, ci) => {
      const cx = 30 + cw * (ci + 0.5), cy = T + (H - T - B) / 2;
      let a0 = -Math.PI / 2;
      spec.series.forEach((s, si) => {
        const v = (s.values[ci] || 0) / 100;
        if (v <= 0) return;
        const a1 = a0 + v * 2 * Math.PI;
        ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); if (r0) ctx.arc(cx, cy, r0, a1, a0, true); else ctx.lineTo(cx, cy); ctx.closePath();
        ctx.fillStyle = st.barFill === 'hatched' ? hatch(ctx, pal[si % pal.length], si) : pal[si % pal.length]; ctx.fill();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        if (v >= 0.06) {
          const am = (a0 + a1) / 2, rm = r0 ? (r + r0) / 2 : r * 0.64;
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
    if (spec.diagonal !== false) {
      ctx.strokeStyle = '#999'; ctx.lineWidth = 2.5; ctx.setLineDash([12, 10]);
      ctx.beginPath(); ctx.moveTo(X(0), Y(0)); ctx.lineTo(X(1), Y(1)); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.font = F(700, 28); ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ctx.fillText('1 - Specificity', L + pw / 2, T + ph + 60 * ts);
    ctx.save(); ctx.translate(40, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText('Sensitivity', 0, 0); ctx.restore();
    spec.series.forEach((s, i) => {
      const pts = [...s.points].sort((a, b) => a.fpr - b.fpr || a.tpr - b.tpr);
      // optional shaded area under a single curve
      if (spec.fill && spec.series.length === 1) {
        ctx.fillStyle = items[i].color + '22'; ctx.beginPath(); ctx.moveTo(X(0), Y(0));
        pts.forEach(q => ctx.lineTo(X(q.fpr), Y(q.tpr))); ctx.lineTo(X(1), Y(0)); ctx.closePath(); ctx.fill();
      }
      ctx.strokeStyle = items[i].color; ctx.lineWidth = { thin: 3, bold: 8 }[spec.lineW] || 5; ctx.setLineDash(items[i].dash ? [16, 10] : []);
      ctx.beginPath(); pts.forEach((q, k) => k ? ctx.lineTo(X(q.fpr), Y(q.tpr)) : ctx.moveTo(X(q.fpr), Y(q.tpr))); ctx.stroke();
    });
    ctx.setLineDash([]);
    // optional cut-off point on each curve, labelled with its value (labels moved down until they do not overlap)
    const placed = [];
    spec.series.forEach((s, i) => {
      if (!s.cut) return;
      const x = X(s.cut.fpr), y = Y(s.cut.tpr);
      ctx.fillStyle = '#fff'; ctx.strokeStyle = items[i].color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(x, y, 11, 0, 2 * Math.PI); ctx.fill(); ctx.stroke();
      ctx.fillStyle = items[i].color; ctx.beginPath(); ctx.arc(x, y, 5, 0, 2 * Math.PI); ctx.fill();
      if (!s.cut.label) return;
      ctx.font = F(700, 24); ctx.textAlign = 'left'; ctx.textBaseline = 'top';
      const w = ctx.measureText(s.cut.label).width + 8, h = 30;
      let lx = Math.min(x + 16, L + pw - w), ly = y + 8;
      const hit = () => placed.some(b => lx < b.x + b.w && lx + w > b.x && ly < b.y + b.h && ly + h > b.y);
      for (let k = 0; k < 12 && hit(); k++) ly += h;
      placed.push({ x: lx, y: ly, w, h });
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(lx - 4, ly - 2, w, h);
      ctx.fillStyle = items[i].color; ctx.fillText(s.cut.label, lx, ly);
    });
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
  // flowchart appearance (c.style): theme classic / tinted / filled / bw, accent colour, corners, line weight, text size, font,
  // section labels and shadows; roles: main path boxes, side (exclusion) boxes and the group columns
  const mix = (hex, to, a) => { const h = n => parseInt(hex.slice(n, n + 2), 16), t = n => parseInt(to.slice(n, n + 2), 16);
    return '#' + [1, 3, 5].map(n => Math.round(h(n) + (t(n) - h(n)) * a).toString(16).padStart(2, '0')).join(''); };
  const FLOW_LABELS = { consort: ['Enrollment', 'Allocation', 'Follow-Up', 'Analysis'], strobe: ['Identification', 'Inclusion', 'Follow-Up', 'Analysis'], stard: ['Enrollment', 'Index test', 'Reference', 'Diagnosis'] };
  function flowStyle(c, pal) {
    const st = c.style || {}, theme = st.theme || 'classic';
    const accent = theme === 'bw' ? '#444444' : /^#[0-9a-f]{6}$/i.test(st.color || '') ? st.color : pal[0];
    const fs = { small: 23, large: 31 }[st.textSize] || 27;
    const F = {
      classic: { main: ['#ffffff', '#222222', '#111111'], side: ['#ffffff', '#222222', '#111111'], col: ['#ffffff', '#222222', '#111111'] },
      bw: { main: ['#ffffff', '#222222', '#111111'], side: ['#ffffff', '#222222', '#111111'], col: ['#ffffff', '#222222', '#111111'] },
      tinted: { main: [mix(accent, '#ffffff', 0.8), accent, '#111111'], side: ['#f5f5f5', '#9a9a9a', '#222222'], col: [mix(accent, '#ffffff', 0.9), accent, '#111111'] },
      filled: { main: [accent, accent, '#ffffff'], side: ['#ffffff', '#9a9a9a', '#222222'], col: [mix(accent, '#ffffff', 0.86), accent, '#111111'] }
    }[theme] || {};
    return {
      fill: r => (F[r] || F.main)[0], stroke: r => (F[r] || F.main)[1], text: r => (F[r] || F.main)[2],
      accent, arrow: theme === 'classic' || theme === 'bw' ? '#222222' : mix(accent, '#000000', 0.35),
      lw: { thin: 1.6, bold: 4 }[st.lines] || 2.5, radius: st.corners === 'rounded' ? 14 : 0, fs, lh: Math.round(fs * 1.3),
      pills: st.pills !== false, shadow: !!st.shadow, font: FONTS[st.font] || FONTS.sans,
      pill: /^#[0-9a-f]{6}$/i.test(st.pillColor || '') ? st.pillColor : accent, pillText: /^#[0-9a-f]{6}$/i.test(st.pillTextColor || '') ? st.pillTextColor : '#fff'
    };
  }
  function flowBox(ctx, S, x, y, w, h, role) {
    ctx.save();
    if (S.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4; }
    ctx.fillStyle = S.fill(role);
    if (S.radius) { ctx.beginPath(); ctx.roundRect(x, y, w, h, S.radius); ctx.fill(); } else ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.strokeStyle = S.stroke(role); ctx.lineWidth = S.lw;
    if (S.radius) { ctx.beginPath(); ctx.roundRect(x, y, w, h, S.radius); ctx.stroke(); } else ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = S.text(role);
  }
  function consort(c, groupLabels, palName = 'brand') {
    const S = flowStyle(c, palette(palName));
    FONT = S.font;
    if (c.type === 'simple') return simpleFlow(c, groupLabels, palName, S);
    const pal = palette(palName), type = c.type || 'consort';
    const branches = type === 'stard' ? stardBranches(c) : null;
    const k = branches ? branches.length : groupLabels.length;
    const cv = document.createElement('canvas');
    const CW = 1200;
    const ctx = cv.getContext('2d');
    const gutter = S.pills ? 80 : 0, pad = 18, colW = (CW - gutter - pad * (k + 1)) / k;
    const fs = S.fs, lh = S.lh, MIN_ROW = S.pills ? 175 : 0; // rows tall enough for the rotated section labels
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
    // section labels: the user's own text where given, else the defaults of the flowchart type
    const own = ((c.style || {}).labels || {})[type] || [];
    const PILLS = FLOW_LABELS[type].map((d, i) => String(own[i] || '').trim() || d);

    const hA = boxH(assessed), hE = boxH(excluded), hR = boxH(randomized);
    const hAl = Math.max(MIN_ROW, ...alloc.map(boxH)), hF = Math.max(MIN_ROW, ...follow.map(boxH)), hAn = Math.max(MIN_ROW, ...anal.map(boxH));
    const gap = 60;
    const yA = 30, yE = yA + hA + 20, yR = Math.max(yE + hE + 20, yA + hA + gap);
    const yAl = yR + hR + gap + 20, yF = yAl + hAl + gap, yAn = yF + hF + gap;
    cv.width = CW; cv.height = yAn + hAn + 30;
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, cv.width, cv.height);

    const midX = gutter + (CW - gutter) / 2;
    const box = (x, y, w, h, lines, align = 'center', role = 'main') => {
      flowBox(ctx, S, x, y, w, h, role);
      let yy = y + 14;
      ctx.textBaseline = 'top';
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
      ctx.strokeStyle = S.arrow; ctx.fillStyle = S.arrow; ctx.lineWidth = S.lw;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath(); ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - 16 * Math.cos(a - 0.4), y2 - 16 * Math.sin(a - 0.4));
      ctx.lineTo(x2 - 16 * Math.cos(a + 0.4), y2 - 16 * Math.sin(a + 0.4)); ctx.fill();
    };
    const pill = (label, y1, y2) => {
      if (!S.pills) return;
      ctx.fillStyle = S.pill;
      const x = 10, w = 54;
      ctx.beginPath(); ctx.roundRect(x, y1, w, y2 - y1, 18); ctx.fill();
      ctx.save(); ctx.translate(x + w / 2, (y1 + y2) / 2); ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = S.pillText; ctx.font = `700 24px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      // long labels shrink to fit their section
      const room = y2 - y1 - 16, tw = ctx.measureText(label).width;
      if (tw > room) ctx.font = `700 ${Math.max(14, Math.floor(24 * room / tw))}px ${FONT}`;
      ctx.fillText(label, 0, 0); ctx.restore();
    };

    pill(PILLS[0], yA, yR + hR);
    pill(PILLS[1], yAl, yAl + hAl);
    pill(PILLS[2], yF, yF + hF);
    pill(PILLS[3], yAn, yAn + hAn);

    box(midX - topW / 2, yA, topW, hA, assessed);
    if (exTotal) {
      const exX = midX + 60;
      box(exX, yE, exW, hE, excluded, 'left', 'side');
      arrow(midX, yE + hE / 2, exX, yE + hE / 2);
    }
    arrow(midX, yA + hA, midX, yR);
    box(midX - topW / 2, yR, topW, hR, randomized);

    const colX = i => gutter + pad + i * (colW + pad);
    const busY = yR + hR + gap / 2 + 10;
    ctx.strokeStyle = S.arrow; ctx.lineWidth = S.lw;
    ctx.beginPath(); ctx.moveTo(midX, yR + hR); ctx.lineTo(midX, busY);
    ctx.moveTo(colX(0) + colW / 2, busY); ctx.lineTo(colX(k - 1) + colW / 2, busY); ctx.stroke();
    for (let i = 0; i < k; i++) {
      const x = colX(i), cx = x + colW / 2;
      arrow(cx, busY, cx, yAl);
      box(x, yAl, colW, hAl, alloc[i], 'center', 'col');
      arrow(cx, yAl + hAl, cx, yF);
      box(x, yF, colW, hF, follow[i], 'center', 'col');
      arrow(cx, yF + hF, cx, yAn);
      box(x, yAn, colW, hAn, anal[i], 'center', 'col');
    }
    return cv;
  }

  // STARD columns: positive and negative always, inconclusive only when used
  const stardBranches = c => c.stard.branches.filter((b, i) => i < 2 || +b.n > 0);

  /* ---------- simple flowchart: a chain of steps with optional exclusions, optionally split into the groups ---------- */
  function simpleFlow(c, groupLabels, palName, S) {
    const cv = document.createElement('canvas'), ctx = cv.getContext('2d');
    const CW = 1200, fs = S.fs, lh = S.lh, boxW = 520, exW = 420, gap = 56;
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
    const box = (x, yy, w, h, text, bold, align = 'center', role = 'main') => {
      flowBox(ctx, S, x, yy, w, h, role);
      ctx.textBaseline = 'top'; ctx.font = `${bold ? 700 : 400} ${fs}px ${FONT}`; ctx.textAlign = align;
      let ty = yy + 13;
      text.split('\n').forEach(par => { ty += wrapText(ctx, par, align === 'center' ? x + w / 2 : x + 14, ty, w - 28, lh) * lh; });
    };
    const arrow = (x1, y1, x2, y2) => {
      ctx.strokeStyle = S.arrow; ctx.fillStyle = S.arrow; ctx.lineWidth = S.lw;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      const a = Math.atan2(y2 - y1, x2 - x1);
      ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(x2 - 16 * Math.cos(a - 0.4), y2 - 16 * Math.sin(a - 0.4)); ctx.lineTo(x2 - 16 * Math.cos(a + 0.4), y2 - 16 * Math.sin(a + 0.4)); ctx.fill();
    };
    layout.forEach((b, i) => {
      box(midX - boxW / 2, b.y, boxW, b.h, b.text, true);
      if (b.ex) {
        const ey = b.y + b.h + (gap + 24) / 2, ex0 = midX + 60;
        box(ex0, ey, exW, b.ex.h, b.ex.text, false, 'left', 'side');
        arrow(midX, ey + b.ex.h / 2, ex0, ey + b.ex.h / 2);
      }
      if (i < layout.length - 1) arrow(midX, b.y + b.h, midX, layout[i + 1].y);
    });
    if (split) {
      const last = layout[layout.length - 1], cx = i => pad + colW / 2 + i * ((CW - 2 * pad - colW) / (k - 1));
      ctx.strokeStyle = S.arrow; ctx.lineWidth = S.lw;
      ctx.beginPath(); ctx.moveTo(midX, last.y + last.h); ctx.lineTo(midX, busY); ctx.moveTo(cx(0), busY); ctx.lineTo(cx(k - 1), busY); ctx.stroke();
      groupLabels.forEach((g, i) => { arrow(cx(i), busY, cx(i), y); box(cx(i) - colW / 2, y, colW, gH, `${g}\n(n=${c.groups[i].analysed})`, true, 'center', 'col'); });
    }
    return cv;
  }

  return { draw, consort, PALETTES, PALETTE_NAMES, PALETTE_GROUPS, DEFAULT_STYLE, FLOW_LABELS };
})();

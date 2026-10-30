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
  let TICKS = 6; // about how many axis ticks: fewer (4), normal (6) or more (10), set per chart from the style
  // figure shapes (logical canvas size before the resolution multiplier)
  const ASPECTS = { wide: [1500, 820], standard: [1500, 1125], square: [1300, 1300], tall: [1100, 1400] };
  const TEXT = { normal: 1, large: 1.25, xlarge: 1.5 };
  const DEFAULT_STYLE = { text: 'normal', aspect: 'wide', barFill: 'gradient', grid: true, arrows: true, legend: 'bottom', res: 1, yAxis: 'auto',
    legendSize: 'normal', legendTitle: '', legendFrame: false, barWidth: 'normal', boxMean: false };
  // bar / box width multiplier, never wider than the category slot
  const BAR_W = { thin: 0.7, normal: 1, wide: 1.3 };
  const widthOf = (st, frac) => Math.min(0.95, frac * (BAR_W[st.barWidth] || 1));
  const LEGEND_SIZE = { small: 0.85, normal: 1, large: 1.2 };
  const palette = p => Array.isArray(p) && p.length ? p : PALETTES[p] || PALETTES.brand;

  /* ---------- vector export: a 2D context that records the drawing as SVG, so every chart's code runs unchanged ---------- */
  let VECTOR = false; // set while drawing a chart for SVG export
  const makeCanvas = (w, h) => { if (VECTOR) return new SvgCanvas(w, h); const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
  const xmlEsc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const n2 = v => +(+v).toFixed(2);
  function SvgCanvas(w, h) { this.width = w; this.height = h; this._svg = true; const ctx = new SvgCtx(); this.getContext = () => ctx; this._ctx = ctx; }
  SvgCanvas.prototype.toSVG = function () {
    const x = this._ctx;
    return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${this.width}" height="${this.height}" viewBox="0 0 ${this.width} ${this.height}">`
      + `<defs>${x.defs.join('')}</defs>${x.els.join('')}</svg>`;
  };
  function SvgCtx() {
    this.els = []; this.defs = []; this.stack = []; this.path = ''; this.cur = null;
    this.st = { fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, dash: [], globalAlpha: 1, font: '10px sans-serif', textAlign: 'start', textBaseline: 'alphabetic', m: [1, 0, 0, 1, 0, 0], clip: null, lineCap: 'butt', lineJoin: 'miter' };
    this.meas = document.createElement('canvas').getContext('2d');
  }
  let SVG_ID = 0;
  const SP = SvgCtx.prototype;
  ['fillStyle', 'strokeStyle', 'lineWidth', 'globalAlpha', 'textAlign', 'textBaseline', 'lineCap', 'lineJoin'].forEach(k => Object.defineProperty(SP, k, { get() { return this.st[k]; }, set(v) { this.st[k] = v; } }));
  Object.defineProperty(SP, 'font', { get() { return this.st.font; }, set(v) { this.st.font = v; this.meas.font = v; } });
  SP.save = function () { this.stack.push({ ...this.st, m: this.st.m.slice(), dash: this.st.dash.slice() }); };
  SP.restore = function () { if (this.stack.length) { this.st = this.stack.pop(); this.meas.font = this.st.font; } };
  SP.mul = function (n) { const m = this.st.m; this.st.m = [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]]; };
  SP.scale = function (x, y) { this.mul([x, 0, 0, y, 0, 0]); };
  SP.translate = function (x, y) { this.mul([1, 0, 0, 1, x, y]); };
  SP.rotate = function (a) { const c = Math.cos(a), s = Math.sin(a); this.mul([c, s, -s, c, 0, 0]); };
  SP.setTransform = function (a, b, c, d, e, f) { this.st.m = [a, b, c, d, e, f]; };
  SP.pt = function (x, y) { const m = this.st.m; return `${n2(m[0] * x + m[2] * y + m[4])},${n2(m[1] * x + m[3] * y + m[5])}`; };
  SP.k = function () { const m = this.st.m; return Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2])) || 1; };
  SP.beginPath = function () { this.path = ''; this.cur = null; };
  SP.moveTo = function (x, y) { this.path += 'M' + this.pt(x, y); this.cur = [x, y]; };
  SP.lineTo = function (x, y) { this.path += (this.cur ? 'L' : 'M') + this.pt(x, y); this.cur = [x, y]; };
  SP.closePath = function () { this.path += 'Z'; };
  SP.rect = function (x, y, w, h) { this.path += `M${this.pt(x, y)}L${this.pt(x + w, y)}L${this.pt(x + w, y + h)}L${this.pt(x, y + h)}Z`; this.cur = [x, y]; };
  SP.roundRect = function (x, y, w, h, r) { r = Math.min(+r || 0, w / 2, h / 2); this.moveTo(x + r, y); this.lineTo(x + w - r, y); this.arc(x + w - r, y + r, r, -Math.PI / 2, 0); this.lineTo(x + w, y + h - r);
    this.arc(x + w - r, y + h - r, r, 0, Math.PI / 2); this.lineTo(x + r, y + h); this.arc(x + r, y + h - r, r, Math.PI / 2, Math.PI); this.lineTo(x, y + r); this.arc(x + r, y + r, r, Math.PI, 1.5 * Math.PI); this.closePath(); };
  SP.quadraticCurveTo = function (a, b, x, y) { this.path += `Q${this.pt(a, b)} ${this.pt(x, y)}`; this.cur = [x, y]; };
  SP.bezierCurveTo = function (a, b, c, d, x, y) { this.path += `C${this.pt(a, b)} ${this.pt(c, d)} ${this.pt(x, y)}`; this.cur = [x, y]; };
  SP.arc = function (cx, cy, r, a0, a1, ccw) {
    const T = 2 * Math.PI; let d = a1 - a0;
    if (!ccw) d = d >= T ? T : ((d % T) + T) % T; else d = -d >= T ? -T : -((((a0 - a1) % T) + T) % T);
    const n = Math.max(8, Math.ceil(Math.abs(d) / (Math.PI / 24)));
    for (let i = 0; i <= n; i++) { const a = a0 + d * i / n, x = cx + r * Math.cos(a), y = cy + r * Math.sin(a); this.path += (i === 0 && !this.cur ? 'M' : 'L') + this.pt(x, y); this.cur = [x, y]; }
  };
  SP.paint = function (p) {
    if (typeof p === 'string') return p;
    const id = 'v' + (++SVG_ID);
    if (p && p.g === 'lin') this.defs.push(`<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${p.a[0]}" y1="${p.a[1]}" x2="${p.b[0]}" y2="${p.b[1]}">${p.stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>`);
    else if (p && p.g === 'pat') this.defs.push(`<pattern id="${id}" patternUnits="userSpaceOnUse" width="${p.w}" height="${p.h}" patternTransform="matrix(${p.m.map(n2).join(' ')})"><image width="${p.w}" height="${p.h}" xlink:href="${p.url}"/></pattern>`);
    else return '#000';
    return `url(#${id})`;
  };
  SP.attrs = function () { return `${this.st.globalAlpha < 1 ? ` opacity="${n2(this.st.globalAlpha)}"` : ''}${this.st.clip ? ` clip-path="url(#${this.st.clip})"` : ''}`; };
  SP.fill = function () { if (this.path) this.els.push(`<path d="${this.path}" fill="${xmlEsc(this.paint(this.st.fillStyle))}"${this.attrs()}/>`); };
  SP.stroke = function () {
    if (!this.path) return; const k = this.k(), dash = this.st.dash.length ? ` stroke-dasharray="${this.st.dash.map(v => n2(v * k)).join(' ')}"` : '';
    this.els.push(`<path d="${this.path}" fill="none" stroke="${xmlEsc(this.paint(this.st.strokeStyle))}" stroke-width="${n2(this.st.lineWidth * k)}" stroke-linecap="${this.st.lineCap}" stroke-linejoin="${this.st.lineJoin}"${dash}${this.attrs()}/>`);
  };
  SP.fillRect = function (x, y, w, h) { const p = this.path, c = this.cur; this.beginPath(); this.rect(x, y, w, h); this.fill(); this.path = p; this.cur = c; };
  SP.strokeRect = function (x, y, w, h) { const p = this.path, c = this.cur; this.beginPath(); this.rect(x, y, w, h); this.stroke(); this.path = p; this.cur = c; };
  SP.clearRect = function (x, y, w, h) { const f = this.st.fillStyle; this.st.fillStyle = '#fff'; this.fillRect(x, y, w, h); this.st.fillStyle = f; };
  SP.clip = function () { const id = 'c' + (++SVG_ID); this.defs.push(`<clipPath id="${id}"><path d="${this.path}"/></clipPath>`); this.st.clip = id; };
  SP.setLineDash = function (d) { this.st.dash = (d || []).slice(); };
  SP.getLineDash = function () { return this.st.dash.slice(); };
  SP.measureText = function (t) { return this.meas.measureText(t); };
  SP.createLinearGradient = function (x0, y0, x1, y1) { const m = this.st.m, P = (x, y) => [n2(m[0] * x + m[2] * y + m[4]), n2(m[1] * x + m[3] * y + m[5])];
    return { g: 'lin', a: P(x0, y0), b: P(x1, y1), stops: [], addColorStop(o, c) { this.stops.push([o, c]); } }; };
  SP.createPattern = function (img) { return { g: 'pat', url: img.toDataURL('image/png'), w: img.width, h: img.height, m: this.st.m.slice() }; };
  SP.fillText = function (t, x, y) {
    const f = /^(italic\s+)?(\d{3}|bold|normal)?\s*(\d+(?:\.\d+)?)px\s+(.*)$/.exec(this.st.font) || [], size = +f[3] || 10;
    const anchor = { center: 'middle', right: 'end', end: 'end' }[this.st.textAlign] || 'start', dy = { top: 0.8, hanging: 0.8, middle: 0.35, bottom: -0.22, ideographic: -0.22 }[this.st.textBaseline] || 0;
    this.els.push(`<text transform="matrix(${this.st.m.map(n2).join(' ')})" x="${n2(x)}" y="${n2(y + dy * size)}" font-family="${xmlEsc(f[4] || 'sans-serif')}" font-size="${size}"${f[2] && f[2] !== 'normal' ? ` font-weight="${f[2]}"` : ''}${f[1] ? ' font-style="italic"' : ''} text-anchor="${anchor}" fill="${xmlEsc(this.paint(this.st.fillStyle))}"${this.attrs()}>${xmlEsc(t)}</text>`);
  };
  SP.drawImage = function (img, x = 0, y = 0, w, h) {
    if (img._svg) { const x2 = img._ctx; this.defs.push(...x2.defs); this.els.push(`<g transform="matrix(${this.st.m.map(n2).join(' ')}) translate(${n2(x)} ${n2(y)})${w ? ` scale(${n2(w / img.width)} ${n2(h / img.height)})` : ''}"${this.attrs()}>${x2.els.join('')}</g>`); return; }
    const url = img.toDataURL ? img.toDataURL('image/png') : img.src;
    this.els.push(`<image transform="matrix(${this.st.m.map(n2).join(' ')})" x="${n2(x)}" y="${n2(y)}" width="${n2(w || img.width)}" height="${n2(h || img.height)}" xlink:href="${url}"${this.attrs()}/>`);
  };
  SP.getImageData = function () { throw new Error('not available in vector export'); };

  // canvas with logical size W×H drawn at `res` times the pixels, and a font helper scaled by text size
  function setup(st) {
    const [W, H] = ASPECTS[st.aspect] || ASPECTS.wide, ts = TEXT[st.text] || +st.text || 1, res = VECTOR ? 1 : +st.res || 1;
    const c = makeCanvas(W * res, H * res);
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
    if (ticks === 6) ticks = TICKS; // the y-axis density chosen in the style
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
  // the text above a significant comparison: stars (default), the exact P value, or both
  function sigMark(p, alpha, st) {
    const s = stars(p, alpha); if (!s || !st.sigLabel || st.sigLabel === 'stars') return s;
    let t = p < 0.001 ? '< 0.001' : '= ' + p.toFixed(3);
    if (st.pLead === false) t = t.replace(/0\./, '.');
    return st.sigLabel === 'both' ? `${s} P ${t}` : `P ${t}`;
  }
  // centred text with an italic P ("P = 0.013")
  function fillSig(ctx, t, x, y) {
    const i = t.indexOf('P '); if (i < 0) { ctx.fillText(t, x, y); return; }
    const font = ctx.font, it = 'italic ' + font, a = t.slice(0, i), b = t.slice(i + 1);
    const wa = ctx.measureText(a).width, wb = ctx.measureText(b).width; ctx.font = it; const wp = ctx.measureText('P').width; ctx.font = font;
    const align = ctx.textAlign; ctx.textAlign = 'left'; let x0 = x - (wa + wp + wb) / 2;
    ctx.fillText(a, x0, y); x0 += wa; ctx.font = it; ctx.fillText('P', x0, y); x0 += wp; ctx.font = font; ctx.fillText(b, x0, y);
    ctx.textAlign = align;
  }
  // groups told apart without colour: a marker shape and a dash pattern each (greyscale print)
  const DASHES = [[], [18, 10], [5, 8], [22, 8, 5, 8], [10, 6], [2, 6]];
  function marker(ctx, k, x, y, r) {
    ctx.beginPath();
    switch (k % 6) {
      case 1: ctx.rect(x - r * 0.88, y - r * 0.88, r * 1.76, r * 1.76); break;
      case 2: ctx.moveTo(x, y - r * 1.15); ctx.lineTo(x + r, y + r * 0.75); ctx.lineTo(x - r, y + r * 0.75); ctx.closePath(); break;
      case 3: ctx.moveTo(x, y - r * 1.2); ctx.lineTo(x + r * 1.05, y); ctx.lineTo(x, y + r * 1.2); ctx.lineTo(x - r * 1.05, y); ctx.closePath(); break;
      case 4: ctx.moveTo(x, y + r * 1.15); ctx.lineTo(x + r, y - r * 0.75); ctx.lineTo(x - r, y - r * 0.75); ctx.closePath(); break;
      case 5: ctx.arc(x, y, r * 0.75, 0, Math.PI * 2); ctx.save(); ctx.lineWidth = r * 0.5; ctx.strokeStyle = ctx.fillStyle; ctx.setLineDash([]); ctx.stroke(); ctx.restore(); return;
      default: ctx.arc(x, y, r, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  const LINE_W = { thin: 0.6, thick: 1.5 };
  const lw = st => LINE_W[st.lineWeight] || 1;
  // gridlines: solid (default), dashed, dotted or darker
  function gridPen(ctx, st) { ctx.strokeStyle = st.gridStyle === 'dark' ? '#C4BCCF' : '#E6E1EC'; ctx.setLineDash(st.gridStyle === 'dashed' ? [10, 8] : st.gridStyle === 'dotted' ? [2, 6] : []); }
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
        ctx.strokeStyle = it.color; ctx.lineWidth = 5; ctx.setLineDash(it.dashArr || (it.dash ? [12, 7] : []));
        ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + 46 * m.q, yy); ctx.stroke(); ctx.setLineDash([]);
        if (it.marker != null) { ctx.fillStyle = it.color; marker(ctx, it.marker, x + 23 * m.q, yy, 9 * m.q); }
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
  // points of the last chart with their values (logical coordinates), for hover values in the preview
  let HITS = [];
  const hit = (x, y, t) => HITS.push({ x, y, t });
  function draw(spec, paletteName = 'brand', style = {}) {
    FONT = FONTS[style.font] || FONTS.sans;
    TICKS = { fewer: 4, more: 10 }[style.ticks] || 6;
    HITS = [];
    // a figure may have its own shape (step 7)
    if (spec.aspect && ASPECTS[spec.aspect]) style = { ...style, aspect: spec.aspect };
    // a chart of one series (one-group studies) needs no legend
    const c = drawChart(spec, paletteName, spec.legend === false ? { ...style, legend: 'none' } : style);
    const out = spec.title ? withTitle(c, spec.title, { ...DEFAULT_STYLE, ...style }) : c;
    const res = VECTOR ? 1 : +style.res || 1, band = (out.height - c.height) / res;
    hitsOf = { W: out.width / res, H: out.height / res, list: HITS.map(h => ({ ...h, y: h.y + band })) };
    if (style.frame) { const x = out.getContext('2d'), w = Math.max(2, 3 * (+style.res || 1)); x.setTransform(1, 0, 0, 1, 0, 0); x.strokeStyle = '#555'; x.lineWidth = w; x.strokeRect(w / 2, w / 2, out.width - w, out.height - w); }
    return out;
  }
  let hitsOf = { W: 1, H: 1, list: [] };
  // the same chart as SVG text (vector graphics for journals)
  function drawSVG(spec, paletteName, style = {}) { VECTOR = true; try { return draw(spec, paletteName, { ...style, res: 1 }).toSVG(); } finally { VECTOR = false; } }
  // log10 scale: data, means and their error bars are drawn as logarithms and the ticks labelled with the original values
  function logSpec(spec) {
    const L = v => v > 0 ? Math.log10(v) : NaN, out = { ...spec, _log: true };
    out.series = spec.series.map(s => {
      if (s.data) return { ...s, data: s.data.map(a => a.filter(v => v > 0).map(Math.log10)) };
      const err = s.err, lo = s.values.map((v, i) => err && err[i] != null ? L(Math.max(v - err[i], v / 100)) : s.lo ? L(s.lo[i]) : null), hi = s.values.map((v, i) => err && err[i] != null ? L(v + err[i]) : s.hi ? L(s.hi[i]) : null);
      return { ...s, values: s.values.map(L), err: null, lo: lo.some(x => x !== null) ? lo : null, hi: hi.some(x => x !== null) ? hi : null };
    });
    if (spec.individual) out.individual = spec.individual.map(g => g.map(p => p.map(L)));
    if (isFinite(spec.refLine)) out.refLine = L(spec.refLine);
    return out;
  }
  const FS = { small: 0.8, normal: 1, large: 1.25, xlarge: 1.5 };
  function withTitle(src, title, st) {
    const res = VECTOR ? 1 : +st.res || 1, ts = TEXT[st.text] || +st.text || 1, out = makeCanvas(src.width, src.height), ctx = out.getContext('2d');
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
    if (spec.type === 'heat') return heatChart(spec, paletteName, st);
    if (spec.type === 'waterfall') return waterfallChart(spec, paletteName, st);
    if (spec.type === 'swimmer') return swimmerChart(spec, paletteName, st);
    if (spec.logY && ['line', 'box', 'dot', 'violin'].includes(spec.type)) spec = logSpec(spec);
    // text sizes of the axis numbers, the axis titles and the value labels
    const AX = FS[st.axisSize] || 1, TL = FS[st.titleSize] || 1, VL = FS[st.valueSize] || 1;
    if (spec.type === 'pie') return pieChart(spec, paletteName, st);
    if (spec.type === 'hbar') return hbarChart(spec, paletteName, st);
    if (spec.type === 'qq') return qqChart(spec, paletteName, st);
    if (spec.type === 'forest') return forestChart(spec, paletteName, st);
    if (spec.type === 'scatter') return scatter(spec, paletteName, st);
    if (spec.type === 'roc') return rocChart(spec, paletteName, st);
    if (spec.type === 'km') return kmChart(spec, paletteName, st);
    if (spec.type === 'curve') return curveChart(spec, paletteName, st);
    if (spec.type === 'margin') return marginChart(spec, paletteName, st);
    if (spec.type === 'nomogram') return nomogramChart(spec, paletteName, st);
    if (spec.type === 'ba') return baChart(spec, paletteName, st);
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup(st);
    // significance letters (a, b, c) above the groups instead of brackets
    const letters = st.sigLabel === 'letters' && Array.isArray(spec.letters) && spec.letters.some(Boolean) ? spec.letters : null;
    const brackets = letters ? [] : (spec.sig || []).filter(q => stars(q.p, spec.alpha));
    const catStars = letters ? spec.letters : (spec.sigCat || []).map(p => stars(p, spec.alpha));

    const perGroup = !!spec.perGroup && spec.series.length === 1, shapes = st.series === 'shapes';
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
    const fit = spec._log || (spec.type !== 'bar' && !spec.percent && (st.yAxis === 'fit' || (st.yAxis !== 'zero' && spec.type === 'line')));
    if (!fit && lo > 0) lo = 0;
    if (fit) { const pad = (hi - lo) * 0.1 || 1; lo = Math.max(lo > 0 && spec.type === 'line' && st.yAxis !== 'fit' ? 0 : -Infinity, lo - pad); }
    let sc = niceScale(lo, spec.percent ? hi : hi * (spec.labels ? 1.08 : 1.02), 6, spec.integer);
    if (spec.percent && sc.max > 100) sc.max = 100;
    // a range chosen for this figure (y min / max); data outside it are clipped
    const fixY = isFinite(spec.yMin) || isFinite(spec.yMax);
    if (fixY) {
      const a = isFinite(spec.yMin) ? +spec.yMin : sc.min, b = isFinite(spec.yMax) ? +spec.yMax : sc.max;
      if (b > a) { const ns = niceScale(a, b, 6, spec.integer); sc = { min: a, max: b, step: ns.step }; }
    }
    let y = v => T + ph - (v - sc.min) / (sc.max - sc.min) * ph;
    // room above the data for stacked significance brackets / stars
    const dataHi = hi, BR0 = (spec.labels ? 70 : 34) * ts, BRSTEP = 50 * ts;
    const need = brackets.length ? BR0 + BRSTEP * brackets.length : catStars.some(Boolean) ? 70 * ts : 0;
    for (let top = hi, tries = 0; !fixY && need && y(dataHi) - need < T && tries < 12; tries++) {
      top += (top - sc.min) * 0.12;
      sc = niceScale(lo, top, 6, spec.integer);
      y = v => T + ph - (v - sc.min) / (sc.max - sc.min) * ph;
    }

    // grid + y axis
    ctx.font = F(600, 26); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    // panel: classic (default), grey background with white gridlines, or minimal (no axis lines)
    if (st.panel === 'grey') { ctx.fillStyle = '#EBEBEB'; ctx.fillRect(L, T, pw, ph); }
    ctx.font = F(600, 26 * AX);
    for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) {
      if (spec.percent && v > 100 + 1e-9) break;
      const yy = y(v);
      ctx.strokeStyle = st.grid ? '#E6E1EC' : '#333'; ctx.lineWidth = st.grid ? 1.5 : 3; ctx.setLineDash([]);
      if (st.grid) gridPen(ctx, st);
      if (st.panel === 'grey') { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.5; }
      ctx.beginPath(); ctx.moveTo(st.grid ? L : L - 9, yy); ctx.lineTo(st.grid ? L + pw : L, yy); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = '#444'; ctx.fillText(spec._log ? String(+(10 ** v).toPrecision(3)) : fmtTick(v, sc.step) + (spec.percent ? '%' : ''), L - 14, yy);
    }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3;
    const ext = st.arrows && !st.panel ? 20 : 0;
    if (!st.panel) { ctx.beginPath(); ctx.moveTo(L, T - ext); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw + ext, T + ph); ctx.stroke(); }
    else if (st.panel === 'minimal') { ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke(); }
    if (st.arrows && !st.panel) {
      ctx.fillStyle = '#333';
      ctx.beginPath(); ctx.moveTo(L, T - 32); ctx.lineTo(L - 8, T - 16); ctx.lineTo(L + 8, T - 16); ctx.fill();
      ctx.beginPath(); ctx.moveTo(L + pw + 32, T + ph); ctx.lineTo(L + pw + 16, T + ph - 8); ctx.lineTo(L + pw + 16, T + ph + 8); ctx.fill();
    }

    // y label
    ctx.save(); ctx.translate(40, T + ph / 2); ctx.rotate(-Math.PI / 2);
    ctx.textAlign = 'center'; ctx.font = F(700, 28 * TL); ctx.fillStyle = '#333';
    ctx.fillText((spec.yLabel || '') + (spec._log ? ' (log scale)' : ''), 0, 0); ctx.restore();

    const nc = spec.categories.length, ns = spec.series.length;
    const cw = pw / nc;
    // line charts with real times: each timepoint at its time (e.g. 0, 2, 6, 24 h) instead of equal spacing
    const xv = spec.type === 'line' && Array.isArray(spec.xValues) && spec.xValues.length === nc && nc > 1 ? spec.xValues : null;
    // mosaic: 100% bars as wide as their group's share of the patients
    const mos = spec.type === 'stacked' && Array.isArray(spec.widths) && spec.widths.length === nc ? (() => { const tot = spec.widths.reduce((a, b) => a + b, 0) || 1, gap = 8, avail = pw - gap * (nc - 1); let x = L;
      return spec.widths.map(w => { const ww = avail * w / tot, o = { x, w: ww, c: x + ww / 2 }; x += ww + gap; return o; }); })() : null;
    const xAt = ci => mos ? mos[ci].c : xv ? L + cw / 2 + (xv[ci] - xv[0]) / ((xv[nc - 1] - xv[0]) || 1) * (pw - cw) : L + cw * (ci + 0.5);
    ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.font = F(700, 26 * AX); ctx.fillStyle = '#333';
    const catLines = Math.max(1, ...spec.categories.map(cat => measureLines(ctx, cat, cw - 10)));
    spec.categories.forEach((cat, i) => wrapText(ctx, cat, xAt(i), T + ph + 16, cw - 10, 30 * ts));
    if (spec.xLabel) { ctx.font = F(700, 26 * TL); ctx.fillText(spec.xLabel, L + pw / 2, T + ph + 16 + (catLines * 30 + 24) * ts); }

    // error bars: both directions with caps (default), without caps, or upward only from the mean (mid)
    const errBar = (x, a, b, w, mid, color) => {
      if (st.errBars === 'up' && isFinite(mid)) a = mid;
      if (st.errBars === 'nocap') w = 0;
      ctx.strokeStyle = st.errColor === 'group' && color ? (st.barFill === 'outline' || st.barFill === 'hatched' || spec.type === 'line' ? color : shade(color, -0.45)) : '#333'; ctx.lineWidth = 2.5 * lw(st); ctx.setLineDash([]);
      ctx.beginPath(); ctx.moveTo(x, y(a)); ctx.lineTo(x, y(b));
      if (w) { if (!(st.errBars === 'up' && isFinite(mid))) { ctx.moveTo(x - w, y(a)); ctx.lineTo(x + w, y(a)); } ctx.moveTo(x - w, y(b)); ctx.lineTo(x + w, y(b)); }
      ctx.stroke();
    };

    if (fixY) { ctx.save(); ctx.beginPath(); ctx.rect(L - 4, T - 60, pw + 8, ph + 60); ctx.clip(); }
    if (spec.type === 'bar') {
      const slots = perGroup ? 1 : ns;
      const gw = cw * widthOf(st, perGroup ? 0.42 : 0.78), bw = gw / slots;
      spec.series.forEach((s, si) => s.values.forEach((v, ci) => {
        const color = perGroup ? pal[ci % pal.length] : pal[si % pal.length];
        const x0 = L + cw * ci + (cw - gw) / 2 + bw * si + bw * 0.06, w = bw * 0.88;
        fillBar(ctx, st, color, perGroup ? ci : si, x0, y(v), w, y(Math.max(sc.min, 0)) - y(v));
        const cx = x0 + w / 2; hit(cx, y(v), `${perGroup ? spec.categories[ci] : `${s.name} · ${spec.categories[ci]}`}: ${+v.toPrecision(4)}${spec.percent ? '%' : ''}`);
        if (s.err && s.err[ci] != null && isFinite(s.err[ci])) errBar(cx, v - s.err[ci], v + s.err[ci], Math.min(14, w / 4), v, color);
        else if (s.lo && s.hi) errBar(cx, s.lo[ci], s.hi[ci], Math.min(14, w / 4), v, color);
        if (spec.labels) {
          ctx.fillStyle = '#222'; ctx.font = F(700, 24 * VL); ctx.textBaseline = 'bottom';
          const dec = spec.labelDec ?? 1, top = s.err && isFinite(s.err[ci]) ? v + s.err[ci] : s.hi ? s.hi[ci] : v;
          ctx.fillText((Math.round(v * 10 ** dec) / 10 ** dec) + (spec.percent ? '%' : ''), cx, y(top) - 6);
        }
      }));
    } else if (spec.type === 'line') {
      // optional thin line for every patient (spaghetti plot), under the means
      if (spec.individual) spec.series.forEach((s, si) => {
        const off = (si - (ns - 1) / 2) * Math.min(14, cw * 0.05);
        ctx.strokeStyle = pal[si % pal.length]; ctx.globalAlpha = 0.22; ctx.lineWidth = 2; ctx.setLineDash([]);
        (spec.individual[si] || []).forEach(p => { ctx.beginPath(); p.forEach((v, ci) => { const x = xAt(ci) + off; ci ? ctx.lineTo(x, y(v)) : ctx.moveTo(x, y(v)); }); ctx.stroke(); });
        ctx.globalAlpha = 1;
      });
      spec.series.forEach((s, si) => {
        const color = pal[si % pal.length], off = (si - (ns - 1) / 2) * Math.min(14, cw * 0.05);
        const xs = s.values.map((_, ci) => xAt(ci) + off);
        s.values.forEach((v, ci) => {
          if (s.err && s.err[ci] != null) errBar(xs[ci], v - s.err[ci], v + s.err[ci], 9, v, color);
          else if (s.lo && s.hi) errBar(xs[ci], s.lo[ci], s.hi[ci], 9, v, color);
        });
        // error plot (noLine): means and their error bars only, coloured by group when the categories are the groups
        if (!spec.noLine) {
          ctx.strokeStyle = color; ctx.lineWidth = 5 * lw(st); ctx.setLineDash(shapes ? DASHES[si % 6].map(d => d * lw(st)) : si === 2 ? [16, 10] : []);
          ctx.beginPath(); s.values.forEach((v, ci) => ci ? ctx.lineTo(xs[ci], y(v)) : ctx.moveTo(xs[ci], y(v))); ctx.stroke();
        }
        if (spec.noLine && spec.perGroup && ns === 1) {
          ctx.setLineDash([]);
          s.values.forEach((v, ci) => { ctx.fillStyle = pal[ci % pal.length]; ctx.beginPath(); ctx.arc(xs[ci], y(v), 12, 0, Math.PI * 2); ctx.fill(); });
          return;
        }
        ctx.setLineDash([]); ctx.fillStyle = color;
        s.values.forEach((v, ci) => hit(xs[ci], y(v), `${s.name} · ${spec.categories[ci]}: ${spec._log ? +(10 ** v).toPrecision(4) : +(+v).toPrecision(4)}`));
        if (shapes) s.values.forEach((v, ci) => marker(ctx, si, xs[ci], y(v), 12 * Math.sqrt(lw(st))));
        else s.values.forEach((v, ci) => { ctx.beginPath(); ctx.arc(xs[ci], y(v), 10, 0, Math.PI * 2); ctx.fill(); });
      });
    } else if (spec.type === 'stacked') {
      // one 100% bar per group, segments = categories
      const w = cw * widthOf(st, 0.5);
      spec.categories.forEach((_, ci) => {
        let base = 0;
        spec.series.forEach((s, si) => {
          const v = s.values[ci] || 0, x0 = mos ? mos[ci].x : L + cw * ci + (cw - w) / 2, bw = mos ? mos[ci].w : w;
          if (v <= 0) return;
          fillBar(ctx, st, pal[si % pal.length], si, x0, y(base + v), bw, y(base) - y(base + v));
          ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x0, y(base + v), bw, y(base) - y(base + v));
          hit(x0 + bw / 2, y(base + v / 2), `${spec.categories[ci]} · ${s.name}: ${Math.round(v * 10) / 10}%`);
          if (v >= 6) {
            ctx.font = F(700, 24); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillStyle = st.barFill === 'outline' || st.barFill === 'hatched' ? '#222' : '#fff';
            ctx.fillText(`${Math.round(v * 10) / 10}%`, x0 + bw / 2, y(base + v / 2));
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
        // whiskers: IQR (median), the 95% CI of the mean, or ± SD
        const h95 = spec.ci && arr.length > 1 ? jStat.studentt.inv(Stats.QU(), arr.length - 1) * Stats.sd(arr) / Math.sqrt(arr.length) : null;
        const a = spec.median ? Stats.quantile(arr, 0.25) : h95 !== null ? m - h95 : m - Stats.sd(arr), b = spec.median ? Stats.quantile(arr, 0.75) : h95 !== null ? m + h95 : m + Stats.sd(arr);
        hit(cx, y(m), `${spec.categories[ci]}: ${spec.median ? 'median' : spec._log ? 'geometric mean' : 'mean'} ${+(spec._log ? 10 ** m : m).toPrecision(4)}`);
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
        // raincloud: the density on one side only, the box in the middle and the patients as rain on the other side
        const rain = !!spec.rain, cxD = rain ? cx - half * 0.05 : cx;
        ctx.beginPath();
        grid.forEach((g, i) => i ? ctx.lineTo(cxD + wd(dens[i]) * (rain ? 1.9 : 1), y(g)) : ctx.moveTo(cxD + wd(dens[i]) * (rain ? 1.9 : 1), y(g)));
        for (let i = grid.length - 1; i >= 0; i--) ctx.lineTo(rain ? cxD : cx - wd(dens[i]), y(grid[i]));
        ctx.closePath();
        ctx.fillStyle = shade(color, 0.7); ctx.fill(); ctx.strokeStyle = color; ctx.lineWidth = 3.5 * lw(st); ctx.setLineDash(perGroup ? [] : shapes ? DASHES[si % 6] : si === 2 ? [12, 7] : []); ctx.stroke(); ctx.setLineDash([]);
        if (spec.points || rain) {
          ctx.fillStyle = color; ctx.globalAlpha = 0.5;
          arr.forEach((v, i) => { ctx.beginPath(); ctx.arc(rain ? cx - half * 0.55 + jitter(i + 1) * half * 0.45 : cx + jitter(i + 1) * half * 0.5, y(v), 5, 0, Math.PI * 2); ctx.fill(); });
          ctx.globalAlpha = 1;
        }
        hit(cx, y(b.med), `${perGroup ? spec.categories[ci] : `${s.name} · ${spec.categories[ci]}`}: median ${+(spec._log ? 10 ** b.med : b.med).toPrecision(4)}`);
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
        ctx.setLineDash(perGroup ? [] : shapes ? DASHES[si % 6] : si === 2 ? [12, 7] : []);
        ctx.strokeStyle = color; ctx.lineWidth = 3.5 * lw(st);
        ctx.fillStyle = shade(color, 0.85); ctx.fillRect(cx - w / 2, y(b.q3), w, y(b.q1) - y(b.q3));
        ctx.strokeRect(cx - w / 2, y(b.q3), w, y(b.q1) - y(b.q3));
        ctx.beginPath();
        ctx.moveTo(cx, y(b.q3)); ctx.lineTo(cx, y(b.hi)); ctx.moveTo(cx, y(b.q1)); ctx.lineTo(cx, y(b.lo));
        ctx.moveTo(cx - w / 4, y(b.hi)); ctx.lineTo(cx + w / 4, y(b.hi)); ctx.moveTo(cx - w / 4, y(b.lo)); ctx.lineTo(cx + w / 4, y(b.lo));
        ctx.stroke();
        ctx.setLineDash([]); ctx.lineWidth = 5 * lw(st);
        ctx.beginPath(); ctx.moveTo(cx - w / 2, y(b.med)); ctx.lineTo(cx + w / 2, y(b.med)); ctx.stroke();
        if (st.boxMean) {
          // mean as a diamond
          const m = Stats.mean(arr), r = 11;
          ctx.fillStyle = '#fff'; ctx.strokeStyle = '#222'; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(cx, y(m) - r); ctx.lineTo(cx + r, y(m)); ctx.lineTo(cx, y(m) + r); ctx.lineTo(cx - r, y(m)); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.strokeStyle = color;
        }
        // the mean written beside the box
        if (st.boxMeanVal) { const m = Stats.mean(arr), dec = spec.labelDec ?? 1; ctx.fillStyle = '#222'; ctx.font = F(700, 22 * VL); ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
          ctx.fillText(`x̄ ${(Math.round((spec._log ? 10 ** m : m) * 10 ** dec) / 10 ** dec)}`, cx + w / 2 + 6, y(m)); ctx.textAlign = 'center'; }
        hit(cx, y(b.med), `${perGroup ? spec.categories[ci] : `${s.name} · ${spec.categories[ci]}`}: median ${+(spec._log ? 10 ** b.med : b.med).toPrecision(4)} (IQR ${+(spec._log ? 10 ** b.q1 : b.q1).toPrecision(4)}–${+(spec._log ? 10 ** b.q3 : b.q3).toPrecision(4)})`);
        ctx.lineWidth = 2.5;
        if (spec.points) {
          // every observation as a translucent dot (outliers included)
          ctx.fillStyle = color; ctx.globalAlpha = 0.55;
          arr.forEach((v, i) => { ctx.beginPath(); ctx.arc(cx + jitter(i + 1) * w * 0.7, y(v), 6, 0, Math.PI * 2); ctx.fill(); });
          ctx.globalAlpha = 1;
        } else b.out.forEach(v => { ctx.beginPath(); ctx.arc(cx, y(v), 7, 0, Math.PI * 2); ctx.stroke(); });
      }));
    }

    if (fixY) ctx.restore();
    // optional reference line (e.g. a normal limit), dashed, with its label at the right end
    if (isFinite(spec.refLine) && spec.refLine >= sc.min && spec.refLine <= sc.max) {
      ctx.strokeStyle = '#C0392B'; ctx.lineWidth = 3; ctx.setLineDash([14, 9]);
      ctx.beginPath(); ctx.moveTo(L, y(spec.refLine)); ctx.lineTo(L + pw, y(spec.refLine)); ctx.stroke(); ctx.setLineDash([]);
      if (spec.refLabel) {
        ctx.font = F(700, 22); ctx.textAlign = 'right'; ctx.textBaseline = 'bottom';
        const w = ctx.measureText(spec.refLabel).width; ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(L + pw - 12 - w, y(spec.refLine) - 34, w + 12, 28);
        ctx.fillStyle = '#C0392B'; ctx.fillText(spec.refLabel, L + pw - 6, y(spec.refLine) - 8);
      }
    }
    // significance: brackets between groups, or stars above timepoints
    ctx.strokeStyle = '#222'; ctx.fillStyle = '#222'; ctx.lineWidth = 2.5; ctx.setLineDash([]);
    ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.font = F(700, st.sigLabel === 'p' || st.sigLabel === 'both' ? 24 : 30);
    [...brackets].sort((a, b) => (a.j - a.i) - (b.j - b.i)).forEach((q, n) => {
      const x1 = L + cw * (q.i + 0.5), x2 = L + cw * (q.j + 0.5), yy = y(dataHi) - BR0 - BRSTEP * n;
      ctx.beginPath(); ctx.moveTo(x1, yy + 14); ctx.lineTo(x1, yy); ctx.lineTo(x2, yy); ctx.lineTo(x2, yy + 14); ctx.stroke();
      fillSig(ctx, sigMark(q.p, spec.alpha, st), (x1 + x2) / 2, yy - 2);
    });
    if (st.sigLabel === 'p' || st.sigLabel === 'both') ctx.font = F(700, 22);
    if (letters) { ctx.font = F(700, 30); letters.forEach((t, ci) => { if (t) ctx.fillText(t, xAt(ci), y(dataHi) - 24); }); }
    else catStars.forEach((s, ci) => { if (s) fillSig(ctx, sigMark(spec.sigCat[ci], spec.alpha, st), xAt(ci), y(dataHi) - 24); });

    drawLegend(ctx, legendItems.map((it, i) => ({ ...it, dash: i === 2, ...(shapes ? { dashArr: DASHES[i % 6], marker: spec.type === 'line' ? i : null } : {}) })), spec.type === 'line' || spec.type === 'box' ? 'line' : 'fill', st, lm, { W, H, L, T, pw, ph, ts });
    return c;
  }

  /* ---------- correlation heat map: r of every pair, blue (negative) – white – the palette's first colour (positive), stars for significance ---------- */
  function heatChart(spec, paletteName, st) {
    const pal = palette(paletteName), { c, ctx, W, H, ts, F } = setup({ ...st, aspect: st.aspect === 'wide' ? 'square' : st.aspect });
    const n = spec.labels.length; ctx.font = F(700, 24);
    const labW = Math.min(W * 0.3, Math.max(...spec.labels.map(l => ctx.measureText(l).width)) + 24), keyW = 120;
    const L = labW + 20, T = 30, size = Math.min(W - L - keyW - 40, H - T - labW - 30), cs = size / n;
    const hex = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), pos = hex(pal[0]), neg = [31, 78, 154];
    const col = r => { const t = Math.min(1, Math.abs(r)), k = r >= 0 ? pos : neg; return `rgb(${k.map(v => Math.round(255 + (v - 255) * t)).join(',')})`; };
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const r = spec.matrix[i][j], x = L + j * cs, yy = T + i * cs;
      ctx.fillStyle = isFinite(r) ? col(r) : '#F2F2F2'; ctx.fillRect(x, yy, cs, cs); ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.strokeRect(x, yy, cs, cs);
      if (isFinite(r)) { ctx.fillStyle = Math.abs(r) > 0.6 ? '#fff' : '#222'; ctx.font = F(700, Math.min(26, cs * 0.28)); ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const p = spec.pmatrix && spec.pmatrix[i][j]; ctx.fillText(i === j ? '1' : (r.toFixed(2).replace(/^(-?)0\./, '$1.') + (p <= (spec.alpha ?? 0.05) && i !== j ? stars(p, spec.alpha ?? 0.05) : '')), x + cs / 2, yy + cs / 2);
        if (i !== j) hit(x + cs / 2, yy + cs / 2, `${spec.labels[i]} × ${spec.labels[j]}: r = ${r.toFixed(3)}${p !== undefined ? `, P = ${p < 0.001 ? '< 0.001' : p.toFixed(3)}` : ''}`); }
    }
    ctx.fillStyle = '#333'; ctx.font = F(700, 24);
    spec.labels.forEach((l, i) => { ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(l, L - 10, T + (i + 0.5) * cs);
      ctx.save(); ctx.translate(L + (i + 0.5) * cs, T + size + 10); ctx.rotate(-Math.PI / 4); ctx.textAlign = 'right'; ctx.fillText(l, 0, 0); ctx.restore(); });
    // colour key from −1 to 1
    const kx = L + size + 40, kh = size * 0.8, ky = T + (size - kh) / 2;
    for (let q = 0; q < 100; q++) { ctx.fillStyle = col(1 - 2 * q / 99); ctx.fillRect(kx, ky + kh * q / 100, 28, kh / 100 + 1); }
    ctx.strokeStyle = '#999'; ctx.lineWidth = 1.5; ctx.strokeRect(kx, ky, 28, kh); ctx.fillStyle = '#333'; ctx.font = F(600, 22); ctx.textAlign = 'left';
    [[1, ky], [0, ky + kh / 2], [-1, ky + kh]].forEach(([v, yy]) => ctx.fillText(String(v), kx + 36, yy));
    return c;
  }
  /* ---------- waterfall: each patient's change as one bar, sorted, coloured by group ---------- */
  function waterfallChart(spec, paletteName, st) {
    const pal = palette(paletteName), { c, ctx, W, H, ts, F } = setup(st);
    const bars = spec.bars.filter(b => isFinite(b.v)).sort((a, b) => b.v - a.v);
    const items = spec.groups.length > 1 ? spec.groups.map((g, i) => ({ name: g, color: pal[i % pal.length] })) : [];
    const lm = legendMetrics(ctx, items, st, ts);
    const L = 110 + 40 * ts, R = 40 + (lm.pos === 'right' ? lm.w + 40 : 0), T = 40 + (lm.pos === 'top' ? 70 * lm.ls : 0), B = 80 * ts + (lm.pos === 'bottom' ? 70 * lm.ls : 0), pw = W - L - R, ph = H - T - B;
    const vs = bars.map(b => b.v), sc = niceScale(Math.min(0, ...vs, ...(spec.lines || [])), Math.max(0, ...vs, ...(spec.lines || [])), 6), Y = v => T + ph - (v - sc.min) / (sc.max - sc.min) * ph;
    ctx.font = F(600, 24); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) { if (st.grid) { gridPen(ctx, st); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); ctx.setLineDash([]); } ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sc.step) + (spec.percent ? '%' : ''), L - 12, Y(v)); }
    const bw = pw / Math.max(1, bars.length);
    bars.forEach((b, i) => { const x = L + i * bw; ctx.fillStyle = pal[b.g % pal.length]; ctx.fillRect(x + bw * 0.1, Math.min(Y(b.v), Y(0)), bw * 0.8, Math.abs(Y(b.v) - Y(0))); hit(x + bw / 2, Y(b.v), `${b.id !== undefined ? b.id + ': ' : ''}${+b.v.toPrecision(4)}${spec.percent ? '%' : ''}`); });
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.moveTo(L, Y(0)); ctx.lineTo(L + pw, Y(0)); ctx.stroke();
    (spec.lines || []).forEach(v => { ctx.strokeStyle = '#C0392B'; ctx.setLineDash([12, 8]); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); ctx.setLineDash([]); });
    ctx.save(); ctx.translate(40, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textAlign = 'center'; ctx.font = F(700, 28); ctx.fillStyle = '#333'; ctx.fillText(spec.yLabel || '', 0, 0); ctx.restore();
    ctx.font = F(700, 24); ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(spec.xLabel || 'Patients (sorted)', L + pw / 2, T + ph + 14);
    drawLegend(ctx, items, 'fill', st, lm, { W, H, L, T, pw, ph, ts });
    return c;
  }
  /* ---------- swimmer plot: each patient's follow-up as a horizontal bar, the event or censoring marked at its end ---------- */
  function swimmerChart(spec, paletteName, st) {
    const pal = palette(paletteName), { c, ctx, W, H, ts, F } = setup({ ...st, aspect: st.aspect === 'wide' ? 'standard' : st.aspect });
    const rows = spec.rows.filter(r => isFinite(r.t)).sort((a, b) => b.t - a.t).slice(0, 80);
    const items = [...(spec.groups.length > 1 ? spec.groups.map((g, i) => ({ name: g, color: pal[i % pal.length] })) : [])];
    const lm = legendMetrics(ctx, items, st, ts);
    const L = 60, R = 40 + (lm.pos === 'right' ? lm.w + 40 : 0), T = 30, B = 110 * ts + (lm.pos === 'bottom' ? 70 * lm.ls : 0), pw = W - L - R, ph = H - T - B;
    const sc = niceScale(0, Math.max(...rows.map(r => r.t), 1), 6), X = v => L + v / sc.max * pw, rh = ph / Math.max(1, rows.length);
    ctx.font = F(600, 24); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = 0; v <= sc.max + 1e-9; v += sc.step) { if (st.grid) { gridPen(ctx, st); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); ctx.setLineDash([]); } ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sc.step), X(v), T + ph + 10); }
    rows.forEach((r, i) => { const yy = T + i * rh, col = pal[r.g % pal.length]; ctx.fillStyle = col; ctx.fillRect(L, yy + rh * 0.15, X(r.t) - L, rh * 0.7);
      const cy = yy + rh / 2, z = Math.max(5, Math.min(12, rh * 0.45)); ctx.fillStyle = r.event ? '#C0392B' : '#222';
      ctx.beginPath(); if (r.event) { ctx.moveTo(X(r.t) + 4, cy - z); ctx.lineTo(X(r.t) + 4 + 2 * z, cy); ctx.lineTo(X(r.t) + 4, cy + z); } else { ctx.moveTo(X(r.t) + 4, cy - z * 0.6); ctx.lineTo(X(r.t) + 4 + z * 1.4, cy); ctx.lineTo(X(r.t) + 4, cy + z * 0.6); } ctx.closePath(); ctx.fill();
      hit(X(r.t), cy, `${r.id !== undefined ? r.id + ': ' : ''}${+r.t.toPrecision(4)} (${r.event ? 'event' : 'censored'})`); });
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.font = F(700, 26); ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.fillText(spec.xLabel || 'Time', L + pw / 2, T + ph + 48 * ts);
    ctx.font = F(600, 22); ctx.textAlign = 'right'; ctx.textBaseline = 'top'; ctx.fillText('▶ event (red)   ▷ censored (black)', L + pw, T + ph + 48 * ts);
    drawLegend(ctx, items, 'fill', st, lm, { W, H, L, T, pw, ph, ts });
    return c;
  }

  /* ---------- forest plot: one estimate with its 95% CI per row; OR / HR on a log scale with the line of no effect at 1, B at 0 ---------- */
  function forestChart(spec, paletteName, st) {
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup(st);
    const rows = spec.rows.filter(r => isFinite(r.est) && isFinite(r.lo) && isFinite(r.hi) && (!spec.log || (r.lo > 0 && r.hi > 0)));
    ctx.font = F(700, 25);
    const labW = Math.min(W * 0.34, Math.max(120, ...rows.map(r => ctx.measureText(r.label).width)) + 24), valW = 330 * ts;
    const L = 24 + labW, R = valW + 30, T = 40, B = 110 * ts, pw = W - L - R, ph = H - T - B, rh = ph / Math.max(1, rows.length);
    const tr = v => spec.log ? Math.log(v) : v;
    let lo = Math.min(tr(spec.ref), ...rows.map(r => tr(r.lo))), hi = Math.max(tr(spec.ref), ...rows.map(r => tr(r.hi)));
    const pad = (hi - lo) * 0.06 || 1; lo -= pad; hi += pad;
    const X = v => L + (tr(v) - lo) / (hi - lo) * pw;
    // ticks: powers / halves on the log scale, a nice scale otherwise
    let ticks = [];
    if (spec.log) { const cand = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500]; ticks = cand.filter(t => Math.log(t) >= lo && Math.log(t) <= hi); if (ticks.length > 7) ticks = ticks.filter((t, i) => t === 1 || i % 2 === ticks.indexOf(1) % 2); }
    else { const sc = niceScale(lo, hi, 6); for (let v = sc.min; v <= sc.max + 1e-9; v += sc.step) if (v >= lo && v <= hi) ticks.push(+v.toFixed(10)); }
    ctx.font = F(600, 23); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    ticks.forEach(t => {
      if (st.grid) { gridPen(ctx, st); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(X(t), T); ctx.lineTo(X(t), T + ph); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = '#444'; ctx.fillText(String(t), X(t), T + ph + 10);
    });
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.setLineDash([10, 8]); ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(spec.ref), T); ctx.lineTo(X(spec.ref), T + ph); ctx.stroke(); ctx.setLineDash([]);
    ctx.font = F(700, 25); ctx.fillStyle = '#333'; ctx.fillText(spec.xLabel || '', L + pw / 2, T + ph + 50 * ts);
    ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; ctx.font = F(700, 22); ctx.fillText(spec.valHead || 'Estimate (95% CI)', L + pw + 24, T - 18);
    rows.forEach((r, i) => {
      const yy = T + rh * (i + 0.5), col = r.p <= (spec.alpha ?? 0.05) ? pal[0] : '#8A8A8A';
      // labels shrink to fit their column, then are shortened with an ellipsis
      let fs = 25, lab = r.label; ctx.font = F(700, fs);
      while (ctx.measureText(lab).width > labW - 14 && fs > 17) ctx.font = F(700, --fs);
      while (ctx.measureText(lab).width > labW - 14 && lab.length > 4) lab = lab.slice(0, -2).trimEnd() + '…';
      ctx.fillStyle = '#333'; ctx.textAlign = 'right'; ctx.fillText(lab, L - 14, yy);
      ctx.strokeStyle = col; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(X(r.lo), yy); ctx.lineTo(X(r.hi), yy); ctx.stroke();
      const sz = 11; ctx.fillStyle = col; ctx.fillRect(X(r.est) - sz, yy - sz, 2 * sz, 2 * sz);
      ctx.font = F(600, 23); ctx.fillStyle = '#333'; ctx.textAlign = 'left'; ctx.fillText(r.text || '', L + pw + 24, yy);
    });
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
      if (st.grid) { gridPen(ctx, st); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); ctx.setLineDash([]); }
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
      if (st.grid) { gridPen(ctx, st); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x(v), T); ctx.lineTo(x(v), T + ph); ctx.stroke(); ctx.setLineDash([]); }
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
      if (st.grid) { gridPen(ctx, st); ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sy.step), L - 14, Y(v));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = sx.min; v <= sx.max + 1e-9; v += sx.step) {
      if (st.grid) { gridPen(ctx, st); ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); ctx.setLineDash([]); }
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
    const items = spec.series.map((s, i) => ({ name: s.name, color: pal[i % pal.length], dash: i === 2, ...(st.series === 'shapes' ? { dashArr: DASHES[i % 6] } : {}) }));
    const lm = legendMetrics(ctx, items, st, ts);
    const L = 110 + 40 * ts, R = 50 + (lm.pos === 'right' ? lm.w + 40 : 0), T = 50 + (lm.pos === 'top' ? 70 * lm.ls : 0), B = 120 * ts + (lm.pos === 'bottom' ? 70 * lm.ls : 0);
    const pw = W - L - R, ph = H - T - B;
    const tMax = Math.max(1, ...spec.series.flatMap(s => [...s.steps.map(q => q.t), ...s.censored.map(q => q.t)]));
    const sx = niceScale(0, tMax), X = v => L + v / sx.max * pw, Y = v => T + ph - v * ph;
    ctx.font = F(600, 26); ctx.lineWidth = 1.5;
    for (let v = 0; v <= 1.0001; v += 0.2) {
      if (st.grid) { gridPen(ctx, st); ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = '#444'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(Math.round(v * 100) + '%', L - 14, Y(v));
    }
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = 0; v <= sx.max + 1e-9; v += sx.step) {
      if (st.grid) { gridPen(ctx, st); ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sx.step), X(v), T + ph + 12);
    }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.font = F(700, 28); ctx.fillStyle = '#333';
    ctx.fillText(spec.xLabel || 'Time', L + pw / 2, T + ph + 60 * ts);
    ctx.save(); ctx.translate(40, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText(spec.yLabel || 'Survival probability', 0, 0); ctx.restore();
    // optional 95% CI bands, drawn as shaded steps under the curves
    if (spec.band) spec.series.forEach((s, i) => {
      const st2 = s.steps.filter(q => isFinite(q.lo) && isFinite(q.hi)); if (st2.length < 2) return;
      const end = Math.max(s.steps[s.steps.length - 1].t, ...s.censored.map(q => q.t)), up = [], dn = [];
      st2.forEach((q, k) => { const nx = k + 1 < st2.length ? st2[k + 1].t : end; up.push([q.t, q.hi], [nx, q.hi]); dn.push([q.t, q.lo], [nx, q.lo]); });
      ctx.fillStyle = items[i].color; ctx.globalAlpha = 0.14; ctx.beginPath();
      up.forEach(([t, v], k) => k ? ctx.lineTo(X(t), Y(v)) : ctx.moveTo(X(t), Y(v)));
      dn.reverse().forEach(([t, v]) => ctx.lineTo(X(t), Y(v))); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    });
    spec.series.forEach((s, i) => {
      const end = Math.max(s.steps[s.steps.length - 1].t, ...s.censored.map(q => q.t));
      ctx.strokeStyle = items[i].color; ctx.lineWidth = 5 * lw(st); ctx.setLineDash(items[i].dashArr || (items[i].dash ? [16, 10] : []));
      ctx.beginPath(); ctx.moveTo(X(0), Y(spec.cif ? 0 : 1));
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

  /* ---------- non-inferiority / equivalence plot: each CI against the margin ---------- */
  function marginChart(spec, paletteName, st) {
    const pal = palette(paletteName), col = pal[0];
    const { c, ctx, W, H, ts, F } = setup({ ...st, aspect: st.aspect === 'tall' ? 'standard' : st.aspect });
    ctx.font = F(700, 26); const lab = Math.max(...spec.rows.map(r => ctx.measureText(r.label).width)) + 40;
    const L = 30 + lab, R = 50, T = 70, B = 170 * ts, pw = W - L - R, ph = H - T - B, M = spec.margin, up = spec.better !== 'lower';
    const ref = spec.design === 'equiv' ? [-M, M] : spec.design === 'superior' ? [up ? M : -M] : [up ? -M : M];
    const vals = [...spec.rows.flatMap(r => [r.lo, r.hi]), 0, ...ref, ...ref.map(v => v * 1.6)], sx = niceScale(Math.min(...vals), Math.max(...vals));
    const X = v => L + (v - sx.min) / (sx.max - sx.min) * pw;
    // the zone where the conclusion holds, lightly shaded
    const zone = spec.design === 'equiv' ? [-M, M] : spec.design === 'superior' ? (up ? [M, sx.max] : [sx.min, -M]) : (up ? [-M, sx.max] : [sx.min, M]);
    ctx.fillStyle = col; ctx.globalAlpha = 0.07; ctx.fillRect(X(zone[0]), T, X(zone[1]) - X(zone[0]), ph); ctx.globalAlpha = 1;
    ctx.font = F(600, 24); ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = sx.min; v <= sx.max + 1e-9; v += sx.step) { if (st.grid) { gridPen(ctx, st); ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); ctx.setLineDash([]); } ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sx.step), X(v), T + ph + 12); }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.strokeStyle = '#555'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(0), T); ctx.lineTo(X(0), T + ph); ctx.stroke();
    ctx.strokeStyle = '#B3261E'; ctx.lineWidth = 3; ctx.setLineDash([14, 10]);
    ref.forEach(v => { ctx.beginPath(); ctx.moveTo(X(v), T - 10); ctx.lineTo(X(v), T + ph); ctx.stroke(); });
    ctx.setLineDash([]); ctx.font = F(700, 24); ctx.fillStyle = '#B3261E'; ctx.textBaseline = 'bottom';
    ref.forEach(v => ctx.fillText(`${v > 0 ? '+' : v < 0 ? '−' : ''}${String(+Math.abs(v).toPrecision(4))}`, X(v), T - 14));
    const rh = ph / spec.rows.length;
    spec.rows.forEach((r, i) => { const y = T + rh * (i + 0.5);
      ctx.fillStyle = '#222'; ctx.font = F(700, 26); ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(r.label, L - 20, y);
      ctx.strokeStyle = col; ctx.lineWidth = 5 * lw(st); ctx.beginPath(); ctx.moveTo(X(r.lo), y); ctx.lineTo(X(r.hi), y); ctx.stroke();
      [r.lo, r.hi].forEach(v => { ctx.beginPath(); ctx.moveTo(X(v), y - 14); ctx.lineTo(X(v), y + 14); ctx.stroke(); });
      ctx.fillStyle = col; ctx.beginPath(); ctx.arc(X(r.est), y, 12, 0, Math.PI * 2); ctx.fill(); });
    ctx.font = F(700, 28); ctx.fillStyle = '#333'; ctx.textAlign = 'center'; ctx.textBaseline = 'top'; ctx.fillText(spec.xLabel || 'Difference', L + pw / 2, T + ph + 60 * ts);
    // which side favours which treatment
    ctx.font = F(600, 24); ctx.fillStyle = '#555'; ctx.textBaseline = 'top';
    const fl = up ? spec.favRef : spec.favNew, fr = up ? spec.favNew : spec.favRef;
    if (fl) { ctx.textAlign = 'left'; ctx.fillText('← ' + fl, L + 6, T + ph + 108 * ts); }
    if (fr) { ctx.textAlign = 'right'; ctx.fillText(fr + ' →', L + pw - 6, T + ph + 108 * ts); }
    return c;
  }
  /* ---------- effect curve with a CI band (restricted cubic splines) ---------- */
  function curveChart(spec, paletteName, st) {
    const pal = palette(paletteName), col = pal[0];
    const { c, ctx, W, H, ts, F } = setup(st);
    const L = 120 + 40 * ts, R = 50, T = 60, B = 130 * ts, pw = W - L - R, ph = H - T - B;
    const tf = spec.log ? Math.log : v => v, xs = spec.x, ys = spec.y.map(tf), lo = spec.lo.map(tf), hi = spec.hi.map(tf);
    const sx = niceScale(Math.min(...xs), Math.max(...xs)), y0 = Math.min(...lo, tf(spec.ref ?? (spec.log ? 1 : 0))), y1 = Math.max(...hi, tf(spec.ref ?? (spec.log ? 1 : 0)));
    let yt, ymin, ymax;
    if (spec.log) { const cand = [0.01, 0.02, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100, 200, 500].map(Math.log); ymin = y0 - (y1 - y0) * 0.05; ymax = y1 + (y1 - y0) * 0.05; yt = cand.filter(v => v >= ymin && v <= ymax);
      if (yt.length < 3) yt = [0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4].map(Math.log).filter(v => v >= ymin && v <= ymax); }
    else { const sy = niceScale(y0, y1); ymin = sy.min; ymax = sy.max; yt = []; for (let v = sy.min; v <= sy.max + 1e-9; v += sy.step) yt.push(v); }
    const X = v => L + (v - sx.min) / (sx.max - sx.min) * pw, Y = v => T + ph - (v - ymin) / (ymax - ymin || 1) * ph;
    ctx.font = F(600, 26); ctx.lineWidth = 1.5;
    yt.forEach(v => { if (st.grid) { gridPen(ctx, st); ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = '#444'; ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(spec.log ? String(+Math.exp(v).toPrecision(2)) : fmtTick(v, yt[1] - yt[0] || 1), L - 14, Y(v)); });
    ctx.textAlign = 'center'; ctx.textBaseline = 'top';
    for (let v = sx.min; v <= sx.max + 1e-9; v += sx.step) { if (st.grid) { gridPen(ctx, st); ctx.beginPath(); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); ctx.setLineDash([]); }
      ctx.fillStyle = '#444'; ctx.fillText(fmtTick(v, sx.step), X(v), T + ph + 12); }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(L, T); ctx.lineTo(L, T + ph); ctx.lineTo(L + pw, T + ph); ctx.stroke();
    ctx.font = F(700, 28); ctx.fillStyle = '#333'; ctx.fillText(spec.xLabel || '', L + pw / 2, T + ph + 60 * ts);
    ctx.save(); ctx.translate(36, T + ph / 2); ctx.rotate(-Math.PI / 2); ctx.textBaseline = 'middle'; ctx.fillText(spec.yLabel || '', 0, 0); ctx.restore();
    ctx.fillStyle = col; ctx.globalAlpha = 0.16; ctx.beginPath(); xs.forEach((x, i) => i ? ctx.lineTo(X(x), Y(hi[i])) : ctx.moveTo(X(x), Y(hi[i])));
    for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(X(xs[i]), Y(lo[i])); ctx.closePath(); ctx.fill(); ctx.globalAlpha = 1;
    const r0 = tf(spec.ref ?? (spec.log ? 1 : 0)); ctx.strokeStyle = '#888'; ctx.lineWidth = 2.5; ctx.setLineDash([12, 10]); ctx.beginPath(); ctx.moveTo(L, Y(r0)); ctx.lineTo(L + pw, Y(r0)); ctx.stroke(); ctx.setLineDash([]);
    ctx.strokeStyle = col; ctx.lineWidth = 5 * lw(st); ctx.beginPath(); xs.forEach((x, i) => i ? ctx.lineTo(X(x), Y(ys[i])) : ctx.moveTo(X(x), Y(ys[i]))); ctx.stroke();
    if (spec.rug) { ctx.strokeStyle = '#555'; ctx.lineWidth = 1.5; spec.rug.forEach(v => { if (v < sx.min || v > sx.max) return; ctx.beginPath(); ctx.moveTo(X(v), T + ph); ctx.lineTo(X(v), T + ph - 14); ctx.stroke(); }); }
    if (spec.note) { ctx.font = F(700, 26); ctx.textAlign = 'left'; ctx.textBaseline = 'top'; ctx.fillStyle = '#222'; ctx.fillText(spec.note, L + 16, T + 10); }
    return c;
  }
  /* ---------- nomogram of a logistic model ---------- */
  function nomogramChart(spec, paletteName, st) {
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup(st);
    const rowsAll = [{ label: 'Points', ticks: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map(p => ({ pos: p, text: String(p) })), scale: 100 },
      ...spec.rows.map(r => ({ ...r, scale: 100 })), { label: 'Total points', ticks: spec.total, scale: spec.totalMax }, { label: spec.probLabel || 'Probability', ticks: spec.prob, scale: spec.totalMax }];
    ctx.font = F(700, 26); const lab = Math.min(W * 0.36, Math.max(...rowsAll.map(r => ctx.measureText(r.label).width)) + 40);
    const L = 30 + lab, R = 60, T = 50, rh = (H - T - 40) / rowsAll.length, pw = W - L - R;
    rowsAll.forEach((r, i) => {
      const y = T + i * rh + rh * 0.45, X = v => L + v / r.scale * pw, emph = i === 0 || i >= rowsAll.length - 2;
      ctx.fillStyle = '#222'; ctx.font = F(700, 26); ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
      let t = r.label; while (ctx.measureText(t).width > lab - 20 && t.length > 4) t = t.slice(0, -2); if (t !== r.label) t += '…'; ctx.fillText(t, L - 24, y);
      const ps = r.ticks.map(q => q.pos); if (!ps.length) return;
      ctx.strokeStyle = emph ? '#333' : pal[(i - 1) % pal.length]; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X(Math.min(...ps)), y); ctx.lineTo(X(Math.max(...ps)), y); ctx.stroke();
      ctx.font = F(600, 22); ctx.fillStyle = '#444'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; let last = -1e9;
      [...r.ticks].sort((a, b) => a.pos - b.pos).forEach(q => { const x = X(q.pos); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 12); ctx.stroke();
        const w = ctx.measureText(q.text).width; if (x - w / 2 > last + 6) { ctx.fillText(q.text, x, y - 16); last = x + w / 2; } });
      if (st.grid && i === 0) { gridPen(ctx, st); r.ticks.forEach(q => { ctx.beginPath(); ctx.moveTo(X(q.pos), y); ctx.lineTo(X(q.pos), T + (rowsAll.length - 2) * rh); ctx.stroke(); }); ctx.setLineDash([]); }
    });
    return c;
  }
  /* ---------- ROC curves ---------- */
  function rocChart(spec, paletteName, st) {
    st = { ...st, legendTitle: '' }; // the legend lists test variables, not groups
    const pal = palette(paletteName);
    const { c, ctx, W, H, ts, F } = setup({ ...st, aspect: st.aspect === 'wide' ? 'standard' : st.aspect });
    const items = spec.series.map((s, i) => ({ name: s.name, color: pal[i % pal.length], dash: i === 2, ...(st.series === 'shapes' ? { dashArr: DASHES[i % 6] } : {}) }));
    const lm = legendMetrics(ctx, items, { ...st, legend: st.legend === 'bottom' || st.legend === 'top' || st.legend === 'none' || st.legend === 'right' ? st.legend : 'inside' }, ts);
    const L = 110 + 40 * ts, R = 50 + (lm.pos === 'right' ? lm.w + 40 : 0), T = 50 + (lm.pos === 'top' ? 70 * lm.ls : 0), B = 120 * ts + (lm.pos === 'bottom' ? 70 * lm.ls : 0);
    const pw = W - L - R, ph = H - T - B;
    const X = v => L + v * pw, Y = v => T + ph - v * ph;
    ctx.font = F(600, 26); ctx.lineWidth = 1.5;
    for (let v = 0; v <= 1.0001; v += 0.2) {
      if (st.grid) { gridPen(ctx, st); ctx.beginPath(); ctx.moveTo(L, Y(v)); ctx.lineTo(L + pw, Y(v)); ctx.moveTo(X(v), T); ctx.lineTo(X(v), T + ph); ctx.stroke(); ctx.setLineDash([]); }
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
      ctx.strokeStyle = items[i].color; ctx.lineWidth = ({ thin: 3, bold: 8 }[spec.lineW] || 5) * lw(st); ctx.setLineDash(items[i].dashArr || (items[i].dash ? [16, 10] : []));
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
    let xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
    if (spec.zero) { xmin = Math.min(0, xmin); xmax = Math.max(0, xmax); ymin = Math.min(0, ymin); ymax = Math.max(0, ymax); }
    const sx = niceScale(spec.zero && xmin >= 0 ? 0 : xmin - pad(xmin, xmax), xmax + pad(xmin, xmax)), sy = niceScale(spec.zero && ymin >= 0 ? 0 : ymin - pad(ymin, ymax), ymax + pad(ymin, ymax));
    const X = v => L + (v - sx.min) / (sx.max - sx.min) * pw, Y = v => T + ph - (v - sy.min) / (sy.max - sy.min) * ph;

    ctx.font = F(600, 26); ctx.lineWidth = 1.5;
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
    const gridLine = (x1, y1, x2, y2) => { if (st.grid) { gridPen(ctx, st); ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); ctx.setLineDash([]); } };
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

    const rad = { small: 6, large: 13 }[spec.ptSize] || 9, grp = Array.isArray(spec.g) && spec.gNames;
    ctx.fillStyle = pal[0]; ctx.globalAlpha = 0.6;
    xs.forEach((v, i) => { if (grp) ctx.fillStyle = pal[spec.g[i] % pal.length]; ctx.beginPath(); ctx.arc(X(v), Y(ys[i]), rad, 0, Math.PI * 2); ctx.fill(); });
    ctx.globalAlpha = 1;
    // colour by group: a legend above the plot
    if (grp) { ctx.font = F(600, 24); ctx.textBaseline = 'middle'; ctx.textAlign = 'left'; const w = spec.gNames.map(n => ctx.measureText(n).width + 50), tot = w.reduce((a, b) => a + b, 0); let x = L + (pw - tot) / 2;
      spec.gNames.forEach((n, k) => { ctx.fillStyle = pal[k % pal.length]; ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.arc(x + 10, 26, 10, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#333'; ctx.fillText(n, x + 26, 27); x += w[k]; }); }
    const mx = Stats.mean(xs), my = Stats.mean(ys);
    const sxx = Stats.sum(xs.map(v => (v - mx) ** 2));
    const slope = sxx > 0 ? Stats.sum(xs.map((v, i) => (v - mx) * (ys[i] - my))) / sxx : 0;
    // residual plots: a dashed line at zero instead of the least-squares line
    if (spec.zeroLine) { ctx.save(); ctx.strokeStyle = pal[1]; ctx.lineWidth = 3; ctx.setLineDash([12, 8]); ctx.beginPath(); ctx.moveTo(L, Y(0)); ctx.lineTo(L + pw, Y(0)); ctx.stroke(); ctx.restore(); }
    // given lines (e.g. a method-comparison fit and the identity line) instead of the least-squares line
    else if (spec.lines) { ctx.save(); ctx.beginPath(); ctx.rect(L, T, pw, ph); ctx.clip();
      spec.lines.forEach((ln, i) => { ctx.strokeStyle = ln.dash ? '#777' : pal[1]; ctx.lineWidth = ln.dash ? 3 : 5; ctx.setLineDash(ln.dash ? [12, 8] : []);
        ctx.beginPath(); ctx.moveTo(X(sx.min), Y(ln.a + ln.b * sx.min)); ctx.lineTo(X(sx.max), Y(ln.a + ln.b * sx.max)); ctx.stroke(); });
      ctx.restore(); ctx.setLineDash([]); }
    else if (sxx > 0 && spec.fit !== 'none') {
      const icpt = my - slope * mx;
      // 95% CI band of the regression line
      if (spec.band && xs.length > 2) { const n = xs.length, s2 = Stats.sum(xs.map((v, i) => (ys[i] - icpt - slope * v) ** 2)) / (n - 2), tq = jStat.studentt.inv(0.975, n - 2), x0 = Math.min(...xs), x1 = Math.max(...xs), xg = Array.from({ length: 41 }, (_, k) => x0 + (x1 - x0) * k / 40);
        const hw = x => tq * Math.sqrt(s2 * (1 / n + (x - mx) ** 2 / sxx));
        ctx.save(); ctx.beginPath(); ctx.rect(L, T, pw, ph); ctx.clip(); ctx.fillStyle = pal[1]; ctx.globalAlpha = 0.15; ctx.beginPath();
        xg.forEach((x, k) => k ? ctx.lineTo(X(x), Y(icpt + slope * x + hw(x))) : ctx.moveTo(X(x), Y(icpt + slope * x + hw(x))));
        [...xg].reverse().forEach(x => ctx.lineTo(X(x), Y(icpt + slope * x - hw(x)))); ctx.closePath(); ctx.fill(); ctx.restore(); }
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
      if (spec.note2) { ctx.font = F(600, 24); const t2 = ctx.measureText(spec.note2).width, n2 = slope < 0 ? L + pw - t2 - 44 : L + 20;
        ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fillRect(n2, T + 10 + 44 * ts, t2 + 24, 38 * ts); ctx.fillStyle = '#333'; ctx.fillText(spec.note2, n2 + 12, T + 16 + 44 * ts); }
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
  // PRISMA 2020: the numbers of each stage follow from what was entered
  function prismaSteps(p, S) {
    const v = k => +p[k] || 0, N = x => `(${S.N(x)})`, idf = v('db') + v('reg'), removed = v('dup') + v('auto') + v('other'), screened = idf - removed, sought = screened - v('scrExcl'), assessed = sought - v('notRetrieved');
    const reasons = (p.reasons || []).filter(r => String(r.text).trim() && +r.n), exElig = reasons.reduce((t, r) => t + +r.n, 0);
    return [
      { full: `Records identified from:\nDatabases ${N(v('db'))}\nRegisters ${N(v('reg'))}`, n: idf, exN: removed, exFull: `Records removed before screening:\nDuplicate records ${N(v('dup'))}\nMarked as ineligible by automation tools ${N(v('auto'))}\nRemoved for other reasons ${N(v('other'))}` },
      { text: 'Records screened', n: screened, exN: v('scrExcl'), exText: 'Records excluded' },
      { text: 'Reports sought for retrieval', n: sought, exN: v('notRetrieved'), exText: 'Reports not retrieved' },
      { text: 'Reports assessed for eligibility', n: assessed, exN: exElig, exFull: `Reports excluded:${reasons.map(r => `\n${r.text} ${N(r.n)}`).join('')}` },
      { full: `Studies included in review ${N(v('studies'))}${v('reports') ? `\nReports of included studies ${N(v('reports'))}` : ''}`, n: v('studies'), exN: 0 }
    ];
  }
  const FLOW_LABELS = { prisma: ['Identification', 'Screening', 'Included'], consort: ['Enrollment', 'Allocation', 'Follow-Up', 'Analysis'], crossover: ['Enrollment', 'Allocation', 'Follow-Up', 'Analysis'], cluster: ['Enrollment', 'Allocation', 'Follow-Up', 'Analysis'], strobe: ['Identification', 'Inclusion', 'Follow-Up', 'Analysis'], stard: ['Enrollment', 'Index test', 'Reference', 'Diagnosis'] };
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
      // numbers: "n=30" (default), "n = 30" or "N=30", optional percentages, exclusion box side, final boxes emphasised, spacing, resolution
      N: v => `${{ spaced: 'n = ', upper: 'N=' }[st.nFmt] || 'n='}${v}`, pct: !!st.pct, exLeft: st.exSide === 'left', emph: !!st.emph,
      gap: { compact: 40, roomy: 85 }[st.spacing] || 60, res: Math.min(3, Math.max(1, +st.res || 1)),
      pill: /^#[0-9a-f]{6}$/i.test(st.pillColor || '') ? st.pillColor : accent, pillText: /^#[0-9a-f]{6}$/i.test(st.pillTextColor || '') ? st.pillTextColor : '#fff',
      // box widths, arrow colour and head, text size of the exclusion boxes, a legend of the box colours
      wScale: { narrow: 0.85, wide: 1.2 }[st.boxWidth] || 1, arrowColor: /^#[0-9a-f]{6}$/i.test(st.arrowColor || '') ? st.arrowColor : null, head: st.arrowHead || 'filled',
      sideFs: { small: 0.85, large: 1.15 }[st.sideText] || 1, legend: !!st.legend, theme, lr: st.direction === 'lr'
    };
  }
  function flowBox(ctx, S, x, y, w, h, role) {
    // the analysed (final) boxes can be emphasised with a thick border in the accent colour
    if (role === 'final') { flowBox(ctx, { ...S, lw: S.lw * 2.2, stroke: () => S.accent }, x, y, w, h, 'col'); return; }
    ctx.save();
    if (S.shadow) { ctx.shadowColor = 'rgba(0,0,0,0.18)'; ctx.shadowBlur = 10; ctx.shadowOffsetX = 3; ctx.shadowOffsetY = 4; }
    ctx.fillStyle = S.fill(role);
    if (S.radius) { ctx.beginPath(); ctx.roundRect(x, y, w, h, S.radius); ctx.fill(); } else ctx.fillRect(x, y, w, h);
    ctx.restore();
    ctx.strokeStyle = S.stroke(role); ctx.lineWidth = S.lw;
    if (S.radius) { ctx.beginPath(); ctx.roundRect(x, y, w, h, S.radius); ctx.stroke(); } else ctx.strokeRect(x, y, w, h);
    ctx.fillStyle = S.text(role);
  }
  function consort(c, groupLabels, palName = 'brand', res) {
    const S = flowStyle(c, palette(palName));
    if (res) S.res = res; // export at a chosen resolution
    FONT = S.font;
    if (c.type === 'simple') return simpleFlow(c, groupLabels, palName, S);
    if (c.type === 'prisma') { const own = ((c.style || {}).labels || {}).prisma || [], L = FLOW_LABELS.prisma.map((d, i) => String(own[i] || '').trim() || d);
      return simpleFlow({ ...c, steps: prismaSteps(c.prisma || {}, S), splitGroups: false, sections: [[L[0], 0, 0], [L[1], 1, 3], [L[2], 4, 4]] }, [], palName, S); }
    const pal = palette(palName), type = c.type || 'consort';
    const branches = type === 'stard' ? stardBranches(c) : null;
    const k = branches ? branches.length : groupLabels.length;
    const CW = 1200;
    let cv = makeCanvas(CW, 100), ctx = cv.getContext('2d');
    const gutter = S.pills ? 80 : 0, pad = 18, colW = (CW - gutter - pad * (k + 1)) / k;
    const fs = S.fs, lh = S.lh, MIN_ROW = S.pills ? 175 : 0; // rows tall enough for the rotated section labels
    const boxH = (lines, k = 1) => lines.reduce((h, ln) => { ctx.font = `${ln.b ? 700 : 400} ${Math.round(fs * k)}px ${FONT}`; return h + measureLines(ctx, ln.t, ln.w - 28) * Math.round(lh * k); }, 0) + 26;

    const ex = c.excluded.filter(e => +e.n > 0);
    const exTotal = ex.reduce((s, e) => s + +e.n, 0);
    const topW = Math.round(440 * S.wScale), exW = S.wScale > 1 ? Math.max(500, Math.round((CW - (S.pills ? 80 : 0)) / 2 - 60)) : Math.round(500 * S.wScale);
    // "(n=12)" or with a percentage of its base: "(n=12, 9.5%)"
    const NP = (v, base) => `(${S.N(+v || 0)}${S.pct && +base > 0 ? `, ${Math.round(1000 * (+v || 0) / base) / 10}%` : ''})`;
    const strobe = type === 'strobe';
    const topText = type === 'stard' ? 'Potentially eligible participants' : strobe ? 'Potentially eligible individuals' : 'Assessed for eligibility';
    const assessed = [{ t: `${topText} ${NP(c.assessed)}`, b: true, w: topW }];
    const excluded = [{ t: `Excluded ${NP(exTotal, c.assessed)}`, b: true, w: exW }, ...ex.map(e => ({ t: `• ${e.text} ${NP(e.n, c.assessed)}`, w: exW }))];
    const midN = branches ? +c.stard.tested || 0 : c.groups.reduce((s, g) => s + (+g.allocated || 0), 0);
    const randomized = [{ t: `${type === 'stard' ? 'Received index test' : strobe ? 'Included in the study' : 'Randomized'} ${NP(midN)}${type === 'cluster' && c.groups.some(g => +g.clusters) ? ` in ${c.groups.reduce((t, g) => t + (+g.clusters || 0), 0)} clusters` : ''}`, b: true, w: topW },
      ...(c.randInfo && !strobe && type !== 'stard' ? [{ t: c.randInfo, w: topW }] : [])];
    // an optional earlier stage (e.g. screened) above the eligibility assessment
    const pre = c.pre && c.pre.on && +c.pre.n ? [{ t: `${c.pre.text || 'Screened'} ${NP(c.pre.n)}`, b: true, w: topW }] : null;
    const preEx = pre && +c.pre.exN ? [{ t: `${c.pre.exText || 'Not eligible at screening'} ${NP(c.pre.exN, c.pre.n)}`, w: exW }] : null;
    let alloc, follow, anal;
    if (branches) {
      alloc = branches.map(b => [{ t: `Index test ${b.name.toLowerCase()} ${NP(b.n, midN)}`, b: true, w: colW }]);
      follow = branches.map(b => [{ t: `No reference standard ${NP(b.noRef, b.n)}`, b: true, w: colW }, { t: `Reference standard ${NP((+b.present || 0) + (+b.absent || 0) + (+b.inconclusive || 0), b.n)}`, w: colW }]);
      anal = branches.map(b => [{ t: 'Final diagnosis', b: true, w: colW }, { t: `Target condition present ${NP(b.present)}\nTarget condition absent ${NP(b.absent)}${+b.inconclusive ? `\nInconclusive ${NP(b.inconclusive)}` : ''}`, w: colW }]);
    } else {
      // crossover: each sequence with its two periods and the washout; cluster trials: clusters and participants
      alloc = c.groups.map((g, i) => type === 'crossover'
        ? [{ t: `Sequence ${groupLabels[i]} ${NP(g.allocated, midN)}`, b: true, w: colW }, { t: `Period 1: ${g.p1 || '—'}\nWashout${c.washout ? `: ${c.washout}` : ''}\nPeriod 2: ${g.p2 || '—'}`, w: colW }]
        : type === 'cluster'
        ? [{ t: `${groupLabels[i]}: ${+g.clusters || 0} clusters ${NP(g.allocated, midN)}`, b: true, w: colW }, { t: g.description || `Received allocated intervention ${NP(g.allocated)}`, w: colW }]
        : [{ t: `${groupLabels[i]} ${NP(g.allocated, midN)}`, b: true, w: colW }, { t: g.description || (strobe ? `Included ${NP(g.allocated)}` : `Received allocated intervention ${NP(g.allocated)}`), w: colW }]);
      follow = c.groups.map(g => [{ t: `${strobe ? 'Lost to follow-up / missing data' : 'Lost to follow-up'} ${NP(g.lost, g.allocated)}`, b: true, w: colW }, ...(g.lostReason && +g.lost ? [{ t: g.lostReason, w: colW }] : [{ t: strobe ? 'None' : 'No drop out', w: colW }])]);
      // intention-to-treat and per-protocol populations, or one "Analysed" box
      anal = c.groups.map(g => c.itt
        ? [{ t: `Intention-to-treat ${NP(g.allocated)}`, b: true, w: colW }, { t: `Per-protocol ${NP(g.analysed, g.allocated)}`, b: true, w: colW }, { t: `Excluded from per-protocol ${NP((+g.allocated || 0) - (+g.analysed || 0), g.allocated)}${g.excludedReason && +g.excludedAnalysis ? '\n' + g.excludedReason : ''}`, w: colW }]
        : [{ t: `Analysed ${NP(g.analysed, g.allocated)}${type === 'cluster' && +g.clustersAnalysed ? ` in ${g.clustersAnalysed} clusters` : ''}`, b: true, w: colW }, { t: `Excluded from analysis ${NP(g.excludedAnalysis, g.allocated)}${g.excludedReason && +g.excludedAnalysis ? '\n' + g.excludedReason : ''}`, w: colW }]);
    }
    // section labels: the user's own text where given, else the defaults of the flowchart type
    const own = ((c.style || {}).labels || {})[type] || [];
    const PILLS = (FLOW_LABELS[type] || FLOW_LABELS.consort).map((d, i) => String(own[i] || '').trim() || d);

    if (S.lr) return consortLR({ c, S, k, fs, lh, assessed, excluded, randomized, pre, preEx, alloc, follow, anal, PILLS, exTotal, boxH0: boxH });
    const hA = boxH(assessed), hE = boxH(excluded, S.sideFs), hR = boxH(randomized);
    const hAl = Math.max(MIN_ROW, ...alloc.map(l => boxH(l))), hF = Math.max(MIN_ROW, ...follow.map(l => boxH(l))), hAn = Math.max(MIN_ROW, ...anal.map(l => boxH(l)));
    const gap = S.gap, hP = pre ? boxH(pre) : 0, hPE = preEx ? boxH(preEx, S.sideFs) : 0, y0 = pre ? 30 + hP + Math.max(gap, hPE + 40) : 30;
    const yA = y0, yE = yA + hA + 20, yR = Math.max(yE + hE + 20, yA + hA + gap);
    const yAl = yR + hR + gap + 20, yF = yAl + hAl + gap, yAn = yF + hF + gap;
    const midX = gutter + (CW - gutter) / 2, colX = i => gutter + pad + i * (colW + pad);
    // every box placed first (moved by its drag offset), then drawn with the arrows between the placed boxes
    const R = {}, place = (key, x, y, w, h, lines, align = 'center', role = 'main') => { const o = flowOff(c, key); R[key] = { x: x + o.dx, y: y + o.dy, w, h, lines, align, role }; };
    if (pre) { place('pre', midX - topW / 2, 30, topW, hP, pre); if (preEx) { const exX = S.exLeft ? Math.max(gutter + 6, midX - 60 - exW) : midX + 60; place('preEx', exX, 30 + hP + (yA - 30 - hP - hPE) / 2, exW, hPE, preEx, 'left', 'side'); } }
    place('assessed', midX - topW / 2, yA, topW, hA, assessed);
    if (exTotal) place('excluded', S.exLeft ? Math.max(gutter + 6, midX - 60 - exW) : midX + 60, yE, exW, hE, excluded, 'left', 'side');
    place('rand', midX - topW / 2, yR, topW, hR, randomized);
    for (let i = 0; i < k; i++) { place('alloc' + i, colX(i), yAl, colW, hAl, alloc[i], 'center', 'col'); place('follow' + i, colX(i), yF, colW, hF, follow[i], 'center', 'col'); place('anal' + i, colX(i), yAn, colW, hAn, anal[i], 'center', S.emph ? 'final' : 'col'); }
    // footnote and legend below the boxes; the chart grows when a box is dragged lower
    ctx.font = `400 ${Math.round(fs * 0.8)}px ${FONT}`;
    const foot = String(c.footnote || '').trim(), footH = foot ? measureLines(ctx, foot, CW - 60) * Math.round(lh * 0.8) + 16 : 0, legH = S.legend && S.theme !== 'classic' && S.theme !== 'bw' ? 50 : 0;
    const bottom = Math.max(yAn + hAn, ...Object.values(R).map(r => r.y + r.h)), Htot = bottom + 30 + footH + legH;
    cv = makeCanvas(CW * S.res, Htot * S.res); ctx = cv.getContext('2d'); ctx.scale(S.res, S.res);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, Htot);
    const box = r => {
      flowBox(ctx, S, r.x, r.y, r.w, r.h, r.role);
      let yy = r.y + 14;
      ctx.textBaseline = 'top';
      r.lines.forEach(ln => {
        const k = r.role === 'side' ? S.sideFs : 1; ctx.font = `${ln.b ? 700 : 400} ${Math.round(fs * k)}px ${FONT}`;
        ln.t.split('\n').forEach(par => {
          ctx.textAlign = r.align;
          const n = wrapText(ctx, par, r.align === 'center' ? r.x + r.w / 2 : r.x + 14, yy, r.w - 28, Math.round(lh * k));
          yy += n * Math.round(lh * k);
        });
      });
    };
    const arrow = (x1, y1, x2, y2) => flowArrow(ctx, S, x1, y1, x2, y2);
    // a box above another: a straight arrow, or an elbow when one was dragged sideways
    const link = (a, b) => { const ax = a.x + a.w / 2, bx = b.x + b.w / 2, y1 = a.y + a.h, y2 = b.y;
      if (Math.abs(ax - bx) < 0.5) { arrow(ax, y1, bx, y2); return; }
      const my = (y1 + y2) / 2; ctx.strokeStyle = S.arrowColor || S.arrow; ctx.lineWidth = S.lw; ctx.beginPath(); ctx.moveTo(ax, y1); ctx.lineTo(ax, my); ctx.lineTo(bx, my); ctx.stroke(); arrow(bx, my, bx, y2); };
    // an exclusion box beside the path: a horizontal arrow from the path to its edge
    const side = (from, r) => { const cx = from.x + from.w / 2, y = r.y + r.h / 2; arrow(cx, y, r.x + r.w / 2 < cx ? r.x + r.w : r.x, y); };
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

    pill(PILLS[0], pre ? 30 : yA, yR + hR);
    if (pre) { box(R.pre); if (R.preEx) { box(R.preEx); side(R.pre, R.preEx); } link(R.pre, R.assessed); }
    pill(PILLS[1], yAl, yAl + hAl);
    pill(PILLS[2], yF, yF + hF);
    pill(PILLS[3], yAn, yAn + hAn);

    box(R.assessed);
    if (R.excluded) { box(R.excluded); side(R.assessed, R.excluded); }
    link(R.assessed, R.rand);
    box(R.rand);

    const rc = R.rand.x + R.rand.w / 2, busY = R.rand.y + R.rand.h + gap / 2 + 10, cxs = Array.from({ length: k }, (_, i) => R['alloc' + i].x + R['alloc' + i].w / 2);
    ctx.strokeStyle = S.arrowColor || S.arrow; ctx.lineWidth = S.lw;
    ctx.beginPath(); ctx.moveTo(rc, R.rand.y + R.rand.h); ctx.lineTo(rc, busY);
    ctx.moveTo(Math.min(...cxs, rc), busY); ctx.lineTo(Math.max(...cxs, rc), busY); ctx.stroke();
    for (let i = 0; i < k; i++) {
      const A = R['alloc' + i], Fo = R['follow' + i], An = R['anal' + i];
      arrow(cxs[i], busY, cxs[i], A.y); box(A); link(A, Fo); box(Fo); link(Fo, An); box(An);
    }
    flowFoot(ctx, S, foot, legH, CW, bottom + 30, fs, lh);
    FLOW_HITS = { W: CW, H: Htot, list: Object.entries(R).map(([key, r]) => ({ key, x: r.x, y: r.y, w: r.w, h: r.h })) };
    return cv;
  }
  // drag offsets of the flowchart boxes (step 9), and the boxes of the last flowchart for dragging
  let FLOW_HITS = { W: 1, H: 1, list: [] };
  const flowOff = (c, key) => { const o = (c.offsets || {})[key]; return { dx: o ? +o.dx || 0 : 0, dy: o ? +o.dy || 0 : 0 }; };
  // left-to-right flowchart: the stages as columns, the groups as rows, section labels across the top
  function consortLR(P) {
    const { c, S, k, fs, lh, PILLS } = P, wM = Math.round(300 * S.wScale), wX = Math.round(290 * S.wScale), wC = Math.round(320 * S.wScale), gX = 70, gY = 26;
    let cv = makeCanvas(100, 100), ctx = cv.getContext('2d');
    const W = (lines, w) => lines.map(l => ({ ...l, w })), bh = (lines, kk = 1) => lines.reduce((h, ln) => { ctx.font = `${ln.b ? 700 : 400} ${Math.round(fs * kk)}px ${FONT}`; return h + measureLines(ctx, ln.t, ln.w - 28) * Math.round(lh * kk); }, 0) + 26;
    const pre = P.pre && W(P.pre, wM), preEx = P.preEx && W(P.preEx, wX), as = W(P.assessed, wM), ex = P.exTotal ? W(P.excluded, wX) : null, ra = W(P.randomized, wM);
    const al = P.alloc.map(l => W(l, wC)), fo = P.follow.map(l => W(l, wC)), an = P.anal.map(l => W(l, wC));
    const rowH = al.map((_, i) => Math.max(bh(al[i]), bh(fo[i]), bh(an[i]))), T0 = S.pills ? 90 : 30, groupsH = rowH.reduce((t, h) => t + h, 0) + gY * (k - 1), midY = T0 + Math.max(groupsH, bh(as), bh(ra)) / 2;
    let x = 20; const X = {};
    if (pre) { X.pre = x; x += wM + gX; if (preEx) { X.preEx = x; x += wX + gX; } }
    X.as = x; x += wM + gX; if (ex) { X.ex = x; x += wX + gX; } X.ra = x; x += wM + gX; X.al = x; x += wC + gX; X.fo = x; x += wC + gX; X.an = x; const CW = x + wC + 20;
    const R = {}, place = (key, x0, y0, w, h, lines, align = 'center', role = 'main') => { const o = flowOff(c, key); R[key] = { x: x0 + o.dx, y: y0 + o.dy, w, h, lines, align, role }; };
    const mid = (key, x0, w, lines) => { const h = bh(lines); place(key, x0, midY - h / 2, w, h, lines); };
    if (pre) { mid('pre', X.pre, wM, pre); if (preEx) place('preEx', X.preEx, midY + 40, wX, bh(preEx, S.sideFs), preEx, 'left', 'side'); }
    mid('assessed', X.as, wM, as); if (ex) place('excluded', X.ex, midY + 40, wX, bh(ex, S.sideFs), ex, 'left', 'side'); mid('rand', X.ra, wM, ra);
    let y = midY - groupsH / 2; for (let i = 0; i < k; i++) { place('alloc' + i, X.al, y, wC, rowH[i], al[i], 'center', 'col'); place('follow' + i, X.fo, y, wC, rowH[i], fo[i], 'center', 'col'); place('anal' + i, X.an, y, wC, rowH[i], an[i], 'center', S.emph ? 'final' : 'col'); y += rowH[i] + gY; }
    ctx.font = `400 ${Math.round(fs * 0.8)}px ${FONT}`;
    const foot = String(c.footnote || '').trim(), footH = foot ? measureLines(ctx, foot, CW - 60) * Math.round(lh * 0.8) + 16 : 0, legH = S.legend && S.theme !== 'classic' && S.theme !== 'bw' ? 50 : 0;
    const bottom = Math.max(...Object.values(R).map(r => r.y + r.h)), Htot = bottom + 30 + footH + legH;
    cv = makeCanvas(CW * S.res, Htot * S.res); ctx = cv.getContext('2d'); ctx.scale(S.res, S.res); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, Htot);
    const box = r => { flowBox(ctx, S, r.x, r.y, r.w, r.h, r.role); let yy = r.y + 14; ctx.textBaseline = 'top';
      r.lines.forEach(ln => { const kk = r.role === 'side' ? S.sideFs : 1; ctx.font = `${ln.b ? 700 : 400} ${Math.round(fs * kk)}px ${FONT}`; ctx.textAlign = r.align;
        ln.t.split('\n').forEach(par => { yy += wrapText(ctx, par, r.align === 'center' ? r.x + r.w / 2 : r.x + 14, yy, r.w - 28, Math.round(lh * kk)) * Math.round(lh * kk); }); }); };
    const arrow = (x1, y1, x2, y2) => flowArrow(ctx, S, x1, y1, x2, y2), pen = () => { ctx.strokeStyle = S.arrowColor || S.arrow; ctx.lineWidth = S.lw; };
    // left to right: straight, or an elbow when a box was dragged up or down
    const link = (a, b) => { const y1 = a.y + a.h / 2, y2 = b.y + b.h / 2, x1 = a.x + a.w, x2 = b.x; if (Math.abs(y1 - y2) < 0.5) { arrow(x1, y1, x2, y2); return; }
      const mx = (x1 + x2) / 2; pen(); ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(mx, y1); ctx.lineTo(mx, y2); ctx.stroke(); arrow(mx, y2, x2, y2); };
    // exclusion boxes hang below the arrow between two stages
    const drop = (a, r) => { const xm = r.x + r.w / 2, y = a.y + a.h / 2; arrow(xm, y, xm, r.y < y ? r.y + r.h : r.y); };
    if (S.pills) { const band = (label, x1, x2) => { ctx.fillStyle = S.pill; ctx.beginPath(); ctx.roundRect(x1, 20, x2 - x1, 46, 18); ctx.fill(); ctx.fillStyle = S.pillText; ctx.font = `700 24px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        const tw = ctx.measureText(label).width; if (tw > x2 - x1 - 16) ctx.font = `700 ${Math.max(14, Math.floor(24 * (x2 - x1 - 16) / tw))}px ${FONT}`; ctx.fillText(label, (x1 + x2) / 2, 43); };
      band(PILLS[0], pre ? X.pre : X.as, X.ra + wM); band(PILLS[1], X.al, X.al + wC); band(PILLS[2], X.fo, X.fo + wC); band(PILLS[3], X.an, X.an + wC); }
    const chain = [R.pre, R.assessed, R.rand].filter(Boolean);
    chain.forEach(box); chain.slice(1).forEach((b, i) => link(chain[i], b));
    if (R.preEx) { box(R.preEx); drop(R.pre, R.preEx); } if (R.excluded) { box(R.excluded); drop(R.assessed, R.excluded); }
    const ys = Array.from({ length: k }, (_, i) => R['alloc' + i].y + R['alloc' + i].h / 2), ry = R.rand.y + R.rand.h / 2, busX = R.rand.x + R.rand.w + gX / 2;
    pen(); ctx.beginPath(); ctx.moveTo(R.rand.x + R.rand.w, ry); ctx.lineTo(busX, ry); ctx.moveTo(busX, Math.min(...ys, ry)); ctx.lineTo(busX, Math.max(...ys, ry)); ctx.stroke();
    for (let i = 0; i < k; i++) { const A = R['alloc' + i], Fo = R['follow' + i], An = R['anal' + i]; arrow(busX, ys[i], A.x, ys[i]); box(A); link(A, Fo); box(Fo); link(Fo, An); box(An); }
    flowFoot(ctx, S, foot, legH, CW, bottom + 30, fs, lh);
    FLOW_HITS = { W: CW, H: Htot, list: Object.entries(R).map(([key, r]) => ({ key, x: r.x, y: r.y, w: r.w, h: r.h })) };
    return cv;
  }
  // arrows: filled head (default), open head or none, in the theme's or a chosen colour
  function flowArrow(ctx, S, x1, y1, x2, y2) {
    const col = S.arrowColor || S.arrow; ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = S.lw;
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    if (S.head === 'none') return;
    const a = Math.atan2(y2 - y1, x2 - x1);
    ctx.beginPath(); ctx.moveTo(x2 - 16 * Math.cos(a - 0.4), y2 - 16 * Math.sin(a - 0.4)); ctx.lineTo(x2, y2); ctx.lineTo(x2 - 16 * Math.cos(a + 0.4), y2 - 16 * Math.sin(a + 0.4));
    if (S.head === 'open') ctx.stroke(); else { ctx.closePath(); ctx.fill(); }
  }
  // the footnote under the flowchart and a legend of the box colours (tinted / filled themes)
  function flowFoot(ctx, S, foot, legH, CW, y, fs, lh) {
    if (legH) { const items = [['main', 'Main path'], ['side', 'Excluded'], ['col', 'Groups']], sw = 34; let x = 40; ctx.font = `600 ${Math.round(fs * 0.8)}px ${FONT}`; ctx.textBaseline = 'middle'; ctx.textAlign = 'left';
      items.forEach(([r, t]) => { ctx.fillStyle = S.fill(r); ctx.fillRect(x, y + 8, sw, 24); ctx.strokeStyle = S.stroke(r); ctx.lineWidth = 2; ctx.strokeRect(x, y + 8, sw, 24); ctx.fillStyle = '#222'; ctx.fillText(t, x + sw + 10, y + 20); x += sw + 30 + ctx.measureText(t).width; });
      y += legH; }
    if (foot) { ctx.font = `400 ${Math.round(fs * 0.8)}px ${FONT}`; ctx.fillStyle = '#333'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; let yy = y; foot.split('\n').forEach(par => { yy += wrapText(ctx, par, 30, yy, CW - 60, Math.round(lh * 0.8)) * Math.round(lh * 0.8); }); }
  }

  // STARD columns: positive and negative always, inconclusive only when used
  const stardBranches = c => c.stard.branches.filter((b, i) => i < 2 || +b.n > 0);

  /* ---------- simple flowchart: a chain of steps with optional exclusions, optionally split into the groups ---------- */
  function simpleFlow(c, groupLabels, palName, S) {
    let cv = makeCanvas(1200, 100), ctx = cv.getContext('2d');
    const lr = S.lr, fs = S.fs, lh = S.lh, boxW = Math.round((lr ? 300 : 520) * S.wScale), exW = Math.round((lr ? 280 : 420) * S.wScale), gap = S.gap - 4;
    const boxH = (text, w, bold, k = 1) => { ctx.font = `${bold ? 700 : 400} ${Math.round(fs * k)}px ${FONT}`; return text.split('\n').reduce((h, par) => h + measureLines(ctx, par, w - 28) * Math.round(lh * k), 0) + 26; };
    const steps = c.steps.filter(s => String(s.full || s.text).trim());
    // PRISMA: section labels at the side (Identification, Screening, Included), across the top when left to right
    const secs = c.sections && S.pills ? c.sections : null, gut = secs && !lr ? 80 : 0;
    const items = steps.map(s => {
      const text = s.full || `${s.text} (${S.N(+s.n || 0)})`, h = boxH(text, boxW, true);
      const ex = +s.exN > 0 ? { text: s.exFull || `${s.exText || 'Excluded'} (${S.N(s.exN)}${S.pct && +s.n > 0 ? `, ${Math.round(1000 * s.exN / s.n) / 10}%` : ''})`, h: 0 } : null;
      if (ex) ex.h = boxH(ex.text, exW, false, S.sideFs);
      return { text, h, ex };
    });
    const k = groupLabels.length, split = c.splitGroups && k > 1 && c.groups, pad = 18;
    const R = {}, place = (key, x, y, w, h, text, bold, align = 'center', role = 'main') => { const o = flowOff(c, key); R[key] = { x: x + o.dx, y: y + o.dy, w, h, text, bold, align, role }; };
    let CW, H0, busY, busX, y = 30;
    if (!lr) {
      CW = 1200; const midX = gut / 2 + CW / 2 - (steps.some(s => +s.exN > 0) ? 160 : 0);
      items.forEach((it, i) => { place('step' + i, midX - boxW / 2, y, boxW, it.h, it.text, true);
        if (it.ex) place('ex' + i, midX + 60, y + it.h + (gap + 24) / 2, exW, it.ex.h, it.ex.text, false, 'left', 'side');
        it.y = y; y += it.h + gap + (it.ex ? it.ex.h + 24 : 0); });
      const colW = split ? Math.min(360, (CW - pad * (k + 1)) / k) : 0, gH = split ? Math.max(...groupLabels.map((g, i) => boxH(`${g}\n(${S.N(c.groups[i].analysed)})`, colW, true))) : 0;
      busY = y - gap / 2;
      if (split) { const cx = i => pad + colW / 2 + i * ((CW - 2 * pad - colW) / (k - 1)); groupLabels.forEach((g, i) => place('grp' + i, cx(i) - colW / 2, y, colW, gH, `${g}\n(${S.N(c.groups[i].analysed)})`, true, 'center', S.emph ? 'final' : 'col')); }
      H0 = split ? y + gH + 30 : y - gap + 30;
    } else {
      const T0 = secs ? 90 : 30, mainH = Math.max(...items.map(it => it.h)), midY = T0 + mainH / 2, colW = Math.round(300 * S.wScale);
      const gH = split ? groupLabels.map((g, i) => boxH(`${g}\n(${S.N(c.groups[i].analysed)})`, colW, true)) : [], gTot = gH.reduce((t, h) => t + h, 0) + 24 * Math.max(0, gH.length - 1);
      const cy = split ? Math.max(midY, T0 + gTot / 2) : midY;
      let x = 20; items.forEach((it, i) => { place('step' + i, x, cy - it.h / 2, boxW, it.h, it.text, true); it.x = x; x += boxW;
        if (it.ex) { place('ex' + i, x + 30, cy + 50, exW, it.ex.h, it.ex.text, false, 'left', 'side'); x += exW + 60; } else x += 70; });
      busX = x - 35;
      if (split) { let gy = cy - gTot / 2; groupLabels.forEach((g, i) => { place('grp' + i, x, gy, colW, gH[i], `${g}\n(${S.N(c.groups[i].analysed)})`, true, 'center', S.emph ? 'final' : 'col'); gy += gH[i] + 24; }); x += colW; }
      else x -= 70;
      CW = x + 20; H0 = Math.max(...Object.values(R).map(r => r.y + r.h)) + 30;
    }
    H0 = Math.max(H0, Math.max(...Object.values(R).map(r => r.y + r.h)) + 30);
    ctx.font = `400 ${Math.round(fs * 0.8)}px ${FONT}`;
    const foot = String(c.footnote || '').trim(), footH = foot ? measureLines(ctx, foot, CW - 60) * Math.round(lh * 0.8) + 16 : 0, legH = S.legend && S.theme !== 'classic' && S.theme !== 'bw' ? 50 : 0;
    const Hc = H0 + footH + legH;
    cv = makeCanvas(CW * S.res, Hc * S.res); ctx = cv.getContext('2d'); ctx.scale(S.res, S.res);
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, CW, Hc);
    const box = r => {
      flowBox(ctx, S, r.x, r.y, r.w, r.h, r.role);
      const k = r.role === 'side' ? S.sideFs : 1, L2 = Math.round(lh * k);
      ctx.textBaseline = 'top'; ctx.font = `${r.bold ? 700 : 400} ${Math.round(fs * k)}px ${FONT}`; ctx.textAlign = r.align;
      let ty = r.y + 13;
      r.text.split('\n').forEach(par => { ty += wrapText(ctx, par, r.align === 'center' ? r.x + r.w / 2 : r.x + 14, ty, r.w - 28, L2) * L2; });
    };
    const arrow = (x1, y1, x2, y2) => flowArrow(ctx, S, x1, y1, x2, y2), pen = () => { ctx.strokeStyle = S.arrowColor || S.arrow; ctx.lineWidth = S.lw; };
    const linkV = (a, b) => { const ax = a.x + a.w / 2, bx = b.x + b.w / 2; if (Math.abs(ax - bx) < 0.5) { arrow(ax, a.y + a.h, bx, b.y); return; } const my = (a.y + a.h + b.y) / 2; pen(); ctx.beginPath(); ctx.moveTo(ax, a.y + a.h); ctx.lineTo(ax, my); ctx.lineTo(bx, my); ctx.stroke(); arrow(bx, my, bx, b.y); };
    const linkH = (a, b) => { const ay = a.y + a.h / 2, by = b.y + b.h / 2; if (Math.abs(ay - by) < 0.5) { arrow(a.x + a.w, ay, b.x, by); return; } const mx = (a.x + a.w + b.x) / 2; pen(); ctx.beginPath(); ctx.moveTo(a.x + a.w, ay); ctx.lineTo(mx, ay); ctx.lineTo(mx, by); ctx.stroke(); arrow(mx, by, b.x, by); };
    const lab = (t, x1, y1, x2, y2, vertical) => { ctx.fillStyle = S.pill; ctx.beginPath(); ctx.roundRect(x1, y1, x2 - x1, y2 - y1, 18); ctx.fill(); ctx.save(); ctx.translate((x1 + x2) / 2, (y1 + y2) / 2); if (vertical) ctx.rotate(-Math.PI / 2);
      ctx.fillStyle = S.pillText; ctx.font = `700 24px ${FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; const room = (vertical ? y2 - y1 : x2 - x1) - 16, tw = ctx.measureText(t).width; if (tw > room) ctx.font = `700 ${Math.max(14, Math.floor(24 * room / tw))}px ${FONT}`; ctx.fillText(t, 0, 0); ctx.restore(); };
    if (secs) secs.forEach(([t, a, b]) => { const l0 = R['step' + a], i1 = Math.min(b, items.length - 1), l1 = R['step' + i1]; if (!l0 || !l1) return;
      if (lr) lab(t, l0.x, 20, R['ex' + i1] && b < items.length - 1 ? R['ex' + i1].x + R['ex' + i1].w : l1.x + l1.w, 66, false);
      else lab(t, 10, l0.y, 64, l1.y + l1.h + (R['ex' + i1] ? R['ex' + i1].h + 24 : 0), true); });
    items.forEach((it, i) => {
      const r = R['step' + i]; box(r);
      if (R['ex' + i]) { const e = R['ex' + i]; box(e);
        if (lr) { const xm = e.x + e.w / 2, yy = r.y + r.h / 2; arrow(xm, yy, xm, e.y < yy ? e.y + e.h : e.y); }
        else { const cx = r.x + r.w / 2; arrow(cx, e.y + e.h / 2, e.x + e.w / 2 < cx ? e.x + e.w : e.x, e.y + e.h / 2); } }
      if (i < items.length - 1) (lr ? linkH : linkV)(r, R['step' + (i + 1)]);
    });
    if (split) {
      const last = R['step' + (items.length - 1)];
      if (!lr) { const cxs = groupLabels.map((_, i) => R['grp' + i].x + R['grp' + i].w / 2), lc = last.x + last.w / 2;
        ctx.strokeStyle = S.arrow; ctx.lineWidth = S.lw;
        ctx.beginPath(); ctx.moveTo(lc, last.y + last.h); ctx.lineTo(lc, busY); ctx.moveTo(Math.min(...cxs, lc), busY); ctx.lineTo(Math.max(...cxs, lc), busY); ctx.stroke();
        groupLabels.forEach((g, i) => { arrow(cxs[i], busY, cxs[i], R['grp' + i].y); box(R['grp' + i]); }); }
      else { const ys = groupLabels.map((_, i) => R['grp' + i].y + R['grp' + i].h / 2), ly = last.y + last.h / 2;
        pen(); ctx.beginPath(); ctx.moveTo(last.x + last.w, ly); ctx.lineTo(busX, ly); ctx.moveTo(busX, Math.min(...ys, ly)); ctx.lineTo(busX, Math.max(...ys, ly)); ctx.stroke();
        groupLabels.forEach((g, i) => { arrow(busX, ys[i], R['grp' + i].x, ys[i]); box(R['grp' + i]); }); }
    }
    flowFoot(ctx, S, foot, legH, CW, H0, fs, lh);
    FLOW_HITS = { W: CW, H: Hc, list: Object.entries(R).map(([key, r]) => ({ key, x: r.x, y: r.y, w: r.w, h: r.h })) };
    return cv;
  }

  /* ---------- image export: PNG, JPEG or TIFF at a set dpi, in colour or greyscale ---------- */
  const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
  const crc32 = (b, s, e) => { let c = 0xFFFFFFFF; for (let i = s; i < e; i++) c = CRC_T[(c ^ b[i]) & 255] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
  // the pixels on white (JPEG and TIFF have no transparency), optionally as luminance grey
  function flatten(src, grey) {
    const c = document.createElement('canvas'); c.width = src.width; c.height = src.height;
    const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.drawImage(src, 0, 0);
    if (grey) {
      const step = Math.max(1, Math.floor(4e6 / c.width)); // in bands, to keep memory low on large images
      for (let y = 0; y < c.height; y += step) {
        const h = Math.min(step, c.height - y), d = x.getImageData(0, y, c.width, h), p = d.data;
        for (let i = 0; i < p.length; i += 4) { const g = Math.round(0.299 * p[i] + 0.587 * p[i + 1] + 0.114 * p[i + 2]); p[i] = p[i + 1] = p[i + 2] = g; }
        x.putImageData(d, 0, y);
      }
    }
    return c;
  }
  const toBlob = (c, type, q) => new Promise((ok, no) => c.toBlob(b => b ? ok(b) : no(new Error('The image is too large for this browser — choose a lower resolution')), type, q));
  // PNG: a pHYs chunk (pixels per metre) after IHDR
  function pngDpi(b, dpi) {
    const ppm = Math.round(dpi / 0.0254), ch = new Uint8Array(21), v = new DataView(ch.buffer);
    v.setUint32(0, 9); ch.set([112, 72, 89, 115], 4); v.setUint32(8, ppm); v.setUint32(12, ppm); ch[16] = 1; v.setUint32(17, crc32(ch, 4, 17));
    const out = new Uint8Array(b.length + 21); out.set(b.subarray(0, 33)); out.set(ch, 33); out.set(b.subarray(33), 54);
    return out;
  }
  // JPEG: the JFIF density fields in dots per inch (an APP0 segment is added when the encoder wrote none)
  function jpegDpi(b, dpi) {
    if (b[2] === 0xFF && b[3] === 0xE0 && String.fromCharCode(...b.subarray(6, 10)) === 'JFIF') { b[13] = 1; b[14] = dpi >> 8; b[15] = dpi & 255; b[16] = dpi >> 8; b[17] = dpi & 255; return b; }
    const app = new Uint8Array([0xFF, 0xE0, 0, 16, 74, 70, 73, 70, 0, 1, 1, 1, dpi >> 8, dpi & 255, dpi >> 8, dpi & 255, 0, 0]);
    const out = new Uint8Array(b.length + app.length); out.set(b.subarray(0, 2)); out.set(app, 2); out.set(b.subarray(2), 2 + app.length);
    return out;
  }
  // PackBits run-length coding of one row
  function packBits(src) {
    const out = [], n = src.length; let i = 0;
    while (i < n) {
      let r = 1; while (i + r < n && r < 128 && src[i + r] === src[i]) r++;
      if (r > 1) { out.push(257 - r, src[i]); i += r; continue; }
      let j = i + 1; while (j < n && j - i < 128 && !(j + 1 < n && src[j] === src[j + 1])) j++;
      out.push(j - i - 1); for (let k = i; k < j; k++) out.push(src[k]); i = j;
    }
    return Uint8Array.from(out);
  }
  // baseline TIFF, PackBits-compressed, RGB or 8-bit grey, with the resolution in dpi
  function tiff(c, dpi, grey) {
    const W = c.width, H = c.height, spp = grey ? 1 : 3, x = c.getContext('2d'), rps = 32, strips = [];
    for (let y = 0; y < H; y += rps) {
      const h = Math.min(rps, H - y), p = x.getImageData(0, y, W, h).data, rows = [];
      for (let r = 0; r < h; r++) {
        const row = new Uint8Array(W * spp);
        for (let i = 0, o = r * W * 4; i < W; i++, o += 4) { if (grey) row[i] = p[o]; else { row[i * 3] = p[o]; row[i * 3 + 1] = p[o + 1]; row[i * 3 + 2] = p[o + 2]; } }
        rows.push(packBits(row));
      }
      const len = rows.reduce((a, r) => a + r.length, 0), strip = new Uint8Array(len); let o = 0;
      rows.forEach(r => { strip.set(r, o); o += r.length; }); strips.push(strip);
    }
    const n = strips.length, tags = 13, ifdLen = 2 + tags * 12 + 4;
    let off = 8 + strips.reduce((a, s) => a + s.length, 0); off += off & 1;
    const ifd = off, extra = ifd + ifdLen, bps = extra, xres = bps + 8, yres = xres + 8, so = yres + 8, sc = so + 4 * n, end = sc + 4 * n;
    const head = new Uint8Array(8), hv = new DataView(head.buffer); head.set([73, 73]); hv.setUint16(2, 42, true); hv.setUint32(4, ifd, true);
    const tail = new Uint8Array(end - ifd), v = new DataView(tail.buffer), at = a => a - ifd;
    v.setUint16(0, tags, true);
    const T = [[256, 4, 1, W], [257, 4, 1, H], [258, 3, spp, spp === 1 ? 8 : bps], [259, 3, 1, 32773], [262, 3, 1, grey ? 1 : 2], [273, 4, n, n === 1 ? 8 : so],
      [277, 3, 1, spp], [278, 4, 1, rps], [279, 4, n, n === 1 ? strips[0].length : sc], [282, 5, 1, xres], [283, 5, 1, yres], [284, 3, 1, 1], [296, 3, 1, 2]];
    T.forEach(([tag, type, count, val], i) => { const q = 2 + i * 12; v.setUint16(q, tag, true); v.setUint16(q + 2, type, true); v.setUint32(q + 4, count, true);
      if (type === 3 && count === 1) v.setUint16(q + 8, val, true); else v.setUint32(q + 8, val, true); });
    v.setUint32(2 + tags * 12, 0, true);
    [0, 2, 4].forEach(k => v.setUint16(at(bps) + k, 8, true));
    [xres, yres].forEach(a => { v.setUint32(at(a), dpi, true); v.setUint32(at(a) + 4, 1, true); });
    let p = 8; strips.forEach((s, i) => { v.setUint32(at(so) + 4 * i, p, true); v.setUint32(at(sc) + 4 * i, s.length, true); p += s.length; });
    const parts = [head, ...strips]; if ((8 + strips.reduce((a, s) => a + s.length, 0)) & 1) parts.push(new Uint8Array(1));
    return new Blob([...parts, tail], { type: 'image/tiff' });
  }
  // canvas → Blob in the chosen format; the file says its resolution so Word and journals size it right
  async function exportImage(src, { format = 'png', dpi = 300, grey = false, quality = 0.95 } = {}) {
    const c = flatten(src, grey);
    if (format === 'tiff') return tiff(c, dpi, grey);
    const jpg = format === 'jpg' || format === 'jpeg', b = new Uint8Array(await (await toBlob(c, jpg ? 'image/jpeg' : 'image/png', quality)).arrayBuffer());
    return new Blob([jpg ? jpegDpi(b, dpi) : pngDpi(b, dpi)], { type: jpg ? 'image/jpeg' : 'image/png' });
  }

  // the flowchart as SVG
  function flowSVG(c, gl, pal) { VECTOR = true; try { return consort(c, gl, pal, 1).toSVG(); } finally { VECTOR = false; } }
  return { draw, drawSVG, flowSVG, flowHits: () => FLOW_HITS, makeCanvas, hits: () => hitsOf, consort, exportImage, PALETTES, PALETTE_NAMES, PALETTE_GROUPS, DEFAULT_STYLE, FLOW_LABELS };
})();

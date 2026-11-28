/* Prof Easy Stat — add a new variable, or change an existing one, with generation options (as in the Generate phase):
   numbers (normal, skewed, uniform, counts) with a mean and SD for each group, linked to another column; yes/no and categories
   with a % for each group; dates; missing values and outliers; a seed. An existing column can be regenerated, adjusted to new
   targets (each patient keeps their rank), or only its blanks filled. Generated values are marked: the sheet says which columns
   are simulated, and the statistical analysis says so (on by default). Undo restores the data. */
(() => {
  const U = window.EasyUI; if (!U || typeof Analysis === 'undefined') return;
  const S = () => U.state, $ = s => document.querySelector(s), esc = U.esc, A = Analysis;
  const css = document.createElement('style');
  css.textContent = `#gvPanel{width:min(760px,calc(100vw - 24px))}.gv fieldset{border:1px solid var(--line);border-radius:10px;padding:6px 10px 8px;margin:0 0 10px}.gv legend{font-weight:700;padding:0 4px}
.gv .gv-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:4px 0}.gv input[type=number]{width:84px}.gv input[type=text]{min-width:120px}.gv select{width:auto;max-width:100%}
.gv table{border-collapse:collapse;width:100%;font-size:13px}.gv th,.gv td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left}.gv td input[type=number]{width:74px}
.gv .gv-note{background:#FFF7E0;border:1px solid #EFCB6A;border-radius:8px;padding:6px 9px;font-size:12.5px;color:#4d3b00;margin:0 0 8px}
.gv .gv-prev td,.gv .gv-prev th{text-align:center}.gv .gv-prev td:first-child,.gv .gv-prev th:first-child{text-align:left}.gv .sig{color:#1E8E5A;font-weight:700}`;
  document.head.appendChild(css);

  /* ---------- random numbers (seeded) ---------- */
  const rng = seed => { let s = (seed >>> 0) || 1; return () => { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
  const normal = r => { let u = 0, v = 0; while (u === 0) u = r(); while (v === 0) v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  const Phi = z => 0.5 * (1 + Math.sign(z) * Math.sqrt(1 - Math.exp(-2 * z * z / Math.PI))); // close enough for spreading a uniform
  const poisson = (r, m) => { if (m > 40) return Math.max(0, Math.round(m + Math.sqrt(m) * normal(r))); const L = Math.exp(-m); let k = 0, p = 1; do { k++; p *= r(); } while (p > L); return k - 1; };
  const logit = p => Math.log(p / (1 - p)), inv = x => 1 / (1 + Math.exp(-x));
  const num = x => A.toNum(x), miss = x => x === null || x === undefined || String(x).trim() === '';
  const mean = a => a.reduce((s, x) => s + x, 0) / a.length, sd = a => { const m = mean(a); return a.length > 1 ? Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / (a.length - 1)) : 0; };
  const round = (x, d) => { const f = 10 ** d; return Math.round(x * f) / f; };

  /* ---------- the groups of the analysis ---------- */
  const groups = () => { const cfg = S().cfg; if (!cfg || !cfg.groupCol) return []; return (U.activeGroups ? U.activeGroups() : cfg.groupOrder).map(g => ({ g, lab: (cfg.groupLabels || {})[g] || g })); };
  const gOf = r => { try { return A.groupOf(S().cfg, r); } catch (e) { return null; } };

  /* ---------- the dialog's settings ---------- */
  let D = null;
  const blank = () => ({ mode: 'new', col: '', name: 'New_variable', type: 'num', byGroup: groups().length > 1, dist: 'normal', P: {}, cats: 'Mild, Moderate, Severe', yes: 'Yes', no: 'No', min: '', max: '', dec: 1,
    link: '', linkHow: 'corr', diffAs: 'range', L: {}, r: 0.5, or: 2, missPct: 0, outPct: 0, seed: Math.floor(Math.random() * 90000) + 10000, how: 'regen', keepMiss: true, d1: 0.5, d1from: '', date1: '2025-01-01', date2: '2025-12-31' });
  const keys = () => D.byGroup && groups().length ? groups().map(x => x.g) : ['__all'];
  const labOf = k => k === '__all' ? 'All patients' : (groups().find(x => x.g === k) || {}).lab || k;
  const catList = () => D.type === 'yn' ? [D.yes || 'Yes', D.no || 'No'] : String(D.cats).split(/[,;\n]+/).map(x => x.trim()).filter(Boolean);
  function par(k) { const p = D.P[k] = D.P[k] || {}; if (D.type === 'num') { if (p.mean === undefined) p.mean = 50; if (p.sd === undefined) p.sd = 10; if (p.lo === undefined) p.lo = 0; if (p.hi === undefined) p.hi = 100; }
    if (D.type === 'yn' && p.pct === undefined) p.pct = 30; if (D.type === 'cat') { p.cats = p.cats || {}; const cs = catList(); cs.forEach(c => { if (p.cats[c] === undefined) p.cats[c] = Math.round(100 / cs.length); }); } return p; }
  // an existing column: its type and its values now, for each group, as the starting targets
  function fromColumn(col) { const rows = S().data.rows, cfg = S().cfg; let kind = 'categorical'; try { kind = A.columnKind(cfg, rows, col); } catch (e) { /* default */ }
    const vals = rows.map(r => r[col]).filter(x => !miss(x)), nums = vals.map(num).filter(isFinite);
    D.type = kind === 'numeric' && nums.length >= vals.length * 0.9 ? 'num' : 'cat'; D.type0 = D.type; D.P = {}; D.name = col; D.link = ''; D.missPct = 0; D.outPct = 0;
    const by = k => k === '__all' ? rows : rows.filter(r => gOf(r) === k);
    if (D.type === 'num') { const decs = nums.map(x => (String(x).split('.')[1] || '').length); D.dec = Math.min(4, Math.max(0, ...decs.slice(0, 200))); const lo = Math.min(...nums), hi = Math.max(...nums); D.min = ''; D.max = '';
      const sk = (() => { const m = mean(nums), s = sd(nums); return s ? nums.reduce((t, x) => t + ((x - m) / s) ** 3, 0) / nums.length : 0; })(); D.dist = sk > 1 && lo > 0 ? 'skew' : 'normal';
      keys().forEach(k => { const a = by(k).map(r => num(r[col])).filter(isFinite); D.P[k] = { mean: a.length ? round(mean(a), D.dec + 1) : 0, sd: a.length > 1 ? round(sd(a), D.dec + 1) : 1, lo: round(lo, D.dec), hi: round(hi, D.dec) }; }); }
    else { const cats = [...new Set(vals.map(x => String(x).trim()))]; const v = cfg && cfg.variables.find(x => x.cols && x.cols.length === 1 && x.cols[0].col === col); const order = v && Array.isArray(v.levels) && v.levels.length ? [...v.levels.filter(c => cats.includes(c)), ...cats.filter(c => !v.levels.includes(c))] : cats.sort();
      D.cats = order.join(', ');
      keys().forEach(k => { const a = by(k).map(r => r[col]).filter(x => !miss(x)).map(x => String(x).trim()); D.P[k] = { cats: Object.fromEntries(order.map(c => [c, a.length ? round(100 * a.filter(x => x === c).length / a.length, 1) : 0])) }; }); }
    const m0 = rows.filter(r => miss(r[col])).length; D.keepMiss = true; D.missNow = round(100 * m0 / Math.max(1, rows.length), 1); }

  /* ---------- making the values ---------- */
  // the linked column: another column, or (when changing a column) its own values as they are now
  const LC = () => D.link === '__self' ? D.col : D.link, LN = () => D.link === '__self' ? `its own values (${D.col})` : D.link;
  function linkZ() { if (!D.link) return null; const xs = S().data.rows.map(r => num(r[LC()])), ok = xs.filter(isFinite); if (ok.length < 3) { const cs = S().data.rows.map(r => r[LC()]); const lv = [...new Set(cs.filter(x => !miss(x)).map(String))].sort(); return cs.map(x => miss(x) ? null : lv.indexOf(String(x)) / Math.max(1, lv.length - 1) * 2 - 1); }
    const m = mean(ok), s = sd(ok) || 1; return xs.map(x => isFinite(x) ? (x - m) / s : null); }
  function oneValue(r, k, zx) { const p = par(k), e = normal(r), z = zx === null || zx === undefined || !D.link ? e : (+D.r || 0) * zx + Math.sqrt(Math.max(0, 1 - (+D.r || 0) ** 2)) * e;
    if (D.type === 'num') { let x; const m = +p.mean, s = Math.max(0, +p.sd);
      if (D.dist === 'skew') { const mm = Math.max(1e-6, m), s2 = Math.log(1 + (s * s) / (mm * mm)); x = Math.exp(Math.log(mm) - s2 / 2 + Math.sqrt(s2) * z); }
      else if (D.dist === 'uniform') x = +p.lo + (+p.hi - +p.lo) * Phi(z);
      else if (D.dist === 'count') x = poisson(r, Math.max(0, m * (D.link ? Math.exp(0.35 * (+D.r || 0) * (zx || 0)) : 1)));
      else x = m + s * z;
      if (+D.outPct > 0 && r() < +D.outPct / 100) x = m + (r() < 0.5 ? -1 : 1) * (3.5 + r()) * (s || 1);
      if (D.min !== '' && isFinite(+D.min)) x = Math.max(+D.min, x); if (D.max !== '' && isFinite(+D.max)) x = Math.min(+D.max, x);
      return D.dist === 'count' ? Math.round(x) : round(x, Math.max(0, +D.dec || 0)); }
    if (D.type === 'yn') { let q = Math.min(0.999, Math.max(0.001, (+p.pct || 0) / 100)); if (D.link && zx !== null && zx !== undefined) q = inv(logit(q) + Math.log(Math.max(0.05, +D.or || 1)) * zx); return r() < q ? D.yes || 'Yes' : D.no || 'No'; }
    if (D.type === 'cat') { const cs = catList(), w = cs.map(c => Math.max(0, +((p.cats || {})[c]) || 0)), t = w.reduce((a, b) => a + b, 0) || 1; let u = r() * t; for (let i = 0; i < cs.length; i++) { u -= w[i]; if (u <= 0) return cs[i]; } return cs[cs.length - 1]; }
    if (D.type === 'date') { const a = Date.parse(D.date1), b = Date.parse(D.date2); if (!isFinite(a) || !isFinite(b)) return null; const t = a + (b - a) * r(); return new Date(t).toISOString().slice(0, 10); } return null; }
  const derived = () => D.type === 'num' && D.link && D.linkHow && D.linkHow !== 'corr';
  function lpar(k) { const p = D.L[k] = D.L[k] || {}; if (p.f === undefined) p.f = D.linkHow === 'div' ? 2 : 1.5; if (p.lo === undefined) p.lo = 1; if (p.hi === undefined) p.hi = 5; if (p.m === undefined) p.m = 3; if (p.s === undefined) p.s = 1; return p; }
  // a value made from the linked column: multiplied, divided, or increased / decreased by a change (a range, or a mean with an SD)
  function fromLink(r, k, base) { if (!isFinite(base)) return null; const p = lpar(k), h = D.linkHow; let x;
    if (h === 'mul') x = base * (+p.f || 0); else if (h === 'div') x = +p.f ? base / +p.f : null;
    else { const d = D.diffAs === 'mean' ? +p.m + (+p.s || 0) * normal(r) : +p.lo + (+p.hi - +p.lo) * r(); x = h === 'dec' ? base - d : base + d; }
    if (x === null || !isFinite(x)) return null;
    if (+D.outPct > 0 && r() < +D.outPct / 100) x = x * (r() < 0.5 ? 0.4 : 1.8);
    if (D.min !== '' && isFinite(+D.min)) x = Math.max(+D.min, x); if (D.max !== '' && isFinite(+D.max)) x = Math.min(+D.max, x); return round(x, Math.max(0, +D.dec || 0)); }
  const keyOfRow = row => { if (!D.byGroup || !groups().length) return '__all'; const g = gOf(row); return groups().some(x => x.g === g) ? g : groups()[0].g; };
  function make() { const rows = S().data.rows, r = rng(+D.seed || 1), zs = linkZ(), old = D.mode === 'mod' ? rows.map(x => x[D.col]) : null;
    if (D.mode === 'mod' && D.how === 'adjust') return adjust(rows, r);
    const raw = derived() ? rows.map(x => num(x[LC()])) : null;
    return rows.map((row, i) => { const v = raw ? fromLink(r, keyOfRow(row), raw[i]) : oneValue(r, keyOfRow(row), zs ? zs[i] : null), mr = r();
      if (D.mode === 'mod' && D.how === 'fill') return miss(old[i]) ? v : old[i];
      if (D.mode === 'mod' && D.keepMiss && miss(old[i])) return null;
      return +D.missPct > 0 && mr < +D.missPct / 100 ? null : v; }); }
  // adjust: numbers rescaled to the new mean and SD of each group (each patient keeps their place); categories changed in the fewest patients
  function adjust(rows, r) { const col = D.col, out = rows.map(x => x[col]);
    keys().forEach(k => { const idx = rows.map((x, i) => i).filter(i => keyOfRow(rows[i]) === k && !miss(rows[i][col])), p = par(k); if (!idx.length) return;
      if (D.type === 'num') { const a = idx.map(i => num(rows[i][col])), ok = a.filter(isFinite), m0 = mean(ok), s0 = sd(ok) || 1;
        idx.forEach((i, j) => { if (!isFinite(a[j])) return; let x = +p.mean + (a[j] - m0) * (+p.sd / s0); if (D.min !== '' && isFinite(+D.min)) x = Math.max(+D.min, x); if (D.max !== '' && isFinite(+D.max)) x = Math.min(+D.max, x); out[i] = round(x, Math.max(0, +D.dec || 0)); }); }
      else { const cs = catList(), w = cs.map(c => Math.max(0, +((p.cats || {})[c]) || 0)), t = w.reduce((a, b) => a + b, 0) || 1, n = idx.length;
        const want = cs.map((c, j) => Math.round(n * w[j] / t)); let diff = n - want.reduce((a, b) => a + b, 0); for (let j = 0; diff !== 0 && j < 50; j++) { const q = j % cs.length; if (diff > 0) { want[q]++; diff--; } else if (want[q] > 0) { want[q]--; diff++; } }
        const has = cs.map(c => idx.filter(i => String(out[i]).trim() === c)), other = idx.filter(i => !cs.includes(String(out[i]).trim())), pool = [...other];
        has.forEach((list, j) => { const extra = list.length - want[j]; if (extra > 0) { const sh = [...list].sort(() => r() - 0.5).slice(0, extra); pool.push(...sh); } });
        pool.sort(() => r() - 0.5); has.forEach((list, j) => { let need = want[j] - Math.min(list.length, want[j]); while (need-- > 0 && pool.length) out[pool.pop()] = cs[j]; }); } });
    return out; }

  /* ---------- the preview: each group before and after, and the test between the groups ---------- */
  function summary(vals) { const rows = S().data.rows, ks = keys(), out = {}; ks.forEach(k => { const v = vals.filter((x, i) => keyOfRow(rows[i]) === k); out[k] = v; }); return out; }
  function pOf(by) { const ks = Object.keys(by).filter(k => k !== '__all'); if (ks.length < 2 || typeof Stats === 'undefined') return null;
    try { if (D.type === 'num') { const g = ks.map(k => by[k].map(num).filter(isFinite)); if (g.some(a => a.length < 2)) return null; return ks.length === 2 ? Stats.tTest(g[0], g[1]).p : Stats.anova(g).p; }
      if (D.type === 'date') return null; const cs = catList(), t = cs.map(c => ks.map(k => by[k].filter(x => String(x).trim() === c).length)).filter(row => row.some(x => x > 0)); return t.length > 1 ? Stats.chiSquare(t).p : null; } catch (e) { return null; } }
  const fmtP = p => p === null || !isFinite(p) ? '—' : p < 0.001 ? '< 0.001' : p.toFixed(3);
  function cellOf(a) { const ok = a.filter(x => !miss(x)), nm = a.length - ok.length;
    if (D.type === 'num') { const xs = ok.map(num).filter(isFinite); return xs.length ? `${round(mean(xs), (+D.dec || 0) + 1)} ± ${round(sd(xs), (+D.dec || 0) + 1)}${nm ? ` <span class="legend-note">(${nm} blank)</span>` : ''}` : '—'; }
    if (D.type === 'date') return ok.length ? `${ok.slice().sort()[0]} … ${ok.slice().sort().slice(-1)[0]}` : '—';
    const cs = catList(); return cs.map(c => `${esc(c)} ${ok.length ? round(100 * ok.filter(x => String(x).trim() === c).length / ok.length, 1) : 0}%`).join(' · ') + (nm ? ` <span class="legend-note">(${nm} blank)</span>` : ''); }
  function preview() { const box = $('#gvPrev'); if (!box || !D) return; let vals; try { vals = make(); } catch (e) { box.innerHTML = `<p class="legend-note">${esc(e.message)}</p>`; return; }
    const now = summary(vals), was = D.mode === 'mod' ? summary(S().data.rows.map(r => r[D.col])) : null, ks = keys();
    box.innerHTML = `<table class="gv-prev"><thead><tr><th></th>${ks.map(k => `<th>${esc(labOf(k))} <span class="legend-note">n=${now[k].length}</span></th>`).join('')}<th>P between groups</th></tr></thead><tbody>
      ${was ? `<tr><td>Now</td>${ks.map(k => `<td>${cellOf(was[k])}</td>`).join('')}<td>${fmtP(pOf(was))}</td></tr>` : ''}
      <tr><td><b>${was ? 'After' : 'Generated'}</b></td>${ks.map(k => `<td><b>${cellOf(now[k])}</b></td>`).join('')}<td class="${(pOf(now) ?? 1) <= 0.05 ? 'sig' : ''}">${fmtP(pOf(now))}</td></tr></tbody></table>
      <p class="legend-note" style="margin:4px 0 0">${D.type === 'num' ? (ks.length === 2 ? 'Student t-test' : 'one-way ANOVA') : 'chi-square test'} on the values above — the report may use another test.</p>`; }

  /* ---------- the dialog ---------- */
  function open(col) { if (!S().data || !S().cfg) { U.toast('Open data or an example first'); return; } D = blank(); if (col) { D.mode = 'mod'; D.col = col; fromColumn(col); } draw(); }
  const sel = (k, list, cur) => `<select data-gv="${k}">${list.map(([v, l]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const inp = (k, v, type = 'number', w = '', ph = '') => `<input type="${type}" data-gv="${k}" value="${esc(v ?? '')}" ${w ? `style="width:${w}"` : ''} placeholder="${esc(ph)}" ${type === 'number' ? 'step="any"' : ''}>`;
  function linkHtml() { if (!derived()) return ''; const ks = keys(), h = D.linkHow, md = ['mul', 'div'].includes(h);
    return `<table><thead><tr><th>${D.byGroup && groups().length ? 'Group' : ''}</th>${md ? `<th>${h === 'mul' ? 'Multiply by' : 'Divide by'}</th>` : D.diffAs === 'mean' ? `<th>Mean ${h === 'inc' ? 'increase' : 'decrease'}</th><th>SD</th>` : `<th>${h === 'inc' ? 'Increase' : 'Decrease'} from</th><th>to</th>`}</tr></thead><tbody>${ks.map(k => { const p = lpar(k);
      return `<tr><td>${esc(labOf(k))}</td>${md ? `<td>${inp(`L.${k}.f`, p.f)}</td>` : D.diffAs === 'mean' ? `<td>${inp(`L.${k}.m`, p.m)}</td><td>${inp(`L.${k}.s`, p.s)}</td>` : `<td>${inp(`L.${k}.lo`, p.lo)}</td><td>${inp(`L.${k}.hi`, p.hi)}</td>`}</tr>`; }).join('')}</tbody></table>
      <p class="legend-note" style="margin:4px 0 0">${esc(LN())} ${md ? (h === 'mul' ? '×' : '÷') + ' the number of each group' : `${h === 'inc' ? '+' : '−'} a change drawn ${D.diffAs === 'mean' ? 'from the mean ± SD' : 'evenly between the two values'} of each group`}; a blank in ${esc(LN())} stays blank.</p>`; }
  function paramsHtml() { const ks = keys();
    if (D.type === 'num') { const uni = D.dist === 'uniform', cnt = D.dist === 'count';
      return `<table><thead><tr><th>${D.byGroup && groups().length ? 'Group' : ''}</th>${uni ? '<th>From</th><th>To</th>' : `<th>Mean</th>${cnt ? '' : '<th>SD</th>'}`}</tr></thead><tbody>${ks.map(k => { const p = par(k); return `<tr><td>${esc(labOf(k))}</td>${uni ? `<td>${inp(`P.${k}.lo`, p.lo)}</td><td>${inp(`P.${k}.hi`, p.hi)}</td>` : `<td>${inp(`P.${k}.mean`, p.mean)}</td>${cnt ? '' : `<td>${inp(`P.${k}.sd`, p.sd)}</td>`}`}</tr>`; }).join('')}</tbody></table>
        ${ks.length > 1 && !uni ? `<div class="gv-row"><span class="legend-note">Quick difference:</span> the other groups differ from ${sel('d1from', ks.map(k => [k, labOf(k)]), D.d1from || ks[0])} by an effect size (Cohen's d) of ${inp('d1', D.d1, 'number', '70px')} <button class="btn ghost small" type="button" data-gvact="d">Fill the means</button><span class="legend-note">0.2 small · 0.5 medium · 0.8 large</span></div>` : ''}`; }
    if (D.type === 'yn') return `<div class="gv-row">“Yes” is ${inp('yes', D.yes, 'text', '110px')} and “No” is ${inp('no', D.no, 'text', '110px')}</div><table><thead><tr><th>${D.byGroup && groups().length ? 'Group' : ''}</th><th>% ${esc(D.yes || 'Yes')}</th></tr></thead><tbody>${ks.map(k => `<tr><td>${esc(labOf(k))}</td><td>${inp(`P.${k}.pct`, par(k).pct)}</td></tr>`).join('')}</tbody></table>`;
    if (D.type === 'cat') { const cs = catList(); return `<div class="gv-row">Categories, in order: ${inp('cats', D.cats, 'text', '100%', 'e.g. Mild, Moderate, Severe')}</div><table><thead><tr><th>${D.byGroup && groups().length ? 'Group' : ''}</th>${cs.map(c => `<th>% ${esc(c)}</th>`).join('')}<th></th></tr></thead><tbody>${ks.map(k => { const p = par(k), t = cs.reduce((a, c) => a + (+p.cats[c] || 0), 0); return `<tr><td>${esc(labOf(k))}</td>${cs.map(c => `<td>${inp(`P.${k}.cats.${c}`, p.cats[c])}</td>`).join('')}<td class="legend-note">${Math.round(t) === 100 ? '✓ 100%' : `${round(t, 1)}% (scaled to 100)`}</td></tr>`; }).join('')}</tbody></table>`; }
    return `<div class="gv-row">From ${inp('date1', D.date1, 'date')} to ${inp('date2', D.date2, 'date')}</div>`; }
  const TYPES = [['num', 'Number'], ['yn', 'Yes / No'], ['cat', 'Categories'], ['date', 'Date']];
  function draw() { const cols = S().data.headers, numCols = cols.filter(c => c !== D.col), mod = D.mode === 'mod';
    const p = window.EasyUX2.panel('gvPanel', '🎲 Generate or change a variable', `<div class="gv">
      <div class="gv-note">For teaching, testing an analysis plan or filling a planned variable: <b>generated values are not patient data</b>. The sheet records which columns are simulated, and the statistical analysis says so (you can change that in the banner of step 1 or 12). Undo (Ctrl+Z) restores the data.</div>
      <fieldset><legend>What</legend><div class="gv-row"><label><input type="radio" name="gvMode" value="new" ${!mod ? 'checked' : ''}> A new variable</label> <label><input type="radio" name="gvMode" value="mod" ${mod ? 'checked' : ''}> Change an existing one:</label>
        <select data-gv="col" ${mod ? '' : 'disabled'}><option value="">— column —</option>${cols.map(c => `<option value="${esc(c)}" ${c === D.col ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select></div>
        ${!mod ? `<div class="gv-row">Column name ${inp('name', D.name, 'text', '200px')} Type ${sel('type', TYPES, D.type)}</div>` : !D.col ? '' : `<div class="gv-row">Type ${sel('type', TYPES, D.type)}${D.type !== D.type0 ? `<span class="legend-note">was ${esc((TYPES.find(t => t[0] === D.type0) || [, ''])[1])} — new values are generated</span>` : ''}</div><div class="gv-row">How ${sel('how', D.type !== D.type0 ? [['regen', 'Generate new values for every patient']] : [['regen', 'Generate new values for every patient'], ['adjust', 'Adjust the values to the targets (each patient keeps their place)'], ['fill', 'Fill only the blank cells']], D.how)}${D.how === 'regen' ? `<label class="check" style="margin:0"><input type="checkbox" data-gv="keepMiss" ${D.keepMiss ? 'checked' : ''}><span>Keep the blank cells blank (${D.missNow}% now)</span></label>` : ''}</div>`}
      </fieldset>
      ${mod && !D.col ? '' : `<fieldset><legend>Values</legend>
        ${derived() ? `<div class="gv-row legend-note">The values come from <b>${esc(LN())}</b> (see Linked to another column below).</div><div class="gv-row">Decimals ${sel('dec', [0, 1, 2, 3].map(n => [n, n]), D.dec)} Lowest ${inp('min', D.min, 'number', '', 'none')} Highest ${inp('max', D.max, 'number', '', 'none')}</div>` : ''}
        ${D.type === 'num' && !derived() ? `<div class="gv-row">Distribution ${sel('dist', [['normal', 'Normal (bell-shaped)'], ['skew', 'Skewed to the right (log-normal)'], ['uniform', 'Even between two values'], ['count', 'Counts (0, 1, 2 …)']], D.dist)} Decimals ${sel('dec', [0, 1, 2, 3].map(n => [n, n]), D.dec)} Lowest ${inp('min', D.min, 'number', '', 'none')} Highest ${inp('max', D.max, 'number', '', 'none')}</div>` : ''}
        ${groups().length > 1 ? `<label class="check" style="margin:2px 0 6px"><input type="checkbox" data-gv="byGroup" ${D.byGroup ? 'checked' : ''}><span>Different values in each group (${esc(S().cfg.groupCol)})</span></label>` : ''}
        ${derived() ? '' : paramsHtml()}</fieldset>
      ${!(mod && D.how === 'adjust') && D.type !== 'date' ? `<fieldset><legend>${mod ? 'Linked to its own values or another column' : 'Linked to another column'}</legend><div class="gv-row">${sel('link', [['', 'Not linked'], ...(mod && D.col && D.type === D.type0 ? [['__self', `Its own values (${D.col})`]] : []), ...numCols.map(c => [c, c])], D.link)}${D.link ? (D.type === 'yn' ? ` odds ratio per SD ${inp('or', D.or, 'number', '70px')}` : D.type === 'num' ? ` ${sel('linkHow', [['corr', 'correlated with it'], ['mul', 'multiplied by'], ['div', 'divided by'], ['inc', 'increased by'], ['dec', 'decreased by']], D.linkHow)}${D.linkHow === 'corr' ? ` r ${inp('r', D.r, 'number', '70px')} <span class="legend-note">−0.9 … 0.9</span>` : ''}${['inc', 'dec'].includes(D.linkHow) ? ` a change given as ${sel('diffAs', [['range', 'a range (from – to)'], ['mean', 'a mean ± SD']], D.diffAs)}` : ''}` : ' <span class="legend-note">(categories are not linked)</span>') : ''}</div>${linkHtml()}</fieldset>` : ''}
      ${!(mod && D.how !== 'regen') ? `<fieldset><legend>Realism</legend><div class="gv-row">Blank cells ${inp('missPct', D.missPct, 'number', '70px')} %${D.type === 'num' ? ` · Outliers ${inp('outPct', D.outPct, 'number', '70px')} %` : ''}</div></fieldset>` : ''}`}
      <div class="gv-row">Seed ${inp('seed', D.seed, 'number', '100px')} <button class="btn ghost small" type="button" data-gvact="seed" title="Another random draw">🎲 New draw</button><span class="legend-note">the same seed gives the same values</span></div>
      <fieldset><legend>Preview</legend><div id="gvPrev"></div></fieldset>
      <div class="row" style="gap:6px;justify-content:flex-end"><button class="btn ghost small" type="button" data-gvact="cancel">Cancel</button><button class="btn primary small" type="button" data-gvact="ok">${mod ? 'Change the column' : 'Add the column'}</button></div></div>`);
    p.style.width = 'min(760px, calc(100vw - 24px))'; preview(); }
  const setPath = (path, val) => { const ks = path.split('.'); let o = D; for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]] = o[ks[i]] || {}; o[ks[ks.length - 1]] = val; };
  document.addEventListener('input', e => { const t = e.target; if (!t.closest || !t.closest('#gvPanel') || !D || !t.dataset.gv || t.type === 'radio' || t.tagName === 'SELECT' || t.type === 'checkbox') return; setPath(t.dataset.gv, t.value); if (t.dataset.gv === 'cats' || t.dataset.gv === 'yes') return;
    // a new variable named like a known measurement (Hb, ALT, LVEF…): realistic mean, SD, range and decimals from the library
    if (t.dataset.gv === 'name' && D.mode === 'new' && window.EasyGen4) { const L = EasyGen4.lookup(t.value); clearTimeout(window.__gvN); window.__gvN = setTimeout(() => { if (!L || !D) return;
      if (L.mean !== undefined) { D.type = 'num'; D.dist = L.skew ? 'skew' : 'normal'; D.dec = L.dec; D.min = L.min; D.max = L.max; D.P = {}; keys().forEach(k => { D.P[k] = { mean: L.mean, sd: L.sd, lo: L.min, hi: L.max }; }); }
      else if (L.pct !== undefined) { D.type = 'yn'; D.P = {}; keys().forEach(k => { D.P[k] = { pct: L.pct }; }); }
      const f = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.gv === 'name'; draw(); if (f) { const x = document.querySelector('#gvPanel [data-gv="name"]'); if (x) { x.focus(); x.setSelectionRange(x.value.length, x.value.length); } }
      U.toast(L.mean !== undefined ? `${t.value}: ${L.mean} ± ${L.sd} ${L.unit || ''} from the library` : `${t.value}: ${L.pct}% yes from the library`); }, 700); return; }
    preview(); });
  document.addEventListener('change', e => { const t = e.target; if (!t.closest || !t.closest('#gvPanel') || !D) return;
    if (t.name === 'gvMode') { D.mode = t.value; if (D.mode === 'new') { const s = D.seed; D = blank(); D.seed = s; } else if (D.col) fromColumn(D.col); draw(); return; }
    const k = t.dataset.gv; if (!k) return; const v = t.type === 'checkbox' ? t.checked : t.value; setPath(k, v);
    if (k === 'col') { if (v) fromColumn(v); draw(); return; }
    if (['type', 'dist', 'byGroup', 'how', 'link', 'linkHow', 'diffAs', 'cats', 'yes', 'no'].includes(k)) { if (k === 'type' || k === 'byGroup') { D.P = {}; D.L = {}; } if (k === 'type' && D.mode === 'mod' && D.type !== D.type0) D.how = 'regen'; if (k === 'type' && D.type !== 'num') D.linkHow = 'corr'; draw(); return; } preview(); });
  document.addEventListener('click', e => { const b = e.target.closest('#gvPanel [data-gvact]'); if (!b || !D) return; const k = b.dataset.gvact;
    if (k === 'cancel') { D = null; $('#gvPanel').classList.remove('open'); return; }
    if (k === 'seed') { D.seed = Math.floor(Math.random() * 90000) + 10000; draw(); return; }
    if (k === 'd') { const ks = keys(), base = D.d1from || ks[0], p0 = par(base); ks.filter(x => x !== base).forEach((x, i) => { const p = par(x); p.sd = p0.sd; p.mean = round(+p0.mean + (+D.d1 || 0) * (+p0.sd || 1) * (i + 1), (+D.dec || 0) + 1); }); draw(); return; }
    if (k === 'ok') apply(); });
  function apply() { const st = S(), mod = D.mode === 'mod'; if (mod && !D.col) { alert('Choose the column to change.'); return; }
    if (D.type === 'cat' && catList().length < 2) { alert('Give at least two categories.'); return; }
    const vals = make(), name = mod ? D.col : (String(D.name || '').trim() || 'New_variable'), how = mod ? { regen: 'regenerated', adjust: 'adjusted to new targets', fill: 'blank cells filled' }[D.how] : 'generated';
    let made = name;
    U.editSheet(() => { if (mod) st.data.rows.forEach((r, i) => { r[name] = vals[i]; }); else made = U.addColumn(name, vals);
      const v = st.cfg.variables.find(x => x.cols && x.cols.length === 1 && x.cols[0].col === made);
      if (v && (D.type === 'cat' || D.type === 'yn')) { v.type = 'categorical'; const cs = catList(); v.levels = [...cs, ...(Array.isArray(v.levels) ? v.levels.filter(c => !cs.includes(c)) : [])]; }
      if (v && D.type === 'num') { v.type = 'numeric'; delete v.levels; } if (v && D.type === 'date') v.include = false;
      const sim = st.cfg.simulated; if (!sim || sim.partial) { st.cfg.simulated = { ...(sim || {}), partial: true, at: new Date().toLocaleString(), seed: D.seed, cols: [...new Set([...((sim && sim.cols) || []), made])] }; if (!sim) st.cfg.simStatement = true; }
      if (made === st.cfg.groupCol && U.refreshGroups) U.refreshGroups(); }, `${made}: values ${how} (seed ${D.seed})`);
    D = null; $('#gvPanel').classList.remove('open'); st.result = null;
    ['renderGrid', 'renderPrep', 'renderVariables', 'renderSimBanner'].forEach(f => { try { U[f] && U[f](); } catch (e) { /* not on screen */ } });
    U.toast(`${made}: values ${how} — marked as simulated · Undo restores the data`); }

  /* ---------- where it opens: step 1 (beside + Column, and each column's menu), step 2, ☰ More ---------- */
  const btn = (txt, title, fn) => { const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost small'; b.textContent = txt; b.title = title; b.onclick = fn; return b; };
  (function mount() { const ac = $('#gridAddCol'); if (ac) ac.after(btn('🎲 Generate / change a variable', 'A new column with generated values, or new values for an existing column (number, yes/no, categories, date; per group)', () => open()));
    const vt = $('#varsTbl'), wrap = vt && vt.closest('.tbl-wrap'); if (wrap) { const r = document.createElement('div'); r.className = 'row'; r.style.cssText = 'gap:6px;margin:0 0 6px'; r.appendChild(btn('🎲 Generate / change a variable', 'Add a variable with generated values, or regenerate / adjust an existing one', () => open())); wrap.before(r); }
    setTimeout(() => { const m = $('.ux-menu'); if (m) { const b = btn('🎲 Generate / change a variable', 'A new column with generated values, or new values for an existing one', () => { m.classList.remove('open'); open(); }); m.appendChild(b); } }, 700);
    // the column menu of the sheet (click a column's heading menu)
    new MutationObserver(() => { const cm = document.querySelector('.colmenu'); if (!cm || cm.querySelector('[data-gvcol]')) return; const h = (cm.querySelector('b') || {}).textContent; if (!h) return;
      const b = btn('🎲 Change with generation options…', 'Regenerate this column, adjust it to new targets, or fill its blanks', () => { cm.remove(); open(h); }); b.dataset.gvcol = h; b.style.marginTop = '6px'; cm.appendChild(b); }).observe(document.body, { childList: true }); })();
  window.EasyGenVar = { open, _make: () => make(), _D: () => D };
})();

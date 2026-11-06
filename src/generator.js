/* Prof MSE Easy Stat — phase 2, the data generator: fills the master sheet designed in phase 1 with simulated patients
   (for teaching, testing an analysis plan and checking a sample size). Expected values come from the design and can be
   set here for each group and visit; links between variables, missing data, dropouts, outliers and "messy" entries make it
   realistic; a power simulation repeats it many times. The sheet is marked as simulated inside the file. */
(() => {
  const U = window.EasyUI, B = window.EasyBuilder; if (!U || !B) return;
  const $ = s => document.querySelector(s), esc = U.esc, toast = U.toast;
  const ls = { get: (k, d) => { try { const v = localStorage.getItem('gen.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('gen.' + k, JSON.stringify(v)); } catch (e) { /* not kept */ } } };
  const defaults = () => ({ n: '', ratio: '', seed: 20261107, visitR: 0.6, missAll: 2, miss: {}, dropout: 5, outliers: 0, messy: false, messyPct: 3, start: '2026-01-01', span: 365, targets: {}, sds: {}, corr: [], power: { v: '', visit: '', reps: 200, alpha: 0.05 }, res: { view: 'half', only: '', comments: true, live: true } });
  let G = { ...defaults(), ...ls.get('settings', {}) }, last = null, powerOut = '', resKey = '', resOut = null, liveT = 0;
  G.res = { ...defaults().res, ...(G.res || {}) };
  const save = () => ls.set('settings', G);

  /* ---------- the engine ---------- */
  const D0 = () => B.design, arms = D => D.arms.filter(Boolean), K = D => arms(D).length >= 2 ? arms(D).length : 1;
  const visitKeys = (D, v) => { const vis = (v.visits || []).map(id => D.visits.find(x => x.id === id)).filter(Boolean); return vis.length ? vis.map(x => x.id) : ['once']; };
  const visitName = (D, key) => key === 'once' ? '' : (D.visits.find(x => x.id === key) || {}).name || key;
  const expect = v => v.expect && Object.keys(v.expect).length ? v.expect : B.expectOf(v.label, v.type, v.cats);
  // the target of a variable for a group at a visit: a mean (numbers) or the % of each category
  function target(v, g, key) {
    const t = ((G.targets[v.id] || {})[g] || {})[key], e = expect(v);
    if (v.type === 'num' || v.type === 'calc') return t !== undefined && t !== '' ? +t : e.mean !== '' && e.mean !== undefined ? +e.mean : (v.min !== '' && v.max !== '' ? (+v.min + +v.max) / 2 : 10);
    const pc = Array.isArray(t) ? t : (e.pct && e.pct.length === v.cats.length ? e.pct : v.cats.map(() => 100 / v.cats.length)); const s = pc.reduce((a, b) => a + (+b || 0), 0) || 1; return pc.map(x => (+x || 0) / s);
  }
  const sdOf = v => { const s = G.sds[v.id] !== undefined && G.sds[v.id] !== '' ? +G.sds[v.id] : +expect(v).sd; return isFinite(s) && s > 0 ? s : Math.max(0.5, Math.abs(target(v, 0, 'once')) * 0.2); };
  const decOf = (v, sd) => v.dec !== '' && v.dec !== undefined ? +v.dec : sd < 1 ? 2 : sd < 10 ? 1 : 0;
  const yesFirst = v => v.type === 'yn' || /^(yes|y|present|positive)$/i.test(String(v.cats[0] || ''));
  const normInv = p => jStat.normal.inv(Math.min(1 - 1e-12, Math.max(1e-12, p)), 0, 1);
  function generate(D, opt = {}) {
    const rnd = B.prng((+opt.seed || +G.seed || 1) >>> 0), norm = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
    const n = Math.max(2, +G.n || +D.n || 60), A = arms(D), k = K(D), rho = Math.min(0.95, Math.max(0, +G.visitR || 0));
    // groups: the randomisation list of the design, or the ratio (e.g. 1:1, 2:1), shuffled
    let grp = [];
    if (A.length >= 2) { if (D.rand && D.rand.on && !(D.rand.strata || []).length) grp = B.randomisation({ ...D, n })[0].list.map(a => A.indexOf(a));
      else { const r = String(G.ratio || A.map(() => 1).join(':')).split(/[:,/ ]+/).map(Number).map(x => x > 0 ? x : 1), tot = r.slice(0, A.length).reduce((a, b) => a + b, 0) || A.length;
        A.forEach((_, i) => { const m = Math.round(n * (r[i] || 1) / tot); for (let j = 0; j < m; j++) grp.push(i); }); while (grp.length < n) grp.push(grp.length % A.length); grp = grp.slice(0, n);
        for (let i = grp.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [grp[i], grp[j]] = [grp[j], grp[i]]; } } }
    else grp = Array(n).fill(0);
    const vars = D.vars, lat = vars.map(() => null), P = [];
    for (let i = 0; i < n; i++) {
      // a patient's level of each variable (the same patient across visits), linked between variables where asked
      const u = {}; vars.forEach(v => { u[v.id] = norm(); });
      // the items of a scale answer together (a shared level of the patient)
      if (vars.some(v => v.scale)) { const sh = {}; vars.forEach(v => { if (!v.scale) return; const s0 = sh[v.scale] ?? (sh[v.scale] = norm()); u[v.id] = Math.sqrt(0.6) * s0 + Math.sqrt(0.4) * u[v.id]; }); }
      (G.corr || []).forEach(c => { if (u[c.a] === undefined || u[c.b] === undefined) return; const r = Math.max(-0.95, Math.min(0.95, +c.r || 0)); u[c.b] = r * u[c.a] + Math.sqrt(1 - r * r) * u[c.b]; });
      const g = grp[i], vals = {};
      vars.forEach(v => { if (!['num', 'yn', 'cat'].includes(v.type)) return; const o = vals[v.id] = {};
        const keys = visitKeys(D, v); keys.forEach(key => { const z = keys.length === 1 ? u[v.id] : Math.sqrt(rho) * u[v.id] + Math.sqrt(1 - rho) * norm(); // one measurement: the patient's own level
          if (v.type === 'num') { const m = target(v, g, key), sd = sdOf(v), e = expect(v); let x;
            if (e.dist === 'skewed' && m > 0) { const s2 = Math.log(1 + sd * sd / (m * m)); x = Math.exp(Math.log(m) - s2 / 2 + Math.sqrt(s2) * z); } else x = m + sd * z;
            if (v.min !== '' && isFinite(+v.min)) x = Math.max(+v.min, x); if (v.max !== '' && isFinite(+v.max)) x = Math.min(+v.max, x);
            const dd = decOf(v, sd); o[key] = +x.toFixed(dd); }
          else { const p = target(v, g, key), zz = yesFirst(v) ? -z : z; let c = 0, cum = 0; for (; c < p.length - 1; c++) { cum += p[c]; if (zz <= normInv(cum)) break; } o[key] = D.conv.catAs === 'codes' ? c + 1 : v.cats[c]; } }); });
      // dates: one after the other (days after the previous date of the sheet), from the day of enrolment
      let prev = Date.parse(G.start || '2026-01-01') + Math.floor(rnd() * (+G.span || 365)) * 864e5;
      // in the clinical order of events, whatever their order in the sheet: birth, enrolment / admission, surgery, discharge, follow-up, death
      const rank = v => { const l = v.label.toLowerCase(); return /birth/.test(l) ? 0 : /enrol|recruit|consent/.test(l) ? 1 : /admission|admit/.test(l) ? 2 : /surgery|operation|procedure|injection|intervention/.test(l) ? 3 : /discharge/.test(l) ? 5 : /follow|visit/.test(l) ? 6 : /death|died/.test(l) ? 8 : 4; };
      vars.filter(v => v.type === 'date').map((v, i) => [v, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]).forEach((v, di) => { const e = expect(v), gap = di === 0 && /enrol|admission|birth/i.test(v.label) ? 0 : Math.max(0, Math.round((+e.mean || 0) + (+e.sd || 0) * norm()));
        let t = prev + gap * 864e5; if (/birth/i.test(v.label)) t = prev - Math.round((target({ ...v, type: 'num', expect: { mean: 50 } }, 0, 'once') + 12 * norm()) * 365.25) * 864e5; else prev = t;
        vals[v.id] = { once: new Date(t).toISOString().slice(0, 10) }; });
      // skip logic: not asked (empty) unless the other variable has the category
      vars.forEach(v => { if (!v.when || !v.when.v || !vals[v.id]) return; const pv = D.vars.find(x => x.id === v.when.v); if (!pv) return; const pval = vals[pv.id] || {}, want = D.conv.catAs === 'codes' ? pv.cats.indexOf(v.when.cat) + 1 : v.when.cat;
        Object.keys(vals[v.id]).forEach(key => { const x = pval[key] ?? pval.once ?? pval[D.visits[0].id]; if (x !== want) vals[v.id][key] = null; }); });
      P.push({ id: `${D.idPrefix || ''}${String(i + 1).padStart(+D.idDigits || 3, '0')}`, g, group: A.length >= 2 ? A[g] : null, vals });
    }
    // calculated columns (also written as Excel formulas)
    const num = x => (typeof x === 'number' && isFinite(x) ? x : NaN), days = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5;
    P.forEach(p => vars.filter(v => v.type === 'calc' && v.formula).forEach(v => { const f = v.formula, o = p.vals[v.id] = {}, at = (id, key) => { const x = p.vals[id] || {}; return x[key] ?? x.once ?? x[D.visits[0].id]; };
      visitKeys(D, v).forEach(key => { let r = null;
        if (f.kind === 'bmi') { const w = num(at(f.a, key)), h = num(at(f.b, key)); if (w > 0 && h > 0) r = +(w / (h / 100) ** 2).toFixed(1); }
        if (f.kind === 'days') { const a = at(f.a, key), b = at(f.b, key); if (a && b) r = Math.round(days(a, b)); }
        if (f.kind === 'age') { const a = at(f.a, key), b = f.b ? at(f.b, key) : new Date().toISOString().slice(0, 10); if (a && b) r = Math.floor(days(a, b) / 365.25); }
        if (f.kind === 'change') { const x = p.vals[f.a] || {}, ks = Object.keys(x); if (ks.length > 1) { const a = num(x[ks[0]]), b = num(x[ks[ks.length - 1]]); if (isFinite(a) && isFinite(b)) r = +(b - a).toFixed(2); } }
        if ((f.kind === 'sum' || f.kind === 'mean') && (f.list || []).length) { const xs = f.list.map(id => num(at(id, key))); if (xs.every(isFinite)) { const s = xs.reduce((a, b) => a + b, 0); r = +(f.kind === 'sum' ? s : s / xs.length).toFixed(2); } }
        o[key] = r; }); }));
    // rules between columns (e.g. discharge ≥ admission) are kept
    P.forEach(p => (D.checks || []).forEach(ch => { const a = p.vals[ch.a], b = p.vals[ch.b]; if (!a || !b) return; Object.keys(a).forEach(key => { const bv = b[key] ?? b.once; let av = a[key]; if (av == null || bv == null) return;
      const isD = typeof av === 'string', x = isD ? Date.parse(av) : av, y = isD ? Date.parse(bv) : bv, ok = { '>': x > y, '>=': x >= y, '<': x < y, '<=': x <= y, '=': x === y }[ch.op]; if (ok !== false) return;
      const step = isD ? 864e5 : 1, nv = ch.op === '>' ? y + step : ch.op === '<' ? y - step : y; a[key] = isD ? new Date(nv).toISOString().slice(0, 10) : nv; }); }));
    // missing values, dropouts (the later visits of a patient are missing), outliers
    const VK = D.visits.map(x => x.id);
    P.forEach(p => { const drop = D.visits.length > 1 && rnd() * 100 < (+G.dropout || 0) ? 1 + Math.floor(rnd() * (D.visits.length - 1)) : 0;
      vars.forEach(v => { const o = p.vals[v.id]; if (!o) return; Object.keys(o).forEach(key => { const vi = VK.indexOf(key);
        if (drop && vi >= drop) { o[key] = null; return; }
        const pm = G.miss[v.id] !== undefined && G.miss[v.id] !== '' ? +G.miss[v.id] : +G.missAll || 0; if (v.type !== 'calc' && !v.required && rnd() * 100 < pm) o[key] = null;
        if (v.type === 'num' && o[key] != null && rnd() * 100 < (+G.outliers || 0)) { const m = target(v, p.g, key), sd = sdOf(v); o[key] = +(m + (rnd() < 0.5 && !(+v.min >= 0) ? -4 : 4) * sd).toFixed(decOf(v, sd)); } }); }); });
    // messy entries, for practice in cleaning data: units in cells, typing errors, 999 codes, mixed spelling of categories, duplicated IDs
    if (G.messy) { const pm = (+G.messyPct || 3) / 100;
      P.forEach(p => vars.forEach(v => { const o = p.vals[v.id]; if (!o || v.type === 'calc') return; Object.keys(o).forEach(key => { const x = o[key]; if (x == null || rnd() > pm) return; const w = rnd();
        if (v.type === 'num') o[key] = w < 0.35 && v.unit ? `${x} ${v.unit}` : w < 0.6 ? +(x * 10).toFixed(2) : w < 0.8 && D.conv.missing !== '999' ? 999 : String(x).replace('.', ',');
        else if (typeof x === 'string') o[key] = w < 0.3 ? x.toLowerCase() : w < 0.55 ? x.toUpperCase() : w < 0.8 ? x.charAt(0) : ` ${x} `; }); }));
      const dup = Math.max(1, Math.round(P.length * 0.02)); for (let d = 0; d < dup; d++) { const src = P[Math.floor(rnd() * P.length)]; P.splice(Math.floor(rnd() * P.length), 0, JSON.parse(JSON.stringify(src))); } }
    return P;
  }
  // what was asked for, and what came out (per variable, group and visit)
  function targetsList(D) { const out = []; D.vars.filter(v => ['num', 'yn', 'cat'].includes(v.type)).forEach(v => visitKeys(D, v).forEach(key => { for (let g = 0; g < K(D); g++) { const t = target(v, g, key);
    out.push({ varId: v.id, label: v.label, unit: v.unit, kind: v.type === 'num' ? 'mean' : 'pct', cat: v.type === 'num' ? '' : String(v.cats[0]), visit: key, visitName: visitName(D, key), g, group: arms(D)[g] || 'All patients', target: v.type === 'num' ? +(+t).toFixed(3) : +(t[0] * 100).toFixed(1), sd: v.type === 'num' ? sdOf(v) : null }); } })); return out; }
  function observed(D, P, t) { const v = D.vars.find(x => x.id === t.varId), xs = P.filter(p => p.g === t.g).map(p => (p.vals[t.varId] || {})[t.visit]).filter(x => x != null && x !== '');
    if (t.kind === 'mean') { const nn = xs.map(Number).filter(isFinite); if (!nn.length) return { n: 0 }; const m = nn.reduce((a, b) => a + b, 0) / nn.length, sd = Math.sqrt(nn.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, nn.length - 1)); return { n: nn.length, m, sd }; }
    const first = D.conv.catAs === 'codes' ? 1 : v.cats[0]; return { n: xs.length, m: xs.length ? 100 * xs.filter(x => String(x).trim().toLowerCase() === String(first).toLowerCase()).length / xs.length : NaN }; }

  /* ---------- power: the same study simulated many times, the main outcome tested each time ---------- */
  function pTest(D, v, key, P) {
    const k = K(D), groups = [...Array(k)].map((_, g) => P.filter(p => p.g === g).map(p => (p.vals[v.id] || {})[key]).filter(x => x != null && x !== ''));
    if (v.type === 'num') { const gs = groups.map(x => x.map(Number).filter(isFinite));
      if (k === 1) { const base = P.map(p => [(p.vals[v.id] || {})[D.visits[0].id] ?? (p.vals[v.id] || {}).once, (p.vals[v.id] || {})[key]]).filter(([a, b]) => isFinite(+a) && isFinite(+b) && a !== null && b !== null).map(([a, b]) => +b - +a);
        if (base.length < 3) return NaN; const m = base.reduce((a, b) => a + b, 0) / base.length, sd = Math.sqrt(base.reduce((a, b) => a + (b - m) ** 2, 0) / (base.length - 1)); if (!(sd > 0)) return NaN; const t = m / (sd / Math.sqrt(base.length)); return 2 * (1 - jStat.studentt.cdf(Math.abs(t), base.length - 1)); }
      const st = gs.map(x => { const m = x.reduce((a, b) => a + b, 0) / x.length; return { n: x.length, m, v: x.reduce((a, b) => a + (b - m) ** 2, 0) / (x.length - 1) }; }); if (st.some(s => s.n < 2)) return NaN;
      if (k === 2) { const se = Math.sqrt(st[0].v / st[0].n + st[1].v / st[1].n), t = (st[0].m - st[1].m) / se, df = se ** 4 / ((st[0].v / st[0].n) ** 2 / (st[0].n - 1) + (st[1].v / st[1].n) ** 2 / (st[1].n - 1)); return 2 * (1 - jStat.studentt.cdf(Math.abs(t), df)); }
      const N = st.reduce((a, s) => a + s.n, 0), gm = st.reduce((a, s) => a + s.n * s.m, 0) / N, ssb = st.reduce((a, s) => a + s.n * (s.m - gm) ** 2, 0), ssw = st.reduce((a, s) => a + (s.n - 1) * s.v, 0), F = (ssb / (k - 1)) / (ssw / (N - k)); return 1 - jStat.centralF.cdf(F, k - 1, N - k); }
    const cats = D.conv.catAs === 'codes' ? v.cats.map((_, i) => i + 1) : v.cats, tab = groups.map(x => cats.map(c => x.filter(y => String(y) === String(c)).length)), rs = tab.map(r => r.reduce((a, b) => a + b, 0)), cs = cats.map((_, j) => tab.reduce((a, r) => a + r[j], 0)), N = rs.reduce((a, b) => a + b, 0);
    if (k === 1 || !N) return NaN; let chi = 0, df = 0; const usedC = cs.filter(c => c > 0).length; tab.forEach((r, i) => r.forEach((o, j) => { const e = rs[i] * cs[j] / N; if (e > 0) chi += (o - e) ** 2 / e; })); df = (k - 1) * (usedC - 1); return df > 0 ? 1 - jStat.chisquare.cdf(chi, df) : NaN;
  }
  function power(D) { const v = D.vars.find(x => x.id === G.power.v); if (!v) return 'Choose the main outcome first.'; const key = G.power.visit || visitKeys(D, v).slice(-1)[0], reps = Math.min(2000, Math.max(20, +G.power.reps || 200)), alpha = +G.power.alpha || 0.05;
    const keep = { messy: G.messy, outliers: G.outliers }; G.messy = false; G.outliers = 0; let hit = 0, done = 0;
    try { for (let r = 0; r < reps; r++) { const p = pTest(D, v, key, generate(D, { seed: (+G.seed || 1) + 7919 * (r + 1) })); if (isFinite(p)) { done++; if (p < alpha) hit++; } } } finally { Object.assign(G, keep); }
    if (!done) return 'The test could not be run (check the targets and the groups).'; const pw = hit / done, z = 1.96, den = 1 + z * z / done, c = (pw + z * z / (2 * done)) / den, h = z * Math.sqrt(pw * (1 - pw) / done + z * z / (4 * done * done)) / den;
    const nPer = arms(D).length >= 2 ? `${Math.round((+G.n || +D.n || 60) / K(D))} per group` : `${+G.n || +D.n || 60} patients`;
    return `<b>Power ≈ ${(100 * pw).toFixed(0)}%</b> (95% CI ${(100 * (c - h)).toFixed(0)}–${(100 * (c + h)).toFixed(0)}%) to find a difference in ${esc(v.label)}${key !== 'once' ? ` at ${esc(visitName(D, key))}` : ''} with ${nPer}, at P < ${alpha} — ${done} simulated studies (${v.type === 'num' ? K(D) === 2 ? "Welch's t-test" : K(D) > 2 ? 'one-way ANOVA' : 'paired t-test against the first visit' : 'Chi-square test'}).`; }

  /* ---------- the workspace ---------- */
  const opt = (list, cur) => list.map(([k, l]) => `<option value="${esc(k)}" ${String(cur) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('');
  function render() {
    const w = $('#genWrap'); if (!w) return; const D = D0(), A = arms(D), k = K(D), gl = A.length >= 2 ? A : ['All patients'];
    if (!w.dataset.wired) { w.dataset.wired = 1; w.addEventListener('input', onInput); w.addEventListener('click', onClick); }
    const vs = D.vars.filter(v => ['num', 'yn', 'cat'].includes(v.type)), dates = D.vars.filter(v => v.type === 'date'), calcs = D.vars.filter(v => v.type === 'calc');
    const block = v => { const keys = visitKeys(D, v), e = expect(v);
      const cellIn = (g, key) => { const t = ((G.targets[v.id] || {})[g] || {})[key];
        if (v.type === 'num') return `<input type="number" step="any" data-gt="${v.id}|${g}|${key}" value="${esc(t ?? '')}" placeholder="${esc(e.mean ?? '')}" style="width:80px">`;
        if (v.type === 'yn' || v.cats.length === 2) return `<input type="number" min="0" max="100" step="any" data-gtp="${v.id}|${g}|${key}" value="${esc(Array.isArray(t) ? +(t[0]).toFixed(1) : '')}" placeholder="${esc(((e.pct || [])[0]) ?? 50)}" style="width:70px" title="% ${esc(v.cats[0])}">`;
        return `<input type="text" data-gtc="${v.id}|${g}|${key}" value="${esc(Array.isArray(t) ? t.join(', ') : '')}" placeholder="${esc((e.pct || []).join(', '))}" style="width:130px" title="% of ${esc(v.cats.join(', '))}">`; };
      return `<tr><td><b>${esc(v.label)}</b>${v.unit ? ` <span class="legend-note">(${esc(v.unit)})</span>` : ''}<div class="legend-note">${v.type === 'num' ? `SD <input type="number" step="any" min="0" data-gsd="${v.id}" value="${esc(G.sds[v.id] ?? '')}" placeholder="${esc(e.sd ?? '')}" style="width:64px"> · ${e.dist === 'skewed' ? 'skewed' : 'normal'}` : v.type === 'yn' || v.cats.length === 2 ? `% ${esc(v.cats[0])}` : `% of ${esc(v.cats.join(' / '))}`} · missing % <input type="number" min="0" max="100" step="any" data-gmiss="${v.id}" value="${esc(G.miss[v.id] ?? '')}" placeholder="${esc(G.missAll)}" style="width:54px"></div></td>
        ${gl.map((_, g) => `<td>${keys.map(key => `<div class="gen-cell">${keys.length > 1 || key !== 'once' ? `<span class="legend-note">${esc(visitName(D, key))}</span>` : ''}${cellIn(g, key)}</div>`).join('')}</td>`).join('')}</tr>`; };
    const res = last ? targetsList(D).map(t => ({ ...t, o: observed(D, last, t) })) : [];
    w.innerHTML = `<div class="mb-head"><b>🎲 Generate the data</b><span class="legend-note">${esc(D.title || 'Untitled study')} · ${D.vars.length} variables · simulated patients for teaching, testing the analysis and checking the sample size</span><span class="spacer"></span>
        <button class="btn ghost small" type="button" data-gtab="build">‹ Back to the design</button><button class="btn primary small" type="button" id="genSend">📊 Analyse these data ›</button></div>
      <div class="mb-body" style="border-radius:12px;margin-top:10px">
      <div class="grid g4">
        <div><label class="f">Number of patients</label><input type="number" min="2" max="20000" data-g="n" value="${esc(G.n)}" placeholder="${esc(D.n)}"></div>
        ${A.length >= 2 ? (D.rand && D.rand.on && !(D.rand.strata || []).length ? `<div><label class="f">Groups</label><div class="legend-note" style="margin-top:8px">From the randomisation list of the design</div></div>` : `<div><label class="f">Group sizes (ratio)</label><input type="text" data-g="ratio" value="${esc(G.ratio)}" placeholder="${A.map(() => 1).join(':')}"></div>`) : '<div><label class="f">Groups</label><div class="legend-note" style="margin-top:8px">One group</div></div>'}
        <div><label class="f">Seed (same seed, same data)</label><div class="row" style="gap:4px"><input type="number" data-g="seed" value="${esc(G.seed)}"><button class="btn ghost small" type="button" id="genSeed" title="A new seed">🎲</button></div></div>
        <div><label class="f">Correlation of a patient's visits</label><input type="number" min="0" max="0.95" step="0.05" data-g="visitR" value="${esc(G.visitR)}"></div></div>
      <h3>Expected values for each group${D.visits.length > 1 ? ' and visit' : ''}</h3>
      <p class="legend-note">Numbers: the mean (SD shared by the groups); yes/no: the % ${esc('Yes')}; categories: the % of each, separated by commas. Empty cells use the expected values of the design (shown in grey) — type different values to make a difference between the groups or a change over the visits.</p>
      <div class="tbl-wrap" style="max-height:460px"><table class="t gen-tbl"><thead><tr><th>Variable</th>${gl.map(g => `<th>${esc(g)}</th>`).join('')}</tr></thead><tbody>${vs.map(block).join('') || `<tr><td colspan="${gl.length + 1}" class="legend-note">No variables — design the sheet first (phase 1).</td></tr>`}</tbody></table></div>
      ${dates.length || calcs.length ? `<p class="legend-note">${dates.length ? `Dates (${esc(dates.map(v => v.label).join(', '))}) follow each other from the day of enrolment (study start <input type="date" data-g="start" value="${esc(G.start)}"> over <input type="number" min="1" data-g="span" value="${esc(G.span)}" style="width:70px"> days); the days between them are set in the design. ` : ''}${calcs.length ? `Calculated columns (${esc(calcs.map(v => v.label).join(', '))}) are computed.` : ''}</p>` : ''}
      <h3>Links between variables</h3><p class="legend-note">A correlation between two variables (e.g. age and systolic BP 0.4; diabetes with HbA1c 0.6: a higher value goes with more “Yes”).</p>
      ${(G.corr || []).map((c, i) => `<div class="row" style="gap:6px;margin:4px 0"><select data-gc="${i}|a" style="width:auto">${opt([['', '—'], ...vs.map(v => [v.id, v.label])], c.a)}</select><span>with</span><select data-gc="${i}|b" style="width:auto">${opt([['', '—'], ...vs.map(v => [v.id, v.label])], c.b)}</select><span>r =</span><input type="number" min="-0.95" max="0.95" step="0.05" data-gc="${i}|r" value="${esc(c.r)}" style="width:80px"><button class="btn ghost small" type="button" data-gcdel="${i}">✕</button></div>`).join('')}
      <button class="btn ghost small" type="button" id="genCorrAdd">+ Link</button>
      <h3>Realism</h3><div class="grid g4">
        <div><label class="f">Missing values (% of every variable)</label><input type="number" min="0" max="90" step="any" data-g="missAll" value="${esc(G.missAll)}"></div>
        <div><label class="f">Patients who drop out (%)</label><input type="number" min="0" max="90" step="any" data-g="dropout" value="${esc(G.dropout)}" ${D.visits.length > 1 ? '' : 'disabled'}></div>
        <div><label class="f">Outliers (% of the numbers)</label><input type="number" min="0" max="20" step="any" data-g="outliers" value="${esc(G.outliers)}"></div>
        <div><label class="check" style="margin-top:22px"><input type="checkbox" data-g="messy" ${G.messy ? 'checked' : ''}><span><b>Messy entries</b> (to practise cleaning) — <input type="number" min="0.5" max="30" step="0.5" data-g="messyPct" value="${esc(G.messyPct)}" style="width:56px">% of the cells: units typed in, ×10 typing errors, 999, male / MALE / M, duplicated IDs</span></label></div></div>
      <div class="row" style="gap:8px;margin-top:14px"><button class="btn primary" type="button" id="genGo">🎲 Generate</button><button class="btn ghost" type="button" id="genXlsx" ${last ? '' : 'disabled'}>⬇ Simulated master sheet (.xlsx)</button><button class="btn ghost" type="button" id="genSend2" ${last ? '' : 'disabled'}>📊 Analyse these data ›</button><span class="legend-note" id="genStatus">${last ? `${last.length} rows generated (seed ${esc(G.seed)})` : 'Not generated yet'}</span></div>
      <div id="genOut">${outHtml(D)}</div>
      <h3>Power of the planned study</h3><p class="legend-note">The study is simulated many times with these settings, and the main outcome tested each time: the share of significant results is the power.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><div><label class="f">Main outcome</label><select data-gp="v" style="width:auto">${opt([['', '—'], ...vs.map(v => [v.id, v.label])], G.power.v)}</select></div>
        ${(() => { const v = D.vars.find(x => x.id === G.power.v); return v && visitKeys(D, v).length > 1 ? `<div><label class="f">At</label><select data-gp="visit" style="width:auto">${opt(visitKeys(D, v).map(k2 => [k2, visitName(D, k2)]), G.power.visit || visitKeys(D, v).slice(-1)[0])}</select></div>` : ''; })()}
        <div><label class="f">Simulated studies</label><input type="number" min="20" max="2000" data-gp="reps" value="${esc(G.power.reps)}" style="width:90px"></div><div><label class="f">Significance level</label><input type="number" min="0.001" max="0.2" step="0.005" data-gp="alpha" value="${esc(G.power.alpha)}" style="width:90px"></div>
        <button class="btn ghost" type="button" id="genPower">Run</button></div><div class="legend-note" id="genPowerOut" style="margin-top:6px;font-size:14px">${powerOut}</div>
      </div>`;
    analyseOut(D);
  }
  // below the settings: the results of each variable (as in step 10 of Analyse), the check against the targets and the first rows
  function outHtml(D) {
    if (!last) return '';
    const res = targetsList(D).map(t => ({ ...t, o: observed(D, last, t) })), R0 = G.res;
    const views = [['half', 'Summary and data of each group (as the Word file)'], ['default', 'Figure and all the tables'], ['stacked', 'Figure above the tables'], ['tables', 'Tables only'], ['twocol', 'Two columns']];
    return `<h3>Results of each variable <span class="legend-note">— analysed as in 📊 Analyse, step 10</span></h3>
      <div class="row gen-res-bar" style="gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div><label class="f">Variable</label><select data-gr="only" style="width:auto"><option value="">All variables</option>${(resOut ? resOut.allItems || resOut.items : []).map(it => `<option value="${esc(it.id)}" ${R0.only === it.id ? 'selected' : ''}>${esc(it.label)}</option>`).join('')}</select></div>
        <div><label class="f">View</label><select data-gr="view" style="width:auto">${views.map(([k, l]) => `<option value="${k}" ${R0.view === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
        <label class="check" style="margin:0 0 6px"><input type="checkbox" data-gr="comments" ${R0.comments ? 'checked' : ''}><span>Report comment</span></label>
        <label class="check" style="margin:0 0 6px" title="Generate again, and redraw the results, as the expected values are typed"><input type="checkbox" data-gr="live" ${R0.live ? 'checked' : ''}><span>Live: follow the expected values</span></label></div>
      <div id="genRes" class="gen-res">${resOut && resOut.key === resKeyOf(D) ? resHtml(D, res) : '<p class="legend-note">Analysing the simulated data…</p>'}</div>
      <details class="report-sec" style="margin-top:10px"><summary><b>Check: what came out against what was asked</b> <span class="legend-note">— every variable, group and visit</span></summary><div class="tbl-wrap" style="max-height:380px"><table class="t gen-chk"><thead><tr><th>Variable</th><th>Visit</th><th>Group</th><th>Asked</th><th>Generated</th><th>n</th></tr></thead><tbody>${res.map(r => { const off = r.kind === 'mean' ? Math.abs(r.o.m - r.target) > (r.sd || 1) * 0.6 : Math.abs(r.o.m - r.target) > 15;
          return `<tr class="${off ? 'gen-off' : ''}"><td>${esc(r.label)}</td><td>${esc(r.visitName)}</td><td>${esc(r.group)}</td><td>${r.kind === 'mean' ? esc(+r.target.toFixed(2)) + (r.sd ? ` ± ${esc(+(+r.sd).toFixed(2))}` : '') : `${esc(r.target)}% ${esc(r.cat)}`}</td><td>${r.o.n ? (r.kind === 'mean' ? `${r.o.m.toFixed(2)} ± ${(r.o.sd || 0).toFixed(2)}` : `${r.o.m.toFixed(1)}%`) : '—'}</td><td>${r.o.n || 0}</td></tr>`; }).join('')}</tbody></table></div>
        <p class="legend-note">Small samples differ from the targets by chance; rows far from the target are shaded.</p>
        </details><h3>First rows</h3>${preview(D)}`;
  }
  // what the generator was asked for this variable, beside its results
  function askedLine(D, res, label) {
    const rs = res.filter(r => label === r.label || label.startsWith(r.label + ' (') || label.startsWith(r.label + ' —'));
    if (!rs.length) return '';
    const byVisit = [...new Set(rs.map(r => r.visitName))];
    return `<div class="gen-asked"><b>🎲 Asked:</b> ${byVisit.map(vn => `${vn ? `<span class="legend-note">${esc(vn)}:</span> ` : ''}${rs.filter(r => r.visitName === vn).map(r => `${esc(r.group)} ${r.kind === 'mean' ? `${esc(+(+r.target).toFixed(2))}${r.sd ? ` ± ${esc(+(+r.sd).toFixed(2))}` : ''}` : `${esc(r.target)}% ${esc(r.cat)}`}`).join(' · ')}`).join(' &nbsp;|&nbsp; ')}</div>`;
  }
  function resHtml(D, res) {
    const o = resOut; if (!o) return ''; if (!o.items.length) return '<p class="legend-note">No variables to analyse.</p>';
    const ov = o.items.length > 1 ? `<div class="report-sec"><h3 style="margin:0 0 6px">Overview <span class="legend-note">— ${o.n} patients, ${o.items.filter(it => it.sig).length} of ${o.items.length} variables significant</span></h3><div style="overflow-x:auto"><table class="t xp xp-ov"><thead><tr><th>Variable</th><th>Type</th><th>Test</th><th>P value</th><th>Significant</th></tr></thead><tbody>${o.items.map(it => `<tr data-grgo="${esc(it.id)}" title="Show this variable"><td class="b">${esc(it.label)}</td><td>${esc(it.kind)}</td><td>${esc(it.test || '—')}</td><td>${esc(it.pTxt || '—')}</td><td class="${it.sig ? 'sig' : ''}">${it.sig ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table></div></div>` : '';
    return ov + o.parts.map((h, k) => { const it = o.items[k]; return h.replace(/(<div data-xpitem="[^"]*" class="report-sec[^"]*"[^>]*>)/, `$1${askedLine(D, res, it.label).replace(/\$/g, '$$$$')}`); }).join('');
  }
  const resKeyOf = D => JSON.stringify([last && last.length, G.seed, G.res.view, G.res.only, G.res.comments, resStamp]);
  let resStamp = 0;
  // the simulated master sheet analysed by the app itself (its own sandbox: the data in Analyse are not changed)
  async function analyseOut(D) {
    if (!last || !U.simResults || typeof XLSX === 'undefined') return; const key = resKeyOf(D); if (resOut && resOut.key === key) return;
    try { const buf = await B.buildWorkbook(D, fill(D)).arrayBuffer(), wb = XLSX.read(buf, { type: 'array' });
      const r = U.simResults(wb, { view: G.res.view, only: G.res.only, comments: G.res.comments });
      // the list of variables always holds all of them
      r.all = G.res.only ? (resOut && resOut.all) || U.simResults(wb, { view: 'tables', figs: false, comments: false }).items : r.items;
      resOut = { ...r, key, items: r.items, allItems: r.all };
    } catch (err) { console.error(err); resOut = { key, items: [], parts: [], n: 0, err: err.message }; }
    if (key !== resKeyOf(D)) return;
    const box = $('#genRes'); if (box) box.innerHTML = resOut.err ? `<p style="color:var(--bad)">Could not analyse: ${esc(resOut.err)}</p>` : resHtml(D, targetsList(D).map(t => ({ ...t, o: observed(D, last, t) })));
    const sel = document.querySelector('[data-gr="only"]'); if (sel) sel.innerHTML = `<option value="">All variables</option>${(resOut.allItems || []).map(it => `<option value="${esc(it.id)}" ${G.res.only === it.id ? 'selected' : ''}>${esc(it.label)}</option>`).join('')}`;
  }
  function redrawOut(D) { const box = $('#genOut'); if (box) box.innerHTML = outHtml(D); const st = $('#genStatus'); if (st) st.textContent = last ? `${last.length} rows generated (seed ${G.seed})` : 'Not generated yet';
    ['genXlsx', 'genSend2'].forEach(id => { const b = $('#' + id); if (b) b.disabled = !last; }); analyseOut(D); }
  // live: a changed expected value generates again (same seed) and redraws the results
  function live(D) { if (!G.res.live || !last) return; clearTimeout(liveT); liveT = setTimeout(() => { try { last = generate(D); resStamp++; redrawOut(D); } catch (err) { console.error(err); } }, 500); }
  function preview(D) { const cols = B.columns(D).filter(c => D.layout !== 'long'), A = arms(D);
    return `<div class="tbl-wrap" style="max-height:260px"><table class="t mb-prev"><thead><tr><th>ID</th>${A.length >= 2 ? '<th>Group</th>' : ''}${cols.map(c => `<th>${esc(c.col)}</th>`).join('')}</tr></thead><tbody>${last.slice(0, 8).map(p => `<tr><td>${esc(p.id)}</td>${A.length >= 2 ? `<td>${esc(p.group)}</td>` : ''}${cols.map(c => { const o = p.vals[c.v.id] || {}, x = c.visit ? (o[c.visit.id] ?? (c.visit.id === D.visits[0].id ? o.once : null)) : (o.once ?? o[D.visits[0].id]); return `<td>${esc(x ?? '')}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`; }
  function fill(D) { return { patients: last.map(p => ({ id: p.id, group: p.group, vals: p.vals })), simulated: { at: new Date().toISOString().slice(0, 10), seed: G.seed, n: last.length }, targets: targetsList(D).map(t => ({ ...t, cols: B.columns(D).filter(c => c.v.id === t.varId && (t.visit === 'once' ? !c.visit || c.visit.id === D.visits[0].id : c.visit && c.visit.id === t.visit)).map(c => c.col) })) }; }
  const fileName = D => `Simulated - ${B.fileBase()} - master sheet.xlsx`;
  async function send(D) { if (!last) { last = generate(D); } const blob = B.buildWorkbook(D, fill(D)), f = new File([blob], fileName(D)); B.setPhase('analyse'); U.go(1); await U.loadFile(f); }
  function onClick(e) {
    const go0 = e.target.closest('[data-grgo]'); if (go0) { G.res.only = go0.dataset.grgo; save(); return redrawOut(D0()); }
    const b = e.target.closest('button'); if (!b) return; const D = D0();
    if (b.dataset.gtab === 'build') return B.setPhase('build');
    if (b.id === 'genSeed') { G.seed = Math.floor(Math.random() * 1e9); save(); last = null; return render(); }
    if (b.id === 'genGo') { try { resStamp++; last = generate(D); toast(`${last.length} simulated patients`); } catch (err) { console.error(err); toast('Could not generate: ' + err.message); } return render(); }
    if (b.id === 'genXlsx' && last) { U.saveUrl(URL.createObjectURL(B.buildWorkbook(D, fill(D))), fileName(D)); toast('Simulated master sheet saved'); return; }
    if (b.id === 'genSend' || b.id === 'genSend2') { send(D); return; }
    if (b.id === 'genCorrAdd') { (G.corr = G.corr || []).push({ a: '', b: '', r: 0.4 }); save(); return render(); }
    if (b.dataset.gcdel !== undefined) { G.corr.splice(+b.dataset.gcdel, 1); save(); return render(); }
    if (b.id === 'genPower') { const out = $('#genPowerOut'); out.textContent = 'Simulating…'; setTimeout(() => { try { powerOut = power(D); } catch (err) { console.error(err); powerOut = 'Failed: ' + esc(err.message); } out.innerHTML = powerOut; }, 30); return; }
  }
  function onInput(e) {
    const t = e.target, d = t.dataset, val = t.type === 'checkbox' ? t.checked : t.value, set = (path, x) => { const [id, g, key] = path.split('|'); ((G.targets[id] = G.targets[id] || {})[g] = G.targets[id][g] || {})[key] = x; };
    if (d.gr) { G.res[d.gr] = val; save(); if (d.gr !== 'live') redrawOut(D0()); return; }
    if (d.g) { G[d.g] = val; save(); if (G.res.live && last && d.g !== 'seed') { if (t.type === 'checkbox') render(); live(D0()); return; } last = null; if (t.type === 'checkbox') render(); else redrawOut(D0()); return; }
    if (d.gt) { set(d.gt, val === '' ? '' : +val); save(); return live(D0()); }
    if (d.gtp) { if (val === '') set(d.gtp, ''); else { const p = Math.max(0, Math.min(100, +val)); set(d.gtp, [p, 100 - p]); } save(); return live(D0()); }
    if (d.gtc) { const ps = String(val).split(/[ ,;/]+/).map(Number).filter(x => isFinite(x)); set(d.gtc, ps.length ? ps : ''); save(); return live(D0()); }
    if (d.gsd) { G.sds[d.gsd] = val; save(); return live(D0()); }
    if (d.gmiss) { G.miss[d.gmiss] = val; save(); return live(D0()); }
    if (d.gc) { const [i, k] = d.gc.split('|'); G.corr[+i][k] = k === 'r' ? +val : val; save(); return live(D0()); }
    if (d.gp) { G.power[d.gp] = val; save(); if (t.tagName === 'SELECT') render(); return; }
  }
  window.EasyGen = { render, generate: (d, o) => generate(d || D0(), o), power: d => power(d || D0()), targetsList, observed, get settings() { return G; }, set settings(x) { G = { ...defaults(), ...x }; save(); }, get last() { return last; }, get results() { return resOut; } };
  if (document.documentElement.classList.contains('ph-generate')) render();
})();

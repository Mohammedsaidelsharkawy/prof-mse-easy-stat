/* Prof MSE Easy Stat — phase 2, the data generator: fills the master sheet designed in phase 1 with simulated patients
   (for teaching, testing an analysis plan and checking a sample size). Expected values come from the design and can be
   set here for each group and visit; links between variables, missing data, dropouts, outliers and "messy" entries make it
   realistic; a power simulation repeats it many times. The sheet is marked as simulated inside the file. */
(() => {
  const U = window.EasyUI, B = window.EasyBuilder; if (!U || !B) return;
  const $ = s => document.querySelector(s), esc = U.esc, toast = U.toast;
  const ls = { get: (k, d) => { try { const v = localStorage.getItem('gen.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('gen.' + k, JSON.stringify(v)); } catch (e) { /* not kept */ } } };
  const defaults = () => ({ n: '', ratio: '', seed: 20261107, visitR: 0.6, missAll: 0, miss: {}, dropout: 0, mode: {}, rng: {}, rt: {}, sig: {}, vseed: {}, view: 'table', dist: {}, round: {}, subg: {}, more: {}, missType: 'mcar', missBy: '', missGroup: '0', icc: 0, zpct: {}, slope: {}, alpha: {}, freeText: true,
    tte: { ev: '', time: '', date: '', hr: 0.7, pev: 30, fu: 365, lost: 5, shape: 'ph', hr2: 1, cev: '', pcomp: 0, tv: '', tvPct: 40, tvHr: 0.5 }, risk: {}, reg: {}, conf: { v: '', or: 2 }, diag: { ref: '', idx: '', num: '', prev: 30, sens: 85, spec: 90, auc: 0.85, verify: 100 },
    agree: { a: '', b: '', kappa: 0.7, a2: '', b2: '', bias: 0, sd: 1 }, recruit: { pattern: 'steady', siteW: '' }, dev: { on: false, excl: 20, lost: 5, nonadh: 10, cross: 0 },
    err: { units: true, x10: true, c999: true, caseMix: true, dup: true, comma: true, date: false, space: false, typo: false }, curve: { from: '', to: '', reps: 100 }, pack: { n: 10 }, outliers: 0, messy: false, messyPct: 3, start: '2026-01-01', span: 365, targets: {}, sds: {}, sdt: {}, exact: false, labs: false, ordOR: {}, oper: { v: '', icc: 0.1, only: '' }, match: { on: false, status: '', pair: '', by: [], exp: '', or: 2, tol: 2 }, ex: { n: 6 }, corr: [], power: { v: '', visit: '', reps: 200, alpha: 0.05, test: 'auto', multi: [], adj: 'none' }, interim: { looks: 2 }, res: { view: 'half', only: '', comments: true, live: true },
    clus: { on: false, n: 8, icc: 0.05, v: '' }, sw: { on: false, v: '', ind: '', eff: 0, trend: 0, icc: 0.05 }, xo: { on: false, v: '', seq: '', eff: 0, period: 0, carry: 0, r: 0.6 }, ni: { v: '', margin: '', better: 'higher', scen: 'noninf' },
    quirk: { season: 0, weekday: false, device: 0, deviceAt: 50, v: '', roundSite: '', roundTo: 5 } });
  let G = { ...defaults(), ...ls.get('settings', {}) }, last = null, powerOut = '', resKey = '', resOut = null, liveT = 0;
  G.res = { ...defaults().res, ...(G.res || {}) }; ['mode', 'rng', 'rt', 'sig', 'vseed', 'dist', 'round', 'subg', 'more'].forEach(k => { G[k] = G[k] || {}; }); G.curve = { from: '', to: '', reps: 100, ...(G.curve || {}) }; G.pack = { n: 10, ...(G.pack || {}) }; G.missType = G.missType || 'mcar';
  { const d0 = defaults(); ['zpct', 'slope', 'alpha', 'risk', 'reg', 'sdt', 'ordOR'].forEach(k => { G[k] = G[k] || {}; }); ['tte', 'conf', 'diag', 'agree', 'recruit', 'dev', 'err', 'oper', 'match', 'ex', 'clus', 'sw', 'xo', 'ni', 'quirk'].forEach(k => { G[k] = { ...d0[k], ...(G[k] || {}) }; }); if (G.freeText === undefined) G.freeText = true; }
  let lastConsort = null, lastErrors = [], devKeep = new Set(); G.power = { test: 'auto', multi: [], adj: 'none', ...G.power }; G.interim = { looks: 2, ...(G.interim || {}) };
  // settings kept from an earlier version: the old defaults of missing values (2%) and dropouts (5%) become 0
  if (!G.v2) { if (+G.missAll === 2) G.missAll = 0; if (+G.dropout === 5) G.dropout = 0; G.v2 = true; }
  let SIG = {}, sigInfo = {}, dInfo = {}, niInfo = null;
  const save = () => ls.set('settings', G);

  /* ---------- the engine ---------- */
  const D0 = () => B.design, arms = D => D.arms.filter(Boolean), K = D => arms(D).length >= 2 ? arms(D).length : 1;
  const visitKeys = (D, v) => { const vis = (v.visits || []).map(id => D.visits.find(x => x.id === id)).filter(Boolean); return vis.length ? vis.map(x => x.id) : ['once']; };
  const visitName = (D, key) => key === 'once' ? '' : (D.visits.find(x => x.id === key) || {}).name || key;
  const expect = v => v.expect && Object.keys(v.expect).length ? v.expect : B.expectOf(v.label, v.type, v.cats);
  // the target of a variable for a group at a visit: a mean (numbers) or the % of each category
  function target(v, g, key) {
    const sg = ((SIG[v.id] || {})[g] || {})[key]; if (sg !== undefined) return sg;
    const t = ((G.targets[v.id] || {})[g] || {})[key], e = expect(v);
    if (v.type === 'num' || v.type === 'calc') return t !== undefined && t !== '' ? +t : e.mean !== '' && e.mean !== undefined ? +e.mean : (v.min !== '' && v.max !== '' ? (+v.min + +v.max) / 2 : 10);
    // ordinal categories: the other groups from the first group's % by a proportional odds ratio (higher categories more likely when > 1)
    if (v.type === 'cat' && v.cats.length >= 3 && +G.ordOR[v.id] > 0 && g > 0 && !Array.isArray(t)) { const p0 = target(v, 0, key), b = Math.log(+G.ordOR[v.id]), lg = x => Math.log(x / (1 - x)), out = []; let cum = 0, prev = 0;
      p0.forEach((x, j) => { cum += x; const c = j === p0.length - 1 ? 1 : 1 / (1 + Math.exp(-(lg(Math.min(1 - 1e-9, Math.max(1e-9, cum))) - b))); out.push(Math.max(0, c - prev)); prev = c; }); return out; }
    const pc = Array.isArray(t) ? t : (e.pct && e.pct.length === v.cats.length ? e.pct : v.cats.map(() => 100 / v.cats.length)); const s = pc.reduce((a, b) => a + (+b || 0), 0) || 1; return pc.map(x => (+x || 0) / s);
  }
  const sdOf = v => { const s = G.sds[v.id] !== undefined && G.sds[v.id] !== '' ? +G.sds[v.id] : +expect(v).sd; return isFinite(s) && s > 0 ? s : Math.max(0.5, Math.abs(target(v, 0, 'once')) * 0.2); };
  // the SD of a group at a visit: typed in its cell, else the variable's SD
  const sdCell = (v, g, key) => { const c = ((G.sdt[v.id] || {})[g] || {})[key]; return c !== undefined && c !== '' && +c > 0 ? +c : sdOf(v); };
  // the SD shared by the groups at a visit (the root mean square of the groups' SDs), for effect sizes
  const sdPool = (D, v, key) => { const k = K(D); let s2 = 0; for (let g = 0; g < k; g++) s2 += sdCell(v, g, key) ** 2; return Math.sqrt(s2 / k); };
  const pick = (...xs) => { const x = xs.find(y => y !== undefined && y !== null && y !== '' && isFinite(+y)); return x === undefined ? null : +x; };
  const modeOf = v => G.mode[v.id] || (pick(expect(v).lo) !== null || pick(expect(v).hi) !== null ? 'both' : 'msd');
  // the limits of a number: those typed here, else the design's simulated Min / Max, else (for min & max) its allowed range
  const limits = (v, mode) => { const R0 = G.rng[v.id] || {}, e = expect(v); return mode === 'msd' ? { lo: pick(e.lo), hi: pick(e.hi) } : { lo: pick(R0.lo, e.lo, v.min), hi: pick(R0.hi, e.hi, v.max) }; };
  // min & max of a group at a visit (typed in its cell, else the limits)
  const cellRange = (v, g, key) => { const c = (((G.rt[v.id] || {})[g] || {})[key]) || {}, L = limits(v, 'range'); return { lo: pick(c.lo, L.lo), hi: pick(c.hi, L.hi) }; };
  function numParams(v, g, key) {
    const mode = modeOf(v), e = expect(v);
    if (mode === 'range') { const r = cellRange(v, g, key); if (r.lo !== null && r.hi !== null && r.hi > r.lo) { const mid = (r.lo + r.hi) / 2, sg = ((SIG[v.id] || {})[g] || {})[key], sh = sg !== undefined ? sg - mid : 0;
      return { m: mid + sh, sd: (r.hi - r.lo) / 4, lo: r.lo + sh, hi: r.hi + sh, dist: 'normal' }; } }
    const L = limits(v, mode === 'range' ? 'both' : mode); return { m: target(v, g, key), sd: sdCell(v, g, key), lo: L.lo, hi: L.hi, dist: G.dist[v.id] || e.dist };
  }
  // the count at the centile u: Poisson (mean m), or negative binomial with the SD asked (more spread than Poisson)
  function countQ(u, m, sd) { const s2 = sd * sd, nb = sd > 0 && s2 > m * 1.001, r = nb ? m * m / (s2 - m) : 0, q = nb ? r / (r + m) : 0;
    let k = 0, pk = nb ? Math.pow(q, r) : Math.exp(-m), cum = pk; while (cum < u && k < 10000) { pk = nb ? pk * (k + r) / (k + 1) * (1 - q) : pk * m / (k + 1); k++; cum += pk; if (pk < 1e-300 && cum < u && k > m * 20) break; } return k; }
  const decOf = (v, sd) => v.dec !== '' && v.dec !== undefined ? +v.dec : sd < 1 ? 2 : sd < 10 ? 1 : 0;
  const yesFirst = v => v.type === 'yn' || /^(yes|y|present|positive)$/i.test(String(v.cats[0] || ''));
  const normInv = p => jStat.normal.inv(Math.min(1 - 1e-12, Math.max(1e-12, p)), 0, 1);
  // how much more likely a value is missing for this patient (1 on average): the pattern chosen in Realism
  const logis = x => 1 / (1 + Math.exp(-x));
  function zOf(D, v, p, key) { const x = (p.vals[v.id] || {})[key] ?? (p.vals[v.id] || {}).once; if (x == null) return 0;
    if (v.type === 'num' || v.type === 'calc') { const np = numParams(v, 0, key in (p.vals[v.id] || {}) ? key : 'once'); return np.sd > 0 ? (+x - np.m) / np.sd : 0; }
    const yes = D.conv.catAs === 'codes' ? 1 : v.cats[0]; return x === yes ? 1 : -0.4; }
  function missWeight(D, p, v, key) {
    const t = G.missType || 'mcar'; if (t === 'mcar') return 1;
    if (t === 'group') { const k = K(D); if (k < 2) return 1; return p.g === +G.missGroup ? Math.min(k, 2.2) : Math.max(0.1, (k - Math.min(k, 2.2)) / (k - 1)); }
    if (t === 'mnar') { if (v.type !== 'num') return 1; return 2 * logis(1.6 * zOf(D, v, p, key)); }
    if (t === 'mar') { const by = D.vars.find(x => x.id === G.missBy); if (!by || by.id === v.id) return 1; return 2 * logis(1.6 * zOf(D, by, p, 'once')); }
    return 1; }
  // the shared part of a scale's items for the Cronbach's alpha asked: alpha = k r / (1 + (k − 1) r) gives the correlation r of two items (on the latent scale)
  function scaleW(D, sc) { const a0 = +G.alpha[sc]; if (!(a0 > 0 && a0 < 1)) return 0.6; const a = a0 + 0.15 * (1 - a0); const k = D.vars.filter(v => v.scale === sc && v.type === 'num').length || 2; return Math.min(0.97, Math.max(0.02, a / (k - a * (k - 1)))); }
  const TEXT_LIB = [[/type of complication|complication type|adverse event|complication/i, ['Wound infection', 'Bleeding', 'Seroma', 'Urinary tract infection', 'Chest infection', 'Paralytic ileus', 'Wound dehiscence', 'Deep vein thrombosis'], 1],
    [/withdraw|lost to follow|drop.?out|reason/i, ['Moved away', 'Withdrew consent', 'Lost to follow-up', 'Adverse event', 'Protocol violation', 'Died'], 1], [/occupation|job|profession/i, ['Housewife', 'Teacher', 'Farmer', 'Engineer', 'Driver', 'Student', 'Retired', 'Nurse', 'Labourer', 'Accountant'], 1],
    [/diagnos/i, ['Knee osteoarthritis', 'Hip osteoarthritis', 'Low back pain', 'Rotator cuff tear', 'Plantar fasciitis'], 1], [/site|centre|center|hospital/i, ['University hospital', 'General hospital', 'Private clinic'], 1],
    [/comment|note|remark|other/i, ['Uneventful', 'Late for the visit', 'Phone follow-up', 'Missed one dose', 'Seen by the registrar', 'Asked for a second opinion'], 0.35]];
  // laboratory panels and measurements that go together: linked when both are in the design (G3)
  const LABS = [[/\burea\b|\bBUN\b/i, /creatinine/i, 0.7], [/\bALT\b|alanine/i, /\bAST\b|aspartate/i, 0.8], [/ha?emoglobin|\bHb\b/i, /ha?ematocrit|\bHct\b|\bPCV\b/i, 0.9], [/systolic/i, /diastolic/i, 0.6],
    [/height/i, /weight/i, 0.5], [/creatinine/i, /\beGFR\b|\bGFR\b/i, -0.8], [/sodium|\bNa\b/i, /chloride|\bCl\b/i, 0.6], [/total bilirubin|^bilirubin/i, /direct bilirubin/i, 0.8], [/white (blood )?cell|\bWBC\b|leu[ck]ocyte/i, /neutrophil/i, 0.85],
    [/glucose/i, /HbA1c|\bA1c\b/i, 0.6], [/total cholesterol|^cholesterol/i, /\bLDL\b/i, 0.8], [/alkaline phosphatase|\bALP\b/i, /\bGGT\b|gamma/i, 0.6], [/\bpH\b/i, /bicarbonate|HCO3/i, 0.6], [/\bCRP\b|C-reactive/i, /procalcitonin|\bPCT\b/i, 0.5]];
  function labPairs(D) { const nums = D.vars.filter(v => v.type === 'num'), out = []; LABS.forEach(([ra, rb, r]) => { const a = nums.find(v => ra.test(v.label)), b = nums.find(v => rb.test(v.label) && v !== a); if (a && b && !(G.corr || []).some(c => (c.a === a.id && c.b === b.id) || (c.a === b.id && c.b === a.id))) out.push({ a: a.id, b: b.id, r, lab: true }); }); return out; }
  const corrAll = D => [...(G.corr || []), ...(G.labs ? labPairs(D) : [])];
  // the column of a variable at a visit (as in the sheet)
  function colName(D, v, key) { const c = B.columns(D).find(c0 => c0.v.id === v.id && (key === 'once' ? !c0.visit || c0.visit.id === D.visits[0].id : c0.visit && c0.visit.id === key)); return c ? c.col : v.label; }
  const hashOf = s0 => { let h = 7; for (const c of String(s0)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 100003; };
  // the key compared by the test: the last visit of the variable (one group: the first against the last visit)
  const sigKey = (D, v) => visitKeys(D, v).slice(-1)[0];
  // "significant": group targets far enough apart for a power of about 95% with these patients; "not significant": the same targets in every group
  function sigTargets(D) {
    const out = {}, k = K(D), n = Math.max(2, +G.n || +D.n || 60), za = 1.96, zb = 1.645, St = typeof Stats !== 'undefined' ? Stats : null;
    D.vars.forEach(v => { const want = G.sig[v.id]; if (!want || !['num', 'yn', 'cat'].includes(v.type)) return; const keys = visitKeys(D, v), key = sigKey(D, v), o = out[v.id] = {}, put = (g, kk, x) => { (o[g] = o[g] || {})[kk] = x; };
      if (k < 2 && keys.length < 2) { delete out[v.id]; return; }
      if (v.type === 'num') { const mode = modeOf(v), base = (g, kk) => { if (mode === 'range') { const r = cellRange(v, g, kk); return r.lo !== null && r.hi !== null ? (r.lo + r.hi) / 2 : target(v, g, kk); } return target(v, g, kk); };
        const sd = mode === 'range' ? (() => { const r = cellRange(v, 0, key); return r.lo !== null && r.hi !== null ? (r.hi - r.lo) / 4 : sdPool(D, v, key); })() : sdPool(D, v, key), L = limits(v, mode === 'msd' ? 'both' : mode);
        if (k >= 2) { const ms = [...Array(k)].map((_, g) => base(g, key)), m0 = ms[0];
          if (want === 'ns') { const avg = ms.reduce((a, b) => a + b, 0) / k; ms.forEach((_, g) => put(g, key, avg)); return; }
          const d = (za + zb) * Math.sqrt(2 / (n / k)) * (k > 2 ? 1.5 : 1.2) * sd; let dir = ms[k - 1] >= m0 ? 1 : -1; if (ms.every(x => x === m0)) dir = L.hi !== null && m0 + d > L.hi ? -1 : 1;
          ms.forEach((_, g) => put(g, key, m0 + dir * d * g / (k - 1))); return; }
        const first = keys[0], m0 = base(0, first);
        if (want === 'ns') { put(0, key, m0); return; }
        const rho = Math.min(0.95, Math.max(0, +G.visitR || 0)), d = (za + zb) / Math.sqrt(n) * sd * Math.sqrt(2 * (1 - rho)) * 1.3, mk = base(0, key); let dir = mk >= m0 ? 1 : -1; if (mk === m0) dir = L.hi !== null && m0 + d > L.hi ? -1 : 1; put(0, key, m0 + dir * Math.max(d, Math.abs(mk - m0))); return; }
      // categories: the first category moved between the groups (or the visits)
      const pv = g => target(v, g, k >= 2 ? key : (g ? key : keys[0])), shift = (p, p1) => { const rest = p.slice(1), rs = rest.reduce((a, b) => a + b, 0) || 1; return [p1, ...rest.map(x => (1 - p1) * x / rs)]; };
      if (k >= 2) { const ps = [...Array(k)].map((_, g) => pv(g));
        if (want === 'ns') { const avg = ps[0].map((_, j) => ps.reduce((a, p) => a + p[j], 0) / k); ps.forEach((_, g) => put(g, key, avg)); return; }
        const p0 = ps[0][0], nPer = n / k; let dir = ps[k - 1][0] >= p0 ? 1 : -1, p1 = p0; if (p0 > 0.75 && dir > 0) dir = -1; if (p0 < 0.25 && dir < 0) dir = 1;
        for (let t = 0; t < 95; t++) { p1 = Math.min(0.97, Math.max(0.03, p1 + dir * 0.01)); if (St && St.powerTwoProps(p0, p1, nPer, nPer) >= (k > 2 ? 0.99 : 0.97)) break; }
        ps.forEach((p, g) => put(g, key, shift(p, p0 + (p1 - p0) * g / (k - 1)))); return; }
      const pf = pv(0), p0 = pf[0]; if (want === 'ns') { put(0, key, pf); return; }
      let p1 = p0, dir = p0 > 0.5 ? -1 : 1; for (let t = 0; t < 95; t++) { p1 = Math.min(0.97, Math.max(0.03, p1 + dir * 0.01)); if (St && St.powerTwoProps(p0, p1, n, n) >= 0.97) break; } put(0, key, shift(pf, p1)); });
    return out;
  }
  // after the values are drawn: variables drawn again (🎲 of a variable), then "significant / not significant" checked (drawn again until it holds, up to 15 times)
  // ---------- special relations between variables ----------
  const yesOf = (D, v) => D.conv.catAs === 'codes' ? 1 : v.cats[0], noOf = (D, v) => D.conv.catAs === 'codes' ? 2 : v.cats[1] ?? v.cats[0];
  const firstVal = (p, id) => { const o = p.vals[id] || {}; return o.once ?? Object.values(o)[0]; };
  // a predictor as a number (yes/no: 1/0), centred on its mean
  function predX(D, P, v) { const xs = P.map(p => { const x = firstVal(p, v.id); if (x == null) return NaN; if (v.type === 'num') return +x; return x === yesOf(D, v) ? 1 : 0; }), ok = xs.filter(isFinite), m = ok.reduce((a, b) => a + b, 0) / (ok.length || 1), sd = Math.sqrt(ok.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, ok.length - 1)) || 1;
    return { xs: xs.map(x => isFinite(x) ? x - m : 0), sd }; }
  function special(D, P, seed) {
    const vv = id => D.vars.find(x => x.id === id), rs = B.prng((seed + 90001) >>> 0), nz = () => { let u = 0; while (!u) u = rs(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rs()); }, logit = p => Math.log(p / (1 - p)), lgs = x => 1 / (1 + Math.exp(-x));
    // G4 confounding: the predictor's values given out so that one group has more of it (odds ratio asked)
    { const c = G.conf || {}, v = vv(c.v); if (v && K(D) >= 2 && +c.or > 0 && +c.or !== 1) { const vals = P.map(p => firstVal(p, v.id)), px = predX(D, P, v), b = Math.log(+c.or), keyed = vals.map((x, i) => ({ x, o: P[i].vals[v.id], key: b * px.xs[i] / (v.type === 'num' ? px.sd : 1) + Math.log(rs() / (1 - rs())) }));
      keyed.sort((a, b2) => b2.key - a.key); const idx1 = P.map((p, i) => i).filter(i => P[i].g > 0), idx0 = P.map((p, i) => i).filter(i => P[i].g === 0); [...idx1, ...idx0].forEach((pi, j) => { P[pi].vals[v.id] = JSON.parse(JSON.stringify(keyed[j].o)); }); } }
    // G3 regression: a number made of its predictors (b per unit of each, yes = 1)
    Object.entries(G.reg || {}).forEach(([id, list]) => { const v = vv(id); if (!v || v.type !== 'num') return; const terms = (list || []).map(t => ({ t, pv: vv(t.v) })).filter(x => x.pv && isFinite(+x.t.b) && x.pv.id !== id).map(x => ({ b: +x.t.b, px: predX(D, P, x.pv) }));
      if (!terms.length) return; P.forEach((p, i) => { const o = p.vals[id]; if (!o) return; const add = terms.reduce((a, t) => a + t.b * t.px.xs[i], 0), dd = decOf(v, sdOf(v)); Object.keys(o).forEach(k2 => { if (o[k2] != null && typeof o[k2] === 'number') o[k2] = +(o[k2] + add).toFixed(dd); }); }); });
    // G2 risk factors: a yes/no outcome from its predictors (odds ratios; numbers per the unit asked), each group keeping its own overall %
    Object.entries(G.risk || {}).forEach(([id, list]) => { const v = vv(id); if (!v || !(v.type === 'yn' || v.cats.length === 2)) return; const terms = (list || []).map(t => ({ t, pv: vv(t.v) })).filter(x => x.pv && +x.t.or > 0 && x.pv.id !== id).map(x => ({ b: Math.log(+x.t.or) / (x.pv.type === 'num' ? (+x.t.per || 1) : 1), px: predX(D, P, x.pv) }));
      if (!terms.length) return; const lp = P.map((p, i) => terms.reduce((a, t) => a + t.b * t.px.xs[i], 0));
      visitKeys(D, v).forEach(k2 => { for (let g = 0; g < K(D); g++) { const ids = P.map((p, i) => i).filter(i => P[i].g === g); if (!ids.length) continue; const pt = Math.min(0.98, Math.max(0.02, target(v, g, k2)[0]));
        let lo = -15, hi = 15; for (let it = 0; it < 50; it++) { const mid = (lo + hi) / 2, m = ids.reduce((a, i) => a + lgs(mid + lp[i]), 0) / ids.length; if (m > pt) hi = mid; else lo = mid; } const a0 = (lo + hi) / 2;
        ids.forEach(i => { const o = P[i].vals[id]; if (!o || o[k2] === null) return; o[k2] = rs() < lgs(a0 + lp[i]) ? yesOf(D, v) : noOf(D, v); }); } }); void logit; });
    // G1 time to event: exponential times (hazard ratio of the other groups), censoring at the end of follow-up or earlier (lost)
    { const T0 = G.tte || {}, ev = vv(T0.ev), tm = vv(T0.time), dt = vv(T0.date); if (ev && (tm || dt) && +T0.fu > 0 && +T0.pev > 0 && +T0.pev < 100) { const fu = +T0.fu, l0 = -Math.log(1 - +T0.pev / 100) / fu, hr = +T0.hr > 0 ? +T0.hr : 1, lost = Math.min(0.9, Math.max(0, (+T0.lost || 0) / 100));
      const unit = String((tm && tm.unit) || '').toLowerCase(), per = /month/.test(unit) ? 30.4375 : /week/.test(unit) ? 7 : /year/.test(unit) ? 365.25 : /hour/.test(unit) ? 1 / 24 : 1, evKey = visitKeys(D, ev).slice(-1)[0];
      const anchor = D.vars.find(v => v.type === 'date' && /enrol|admission|randomi|surgery|diagnos/i.test(v.label)) || D.vars.find(v => v.type === 'date' && v !== dt);
      const cross = T0.shape === 'cross', hr2 = +T0.hr2 > 0 ? +T0.hr2 : 1, tsw = fu / 2, tvv = vv(T0.tv), tvOn = !!tvv && +T0.tvPct > 0, tvP = Math.min(1, (+T0.tvPct || 0) / 100), tvHr = +T0.tvHr > 0 ? +T0.tvHr : 1, cv = vv(T0.cev), pc = cv ? Math.min(0.9, Math.max(0, (+T0.pcomp || 0) / 100)) : 0, lc = pc > 0 ? -Math.log(1 - pc) / fu : 0;
      P.forEach(p => { const lam = l0 * (p.g > 0 ? hr : 1), lam2 = cross ? l0 * (p.g > 0 ? hr2 : 1) : lam, E = -Math.log(Math.max(1e-12, rs())), S0 = tvOn && rs() < tvP ? rs() * fu : Infinity, T = tvOn ? (E < lam * S0 ? E / lam : S0 + (E - lam * S0) / (lam * tvHr)) : E < lam * tsw ? E / lam : tsw + (E - lam * tsw) / lam2, C0 = rs() < lost ? rs() * fu : fu;
        const Tc = lc > 0 ? -Math.log(Math.max(1e-12, rs())) / lc : Infinity, C = Math.min(C0, Tc), obs = Math.min(T, C), e = T <= C;
        if (cv) (p.vals[cv.id] = p.vals[cv.id] || {})[visitKeys(D, cv).slice(-1)[0]] = !e && Tc <= C0 ? yesOf(D, cv) : noOf(D, cv);
        (p.vals[ev.id] = p.vals[ev.id] || {})[evKey] = e ? yesOf(D, ev) : noOf(D, ev);
        if (tvOn) { const kk = visitKeys(D, tvv).slice(-1)[0], o = p.vals[tvv.id] = p.vals[tvv.id] || {}, a0 = anchor && firstVal(p, anchor.id); o[kk] = S0 < obs ? (tvv.type === 'date' ? (a0 ? new Date(Date.parse(a0) + Math.round(S0) * 864e5).toISOString().slice(0, 10) : null) : +(S0 / per).toFixed(per === 1 ? 0 : 1)) : null; }
        if (tm) { const o = p.vals[tm.id] = p.vals[tm.id] || {}, kk = visitKeys(D, tm).slice(-1)[0]; o[kk] = +(obs / per).toFixed(per === 1 ? 0 : 1); }
        if (dt) { const a = anchor && firstVal(p, anchor.id); p.vals[dt.id] = { once: e && a ? new Date(Date.parse(a) + Math.round(T) * 864e5).toISOString().slice(0, 10) : null }; } }); } }
    // G9 diagnostic accuracy: the reference standard from the prevalence, the index test from the sensitivity and specificity, a numeric index from the AUC
    { const Dg = G.diag || {}, ref = vv(Dg.ref), idx = vv(Dg.idx), num = vv(Dg.num); if (ref && (idx || num)) { const prev = (+Dg.prev || 30) / 100, se = (+Dg.sens || 85) / 100, sp = (+Dg.spec || 90) / 100, auc = Math.min(0.99, Math.max(0.5, +Dg.auc || 0.85)), dlt = Math.SQRT2 * normInv(auc);
      P.forEach(p => { const dis = rs() < prev, kR = visitKeys(D, ref)[0]; (p.vals[ref.id] = p.vals[ref.id] || {})[kR] = dis ? yesOf(D, ref) : noOf(D, ref);
        if (idx) { const pos = dis ? rs() < se : rs() >= sp; (p.vals[idx.id] = p.vals[idx.id] || {})[visitKeys(D, idx)[0]] = pos ? yesOf(D, idx) : noOf(D, idx); if (!pos && +Dg.verify < 100 && rs() * 100 >= +Dg.verify) p.vals[ref.id][kR] = null; }
        if (num && num.type === 'num') { const np = numParams(num, 0, visitKeys(D, num)[0]), z = nz() + (dis ? dlt : 0) - dlt * prev; (p.vals[num.id] = p.vals[num.id] || {})[visitKeys(D, num)[0]] = +(np.m + np.sd * z).toFixed(decOf(num, np.sd)); } }); } }
    // G10 agreement: reader B copies reader A with the probability kappa, else answers at random with the same %; method B = method A + bias + error
    { const A0 = G.agree || {}, a = vv(A0.a), b = vv(A0.b); if (a && b && a !== b) { const k0 = Math.min(1, Math.max(0, +A0.kappa)), pool = P.map(p => firstVal(p, a.id)).filter(x => x != null);
      P.forEach(p => { const x = firstVal(p, a.id); if (x == null) return; const kb = visitKeys(D, b)[0]; (p.vals[b.id] = p.vals[b.id] || {})[kb] = rs() < k0 ? (D.conv.catAs === 'codes' || a.cats.join() === b.cats.join() ? x : b.cats[a.cats.indexOf(x)] ?? x) : pool[Math.floor(rs() * pool.length)]; }); }
      const a2 = vv(A0.a2), b2 = vv(A0.b2); if (a2 && b2 && a2.type === 'num' && b2.type === 'num') P.forEach(p => { const x = firstVal(p, a2.id); if (x == null || !isFinite(+x)) return; (p.vals[b2.id] = p.vals[b2.id] || {})[visitKeys(D, b2)[0]] = +(+x + (+A0.bias || 0) + (+A0.sd || 0) * nz()).toFixed(decOf(b2, +A0.sd || 1)); }); }
    // G6 matched case-control pairs: a case and its control share the matching variables (numbers within ± the tolerance); the exposure from the odds ratio
    { const M = G.match || {}, st = vv(M.status); if (M.on && st && P.length >= 2) { const pr = vv(M.pair), by = (M.by || []).map(vv).filter(Boolean), ex = vv(M.exp), tol = Math.max(0, +M.tol || 0), orr = +M.or > 0 ? +M.or : 1;
      const p0 = ex ? Math.min(0.98, Math.max(0.02, target(ex, 0, visitKeys(D, ex)[0])[0])) : 0, p1 = orr * p0 / (1 - p0 + orr * p0);
      P.forEach((p, i) => { const isCase = i % 2 === 0, pairNo = Math.floor(i / 2) + 1; (p.vals[st.id] = {})[visitKeys(D, st)[0]] = isCase ? yesOf(D, st) : noOf(D, st);
        if (pr) p.vals[pr.id] = { [visitKeys(D, pr)[0]]: pr.type === 'num' ? pairNo : `P${String(pairNo).padStart(3, '0')}` };
        if (!isCase) by.forEach(bv => { const src = P[i - 1].vals[bv.id]; if (!src) return; const o = JSON.parse(JSON.stringify(src)); if (bv.type === 'num' && tol > 0) Object.keys(o).forEach(k2 => { if (typeof o[k2] === 'number') o[k2] = +(o[k2] + Math.round((rs() * 2 - 1) * tol)).toFixed(decOf(bv, sdOf(bv))); }); p.vals[bv.id] = o; });
        if (ex) (p.vals[ex.id] = {})[visitKeys(D, ex)[0]] = rs() < (isCase ? p1 : p0) ? yesOf(D, ex) : noOf(D, ex); }); } }
    // G12 deviations: lost (later visits empty, withdrawn, a reason), not adherent, crossed over; and the CONSORT counts
    lastConsort = null; devKeep = new Set(); { const dv = G.dev || {}; if (dv.on) { const lost = Math.min(0.6, (+dv.lost || 0) / 100), na = Math.min(0.9, (+dv.nonadh || 0) / 100), cr = Math.min(0.5, (+dv.cross || 0) / 100), excl = Math.min(0.9, Math.max(0, (+dv.excl || 0) / 100));
      const wd = D.vars.find(v => /withdraw|lost to follow|drop.?out/i.test(v.label) && (v.type === 'yn' || v.cats.length === 2)), rsn = D.vars.find(v => /reason/i.test(v.label) && v.type === 'text'), adh = D.vars.find(v => /adheren|complian/i.test(v.label) && v.type === 'num'), rec = D.vars.find(v => /received|actual treatment/i.test(v.label) && (v.type === 'cat' || v.type === 'yn'));
      const reasons = ['Lost to follow-up', 'Withdrew consent', 'Moved away', 'Adverse event']; devKeep = new Set([wd, rsn].filter(Boolean).map(v => v.id));
      P.forEach(p => { p.__drop = 0; if (D.visits.length > 1 && rs() < lost) { p.__drop = 1 + Math.floor(rs() * (D.visits.length - 1)); p.__why = reasons[Math.floor(rs() * reasons.length)]; }
        if (wd) (p.vals[wd.id] = p.vals[wd.id] || {})[visitKeys(D, wd).slice(-1)[0]] = p.__drop ? yesOf(D, wd) : noOf(D, wd);
        if (rsn) p.vals[rsn.id] = { [visitKeys(D, rsn).slice(-1)[0]]: p.__drop ? p.__why : null };
        if (adh) { const o = p.vals[adh.id] = p.vals[adh.id] || {}; Object.keys(o).length || (o[visitKeys(D, adh).slice(-1)[0]] = null); Object.keys(o).forEach(k2 => { o[k2] = rs() < na ? Math.round(30 + rs() * 45) : Math.round(85 + rs() * 15); }); }
        if (rec && K(D) >= 2 && rs() < cr) { const A = arms(D), other = A[(p.g + 1) % A.length]; p.vals[rec.id] = { once: D.conv.catAs === 'codes' ? rec.cats.indexOf(other) + 1 : other }; } });
      const k = K(D), A = k >= 2 ? arms(D) : ['All patients'], n = P.length, assessed = Math.round(n / (1 - excl)), ex = assessed - n;
      lastConsort = { assessed, excluded: ex, reasons: [['Not meeting inclusion criteria', Math.round(ex * 0.6)], ['Declined to participate', Math.round(ex * 0.3)], ['Other reasons', ex - Math.round(ex * 0.6) - Math.round(ex * 0.3)]],
        groups: A.map((a, g) => { const ps = P.filter(p => p.g === g); return { name: a, allocated: ps.length, lost: ps.filter(p => p.__drop).length, analysed: ps.length - ps.filter(p => p.__drop).length }; }) }; } }
  }
  // G1 exact match: each group's numbers rescaled to the mean and SD asked; its categories given out to the % asked (largest remainders)
  // the variables made by a special relation keep their own values (rescaling them would break the relation)
  const specialIds = () => { const T0 = G.tte || {}, Dg = G.diag || {}, A0 = G.agree || {}, M = G.match || {}; return new Set([T0.ev, T0.time, T0.cev, Dg.ref, Dg.idx, Dg.num, A0.b, A0.b2, ...(M.on ? [M.status, M.exp, M.pair, ...(M.by || [])] : []), ...Object.keys(G.risk || {}), ...Object.keys(G.reg || {}), (G.ni || {}).v, (G.xo || {}).on && G.xo.v, (G.sw || {}).on && G.sw.v].filter(Boolean)); };
  function exactMatch(D, P, opt) { const rx = B.prng(((+opt.seed || +G.seed || 1) + 61001) >>> 0), k = K(D), skip = specialIds();
    D.vars.forEach(v => { if (!['num', 'yn', 'cat'].includes(v.type) || skip.has(v.id) || G.dist[v.id] === 'poisson' || G.dist[v.id] === 'negbin') return;
      visitKeys(D, v).forEach(key => { for (let g = 0; g < k; g++) { const ps = P.filter(p => p.g === g && p.vals[v.id] && p.vals[v.id][key] != null && p.vals[v.id][key] !== ''); if (ps.length < 2) continue;
        if (v.type === 'num') { const np = numParams(v, g, key), xs = ps.map(p => +p.vals[v.id][key]), m = xs.reduce((a, b) => a + b, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1)); if (!(sd > 0)) continue;
          const dd = decOf(v, np.sd), u = 10 ** -dd, raw = xs.map(x0 => np.m + (x0 - m) * np.sd / sd), ys = raw.map(x0 => +x0.toFixed(dd));
          // the rounding moved the mean: the values rounded furthest are moved by one unit of the last decimal until the sum is the one asked
          let off = Math.round((ys.reduce((a, b) => a + b, 0) - np.m * ys.length) / u); const order = raw.map((x0, i) => [x0 - ys[i], i]);
          if (off > 0) order.sort((a, b) => a[0] - b[0]); else order.sort((a, b) => b[0] - a[0]); for (let j = 0; off !== 0 && j < order.length; j++) { const i = order[j][1]; ys[i] = +(ys[i] - Math.sign(off) * u).toFixed(dd); off -= Math.sign(off); }
          ps.forEach((p, i) => { let x = ys[i]; if (v.min !== '' && isFinite(+v.min)) x = Math.max(+v.min, x); if (v.max !== '' && isFinite(+v.max)) x = Math.min(+v.max, x); p.vals[v.id][key] = x; }); continue; }
        const pc = target(v, g, key), cats = D.conv.catAs === 'codes' ? v.cats.map((_, i) => i + 1) : v.cats, n = ps.length, raw = pc.map(x => x * n), want = raw.map(Math.floor);
        raw.map((x, j) => [x - Math.floor(x), j]).sort((a, b) => b[0] - a[0]).slice(0, n - want.reduce((a, b) => a + b, 0)).forEach(([, j]) => { want[j]++; });
        const has = cats.map(c => ps.filter(p => String(p.vals[v.id][key]) === String(c))), spare = [];
        has.forEach((L, j) => { const extra = L.length - want[j]; if (extra > 0) { for (let i = L.length - 1; i > 0; i--) { const r = Math.floor(rx() * (i + 1)); [L[i], L[r]] = [L[r], L[i]]; } spare.push(...L.slice(0, extra)); } });
        ps.filter(p => !cats.some(c => String(c) === String(p.vals[v.id][key]))).forEach(p => spare.push(p));
        cats.forEach((c, j) => { let need = want[j] - Math.min(want[j], has[j].length); while (need-- > 0 && spare.length) spare.pop().vals[v.id][key] = c; }); } }); }); }
  function adjust(D, P, opt) {
    const groups = P.map(p => p.g), seed = +opt.seed || +G.seed || 1;
    const redraw = (v, r) => { const Q = generate(D, { ...opt, seed: seed + 104729 * r + hashOf(v.id), groups, stage1: true }); P.forEach((p, i) => { p.vals[v.id] = Q[i].vals[v.id]; }); };
    if (!opt.plain) Object.entries(G.vseed).forEach(([id, r]) => { const v = D.vars.find(x => x.id === id); if (v && +r) redraw(v, +r); });
    // an effect only in a subgroup: the other patients get the values of the first group (no difference between the groups for them)
    Object.entries(G.subg).forEach(([id, sg]) => { const v = D.vars.find(x => x.id === id), mod = sg && D.vars.find(x => x.id === sg.v); if (!v || !mod || !sg.cat) return; const want = D.conv.catAs === 'codes' ? mod.cats.indexOf(sg.cat) + 1 : sg.cat, rr = B.prng((seed + hashOf(id + 'sub')) >>> 0);
      P.forEach(p => { if (p.g === 0) return; const mv = (p.vals[mod.id] || {}).once ?? Object.values(p.vals[mod.id] || {})[0]; if (mv === want) return; const o = p.vals[v.id]; if (!o) return;
        Object.keys(o).forEach(key => { if (o[key] == null) return;
          if (v.type === 'num') { const a = numParams(v, p.g, key), b0 = numParams(v, 0, key), dd = decOf(v, a.sd); o[key] = +(+o[key] - (a.m - b0.m)).toFixed(dd); }
          else if (v.type === 'yn' || v.type === 'cat') { const pc = target(v, 0, key); let c = 0, cum = 0; const u = rr(); for (; c < pc.length - 1; c++) { cum += pc[c]; if (u <= cum) break; } o[key] = D.conv.catAs === 'codes' ? c + 1 : v.cats[c]; } }); }); });
    // a centre effect: patients of the same site are alike (intraclass correlation), for the numbers
    const sites = (D.sites || []).filter(x => x && x.name), icc = Math.min(0.6, Math.max(0, +G.icc || 0));
    if (sites.length >= 2 && icc > 0) { const rs = B.prng((seed + 4242) >>> 0), nz = () => { let u = 0; while (!u) u = rs(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rs()); }, bs = {}; sites.forEach(x => { bs[x.name] = nz(); });
      // standardised (mean 0, SD 1 across the sites) so that the intraclass correlation is the one asked, even with few sites
      { const xs = sites.map(x => bs[x.name]), m = xs.reduce((a, c) => a + c, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, c) => a + (c - m) ** 2, 0) / (xs.length - 1)) || 1; sites.forEach(x => { bs[x.name] = (bs[x.name] - m) / sd; }); }
      D.vars.filter(v => v.type === 'num').forEach(v => P.forEach(p => { const o = p.vals[v.id]; if (!o || !p.site) return; Object.keys(o).forEach(key => { if (o[key] == null) return; const a = numParams(v, p.g, key); o[key] = +(+o[key] + bs[p.site] * a.sd * Math.sqrt(icc / (1 - icc))).toFixed(decOf(v, a.sd)); }); })); }
    // G4 operator effect: patients of the same surgeon / anaesthetist (a column of the design) are alike
    { const O = G.oper || {}, ov = D.vars.find(x => x.id === O.v), oi = Math.min(0.6, Math.max(0, +O.icc || 0)); if (ov && oi > 0) { const ro = B.prng((seed + 5353) >>> 0), nz = () => { let u = 0; while (!u) u = ro(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * ro()); };
      const lv = P.map(p => { const o = p.vals[ov.id] || {}; return o.once ?? Object.values(o)[0]; }), names = [...new Set(lv.filter(x => x != null))];
      if (names.length >= 2) { const be = {}; names.forEach(nm => { be[nm] = nz(); }); const xs = names.map(nm => be[nm]), m = xs.reduce((a, c) => a + c, 0) / xs.length, sd = Math.sqrt(xs.reduce((a, c) => a + (c - m) ** 2, 0) / (xs.length - 1)) || 1; names.forEach(nm => { be[nm] = (be[nm] - m) / sd; });
        D.vars.filter(v => v.type === 'num' && v.id !== ov.id && (!O.only || O.only === v.id)).forEach(v => P.forEach((p, i) => { const o = p.vals[v.id]; if (!o || lv[i] == null) return; Object.keys(o).forEach(key => { if (o[key] == null) return; const a = numParams(v, p.g, key); o[key] = +(+o[key] + be[lv[i]] * a.sd * Math.sqrt(oi / (1 - oi))).toFixed(decOf(v, a.sd)); }); })); } } }
    special(D, P, seed);
    designs(D, P, seed, opt);
    const ni = niShift(D, P);
    if (opt.plain) return;
    sigInfo = {};
    D.vars.forEach(v => { const want = G.sig[v.id]; if (!want || !SIG[v.id]) return; const key = sigKey(D, v); let p = pTest(D, v, key, P), t = 0; const ok = () => want === 'sig' ? p < 0.05 : !(p < 0.05);
      while (isFinite(p) && !ok() && t < 15) { t++; redraw(v, 5000 + t + (+G.vseed[v.id] || 0)); p = pTest(D, v, key, P); } sigInfo[v.id] = { p, ok: isFinite(p) && ok(), key, want }; });
    // non-inferiority: drawn again until the 95% CI tells the scenario asked (non-inferior, inferior or inconclusive)
    niInfo = null; if (ni) { const want = G.ni.scen || 'noninf', okk = r => want === 'noninf' ? r.verdict === 'noninf' || r.verdict === 'superior' : r.verdict === want; let r = niStat(D, P), t = 0;
      while (r && !okk(r) && t < 40) { t++; redraw(ni.v, 7000 + t); niShift(D, P); r = niStat(D, P); } niInfo = r ? { ...r, ok: okk(r) } : null; }
  }
  // non-inferiority: the new treatment (the second group) differs from the standard (the first) by the scenario's true difference (in the better direction)
  function niShift(D, P) { const N = G.ni || {}, v = D.vars.find(x => x.id === N.v); if (!v || v.type !== 'num' || K(D) < 2 || !(+N.margin > 0)) return null; const key = sigKey(D, v), M = +N.margin, sg = N.better === 'lower' ? -1 : 1, d = { noninf: 0, inferior: -1.6 * M, inconcl: -M }[N.scen] ?? 0;
    P.forEach(p => { if (p.g !== 1) return; const o = p.vals[v.id]; if (!o || o[key] == null) return; const a = numParams(v, 1, key), b0 = numParams(v, 0, key); o[key] = +(+o[key] - (a.m - b0.m) + sg * d).toFixed(decOf(v, b0.sd)); }); return { v, key }; }
  function niStat(D, P) { const N = G.ni || {}, v = D.vars.find(x => x.id === N.v); if (!v || v.type !== 'num' || K(D) < 2 || !(+N.margin > 0)) return null; const key = sigKey(D, v), M = +N.margin, sg = N.better === 'lower' ? -1 : 1;
    const xs = g => P.filter(p => p.g === g).map(p => (p.vals[v.id] || {})[key]).filter(x => x != null && x !== '' && isFinite(+x)).map(Number), a = xs(0), b = xs(1); if (a.length < 2 || b.length < 2) return null;
    const mn = x => x.reduce((s0, y) => s0 + y, 0) / x.length, ss = (x, m) => x.reduce((s0, y) => s0 + (y - m) ** 2, 0), m0 = mn(a), m1 = mn(b), df = a.length + b.length - 2, sp = Math.sqrt((ss(a, m0) + ss(b, m1)) / df), se = sp * Math.sqrt(1 / a.length + 1 / b.length), tc = jStat.studentt.inv(0.975, df);
    const diff = sg * (m1 - m0), lo = diff - tc * se, hi = diff + tc * se, verdict = lo > 0 ? 'superior' : lo > -M ? 'noninf' : hi < -M ? 'inferior' : 'inconcl';
    const sd0 = numParams(v, 0, key).sd, se0 = sd0 * Math.sqrt(1 / Math.max(1, P.filter(p => p.g === 0).length) + 1 / Math.max(1, P.filter(p => p.g === 1).length)), tru = { noninf: 0, inferior: -1.6 * M, inconcl: -M }[N.scen] ?? 0;
    return { v, key, M, diff, lo, hi, verdict, n0: a.length, n1: b.length, power: jStat.normal.cdf((tru + M) / se0 - 1.959964, 0, 1), pNI: 1 - jStat.studentt.cdf((diff + M) / se, df) }; }
  // the special designs: cluster randomised (cluster column, intraclass correlation), stepped-wedge, crossover; and real-world quirks
  function designs(D, P, seed, opt) {
    const vv = id => D.vars.find(x => x.id === id), rq = B.prng((seed + 77003) >>> 0), nz = () => { let u = 0; while (!u) u = rq(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rq()); };
    const sites = (D.sites || []).filter(x => x && x.name), nCl = Math.max(1, ...P.map(p => (p.__cl ?? 0) + 1)), clName = c => sites.length >= 2 && sites[c] ? sites[c].name : `Cluster ${String(c + 1).padStart(2, '0')}`;
    const C = G.clus || {}, SW = G.sw || {}, XO = G.xo || {}, Q = G.quirk || {}, info = {}, clip = (v, x) => { if (v.min !== '' && v.min !== undefined && isFinite(+v.min)) x = Math.max(+v.min, x); if (v.max !== '' && v.max !== undefined && isFinite(+v.max)) x = Math.min(+v.max, x); return x; };
    const effs = () => { const be = [...Array(nCl)].map(() => nz()), m = be.reduce((a, c) => a + c, 0) / nCl, sd = Math.sqrt(be.reduce((a, c) => a + (c - m) ** 2, 0) / Math.max(1, nCl - 1)) || 1; return be.map(x => (x - m) / sd); };
    const cv = vv(C.v); if (cv && (C.on || SW.on)) P.forEach(p => { const c = p.__cl ?? 0; p.vals[cv.id] = { [visitKeys(D, cv)[0]]: cv.type === 'num' ? c + 1 : cv.type === 'cat' && cv.cats.length >= nCl ? (D.conv.catAs === 'codes' ? c + 1 : cv.cats[c]) : clName(c) }; });
    // cluster randomised: the patients of a cluster are alike (every number, the intraclass correlation asked)
    const icc = Math.min(0.6, Math.max(0, +C.icc || 0)); if (C.on && icc > 0 && nCl >= 2) { const be = effs(); D.vars.filter(v => v.type === 'num' && v.id !== C.v).forEach(v => P.forEach(p => { const o = p.vals[v.id]; if (!o) return; Object.keys(o).forEach(key => { if (o[key] == null) return; const a = numParams(v, p.g, key); o[key] = +clip(v, +o[key] + be[p.__cl] * a.sd * Math.sqrt(icc / (1 - icc))).toFixed(decOf(v, a.sd)); }); })); }
    // stepped-wedge: every cluster starts on the control and moves to the intervention at its step (one visit after another); the groups of the design are not used for this outcome
    const sv = vv(SW.v); if (SW.on && sv && sv.type === 'num' && visitKeys(D, sv).length >= 2 && nCl >= 2) { const keys = visitKeys(D, sv), T = keys.length, order = [...Array(nCl)].map((_, c) => c); for (let i = nCl - 1; i > 0; i--) { const j = Math.floor(rq() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      const step = {}; order.forEach((c, j) => { step[c] = 1 + Math.floor(j * (T - 1) / nCl); }); const ic2 = Math.min(0.6, Math.max(0, +SW.icc || 0)), be = effs(), ind = vv(SW.ind);
      P.forEach(p => { const o = p.vals[sv.id] = p.vals[sv.id] || {}, st = step[p.__cl]; keys.forEach((key, t) => { if (o[key] == null) return; const a = numParams(sv, p.g, key), b0 = numParams(sv, 0, key); o[key] = +clip(sv, +o[key] - (a.m - b0.m) + (t >= st ? +SW.eff || 0 : 0) + (+SW.trend || 0) * t + be[p.__cl] * b0.sd * Math.sqrt(ic2 / (1 - ic2))).toFixed(decOf(sv, b0.sd)); });
        if (ind) p.vals[ind.id] = Object.fromEntries(visitKeys(D, ind).map(k2 => { const t = keys.indexOf(k2); return [k2, t >= 0 && t >= st ? yesOf(D, ind) : noOf(D, ind)]; })); });
      info.sw = { step, keys, names: [...Array(nCl)].map((_, c) => clName(c)) }; }
    // crossover (AB / BA): the first group takes A then B, the second B then A; a patient's own level, a period effect and a carry-over of B into the second period
    const xv = vv(XO.v); if (XO.on && xv && xv.type === 'num' && visitKeys(D, xv).length >= 2) { const [k1, k2] = visitKeys(D, xv), b1 = numParams(xv, 0, k1), sd = b1.sd, r = Math.min(0.95, Math.max(0, +XO.r || 0)), dd = decOf(xv, sd), sq = vv(XO.seq);
      P.forEach(p => { const ba = p.g % 2 === 1, s0 = Math.sqrt(r) * sd * nz(), e = () => Math.sqrt(1 - r) * sd * nz(), y1 = b1.m + s0 + e() + (ba ? +XO.eff || 0 : 0), y2 = b1.m + (+XO.period || 0) + s0 + e() + (ba ? +XO.carry || 0 : +XO.eff || 0);
        p.vals[xv.id] = { ...(p.vals[xv.id] || {}), [k1]: +clip(xv, y1).toFixed(dd), [k2]: +clip(xv, y2).toFixed(dd) };
        if (sq) p.vals[sq.id] = { [visitKeys(D, sq)[0]]: sq.type === 'cat' && sq.cats.length >= 2 ? (D.conv.catAs === 'codes' ? (ba ? 2 : 1) : sq.cats[ba ? 1 : 0]) : sq.type === 'num' ? (ba ? 2 : 1) : (ba ? 'BA' : 'AB') }; });
      info.xo = { v: xv, k1, k2 }; }
    // real-world quirks: weekend enrolment rare, a seasonal swing, a new device part-way through, a site that rounds
    if (Q.weekday || +Q.season || +Q.device || Q.roundSite) { const dts = D.vars.filter(v => v.type === 'date' && !/birth/i.test(v.label)), enrol = p => dts.map(v => firstVal(p, v.id)).filter(Boolean).sort()[0], qn = D.vars.filter(v => v.type === 'num' && (!Q.v || Q.v === v.id) && v.id !== C.v);
      if (Q.weekday) P.forEach(p => { const e0 = enrol(p); if (!e0) return; const wd = new Date(e0 + 'T00:00:00Z').getUTCDay(), sh = wd === 5 ? (rq() < 0.5 ? 2 : 3) : wd === 6 && rq() < 0.6 ? 1 : 0; if (!sh) return;
        dts.forEach(v => { const o = p.vals[v.id]; if (o) Object.keys(o).forEach(k2 => { if (o[k2]) o[k2] = new Date(Date.parse(o[k2]) + sh * 864e5).toISOString().slice(0, 10); }); }); });
      const t0 = Date.parse(G.start || '2026-01-01'), cut = t0 + Math.max(0, Math.min(100, +Q.deviceAt || 50)) / 100 * (+G.span || 365) * 864e5, dayOf = key => { const vi = D.visits.find(x => x.id === key); return vi && vi.day !== '' && isFinite(+vi.day) ? +vi.day : 0; };
      P.forEach(p => { const e0 = enrol(p), te = e0 ? Date.parse(e0) : NaN; qn.forEach(v => { const o = p.vals[v.id]; if (!o) return; Object.keys(o).forEach(key => { if (o[key] == null || !isFinite(+o[key])) return; const a = numParams(v, p.g, key), dd = decOf(v, a.sd); let x = +o[key];
        if (+Q.season && isFinite(te)) { const doy = (te + dayOf(key) * 864e5 - Date.UTC(new Date(te).getUTCFullYear(), 0, 1)) / 864e5; x += +Q.season * a.sd * Math.cos(2 * Math.PI * (doy - 15) / 365); }
        if (+Q.device && isFinite(te) && te + dayOf(key) * 864e5 >= cut) x *= 1 + +Q.device / 100;
        if (Q.roundSite && p.site === Q.roundSite) { const rt = +Q.roundTo > 0 ? +Q.roundTo : 5; x = Math.round(x / rt) * rt; o[key] = +clip(v, x).toFixed(Math.max(0, (String(rt).split('.')[1] || '').length)); return; }
        o[key] = +clip(v, x).toFixed(dd); }); }); }); }
    if (!opt.plain) dInfo = info; }
  function generate(D, opt = {}) {
    if (!opt.stage1 && !opt.plain) SIG = sigTargets(D); else if (opt.plain) SIG = {};
    const rnd = B.prng((+opt.seed || +G.seed || 1) >>> 0), norm = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
    const n = Math.max(2, +G.n || +D.n || 60), A = arms(D), k = K(D), rho = Math.min(0.95, Math.max(0, +G.visitR || 0));
    // groups: the randomisation list of the design, or the ratio (e.g. 1:1, 2:1), shuffled
    let grp = [];
    const sites = (D.sites || []).filter(x => x && x.name), per = sites.length ? Math.ceil(n / sites.length) : n;
    // patients per site: equal, or by the weights asked (e.g. 3, 1, 1)
    const sw = String((G.recruit || {}).siteW || '').split(/[,;\s:]+/).map(Number).filter(x => x > 0), siteN = sites.length ? (sw.length === sites.length ? (() => { const tot = sw.reduce((a, b) => a + b, 0), c = sw.map(w => Math.floor(n * w / tot)); let r0 = n - c.reduce((a, b) => a + b, 0); for (let k2 = 0; r0 > 0; k2 = (k2 + 1) % c.length, r0--) c[k2]++; return c; })() : sites.map((_, k2) => Math.max(0, Math.min(per, n - k2 * per)))) : [];
    const siteStart = siteN.map((_, k2) => siteN.slice(0, k2).reduce((a, b) => a + b, 0)), siteOfI = i => { let k2 = 0; while (k2 < siteN.length - 1 && i >= siteStart[k2 + 1]) k2++; return k2; };
    if (opt.groups) grp = [...opt.groups]; else {
    if (A.length >= 2) { if (D.rand && D.rand.on && !(D.rand.strata || []).length) { const rl = B.randomisation({ ...D, n }); grp = (sites.length && rl.length === sites.length ? rl.flatMap(r => r.list.slice(0, per)).slice(0, n) : rl[0].list).map(a => A.indexOf(a)); }
      else { const r = String(G.ratio || A.map(() => 1).join(':')).split(/[:,/ ]+/).map(Number).map(x => x > 0 ? x : 1), tot = r.slice(0, A.length).reduce((a, b) => a + b, 0) || A.length;
        A.forEach((_, i) => { const m = Math.round(n * (r[i] || 1) / tot); for (let j = 0; j < m; j++) grp.push(i); }); while (grp.length < n) grp.push(grp.length % A.length); grp = grp.slice(0, n);
        for (let i = grp.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [grp[i], grp[j]] = [grp[j], grp[i]]; } } }
    else grp = Array(n).fill(0); }
    // a cluster randomised trial: whole clusters (the sites, or clusters made here) are given one group each
    const nCl = sites.length >= 2 ? sites.length : Math.max(2, Math.min(n, +(G.clus || {}).n || 8)), clOf = i => sites.length >= 2 ? siteOfI(i) : Math.floor(i * nCl / n);
    if (!opt.groups && (G.clus || {}).on && A.length >= 2) { const arm = [...Array(nCl)].map((_, c) => c % A.length); for (let i = arm.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [arm[i], arm[j]] = [arm[j], arm[i]]; } grp = grp.map((_, i) => arm[clOf(i)]); }
    const vars = D.vars, lat = vars.map(() => null), P = [];
    for (let i = 0; i < n; i++) {
      // a patient's level of each variable (the same patient across visits), linked between variables where asked
      const u = {}; vars.forEach(v => { u[v.id] = norm(); });
      // the items of a scale answer together (a shared level of the patient)
      if (vars.some(v => v.scale)) { const sh = {}; vars.forEach(v => { if (!v.scale) return; const s0 = sh[v.scale] ?? (sh[v.scale] = norm()), w = scaleW(D, v.scale); u[v.id] = Math.sqrt(w) * s0 + Math.sqrt(1 - w) * u[v.id]; }); }
      corrAll(D).forEach(c => { if (u[c.a] === undefined || u[c.b] === undefined) return; const r = Math.max(-0.95, Math.min(0.95, +c.r || 0)); u[c.b] = r * u[c.a] + Math.sqrt(1 - r * r) * u[c.b]; });
      const g = grp[i], vals = {}, p0s = {}, vsh = {};
      vars.forEach(v => { if (!['num', 'yn', 'cat', 'multi'].includes(v.type)) return; const o = vals[v.id] = {};
        const keys = visitKeys(D, v); keys.forEach(key => { const nv = keys.length === 1 ? 0 : norm(), z = keys.length === 1 ? u[v.id] : Math.sqrt(rho) * u[v.id] + Math.sqrt(1 - rho) * (v.scale ? (() => { const w = scaleW(D, v.scale), s1 = (vsh[v.scale + '|' + key] ??= norm()); return Math.sqrt(w) * s1 + Math.sqrt(1 - w) * nv; })() : nv); // one measurement: the patient's own level
          if (v.type === 'multi') { const pc = expect(v).pct || []; o[key] = v.cats.filter((c, ci) => rnd() * 100 < (isFinite(+pc[ci]) ? +pc[ci] : 20)); return; }
          if (v.type === 'num') { const np = numParams(v, g, key), m = np.m, sd = np.sd, e = { dist: np.dist }; let x;
            const ln = zz => { const s2 = Math.log(1 + sd * sd / (m * m)); return Math.exp(Math.log(m) - s2 / 2 + Math.sqrt(s2) * zz); };
            // normal; skewed to the right (log-normal); skewed to the left (its mirror image); uniform (the same mean and SD)
            const zp = Math.min(0.9, Math.max(0, (+G.zpct[v.id] || 30) / 100));
            const draw = zz => { if (e.dist === 'poisson' || e.dist === 'negbin') return countQ(jStat.normal.cdf(zz, 0, 1), Math.max(0.01, m), e.dist === 'negbin' ? sd : 0);
              if (e.dist === 'bimodal') { const uu = jStat.normal.cdf(zz, 0, 1), w2 = uu < 0.5 ? -1 : 1, q = normInv(uu < 0.5 ? Math.max(1e-9, 2 * uu) : Math.min(1 - 1e-9, 2 * uu - 1)); return m + sd * (0.9 * w2 + 0.436 * q); }
              if (e.dist === 'zeroinf') { const uu = jStat.normal.cdf(zz, 0, 1); if (uu < zp) return Math.max(0, np.lo ?? 0); const m1 = m / (1 - zp), sd1 = Math.max(0.01, sd * 0.7), s2 = Math.log(1 + sd1 * sd1 / (m1 * m1)); return Math.exp(Math.log(m1) - s2 / 2 + Math.sqrt(s2) * normInv((uu - zp) / (1 - zp))); }
              if (e.dist === 'skewed' && m > 0) return ln(zz); if (e.dist === 'lskew' && m > 0) return 2 * m - ln(-zz); if (e.dist === 'uniform') return m + sd * Math.sqrt(3) * (2 * jStat.normal.cdf(zz, 0, 1) - 1); return m + sd * zz; };
            x = draw(z);
            // the simulated Min and Max of the design: a value outside is drawn again (a truncated distribution), then kept within them
            const lo = np.lo, hi = np.hi;
            // patient-level trajectories: a slope of its own over the visits (SD of the change from the first to the last visit)
            if (+G.slope[v.id] > 0 && keys.length > 1) { const sl = (p0s[v.id] ??= norm() * +G.slope[v.id]); x += sl * keys.indexOf(key) / (keys.length - 1); }
            const pile = e.dist === 'ceiling' || e.dist === 'floor'; if (pile) { const L2 = limits(v, 'both'); if (e.dist === 'ceiling' && L2.hi !== null) x = Math.min(L2.hi, x); if (e.dist === 'floor' && L2.lo !== null) x = Math.max(L2.lo, x); }
            if (!pile && (lo !== null || hi !== null)) { for (let t = 0; t < 30 && ((lo !== null && x < lo) || (hi !== null && x > hi)); t++) x = draw(norm()); if (lo !== null) x = Math.max(lo, x); if (hi !== null) x = Math.min(hi, x); }
            if (v.min !== '' && isFinite(+v.min)) x = Math.max(+v.min, x); if (v.max !== '' && isFinite(+v.max)) x = Math.min(+v.max, x);
            const dd = e.dist === 'poisson' || e.dist === 'negbin' ? 0 : decOf(v, sd), rr = +G.round[v.id] || 0; if (rr > 0) { x = Math.round(x / rr) * rr; o[key] = +x.toFixed(Math.max(0, (String(rr).split('.')[1] || '').length)); } else o[key] = +x.toFixed(dd); }
          else { const p = target(v, g, key), zz = yesFirst(v) ? -z : z; let c = 0, cum = 0; for (; c < p.length - 1; c++) { cum += p[c]; if (zz <= normInv(cum)) break; } o[key] = D.conv.catAs === 'codes' ? c + 1 : v.cats[c]; } }); });
      // free text: plausible words for the text columns (by their names), drawn from their own stream so that the other values do not change
      if (G.freeText !== false) vars.filter(v => v.type === 'text').forEach(v => { const tl = TEXT_LIB.find(([re]) => re.test(v.label)); if (!tl) return; const rt = B.prng((hashOf(v.id) + 7 * i + (+opt.seed || +G.seed || 1)) >>> 0), keys = visitKeys(D, v);
        vals[v.id] = Object.fromEntries(keys.map(k2 => [k2, rt() < tl[2] ? tl[1][Math.floor(rt() * tl[1].length)] : null])); });
      // dates: one after the other (days after the previous date of the sheet), from the day of enrolment
      const span = +G.span || 365, pat = (G.recruit || {}).pattern || 'steady', u0 = rnd();
      let day = pat === 'slow' ? span * Math.sqrt(u0) : pat === 'fast' ? span * (1 - Math.sqrt(1 - u0)) : u0 * span;
      if (pat === 'seasonal') { let t = 0; while (t++ < 40 && rnd() > (1 + 0.7 * Math.sin(2 * Math.PI * day / 365)) / 1.7) day = rnd() * span; }
      let prev = Date.parse(G.start || '2026-01-01') + Math.floor(day) * 864e5;
      // in the clinical order of events, whatever their order in the sheet: birth, enrolment / admission, surgery, discharge, follow-up, death
      const rank = v => { const l = v.label.toLowerCase(); return /birth/.test(l) ? 0 : /enrol|recruit|consent/.test(l) ? 1 : /admission|admit/.test(l) ? 2 : /surgery|operation|procedure|injection|intervention/.test(l) ? 3 : /discharge/.test(l) ? 5 : /follow|visit/.test(l) ? 6 : /death|died/.test(l) ? 8 : 4; };
      vars.filter(v => v.type === 'date').map((v, i) => [v, i]).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).map(x => x[0]).forEach((v, di) => { const e = expect(v), gap = di === 0 && /enrol|admission|birth/i.test(v.label) ? 0 : Math.max(0, Math.round((+e.mean || 0) + (+e.sd || 0) * norm()));
        let t = prev + gap * 864e5; if (/birth/i.test(v.label)) t = prev - Math.round((target({ ...v, type: 'num', expect: { mean: 50 } }, 0, 'once') + 12 * norm()) * 365.25) * 864e5; else prev = t;
        vals[v.id] = { once: new Date(t).toISOString().slice(0, 10) }; });
      // skip logic: not asked (empty) unless the other variable has the category
      vars.forEach(v => { if (!v.when || !v.when.v || !vals[v.id]) return; const pv = D.vars.find(x => x.id === v.when.v); if (!pv) return; const pval = vals[pv.id] || {}, want = D.conv.catAs === 'codes' ? pv.cats.indexOf(v.when.cat) + 1 : v.when.cat;
        Object.keys(vals[v.id]).forEach(key => { const x = pval[key] ?? pval.once ?? pval[D.visits[0].id]; if (x !== want) vals[v.id][key] = null; }); });
      const si = sites.length ? siteOfI(i) : -1, firstI = si >= 0 ? siteStart[si] : 0;
      P.push({ id: si >= 0 ? `${sites[si].prefix || ''}${String(i - firstI + 1).padStart(+D.idDigits || 3, '0')}` : `${D.idPrefix || ''}${String(i + 1).padStart(+D.idDigits || 3, '0')}`, site: si >= 0 ? sites[si].name : undefined, g, group: A.length >= 2 ? A[g] : null, vals });
    }
    P.forEach((p, i) => { p.__cl = clOf(i); });
    if (opt.stage1) return P;
    adjust(D, P, opt);
    if (G.exact && !opt.plain) exactMatch(D, P, opt);
    // calculated columns (also written as Excel formulas)
    const num = x => (typeof x === 'number' && isFinite(x) ? x : NaN), days = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5;
    P.forEach(p => vars.filter(v => v.type === 'calc' && v.formula).forEach(v => { const f = v.formula, o = p.vals[v.id] = {}, at = (id, key) => { const x = p.vals[id] || {}; return x[key] ?? x.once ?? x[D.visits[0].id]; };
      visitKeys(D, v).forEach(key => { let r = null;
        if (f.kind === 'bmi') { const w = num(at(f.a, key)), h = num(at(f.b, key)); if (w > 0 && h > 0) r = +(w / (h / 100) ** 2).toFixed(1); }
        if (f.kind === 'days') { const a = at(f.a, key), b = at(f.b, key); if (a && b) r = Math.round(days(a, b)); }
        if (f.kind === 'age') { const a = at(f.a, key), b = f.b ? at(f.b, key) : new Date().toISOString().slice(0, 10); if (a && b) r = Math.floor(days(a, b) / 365.25); }
        if (f.kind === 'pct') { const x = p.vals[f.a] || {}, ks = Object.keys(x); if (ks.length > 1) { const a = num(x[ks[0]]), b = num(x[ks[ks.length - 1]]); if (isFinite(a) && isFinite(b) && a !== 0) r = +((b - a) / a * 100).toFixed(1); } }
        if (!['bmi', 'days', 'age', 'change', 'pct'].includes(f.kind) && !((f.kind === 'sum' || f.kind === 'mean') && !(f.rev || []).length)) { const r2 = B.calcValue(D, v, f, id => at(id, key)); if (r2 !== undefined) r = r2; }
        if (f.kind === 'change') { const x = p.vals[f.a] || {}, ks = Object.keys(x); if (ks.length > 1) { const a = num(x[ks[0]]), b = num(x[ks[ks.length - 1]]); if (isFinite(a) && isFinite(b)) r = +(b - a).toFixed(2); } }
        if ((f.kind === 'sum' || f.kind === 'mean') && (f.list || []).length && !(f.rev || []).length) { const xs = f.list.map(id => num(at(id, key))); if (xs.every(isFinite)) { const s = xs.reduce((a, b) => a + b, 0); r = +(f.kind === 'sum' ? s : s / xs.length).toFixed(2); } }
        o[key] = r; }); }));
    // rules between columns (e.g. discharge ≥ admission) are kept
    P.forEach(p => (D.checks || []).forEach(ch => { const a = p.vals[ch.a], b = p.vals[ch.b]; if (!a || !b) return; Object.keys(a).forEach(key => { const bv = b[key] ?? b.once; let av = a[key]; if (av == null || bv == null) return;
      const isD = typeof av === 'string', x = isD ? Date.parse(av) : av, y = isD ? Date.parse(bv) : bv, ok = { '>': x > y, '>=': x >= y, '<': x < y, '<=': x <= y, '=': x === y }[ch.op]; if (ok !== false) return;
      const step = isD ? 864e5 : 1, nv = ch.op === '>' ? y + step : ch.op === '<' ? y - step : y; a[key] = isD ? new Date(nv).toISOString().slice(0, 10) : nv; }); }));
    // missing values, dropouts (the later visits of a patient are missing), outliers
    const VK = D.visits.map(x => x.id);
    P.forEach(p => { const drop = (D.visits.length > 1 && rnd() * 100 < (+G.dropout || 0) ? 1 + Math.floor(rnd() * (D.visits.length - 1)) : 0) || p.__drop || 0;
      vars.forEach(v => { const o = p.vals[v.id]; if (!o) return; Object.keys(o).forEach(key => { const vi = VK.indexOf(key);
        if (drop && vi >= drop && !devKeep.has(v.id)) { o[key] = null; return; }
        const pm = (G.miss[v.id] !== undefined && G.miss[v.id] !== '' ? +G.miss[v.id] : +G.missAll || 0) * missWeight(D, p, v, key); if (v.type !== 'calc' && !v.required && rnd() * 100 < pm) o[key] = null;
        if (v.type === 'num' && o[key] != null && rnd() * 100 < (+G.outliers || 0)) { const m = target(v, p.g, key), sd = sdCell(v, p.g, key); o[key] = +(m + (rnd() < 0.5 && !(+v.min >= 0) ? -4 : 4) * sd).toFixed(decOf(v, sd)); } }); }); });
    // messy entries, for practice in cleaning data: units in cells, typing errors, 999 codes, mixed spelling of categories, duplicated IDs
    if (!opt.stage1) lastErrors = [];
    if (G.messy) { const pm = (+G.messyPct || 3) / 100, E = G.err || {}, rec = (p, v, key, from, to, what) => { lastErrors.push({ id: p.id, col: colName(D, v, key), was: from, now: to, what }); };
      const kinds = v => v.type === 'num' ? [E.units && v.unit && 'units', E.x10 && 'x10', E.c999 && D.conv.missing !== '999' && 'c999', E.comma && 'comma', E.space && 'space'].filter(Boolean) : v.type === 'date' ? [E.date && 'date', E.space && 'space'].filter(Boolean) : [E.caseMix && 'lower', E.caseMix && 'upper', E.caseMix && 'first', E.space && 'space', E.typo && 'typo'].filter(Boolean);
      P.forEach(p => vars.forEach(v => { const o = p.vals[v.id]; if (!o || v.type === 'calc' || v.type === 'multi') return; Object.keys(o).forEach(key => { const x = o[key]; if (x == null || rnd() > pm) return; const ks = kinds(v); if (!ks.length) return; const kd = ks[Math.floor(rnd() * ks.length)]; let y = x;
        if (kd === 'units') y = `${x} ${v.unit}`; if (kd === 'x10') y = +(x * 10).toFixed(2); if (kd === 'c999') y = 999; if (kd === 'comma') y = String(x).replace('.', ','); if (kd === 'space') y = ` ${x} `;
        if (kd === 'date') y = `${String(30 + Math.floor(rnd() * 2)).padStart(2, '0')}/02/${String(x).slice(0, 4)}`; if (kd === 'lower') y = String(x).toLowerCase(); if (kd === 'upper') y = String(x).toUpperCase(); if (kd === 'first') y = String(x).charAt(0);
        if (kd === 'typo') { const t0 = String(x); y = t0.length > 3 ? t0.slice(0, 1) + t0.charAt(2) + t0.charAt(1) + t0.slice(3) : t0 + t0.slice(-1); }
        if (y !== x) { o[key] = y; rec(p, v, key, x, y, { units: 'unit typed in the cell', x10: 'typing error (× 10)', c999: '999 used for missing', comma: 'decimal comma', space: 'extra spaces', date: 'impossible date', lower: 'category in lower case', upper: 'category in capitals', first: 'category abbreviated', typo: 'spelling mistake' }[kd]); } }); }));
      if (E.dup !== false) { const dup = Math.max(1, Math.round(P.length * 0.02)); for (let d = 0; d < dup; d++) { const src = P[Math.floor(rnd() * P.length)]; P.splice(Math.floor(rnd() * P.length), 0, JSON.parse(JSON.stringify(src))); lastErrors.push({ id: src.id, col: 'ID', was: '', now: src.id, what: 'duplicated row' }); } } }
    return P;
  }
  // what was asked for, and what came out (per variable, group and visit)
  function targetsList(D) { const out = []; D.vars.filter(v => ['num', 'yn', 'cat'].includes(v.type)).forEach(v => visitKeys(D, v).forEach(key => { for (let g = 0; g < K(D); g++) { const t = target(v, g, key);
    out.push({ varId: v.id, label: v.label, unit: v.unit, kind: v.type === 'num' ? 'mean' : 'pct', cat: v.type === 'num' ? '' : String(v.cats[0]), visit: key, visitName: visitName(D, key), g, group: arms(D)[g] || 'All patients', target: v.type === 'num' ? +(+t).toFixed(3) : +(t[0] * 100).toFixed(1), sd: v.type === 'num' ? sdCell(v, g, key) : null }); } })); return out; }
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
  // the P value of the main outcome by the test chosen for the power
  function pTestX(D, v, key, P, test) {
    const k = K(D); if (!test || test === 'auto' || !v) return pTest(D, v, key, P);
    const val = (p, kk) => { const x = (p.vals[v.id] || {})[kk]; return x == null || x === '' ? NaN : +x; }, first = visitKeys(D, v)[0], G2 = [...Array(k)].map((_, g) => P.filter(p => p.g === g));
    if (test === 'logrank') { const T0 = G.tte || {}, ev = D.vars.find(x => x.id === T0.ev), tm = D.vars.find(x => x.id === T0.time); if (!ev || !tm || k < 2) return NaN; const ek = visitKeys(D, ev).slice(-1)[0], tk = visitKeys(D, tm).slice(-1)[0], yes = D.conv.catAs === 'codes' ? 1 : ev.cats[0];
      const ts = G2.map(ps => ps.map(p => +(p.vals[tm.id] || {})[tk])), es = G2.map(ps => ps.map(p => (p.vals[ev.id] || {})[ek] === yes)); return Stats.logRank(ts.map((t, g) => t.filter((x, i) => isFinite(x) && es[g][i] !== undefined)), es.map((e, g) => e.filter((x, i) => isFinite(ts[g][i])))).p; }
    if (v.type !== 'num') return pTest(D, v, key, P);
    if (test === 'mw' || test === 'kw') { const gs = G2.map(ps => ps.map(p => val(p, key)).filter(isFinite)); if (gs.some(x => x.length < 2)) return NaN; return k === 2 && test === 'mw' ? Stats.mannWhitney(gs[0], gs[1]).p : Stats.kruskalWallis(gs).p; }
    if (test === 'change' || test === 'ancova') { if (k < 2) return pTest(D, v, key, P); const rows = P.map(p => [p.g, val(p, first), val(p, key)]).filter(r => isFinite(r[1]) && isFinite(r[2]) && r[0] <= 1); if (rows.length < 6) return NaN;
      if (test === 'change') { const a = rows.filter(r => r[0] === 0).map(r => r[2] - r[1]), b = rows.filter(r => r[0] === 1).map(r => r[2] - r[1]); return Stats.tTest(a, b, false).p; }
      // ANCOVA: the last visit on the group and the first visit (ordinary least squares, t test of the group)
      const X = rows.map(r => [1, r[0], r[1]]), y = rows.map(r => r[2]), XtX = [0, 1, 2].map(i => [0, 1, 2].map(j => X.reduce((s2, x) => s2 + x[i] * x[j], 0))), Xty = [0, 1, 2].map(i => X.reduce((s2, x, n2) => s2 + x[i] * y[n2], 0));
      const inv = m => { const a2 = m.map((r, i) => [...r, ...[0, 1, 2].map(j => +(i === j))]); for (let c = 0; c < 3; c++) { let pv = c; for (let r = c + 1; r < 3; r++) if (Math.abs(a2[r][c]) > Math.abs(a2[pv][c])) pv = r; [a2[c], a2[pv]] = [a2[pv], a2[c]]; const d0 = a2[c][c]; if (!d0) return null; for (let j = 0; j < 6; j++) a2[c][j] /= d0; for (let r = 0; r < 3; r++) if (r !== c) { const f = a2[r][c]; for (let j = 0; j < 6; j++) a2[r][j] -= f * a2[c][j]; } } return a2.map(r => r.slice(3)); };
      const Ii = inv(XtX); if (!Ii) return NaN; const bt = Ii.map(r => r.reduce((s2, x, j) => s2 + x * Xty[j], 0)), res2 = y.reduce((s2, yy, n2) => s2 + (yy - X[n2].reduce((a, x, j) => a + x * bt[j], 0)) ** 2, 0), df = rows.length - 3, se = Math.sqrt(res2 / df * Ii[1][1]);
      return 2 * (1 - jStat.studentt.cdf(Math.abs(bt[1] / se), df)); }
    return pTest(D, v, key, P);
  }
  // several outcomes at once: the chance that all, or any, come out significant (with an adjustment)
  function multiPower(D, reps) { const ids = (G.power.multi || []).filter(id => D.vars.some(v => v.id === id)); if (ids.length < 2) return 'Tick two outcomes or more.'; const alpha = +G.power.alpha || 0.05, adj = G.power.adj || 'none', vs = ids.map(id => D.vars.find(v => v.id === id));
    let all = 0, any = 0, done = 0; const each = vs.map(() => 0);
    for (let r = 0; r < reps; r++) { const P = generate(D, { seed: (+G.seed || 1) + 7919 * (r + 1), plain: true }), ps = vs.map(v => pTest(D, v, sigKey(D, v), P)); if (ps.some(p => !isFinite(p))) continue; done++;
      const m = ps.length, o = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]), sig = new Array(m).fill(false);
      if (adj === 'bonferroni') ps.forEach((p, i) => { sig[i] = p < alpha / m; }); else if (adj === 'holm') { for (let j = 0; j < m; j++) { if (o[j][0] < alpha / (m - j)) sig[o[j][1]] = true; else break; } } else ps.forEach((p, i) => { sig[i] = p < alpha; });
      if (sig.every(Boolean)) all++; if (sig.some(Boolean)) any++; sig.forEach((x, i) => { if (x) each[i]++; }); }
    if (!done) return 'The tests could not be run.'; const pc = x => `${Math.round(100 * x / done)}%`;
    return `<b>All ${vs.length} significant: ${pc(all)}</b> · at least one: ${pc(any)} · each: ${vs.map((v, i) => `${esc(v.label)} ${pc(each[i])}`).join(', ')} — ${done} simulated studies, ${adj === 'none' ? 'no adjustment' : adj === 'holm' ? 'Holm adjustment' : 'Bonferroni adjustment'}.`; }
  // interim analyses with O'Brien-Fleming boundaries (two-sided 0.05): how often the trial stops early, the power and the type I error
  const OBF = { 2: [2.797, 1.977], 3: [3.471, 2.454, 2.004], 4: [4.049, 2.863, 2.337, 2.024] };
  function interimSim(D, reps) { const v = D.vars.find(x => x.id === G.power.v); if (!v) return 'Choose the main outcome first.'; const L = Math.min(4, Math.max(2, +G.interim.looks || 2)), bd = OBF[L], key = G.power.visit || visitKeys(D, v).slice(-1)[0];
    const run = (nullCase) => { const keep = JSON.stringify({ t: G.targets[v.id], rt: G.rt[v.id] }); if (nullCase) { delete G.targets[v.id]; delete G.rt[v.id]; }
      let rej = 0, done = 0, nSum = 0; const stopAt = new Array(L).fill(0);
      try { for (let r = 0; r < reps; r++) { const P = generate(D, { seed: (+G.seed || 1) + 7919 * (r + 1) + (nullCase ? 31 : 0), plain: true }); let stopped = -1;
          for (let l = 0; l < L; l++) { const sub = P.slice(0, Math.round(P.length * (l + 1) / L)), p = pTestX(D, v, key, sub, G.power.test); if (!isFinite(p)) continue; const z = normInv(1 - p / 2); if (z >= bd[l]) { stopped = l; break; } }
          done++; if (stopped >= 0) { rej++; stopAt[stopped]++; nSum += Math.round(P.length * (stopped + 1) / L); } else nSum += P.length; } }
      finally { const k0 = JSON.parse(keep); if (k0.t) G.targets[v.id] = k0.t; if (k0.rt) G.rt[v.id] = k0.rt; }
      return { rej: rej / done, stopAt: stopAt.map(x => x / done), en: nSum / done }; };
    const a = run(false), b = run(true), pc = x => `${(100 * x).toFixed(0)}%`;
    return `<b>${L} looks (O'Brien-Fleming, z ≥ ${bd.join(', ')}):</b> power ${pc(a.rej)}, stopped early ${pc(a.stopAt.slice(0, -1).reduce((x, y) => x + y, 0))} (${a.stopAt.slice(0, -1).map((x, i) => `look ${i + 1}: ${pc(x)}`).join(', ')}), expected number of patients ${Math.round(a.en)} · <b>type I error</b> with no difference: ${pc(b.rej)} — ${reps} simulated studies each.`; }
  // G19: the same study many times: the spread of each variable's P value and effect
  function variability(D, reps) { const vs = D.vars.filter(v => ['num', 'yn', 'cat'].includes(v.type) && (K(D) >= 2 || visitKeys(D, v).length > 1)), alpha = +G.power.alpha || 0.05, R0 = vs.map(() => ({ ps: [], es: [] }));
    for (let r = 0; r < reps; r++) { const P = generate(D, { seed: (+G.seed || 1) + 7919 * (r + 1), plain: true });
      vs.forEach((v, i) => { const key = sigKey(D, v), p = pTest(D, v, key, P); R0[i].ps.push(p); const t = targetsList(D).filter(x => x.varId === v.id && x.visit === key); if (t.length >= 2) { const o = t.map(x => observed(D, P, x)); if (o[0].n && o[1].n) R0[i].es.push(o[1].m - o[0].m); } }); }
    const q = (xs, f) => { const a = xs.filter(isFinite).sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(f * a.length))] : NaN; }, f2 = x => isFinite(x) ? (+x).toFixed(Math.abs(x) < 10 ? 2 : 1) : '—';
    return `<div class="tbl-wrap" style="max-height:360px"><table class="t"><thead><tr><th>Variable</th><th>% significant</th><th>P value (median, 5th–95th centile)</th><th>Difference${K(D) >= 2 ? ' (group 2 − 1)' : ''}: median (2.5th–97.5th)</th></tr></thead><tbody>${vs.map((v, i) => { const ps = R0[i].ps.filter(isFinite);
      return `<tr><td>${esc(v.label)}</td><td>${ps.length ? Math.round(100 * ps.filter(p => p < alpha).length / ps.length) + '%' : '—'}</td><td>${f2(q(ps, 0.5))} (${f2(q(ps, 0.05))}–${f2(q(ps, 0.95))})</td><td>${R0[i].es.length ? `${f2(q(R0[i].es, 0.5))} (${f2(q(R0[i].es, 0.025))} to ${f2(q(R0[i].es, 0.975))})` : '—'}</td></tr>`; }).join('')}</tbody></table></div>
      <p class="legend-note">${reps} studies of ${+G.n || +D.n || 60} patients with the same settings: the P value of one study is only one draw of these.</p>`; }
  // G20: saved scenarios side by side: the main outcome's targets and the power of each
  function compareScenarios(D, reps) { const sc = scenarios(), names = Object.keys(sc); if (!names.length) return 'Save scenarios first (💾 Save as…).'; const keep = JSON.stringify(G), out = [];
    try { names.forEach(nm => { G = { ...defaults(), ...JSON.parse(JSON.stringify(sc[nm])) }; const v = D.vars.find(x => x.id === G.power.v); if (!v) { out.push([nm, '—', '—', 'no main outcome']); return; } const key = G.power.visit || visitKeys(D, v).slice(-1)[0];
        const t = targetsList(D).filter(x => x.varId === v.id && x.visit === key).map(x => `${x.group} ${x.kind === 'mean' ? (+x.target).toFixed(2) : x.target + '%'}`).join(' vs '), keepReps = G.power.reps; G.power.reps = reps; const pw = /Power ≈ (\d+)%/.exec(power(D)); G.power.reps = keepReps;
        out.push([nm, `${+G.n || +D.n || 60}`, `${esc(v.label)}: ${esc(t)}`, pw ? pw[1] + '%' : '—']); }); }
    finally { G = JSON.parse(keep); }
    return `<table class="t"><thead><tr><th>Scenario</th><th>Patients</th><th>Main outcome (targets)</th><th>Power</th></tr></thead><tbody>${out.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="legend-note">${reps} simulated studies per scenario.</p>`; }
  // G22: the simulated data as CSV (one row per patient, or one per patient and visit)
  async function csvOut(D, long) { const wb = XLSX.read(await B.buildWorkbook(D, fill(D)).arrayBuffer(), { type: 'array' }), aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: true }).slice(1);
    let rows = aoa; if (long && D.visits.length > 1) { const head = aoa[0], tags = D.visits.map(x => B.tagOf(x.name)), base = new Map(); head.forEach((h, i) => { const t = tags.find(t0 => String(h).endsWith('_' + t0)); const nm = t ? String(h).slice(0, -t.length - 1) : h; base.set(i, [nm, t || null]); });
      const once = [...base.entries()].filter(([, [, t]]) => !t).map(([i, [nm]]) => [i, nm]), rep = [...new Set([...base.values()].filter(([, t]) => t).map(([nm]) => nm))];
      rows = [[...once.map(x => x[1]), 'Visit', ...rep]]; aoa.slice(1).forEach(r => tags.forEach((t, vi) => rows.push([...once.map(([i]) => r[i]), D.visits[vi].name, ...rep.map(nm => { const i = [...base.entries()].find(([, [n2, t2]]) => n2 === nm && t2 === t); return i ? r[i[0]] : ''; })]))); }
    const q = x => { const t = x instanceof Date ? x.toISOString().slice(0, 10) : String(x ?? ''); return /[",\n]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t; };
    U.saveUrl(URL.createObjectURL(new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' })), `Simulated - ${B.fileBase()}${long ? ' - long' : ''}.csv`); toast(`CSV saved (${rows.length - 1} rows)`); }
  // G23: the settings of the simulation as a methods page (Word)
  async function methodsDoc(D) { const d = window.docx, { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType } = d, P0 = (t, o = {}) => new Paragraph({ spacing: { after: 100 }, children: [new TextRun({ text: t, bold: o.b, size: o.s || 21, font: 'Calibri' })] });
    const cell = (t, b) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(t ?? ''), bold: b, size: 18, font: 'Calibri' })] })] }), A = arms(D), tl = targetsList(D);
    const vs = D.vars.filter(v => ['num', 'yn', 'cat'].includes(v.type)), rows = vs.map(v => { const t = tl.filter(x => x.varId === v.id); const e = expect(v), how = v.type === 'num' ? `${{ msd: 'mean & SD', range: 'min & max', both: 'mean & SD within min–max' }[modeOf(v)]}, SD ${(+sdOf(v)).toFixed(2)}${Object.keys(G.sdt[v.id] || {}).length ? ' (own SD for some groups / visits)' : ''}, ${G.dist[v.id] || e.dist || 'normal'}` : '% of each category';
      return [v.label + (v.unit ? ` (${v.unit})` : ''), how, t.map(x => `${x.visitName ? x.visitName + ': ' : ''}${x.group} ${x.kind === 'mean' ? (+x.target).toFixed(2) : x.target + '% ' + x.cat}`).join('; '), G.sig[v.id] ? (G.sig[v.id] === 'sig' ? 'set significant' : 'set not significant') : '', `${G.miss[v.id] !== undefined && G.miss[v.id] !== '' ? G.miss[v.id] : G.missAll}%`]; });
    const txt = [`${+G.n || +D.n || 60} patients were simulated${A.length >= 2 ? ` in ${A.length} groups (${A.join(', ')})` : ''} with the Prof MSE Easy Stat data generator (seed ${G.seed}${last ? `, dataset code ${dataCode(last)}` : ''}).`,
      `Numbers were drawn from the distributions below; a patient's visits were correlated (r = ${G.visitR}); ${(G.corr || []).length ? `${G.corr.length} link${G.corr.length > 1 ? 's' : ''} between variables were set; ` : ''}missing values were ${{ mcar: 'missing completely at random', mar: 'missing at random (depending on another variable)', mnar: 'missing not at random (depending on the value itself)', group: 'more frequent in one group' }[G.missType] || 'at random'} (${G.missAll}% of each variable)${+G.dropout ? `, ${G.dropout}% of patients dropped out` : ''}${+G.outliers ? `, ${G.outliers}% of numbers were outliers` : ''}${G.messy ? ', and messy entries were added for cleaning practice' : ''}.`];
    if ((G.clus || {}).on) txt.push(`Groups were given to whole clusters (cluster randomised), with an intraclass correlation of ${G.clus.icc}.`);
    if ((G.sw || {}).on && G.sw.v) txt.push(`A stepped-wedge design: each cluster moved from the control to the intervention at its own step (effect ${G.sw.eff}, time trend ${G.sw.trend} a visit, intraclass correlation ${G.sw.icc}).`);
    if ((G.xo || {}).on && G.xo.v) txt.push(`A crossover (AB / BA): treatment effect ${G.xo.eff}, period effect ${G.xo.period}, carry-over ${G.xo.carry}, within-patient correlation ${G.xo.r}.`);
    if ((G.ni || {}).v && +G.ni.margin > 0) txt.push(`Non-inferiority: margin ${G.ni.margin}, scenario ${{ noninf: 'non-inferior', inferior: 'inferior', inconcl: 'inconclusive' }[G.ni.scen]}.`);
    if ((G.tte || {}).ev) txt.push(`Times to event were exponential (hazard ratio ${G.tte.hr}, ${G.tte.pev}% events over ${G.tte.fu} days of follow-up, ${G.tte.lost}% censored early).`);
    const doc = new Document({ creator: 'Prof MSE Easy Stat', title: 'Simulation settings', sections: [{ children: [P0(`${D.title || 'Study'} — simulated data: settings`, { b: true, s: 28 }), ...txt.map(t => P0(t)),
      new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: ['Variable', 'Generated by', 'Targets (group, visit)', 'Difference', 'Missing'].map(t => cell(t, true)) }), ...rows.map(r => new TableRow({ children: r.map(t => cell(t)) }))] })] }] });
    U.saveUrl(URL.createObjectURL(await Packer.toBlob(doc)), `Simulated - ${B.fileBase()} - methods.docx`); toast('Simulation methods saved'); }
  // G13: the error key of the messy entries
  function errorKey(D) { if (!lastErrors.length) { toast('No planted errors: tick Messy entries and generate'); return; } const rows = [['Patient ID', 'Column', 'Correct value', 'Value in the sheet', 'Error'], ...lastErrors.map(e => [e.id, e.col, e.was, e.now, e.what])];
    const ws = XLSX.utils.aoa_to_sheet(rows), wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Error key'); XLSX.writeFile(wb, `Simulated - ${B.fileBase()} - error key.xlsx`); toast(`${lastErrors.length} planted errors listed`); }
  function power(D) { const v = D.vars.find(x => x.id === G.power.v); if (!v) return 'Choose the main outcome first.'; const key = G.power.visit || visitKeys(D, v).slice(-1)[0], reps = Math.min(2000, Math.max(20, +G.power.reps || 200)), alpha = +G.power.alpha || 0.05;
    const keep = { messy: G.messy, outliers: G.outliers }; G.messy = false; G.outliers = 0; let hit = 0, done = 0;
    try { for (let r = 0; r < reps; r++) { const p = pTestX(D, v, key, generate(D, { seed: (+G.seed || 1) + 7919 * (r + 1), plain: true }), G.power.test); if (isFinite(p)) { done++; if (p < alpha) hit++; } } } finally { Object.assign(G, keep); }
    if (!done) return 'The test could not be run (check the targets and the groups).'; const pw = hit / done, z = 1.96, den = 1 + z * z / done, c = (pw + z * z / (2 * done)) / den, h = z * Math.sqrt(pw * (1 - pw) / done + z * z / (4 * done * done)) / den;
    const nPer = arms(D).length >= 2 ? `${Math.round((+G.n || +D.n || 60) / K(D))} per group` : `${+G.n || +D.n || 60} patients`;
    return `<b>Power ≈ ${(100 * pw).toFixed(0)}%</b> (95% CI ${(100 * (c - h)).toFixed(0)}–${(100 * (c + h)).toFixed(0)}%) to find a difference in ${esc(v.label)}${key !== 'once' ? ` at ${esc(visitName(D, key))}` : ''} with ${nPer}, at P < ${alpha} — ${done} simulated studies (${v.type === 'num' ? K(D) === 2 ? "Welch's t-test" : K(D) > 2 ? 'one-way ANOVA' : 'paired t-test against the first visit' : 'Chi-square test'}).`; }

  /* ---------- the workspace ---------- */
  const opt = (list, cur) => list.map(([k, l]) => `<option value="${esc(k)}" ${String(cur) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('');
  function render() {
    const w = $('#genWrap'); if (!w) return; const D = D0(), A = arms(D), k = K(D), gl = A.length >= 2 ? A : ['All patients'];
    if (!w.dataset.wired) { w.dataset.wired = 1; w.addEventListener('input', onInput); w.addEventListener('click', onClick); }
    const vs = D.vars.filter(v => ['num', 'yn', 'cat'].includes(v.type)), dates = D.vars.filter(v => v.type === 'date'), calcs = D.vars.filter(v => v.type === 'calc');
    const block = v => `<tr><td>${varHead(D, v)}</td>${gl.map((_, g) => `<td>${cellsOf(D, v, g)}</td>`).join('')}</tr>`;
    const res = last ? targetsList(D).map(t => ({ ...t, o: observed(D, last, t) })) : [];
    w.innerHTML = `<div class="mb-head"><b>🎲 Generate the data</b><span class="legend-note">${esc(D.title || 'Untitled study')} · ${D.vars.length} variables · simulated patients for teaching, testing the analysis and checking the sample size</span><span class="spacer"></span>
        <button class="btn ghost small" type="button" data-gtab="build">‹ Back to the design</button><button class="btn primary small" type="button" id="genSend">📊 Analyse these data ›</button></div>
      <div class="mb-body" style="border-radius:12px;margin-top:10px">
      <div class="gen-scen"><b>Scenarios</b><select data-gscen="1" style="width:auto"><option value="">Open a saved scenario…</option>${Object.keys(scenarios()).map(nm => `<option value="${esc(nm)}">${esc(nm)}</option>`).join('')}</select><button class="btn ghost small" type="button" id="genScenSave" title="Keep these settings under a name (e.g. optimistic, expected, pessimistic)">💾 Save as…</button>${Object.keys(scenarios()).length ? `<button class="btn ghost small" type="button" id="genScenDel">🗑 Delete…</button>` : ''}<button class="btn ghost small" type="button" id="genScenNull" title="The same values in every group for every variable: about 5% of the tests come out significant by chance">∅ No differences (null scenario)</button></div>
      <div class="grid g4">
        <div><label class="f">Number of patients</label><input type="number" min="2" max="20000" data-g="n" value="${esc(G.n)}" placeholder="${esc(D.n)}"></div>
        ${A.length >= 2 ? (D.rand && D.rand.on && !(D.rand.strata || []).length ? `<div><label class="f">Groups</label><div class="legend-note" style="margin-top:8px">From the randomisation list of the design</div></div>` : `<div><label class="f">Group sizes (ratio)</label><input type="text" data-g="ratio" value="${esc(G.ratio)}" placeholder="${A.map(() => 1).join(':')}"></div>`) : '<div><label class="f">Groups</label><div class="legend-note" style="margin-top:8px">One group</div></div>'}
        <div><label class="f">Seed (same seed, same data)</label><div class="row" style="gap:4px"><input type="number" data-g="seed" value="${esc(G.seed)}"><button class="btn ghost small" type="button" id="genSeed" title="A new seed">🎲</button></div></div>
        <div><label class="f">Correlation of a patient's visits</label><input type="number" min="0" max="0.95" step="0.05" data-g="visitR" value="${esc(G.visitR)}"></div></div>
      <h3>Expected values for each group${D.visits.length > 1 ? ' and visit' : ''}</h3>
      <p class="legend-note">Numbers: generated by <b>mean & SD</b> (the SD beside each mean is that group's at that visit; left empty, the variable's SD is used), by <b>min & max</b> (spread between them, centred), or <b>both</b> (mean & SD kept within min–max); yes/no: the % ${esc('Yes')}; categories: the % of each, separated by commas. Empty cells use the expected values of the design (shown in grey) — type different values to make a difference between the groups or a change over the visits.</p> <span class="legend-note">“Significant” or “Not significant” sets the group values (or the change over the visits) so that the difference is clearly there or absent with these patients — the values used are shown after →, and the P value reached after generating.</span>
      ${targetsHtml(D, vs, gl, block)}
      ${dates.length || calcs.length ? `<p class="legend-note">${dates.length ? `Dates (${esc(dates.map(v => v.label).join(', '))}) follow each other from the day of enrolment (study start <input type="date" data-g="start" value="${esc(G.start)}"> over <input type="number" min="1" data-g="span" value="${esc(G.span)}" style="width:70px"> days); the days between them are set in the design. ` : ''}${calcs.length ? `Calculated columns (${esc(calcs.map(v => v.label).join(', '))}) are computed.` : ''}</p>` : ''}
      <h3>Links between variables</h3><p class="legend-note">A correlation between two variables (e.g. age and systolic BP 0.4; diabetes with HbA1c 0.6: a higher value goes with more “Yes”).</p>
      ${(G.corr || []).map((c, i) => `<div class="row" style="gap:6px;margin:4px 0"><select data-gc="${i}|a" style="width:auto">${opt([['', '—'], ...vs.map(v => [v.id, v.label])], c.a)}</select><span>with</span><select data-gc="${i}|b" style="width:auto">${opt([['', '—'], ...vs.map(v => [v.id, v.label])], c.b)}</select><span>r =</span><input type="number" min="-0.95" max="0.95" step="0.05" data-gc="${i}|r" value="${esc(c.r)}" style="width:80px"><button class="btn ghost small" type="button" data-gcdel="${i}">✕</button></div>`).join('')}
      <button class="btn ghost small" type="button" id="genCorrAdd">+ Link</button>
      <label class="check" style="margin:6px 0 0"><input type="checkbox" data-g="labs" ${G.labs ? 'checked' : ''}><span><b>Measurements that go together</b> — laboratory panels and vital signs linked as in real patients (urea with creatinine, ALT with AST, haemoglobin with haematocrit, systolic with diastolic …)</span></label>
      ${G.labs ? `<p class="legend-note">${labPairs(D).map(c => `${esc(D.vars.find(v => v.id === c.a).label)} ↔ ${esc(D.vars.find(v => v.id === c.b).label)} (r ${c.r})`).join(' · ') || 'No such pairs in this design.'}</p>` : ''}
      <h3>Realism <span class="gen-ctl" style="font-weight:400;font-size:13px;margin-left:10px">difficulty ${[['easy', 'Easy', 'Clean data: no missing values, outliers or errors, normal numbers'], ['medium', 'Medium', '5% missing at random, 5% drop out, 1% outliers, skewed times and counts'], ['hard', 'Hard', '12% missing (MAR), 15% drop out, 2% outliers, skewed numbers and messy entries to clean']].map(([k, l, t]) => `<button class="btn ghost small" type="button" data-gdiff="${k}" title="${t}">${l}</button>`).join('')}</span></h3><div class="grid g4">
        <div><label class="f">Missing values (% of every variable)</label><input type="number" min="0" max="90" step="any" data-g="missAll" value="${esc(G.missAll)}"></div>
        <div><label class="f">Patients who drop out (%)</label><input type="number" min="0" max="90" step="any" data-g="dropout" value="${esc(G.dropout)}" ${D.visits.length > 1 ? '' : 'disabled'}></div>
        <div><label class="f">Outliers (% of the numbers)</label><input type="number" min="0" max="20" step="any" data-g="outliers" value="${esc(G.outliers)}"></div>
        <div><label class="f">Missing values are</label><select data-g="missType">${opt([['mcar', 'At random (MCAR)'], ['mar', 'More when another variable is high (MAR)'], ['mnar', 'More when the value itself is high (MNAR)'], ['group', 'More in one group']], G.missType)}</select>
          ${G.missType === 'mar' ? `<select data-g="missBy" style="margin-top:4px">${opt([['', '— which variable —'], ...vs.map(v => [v.id, v.label])], G.missBy)}</select>` : ''}${G.missType === 'group' && A.length >= 2 ? `<select data-g="missGroup" style="margin-top:4px">${opt(A.map((a, i) => [String(i), a]), G.missGroup)}</select>` : ''}</div>
        ${(D.sites || []).filter(x => x.name).length >= 2 ? `<div><label class="f">Centre effect (intraclass correlation)</label><input type="number" min="0" max="0.6" step="0.01" data-g="icc" value="${esc(G.icc)}" title="How alike the patients of one site are (0: not at all; 0.05 is common)"></div>` : ''}
        <div><label class="check" style="margin-top:22px"><input type="checkbox" data-g="messy" ${G.messy ? 'checked' : ''}><span><b>Messy entries</b> (to practise cleaning) — <input type="number" min="0.5" max="30" step="0.5" data-g="messyPct" value="${esc(G.messyPct)}" style="width:56px">% of the cells: units typed in, ×10 typing errors, 999, male / MALE / M, duplicated IDs</span></label></div>
        <div><label class="check" style="margin-top:22px" title="Numbers rescaled and categories given out after drawing, so that the tables show exactly the values typed (before missing values are removed). The power simulation still draws freely."><input type="checkbox" data-g="exact" ${G.exact ? 'checked' : ''}><span><b>Exact match</b> — each group's mean, SD and % come out exactly as typed (tidy worked examples)</span></label></div></div>
      ${specialHtml(D, vs)}
      <div class="row" style="gap:8px;margin-top:14px"><button class="btn primary" type="button" id="genGo">🎲 Generate</button><button class="btn ghost" type="button" id="genXlsx" ${last ? '' : 'disabled'}>⬇ Simulated master sheet (.xlsx)</button><button class="btn ghost small" type="button" id="genCsv" ${last ? '' : 'disabled'} title="One row per patient">⬇ CSV</button><button class="btn ghost small" type="button" id="genCsvLong" ${last && D.visits.length > 1 ? '' : 'disabled'} title="One row per patient and visit">⬇ CSV (long)</button><button class="btn ghost small" type="button" id="genEx" ${last ? '' : 'disabled'} title="Questions on these data, with model answers worked out from them (Word)">⬇ Practice exercises</button><button class="btn ghost small" type="button" id="genMethods" title="The settings of this simulation as a methods page">⬇ Methods (.docx)</button>${G.messy ? `<button class="btn ghost small" type="button" id="genErrKey" ${last ? '' : 'disabled'}>⬇ Error key</button>` : ''}
      <span class="gen-ctl" title="Several datasets from consecutive seeds, in one zip, with an answer key — e.g. one per student">⬇ <input type="number" min="2" max="50" data-gpack="n" value="${esc(G.pack.n)}" style="width:52px"> datasets<button class="btn ghost small" type="button" id="genPack">+ answer key (.zip)</button></span><button class="btn ghost small" type="button" id="genMarPair" title="The same patients twice (same seed): complete (the truth) and with values missing at random given another variable (MAR), with a key of the bias of the complete-case means">⬇ Missing-data teaching pair (.zip)</button><button class="btn ghost" type="button" id="genSend2" ${last ? '' : 'disabled'}>📊 Analyse these data ›</button><span class="legend-note" id="genStatus">${last ? `${last.length} rows generated (seed ${esc(G.seed)}) · dataset code ${dataCode(last)}` : 'Not generated yet'}</span></div>
      <div id="genOut">${outHtml(D)}</div>
      <h3>Power of the planned study</h3><p class="legend-note">The study is simulated many times with these settings, and the main outcome tested each time: the share of significant results is the power.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><div><label class="f">Main outcome</label><select data-gp="v" style="width:auto">${opt([['', '—'], ...vs.map(v => [v.id, v.label])], G.power.v)}</select></div>
        ${(() => { const v = D.vars.find(x => x.id === G.power.v); return v && visitKeys(D, v).length > 1 ? `<div><label class="f">At</label><select data-gp="visit" style="width:auto">${opt(visitKeys(D, v).map(k2 => [k2, visitName(D, k2)]), G.power.visit || visitKeys(D, v).slice(-1)[0])}</select></div>` : ''; })()}
        <div><label class="f">Simulated studies</label><input type="number" min="20" max="2000" data-gp="reps" value="${esc(G.power.reps)}" style="width:90px"></div><div><label class="f">Significance level</label><input type="number" min="0.001" max="0.2" step="0.005" data-gp="alpha" value="${esc(G.power.alpha)}" style="width:90px"></div>
        <button class="btn ghost" type="button" id="genPower">Run</button></div><div class="legend-note" id="genPowerOut" style="margin-top:6px;font-size:14px">${powerOut}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin-top:6px"><div><label class="f">Test</label><select data-gpow="test" style="width:auto">${opt([['auto', 'As the analysis (t-test / ANOVA / Chi-square)'], ['mw', 'Mann-Whitney / Kruskal-Wallis'], ['change', 'Change from the first visit (t-test)'], ['ancova', 'ANCOVA (adjusted for the first visit)'], ['logrank', 'Log-rank (time to event)']], G.power.test)}</select></div></div>
      <details class="gen-det"><summary><b>Several outcomes at once</b> <span class="legend-note">— the chance that all (or any) primary outcomes are significant</span></summary><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:6px">${vs.map(v => `<label class="check" style="margin:0"><input type="checkbox" data-gmulti="${v.id}" ${(G.power.multi || []).includes(v.id) ? 'checked' : ''}><span>${esc(v.label)}</span></label>`).join('')}</div>
        <div class="row" style="gap:8px;margin-top:6px;align-items:center"><select data-gpow="adj" style="width:auto">${opt([['none', 'No adjustment'], ['holm', 'Holm'], ['bonferroni', 'Bonferroni']], G.power.adj)}</select><button class="btn ghost small" type="button" id="genMulti">Run</button></div><div class="legend-note" id="genMultiOut" style="margin-top:6px"></div></details>
      <details class="gen-det"><summary><b>Interim analyses</b> <span class="legend-note">— O'Brien-Fleming stopping: how often the trial stops early, the power and the type I error</span></summary><div class="row" style="gap:8px;margin-top:6px;align-items:center"><label class="gen-ctl">Looks <select data-gint="looks">${opt([['2', '2 (half, end)'], ['3', '3'], ['4', '4']], String(G.interim.looks))}</select></label><button class="btn ghost small" type="button" id="genInterim">Run</button></div><div class="legend-note" id="genInterimOut" style="margin-top:6px"></div></details>
      <details class="gen-det"><summary><b>Run it many times</b> <span class="legend-note">— the spread of every variable's P value and difference across 100 studies</span></summary><button class="btn ghost small" type="button" id="genVar" style="margin-top:6px">Run 100 studies</button><div id="genVarOut" style="margin-top:6px"></div></details>
      <details class="gen-det"><summary><b>Compare the scenarios</b> <span class="legend-note">— the saved scenarios side by side, with their power</span></summary><button class="btn ghost small" type="button" id="genCmpSc" style="margin-top:6px">Compare</button><div id="genCmpScOut" style="margin-top:6px"></div></details>
      <h3>Power curve</h3><p class="legend-note">The power for a range of sample sizes, to find the number of patients for 80% (red line) or 90%.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><div><label class="f">From</label><input type="number" min="6" data-gcv="from" value="${esc(G.curve.from)}" placeholder="${Math.max(10, Math.round((+G.n || +D.n || 60) / 2))}" style="width:80px"></div><div><label class="f">to (patients in total)</label><input type="number" min="8" data-gcv="to" value="${esc(G.curve.to)}" placeholder="${Math.round((+G.n || +D.n || 60) * 2)}" style="width:80px"></div><div><label class="f">Studies per point</label><input type="number" min="20" max="1000" data-gcv="reps" value="${esc(G.curve.reps)}" style="width:80px"></div><button class="btn ghost" type="button" id="genCurve">Draw</button></div><div id="genCurveOut" style="margin-top:8px">${curveOut}</div>
      </div>`;
    analyseOut(D);
  }
  // below the settings: the results of each variable (as in step 10 of Analyse), the check against the targets and the first rows
  function outHtml(D) {
    if (!last) return '';
    const res = targetsList(D).map(t => ({ ...t, o: observed(D, last, t) })), R0 = G.res;
    const views = [['half', 'Summary and data of each group (as the Word file)'], ['default', 'Figure and all the tables'], ['stacked', 'Figure above the tables'], ['tables', 'Tables only'], ['twocol', 'Two columns']];
    return `${G.view === 'cards' ? '<p class="legend-note">The results of each variable are in its card above.</p><div style="display:none">' : ''}<h3>Results of each variable <span class="legend-note">— analysed as in 📊 Analyse, step 10</span></h3>
      <div class="row gen-res-bar" style="gap:8px;flex-wrap:wrap;align-items:flex-end">
        <div><label class="f">Variable</label><select data-gr="only" style="width:auto"><option value="">All variables</option>${(resOut ? resOut.allItems || resOut.items : []).map(it => `<option value="${esc(it.id)}" ${R0.only === it.id ? 'selected' : ''}>${esc(it.label)}</option>`).join('')}</select></div>
        <div><label class="f">View</label><select data-gr="view" style="width:auto">${views.map(([k, l]) => `<option value="${k}" ${R0.view === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
        <label class="check" style="margin:0 0 6px"><input type="checkbox" data-gr="comments" ${R0.comments ? 'checked' : ''}><span>Report comment</span></label>
        <label class="check" style="margin:0 0 6px" title="Generate again, and redraw the results, as the expected values are typed"><input type="checkbox" data-gr="live" ${R0.live ? 'checked' : ''}><span>Live: follow the expected values</span></label></div>
      <div id="genRes" class="gen-res">${resOut && resOut.key === resKeyOf(D) ? resHtml(D, res) : '<p class="legend-note">Analysing the simulated data…</p>'}</div>${G.view === 'cards' ? '</div>' : ''}
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
  const resKeyOf = D => JSON.stringify([last && last.length, G.seed, G.res.view, G.view === 'cards' ? '' : G.res.only, G.res.comments, resStamp]);
  let resStamp = 0;
  // the simulated master sheet analysed by the app itself (its own sandbox: the data in Analyse are not changed)
  async function analyseOut(D) {
    if (!last || !U.simResults || typeof XLSX === 'undefined') return; const key = resKeyOf(D); if (resOut && resOut.key === key) { fillCards(D); return; }
    try { const buf = await B.buildWorkbook(D, fill(D)).arrayBuffer(), wb = XLSX.read(buf, { type: 'array' });
      const r = U.simResults(wb, { view: G.res.view, only: G.view === 'cards' ? '' : G.res.only, comments: G.res.comments });
      // the list of variables always holds all of them
      r.all = G.res.only ? (resOut && resOut.all) || U.simResults(wb, { view: 'tables', figs: false, comments: false }).items : r.items;
      resOut = { ...r, key, items: r.items, allItems: r.all };
    } catch (err) { console.error(err); resOut = { key, items: [], parts: [], n: 0, err: err.message }; }
    if (key !== resKeyOf(D)) return; void 0;
    const box = $('#genRes'); if (box) box.innerHTML = resOut.err ? `<p style="color:var(--bad)">Could not analyse: ${esc(resOut.err)}</p>` : resHtml(D, targetsList(D).map(t => ({ ...t, o: observed(D, last, t) })));
    fillCards(D);
    const sel = document.querySelector('[data-gr="only"]'); if (sel) sel.innerHTML = `<option value="">All variables</option>${(resOut.allItems || []).map(it => `<option value="${esc(it.id)}" ${G.res.only === it.id ? 'selected' : ''}>${esc(it.label)}</option>`).join('')}`;
  }
  function redrawOut(D) { const box = $('#genOut'); if (box) box.innerHTML = outHtml(D); const st = $('#genStatus'); if (st) st.textContent = last ? `${last.length} rows generated (seed ${G.seed})` : 'Not generated yet';
    ['genXlsx', 'genSend2'].forEach(id => { const b = $('#' + id); if (b) b.disabled = !last; }); analyseOut(D); }
  // live: a changed expected value generates again (same seed) and redraws the results
  function live(D) { if (!G.res.live || !last) return; clearTimeout(liveT); liveT = setTimeout(() => { try { last = generate(D); resStamp++; redrawOut(D); document.querySelectorAll('[data-gvres]').forEach(el => { el.innerHTML = '<p class="legend-note">Analysing…</p>'; }); fillCards(D); } catch (err) { console.error(err); } }, 500); }
  // the inputs of one group of a variable, at each of its visits
  function cellsOf(D, v, g) {
    const keys = visitKeys(D, v), e = expect(v), mode = v.type === 'num' ? modeOf(v) : '';
    const one = key => { const t = ((G.targets[v.id] || {})[g] || {})[key], forced = ((SIG[v.id] || {})[g] || {})[key];
      if (v.type === 'num') { if (mode === 'range') { const c = ((G.rt[v.id] || {})[g] || {})[key] || {}, L = limits(v, 'range');
          return `<input type="number" step="any" data-grt="${v.id}|${g}|${key}|lo" value="${esc(c.lo ?? '')}" placeholder="${esc(L.lo ?? 'min')}" style="width:62px" title="Min"><span class="legend-note">–</span><input type="number" step="any" data-grt="${v.id}|${g}|${key}|hi" value="${esc(c.hi ?? '')}" placeholder="${esc(L.hi ?? 'max')}" style="width:62px" title="Max">${forced !== undefined ? `<span class="gen-forced" title="Centre used for the difference asked">→ ${+(+forced).toFixed(2)}</span>` : ''}`; }
        return `<input type="number" step="any" data-gt="${v.id}|${g}|${key}" value="${esc(t ?? '')}" placeholder="${esc(e.mean ?? '')}" style="width:72px" title="Mean"><span class="legend-note" title="SD of this group at this visit (empty: the SD of the variable)">±</span><input type="number" step="any" min="0" data-gsdt="${v.id}|${g}|${key}" value="${esc((((G.sdt[v.id] || {})[g] || {})[key]) ?? '')}" placeholder="${esc(+sdOf(v).toFixed(2))}" style="width:58px" title="SD of this group${key !== 'once' ? ' at this visit' : ''} (empty: the SD of the variable)">${forced !== undefined ? `<span class="gen-forced" title="Mean used for the difference asked">→ ${+(+forced).toFixed(2)}</span>` : ''}`; }
      const fz = forced !== undefined ? `<span class="gen-forced" title="% used for the difference asked">→ ${forced.map(x => +(100 * x).toFixed(1)).join(', ')}%</span>` : '';
      if (v.type === 'yn' || v.cats.length === 2) return `<input type="number" min="0" max="100" step="any" data-gtp="${v.id}|${g}|${key}" value="${esc(Array.isArray(t) ? +(t[0]).toFixed(1) : '')}" placeholder="${esc(((e.pct || [])[0]) ?? 50)}" style="width:70px" title="% ${esc(v.cats[0])}">${fz}`;
      return `<input type="text" data-gtc="${v.id}|${g}|${key}" value="${esc(Array.isArray(t) ? t.join(', ') : '')}" placeholder="${esc((e.pct || []).join(', '))}" style="width:130px" title="% of ${esc(v.cats.join(', '))}">${fz}`; };
    return keys.map(key => `<div class="gen-cell">${keys.length > 1 || key !== 'once' ? `<span class="legend-note">${esc(visitName(D, key))}</span>` : ''}${one(key)}</div>`).join('');
  }
  // the name of a variable and its own settings: how numbers are made, the difference between the groups, missing values, draw again
  function varHead(D, v, card) {
    const e = expect(v), mode = v.type === 'num' ? modeOf(v) : '', R0 = G.rng[v.id] || {}, Lb = limits(v, 'both'), canSig = K(D) >= 2 || visitKeys(D, v).length > 1, si = sigInfo[v.id];
    const how = v.type === 'num' ? `<label class="gen-ctl">Generate by <select data-gmode="${v.id}">${opt([['msd', 'Mean & SD'], ['range', 'Min & Max'], ['both', 'Both (mean & SD within min–max)']], mode)}</select></label>
      ${mode !== 'range' ? `<label class="gen-ctl">SD <input type="number" step="any" min="0" data-gsd="${v.id}" value="${esc(G.sds[v.id] ?? '')}" placeholder="${esc(e.sd ?? '')}" style="width:64px"></label>` : ''}
      ${mode !== 'msd' ? `<label class="gen-ctl">${mode === 'range' ? 'Default min' : 'Min'} <input type="number" step="any" data-grng="${v.id}|lo" value="${esc(R0.lo ?? '')}" placeholder="${esc(Lb.lo ?? '')}" style="width:64px"></label><label class="gen-ctl">${mode === 'range' ? 'max' : 'Max'} <input type="number" step="any" data-grng="${v.id}|hi" value="${esc(R0.hi ?? '')}" placeholder="${esc(Lb.hi ?? '')}" style="width:64px"></label>` : ''}
      ${mode !== 'range' ? `<span class="legend-note">${e.dist === 'skewed' ? 'skewed' : 'normal'}</span>` : ''}` : `<span class="legend-note">${v.type === 'yn' || v.cats.length === 2 ? `% ${esc(v.cats[0])}` : `% of ${esc(v.cats.join(' / '))}`}</span>`;
    const sig = canSig ? `<label class="gen-ctl">${K(D) >= 2 ? 'Difference between groups' : 'Change over the visits'} <select data-gsig="${v.id}">${opt([['', 'As typed'], ['sig', 'Significant'], ['ns', 'Not significant']], G.sig[v.id] || '')}</select></label><span class="gen-sigout" data-gsigout="${v.id}">${sigBadge(D, v, si)}</span>` : '';
    return `<div class="gen-vhead"><b>${esc(v.label)}</b>${v.unit ? ` <span class="legend-note">(${esc(v.unit)})</span>` : ''}${card ? '' : '<br>'}<span class="gen-ctls">${how} ${sig}
      <label class="gen-ctl">missing % <input type="number" min="0" max="100" step="any" data-gmiss="${v.id}" value="${esc(G.miss[v.id] ?? '')}" placeholder="${esc(G.missAll)}" style="width:54px"></label>
      <button class="btn ghost small ${G.more[v.id] ? 'on' : ''}" type="button" data-gmore="${v.id}" title="Shape, rounding, effect size, pattern over the visits, subgroup">⋯ More${moreCount(v) ? ` (${moreCount(v)})` : ''}</button>
      <button class="btn ghost small" type="button" data-gre="${v.id}" title="Draw this variable again (the others stay as they are)">🎲 Redraw${+G.vseed[v.id] ? ` (${G.vseed[v.id]})` : ''}</button>${+G.vseed[v.id] ? `<button class="btn ghost small" type="button" data-greset="${v.id}" title="Back to the first draw">↺</button>` : ''}</span></div>${G.more[v.id] ? morePanel(D, v) : ''}`;
  }
  const moreCount = v => [G.dist[v.id], +G.round[v.id] > 0, G.subg[v.id] && G.subg[v.id].v, +G.ordOR[v.id] > 0].filter(Boolean).length;
  function morePanel(D, v) {
    const k = K(D), keys = visitKeys(D, v), gl = k >= 2 ? arms(D) : ['All patients'], e = expect(v), sg = G.subg[v.id] || {}, mods = D.vars.filter(x => x.id !== v.id && (x.type === 'yn' || x.type === 'cat') && x.cats.length), mod = mods.find(x => x.id === sg.v);
    const num = v.type === 'num', bin = v.type === 'yn' || v.cats.length === 2;
    return `<div class="gen-more">
      ${num ? `<label class="gen-ctl">Shape <select data-gdist="${v.id}">${opt([['', `As the design (${e.dist === 'skewed' ? 'skewed' : 'normal'})`], ['normal', 'Normal'], ['skewed', 'Skewed to the right (log-normal)'], ['lskew', 'Skewed to the left'], ['uniform', 'Uniform (flat)'], ['bimodal', 'Two subpopulations (bimodal)'], ['zeroinf', 'Many zeros (zero-inflated)'], ['ceiling', 'Piling at the maximum (ceiling)'], ['floor', 'Piling at the minimum (floor)'], ['poisson', 'Counts (Poisson: SD = √mean)'], ['negbin', 'Counts, more spread (negative binomial, SD as typed)']], G.dist[v.id] || '')}</select></label>
        ${G.dist[v.id] === 'zeroinf' ? `<label class="gen-ctl">% zeros <input type="number" min="0" max="90" data-gzp="${v.id}" value="${esc(G.zpct[v.id] ?? 30)}" style="width:56px"></label>` : ''}
        ${keys.length > 1 ? `<label class="gen-ctl" title="Each patient has a slope of their own: the SD of the change from the first to the last visit">patient slopes SD <input type="number" step="any" min="0" data-gslope="${v.id}" value="${esc(G.slope[v.id] ?? '')}" placeholder="0" style="width:62px"></label>` : ''}
        <label class="gen-ctl" title="Digit preference, e.g. blood pressure read to the nearest 5">Round to <select data-ground="${v.id}">${opt([['', 'decimals of the design'], ['0.1', '0.1'], ['0.5', '0.5'], ['1', '1'], ['2', '2'], ['5', '5'], ['10', '10']], G.round[v.id] || '')}</select></label>` : ''}
      ${k >= 2 && (num || bin) ? `<span class="gen-ctl">Effect: ${num ? `Cohen's d <input type="number" step="0.05" data-geff="${v.id}" placeholder="0.5" style="width:62px">` : `relative risk <input type="number" step="0.05" min="0" data-geff="${v.id}" placeholder="0.5" style="width:62px">`}<button class="btn ghost small" type="button" data-geffgo="${v.id}" title="Fill the other groups' ${num ? 'means' : '%'} from the first group's${keys.length > 1 ? ' at every visit after the first' : ''}">Apply</button></span>` : ''}
      ${num && keys.length > 2 ? `<span class="gen-ctl">Over the visits: ${gl.map((g, gi) => `<span title="${esc(g)}">${esc(g)} <select data-gpat="${v.id}|${gi}">${opt([['', '—'], ['flat', 'Flat'], ['linear', 'Steady change'], ['fast', 'Fast, then plateau'], ['late', 'Slow, then fast'], ['dip', 'Change, then back']], '')}</select></span>`).join(' ')}
        by <input type="number" step="any" data-gpatby="${v.id}" placeholder="${esc(+((sdOf(v)) * -1).toFixed(2))}" style="width:66px" title="The change from the first visit at its largest (negative: a fall)"><button class="btn ghost small" type="button" data-gpatgo="${v.id}">Apply</button></span>` : ''}
      ${k >= 2 && v.type === 'cat' && v.cats.length >= 3 ? `<label class="gen-ctl" title="Ordinal outcome: each other group's % from the first group's, by a proportional odds ratio (above 1: higher categories more likely). Typed % of a group take precedence.">Ordinal: odds ratio of a higher category <input type="number" step="0.1" min="0.05" data-gord="${v.id}" value="${esc(G.ordOR[v.id] ?? '')}" placeholder="1" style="width:60px"></label>` : ''}
      ${k >= 2 && mods.length ? `<span class="gen-ctl">Effect only when <select data-gsubv="${v.id}">${opt([['', '— every patient —'], ...mods.map(x => [x.id, x.label])], sg.v || '')}</select>${mod ? ` is <select data-gsubc="${v.id}">${opt(mod.cats.map(c => [c, c]), sg.cat || mod.cats[0])}</select>` : ''}</span>` : ''}
    </div>`;
  }
  // a quick effect: the other groups' targets from the first group's, by Cohen's d (numbers) or a relative risk (yes / no)
  function applyEffect(D, v, eff) { const k = K(D), keys = visitKeys(D, v), useKeys = keys.length > 1 ? keys.slice(1) : keys, T = G.targets[v.id] = G.targets[v.id] || {};
    useKeys.forEach(key => { for (let g = 1; g < k; g++) { const fr = (k > 2 ? g / (k - 1) : 1);
      if (v.type === 'num') { const m0 = target(v, 0, key), sd = sdPool(D, v, key); (T[g] = T[g] || {})[key] = +(m0 + eff * fr * sd).toFixed(3); }
      else { const p0 = target(v, 0, key)[0], p1 = Math.min(0.99, Math.max(0.01, p0 * (1 + (eff - 1) * fr))); (T[g] = T[g] || {})[key] = [+(100 * p1).toFixed(1), +(100 - 100 * p1).toFixed(1)]; } } }); }
  // a pattern over the visits: the targets of a group from its first visit, changed by the amount at its largest
  const PAT = { flat: () => 0, linear: t => t, fast: t => Math.sqrt(t), late: t => t * t, dip: t => Math.sin(Math.PI * t) };
  function applyPattern(D, v, g, pat, by) { const keys = visitKeys(D, v), T = G.targets[v.id] = G.targets[v.id] || {}, m0 = target(v, g, keys[0]), f = PAT[pat]; if (!f) return; (T[g] = T[g] || {});
    keys.forEach((key, i) => { if (!i) return; const t = i / (keys.length - 1); T[g][key] = +(m0 + by * f(t)).toFixed(3); }); }
  const sigBadge = (D, v, si) => !si ? '' : `<span class="chip ${si.ok ? '' : 'warn'}" title="${esc(`${si.want === 'sig' ? 'Asked: significant' : 'Asked: not significant'}${si.key !== 'once' ? ` at ${visitName(D, si.key)}` : ''}`)}">P ${isFinite(si.p) ? (si.p < 0.001 ? '< 0.001' : '= ' + si.p.toFixed(3)) : '—'} ${si.ok ? '✓' : '✗ not reached'}</span>`;
  // the targets: one table of every variable, or a card per variable with its results
  function targetsHtml(D, vs, gl, block) {
    const view = G.view === 'cards' ? 'cards' : 'table', tog = `<div class="row" style="gap:6px;align-items:center;margin:4px 0 8px"><span class="legend-note">Show</span><button class="btn ${view === 'table' ? 'primary' : 'ghost'} small" type="button" data-gview="table">▤ All variables in one table</button><button class="btn ${view === 'cards' ? 'primary' : 'ghost'} small" type="button" data-gview="cards">▦ Each variable with its results</button></div>`;
    if (!vs.length) return tog + '<p class="legend-note">No variables — design the sheet first (phase 1).</p>';
    if (view === 'table') return tog + `<div class="tbl-wrap" style="max-height:520px"><table class="t gen-tbl"><thead><tr><th>Variable</th>${gl.map(g => `<th>${esc(g)}</th>`).join('')}</tr></thead><tbody>${vs.map(block).join('')}</tbody></table></div>`;
    return tog + `<div class="gen-cards">${vs.map(v => `<div class="gen-card" data-gcard="${v.id}">${varHead(D, v, true)}
      <div class="tbl-wrap"><table class="t gen-tbl"><thead><tr>${gl.map(g => `<th>${esc(g)}</th>`).join('')}</tr></thead><tbody><tr>${gl.map((_, g) => `<td>${cellsOf(D, v, g)}</td>`).join('')}</tr></tbody></table></div>
      <div class="gen-vres" data-gvres="${v.id}">${last ? '<p class="legend-note">Analysing…</p>' : '<p class="legend-note">Press 🎲 Generate to see its results here.</p>'}</div></div>`).join('')}</div>`;
  }
  // the results of each variable put in its card (cards view), and the significance reached
  function fillCards(D) {
    document.querySelectorAll('[data-gsigout]').forEach(el => { const v = D.vars.find(x => x.id === el.dataset.gsigout); if (v) el.innerHTML = sigBadge(D, v, sigInfo[v.id]); });
    if (G.view !== 'cards' || !resOut || !resOut.parts) return; const res = targetsList(D).map(t => ({ ...t, o: observed(D, last, t) }));
    document.querySelectorAll('[data-gvres]').forEach(el => { const v = D.vars.find(x => x.id === el.dataset.gvres); if (!v) return; const k = resOut.items.findIndex(it => it.label === v.label || it.label.startsWith(v.label + ' (') || it.label.startsWith(v.label + ' —'));
      el.innerHTML = k >= 0 ? askedLine(D, res, resOut.items[k].label) + resOut.parts[k] : '<p class="legend-note">Not analysed (see Analyse).</p>'; });
  }
  // scenarios: the settings saved under a name (optimistic, expected, pessimistic …)
  const scenarios = () => ls.get('scenarios', {});
  // several datasets in one zip, each from its own seed, with an answer key (what was asked, what came out, the P values)
  // G5: the missing-data teaching pair: the complete data (the truth) and the same data with values missing at random given another variable (MAR), with a key
  async function marPair(D) { const keepG = JSON.stringify(G), keep = last, G0 = JSON.parse(keepG), z = XLSX.CFB.utils.cfb_new(), vs = D.vars.filter(v => v.type === 'num');
    const by = D.vars.find(v => v.id === G0.missBy && ['num', 'yn'].includes(v.type)) || D.vars.find(v => v.type === 'num' && visitKeys(D, v).length === 1) || vs[0]; if (!by) { toast('The design needs a number'); return; }
    const clean = { missAll: 0, miss: {}, dropout: 0, messy: false, outliers: 0, exact: false }, mean = x => x.length ? x.reduce((a, b) => a + b, 0) / x.length : NaN; let full, miss;
    try { G = { ...JSON.parse(keepG), ...clean }; full = generate(D); last = full; z && XLSX.CFB.utils.cfb_add(z, '1 Complete data (the truth).xlsx', new Uint8Array(await B.buildWorkbook(D, fill(D)).arrayBuffer()));
      G = { ...JSON.parse(keepG), ...clean, missAll: +G0.missAll > 0 ? +G0.missAll : 20, missType: 'mar', missBy: by.id }; miss = generate(D); last = miss; XLSX.CFB.utils.cfb_add(z, '2 With missing values (MAR).xlsx', new Uint8Array(await B.buildWorkbook(D, fill(D)).arrayBuffer())); }
    finally { G = JSON.parse(keepG); last = keep; }
    const key = [`${D.title || 'Study'} — missing-data teaching pair (seed ${G.seed})`, '', `The same patients in both files (same seed). In file 2, values are missing more often when ${by.label} is high (missing at random given ${by.label}, MAR): about ${+G0.missAll > 0 ? +G0.missAll : 20}% on average.`, '',
      'Variable (visit): mean of the truth (n) | complete-case mean in file 2 (n) | bias of the complete-case mean', ''];
    vs.forEach(v => visitKeys(D, v).forEach(k2 => { if (v.id === by.id) return; const a = full.map(p => (p.vals[v.id] || {})[k2]).filter(x => x != null && isFinite(+x)).map(Number), b = miss.map(p => (p.vals[v.id] || {})[k2]).filter(x => x != null && isFinite(+x)).map(Number); if (!a.length) return;
      key.push(`${v.label}${k2 !== 'once' ? ` (${visitName(D, k2)})` : ''}: ${mean(a).toFixed(2)} (${a.length}) | ${b.length ? mean(b).toFixed(2) : '—'} (${b.length}) | ${b.length ? (mean(b) - mean(a)).toFixed(2) : '—'}`); }));
    const bx = p => +firstVal(p, by.id), hasM = miss.map(p => vs.some(v => v.id !== by.id && Object.values(p.vals[v.id] || {}).some(x => x == null))), b1 = full.filter((p, i) => hasM[i]).map(bx).filter(isFinite), b0 = full.filter((p, i) => !hasM[i]).map(bx).filter(isFinite);
    key.push('', `${by.label}: mean ${mean(b1).toFixed(2)} in the ${b1.length} patients with a missing value and ${mean(b0).toFixed(2)} in the ${b0.length} without — the missingness depends on it (MAR, not MCAR).`, '',
      'To practise: (1) compare the patients with and without missing values (Little\'s test, or a table of their baseline values); (2) analyse the complete cases; (3) multiple imputation with ' + by.label + ' in the imputation model; (4) compare both with the truth in file 1.');
    XLSX.CFB.utils.cfb_add(z, 'Key.txt', new TextEncoder().encode(key.join('\r\n')));
    U.saveUrl(URL.createObjectURL(new Blob([XLSX.CFB.write(z, { fileType: 'zip', type: 'array', compression: true })], { type: 'application/zip' })), `Simulated - ${B.fileBase()} - missing-data pair.zip`); toast('The complete data, the data with missing values and the key saved'); }
  // G8: difficulty presets of the realism settings
  function difficulty(D, lvl) { const nums = D.vars.filter(v => v.type === 'num'), skewy = nums.filter(v => /stay|time|duration|crp|count|days|cost|length|interval|ferritin|triglycer/i.test(v.label)), by = D.vars.find(v => ['num', 'yn'].includes(v.type) && visitKeys(D, v).length === 1);
    const base = { miss: {}, outliers: 0, messy: false, missType: 'mcar', dist: {} };
    if (lvl === 'easy') Object.assign(G, base, { missAll: 0, dropout: 0, exact: false });
    if (lvl === 'medium') { Object.assign(G, base, { missAll: 5, dropout: D.visits.length > 1 ? 5 : 0, outliers: 1 }); skewy.forEach(v => { G.dist[v.id] = 'skewed'; }); }
    if (lvl === 'hard') { Object.assign(G, base, { missAll: 12, dropout: D.visits.length > 1 ? 15 : 0, outliers: 2, messy: true, messyPct: 3, missType: by ? 'mar' : 'mcar', missBy: by ? by.id : '' }); (skewy.length ? skewy : nums.slice(-1)).forEach(v => { G.dist[v.id] = 'skewed'; }); }
    save(); if (last) { try { last = generate(D); resStamp++; } catch (err) { console.error(err); } } render(); toast(`Difficulty: ${lvl}`); }

  // G2: the naive sensitivity under partial verification, from the data generated
  function idxVerifyNote() { const Dg = G.diag || {}; if (!last || !(+Dg.verify < 100) || !Dg.ref || !Dg.idx) return ''; const D = D0(), ref = D.vars.find(v => v.id === Dg.ref), idx = D.vars.find(v => v.id === Dg.idx); if (!ref || !idx) return '';
    const y = yesOf(D, ref), yi = yesOf(D, idx), rows = last.map(p => [firstVal(p, ref.id), firstVal(p, idx.id)]).filter(r => r[0] != null && r[1] != null), tp = rows.filter(r => r[0] === y && r[1] === yi).length, fn = rows.filter(r => r[0] === y && r[1] !== yi).length, tn = rows.filter(r => r[0] !== y && r[1] !== yi).length, fp = rows.filter(r => r[0] !== y && r[1] === yi).length;
    return `<p class="legend-note">In these data (verified patients only, ${rows.length} of ${last.length}): sensitivity ${tp + fn ? (100 * tp / (tp + fn)).toFixed(1) : '—'}% (true ${Dg.sens}%) and specificity ${tn + fp ? (100 * tn / (tn + fp)).toFixed(1) : '—'}% (true ${Dg.spec}%) — verification bias; correct it (Begg-Greenes) or verify everyone.</p>`; }
  // G3: exam mode: one dataset per student (a seed from the name) and a marking sheet with each one's answers
  async function examMode(D) { const names = String(G.exam || '').split(/\n|,|;/).map(x => x.trim()).filter(Boolean); if (names.length < 1) { toast('Type the students\' names (one per line)'); return; }
    const z = XLSX.CFB.utils.cfb_new(), keep = last, vs = D.vars.filter(v => ['num', 'yn', 'cat'].includes(v.type)).slice(0, 10), A = arms(D), head = ['Student', 'Seed', 'Patients'];
    vs.forEach(v => { const kk = sigKey(D, v); targetsList(D).filter(x => x.varId === v.id && x.visit === kk).forEach(t => head.push(`${v.label}${kk !== 'once' ? ` (${visitName(D, kk)})` : ''}: ${t.group} ${t.kind === 'mean' ? 'mean' : `% ${t.cat}`}`)); if (A.length >= 2) head.push(`${v.label}: P`); });
    const rows = [head]; try { for (const nm of names) { const seed = (+G.seed || 1) + hashOf(nm) % 100000; last = generate(D, { seed }); const fl = fill(D); fl.simulated = { ...fl.simulated, seed };
        XLSX.CFB.utils.cfb_add(z, `${nm.replace(/[\\/:*?"<>|]/g, '_')} - dataset.xlsx`, new Uint8Array(await B.buildWorkbook(D, fl).arrayBuffer()));
        const row = [nm, seed, last.length]; vs.forEach(v => { const kk = sigKey(D, v); targetsList(D).filter(x => x.varId === v.id && x.visit === kk).forEach(t => { const o = observed(D, last, t); row.push(o.n ? +(t.kind === 'mean' ? o.m : o.m).toFixed(2) : ''); }); if (A.length >= 2) { const p = pTest(D, v, kk, last); row.push(isFinite(p) ? +p.toFixed(4) : ''); } }); rows.push(row); } }
    finally { last = keep; }
    const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = head.map((h, i) => ({ wch: i ? 14 : 22 })); XLSX.utils.book_append_sheet(wb, ws, 'Marking sheet'); XLSX.CFB.utils.cfb_add(z, 'Marking sheet (keep it).xlsx', new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' })));
    U.saveUrl(URL.createObjectURL(new Blob([XLSX.CFB.write(z, { fileType: 'zip', type: 'array', compression: true })], { type: 'application/zip' })), `Simulated - ${B.fileBase()} - exam (${names.length} students).zip`); toast(`${names.length} datasets and the marking sheet saved`); }
  // G4: a dataset with one planted trap, a hint and the answer
  async function trapData(D, kind) { const keepG = JSON.stringify(G), keep = last, nums = D.vars.filter(v => v.type === 'num'), base = nums.find(v => visitKeys(D, v).length === 1) || nums[0], out = D.vars.find(v => v.id === G.power.v && v.type === 'num') || nums.find(v => v !== base && v.role === 'primary') || nums.find(v => v !== base && visitKeys(D, v).length >= 2) || nums.filter(v => v !== base && !specialIds().has(v.id)).slice(-1)[0], sites = (D.sites || []).filter(x => x && x.name);
    if (!base || !out) { toast('The design needs two numbers (a baseline number and an outcome)'); return; } let hint = '', answer = '', P;
    try { const clean = { missAll: 0, miss: {}, dropout: 0, messy: false, outliers: 0, exact: false };
      if (kind === 'cluster') { G = { ...JSON.parse(keepG), ...clean, clus: { on: true, n: sites.length >= 2 ? sites.length : 6, icc: 0.3, v: G.clus.v || '' } }; P = generate(D);
        hint = 'Look at where the patients were treated (the clusters): are the patients of one cluster more alike than the others?'; answer = `Whole clusters were allocated (cluster randomised) and the patients of a cluster are alike (intraclass correlation 0.3). A t-test of ${out.label} treats the patients as independent and its P value is too small; analyse with a mixed model (cluster as a random effect) or cluster-level means.`; }
      else if (kind === 'confound') { const sb = sdOf(base), so = sdOf(out); G = { ...JSON.parse(keepG), ...clean, conf: { v: base.id, or: 4 }, reg: { ...JSON.parse(keepG).reg, [out.id]: [{ v: base.id, b: +(0.7 * so / sb).toFixed(3) }] }, sig: {}, targets: { ...JSON.parse(keepG).targets, [out.id]: undefined } }; P = generate(D);
        hint = `Compare the groups at baseline (Table 1). Is any baseline variable different, and is it related to ${out.label}?`; answer = `${base.label} was higher in one group (a confounder) and ${base.label} raises ${out.label}. The crude comparison of ${out.label} shows a difference that is not the treatment's: adjusted for ${base.label} (ANCOVA / linear regression) the difference disappears. The true treatment effect is none.`; }
      else if (kind === 'ceiling') { const sc = nums.find(v => /score|scale|vas|nrs|qol|womac|function|satisf|index/i.test(v.label)) || nums.find(v => v.max !== '' && v.max !== undefined && isFinite(+v.max) && v !== base) || out; const m0 = isFinite(+expect(sc).mean) ? +expect(sc).mean : 10, sd0 = Math.max(0.5, Math.abs(m0) * 0.3), mx = +(Math.min(isFinite(+sc.max) && sc.max !== '' ? +sc.max : Infinity, m0 + 0.4 * sd0)).toFixed(1); G = { ...JSON.parse(keepG), ...clean, dist: { ...JSON.parse(keepG).dist, [sc.id]: 'ceiling' }, targets: { ...JSON.parse(keepG).targets, [sc.id]: undefined }, sds: { ...JSON.parse(keepG).sds, [sc.id]: sd0 } }; G.rng = { ...G.rng, [sc.id]: { ...(G.rng[sc.id] || {}), hi: mx } }; P = generate(D);
        hint = `Look at the distribution of ${sc.label} (a histogram): where do most patients sit?`; answer = `A ceiling effect: many patients have the highest possible ${sc.label} (${mx}, the top of the scale here), so the scale cannot show improvement in them; the means and SDs mislead and the t-test assumptions fail. Report the % at the ceiling, use non-parametric tests (or a Tobit / ordinal model), and consider a scale with more range.`; }
      else if (kind === 'skew') { const labish = nums.filter(v => /crp|ferritin|stay|time|days|duration|count|level|wbc|alt|ast|bili|trig|cost|dose/i.test(v.label)), tgt = (labish.length ? labish : nums.filter(v => v !== base && !/height|age/i.test(v.label))).slice(0, 4); G = { ...JSON.parse(keepG), ...clean, dist: { ...JSON.parse(keepG).dist, ...Object.fromEntries(tgt.map(v => [v.id, 'skewed'])) }, sds: { ...JSON.parse(keepG).sds, ...Object.fromEntries(tgt.map(v => [v.id, Math.max(0.1, Math.abs(expect(v).mean || 1) * 0.9)])) } }; P = generate(D);
        hint = `Compare the mean and the median of ${tgt.map(v => v.label).join(', ')}. Which summary and which test fit these data?`; answer = `These variables are strongly skewed to the right (like CRP, ferritin, length of stay): the mean is far above the median and the SD is close to the mean. Present the median (IQR), test with Mann-Whitney / Kruskal-Wallis, or analyse the logarithm (back-transformed: a ratio of geometric means).`; }
      else { const rep = nums.find(v => visitKeys(D, v).length >= 2); if (!rep) { toast('Regression to the mean needs a number measured at two visits or more'); return; } const keys = visitKeys(D, rep), n0 = +G.n || +D.n || 60; G = { ...JSON.parse(keepG), ...clean, n: n0 * 2, visitR: 0.5, targets: { ...JSON.parse(keepG).targets, [rep.id]: undefined }, sig: {} }; const big = generate(D);
        const cut = big.map(p => +(p.vals[rep.id] || {})[keys[0]]).filter(isFinite).sort((a, b) => a - b)[Math.floor(big.length / 2)]; P = big.filter(p => +(p.vals[rep.id] || {})[keys[0]] >= cut).slice(0, n0); P.forEach((p, i) => { p.id = `${D.idPrefix || ''}${String(i + 1).padStart(+D.idDigits || 3, '0')}`; });
        hint = `The patients were included because their ${rep.label} was high at the first visit. They all "improved" by the last visit — was it the treatment?`; answer = `Regression to the mean: patients selected for a high first value come back towards the average at the next measurement even without any treatment (the visits correlate only r = 0.5). There was no true change. A control group (or the correlation between the visits) shows it.`; }
      last = P; const fl = fill(D), z = XLSX.CFB.utils.cfb_new(); XLSX.CFB.utils.cfb_add(z, 'Dataset.xlsx', new Uint8Array(await B.buildWorkbook(D, fl).arrayBuffer()));
      XLSX.CFB.utils.cfb_add(z, '1 Hint (for the students).txt', new TextEncoder().encode(hint)); XLSX.CFB.utils.cfb_add(z, '2 Answer (keep it).txt', new TextEncoder().encode(`${answer}\r\n\r\nSeed ${G.seed}.`));
      U.saveUrl(URL.createObjectURL(new Blob([XLSX.CFB.write(z, { fileType: 'zip', type: 'array', compression: true })], { type: 'application/zip' })), `Simulated - ${B.fileBase()} - find the error (${kind}).zip`); toast('The dataset, the hint and the answer saved'); }
    finally { G = JSON.parse(keepG); last = keep; } }

  // G: the interim look: the data as they would be at a date part-way through the study (patients not yet enrolled left out, visits not yet due empty)
  async function interimData(D) { const pct = Math.min(95, Math.max(5, +G.interimPct || 50)), keep = last, full = generate(D), enr = D.vars.find(v => v.type === 'date' && /enrol|admission|randomi|surgery|consent/i.test(v.label)) || D.vars.find(v => v.type === 'date');
    const t0 = Date.parse(G.start || '2026-01-01'), cut = t0 + pct / 100 * (+G.span || 365) * 864e5, dayOf = key => { const vi = D.visits.find(x => x.id === key); return vi && vi.day !== '' && isFinite(+vi.day) ? +vi.day : 0; };
    let P; if (enr) { P = full.filter(p => { const e0 = firstVal(p, enr.id); return e0 && Date.parse(e0) <= cut; }); P.forEach(p => { const e0 = Date.parse(firstVal(p, enr.id)); D.vars.forEach(v => { const o = p.vals[v.id]; if (!o) return; Object.keys(o).forEach(k2 => { if (k2 !== 'once' && e0 + dayOf(k2) * 864e5 > cut) o[k2] = null; if (v.type === 'date' && o[k2] && Date.parse(o[k2]) > cut) o[k2] = null; }); }); }); }
    else { const n = Math.max(2, Math.round(full.length * pct / 100)); P = full.slice(0, n); const keys = D.visits.map(x => x.id); P.forEach((p, i) => { const late = Math.floor((1 - i / P.length) * keys.length * 0.6); keys.slice(keys.length - late).forEach(k2 => D.vars.forEach(v => { if (p.vals[v.id] && k2 in p.vals[v.id]) p.vals[v.id][k2] = null; })); }); }
    try { last = P; const fl = fill(D); fl.simulated = { ...fl.simulated, interim: pct }; U.saveUrl(URL.createObjectURL(B.buildWorkbook(D, fl)), `Simulated - ${B.fileBase()} - interim at ${pct}%.xlsx`); toast(`${P.length} of ${full.length} patients enrolled by the interim date${enr ? ` (${new Date(cut).toISOString().slice(0, 10)})` : ''}; visits not yet due are empty`); }
    finally { last = keep; } }
  async function pack(D) { const N = Math.min(50, Math.max(2, +G.pack.n || 10)), base = +G.seed || 1, z = XLSX.CFB.utils.cfb_new(), key = [`${D.title || 'Study'} — answer key (${N} simulated datasets)`, ''], keep = last;
    const vs = D.vars.filter(v => ['num', 'yn', 'cat'].includes(v.type));
    try { for (let i = 0; i < N; i++) { const seed = base + i; last = generate(D, { seed }); const fl = fill(D); fl.simulated = { ...fl.simulated, seed }; const buf = new Uint8Array(await B.buildWorkbook(D, fl).arrayBuffer());
        XLSX.CFB.utils.cfb_add(z, `Dataset ${String(i + 1).padStart(2, '0')} (seed ${seed}).xlsx`, buf);
        key.push(`Dataset ${i + 1} — seed ${seed}`); vs.forEach(v => { const kk = sigKey(D, v), p = pTest(D, v, kk, last); const t = targetsList(D).filter(x => x.varId === v.id && x.visit === kk);
          key.push(`  ${v.label}${kk !== 'once' ? ` at ${visitName(D, kk)}` : ''}: asked ${t.map(x => `${x.group} ${x.kind === 'mean' ? (+x.target).toFixed(2) : `${x.target}% ${x.cat}`}`).join(', ')} · came out ${t.map(x => { const o = observed(D, last, x); return o.n ? (x.kind === 'mean' ? o.m.toFixed(2) : o.m.toFixed(1) + '%') : '—'; }).join(', ')} · P ${isFinite(p) ? (p < 0.001 ? '< 0.001' : p.toFixed(3)) : '—'}`); }); key.push(''); } }
    finally { last = keep; }
    XLSX.CFB.utils.cfb_add(z, 'Answer key.txt', new TextEncoder().encode(key.join('\r\n')));
    U.saveUrl(URL.createObjectURL(new Blob([XLSX.CFB.write(z, { fileType: 'zip', type: 'array', compression: true })], { type: 'application/zip' })), `Simulated - ${B.fileBase()} - ${N} datasets.zip`); toast(`${N} datasets and their answer key saved`); }
  // the power curve: the power of the main outcome for a range of sample sizes
  function powerAt(D, n, reps) { const keep = { n: G.n, reps: G.power.reps }; G.n = n; G.power.reps = reps; try { const t = power(D), m = /Power ≈ (\d+)%/.exec(t); return m ? +m[1] : NaN; } finally { G.n = keep.n; G.power.reps = keep.reps; } }
  function curveSvg(pts) { const W = 520, H = 220, L = 44, Bm = 34, xs = pts.map(p => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs), X = x => L + (W - L - 12) * (x - x0) / Math.max(1, x1 - x0), Y = y => 10 + (H - Bm - 10) * (1 - y / 100);
    const line = pts.filter(p => isFinite(p[1])).map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${W} ${H}" style="max-width:${W}px;width:100%" role="img" aria-label="Power curve"><g font-size="11" fill="#555">${[0, 20, 40, 60, 80, 100].map(y => `<line x1="${L}" x2="${W - 12}" y1="${Y(y)}" y2="${Y(y)}" stroke="${y === 80 ? '#C00000' : '#e5e5e5'}" stroke-dasharray="${y === 80 ? '4 3' : ''}"/><text x="${L - 6}" y="${Y(y) + 4}" text-anchor="end">${y}%</text>`).join('')}
      ${pts.map(p => `<text x="${X(p[0])}" y="${H - Bm + 16}" text-anchor="middle">${p[0]}</text>`).join('')}<text x="${(L + W) / 2}" y="${H - 4}" text-anchor="middle">patients in total</text></g>
      <path d="${line}" fill="none" stroke="#7B2FBE" stroke-width="2.5"/>${pts.filter(p => isFinite(p[1])).map(p => `<circle cx="${X(p[0])}" cy="${Y(p[1])}" r="4" fill="#7B2FBE"><title>${p[0]} patients: ${p[1]}%</title></circle>`).join('')}</svg>`; }
  let curveOut = '', t1Out = '';
  // G7: a published Table 1 typed in: each row matched to a variable, its groups' mean and SD (or %) set as targets, exact match on
  function fromTable1(D, text, cols) { const A = arms(D), k = K(D), done = [], miss = [], catAcc = {}, nrm = x => String(x || '').toLowerCase().replace(/\(.*?\)|\[.*?\]|,?\s*n\s*\(%\)|%|mean|sd|±/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim();
    const num0 = x => +String(x).replace(',', '.'), parse = c => { const t = String(c).trim(); let m;
      if ((m = /(-?\d+(?:[.,]\d+)?)\s*[\(\[]\s*(-?\d+(?:[.,]\d+)?)\s*[-–—,;to ]+\s*(-?\d+(?:[.,]\d+)?)\s*[\)\]]/.exec(t))) return { m: num0(m[1]), sd: Math.abs(num0(m[3]) - num0(m[2])) / 1.35, iqr: true };
      if ((m = /(\d+(?:[.,]\d+)?)\s*\(\s*(\d+(?:[.,]\d+)?)\s*%?\s*\)/.exec(t)) && /%/.test(t)) return { pct: num0(m[2]) };
      if ((m = /^(\d+(?:[.,]\d+)?)\s*%$/.exec(t))) return { pct: num0(m[1]) };
      if ((m = /(-?\d+(?:[.,]\d+)?)\s*(?:±|\+\/-|\()\s*(\d+(?:[.,]\d+)?)/.exec(t))) return { m: num0(m[1]), sd: num0(m[2]) };
      if ((m = /^-?\d+(?:[.,]\d+)?$/.exec(t))) return { m: num0(t) }; return null; };
    String(text || '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).forEach(line => { let cells = line.split(/\t|\s*[;|]\s*|\s{2,}/).filter(x => x !== ''); if (cells.length < 2) return; const lab = cells[0]; cells = cells.slice(1).filter(c => parse(c));
      if (cols === 'totfirst' && cells.length > k) cells = cells.slice(1); if (cols === 'totlast' && cells.length > k) cells = cells.slice(0, k); cells = cells.slice(0, k);
      const L = nrm(lab); if (!L || !cells.length) { miss.push(lab); return; }
      let v = D.vars.find(x => ['num', 'yn', 'cat'].includes(x.type) && nrm(x.label) === L) || D.vars.find(x => ['num', 'yn', 'cat'].includes(x.type) && (nrm(x.label).startsWith(L) || L.startsWith(nrm(x.label))) && nrm(x.label).length > 2);
      let ci = -1; if (!v) { v = D.vars.find(x => x.type === 'cat' && x.cats.some(c => nrm(c) === L)); if (v) ci = v.cats.findIndex(c => nrm(c) === L); }
      if (!v) { miss.push(lab); return; } const key = visitKeys(D, v)[0];
      cells.forEach((c, g) => { const r = parse(c); if (!r) return; const T = ((G.targets[v.id] = G.targets[v.id] || {})[g] = G.targets[v.id][g] || {});
        if (v.type === 'num' && r.m !== undefined) { T[key] = r.m; G.mode[v.id] = 'msd'; if (r.sd > 0) ((G.sdt[v.id] = G.sdt[v.id] || {})[g] = G.sdt[v.id][g] || {})[key] = +r.sd.toFixed(3); return; }
        if (r.pct === undefined) return; if (ci >= 0) { ((catAcc[v.id] = catAcc[v.id] || {})[g] = catAcc[v.id][g] || {})[ci] = r.pct; return; } T[key] = v.cats.length === 2 || v.type === 'yn' ? [r.pct, 100 - r.pct] : v.cats.map((_, j) => j ? (100 - r.pct) / (v.cats.length - 1) : r.pct); });
      done.push(v.label + (ci >= 0 ? ': ' + v.cats[ci] : '')); });
    // categories given row by row: the % typed, the rest shared by the others
    Object.entries(catAcc).forEach(([id, byG]) => { const v = D.vars.find(x => x.id === id), key = visitKeys(D, v)[0]; Object.entries(byG).forEach(([g, m]) => { const typed = Object.values(m).reduce((a, b) => a + b, 0), rest = v.cats.length - Object.keys(m).length;
      ((G.targets[id] = G.targets[id] || {})[g] = G.targets[id][g] || {})[key] = v.cats.map((_, j) => m[j] !== undefined ? m[j] : rest ? Math.max(0, 100 - typed) / rest : 0); }); });
    if (done.length) G.exact = true; void A;
    return `${done.length} row${done.length === 1 ? '' : 's'} used${done.length ? ` (${[...new Set(done)].join(', ')})` : ''}${miss.length ? ` · not matched: ${miss.join(', ')}` : ''}${done.length ? ' · exact match on — press 🎲 Generate' : ''}`; }
  // G8: practice exercises: questions on the dataset, with the model answers worked out from it
  async function exercisesDoc(D) { if (!last) { toast('Generate the data first'); return; } const d = window.docx, { Document, Packer, Paragraph, TextRun, PageBreak } = d, k = K(D), A = k >= 2 ? arms(D) : ['All patients'], P = last;
    const P0 = (t, o = {}) => new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: t, bold: o.b, italics: o.i, size: o.s || 22, font: 'Calibri' })] }), f = (x, dd = 1) => isFinite(x) ? (+x).toFixed(dd) : '—', fp = p => !isFinite(p) ? '—' : p < 0.001 ? '< 0.001' : p.toFixed(3);
    const Q = [], Ans = [], add = (q, a) => { Q.push(q); Ans.push(a); };
    add(`How many patients are in the dataset${k >= 2 ? ', and how many in each group' : ''}? Are any IDs duplicated?`, `${P.length} rows${k >= 2 ? ` — ${A.map((a, g) => `${a}: ${P.filter(p => p.g === g).length}`).join(', ')}` : ''}. ${new Set(P.map(p => p.id)).size < P.length ? `${P.length - new Set(P.map(p => p.id)).size} ID(s) appear twice: remove the duplicates before analysing.` : 'No duplicated IDs.'}`);
    const pv = (G.power.v && D.vars.find(v => v.id === G.power.v)), pool = D.vars.filter(v => ['num', 'yn', 'cat'].includes(v.type) && (k >= 2 || visitKeys(D, v).length > 1)), pickV = [...new Set([pv, ...pool.filter(v => G.sig[v.id]), ...pool].filter(Boolean))].slice(0, Math.max(1, Math.min(15, +(G.ex || {}).n || 6)));
    pickV.forEach(v => { const key = sigKey(D, v), vn = key !== 'once' ? ` at ${visitName(D, key)}` : '', p = pTest(D, v, key, P), tl = targetsList(D).filter(x => x.varId === v.id && x.visit === key);
      const test = v.type === 'num' ? (k === 2 ? 'Welch t test (or Mann-Whitney U if skewed)' : k > 2 ? 'one-way ANOVA (or Kruskal-Wallis if skewed)' : `paired t test (${visitName(D, visitKeys(D, v)[0])} against${vn})`) : `chi-square test (Fisher's exact test if an expected count is below 5)`;
      const desc = tl.map(t => { const o = observed(D, P, t); return t.kind === 'mean' ? `${t.group}: mean ${f(o.m, 2)} (SD ${f(o.sd, 2)}), n = ${o.n}` : `${t.group}: ${f(o.m)}% ${t.cat}, n = ${o.n}`; }).join('; ');
      add(k >= 2 ? `Compare ${v.label}${vn} between the groups. Which test would you use, what is the P value, and what do you conclude?` : `Did ${v.label} change from ${visitName(D, visitKeys(D, v)[0])} to${vn}? Which test, what P value, what conclusion?`,
        `${desc}. Test: ${test}. P = ${fp(p)} — ${isFinite(p) ? (p < 0.05 ? 'a statistically significant difference at the 5% level' : 'no statistically significant difference at the 5% level (this is not proof that there is no difference)') : 'the test could not be run'}.`); });
    const nm = D.vars.filter(v => ['num', 'yn', 'cat'].includes(v.type)).map(v => ({ v, n: P.reduce((a, p) => a + Object.values(p.vals[v.id] || {}).filter(x => x == null || x === '').length, 0) })).sort((a, b) => b.n - a.n)[0];
    if (nm && nm.n) add(`Which variable has the most missing values, and how many? What could you do about them?`, `${nm.v.label}: ${nm.n} missing value(s). Report them; check whether they differ by group; consider multiple imputation and a complete-case sensitivity analysis.`);
    if (G.messy && lastErrors.length) add(`The data contain planted entry errors. Find and correct them.`, `${lastErrors.length} errors: ${[...new Set(lastErrors.map(e => e.what))].join(', ')}. The full list, cell by cell, is in the error key (⬇ Error key).`);
    if ((G.tte || {}).ev) { const ev = D.vars.find(v => v.id === G.tte.ev); if (ev) add(`Draw Kaplan-Meier curves of ${ev.label} by group and compare them. What hazard ratio do you find?`, `Asked hazard ratio ${G.tte.hr}${G.tte.shape === 'cross' ? ` (then ${G.tte.hr2} after half the follow-up: the hazards are not proportional, check the curves and the Schoenfeld residuals)` : ''}; use the log-rank test and a Cox model.`); }
    const doc = new Document({ creator: 'Prof MSE Easy Stat', title: 'Practice exercises', sections: [{ children: [P0(`${D.title || 'Study'} — practice exercises`, { b: true, s: 30 }), P0(`Simulated data (seed ${G.seed}, dataset code ${dataCode(P)}). Open the master sheet and answer:`, { i: true }),
      ...Q.map((q, i) => P0(`${i + 1}. ${q}`)), new Paragraph({ children: [new PageBreak()] }), P0('Model answers', { b: true, s: 28 }), ...Ans.map((a, i) => P0(`${i + 1}. ${a}`))] }] });
    U.saveUrl(URL.createObjectURL(await Packer.toBlob(doc)), `Simulated - ${B.fileBase()} - exercises.docx`); toast(`${Q.length} exercises saved, with the answers`); }
  // G1–G16: the special designs and relations between variables, in folding boxes
  // what the generated data show for each special design
  function designNotes(D) { const out = {}; if (!last) return out; const f = (x, d = 2) => isFinite(x) ? (+x).toFixed(d) : '—', fp = p => !isFinite(p) ? '—' : p < 0.001 ? '< 0.001' : p.toFixed(3), mn = x => x.reduce((a, b) => a + b, 0) / x.length;
    const C = G.clus || {}, n = last.length, sites = (D.sites || []).filter(x => x && x.name), nCl = sites.length >= 2 ? sites.length : Math.max(2, Math.min(n, +C.n || 8));
    if (C.on) { const ov = D.vars.find(x => x.id === G.power.v && x.type === 'num') || D.vars.find(x => x.type === 'num' && x.id !== C.v); let iccO = NaN;
      if (ov) { const key = sigKey(D, ov), rows = last.map(p => ({ c: p.__cl, g: p.g, y: +(p.vals[ov.id] || {})[key] })).filter(r => r.y != null && isFinite(r.y)), gm = {}; [...new Set(rows.map(r => r.g))].forEach(g => { gm[g] = mn(rows.filter(r => r.g === g).map(r => r.y)); });
        const res = rows.map(r => ({ c: r.c, e: r.y - gm[r.g] })), cl = [...new Set(res.map(r => r.c))], N = res.length, nc = cl.map(c => res.filter(r => r.c === c).length), mc = cl.map(c => mn(res.filter(r => r.c === c).map(r => r.e))), m = mn(res.map(r => r.e));
        const msb = cl.reduce((a, c, i) => a + nc[i] * (mc[i] - m) ** 2, 0) / Math.max(1, cl.length - 1), msw = res.reduce((a, r) => a + (r.e - mc[cl.indexOf(r.c)]) ** 2, 0) / Math.max(1, N - cl.length), m0 = (N - nc.reduce((a, x) => a + x * x, 0) / N) / Math.max(1, cl.length - 1); iccO = Math.max(0, (msb - msw) / (msb + (m0 - 1) * msw)); }
      const mbar = n / nCl, de = 1 + (mbar - 1) * (+C.icc || 0); out.clus = `<p class="legend-note">${nCl} clusters of about ${f(mbar, 1)} patients; design effect 1 + (m − 1) × ICC = ${f(de)}, so the ${n} patients count as about ${Math.round(n / de)} independent ones${ov ? `; intraclass correlation in these data (${esc(ov.label)}, after the groups) ${f(iccO, 3)}` : ''}. Analyse with a mixed model (cluster as a random effect) or with cluster-level summaries.</p>`; }
    const sw = dInfo.sw; if ((G.sw || {}).on && sw) { const sv = D.vars.find(x => x.id === G.sw.v), on = [], off = []; if (sv) last.forEach(p => sw.keys.forEach((key, t) => { const y = (p.vals[sv.id] || {})[key]; if (y == null || !isFinite(+y)) return; (t >= sw.step[p.__cl] ? on : off).push(+y); }));
      out.sw = `<p class="legend-note">Steps: ${Object.keys(sw.step).map(c => `${esc(sw.names[c])} from ${esc(visitName(D, sw.keys[sw.step[c]]))}`).join(' · ')}.${on.length && off.length ? ` Crude difference (on − off the intervention) ${f(mn(on) - mn(off))} — biased by the time trend; the stepped-wedge analysis adjusts for the period (mixed model with cluster and period).` : ''}</p>`; }
    const xo = dInfo.xo; if ((G.xo || {}).on && xo) { const d = g => last.filter(p => p.g % 2 === g).map(p => { const o = p.vals[xo.v.id] || {}; return o[xo.k1] != null && o[xo.k2] != null ? [+o[xo.k1], +o[xo.k2]] : null; }).filter(Boolean), ab = d(0), ba = d(1);
      if (ab.length > 1 && ba.length > 1) { const t2 = (a, b) => { const ma = mn(a), mb = mn(b), df = a.length + b.length - 2, sp = Math.sqrt((a.reduce((s0, y) => s0 + (y - ma) ** 2, 0) + b.reduce((s0, y) => s0 + (y - mb) ** 2, 0)) / df), se = sp * Math.sqrt(1 / a.length + 1 / b.length); return { diff: mb - ma, se, df, p: 2 * (1 - jStat.studentt.cdf(Math.abs((mb - ma) / se), df)) }; };
        const tr = t2(ab.map(x => (x[0] - x[1]) / 2), ba.map(x => (x[0] - x[1]) / 2)), pe = t2(ab.map(x => (x[1] - x[0]) / 2), ba.map(x => (x[0] - x[1]) / 2)), co = t2(ab.map(x => x[0] + x[1]), ba.map(x => x[0] + x[1])), tc = jStat.studentt.inv(0.975, tr.df);
        out.xo = `<p class="legend-note">In these data: treatment effect (B − A) ${f(tr.diff)} (95% CI ${f(tr.diff - tc * tr.se)} to ${f(tr.diff + tc * tr.se)}), P ${fp(tr.p)}; period effect ${f(-pe.diff)}; carry-over test (the sum of the two periods by sequence) P ${fp(co.p)}. AB ${ab.length}, BA ${ba.length} patients.</p>`; } }
    if (niInfo) { const r = niInfo, txt = { superior: 'non-inferior (and superior)', noninf: 'non-inferior', inferior: 'inferior', inconcl: 'inconclusive' }[r.verdict];
      out.ni = `<p class="legend-note">In these data: difference (new − standard, in the better direction) ${f(r.diff)} (95% CI ${f(r.lo)} to ${f(r.hi)}); margin −${f(r.M)} → <b>${txt}</b>${r.ok ? '' : ' (not the scenario asked even after 40 draws: change the n or the margin)'}; one-sided P for non-inferiority ${fp(r.pNI)}. The power to show non-inferiority with this scenario and n: ${Math.round(100 * r.power)}%.</p>`; }
    return out; }
  function specialHtml(D, vs) {
    const nums = D.vars.filter(v => v.type === 'num'), yns = D.vars.filter(v => v.type === 'yn' || ((v.type === 'cat') && v.cats.length === 2)), cats = D.vars.filter(v => v.type === 'yn' || v.type === 'cat'), dates = D.vars.filter(v => v.type === 'date'), preds = D.vars.filter(v => ['num', 'yn', 'cat'].includes(v.type));
    const sel = (path, list, cur, ph) => `<select data-gx="${path}" style="width:auto">${opt([['', ph || '—'], ...list.map(v => [v.id, v.label])], cur || '')}</select>`, num = (path, cur, w = 70, step = 'any') => `<input type="number" step="${step}" data-gx="${path}" value="${esc(cur ?? '')}" style="width:${w}px">`;
    const T0 = G.tte, Dg = G.diag, Ag = G.agree, dv = G.dev, cf = G.conf;
    const listUi = (kind, outs, title, unitLab) => { const L = G[kind]; return Object.keys(L).filter(id => D.vars.some(v => v.id === id)).map(id => `<div class="gen-rel"><b>${esc(D.vars.find(v => v.id === id).label)}</b> ← ${(L[id] || []).map((t, i) => `<span class="gen-ctl">${sel(`${kind}.${id}.${i}.v`, preds.filter(v => v.id !== id), t.v, 'predictor')} ${kind === 'risk' ? `OR ${num(`${kind}.${id}.${i}.or`, t.or, 60)}<span title="For a number: the OR per this many units">per</span> ${num(`${kind}.${id}.${i}.per`, t.per, 55)}` : `b ${num(`${kind}.${id}.${i}.b`, t.b, 65)}`}<button class="btn ghost small" type="button" data-gxdel="${kind}|${id}|${i}">✕</button></span>`).join(' ')}<button class="btn ghost small" type="button" data-gxadd="${kind}|${id}">+ predictor</button><button class="btn ghost small" type="button" data-gxrm="${kind}|${id}">remove</button></div>`).join('')
      + `<div class="gen-rel"><span class="legend-note">${title}</span> <select data-gxnew="${kind}" style="width:auto">${opt([['', '— add an outcome —'], ...outs.map(v => [v.id, v.label])], '')}</select> <span class="legend-note">${unitLab}</span></div>`; };
    const Nt = designNotes(D), sitesL = (D.sites || []).filter(x => x && x.name), cols = D.vars.filter(v => ['text', 'num', 'cat'].includes(v.type)), multiV = nums.filter(v => visitKeys(D, v).length >= 2), C = G.clus, SW = G.sw, XO = G.xo, NI = G.ni, Q = G.quirk;
    const designsHtml = `<details class="gen-det" ${C.on ? 'open' : ''}><summary><b>Cluster randomised trial</b> <span class="legend-note">— whole clusters (the sites, or clinics / villages made here) are given one group; the patients of a cluster are alike (intraclass correlation); the design effect</span></summary>
        <div class="gen-row"><label class="check" style="margin:0"><input type="checkbox" data-gx="clus.on" ${C.on ? 'checked' : ''}><span>On</span></label> ${sitesL.length >= 2 ? `<span class="legend-note">clusters: the ${sitesL.length} sites</span>` : `<span class="gen-ctl">clusters ${num('clus.n', C.n, 60, '1')}</span>`} <span class="gen-ctl">intraclass correlation ${num('clus.icc', C.icc, 60)}</span> cluster column ${sel('clus.v', cols, C.v, '— none —')}</div>${Nt.clus || ''}</details>
      <details class="gen-det" ${SW.on ? 'open' : ''}><summary><b>Stepped-wedge</b> <span class="legend-note">— every cluster starts on the control and moves to the intervention at its own step (one visit after another)</span></summary>
        <div class="gen-row"><label class="check" style="margin:0"><input type="checkbox" data-gx="sw.on" ${SW.on ? 'checked' : ''}><span>On</span></label> outcome ${sel('sw.v', multiV, SW.v, '— a number with visits —')} on the intervention ${sel('sw.ind', yns, SW.ind, '(yes / no column, optional)')} <span class="gen-ctl">effect ${num('sw.eff', SW.eff)}</span> <span class="gen-ctl">time trend a visit ${num('sw.trend', SW.trend)}</span> <span class="gen-ctl">ICC ${num('sw.icc', SW.icc, 60)}</span>${sitesL.length >= 2 ? '' : ` <span class="gen-ctl">clusters ${num('clus.n', C.n, 60, '1')}</span>`} cluster column ${sel('clus.v', cols, C.v, '— none —')}</div>${Nt.sw || ''}</details>
      <details class="gen-det" ${XO.on ? 'open' : ''}><summary><b>Crossover (AB / BA)</b> <span class="legend-note">— the first group takes A then B, the second B then A (the first two visits of the outcome are the two periods); period effect and carry-over</span></summary>
        <div class="gen-row"><label class="check" style="margin:0"><input type="checkbox" data-gx="xo.on" ${XO.on ? 'checked' : ''}><span>On</span></label> outcome ${sel('xo.v', multiV, XO.v, '— a number with visits —')} sequence column ${sel('xo.seq', cols, XO.seq, '(optional)')} <span class="gen-ctl">effect B − A ${num('xo.eff', XO.eff)}</span> <span class="gen-ctl">period 2 − 1 ${num('xo.period', XO.period)}</span> <span class="gen-ctl">carry-over of B ${num('xo.carry', XO.carry)}</span> <span class="gen-ctl">within-patient r ${num('xo.r', XO.r, 60)}</span></div>${Nt.xo || ''}</details>
      <details class="gen-det" ${NI.v ? 'open' : ''}><summary><b>Non-inferiority</b> <span class="legend-note">— the new treatment (second group) against the standard (first) with a margin: data that come out non-inferior, inferior or inconclusive</span></summary>
        <div class="gen-row">outcome ${sel('ni.v', nums, NI.v, '— a number —')} <span class="gen-ctl">margin ${num('ni.margin', NI.margin)}</span> better when <select data-gx="ni.better" style="width:auto">${opt([['higher', 'higher'], ['lower', 'lower']], NI.better)}</select> scenario <select data-gx="ni.scen" style="width:auto">${opt([['noninf', 'Non-inferior (no true difference)'], ['inferior', 'Inferior (1.6 × the margin worse)'], ['inconcl', 'Inconclusive (worse by the margin)']], NI.scen)}</select></div>${Nt.ni || ''}</details>
      <details class="gen-det" ${Q.weekday || +Q.season || +Q.device || Q.roundSite ? 'open' : ''}><summary><b>Real-world quirks</b> <span class="legend-note">— few enrolments at the weekend, a seasonal swing, a new device part-way through, a site that rounds its readings</span></summary>
        <div class="gen-row"><label class="check" style="margin:0"><input type="checkbox" data-gx="quirk.weekday" ${Q.weekday ? 'checked' : ''}><span>No enrolment on Fridays, fewer on Saturdays</span></label> <span class="gen-ctl">seasonal swing (SD, highest in winter) ${num('quirk.season', Q.season, 60)}</span></div>
        <div class="gen-row"><span class="gen-ctl">new device: values ${num('quirk.device', Q.device, 60)}% higher from ${num('quirk.deviceAt', Q.deviceAt, 55, '1')}% of the study time</span> ${sitesL.length ? `<span class="gen-ctl">site that rounds <select data-gx="quirk.roundSite" style="width:auto">${opt([['', '— none —'], ...sitesL.map(x => [x.name, x.name])], Q.roundSite)}</select> to ${num('quirk.roundTo', Q.roundTo, 55)}</span>` : ''} on ${`<select data-gx="quirk.v" style="width:auto">${opt([['', 'every number'], ...nums.map(v => [v.id, v.label])], Q.v || '')}</select>`}</div></details>`;
    return `<h3>Special designs and relations</h3><div class="gen-specials">${designsHtml}
      <details class="gen-det" ${T0.ev ? 'open' : ''}><summary><b>Time to event</b> <span class="legend-note">— survival data for Kaplan-Meier and Cox (exponential times, hazard ratio, censoring)</span></summary><div class="gen-row">Event ${sel('tte.ev', yns, T0.ev, 'yes / no event')} time ${sel('tte.time', nums, T0.time, 'follow-up time')} date ${sel('tte.date', dates, T0.date, 'date of the event (optional)')}
        <span class="gen-ctl">hazard ratio ${num('tte.hr', T0.hr)}</span><span class="gen-ctl">% with the event (first group) ${num('tte.pev', T0.pev)}</span><span class="gen-ctl">follow-up (days) ${num('tte.fu', T0.fu)}</span><span class="gen-ctl">% censored early ${num('tte.lost', T0.lost)}</span></div>
        <div class="gen-row"><select data-gx="tte.shape" style="width:auto">${opt([['ph', 'Proportional hazards (one hazard ratio)'], ['cross', 'Hazards that change: another HR after half the follow-up (crossing curves)']], T0.shape || 'ph')}</select>${T0.shape === 'cross' ? `<span class="gen-ctl">HR later ${num('tte.hr2', T0.hr2)}</span>` : ''}
          <span class="gen-ctl" title="e.g. death from other causes: it stops the follow-up, and the event of interest can no longer happen">competing event ${sel('tte.cev', yns.filter(v => v.id !== T0.ev), T0.cev, '— none —')}</span>${T0.cev ? `<span class="gen-ctl">% with it ${num('tte.pcomp', T0.pcomp)}</span>` : ''}</div>
        <div class="gen-row"><span class="gen-ctl" title="A treatment started part-way through the follow-up (e.g. a statin, a transfusion): its start day (or date) in this column, empty when never started; the hazard changes from that day">time-varying treatment: start in ${sel('tte.tv', [...nums, ...dates].filter(v => v.id !== T0.time), T0.tv, '— none —')}</span>${T0.tv ? `<span class="gen-ctl">started by % ${num('tte.tvPct', T0.tvPct)}</span><span class="gen-ctl">HR from the start ${num('tte.tvHr', T0.tvHr)}</span><span class="legend-note">Analyse with a Cox model with a time-dependent covariate; comparing ever- with never-treated patients gives immortal-time bias.</span>` : ''}</div></details>
      <details class="gen-det" ${Object.keys(G.risk).length ? 'open' : ''}><summary><b>Risk factors</b> <span class="legend-note">— a yes/no outcome made more likely by predictors (odds ratios), for logistic regression</span></summary>${listUi('risk', yns, 'Outcome:', '(each group keeps its % overall)')}</details>
      <details class="gen-det" ${Object.keys(G.reg).length ? 'open' : ''}><summary><b>Regression</b> <span class="legend-note">— a number built from its predictors (b per unit; yes = 1), for linear regression</span></summary>${listUi('reg', nums, 'Outcome:', '')}</details>
      <details class="gen-det" ${cf.v ? 'open' : ''}><summary><b>Confounding</b> <span class="legend-note">— one group has more of a baseline variable (crude and adjusted results differ when it also affects the outcome)</span></summary><div class="gen-row">${sel('conf.v', preds, cf.v, 'baseline variable')} <span class="gen-ctl">odds ratio for the second group ${num('conf.or', cf.or)}</span></div></details>
      <details class="gen-det" ${Dg.ref ? 'open' : ''}><summary><b>Diagnostic accuracy</b> <span class="legend-note">— reference standard, index test (sensitivity, specificity) and a numeric index (AUC)</span></summary><div class="gen-row">reference ${sel('diag.ref', yns, Dg.ref)} index test ${sel('diag.idx', yns, Dg.idx, '(yes / no)')} numeric index ${sel('diag.num', nums, Dg.num, '(number)')}
        <span class="gen-ctl">prevalence % ${num('diag.prev', Dg.prev)}</span><span class="gen-ctl">sensitivity % ${num('diag.sens', Dg.sens)}</span><span class="gen-ctl">specificity % ${num('diag.spec', Dg.spec)}</span><span class="gen-ctl">AUC ${num('diag.auc', Dg.auc, 60, '0.01')}</span><span class="gen-ctl" title="Partial verification: only this % of the index-negative patients get the reference standard (the others are left empty), as in many real studies — the naive sensitivity is then too high">index-negatives verified % ${num('diag.verify', Dg.verify ?? 100)}</span></div>${idxVerifyNote()}</details>
      <details class="gen-det" ${Ag.a || Ag.a2 ? 'open' : ''}><summary><b>Agreement</b> <span class="legend-note">— two readers (kappa) or two methods (Bland-Altman bias and limits)</span></summary><div class="gen-row">reader A ${sel('agree.a', cats, Ag.a)} reader B ${sel('agree.b', cats, Ag.b)} <span class="gen-ctl">kappa ${num('agree.kappa', Ag.kappa, 60, '0.05')}</span></div>
        <div class="gen-row">method A ${sel('agree.a2', nums, Ag.a2)} method B ${sel('agree.b2', nums, Ag.b2)} <span class="gen-ctl">bias ${num('agree.bias', Ag.bias)}</span><span class="gen-ctl">SD of the differences ${num('agree.sd', Ag.sd)}</span></div></details>
      <details class="gen-det"><summary><b>Recruitment</b> <span class="legend-note">— enrolment over time and patients per site</span></summary><div class="gen-row"><select data-gx="recruit.pattern" style="width:auto">${opt([['steady', 'Steady'], ['slow', 'Slow start'], ['fast', 'Fast start, then slower'], ['seasonal', 'Seasonal']], G.recruit.pattern)}</select>
        ${(D.sites || []).filter(x => x.name).length >= 2 ? `<span class="gen-ctl" title="Relative numbers of patients, e.g. 3, 1, 1">patients per site ${`<input type="text" data-gx="recruit.siteW" value="${esc(G.recruit.siteW)}" placeholder="${D.sites.filter(x => x.name).map(() => 1).join(', ')}" style="width:110px">`}</span>` : ''}<span class="legend-note">over ${G.span || 365} days from ${esc(G.start || '')}</span></div></details>
      <details class="gen-det" ${dv.on ? 'open' : ''}><summary><b>Protocol deviations and the flowchart</b> <span class="legend-note">— screened and excluded, lost with reasons, not adherent, crossed over (ITT vs per-protocol)</span></summary><div class="gen-row"><label class="check" style="margin:0"><input type="checkbox" data-gx="dev.on" ${dv.on ? 'checked' : ''}><span>On</span></label>
        <span class="gen-ctl">% excluded at screening ${num('dev.excl', dv.excl)}</span><span class="gen-ctl">% lost ${num('dev.lost', dv.lost)}</span><span class="gen-ctl">% not adherent ${num('dev.nonadh', dv.nonadh)}</span><span class="gen-ctl">% crossed over ${num('dev.cross', dv.cross)}</span>
        <span class="legend-note">Uses the design's Withdrawn, Reason for withdrawal, Adherence and Treatment received columns when it has them; the flowchart counts go to Analyse with the file.</span>${lastConsort ? `<div class="legend-note">Last: ${lastConsort.assessed} assessed, ${lastConsort.excluded} excluded, ${lastConsort.groups.map(g => `${esc(g.name)} ${g.allocated} allocated / ${g.lost} lost / ${g.analysed} analysed`).join(' · ')}</div>` : ''}</div></details>
      ${G.messy ? `<details class="gen-det" open><summary><b>The errors planted</b> <span class="legend-note">— which, with an error key to mark the cleaning</span></summary><div class="gen-row">${[['units', 'units in cells'], ['x10', '× 10 typing errors'], ['c999', '999 for missing'], ['comma', 'decimal commas'], ['caseMix', 'mixed spelling of categories'], ['typo', 'spelling mistakes'], ['space', 'extra spaces'], ['date', 'impossible dates'], ['dup', 'duplicated rows']].map(([k, l]) => `<label class="check" style="margin:0"><input type="checkbox" data-gx="err.${k}" ${G.err[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div></details>` : ''}
      <details class="gen-det" ${(G.oper || {}).v ? 'open' : ''}><summary><b>Operator effect</b> <span class="legend-note">— patients of the same surgeon or anaesthetist are alike (intraclass correlation), for mixed models</span></summary><div class="gen-row">operator ${sel('oper.v', cats, G.oper.v, '— which column —')} <span class="gen-ctl">intraclass correlation ${num('oper.icc', G.oper.icc, 60)}</span> on ${`<select data-gx="oper.only" style="width:auto">${opt([['', 'every number'], ...nums.map(v => [v.id, v.label])], G.oper.only || '')}</select>`}</div></details>
      <details class="gen-det" ${(G.match || {}).on ? 'open' : ''}><summary><b>Matched case-control pairs</b> <span class="legend-note">— each case with a control of the same age and sex, a pair number, and the exposure from an odds ratio (conditional logistic regression)</span></summary>
        <div class="gen-row"><label class="check" style="margin:0"><input type="checkbox" data-gx="match.on" ${G.match.on ? 'checked' : ''}><span>On</span></label> case / control ${sel('match.status', yns, G.match.status, '— which column —')} pair number ${sel('match.pair', D.vars.filter(v => v.type === 'num' || v.type === 'text'), G.match.pair, '— none —')}</div>
        <div class="gen-row">matched on ${sel('match.by.0', preds, (G.match.by || [])[0])} ${sel('match.by.1', preds, (G.match.by || [])[1])} ${sel('match.by.2', preds, (G.match.by || [])[2])}<span class="gen-ctl" title="A number of the control within ± this of its case">± ${num('match.tol', G.match.tol, 50)}</span></div>
        <div class="gen-row">exposure ${sel('match.exp', yns, G.match.exp, '— none —')} <span class="gen-ctl">odds ratio ${num('match.or', G.match.or, 60)}</span><span class="legend-note">The exposure's % in the controls is its expected % (first group).</span></div></details>
      <details class="gen-det"><summary><b>🧪 Interim look</b> <span class="legend-note">— the data as they would be part-way through the study, to rehearse the interim analysis and the DSMB report (the stopping rules: Interim analyses, below)</span></summary>
        <div class="gen-row"><span class="gen-ctl">at ${`<input type="number" min="5" max="95" data-gx="interimPct" value="${esc(G.interimPct || 50)}" style="width:60px">`}% of the recruitment time</span><button class="btn ghost small" type="button" id="genInterimData">⬇ Data so far (.xlsx)</button></div></details>
      <details class="gen-det"><summary><b>🎓 Exam mode</b> <span class="legend-note">— one dataset per student (its seed from the name) and a marking sheet with each student's correct means, % and P values</span></summary>
        <div class="gen-row"><textarea data-gexam="1" placeholder="One name per line" style="width:260px;min-height:70px">${esc(G.exam || '')}</textarea><button class="btn ghost small" type="button" id="genExam">⬇ Datasets + marking sheet (.zip)</button></div></details>
      <details class="gen-det"><summary><b>🕵 Find the error — teaching datasets</b> <span class="legend-note">— a dataset with one planted lesson (clustering, a confounder / Simpson-type reversal, regression to the mean, a ceiling effect, skewed numbers), a hint and the answer</span></summary>
        <div class="gen-row"><select id="genTrap" style="width:auto"><option value="cluster">Clustering ignored (patients of a site alike)</option><option value="confound">A confounder (a baseline imbalance that drives the outcome)</option><option value="rtm">Regression to the mean (patients selected for a high value)</option><option value="ceiling">A ceiling effect (a score bunched at its maximum)</option><option value="skew">Skewed numbers (mean against median)</option></select><button class="btn ghost small" type="button" id="genTrapGo">⬇ Dataset + hint + answer (.zip)</button></div></details>
      <details class="gen-det"><summary><b>From a published table</b> <span class="legend-note">— paste a paper's Table 1 (mean (SD), mean ± SD, median [IQR], n (%)) to simulate data with exactly those values, for practising a reanalysis</span></summary>
        <textarea id="genT1" rows="5" style="width:100%;font-family:monospace;font-size:12px" placeholder="Age (years)	45.2 (10.1)	46.0 ± 9.8&#10;Male sex	30 (60%)	28 (56%)&#10;BMI	27.1 [24.0–30.2]	26.8 [23.9–29.5]">${esc(G.t1 || '')}</textarea>
        <div class="row" style="gap:8px;align-items:center;margin-top:4px"><select data-g="t1cols" style="width:auto">${opt([['groups', 'Columns: the groups in order'], ['totfirst', 'Columns: Total, then the groups'], ['totlast', 'Columns: the groups, then Total']], G.t1cols || 'groups')}</select><button class="btn ghost small" type="button" id="genT1Go">Use these values</button><span class="legend-note" id="genT1Out">${t1Out}</span></div>
        <p class="legend-note">One row per line (cells separated by tabs, as copied from Word, or by ; or |). Rows are matched to the design's variables by name; a category name (e.g. ASA II) sets that category's %. Exact match is switched on. The data stay marked as simulated.</p></details>
      <details class="gen-det"><summary><b>More</b> <span class="legend-note">— free text, questionnaire consistency</span></summary><div class="gen-row"><label class="check" style="margin:0"><input type="checkbox" data-gx="freeText" ${G.freeText !== false ? 'checked' : ''}><span>Fill the free-text columns with plausible words (complications, reasons, occupation, comments)</span></label>
        ${[...new Set(D.vars.filter(v => v.scale).map(v => v.scale))].map(sc => `<span class="gen-ctl" title="Internal consistency of the items">${esc(sc)}: Cronbach's α <input type="number" step="0.05" min="0.1" max="0.97" data-galpha="${esc(sc)}" value="${esc(G.alpha[sc] ?? '')}" placeholder="≈ 0.8" style="width:62px"></span>`).join('')}</div></details>
    </div>`;
  }
  function preview(D) { const cols = B.columns(D).filter(c => D.layout !== 'long'), A = arms(D);
    return `<div class="tbl-wrap" style="max-height:260px"><table class="t mb-prev"><thead><tr><th>ID</th>${A.length >= 2 ? '<th>Group</th>' : ''}${cols.map(c => `<th>${esc(c.col)}</th>`).join('')}</tr></thead><tbody>${last.slice(0, 8).map(p => `<tr><td>${esc(p.id)}</td>${A.length >= 2 ? `<td>${esc(p.group)}</td>` : ''}${cols.map(c => { const o = p.vals[c.v.id] || {}, x = c.visit ? (o[c.visit.id] ?? (c.visit.id === D.visits[0].id ? o.once : null)) : (o.once ?? o[D.visits[0].id]); return `<td>${esc(x ?? '')}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`; }
  const dataCode = P => { if (!P || !P.length) return ''; const sig = JSON.stringify(P.slice(0, 40).map(p => [p.id, p.g, Object.values(p.vals).slice(0, 6)])); let h1 = 2166136261 >>> 0, h2 = 5381; for (const c of sig) { h1 = Math.imul(h1 ^ c.charCodeAt(0), 16777619) >>> 0; h2 = ((h2 * 33) ^ c.charCodeAt(0)) >>> 0; } return `SIM-${(h1 % 46656).toString(36).toUpperCase().padStart(3, '0')}-${(h2 % 46656).toString(36).toUpperCase().padStart(3, '0')}`; };
  function fill(D) { return { patients: last.map(p => ({ id: p.id, site: p.site, group: p.group, vals: p.vals })), simulated: { at: new Date().toISOString().slice(0, 10), seed: G.seed, n: last.length, code: dataCode(last), consort: lastConsort || undefined }, targets: targetsList(D).map(t => ({ ...t, cols: B.columns(D).filter(c => c.v.id === t.varId && (t.visit === 'once' ? !c.visit || c.visit.id === D.visits[0].id : c.visit && c.visit.id === t.visit)).map(c => c.col) })) }; }
  const fileName = D => `Simulated - ${B.fileBase()} - master sheet.xlsx`;
  async function send(D) { if (!last) { last = generate(D); } const blob = B.buildWorkbook(D, fill(D)), f = new File([blob], fileName(D)); B.setPhase('analyse'); U.go(1); await U.loadFile(f); }
  function onClick(e) {
    const go0 = e.target.closest('[data-grgo]'); if (go0) { G.res.only = go0.dataset.grgo; save(); return redrawOut(D0()); }
    const b = e.target.closest('button'); if (!b) return; const D = D0();
    if (b.id === 'genMulti') { const out = $('#genMultiOut'); out.textContent = 'Simulating…'; setTimeout(() => { try { out.innerHTML = multiPower(D, Math.min(1000, Math.max(20, +G.power.reps || 200))); } catch (err) { console.error(err); out.textContent = 'Failed: ' + err.message; } }, 30); return; }
    if (b.id === 'genInterim') { const out = $('#genInterimOut'); out.textContent = 'Simulating…'; setTimeout(() => { try { out.innerHTML = interimSim(D, Math.min(1000, Math.max(20, +G.power.reps || 200))); } catch (err) { console.error(err); out.textContent = 'Failed: ' + err.message; } }, 30); return; }
    if (b.id === 'genVar') { const out = $('#genVarOut'); out.textContent = 'Simulating 100 studies…'; setTimeout(() => { try { out.innerHTML = variability(D, 100); } catch (err) { console.error(err); out.textContent = 'Failed: ' + err.message; } }, 30); return; }
    if (b.id === 'genCmpSc') { const out = $('#genCmpScOut'); out.textContent = 'Simulating…'; setTimeout(() => { try { out.innerHTML = compareScenarios(D, Math.min(500, Math.max(20, +G.curve.reps || 100))); } catch (err) { console.error(err); out.textContent = 'Failed: ' + err.message; } }, 30); return; }
    if (b.id === 'genCsv' || b.id === 'genCsvLong') { csvOut(D, b.id === 'genCsvLong').catch(err => { console.error(err); toast('Could not make it: ' + err.message); }); return; }
    if (b.id === 'genMethods') { methodsDoc(D).catch(err => { console.error(err); toast('Could not make it: ' + err.message); }); return; }
    if (b.id === 'genErrKey') { errorKey(D); return; }
    if (b.id === 'genEx') { exercisesDoc(D).catch(err => { console.error(err); toast('Could not make it: ' + err.message); }); return; }
    if (b.id === 'genT1Go') { const ta = $('#genT1'); G.t1 = ta ? ta.value : ''; const r = fromTable1(D, G.t1, G.t1cols || 'groups'); save(); t1Out = esc(r); if (last) { try { last = generate(D); resStamp++; } catch (err) { console.error(err); } } return render(); }
    if (b.dataset.gxadd) { const [kind, id] = b.dataset.gxadd.split('|'); (G[kind][id] = G[kind][id] || []).push(kind === 'risk' ? { v: '', or: 2, per: 1 } : { v: '', b: 1 }); save(); return render(); }
    if (b.dataset.gxdel) { const [kind, id, i] = b.dataset.gxdel.split('|'); G[kind][id].splice(+i, 1); save(); if (last) { last = generate(D); resStamp++; } return render(); }
    if (b.dataset.gxrm) { const [kind, id] = b.dataset.gxrm.split('|'); delete G[kind][id]; save(); if (last) { last = generate(D); resStamp++; } return render(); }
    if (b.dataset.gmore) { G.more[b.dataset.gmore] = !G.more[b.dataset.gmore]; save(); return render(); }
    if (b.dataset.geffgo) { const v = D.vars.find(x => x.id === b.dataset.geffgo), inp = b.parentNode.querySelector('[data-geff]'), eff = inp && inp.value !== '' ? +inp.value : (v && v.type === 'num' ? 0.5 : 0.5); if (!v || !isFinite(eff)) return; delete G.sig[v.id]; applyEffect(D, v, eff); save(); if (last) { last = generate(D); resStamp++; } render(); toast(`${v.label}: ${v.type === 'num' ? `d = ${eff}` : `relative risk ${eff}`} set for the other groups`); return; }
    if (b.dataset.gpatgo) { const v = D.vars.find(x => x.id === b.dataset.gpatgo); if (!v) return; const box = b.parentNode, by = box.querySelector('[data-gpatby]'), amt = by && by.value !== '' ? +by.value : -sdOf(v); let n = 0;
      box.querySelectorAll('[data-gpat]').forEach(sel => { if (!sel.value) return; applyPattern(D, v, +sel.dataset.gpat.split('|')[1], sel.value, amt); n++; }); if (!n) { toast('Choose a pattern for at least one group'); return; } save(); if (last) { last = generate(D); resStamp++; } render(); toast(`${v.label}: pattern over the visits set`); return; }
    if (b.id === 'genScenSave') { const nm = (prompt('Name of this scenario (e.g. Expected, Optimistic, Pessimistic):', 'Expected') || '').trim(); if (!nm) return; const all = scenarios(); all[nm] = JSON.parse(JSON.stringify(G)); ls.set('scenarios', all); render(); toast(`Scenario “${nm}” saved`); return; }
    if (b.id === 'genScenDel') { const nm = (prompt(`Delete which scenario? (${Object.keys(scenarios()).join(', ')})`) || '').trim(); const all = scenarios(); if (!all[nm]) return; delete all[nm]; ls.set('scenarios', all); render(); toast(`Scenario “${nm}” deleted`); return; }
    if (b.id === 'genScenNull') { if (!confirm('Give every group the same values for every variable (the expected values of the design)? Your typed group values are cleared.')) return; G.targets = {}; G.rt = {}; G.sig = {}; G.subg = {}; save(); if (last) { last = generate(D); resStamp++; } render(); toast('Null scenario: no differences between the groups'); return; }
    if (b.id === 'genInterimData') { interimData(D).catch(err => { console.error(err); toast('Could not make it: ' + err.message); }); return; }
    if (b.id === 'genExam') { examMode(D).catch(err => { console.error(err); toast('Could not make it: ' + err.message); }); return; }
    if (b.id === 'genTrapGo') { trapData(D, $('#genTrap').value).catch(err => { console.error(err); toast('Could not make it: ' + err.message); }); return; }
    if (b.dataset.gdiff) { difficulty(D, b.dataset.gdiff); return; }
    if (b.id === 'genMarPair') { marPair(D).catch(err => { console.error(err); toast('Could not make it: ' + err.message); }); return; }
    if (b.id === 'genPack') { pack(D).catch(err => { console.error(err); toast('Could not make the datasets: ' + err.message); }); return; }
    if (b.id === 'genCurve') { const out = $('#genCurveOut'), n0 = +G.n || +D.n || 60, from = Math.max(6, +G.curve.from || Math.max(10, Math.round(n0 / 2))), to = Math.max(from + 2, +G.curve.to || Math.round(n0 * 2)), reps = Math.min(1000, Math.max(20, +G.curve.reps || 100));
      if (!D.vars.find(x => x.id === G.power.v)) { out.innerHTML = '<p class="legend-note">Choose the main outcome in “Power of the planned study” first.</p>'; return; }
      const ns = [...new Set(Array.from({ length: 7 }, (_, i) => Math.round(from + (to - from) * i / 6)))], pts = []; out.innerHTML = '<p class="legend-note">Simulating…</p>';
      const step = i => { if (i >= ns.length) { const n80 = pts.find(p => p[1] >= 80), n90 = pts.find(p => p[1] >= 90); curveOut = curveSvg(pts) + `<p class="legend-note">${pts.map(p => `${p[0]}: ${isFinite(p[1]) ? p[1] + '%' : '—'}`).join(' · ')}${n80 ? ` — about <b>${n80[0]}</b> patients for 80%` : ' — 80% not reached in this range'}${n90 ? `, <b>${n90[0]}</b> for 90%` : ''} (${reps} studies per point).</p>`; out.innerHTML = curveOut; return; }
        pts.push([ns[i], powerAt(D, ns[i], reps)]); out.innerHTML = `<p class="legend-note">Simulating… ${i + 1} of ${ns.length}</p>`; setTimeout(() => step(i + 1), 20); };
      setTimeout(() => step(0), 20); return; }
    if (b.dataset.gview) { G.view = b.dataset.gview; save(); return render(); }
    if (b.dataset.gre || b.dataset.greset) { const id = b.dataset.gre || b.dataset.greset; if (b.dataset.gre) G.vseed[id] = (+G.vseed[id] || 0) + 1; else delete G.vseed[id]; save();
      try { last = generate(D); resStamp++; } catch (err) { console.error(err); toast('Could not generate: ' + err.message); } render(); const v = D.vars.find(x => x.id === id); if (v) toast(`${v.label}: ${b.dataset.gre ? 'drawn again' : 'back to its first draw'}`); return; }
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
    if (d.gx) { const path = d.gx.split('.'), v0 = t.type === 'checkbox' ? t.checked : t.type === 'number' ? (val === '' ? '' : +val) : val; let o = G; for (let i = 0; i < path.length - 1; i++) { if (o[path[i]] === undefined) o[path[i]] = /^\d+$/.test(path[i + 1]) ? [] : {}; o = o[path[i]]; } o[path[path.length - 1]] = v0; save();
      if (t.tagName === 'SELECT' || t.type === 'checkbox') { if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); } return live(D0()); }
    if (d.gxnew) { if (!val) return; (G[d.gxnew][val] = G[d.gxnew][val] || []).push(d.gxnew === 'risk' ? { v: '', or: 2, per: 1 } : { v: '', b: 1 }); save(); return render(); }
    if (d.gord) { if (val === '') delete G.ordOR[d.gord]; else G.ordOR[d.gord] = +val; save(); return live(D0()); }
    if (d.gzp) { G.zpct[d.gzp] = val; save(); return live(D0()); }
    if (d.gslope) { G.slope[d.gslope] = val; save(); return live(D0()); }
    if (d.galpha) { G.alpha[d.galpha] = val; save(); return live(D0()); }
    if (d.gpow) { G.power[d.gpow] = val; save(); return; }
    if (d.gmulti) { const L = new Set(G.power.multi || []); if (t.checked) L.add(d.gmulti); else L.delete(d.gmulti); G.power.multi = [...L]; save(); return; }
    if (d.gint) { G.interim[d.gint] = val; save(); return; }
    if (d.gdist) { if (val) G.dist[d.gdist] = val; else delete G.dist[d.gdist]; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); }
    if (d.ground) { if (val) G.round[d.ground] = val; else delete G.round[d.ground]; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); }
    if (d.gsubv) { if (val) { const m = D0().vars.find(x => x.id === val); G.subg[d.gsubv] = { v: val, cat: m ? m.cats[0] : '' }; } else delete G.subg[d.gsubv]; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); }
    if (d.gsubc) { G.subg[d.gsubc] = { ...(G.subg[d.gsubc] || {}), cat: val }; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); }
    if (d.gscen) { const sc = scenarios()[val]; if (!sc) return; G = { ...defaults(), ...JSON.parse(JSON.stringify(sc)) }; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } render(); toast(`Scenario “${val}” opened`); return; }
    if (d.gexam) { G.exam = val; save(); return; }
    if (d.gpack) { G.pack[d.gpack] = val; save(); return; }
    if (d.gcv) { G.curve[d.gcv] = val; save(); return; }
    if (d.geff || d.gpat || d.gpatby) return;
    if (d.gmode) { G.mode[d.gmode] = val; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); }
    if (d.gsig !== undefined) { if (val) G.sig[d.gsig] = val; else delete G.sig[d.gsig]; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); }
    if (d.grng) { const [id, k] = d.grng.split('|'); (G.rng[id] = G.rng[id] || {})[k] = val === '' ? '' : +val; save(); return live(D0()); }
    if (d.grt) { const [id, g, key, k] = d.grt.split('|'); (((G.rt[id] = G.rt[id] || {})[g] = G.rt[id][g] || {})[key] = G.rt[id][g][key] || {})[k] = val === '' ? '' : +val; save(); return live(D0()); }
    if (d.gr) { G.res[d.gr] = val; save(); if (d.gr !== 'live') redrawOut(D0()); return; }
    if (d.g) { G[d.g] = val; save(); if (['missType', 'missBy', 'missGroup'].includes(d.g)) { if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); }
      if (G.res.live && last && d.g !== 'seed') { if (t.type === 'checkbox') render(); live(D0()); return; } last = null; if (t.type === 'checkbox') render(); else redrawOut(D0()); return; }
    if (d.gt) { set(d.gt, val === '' ? '' : +val); save(); return live(D0()); }
    if (d.gtp) { if (val === '') set(d.gtp, ''); else { const p = Math.max(0, Math.min(100, +val)); set(d.gtp, [p, 100 - p]); } save(); return live(D0()); }
    if (d.gtc) { const ps = String(val).split(/[ ,;/]+/).map(Number).filter(x => isFinite(x)); set(d.gtc, ps.length ? ps : ''); save(); return live(D0()); }
    if (d.gsd) { G.sds[d.gsd] = val; save(); return live(D0()); }
    if (d.gsdt) { const [id, g, key] = d.gsdt.split('|'); ((G.sdt[id] = G.sdt[id] || {})[g] = G.sdt[id][g] || {})[key] = val === '' ? '' : +val; save(); return live(D0()); }
    if (d.gmiss) { G.miss[d.gmiss] = val; save(); return live(D0()); }
    if (d.gc) { const [i, k] = d.gc.split('|'); G.corr[+i][k] = k === 'r' ? +val : val; save(); return live(D0()); }
    if (d.gp) { G.power[d.gp] = val; save(); if (t.tagName === 'SELECT') render(); return; }
  }
  window.EasyGen = { render, generate: (d, o) => generate(d || D0(), o), power: d => power(d || D0()), targetsList, observed, get settings() { return G; }, set settings(x) { G = { ...defaults(), ...x }; save(); }, get last() { return last; }, get results() { return resOut; }, get errors() { return lastErrors; }, get consort() { return lastConsort; }, dataCode: P => dataCode(P || last), pTestX: (v, key, P, test) => pTestX(D0(), v, key, P, test), multiPower: r => multiPower(D0(), r), interimSim: r => interimSim(D0(), r), variability: r => variability(D0(), r), get sigInfo() { return sigInfo; }, numParams: v => numParams(v, 0, 'once') };
  if (document.documentElement.classList.contains('ph-generate')) render();
})();

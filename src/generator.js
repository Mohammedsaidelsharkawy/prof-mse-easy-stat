/* Prof MSE Easy Stat — phase 2, the data generator: fills the master sheet designed in phase 1 with simulated patients
   (for teaching, testing an analysis plan and checking a sample size). Expected values come from the design and can be
   set here for each group and visit; links between variables, missing data, dropouts, outliers and "messy" entries make it
   realistic; a power simulation repeats it many times. The sheet is marked as simulated inside the file. */
(() => {
  const U = window.EasyUI, B = window.EasyBuilder; if (!U || !B) return;
  const $ = s => document.querySelector(s), esc = U.esc, toast = U.toast;
  const ls = { get: (k, d) => { try { const v = localStorage.getItem('gen.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('gen.' + k, JSON.stringify(v)); } catch (e) { /* not kept */ } } };
  const defaults = () => ({ n: '', ratio: '', seed: 20261107, visitR: 0.6, missAll: 0, miss: {}, dropout: 0, mode: {}, rng: {}, rt: {}, sig: {}, vseed: {}, view: 'table', dist: {}, round: {}, subg: {}, more: {}, missType: 'mcar', missBy: '', missGroup: '0', icc: 0, curve: { from: '', to: '', reps: 100 }, pack: { n: 10 }, outliers: 0, messy: false, messyPct: 3, start: '2026-01-01', span: 365, targets: {}, sds: {}, corr: [], power: { v: '', visit: '', reps: 200, alpha: 0.05 }, res: { view: 'half', only: '', comments: true, live: true } });
  let G = { ...defaults(), ...ls.get('settings', {}) }, last = null, powerOut = '', resKey = '', resOut = null, liveT = 0;
  G.res = { ...defaults().res, ...(G.res || {}) }; ['mode', 'rng', 'rt', 'sig', 'vseed', 'dist', 'round', 'subg', 'more'].forEach(k => { G[k] = G[k] || {}; }); G.curve = { from: '', to: '', reps: 100, ...(G.curve || {}) }; G.pack = { n: 10, ...(G.pack || {}) }; G.missType = G.missType || 'mcar';
  // settings kept from an earlier version: the old defaults of missing values (2%) and dropouts (5%) become 0
  if (!G.v2) { if (+G.missAll === 2) G.missAll = 0; if (+G.dropout === 5) G.dropout = 0; G.v2 = true; }
  let SIG = {}, sigInfo = {};
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
    const pc = Array.isArray(t) ? t : (e.pct && e.pct.length === v.cats.length ? e.pct : v.cats.map(() => 100 / v.cats.length)); const s = pc.reduce((a, b) => a + (+b || 0), 0) || 1; return pc.map(x => (+x || 0) / s);
  }
  const sdOf = v => { const s = G.sds[v.id] !== undefined && G.sds[v.id] !== '' ? +G.sds[v.id] : +expect(v).sd; return isFinite(s) && s > 0 ? s : Math.max(0.5, Math.abs(target(v, 0, 'once')) * 0.2); };
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
    const L = limits(v, mode === 'range' ? 'both' : mode); return { m: target(v, g, key), sd: sdOf(v), lo: L.lo, hi: L.hi, dist: G.dist[v.id] || e.dist };
  }
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
  const hashOf = s0 => { let h = 7; for (const c of String(s0)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % 100003; };
  // the key compared by the test: the last visit of the variable (one group: the first against the last visit)
  const sigKey = (D, v) => visitKeys(D, v).slice(-1)[0];
  // "significant": group targets far enough apart for a power of about 95% with these patients; "not significant": the same targets in every group
  function sigTargets(D) {
    const out = {}, k = K(D), n = Math.max(2, +G.n || +D.n || 60), za = 1.96, zb = 1.645, St = typeof Stats !== 'undefined' ? Stats : null;
    D.vars.forEach(v => { const want = G.sig[v.id]; if (!want || !['num', 'yn', 'cat'].includes(v.type)) return; const keys = visitKeys(D, v), key = sigKey(D, v), o = out[v.id] = {}, put = (g, kk, x) => { (o[g] = o[g] || {})[kk] = x; };
      if (k < 2 && keys.length < 2) { delete out[v.id]; return; }
      if (v.type === 'num') { const mode = modeOf(v), base = (g, kk) => { if (mode === 'range') { const r = cellRange(v, g, kk); return r.lo !== null && r.hi !== null ? (r.lo + r.hi) / 2 : target(v, g, kk); } return target(v, g, kk); };
        const sd = mode === 'range' ? (() => { const r = cellRange(v, 0, key); return r.lo !== null && r.hi !== null ? (r.hi - r.lo) / 4 : sdOf(v); })() : sdOf(v), L = limits(v, mode === 'msd' ? 'both' : mode);
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
  function adjust(D, P, opt) {
    const groups = P.map(p => p.g), seed = +opt.seed || +G.seed || 1;
    const redraw = (v, r) => { const Q = generate(D, { ...opt, seed: seed + 104729 * r + hashOf(v.id), groups, stage1: true }); P.forEach((p, i) => { p.vals[v.id] = Q[i].vals[v.id]; }); };
    Object.entries(G.vseed).forEach(([id, r]) => { const v = D.vars.find(x => x.id === id); if (v && +r) redraw(v, +r); });
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
    sigInfo = {};
    D.vars.forEach(v => { const want = G.sig[v.id]; if (!want || !SIG[v.id]) return; const key = sigKey(D, v); let p = pTest(D, v, key, P), t = 0; const ok = () => want === 'sig' ? p < 0.05 : !(p < 0.05);
      while (isFinite(p) && !ok() && t < 15) { t++; redraw(v, 5000 + t + (+G.vseed[v.id] || 0)); p = pTest(D, v, key, P); } sigInfo[v.id] = { p, ok: isFinite(p) && ok(), key, want }; });
  }
  function generate(D, opt = {}) {
    if (!opt.stage1 && !opt.plain) SIG = sigTargets(D); else if (opt.plain) SIG = {};
    const rnd = B.prng((+opt.seed || +G.seed || 1) >>> 0), norm = () => { let u = 0; while (!u) u = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rnd()); };
    const n = Math.max(2, +G.n || +D.n || 60), A = arms(D), k = K(D), rho = Math.min(0.95, Math.max(0, +G.visitR || 0));
    // groups: the randomisation list of the design, or the ratio (e.g. 1:1, 2:1), shuffled
    let grp = [];
    const sites = (D.sites || []).filter(x => x && x.name), per = sites.length ? Math.ceil(n / sites.length) : n;
    if (opt.groups) grp = [...opt.groups]; else {
    if (A.length >= 2) { if (D.rand && D.rand.on && !(D.rand.strata || []).length) { const rl = B.randomisation({ ...D, n }); grp = (sites.length && rl.length === sites.length ? rl.flatMap(r => r.list.slice(0, per)).slice(0, n) : rl[0].list).map(a => A.indexOf(a)); }
      else { const r = String(G.ratio || A.map(() => 1).join(':')).split(/[:,/ ]+/).map(Number).map(x => x > 0 ? x : 1), tot = r.slice(0, A.length).reduce((a, b) => a + b, 0) || A.length;
        A.forEach((_, i) => { const m = Math.round(n * (r[i] || 1) / tot); for (let j = 0; j < m; j++) grp.push(i); }); while (grp.length < n) grp.push(grp.length % A.length); grp = grp.slice(0, n);
        for (let i = grp.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [grp[i], grp[j]] = [grp[j], grp[i]]; } } }
    else grp = Array(n).fill(0); }
    const vars = D.vars, lat = vars.map(() => null), P = [];
    for (let i = 0; i < n; i++) {
      // a patient's level of each variable (the same patient across visits), linked between variables where asked
      const u = {}; vars.forEach(v => { u[v.id] = norm(); });
      // the items of a scale answer together (a shared level of the patient)
      if (vars.some(v => v.scale)) { const sh = {}; vars.forEach(v => { if (!v.scale) return; const s0 = sh[v.scale] ?? (sh[v.scale] = norm()); u[v.id] = Math.sqrt(0.6) * s0 + Math.sqrt(0.4) * u[v.id]; }); }
      (G.corr || []).forEach(c => { if (u[c.a] === undefined || u[c.b] === undefined) return; const r = Math.max(-0.95, Math.min(0.95, +c.r || 0)); u[c.b] = r * u[c.a] + Math.sqrt(1 - r * r) * u[c.b]; });
      const g = grp[i], vals = {};
      vars.forEach(v => { if (!['num', 'yn', 'cat', 'multi'].includes(v.type)) return; const o = vals[v.id] = {};
        const keys = visitKeys(D, v); keys.forEach(key => { const z = keys.length === 1 ? u[v.id] : Math.sqrt(rho) * u[v.id] + Math.sqrt(1 - rho) * norm(); // one measurement: the patient's own level
          if (v.type === 'multi') { const pc = expect(v).pct || []; o[key] = v.cats.filter((c, ci) => rnd() * 100 < (isFinite(+pc[ci]) ? +pc[ci] : 20)); return; }
          if (v.type === 'num') { const np = numParams(v, g, key), m = np.m, sd = np.sd, e = { dist: np.dist }; let x;
            const ln = zz => { const s2 = Math.log(1 + sd * sd / (m * m)); return Math.exp(Math.log(m) - s2 / 2 + Math.sqrt(s2) * zz); };
            // normal; skewed to the right (log-normal); skewed to the left (its mirror image); uniform (the same mean and SD)
            const draw = zz => { if (e.dist === 'skewed' && m > 0) return ln(zz); if (e.dist === 'lskew' && m > 0) return 2 * m - ln(-zz); if (e.dist === 'uniform') return m + sd * Math.sqrt(3) * (2 * jStat.normal.cdf(zz, 0, 1) - 1); return m + sd * zz; };
            x = draw(z);
            // the simulated Min and Max of the design: a value outside is drawn again (a truncated distribution), then kept within them
            const lo = np.lo, hi = np.hi;
            if (lo !== null || hi !== null) { for (let t = 0; t < 30 && ((lo !== null && x < lo) || (hi !== null && x > hi)); t++) x = draw(norm()); if (lo !== null) x = Math.max(lo, x); if (hi !== null) x = Math.min(hi, x); }
            if (v.min !== '' && isFinite(+v.min)) x = Math.max(+v.min, x); if (v.max !== '' && isFinite(+v.max)) x = Math.min(+v.max, x);
            const dd = decOf(v, sd), rr = +G.round[v.id] || 0; if (rr > 0) { x = Math.round(x / rr) * rr; o[key] = +x.toFixed(Math.max(0, (String(rr).split('.')[1] || '').length)); } else o[key] = +x.toFixed(dd); }
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
      const si = sites.length ? Math.min(sites.length - 1, Math.floor(i / per)) : -1;
      P.push({ id: si >= 0 ? `${sites[si].prefix || ''}${String(i - si * per + 1).padStart(+D.idDigits || 3, '0')}` : `${D.idPrefix || ''}${String(i + 1).padStart(+D.idDigits || 3, '0')}`, site: si >= 0 ? sites[si].name : undefined, g, group: A.length >= 2 ? A[g] : null, vals });
    }
    if (opt.stage1) return P;
    if (!opt.plain) adjust(D, P, opt);
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
    P.forEach(p => { const drop = D.visits.length > 1 && rnd() * 100 < (+G.dropout || 0) ? 1 + Math.floor(rnd() * (D.visits.length - 1)) : 0;
      vars.forEach(v => { const o = p.vals[v.id]; if (!o) return; Object.keys(o).forEach(key => { const vi = VK.indexOf(key);
        if (drop && vi >= drop) { o[key] = null; return; }
        const pm = (G.miss[v.id] !== undefined && G.miss[v.id] !== '' ? +G.miss[v.id] : +G.missAll || 0) * missWeight(D, p, v, key); if (v.type !== 'calc' && !v.required && rnd() * 100 < pm) o[key] = null;
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
    try { for (let r = 0; r < reps; r++) { const p = pTest(D, v, key, generate(D, { seed: (+G.seed || 1) + 7919 * (r + 1), plain: true })); if (isFinite(p)) { done++; if (p < alpha) hit++; } } } finally { Object.assign(G, keep); }
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
      <p class="legend-note">Numbers: generated by <b>mean & SD</b> (SD shared by the groups), by <b>min & max</b> (spread between them, centred), or <b>both</b> (mean & SD kept within min–max); yes/no: the % ${esc('Yes')}; categories: the % of each, separated by commas. Empty cells use the expected values of the design (shown in grey) — type different values to make a difference between the groups or a change over the visits.</p> <span class="legend-note">“Significant” or “Not significant” sets the group values (or the change over the visits) so that the difference is clearly there or absent with these patients — the values used are shown after →, and the P value reached after generating.</span>
      ${targetsHtml(D, vs, gl, block)}
      ${dates.length || calcs.length ? `<p class="legend-note">${dates.length ? `Dates (${esc(dates.map(v => v.label).join(', '))}) follow each other from the day of enrolment (study start <input type="date" data-g="start" value="${esc(G.start)}"> over <input type="number" min="1" data-g="span" value="${esc(G.span)}" style="width:70px"> days); the days between them are set in the design. ` : ''}${calcs.length ? `Calculated columns (${esc(calcs.map(v => v.label).join(', '))}) are computed.` : ''}</p>` : ''}
      <h3>Links between variables</h3><p class="legend-note">A correlation between two variables (e.g. age and systolic BP 0.4; diabetes with HbA1c 0.6: a higher value goes with more “Yes”).</p>
      ${(G.corr || []).map((c, i) => `<div class="row" style="gap:6px;margin:4px 0"><select data-gc="${i}|a" style="width:auto">${opt([['', '—'], ...vs.map(v => [v.id, v.label])], c.a)}</select><span>with</span><select data-gc="${i}|b" style="width:auto">${opt([['', '—'], ...vs.map(v => [v.id, v.label])], c.b)}</select><span>r =</span><input type="number" min="-0.95" max="0.95" step="0.05" data-gc="${i}|r" value="${esc(c.r)}" style="width:80px"><button class="btn ghost small" type="button" data-gcdel="${i}">✕</button></div>`).join('')}
      <button class="btn ghost small" type="button" id="genCorrAdd">+ Link</button>
      <h3>Realism</h3><div class="grid g4">
        <div><label class="f">Missing values (% of every variable)</label><input type="number" min="0" max="90" step="any" data-g="missAll" value="${esc(G.missAll)}"></div>
        <div><label class="f">Patients who drop out (%)</label><input type="number" min="0" max="90" step="any" data-g="dropout" value="${esc(G.dropout)}" ${D.visits.length > 1 ? '' : 'disabled'}></div>
        <div><label class="f">Outliers (% of the numbers)</label><input type="number" min="0" max="20" step="any" data-g="outliers" value="${esc(G.outliers)}"></div>
        <div><label class="f">Missing values are</label><select data-g="missType">${opt([['mcar', 'At random (MCAR)'], ['mar', 'More when another variable is high (MAR)'], ['mnar', 'More when the value itself is high (MNAR)'], ['group', 'More in one group']], G.missType)}</select>
          ${G.missType === 'mar' ? `<select data-g="missBy" style="margin-top:4px">${opt([['', '— which variable —'], ...vs.map(v => [v.id, v.label])], G.missBy)}</select>` : ''}${G.missType === 'group' && A.length >= 2 ? `<select data-g="missGroup" style="margin-top:4px">${opt(A.map((a, i) => [String(i), a]), G.missGroup)}</select>` : ''}</div>
        ${(D.sites || []).filter(x => x.name).length >= 2 ? `<div><label class="f">Centre effect (intraclass correlation)</label><input type="number" min="0" max="0.6" step="0.01" data-g="icc" value="${esc(G.icc)}" title="How alike the patients of one site are (0: not at all; 0.05 is common)"></div>` : ''}
        <div><label class="check" style="margin-top:22px"><input type="checkbox" data-g="messy" ${G.messy ? 'checked' : ''}><span><b>Messy entries</b> (to practise cleaning) — <input type="number" min="0.5" max="30" step="0.5" data-g="messyPct" value="${esc(G.messyPct)}" style="width:56px">% of the cells: units typed in, ×10 typing errors, 999, male / MALE / M, duplicated IDs</span></label></div></div>
      <div class="row" style="gap:8px;margin-top:14px"><button class="btn primary" type="button" id="genGo">🎲 Generate</button><button class="btn ghost" type="button" id="genXlsx" ${last ? '' : 'disabled'}>⬇ Simulated master sheet (.xlsx)</button><span class="gen-ctl" title="Several datasets from consecutive seeds, in one zip, with an answer key — e.g. one per student">⬇ <input type="number" min="2" max="50" data-gpack="n" value="${esc(G.pack.n)}" style="width:52px"> datasets<button class="btn ghost small" type="button" id="genPack">+ answer key (.zip)</button></span><button class="btn ghost" type="button" id="genSend2" ${last ? '' : 'disabled'}>📊 Analyse these data ›</button><span class="legend-note" id="genStatus">${last ? `${last.length} rows generated (seed ${esc(G.seed)})` : 'Not generated yet'}</span></div>
      <div id="genOut">${outHtml(D)}</div>
      <h3>Power of the planned study</h3><p class="legend-note">The study is simulated many times with these settings, and the main outcome tested each time: the share of significant results is the power.</p>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><div><label class="f">Main outcome</label><select data-gp="v" style="width:auto">${opt([['', '—'], ...vs.map(v => [v.id, v.label])], G.power.v)}</select></div>
        ${(() => { const v = D.vars.find(x => x.id === G.power.v); return v && visitKeys(D, v).length > 1 ? `<div><label class="f">At</label><select data-gp="visit" style="width:auto">${opt(visitKeys(D, v).map(k2 => [k2, visitName(D, k2)]), G.power.visit || visitKeys(D, v).slice(-1)[0])}</select></div>` : ''; })()}
        <div><label class="f">Simulated studies</label><input type="number" min="20" max="2000" data-gp="reps" value="${esc(G.power.reps)}" style="width:90px"></div><div><label class="f">Significance level</label><input type="number" min="0.001" max="0.2" step="0.005" data-gp="alpha" value="${esc(G.power.alpha)}" style="width:90px"></div>
        <button class="btn ghost" type="button" id="genPower">Run</button></div><div class="legend-note" id="genPowerOut" style="margin-top:6px;font-size:14px">${powerOut}</div>
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
        return `<input type="number" step="any" data-gt="${v.id}|${g}|${key}" value="${esc(t ?? '')}" placeholder="${esc(e.mean ?? '')}" style="width:80px" title="Mean">${forced !== undefined ? `<span class="gen-forced" title="Mean used for the difference asked">→ ${+(+forced).toFixed(2)}</span>` : ''}`; }
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
  const moreCount = v => [G.dist[v.id], +G.round[v.id] > 0, G.subg[v.id] && G.subg[v.id].v].filter(Boolean).length;
  function morePanel(D, v) {
    const k = K(D), keys = visitKeys(D, v), gl = k >= 2 ? arms(D) : ['All patients'], e = expect(v), sg = G.subg[v.id] || {}, mods = D.vars.filter(x => x.id !== v.id && (x.type === 'yn' || x.type === 'cat') && x.cats.length), mod = mods.find(x => x.id === sg.v);
    const num = v.type === 'num', bin = v.type === 'yn' || v.cats.length === 2;
    return `<div class="gen-more">
      ${num ? `<label class="gen-ctl">Shape <select data-gdist="${v.id}">${opt([['', `As the design (${e.dist === 'skewed' ? 'skewed' : 'normal'})`], ['normal', 'Normal'], ['skewed', 'Skewed to the right (log-normal)'], ['lskew', 'Skewed to the left'], ['uniform', 'Uniform (flat)']], G.dist[v.id] || '')}</select></label>
        <label class="gen-ctl" title="Digit preference, e.g. blood pressure read to the nearest 5">Round to <select data-ground="${v.id}">${opt([['', 'decimals of the design'], ['0.1', '0.1'], ['0.5', '0.5'], ['1', '1'], ['2', '2'], ['5', '5'], ['10', '10']], G.round[v.id] || '')}</select></label>` : ''}
      ${k >= 2 && (num || bin) ? `<span class="gen-ctl">Effect: ${num ? `Cohen's d <input type="number" step="0.05" data-geff="${v.id}" placeholder="0.5" style="width:62px">` : `relative risk <input type="number" step="0.05" min="0" data-geff="${v.id}" placeholder="0.5" style="width:62px">`}<button class="btn ghost small" type="button" data-geffgo="${v.id}" title="Fill the other groups' ${num ? 'means' : '%'} from the first group's${keys.length > 1 ? ' at every visit after the first' : ''}">Apply</button></span>` : ''}
      ${num && keys.length > 2 ? `<span class="gen-ctl">Over the visits: ${gl.map((g, gi) => `<span title="${esc(g)}">${esc(g)} <select data-gpat="${v.id}|${gi}">${opt([['', '—'], ['flat', 'Flat'], ['linear', 'Steady change'], ['fast', 'Fast, then plateau'], ['late', 'Slow, then fast'], ['dip', 'Change, then back']], '')}</select></span>`).join(' ')}
        by <input type="number" step="any" data-gpatby="${v.id}" placeholder="${esc(+((sdOf(v)) * -1).toFixed(2))}" style="width:66px" title="The change from the first visit at its largest (negative: a fall)"><button class="btn ghost small" type="button" data-gpatgo="${v.id}">Apply</button></span>` : ''}
      ${k >= 2 && mods.length ? `<span class="gen-ctl">Effect only when <select data-gsubv="${v.id}">${opt([['', '— every patient —'], ...mods.map(x => [x.id, x.label])], sg.v || '')}</select>${mod ? ` is <select data-gsubc="${v.id}">${opt(mod.cats.map(c => [c, c]), sg.cat || mod.cats[0])}</select>` : ''}</span>` : ''}
    </div>`;
  }
  // a quick effect: the other groups' targets from the first group's, by Cohen's d (numbers) or a relative risk (yes / no)
  function applyEffect(D, v, eff) { const k = K(D), keys = visitKeys(D, v), useKeys = keys.length > 1 ? keys.slice(1) : keys, T = G.targets[v.id] = G.targets[v.id] || {};
    useKeys.forEach(key => { for (let g = 1; g < k; g++) { const fr = (k > 2 ? g / (k - 1) : 1);
      if (v.type === 'num') { const m0 = target(v, 0, key), sd = sdOf(v); (T[g] = T[g] || {})[key] = +(m0 + eff * fr * sd).toFixed(3); }
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
  let curveOut = '';
  function preview(D) { const cols = B.columns(D).filter(c => D.layout !== 'long'), A = arms(D);
    return `<div class="tbl-wrap" style="max-height:260px"><table class="t mb-prev"><thead><tr><th>ID</th>${A.length >= 2 ? '<th>Group</th>' : ''}${cols.map(c => `<th>${esc(c.col)}</th>`).join('')}</tr></thead><tbody>${last.slice(0, 8).map(p => `<tr><td>${esc(p.id)}</td>${A.length >= 2 ? `<td>${esc(p.group)}</td>` : ''}${cols.map(c => { const o = p.vals[c.v.id] || {}, x = c.visit ? (o[c.visit.id] ?? (c.visit.id === D.visits[0].id ? o.once : null)) : (o.once ?? o[D.visits[0].id]); return `<td>${esc(x ?? '')}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div>`; }
  function fill(D) { return { patients: last.map(p => ({ id: p.id, site: p.site, group: p.group, vals: p.vals })), simulated: { at: new Date().toISOString().slice(0, 10), seed: G.seed, n: last.length }, targets: targetsList(D).map(t => ({ ...t, cols: B.columns(D).filter(c => c.v.id === t.varId && (t.visit === 'once' ? !c.visit || c.visit.id === D.visits[0].id : c.visit && c.visit.id === t.visit)).map(c => c.col) })) }; }
  const fileName = D => `Simulated - ${B.fileBase()} - master sheet.xlsx`;
  async function send(D) { if (!last) { last = generate(D); } const blob = B.buildWorkbook(D, fill(D)), f = new File([blob], fileName(D)); B.setPhase('analyse'); U.go(1); await U.loadFile(f); }
  function onClick(e) {
    const go0 = e.target.closest('[data-grgo]'); if (go0) { G.res.only = go0.dataset.grgo; save(); return redrawOut(D0()); }
    const b = e.target.closest('button'); if (!b) return; const D = D0();
    if (b.dataset.gmore) { G.more[b.dataset.gmore] = !G.more[b.dataset.gmore]; save(); return render(); }
    if (b.dataset.geffgo) { const v = D.vars.find(x => x.id === b.dataset.geffgo), inp = b.parentNode.querySelector('[data-geff]'), eff = inp && inp.value !== '' ? +inp.value : (v && v.type === 'num' ? 0.5 : 0.5); if (!v || !isFinite(eff)) return; delete G.sig[v.id]; applyEffect(D, v, eff); save(); if (last) { last = generate(D); resStamp++; } render(); toast(`${v.label}: ${v.type === 'num' ? `d = ${eff}` : `relative risk ${eff}`} set for the other groups`); return; }
    if (b.dataset.gpatgo) { const v = D.vars.find(x => x.id === b.dataset.gpatgo); if (!v) return; const box = b.parentNode, by = box.querySelector('[data-gpatby]'), amt = by && by.value !== '' ? +by.value : -sdOf(v); let n = 0;
      box.querySelectorAll('[data-gpat]').forEach(sel => { if (!sel.value) return; applyPattern(D, v, +sel.dataset.gpat.split('|')[1], sel.value, amt); n++; }); if (!n) { toast('Choose a pattern for at least one group'); return; } save(); if (last) { last = generate(D); resStamp++; } render(); toast(`${v.label}: pattern over the visits set`); return; }
    if (b.id === 'genScenSave') { const nm = (prompt('Name of this scenario (e.g. Expected, Optimistic, Pessimistic):', 'Expected') || '').trim(); if (!nm) return; const all = scenarios(); all[nm] = JSON.parse(JSON.stringify(G)); ls.set('scenarios', all); render(); toast(`Scenario “${nm}” saved`); return; }
    if (b.id === 'genScenDel') { const nm = (prompt(`Delete which scenario? (${Object.keys(scenarios()).join(', ')})`) || '').trim(); const all = scenarios(); if (!all[nm]) return; delete all[nm]; ls.set('scenarios', all); render(); toast(`Scenario “${nm}” deleted`); return; }
    if (b.id === 'genScenNull') { if (!confirm('Give every group the same values for every variable (the expected values of the design)? Your typed group values are cleared.')) return; G.targets = {}; G.rt = {}; G.sig = {}; G.subg = {}; save(); if (last) { last = generate(D); resStamp++; } render(); toast('Null scenario: no differences between the groups'); return; }
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
    if (d.gdist) { if (val) G.dist[d.gdist] = val; else delete G.dist[d.gdist]; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); }
    if (d.ground) { if (val) G.round[d.ground] = val; else delete G.round[d.ground]; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); }
    if (d.gsubv) { if (val) { const m = D0().vars.find(x => x.id === val); G.subg[d.gsubv] = { v: val, cat: m ? m.cats[0] : '' }; } else delete G.subg[d.gsubv]; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); }
    if (d.gsubc) { G.subg[d.gsubc] = { ...(G.subg[d.gsubc] || {}), cat: val }; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } return render(); }
    if (d.gscen) { const sc = scenarios()[val]; if (!sc) return; G = { ...defaults(), ...JSON.parse(JSON.stringify(sc)) }; save(); if (last) { try { last = generate(D0()); resStamp++; } catch (err) { console.error(err); } } render(); toast(`Scenario “${val}” opened`); return; }
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
    if (d.gmiss) { G.miss[d.gmiss] = val; save(); return live(D0()); }
    if (d.gc) { const [i, k] = d.gc.split('|'); G.corr[+i][k] = k === 'r' ? +val : val; save(); return live(D0()); }
    if (d.gp) { G.power[d.gp] = val; save(); if (t.tagName === 'SELECT') render(); return; }
  }
  window.EasyGen = { render, generate: (d, o) => generate(d || D0(), o), power: d => power(d || D0()), targetsList, observed, get settings() { return G; }, set settings(x) { G = { ...defaults(), ...x }; save(); }, get last() { return last; }, get results() { return resOut; }, get sigInfo() { return sigInfo; }, numParams: v => numParams(v, 0, 'once') };
  if (document.documentElement.classList.contains('ph-generate')) render();
})();

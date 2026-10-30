/* Prof MSE Easy Stat — runs the analysis and builds report models (tables, comments, figures) */
const Analysis = (() => {
  const S = Stats;
  const POSITIVE = /^(yes|y|true|positive|present|1|done|completed|pos)$/i;
  const NONNORMAL_SHARE = 0.25;
  // normality test for the current run: Shapiro–Wilk (default) or Kolmogorov–Smirnov with Lilliefors correction
  const normalityTest = name => name === 'ks' ? S.lilliefors : name === 'skewkurt' ? S.skewKurtZ : S.shapiroWilk;
  const NORM_NAME = o => o.normality === 'ks' ? 'Kolmogorov-Smirnov test (with Lilliefors correction)' : o.normality === 'skewkurt' ? 'z-scores of skewness and kurtosis (normal when both lie within ±1.96)' : 'Shapiro-Wilk test';
  // false discovery rate across the report: the first pass records every P value between the groups, the second uses the adjusted ones in the same order
  let P_HOOK = null;
  const hookP = p => { if (!P_HOOK || !isFinite(p)) return p; if (P_HOOK.mode === 'record') { P_HOOK.list.push(p); return p; } const q = P_HOOK.q[P_HOOK.i++]; return q === undefined ? p : q; };
  const benjaminiHochberg = ps => { const m = ps.length, o = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]), q = new Array(m); let mn = 1;
    for (let r = m - 1; r >= 0; r--) { mn = Math.min(mn, o[r][0] * m / (r + 1)); q[o[r][1]] = Math.min(1, mn); } return q; };
  let normality = S.shapiroWilk;
  const NUMW =['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten'];

  /* ---------- formatting ---------- */
  function fmt(v, d) {
    if (v === null || v === undefined || !isFinite(v)) return '—';
    const r = Math.round(v * 10 ** d) / 10 ** d;
    return (Object.is(r, -0) ? 0 : r).toString();
  }
  // number formats of the current run (step 5 options): P decimals, significance mark, mean/SD, IQR and percent styles
  let FMT = { pDig: 3, sig: '*', mean: 'pm', iqr: 'dash', pct: 1, pLead: true };
  // P values without the leading zero (".013", APA / AMA style) when pLead is off
  const pNum = v => { const t = v.toFixed(FMT.pDig); return FMT.pLead ? t : t.replace(/^0\./, '.'); };
  function fmtP(p, alpha) {
    if (p === null || p === undefined || !isFinite(p)) return '—';
    const thr = 10 ** -FMT.pDig, s = p < thr ? '<' + pNum(thr) : pNum(p);
    return s + (p <= alpha ? FMT.sig : '');
  }
  // compact letter display (insert-absorb): groups that share a letter do not differ significantly
  function compactLetters(k, sigPairs) {
    let sets = [new Set(Array.from({ length: k }, (_, i) => i))];
    for (const { i, j } of sigPairs) {
      const next = [];
      sets.forEach(st => { if (st.has(i) && st.has(j)) { const a = new Set(st), b2 = new Set(st); a.delete(i); b2.delete(j); next.push(a, b2); } else next.push(st); });
      sets = next.filter((st, si) => st.size && !next.some((o, oi) => oi !== si && [...st].every(x => o.has(x)) && (o.size > st.size || oi < si)));
    }
    sets.sort((a, b) => Math.min(...a) - Math.min(...b) || b.size - a.size);
    const ab = 'abcdefghijklmnopqrstuvwxyz';
    return Array.from({ length: k }, (_, g) => sets.map((st, si) => st.has(g) ? ab[si] : '').join(''));
  }
  const SUP = { a: 'ᵃ', b: 'ᵇ', c: 'ᶜ', d: 'ᵈ', e: 'ᵉ', f: 'ᶠ', g: 'ᵍ', h: 'ʰ', i: 'ⁱ', j: 'ʲ', k: 'ᵏ', l: 'ˡ', m: 'ᵐ', n: 'ⁿ', o: 'ᵒ', p: 'ᵖ' };
  const toSup = t => [...t].map(c => SUP[c] || c).join('');
  // p-value as used inside sentences: "= 0.013" or "< 0.001"
  const pTxt = p => { const thr = 10 ** -FMT.pDig; return p < thr ? '< ' + pNum(thr) : '= ' + pNum(p); };
  const msd = (m, sdv, d) => FMT.mean === 'paren' ? `${fmt(m, d)} (${fmt(sdv, d)})` : `${fmt(m, d)} ± ${fmt(sdv, d)}`;
  const iqrTxt = (a, b, d) => FMT.iqr === 'bracket' ? `[${fmt(a, d)}, ${fmt(b, d)}]` : FMT.iqr === 'endash' ? `${fmt(a, d)}–${fmt(b, d)}` : `${fmt(a, d)} - ${fmt(b, d)}`;
  const medIqr = (dd, d) => FMT.iqr === 'bracket' ? `${fmt(dd.median, d)} ${iqrTxt(dd.q1, dd.q3, d)}` : `${fmt(dd.median, d)} (${iqrTxt(dd.q1, dd.q3, d)})`;
  const pctTxt = v => fmt(v, FMT.pct);
  // a count in a table cell: 19 (63.3%), 19 (63.3), 19/30 (63.3%) or 63.3% (19)
  const npc = (cnt, pc, n) => { const p = pctTxt(pc);
    return FMT.cat === 'npctNoSign' ? `${cnt} (${p})` : FMT.cat === 'nN' ? `${cnt}/${n} (${p}%)` : FMT.cat === 'pctN' ? `${p}% (${cnt})` : `${cnt} (${p}%)`; };
  const meanSdName = lower => (FMT.mean === 'paren' ? 'Mean (SD)' : 'Mean ± SD').replace(/^M/, lower ? 'm' : 'M');
  function listJoin(a) {
    if (a.length <= 1) return a.join('');
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }
  // names like "HbA1c", "sFlt1" or "CRP" keep their case at the start of a sentence and inside it
  // names with a capital or digit after their first letter (HbA1c, QoL, sFlt1, CRP) keep their case
  const keepCase = s => /[A-Z\d]/.test(s.split(/\s/)[0].slice(1)) || /^[A-Z]{2,}/.test(s) || /^.[A-Z]/.test(s);
  const cap = s => s && !keepCase(s) ? s[0].toUpperCase() + s.slice(1) : s;
  // label without a trailing unit, for use inside sentences: "Age (years)" → "Age"
  const plain = s => s.replace(/\s*\([^)]*\)\s*$/, '');
  const lowerFirst = s => (s && !keepCase(s)) ? s[0].toLowerCase() + s.slice(1) : s;
  const nWord = n => NUMW[n] || String(n);
  // one-group studies (no group column): every patient belongs to the same group
  const ALL_GROUP = '__all__';
  const groupOf = (cfg, r) => cfg.noGroups ? ALL_GROUP : toCat(r[cfg.groupCol]);
  const isGroupCol = (cfg, col) => !cfg.noGroups && col === cfg.groupCol;
  // nice equal-width steps for axes and histogram bins (module level, for the sections outside run)
  function niceScale(min, max, ticks) {
    if (min === max) max = min + 1;
    const raw = (max - min) / ticks, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(x => x >= raw);
    return { min: Math.floor(min / step) * step, max: Math.max(Math.ceil(max / step) * step, Math.floor(min / step) * step + step), step };
  }
  // effect size of a between-group comparison with its magnitude (Cohen 1988):
  // two groups: Cohen's d (parametric) or r = |z| / √N (Mann-Whitney); more groups: η² (ANOVA) or ε² (Kruskal-Wallis); categories: Cramér's V
  function effectMagnitude(r, k, opts = {}) {
    const lab = (v, cuts) => {
      // d-type cut-offs follow the chosen convention: Cohen (0.2/0.5/0.8), Sawilowsky (adds very small, very large, huge) or Ferguson (0.41/1.15/2.70)
      if (cuts[0] === 0.2 && opts.effConv === 'sawilowsky') return v < 0.1 ? 'negligible' : v < 0.2 ? 'very small' : v < 0.5 ? 'small' : v < 0.8 ? 'medium' : v < 1.2 ? 'large' : v < 2 ? 'very large' : 'huge';
      if (cuts[0] === 0.2 && opts.effConv === 'ferguson') cuts = [0.41, 1.15, 2.7];
      return v < cuts[0] ? 'negligible' : v < cuts[1] ? 'small' : v < cuts[2] ? 'medium' : 'large'; };
    if (r.num) {
      const gv = r.gv; if (!gv || gv.some(x => x.length < 2)) return '';
      if (k === 2) {
        if (opts.effSize === 'hedges' || opts.effSize === 'glass' || opts.effSize === 'cliff') { const es = S.effectSizes(gv[0], gv[1]);
          if (opts.effSize === 'cliff') return `Cliff's δ = ${fmt(es.cliff, 2)}, ${lab(Math.abs(es.cliff), [0.147, 0.33, 0.474])}`;
          const v = Math.abs(opts.effSize === 'glass' ? es.glass : es.g); return `${opts.effSize === 'glass' ? 'Glass Δ' : 'Hedges g'} = ${fmt(v, 2)}, ${lab(v, [0.2, 0.5, 0.8])}`; }
        if (r.num.param) { const [a, b] = r.num.desc, sp = Math.sqrt(((a.n - 1) * a.sd ** 2 + (b.n - 1) * b.sd ** 2) / (a.n + b.n - 2)), dv = Math.abs(a.mean - b.mean) / sp; return isFinite(dv) ? `Cohen's d = ${fmt(dv, 2)}, ${lab(dv, [0.2, 0.5, 0.8])}` : ''; }
        const m = S.mannWhitney(gv[0], gv[1]); return `r = ${fmt(m.r, 2)}, ${lab(m.r, [0.1, 0.3, 0.5])}`;
      }
      const e = r.num.param ? S.anova(gv).etaSq : S.kruskalWallis(gv).etaSq;
      return `${r.num.param ? 'η²' : 'ε²'} = ${fmt(e, 3)}, ${lab(e, [0.01, 0.06, 0.14])}`;
    }
    const t = r.cat.table.filter(row => S.sum(row) > 0); if (t.length < 2) return '';
    const cs = S.chiSquare(t), N = S.sum(t.flat()), v = Math.sqrt(cs.chi / (N * (Math.min(t.length, t[0].length) - 1)));
    return isFinite(v) ? `Cramér's V = ${fmt(v, 2)}, ${lab(v, [0.1, 0.3, 0.5])}` : '';
  }
  // test names as written in the descriptive comments
  const TEST_NAME = { 't-test': 'independent t-test', 'Welch t-test': "Welch's t-test", ANOVA: 'one-way ANOVA', 'Welch ANOVA': "Welch's ANOVA", 'Mann-Whitney': 'Mann-Whitney U test',
    'Kruskal-Wallis': 'Kruskal-Wallis test', 'Chi-square': 'Chi-square test', "Fisher's exact": "Fisher's exact test", 'Fisher-Freeman-Halton': 'Fisher-Freeman-Halton exact test', 'Linear-by-linear': 'Chi-square test for trend (linear-by-linear association)' };
  const testNames = rs => listJoin([...new Set(rs.map(r => TEST_NAME[r.test]).filter(Boolean))]);
  const amongTxt = k => k === 2 ? 'between the two groups' : `among the ${nWord(k)} groups`;

  /* ---------- data helpers ---------- */
  const toNum = v => {
    if (v === null || v === undefined || v === '') return NaN;
    if (typeof v === 'number') return v;
    const n = Number(String(v).trim().replace(',', '.'));
    return isFinite(n) ? n : NaN;
  };
  const toCat = v => (v === null || v === undefined || String(v).trim() === '') ? null : String(v).trim();

  function pairs(k) {
    const out = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) out.push([i, j]);
    return out;
  }

  /* ---------- numeric analysis between groups ---------- */
  function analyzeNumeric(groupVals, dist, used, opts, vtest) {
    const k = groupVals.length;
    const desc = groupVals.map(S.describe);
    const sw = groupVals.map(g => normality(g));
    // large samples (30+ in every group) can be treated as normal (central limit theorem)
    const clt = !!opts.cltRule && groupVals.every(g => g.length >= 30), normal = sw.every(r => !r || r.p > 0.05) || clt;
    if (clt && !sw.every(r => !r || r.p > 0.05)) used.add('clt');
    let param = dist === 'param' ? true : dist === 'nonparam' ? false : normal;
    // a test chosen for this variable (step 2 ⚙)
    if (['t', 'welch', 'anova', 'welchanova'].includes(vtest)) param = true; else if (['mw', 'kw'].includes(vtest)) param = false;
    if (groupVals.some(g => g.length < 2)) return { desc, sw, normal, param, p: NaN, pairs: [], test: '—' };
    const pr = pairs(k);
    let p, test, pw = [], stat = '—';
    if (param) {
      if (k === 2) {
        const lev = S.levene(groupVals), eq = vtest === 't' ? true : vtest === 'welch' ? false : !(lev < 0.05);
        const t = S.tTest(groupVals[0], groupVals[1], eq);
        p = t.p; test = eq ? 't-test' : 'Welch t-test'; stat = `t = ${fmt(t.t, 2)}`;
        used.add(eq ? 'ttest' : 'welch');
        pw = [{ i: 0, j: 1, p: t.p, diff: t.diff, lo: t.lo, hi: t.hi }];
      } else if (vtest === 'welchanova' || (vtest !== 'anova' && opts.welch && S.levene(groupVals) < 0.05)) {
        // unequal variances: Welch's ANOVA with Games–Howell post hoc
        const w = S.welchAnova(groupVals);
        p = w.p; test = 'Welch ANOVA'; stat = `F = ${fmt(w.F, 2)}`;
        used.add('welchAnova');
        pw = S.gamesHowell(groupVals);
      } else {
        const a = S.anova(groupVals);
        p = a.p; test = 'ANOVA'; stat = `F = ${fmt(a.F, 2)}`;
        used.add('anova');
        pw = S.tukey(groupVals);
      }
      used.add('param');
    } else {
      if (k === 2) {
        const m = S.mannWhitney(groupVals[0], groupVals[1]);
        p = m.p; test = 'Mann-Whitney'; stat = `U = ${fmt(m.U, 1)}`;
        used.add('mw');
        // small samples: the exact distribution of U (no ties) or a permutation test
        if (opts.exactSmall && groupVals[0].length + groupVals[1].length <= 50) { const ex = S.mannWhitneyExact(groupVals[0], groupVals[1]); p = ex.p; used.add(ex.method === 'exact' ? 'mwExact' : 'mwPerm'); }
        const hl = opts.npEffect === 'boot' ? S.bootMedianDiff(groupVals[0], groupVals[1]) : S.hodgesLehmann(groupVals[0], groupVals[1]);
        if (opts.npEffect === 'boot') used.add('boot');
        pw = [{ i: 0, j: 1, p, ...hl }];
      } else {
        const kw = S.kruskalWallis(groupVals);
        p = kw.p; test = 'Kruskal-Wallis'; stat = `H = ${fmt(kw.H, 2)}`;
        used.add('kw');
        const dn = opts.dunn ? S.dunn(groupVals) : null;
        if (dn) used.add('dunn');
        pw = pr.map(([i, j], q) => ({ i, j, p: dn ? dn[q].p : S.mannWhitney(groupVals[i], groupVals[j]).p, ...(opts.npEffect === 'boot' ? S.bootMedianDiff(groupVals[i], groupVals[j]) : S.hodgesLehmann(groupVals[i], groupVals[j])) }));
        if (opts.npEffect === 'boot') used.add('boot');
        // optional adjustment of the pairwise Mann-Whitney tests (Dunn's test is already Bonferroni-adjusted)
        if (!dn && (opts.mwAdjust === 'bonferroni' || opts.mwAdjust === 'holm')) {
          const adj = opts.mwAdjust === 'holm' ? S.holm(pw.map(q => q.p)) : pw.map(q => S.bonferroni(q.p, pw.length));
          pw.forEach((q, n) => { q.p = adj[n]; }); used.add('mwAdj:' + opts.mwAdjust);
        }
      }
      used.add('nonparam');
    }
    // one-sided comparison of two groups (first group greater, or less, than the second)
    if (k === 2 && (opts.alternative === 'greater' || opts.alternative === 'less') && isFinite(p)) {
      const dir = param ? desc[0].mean - desc[1].mean : desc[0].median - desc[1].median, want = opts.alternative === 'greater' ? dir > 0 : dir < 0;
      p = want ? p / 2 : 1 - p / 2; if (pw[0]) pw[0].p = p; used.add('oneSided');
    }
    p = hookP(p); if (k === 2 && pw[0]) pw[0].p = p;
    return { desc, sw, normal, param, p, test, stat, pairs: pw };
  }

  /* ---------- categorical analysis between groups ---------- */
  // the time of each timepoint of an outcome: its value from step 3 (e.g. hours) when every one has a value, else 0, 1, 2 …
  let TP_TIME = {};
  const timesOf = v => { const t = v.cols.map(c => TP_TIME[c.tp]), real = t.every(x => x !== undefined && x !== '' && isFinite(+x)); const out = real ? t.map(Number) : v.cols.map((_, i) => i); out.real = real; return out; };
  // ordered categories: Mann-Whitney / Kruskal-Wallis on the category ranks, or the linear-by-linear (trend) Chi-square — scores 1, 2, 3 …
  function ordinalTest(groupVals, levels, how, used, opts) {
    const k = groupVals.length, codes = groupVals.map(g => g.map(x => levels.indexOf(x) + 1).filter(x => x > 0));
    if (codes.filter(c => c.length).length < 2) return null;
    if (how === 'trend') {
      const xs = codes.flatMap((c, gi) => c.map(() => gi + 1)), ys = codes.flat(), N = ys.length, mx = S.mean(xs), my = S.mean(ys);
      let sxy = 0, sxx = 0, syy = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; syy += (ys[i] - my) ** 2; });
      const r = sxx && syy ? sxy / Math.sqrt(sxx * syy) : 0, M2 = (N - 1) * r * r;
      used.add('ordTrend');
      return { p: 1 - jStat.chisquare.cdf(M2, 1), test: 'Linear-by-linear', stat: `M² = ${fmt(M2, 2)}`, pairs: null };
    }
    if (k === 2) { const m = S.mannWhitney(codes[0], codes[1]); used.add('ordRank'); return { p: m.p, test: 'Mann-Whitney', stat: `U = ${fmt(m.U, 1)}`, pairs: null }; }
    const kw = S.kruskalWallis(codes); used.add('ordRank');
    const pairs = kw.p <= opts.alpha ? S.dunn(codes) : null; if (pairs) used.add('ordDunn');
    return { p: kw.p, test: 'Kruskal-Wallis', stat: `H = ${fmt(kw.H, 2)}`, pairs };
  }
  function analyzeCategorical(groupVals, levels, used, opts, ord, vtest) {
    const k = groupVals.length;
    const table = levels.map(l => groupVals.map(g => g.filter(v => v === l).length));
    const ns = groupVals.map(g => g.length);
    const pct = table.map(r => r.map((c, j) => ns[j] ? 100 * c / ns[j] : 0));
    const nonEmpty = table.filter(r => S.sum(r) > 0);
    let p = NaN, test = '—', stat = '—';
    if (nonEmpty.length >= 2 && ns.filter(n => n > 0).length >= 2) {
      const cs = S.chiSquare(nonEmpty);
      p = cs.p; test = 'Chi-square'; used.add('chi'); stat = `χ² = ${fmt(cs.chi, 2)}`;
      const twoByTwo = nonEmpty.length === 2 && k === 2;
      if (vtest !== 'chi' && twoByTwo && ((opts.fisher && cs.minE < 5) || vtest === 'fisher')) {
        p = S.fisher2x2(nonEmpty).p; test = "Fisher's exact"; used.add('fisher'); stat = 'FE';
      } else if (!twoByTwo && vtest !== 'chi' && ((opts.ffh && cs.minE < 5) || vtest === 'ffh')) {
        // larger tables with small expected counts: the Fisher-Freeman-Halton exact test (Monte Carlo)
        p = S.fisherRxC(nonEmpty).p; test = 'Fisher-Freeman-Halton'; used.add('ffh'); stat = 'FFH';
      }
    } else if (nonEmpty.length === 1) { p = 1; test = 'Chi-square'; used.add('chi'); }
    used.add('cat');
    const binary = levels.length === 2;
    const rrRow = binary ? 0 : -1;
    // effect of the first level: relative risk (default) or odds ratio, stored under the same keys
    const effect = (i, j) => { if (opts.catEffect !== 'or') return S.relativeRisk(table, rrRow, i, j); const o = S.oddsRatio(table, rrRow, i, j); return o && { rr: o.or, lo: o.lo, hi: o.hi }; };
    const rr = binary ? pairs(k).map(([i, j]) => ({ i, j, ...(effect(i, j) || { rr: null }) })) : [];
    // optional Bonferroni-adjusted pairwise comparisons once the overall test is significant (3+ groups)
    let catPairs = null;
    if (opts.chiPost && k > 2 && p <= opts.alpha) { catPairs = S.chiSquarePairwise(table, opts.fisher, opts.chiAdjust || 'bonferroni'); used.add('chiPost'); if (opts.chiAdjust === 'holm') used.add('chiHolm'); if (opts.chiAdjust === 'none') used.add('chiNone'); }
    const out = { table, pct, ns, p, test, stat, rr, binary, pairs: catPairs };
    if (ord) { const o = ordinalTest(groupVals, levels, ord, used, opts); if (o) Object.assign(out, o); }
    out.p = hookP(out.p);
    return out;
  }

  /* ---------- within-group repeated measures ---------- */
  // options of repeated measures (step 4), set per run: post hoc pairs (against the first timepoint, consecutive or all),
  // their adjustment (Bonferroni, Holm or none), sphericity correction (Greenhouse-Geisser, Huynh-Feldt or none), post hoc even when the overall test is not significant
  let RO = { post: 'first', adjust: 'bonferroni', sph: 'gg', always: false };
  const setRO = o => { RO = { post: o.rmPost || 'first', adjust: o.rmAdjust || 'bonferroni', sph: o.rmSph || 'gg', always: !!o.rmPostAlways }; };
  const rmPairs = T => RO.post === 'all' ? pairs(T) : RO.post === 'consecutive' ? Array.from({ length: T - 1 }, (_, t) => [t, t + 1]) : Array.from({ length: T - 1 }, (_, t) => [0, t + 1]);
  const ADJ_NAME = { bonferroni: 'Bonferroni-adjusted', holm: 'Holm-adjusted', none: 'unadjusted' };
  const POST_WHAT = (tps) => RO.post === 'all' ? 'between each pair of timepoints' : RO.post === 'consecutive' ? 'between consecutive timepoints' : `versus ${tps[0]}`;
  const adjust = ps => RO.adjust === 'holm' ? S.holm(ps) : RO.adjust === 'none' ? ps : ps.map(p => S.bonferroni(p, ps.length));
  // Two timepoints → paired t / Wilcoxon; more → RM ANOVA / Friedman with post hoc paired comparisons (by default Bonferroni, against the first timepoint)
  function analyzeWithin(matrixByGroup, param, used, alpha) {
    return matrixByGroup.map(Y => {
      if (Y.length < 3) return { p: NaN };
      const col = j => Y.map(r => r[j]), T = Y[0].length;
      if (T === 2) {
        if (param) { used.add('pairedt'); return { ...S.pairedT(col(1), col(0)), test: 'Paired t-test' }; }
        used.add('wilcoxon'); return { ...S.wilcoxonSigned(col(1), col(0)), test: 'Wilcoxon' };
      }
      const omnibus = param ? { ...S.rmAnova(Y), test: 'RM ANOVA' } : { ...S.friedman(Y), test: 'Friedman' };
      if (param && RO.sph !== 'gg') { omnibus.p = RO.sph === 'hf' ? omnibus.pHF : omnibus.pUnc; used.add('rmSph:' + RO.sph); }
      used.add(param ? 'rmanova' : 'friedman');
      if (omnibus.p <= alpha || RO.always) {
        used.add(param ? 'postPairedt' : 'postWilcoxon'); used.add('rmPost:' + RO.post); used.add('rmAdj:' + RO.adjust);
        const pr = rmPairs(T), raw = pr.map(([a, b]) => param ? S.pairedT(col(b), col(a)).p : S.wilcoxonSigned(col(b), col(a)).p), adj = adjust(raw);
        // t: the later timepoint (comparisons against the first keep their old meaning)
        omnibus.post = pr.map(([a, b], q) => ({ a, b, t: b, p: adj[q] }));
      }
      return omnibus;
    });
  }

  /* ---------- correlation among numeric variables (all patients pooled) ---------- */
  // method: 'auto' (Pearson when both are normal, else Spearman), 'pearson' or 'spearman'; only: pairs with item 0 (one variable against the others)
  function analyzeCorrelation(items, alpha, method = 'auto', only = false) {
    const pairsOut = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      if (only && i > 0) continue;
      const x = [], y = [];
      items[i].vals.forEach((v, r) => { if (isFinite(v) && isFinite(items[j].vals[r])) { x.push(v); y.push(items[j].vals[r]); } });
      if (method === 'kendall') {
        const res = x.length >= 3 ? S.kendall(x, y) : { r: NaN, p: NaN };
        pairsOut.push({ i, j, ...res, n: x.length, lo: NaN, hi: NaN, method: 'kendall', sig: res.p <= alpha });
        continue;
      }
      const normal = method === 'pearson' ? true : method === 'spearman' ? false : [x, y].every(a => { const sw = normality(a); return !sw || sw.p > 0.05; });
      const res = x.length >= 3 ? (normal ? S.pearson(x, y) : S.spearman(x, y)) : { r: NaN, p: NaN };
      // 95% CI by Fisher's z transformation
      const z = Math.atanh(Math.max(-0.999999, Math.min(0.999999, res.r))), se = x.length > 3 ? 1 / Math.sqrt(x.length - 3) : NaN;
      pairsOut.push({ i, j, ...res, n: x.length, lo: Math.tanh(z - S.ZC() * se), hi: Math.tanh(z + S.ZC() * se), method: normal ? 'pearson' : 'spearman', sig: res.p <= alpha });
    }
    return pairsOut;
  }

  /* ---------- comment helpers ---------- */
  function center(a, param) { return param ? a.desc.mean : a.desc.median; }

  // Describes significant pairwise differences for one measurement → {key, ps}
  function pairDescription(res, gl, alpha) {
    const k = gl.length;
    const loc = i => res.param ? res.desc[i].mean : res.desc[i].median;
    const tie = i => res.desc[i].mean;
    const lowerOf = (i, j) => (loc(i) < loc(j) || (loc(i) === loc(j) && tie(i) < tie(j))) ? i : j;
    if (k === 2) {
      const lo = lowerOf(0, 1), hi = 1 - lo;
      return { key: `significantly lower in ${gl[lo]} than ${gl[hi]} (P value {P})`, ps: [res.p] };
    }
    const sig = res.pairs.filter(q => q.p <= alpha), ns = res.pairs.filter(q => q.p > alpha);
    if (!sig.length) return { key: `significantly different ${amongTxt(k)}, although pairwise comparisons were insignificant`, ps: [res.p] };
    const byLow = new Map();
    for (const q of sig) {
      const lo = lowerOf(q.i, q.j), hi = lo === q.i ? q.j : q.i;
      if (!byLow.has(lo)) byLow.set(lo, []);
      byLow.get(lo).push({ hi, p: q.p });
    }
    const parts = [], ps = [];
    for (const [lo, his] of byLow) {
      const names = his.map(h => gl[h.hi]);
      const target = names.length > 1 ? `(${listJoin(names)})` : names[0];
      parts.push(`significantly lower in ${gl[lo]} than ${target} (P value ${his.length > 1 ? pList(his.map(h => h.p)) : '{P}'})`);
      if (his.length === 1) ps.push(his[0].p);
    }
    let key = parts.join(' and was ');
    if (ns.length) {
      // group insignificant pairs sharing a common member, as in "between A and (B and C)"
      const counts = {};
      ns.forEach(q => { counts[q.i] = (counts[q.i] || 0) + 1; counts[q.j] = (counts[q.j] || 0) + 1; });
      const common = Object.keys(counts).find(g => counts[g] === ns.length && ns.length > 1);
      let txt;
      if (common !== undefined) {
        const others = ns.map(q => q.i == common ? q.j : q.i).map(i => gl[i]);
        txt = `between ${gl[common]} and (${listJoin(others)})`;
      } else txt = ns.map(q => `between ${gl[q.i]} and ${gl[q.j]}`).join(' and ');
      key += ` and was insignificantly different ${txt}`;
    }
    return { key, ps, single: ps.length === 1 && byLow.size === 1 && [...byLow.values()][0].length === 1 };
  }

  // Fills "{P}" placeholders; a single placeholder with several p-values means merged timepoints
  function fillP(key, ps) {
    if (key.includes('although')) return key.replace(', although', ` (P value ${pTxt(ps[0])}), although`);
    const n = (key.match(/\{P\}/g) || []).length;
    if (n === 1 && ps.length > 1) return key.replace('{P}', pList(ps));
    let i = 0;
    return key.replace(/\{P\}/g, () => pTxt(ps[i++]));
  }

  function repeatedComment(label, tps, results, gl, alpha, detailed) {
    const k = gl.length, sentences = [];
    const nsIdx = tps.map((_, t) => t).filter(t => !(results[t].p <= alpha));
    const nsTps = nsIdx.map(t => tps[t]);
    const sigIdx = tps.map((_, t) => t).filter(t => results[t].p <= alpha);
    const tpList = tpGroup;
    // detailed style quotes the P values of the insignificant timepoints too
    const nsPs = nsIdx.map(t => results[t].p).filter(isFinite);
    const nsP = detailed && nsPs.length ? ` (P value ${pList(nsPs)})` : '';
    if (!sigIdx.length) return `${cap(label)} at all measurements was insignificantly different ${amongTxt(k)}${nsP}.`;
    if (nsTps.length) sentences.push(`${cap(label)} at ${tpList(nsTps)} was insignificantly different ${amongTxt(k)}${nsP}.`);
    // merge consecutive significant timepoints with an identical description
    const descs = sigIdx.map(t => ({ t, ...pairDescription(results[t], gl, alpha) }));
    for (let a = 0; a < descs.length;) {
      let b = a;
      const mergeable = descs[a].key.includes('{P}') && descs[a].ps.length === 1;
      while (mergeable && b + 1 < descs.length && descs[b + 1].key === descs[a].key && descs[b + 1].ps.length === 1) b++;
      const grp = descs.slice(a, b + 1);
      const ps = grp.map(d => d.ps[0]);
      const key = mergeable ? fillP(descs[a].key, ps) : fillP(descs[a].key, descs[a].ps);
      sentences.push(`${cap(label)} at ${tpList(grp.map(d => tps[d.t]))} was ${key}.`);
      a = b + 1;
    }
    return sentences.join(' ');
  }

  function withinComment(label, tps, within, results, gl, alpha, param) {
    // bucket groups by outcome so the sentence reads "decreased significantly ... in A, B and C"
    const buckets = new Map();
    within.forEach((w, g) => {
      if (!isFinite(w.p)) return;
      const first = results[0].desc[g], last = results[results.length - 1].desc[g];
      const a = param ? first.mean : first.median, b = param ? last.mean : last.median;
      const verb = w.p <= alpha ? `${b < a ? 'decreased' : 'increased'} significantly over time` : 'did not change significantly over time';
      if (!buckets.has(verb)) buckets.set(verb, []);
      buckets.get(verb).push({ g: gl[g], p: w.p });
    });
    const parts = [...buckets].map(([verb, items]) => `${verb} in ${listJoin(items.map(x => x.g))} (P value ${pList(items.map(x => x.p))})`);
    if (!parts.length) return '';
    const sentences = [`Within each group, ${lowerFirst(label)} ${parts.join(', while it ')}.`];
    // post hoc versus the first timepoint, grouped by direction; other designs list the significant pairs
    if (RO.post !== 'first') {
      within.forEach((w, g) => {
        if (!w.post) return;
        const sig = w.post.filter(q => q.p <= alpha);
        sentences.push(sig.length ? `In ${gl[g]}, it differed significantly in ${sig.length > 1 ? 'these comparisons' : 'the comparison'}: ${listJoin(sig.map(q => `${tps[q.b]} vs ${tps[q.a]}`))} (P value ${pList(sig.map(q => q.p))}).`
          : `In ${gl[g]}, none of the ${RO.post === 'all' ? 'pairwise' : 'consecutive'} comparisons was significant.`);
      });
      return sentences.join(' ');
    }
    within.forEach((w, g) => {
      if (!w.post) return;
      const base = center({ desc: results[0].desc[g] }, param);
      const dirs = { lower: [], higher: [] }, ns = [];
      w.post.forEach(q => {
        if (q.p > alpha) { ns.push(tps[q.t]); return; }
        dirs[center({ desc: results[q.t].desc[g] }, param) < base ? 'lower' : 'higher'].push(q);
      });
      const bits = Object.entries(dirs).filter(([, qs]) => qs.length).map(([dir, qs]) =>
        `significantly ${dir} at ${tpGroup(qs.map(q => tps[q.t]))} than at ${tps[0]} (P value ${pList(qs.map(q => q.p))})`);
      if (!bits.length) return;
      let s = `In ${gl[g]}, it was ${bits.join(' and ')}`;
      if (ns.length) s += `, with no significant difference at ${tpGroup(ns)}`;
      sentences.push(s + '.');
    });
    return sentences.join(' ');
  }
  // "A and B" for one pair, "(A and B) and (A and C)" for several
  const pairList = (qs, gl) => qs.length === 1 ? `${gl[qs[0].i]} and ${gl[qs[0].j]}` : listJoin(qs.map(q => `(${gl[q.i]} and ${gl[q.j]})`));
  const tpGroup = list => list.length === 1 ? list[0] : `(${listJoin(list)})`;
  // "P value = 0.01" / "= 0.01 and 0.02 respectively" / "< 0.001 in each"
  function pList(ps) {
    if (ps.length === 1) return pTxt(ps[0]);
    const thr = 10 ** -FMT.pDig;
    if (ps.every(p => p < thr)) return `< ${pNum(thr)} in each`;
    const vals = listJoin(ps.map(p => pTxt(p).replace(/^= /, '')));
    return (ps[0] < thr ? '' : '= ') + vals + ' respectively';
  }

  /* ---------- repeated-measure controls ---------- */
  // Applies the timepoint choices: per-outcome ticks, global include/order (cfg.tpOrder / cfg.tpInclude),
  // and "separate variables" (each timepoint analysed as its own single variable)
  function effectiveVariables(cfg) {
    const out = [];
    const order = tp => { const i = (cfg.tpOrder || []).indexOf(tp); return i < 0 ? 1e9 : i; };
    for (const v of cfg.variables) {
      if (!v.include || v.role === 'ignore') continue;
      if (v.kind !== 'repeated') { out.push(v); continue; }
      // a measure built in the repeated-measure editor keeps its own column order
      const cols = v.cols.filter(c => c.include !== false && (cfg.tpInclude || {})[c.tp] !== false);
      if (!v.ownOrder) cols.sort((a, b) => order(a.tp) - order(b.tp));
      if (!cols.length) continue;
      if (v.split || cols.length === 1) {
        cols.forEach((c, i) => out.push({ ...v, id: v.id + '_' + i, kind: 'single', type: 'numeric', cols: [c], pos: v.pos + i * 1e-3,
          label: `${plain(v.label)} at ${c.label || cfg.tpLabels[c.tp] || c.tp}${(v.label.match(/\s*\([^)]*\)\s*$/) || [''])[0]}`, table: v.splitTable || 'Other outcomes' }));
      } else out.push({ ...v, cols });
    }
    return out;
  }

  /* ---------- advanced analyses: regression and ROC ---------- */
  // label of any Excel column: the variable label, "<outcome> at <timepoint>", or the column name
  function columnLabel(cfg, col) {
    if (isGroupCol(cfg, col)) return 'Group';
    for (const v of cfg.variables) for (const c of v.cols) if (c.col === col)
      return v.kind === 'repeated' ? `${plain(v.label)} at ${c.label || cfg.tpLabels[c.tp] || c.tp}` : v.label;
    return col;
  }
  // numeric when ≥90% of values are numbers with more than two distinct values; otherwise categorical
  function columnKind(cfg, rows, col) {
    const v = cfg.variables.find(x => x.cols.some(c => c.col === col));
    if (v && v.kind === 'single') return v.type;
    const vals = rows.map(r => r[col]).filter(x => toCat(x) !== null);
    const nums = vals.map(toNum).filter(isFinite);
    return vals.length && nums.length / vals.length >= 0.9 && new Set(nums).size > 2 ? 'numeric' : 'categorical';
  }
  // every filled cell is a number (Likert items count, even with few distinct values)
  const isNumberColumn = (rows, col) => { const v = rows.map(r => r[col]).filter(x => toCat(x) !== null); return v.length > 0 && v.every(x => isFinite(toNum(x))); };
  function levelsOf(cfg, rows, col) {
    if (isGroupCol(cfg, col)) return cfg.groupOrder.filter(g => cfg.groupInclude[g] !== false);
    const present = [...new Set(rows.map(r => toCat(r[col])).filter(x => x !== null))];
    const v = cfg.variables.find(x => x.kind === 'single' && x.cols[0].col === col);
    const lv = v && v.levels && v.levels.length ? v.levels.filter(l => present.includes(l)) : [];
    present.sort((a, b) => isFinite(+a) && isFinite(+b) ? a - b : a.localeCompare(b)).forEach(l => { if (!lv.includes(l)) lv.push(l); });
    return lv;
  }
  // design columns for one predictor: itself when numeric, dummies against the first level when categorical
  function encode(cfg, rows, col) {
    const label = columnLabel(cfg, col);
    if (columnKind(cfg, rows, col) === 'numeric')
      return { col, label, terms: [{ label, get: r => toNum(r[col]) }], ok: r => isFinite(toNum(r[col])) };
    let lv = levelsOf(cfg, rows, col);
    // yes/no style variables: "No" is the reference, so the estimate is the effect of "Yes"
    if (lv.length === 2 && POSITIVE.test(lv[0]) && !POSITIVE.test(lv[1])) lv = [lv[1], lv[0]];
    const ref = lv[0];
    const name = l => isGroupCol(cfg, col) ? (cfg.groupLabels[l] || l) : l;
    return { col, label, ref: name(ref), terms: lv.slice(1).map(l => ({ label: `${label} (${name(l)} vs ${name(ref)})`, get: r => +(toCat(r[col]) === l) })),
      ok: r => lv.includes(toCat(r[col])) };
  }

  // "Sepsis group" when the outcome is the study group itself, otherwise "<outcome> (<positive value>)"
  const eventName = (cfg, a) => isGroupCol(cfg, a.outcome) ? (cfg.groupLabels[a.positive] || a.positive) : `${lowerFirst(columnLabel(cfg, a.outcome))} (${a.positive})`;

  // variable selection for regression models; a predictor (all its dummy terms together) is kept or dropped as one unit.
  // fit(list) returns a model whose terms follow the list after `off` leading terms (1 = intercept)
  const P_REMOVE = 0.10, P_ENTER = 0.05;
  function selectModel(preds, fit, method, off) {
    const predP = (m, list) => { let i = off; return list.map(e => { const ps = e.terms.map((_, k) => m.terms[i + k].p); i += e.terms.length; return Math.min(...ps); }); };
    if (method === 'backward') {
      let list = preds.slice(), m = fit(list);
      while (m && list.length > 1) {
        const ps = predP(m, list), worst = ps.indexOf(Math.max(...ps));
        if (!(ps[worst] > P_REMOVE)) break;
        list = list.filter((_, i) => i !== worst);
        m = fit(list);
      }
      return { model: m, kept: m ? list : [] };
    }
    if (method === 'forward') {
      let list = [], m = null;
      for (;;) {
        let best = null;
        for (const e of preds.filter(x => !list.includes(x))) {
          const t = fit([...list, e]);
          if (!t) continue;
          const p = predP(t, [...list, e]).pop();
          if (!best || p < best.p) best = { e, p, t };
        }
        if (!best || !(best.p < P_ENTER)) break;
        list.push(best.e); m = best.t;
      }
      return { model: m, kept: list };
    }
    const m = fit(preds);
    return { model: m, kept: m ? preds : [] };
  }
  const methodNote = method => method === 'backward' ? `Multivariable model by backward elimination (P to remove > ${P_REMOVE}); —: not retained`
    : method === 'forward' ? `Multivariable model by forward selection (P to enter < ${P_ENTER}); —: not entered` : '';
  // variance inflation factor of each design column
  const vifs = X => X[0].map((_, j) => {
    if (X[0].length < 2) return 1;
    const r = S.linearRegression(X.map(row => row.filter((_, c) => c !== j)), X.map(row => row[j]));
    return r && r.r2 < 1 ? 1 / (1 - r.r2) : Infinity;
  });

  // forest plot of a regression's estimates: the multivariable model, or the univariable ones when there is none
  function forestFigure(terms, kind, what, alpha, d) {
    const pick = x => x.m || x.u, list = terms.filter(x => pick(x));
    if (!list.length) return null;
    const est = t => kind === 'linear' ? t.B : kind === 'cox' ? t.hr : t.or, dd = kind === 'linear' ? d : 2;
    const name = { linear: 'B', logistic: 'OR', cox: 'HR' }[kind], multi = list.some(x => x.m);
    return { sig: list.some(x => pick(x).p <= alpha), caption: `Forest plot of the ${multi ? 'adjusted ' : ''}${{ linear: 'regression coefficients', logistic: 'odds ratios', cox: 'hazard ratios' }[kind]} for ${what}`,
      spec: { type: 'forest', log: kind !== 'linear', ref: kind === 'linear' ? 0 : 1, alpha, xLabel: `${name} (95% CI)${kind !== 'linear' ? ', log scale' : ''}`, valHead: `${name} (95% CI)`,
        rows: list.map(x => { const t = pick(x); return { label: x.label, est: est(t), lo: t.lo, hi: t.hi, p: t.p, text: `${fmt(est(t), dd)} (${fmt(t.lo, dd)} to ${fmt(t.hi, dd)})` }; }) } };
  }
  function regressionSection(a, cfg, rows, alpha, d, used) {
    const logistic = a.type === 'logistic';
    const outLabel = columnLabel(cfg, a.outcome);
    const preds = a.predictors.filter(c => c !== a.outcome).map(c => encode(cfg, rows, c)).filter(e => e.terms.length);
    if (!preds.length) return null;
    // optional interaction of two predictors: the products of their design terms
    const e1 = preds.find(e => e.col === a.int1), e2 = preds.find(e => e.col === a.int2);
    if (e1 && e2 && e1 !== e2) { preds.push({ col: '__int', label: `${e1.label} × ${e2.label}`, terms: e1.terms.flatMap(t1 => e2.terms.map(t2 => ({ label: `${t1.label} × ${t2.label}`, get: r => t1.get(r) * t2.get(r) }))), ok: r => e1.ok(r) && e2.ok(r) }); used.add('interaction'); }
    const yOf = logistic ? r => +(toCat(r[a.outcome]) === a.positive) : r => toNum(r[a.outcome]);
    const yOk = logistic ? r => toCat(r[a.outcome]) !== null : r => isFinite(toNum(r[a.outcome]));
    const fitOn = list => {
      const rs = rows.filter(r => yOk(r) && list.every(e => e.ok(r)));
      const X = rs.map(r => list.flatMap(e => e.terms.map(t => t.get(r)))), y = rs.map(yOf);
      if (rs.length < list.reduce((s, e) => s + e.terms.length, 0) + 3) return null;
      const m = logistic ? S.logisticRegression(X, y) : S.linearRegression(X, y);
      if (m) { m.X = X; m.y = y; }
      return m;
    };
    const { model: multi, kept } = selectModel(preds, fitOn, a.method, 1);
    const uni = a.univariable || !multi ? preds.map(e => fitOn([e])) : null;
    used.add(logistic ? 'logistic' : 'linear');
    if (a.method === 'backward' || a.method === 'forward') used.add('sel_' + a.method);
    const est = t => logistic ? `${fmt(t.or, 2)} (${fmt(t.lo, 2)}-${fmt(t.hi, 2)})` : `${fmt(t.B, d)} (${fmt(t.lo, d)} to ${fmt(t.hi, d)})`;
    const effName = logistic ? 'OR (95% CI)' : 'B (95% CI)';
    const head = [''];
    if (uni) head.push(`Univariable ${effName}`, 'P value');
    const showVif = !logistic && a.vif && multi;
    if (multi) { head.push(`${uni ? 'Multivariable ' : ''}${effName}`); if (!logistic) head.push('β'); if (showVif) head.push('VIF'); head.push('P value'); }
    const vif = showVif ? vifs(multi.X) : null;
    // one row per design term: univariable estimate from that predictor's own model, multivariable from the final model
    const terms = [];
    preds.forEach((e, pi) => {
      const ki = kept.indexOf(e), offset = 1 + kept.slice(0, Math.max(0, ki)).reduce((n, x) => n + x.terms.length, 0);
      e.terms.forEach((t, k) => terms.push({ label: t.label, u: uni && uni[pi] ? uni[pi].terms[k + 1] : null, m: multi && ki >= 0 ? multi.terms[offset + k] : null, vif: vif && ki >= 0 ? vif[offset - 1 + k] : null }));
    });
    const trows = terms.map(({ label, u, m, vif: v }) => {
      const row = [{ t: [label], b: true }];
      if (uni) row.push({ t: [u ? est(u) : '—'] }, { t: [u ? fmtP(u.p, alpha) : '—'] });
      if (multi) { row.push({ t: [m ? est(m) : '—'] }); if (!logistic) row.push({ t: [m ? fmt(m.beta, 2) : '—'] }); if (showVif) row.push({ t: [v != null ? fmt(v, 2) : '—'] }); row.push({ t: [m ? fmtP(m.p, alpha) : '—'] }); }
      return row;
    });
    // optional constant (intercept) of the multivariable model
    if (a.constant && multi && multi.terms[0]) {
      const c0 = multi.terms[0], row = [{ t: ['Constant'], b: true }];
      if (uni) row.push({ t: ['—'] }, { t: ['—'] });
      row.push({ t: [est(c0)] }); if (!logistic) row.push({ t: ['—'] }); if (showVif) row.push({ t: ['—'] }); row.push({ t: [fmtP(c0.p, alpha)] });
      trows.push(row);
    }
    const sigM = terms.filter(x => x.m && x.m.p <= alpha).map(x => ({ label: x.label, t: x.m }));
    const uSig = terms.filter(x => x.u && x.u.p <= alpha);
    // footnote: model fit
    const f = [];
    if (sigM.length || uSig.length) f.push(`*: Significant as P value ≤ ${alpha}`);
    if (logistic) f.push('OR: Odds ratio', 'CI: Confidence interval');
    else f.push('B: Unstandardized coefficient', 'β: Standardized coefficient', 'CI: Confidence interval');
    if (multi) {
      if (logistic) f.push(`Model: n=${multi.n} (${multi.events} with ${outLabel} = ${a.positive}), χ²(${multi.dfModel}) = ${fmt(multi.chi, 2)}, P ${pTxt(multi.pModel)}, Nagelkerke R² = ${fmt(multi.nagelkerke, 3)}, correctly classified ${fmt(100 * multi.accuracy, 1)}%`);
      else f.push(`Model: n=${multi.n}, R² = ${fmt(multi.r2, 3)}, adjusted R² = ${fmt(multi.adjR2, 3)}, F(${multi.dfModel}, ${multi.df}) = ${fmt(multi.F, 2)}, P ${pTxt(multi.pModel)}`);
      if (logistic && multi.unstable) f.push('Warning: the model did not converge or shows separation, so its estimates are unreliable');
      if (logistic && a.classTable) {
        // classification table at a predicted probability of 0.5, or the chosen cut-off
        const cut = isFinite(parseFloat(a.cut)) && +a.cut > 0 && +a.cut < 1 ? +a.cut : 0.5;
        let tp = 0, fp = 0, fn = 0, tn = 0;
        multi.fitted.forEach((pr, i) => { const yes = pr >= cut; if (multi.y[i]) yes ? tp++ : fn++; else yes ? fp++ : tn++; });
        f.push(`Classification at a predicted probability of ${cut}: ${tp} of ${tp + fn} with ${outLabel} = ${a.positive} (sensitivity ${fmt(tp + fn ? 100 * tp / (tp + fn) : 0, 1)}%) and ${tn} of ${tn + fp} without (specificity ${fmt(tn + fp ? 100 * tn / (tn + fp) : 0, 1)}%) correctly classified`);
      }
      if (logistic && a.hl) { const h = S.hosmerLemeshow(multi.y, multi.fitted); f.push(`Hosmer-Lemeshow χ²(${h.df}) = ${fmt(h.chi, 2)}, P ${pTxt(h.p)}${h.p > alpha ? ' (good fit)' : ' (poor fit)'}`); }
      if (showVif) f.push('VIF: Variance inflation factor (values above 5 suggest collinearity)');
    }
    if (methodNote(a.method)) f.push(methodNote(a.method));
    const refs = preds.filter(e => e.ref).map(e => `${e.label}: reference = ${e.ref}`);
    if (refs.length) f.push(refs.join(', '));
    // comment
    const what = logistic ? eventName(cfg, a) : lowerFirst(plain(outLabel));
    const figures = [], extra = [];
    // linear: residual diagnostics (independence by Durbin-Watson, normality of the residuals) and the residual plot
    if (!logistic && a.diag && multi) {
      const fitted = multi.X.map(x => S.sum([1, ...x].map((v, j) => v * multi.coef[j]))), res = multi.y.map((v, i) => v - fitted[i]);
      const dw = S.durbinWatson(res), sw = res.length >= 3 ? normality(res) : null;
      f.push(`Residuals: Durbin-Watson = ${fmt(dw, 2)}${sw ? `, ${cfg.options.normality === 'ks' ? 'Kolmogorov-Smirnov' : 'Shapiro-Wilk'} P ${pTxt(sw.p)}` : ''}`);
      extra.push(`The residuals ${dw >= 1.5 && dw <= 2.5 ? 'showed no relevant autocorrelation' : 'showed possible autocorrelation'} (Durbin-Watson = ${fmt(dw, 2)})${sw ? ` and ${sw.p > 0.05 ? 'were normally distributed' : 'were not normally distributed'} (P value ${pTxt(sw.p)})` : ''}.`);
      used.add('regDiag');
      figures.push({ sig: true, caption: `Residuals versus fitted values of the regression model for ${what}`,
        spec: { type: 'scatter', x: fitted, y: res, zeroLine: true, xLabel: 'Fitted value', yLabel: 'Residual' } });
    }
    // logistic: discrimination of the model (ROC of its predicted probabilities)
    if (logistic && a.modelRoc && multi && multi.y.some(Boolean) && multi.y.some(v => !v)) {
      const rc = S.roc(multi.fitted, multi.y.map(Boolean), 'youden', { direction: 'higher' });
      f.push(`Model discrimination: AUC = ${fmt(rc.auc, 3)} (95% CI ${fmt(rc.lo, 3)}-${fmt(rc.hi, 3)})`);
      extra.push(`The model discriminated ${rc.auc >= 0.9 ? 'excellently' : rc.auc >= 0.8 ? 'well' : rc.auc >= 0.7 ? 'fairly' : 'poorly'} between patients with and without ${what} (AUC = ${fmt(rc.auc, 3)}, 95% CI ${fmt(rc.lo, 3)}-${fmt(rc.hi, 3)}).`);
      used.add('regRoc');
      figures.push({ sig: true, caption: `ROC curve of the logistic regression model for ${what}`, spec: { type: 'roc', series: [{ name: `Model (AUC = ${fmt(rc.auc, 3)})`, points: rc.points }] } });
    }
    // sample size of the model: events per variable (logistic) or patients per predictor (linear)
    if (a.epv && multi) { const nt = multi.terms.length - 1, ev = logistic ? Math.min(multi.y.filter(Boolean).length, multi.y.filter(v => !v).length) : multi.n, per = ev / Math.max(1, nt), need = logistic ? 10 : 15;
      f.push(`${logistic ? 'Events per variable' : 'Patients per predictor'}: ${fmt(per, 1)} (${ev} ${logistic ? 'events' : 'patients'} / ${nt} terms; at least ${need} recommended)`);
      if (per < need) extra.push(`With ${fmt(per, 1)} ${logistic ? 'events per variable' : 'patients per predictor'}, the model may be overfitted, so its estimates should be read with caution.`); }
    if (logistic && multi && multi.y.some(Boolean) && multi.y.some(v => !v)) {
      // bootstrap internal validation: the AUC corrected for optimism (Harrell, 200 resamples)
      if (a.optimism) { const ob = S.optimismAuc(multi.X, multi.y, 200, 1); if (ob) { used.add('optimism'); f.push(`Bootstrap validation (${ob.B} resamples): apparent AUC = ${fmt(ob.apparent, 3)}, optimism = ${fmt(ob.optimism, 3)}, optimism-corrected AUC = ${fmt(ob.corrected, 3)}`);
        extra.push(`After internal validation by bootstrapping, the optimism-corrected AUC was ${fmt(ob.corrected, 3)} (apparent AUC ${fmt(ob.apparent, 3)}).`); } }
      // added value of one predictor: continuous NRI and IDI of the model with it against the model without it
      const eN = a.nriVar && kept.find(e => e.col === a.nriVar);
      if (eN && kept.length > 1) { const base = kept.filter(e => e !== eN), rs2 = rows.filter(r => yOk(r) && kept.every(e => e.ok(r)));
        const XB = rs2.map(r => base.flatMap(e => e.terms.map(t => t.get(r)))), XF = rs2.map(r => kept.flatMap(e => e.terms.map(t => t.get(r)))), y2 = rs2.map(yOf);
        const mb = S.logisticRegression(XB, y2), mf = S.logisticRegression(XF, y2);
        if (mb && mf) { const q = S.nriIdi(mb.fitted, mf.fitted, y2), aB = S.aucOf(mb.fitted, y2), aF = S.aucOf(mf.fitted, y2); used.add('nri');
          f.push(`Added value of ${lowerFirst(eN.label)}: AUC ${fmt(aB, 3)} → ${fmt(aF, 3)}, continuous NRI = ${fmt(q.nri, 3)} (95% CI ${fmt(q.nriLo, 3)} to ${fmt(q.nriHi, 3)}, P ${pTxt(q.nriP)}), IDI = ${fmt(q.idi, 3)} (95% CI ${fmt(q.idiLo, 3)} to ${fmt(q.idiHi, 3)}, P ${pTxt(q.idiP)})`);
          extra.push(`Adding ${lowerFirst(eN.label)} to the model ${q.nriP <= alpha || q.idiP <= alpha ? 'significantly improved' : 'did not significantly improve'} risk classification (NRI = ${fmt(q.nri, 3)}, P value ${pTxt(q.nriP)}; IDI = ${fmt(q.idi, 3)}, P value ${pTxt(q.idiP)}).`); } }
      // decision curve: net benefit of the model against treating everyone or no one
      if (a.dca) { const th = Array.from({ length: 19 }, (_, i) => (i + 1) / 20), nb = S.netBenefit(multi.fitted, multi.y, th); used.add('dca');
        figures.push({ sig: true, caption: `Decision curve of the logistic regression model for ${what}`, spec: { type: 'line', categories: th.map(t => `${Math.round(t * 100)}%`), xLabel: 'Threshold probability', yLabel: 'Net benefit', yMin: -0.05,
          series: [{ name: 'Model', values: nb.map(q => q.model) }, { name: 'Treat all', values: nb.map(q => Math.max(-0.05, q.all)) }, { name: 'Treat none', values: nb.map(() => 0) }] } }); }
    }
    // the model as an equation (and a risk calculator from step 11)
    let calc = null;
    if (a.calc && multi) { const tl = kept.flatMap(e => e.terms.map(t => ({ label: plain(t.label), dummy: / vs /.test(t.label) }))), B = multi.terms.map(t => t.B);
      calc = { logistic, b0: B[0], terms: tl.map((t, i) => ({ ...t, B: B[i + 1] })), outcome: logistic ? eventName(cfg, a) : plain(outLabel) };
      const eq = `${fmt(B[0], 4)}${tl.map((t, i) => ` ${B[i + 1] < 0 ? '−' : '+'} ${fmt(Math.abs(B[i + 1]), 4)} × ${t.label}`).join('')}`;
      f.push(logistic ? `Risk equation: P = 1 / (1 + e^−(${eq}))` : `Equation: ${plain(outLabel)} = ${eq}`); }
    if (a.forest) { const fg = forestFigure(terms, logistic ? 'logistic' : 'linear', what, alpha, d); if (fg) figures.unshift(fg); }
    const phr = x => logistic
      ? `${lowerFirst(x.label)} (OR = ${fmt(x.t.or, 2)}, 95% CI ${fmt(x.t.lo, 2)}-${fmt(x.t.hi, 2)}, P value ${pTxt(x.t.p)})`
      : `${lowerFirst(x.label)} (B = ${fmt(x.t.B, d)}, 95% CI ${fmt(x.t.lo, d)} to ${fmt(x.t.hi, d)}, P value ${pTxt(x.t.p)})`;
    const sent = [];
    if (multi) {
      if (sigM.length) sent.push(`In ${preds.length > 1 ? 'multivariable ' : ''}${logistic ? 'logistic' : 'linear'} regression, ${listJoin(sigM.map(phr))} ${sigM.length > 1 ? 'were independent predictors' : 'was a significant predictor'} of ${what}.`);
      else sent.push(`None of the studied variables was a significant ${preds.length > 1 ? 'independent ' : ''}predictor of ${what} in ${logistic ? 'logistic' : 'linear'} regression.`);
      sent.push(logistic ? `The model was ${multi.pModel <= alpha ? 'statistically significant' : 'insignificant'} (P value ${pTxt(multi.pModel)}, Nagelkerke R² = ${fmt(multi.nagelkerke, 3)}).`
        : `The model was ${multi.pModel <= alpha ? 'statistically significant' : 'insignificant'} (P value ${pTxt(multi.pModel)}) and explained ${fmt(100 * multi.r2, 1)}% of the variance of ${lowerFirst(plain(outLabel))} (R² = ${fmt(multi.r2, 3)}).`);
    } else sent.push('The model could not be estimated: too few complete cases or perfectly collinear predictors.');
    if (a.commentDetail === 'detailed' && multi) {
      const ns = terms.filter(x => x.m && !(x.m.p <= alpha));
      sigM.forEach(x => {
        const per = / vs /.test(x.label) ? 'compared with the reference category' : 'for each one-unit increase';
        sent.push(logistic ? `For ${lowerFirst(x.label)}, the odds of ${what} were ${fmt(Math.abs(x.t.or - 1) * 100, 0)}% ${x.t.or >= 1 ? 'higher' : 'lower'} ${per} (OR = ${fmt(x.t.or, 2)}).`
          : `${per === 'for each one-unit increase' ? 'Each one-unit increase in' : 'Compared with the reference category,'} ${lowerFirst(x.label)} ${per === 'for each one-unit increase' ? 'was associated with a change of' : 'was associated with a difference of'} ${fmt(x.t.B, d)} in ${what} (95% CI ${fmt(x.t.lo, d)} to ${fmt(x.t.hi, d)}).`);
      });
      if (ns.length) sent.push(`${cap(listJoin(ns.map(x => `${lowerFirst(x.label)} (P value ${pTxt(x.m.p)})`)))} ${ns.length > 1 ? 'were' : 'was'} not significant in the multivariable model.`);
    }
    if (uni && multi && preds.length > 1) {
      if (uSig.length) sent.unshift(`In univariable analysis, ${listJoin(uSig.map(x => lowerFirst(x.label)))} ${uSig.length > 1 ? 'were' : 'was'} significantly associated with ${what}.`);
    }
    sent.push(...extra);
    return {
      kind: 'regression', title: `${logistic ? 'Logistic' : 'Linear'} regression analysis for prediction of ${logistic ? eventName(cfg, a) : lowerFirst(outLabel)}`,
      head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures, meta: { multi, uni, calc }
    };
  }

  /* ---------- stage 8: further models ---------- */
  const estE = (t, dd = 2) => `${fmt(t.e, dd)} (${fmt(t.elo, dd)}-${fmt(t.ehi, dd)})`;
  // design matrix of the predictors on the complete rows
  function design(a, cfg, rows, okY) {
    const preds = (a.predictors || []).filter(c => c !== a.outcome).map(c => encode(cfg, rows, c)).filter(e => e.terms.length);
    const rs = rows.filter(r => okY(r) && preds.every(e => e.ok(r)));
    return { preds, rs, X: rs.map(r => preds.flatMap(e => e.terms.map(t => t.get(r)))), labels: preds.flatMap(e => e.terms.map(t => t.label)), refs: preds.filter(e => e.ref).map(e => `${e.label}: reference = ${e.ref}`) };
  }
  // count outcomes: Poisson or negative binomial regression, incidence rate ratios
  function countSection(a, cfg, rows, alpha, d, used) {
    const D = design(a, cfg, rows, r => { const v = toNum(r[a.outcome]); return isFinite(v) && v >= 0 && Math.round(v) === v; }); if (!D.preds.length || D.rs.length < D.labels.length + 5) return null;
    const y = D.rs.map(r => toNum(r[a.outcome])), nb = a.family === 'negbin' || (a.family === 'auto' && (S.poissonReg(D.X, y) || {}).dispersion > 1.5);
    const m = nb ? S.negBinReg(D.X, y) : S.poissonReg(D.X, y); if (!m) return null; used.add(nb ? 'negbin' : 'poisson');
    const lab = plain(columnLabel(cfg, a.outcome)), sig = D.labels.map((l, i) => [l, m.terms[i + 1]]).filter(([, t]) => t.p <= alpha);
    return { kind: 'count', title: `${nb ? 'Negative binomial' : 'Poisson'} regression analysis of ${lowerFirst(lab)}`, head: ['', 'IRR (95% CI)', 'P value'],
      rows: D.labels.map((l, i) => [{ t: [l], b: true }, { t: [estE(m.terms[i + 1])] }, { t: [fmtP(m.terms[i + 1].p, alpha)] }]),
      footnote: [sig.length ? `*: Significant as P value ≤ ${alpha}` : '', 'IRR: Incidence rate ratio', 'CI: Confidence interval', `Model: n=${m.n}${nb ? `, dispersion α = ${fmt(m.alpha, 3)}` : `, Pearson dispersion = ${fmt(m.dispersion, 2)}`}`, ...D.refs].filter(Boolean).join(', ') + '.',
      comment: sig.length ? `${cap(listJoin(sig.map(([l, t]) => `${lowerFirst(plain(l))} (IRR = ${fmt(t.e, 2)}, 95% CI ${fmt(t.elo, 2)}-${fmt(t.ehi, 2)}, P value ${pTxt(t.p)})`)))} ${sig.length > 1 ? 'were' : 'was'} significantly associated with ${lowerFirst(lab)}.`
        : `None of the studied variables was significantly associated with ${lowerFirst(lab)}.`, figures: [], meta: { m } };
  }
  // ordinal (proportional odds) and multinomial logistic regression
  function ordinalSection(a, cfg, rows, alpha, d, used) {
    const lv = levelsOf(cfg, rows, a.outcome); if (lv.length < 3) return null;
    const D = design(a, cfg, rows, r => lv.includes(toCat(r[a.outcome]))); if (!D.preds.length || D.rs.length < D.labels.length + 10) return null;
    const y = D.rs.map(r => lv.indexOf(toCat(r[a.outcome]))), lab = plain(columnLabel(cfg, a.outcome));
    if (a.type === 'ordinal') {
      const m = S.ordinalLogit(D.X, y, lv.length); if (!m) return null; used.add('ordinal');
      const sig = D.labels.map((l, i) => [l, m.terms[i]]).filter(([, t]) => t.p <= alpha);
      return { kind: 'ordinal', title: `Ordinal logistic regression analysis of ${lowerFirst(lab)}`, head: ['', 'OR (95% CI)', 'P value'],
        rows: D.labels.map((l, i) => [{ t: [l], b: true }, { t: [estE(m.terms[i])] }, { t: [fmtP(m.terms[i].p, alpha)] }]),
        footnote: [sig.length ? `*: Significant as P value ≤ ${alpha}` : '', `OR: odds ratio of a higher category of ${lowerFirst(lab)} (${lv.join(' < ')})`, 'CI: Confidence interval',
          `Model: n=${D.rs.length}, χ²(${m.df}) = ${fmt(m.chi, 2)}, P ${pTxt(m.p)}, McFadden R² = ${fmt(m.mcfadden, 3)}`, ...D.refs].filter(Boolean).join(', ') + '.',
        comment: sig.length ? `${cap(listJoin(sig.map(([l, t]) => `${lowerFirst(plain(l))} (OR = ${fmt(t.e, 2)}, 95% CI ${fmt(t.elo, 2)}-${fmt(t.ehi, 2)}, P value ${pTxt(t.p)})`)))} ${sig.length > 1 ? 'were' : 'was'} significantly associated with a higher category of ${lowerFirst(lab)}.`
          : `None of the studied variables was significantly associated with ${lowerFirst(lab)}.`, figures: [], meta: { m } };
    }
    const m = S.multinomLogit(D.X, y, lv.length); if (!m) return null; used.add('multinom');
    const head = ['', ...lv.slice(1).flatMap(l => [`${l}: OR (95% CI)`, 'P value'])];
    const sig = []; const trows = D.labels.map((l, i) => [{ t: [l], b: true }, ...m.byCat.flatMap((c, k) => { const t = c[i + 1]; if (t.p <= alpha) sig.push(`${lowerFirst(plain(l))} for ${lv[k + 1]} (OR = ${fmt(t.e, 2)}, P value ${pTxt(t.p)})`); return [{ t: [estE(t)] }, { t: [fmtP(t.p, alpha)] }]; })]);
    return { kind: 'multinom', title: `Multinomial logistic regression analysis of ${lowerFirst(lab)} (reference: ${lv[0]})`, head, rows: trows,
      footnote: [sig.length ? `*: Significant as P value ≤ ${alpha}` : '', `OR: odds ratio of each category against ${lv[0]}`, 'CI: Confidence interval', `Model: n=${D.rs.length}, χ²(${m.df}) = ${fmt(m.chi, 2)}, P ${pTxt(m.p)}, McFadden R² = ${fmt(m.mcfadden, 3)}`, ...D.refs].filter(Boolean).join(', ') + '.',
      comment: sig.length ? `Compared with ${lv[0]}, there were significant associations for ${listJoin(sig)}.` : `None of the studied variables was significantly associated with ${lowerFirst(lab)}.`, figures: [], meta: { m } };
  }
  // method comparison: Passing-Bablok or Deming regression (does method B agree with method A?)
  function methodSection(a, cfg, rows, alpha, d, used) {
    if (!a.second) return null; const rs = rows.filter(r => isFinite(toNum(r[a.outcome])) && isFinite(toNum(r[a.second]))); if (rs.length < 8) return null;
    const x = rs.map(r => toNum(r[a.outcome])), y = rs.map(r => toNum(r[a.second])), pb = a.method !== 'deming', m = pb ? S.passingBablok(x, y) : S.deming(x, y); used.add(pb ? 'passing' : 'deming');
    const la = plain(columnLabel(cfg, a.outcome)), lb = plain(columnLabel(cfg, a.second)), okS = m.loS <= 1 && m.hiS >= 1, okI = m.loI <= 0 && m.hiI >= 0;
    const lo = Math.min(...x, ...y), hi = Math.max(...x, ...y);
    return { kind: 'methodcomp', title: `${pb ? 'Passing-Bablok' : 'Deming'} regression of ${lowerFirst(lb)} on ${lowerFirst(la)} (n=${rs.length})`, head: ['', 'Estimate', '95% CI', 'Interpretation'],
      rows: [[{ t: ['Slope'], b: true }, { t: [fmt(m.slope, 3)] }, { t: [`${fmt(m.loS, 3)} to ${fmt(m.hiS, 3)}`] }, { t: [okS ? 'CI includes 1: no proportional difference' : 'Proportional difference'] }],
        [{ t: ['Intercept'], b: true }, { t: [fmt(m.intercept, 3)] }, { t: [`${fmt(m.loI, 3)} to ${fmt(m.hiI, 3)}`] }, { t: [okI ? 'CI includes 0: no constant difference' : 'Constant difference'] }]],
      footnote: `${pb ? 'Passing-Bablok regression (rank-based CIs)' : 'Deming regression with equal error variances (jackknife CIs)'}; the methods agree when the CI of the slope includes 1 and that of the intercept includes 0.`,
      comment: `${okS && okI ? `${cap(lb)} agreed with ${lowerFirst(la)}: there was no significant constant or proportional difference` : `${cap(lb)} differed from ${lowerFirst(la)}, with ${[!okI && 'a constant', !okS && 'a proportional'].filter(Boolean).join(' and ')} difference`} (slope ${fmt(m.slope, 3)}, 95% CI ${fmt(m.loS, 3)} to ${fmt(m.hiS, 3)}; intercept ${fmt(m.intercept, 3)}, 95% CI ${fmt(m.loI, 3)} to ${fmt(m.hiI, 3)}).`,
      figures: [{ sig: true, caption: `${pb ? 'Passing-Bablok' : 'Deming'} regression of ${lowerFirst(lb)} on ${lowerFirst(la)}`, spec: { type: 'scatter', x, y, xLabel: la, yLabel: lb, lines: [{ a: m.intercept, b: m.slope, label: 'Fit' }, { a: 0, b: 1, label: 'Identity', dash: true }], noFit: true } }], meta: { m } };
  }
  // principal component analysis of questionnaire items (varimax-rotated loadings)
  function pcaSection(a, cfg, rows, alpha, d, used) {
    const cols = (a.predictors || []).filter(c => isNumberColumn(rows, c)); if (cols.length < 3) return null;
    const rs = rows.filter(r => cols.every(c => isFinite(toNum(r[c])))); if (rs.length < cols.length + 5) return null;
    const m = S.pca(rs.map(r => cols.map(c => toNum(r[c]))), +a.nComp || 0); used.add('pca');
    const L = m.k > 1 ? m.rotated : m.loadings, head = ['Item', ...Array.from({ length: m.k }, (_, j) => `Component ${j + 1}`)];
    const trows = cols.map((c, i) => [{ t: [plain(columnLabel(cfg, c))], b: true }, ...L[i].map(v => ({ t: [fmt(v, 2)], b: Math.abs(v) >= 0.4 }))]);
    trows.push([{ t: ['Eigenvalue'], b: true }, ...m.values.slice(0, m.k).map(v => ({ t: [fmt(v, 2)] }))], [{ t: ['% of variance'], b: true }, ...m.explained.slice(0, m.k).map(v => ({ t: [fmt(100 * v, 1)] }))]);
    const cum = 100 * S.sum(m.explained.slice(0, m.k));
    return { kind: 'pca', title: `Principal component analysis of ${cols.length} items (n=${rs.length})`, head, rows: trows,
      footnote: `${m.k > 1 ? 'Varimax-rotated loadings' : 'Loadings'}; loadings of at least 0.40 in bold; components with an eigenvalue above 1${+a.nComp ? ' (or the number chosen)' : ''}; KMO = ${fmt(m.kmo, 2)}; Bartlett's test χ²(${m.bartlett.df}) = ${fmt(m.bartlett.chi, 2)}, P ${pTxt(m.bartlett.p)}.`,
      comment: `The data were ${m.kmo >= 0.6 && m.bartlett.p <= alpha ? '' : 'not well '}suitable for factor analysis (KMO = ${fmt(m.kmo, 2)}, Bartlett's test P value ${pTxt(m.bartlett.p)}). ${m.k} component${m.k > 1 ? 's' : ''} explained ${fmt(cum, 1)}% of the total variance.`,
      figures: [{ sig: true, caption: 'Scree plot of the eigenvalues', spec: { type: 'line', categories: m.values.map((_, i) => String(i + 1)), xLabel: 'Component', yLabel: 'Eigenvalue', refLine: 1, legend: false, series: [{ name: 'Eigenvalue', values: m.values }] } }], meta: { m } };
  }
  // partial correlation of two variables controlling for covariates
  function partialSection(a, cfg, rows, alpha, d, used) {
    const cov = (a.predictors || []).filter(c => c !== a.outcome && c !== a.second && isNumberColumn(rows, c)); if (!a.second || !cov.length) return null;
    const rs = rows.filter(r => [a.outcome, a.second, ...cov].every(c => isFinite(toNum(r[c])))); if (rs.length < cov.length + 5) return null;
    const x = rs.map(r => toNum(r[a.outcome])), y = rs.map(r => toNum(r[a.second])), q = S.partialCorr(x, y, rs.map(r => cov.map(c => toNum(r[c])))), z = S.pearson(x, y); used.add('partial');
    const la = plain(columnLabel(cfg, a.outcome)), lb = plain(columnLabel(cfg, a.second)), lc = listJoin(cov.map(c => lowerFirst(plain(columnLabel(cfg, c)))));
    return { kind: 'partial', title: `Correlation between ${lowerFirst(la)} and ${lowerFirst(lb)} controlling for ${lc}`, head: ['', 'r', 'P value', 'n'],
      rows: [[{ t: ['Simple (Pearson)'], b: true }, { t: [fmt(z.r, 2)] }, { t: [fmtP(z.p, alpha)] }, { t: [String(rs.length)] }], [{ t: [`Partial (controlling for ${lc})`], b: true }, { t: [fmt(q.r, 2)] }, { t: [fmtP(q.p, alpha)] }, { t: [String(rs.length)] }]],
      footnote: `Partial correlation by the residual method, df = ${q.df}.`, comment: `After controlling for ${lc}, the correlation between ${lowerFirst(la)} and ${lowerFirst(lb)} was ${q.p <= alpha ? 'significant' : 'insignificant'} (partial r = ${fmt(q.r, 2)}, P value ${pTxt(q.p)}; simple r = ${fmt(z.r, 2)}).`, figures: [], meta: { q } };
  }
  // two-way ANOVA: the study groups × a second factor, with their interaction
  function anova2Section(a, cfg, rows, alpha, d, used, G) {
    const { gl, groups } = G; if (!a.second || groups.length < 2) return null;
    const lv = levelsOf(cfg, rows, a.second), rs = rows.filter(r => isFinite(toNum(r[a.outcome])) && lv.includes(toCat(r[a.second])) && groups.includes(groupOf(cfg, r))); if (lv.length < 2 || rs.length < 8) return null;
    const m = S.twoWayAnova(rs.map(r => toNum(r[a.outcome])), rs.map(r => groups.indexOf(groupOf(cfg, r))), rs.map(r => lv.indexOf(toCat(r[a.second]))), groups.length, lv.length); if (!m) return null; used.add('anova2');
    const lb = plain(columnLabel(cfg, a.second)), lo = plain(columnLabel(cfg, a.outcome)), R = (n, x) => [{ t: [n], b: true }, { t: [fmt(x.ss, 2)] }, { t: [String(x.df)] }, { t: [fmt(x.ss / x.df, 2)] }, { t: [fmt(x.F, 2)] }, { t: [fmtP(x.p, alpha)] }, { t: [fmt(x.eta, 3)] }];
    const cells = groups.map((g, gi) => lv.map(l => { const v = rs.filter(r => groupOf(cfg, r) === g && toCat(r[a.second]) === l).map(r => toNum(r[a.outcome])); return v.length ? `${fmt(S.mean(v), d)} ± ${fmt(v.length > 1 ? S.sd(v) : 0, d)} (n=${v.length})` : '—'; }));
    return { kind: 'anova2', title: `Two-way ANOVA of ${lowerFirst(lo)}: study group × ${lowerFirst(lb)}`, head: ['Source', 'Sum of squares', 'df', 'Mean square', 'F', 'P value', 'Partial η²'],
      rows: [R('Study group', m.A), R(lb, m.B), R(`Group × ${lowerFirst(lb)}`, m.AB), [{ t: ['Error'], b: true }, { t: [fmt(m.error.ss, 2)] }, { t: [String(m.error.df)] }, { t: [fmt(m.error.ms, 2)] }, { t: [''] }, { t: [''] }, { t: [''] }],
        ...groups.map((g, gi) => [{ t: [gl[gi]], b: true }, { t: [lv.map((l, li) => `${l}: ${cells[gi][li]}`).join('; ')], span: 6 }])],
      footnote: 'Type II sums of squares; the last rows give the mean ± SD of each cell.', comment: `${cap(lowerFirst(lo))} ${m.A.p <= alpha ? 'differed significantly' : 'did not differ significantly'} between the study groups (P value ${pTxt(m.A.p)}) and ${m.B.p <= alpha ? 'differed significantly' : 'did not differ significantly'} by ${lowerFirst(lb)} (P value ${pTxt(m.B.p)}); the group × ${lowerFirst(lb)} interaction was ${m.AB.p <= alpha ? 'significant' : 'insignificant'} (P value ${pTxt(m.AB.p)}).`,
      figures: [], meta: { m } };
  }
  // simple mediation: X → M → Y
  function mediationSection(a, cfg, rows, alpha, d, used) {
    if (!a.second || !a.xvar) return null; const rs = rows.filter(r => [a.xvar, a.second, a.outcome].every(c => isFinite(toNum(r[c])))); if (rs.length < 10) return null;
    const m = S.mediation(rs.map(r => toNum(r[a.xvar])), rs.map(r => toNum(r[a.second])), rs.map(r => toNum(r[a.outcome])), 2000, 1); if (!m) return null; used.add('mediation');
    const lx = plain(columnLabel(cfg, a.xvar)), lm = plain(columnLabel(cfg, a.second)), ly = plain(columnLabel(cfg, a.outcome)), T = t => [{ t: [fmt(t.B, 3)] }, { t: [`${fmt(t.lo, 3)} to ${fmt(t.hi, 3)}`] }, { t: [fmtP(t.p, alpha)] }];
    const sigInd = !(m.bootLo <= 0 && m.bootHi >= 0);
    return { kind: 'mediation', title: `Mediation of the effect of ${lowerFirst(lx)} on ${lowerFirst(ly)} by ${lowerFirst(lm)} (n=${rs.length})`, head: ['Path', 'Estimate', '95% CI', 'P value'],
      rows: [[{ t: [`a: ${lx} → ${lm}`], b: true }, ...T(m.a)], [{ t: [`b: ${lm} → ${ly} (adjusted for ${lowerFirst(lx)})`], b: true }, ...T(m.b)], [{ t: [`c: total effect of ${lx}`], b: true }, ...T(m.c)], [{ t: [`c′: direct effect of ${lx}`], b: true }, ...T(m.cPrime)],
        [{ t: ['Indirect effect (a × b)'], b: true }, { t: [fmt(m.indirect, 3)] }, { t: [`${fmt(m.bootLo, 3)} to ${fmt(m.bootHi, 3)}`] }, { t: [`Sobel ${fmtP(m.sobelP, alpha)}`] }]],
      footnote: `Unstandardized coefficients of linear regressions; the CI of the indirect effect is a percentile bootstrap (2000 resamples); proportion mediated = ${fmt(100 * m.propMediated, 1)}%.`,
      comment: `The indirect effect of ${lowerFirst(lx)} on ${lowerFirst(ly)} through ${lowerFirst(lm)} was ${sigInd ? 'significant' : 'insignificant'} (a × b = ${fmt(m.indirect, 3)}, 95% bootstrap CI ${fmt(m.bootLo, 3)} to ${fmt(m.bootHi, 3)}), ${sigInd ? `accounting for ${fmt(100 * m.propMediated, 1)}% of the total effect` : 'so no mediation was shown'}; the direct effect was ${m.cPrime.p <= alpha ? 'significant' : 'insignificant'} (c′ = ${fmt(m.cPrime.B, 3)}, P value ${pTxt(m.cPrime.p)}).`,
      figures: [], meta: { m } };
  }
  // propensity scores: balance of the covariates before matching, after 1:1 matching and after weighting, and the outcome in the matched sample
  function psmSection(a, cfg, rows, alpha, d, used, G) {
    const { gl, groups } = G; if (groups.length !== 2) return null;
    const D = design(a, cfg, rows, r => groups.includes(groupOf(cfg, r))); if (!D.preds.length || D.rs.length < 20) return null;
    const tr = D.rs.map(r => +(groupOf(cfg, r) === groups[0])), lm = S.logisticRegression(D.X, tr); if (!lm) return null;
    const ps = lm.fitted.map(p => Math.min(Math.max(p, 1e-6), 1 - 1e-6)), mt = S.propensityMatch(ps, tr, +a.caliper || 0.2); used.add('psm');
    const idx = mt.pairs.flat(), sub = (arr, I) => I.map(i => arr[i]);
    const head = ['Covariate', `SMD before (n=${D.rs.length})`, `SMD matched (${mt.pairs.length} pairs)`, 'SMD weighted (IPTW)'];
    const trows = D.labels.map((l, j) => { const x = D.X.map(r => r[j]); const b = S.smd(x, tr), mm = S.smd(sub(x, idx), sub(tr, idx)), w = S.smd(x, tr, mt.weights);
      return [{ t: [l], b: true }, { t: [fmt(b, 3)] }, { t: [fmt(mm, 3)], b: Math.abs(mm) >= 0.1 }, { t: [fmt(w, 3)], b: Math.abs(w) >= 0.1 }]; });
    const sent = [`Propensity scores were estimated from ${listJoin(D.preds.map(e => lowerFirst(plain(e.label))))}; ${mt.pairs.length} of ${tr.filter(Boolean).length} patients of ${gl[0]} were matched 1:1 to patients of ${gl[1]}.`];
    // outcome in the matched sample
    if (a.outcome) { const M = sub(D.rs, idx), isNum = isNumberColumn(rows, a.outcome);
      if (isNum) { const g1 = M.filter(r => groupOf(cfg, r) === groups[0]).map(r => toNum(r[a.outcome])).filter(isFinite), g2 = M.filter(r => groupOf(cfg, r) === groups[1]).map(r => toNum(r[a.outcome])).filter(isFinite);
        if (g1.length > 1 && g2.length > 1) { const t = S.tTest(g1, g2); trows.push([{ t: [`Outcome: ${plain(columnLabel(cfg, a.outcome))}`], b: true }, { t: [`${gl[0]} ${fmt(S.mean(g1), d)} ± ${fmt(S.sd(g1), d)} vs ${gl[1]} ${fmt(S.mean(g2), d)} ± ${fmt(S.sd(g2), d)}, P ${pTxt(t.p)}`], span: 3 }]);
          sent.push(`In the matched sample, ${lowerFirst(plain(columnLabel(cfg, a.outcome)))} ${t.p <= alpha ? 'differed significantly' : 'did not differ significantly'} between the groups (P value ${pTxt(t.p)}).`); } }
      else { const lv = levelsOf(cfg, M, a.outcome); if (lv.length >= 2) { const tab = lv.map(l => groups.map(g => M.filter(r => groupOf(cfg, r) === g && toCat(r[a.outcome]) === l).length)), cs = S.chiSquare(tab);
        trows.push([{ t: [`Outcome: ${plain(columnLabel(cfg, a.outcome))}`], b: true }, { t: [`${lv[0]}: ${tab[0].map((c, gi) => `${gl[gi]} ${c}`).join(' vs ')}, P ${pTxt(cs.p)}`], span: 3 }]);
        sent.push(`In the matched sample, ${lowerFirst(plain(columnLabel(cfg, a.outcome)))} ${cs.p <= alpha ? 'differed significantly' : 'did not differ significantly'} between the groups (P value ${pTxt(cs.p)}).`); } } }
    const worst = Math.max(...trows.slice(0, D.labels.length).map(r => Math.abs(parseFloat(r[2].t[0])) || 0));
    sent.splice(1, 0, `After matching, ${worst < 0.1 ? 'every covariate was balanced (standardized mean difference < 0.1)' : `the largest standardized mean difference was ${fmt(worst, 2)}`}.`);
    return { kind: 'psm', title: `Propensity-score matching of ${gl[0]} and ${gl[1]}`, head, rows: trows,
      footnote: `SMD: standardized mean difference (|SMD| ≥ 0.1 in bold); 1:1 nearest-neighbour matching without replacement, caliper ${+a.caliper || 0.2} SD of the logit of the propensity score; IPTW: inverse probability of treatment weights.`,
      comment: sent.join(' '), figures: [{ sig: true, caption: 'Covariate balance before and after matching', spec: { type: 'forest', ref: 0, xLabel: 'Standardized mean difference', valHead: 'Before → matched',
        rows: D.labels.map((l, j) => { const x = D.X.map(r => r[j]), b = S.smd(x, tr), mm = S.smd(sub(x, idx), sub(tr, idx)); return { label: plain(l), est: mm, lo: Math.min(mm, b), hi: Math.max(mm, b), p: 1, text: `${fmt(b, 2)} → ${fmt(mm, 2)}` }; }) } }], meta: { mt } };
  }
  // linear mixed model of a repeated outcome: group, time (categorical), group × time and covariates, a random intercept per patient
  function lmmSection(a, cfg, rows, alpha, d, used, G) {
    const { gl, groups } = G, v = cfg.variables.find(x => x.id === a.rvar && x.kind === 'repeated'); if (!v) return null;
    const cov = (a.predictors || []).map(c => encode(cfg, rows, c)).filter(e => e.terms.length), T = v.cols.length, k = groups.length;
    const y = [], X = [], sid = [];
    rows.forEach((r, ri) => { const gi = groups.indexOf(groupOf(cfg, r)); if (gi < 0 || !cov.every(e => e.ok(r))) return; const cv = cov.flatMap(e => e.terms.map(t => t.get(r)));
      v.cols.forEach((c, t) => { const val = toNum(r[c.col]); if (!isFinite(val)) return; const gd = Array.from({ length: k - 1 }, (_, q) => +(gi === q + 1)), td = Array.from({ length: T - 1 }, (_, q) => +(t === q + 1));
        y.push(val); sid.push(ri); X.push([1, ...gd, ...td, ...gd.flatMap(g => td.map(tt => g * tt)), ...cv]); }); });
    if (y.length < X[0].length + 10) return null;
    const m = S.lmmRandomIntercept(y, X, sid); if (!m) return null; used.add('lmmAdv');
    const ix = (s0, n) => Array.from({ length: n }, (_, q) => s0 + q), Gi = ix(1, k - 1), Ti = ix(k, T - 1), Ii = ix(k + T - 1, (k - 1) * (T - 1)), Ci = ix(k + T - 1 + (k - 1) * (T - 1), cov.reduce((n, e) => n + e.terms.length, 0));
    const W = [['Study group', m.wald(Gi)], ['Time', m.wald(Ti)], ['Group × time', k > 1 ? m.wald(Ii) : null]].filter(x => x[1]);
    const trows = W.map(([n, w]) => [{ t: [n], b: true }, { t: [`χ²(${w.df}) = ${fmt(w.chi, 2)}`] }, { t: [fmtP(w.p, alpha)] }]);
    const cl = cov.flatMap(e => e.terms.map(t => t.label));
    Ci.forEach((j, q) => { const B = m.beta[j], se = m.se[j], z = B / se, p = 2 * jStat.normal.cdf(-Math.abs(z), 0, 1); trows.push([{ t: [`${cl[q]} (B = ${fmt(B, d)}, 95% CI ${fmt(B - S.ZC() * se, d)} to ${fmt(B + S.ZC() * se, d)})`], b: true }, { t: [`z = ${fmt(z, 2)}`] }, { t: [fmtP(p, alpha)] }]); });
    const wi = W.find(x => x[0] === 'Group × time');
    return { kind: 'lmmAdv', title: `Linear mixed model of ${lowerFirst(plain(v.label))}${cl.length ? ` adjusted for ${listJoin(cov.map(e => lowerFirst(plain(e.label))))}` : ''}`, head: ['Effect', 'Test', 'P value'], rows: trows,
      footnote: `Random intercept per patient (REML; ${m.nSubj} patients, ${m.nObs} measurements; ICC = ${fmt(m.icc, 2)}); time as categories; Wald tests.`,
      comment: wi ? `The change in ${lowerFirst(plain(v.label))} over time ${wi[1].p <= alpha ? 'differed significantly' : 'did not differ significantly'} between the groups${cl.length ? ' after adjustment' : ''} (group × time P value ${pTxt(wi[1].p)}).` : '', figures: [], meta: { m } };
  }

  const ROC_CUT = {
    youden: ['the Youden index', 'Cut-off: Youden index'], closest: ['the point closest to the top-left corner of the curve', 'Cut-off: closest to the top-left corner of the ROC curve'],
    sens80: ['the highest specificity with a sensitivity of at least 80%', 'Cut-off: highest specificity with sensitivity ≥ 80%'],
    sens90: ['the highest specificity with a sensitivity of at least 90%', 'Cut-off: highest specificity with sensitivity ≥ 90%'],
    sens95: ['the highest specificity with a sensitivity of at least 95%', 'Cut-off: highest specificity with sensitivity ≥ 95%'],
    spec80: ['the highest sensitivity with a specificity of at least 80%', 'Cut-off: highest sensitivity with specificity ≥ 80%'],
    spec90: ['the highest sensitivity with a specificity of at least 90%', 'Cut-off: highest sensitivity with specificity ≥ 90%'],
    spec95: ['the highest sensitivity with a specificity of at least 95%', 'Cut-off: highest sensitivity with specificity ≥ 95%'],
    manual: ['a cut-off value chosen in advance', 'Cut-off: chosen in advance']
  };
  // options: direction (auto / higher / lower), cutoff method (ROC_CUT; manual uses manualCut), CIs of sensitivity and specificity,
  // likelihood ratios and Youden index columns, cut-off point on the curve, DeLong comparison of the AUCs, combined logistic score
  function rocSection(a, cfg, rows, alpha, d, used) {
    const outLabel = columnLabel(cfg, a.outcome);
    const tests = a.predictors.filter(c => c !== a.outcome && columnKind(cfg, rows, c) === 'numeric');
    if (!tests.length) return null;
    const method = ROC_CUT[a.cutoff] ? a.cutoff : 'youden';
    const manual = method === 'manual' ? parseFloat(String(a.manualCut ?? '').replace(',', '.')) : NaN;
    const cutM = method === 'manual' && !isFinite(manual) ? 'youden' : method;
    used.add(cutM === 'closest' ? 'rocClosest' : 'roc'); used.add('rocCut:' + cutM);
    const dir = a.direction === 'higher' || a.direction === 'lower' ? a.direction : 'auto';
    const res = tests.map(col => {
      const rs = rows.filter(r => toCat(r[a.outcome]) !== null && isFinite(toNum(r[col])));
      const pos = rs.map(r => toCat(r[a.outcome]) === a.positive);
      if (pos.filter(Boolean).length < 2 || pos.filter(x => !x).length < 2) return { col, label: columnLabel(cfg, col), r: null };
      return { col, label: columnLabel(cfg, col), r: S.roc(rs.map(r => toNum(r[col])), pos, cutM, { direction: dir, manual }) };
    });
    // all test variables combined into one score: the predicted probability of a logistic model
    const complete = rows.filter(r => toCat(r[a.outcome]) !== null && tests.every(c => isFinite(toNum(r[c]))));
    let combo = null;
    if (a.combined && tests.length > 1) {
      const y = complete.map(r => toCat(r[a.outcome]) === a.positive ? 1 : 0);
      if (y.filter(Boolean).length >= 2 && y.filter(x => !x).length >= 2) {
        const fit = S.logisticRegression(complete.map(r => tests.map(c => toNum(r[c]))), y);
        if (fit && fit.fitted) {
          combo = { col: null, combined: true, label: 'Combined model (logistic)', fitted: fit.fitted,
            r: S.roc(fit.fitted, y.map(Boolean), cutM === 'manual' ? 'youden' : cutM, { direction: 'higher' }) };
          res.push(combo); used.add('rocCombined');
        }
      }
    }
    const pct = v => `${fmt(100 * v, 1)}%`;
    const ci = (lo, hi) => `(${fmt(100 * lo, 1)}-${fmt(100 * hi, 1)})`;
    const lrTxt = v => isFinite(v) ? fmt(v, 2) : '∞';
    // ciAll: 95% CI of every measure at the cut-off (exact for proportions, log method for likelihood ratios)
    const ciAll = !!a.ciAll, ciSS = ciAll || !!a.ci;
    const pc = (v, q) => ciAll && q && isFinite(q.lo) ? [pct(v), ci(q.lo, q.hi)] : [pct(v)];
    const lrc = (v, q) => ciAll && q && isFinite(q.lo) ? [lrTxt(v), `(${fmt(q.lo, 2)}-${fmt(q.hi, 2)})`] : [lrTxt(v)];
    const head = ['', 'AUC (95% CI)', 'P value', 'Cut-off', 'Sensitivity', 'Specificity', 'PPV', 'NPV', 'Accuracy'];
    if (a.lr) head.push('LR+', 'LR−');
    if (a.youdenCol) head.push('Youden index');
    if (ciSS) used.add('rocCI');
    const cutTxt = x => x.combined ? `> ${fmt(x.r.cutoff.cut, 3)}` : `${x.r.cutoff.inclusive ? (x.r.higher ? '≥' : '≤') : (x.r.higher ? '>' : '≤')} ${fmt(x.r.cutoff.cut, d)}`;
    const trows = res.map(x => {
      const { label, r } = x;
      if (!r) return [{ t: [label], b: true }, { t: ['—'], span: head.length - 1 }];
      const c = r.cutoff, row = [{ t: [label], b: true }, { t: [`${fmt(r.auc, 3)} (${fmt(r.lo, 3)}-${fmt(r.hi, 3)})`] }, { t: [fmtP(r.p, alpha)] },
        { t: [cutTxt(x)] }, { t: ciSS ? [pct(c.sens), ci(c.sensLo, c.sensHi)] : [pct(c.sens)] }, { t: ciSS ? [pct(c.spec), ci(c.specLo, c.specHi)] : [pct(c.spec)] },
        { t: pc(c.ppv, c.dx.ppv) }, { t: pc(c.npv, c.dx.npv) }, { t: pc(c.accuracy, c.dx.accuracy) }];
      if (a.lr) row.push({ t: lrc(c.lrPos, c.dx.lrPos) }, { t: lrc(c.lrNeg, c.dx.lrNeg) });
      if (a.youdenCol) row.push({ t: [fmt(c.youden, 3)] });
      return row;
    });
    // AUC interpretation: the common scale (excellent ≥0.9 … failed <0.6) or Hosmer & Lemeshow (outstanding ≥0.9, excellent ≥0.8, acceptable ≥0.7, poor ≥0.6)
    const grade = a.aucScale === 'hosmer' ? (auc => auc >= 0.9 ? 'outstanding' : auc >= 0.8 ? 'excellent' : auc >= 0.7 ? 'acceptable' : auc >= 0.6 ? 'poor' : 'no')
      : (auc => auc >= 0.9 ? 'excellent' : auc >= 0.8 ? 'good' : auc >= 0.7 ? 'fair' : auc >= 0.6 ? 'poor' : 'failed');
    const what = eventName(cfg, a);
    const sent = res.filter(x => x.r).map(x => {
      const { label, r } = x, nm = x.combined ? 'The combined model of all test variables' : cap(plain(label));
      const extra = (ciSS ? ` (95% CI ${fmt(100 * r.cutoff.sensLo, 1)}-${fmt(100 * r.cutoff.sensHi, 1)}%)` : '');
      const extraS = (ciSS ? ` (95% CI ${fmt(100 * r.cutoff.specLo, 1)}-${fmt(100 * r.cutoff.specHi, 1)}%)` : '');
      const lrs = a.lr ? `, with LR+ of ${lrTxt(r.cutoff.lrPos)} and LR− of ${lrTxt(r.cutoff.lrNeg)}` : '';
      const pv = ciAll ? `; PPV was ${pct(r.cutoff.ppv)} (95% CI ${fmt(100 * r.cutoff.dx.ppv.lo, 1)}-${fmt(100 * r.cutoff.dx.ppv.hi, 1)}%) and NPV was ${pct(r.cutoff.npv)} (95% CI ${fmt(100 * r.cutoff.dx.npv.lo, 1)}-${fmt(100 * r.cutoff.dx.npv.hi, 1)}%)` : '';
      return r.p <= alpha
        ? `${nm} ${r.higher || x.combined ? '' : '(lower values) '}could significantly predict ${what} with ${grade(r.auc)} discrimination (AUC = ${fmt(r.auc, 3)}, 95% CI ${fmt(r.lo, 3)}-${fmt(r.hi, 3)}, P value ${pTxt(r.p)}); at a cut-off of ${cutTxt(x)}${x.combined ? ' (predicted probability)' : ''}, sensitivity was ${pct(r.cutoff.sens)}${extra} and specificity was ${pct(r.cutoff.spec)}${extraS}${lrs}${pv}.`
        : `${nm} could not significantly predict ${what} (AUC = ${fmt(r.auc, 3)}, P value ${pTxt(r.p)}).`;
    });
    res.filter(x => !x.r).forEach(x => sent.push(`The ROC curve of ${lowerFirst(plain(x.label))} could not be estimated: fewer than two patients with or without ${what}.`));
    // detailed: every accuracy measure at the cut-off, and the tests ranked by AUC
    if (a.commentDetail === 'detailed') {
      res.filter(x => x.r && x.r.p <= alpha).forEach(x => { const c = x.r.cutoff, nm = x.combined ? 'the combined model' : lowerFirst(plain(x.label));
        sent.push(`At this cut-off, ${nm} had a positive predictive value of ${pct(c.ppv)}, a negative predictive value of ${pct(c.npv)} and an accuracy of ${pct(c.accuracy)}; the positive and negative likelihood ratios were ${lrTxt(c.lrPos)} and ${lrTxt(c.lrNeg)} (Youden index ${fmt(c.youden, 3)}).`); });
      const ranked = res.filter(x => x.r).sort((p1, p2) => p2.r.auc - p1.r.auc), nm = x => x.combined ? 'the combined model' : lowerFirst(plain(x.label));
      if (ranked.length > 1) sent.push(`The highest AUC was for ${nm(ranked[0])} (${fmt(ranked[0].r.auc, 3)}), followed by ${listJoin(ranked.slice(1).map(x => `${nm(x)} (${fmt(x.r.auc, 3)})`))}.`);
    }
    const f = [`*: Significant as P value ≤ ${alpha}`, 'AUC: Area under the curve', 'CI: Confidence interval (DeLong)', 'PPV: Positive predictive value', 'NPV: Negative predictive value', ROC_CUT[cutM][1], ...(a.aucScale === 'hosmer' ? ['AUC interpretation (Hosmer & Lemeshow): ≥0.9 outstanding, 0.8-0.9 excellent, 0.7-0.8 acceptable, 0.6-0.7 poor'] : [])];
    if (res.some(x => x.r && x.r.cutoff.fallback)) f.push(`${listJoin(res.filter(x => x.r && x.r.cutoff.fallback).map(x => x.combined ? 'combined model' : plain(x.label)))}: no cut-off reached the target, Youden index used`);
    if (ciAll) f.push(`95% CI in brackets: exact (Clopper-Pearson) for sensitivity, specificity, PPV, NPV and accuracy${a.lr ? ', log method for likelihood ratios' : ''}`);
    else if (a.ci) f.push('Sensitivity and specificity with exact (Clopper-Pearson) 95% CI');
    if (a.lr) f.push('LR+: Positive likelihood ratio', 'LR−: Negative likelihood ratio');
    if (a.youdenCol) f.push('Youden index: sensitivity + specificity − 1');
    if (combo) f.push('Combined model: predicted probability of a logistic regression including all test variables');
    if (res.some(x => x.r && !x.r.higher && !x.combined)) f.push('≤: lower values predict the outcome');
    const ok = res.filter(x => x.r);
    const n1 = ok.length ? ok[0].r.n1 : 0, n0 = ok.length ? ok[0].r.n0 : 0;
    // figure controls: one chart or one per test, AUC with its CI in the legend, the diagonal, line weight, the cut-off point
    const serie = x => ({ name: `${x.combined ? 'Combined model' : plain(x.label)} (AUC = ${fmt(x.r.auc, 3)}${a.figAucCi ? `, 95% CI ${fmt(x.r.lo, 3)}-${fmt(x.r.hi, 3)}` : ''})`, points: x.r.points,
      ...(a.showCut ? { cut: { fpr: 1 - x.r.cutoff.spec, tpr: x.r.cutoff.sens, label: x.combined ? '' : cutTxt(x) } } : {}) });
    const figSpec = list => ({ type: 'roc', series: list.map(serie), note: `n = ${n1} with, ${n0} without`,
      ...(a.noDiagonal ? { diagonal: false } : {}), ...(a.figLines && a.figLines !== 'normal' ? { lineW: a.figLines } : {}), ...(a.figFill ? { fill: true } : {}) });
    const figures = !ok.length || a.figure === 'none' ? []
      : a.figure === 'each' ? ok.map(x => ({ sig: x.r.p <= alpha, caption: `ROC curve of ${x.combined ? 'the combined model' : lowerFirst(plain(x.label))} for prediction of ${what}`, spec: figSpec([x]) }))
      : [{ sig: ok.some(x => x.r.p <= alpha), caption: `ROC curve for prediction of ${what}`, spec: figSpec(ok) }];
    const sec = {
      kind: 'roc', title: `Diagnostic performance for prediction of ${what}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '),
      figures, meta: { res }
    };
    if (!a.compare || ok.length < 2) return sec;
    // pairwise DeLong comparison of the AUCs, on the patients with every compared value
    used.add('rocCompare');
    const pairsOut = [];
    for (let i = 0; i < ok.length; i++) for (let j = i + 1; j < ok.length; j++) {
      const A = ok[i], B = ok[j];
      const rs = complete.length && (A.combined || B.combined) ? complete
        : rows.filter(r => toCat(r[a.outcome]) !== null && [A, B].every(x => x.combined || isFinite(toNum(r[x.col]))));
      const vals = x => x.combined ? x.fitted : rs.map(r => toNum(r[x.col]));
      const pos = rs.map(r => toCat(r[a.outcome]) === a.positive);
      pairsOut.push({ A, B, n: rs.length, c: S.rocCompare(vals(A), vals(B), pos, A.r.higher, B.r.higher) });
    }
    const nm = x => x.combined ? 'Combined model' : x.label;
    const crow = pairsOut.map(q => [{ t: [`${nm(q.A)} vs ${nm(q.B)}`], b: true }, { t: [`${fmt(q.c.aucA, 3)} vs ${fmt(q.c.aucB, 3)}`] },
      { t: [`${fmt(q.c.diff, 3)} (${fmt(q.c.lo, 3)} to ${fmt(q.c.hi, 3)})`] }, { t: [fmt(q.c.z, 2)] }, { t: [fmtP(q.c.p, alpha)] }]);
    const csent = pairsOut.map(q => {
      const better = q.c.diff >= 0 ? q.A : q.B, worse = better === q.A ? q.B : q.A, lab = x => x.combined ? 'the combined model' : lowerFirst(plain(x.label));
      return q.c.p <= alpha
        ? `The AUC of ${lab(better)} was significantly higher than that of ${lab(worse)} (difference = ${fmt(Math.abs(q.c.diff), 3)}, P value ${pTxt(q.c.p)}).`
        : `The AUCs of ${lab(q.A)} and ${lab(q.B)} were insignificantly different (P value ${pTxt(q.c.p)}).`;
    });
    const cmp = {
      kind: 'roc', title: `Comparison of the areas under the ROC curves for prediction of ${what}`,
      head: ['', 'AUC', 'Difference (95% CI)', 'Z', 'P value'], rows: crow,
      footnote: `*: Significant as P value ≤ ${alpha}, AUC: Area under the curve, CI: Confidence interval, DeLong test for correlated ROC curves (patients with both values).`,
      comment: csent.join(' '), figures: [], meta: { pairs: pairsOut }
    };
    return [sec, cmp];
  }


  // ANCOVA: outcome compared between the study groups, adjusted for covariates
  function ancovaSection(a, cfg, rows, alpha, d, used, G) {
    const { gl, groups } = G, k = gl.length;
    const outLabel = columnLabel(cfg, a.outcome);
    const covs = a.predictors.filter(c => c !== a.outcome && c !== cfg.groupCol).map(c => encode(cfg, rows, c)).filter(e => e.terms.length);
    const rs = rows.filter(r => isFinite(toNum(r[a.outcome])) && covs.every(e => e.ok(r)));
    const gi = rs.map(r => groups.indexOf(groupOf(cfg, r)));
    const y = rs.map(r => toNum(r[a.outcome])), X = rs.map(r => covs.flatMap(e => e.terms.map(t => t.get(r))));
    const byG = gl.map((_, g) => y.filter((_, i) => gi[i] === g));
    if (byG.some(v => v.length < 2)) return null;
    const res = S.ancova(y, gi, X, k);
    if (!res) return null;
    used.add('ancova');
    const tc = jStat.studentt.inv(S.QU(), res.df2), unadj = S.anova(byG).p;
    const desc = byG.map(S.describe);
    const head = ['', ...gl.map((g, i) => `${g} (n=${byG[i].length})`), 'P value'];
    const trows = [
      [{ t: [`${meanSdName()} (unadjusted)`], b: true }, ...desc.map(x => ({ t: [msd(x.mean, x.sd, d)] })), { t: [fmtP(unadj, alpha)] }],
      [{ t: ['Adjusted mean (95% CI)'], b: true }, ...res.adj.map(x => ({ t: [`${fmt(x.mean, d)} (${fmt(x.mean - tc * x.se, d)} to ${fmt(x.mean + tc * x.se, d)})`] })), { t: [fmtP(res.p, alpha)] }]
    ];
    const pairLine = q => `${gl[q.i]} vs ${gl[q.j]}: ${fmt(q.diff, d)} (${fmt(q.lo, d)} to ${fmt(q.hi, d)})${k > 2 ? `, P=${fmtP(q.p, alpha)}` : ''}`;
    if (k === 2) trows.push([{ t: ['Adjusted difference (95% CI)'], b: true }, { t: [pairLine(res.pairs[0])], span: k }, { t: [''] }]);
    else if (res.p <= alpha) trows.push([{ t: ['Adjusted difference (95% CI)'], b: true }, { t: res.pairs.map(pairLine), span: k + 1, small: true }]);
    const covLabels = covs.map(e => lowerFirst(plain(e.label)));
    const covEff = covs.flatMap(e => e.terms).map((t, i) => `${t.label}: B = ${fmt(res.covTerms[i].B, d)}, P ${res.covTerms[i].p < 0.001 ? '<' : '='} ${fmtP(res.covTerms[i].p, alpha).replace(/^</, '')}`);
    const f = [];
    if (res.p <= alpha || unadj <= alpha) f.push(`*: Significant as P value ≤ ${alpha}`);
    f.push(`Adjusted for ${covLabels.length ? listJoin(covLabels) : 'no covariates'} (covariates held at their mean values)`, `ANCOVA: F(${res.df1}, ${res.df2}) = ${fmt(res.F, 2)}, partial η² = ${fmt(res.partialEta2, 3)}`);
    if (k > 2) f.push('Pairwise comparisons of adjusted means are Bonferroni-adjusted');
    if (covEff.length) f.push(covEff.join(', '));
    // homogeneity of regression slopes: do the covariates act alike in every group? (group × covariate interaction)
    let slopes = null;
    if (a.slopes && X[0] && X[0].length) {
      const dum = gi.map(g => Array.from({ length: k - 1 }, (_, j) => +(g === j + 1)));
      const base = S.linearRegression(X.map((x, i) => [...dum[i], ...x]), y), inter = S.linearRegression(X.map((x, i) => [...dum[i], ...x, ...dum[i].flatMap(dv => x.map(c => dv * c))]), y);
      if (base && inter && inter.df > 0) {
        const df1 = (k - 1) * X[0].length, F2 = ((base.sse - inter.sse) / df1) / (inter.sse / inter.df);
        slopes = { F: F2, df1, df2: inter.df, p: 1 - jStat.centralF.cdf(F2, df1, inter.df) };
        f.push(`Homogeneity of regression slopes (group × covariate): F(${df1}, ${inter.df}) = ${fmt(F2, 2)}, P ${pTxt(slopes.p)}`);
        used.add('ancovaSlopes');
      }
    }
    const lab = plain(outLabel), sig = res.p <= alpha;
    const sent = [`After adjustment for ${covLabels.length ? listJoin(covLabels) : 'the covariates'}, ${lowerFirst(lab)} was ${sig ? 'significantly' : 'insignificantly'} different ${amongTxt(k)} (P value ${pTxt(res.p)}).`];
    if (sig) {
      const sp = res.pairs.filter(q => q.p <= alpha);
      if (k === 2) sent.push(`The adjusted mean was ${res.pairs[0].diff < 0 ? 'lower' : 'higher'} in ${gl[0]} than ${gl[1]} by ${fmt(Math.abs(res.pairs[0].diff), d)} (95% CI ${fmt(res.pairs[0].lo, d)} to ${fmt(res.pairs[0].hi, d)}).`);
      else if (sp.length) sent.push(`Adjusted means differed significantly between ${pairList(sp, gl)} (P value ${pList(sp.map(q => q.p))}).`);
    }
    if (a.commentDetail === 'detailed') {
      const terms2 = covs.flatMap(e => e.terms).map((t, i) => ({ label: t.label, ...res.covTerms[i] })), sg = terms2.filter(t => t.p <= alpha);
      sent.push(sg.length ? `Of the covariates, ${listJoin(sg.map(t => `${lowerFirst(t.label)} (B = ${fmt(t.B, d)}, P value ${pTxt(t.p)})`))} ${sg.length > 1 ? 'were' : 'was'} significantly associated with ${lowerFirst(lab)}.` : `None of the covariates was significantly associated with ${lowerFirst(lab)}.`);
      sent.push(`The group explained a partial η² of ${fmt(res.partialEta2, 3)} of the variance after adjustment.`);
    }
    if (slopes) sent.push(slopes.p > alpha ? `The regression slopes of the covariates were homogeneous across the groups (P value ${pTxt(slopes.p)}), supporting the ANCOVA assumption.`
      : `The regression slopes of the covariates differed between the groups (P value ${pTxt(slopes.p)}), so the adjusted comparison should be interpreted with caution.`);
    return { kind: 'ancova', title: `${outLabel} of the studied groups adjusted for covariates (ANCOVA)`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { res } };
  }

  // Kaplan–Meier survival by study group with the log-rank test
  function survivalSection(a, cfg, rows, alpha, d, used, G) {
    const { gl, groups } = G, k = gl.length;
    const timeLabel = columnLabel(cfg, a.outcome), evLabel = columnLabel(cfg, a.event);
    const rs = rows.filter(r => isFinite(toNum(r[a.outcome])) && toNum(r[a.outcome]) >= 0 && toCat(r[a.event]) !== null);
    const T = gl.map((_, g) => rs.filter(r => groupOf(cfg, r) === groups[g]));
    if (T.some(x => !x.length)) return null;
    const times = T.map(x => x.map(r => toNum(r[a.outcome]))), ev = T.map(x => x.map(r => toCat(r[a.event]) === a.positive));
    const km = times.map((t, g) => S.kaplanMeier(t, ev[g])), lr = S.logRank(times, ev);
    used.add('survival');
    // survival at one or more times ("12" or "6, 12, 24")
    const ats = String(a.at ?? '').split(/[,;\s]+/).map(x => parseFloat(x.replace(',', '.'))).filter(x => isFinite(x) && x >= 0);
    const at = ats.length ? ats[0] : null;
    const survAt = (m, tt = at) => { let sv = 1; for (const q of m.steps) if (q.t <= tt) sv = q.s; return sv; };
    const unit = ((timeLabel.match(/\(([^)]*)\)\s*$/) || [])[1] || '').trim(), u = unit ? ' ' + unit : '';
    const one = k === 1; // one group: a single survival curve, nothing to compare
    const head = ['', 'n', 'Events (%)', `Median survival${unit ? ` (${unit})` : ''}`, ...ats.map(tt => `Survival at ${fmt(tt, d)}${u}`), ...(one ? [] : ['Log-rank P'])];
    const trows = km.map((m, g) => {
      const row = [{ t: [gl[g]], b: true }, { t: [String(m.n)] }, { t: [`${m.events} (${fmt(100 * m.events / m.n, 1)}%)`] }, { t: [isFinite(m.median) ? fmt(m.median, d) : 'Not reached'] }];
      ats.forEach(tt => row.push({ t: [`${fmt(100 * survAt(m, tt), 1)}%`] }));
      if (g === 0 && !one) row.push({ t: [fmtP(lr.p, alpha)], rs: k });
      return row;
    });
    const med = m => isFinite(m.median) ? fmt(m.median, d) : 'not reached';
    const where = g => one ? 'the studied patients' : gl[g];
    const sent = [km.every(m => !isFinite(m.median)) ? `The median time to ${lowerFirst(plain(evLabel))} was not reached${one ? '' : ' in any group'}.`
      : `The median time to ${lowerFirst(plain(evLabel))} was ${listJoin(km.map((m, g) => `${med(m)}${isFinite(m.median) ? u : ''} in ${where(g)}`))}.`];
    if (!one) sent.push(`Survival was ${lr.p <= alpha ? 'significantly' : 'insignificantly'} different ${amongTxt(k)} (log-rank P value ${pTxt(lr.p)}).`);
    if (a.commentDetail === 'detailed') sent.splice(1, 0, `${cap(lowerFirst(plain(evLabel)))} occurred in ${listJoin(km.map((m, g) => `${m.events} of ${m.n} patients (${fmt(100 * m.events / m.n, 1)}%) in ${where(g)}`))}.`);
    ats.forEach(tt => sent.push(`At ${fmt(tt, d)}${u}, the estimated survival was ${listJoin(km.map((m, g) => `${fmt(100 * survAt(m, tt), 1)}% in ${where(g)}`))}.`));
    // pairwise log-rank tests (three or more groups), Bonferroni-adjusted
    let pw = null;
    if (a.pairwise && k > 2) {
      pw = pairs(k).map(([i, j]) => ({ i, j, p: S.bonferroni(S.logRank([times[i], times[j]], [ev[i], ev[j]]).p, k * (k - 1) / 2) }));
      const sp = pw.filter(q => q.p <= alpha);
      sent.push(sp.length ? `Pairwise, survival differed significantly between ${pairList(sp, gl)} (P value ${pList(sp.map(q => q.p))}).` : 'Pairwise log-rank comparisons were insignificant after Bonferroni correction.');
      used.add('survPair');
    }
    const f = [`Event: ${evLabel} = ${a.positive}; other patients are censored at their last follow-up`, ...(one ? [] : [`Log-rank χ²(${lr.df}) = ${fmt(lr.chi, 2)}`])];
    if (!one && lr.p <= alpha) f.unshift(`*: Significant as P value ≤ ${alpha}`);
    if (pw) f.push(`Pairwise log-rank (Bonferroni): ${pw.map(q => `${gl[q.i]} vs ${gl[q.j]} P ${pTxt(q.p)}`).join('; ')}`);
    if (a.ciBand) f.push('Shaded bands: 95% CI of the survival curves (log-log)');
    if (one) used.add('survival1');
    const sec = {
      kind: 'survival', title: `Kaplan-Meier survival analysis (${evLabel}) of the studied ${one ? 'patients' : 'groups'}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '),
      figures: [{ sig: one || lr.p <= alpha, caption: `Kaplan-Meier curve of ${lowerFirst(evLabel)}-free survival in the studied ${one ? 'patients' : 'groups'}`.replace('curve of', one ? 'curve of' : 'curves of'),
        spec: { type: 'km', xLabel: timeLabel, ...(a.ciBand ? { band: true } : {}), series: km.map((m, g) => ({ name: gl[g], steps: m.steps, censored: m.censored })), ...(one ? { legend: false } : { note: `Log-rank P ${pTxt(lr.p)}` }) } }],
      meta: { km, lr }
    };
    // swimmer plot: every patient's follow-up, event or censored
    if (a.swimmer) sec.figures.push({ sig: true, caption: `Follow-up of each patient (swimmer plot)`,
      spec: { type: 'swimmer', xLabel: timeLabel, groups: one ? [] : gl, rows: T.flatMap((x, g) => x.map((r, i) => ({ t: toNum(r[a.outcome]), event: ev[g][i], g, id: cfg.idCols && cfg.idCols[0] ? r[cfg.idCols[0]] : undefined }))) } });
    if (!a.risk) return sec;
    // number at risk: at the chosen survival times, or at six even times over the follow-up
    const tMax = Math.max(...times.flat()), sc = niceScale(0, tMax, 5), rt = [];
    if (ats.length) rt.push(0, ...ats.filter(t => t > 0)); else for (let t = 0; t <= tMax + 1e-9; t += sc.step) rt.push(+t.toFixed(10));
    const atRisk = (g, t) => times[g].filter(x => x >= t).length;
    return [sec, { kind: 'survival', title: `Number of patients at risk${one ? '' : ' in the studied groups'}`, head: [`Time${unit ? ` (${unit})` : ''}`, ...rt.map(t => fmt(t, d))],
      rows: km.map((m, g) => [{ t: [one ? 'All patients' : gl[g]], b: true }, ...rt.map(t => ({ t: [String(atRisk(g, t))] }))]),
      footnote: 'Patients still followed up and free of the event at each time.', comment: '', figures: [], meta: {} }];
  }

  // Cox proportional hazards regression: hazard ratios for time to event
  function coxSection(a, cfg, rows, alpha, d, used) {
    const timeLabel = columnLabel(cfg, a.outcome), evLabel = columnLabel(cfg, a.event);
    const preds = (a.predictors || []).filter(c => c !== a.outcome && c !== a.event).map(c => encode(cfg, rows, c)).filter(e => e.terms.length);
    if (!preds.length) return null;
    const ok = r => isFinite(toNum(r[a.outcome])) && toNum(r[a.outcome]) >= 0 && toCat(r[a.event]) !== null;
    const fitOn = list => {
      const rs = rows.filter(r => ok(r) && list.every(e => e.ok(r)));
      const ev = rs.map(r => toCat(r[a.event]) === a.positive);
      if (ev.filter(Boolean).length < 2) return null;
      return S.coxRegression(rs.map(r => list.flatMap(e => e.terms.map(t => t.get(r)))), rs.map(r => toNum(r[a.outcome])), ev);
    };
    const { model: multi, kept } = selectModel(preds, fitOn, a.method, 0), uni = a.univariable ? preds.map(e => fitOn([e])) : null;
    if (!multi && !uni) return null;
    used.add('cox');
    if (a.method === 'backward' || a.method === 'forward') used.add('sel_' + a.method);
    const est = t => `${fmt(t.hr, 2)} (${fmt(t.lo, 2)}-${fmt(t.hi, 2)})`;
    const head = [''];
    if (uni) head.push('Univariable HR (95% CI)', 'P value');
    if (multi) head.push(`${uni ? 'Multivariable ' : ''}HR (95% CI)`, 'P value');
    const terms = [];
    preds.forEach((e, pi) => {
      const ki = kept.indexOf(e), offset = kept.slice(0, Math.max(0, ki)).reduce((n, x) => n + x.terms.length, 0);
      e.terms.forEach((t, k) => terms.push({ label: t.label, u: uni && uni[pi] ? uni[pi].terms[k] : null, m: multi && ki >= 0 ? multi.terms[offset + k] : null }));
    });
    const trows = terms.map(({ label, u, m }) => {
      const row = [{ t: [label], b: true }];
      if (uni) row.push({ t: [u ? est(u) : '—'] }, { t: [u ? fmtP(u.p, alpha) : '—'] });
      if (multi) row.push({ t: [m ? est(m) : '—'] }, { t: [m ? fmtP(m.p, alpha) : '—'] });
      return row;
    });
    const sig = terms.filter(x => (x.m || x.u) && (x.m || x.u).p <= alpha);
    const f = [];
    if (sig.length) f.push(`*: Significant as P value ≤ ${alpha}`);
    f.push('HR: Hazard ratio', 'CI: Confidence interval', `Event: ${evLabel} = ${a.positive}`);
    if (multi) f.push(`Model: n=${multi.n} (${multi.events} events), likelihood ratio χ²(${multi.df}) = ${fmt(multi.chi, 2)}, P ${pTxt(multi.pModel)}`);
    if (multi && multi.unstable) f.push('Warning: the model did not converge or has extreme estimates, so they are unreliable');
    if (methodNote(a.method)) f.push(methodNote(a.method));
    const refs = preds.filter(e => e.ref).map(e => `${e.label}: reference = ${e.ref}`);
    if (refs.length) f.push(refs.join(', '));
    const what = lowerFirst(plain(evLabel));
    const phr = x => `${lowerFirst(x.label)} (HR = ${fmt(x.t.hr, 2)}, 95% CI ${fmt(x.t.lo, 2)}-${fmt(x.t.hi, 2)}, P value ${pTxt(x.t.p)})`;
    const sm = terms.filter(x => x.m && x.m.p <= alpha).map(x => ({ label: x.label, t: x.m }));
    const sent = [];
    if (multi) sent.push(sm.length ? `In ${preds.length > 1 ? 'multivariable ' : ''}Cox regression, ${listJoin(sm.map(phr))} ${sm.length > 1 ? 'were independent predictors' : 'was a significant predictor'} of ${what}.`
      : `None of the studied variables was a significant ${preds.length > 1 ? 'independent ' : ''}predictor of ${what} in Cox regression.`);
    else sent.push('The multivariable model could not be estimated: too few events or collinear predictors.');
    if (a.commentDetail === 'detailed' && multi) {
      sm.forEach(x => sent.push(`For ${lowerFirst(x.label)}, the hazard of ${what} was ${fmt(Math.abs(x.t.hr - 1) * 100, 0)}% ${x.t.hr >= 1 ? 'higher' : 'lower'} ${/ vs /.test(x.label) ? 'compared with the reference category' : 'for each one-unit increase'} (HR = ${fmt(x.t.hr, 2)}).`));
      const ns = terms.filter(x => x.m && !(x.m.p <= alpha));
      if (ns.length) sent.push(`${cap(listJoin(ns.map(x => `${lowerFirst(x.label)} (P value ${pTxt(x.m.p)})`)))} ${ns.length > 1 ? 'were' : 'was'} not significant.`);
      sent.push(`The model included ${multi.n} patients with ${multi.events} events (likelihood ratio P value ${pTxt(multi.pModel)}).`);
    }
    const fg = a.forest ? forestFigure(terms, 'cox', what, alpha, d) : null;
    return { kind: 'cox', title: `Cox regression analysis for prediction of ${what}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: fg ? [fg] : [], meta: { multi, uni } };
  }

  // McNemar / McNemar–Bowker: change of a categorical variable between two measurements, in each group and overall
  function mcnemarSection(a, cfg, rows, alpha, d, used, G) {
    const { gl, groups } = G;
    if (!a.second) return null;
    const l1 = columnLabel(cfg, a.outcome), l2 = columnLabel(cfg, a.second);
    const rs = rows.filter(r => toCat(r[a.outcome]) !== null && toCat(r[a.second]) !== null);
    const lv = [...new Set([...levelsOf(cfg, rs, a.outcome), ...levelsOf(cfg, rs, a.second)])];
    if (lv.length < 2) return null;
    const pos = lv.includes(a.positive) ? a.positive : lv[0];
    const sets = gl.length < 2 ? [{ name: 'All patients', rs }] : [...gl.map((g, i) => ({ name: g, rs: rs.filter(r => groupOf(cfg, r) === groups[i]) })), { name: 'All patients', rs }];
    used.add('mcnemar');
    const res = sets.map(x => {
      const t = lv.map(u => lv.map(v => x.rs.filter(r => toCat(r[a.outcome]) === u && toCat(r[a.second]) === v).length));
      return { ...x, n: x.rs.length, p1: x.rs.filter(r => toCat(r[a.outcome]) === pos).length, p2: x.rs.filter(r => toCat(r[a.second]) === pos).length, test: x.rs.length ? S.mcnemar(t) : null };
    });
    const pct = (k, n) => `${k} (${fmt(n ? 100 * k / n : 0, 1)}%)`;
    const head = ['', 'n', `${plain(l1)}: ${pos}`, `${plain(l2)}: ${pos}`, 'P value'];
    const trows = res.map(x => [{ t: [x.name], b: true }, { t: [String(x.n)] }, { t: [pct(x.p1, x.n)] }, { t: [pct(x.p2, x.n)] }, { t: [x.test ? fmtP(x.test.p, alpha) : '—'] }]);
    const tests = [...new Set(res.filter(x => x.test).map(x => x.test.test))];
    const sent = res.filter(x => x.test).map(x => `In ${x.name === 'All patients' ? 'all patients' : x.name}, the proportion with ${lowerFirst(plain(l1))} ${pos} (${fmt(x.n ? 100 * x.p1 / x.n : 0, 1)}%) ${x.test.p <= alpha ? 'changed significantly' : 'did not change significantly'} at ${lowerFirst(plain(l2))} (${fmt(x.n ? 100 * x.p2 / x.n : 0, 1)}%, P value ${pTxt(x.test.p)}).`);
    const f = [];
    if (res.some(x => x.test && x.test.p <= alpha)) f.push(`*: Significant as P value ≤ ${alpha}`);
    f.push(`Data are presented as frequency (%), P values by ${listJoin(tests)} test${tests.length > 1 ? 's' : ''}`);
    if (lv.length > 2) f.push(`categories: ${lv.join(', ')}`);
    return { kind: 'mcnemar', title: `${plain(l1)} versus ${lowerFirst(plain(l2))} in the studied ${sets.length > 1 ? 'groups' : 'patients'} (paired comparison)`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { res } };
  }

  // Cohen's kappa between two raters / methods (categorical), with the cross-table
  function kappaSection(a, cfg, rows, alpha, d, used) {
    if (!a.second) return null;
    const l1 = columnLabel(cfg, a.outcome), l2 = columnLabel(cfg, a.second);
    const rs = rows.filter(r => toCat(r[a.outcome]) !== null && toCat(r[a.second]) !== null);
    const lv = [...new Set([...levelsOf(cfg, rs, a.outcome), ...levelsOf(cfg, rs, a.second)])];
    if (lv.length < 2 || rs.length < 2) return null;
    const t = lv.map(u => lv.map(v => rs.filter(r => toCat(r[a.outcome]) === u && toCat(r[a.second]) === v).length));
    const k = S.cohenKappa(t);
    used.add('kappa');
    const grade = v => v < 0 ? 'poor' : v <= 0.2 ? 'slight' : v <= 0.4 ? 'fair' : v <= 0.6 ? 'moderate' : v <= 0.8 ? 'substantial' : 'almost perfect';
    const head = [`${plain(l1)} \\ ${plain(l2)}`, ...lv, 'Total'];
    const trows = lv.map((u, i) => [{ t: [u], b: true }, ...t[i].map(c => ({ t: [String(c)] })), { t: [String(S.sum(t[i]))] }]);
    trows.push([{ t: ['Total'], b: true }, ...lv.map((_, j) => ({ t: [String(S.sum(t.map(r => r[j])))] })), { t: [String(rs.length)] }]);
    trows.push([{ t: ['Agreement'], b: true }, { t: [`${fmt(100 * k.po, 1)}%, κ = ${fmt(k.kappa, 3)} (95% CI ${fmt(k.lo, 3)} to ${fmt(k.hi, 3)}), P ${pTxt(k.p)}`], span: lv.length + 1 }]);
    // weighted kappa for ordered categories (in the order of the levels)
    const wk = a.weights === 'linear' || a.weights === 'quadratic' ? S.weightedKappa(t, a.weights) : null;
    if (wk) { trows.push([{ t: [`Weighted κ (${a.weights})`], b: true }, { t: [`κw = ${fmt(wk.kappa, 3)} (95% CI ${fmt(wk.lo, 3)} to ${fmt(wk.hi, 3)}), P ${pTxt(wk.p)}`], span: lv.length + 1 }]); used.add('kappaW'); }
    const f = [`κ: Cohen's kappa`, ...(wk ? [`κw: ${a.weights}-weighted kappa for the categories in the order ${lv.join(' < ')}`] : []), 'CI: Confidence interval', 'Interpretation (Landis & Koch): ≤0.20 slight, 0.21-0.40 fair, 0.41-0.60 moderate, 0.61-0.80 substantial, >0.80 almost perfect'];
    const sent = [`The agreement between ${lowerFirst(plain(l1))} and ${lowerFirst(plain(l2))} was ${grade(k.kappa)} (observed agreement ${fmt(100 * k.po, 1)}%, κ = ${fmt(k.kappa, 3)}, 95% CI ${fmt(k.lo, 3)} to ${fmt(k.hi, 3)}, P value ${pTxt(k.p)}).`];
    if (wk) sent.push(`Taking the order of the categories into account, the ${a.weights}-weighted kappa was ${fmt(wk.kappa, 3)} (95% CI ${fmt(wk.lo, 3)} to ${fmt(wk.hi, 3)}), indicating ${grade(wk.kappa)} agreement.`);
    return { kind: 'kappa', title: `Agreement between ${lowerFirst(plain(l1))} and ${lowerFirst(plain(l2))}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { k } };
  }

  // ICC and Bland–Altman agreement between two numeric methods / raters
  function agreementSection(a, cfg, rows, alpha, d, used) {
    if (!a.second) return null;
    const l1 = columnLabel(cfg, a.outcome), l2 = columnLabel(cfg, a.second);
    const rs = rows.filter(r => isFinite(toNum(r[a.outcome])) && isFinite(toNum(r[a.second])));
    if (rs.length < 3) return null;
    const x = rs.map(r => toNum(r[a.outcome])), y = rs.map(r => toNum(r[a.second]));
    const ic0 = S.icc(x.map((v, i) => [v, y[i]])), dx = S.describe(x), dy = S.describe(y);
    // consistency ICC (C,1) / (C,k) instead of absolute agreement (A,1) / (A,k) when chosen
    const cons = a.iccType === 'consistency', ic = cons ? { ...ic0, ...ic0.consistency } : ic0;
    // Bland-Altman of percentage differences ((A − B) / mean × 100) when chosen
    // pairs with a mean of zero have no percentage difference and are left out
    const keep = x.map((v, i) => v + y[i] !== 0), pctBA = !!a.baPct && keep.filter(Boolean).length >= 3, dropped = keep.filter(k2 => !k2).length;
    const ba = pctBA ? (() => { const xs = x.filter((_, i) => keep[i]), ys = y.filter((_, i) => keep[i]), m = xs.map((v, i) => (v + ys[i]) / 2), dd2 = xs.map((v, i) => 100 * (v - ys[i]) / m[i]);
      return { ...S.blandAltman(dd2, new Array(dd2.length).fill(0)), means: m }; })() : S.blandAltman(x, y);
    used.add('icc'); if (cons) used.add('iccC');
    const ci = (lo, hi, dd = d) => `${fmt(lo, dd)} to ${fmt(hi, dd)}`;
    const head = ['', 'Value', '95% CI', 'P value'];
    const trows = [
      [{ t: [`${plain(l1)} (${meanSdName(true)})`], b: true }, { t: [msd(dx.mean, dx.sd, d)] }, { t: ['—'] }, { t: ['—'] }],
      [{ t: [`${plain(l2)} (${meanSdName(true)})`], b: true }, { t: [msd(dy.mean, dy.sd, d)] }, { t: ['—'] }, { t: ['—'] }],
      [{ t: [pctBA ? 'Mean difference (bias), %' : 'Mean difference (bias)'], b: true }, { t: [fmt(ba.bias, d)] }, { t: [ci(ba.biasLo, ba.biasHi)] }, { t: [fmtP(ba.p, alpha)] }],
      [{ t: [pctBA ? '95% limits of agreement, %' : '95% limits of agreement'], b: true }, { t: [ci(ba.lo, ba.hi)] }, { t: ['—'] }, { t: ['—'] }],
      [{ t: ['ICC, single measures'], b: true }, { t: [fmt(ic.single, 3)] }, { t: [ci(ic.lo, ic.hi, 3)] }, { t: [fmtP(ic.p, alpha)] }],
      [{ t: ['ICC, average measures'], b: true }, { t: [fmt(ic.average, 3)] }, { t: [ci(ic.loAvg, ic.hiAvg, 3)] }, { t: [fmtP(ic.p, alpha)] }]
    ];
    const grade = v => v < 0.5 ? 'poor' : v < 0.75 ? 'moderate' : v < 0.9 ? 'good' : 'excellent';
    const f = [`*: Significant as P value ≤ ${alpha}`, `n = ${rs.length}`, `Bias = ${plain(l1)} − ${plain(l2)} (P by paired t-test)`, `ICC: Intraclass correlation coefficient (${cons ? 'two-way mixed effects, consistency' : 'two-way random effects, absolute agreement'})`, ...(pctBA ? [`Bland-Altman of percentage differences: (${plain(l1)} − ${plain(l2)}) / mean × 100${dropped ? ` (${dropped} pair${dropped > 1 ? 's' : ''} with a mean of 0 left out)` : ''}`] : []), 'Interpretation (Koo & Li): <0.5 poor, 0.5-0.75 moderate, 0.75-0.9 good, >0.9 excellent'];
    const sent = [`The agreement between ${lowerFirst(plain(l1))} and ${lowerFirst(plain(l2))} was ${grade(ic.single)} (ICC = ${fmt(ic.single, 3)}, 95% CI ${ci(ic.lo, ic.hi, 3)}).`,
      `The mean ${pctBA ? 'percentage ' : ''}difference was ${fmt(ba.bias, d)}${pctBA ? '%' : ''} (95% CI ${ci(ba.biasLo, ba.biasHi)}${ba.p <= alpha ? ', significantly different from zero' : ''}), with 95% limits of agreement from ${ci(ba.lo, ba.hi)}${pctBA ? '%' : ''}.`];
    return {
      kind: 'agreement', title: `Agreement between ${lowerFirst(plain(l1))} and ${lowerFirst(plain(l2))}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '),
      figures: [{ sig: true, caption: `Bland-Altman plot of ${lowerFirst(plain(l1))} versus ${lowerFirst(plain(l2))}`,
        spec: { type: 'ba', x: ba.means, y: ba.diffs, bias: ba.bias, lo: ba.lo, hi: ba.hi, xLabel: `Mean of ${plain(l1)} and ${plain(l2)}`, yLabel: pctBA ? `Difference, % of the mean (${plain(l1)} − ${plain(l2)})` : `Difference (${plain(l1)} − ${plain(l2)})`, dec: d } }],
      meta: { ic, ba }
    };
  }

  // diagnostic accuracy of a categorical index test against a reference standard (2×2)
  function diagnosticSection(a, cfg, rows, alpha, d, used) {
    if (!a.event || !a.eventPositive) return null;
    const refLabel = columnLabel(cfg, a.outcome), idxLabel = columnLabel(cfg, a.event);
    const rs = rows.filter(r => toCat(r[a.outcome]) !== null && toCat(r[a.event]) !== null);
    const isRef = r => toCat(r[a.outcome]) === a.positive, isPos = r => toCat(r[a.event]) === a.eventPositive;
    const tp = rs.filter(r => isRef(r) && isPos(r)).length, fn = rs.filter(r => isRef(r) && !isPos(r)).length;
    const fp = rs.filter(r => !isRef(r) && isPos(r)).length, tn = rs.filter(r => !isRef(r) && !isPos(r)).length;
    if (!(tp + fn) || !(fp + tn)) return null;
    const x = S.diagnostic2x2(tp, fp, fn, tn);
    used.add('diagnostic');
    const pc = q => `${fmt(100 * q.v, 1)}%`, pci = q => `${fmt(100 * q.lo, 1)}-${fmt(100 * q.hi, 1)}%`, r2 = q => fmt(q.v, 2), r2ci = q => `${fmt(q.lo, 2)}-${fmt(q.hi, 2)}`;
    const head = ['', 'Value', '95% CI'];
    const trows = [['Sensitivity', x.sens, 1], ['Specificity', x.spec, 1], ['Positive predictive value', x.ppv, 1], ['Negative predictive value', x.npv, 1],
      ['Positive likelihood ratio', x.lrPos, 0], ['Negative likelihood ratio', x.lrNeg, 0], ['Accuracy', x.accuracy, 1], ['Prevalence', x.prevalence, 1]]
      .map(([n, q, isP]) => [{ t: [n], b: true }, { t: [isP ? pc(q) : r2(q)] }, { t: [isP ? pci(q) : r2ci(q)] }]);
    const refName = isGroupCol(cfg, a.outcome) ? (cfg.groupLabels[a.positive] || a.positive) : `${lowerFirst(plain(refLabel))} (${a.positive})`;
    // predictive values at another prevalence (Bayes' theorem), e.g. that of the target population
    const prev = parseFloat(String(a.prev ?? '').replace(',', '.')) / 100, prevOk = prev > 0 && prev < 1;
    const ppvAt = prevOk ? x.sens.v * prev / (x.sens.v * prev + (1 - x.spec.v) * (1 - prev)) : NaN, npvAt = prevOk ? x.spec.v * (1 - prev) / (x.spec.v * (1 - prev) + (1 - x.sens.v) * prev) : NaN;
    if (prevOk) trows.push([{ t: [`PPV at a prevalence of ${fmt(100 * prev, 1)}%`], b: true }, { t: [`${fmt(100 * ppvAt, 1)}%`] }, { t: ['—'] }], [{ t: [`NPV at a prevalence of ${fmt(100 * prev, 1)}%`], b: true }, { t: [`${fmt(100 * npvAt, 1)}%`] }, { t: ['—'] }]);
    const f = [`Index test: ${idxLabel} = ${a.eventPositive}`, `Reference standard: ${refLabel} = ${a.positive}`, `TP = ${tp}, FP = ${fp}, FN = ${fn}, TN = ${tn}`,
      'CIs for proportions are exact (Clopper-Pearson), for likelihood ratios by the log method'];
    const sent = [`For the detection of ${refName}, ${lowerFirst(plain(idxLabel))} (${a.eventPositive}) had a sensitivity of ${pc(x.sens)} (95% CI ${pci(x.sens)}) and a specificity of ${pc(x.spec)} (95% CI ${pci(x.spec)}), with a positive predictive value of ${pc(x.ppv)}, a negative predictive value of ${pc(x.npv)} and an overall accuracy of ${pc(x.accuracy)}.`];
    if (isFinite(x.lrPos.v)) sent.push(`The positive and negative likelihood ratios were ${r2(x.lrPos)} and ${r2(x.lrNeg)} respectively.`);
    if (prevOk) { sent.push(`At a prevalence of ${fmt(100 * prev, 1)}%, the positive and negative predictive values would be ${fmt(100 * ppvAt, 1)}% and ${fmt(100 * npvAt, 1)}%.`); f.push("Predictive values at the chosen prevalence by Bayes' theorem"); }
    return { kind: 'diagnostic', title: `Diagnostic accuracy of ${lowerFirst(plain(idxLabel))} for ${refName}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { x } };
  }

  // Cronbach's alpha for a set of numeric items (questionnaire reliability)
  // Cochran's Q: the same yes/no outcome measured several times in the same patients (each study group, and all patients)
  function cochranSection(a, cfg, rows, alpha, d, used, G) {
    const cols = (a.predictors || []).filter(c => rows.some(r => toCat(r[c]) !== null)); if (cols.length < 2) return null;
    const pos = a.positive || 'Yes', is = v => toCat(v) === null ? NaN : +(toCat(v).toLowerCase() === String(pos).toLowerCase());
    const sets = [...(G.groups.length > 1 ? G.groups.map((g, i) => [G.gl[i], rows.filter(r => groupOf(cfg, r) === g)]) : []), ['All patients', rows]];
    const head = ['', ...cols.map(c => columnLabel(cfg, c)), 'n', "Cochran's Q", 'P value'], trows = [], sent = [];
    sets.forEach(([name, rs]) => {
      const M = rs.map(r => cols.map(c => is(r[c]))).filter(m => m.every(x => x === 0 || x === 1)), q = S.cochranQ(M); if (!q) return;
      trows.push([{ t: [name], b: true }, ...q.counts.map(c => ({ t: [npc(c, 100 * c / q.n, q.n)] })), { t: [String(q.n)] }, { t: [`Q(${q.df}) = ${fmt(q.Q, 2)}`] }, { t: [fmtP(q.p, alpha)] }]);
      sent.push(`${name === 'All patients' ? 'Among all patients' : `In ${name}`}, the proportion of “${pos}” ${q.p <= alpha ? 'changed significantly' : 'did not change significantly'} across ${listJoin(cols.map(c => columnLabel(cfg, c)))} (Cochran's Q = ${fmt(q.Q, 2)}, P value ${pTxt(q.p)}).`);
    });
    if (!trows.length) return null; used.add('cochran');
    return { kind: 'cochran', title: `“${pos}” across ${cols.length} repeated measurements (${listJoin(cols.map(c => columnLabel(cfg, c)))})`, head, rows: trows,
      footnote: `Data are n (%) of the patients with “${pos}” among those with every measurement, Cochran's Q test.`, comment: sent.join(' '), figures: [], meta: {} };
  }
  // equivalence of two groups by two one-sided t-tests (TOST) against a margin ± Δ of the mean difference
  function tostSection(a, cfg, rows, alpha, d, used, G) {
    const { gl, groups } = G, D = Math.abs(toNum(a.margin)); if (groups.length < 2 || !(D > 0)) return null;
    const lab = columnLabel(cfg, a.outcome), vals = g => rows.filter(r => groupOf(cfg, r) === g).map(r => toNum(r[a.outcome])).filter(isFinite);
    const head = ['Comparison', 'Mean ± SD (first)', 'Mean ± SD (second)', 'Mean difference (90% CI)', 'Margin', 'P (lower)', 'P (upper)', 'TOST P value', 'Conclusion'], trows = [], sent = [];
    pairs(groups.length).forEach(([i, j]) => {
      const x = vals(groups[i]), y = vals(groups[j]); if (x.length < 2 || y.length < 2) return;
      const t = S.tost(x, y, -D, D), eq = t.p <= alpha, ms = v => `${fmt(S.mean(v), d)} ± ${fmt(S.sd(v), d)}`;
      trows.push([{ t: [`${gl[i]} vs ${gl[j]}`], b: true }, { t: [ms(x)] }, { t: [ms(y)] }, { t: [`${fmt(t.md, d)} (${fmt(t.lo90, d)} to ${fmt(t.hi90, d)})`] }, { t: [`± ${fmt(D, d)}`] },
        { t: [fmtP(t.pL, -1)] }, { t: [fmtP(t.pU, -1)] }, { t: [fmtP(t.p, alpha)] }, { t: [eq ? 'Equivalent' : 'Not shown equivalent'] }]);
      sent.push(`${gl[i]} and ${gl[j]} ${eq ? 'were statistically equivalent' : 'could not be shown to be equivalent'} in ${lowerFirst(plain(lab))} within a margin of ± ${fmt(D, d)} (mean difference ${fmt(t.md, d)}, 90% CI ${fmt(t.lo90, d)} to ${fmt(t.hi90, d)}; TOST P value ${pTxt(t.p)}).`);
    });
    if (!trows.length) return null; used.add('tost');
    return { kind: 'tost', title: `Equivalence of ${lowerFirst(plain(lab))} between the studied groups (margin ± ${fmt(D, d)})`, head, rows: trows,
      footnote: `Two one-sided t-tests (TOST); the groups are equivalent when the 90% CI of the mean difference lies within the margin (TOST P value ≤ ${alpha}).`, comment: sent.join(' '), figures: [], meta: {} };
  }
  // Mantel-Haenszel: the odds ratio of a yes/no outcome between two study groups, pooled over the strata of a third variable
  function mhSection(a, cfg, rows, alpha, d, used, G) {
    const { gl, groups } = G; if (groups.length !== 2 || !a.second) return null;
    const pos = a.positive, is = r => toCat(r[a.outcome]) === pos, rs = rows.filter(r => toCat(r[a.outcome]) !== null && toCat(r[a.second]) !== null && groups.includes(groupOf(cfg, r)));
    const strata = levelsOf(cfg, rs, a.second), tables = strata.map(sv => { const q = rs.filter(r => toCat(r[a.second]) === sv), g1 = q.filter(r => groupOf(cfg, r) === groups[0]), g2 = q.filter(r => groupOf(cfg, r) === groups[1]);
      return [[g1.filter(is).length, g1.filter(r => !is(r)).length], [g2.filter(is).length, g2.filter(r => !is(r)).length]]; });
    if (tables.length < 1) return null;
    const m = S.mantelHaenszel(tables); if (!isFinite(m.or)) return null; used.add('mh');
    const ev = eventName(cfg, a), sl = columnLabel(cfg, a.second), pc = (k, n) => `${k}/${n} (${fmt(n ? 100 * k / n : 0, 1)}%)`;
    const orOne = ([[x, y], [z, w]]) => { const h = [x, y, z, w].some(v => v === 0) ? 0.5 : 0, o = ((x + h) * (w + h)) / ((y + h) * (z + h)), se = Math.sqrt(1 / (x + h) + 1 / (y + h) + 1 / (z + h) + 1 / (w + h));
      return `${fmt(o, 2)} (${fmt(Math.exp(Math.log(o) - S.ZC() * se), 2)} to ${fmt(Math.exp(Math.log(o) + S.ZC() * se), 2)})`; };
    const head = [plain(sl), gl[0], gl[1], 'OR (95% CI)'];
    const trows = tables.map((t, i) => [{ t: [strata[i]], b: true }, { t: [pc(t[0][0], t[0][0] + t[0][1])] }, { t: [pc(t[1][0], t[1][0] + t[1][1])] }, { t: [orOne(t)] }]);
    trows.push([{ t: ['Mantel-Haenszel pooled'], b: true }, { t: [''] }, { t: [`χ²(1) = ${fmt(m.cmh, 2)}, P ${pTxt(m.p)}`] }, { t: [`${fmt(m.or, 2)} (${fmt(m.lo, 2)} to ${fmt(m.hi, 2)})`], b: m.p <= alpha }]);
    const sent = [`Adjusted for ${lowerFirst(plain(sl))}, the odds of ${ev} in ${gl[0]} compared with ${gl[1]} ${m.p <= alpha ? 'differed significantly' : 'did not differ significantly'} (Mantel-Haenszel OR = ${fmt(m.or, 2)}, 95% CI ${fmt(m.lo, 2)} to ${fmt(m.hi, 2)}; P value ${pTxt(m.p)}).`];
    if (isFinite(m.bdP)) sent.push(m.bdP <= alpha ? `The odds ratio differed between the strata (Breslow-Day P value ${pTxt(m.bdP)}), so the pooled estimate should be read with caution.` : `The odds ratio was homogeneous across the strata (Breslow-Day P value ${pTxt(m.bdP)}).`);
    return { kind: 'mh', title: `${ev[0].toUpperCase() + ev.slice(1)} in the studied groups stratified by ${lowerFirst(plain(sl))} (Mantel-Haenszel)`, head, rows: trows,
      footnote: `Data are n/N (%) with ${ev}; OR: odds ratio of ${gl[0]} vs ${gl[1]} (95% CI), Cochran-Mantel-Haenszel test${isFinite(m.bdP) ? `, Breslow-Day test of homogeneity P value ${pTxt(m.bdP)}` : ''}.`, comment: sent.join(' '), figures: [], meta: { m } };
  }
  // conditional logistic regression for matched case-control sets (the matched-set id is the second column)
  function clogitSection(a, cfg, rows, alpha, d, used) {
    if (!a.second || !(a.predictors || []).length) return null;
    const enc = a.predictors.map(c => encode(cfg, rows, c)).filter(e => e.terms.length), terms = enc.flatMap(e => e.terms); if (!terms.length) return null;
    const rs = rows.filter(r => toCat(r[a.outcome]) !== null && toCat(r[a.second]) !== null && enc.every(e => e.ok(r)));
    const bySet = new Map(); rs.forEach(r => { const k = toCat(r[a.second]); if (!bySet.has(k)) bySet.set(k, []); bySet.get(k).push(r); });
    const sets = [...bySet.values()].map(q => ({ y: q.map(r => +(toCat(r[a.outcome]) === a.positive)), X: q.map(r => terms.map(t => t.get(r))) })).filter(st => st.y.some(v => v) && st.y.some(v => !v) && st.y.length <= 20);
    if (sets.length < 3) return null;
    const m = S.conditionalLogit(sets); if (!m) return null; used.add('clogit');
    const ev = eventName(cfg, a), head = ['Variable', 'OR (95% CI)', 'P value'];
    const trows = terms.map((t, i) => [{ t: [plain(t.label)], b: true }, { t: [`${fmt(m.or[i], 2)} (${fmt(m.lo[i], 2)} to ${fmt(m.hi[i], 2)})`] }, { t: [fmtP(m.p[i], alpha)] }]);
    const sig = terms.map((t, i) => [t, i]).filter(([, i]) => m.p[i] <= alpha);
    const sent = [`In ${sets.length} matched sets, ${sig.length ? `${listJoin(sig.map(([t, i]) => `${lowerFirst(plain(t.label))} (OR = ${fmt(m.or[i], 2)}, 95% CI ${fmt(m.lo[i], 2)} to ${fmt(m.hi[i], 2)}; P value ${pTxt(m.p[i])})`))} ${sig.length > 1 ? 'were' : 'was'} significantly associated with ${ev}` : `none of the studied variables was significantly associated with ${ev}`}.`];
    return { kind: 'clogit', title: `Conditional logistic regression for ${ev} (matched by ${lowerFirst(plain(columnLabel(cfg, a.second)))})`, head, rows: trows,
      footnote: `OR: odds ratio (95% CI) from conditional logistic regression on ${sets.length} matched sets.`, comment: sent.join(' '), figures: [], meta: { m } };
  }
  function cronbachSection(a, cfg, rows, alpha, d, used) {
    const cols = (a.predictors || []).filter(c => isNumberColumn(rows, c));
    if (cols.length < 2) return null;
    const rs = rows.filter(r => cols.every(c => isFinite(toNum(r[c]))));
    if (rs.length < 3) return null;
    const res = S.cronbach(rs.map(r => cols.map(c => toNum(r[c]))));
    used.add('cronbach');
    const grade = v => v >= 0.9 ? 'excellent' : v >= 0.8 ? 'good' : v >= 0.7 ? 'acceptable' : v >= 0.6 ? 'questionable' : v >= 0.5 ? 'poor' : 'unacceptable';
    const head = ['Item', meanSdName(), 'Corrected item-total correlation', "Cronbach's α if item deleted"];
    const trows = cols.map((c, i) => [{ t: [columnLabel(cfg, c)], b: true }, { t: [msd(res.items[i].mean, res.items[i].sd, d)] }, { t: [fmt(res.items[i].rit, 3)] }, { t: [fmt(res.items[i].alphaDeleted, 3)] }]);
    trows.push([{ t: ['Overall'], b: true }, { t: [`α = ${fmt(res.alpha, 3)} (95% CI ${fmt(res.lo, 3)} to ${fmt(res.hi, 3)})`], span: 3 }]);
    let sb = null;
    if (a.split && cols.length >= 2) {
      const Y = rs.map(r => cols.map(c => toNum(r[c]))), odd = Y.map(r => S.sum(r.filter((_, j) => j % 2 === 0))), even = Y.map(r => S.sum(r.filter((_, j) => j % 2 === 1)));
      const rr = S.pearson(odd, even).r; sb = { r: rr, sb: 2 * rr / (1 + rr) };
      trows.push([{ t: ['Split-half (odd / even items)'], b: true }, { t: [`r = ${fmt(rr, 3)}, Spearman-Brown = ${fmt(sb.sb, 3)}`], span: 3 }]);
      used.add('splitHalf');
    }
    const weak = cols.filter((_, i) => res.items[i].alphaDeleted > res.alpha).map(c => lowerFirst(plain(columnLabel(cfg, c))));
    const sent = [`The internal consistency of the ${res.k} items was ${grade(res.alpha)} (Cronbach's α = ${fmt(res.alpha, 3)}, 95% CI ${fmt(res.lo, 3)} to ${fmt(res.hi, 3)}, n = ${res.n}).`];
    if (weak.length) sent.push(`Removing ${listJoin(weak)} would increase α.`);
    const f = [`n = ${res.n} patients with complete answers`, 'CI by the Feldt method', 'Interpretation: ≥0.9 excellent, 0.8-0.9 good, 0.7-0.8 acceptable, 0.6-0.7 questionable, 0.5-0.6 poor'];
    if (sb) sent.push(`The split-half reliability (odd versus even items) was ${fmt(sb.sb, 3)} after the Spearman-Brown correction.`);
    return { kind: 'cronbach', title: `Reliability (internal consistency) of the ${res.k} items`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { res } };
  }

  /* ---------- results by variable: every descriptive statistic and every candidate test, for checking (not for the report) ---------- */
  // returns { groups, k, items: [{ id, label, kind, tables: [{ title, head, rows, note }], spec, summary }] }; cells are plain strings
  // xo (options of the stage): dec (decimals), extra (more statistics), fig (figure type), out (outlier rule)
  const OUT_RULE = { '1.5': 'beyond 1.5 × IQR', '3': 'beyond 3 × IQR', z3: '|z| > 3' };
  function outFence(vals, rule) {
    if (vals.length < 4 || !OUT_RULE[rule]) return null;
    if (rule === 'z3') { const m = S.mean(vals), sd = S.sd(vals); return [m - 3 * sd, m + 3 * sd]; }
    const q1 = S.quantile(vals, 0.25), q3 = S.quantile(vals, 0.75), k = +rule * (q3 - q1); return [q1 - k, q3 + k];
  }
  // skewness and excess kurtosis with their standard errors, as in SPSS
  function shape(a) {
    const n = a.length; if (n < 4) return null;
    const m = S.mean(a), sd = S.sd(a); if (!(sd > 0)) return null;
    const z3 = S.sum(a.map(v => ((v - m) / sd) ** 3)), z4 = S.sum(a.map(v => ((v - m) / sd) ** 4));
    const skew = n / ((n - 1) * (n - 2)) * z3, kurt = n * (n + 1) / ((n - 1) * (n - 2) * (n - 3)) * z4 - 3 * (n - 1) ** 2 / ((n - 2) * (n - 3));
    const ses = Math.sqrt(6 * n * (n - 1) / ((n - 2) * (n + 1) * (n + 3))), sek = 2 * ses * Math.sqrt((n * n - 1) / ((n - 3) * (n + 5)));
    return { skew, ses, kurt, sek };
  }
  function explore(data, cfg, xo = {}) {
    S.setConf((+cfg.options.confLevel || 95) / 100);
    [data, cfg] = withValueLabels(data, cfg);
    TP_TIME = cfg.tpTime || {};
    const opts = cfg.options, alpha = opts.alpha, d = xo.dec !== undefined && xo.dec !== '' ? +xo.dec : opts.decimals;
    setRO(opts);
    normality = normalityTest(opts.normality);
    FMT = { pDig: +opts.pDigits || 3, sig: opts.sigSym ?? '*', mean: opts.meanStyle || 'pm', iqr: opts.iqrStyle || 'dash', pct: opts.pctDecimals ?? 1, pLead: opts.pLead !== false && +opts.pLead !== 0, cat: opts.catFormat || 'npct' };
    const groups = cfg.groupOrder.filter(g => cfg.groupInclude[g] !== false), gl = groups.map(g => cfg.groupLabels[g] || g), k = groups.length;
    const rows = data.rows.filter(r => groups.includes(groupOf(cfg, r))), byGroup = groups.map(g => rows.filter(r => groupOf(cfg, r) === g));
    const nName = opts.normality === 'ks' ? 'Kolmogorov-Smirnov' : opts.normality === 'skewkurt' ? 'Skewness/kurtosis z' : 'Shapiro-Wilk';
    const F = (x, dd = d) => x === null || x === undefined || !isFinite(x) ? '—' : fmt(x, dd), P = p => fmtP(p, alpha);
    const ci = (a, b, dd = d) => isFinite(a) && isFinite(b) ? `${fmt(a, dd)} to ${fmt(b, dd)}` : '—';
    const used = new Set(), yes = '✓';
    const descHead = ['', 'n', 'Missing', 'Mean', 'SD', 'SE', '95% CI of the mean', 'Median', 'IQR', 'Min', 'Max', `${nName} P`];
    const descRow = (name, vals, miss) => {
      const dd = S.describe(vals), nt = vals.length >= 3 ? normality(vals) : null, se = dd.n > 1 ? dd.sd / Math.sqrt(dd.n) : NaN;
      const h = dd.n > 1 ? jStat.studentt.inv(S.QU(), dd.n - 1) * se : NaN;
      return [name, String(dd.n || 0), String(miss), F(dd.mean), F(dd.sd), F(se), ci(dd.mean - h, dd.mean + h), F(dd.median), dd.n ? `${F(dd.q1)} - ${F(dd.q3)}` : '—', F(dd.min), F(dd.max),
        nt ? `${P(nt.p)}${nt.p > 0.05 ? ' (normal)' : ' (non-normal)'}` : '—'];
    };
    // the between-group tests of one numeric measurement, the one used in the report marked ✓
    const numericTests = (gv, dist) => {
      const ok = gv.filter(x => x.length >= 2).length === k;
      if (k < 2 || !ok) return null;
      const chosen = analyzeNumeric(gv, dist, used, opts).test, out = [];
      out.push(["Levene's test (equal variances)", '', '', P(S.levene(gv)), '', '']);
      if (k === 2) {
        const t = S.tTest(gv[0], gv[1], true), w = S.tTest(gv[0], gv[1], false), m = S.mannWhitney(gv[0], gv[1]), hl = S.hodgesLehmann(gv[0], gv[1]);
        out.push(["Student's t-test", `t = ${F(t.t, 2)}`, F(t.df, 0), P(t.p), `MD = ${F(t.diff)} (${ci(t.lo, t.hi)})`, chosen === 't-test' ? yes : '']);
        out.push(["Welch's t-test", `t = ${F(w.t, 2)}`, F(w.df, 1), P(w.p), `MD = ${F(w.diff)} (${ci(w.lo, w.hi)})`, chosen === 'Welch t-test' ? yes : '']);
        out.push(['Mann-Whitney U test', `U = ${F(m.U, 1)}, z = ${F(m.z, 2)}`, '', P(m.p), `HL median difference = ${F(hl.diff)} (${ci(hl.lo, hl.hi)}), r = ${F(m.r, 2)}`, chosen === 'Mann-Whitney' ? yes : '']);
        // robust and Bayesian views of the same comparison
        if (gv[0].length >= 5 && gv[1].length >= 5) { const yu = S.yuen(gv[0], gv[1]); out.push(["Yuen's trimmed-means t-test (20%)", `t = ${F(yu.t, 2)}`, F(yu.df, 1), P(yu.p), `trimmed-mean difference = ${F(yu.diff)}`, '']); }
        const es = S.effectSizes(gv[0], gv[1]), bf = S.bayesFactorT(t.t, gv[0].length, gv[1].length);
        out.push(['Bayes factor (JZS, r = 0.707)', `BF₁₀ = ${F(bf, 2)}`, '', '', bf >= 3 ? 'evidence for a difference' : bf <= 1 / 3 ? 'evidence for no difference' : 'inconclusive', '']);
        out.push(['Effect sizes', '', '', '', `Hedges g = ${F(es.g, 2)}, Glass Δ = ${F(es.glass, 2)}, Cliff's δ = ${F(es.cliff, 2)}`, '']);
      } else {
        const an = S.anova(gv), wa = S.welchAnova(gv), kw = S.kruskalWallis(gv);
        out.push(['One-way ANOVA', `F = ${F(an.F, 2)}`, `${an.df1}, ${an.df2}`, P(an.p), `η² = ${F(an.etaSq, 3)}`, chosen === 'ANOVA' ? yes : '']);
        out.push(["Welch's ANOVA", `F = ${F(wa.F, 2)}`, `${F(wa.df1, 0)}, ${F(wa.df2, 1)}`, P(wa.p), '', chosen === 'Welch ANOVA' ? yes : '']);
        out.push(['Kruskal-Wallis test', `H = ${F(kw.H, 2)}`, String(kw.df), P(kw.p), `ε² = ${F(kw.etaSq, 3)}`, chosen === 'Kruskal-Wallis' ? yes : '']);
        const bfm = S.brownForsytheMeans(gv); out.push(['Brown-Forsythe test of means', `F* = ${F(bfm.F, 2)}`, `${bfm.df1}, ${F(bfm.df2, 1)}`, P(bfm.p), '', '']);
        const jt = S.jonckheere(gv); out.push(['Jonckheere-Terpstra (trend over the groups in their order)', `z = ${F(jt.z, 2)}`, '', P(jt.p), '', '']);
      }
      return { cat: 'tests', title: 'Comparison between the groups', head: ['Test', 'Statistic', 'df', 'P value', 'Effect size (95% CI)', 'In the report'], rows: out };
    };
    const pairTable = gv => {
      if (k < 3 || gv.some(x => x.length < 2)) return null;
      const tk = S.tukey(gv), gh = S.gamesHowell(gv), dn = S.dunn(gv);
      return { cat: 'pairs', title: 'Pairwise comparisons', head: ['Pair', 'Tukey P', 'Mean difference (95% CI)', 'Games-Howell P', 'Dunn P (Bonferroni)', 'Mann-Whitney P (unadjusted)'],
        rows: pairs(k).map(([i, j], q) => [`${gl[i]} vs ${gl[j]}`, P(tk[q].p), `${F(tk[q].diff)} (${ci(tk[q].lo, tk[q].hi)})`, P(gh[q].p), P(dn[q].p), P(S.mannWhitney(gv[i], gv[j]).p)]) };
    };
    // more statistics: shape, spread and both normality tests; outliers by the chosen rule
    const extraTable = named => ({ cat: 'extra', title: 'More statistics', head: ['', 'Skewness (SE)', 'Kurtosis (SE)', 'CV %', 'Geometric mean', 'Mode', '5th – 95th percentile', 'Shapiro-Wilk W (P)', 'K-S Lilliefors D (P)', `Outliers (${OUT_RULE[xo.out || '1.5'] || 'none'})`],
      rows: named.map(([name, a]) => {
        const sh = shape(a), m = a.length ? S.mean(a) : NaN, sd = a.length > 1 ? S.sd(a) : NaN, sw = a.length >= 3 ? S.shapiroWilk(a) : null, lf = a.length >= 4 ? S.lilliefors(a) : null;
        const cnt = {}; a.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; }); const top = Math.max(0, ...Object.values(cnt)), modes = Object.keys(cnt).filter(k2 => cnt[k2] === top);
        const fence = outFence(a, xo.out || '1.5'), outs = fence ? a.filter(v => v < fence[0] || v > fence[1]).length : null;
        return [name, sh ? `${F(sh.skew, 2)} (${F(sh.ses, 2)})` : '—', sh ? `${F(sh.kurt, 2)} (${F(sh.sek, 2)})` : '—', isFinite(m) && m !== 0 ? F(100 * sd / Math.abs(m), 1) : '—',
          a.length && a.every(v => v > 0) ? F(Math.exp(S.mean(a.map(Math.log)))) : '—', top > 1 && modes.length <= 3 ? modes.map(x => F(+x)).join(', ') : '—',
          a.length >= 2 ? `${F(S.quantile(a, 0.05))} – ${F(S.quantile(a, 0.95))}` : '—', sw ? `${F(sw.W, 3)} (${P(sw.p)})` : '—', lf ? `${F(lf.D, 3)} (${P(lf.p)})` : '—', outs === null ? '—' : String(outs)];
      }) });
    // figures of the stage: box (default), violin, histogram, normal Q-Q plot or means with 95% CI
    const ciH = a => a.length > 1 ? jStat.studentt.inv(S.QU(), a.length - 1) * S.sd(a) / Math.sqrt(a.length) : null;
    const numSpec = (gv, label) => {
      const f = xo.fig || 'auto';
      if (f === 'violin') return { type: 'violin', perGroup: true, points: true, categories: gl, yLabel: label, series: [{ name: label, data: gv }] };
      if (f === 'qq') return { type: 'qq', yLabel: label, series: gl.map((g, i) => ({ name: g, data: gv[i] })), ...(k < 2 ? { legend: false } : {}) };
      if (f === 'meanci') return { type: 'line', noLine: true, perGroup: true, categories: gl, yLabel: label, series: [{ name: label, values: gv.map(a => a.length ? S.mean(a) : NaN), err: gv.map(ciH) }] };
      if (f === 'hist') {
        const all = gv.flat(); if (!all.length) return null;
        const sc = niceScale(Math.min(...all), Math.max(...all), 8), edges = [];
        for (let e = sc.min; e < sc.max - 1e-9; e += sc.step) edges.push(e);
        const bin = v => Math.min(edges.length - 1, Math.floor((v - sc.min) / sc.step + 1e-9));
        return { type: 'bar', integer: true, categories: edges.map(e => `${fmt(e, d)}-${fmt(e + sc.step, d)}`), xLabel: label, yLabel: 'Number of patients', ...(k < 2 ? { legend: false } : {}),
          series: gl.map((g, i) => { const n = new Array(edges.length).fill(0); gv[i].forEach(v => n[bin(v)]++); return { name: g, values: n }; }) };
      }
      return { type: 'box', perGroup: true, points: true, categories: gl, yLabel: label, series: [{ name: label, data: gv }] };
    };
    // effect estimates for every pair of groups: mean difference with its Tukey 95% CI and P, Hodges-Lehmann median difference with its 95% CI,
    // and the non-parametric P (Mann-Whitney for two groups; Dunn (Bonferroni) — or Mann-Whitney with the chosen adjustment — for three or more)
    const npName = k === 2 ? 'Mann-Whitney P' : opts.dunn ? 'Dunn P (Bonferroni)' : `Mann-Whitney P${opts.mwAdjust === 'bonferroni' ? ' (Bonferroni)' : opts.mwAdjust === 'holm' ? ' (Holm)' : ''}`;
    const effRows = gv => {
      if (k < 2 || gv.some(x => x.length < 2)) return null;
      const tk = S.tukey(gv), dn = k > 2 && opts.dunn ? S.dunn(gv) : null;
      let mw = pairs(k).map(([i, j]) => S.mannWhitney(gv[i], gv[j]).p);
      if (k > 2 && !dn && (opts.mwAdjust === 'bonferroni' || opts.mwAdjust === 'holm')) mw = opts.mwAdjust === 'holm' ? S.holm(mw) : mw.map(x => S.bonferroni(x, mw.length));
      return pairs(k).map(([i, j], q) => { const hl = S.hodgesLehmann(gv[i], gv[j]);
        return [`${gl[i]} vs ${gl[j]}`, `${F(tk[q].diff)} (${ci(tk[q].lo, tk[q].hi)})`, P(tk[q].p), `${F(hl.diff)} (${ci(hl.lo, hl.hi)})`, P(dn ? dn[q].p : mw[q])]; });
    };
    const EFF_HEAD = ['Pair', 'Mean difference (95% CI)', 'Tukey P', 'HL median difference (95% CI)', npName];
    const EFF_NOTE = `Differences are the first group minus the second. Mean differences with Tukey-adjusted 95% CI and P values; HL: Hodges-Lehmann median difference with its 95% CI and the ${npName.replace(/ P/, '')} P value.`;
    const items = [];
    for (const v of effectiveVariables(cfg)) {
      const it = { id: v.id, label: v.label, kind: v.kind === 'repeated' ? 'repeated' : v.type, tables: [], spec: null, summary: '',
        cols: v.cols.map(c => ({ col: c.col, label: v.kind === 'repeated' ? (c.label || cfg.tpLabels[c.tp] || c.tp) : v.label })) };
      if (v.kind !== 'repeated' && v.type === 'numeric') {
        const col = v.cols[0].col, gv = byGroup.map(rs => rs.map(r => toNum(r[col])).filter(isFinite)), miss = byGroup.map(rs => rs.filter(r => !isFinite(toNum(r[col]))).length);
        it.tables.push({ cat: 'desc', title: 'Descriptive statistics', head: descHead, rows: [...gv.map((x, g) => descRow(gl[g], x, miss[g])), ...(k > 1 ? [descRow('All patients', gv.flat(), S.sum(miss))] : [])] });
        const t = numericTests(gv, v.dist); if (t) it.tables.push(t);
        const pt = pairTable(gv); if (pt) it.tables.push(pt);
        const er = effRows(gv); if (er) it.effects = { title: 'Pairwise comparisons and effect estimates', head: EFF_HEAD, rows: er, note: EFF_NOTE };
        if (xo.extra) it.tables.push(extraTable([...gl.map((g, i) => [g, gv[i]]), ...(k > 1 ? [['All patients', gv.flat()]] : [])]));
        it.spec = numSpec(gv, v.label);
        const used2 = new Set(), res = k > 1 && gv.every(x => x.length >= 2) ? analyzeNumeric(gv, v.dist, used2, opts) : null;
        it.sig = !!res && res.p <= alpha;
        const nn = gv.map(x => x.length >= 3 ? normality(x) : null).filter(Boolean);
        Object.assign(it, { n: gv.flat().length, test: res ? TEST_NAME[res.test] || res.test : '', p: res ? res.p : NaN,
          normal: nn.length ? (nn.every(r => r.p > 0.05) ? 'normal' : `non-normal (${nn.filter(r => r.p <= 0.05).length} of ${nn.length} groups)`) : '—' });
        // normality P of each group, and whether the parametric and non-parametric tests disagree on significance
        it.normPs = gv.map(x => x.length >= 3 ? normality(x).p : NaN);
        if (k >= 2 && gv.every(x => x.length >= 2)) it.levP = S.levene(gv);
        if (k >= 2 && gv.every(x => x.length >= 2)) { const pp = k === 2 ? S.tTest(gv[0], gv[1]).p : S.anova(gv).p, pn = k === 2 ? S.mannWhitney(gv[0], gv[1]).p : S.kruskalWallis(gv).p;
          it.disagree = isFinite(pp) && isFinite(pn) && (pp <= alpha) !== (pn <= alpha); }
        it.summary = res ? `Report: ${res.param ? 'parametric' : 'non-parametric'} (${v.dist === 'auto' ? 'from the normality test' : 'set by you'}), ${TEST_NAME[res.test] || res.test}, P ${pTxt(res.p)}.` : `Distribution: ${gv.flat().length >= 3 && normality(gv.flat()) && normality(gv.flat()).p <= 0.05 ? 'non-normal' : 'normal'} by ${nName}.`;
      } else if (v.kind !== 'repeated') {
        const col = v.cols[0].col, gv = byGroup.map(rs => rs.map(r => toCat(r[col])).filter(x => x !== null));
        const present = [...new Set(gv.flat())], levels = (v.levels && v.levels.length ? v.levels.filter(l => present.includes(l)) : []);
        present.forEach(l => { if (!levels.includes(l)) levels.push(l); });
        const tab = levels.map(l => gv.map(x => x.filter(y => y === l).length)), ns = gv.map(x => x.length), N = S.sum(ns);
        const cell = (c, n) => npc(c, n ? 100 * c / n : 0, n);
        it.tables.push({ cat: 'desc', title: 'Frequencies', head: ['', ...gl.map((g, i) => `${g} (n=${ns[i]})`), ...(k > 1 ? [`Total (n=${N})`] : [])],
          rows: [...levels.map((l, li) => [l, ...tab[li].map((c, g) => cell(c, ns[g])), ...(k > 1 ? [cell(S.sum(tab[li]), N)] : [])]),
            ['Missing', ...byGroup.map(rs => String(rs.filter(r => toCat(r[col]) === null).length)), ...(k > 1 ? [String(byGroup.flat().filter(r => toCat(r[col]) === null).length)] : [])]] });
        const nonEmpty = tab.filter(r => S.sum(r) > 0);
        if (k > 1 && nonEmpty.length >= 2) {
          const cs = S.chiSquare(nonEmpty), cres = analyzeCategorical(gv, levels, used, opts, v.ordinal ? v.ordTest || 'rank' : null), chosen = cres.test, out = [];
          it.sig = cres.p <= alpha;
          Object.assign(it, { test: TEST_NAME[cres.test] || cres.test, p: cres.p });
          out.push(['Chi-square test', `χ² = ${F(cs.chi, 2)}`, String(cs.df), P(cs.p), `smallest expected count ${F(cs.minE, 1)}; ${F(100 * cs.pctSmall, 0)}% of cells < 5`, chosen === 'Chi-square' ? yes : '']);
          if (nonEmpty.length === 2 && k === 2) out.push(["Fisher's exact test", '', '', P(S.fisher2x2(nonEmpty).p), '', chosen === "Fisher's exact" ? yes : '']);
          it.tables.push({ cat: 'tests', title: 'Comparison between the groups', head: ['Test', 'Statistic', 'df', 'P value', 'Note', 'In the report'], rows: out });
          if (levels.length === 2) {
            const eff = pairs(k).map(([i, j]) => { const rr = S.relativeRisk(tab, 0, i, j), or = S.oddsRatio(tab, 0, i, j);
              return [`${gl[i]} vs ${gl[j]}`, rr ? `${F(rr.rr, 2)} (${ci(rr.lo, rr.hi, 2)})` : '—', or ? `${F(or.or, 2)} (${ci(or.lo, or.hi, 2)})` : '—']; });
            it.tables.push({ cat: 'tests', title: `Effect of “${levels[0]}”`, head: ['Pair', 'Relative risk (95% CI)', 'Odds ratio (95% CI)'], rows: eff });
          }
          const pw = k > 2 ? S.chiSquarePairwise(tab, opts.fisher, opts.chiAdjust || 'bonferroni') : null, adjName = { holm: 'Holm', none: 'no correction' }[opts.chiAdjust] || 'Bonferroni';
          if (pw) it.tables.push({ cat: 'pairs', title: `Pairwise comparisons (${adjName})`, head: ['Pair', 'P value'], rows: pw.map(q => [`${gl[q.i]} vs ${gl[q.j]}`, P(q.p)]) });
          // relative risk of the first category for each pair, with the pairwise P (the overall test for two groups)
          const two = levels.length === 2;
          it.effects = { title: 'Pairwise comparisons and effect estimates', head: ['Pair', ...(two ? [`Relative risk of “${levels[0]}” (95% CI)`, 'Odds ratio (95% CI)'] : []), k > 2 ? `P value (${adjName})` : 'P value'],
            rows: pairs(k).map(([i, j], q) => { const rr = two ? S.relativeRisk(tab, 0, i, j) : null, or = two ? S.oddsRatio(tab, 0, i, j) : null;
              return [`${gl[i]} vs ${gl[j]}`, ...(two ? [rr ? `${F(rr.rr, 2)} (${ci(rr.lo, rr.hi, 2)})` : '—', or ? `${F(or.or, 2)} (${ci(or.lo, or.hi, 2)})` : '—'] : []), P(pw ? pw[q].p : cres.p)]; }),
            note: `${two ? `Relative risk and odds ratio of “${levels[0]}” in the first group of each pair compared with the second. ` : ''}${k > 2 ? `P values: ${opts.fisher ? 'Chi-square or Fisher' : 'Chi-square'} test between each two groups, ${opts.chiAdjust === 'none' ? 'without correction' : `${adjName}-adjusted`}.` : `P value: ${TEST_NAME[cres.test] || cres.test}.`}` };
        }
        Object.assign(it, { n: N, normal: '—' }); if (it.test === undefined) Object.assign(it, { test: '', p: NaN });
        it.spec = { type: 'bar', percent: true, labels: true, categories: gl, yLabel: '% of the patients', series: levels.map((l, li) => ({ name: l, values: tab[li].map((c, g) => ns[g] ? 100 * c / ns[g] : 0) })) };
      } else {
        const tps = v.cols.map(c => c.label || cfg.tpLabels[c.tp] || c.tp), T = tps.length;
        const per = v.cols.map(c => byGroup.map(rs => rs.map(r => toNum(r[c.col])).filter(isFinite)));
        const missAt = (c, g) => byGroup[g].filter(r => !isFinite(toNum(r[c.col]))).length;
        it.tables.push({ cat: 'desc', title: 'Descriptive statistics', head: ['Timepoint', ...descHead.slice(0)], rows: v.cols.flatMap((c, t) => gl.map((g, gi) => [tps[t], ...descRow(g, per[t][gi], missAt(c, gi))])) });
        if (xo.extra) it.tables.push(extraTable(v.cols.flatMap((c, t) => gl.map((g, gi) => [k > 1 ? `${tps[t]} · ${g}` : tps[t], per[t][gi]]))));
        if (k > 1) {
          const out = per.map((gv, t) => {
            if (gv.some(x => x.length < 2)) return [tps[t], '—', '—', '—'];
            const par = k === 2 ? S.tTest(gv[0], gv[1], true) : S.anova(gv), non = k === 2 ? S.mannWhitney(gv[0], gv[1]) : S.kruskalWallis(gv);
            if (Math.min(par.p, non.p) <= alpha) it.sig = true;
            return [tps[t], P(par.p), P(non.p), k === 2 ? `${F(par.diff)} (${ci(par.lo, par.hi)})` : `η² = ${F(par.etaSq, 3)}`];
          });
          const er = per.map((gv, t) => (effRows(gv) || []).map(r => [tps[t], ...r])).flat();
          if (er.length) it.effects = { title: 'Pairwise comparisons and effect estimates at each timepoint', head: ['Timepoint', ...EFF_HEAD], rows: er, note: EFF_NOTE };
          it.tables.push({ cat: 'tests', title: 'Between the groups at each timepoint', head: ['Timepoint', k === 2 ? "Student's t-test P" : 'ANOVA P', k === 2 ? 'Mann-Whitney P' : 'Kruskal-Wallis P', k === 2 ? 'Mean difference (95% CI)' : 'Effect size'], rows: out });
        }
        const mats = byGroup.map(rs => rs.map(r => v.cols.map(c => toNum(r[c.col]))).filter(a => a.every(isFinite)));
        let wSig = false;
        if (T >= 3) { const mc = S.mauchly(mats.filter(m => m.length)); if (mc) it.sph = mc; }
        const within = mats.map((Y, g) => {
          if (Y.length < 3) return [gl[g], String(Y.length), '—', '—', '—'];
          const col = j => Y.map(r => r[j]);
          if (T === 2) { const pt = S.pairedT(col(1), col(0)), w = S.wilcoxonSigned(col(1), col(0)); if (Math.min(pt.p, w.p) <= alpha) wSig = true;
            return [gl[g], String(Y.length), `t = ${F(pt.t, 2)}, P ${pTxt(pt.p)}`, `z = ${F(w.z, 2)}, P ${pTxt(w.p)}`, `${F(pt.diff)} (${ci(pt.lo, pt.hi)})`]; }
          const ra = S.rmAnova(Y), fr = S.friedman(Y); if (Math.min(ra.p, fr.p) <= alpha) wSig = true;
          return [gl[g], String(Y.length), `F = ${F(ra.F, 2)}; GG ε = ${F(ra.eps, 3)}, P ${pTxt(ra.p)}; HF ε = ${F(ra.epsHF, 3)}, P ${pTxt(ra.pHF)}; uncorrected P ${pTxt(ra.pUnc)}`, `χ² = ${F(fr.chi, 2)}, P ${pTxt(fr.p)}`, ''];
        });
        it.tables.push({ cat: 'time', title: 'Change over time within each group (patients with every measurement)', head: ['Group', 'n', T === 2 ? 'Paired t-test' : 'Repeated-measures ANOVA', T === 2 ? 'Wilcoxon signed-rank' : 'Friedman test', T === 2 ? `Change ${tps[1]} − ${tps[0]} (95% CI)` : ''], rows: within });
        if (T > 2) {
          const post = [];
          mats.forEach((Y, g) => { if (Y.length < 3) return; const col = j => Y.map(r => r[j]);
            const pr = rmPairs(T), pt = adjust(pr.map(([a, b]) => S.pairedT(col(b), col(a)).p)), wx = adjust(pr.map(([a, b]) => S.wilcoxonSigned(col(b), col(a)).p));
            pr.forEach(([a, b], q) => post.push([gl[g], `${tps[b]} vs ${tps[a]}`, P(pt[q]), P(wx[q])])); });
          it.tables.push({ cat: 'time', title: `Comparisons ${POST_WHAT(tps)} (${ADJ_NAME[RO.adjust]})`, head: ['Group', 'Comparison', 'Paired t-test P', 'Wilcoxon P'], rows: post });
        }
        if (k > 1 && mats.every(Y => Y.length >= 2)) {
          const mx = S.mixedAnova(mats);
          it.tables.push({ cat: 'time', title: 'Mixed (split-plot) ANOVA', head: ['Effect', 'F', 'df', 'P value'], rows: [['Group', F(mx.group.F, 2), `${mx.group.df1}, ${mx.group.df2}`, P(mx.group.p)],
            ['Time (Greenhouse-Geisser)', F(mx.time.F, 2), `${mx.time.df1}, ${mx.time.df2}`, P(mx.time.p)], ['Group × time', F(mx.interaction.F, 2), `${mx.interaction.df1}, ${mx.interaction.df2}`, P(mx.interaction.p)]] });
        }
        if (wSig) it.sig = true;
        Object.assign(it, { n: mats.reduce((a2, Y) => a2 + Y.length, 0), normal: '—', p: NaN,
          test: `${tps.length} timepoints${k > 1 ? '; between groups and over time' : '; change over time'}` });
        const fT = xo.fig || 'auto';
        if (fT === 'box' || fT === 'violin') it.spec = { type: fT, categories: tps, yLabel: v.label, points: fT === 'box', ...(k < 2 ? { legend: false } : {}), series: gl.map((g, gi) => ({ name: g, data: per.map(gv => gv[gi]) })) };
        else it.spec = { type: 'line', categories: tps, yLabel: v.label, xLabel: 'Time', ...(k < 2 ? { legend: false } : {}), ...(fT === 'meanci' ? { errKind: 'ci' } : {}),
          series: gl.map((g, gi) => ({ name: g, values: per.map(gv => S.mean(gv[gi])), err: per.map(gv => fT === 'meanci' ? ciH(gv[gi]) : gv[gi].length > 1 ? S.sd(gv[gi]) : null) })),
          ...(fT === 'spaghetti' ? { individual: mats } : {}) };
      }
      items.push(it);
    }
    return { groups: gl, k, items };
  }

  /* ---------- value labels (1 = Male, 2 = Female) ---------- */
  // "1=Male, 2=Female" or "1: Male; 2: Female" → { 1: 'Male', 2: 'Female' }
  function parseValueLabels(t) {
    const m = {};
    String(t || '').split(/[,;\n]+/).forEach(p => { const x = p.match(/^\s*([^=:]+?)\s*[=:]\s*(.*?)\s*$/); if (x && x[2] !== '') m[x[1]] = x[2]; });
    return m;
  }
  // the analysis sees the labels in place of the codes; the sheet keeps its codes
  /* ---------- row filter: analyse only the rows that meet every condition (e.g. Age ≥ 18, Centre = A) ---------- */
  const FILTER_OPS = { eq: '=', ne: '≠', gt: '>', ge: '≥', lt: '<', le: '≤', blank: 'is blank', notblank: 'is not blank', has: 'contains' };
  function rowPasses(r, f) {
    const v = r[f.col], c = toCat(v), want = String(f.val ?? '').trim();
    if (f.op === 'blank') return c === null;
    if (f.op === 'notblank') return c !== null;
    if (c === null) return false;
    if (f.op === 'has') return c.toLowerCase().includes(want.toLowerCase());
    const a = toNum(v), b = toNum(want), num = isFinite(a) && isFinite(b);
    if (f.op === 'eq') return num ? a === b : c.toLowerCase() === want.toLowerCase();
    if (f.op === 'ne') return num ? a !== b : c.toLowerCase() !== want.toLowerCase();
    if (!num) return false;
    return f.op === 'gt' ? a > b : f.op === 'ge' ? a >= b : f.op === 'lt' ? a < b : a <= b;
  }
  const activeFilters = cfg => (cfg.rowFilter || []).filter(f => f && f.on !== false && f.col && f.op && (['blank', 'notblank'].includes(f.op) || String(f.val ?? '').trim() !== ''));
  // an optional random sample (seeded, so the same seed gives the same patients), taken after the conditions; the sheet order is kept
  const sampleOn = cfg => !!(cfg.sample && cfg.sample.on && +cfg.sample.n >= 2);
  function filterRows(cfg, rows) {
    const fs = activeFilters(cfg); let out = fs.length ? rows.filter(r => fs.every(f => rowPasses(r, f))) : rows;
    if (sampleOn(cfg) && out.length > +cfg.sample.n) {
      let s = (+cfg.sample.seed || 1) >>> 0; const rnd = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
      const ix = out.map((_, i) => i); for (let i = ix.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [ix[i], ix[j]] = [ix[j], ix[i]]; }
      const keep = new Set(ix.slice(0, +cfg.sample.n)); out = out.filter((_, i) => keep.has(i));
    }
    return out;
  }
  const filterText = cfg => [activeFilters(cfg).map(f => `${columnLabel(cfg, f.col)} ${FILTER_OPS[f.op]}${['blank', 'notblank'].includes(f.op) ? '' : ' ' + f.val}`).join(' and '),
    sampleOn(cfg) ? `${activeFilters(cfg).length ? 'from whom ' : ''}a random sample of ${+cfg.sample.n} patients was drawn (seed ${+cfg.sample.seed || 1})` : ''].filter(Boolean).join(', ');

  // abbreviations that explain themselves in a footnote when the option is on
  const ABBR = { BMI: 'Body mass index', VAS: 'Visual analogue scale', NRS: 'Numeric rating scale', SBP: 'Systolic blood pressure', DBP: 'Diastolic blood pressure', MAP: 'Mean arterial pressure',
    HR: 'Heart rate', RR: 'Respiratory rate', SpO2: 'Peripheral oxygen saturation', CRP: 'C-reactive protein', ESR: 'Erythrocyte sedimentation rate', WBC: 'White blood cells', TLC: 'Total leucocytic count',
    Hb: 'Haemoglobin', HbA1c: 'Glycated haemoglobin', FBG: 'Fasting blood glucose', RBS: 'Random blood sugar', ALT: 'Alanine aminotransferase', AST: 'Aspartate aminotransferase', eGFR: 'Estimated glomerular filtration rate',
    LDL: 'Low-density lipoprotein', HDL: 'High-density lipoprotein', TG: 'Triglycerides', TSH: 'Thyroid-stimulating hormone', INR: 'International normalised ratio', PT: 'Prothrombin time', ASA: 'American Society of Anesthesiologists',
    ICU: 'Intensive care unit', LOS: 'Length of stay', PONV: 'Postoperative nausea and vomiting', GCS: 'Glasgow coma scale', APACHE: 'Acute Physiology and Chronic Health Evaluation', SOFA: 'Sequential Organ Failure Assessment',
    WOMAC: 'Western Ontario and McMaster Universities Osteoarthritis Index', KL: 'Kellgren-Lawrence', FEV1: 'Forced expiratory volume in 1 second', FVC: 'Forced vital capacity', EF: 'Ejection fraction', LVEF: 'Left ventricular ejection fraction',
    PRP: 'Platelet-rich plasma', HA: 'Hyaluronic acid', DM: 'Diabetes mellitus', HTN: 'Hypertension', IHD: 'Ischaemic heart disease', CKD: 'Chronic kidney disease', COPD: 'Chronic obstructive pulmonary disease' };
  // what the analysis sees of a variable: unit after the label, Arabic or both labels, a transformation of its values, explained abbreviations
  function prepareVariables(data, cfg) {
    const o = cfg.options || {}, lang = o.labelLang || 'en';
    const tf = { log: v => v > 0 ? Math.log(v) : NaN, log10: v => v > 0 ? Math.log10(v) : NaN, sqrt: v => v >= 0 ? Math.sqrt(v) : NaN };
    let rows = null;
    const variables = cfg.variables.map(v => {
      let w = v;
      if (v.unit && !/\([^)]*\)\s*$/.test(v.label)) w = { ...w, label: `${v.label} (${v.unit})` };
      if (v.labelAr && lang !== 'en') w = { ...w, label: lang === 'ar' ? v.labelAr : `${w.label} / ${v.labelAr}` };
      if (o.autoAbbr && !v.note) { const found = Object.keys(ABBR).filter(a => new RegExp(`(^|[^A-Za-z])${a}([^A-Za-z]|$)`).test(w.label)); if (found.length) w = { ...w, note: found.map(a => `${a}: ${ABBR[a]}`).join(', ') }; }
      if (v.transform && tf[v.transform] && w.type === 'numeric') {
        rows = rows || data.rows.map(r => ({ ...r }));
        v.cols.forEach(c => rows.forEach(r => { const n = toNum(r[c.col]); r[c.col] = isFinite(n) ? tf[v.transform](n) : null; if (!isFinite(r[c.col])) r[c.col] = null; }));
        w = { ...w, label: `${w.label}, ${v.transform === 'log' ? 'log' : v.transform === 'log10' ? 'log₁₀' : '√'}-transformed`, note: [w.note, `Values were ${v.transform === 'sqrt' ? 'square-root' : v.transform === 'log10' ? 'log₁₀' : 'natural-log'} transformed before analysis`].filter(Boolean).join('; ') };
      }
      return w;
    });
    // last observation carried forward over each outcome's timepoints
    if (o.rmImpute === 'locf') { rows = rows || data.rows.map(r => ({ ...r }));
      variables.filter(v => v.kind === 'repeated').forEach(v => rows.forEach(r => { let last = null; v.cols.forEach(c => { const n = toNum(r[c.col]); if (isFinite(n)) last = r[c.col]; else if (last !== null) r[c.col] = last; }); })); }
    // timepoint phases: "Intra-operative: 30 min"
    const ph = cfg.tpPhase || {}, tpLabels = Object.keys(ph).some(t => ph[t]) ? Object.fromEntries(Object.entries(cfg.tpLabels || {}).map(([t, l]) => [t, ph[t] ? `${ph[t]}: ${l}` : l])) : cfg.tpLabels;
    // complete-case analysis: only patients with a value in every analysed column
    if (o.completeCase) { rows = rows || data.rows.map(r => ({ ...r })); const cols = variables.filter(v => v.include).flatMap(v => v.cols.filter(c => c.include !== false).map(c => c.col));
      rows = rows.filter(r => cols.every(c => r[c] !== null && r[c] !== undefined && String(r[c]).trim() !== '')); }
    // groups merged into another (e.g. two doses into one arm)
    const mg = cfg.groupMerge || {}, srcs = Object.keys(mg).filter(g => mg[g] && mg[g] !== g && !cfg.noGroups);
    if (srcs.length) { rows = rows || data.rows.map(r => ({ ...r })); rows.forEach(r => { const g = toCat(r[cfg.groupCol]); if (g !== null && srcs.includes(g)) r[cfg.groupCol] = mg[g]; }); }
    return [rows ? { ...data, rows } : data, { ...cfg, variables, tpLabels, ...(srcs.length ? { groupOrder: cfg.groupOrder.filter(g => !srcs.includes(g)) } : {}) }];
  }
  function withValueLabels(data, cfg) {
    [data, cfg] = prepareVariables(data, cfg);
    if (activeFilters(cfg).length || sampleOn(cfg)) data = { ...data, rows: filterRows(cfg, data.rows) };
    const maps = {};
    (cfg.variables || []).forEach(v => {
      if (v.type !== 'categorical' || !v.valueLabels) return;
      const m = parseValueLabels(v.valueLabels);
      if (Object.keys(m).length) v.cols.forEach(c => { if (!isGroupCol(cfg, c.col)) maps[c.col] = m; });
    });
    const cols = Object.keys(maps);
    if (!cols.length) return [data, cfg];
    const lab = (col, x) => { const c = toCat(x); return c !== null && maps[col] && Object.prototype.hasOwnProperty.call(maps[col], c) ? maps[col][c] : x; };
    const rows = data.rows.map(r => { const o = { ...r }; cols.forEach(c => { if (c in o) o[c] = lab(c, o[c]); }); return o; });
    const variables = cfg.variables.map(v => {
      const m = v.cols.length && maps[v.cols[0].col];
      return m && v.levels ? { ...v, levels: [...new Set(v.levels.map(l => lab(v.cols[0].col, l)))] } : v;
    });
    const advanced = (cfg.advanced || []).map(a => {
      const b = { ...a };
      if (a.positive) b.positive = lab(['survival', 'cox'].includes(a.type) ? a.event : a.outcome, a.positive);
      if (a.eventPositive) b.eventPositive = lab(a.event, a.eventPositive);
      return b;
    });
    return [{ ...data, rows }, { ...cfg, variables, advanced }];
  }

  /* ---------- main ---------- */
  function run(data, cfg) {
    // false discovery rate: run once to collect the P values, then again with the adjusted ones
    if (cfg.options.fdr && !cfg.__fdr) {
      P_HOOK = { mode: 'record', list: [] }; let first;
      try { first = run(data, { ...cfg, __fdr: 1 }); } finally { const ps = P_HOOK.list; P_HOOK = { mode: 'apply', q: benjaminiHochberg(ps), i: 0 }; }
      try { return run(data, { ...cfg, __fdr: 2 }); } finally { P_HOOK = null; }
    }
    S.setConf((+cfg.options.confLevel || 95) / 100);
    [data, cfg] = withValueLabels(data, cfg);
    TP_TIME = cfg.tpTime || {};
    const opts = cfg.options, alpha = opts.alpha, d = opts.decimals;
    setRO(opts);
    // descriptive: the detailed comment plus the test used, effect sizes, values of every group and an overview of each table
    const descriptive = opts.commentStyle === 'descriptive', detailed = opts.commentStyle === 'detailed' || descriptive;
    const wantEff = opts.commentEffect || descriptive;
    normality = normalityTest(opts.normality);
    const wording = s => {
      if (opts.notSig) s = s.replace(/insignificant(ly)?/g, 'not significant$1');
      if (opts.pWord && opts.pWord !== 'P value') s = s.replace(/\bP value\b/g, opts.pWord);
      return s;
    };
    FMT = { pDig: +opts.pDigits || 3, sig: opts.sigSym ?? '*', mean: opts.meanStyle || 'pm', iqr: opts.iqrStyle || 'dash', pct: opts.pctDecimals ?? 1, pLead: opts.pLead !== false && +opts.pLead !== 0, cat: opts.catFormat || 'npct' };
    const used = new Set();
    // error bars of mean charts: SD (default), SEM or 95% CI of the mean
    const errOf = dd => opts.errorBar === 'sem' ? dd.sd / Math.sqrt(dd.n)
      : opts.errorBar === 'ci' ? jStat.studentt.inv(S.QU(), dd.n - 1) * dd.sd / Math.sqrt(dd.n) : dd.sd;
    const errNote = { sem: ' (mean ± SEM)', ci: ' (mean ± 95% CI)' }[opts.errorBar] || '';
    const valueLabels = opts.valueLabels ? { labels: true, labelDec: d } : {};
    // nice equal-width bins for histograms (same rule as chart axes)
  function niceScale(min, max, ticks) {
    if (min === max) max = min + 1;
    const raw = (max - min) / ticks, mag = 10 ** Math.floor(Math.log10(raw));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(x => x >= raw);
    return { min: Math.floor(min / step) * step, max: Math.max(Math.ceil(max / step) * step, Math.floor(min / step) * step + step), step };
  }
  // optional group sizes on chart axes / legends: "A group (n=30)"
    const withN = (names, ns) => opts.nLabels ? names.map((g, i) => `${g} (n=${ns[i]})`) : names;
    const groups = cfg.groupOrder.filter(g => cfg.groupInclude[g] !== false);
    const gl = groups.map(g => cfg.groupLabels[g] || g);
    const k = groups.length;
    const rows = data.rows.filter(r => groups.includes(groupOf(cfg, r)));
    const byGroup = groups.map(g => rows.filter(r => groupOf(cfg, r) === g));
    const gN = byGroup.map(b => b.length);
    const pr = pairs(k);
    const pairNames = pr.map(([i, j]) => `${gl[i]} and ${gl[j]}`);
    const numbered = k > 2;
    const sections = [];
    const vars = effectiveVariables(cfg);

    // Group single variables into their named tables, in column order
    const blocks = [];
    for (const v of vars) {
      if (v.kind === 'repeated') blocks.push({ kind: 'repeated', vars: [v], pos: v.pos });
      else {
        let b = blocks.find(x => x.kind === 'single' && x.table === v.table);
        if (!b) { b = { kind: 'single', table: v.table, vars: [], pos: v.pos }; blocks.push(b); }
        b.vars.push(v);
      }
    }
    blocks.sort((a, b) => a.pos - b.pos);

    const effectLines = res => res.pairs.map((q, idx) =>
      `${numbered ? 'M' + (idx + 1) + '=' : ''}${fmt(q.diff, d)} (${fmt(q.lo, d)}:${fmt(q.hi, d)})`);
    const EF = opts.catEffect === 'or' ? 'OR' : 'RR', efName = EF === 'OR' ? 'Odds ratio' : 'Relative risk';
    const rrLines = c => c.rr.map((q, idx) => q.rr === null ? `${numbered ? EF + (idx + 1) + ': ' : ''}—` :
      `${numbered ? EF + (idx + 1) + ': ' : ''}${fmt(q.rr, 2)} (${fmt(q.lo, 2)}-${fmt(q.hi, 2)})`);
    const postHocLines = res => res.pairs.map((q, idx) => `P${idx + 1}=${fmtP(q.p, alpha)}`);

    // the tests behind a table's P values: listed in its footnote, or as letters after each P value (testNote = 'list' / 'marks')
    const SUP = 'ᵃᵇᶜᵈᵉᶠᵍʰ';
    function testMarker(names) {
      const order = opts.testNote === 'list' || opts.testNote === 'marks' ? [...new Set(names.filter(n => TEST_NAME[n]))] : [];
      return {
        mark: n => opts.testNote === 'marks' && order.includes(n) ? SUP[order.indexOf(n)] : '',
        note: !order.length ? '' : opts.testNote === 'marks' ? order.map((n, i) => `${SUP[i]}: ${TEST_NAME[n]}`).join(', ')
          : `Test${order.length > 1 ? 's' : ''} used: ${listJoin(order.map(n => TEST_NAME[n]))}`
      };
    }
    function footnote(flags, note) {
      const f = [];
      if (flags.sig) f.push(`*: Significant as P value ≤ ${alpha}`);
      const dp = [];
      if (flags.param || flags.both) dp.push(meanSdName(true));
      if (flags.nonparam || flags.both) dp.push(FMT.iqr === 'bracket' ? 'median [IQR]' : 'median (IQR)');
      if (flags.cat) dp.push('frequency (%)');
      if (dp.length) f.push(`Data are presented as ${listJoin(dp)}`);
      if (flags.effect) {
        if (flags.param && flags.nonparam) f.push('MD: Mean or median difference');
        else if (flags.param) f.push('MD: Mean difference');
        else if (flags.nonparam) f.push('MD: Median difference');
        if (flags.rr) f.push(`${EF}: ${efName}`);
        f.push('CI: Confidence interval');
        if (numbered) {
          if (flags.param || flags.nonparam) f.push(pr.map((_, i) => `M${i + 1}: between ${pairNames[i]}`).join(', '));
          if (flags.rr) f.push(pr.map((_, i) => `${EF}${i + 1}: ${efName} between ${pairNames[i]}`).join(', '));
        }
      }
      if (flags.posthoc && numbered) f.push(pr.map((_, i) => `P${i + 1}: P value between ${pairNames[i]}`).join(', '));
      if (opts.showStat && flags.stats) {
        const ab = { 't =': "t: Student's / Welch's t-test", 'F =': 'F: ANOVA', 'U =': 'U: Mann-Whitney test', 'H =': 'H: Kruskal-Wallis test', 'χ²': 'χ²: Chi-square test', 'FE': "FE: Fisher's exact test" };
        const seen = Object.keys(ab).filter(k => flags.stats.some(x => String(x).startsWith(k)));
        if (seen.length) f.push(seen.map(k => ab[k]).join(', '));
      }
      if (flags.ci) f.push('95% CI: 95% confidence interval of the mean');
      if (opts.groupTrend && k > 2) f.push('P for trend: Jonckheere-Terpstra test (numeric) or Cochran-Armitage / linear-by-linear test (categorical) across the groups in their order');
      if (opts.missingNote && flags.missing) f.push(flags.missing.length ? `Missing data: ${flags.missing.join(', ')}` : 'No missing data');
      if (note) f.push(note);
      return f.join(', ') + '.';
    }
    // missing values of one column among the analysed patients
    const missingIn = (col, numeric) => byGroup.flat().filter(r => numeric ? !isFinite(toNum(r[col])) : toCat(r[col]) === null).length;

    // table headings: a group can be given its own heading for the tables (e.g. "Group A (PRP)")
    const TH = cfg.tableHeads || {}, headName = (g, i) => (TH[groups[i]] || '').trim() || g;
    const groupHeads = gl.map((g, i) => opts.nHead === false ? headName(g, i) : `${headName(g, i)} (n=${gN[i]})`);

    /* ---------- one group (no group column): description of the patients and change over time ---------- */
    const WITHIN_NAME = { 'Paired t-test': 'paired t-test', Wilcoxon: 'Wilcoxon signed-rank test', 'RM ANOVA': 'repeated-measures ANOVA', Friedman: 'Friedman test' };
    const isNormal = vals => { const t = normality(vals); return !t || t.p > 0.05; };
    const ciHalf = dd => dd.n > 1 ? jStat.studentt.inv(S.QU(), dd.n - 1) * dd.sd / Math.sqrt(dd.n) : null;
    const ciOfMean = dd => { const h = jStat.studentt.inv(S.QU(), dd.n - 1) * dd.sd / Math.sqrt(dd.n); return `${fmt(dd.mean - h, d)} to ${fmt(dd.mean + h, d)}`; };
    function oneGroupSingle(b) {
      const all = byGroup[0], G = gl[0], head = [{ t: '', span: 2 }, groupHeads[0]];
      const trows = [], sent = [], figures = [], flags = { param: false, nonparam: false, cat: false, missing: [] };
      for (const v of b.vars) {
        const col = v.cols[0].col, lab = plain(v.label), chart = v.chart || 'auto';
        if (opts.missingNote) { const m = missingIn(col, v.type === 'numeric'); if (m) flags.missing.push(`${lab} (n=${m})`); }
        if (v.type === 'numeric') {
          const vals = all.map(r => toNum(r[col])).filter(isFinite), dd = S.describe(vals);
          if (!dd.n) { trows.push([{ t: [v.label], b: true }, { t: ['—'] }, { t: ['—'] }]); continue; }
          const P = v.dist === 'param' ? true : v.dist === 'nonparam' ? false : isNormal(vals);
          used.add(P ? 'desc1Param' : 'desc1Nonparam'); flags[P ? 'param' : 'nonparam'] = true;
          const main = P ? msd(dd.mean, dd.sd, d) : medIqr(dd, d);
          if (opts.secondRow === 'none') trows.push([{ t: [v.label], b: true }, { t: [P ? meanSdName() : (FMT.iqr === 'bracket' ? 'Median [IQR]' : 'Median (IQR)')] }, { t: [main] }]);
          else trows.push([{ t: [v.label], b: true, rs: 2 }, { t: [P ? meanSdName() : 'Median'] }, { t: [P ? main : fmt(dd.median, d)] }],
            [{ t: [P ? (opts.secondRow === 'ci' ? '95% CI' : 'Range') : 'IQR'] }, { t: [P ? (opts.secondRow === 'ci' ? ciOfMean(dd) : `${fmt(dd.min, d)} - ${fmt(dd.max, d)}`) : iqrTxt(dd.q1, dd.q3, d)] }]);
          sent.push(P ? `The ${meanSdName(true)} ${lowerFirst(lab)} of the studied patients was ${main} (range ${fmt(dd.min, d)} to ${fmt(dd.max, d)}).`
            : `The median ${lowerFirst(lab)} of the studied patients was ${fmt(dd.median, d)} (IQR ${fmt(dd.q1, d)} to ${fmt(dd.q3, d)}; range ${fmt(dd.min, d)} to ${fmt(dd.max, d)}).`);
          if (chart === 'none') continue;
          const ct = chart === 'auto' ? (opts.chartStyle === 'box' ? 'box' : opts.chartStyle === 'bar' ? 'bar' : 'hist') : chart;
          let f;
          if (ct === 'violin') f = { caption: `${v.label} of the studied patients`,
            spec: { type: 'violin', perGroup: true, categories: [G], yLabel: v.ylabel || v.label, points: opts.points, series: [{ name: v.label, data: [vals] }] } };
          else if (ct === 'meanci') f = { caption: `${v.label} of the studied patients (mean with 95% CI)`,
            spec: { type: 'line', noLine: true, perGroup: true, errKind: 'ci', categories: [G], yLabel: v.ylabel || v.label, series: [{ name: v.label, values: [dd.mean], err: [ciHalf(dd)] }] } };
          else if (ct === 'box' || ct === 'dot') f = { caption: `${v.label} of the studied patients${ct === 'dot' ? ` (${P ? 'mean ± SD' : 'median and IQR'})` : ''}`,
            spec: { type: ct, perGroup: true, categories: [G], yLabel: v.ylabel || v.label, points: opts.points, median: !P, series: [{ name: v.label, data: [vals] }] } };
          else if (ct === 'bar' || ct === 'line') f = { caption: `${v.label} of the studied patients (${P ? 'mean' : 'median'}${P ? ({ sem: ' ± SEM', ci: ' ± 95% CI' }[opts.errorBar] || ' ± SD') : ' and IQR'})`,
            spec: { type: 'bar', perGroup: true, categories: [G], yLabel: v.ylabel || v.label, ...valueLabels,
              series: [P ? { name: v.label, values: [dd.mean], err: [errOf(dd)] } : { name: v.label, values: [dd.median], lo: [dd.q1], hi: [dd.q3] }] } };
          else {
            // histogram of every patient's value, equal-width bins
            const sc = niceScale(dd.min, dd.max, 8), edges = [];
            for (let e = sc.min; e < sc.max - 1e-9; e += sc.step) edges.push(e);
            const cnt = new Array(edges.length).fill(0); vals.forEach(x => cnt[Math.min(edges.length - 1, Math.floor((x - sc.min) / sc.step + 1e-9))]++);
            f = { caption: `Distribution of ${lowerFirst(lab)} in the studied patients`,
              spec: { type: 'bar', integer: true, categories: edges.map(e => `${fmt(e, d)}-${fmt(e + sc.step, d)}`), xLabel: v.label, yLabel: 'Number of patients', legend: false, series: [{ name: G, values: cnt }] } };
          }
          figures.push({ sig: true, vid: v.id, ...f, ...(v.caption ? { caption: v.caption } : {}) });
        } else {
          const vals = all.map(r => toCat(r[col])).filter(x => x !== null), present = [...new Set(vals)];
          const levels = (v.levels && v.levels.length ? v.levels.filter(l => present.includes(l)) : []);
          present.forEach(l => { if (!levels.includes(l)) levels.push(l); });
          used.add('desc1Cat'); flags.cat = true;
          const n = vals.length, cnt = levels.map(l => vals.filter(x => x === l).length), pc = cnt.map(c => n ? 100 * c / n : 0);
          const compact = isCompact({ cat: true, levels });
          if (compact) {
            trows.push([{ t: [v.label], b: true, span: 2 }, { t: [npc(cnt[0], pc[0], n)] }]);
            sent.push(`${cap(lab)} was found in ${cnt[0]} (${pctTxt(pc[0])}%) of the studied patients.`);
          } else {
            levels.forEach((lv, li) => trows.push([...(li === 0 ? [{ t: [v.label], b: true, rs: levels.length }] : []), { t: [lv] }, { t: [npc(cnt[li], pc[li], n)] }]));
            if (levels.length) sent.push(`Regarding ${lowerFirst(lab)}, ${listJoin(levels.map((lv, li) => `${cnt[li]} patients (${pctTxt(pc[li])}%) were ${/^[A-Z][a-z]/.test(lv) ? lv.toLowerCase() : lv}`))}.`);
          }
          if (chart === 'none' || !levels.length) continue;
          const ct = chart === 'pie' || chart === 'piefull' ? 'pie' : chart === 'hbar' ? 'hbar' : 'bar';
          figures.push({ sig: true, vid: v.id, caption: v.caption || `${v.label} of the studied patients`,
            spec: ct === 'pie' ? { type: 'pie', ...(chart === 'piefull' ? { full: true } : {}), categories: [G], yLabel: '% of the studied patients', series: levels.map((lv, li) => ({ name: lv, values: [pc[li]] })) }
              : ct === 'hbar' ? { type: 'hbar', perGroup: true, categories: levels, yLabel: v.ylabel || '% of the studied patients', series: [{ name: v.label, values: pc }] }
              : { type: 'bar', perGroup: true, percent: true, labels: true, categories: levels, yLabel: v.ylabel || '% of the studied patients', series: [{ name: v.label, values: pc }] } });
        }
      }
      const f = [];
      const dp = [flags.param ? meanSdName(true) : '', flags.nonparam ? (FMT.iqr === 'bracket' ? 'median [IQR]' : 'median (IQR)') : '', flags.cat ? 'frequency (%)' : ''].filter(Boolean);
      if (dp.length) f.push(`Data are presented as ${listJoin(dp)}`);
      if (opts.secondRow === 'ci' && flags.param) f.push('95% CI: 95% confidence interval of the mean');
      if (opts.missingNote) f.push(flags.missing.length ? `Missing data: ${flags.missing.join(', ')}` : 'No missing data');
      const notes = b.vars.map(v => v.note).filter(Boolean); if (notes.length) f.push(notes.join(', '));
      return { kind: 'single', title: `${b.table} of the studied patients`, head, rows: trows, footnote: f.join(', ') + '.', comment: wording(sent.join(' ')), figures, twoCol: true,
        meta: { res: [] }, brief: opts.paperStyle ? wording(sent.slice(0, 3).join(' ')) : '', briefSig: false };
    }
    function oneGroupRepeated(v) {
      const tps = v.cols.map(c => c.label || cfg.tpLabels[c.tp] || c.tp), T = tps.length, G = gl[0], lab = plain(v.label);
      // patients with every measurement, so that each comparison uses the same patients
      const Y = byGroup[0].map(r => v.cols.map(c => toNum(r[c.col]))).filter(a => a.every(isFinite)), col = t => Y.map(r => r[t]);
      const param = v.dist === 'param' ? true : v.dist === 'nonparam' ? false
        : (() => { const cells = tps.map((_, t) => normality(col(t))); return cells.filter(r => r && r.p <= 0.05).length <= cells.length * NONNORMAL_SHARE; })();
      used.add(param ? 'desc1Param' : 'desc1Nonparam');
      const desc = tps.map((_, t) => S.describe(col(t)));
      const val = t => !desc[t].n ? '—' : param ? msd(desc[t].mean, desc[t].sd, d) : medIqr(desc[t], d);
      const w = Y.length >= 3 ? analyzeWithin([Y], param, used, alpha)[0] : { p: NaN };
      const tn = WITHIN_NAME[w.test] || w.test || '', sig = w.p <= alpha;
      // P of each timepoint against the first: the paired test (two timepoints) or the Bonferroni post hoc (three or more, once significant)
      const firstPost = RO.post === 'first';
      const pAt = t => t === 0 ? NaN : T === 2 ? w.p : firstPost && w.post ? w.post[t - 1].p : NaN;
      const change = t => {
        if (t === 0 || Y.length < 2) return '—';
        if (param) { const q = S.pairedT(col(t), col(0)); return `${fmt(q.diff, d)} (${fmt(q.lo, d)} to ${fmt(q.hi, d)})`; }
        const dd = S.describe(Y.map(r => r[t] - r[0])); return `${fmt(dd.median, d)} (${iqrTxt(dd.q1, dd.q3, d)})`;
      };
      const head = ['', opts.nHead === false ? G : `${G} (n=${Y.length})`];
      if (opts.effect) head.push(`Change from ${tps[0]} ${param ? '(95% CI)' : '(IQR)'}`);
      const pCol = T === 2 || firstPost; // other post hoc designs list their pairs below the table instead
      if (pCol) head.push(T === 2 ? 'P value' : `P value (vs ${tps[0]})`);
      const trows = tps.map((tp, t) => [{ t: [tp], b: true }, { t: [val(t)] }, ...(opts.effect ? [{ t: [change(t)], small: true }] : []), ...(pCol ? [{ t: [t === 0 ? '—' : isFinite(pAt(t)) ? fmtP(pAt(t), alpha) : '—'] }] : [])]);
      if (T > 2) trows.push([{ t: [`Overall (${tn})`], b: true }, { t: [isFinite(w.p) ? fmtP(w.p, alpha) : '—'], span: head.length - 1 }]);
      if (T > 2 && !firstPost && w.post) w.post.forEach(q => trows.push([{ t: [`P (${tps[q.b]} vs ${tps[q.a]})`], b: true }, { t: [fmtP(q.p, alpha)], span: head.length - 1 }]));
      const first = desc[0], last = desc[T - 1], c0 = param ? first.mean : first.median, c1 = param ? last.mean : last.median;
      const dir = c1 < c0 ? 'decreased' : 'increased', sent = [];
      if (!isFinite(w.p)) sent.push(`The change in ${lowerFirst(lab)} over time could not be tested: fewer than three patients had every measurement.`);
      else if (T === 2) sent.push(`${cap(lab)} ${sig ? `${dir} significantly` : 'did not change significantly'} from ${val(0)} at ${lowerFirst(tps[0])} to ${val(1)} at ${lowerFirst(tps[1])} (${tn}, P value ${pTxt(w.p)}).`);
      else {
        sent.push(`${cap(lab)} ${sig ? 'changed significantly over time' : 'did not change significantly over time'} (${tn}, P value ${pTxt(w.p)}); it was ${val(0)} at ${lowerFirst(tps[0])} and ${val(T - 1)} at ${lowerFirst(tps[T - 1])}.`);
        if (w.post && !firstPost) {
          const sig2 = w.post.filter(q => q.p <= alpha);
          sent.push(sig2.length ? `It differed significantly in ${sig2.length > 1 ? 'these comparisons' : 'the comparison'}: ${listJoin(sig2.map(q => `${lowerFirst(tps[q.b])} vs ${lowerFirst(tps[q.a])}`))} (P value ${pList(sig2.map(q => q.p))}).`
            : `None of the ${RO.post === 'all' ? 'pairwise' : 'consecutive'} comparisons was significant after ${RO.adjust === 'none' ? 'testing' : RO.adjust === 'holm' ? 'Holm correction' : 'Bonferroni correction'}.`);
        } else if (w.post) {
          const lower = [], higher = [], same = [];
          w.post.forEach(q => { const t = q.t, ct = param ? desc[t].mean : desc[t].median; (q.p <= alpha ? (ct < c0 ? lower : higher) : same).push({ tp: tps[t], p: q.p }); });
          const part = (list, word) => `significantly ${word} at ${tpGroup(list.map(x => x.tp))} (P value ${list.length > 1 ? pList(list.map(x => x.p)) : pTxt(list[0].p)})`;
          const parts = [lower.length ? part(lower, 'lower') : '', higher.length ? part(higher, 'higher') : ''].filter(Boolean);
          if (parts.length) sent.push(`Compared with ${lowerFirst(tps[0])}, it was ${parts.join(' and ')}${same.length ? `, with no significant difference at ${tpGroup(same.map(x => x.tp))}` : ''}.`);
          else sent.push(`None of the measurements differed significantly from ${lowerFirst(tps[0])}${RO.adjust === 'none' ? '' : ` after ${RO.adjust === 'holm' ? 'Holm' : 'Bonferroni'} correction`}.`);
        }
      }
      const f = [];
      if (sig || (w.post && w.post.some(q => q.p <= alpha))) f.push(`*: Significant as P value ≤ ${alpha}`);
      f.push(`Data are presented as ${param ? meanSdName(true) : (FMT.iqr === 'bracket' ? 'median [IQR]' : 'median (IQR)')} of the ${Y.length} patients with every measurement`);
      if (opts.effect) f.push(param ? 'Change: mean difference from the first measurement with 95% CI' : 'Change: median (IQR) of the differences from the first measurement');
      const sphTxt = param && T > 2 && RO.sph !== 'gg' ? (RO.sph === 'hf' ? ' (Huynh-Feldt)' : ' (sphericity assumed)') : '';
      if (isFinite(w.p)) f.push(T === 2 ? `P value: ${tn}` : `Overall: ${tn}${sphTxt}${w.post ? `, ${firstPost ? `P value (vs ${tps[0]})` : 'P (… vs …)'}: ${ADJ_NAME[RO.adjust]} ${param ? 'paired t-test' : 'Wilcoxon signed-rank test'}${firstPost ? '' : ' ' + POST_WHAT(tps)}` : ''}`);
      if (v.note) f.push(v.note);
      const ct = v.chart && v.chart !== 'auto' ? v.chart : opts.chartStyle;
      const meanChart = ct === 'bar' || ct === 'line' || (ct === 'auto' && param);
      const marks = opts.sigMarks ? { sigCat: tps.map((_, t) => pAt(t)), alpha, sigWhat: tps[0] } : {};
      const figures = v.chart === 'none' ? [] : [{ sig: !!sig, vid: v.id, caption: v.caption || `${v.label} of the studied patients over time${ct === 'meanci' ? ' (mean with 95% CI)' : ''}`,
        spec: ct === 'violin' ? { type: 'violin', categories: tps, yLabel: v.ylabel || v.label, legend: false, points: opts.points, ...marks, series: [{ name: G, data: tps.map((_, t) => col(t)) }] }
        : ct === 'meanci' ? { type: 'line', errKind: 'ci', categories: tps, yLabel: v.ylabel || v.label, xLabel: 'Time', legend: false, ...marks, series: [{ name: G, values: desc.map(x => x.mean), err: desc.map(ciHalf) }] }
        : meanChart
          ? { type: ct === 'bar' ? 'bar' : 'line', categories: tps, yLabel: v.ylabel || v.label, xLabel: 'Time', legend: false, ...marks, ...(ct === 'bar' ? valueLabels : {}), ...(opts.rmIndividual && ct !== 'bar' ? { individual: [Y] } : {}),
              series: [{ name: G, values: desc.map(x => param ? x.mean : x.median), err: desc.map(x => param ? errOf(x) : null), lo: param ? null : desc.map(x => x.q1), hi: param ? null : desc.map(x => x.q3) }] }
          : { type: 'box', categories: tps, yLabel: v.ylabel || v.label, legend: false, points: opts.points || ct === 'dot', ...marks, series: [{ name: G, data: tps.map((_, t) => col(t)) }] } }];
      return { kind: 'repeated', vid: v.id, title: `${v.label} of the studied patients over time`, head, rows: trows, footnote: f.join(', ') + '.', comment: wording(sent.join(' ')),
        brief: opts.paperStyle ? wording(sent[0] || '') : '', briefSig: !!sig, figures, meta: { param, tps, within: [w] } };
    }

    for (const b of blocks) {
      if (k === 1) { sections.push(b.kind === 'repeated' ? oneGroupRepeated(b.vars[0]) : oneGroupSingle(b)); continue; }
      if (b.kind === 'repeated') {
        const v = b.vars[0];
        const tps = v.cols.map(c => c.label || cfg.tpLabels[c.tp] || c.tp);
        const per = v.cols.map(c => byGroup.map(rs => rs.map(r => toNum(r[c.col])).filter(isFinite)));
        // decide parametric for the whole outcome
        let param;
        if (v.dist === 'param') param = true;
        else if (v.dist === 'nonparam') param = false;
        else {
          // non-parametric when more than a quarter of group × timepoint cells fail Shapiro-Wilk
          const cells = per.flat().map(g => normality(g));
          param = cells.filter(r => r && r.p <= 0.05).length <= cells.length * NONNORMAL_SHARE;
        }
        const results = per.map(gv => analyzeNumeric(gv, param ? 'param' : 'nonparam', used, opts));
        const tm = testMarker(results.map(r => r.test));
        const anySig = results.some(r => r.p <= alpha);
        const showPost = numbered && anySig;
        const head = ['', ...groupHeads, 'P value'];
        if (opts.showStat) head.push('Test');
        if (showPost) head.push('Post hoc');
        if (opts.effect) head.push('MD (95% CI)');
        const trows = results.map((r, t) => {
          const cells = [{ t: [tps[t]], b: true }];
          r.desc.forEach(dd => cells.push({ t: [param ? msd(dd.mean, dd.sd, d) : medIqr(dd, d)] }));
          cells.push({ t: [fmtP(r.p, alpha) + (isFinite(r.p) ? tm.mark(r.test) : '')] });
          if (opts.showStat) cells.push({ t: [r.stat], small: true });
          if (showPost) cells.push({ t: r.p <= alpha ? postHocLines(r) : ['---'], small: true });
          if (opts.effect) cells.push({ t: effectLines(r), small: true });
          return cells;
        });
        // optional rows comparing the groups on the change from the first timepoint and on the area under the curve
        const extraRes = [], extraNote = [];
        const extraRow = (label, r) => {
          const cells = [{ t: [label], b: true }, ...r.desc.map(dd => ({ t: [!dd.n ? '—' : r.param ? msd(dd.mean, dd.sd, d) : medIqr(dd, d)] })), { t: [fmtP(r.p, alpha) + (isFinite(r.p) ? tm.mark(r.test) : '')] }];
          if (opts.showStat) cells.push({ t: [r.stat], small: true });
          if (showPost) cells.push({ t: r.p <= alpha ? postHocLines(r) : ['---'], small: true });
          if (opts.effect) cells.push({ t: effectLines(r), small: true });
          return cells;
        };
        // the reference of the change: the outcome's own reference timepoint (step 3), else the first
        const r0 = Math.min(tps.length - 1, Math.max(0, +(v.refTp || 0) || 0));
        if ((opts.rmChange === 'abs' || opts.rmChange === 'pct') && k > 1 && tps.length > 1) {
          const pct = opts.rmChange === 'pct';
          for (let t = 0; t < tps.length; t++) {
            if (t === r0) continue;
            const gv = byGroup.map(rs => rs.map(r => [toNum(r[v.cols[r0].col]), toNum(r[v.cols[t].col])]).filter(([a, b]) => isFinite(a) && isFinite(b) && (!pct || a !== 0)).map(([a, b]) => pct ? (b - a) / Math.abs(a) * 100 : b - a));
            if (gv.some(x => x.length < 2)) continue;
            const r = analyzeNumeric(gv, v.dist, used, opts);
            extraRes.push({ kind: 'change', t, r }); trows.push(extraRow(`${pct ? '% change' : 'Change'} ${tps[t]} − ${tps[r0]}`, r));
          }
          extraNote.push(pct ? `% change: (later − ${tps[r0]}) / ${tps[r0]} × 100 in patients with both values` : `Change: value − ${tps[r0]} in patients with both values`);
        }
        if (opts.rmAuc && k > 1 && tps.length > 1) {
          // area under the curve over the timepoints by the trapezoid rule, timepoints one unit apart
          const tt = timesOf(v), gv = byGroup.map(rs => rs.map(r => v.cols.map(c => toNum(r[c.col]))).filter(a => a.every(isFinite)).map(a => a.slice(1).reduce((s2, y, i) => s2 + (y + a[i]) / 2 * (tt[i + 1] - tt[i]), 0)));
          if (gv.every(x => x.length >= 2)) {
            const r = analyzeNumeric(gv, 'auto', used, opts);
            extraRes.push({ kind: 'auc', r }); trows.push(extraRow('AUC over time', r));
            extraNote.push(`AUC: area under the curve over all timepoints (trapezoid rule, ${tt.real ? 'with the real time between the timepoints' : 'equal spacing'}; patients with every measurement)`);
          }
        }
        let within = null, withinNote = '';
        if (opts.within && v.cols.length >= 2) {
          const mats = byGroup.map(rs => rs.map(r => v.cols.map(c => toNum(r[c.col]))).filter(a => a.every(isFinite)));
          within = analyzeWithin(mats, param, used, alpha);
          const filler = () => ({ t: [''], span: head.length - 1 - k });
          trows.push([{ t: ['P (within group)'], b: true }, ...within.map(w => ({ t: [fmtP(w.p, alpha)] })), filler()]);
          const hasPost = within.some(w => w.post);
          if (hasPost) within.find(w => w.post).post.forEach((q, qi) =>
            trows.push([{ t: [`P (${tps[q.b]} vs ${tps[q.a]})`], b: true }, ...within.map(w => ({ t: [w.post ? fmtP(w.post[qi].p, alpha) : '---'] })), filler()]));
          withinNote = `P (within group): change over time within each group by ${tps.length === 2 ? (param ? 'paired t-test' : 'Wilcoxon signed-rank test') : (param ? `repeated-measures ANOVA${RO.sph === 'hf' ? ' (Huynh-Feldt)' : RO.sph === 'none' ? ' (sphericity assumed)' : ''}` : 'Friedman test')}`;
          if (hasPost) withinNote += `, P (… vs …): ${ADJ_NAME[RO.adjust]} ${param ? 'paired t-test' : 'Wilcoxon signed-rank test'} ${POST_WHAT(tps)}`.replace('P (… vs …)', RO.post === 'first' ? `P (… vs ${tps[0]})` : 'P (… vs …)');
        }
        // group × time interaction by mixed (split-plot) ANOVA — parametric outcomes only
        let mixed = null;
        if (opts.mixed && param && v.cols.length >= 2) {
          const mats = byGroup.map(rs => rs.map(r => v.cols.map(c => toNum(r[c.col]))).filter(a => a.every(isFinite)));
          if (mats.every(Y => Y.length >= 2)) {
            mixed = S.mixedAnova(mats); used.add('mixed');
            trows.push([{ t: ['Group × time interaction'], b: true }, { t: [fmtP(mixed.interaction.p, alpha)], span: k }, { t: [''], span: head.length - 1 - k }]);
            withinNote = [withinNote, 'Group × time interaction: mixed ANOVA (Greenhouse-Geisser)'].filter(Boolean).join(', ');
          }
        }
        // linear mixed model: group, time (continuous) and group × time, a random intercept per patient, every available value (REML; Wald tests)
        let lmm = null;
        if (opts.rmLmm && k > 1 && v.cols.length >= 2) {
          const tt = timesOf(v), y = [], X = [], sid = [];
          byGroup.forEach((rs, gi) => rs.forEach((r, ri) => v.cols.forEach((c, t) => { const val = toNum(r[c.col]); if (!isFinite(val)) return;
            y.push(val); sid.push(gi + ':' + ri); const gd = gl.slice(1).map((_, q) => +(gi === q + 1)); X.push([1, ...gd, tt[t], ...gd.map(g => g * tt[t])]); })));
          const m = y.length > k * 2 + 4 ? S.lmmRandomIntercept(y, X, sid) : null;
          if (m) {
            const G = gl.slice(1).map((_, q) => 1 + q), Tm = k, I = gl.slice(1).map((_, q) => k + 1 + q), wg = m.wald(G), wt = m.wald([Tm]), wi = m.wald(I);
            lmm = { group: wg, time: wt, inter: wi, m }; used.add('lmm');
            const fill = () => ({ t: [''], span: head.length - 1 - k });
            trows.push([{ t: ['Mixed model: group'], b: true }, { t: [fmtP(wg.p, alpha)], span: k }, fill()], [{ t: ['Mixed model: time'], b: true }, { t: [fmtP(wt.p, alpha)], span: k }, fill()], [{ t: ['Mixed model: group × time'], b: true }, { t: [fmtP(wi.p, alpha)], span: k }, fill()]);
            withinNote = [withinNote, `Mixed model: linear mixed model with a random intercept per patient (${m.nSubj} patients, ${m.nObs} measurements; time as ${timesOf(v).real ? 'its real value' : 'the timepoint number'}; Wald tests)`].filter(Boolean).join(', ');
          }
        }
        // linear trend over time within each group: the linear contrast of each patient's values, tested against zero
        let trend = null;
        if (opts.rmTrend && v.cols.length >= 3) {
          const tt = timesOf(v), mt = S.mean(tt), cw = tt.map(x => x - mt), mats = byGroup.map(rs => rs.map(r => v.cols.map(c => toNum(r[c.col]))).filter(a => a.every(isFinite)));
          trend = mats.map(Y => { if (Y.length < 3) return null; const sc = Y.map(a => a.reduce((t, x, i) => t + x * cw[i], 0)), m0 = S.mean(sc), se = S.sd(sc) / Math.sqrt(sc.length), tv = m0 / se; return { slope: m0 / cw.reduce((t, x) => t + x * x, 0), p: se > 0 ? 2 * (1 - jStat.studentt.cdf(Math.abs(tv), sc.length - 1)) : 1 }; });
          trows.push([{ t: ['P (linear trend over time)'], b: true }, ...trend.map(x => ({ t: [x ? fmtP(x.p, alpha) : '—'] })), { t: [''], span: head.length - 1 - k }]);
          withinNote = [withinNote, 'P (linear trend over time): linear contrast of each patient\'s values against zero (one-sample t-test)'].filter(Boolean).join(', ');
        }
        // responders: patients whose value fell (or rose) by at least the chosen % from the reference timepoint
        let resp = null;
        if (v.resp && +v.resp.pct > 0 && k > 1) {
          const fall = v.resp.dir !== 'rise', thr = +v.resp.pct; resp = [];
          for (let t = 0; t < tps.length; t++) {
            if (t === r0) continue;
            const gv = byGroup.map(rs => rs.map(r => [toNum(r[v.cols[r0].col]), toNum(r[v.cols[t].col])]).filter(([a, b]) => isFinite(a) && isFinite(b) && a !== 0)
              .map(([a, b]) => (fall ? (a - b) : (b - a)) / Math.abs(a) * 100 >= thr ? 'Responder' : 'Non-responder'));
            if (gv.some(x => !x.length)) continue;
            const cr = analyzeCategorical(gv, ['Responder', 'Non-responder'], used, opts); resp.push({ t, cr });
            trows.push([{ t: [`Responders at ${tps[t]}`], b: true }, ...cr.table[0].map((c, j) => ({ t: [npc(c, cr.pct[0][j], cr.ns[j])] })), { t: [fmtP(cr.p, alpha) + (isFinite(cr.p) ? tm.mark(cr.test) : '')] }, ...(head.length - 2 - k > 0 ? [{ t: [''], span: head.length - 2 - k }] : [])]);
          }
          if (resp.length) extraNote.push(`Responders: ${fall ? 'fall' : 'rise'} of at least ${thr}% from ${tps[r0]}, n (%) of the patients with both values, compared by ${testNames(resp.map(x => x.cr)) || 'the Chi-square test'}`);
        }
        let comment = repeatedComment(plain(v.label), tps, results, gl, alpha, detailed);
        if (lmm) comment += ` In the linear mixed model, the group × time interaction was ${lmm.inter.p <= alpha ? 'significant' : 'insignificant'} (P value ${pTxt(lmm.inter.p)}).`;
        if (trend) { const sg = trend.map((x, i) => x && x.p <= alpha ? `${gl[i]} (P value ${pTxt(x.p)})` : '').filter(Boolean); if (sg.length) comment += ` ${cap(plain(v.label))} showed a significant linear trend over time in ${listJoin(sg)}.`; }
        if (resp) { const sg = resp.filter(x => x.cr.p <= alpha); if (sg.length) comment += ` The proportion of responders differed significantly at ${listJoin(sg.map(x => `${tps[x.t]} (P value ${pTxt(x.cr.p)})`))}.`; }
        // the change from the first timepoint and the area under the curve
        if (extraRes.length) {
          const lab = lowerFirst(plain(v.label)), nsT = [];
          let aucNs = false;
          extraRes.forEach(x => {
            const what = x.kind === 'auc' ? `The area under the curve of ${lab}` : `The ${opts.rmChange === 'pct' ? 'percentage change' : 'change'} in ${lab} from ${lowerFirst(tps[0])} to ${lowerFirst(tps[x.t])}`;
            if (x.r.p <= alpha) { const pd = pairDescription(x.r, gl, alpha); comment += ` ${what} was ${fillP(pd.key, pd.ps)}.`; }
            else if (x.kind === 'auc') aucNs = true; else nsT.push(lowerFirst(tps[x.t]));
          });
          const parts = [nsT.length ? `the ${opts.rmChange === 'pct' ? 'percentage change' : 'change'} in ${lab} from ${lowerFirst(tps[0])} to ${tpGroup(nsT)}` : '', aucNs ? `the area under the curve of ${lab}` : ''].filter(Boolean);
          if (parts.length) comment += ` ${cap(listJoin(parts))} did not differ significantly ${amongTxt(k)}.`;
        }
        if (within) comment += ' ' + withinComment(plain(v.label), tps, within, results, gl, alpha, param);
        // optional effect sizes for the significant timepoints of a two-group comparison
        if (wantEff && k === 2) {
          const sig = results.map((r, t) => ({ q: r.pairs[0], t, p: r.p })).filter(x => x.p <= alpha && x.q && isFinite(x.q.diff));
          if (sig.length) comment += ` The ${param ? 'mean' : 'median'} difference${sig.length > 1 ? 's' : ''} (${gl[0]} − ${gl[1]}) ${sig.length > 1 ? 'were' : 'was'} ${listJoin(sig.map(x => `${fmt(x.q.diff, d)} (95% CI ${fmt(x.q.lo, d)} to ${fmt(x.q.hi, d)}) at ${tps[x.t]}`))}.`;
        }
        if (mixed) comment += mixed.interaction.p <= alpha
          ? ` There was a significant group × time interaction (P value ${pTxt(mixed.interaction.p)}), indicating that the change in ${lowerFirst(plain(v.label))} over time differed between the groups.`
          : ` The group × time interaction was insignificant (P value ${pTxt(mixed.interaction.p)}), indicating a similar pattern of change over time in the groups.`;
        // descriptive style: each group's values at the first and last timepoint
        if (descriptive && tps.length > 1) {
          const at = (t, i) => { const dd = results[t].desc[i]; return dd && dd.n ? (param ? msd(dd.mean, dd.sd, d) : medIqr(dd, d)) : '—'; }, last = tps.length - 1;
          comment = `${cap(plain(v.label))} was compared ${amongTxt(k)} at ${listJoin(tps.map(t => lowerFirst(t)))} using the ${testNames(results) || 'tests described in the methods'}. ` + comment
            + ' ' + gl.map((g, i) => `In ${g}, the ${param ? meanSdName(true) : 'median (IQR)'} was ${at(0, i)} at ${lowerFirst(tps[0])} and ${at(last, i)} at ${lowerFirst(tps[last])}.`).join(' ');
        }
        const sigAny = anySig || (within && within.some(w => w.p <= alpha)) || (mixed && mixed.interaction.p <= alpha);
        const marks = opts.sigMarks ? { sigCat: results.map(r => r.p), alpha } : {};
        sections.push({
          kind: 'repeated', vid: v.id, title: `${v.label} of the studied groups`, head, rows: trows,
          footnote: footnote({ sig: sigAny, param, nonparam: !param, effect: opts.effect, posthoc: showPost, stats: results.map(r => r.stat),
            missing: v.cols.map((c, t) => [tps[t], missingIn(c.col, true)]).filter(x => x[1]).map(([t, m]) => `${t} (n=${m})`) }, [tm.note, ...extraNote, withinNote, v.note].filter(Boolean).join(', ')),
          comment: wording(comment), brief: opts.paperStyle ? wording(briefRepeated(plain(v.label), tps, results, within, gl, alpha, param, d)) : '', briefSig: !!sigAny,
          figures: v.chart === 'none' ? [] : [(() => {
            // per-variable chart type overrides the global chart style
            const ct = v.chart && v.chart !== 'auto' ? v.chart : opts.chartStyle;
            const meanChart = ct === 'bar' || ct === 'line' || (ct === 'auto' && param);
            // waterfall: each patient's change from the first to the last timepoint (% when every first value is above zero)
            if (ct === 'waterfall') {
              const pairsV = byGroup.flatMap((rs, g) => rs.map(r => ({ a: toNum(r[v.cols[0].col]), b: toNum(r[v.cols[v.cols.length - 1].col]), g, id: cfg.idCols && cfg.idCols[0] ? r[cfg.idCols[0]] : undefined })).filter(q => isFinite(q.a) && isFinite(q.b)));
              const pct = pairsV.every(q => q.a > 0);
              return { sig: sigAny, vid: v.id, caption: v.caption || `${pct ? 'Percentage change' : 'Change'} in ${lowerFirst(plain(v.label))} from ${lowerFirst(tps[0])} to ${lowerFirst(tps[tps.length - 1])} in each patient (waterfall plot)`,
                spec: { type: 'waterfall', percent: pct, groups: k > 1 ? gl : [], yLabel: `${pct ? '% change' : 'Change'} in ${plain(v.label)}`, bars: pairsV.map(q => ({ v: pct ? 100 * (q.b - q.a) / q.a : q.b - q.a, g: q.g, id: q.id })) } };
            }
            if (ct === 'violin' || ct === 'rain' || ct === 'meanci') return { sig: sigAny, vid: v.id,
              caption: v.caption || `${v.label} of the studied groups${ct === 'meanci' ? ' (mean with 95% CI)' : ct === 'rain' ? ' (raincloud plot)' : ''}`,
              spec: ct !== 'meanci'
                ? { type: 'violin', ...(ct === 'rain' ? { rain: true } : {}), categories: tps, yLabel: v.ylabel || v.label, points: opts.points, ...marks, series: withN(gl, gN).map((g, i) => ({ name: g, data: per.map(gv => gv[i]) })) }
                : { type: 'line', errKind: 'ci', categories: tps, yLabel: v.ylabel || v.label, xLabel: 'Time', ...marks, series: withN(gl, gN).map((g, i) => ({ name: g, values: results.map(r => r.desc[i].mean), err: results.map(r => ciHalf(r.desc[i])) })) } };
            return {
            sig: sigAny, vid: v.id,
            caption: v.caption || `${v.label} of the studied groups${meanChart && param ? errNote : ''}`,
            spec: meanChart
              ? { type: ct === 'line' ? 'line' : 'bar', categories: tps, yLabel: v.ylabel || v.label, xLabel: 'Time', ...marks, ...(ct === 'line' ? {} : valueLabels),
                  ...(opts.rmIndividual && ct === 'line' ? { individual: byGroup.map(rs => rs.map(r => v.cols.map(c => toNum(r[c.col]))).filter(a => a.every(isFinite))) } : {}),
                  series: withN(gl, gN).map((g, i) => ({ name: g, values: results.map(r => param ? r.desc[i].mean : r.desc[i].median),
                    err: results.map(r => param ? errOf(r.desc[i]) : null), lo: param ? null : results.map(r => r.desc[i].q1), hi: param ? null : results.map(r => r.desc[i].q3) })) }
              : { type: 'box', categories: tps, yLabel: v.ylabel || v.label, points: opts.points || ct === 'dot', ...marks, series: withN(gl, gN).map((g, i) => ({ name: g, data: per.map(gv => gv[i]) })) }
            };
          })()],
          meta: { param, results, within, tps }
        });
      } else {
        // a table of single-measurement variables (baseline or other outcomes)
        const d0 = d;
        const res = b.vars.map(v => {
          if (v.type === 'numeric') {
            const gv = byGroup.map(rs => rs.map(r => toNum(r[v.cols[0].col])).filter(isFinite));
            return { v, num: analyzeNumeric(gv, v.dist, used, opts, v.test), gv };
          }
          const gv = byGroup.map(rs => rs.map(r => toCat(r[v.cols[0].col])).filter(x => x !== null));
          const present = [...new Set(gv.flat())];
          let levels = (v.levels && v.levels.length ? v.levels.filter(l => present.includes(l)) : []);
          present.forEach(l => { if (!levels.includes(l)) levels.push(l); });
          return { v, cat: analyzeCategorical(gv, levels, used, opts, v.ordinal ? v.ordTest || 'rank' : null, v.test), levels, gv };
        });
        // CONSORT: a baseline table of a randomised trial is described without P values
        const noP = !!opts.baselineNoP && (res.every(r => r.v.role === 'baseline') || /baseline|demograph/i.test(b.table));
        if (noP) used.add('noPBaseline');
        const anySig = !noP && res.some(r => (r.num || r.cat).p <= alpha);
        // post hoc results as letters (a, b, c) after the group values instead of a column of pairwise P values
        const letters = !noP && opts.postLetters && k > 2;
        const showPost = !noP && !letters && numbered && res.some(r => r.num ? r.num.p <= alpha : !!r.cat.pairs);
        const cldOf = r => { const x = r.num || r.cat; if (!letters || !(x.p <= alpha) || !x.pairs) return null; return compactLetters(k, x.pairs.filter(q => q.p <= alpha)); };
        // the order of the group columns in the tables (by label, comma-separated), else as elsewhere
        const ord = (() => { const want = String(opts.tableGroupOrder || '').split(',').map(t => t.trim().toLowerCase()).filter(Boolean), o = [];
          want.forEach(w => { const i = gl.findIndex((g, gi) => !o.includes(gi) && (g.toLowerCase() === w || String(groups[gi]).toLowerCase() === w || headName(g, gi).toLowerCase() === w)); if (i >= 0) o.push(i); });
          gl.forEach((_, i) => { if (!o.includes(i)) o.push(i); }); return opts.tableGroupOrder === 'reverse' ? gl.map((_, i) => k - 1 - i) : o; })();
        const O = a => ord.map(i => a[i]);
        const hasNum = res.some(r => r.num), hasCat = res.some(r => r.cat);
        const hasRR = opts.effect && res.some(r => r.cat && r.cat.binary);
        const twoCol = res.some(r => r.num || (r.cat && !isCompact(r)));
        // the effect column: mean / median differences and RR / OR, or only one of them
        const effNum = opts.effectShow !== 'cat', effCat = opts.effectShow !== 'num';
        const effOn = !noP && opts.effect && ((hasNum && effNum) || (hasRR && effCat));
        const effHead = hasNum && effNum && hasRR && effCat ? `MD/${EF} (95% CI)` : hasRR && effCat ? `${EF} (95% CI)` : 'MD (95% CI)';
        const totalCol = !!opts.totalCol, tm = testMarker(res.map(r => (r.num || r.cat).test));
        const nCol = !!opts.nCol, missCol = !!opts.missCol;
        const head = [{ t: '', span: twoCol ? 2 : 1 }, ...(nCol ? ['n'] : []), ...(missCol ? ['Missing'] : []), ...O(groupHeads), ...(totalCol ? [opts.nHead === false ? 'Total' : `Total (n=${rows.length})`] : []), ...(noP ? [] : ['P value'])];
        // the n analysed and missing values of each variable, spanning its rows
        const pre = (r, span) => [...(nCol ? [{ t: [String(r.num ? S.sum(r.num.desc.map(x => x.n)) : S.sum(r.cat.ns))], rs: span }] : []),
          ...(missCol ? [{ t: [String(missingIn(r.v.cols[0].col, !!r.num))], rs: span }] : [])];
        const supOf = (L, j) => L && L[j] ? toSup(L[j]) : '';
        // ordered groups (e.g. doses): a P value for trend — Jonckheere-Terpstra (numeric), Cochran-Armitage (yes/no) or linear-by-linear (more categories)
        const trendOn = !noP && !!opts.groupTrend && k > 2;
        const trendP = r => { if (r.num) return S.jonckheere(r.gv).p; const t = r.cat.table; if (t.length === 2) return S.cochranArmitage(t[0], r.cat.ns).p;
          const o = ordinalTest(r.gv, r.levels, 'trend', new Set(), opts); return o ? o.p : NaN; };
        if (trendOn) { head.push('P for trend'); used.add('groupTrend'); res.forEach(r => { r.trend = trendP(r); }); }
        if (opts.showStat && !noP) head.push('Test');
        // the Total column: every analysed patient, whatever the group
        const totDesc = r => S.describe(r.gv.flat());
        const totCat = (r, li) => { const cnt = S.sum(r.cat.table[li]), n = S.sum(r.cat.ns); return npc(cnt, n ? 100 * cnt / n : 0, n); };
        const tot = (on, f) => totalCol ? [{ t: [on ? f() : ''] }] : [];
        if (showPost) head.push('Post hoc');
        if (effOn) head.push(effHead);
        const trows = [];
        const tail = (r, span) => {
          if (noP) return [];
          const x = r.num || r.cat, cells = [{ t: [fmtP(x.p, alpha) + (isFinite(x.p) ? tm.mark(x.test) : '')], rs: span }];
          if (trendOn) cells.push({ t: [fmtP(r.trend, alpha)], rs: span });
          if (opts.showStat) cells.push({ t: [(r.num || r.cat).stat], rs: span, small: true });
          if (showPost) cells.push({ t: r.num && r.num.p <= alpha ? postHocLines(r.num) : r.cat && r.cat.pairs ? postHocLines(r.cat) : ['---'], rs: span, small: true });
          if (effOn) cells.push({ t: r.num ? (effNum ? effectLines(r.num) : ['---']) : (r.cat.binary && effCat ? rrLines(r.cat) : ['---']), rs: span, small: true });
          return cells;
        };
        for (const r of res) {
          if (r.num) {
            const n = r.num, P = n.param, d = r.v.dec !== undefined && r.v.dec !== null && r.v.dec !== '' ? +r.v.dec : d0; // decimals: the variable's own, else the report's
            const L = cldOf(r), gcell = (dd, j, txt) => ({ t: [txt + supOf(L, j)] });
            if (opts.secondRow === 'none' || r.v.noSecond) {
              // one row: "Mean ± SD" or "Median (IQR)" in a single cell
              trows.push([{ t: [r.v.label], b: true }, { t: [P ? meanSdName() : (FMT.iqr === 'bracket' ? 'Median [IQR]' : 'Median (IQR)')] }, ...pre(r, 1),
                ...O(n.desc.map((dd, j) => gcell(dd, j, P ? msd(dd.mean, dd.sd, d) : medIqr(dd, d)))), ...tot(true, () => { const dd = totDesc(r); return P ? msd(dd.mean, dd.sd, d) : medIqr(dd, d); }), ...tail(r, 1)]);
            } else if (opts.secondRow === 'both') {
              // both summaries: the one the test used first, the other below it
              const ms = dd => msd(dd.mean, dd.sd, d), mi = dd => medIqr(dd, d), mName = meanSdName(), iName = FMT.iqr === 'bracket' ? 'Median [IQR]' : 'Median (IQR)';
              const [f1, f2, n1, n2] = P ? [ms, mi, mName, iName] : [mi, ms, iName, mName];
              trows.push([{ t: [r.v.label], b: true, rs: 2 }, { t: [n1] }, ...pre(r, 2), ...O(n.desc.map((dd, j) => gcell(dd, j, f1(dd)))), ...tot(true, () => f1(totDesc(r))), ...tail(r, 2)],
                [{ t: [n2] }, ...O(n.desc.map(dd => ({ t: [f2(dd)] }))), ...tot(true, () => f2(totDesc(r)))]);
            } else {
              const first = [{ t: [r.v.label], b: true, rs: 2 }, { t: [P ? meanSdName() : 'Median'] }, ...pre(r, 2),
                ...O(n.desc.map((dd, j) => gcell(dd, j, P ? msd(dd.mean, dd.sd, d) : fmt(dd.median, d)))), ...tot(true, () => { const dd = totDesc(r); return P ? msd(dd.mean, dd.sd, d) : fmt(dd.median, d); }), ...tail(r, 2)];
              const ci = dd => { const h = jStat.studentt.inv(S.QU(), dd.n - 1) * dd.sd / Math.sqrt(dd.n); return `${fmt(dd.mean - h, d)} to ${fmt(dd.mean + h, d)}`; };
              const second = [{ t: [P ? (opts.secondRow === 'ci' ? '95% CI' : 'Range') : 'IQR'] },
                ...O(n.desc.map(dd => ({ t: [P ? (opts.secondRow === 'ci' ? ci(dd) : `${fmt(dd.min, d)} - ${fmt(dd.max, d)}`) : iqrTxt(dd.q1, dd.q3, d)] }))),
                ...tot(true, () => { const dd = totDesc(r); return P ? (opts.secondRow === 'ci' ? ci(dd) : `${fmt(dd.min, d)} - ${fmt(dd.max, d)}`) : iqrTxt(dd.q1, dd.q3, d); })];
              trows.push(first, second);
            }
          } else if (isCompact(r)) {
            const c = r.cat, Lt = cldOf(r);
            trows.push([{ t: [r.v.label], b: true, span: twoCol ? 2 : 1 }, ...pre(r, 1), ...O(c.table[0].map((cnt, j) => ({ t: [npc(cnt, c.pct[0][j], c.ns[j]) + supOf(Lt, j)] }))), ...tot(true, () => totCat(r, 0)), ...tail(r, 1)]);
          } else {
            const c = r.cat, Lt = cldOf(r), indent = opts.catLayout === 'indent', totRow = !!opts.catTotal;
            const L = r.levels.length + (totRow ? 1 : 0) + (indent ? 1 : 0);
            // journal style: the variable on its own row, its categories indented below it
            if (indent) trows.push([{ t: [r.v.label], b: true, span: twoCol ? 2 : 1, left: true }, ...pre(r, L), ...O(c.ns.map(() => ({ t: [''] }))), ...tot(true, () => ''), ...tail(r, L)]);
            r.levels.forEach((lv, li) => {
              const row = [];
              if (indent) row.push({ t: ['\u2003' + lv], span: twoCol ? 2 : 1, ind: true });
              else { if (li === 0) row.push({ t: [r.v.label], b: true, rs: L }); row.push({ t: [lv] }); if (li === 0) row.push(...pre(r, L)); }
              row.push(...O(c.table[li].map((cnt, j) => ({ t: [npc(cnt, c.pct[li][j], c.ns[j]) + (li === 0 ? supOf(Lt, j) : '')] }))), ...tot(true, () => totCat(r, li)));
              if (li === 0 && !indent) row.push(...tail(r, L));
              trows.push(row);
            });
            // a Total row: every patient with a value of the variable (100%)
            if (totRow) trows.push([indent ? { t: ['\u2003Total'], span: twoCol ? 2 : 1, ind: true } : { t: ['Total'] }, ...O(c.ns.map(n => ({ t: [npc(n, 100, n)] }))), ...tot(true, () => { const n = S.sum(c.ns); return npc(n, 100, n); })]);
          }
        }
        // comment
        // detailed style: "Age (Group A: 45.2 ± 8.1, Group B: 44.9 ± 7.6)" with P values on every sentence
        const values = r => {
          if (r.num) return r.num.desc.map((dd, i) => `${gl[i]}: ${r.num.param ? msd(dd.mean, dd.sd, d) : medIqr(dd, d)}`).join(', ');
          if (isCompact(r)) return r.cat.pct[0].map((p, i) => `${gl[i]}: ${fmt(p, 1)}%`).join(', ');
          return '';
        };
        const withValues = (r, lab) => detailed && values(r) ? `${lab} (${values(r)})` : lab;
        // optional effect size inside the P value brackets of a significant two-group comparison
        const effTxt = r => {
          if (!wantEff || k !== 2) return '';
          if (r.num) { const q = r.num.pairs[0]; return q && isFinite(q.diff) ? `; MD = ${fmt(q.diff, d)}, 95% CI ${fmt(q.lo, d)} to ${fmt(q.hi, d)}` : ''; }
          const q = r.cat.rr && r.cat.rr[0];
          return q && q.rr !== null && q.rr !== undefined ? `; ${EF} = ${fmt(q.rr, 2)}, 95% CI ${fmt(q.lo, 2)}-${fmt(q.hi, 2)}` : '';
        };
        const effTxtAny = r => { if (k !== 2) return '';
          if (r.num) { const q = r.num.pairs[0]; return q && isFinite(q.diff) ? `MD = ${fmt(q.diff, d)}, 95% CI ${fmt(q.lo, d)} to ${fmt(q.hi, d)}` : ''; }
          const q = r.cat.rr && r.cat.rr[0]; return q && q.rr !== null && q.rr !== undefined ? `${EF} = ${fmt(q.rr, 2)}, 95% CI ${fmt(q.lo, 2)} to ${fmt(q.hi, 2)}` : ''; };
        const nsRes = res.filter(r => !((r.num || r.cat).p <= alpha));
        const sent = [];
        if (noP) { const vals = r => r.num ? r.num.desc.map((dd, i) => `${gl[i]}: ${r.num.param ? msd(dd.mean, dd.sd, d) : medIqr(dd, d)}`).join(', ')
            : isCompact(r) ? r.cat.pct[0].map((p, i) => `${gl[i]}: ${fmt(p, 1)}%`).join(', ') : r.levels.map((lv, li) => `${lv} ${r.cat.pct[li].map(p => fmt(p, 1) + '%').join(' vs ')}`).join('; ');
          sent.push(`The ${lowerFirst(plain(b.table))} of the studied groups are shown in the table: ${listJoin(res.map(r => `${lowerFirst(plain(r.v.label))} (${vals(r)})`))}.`); }
        else if (descriptive) sent.push(...descriptiveSentences(res, b.table));
        else if (detailed) nsRes.forEach(r => {
          const p = (r.num || r.cat).p;
          sent.push(`${cap(withValues(r, plain(r.v.label)))} was insignificantly different ${amongTxt(k)}${isFinite(p) ? ` (P value ${pTxt(p)})` : ''}.`);
        });
        else if (nsRes.length) {
          // baseline characteristics read as "comparable"; outcomes as "insignificantly different"
          // optional: P between alpha and 0.10 written as a trend
          const trendR = opts.trendWord ? nsRes.filter(r => (r.num || r.cat).p < 0.1) : [];
          const base = nsRes.filter(r => r.v.role === 'baseline' && !trendR.includes(r)), rest = nsRes.filter(r => r.v.role !== 'baseline' && !trendR.includes(r));
          trendR.forEach(r => sent.push(`${cap(plain(r.v.label))} showed a non-significant trend towards a difference ${amongTxt(k)} (P value ${pTxt((r.num || r.cat).p)}).`));
          if (base.length) sent.push(`The groups were comparable regarding ${listJoin(base.map(r => lowerFirst(plain(r.v.label))))} (P value > ${opts.alpha}).`);
          if (rest.length) { const nsLabels = rest.map(r => lowerFirst(plain(r.v.label)));
            sent.push(`${cap(listJoin(nsLabels))} ${nsLabels.length > 1 ? 'were' : 'was'} insignificantly different ${amongTxt(k)}.`); }
        }
        // optional: non-significant two-group results with their estimate and 95% CI, not only the P value
        if (opts.nsCI && k === 2 && !noP && !descriptive) nsRes.forEach(r => {
          if (r.num) { const q = r.num.pairs[0]; if (q && isFinite(q.lo)) sent.push(`The ${r.num.param ? 'mean' : 'median'} difference in ${lowerFirst(plain(r.v.label))} was ${fmt(q.diff, d)} (95% CI ${fmt(q.lo, d)} to ${fmt(q.hi, d)}).`); }
          else { const q = r.cat.rr && r.cat.rr[0]; if (q && q.rr !== null && q.rr !== undefined && isFinite(q.lo)) sent.push(`For ${lowerFirst(plain(r.v.label))}, the ${EF} was ${fmt(q.rr, 2)} (95% CI ${fmt(q.lo, 2)} to ${fmt(q.hi, 2)}).`); }
        });
        for (const r of res.filter(r => !descriptive && !noP && (r.num || r.cat).p <= alpha)) {
          // compact categorical sentences already quote their percentages
          const lab = isCompact(r) ? plain(r.v.label) : withValues(r, plain(r.v.label));
          if (r.num) { const pd = pairDescription(r.num, gl, alpha); sent.push(`${cap(lab)} was ${fillP(pd.key, pd.ps).replace(/\)$/, effTxt(r) + ')')}.`);
            // the minimal clinically important difference of the variable (step 2 ⚙), two groups
            const mc = Math.abs(toNum(r.v.mcid)), q = r.num.pairs[0];
            if (k === 2 && mc > 0 && q && isFinite(q.diff)) sent.push(`This difference (${fmt(Math.abs(q.diff), d)}) ${Math.abs(q.diff) >= mc ? 'exceeded' : 'was smaller than'} the minimal clinically important difference of ${fmt(mc, d)}.`); }
          else {
            const c = r.cat, row = 0;
            const best = c.pct[row].indexOf(Math.max(...c.pct[row]));
            if (isCompact(r)) {
              if (k === 2) {
                const lo = 1 - best;
                sent.push(`${cap(lab)} was significantly higher in ${gl[best]} than ${gl[lo]} (${pctTxt(c.pct[0][best])}% vs ${pctTxt(c.pct[0][lo])}%, P value ${pTxt(c.p)}${effTxt(r)}).`);
              } else sent.push(`${cap(lab)} was significantly different ${amongTxt(k)} (P value ${pTxt(c.p)}), being highest in ${gl[best]} (${pctTxt(c.pct[0][best])}%).`);
            } else sent.push(`The distribution of ${lowerFirst(lab)} was significantly different ${amongTxt(k)} (P value ${pTxt(c.p)}).`);
            if (c.pairs) {
              const sp = c.pairs.filter(q => q.p <= alpha);
              sent.push(sp.length ? `Pairwise, it differed significantly between ${pairList(sp, gl)} (P value ${pList(sp.map(q => q.p))}).`
                : (opts.chiAdjust === 'none' ? 'Pairwise comparisons were insignificant.' : `Pairwise comparisons were insignificant after ${opts.chiAdjust === 'holm' ? 'Holm' : 'Bonferroni'} correction.`));
            }
          }
        }
        // descriptive style: one sentence per variable with every group's values, the test, its statistic, the P value and the effect size,
        // pairwise results for three or more groups, and a closing overview of the table
        function descriptiveSentences(res, tableName) {
          const out = [`This table compares ${lowerFirst(plain(tableName))} ${amongTxt(k)}.`];
          for (const r of res) {
            const x = r.num || r.cat, sig = x.p <= alpha, lab = plain(r.v.label);
            const st = x.stat && x.stat !== '—' && x.stat !== 'FE' ? `, ${x.stat}` : '';
            const pb = isFinite(x.p) ? `${TEST_NAME[x.test] || x.test}${st}, P value ${pTxt(x.p)}${sig ? effTxt(r) : ''}` : 'not testable';
            if (r.num) {
              const P = r.num.param, vals = listJoin(r.num.desc.map((dd, i) => `${dd.n ? (P ? msd(dd.mean, dd.sd, d) : medIqr(dd, d)) : '—'} in ${gl[i]}`));
              const what = P ? meanSdName(true) : 'median (IQR)';
              if (!sig) { out.push(`${cap(lab)} did not differ significantly ${amongTxt(k)}; the ${what} was ${vals} (${pb}).`); continue; }
              if (k === 2) {
                const loc = i => P ? r.num.desc[i].mean : r.num.desc[i].median, hi = loc(0) >= loc(1) ? 0 : 1;
                out.push(`${cap(lab)} was significantly higher in ${gl[hi]} than in ${gl[1 - hi]}; the ${what} was ${vals} (${pb}).`);
              } else {
                out.push(`${cap(lab)} differed significantly ${amongTxt(k)}; the ${what} was ${vals} (${pb}).`);
                const pd = pairDescription(r.num, gl, alpha);
                out.push(pd.key.includes('although') ? 'However, none of the pairwise comparisons was significant.' : `Pairwise comparisons showed that it was ${fillP(pd.key, pd.ps)}.`);
              }
            } else {
              const c = r.cat, compact = isCompact(r);
              const vals = compact ? listJoin(c.table[0].map((cnt, i) => `${cnt} of ${c.ns[i]} (${pctTxt(c.pct[0][i])}%) in ${gl[i]}`))
                : gl.map((g, i) => `${g}: ${r.levels.map((lv, li) => `${lv} ${pctTxt(c.pct[li][i])}%`).join(', ')}`).join('; ');
              const best = c.pct[0].indexOf(Math.max(...c.pct[0]));
              if (compact) out.push(`${cap(lab)} was found in ${vals}; the difference was ${sig ? `significant, being most frequent in ${gl[best]}` : 'insignificant'} (${pb}).`);
              else out.push(`The distribution of ${lowerFirst(lab)} ${sig ? 'differed significantly' : 'did not differ significantly'} ${amongTxt(k)} (${vals}; ${pb}).`);
              if (sig && c.pairs) {
                const sp = c.pairs.filter(q => q.p <= alpha);
                out.push(sp.length ? `Pairwise, it differed significantly between ${pairList(sp, gl)} (P value ${pList(sp.map(q => q.p))}).` : (opts.chiAdjust === 'none' ? 'Pairwise comparisons were insignificant.' : `Pairwise comparisons were insignificant after ${opts.chiAdjust === 'holm' ? 'Holm' : 'Bonferroni'} correction.`));
              }
            }
          }
          const sigL = res.filter(r => (r.num || r.cat).p <= alpha).map(r => lowerFirst(plain(r.v.label))), nsL = res.filter(r => !((r.num || r.cat).p <= alpha)).map(r => lowerFirst(plain(r.v.label)));
          if (res.length > 1) out.push(!sigL.length ? `Overall, the groups were comparable in all the studied variables.`
            : !nsL.length ? `Overall, the groups differed significantly in all the studied variables.`
            : `Overall, the groups differed significantly in ${listJoin(sigL)}, whereas they were comparable in ${listJoin(nsL)}.`);
          return out;
        }
        // optional: the size of each significant effect, with its conventional magnitude
        // your own sentence templates: {variable}, {groups}, {P}, {test}, {values}, {highest}, {lowest}, {effect}, {result}
        if (opts.commentTpl && !noP) {
          sent.length = 0;
          res.forEach(r => {
            const x = r.num || r.cat, sig = x.p <= alpha, lv = r.num ? r.num.desc.map(dd => r.num.param ? dd.mean : dd.median) : r.cat.pct[0];
            const hi = lv.indexOf(Math.max(...lv)), lo = lv.indexOf(Math.min(...lv)), ef = effTxtAny(r);
            const map = { variable: plain(r.v.label), Variable: cap(plain(r.v.label)), groups: amongTxt(k), P: pTxt(x.p), test: TEST_NAME[x.test] || x.test || '', values: values(r) || '',
              highest: gl[hi], lowest: gl[lo], effect: ef, result: sig ? 'differed significantly' : 'did not differ significantly' };
            const tpl = String((sig ? opts.tplSig : opts.tplNs) || '').trim(); if (!tpl) return;
            sent.push(tpl.replace(/\{(\w+)\}/g, (m, key) => key in map ? map[key] : m).replace(/\(\s*\)/g, '').replace(/\s+([,.;])/g, '$1').replace(/\s{2,}/g, ' '));
          });
        }
        if (opts.commentMagnitude && !noP) {
          const parts = res.filter(r => (r.num || r.cat).p <= alpha).map(r => { const m = effectMagnitude(r, k, opts); return m && `${lowerFirst(plain(r.v.label))} (${m})`; }).filter(Boolean);
          if (parts.length) sent.push(`The effect size was ${parts.length > 1 ? 'as follows: ' : 'for '}${listJoin(parts)}.`);
        }
        const flags = { sig: anySig, param: res.some(r => r.num && r.num.param), nonparam: res.some(r => r.num && !r.num.param), cat: hasCat, effect: effOn, rr: hasRR && effCat, posthoc: showPost, both: opts.secondRow === 'both' && res.some(r => r.num && !r.v.noSecond),
          stats: res.map(r => (r.num || r.cat).stat), ci: opts.secondRow === 'ci' && res.some(r => r.num && r.num.param),
          missing: res.map(r => [plain(r.v.label), missingIn(r.v.cols[0].col, !!r.num)]).filter(x => x[1]).map(([l, m]) => `${l} (n=${m})`) };
        const lettersUsed = letters && res.some(r => cldOf(r));
        const notes = [noP ? '' : tm.note, lettersUsed ? `Values in a row with no superscript letter in common differ significantly (post hoc, P value ≤ ${alpha})` : '', ...b.vars.map(v => v.note)].filter(Boolean).join(', ');
        // significance brackets between groups: pairwise P values once the overall test is significant
        const brackets = x => {
          if (!opts.sigMarks || !(x.p <= alpha)) return {};
          if (k === 2) return { sig: [{ i: 0, j: 1, p: x.p }], alpha };
          return x.pairs ? { sig: x.pairs.filter(q => q.p <= alpha).map(q => ({ i: q.i, j: q.j, p: q.p })), alpha, ...(opts.sigLabel === 'letters' ? { letters: compactLetters(k, x.pairs.filter(q => q.p <= alpha)) } : {}) } : {};
        };
        const figures = res.filter(r => r.v.chart !== 'none').map(r => {
          const f = { sig: (r.num || r.cat).p <= alpha, vid: r.v.id, ...figureFor(r) };
          if (r.v.caption) f.caption = r.v.caption;
          return f;
        });
        function figureFor(r) {
          const ct = r.v.chart || 'auto';
          if (r.num) {
            const cats = withN(gl, r.num.desc.map(x => x.n)), P = r.num.param;
            if (ct === 'hist') {
              // grouped histogram: equal-width bins over all patients
              const all = r.gv.flat(), sc = niceScale(Math.min(...all), Math.max(...all), 8), edges = [];
              for (let e = sc.min; e < sc.max - 1e-9; e += sc.step) edges.push(e);
              const bin = v => Math.min(edges.length - 1, Math.floor((v - sc.min) / sc.step + 1e-9));
              return { caption: `Distribution of ${lowerFirst(plain(r.v.label))} in the studied groups`,
                spec: { type: 'bar', integer: true, categories: edges.map(e => `${fmt(e, d)}-${fmt(e + sc.step, d)}`), xLabel: r.v.label, yLabel: 'Number of patients',
                  series: withN(gl, r.num.desc.map(x => x.n)).map((g, i) => { const n = new Array(edges.length).fill(0); r.gv[i].forEach(v => n[bin(v)]++); return { name: g, values: n }; }) } };
            }
            if (ct === 'violin' || ct === 'rain') return { caption: `${r.v.label} of the studied groups${ct === 'rain' ? ' (raincloud plot)' : ''}`,
              spec: { type: 'violin', ...(ct === 'rain' ? { rain: true } : {}), perGroup: true, categories: cats, yLabel: r.v.ylabel || r.v.label, points: opts.points, ...brackets(r.num), series: [{ name: r.v.label, data: r.gv }] } };
            if (ct === 'dotci') return { caption: `${r.v.label} of the studied groups (every patient, mean with 95% CI)`,
              spec: { type: 'dot', ci: true, perGroup: true, categories: cats, yLabel: r.v.ylabel || r.v.label, ...brackets(r.num), series: [{ name: r.v.label, data: r.gv }] } };
            if (ct === 'meanci') return { caption: `${r.v.label} of the studied groups (mean with 95% CI)`,
              spec: { type: 'line', noLine: true, perGroup: true, errKind: 'ci', categories: cats, yLabel: r.v.ylabel || r.v.label, ...brackets(r.num),
                series: [{ name: r.v.label, values: r.num.desc.map(x => x.mean), err: r.num.desc.map(ciHalf) }] } };
            if (ct === 'dot') return { caption: `${r.v.label} of the studied groups (${P ? 'mean ± SD' : 'median and IQR'})`,
              spec: { type: 'dot', perGroup: true, categories: cats, yLabel: r.v.ylabel || r.v.label, median: !P, ...brackets(r.num), series: [{ name: r.v.label, data: r.gv }] } };
            const bar = ct === 'bar' || (ct === 'auto' && P && opts.chartStyle !== 'box');
            if (bar && !P) return { caption: `${r.v.label} of the studied groups (median and IQR)`,
              spec: { type: 'bar', perGroup: true, categories: cats, yLabel: r.v.ylabel || r.v.label, ...valueLabels, ...brackets(r.num), series: [{ name: r.v.label, values: r.num.desc.map(x => x.median), lo: r.num.desc.map(x => x.q1), hi: r.num.desc.map(x => x.q3) }] } };
            return {
              caption: `${r.v.label} of the studied groups${bar ? errNote : ''}`,
              spec: bar
                ? { type: 'bar', perGroup: true, categories: cats, yLabel: r.v.ylabel || r.v.label, ...valueLabels, ...brackets(r.num), series: [{ name: r.v.label, values: r.num.desc.map(x => x.mean), err: r.num.desc.map(errOf) }] }
                : { type: 'box', perGroup: true, categories: cats, yLabel: r.v.ylabel || r.v.label, points: opts.points, ...brackets(r.num), series: [{ name: r.v.label, data: r.gv }] }
            };
          }
          const c = r.cat;
          if (ct === 'hbar') return {
            caption: `${r.v.label} of the studied groups`,
            spec: { type: 'hbar', categories: withN(gl, c.ns), yLabel: r.v.ylabel || '% of the studied patients', series: r.levels.map((lv, li) => ({ name: lv, values: c.pct[li] })) }
          };
          if (ct === 'mosaic') return {
            caption: `${r.v.label} of the studied groups (mosaic plot: bar widths show the group sizes)`,
            spec: { type: 'stacked', widths: c.ns, categories: withN(gl, c.ns), yLabel: r.v.ylabel || '% of the studied patients', series: r.levels.map((lv, li) => ({ name: lv, values: c.pct[li] })) }
          };
          if (ct === 'stacked' || ct === 'pie' || ct === 'piefull') return {
            caption: `${r.v.label} of the studied groups`,
            spec: { type: ct === 'piefull' ? 'pie' : ct, ...(ct === 'piefull' ? { full: true } : {}), categories: withN(gl, c.ns), yLabel: r.v.ylabel || '% of the studied patients', series: r.levels.map((lv, li) => ({ name: lv, values: c.pct[li] })) }
          };
          if (isCompact(r)) return {
            caption: `${r.v.label} of the studied groups`,
            spec: { type: 'bar', perGroup: true, percent: true, labels: true, categories: withN(gl, c.ns), yLabel: r.v.ylabel || '% of the studied patients', ...brackets(c), series: [{ name: r.levels[0], values: c.pct[0] }] }
          };
          return {
            caption: `${r.v.label} of the studied groups`,
            spec: { type: 'bar', percent: true, labels: true, categories: withN(gl, c.ns), yLabel: r.v.ylabel || '% of the studied patients', series: r.levels.map((lv, li) => ({ name: lv, values: c.pct[li] })) }
          };
        }
        sections.push({ kind: 'single', title: `${b.table} of the studied groups`, head, rows: trows, footnote: footnote(flags, notes), comment: wording(sent.join(' ')), figures, twoCol, meta: { res },
          brief: opts.paperStyle ? wording(briefSingle(res, gl, alpha, d)) : '', briefSig: anySig });
      }
    }

    // enrolment over time: patients per month from a date column (step 9)
    if (cfg.timeline && cfg.timeline.col) { const sec = timelineSection(cfg, rows, groups, gl); if (sec) sections.unshift(sec); }
    if (opts.correlation) {
      const sec = correlationSection(vars, rows, cfg, alpha, d);
      if (sec) {
        if (sec.meta.pairs.some(q => q.method === 'pearson')) used.add('pearson');
        if (sec.meta.pairs.some(q => q.method === 'spearman')) used.add('spearman');
        sec.comment = wording(sec.comment);
        sections.push(sec);
      }
    }

    for (const a of cfg.advanced || []) {
      if (a.include === false || (!a.outcome && !['cronbach', 'correlation', 'cochran', 'pca', 'psm', 'lmm'].includes(a.type))) continue;
      const needs = {
        linear: () => (a.predictors || []).length, logistic: () => a.positive && (a.predictors || []).length, roc: () => a.positive && (a.predictors || []).length,
        ancova: () => true, survival: () => a.event && a.positive, cox: () => a.event && a.positive && (a.predictors || []).length,
        mcnemar: () => a.second, kappa: () => a.second, agreement: () => a.second, diagnostic: () => a.positive && a.event && a.eventPositive, cronbach: () => true, cochran: () => (a.predictors || []).length >= 2, count: () => (a.predictors || []).length, ordinal: () => (a.predictors || []).length, multinom: () => (a.predictors || []).length,
        methodcomp: () => a.second, pca: () => (a.predictors || []).length >= 3, partial: () => a.second && (a.predictors || []).length, anova2: () => a.second, mediation: () => a.second && a.xvar, psm: () => (a.predictors || []).length, lmm: () => a.rvar, tost: () => a.margin !== undefined && a.margin !== '', mh: () => a.positive && a.second, clogit: () => a.positive && a.second && (a.predictors || []).length,
        correlation: () => [a.outcome, ...(a.predictors || [])].filter(Boolean).length >= 2, paired: () => a.second
      };
      if (!needs[a.type] || !needs[a.type]()) continue;
      if (k < 2 && a.type === 'ancova') continue; // ANCOVA compares the study groups
      const G = { gl, groups };
      const make = { roc: rocSection, ancova: ancovaSection, survival: survivalSection, cox: coxSection, mcnemar: mcnemarSection, kappa: kappaSection,
        agreement: agreementSection, diagnostic: diagnosticSection, cronbach: cronbachSection, cochran: cochranSection, count: countSection, ordinal: ordinalSection, multinom: ordinalSection, methodcomp: methodSection, pca: pcaSection, partial: partialSection, anova2: anova2Section, mediation: mediationSection, psm: psmSection, lmm: lmmSection, tost: tostSection, mh: mhSection, clogit: clogitSection, linear: regressionSection, logistic: regressionSection, correlation: advCorrelationSection, paired: pairedSection }[a.type];
      // patients: all, each study group separately, or one group (not for analyses that compare the groups)
      const compares = ['ancova', 'survival', 'mcnemar', 'cochran', 'tost', 'mh', 'anova2', 'psm', 'lmm'].includes(a.type);
      const subsets = compares || !a.subset || a.subset === 'all' ? [{ g: null, rows }]
        : a.subset === 'each' ? groups.map(g => ({ g, rows: rows.filter(r => groupOf(cfg, r) === g) }))
        : groups.includes(a.subset) ? [{ g: a.subset, rows: rows.filter(r => groupOf(cfg, r) === a.subset) }] : [{ g: null, rows }];
      for (const sub of subsets) {
        const made = make(a, cfg, sub.rows, alpha, d, used, G);
        if (!made) continue;
        // an analysis may add a second table (e.g. the comparison of ROC curves)
        [].concat(made).forEach((sec, si) => {
          if (si === 0 && a.title && a.title.trim()) sec.title = a.title.trim();
          if (sub.g !== null) sec.title += ` in ${cfg.groupLabels[sub.g] || sub.g}`;
          if (a.commentDetail === 'brief' && sec.comment) sec.comment = (sec.comment.match(/^.*?\.(?=\s+[A-Z(]|$)/) || [sec.comment])[0];
          sec.comment = wording(sec.comment);
          sections.push(sec);
        });
      }
    }

    // which figures go in the report: all, only those of significant results, or none
    if (opts.figures === 'none') sections.forEach(s => { s.figures = []; });
    else if (opts.figures === 'sig') sections.forEach(s => { s.figures = s.figures.filter(f => f.sig !== false); });

    // table headings and footnotes follow the chosen P value heading and significance mark
    sections.forEach(sec => {
      if (opts.pHead && opts.pHead !== 'P value') sec.head = sec.head.map(h => h === 'P value' ? opts.pHead : h && h.t === 'P value' ? { ...h, t: opts.pHead } : h);
      if (opts.boldSig) boldSigP(sec, opts.pHead || 'P value', alpha);
      if (opts.shadeSig) shadeSigRows(sec, opts.pHead || 'P value', alpha);
      if (FMT.sig !== '*') sec.footnote = FMT.sig ? sec.footnote.replace(/^\*: Significant/, FMT.sig + ': Significant') : sec.footnote.replace(/^\*: Significant as P value ≤ [\d.]+(, )?/, '').replace(/^\.$/, '');
    });
    return { sections, used, groups: gl, gN, k, methods: (opts.paperStyle ? methodsConcise(used, k, cfg) : methodsText(used, k, cfg)) + (filterText(cfg) ? (activeFilters(cfg).length ? ` The analysis included only patients with ${filterText(cfg)}.` : ` For this analysis, ${filterText(cfg)}.`) : ''), intro: opts.paperStyle ? introConcise(cfg, gl) : introText(cfg, gl, gN), flowCaption: flowCaption(cfg),
      summary: opts.summary ? keyFindings(sections) : '' };
  }

  // paired comparison of two numeric measurements of the same patients (before / after, method A / B)
  function pairedSection(a, cfg, rows, alpha, d, used) {
    if (!a.second) return null;
    const l1 = columnLabel(cfg, a.outcome), l2 = columnLabel(cfg, a.second);
    const rs = rows.filter(r => isFinite(toNum(r[a.outcome])) && isFinite(toNum(r[a.second])));
    if (rs.length < 3) return null;
    const x = rs.map(r => toNum(r[a.outcome])), y = rs.map(r => toNum(r[a.second])), dif = y.map((v, i) => v - x[i]);
    const nt = normality(dif), param = a.test === 'param' ? true : a.test === 'nonparam' ? false : !nt || nt.p > 0.05;
    const t = S.pairedT(y, x), w = S.wilcoxonSigned(y, x), res = param ? t : w, p = res.p;
    used.add(param ? 'pairedt' : 'wilcoxon'); used.add('pairedAdv');
    const dx = S.describe(x), dy = S.describe(y), dd = S.describe(dif), val = q => param ? msd(q.mean, q.sd, d) : medIqr(q, d);
    const tn = param ? 'Paired t-test' : 'Wilcoxon signed-rank test';
    const head = ['', param ? meanSdName() : 'Median (IQR)', 'P value'];
    const trows = [[{ t: [l1], b: true }, { t: [val(dx)] }, { t: [fmtP(p, alpha)], rs: 3 }], [{ t: [l2], b: true }, { t: [val(dy)] }],
      [{ t: [`Difference (${plain(l2)} − ${plain(l1)})`], b: true }, { t: param ? [msd(dd.mean, dd.sd, d), `95% CI ${fmt(t.lo, d)} to ${fmt(t.hi, d)}`] : [medIqr(dd, d)] }]];
    // effect size: Cohen's dz (mean difference / SD of differences) or r = |z| / √n
    const eff = param ? `Cohen's dz = ${fmt(Math.abs(dd.mean) / dd.sd, 2)}` : `r = ${fmt(Math.abs(w.z) / Math.sqrt(rs.length), 2)}`;
    const dir = (param ? dd.mean : dd.median) < 0 ? 'lower' : 'higher';
    const sent = [p <= alpha ? `${cap(plain(l2))} was significantly ${dir} than ${lowerFirst(plain(l1))} (${val(dy)} vs ${val(dx)}; ${tn}, P value ${pTxt(p)}; ${eff}).`
      : `${cap(plain(l2))} and ${lowerFirst(plain(l1))} were insignificantly different (${val(dy)} vs ${val(dx)}; ${tn}, P value ${pTxt(p)}).`];
    const f = [...(p <= alpha ? [`*: Significant as P value ≤ ${alpha}`] : []), `n = ${rs.length} patients with both values`, `P value: ${tn}${a.test === 'auto' || !a.test ? ` (differences ${param ? 'normally' : 'not normally'} distributed)` : ''}`,
      `Other test: ${param ? `Wilcoxon signed-rank P ${pTxt(w.p)}` : `paired t-test P ${pTxt(t.p)}`}`, eff];
    const figures = a.figure === 'none' ? [] : [{ sig: p <= alpha, caption: `${plain(l1)} and ${lowerFirst(plain(l2))} of each patient`,
      spec: { type: 'line', categories: [plain(l1), plain(l2)], yLabel: a.ylabel || plain(l1), legend: false, individual: [x.map((v, i) => [v, y[i]])],
        errKind: 'sd', series: [{ name: 'Mean', values: param ? [dx.mean, dy.mean] : [dx.median, dy.median], err: param ? [dx.sd, dy.sd] : [null, null], lo: param ? null : [dx.q1, dy.q1], hi: param ? null : [dx.q3, dy.q3] }] } }];
    return { kind: 'paired', title: `${plain(l1)} versus ${lowerFirst(plain(l2))} (paired comparison)`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures, meta: { t, w } };
  }
  // correlation as an advanced analysis: chosen columns, optionally one main variable against the others
  function advCorrelationSection(a, cfg, rows, alpha, d, used) {
    const cols = [...new Set([a.outcome, ...(a.predictors || [])].filter(Boolean))].filter(c => isNumberColumn(rows, c));
    if (cols.length < 2) return null;
    const items = cols.map(c => ({ label: columnLabel(cfg, c), vals: rows.map(r => toNum(r[c])) }));
    const target = !!a.outcome && cols[0] === a.outcome;
    const title = target ? `Correlation of ${lowerFirst(plain(items[0].label))} with the studied variables (n=${rows.length})` : `Correlation between the studied variables (n=${rows.length})`;
    const sec = corrTable(items, rows, cfg, alpha, d, { method: ['pearson', 'spearman', 'kendall'].includes(a.method) ? a.method : 'auto', layout: a.layout, target, scatter: a.scatter ?? '2', ci: !!a.ci, detail: a.commentDetail }, title);
    if (sec.meta.pairs.some(q => q.method === 'pearson')) used.add('pearson');
    if (sec.meta.pairs.some(q => q.method === 'spearman')) used.add('spearman');
    if (sec.meta.pairs.some(q => q.method === 'kendall')) used.add('kendall');
    return sec;
  }
  // bold significant P values in the P value column (row spans followed as in the Word table)
  // shade every row of a significant result (its P value cell and the rows it spans)
  function shadeSigRows(sec, pHead, alpha) {
    let col = 0, pc = -1;
    sec.head.forEach(h => { const t = typeof h === 'string' ? h : h && h.t; if (pc < 0 && t === pHead) pc = col; col += (h && h.span) || 1; });
    if (pc < 0) return;
    const occ = [], mark = new Set();
    sec.rows.forEach((r, ri) => {
      let c = 0;
      for (const cell of r) {
        while (occ[ri] && occ[ri][c]) c++;
        if (c === pc) {
          const m = String((cell.t || [])[0] || '').match(/^(<\s?)?(\d*[.·]\d+)/);
          if (m && (m[1] || parseFloat(m[2].replace('·', '.')) <= alpha)) for (let q = 0; q < (cell.rs || 1); q++) mark.add(ri + q);
        }
        if (cell.rs > 1) for (let q = 1; q < cell.rs; q++) { occ[ri + q] = occ[ri + q] || []; for (let s2 = 0; s2 < (cell.span || 1); s2++) occ[ri + q][c + s2] = true; }
        c += cell.span || 1;
      }
    });
    // a cell spanning rows is shaded when its first row is
    sec.rows.forEach((r, ri) => { if (mark.has(ri)) r.forEach(cell => { cell.hl = true; }); });
  }
  function boldSigP(sec, pHead, alpha) {
    let col = 0, pc = -1;
    sec.head.forEach(h => { const t = typeof h === 'string' ? h : h && h.t; if (pc < 0 && t === pHead) pc = col; col += (h && h.span) || 1; });
    if (pc < 0) return;
    const occ = [];
    sec.rows.forEach((r, ri) => {
      let c = 0;
      for (const cell of r) {
        while (occ[ri] && occ[ri][c]) c++;
        if (c === pc) {
          const m = String((cell.t || [])[0] || '').match(/^(<\s?)?(\d*[.·]\d+)/);
          if (m && (m[1] || parseFloat(m[2].replace('·', '.')) <= alpha)) cell.b = true;
        }
        if (cell.rs > 1) for (let q = 1; q < cell.rs; q++) { occ[ri + q] = occ[ri + q] || []; for (let s = 0; s < (cell.span || 1); s++) occ[ri + q][c + s] = true; }
        c += cell.span || 1;
      }
    });
  }

  // Correlation table across all analysed patients: single numeric variables and each repeated outcome at its last timepoint
  const MAX_SCATTER = 4;
  function correlationSection(vars, rows, cfg, alpha, d) {
    const items = [];
    for (const v of vars) {
      if (v.type !== 'numeric') continue;
      const c = v.kind === 'repeated' ? v.cols[v.cols.length - 1] : v.cols[0];
      const label = v.kind === 'repeated' ? `${plain(v.label)} at ${c.label || cfg.tpLabels[c.tp] || c.tp}` : v.label;
      items.push({ label, vals: rows.map(r => toNum(r[c.col])) });
    }
    if (items.length < 2) return null;
    return corrTable(items, rows, cfg, alpha, d, {}, `Correlation between the studied variables in all patients (n=${rows.length})`);
  }
  // o: method (auto / pearson / spearman), layout (auto / matrix / pairs), target (item 0 against the others), scatter (number of scatter plots), ci
  function corrTable(items, rows, cfg, alpha, d, o, title) {
    const pr = analyzeCorrelation(items, alpha, o.method || 'auto', !!o.target);
    const m = items.length, get = (i, j) => pr.find(q => (q.i === i && q.j === j) || (q.i === j && q.j === i));
    const coef = q => `${q.method === 'pearson' ? 'r' : q.method === 'kendall' ? 'τb' : 'rs'} = ${fmt(q.r, 2)}`;
    const ciTxt = q => isFinite(q.lo) ? `${fmt(q.lo, 2)} to ${fmt(q.hi, 2)}` : '—';
    let head, trows;
    if (o.target) {
      head = ['Variable', 'n', 'Coefficient', ...(o.ci ? ['95% CI'] : []), 'P value'];
      trows = pr.map(q => [{ t: [items[q.j].label], b: true }, { t: [String(q.n)] }, { t: [coef(q)] }, ...(o.ci ? [{ t: [ciTxt(q)] }] : []), { t: [fmtP(q.p, alpha)] }]);
    } else if (o.layout === 'pairs' || o.ci || (o.layout !== 'matrix' && m > 6)) {
      head = ['Variable', 'Variable', 'Coefficient', ...(o.ci ? ['95% CI'] : []), 'P value'];
      trows = pr.map(q => [{ t: [items[q.i].label], b: true }, { t: [items[q.j].label] }, { t: [coef(q)] }, ...(o.ci ? [{ t: [ciTxt(q)] }] : []), { t: [fmtP(q.p, alpha)] }]);
    } else if (m <= 6 || o.layout === 'matrix') {
      // lower-triangular matrix
      head = ['', ...items.slice(0, -1).map(it => it.label)];
      trows = items.slice(1).map((it, ii) => [{ t: [it.label], b: true },
        ...items.slice(0, -1).map((_, j) => j <= ii ? (q => ({ t: [coef(q), `P ${q.p < 0.001 ? '' : '= '}${fmtP(q.p, alpha)}`], small: true }))(get(ii + 1, j)) : { t: [''] })]);
    }
    const strength = r => Math.abs(r) < 0.3 ? 'weak' : Math.abs(r) < 0.7 ? 'moderate' : 'strong';
    const sig = pr.filter(q => q.sig);
    const sent = sig.map(q => `There was a significant ${strength(q.r)} ${q.r > 0 ? 'positive' : 'negative'} correlation between ${lowerFirst(plain(items[q.i].label))} and ${lowerFirst(plain(items[q.j].label))} (${coef(q)}, P value ${pTxt(q.p)}).`);
    if (!sig.length) sent.push('No significant correlations were found among the studied variables.');
    else if (sig.length < pr.length && o.detail !== 'detailed') sent.push('The remaining correlations were insignificant.');
    if (o.detail === 'detailed') { const ns = pr.filter(q => !q.sig && isFinite(q.r));
      if (ns.length) sent.push(`The correlations of ${listJoin(ns.map(q => `${lowerFirst(plain(items[q.i].label))} with ${lowerFirst(plain(items[q.j].label))} (${coef(q)}, P value ${pTxt(q.p)})`))} were insignificant.`); }
    const f = [];
    if (sig.length) f.push(`*: Significant as P value ≤ ${alpha}`);
    if (pr.some(q => q.method === 'pearson')) f.push('r: Pearson correlation coefficient');
    if (pr.some(q => q.method === 'spearman')) f.push("rs: Spearman's rank correlation coefficient");
    if (pr.some(q => q.method === 'kendall')) f.push("τb: Kendall's tau-b (large-sample test)");
    if (o.ci) f.push("CI: Confidence interval (Fisher's z transformation)");
    const nScatter = o.scatter === undefined ? MAX_SCATTER : o.scatter === 'all' ? Infinity : +o.scatter;
    const figures = [...sig].sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, nScatter).map(q => {
      const xs = [], ys = [];
      items[q.i].vals.forEach((v, r) => { if (isFinite(v) && isFinite(items[q.j].vals[r])) { xs.push(v); ys.push(items[q.j].vals[r]); } });
      return { caption: `Correlation between ${lowerFirst(plain(items[q.i].label))} and ${lowerFirst(plain(items[q.j].label))}`,
        spec: { type: 'scatter', x: xs, y: ys, xLabel: items[q.i].label, yLabel: items[q.j].label, note: `${coef(q)}, P ${pTxt(q.p)}` } };
    });
    // optional heat map of every coefficient (step 7)
    if (cfg.options && cfg.options.figHeat && m >= 3 && !o.target) {
      const M = items.map((_, i) => items.map((_, j) => i === j ? 1 : (q => q ? q.r : NaN)(get(i, j)))), Pm = items.map((_, i) => items.map((_, j) => i === j ? NaN : (q => q ? q.p : NaN)(get(i, j))));
      figures.unshift({ sig: true, caption: 'Heat map of the correlation coefficients', spec: { type: 'heat', labels: items.map(it => plain(it.label)), matrix: M, pmatrix: Pm, alpha } });
    }
    return { kind: 'correlation', title, head, rows: trows,
      footnote: f.join(', ') + '.', comment: sent.join(' '), figures, meta: { pairs: pr, items: items.map(it => it.label) } };
  }

  // "Summary of key findings": every sentence of the comments that reports a significant result
  // sentences of a comment that report a significant result; judged after removing the negative phrases,
  // so "A was significantly lower …, and insignificantly different …" is kept
  function significantSentences(text) {
    return (text || '').split(/(?<=\.)\s+(?=[A-Z])/).map(t => t.trim()).filter(t => {
      if (!t || /none of|^no significant/i.test(t)) return false;
      const pos = t.replace(/insignificant\w*|not significant\w*|no significant|did not change significantly|could not significantly/gi, '');
      return /significant|independent predictor/i.test(pos);
    });
  }
  function keyFindings(sections) {
    const out = sections.flatMap(sec => significantSentences(sec.comment));
    return out.length ? out.join(' ') : 'No statistically significant differences were found.';
  }

  /* ---------- journal-paper style text ---------- */
  // one short sentence per table: the significant variables with their direction, then the rest in one clause
  function briefSingle(res, gl, alpha, d) {
    const k = gl.length, val = (n, i) => n.param ? msd(n.desc[i].mean, n.desc[i].sd, d) : `median ${fmt(n.desc[i].median, d)}, IQR ${fmt(n.desc[i].q1, d)}–${fmt(n.desc[i].q3, d)}`;
    const sig = [], ns = [];
    res.forEach(r => {
      const x = r.num || r.cat, lab = lowerFirst(plain(r.v.label));
      if (!(x.p <= alpha)) { ns.push(lab); return; }
      if (r.num) {
        const c = r.num.desc.map(dd => r.num.param ? dd.mean : dd.median), lo = c.indexOf(Math.min(...c)), hi = c.indexOf(Math.max(...c));
        sig.push(k === 2 ? `${lab} was lower in ${gl[lo]} than in ${gl[hi]} (${val(r.num, lo)} vs ${val(r.num, hi)}; P value ${pTxt(x.p)})`
          : `${lab} differed among the groups (P value ${pTxt(x.p)}), being lowest in ${gl[lo]} (${val(r.num, lo)})`);
      } else if (isCompact(r)) {
        const pc = r.cat.pct[0], hi = pc.indexOf(Math.max(...pc)), lo = pc.indexOf(Math.min(...pc));
        sig.push(k === 2 ? `${lab} was more frequent in ${gl[hi]} (${pctTxt(pc[hi])}% vs ${pctTxt(pc[lo])}%; P value ${pTxt(x.p)})`
          : `${lab} differed among the groups (P value ${pTxt(x.p)}), being most frequent in ${gl[hi]} (${pctTxt(pc[hi])}%)`);
      } else sig.push(`the distribution of ${lab} differed between the groups (P value ${pTxt(x.p)})`);
    });
    const nsTxt = ns.length ? `${listJoin(ns)} did not differ significantly ${k === 2 ? 'between' : 'among'} the groups` : '';
    if (!sig.length) return cap(nsTxt) + '.';
    return cap(sig.join('; ')) + (nsTxt ? `, whereas ${nsTxt}` : '') + '.';
  }
  function briefRepeated(label, tps, results, within, gl, alpha, param, d) {
    const k = gl.length, lab = lowerFirst(label);
    const sigT = results.map((r, t) => ({ r, t })).filter(x => x.r.p <= alpha);
    const center = (r, i) => param ? r.desc[i].mean : r.desc[i].median;
    const lowest = r => { const c = r.desc.map((_, i) => center(r, i)); return c.indexOf(Math.min(...c)); };
    let t;
    if (!sigT.length) t = `${cap(lab)} did not differ significantly ${k === 2 ? 'between' : 'among'} the groups at any timepoint`;
    else {
      const when = listJoin(sigT.map(x => tps[x.t])), ps = pList(sigT.map(x => x.r.p));
      const lows = [...new Set(sigT.map(x => lowest(x.r)))];
      t = k === 2 && lows.length === 1
        ? `${cap(lab)} was significantly lower in ${gl[lows[0]]} than in ${gl[1 - lows[0]]} at ${when} (P value ${ps})`
        : `${cap(lab)} differed significantly ${k === 2 ? 'between' : 'among'} the groups at ${when} (P value ${ps})${lows.length === 1 ? `, being lowest in ${gl[lows[0]]}` : ''}`;
    }
    if (within) {
      const first = results[0], last = results[results.length - 1];
      const dec = [], inc = [];
      within.forEach((w, g) => { if (w.p <= alpha) (center(last, g) < center(first, g) ? dec : inc).push(gl[g]); });
      const parts = [dec.length ? `decreased over time in ${listJoin(dec)}` : '', inc.length ? `increased over time in ${listJoin(inc)}` : ''].filter(Boolean);
      if (parts.length) t += `; within groups, it ${parts.join(' and ')}`;
    }
    return t + '.';
  }
  function methodsConcise(used, k, cfg) {
    const o = cfg.options, s = [cfg.study.software.trim().replace(/\.?$/, '.')];
    if (used.has('param') || used.has('nonparam') || used.has('desc1Param') || used.has('desc1Nonparam')) s.push(o.normality === 'skewkurt' ? 'Normality was assessed with the z-scores of skewness and kurtosis.' : `Normality was assessed with the ${o.normality === 'ks' ? 'Kolmogorov-Smirnov (Lilliefors)' : 'Shapiro-Wilk'} test.`);
    const pres = [];
    if (used.has('param') || used.has('desc1Param')) pres.push(FMT.mean === 'paren' ? 'mean (SD)' : 'mean ± SD');
    if (used.has('nonparam') || used.has('desc1Nonparam')) pres.push('median (IQR)');
    if (used.has('cat') || used.has('desc1Cat')) pres.push('n (%)');
    if (pres.length) s.push(`Data are presented as ${listJoin(pres).replace(/ and ([^,]*)$/, ' or $1')}.`);
    const cont = [];
    if (used.has('param')) cont.push(k === 2 ? (used.has('welch') ? "Student's or Welch's t-test" : "Student's t-test")
      : `one-way ANOVA with Tukey's post hoc test${used.has('welchAnova') ? " (Welch's ANOVA with Games-Howell when variances differed)" : ''}`);
    if (used.has('nonparam')) cont.push(k === 2 ? 'Mann-Whitney U test' : `Kruskal-Wallis test with ${used.has('dunn') ? "Dunn's" : `pairwise Mann-Whitney${used.has('mwAdj:holm') ? ' (Holm)' : used.has('mwAdj:bonferroni') ? ' (Bonferroni)' : ''}`} post hoc tests`);
    const cat = used.has('cat') ? `χ² test${used.has('fisher') ? " or Fisher's exact test" : ''}${used.has('chiPost') ? ` (${used.has('chiNone') ? 'pairwise comparisons without correction' : `${used.has('chiHolm') ? 'Holm' : 'Bonferroni'}-corrected pairwise comparisons`})` : ''}` : '';
    if (cont.length || cat) s.push(`Groups were compared using ${[cont.length ? `the ${cont.join(' or the ')} for continuous variables` : '', cat ? `the ${cat} for categorical variables` : ''].filter(Boolean).join(' and ')}.`);
    const w = [];
    if (used.has('pairedt')) w.push('paired t-test'); if (used.has('wilcoxon')) w.push('Wilcoxon signed-rank test');
    if (used.has('rmanova')) w.push('repeated-measures ANOVA'); if (used.has('friedman')) w.push('Friedman test');
    if (w.length || used.has('mixed')) s.push(`Changes over time were assessed with the ${listJoin(w.length ? w : ['mixed ANOVA'])}${used.has('postPairedt') || used.has('postWilcoxon') ? `, with ${used.has('rmAdj:holm') ? 'Holm' : used.has('rmAdj:none') ? 'uncorrected' : 'Bonferroni'}-corrected comparisons ${used.has('rmPost:all') ? 'between all timepoints' : used.has('rmPost:consecutive') ? 'between consecutive timepoints' : 'against baseline'}`.replace('uncorrected-corrected', 'uncorrected') : ''}${used.has('mixed') && w.length ? ', and the group × time interaction with mixed ANOVA' : ''}.`);
    if (used.has('pearson') || used.has('spearman')) s.push(`Correlations were assessed with ${[used.has('pearson') ? "Pearson's" : '', used.has('spearman') ? "Spearman's" : ''].filter(Boolean).join(' or ')} coefficient.`);
    const adv = [['linear', 'multiple linear regression'], ['logistic', 'binary logistic regression'], ['cox', 'Cox proportional hazards regression'], ['ancova', 'ANCOVA'],
      ['roc', 'ROC curve analysis'], ['rocClosest', 'ROC curve analysis'], ['survival', k > 1 ? 'Kaplan-Meier analysis with the log-rank test' : 'Kaplan-Meier analysis'], ['mcnemar', 'the McNemar test'], ['kappa', "Cohen's kappa"],
      ['icc', 'the intraclass correlation coefficient with Bland-Altman analysis'], ['diagnostic', 'sensitivity, specificity and predictive values with exact 95% CI'], ['cronbach', "Cronbach's α"]]
      .filter(([key]) => used.has(key)).map(x => x[1]).filter((x, i, a) => a.indexOf(x) === i);
    if (adv.length) s.push(`Additional analyses included ${listJoin(adv)}${used.has('sel_backward') ? ' (backward elimination)' : used.has('sel_forward') ? ' (forward selection)' : ''}.`);
    s.push(`A two-sided P ≤ ${o.alpha} was considered significant.`);
    return s.join(' ');
  }
  function introConcise(cfg, gl) {
    const c = cfg.consort;
    if (!c || !c.enabled) return '';
    const type = c.type || 'consort', ex = c.excluded.reduce((a, e) => a + (+e.n || 0), 0);
    if (type === 'consort' || type === 'strobe') {
      const inc = c.groups.map(g => +g.allocated || 0), an = c.groups.map(g => +g.analysed || 0);
      const verb = type === 'consort' ? 'randomised' : 'included';
      const same = inc.every((v, i) => v === an[i]);
      const per = list => gl.length > 1 ? ` (${gl.map((g, i) => `${g}: ${list[i]}`).join(', ')})` : '';
      return `Of ${c.assessed} ${type === 'consort' ? 'patients assessed for eligibility' : 'potentially eligible individuals'}, ${ex} ${ex === 1 ? 'was' : 'were'} excluded and ${S.sum(inc)} ${gl.length > 1 ? verb : 'included'}${per(inc)}${same ? `; all were analysed` : `; ${S.sum(an)} were analysed${per(an)}`}.`;
    }
    return introText(cfg, gl, []);
  }

  function isCompact(r) {
    return r.cat && r.levels.length === 2 && POSITIVE.test(r.levels[0]) && (/^(no|n|false|negative|absent|0|not done|neg)$/i.test(r.levels[1]));
  }

  /* ---------- auto-written text ---------- */
  function methodsText(used, k, cfg) {
    const o = cfg.options, s = [];
    s.push(cfg.study.software.trim().replace(/\.?$/, '.'));
    const one = ['desc1Param', 'desc1Nonparam', 'desc1Cat'].some(x => used.has(x));
    if (used.has('param') || used.has('nonparam') || used.has('desc1Param') || used.has('desc1Nonparam')) s.push(`${o.normality === 'ks' ? 'Kolmogorov-Smirnov test (with Lilliefors correction)' : o.normality === 'skewkurt' ? 'The z-scores of skewness and kurtosis (within ±1.96)' : 'Shapiro-Wilk test'} and histograms were used to evaluate the normality of the distribution of data.`);
    if (one) {
      const parts = [used.has('desc1Param') ? 'normally distributed quantitative data presented as mean and standard deviation (SD)' : '',
        used.has('desc1Nonparam') ? `${used.has('desc1Param') ? 'non-normally distributed data' : 'quantitative data presented'} as median and interquartile range (IQR)` : '',
        used.has('desc1Cat') ? `qualitative variables${used.has('desc1Param') || used.has('desc1Nonparam') ? '' : ' presented'} as frequency and percentage (%)` : ''].filter(Boolean);
      s.push(`All patients were analyzed as one group${parts.length ? `, with ${listJoin(parts)}` : ''}.`);
    }
    if (used.has('param')) {
      let t;
      if (k === 2) t = used.has('welch') && used.has('ttest') ? "unpaired Student's t-test (or Welch's t-test when Levene's test indicated unequal variances)"
        : used.has('welch') ? "Welch's t-test" : "unpaired Student's t-test";
      else t = used.has('welchAnova') && !used.has('anova') ? "Welch's ANOVA with Games-Howell post hoc test"
        : 'ANOVA (F) test with post hoc test (Tukey)' + (used.has('welchAnova') ? " (or Welch's ANOVA with Games-Howell post hoc test when Levene's test indicated unequal variances)" : '');
      s.push(`Quantitative parametric data were presented as mean and standard deviation (SD) and were analyzed by ${t}.`);
    }
    if (used.has('nonparam')) {
      const t = k === 2 ? 'Mann-Whitney test' : used.has('dunn') ? "Kruskal-Wallis test with Dunn's post hoc test (Bonferroni-adjusted)" : `Kruskal-Wallis test with Mann-Whitney test to compare each two groups${used.has('mwAdj:holm') ? ' (Holm-adjusted)' : used.has('mwAdj:bonferroni') ? ' (Bonferroni-adjusted)' : ''}`;
      s.push(`Quantitative non-parametric data were presented as median and interquartile range (IQR) and were analyzed by ${t}.`);
    }
    if (used.has('cat')) s.push(`Qualitative variables were presented as frequency and percentage (%) and were analyzed utilizing the Chi-square test${used.has('fisher') ? " or Fisher's exact test when appropriate" : ''}.`);
    if (used.has('lmm')) s.push('Repeated measures were also analysed with a linear mixed model (group, time and their interaction as fixed effects, a random intercept per patient, restricted maximum likelihood), which uses every available measurement.');
    if (used.has('ordRank')) s.push(`Ordinal variables were compared with the ${used.has('ordDunn') ? "Mann-Whitney U or Kruskal-Wallis test (Dunn's post hoc test with Bonferroni correction)" : 'Mann-Whitney U or Kruskal-Wallis test'} on the order of their categories.`);
    if (used.has('ordTrend')) s.push('Ordinal variables were compared with the Chi-square test for trend (linear-by-linear association).');
    if (used.has('chiPost')) s.push(`When significant, qualitative variables were compared between each two groups ${used.has('chiNone') ? 'without correction for multiple comparisons' : `with ${used.has('chiHolm') ? 'Holm' : 'Bonferroni'} correction`}.`);
    if (o.effect) {
      const e = [];
      if (used.has('param')) e.push(k === 2 ? 'mean differences' : 'mean differences (Tukey-adjusted)');
      if (used.has('nonparam')) e.push('Hodges-Lehmann median differences');
      if (used.has('cat')) e.push(o.catEffect === 'or' ? 'odds ratios (OR)' : 'relative risks (RR)');
      if (e.length) s.push(`Effect estimates were reported as ${listJoin(e)} with 95% confidence intervals (CI).`);
    }
    const within = [];
    if (used.has('pairedt')) within.push('paired t-test for parametric data with two measurements');
    if (used.has('wilcoxon')) within.push('Wilcoxon signed-rank test for non-parametric data with two measurements');
    if (used.has('rmanova')) within.push(`repeated-measures ANOVA ${used.has('rmSph:hf') ? 'with Huynh-Feldt correction' : used.has('rmSph:none') ? 'assuming sphericity' : 'with Greenhouse-Geisser correction'} for parametric data`);
    if (used.has('friedman')) within.push('Friedman test for non-parametric data');
    if (within.length) s.push(`Changes over time${k > 1 ? ' within each group' : ''} were assessed using ${listJoin(within)}.`);
    const post = [];
    if (used.has('postPairedt')) post.push('paired t-tests');
    if (used.has('postWilcoxon')) post.push('Wilcoxon signed-rank tests');
    if (post.length) {
      const what = used.has('rmPost:all') ? 'all pairs of measurements were compared' : used.has('rmPost:consecutive') ? 'consecutive measurements were compared' : 'each measurement was compared with the first one';
      const adj = used.has('rmAdj:holm') ? ' with Holm correction' : used.has('rmAdj:none') ? ' without correction for multiple comparisons' : ' with Bonferroni correction';
      s.push(`${RO.always ? 'In addition' : 'When significant'}, ${what} using ${listJoin(post)}${adj}.`);
    }
    if (used.has('pearson') || used.has('spearman')) {
      const c = [];
      if (used.has('pearson')) c.push("Pearson's correlation coefficient (r) for normally distributed variables");
      if (used.has('spearman')) c.push(`Spearman's rank correlation coefficient (rs)${c.length ? ' otherwise' : ''}`);
      s.push(`Correlation between quantitative variables was assessed using ${c.join(' or ')}.`);
    }
    if (used.has('pairedAdv')) s.push('Two measurements of the same patients were compared using the paired t-test when their differences were normally distributed, or the Wilcoxon signed-rank test otherwise.');
    if (used.has('kendall')) s.push("Kendall's tau-b (τb) was used for correlation where chosen.");
    if (used.has('mixed')) s.push('The group × time interaction was assessed by mixed (split-plot) ANOVA with Greenhouse-Geisser correction.');
    if (used.has('ancova')) s.push('Analysis of covariance (ANCOVA) was used to compare groups after adjustment for covariates, reporting adjusted (estimated marginal) means with 95% CI and Bonferroni-adjusted pairwise comparisons.');
    if (used.has('survival')) s.push(k > 1 ? 'Survival was estimated by the Kaplan-Meier method and compared between groups using the log-rank test.' : 'Survival was estimated by the Kaplan-Meier method.');
    if (used.has('cox')) s.push('Cox proportional hazards regression was used to identify predictors of time to event, reporting hazard ratios (HR) with 95% CI.');
    if (used.has('mcnemar')) s.push('Changes in qualitative variables between two measurements were assessed using the McNemar test (exact binomial when discordant pairs were fewer than 25) or the McNemar-Bowker test for more than two categories.');
    if (used.has('kappa')) s.push(`Agreement between qualitative ratings was assessed using Cohen's kappa (κ) coefficient${used.has('kappaW') ? ', and the weighted kappa (κw) for ordered categories' : ''}.`);
    if (used.has('icc')) s.push(`Agreement between quantitative measurements was assessed using the intraclass correlation coefficient (ICC; ${used.has('iccC') ? 'two-way mixed effects, consistency' : 'two-way random effects, absolute agreement'}) and Bland-Altman analysis with 95% limits of agreement.`);
    if (used.has('diagnostic')) s.push('Diagnostic accuracy was expressed as sensitivity, specificity, positive and negative predictive values, likelihood ratios and accuracy, with exact (Clopper-Pearson) 95% CI.');
    if (used.has('cochran')) s.push("Repeated yes/no outcomes were compared across the measurements with Cochran's Q test.");
    if (used.has('noPBaseline')) s.push('As recommended by the CONSORT statement, baseline characteristics were described without significance tests.');
    const M8 = { poisson: 'Count outcomes were analysed with Poisson regression (incidence rate ratios).', negbin: 'Overdispersed count outcomes were analysed with negative binomial regression (incidence rate ratios).',
      ordinal: 'Ordered categorical outcomes were analysed with ordinal (proportional odds) logistic regression.', multinom: 'Unordered categorical outcomes were analysed with multinomial logistic regression.',
      passing: 'Agreement between methods was assessed with Passing-Bablok regression.', deming: 'Agreement between methods was assessed with Deming regression.',
      pca: "Principal component analysis with varimax rotation was used to explore the structure of the items (Kaiser-Meyer-Olkin measure and Bartlett's test of sphericity).",
      partial: 'Partial correlation was used to control for covariates.', anova2: 'Two-way ANOVA (type II sums of squares) tested the study group, a second factor and their interaction.',
      mediation: 'Mediation was tested with the product-of-coefficients method (Sobel test and percentile bootstrap CI of the indirect effect).',
      psm: 'Propensity scores from logistic regression were used for 1:1 nearest-neighbour matching within a caliper and for inverse probability of treatment weighting; balance was judged by standardized mean differences below 0.1.',
      lmmAdv: 'Repeated outcomes were analysed with linear mixed models with a random intercept per patient, adjusted for covariates.', interaction: 'Interaction terms were added to the regression models where stated.',
      optimism: 'Models were internally validated by bootstrapping (200 resamples) with optimism-corrected AUC.', nri: 'The added value of a predictor was assessed with the continuous net reclassification improvement (NRI) and the integrated discrimination improvement (IDI).',
      dca: 'Clinical usefulness was assessed with decision curve analysis (net benefit).' };
    Object.entries(M8).forEach(([k2, t]) => { if (used.has(k2)) s.push(t); });
    if (used.has('tost')) s.push('Equivalence was tested with two one-sided t-tests (TOST) against the stated margin, using the 90% confidence interval of the mean difference.');
    if (used.has('mh')) s.push('Odds ratios stratified by a third variable were pooled with the Mantel-Haenszel method, and their homogeneity checked with the Breslow-Day test.');
    if (used.has('clogit')) s.push('Matched case-control sets were analysed with conditional logistic regression.');
    if (used.has('cronbach')) s.push(`Internal consistency was assessed using Cronbach's alpha (α) coefficient${used.has('splitHalf') ? ' and split-half reliability with the Spearman-Brown correction' : ''}.`);
    if (used.has('ancovaSlopes')) s.push('The homogeneity of regression slopes was checked by the group × covariate interaction.');
    if (used.has('survPair')) s.push('When more than two groups were compared, pairwise log-rank tests were Bonferroni-adjusted.');
    if (used.has('regDiag')) s.push('Regression residuals were checked for independence (Durbin-Watson) and normality.');
    if (used.has('regRoc')) s.push('The discrimination of logistic models was assessed by the area under the ROC curve of their predicted probabilities.');
    if (used.has('sel_backward')) s.push(`Multivariable models were built by backward elimination (P to remove > ${P_REMOVE}).`);
    if (used.has('sel_forward')) s.push(`Multivariable models were built by forward selection (P to enter < ${P_ENTER}).`);
    if (used.has('linear')) s.push('Multiple linear regression was used to identify predictors of quantitative outcomes, reporting unstandardized (B) and standardized (β) coefficients with 95% CI.');
    if (used.has('logistic')) s.push('Binary logistic regression was used to identify predictors of binary outcomes, reporting odds ratios (OR) with 95% CI; model fit was assessed by the omnibus chi-square test and Nagelkerke R².');
    if (used.has('roc') || used.has('rocClosest')) {
      const cuts = Object.keys(ROC_CUT).filter(k => used.has('rocCut:' + k)).map(k => ROC_CUT[k][0]);
      s.push(`Receiver operating characteristic (ROC) curve analysis was used to assess diagnostic performance; the area under the curve (AUC) was reported with its 95% CI (DeLong method), and the optimal cut-off was chosen by ${cuts.join(' or ')}.`);
      if (used.has('rocCI')) s.push('Sensitivity and specificity at the cut-off were reported with exact (Clopper-Pearson) 95% CIs.');
      if (used.has('rocCombined')) s.push('The test variables were also combined into one score, the predicted probability of a logistic regression model.');
      if (used.has('rocCompare')) s.push('The AUCs were compared with the DeLong test for correlated ROC curves.');
    }
    if (used.has('clt')) s.push('Variables with at least 30 patients in every group were treated as normally distributed (central limit theorem).');
    if (used.has('mwExact') || used.has('mwPerm')) s.push(`For small samples (up to 50 patients), the Mann-Whitney U test used ${used.has('mwExact') && used.has('mwPerm') ? 'its exact distribution or, with ties, a permutation test (20,000 permutations)' : used.has('mwExact') ? 'its exact distribution' : 'a permutation test (20,000 permutations)'}.`);
    if (used.has('boot')) s.push('Confidence intervals of median differences were obtained by the percentile bootstrap (2,000 resamples).');
    if (used.has('ffh')) s.push('Tables larger than 2 × 2 with small expected counts were analysed with the Fisher-Freeman-Halton exact test (Monte Carlo, 50,000 tables).');
    if (used.has('groupTrend')) s.push('A trend across the ordered groups was tested with the Jonckheere-Terpstra test (numeric variables), the Cochran-Armitage test (two categories) or the linear-by-linear association test.');
    if (o.completeCase) s.push('Only patients with complete data in every analysed variable were included (complete-case analysis).');
    if (o.fdr) s.push('P values between the groups were adjusted for multiple comparisons across the report with the Benjamini-Hochberg false discovery rate.');
    if (+o.confLevel && +o.confLevel !== 95) s.push(`Confidence intervals are ${o.confLevel}%.`);
    s.push(`A ${used.has('oneSided') ? 'one' : 'two'} tailed P value ≤ ${o.alpha} was considered statistically significant${used.has('oneSided') ? ` (testing whether the first group was ${o.alternative === 'greater' ? 'greater' : 'less'} than the second)` : ''}.`);
    return s.join(' ');
  }

  // dates as ISO text, d/m/y text or Excel serial numbers → [year, month]
  function ymOf(v) {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number' && v > 20000 && v < 80000) { const d = new Date(Date.UTC(1899, 11, 30) + v * 864e5); return [d.getUTCFullYear(), d.getUTCMonth()]; }
    const s = String(v).trim(); let m = /^(\d{4})[-/.](\d{1,2})/.exec(s); if (m) return [+m[1], +m[2] - 1];
    m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})/.exec(s); if (m) { const y = +m[3] < 100 ? 2000 + +m[3] : +m[3]; return [y, +m[2] - 1]; }
    const t = Date.parse(s); if (isFinite(t)) { const d = new Date(t); return [d.getFullYear(), d.getMonth()]; }
    return null;
  }
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  function timelineSection(cfg, rows, groups, gl) {
    const col = cfg.timeline.col, ym = rows.map(r => ({ r, m: ymOf(r[col]) })).filter(x => x.m); if (ym.length < 3) return null;
    const key = m => m[0] * 12 + m[1], k0 = Math.min(...ym.map(x => key(x.m))), k1 = Math.max(...ym.map(x => key(x.m))); if (k1 - k0 > 120) return null;
    const months = Array.from({ length: k1 - k0 + 1 }, (_, i) => k0 + i), lab = k => `${MONTHS[k % 12]} ${Math.floor(k / 12)}`;
    const per = (groups.length > 1 ? groups : [null]).map(g => months.map(k => ym.filter(x => key(x.m) === k && (g === null || groupOf(cfg, x.r) === g)).length));
    let cum = 0; const tot = months.map((_, i) => per.reduce((t, p) => t + p[i], 0)), cumul = tot.map(v => (cum += v));
    const names = groups.length > 1 ? gl : ['Patients'];
    return { kind: 'timeline', title: `Enrolment of the patients over time (${lab(k0)} to ${lab(k1)})`, head: ['Month', ...names, ...(names.length > 1 ? ['Total'] : []), 'Cumulative'],
      rows: months.map((k, i) => [{ t: [lab(k)], b: true }, ...per.map(p => ({ t: [String(p[i])] })), ...(names.length > 1 ? [{ t: [String(tot[i])] }] : []), { t: [String(cumul[i])] }]),
      footnote: `Patients by the month of ${lowerFirst(plain(columnLabel(cfg, col)))}; ${rows.length - ym.length ? `${rows.length - ym.length} without a date` : 'every patient had a date'}.`,
      comment: `The ${ym.length} patients were enrolled over ${months.length} month${months.length > 1 ? 's' : ''}, from ${lab(k0)} to ${lab(k1)}, with a median of ${fmt(S.median(tot), 1)} patients per month.`,
      figures: [{ sig: true, caption: 'Number of patients enrolled per month', spec: { type: 'bar', categories: months.map(lab), yLabel: 'Patients enrolled', integer: true, series: per.map((p, i) => ({ name: names[i], values: p })), ...(names.length < 2 ? { legend: false } : {}) } }], meta: {} };
  }
  // caption of the flow diagram figure
  const FLOW_CAPTIONS = { consort: 'CONSORT flowchart of the enrolled patients', strobe: 'STROBE flow diagram of the study participants',
    stard: 'STARD flow diagram of the study participants', simple: 'Flowchart of the study participants', prisma: 'PRISMA 2020 flow diagram of the study selection',
    crossover: 'CONSORT flowchart of the crossover trial', cluster: 'CONSORT flowchart of the cluster-randomized trial' };
  const flowCaption = cfg => FLOW_CAPTIONS[(cfg.consort && cfg.consort.type) || 'consort'];

  function introText(cfg, gl, gN) {
    const c = cfg.consort, k = gl.length;
    if (!c || !c.enabled) return '';
    const type = c.type || 'consort';
    const ex = c.excluded.filter(e => +e.n > 0), exTotal = ex.reduce((s, e) => s + +e.n, 0);
    const exTxt = exTotal ? `; ${exTotal} were excluded (${ex.map(e => `${lowerFirst(e.text.trim())}: ${e.n}`).join('; ')})` : '';
    if (type === 'prisma') {
      const p = c.prisma || {}, v = x => +p[x] || 0, idf = v('db') + v('reg'), rem = v('dup') + v('auto') + v('other'), scr = idf - rem, sought = scr - v('scrExcl'), as = sought - v('notRetrieved');
      const rs = (p.reasons || []).filter(r => String(r.text).trim() && +r.n);
      return `The search identified ${idf} records (${v('db')} from databases and ${v('reg')} from registers); ${rem} were removed before screening${v('dup') ? ` (${v('dup')} duplicates)` : ''}. Of the ${scr} records screened, ${v('scrExcl')} were excluded. `
        + `${sought} reports were sought for retrieval${v('notRetrieved') ? `, of which ${v('notRetrieved')} could not be retrieved` : ''}, and ${as} were assessed for eligibility${rs.length ? `; ${rs.reduce((t, r) => t + +r.n, 0)} were excluded (${rs.map(r => `${lowerFirst(r.text.trim())}: ${r.n}`).join('; ')})` : ''}. `
        + `Finally, ${v('studies')} studies${v('reports') ? ` (${v('reports')} reports)` : ''} were included in the review.`;
    }
    if (type === 'crossover' || type === 'cluster') {
      const n = c.groups.map(g => +g.allocated || 0), cl = type === 'cluster' ? c.groups.map(g => +g.clusters || 0) : null;
      let t = `In this study, ${c.assessed} patients were assessed for eligibility${exTxt}. ${S.sum(n)} patients were randomized${cl ? ` in ${S.sum(cl)} clusters` : ''} to ${type === 'crossover' ? 'the treatment sequences' : 'the study groups'}: ${listJoin(gl.map((g, i) => `${n[i]} to ${g}${cl ? ` (${cl[i]} clusters)` : ''}`))}.`;
      if (type === 'crossover' && c.groups.some(g => g.p1 || g.p2)) t += ` ${gl.map((g, i) => `In sequence ${g}, patients received ${c.groups[i].p1 || 'the first treatment'} then, after ${c.washout ? `a washout of ${c.washout}` : 'a washout period'}, ${c.groups[i].p2 || 'the second treatment'}.`).join(' ')}`;
      const lost = c.groups.reduce((t2, g) => t2 + (+g.lost || 0), 0);
      if (lost) t += ` ${lost} patient${lost > 1 ? 's were' : ' was'} lost to follow-up.`;
      return t + ` Finally, ${listJoin(c.groups.map((g, i) => `${g.analysed} patients in ${gl[i]}`))} were analyzed.`;
    }
    if (type === 'simple') {
      const steps = c.steps.filter(st => String(st.text).trim());
      if (!steps.length) return '';
      const parts = steps.map(st => `${lowerFirst(st.text.trim())} (n=${+st.n || 0})${+st.exN > 0 ? `, with ${st.exN} ${st.exText ? lowerFirst(st.exText.trim()) : 'excluded'}` : ''}`);
      let t = `The flow of the study participants was as follows: ${parts.join('; then ')}.`;
      if (c.splitGroups && k > 1) t += ` Finally, ${c.groups.map((g, i) => `${g.analysed} patients in ${gl[i]}`).join(', ')} were analyzed.`;
      return t;
    }
    if (type === 'stard') {
      const b = c.stard.branches, n = x => +x || 0;
      const present = b.reduce((s, x) => s + n(x.present), 0), absent = b.reduce((s, x) => s + n(x.absent), 0), noRef = b.reduce((s, x) => s + n(x.noRef), 0);
      let t = `In this study, ${c.assessed} participants were potentially eligible${exTxt}. ${c.stard.tested} participants received the index test, which was positive in ${n(b[0].n)}, negative in ${n(b[1].n)}`;
      t += n(b[2].n) ? ` and inconclusive in ${n(b[2].n)}.` : '.';
      if (noRef) t += ` ${noRef} participant${noRef > 1 ? 's' : ''} did not receive the reference standard.`;
      return t + ` According to the reference standard, the target condition was present in ${present} and absent in ${absent} participants.`;
    }
    if (type === 'strobe') {
      const inc = c.groups.map(g => +g.allocated);
      let t = `In this study, ${c.assessed} individuals were potentially eligible${exTxt}. ${exTotal ? 'The remaining' : 'All'} ${S.sum(inc)} participants were included${k > 1 ? `: ${listJoin(gl.map((g, i) => `${inc[i]} in ${g}`))}` : ''}.`;
      const lost = c.groups.map((g, i) => ({ g: gl[i], n: +g.lost || 0, why: g.lostReason, ex: +g.excludedAnalysis || 0, exWhy: g.excludedReason }));
      if (lost.every(l => !l.n && !l.ex)) return t + ' All included participants were analyzed.';
      if (k === 1) {
        const l = lost[0];
        if (l.n) t += ` ${l.n} participant${l.n > 1 ? 's were' : ' was'} lost to follow-up or had missing data${l.why ? ` (${l.why.trim()})` : ''}.`;
        if (l.ex) t += ` ${l.ex} participant${l.ex > 1 ? 's were' : ' was'} excluded from analysis${l.exWhy ? ` (${l.exWhy.trim()})` : ''}.`;
        return t + ` Finally, ${c.groups[0].analysed} participants were analyzed.`;
      }
      lost.forEach(l => {
        if (l.n) t += ` In ${l.g}, ${l.n} participant${l.n > 1 ? 's were' : ' was'} lost to follow-up or had missing data${l.why ? ` (${l.why.trim()})` : ''}.`;
        if (l.ex) t += ` In ${l.g}, ${l.ex} participant${l.ex > 1 ? 's were' : ' was'} excluded from analysis${l.exWhy ? ` (${l.exWhy.trim()})` : ''}.`;
      });
      return t + ` Finally, ${c.groups.map((g, i) => `${g.analysed} participants in ${gl[i]}`).join(', ')} were analyzed.`;
    }
    let t = `In this study, ${c.assessed} patients were assessed for eligibility`;
    if (exTotal) t += `; ${exTotal} patients were excluded (${ex.map(e => `${lowerFirst(e.text.trim())}: ${e.n}`).join('; ')})`;
    const alloc = c.groups.map(g => +g.allocated);
    if (k === 1) {
      // one group: enrolled, followed up and analysed
      const g = c.groups[0], lost = +g.lost || 0, exA = +g.excludedAnalysis || 0;
      t += `. ${exTotal ? 'The remaining' : 'All'} ${alloc[0]} patients were enrolled.`;
      if (lost) t += ` ${lost} patient${lost > 1 ? 's were' : ' was'} lost to follow-up${g.lostReason ? ` (${g.lostReason.trim()})` : ''}.`;
      if (exA) t += ` ${exA} patient${exA > 1 ? 's were' : ' was'} excluded from analysis${g.excludedReason ? ` (${g.excludedReason.trim()})` : ''}.`;
      return t + (lost || exA ? ` Finally, ${g.analysed} patients were analyzed statistically.` : ' All enrolled patients were followed up and analyzed statistically.');
    }
    const equal = alloc.every(a => a === alloc[0]);
    t += `. ${exTotal ? 'The remaining' : 'All'} ${S.sum(alloc)} patients were randomly allocated into ${nWord(k)} ${equal ? `equal groups (${alloc[0]} patients in each)` : `groups (${gl.map((g, i) => `${g}: ${alloc[i]}`).join(', ')})`}.`;
    const lost = c.groups.map((g, i) => ({ g: gl[i], n: +g.lost || 0, why: g.lostReason, ex: +g.excludedAnalysis || 0, exWhy: g.excludedReason }));
    if (lost.every(l => !l.n && !l.ex)) t += ' All allocated patients were followed up and analyzed statistically.';
    else {
      lost.forEach(l => {
        if (l.n) t += ` In ${l.g}, ${l.n} patient${l.n > 1 ? 's were' : ' was'} lost to follow-up${l.why ? ` (${l.why.trim()})` : ''}.`;
        if (l.ex) t += ` In ${l.g}, ${l.ex} patient${l.ex > 1 ? 's were' : ' was'} excluded from analysis${l.exWhy ? ` (${l.exWhy.trim()})` : ''}.`;
      });
      t += ` Finally, ${c.groups.map((g, i) => `${g.analysed} patients in ${gl[i]}`).join(', ')} were analyzed statistically.`;
    }
    return t;
  }

  // intervals at another confidence level: every "95% CI" / "95% confidence" in the output takes the chosen level
  function relabelCI(x, c) {
    c = +c; if (!c || c === 95) return x;
    const seen = new Set(), re = /\b95% (CI|confidence)/g;
    const walk = o => { if (typeof o === 'string') return o.replace(re, `${c}% $1`); if (!o || typeof o !== 'object' || seen.has(o)) return o; seen.add(o);
      if ((typeof HTMLCanvasElement !== 'undefined' && o instanceof HTMLCanvasElement) || ArrayBuffer.isView(o)) return o;
      for (const k of Object.keys(o)) { const v = o[k]; if (typeof v === 'string' || (v && typeof v === 'object')) o[k] = walk(v); } return o; };
    return walk(x);
  }
  // finishing touches on every comment of the report: varied wording, plain language, your phrase dictionary, word limits and key findings
  const VARY = [
    [/\bwas (in|not )significantly different\b/g, ['did not differ significantly', 'showed no significant difference']],
    [/\bwere (in|not )significantly different\b/g, ['did not differ significantly', 'showed no significant differences']],
    [/\bwas significantly higher in\b/g, ['was significantly greater in']],
    [/\bwas significantly lower in\b/g, ['was significantly smaller in']],
    [/\bThe groups were comparable regarding\b/g, ['There was no significant difference between the groups regarding', 'The groups were similar regarding']]
  ];
  const sentencesOf = t => (String(t || '').match(/[^.!?]+(?:\.(?=\d)[^.!?]*)*[.!?]+(?:\s+|$)|[^.!?]+$/g) || []).map(x => x.trim()).filter(Boolean);
  const trimWords = (t, n) => { if (!n || !t) return t; const ss = sentencesOf(t), out = []; let w = 0;
    for (const x of ss) { const c = x.split(/\s+/).length; if (out.length && w + c > n) break; out.push(x); w += c; } return out.join(' '); };
  function polish(r, o) {
    if (!r || !r.sections) return r;
    const dict = String(o.phraseDict || '').split(/\n/).map(l => l.split(/\s*(?:=>|→)\s*/)).filter(x => x.length === 2 && x[0].trim()).map(([a, b]) => [a.trim(), b.trim()]);
    const seen = VARY.map(() => 0);
    const fix = t => {
      if (!t) return t;
      if (o.varyWording) VARY.forEach(([re, alts], i) => { t = t.replace(re, m => { const n = seen[i]++ % (alts.length + 1); return n === 0 ? m : alts[n - 1]; }); });
      if (o.commentTone === 'plain') t = t.replace(/\b(was|were) (in|not )significantly different\b/g, '$1 not clearly different').replace(/\bdid not differ significantly\b/g, 'did not clearly differ')
        .replace(/\bno significant difference/g, 'no clear difference').replace(/\binsignificant(ly)?\b/g, 'not clear$1').replace(/\bsignificantly\b/g, 'clearly').replace(/\bsignificant\b/g, 'clear');
      dict.forEach(([a, b]) => { t = t.split(a).join(b); });
      return t;
    };
    r.sections.forEach(sec => {
      sec.comment = trimWords(fix(sec.comment), +o.comMaxWords || 0); sec.autoComment = sec.comment;
      // numbered key findings: the sentences reporting a significant result
      if (o.keyFindings) sec.findings = sentencesOf(sec.comment).filter(x => /\b(significant(ly)?|clear(ly)?)\b/.test(x) && !/\b(in|not |non-)significant|no significant|not clear|no clear|insignificant/.test(x)).slice(0, 5);
    });
    ['summary', 'narrative'].forEach(kk => { if (r[kk]) r[kk] = fix(r[kk]); });
    if (r.abstract) r.abstract = trimWords(fix(r.abstract), +o.absMaxWords || 0);
    return r;
  }
  // per-figure settings of step 7 (log scale, shape), and the forest plot of every effect (standardized, two groups)
  function figExtras(r, cfg) {
    if (!r || !r.sections) return r;
    r.sections.forEach(sec => sec.figures.forEach(f => { const v = f.vid && cfg.variables.find(x => x.id === f.vid || String(f.vid).startsWith(x.id + '_')); if (!v) return;
      if (v.logY) f.spec.logY = true; if (v.aspect) f.spec.aspect = v.aspect; }));
    if (cfg.options.figForestAll) {
      const rowsF = [];
      r.sections.filter(s => s.kind === 'single' && s.meta && s.meta.res).forEach(s => s.meta.res.forEach(x => {
        if (x.gv && x.gv.length !== 2) return;
        if (x.num) { const [a, b] = x.num.desc; if (!(a.n > 1 && b.n > 1)) return; const N = a.n + b.n, sp = Math.sqrt(((a.n - 1) * a.sd ** 2 + (b.n - 1) * b.sd ** 2) / (N - 2)), g = (1 - 3 / (4 * N - 9)) * (a.mean - b.mean) / sp, se = Math.sqrt(N / (a.n * b.n) + g * g / (2 * N));
          if (isFinite(g)) rowsF.push({ label: plain(x.v.label), est: g, lo: g - S.ZC() * se, hi: g + S.ZC() * se, p: x.num.p, kind: 'Hedges g' }); }
        else if (x.cat && x.cat.table.length === 2) { let [[A, C]] = x.cat.table, [n1, n2] = x.cat.ns, B = n1 - A, D = n2 - C; if ([A, B, C, D].some(v => v === 0)) { A += 0.5; B += 0.5; C += 0.5; D += 0.5; }
          const lor = Math.log(A * D / (B * C)), se = Math.sqrt(1 / A + 1 / B + 1 / C + 1 / D), k2 = Math.sqrt(3) / Math.PI;
          if (isFinite(lor)) rowsF.push({ label: `${plain(x.v.label)} (${x.levels[0]})`, est: lor * k2, lo: (lor - S.ZC() * se) * k2, hi: (lor + S.ZC() * se) * k2, p: x.cat.p, kind: 'from the OR' }); }
      }));
      if (rowsF.length >= 2) {
        const gl = cfg.groupOrder.filter(g => cfg.groupInclude[g] !== false).map(g => cfg.groupLabels[g] || g), F2 = v => fmt(v, 2), al = cfg.options.alpha;
        r.sections.push({ kind: 'forestAll', title: `Standardized differences between ${gl[0]} and ${gl[1]}`, head: ['Variable', 'Standardized difference (95% CI)', 'Measure', 'P value'],
          rows: rowsF.map(q => [{ t: [q.label], b: true }, { t: [`${F2(q.est)} (${F2(q.lo)} to ${F2(q.hi)})`] }, { t: [q.kind] }, { t: [fmtP(q.p, al)] }]),
          footnote: `Positive values are higher in ${gl[0]}; binary variables are converted from the log odds ratio (× √3 / π, Chinn 2000).`, comment: '',
          figures: [{ sig: true, caption: `Forest plot of the standardized differences between ${gl[0]} and ${gl[1]}`, spec: { type: 'forest', ref: 0, xLabel: `Standardized difference (${gl[0]} − ${gl[1]})`, valHead: 'd (95% CI)', alpha: al,
            rows: rowsF.map(q => ({ label: q.label, est: q.est, lo: q.lo, hi: q.hi, p: q.p, text: `${F2(q.est)} (${F2(q.lo)} to ${F2(q.hi)})` })) } }], meta: {} });
      }
    }
    return r;
  }
  const run2 = (data, cfg) => polish(figExtras(relabelCI(run(data, cfg), cfg.options.confLevel), cfg), cfg.options), explore2 = (data, cfg, xo) => relabelCI(explore(data, cfg, xo), cfg.options.confLevel);
  return { run: run2, explore: explore2, relabelCI, trimWords, sentencesOf, parseValueLabels, withValueLabels, filterRows, filterText, FILTER_OPS, outFence, OUT_RULE, groupOf, ALL_GROUP, isGroupCol, normalityTest, significantSentences, fmt, fmtP, toNum, toCat, POSITIVE, NONNORMAL_SHARE, columnLabel, columnKind, levelsOf, isNumberColumn };
})();

/* Prof MSE Easy Stat — runs the analysis and builds report models (tables, comments, figures) */
const Analysis = (() => {
  const S = Stats;
  const POSITIVE = /^(yes|y|true|positive|present|1|done|completed|pos)$/i;
  const NONNORMAL_SHARE = 0.25;
  // normality test for the current run: Shapiro–Wilk (default) or Kolmogorov–Smirnov with Lilliefors correction
  const normalityTest = name => name === 'ks' ? S.lilliefors : S.shapiroWilk;
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
  // p-value as used inside sentences: "= 0.013" or "< 0.001"
  const pTxt = p => { const thr = 10 ** -FMT.pDig; return p < thr ? '< ' + pNum(thr) : '= ' + pNum(p); };
  const msd = (m, sdv, d) => FMT.mean === 'paren' ? `${fmt(m, d)} (${fmt(sdv, d)})` : `${fmt(m, d)} ± ${fmt(sdv, d)}`;
  const iqrTxt = (a, b, d) => FMT.iqr === 'bracket' ? `[${fmt(a, d)}, ${fmt(b, d)}]` : FMT.iqr === 'endash' ? `${fmt(a, d)}–${fmt(b, d)}` : `${fmt(a, d)} - ${fmt(b, d)}`;
  const medIqr = (dd, d) => FMT.iqr === 'bracket' ? `${fmt(dd.median, d)} ${iqrTxt(dd.q1, dd.q3, d)}` : `${fmt(dd.median, d)} (${iqrTxt(dd.q1, dd.q3, d)})`;
  const pctTxt = v => fmt(v, FMT.pct);
  const meanSdName = lower => (FMT.mean === 'paren' ? 'Mean (SD)' : 'Mean ± SD').replace(/^M/, lower ? 'm' : 'M');
  function listJoin(a) {
    if (a.length <= 1) return a.join('');
    return a.slice(0, -1).join(', ') + ' and ' + a[a.length - 1];
  }
  // names like "HbA1c", "sFlt1" or "CRP" keep their case at the start of a sentence and inside it
  const keepCase = s => /^\S*?([A-Z].*[A-Z]|\d)/.test(s.split(/\s/)[0].slice(1)) || /^[A-Z]{2,}/.test(s) || /^.[A-Z]/.test(s);
  const cap = s => s && !keepCase(s) ? s[0].toUpperCase() + s.slice(1) : s;
  // label without a trailing unit, for use inside sentences: "Age (years)" → "Age"
  const plain = s => s.replace(/\s*\([^)]*\)\s*$/, '');
  const lowerFirst = s => (s && !keepCase(s)) ? s[0].toLowerCase() + s.slice(1) : s;
  const nWord = n => NUMW[n] || String(n);
  // test names as written in the descriptive comments
  const TEST_NAME = { 't-test': 'independent t-test', 'Welch t-test': "Welch's t-test", ANOVA: 'one-way ANOVA', 'Welch ANOVA': "Welch's ANOVA", 'Mann-Whitney': 'Mann-Whitney U test',
    'Kruskal-Wallis': 'Kruskal-Wallis test', 'Chi-square': 'Chi-square test', "Fisher's exact": "Fisher's exact test" };
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
  function analyzeNumeric(groupVals, dist, used, opts) {
    const k = groupVals.length;
    const desc = groupVals.map(S.describe);
    const sw = groupVals.map(g => normality(g));
    const normal = sw.every(r => !r || r.p > 0.05);
    let param = dist === 'param' ? true : dist === 'nonparam' ? false : normal;
    if (groupVals.some(g => g.length < 2)) return { desc, sw, normal, param, p: NaN, pairs: [], test: '—' };
    const pr = pairs(k);
    let p, test, pw = [], stat = '—';
    if (param) {
      if (k === 2) {
        const lev = S.levene(groupVals), eq = !(lev < 0.05);
        const t = S.tTest(groupVals[0], groupVals[1], eq);
        p = t.p; test = eq ? 't-test' : 'Welch t-test'; stat = `t = ${fmt(t.t, 2)}`;
        used.add(eq ? 'ttest' : 'welch');
        pw = [{ i: 0, j: 1, p: t.p, diff: t.diff, lo: t.lo, hi: t.hi }];
      } else if (opts.welch && S.levene(groupVals) < 0.05) {
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
        const hl = S.hodgesLehmann(groupVals[0], groupVals[1]);
        pw = [{ i: 0, j: 1, p: m.p, ...hl }];
      } else {
        const kw = S.kruskalWallis(groupVals);
        p = kw.p; test = 'Kruskal-Wallis'; stat = `H = ${fmt(kw.H, 2)}`;
        used.add('kw');
        const dn = opts.dunn ? S.dunn(groupVals) : null;
        if (dn) used.add('dunn');
        pw = pr.map(([i, j], q) => ({ i, j, p: dn ? dn[q].p : S.mannWhitney(groupVals[i], groupVals[j]).p, ...S.hodgesLehmann(groupVals[i], groupVals[j]) }));
      }
      used.add('nonparam');
    }
    return { desc, sw, normal, param, p, test, stat, pairs: pw };
  }

  /* ---------- categorical analysis between groups ---------- */
  function analyzeCategorical(groupVals, levels, used, opts) {
    const k = groupVals.length;
    const table = levels.map(l => groupVals.map(g => g.filter(v => v === l).length));
    const ns = groupVals.map(g => g.length);
    const pct = table.map(r => r.map((c, j) => ns[j] ? 100 * c / ns[j] : 0));
    const nonEmpty = table.filter(r => S.sum(r) > 0);
    let p = NaN, test = '—', stat = '—';
    if (nonEmpty.length >= 2 && ns.filter(n => n > 0).length >= 2) {
      const cs = S.chiSquare(nonEmpty);
      p = cs.p; test = 'Chi-square'; used.add('chi'); stat = `χ² = ${fmt(cs.chi, 2)}`;
      if (opts.fisher && nonEmpty.length === 2 && k === 2 && cs.minE < 5) {
        p = S.fisher2x2(nonEmpty).p; test = "Fisher's exact"; used.add('fisher'); stat = 'FE';
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
    if (opts.chiPost && k > 2 && p <= opts.alpha) { catPairs = S.chiSquarePairwise(table, opts.fisher); used.add('chiPost'); }
    return { table, pct, ns, p, test, stat, rr, binary, pairs: catPairs };
  }

  /* ---------- within-group repeated measures ---------- */
  // Two timepoints → paired t / Wilcoxon; more → RM ANOVA / Friedman with Bonferroni post hoc vs the first timepoint
  function analyzeWithin(matrixByGroup, param, used, alpha) {
    return matrixByGroup.map(Y => {
      if (Y.length < 3) return { p: NaN };
      const col = j => Y.map(r => r[j]), T = Y[0].length;
      if (T === 2) {
        if (param) { used.add('pairedt'); return { ...S.pairedT(col(1), col(0)), test: 'Paired t-test' }; }
        used.add('wilcoxon'); return { ...S.wilcoxonSigned(col(1), col(0)), test: 'Wilcoxon' };
      }
      const omnibus = param ? { ...S.rmAnova(Y), test: 'RM ANOVA' } : { ...S.friedman(Y), test: 'Friedman' };
      used.add(param ? 'rmanova' : 'friedman');
      if (omnibus.p <= alpha) {
        used.add(param ? 'postPairedt' : 'postWilcoxon');
        omnibus.post = Array.from({ length: T - 1 }, (_, t) => {
          const raw = param ? S.pairedT(col(t + 1), col(0)).p : S.wilcoxonSigned(col(t + 1), col(0)).p;
          return { t: t + 1, p: S.bonferroni(raw, T - 1) };
        });
      }
      return omnibus;
    });
  }

  /* ---------- correlation among numeric variables (all patients pooled) ---------- */
  function analyzeCorrelation(items, alpha) {
    const pairsOut = [];
    for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
      const x = [], y = [];
      items[i].vals.forEach((v, r) => { if (isFinite(v) && isFinite(items[j].vals[r])) { x.push(v); y.push(items[j].vals[r]); } });
      const normal = [x, y].every(a => { const sw = normality(a); return !sw || sw.p > 0.05; });
      const res = normal ? S.pearson(x, y) : S.spearman(x, y);
      pairsOut.push({ i, j, ...res, method: normal ? 'pearson' : 'spearman', sig: res.p <= alpha });
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
    // post hoc versus the first timepoint, grouped by direction
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
    if (col === cfg.groupCol) return 'Group';
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
    if (col === cfg.groupCol) return cfg.groupOrder.filter(g => cfg.groupInclude[g] !== false);
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
    const name = l => col === cfg.groupCol ? (cfg.groupLabels[l] || l) : l;
    return { col, label, ref: name(ref), terms: lv.slice(1).map(l => ({ label: `${label} (${name(l)} vs ${name(ref)})`, get: r => +(toCat(r[col]) === l) })),
      ok: r => lv.includes(toCat(r[col])) };
  }

  // "Sepsis group" when the outcome is the study group itself, otherwise "<outcome> (<positive value>)"
  const eventName = (cfg, a) => a.outcome === cfg.groupCol ? (cfg.groupLabels[a.positive] || a.positive) : `${lowerFirst(columnLabel(cfg, a.outcome))} (${a.positive})`;

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

  function regressionSection(a, cfg, rows, alpha, d, used) {
    const logistic = a.type === 'logistic';
    const outLabel = columnLabel(cfg, a.outcome);
    const preds = a.predictors.filter(c => c !== a.outcome).map(c => encode(cfg, rows, c)).filter(e => e.terms.length);
    if (!preds.length) return null;
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
        // classification table at a predicted probability of 0.5
        let tp = 0, fp = 0, fn = 0, tn = 0;
        multi.fitted.forEach((pr, i) => { const yes = pr >= 0.5; if (multi.y[i]) yes ? tp++ : fn++; else yes ? fp++ : tn++; });
        f.push(`Classification at a predicted probability of 0.5: ${tp} of ${tp + fn} with ${outLabel} = ${a.positive} (sensitivity ${fmt(tp + fn ? 100 * tp / (tp + fn) : 0, 1)}%) and ${tn} of ${tn + fp} without (specificity ${fmt(tn + fp ? 100 * tn / (tn + fp) : 0, 1)}%) correctly classified`);
      }
      if (logistic && a.hl) { const h = S.hosmerLemeshow(multi.y, multi.fitted); f.push(`Hosmer-Lemeshow χ²(${h.df}) = ${fmt(h.chi, 2)}, P ${pTxt(h.p)}${h.p > alpha ? ' (good fit)' : ' (poor fit)'}`); }
      if (showVif) f.push('VIF: Variance inflation factor (values above 5 suggest collinearity)');
    }
    if (methodNote(a.method)) f.push(methodNote(a.method));
    const refs = preds.filter(e => e.ref).map(e => `${e.label}: reference = ${e.ref}`);
    if (refs.length) f.push(refs.join(', '));
    // comment
    const what = logistic ? eventName(cfg, a) : lowerFirst(plain(outLabel));
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
    if (uni && multi && preds.length > 1) {
      if (uSig.length) sent.unshift(`In univariable analysis, ${listJoin(uSig.map(x => lowerFirst(x.label)))} ${uSig.length > 1 ? 'were' : 'was'} significantly associated with ${what}.`);
    }
    return {
      kind: 'regression', title: `${logistic ? 'Logistic' : 'Linear'} regression analysis for prediction of ${logistic ? eventName(cfg, a) : lowerFirst(outLabel)}`,
      head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { multi, uni }
    };
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
    const head = ['', 'AUC (95% CI)', 'P value', 'Cut-off', 'Sensitivity', 'Specificity', 'PPV', 'NPV', 'Accuracy'];
    if (a.lr) head.push('LR+', 'LR−');
    if (a.youdenCol) head.push('Youden index');
    if (a.ci) used.add('rocCI');
    const cutTxt = x => x.combined ? `> ${fmt(x.r.cutoff.cut, 3)}` : `${x.r.cutoff.inclusive ? (x.r.higher ? '≥' : '≤') : (x.r.higher ? '>' : '≤')} ${fmt(x.r.cutoff.cut, d)}`;
    const trows = res.map(x => {
      const { label, r } = x;
      if (!r) return [{ t: [label], b: true }, { t: ['—'], span: head.length - 1 }];
      const c = r.cutoff, row = [{ t: [label], b: true }, { t: [`${fmt(r.auc, 3)} (${fmt(r.lo, 3)}-${fmt(r.hi, 3)})`] }, { t: [fmtP(r.p, alpha)] },
        { t: [cutTxt(x)] }, { t: a.ci ? [pct(c.sens), ci(c.sensLo, c.sensHi)] : [pct(c.sens)] }, { t: a.ci ? [pct(c.spec), ci(c.specLo, c.specHi)] : [pct(c.spec)] },
        { t: [pct(c.ppv)] }, { t: [pct(c.npv)] }, { t: [pct(c.accuracy)] }];
      if (a.lr) row.push({ t: [lrTxt(c.lrPos)] }, { t: [lrTxt(c.lrNeg)] });
      if (a.youdenCol) row.push({ t: [fmt(c.youden, 3)] });
      return row;
    });
    const grade = auc => auc >= 0.9 ? 'excellent' : auc >= 0.8 ? 'good' : auc >= 0.7 ? 'fair' : auc >= 0.6 ? 'poor' : 'failed';
    const what = eventName(cfg, a);
    const sent = res.filter(x => x.r).map(x => {
      const { label, r } = x, nm = x.combined ? 'The combined model of all test variables' : cap(plain(label));
      const extra = (a.ci ? ` (95% CI ${fmt(100 * r.cutoff.sensLo, 1)}-${fmt(100 * r.cutoff.sensHi, 1)}%)` : '');
      const extraS = (a.ci ? ` (95% CI ${fmt(100 * r.cutoff.specLo, 1)}-${fmt(100 * r.cutoff.specHi, 1)}%)` : '');
      const lrs = a.lr ? `, with LR+ of ${lrTxt(r.cutoff.lrPos)} and LR− of ${lrTxt(r.cutoff.lrNeg)}` : '';
      return r.p <= alpha
        ? `${nm} ${r.higher || x.combined ? '' : '(lower values) '}could significantly predict ${what} with ${grade(r.auc)} discrimination (AUC = ${fmt(r.auc, 3)}, 95% CI ${fmt(r.lo, 3)}-${fmt(r.hi, 3)}, P value ${pTxt(r.p)}); at a cut-off of ${cutTxt(x)}${x.combined ? ' (predicted probability)' : ''}, sensitivity was ${pct(r.cutoff.sens)}${extra} and specificity was ${pct(r.cutoff.spec)}${extraS}${lrs}.`
        : `${nm} could not significantly predict ${what} (AUC = ${fmt(r.auc, 3)}, P value ${pTxt(r.p)}).`;
    });
    res.filter(x => !x.r).forEach(x => sent.push(`The ROC curve of ${lowerFirst(plain(x.label))} could not be estimated: fewer than two patients with or without ${what}.`));
    const f = [`*: Significant as P value ≤ ${alpha}`, 'AUC: Area under the curve', 'CI: Confidence interval (DeLong)', 'PPV: Positive predictive value', 'NPV: Negative predictive value', ROC_CUT[cutM][1]];
    if (res.some(x => x.r && x.r.cutoff.fallback)) f.push(`${listJoin(res.filter(x => x.r && x.r.cutoff.fallback).map(x => x.combined ? 'combined model' : plain(x.label)))}: no cut-off reached the target, Youden index used`);
    if (a.ci) f.push('Sensitivity and specificity with exact (Clopper-Pearson) 95% CI');
    if (a.lr) f.push('LR+: Positive likelihood ratio', 'LR−: Negative likelihood ratio');
    if (a.youdenCol) f.push('Youden index: sensitivity + specificity − 1');
    if (combo) f.push('Combined model: predicted probability of a logistic regression including all test variables');
    if (res.some(x => x.r && !x.r.higher && !x.combined)) f.push('≤: lower values predict the outcome');
    const ok = res.filter(x => x.r);
    const n1 = ok.length ? ok[0].r.n1 : 0, n0 = ok.length ? ok[0].r.n0 : 0;
    const sec = {
      kind: 'roc', title: `Diagnostic performance for prediction of ${what}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '),
      figures: ok.length ? [{ sig: ok.some(x => x.r.p <= alpha), caption: `ROC curve for prediction of ${what}`,
        spec: { type: 'roc', series: ok.map(x => ({ name: `${x.combined ? 'Combined model' : plain(x.label)} (AUC = ${fmt(x.r.auc, 3)})`, points: x.r.points,
          ...(a.showCut ? { cut: { fpr: 1 - x.r.cutoff.spec, tpr: x.r.cutoff.sens, label: x.combined ? '' : cutTxt(x) } } : {}) })), note: `n = ${n1} with, ${n0} without` } }] : [],
      meta: { res }
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
    const gi = rs.map(r => groups.indexOf(toCat(r[cfg.groupCol])));
    const y = rs.map(r => toNum(r[a.outcome])), X = rs.map(r => covs.flatMap(e => e.terms.map(t => t.get(r))));
    const byG = gl.map((_, g) => y.filter((_, i) => gi[i] === g));
    if (byG.some(v => v.length < 2)) return null;
    const res = S.ancova(y, gi, X, k);
    if (!res) return null;
    used.add('ancova');
    const tc = jStat.studentt.inv(0.975, res.df2), unadj = S.anova(byG).p;
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
    const lab = plain(outLabel), sig = res.p <= alpha;
    const sent = [`After adjustment for ${covLabels.length ? listJoin(covLabels) : 'the covariates'}, ${lowerFirst(lab)} was ${sig ? 'significantly' : 'insignificantly'} different ${amongTxt(k)} (P value ${pTxt(res.p)}).`];
    if (sig) {
      const sp = res.pairs.filter(q => q.p <= alpha);
      if (k === 2) sent.push(`The adjusted mean was ${res.pairs[0].diff < 0 ? 'lower' : 'higher'} in ${gl[0]} than ${gl[1]} by ${fmt(Math.abs(res.pairs[0].diff), d)} (95% CI ${fmt(res.pairs[0].lo, d)} to ${fmt(res.pairs[0].hi, d)}).`);
      else if (sp.length) sent.push(`Adjusted means differed significantly between ${pairList(sp, gl)} (P value ${pList(sp.map(q => q.p))}).`);
    }
    return { kind: 'ancova', title: `${outLabel} of the studied groups adjusted for covariates (ANCOVA)`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { res } };
  }

  // Kaplan–Meier survival by study group with the log-rank test
  function survivalSection(a, cfg, rows, alpha, d, used, G) {
    const { gl, groups } = G, k = gl.length;
    const timeLabel = columnLabel(cfg, a.outcome), evLabel = columnLabel(cfg, a.event);
    const rs = rows.filter(r => isFinite(toNum(r[a.outcome])) && toNum(r[a.outcome]) >= 0 && toCat(r[a.event]) !== null);
    const T = gl.map((_, g) => rs.filter(r => toCat(r[cfg.groupCol]) === groups[g]));
    if (T.some(x => !x.length)) return null;
    const times = T.map(x => x.map(r => toNum(r[a.outcome]))), ev = T.map(x => x.map(r => toCat(r[a.event]) === a.positive));
    const km = times.map((t, g) => S.kaplanMeier(t, ev[g])), lr = S.logRank(times, ev);
    used.add('survival');
    const at = a.at !== undefined && String(a.at).trim() !== '' && isFinite(+a.at) ? +a.at : null;
    const survAt = m => { let sv = 1; for (const q of m.steps) if (q.t <= at) sv = q.s; return sv; };
    const unit = ((timeLabel.match(/\(([^)]*)\)\s*$/) || [])[1] || '').trim(), u = unit ? ' ' + unit : '';
    const head = ['', 'n', 'Events (%)', `Median survival${unit ? ` (${unit})` : ''}`, ...(at !== null ? [`Survival at ${fmt(at, d)}${u}`] : []), 'Log-rank P'];
    const trows = km.map((m, g) => {
      const row = [{ t: [gl[g]], b: true }, { t: [String(m.n)] }, { t: [`${m.events} (${fmt(100 * m.events / m.n, 1)}%)`] }, { t: [isFinite(m.median) ? fmt(m.median, d) : 'Not reached'] }];
      if (at !== null) row.push({ t: [`${fmt(100 * survAt(m), 1)}%`] });
      if (g === 0) row.push({ t: [fmtP(lr.p, alpha)], rs: k });
      return row;
    });
    const med = m => isFinite(m.median) ? fmt(m.median, d) : 'not reached';
    const sent = [km.every(m => !isFinite(m.median)) ? `The median time to ${lowerFirst(plain(evLabel))} was not reached in any group.`
      : `The median time to ${lowerFirst(plain(evLabel))} was ${listJoin(km.map((m, g) => `${med(m)}${isFinite(m.median) ? u : ''} in ${gl[g]}`))}.`,
      `Survival was ${lr.p <= alpha ? 'significantly' : 'insignificantly'} different ${amongTxt(k)} (log-rank P value ${pTxt(lr.p)}).`];
    if (at !== null) sent.push(`At ${fmt(at, d)}${u}, the estimated survival was ${listJoin(km.map((m, g) => `${fmt(100 * survAt(m), 1)}% in ${gl[g]}`))}.`);
    const f = [`Event: ${evLabel} = ${a.positive}; other patients are censored at their last follow-up`, `Log-rank χ²(${lr.df}) = ${fmt(lr.chi, 2)}`];
    if (lr.p <= alpha) f.unshift(`*: Significant as P value ≤ ${alpha}`);
    return {
      kind: 'survival', title: `Kaplan-Meier survival analysis (${evLabel}) of the studied groups`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '),
      figures: [{ sig: lr.p <= alpha, caption: `Kaplan-Meier curves of ${lowerFirst(evLabel)}-free survival in the studied groups`,
        spec: { type: 'km', xLabel: timeLabel, series: km.map((m, g) => ({ name: gl[g], steps: m.steps, censored: m.censored })), note: `Log-rank P ${pTxt(lr.p)}` } }],
      meta: { km, lr }
    };
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
    return { kind: 'cox', title: `Cox regression analysis for prediction of ${what}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { multi, uni } };
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
    const sets = [...gl.map((g, i) => ({ name: g, rs: rs.filter(r => toCat(r[cfg.groupCol]) === groups[i]) })), { name: 'All patients', rs }];
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
    return { kind: 'mcnemar', title: `${plain(l1)} versus ${lowerFirst(plain(l2))} in the studied groups (paired comparison)`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { res } };
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
    const f = [`κ: Cohen's kappa`, 'CI: Confidence interval', 'Interpretation (Landis & Koch): ≤0.20 slight, 0.21-0.40 fair, 0.41-0.60 moderate, 0.61-0.80 substantial, >0.80 almost perfect'];
    const sent = [`The agreement between ${lowerFirst(plain(l1))} and ${lowerFirst(plain(l2))} was ${grade(k.kappa)} (observed agreement ${fmt(100 * k.po, 1)}%, κ = ${fmt(k.kappa, 3)}, 95% CI ${fmt(k.lo, 3)} to ${fmt(k.hi, 3)}, P value ${pTxt(k.p)}).`];
    return { kind: 'kappa', title: `Agreement between ${lowerFirst(plain(l1))} and ${lowerFirst(plain(l2))}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { k } };
  }

  // ICC and Bland–Altman agreement between two numeric methods / raters
  function agreementSection(a, cfg, rows, alpha, d, used) {
    if (!a.second) return null;
    const l1 = columnLabel(cfg, a.outcome), l2 = columnLabel(cfg, a.second);
    const rs = rows.filter(r => isFinite(toNum(r[a.outcome])) && isFinite(toNum(r[a.second])));
    if (rs.length < 3) return null;
    const x = rs.map(r => toNum(r[a.outcome])), y = rs.map(r => toNum(r[a.second]));
    const ic = S.icc(x.map((v, i) => [v, y[i]])), ba = S.blandAltman(x, y), dx = S.describe(x), dy = S.describe(y);
    used.add('icc');
    const ci = (lo, hi, dd = d) => `${fmt(lo, dd)} to ${fmt(hi, dd)}`;
    const head = ['', 'Value', '95% CI', 'P value'];
    const trows = [
      [{ t: [`${plain(l1)} (${meanSdName(true)})`], b: true }, { t: [msd(dx.mean, dx.sd, d)] }, { t: ['—'] }, { t: ['—'] }],
      [{ t: [`${plain(l2)} (${meanSdName(true)})`], b: true }, { t: [msd(dy.mean, dy.sd, d)] }, { t: ['—'] }, { t: ['—'] }],
      [{ t: ['Mean difference (bias)'], b: true }, { t: [fmt(ba.bias, d)] }, { t: [ci(ba.biasLo, ba.biasHi)] }, { t: [fmtP(ba.p, alpha)] }],
      [{ t: ['95% limits of agreement'], b: true }, { t: [ci(ba.lo, ba.hi)] }, { t: ['—'] }, { t: ['—'] }],
      [{ t: ['ICC, single measures'], b: true }, { t: [fmt(ic.single, 3)] }, { t: [ci(ic.lo, ic.hi, 3)] }, { t: [fmtP(ic.p, alpha)] }],
      [{ t: ['ICC, average measures'], b: true }, { t: [fmt(ic.average, 3)] }, { t: [ci(ic.loAvg, ic.hiAvg, 3)] }, { t: [fmtP(ic.p, alpha)] }]
    ];
    const grade = v => v < 0.5 ? 'poor' : v < 0.75 ? 'moderate' : v < 0.9 ? 'good' : 'excellent';
    const f = [`*: Significant as P value ≤ ${alpha}`, `n = ${rs.length}`, `Bias = ${plain(l1)} − ${plain(l2)} (P by paired t-test)`, 'ICC: Intraclass correlation coefficient (two-way random effects, absolute agreement)', 'Interpretation (Koo & Li): <0.5 poor, 0.5-0.75 moderate, 0.75-0.9 good, >0.9 excellent'];
    const sent = [`The agreement between ${lowerFirst(plain(l1))} and ${lowerFirst(plain(l2))} was ${grade(ic.single)} (ICC = ${fmt(ic.single, 3)}, 95% CI ${ci(ic.lo, ic.hi, 3)}).`,
      `The mean difference was ${fmt(ba.bias, d)} (95% CI ${ci(ba.biasLo, ba.biasHi)}${ba.p <= alpha ? ', significantly different from zero' : ''}), with 95% limits of agreement from ${ci(ba.lo, ba.hi)}.`];
    return {
      kind: 'agreement', title: `Agreement between ${lowerFirst(plain(l1))} and ${lowerFirst(plain(l2))}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '),
      figures: [{ sig: true, caption: `Bland-Altman plot of ${lowerFirst(plain(l1))} versus ${lowerFirst(plain(l2))}`,
        spec: { type: 'ba', x: ba.means, y: ba.diffs, bias: ba.bias, lo: ba.lo, hi: ba.hi, xLabel: `Mean of ${plain(l1)} and ${plain(l2)}`, yLabel: `Difference (${plain(l1)} − ${plain(l2)})`, dec: d } }],
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
    const refName = a.outcome === cfg.groupCol ? (cfg.groupLabels[a.positive] || a.positive) : `${lowerFirst(plain(refLabel))} (${a.positive})`;
    const f = [`Index test: ${idxLabel} = ${a.eventPositive}`, `Reference standard: ${refLabel} = ${a.positive}`, `TP = ${tp}, FP = ${fp}, FN = ${fn}, TN = ${tn}`,
      'CIs for proportions are exact (Clopper-Pearson), for likelihood ratios by the log method'];
    const sent = [`For the detection of ${refName}, ${lowerFirst(plain(idxLabel))} (${a.eventPositive}) had a sensitivity of ${pc(x.sens)} (95% CI ${pci(x.sens)}) and a specificity of ${pc(x.spec)} (95% CI ${pci(x.spec)}), with a positive predictive value of ${pc(x.ppv)}, a negative predictive value of ${pc(x.npv)} and an overall accuracy of ${pc(x.accuracy)}.`];
    if (isFinite(x.lrPos.v)) sent.push(`The positive and negative likelihood ratios were ${r2(x.lrPos)} and ${r2(x.lrNeg)} respectively.`);
    return { kind: 'diagnostic', title: `Diagnostic accuracy of ${lowerFirst(plain(idxLabel))} for ${refName}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { x } };
  }

  // Cronbach's alpha for a set of numeric items (questionnaire reliability)
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
    const weak = cols.filter((_, i) => res.items[i].alphaDeleted > res.alpha).map(c => lowerFirst(plain(columnLabel(cfg, c))));
    const sent = [`The internal consistency of the ${res.k} items was ${grade(res.alpha)} (Cronbach's α = ${fmt(res.alpha, 3)}, 95% CI ${fmt(res.lo, 3)} to ${fmt(res.hi, 3)}, n = ${res.n}).`];
    if (weak.length) sent.push(`Removing ${listJoin(weak)} would increase α.`);
    const f = [`n = ${res.n} patients with complete answers`, 'CI by the Feldt method', 'Interpretation: ≥0.9 excellent, 0.8-0.9 good, 0.7-0.8 acceptable, 0.6-0.7 questionable, 0.5-0.6 poor'];
    return { kind: 'cronbach', title: `Reliability (internal consistency) of the ${res.k} items`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '), figures: [], meta: { res } };
  }

  /* ---------- main ---------- */
  function run(data, cfg) {
    const opts = cfg.options, alpha = opts.alpha, d = opts.decimals;
    // descriptive: the detailed comment plus the test used, effect sizes, values of every group and an overview of each table
    const descriptive = opts.commentStyle === 'descriptive', detailed = opts.commentStyle === 'detailed' || descriptive;
    const wantEff = opts.commentEffect || descriptive;
    normality = normalityTest(opts.normality);
    const wording = s => {
      if (opts.notSig) s = s.replace(/insignificant(ly)?/g, 'not significant$1');
      if (opts.pWord && opts.pWord !== 'P value') s = s.replace(/\bP value\b/g, opts.pWord);
      return s;
    };
    FMT = { pDig: +opts.pDigits || 3, sig: opts.sigSym ?? '*', mean: opts.meanStyle || 'pm', iqr: opts.iqrStyle || 'dash', pct: opts.pctDecimals ?? 1, pLead: opts.pLead !== false && +opts.pLead !== 0 };
    const used = new Set();
    // error bars of mean charts: SD (default), SEM or 95% CI of the mean
    const errOf = dd => opts.errorBar === 'sem' ? dd.sd / Math.sqrt(dd.n)
      : opts.errorBar === 'ci' ? jStat.studentt.inv(0.975, dd.n - 1) * dd.sd / Math.sqrt(dd.n) : dd.sd;
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
    const rows = data.rows.filter(r => groups.includes(toCat(r[cfg.groupCol])));
    const byGroup = groups.map(g => rows.filter(r => toCat(r[cfg.groupCol]) === g));
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

    function footnote(flags, note) {
      const f = [];
      if (flags.sig) f.push(`*: Significant as P value ≤ ${alpha}`);
      const dp = [];
      if (flags.param) dp.push(meanSdName(true));
      if (flags.nonparam) dp.push(FMT.iqr === 'bracket' ? 'median [IQR]' : 'median (IQR)');
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
      if (opts.missingNote && flags.missing) f.push(flags.missing.length ? `Missing data: ${flags.missing.join(', ')}` : 'No missing data');
      if (note) f.push(note);
      return f.join(', ') + '.';
    }
    // missing values of one column among the analysed patients
    const missingIn = (col, numeric) => byGroup.flat().filter(r => numeric ? !isFinite(toNum(r[col])) : toCat(r[col]) === null).length;

    const groupHeads = gl.map((g, i) => opts.nHead === false ? g : `${g} (n=${gN[i]})`);

    for (const b of blocks) {
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
        const anySig = results.some(r => r.p <= alpha);
        const showPost = numbered && anySig;
        const head = ['', ...groupHeads, 'P value'];
        if (opts.showStat) head.push('Test');
        if (showPost) head.push('Post hoc');
        if (opts.effect) head.push('MD (95% CI)');
        const trows = results.map((r, t) => {
          const cells = [{ t: [tps[t]], b: true }];
          r.desc.forEach(dd => cells.push({ t: [param ? msd(dd.mean, dd.sd, d) : medIqr(dd, d)] }));
          cells.push({ t: [fmtP(r.p, alpha)] });
          if (opts.showStat) cells.push({ t: [r.stat], small: true });
          if (showPost) cells.push({ t: r.p <= alpha ? postHocLines(r) : ['---'], small: true });
          if (opts.effect) cells.push({ t: effectLines(r), small: true });
          return cells;
        });
        let within = null, withinNote = '';
        if (opts.within && v.cols.length >= 2) {
          const mats = byGroup.map(rs => rs.map(r => v.cols.map(c => toNum(r[c.col]))).filter(a => a.every(isFinite)));
          within = analyzeWithin(mats, param, used, alpha);
          const filler = () => ({ t: [''], span: head.length - 1 - k });
          trows.push([{ t: ['P (within group)'], b: true }, ...within.map(w => ({ t: [fmtP(w.p, alpha)] })), filler()]);
          const hasPost = within.some(w => w.post);
          if (hasPost) for (let t = 1; t < tps.length; t++)
            trows.push([{ t: [`P (${tps[t]} vs ${tps[0]})`], b: true }, ...within.map(w => ({ t: [w.post ? fmtP(w.post[t - 1].p, alpha) : '---'] })), filler()]);
          withinNote = `P (within group): change over time within each group by ${tps.length === 2 ? (param ? 'paired t-test' : 'Wilcoxon signed-rank test') : (param ? 'repeated-measures ANOVA' : 'Friedman test')}`;
          if (hasPost) withinNote += `, P (… vs ${tps[0]}): Bonferroni-adjusted ${param ? 'paired t-test' : 'Wilcoxon signed-rank test'} versus ${tps[0]}`;
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
        let comment = repeatedComment(plain(v.label), tps, results, gl, alpha, detailed);
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
          kind: 'repeated', title: `${v.label} of the studied groups`, head, rows: trows,
          footnote: footnote({ sig: sigAny, param, nonparam: !param, effect: opts.effect, posthoc: showPost, stats: results.map(r => r.stat),
            missing: v.cols.map((c, t) => [tps[t], missingIn(c.col, true)]).filter(x => x[1]).map(([t, m]) => `${t} (n=${m})`) }, [withinNote, v.note].filter(Boolean).join(', ')),
          comment: wording(comment), brief: opts.paperStyle ? wording(briefRepeated(plain(v.label), tps, results, within, gl, alpha, param, d)) : '', briefSig: !!sigAny,
          figures: v.chart === 'none' ? [] : [(() => {
            // per-variable chart type overrides the global chart style
            const ct = v.chart && v.chart !== 'auto' ? v.chart : opts.chartStyle;
            const meanChart = ct === 'bar' || ct === 'line' || (ct === 'auto' && param);
            return {
            sig: sigAny, vid: v.id,
            caption: v.caption || `${v.label} of the studied groups${meanChart && param ? errNote : ''}`,
            spec: meanChart
              ? { type: ct === 'line' ? 'line' : 'bar', categories: tps, yLabel: v.ylabel || v.label, xLabel: 'Time', ...marks, ...(ct === 'line' ? {} : valueLabels),
                  series: withN(gl, gN).map((g, i) => ({ name: g, values: results.map(r => param ? r.desc[i].mean : r.desc[i].median),
                    err: results.map(r => param ? errOf(r.desc[i]) : null), lo: param ? null : results.map(r => r.desc[i].q1), hi: param ? null : results.map(r => r.desc[i].q3) })) }
              : { type: 'box', categories: tps, yLabel: v.ylabel || v.label, points: opts.points || ct === 'dot', ...marks, series: withN(gl, gN).map((g, i) => ({ name: g, data: per.map(gv => gv[i]) })) }
            };
          })()],
          meta: { param, results, within, tps }
        });
      } else {
        // a table of single-measurement variables (baseline or other outcomes)
        const res = b.vars.map(v => {
          if (v.type === 'numeric') {
            const gv = byGroup.map(rs => rs.map(r => toNum(r[v.cols[0].col])).filter(isFinite));
            return { v, num: analyzeNumeric(gv, v.dist, used, opts), gv };
          }
          const gv = byGroup.map(rs => rs.map(r => toCat(r[v.cols[0].col])).filter(x => x !== null));
          const present = [...new Set(gv.flat())];
          let levels = (v.levels && v.levels.length ? v.levels.filter(l => present.includes(l)) : []);
          present.forEach(l => { if (!levels.includes(l)) levels.push(l); });
          return { v, cat: analyzeCategorical(gv, levels, used, opts), levels, gv };
        });
        const anySig = res.some(r => (r.num || r.cat).p <= alpha);
        const showPost = numbered && res.some(r => r.num ? r.num.p <= alpha : !!r.cat.pairs);
        const hasNum = res.some(r => r.num), hasCat = res.some(r => r.cat);
        const hasRR = opts.effect && res.some(r => r.cat && r.cat.binary);
        const twoCol = res.some(r => r.num || (r.cat && !isCompact(r)));
        const effHead = hasNum && hasRR ? `MD/${EF} (95% CI)` : hasRR ? `${EF} (95% CI)` : 'MD (95% CI)';
        const totalCol = !!opts.totalCol;
        const head = [{ t: '', span: twoCol ? 2 : 1 }, ...groupHeads, ...(totalCol ? [opts.nHead === false ? 'Total' : `Total (n=${rows.length})`] : []), 'P value'];
        if (opts.showStat) head.push('Test');
        // the Total column: every analysed patient, whatever the group
        const totDesc = r => S.describe(r.gv.flat());
        const totCat = (r, li) => { const cnt = S.sum(r.cat.table[li]), n = S.sum(r.cat.ns); return `${cnt} (${pctTxt(n ? 100 * cnt / n : 0)}%)`; };
        const tot = (on, f) => totalCol ? [{ t: [on ? f() : ''] }] : [];
        if (showPost) head.push('Post hoc');
        if (opts.effect) head.push(effHead);
        const trows = [];
        const tail = (r, span) => {
          const cells = [{ t: [fmtP((r.num || r.cat).p, alpha)], rs: span }];
          if (opts.showStat) cells.push({ t: [(r.num || r.cat).stat], rs: span, small: true });
          if (showPost) cells.push({ t: r.num && r.num.p <= alpha ? postHocLines(r.num) : r.cat && r.cat.pairs ? postHocLines(r.cat) : ['---'], rs: span, small: true });
          if (opts.effect) cells.push({ t: r.num ? effectLines(r.num) : (r.cat.binary ? rrLines(r.cat) : ['---']), rs: span, small: true });
          return cells;
        };
        for (const r of res) {
          if (r.num) {
            const n = r.num, P = n.param;
            if (opts.secondRow === 'none') {
              // one row: "Mean ± SD" or "Median (IQR)" in a single cell
              trows.push([{ t: [r.v.label], b: true }, { t: [P ? meanSdName() : (FMT.iqr === 'bracket' ? 'Median [IQR]' : 'Median (IQR)')] },
                ...n.desc.map(dd => ({ t: [P ? msd(dd.mean, dd.sd, d) : medIqr(dd, d)] })), ...tot(true, () => { const dd = totDesc(r); return P ? msd(dd.mean, dd.sd, d) : medIqr(dd, d); }), ...tail(r, 1)]);
            } else {
              const first = [{ t: [r.v.label], b: true, rs: 2 }, { t: [P ? meanSdName() : 'Median'] },
                ...n.desc.map(dd => ({ t: [P ? msd(dd.mean, dd.sd, d) : fmt(dd.median, d)] })), ...tot(true, () => { const dd = totDesc(r); return P ? msd(dd.mean, dd.sd, d) : fmt(dd.median, d); }), ...tail(r, 2)];
              const ci = dd => { const h = jStat.studentt.inv(0.975, dd.n - 1) * dd.sd / Math.sqrt(dd.n); return `${fmt(dd.mean - h, d)} to ${fmt(dd.mean + h, d)}`; };
              const second = [{ t: [P ? (opts.secondRow === 'ci' ? '95% CI' : 'Range') : 'IQR'] },
                ...n.desc.map(dd => ({ t: [P ? (opts.secondRow === 'ci' ? ci(dd) : `${fmt(dd.min, d)} - ${fmt(dd.max, d)}`) : iqrTxt(dd.q1, dd.q3, d)] })),
                ...tot(true, () => { const dd = totDesc(r); return P ? (opts.secondRow === 'ci' ? ci(dd) : `${fmt(dd.min, d)} - ${fmt(dd.max, d)}`) : iqrTxt(dd.q1, dd.q3, d); })];
              trows.push(first, second);
            }
          } else if (isCompact(r)) {
            const c = r.cat;
            trows.push([{ t: [r.v.label], b: true, span: twoCol ? 2 : 1 }, ...c.table[0].map((cnt, j) => ({ t: [`${cnt} (${pctTxt(c.pct[0][j])}%)`] })), ...tot(true, () => totCat(r, 0)), ...tail(r, 1)]);
          } else {
            const c = r.cat, L = r.levels.length;
            r.levels.forEach((lv, li) => {
              const row = [];
              if (li === 0) row.push({ t: [r.v.label], b: true, rs: L });
              row.push({ t: [lv] }, ...c.table[li].map((cnt, j) => ({ t: [`${cnt} (${pctTxt(c.pct[li][j])}%)`] })), ...tot(true, () => totCat(r, li)));
              if (li === 0) row.push(...tail(r, L));
              trows.push(row);
            });
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
        const nsRes = res.filter(r => !((r.num || r.cat).p <= alpha));
        const sent = [];
        if (descriptive) sent.push(...descriptiveSentences(res, b.table));
        else if (detailed) nsRes.forEach(r => {
          const p = (r.num || r.cat).p;
          sent.push(`${cap(withValues(r, plain(r.v.label)))} was insignificantly different ${amongTxt(k)}${isFinite(p) ? ` (P value ${pTxt(p)})` : ''}.`);
        });
        else if (nsRes.length) {
          const nsLabels = nsRes.map(r => lowerFirst(plain(r.v.label)));
          sent.push(`${cap(listJoin(nsLabels))} ${nsLabels.length > 1 ? 'were' : 'was'} insignificantly different ${amongTxt(k)}.`);
        }
        for (const r of res.filter(r => !descriptive && (r.num || r.cat).p <= alpha)) {
          // compact categorical sentences already quote their percentages
          const lab = isCompact(r) ? plain(r.v.label) : withValues(r, plain(r.v.label));
          if (r.num) { const pd = pairDescription(r.num, gl, alpha); sent.push(`${cap(lab)} was ${fillP(pd.key, pd.ps).replace(/\)$/, effTxt(r) + ')')}.`); }
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
                : 'Pairwise comparisons were insignificant after Bonferroni correction.');
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
                out.push(sp.length ? `Pairwise, it differed significantly between ${pairList(sp, gl)} (P value ${pList(sp.map(q => q.p))}).` : 'Pairwise comparisons were insignificant after Bonferroni correction.');
              }
            }
          }
          const sigL = res.filter(r => (r.num || r.cat).p <= alpha).map(r => lowerFirst(plain(r.v.label))), nsL = res.filter(r => !((r.num || r.cat).p <= alpha)).map(r => lowerFirst(plain(r.v.label)));
          if (res.length > 1) out.push(!sigL.length ? `Overall, the groups were comparable in all the studied variables.`
            : !nsL.length ? `Overall, the groups differed significantly in all the studied variables.`
            : `Overall, the groups differed significantly in ${listJoin(sigL)}, whereas they were comparable in ${listJoin(nsL)}.`);
          return out;
        }
        const flags = { sig: anySig, param: res.some(r => r.num && r.num.param), nonparam: res.some(r => r.num && !r.num.param), cat: hasCat, effect: opts.effect, rr: hasRR, posthoc: showPost,
          stats: res.map(r => (r.num || r.cat).stat), ci: opts.secondRow === 'ci' && res.some(r => r.num && r.num.param),
          missing: res.map(r => [plain(r.v.label), missingIn(r.v.cols[0].col, !!r.num)]).filter(x => x[1]).map(([l, m]) => `${l} (n=${m})`) };
        const notes = b.vars.map(v => v.note).filter(Boolean).join(', ');
        // significance brackets between groups: pairwise P values once the overall test is significant
        const brackets = x => {
          if (!opts.sigMarks || !(x.p <= alpha)) return {};
          if (k === 2) return { sig: [{ i: 0, j: 1, p: x.p }], alpha };
          return x.pairs ? { sig: x.pairs.filter(q => q.p <= alpha).map(q => ({ i: q.i, j: q.j, p: q.p })), alpha } : {};
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
          if (ct === 'stacked' || ct === 'pie') return {
            caption: `${r.v.label} of the studied groups`,
            spec: { type: ct, categories: withN(gl, c.ns), yLabel: r.v.ylabel || '% of the studied patients', series: r.levels.map((lv, li) => ({ name: lv, values: c.pct[li] })) }
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
      if (a.include === false || (!a.outcome && a.type !== 'cronbach')) continue;
      const needs = {
        linear: () => (a.predictors || []).length, logistic: () => a.positive && (a.predictors || []).length, roc: () => a.positive && (a.predictors || []).length,
        ancova: () => true, survival: () => a.event && a.positive, cox: () => a.event && a.positive && (a.predictors || []).length,
        mcnemar: () => a.second, kappa: () => a.second, agreement: () => a.second, diagnostic: () => a.positive && a.event && a.eventPositive, cronbach: () => true
      };
      if (!needs[a.type] || !needs[a.type]()) continue;
      const G = { gl, groups };
      const make = { roc: rocSection, ancova: ancovaSection, survival: survivalSection, cox: coxSection, mcnemar: mcnemarSection, kappa: kappaSection,
        agreement: agreementSection, diagnostic: diagnosticSection, cronbach: cronbachSection, linear: regressionSection, logistic: regressionSection }[a.type];
      // patients: all, each study group separately, or one group (not for analyses that compare the groups)
      const compares = ['ancova', 'survival', 'mcnemar'].includes(a.type);
      const subsets = compares || !a.subset || a.subset === 'all' ? [{ g: null, rows }]
        : a.subset === 'each' ? groups.map(g => ({ g, rows: rows.filter(r => toCat(r[cfg.groupCol]) === g) }))
        : groups.includes(a.subset) ? [{ g: a.subset, rows: rows.filter(r => toCat(r[cfg.groupCol]) === a.subset) }] : [{ g: null, rows }];
      for (const sub of subsets) {
        const made = make(a, cfg, sub.rows, alpha, d, used, G);
        if (!made) continue;
        // an analysis may add a second table (e.g. the comparison of ROC curves)
        [].concat(made).forEach((sec, si) => {
          if (si === 0 && a.title && a.title.trim()) sec.title = a.title.trim();
          if (sub.g !== null) sec.title += ` in ${cfg.groupLabels[sub.g] || sub.g}`;
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
      if (FMT.sig !== '*') sec.footnote = FMT.sig ? sec.footnote.replace(/^\*: Significant/, FMT.sig + ': Significant') : sec.footnote.replace(/^\*: Significant as P value ≤ [\d.]+(, )?/, '').replace(/^\.$/, '');
    });
    return { sections, used, groups: gl, gN, k, methods: opts.paperStyle ? methodsConcise(used, k, cfg) : methodsText(used, k, cfg), intro: opts.paperStyle ? introConcise(cfg, gl) : introText(cfg, gl, gN), flowCaption: flowCaption(cfg),
      summary: opts.summary ? keyFindings(sections) : '' };
  }

  // bold significant P values in the P value column (row spans followed as in the Word table)
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
    const pr = analyzeCorrelation(items, alpha);
    const m = items.length, get = (i, j) => pr.find(q => (q.i === i && q.j === j) || (q.i === j && q.j === i));
    const coef = q => `${q.method === 'pearson' ? 'r' : 'rs'} = ${fmt(q.r, 2)}`;
    let head, trows;
    if (m <= 6) {
      // lower-triangular matrix
      head = ['', ...items.slice(0, -1).map(it => it.label)];
      trows = items.slice(1).map((it, ii) => [{ t: [it.label], b: true },
        ...items.slice(0, -1).map((_, j) => j <= ii ? (q => ({ t: [coef(q), `P ${q.p < 0.001 ? '' : '= '}${fmtP(q.p, alpha)}`], small: true }))(get(ii + 1, j)) : { t: [''] })]);
    } else {
      head = ['Variable', 'Variable', 'Coefficient', 'P value'];
      trows = pr.map(q => [{ t: [items[q.i].label], b: true }, { t: [items[q.j].label] }, { t: [coef(q)] }, { t: [fmtP(q.p, alpha)] }]);
    }
    const strength = r => Math.abs(r) < 0.3 ? 'weak' : Math.abs(r) < 0.7 ? 'moderate' : 'strong';
    const sig = pr.filter(q => q.sig);
    const sent = sig.map(q => `There was a significant ${strength(q.r)} ${q.r > 0 ? 'positive' : 'negative'} correlation between ${lowerFirst(plain(items[q.i].label))} and ${lowerFirst(plain(items[q.j].label))} (${coef(q)}, P value ${pTxt(q.p)}).`);
    if (!sig.length) sent.push('No significant correlations were found among the studied variables.');
    else if (sig.length < pr.length) sent.push('The remaining correlations were insignificant.');
    const f = [];
    if (sig.length) f.push(`*: Significant as P value ≤ ${alpha}`);
    if (pr.some(q => q.method === 'pearson')) f.push('r: Pearson correlation coefficient');
    if (pr.some(q => q.method === 'spearman')) f.push("rs: Spearman's rank correlation coefficient");
    const figures = [...sig].sort((a, b) => Math.abs(b.r) - Math.abs(a.r)).slice(0, MAX_SCATTER).map(q => {
      const xs = [], ys = [];
      items[q.i].vals.forEach((v, r) => { if (isFinite(v) && isFinite(items[q.j].vals[r])) { xs.push(v); ys.push(items[q.j].vals[r]); } });
      return { caption: `Correlation between ${lowerFirst(plain(items[q.i].label))} and ${lowerFirst(plain(items[q.j].label))}`,
        spec: { type: 'scatter', x: xs, y: ys, xLabel: items[q.i].label, yLabel: items[q.j].label, note: `${coef(q)}, P ${pTxt(q.p)}` } };
    });
    return { kind: 'correlation', title: `Correlation between the studied variables in all patients (n=${rows.length})`, head, rows: trows,
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
    if (used.has('param') || used.has('nonparam')) s.push(`Normality was assessed with the ${o.normality === 'ks' ? 'Kolmogorov-Smirnov (Lilliefors)' : 'Shapiro-Wilk'} test.`);
    const pres = [];
    if (used.has('param')) pres.push(FMT.mean === 'paren' ? 'mean (SD)' : 'mean ± SD');
    if (used.has('nonparam')) pres.push('median (IQR)');
    if (used.has('cat')) pres.push('n (%)');
    if (pres.length) s.push(`Data are presented as ${listJoin(pres).replace(/ and ([^,]*)$/, ' or $1')}.`);
    const cont = [];
    if (used.has('param')) cont.push(k === 2 ? (used.has('welch') ? "Student's or Welch's t-test" : "Student's t-test")
      : `one-way ANOVA with Tukey's post hoc test${used.has('welchAnova') ? " (Welch's ANOVA with Games-Howell when variances differed)" : ''}`);
    if (used.has('nonparam')) cont.push(k === 2 ? 'Mann-Whitney U test' : `Kruskal-Wallis test with ${used.has('dunn') ? "Dunn's" : 'pairwise Mann-Whitney'} post hoc tests`);
    const cat = used.has('cat') ? `χ² test${used.has('fisher') ? " or Fisher's exact test" : ''}${used.has('chiPost') ? ' (Bonferroni-corrected pairwise comparisons)' : ''}` : '';
    if (cont.length || cat) s.push(`Groups were compared using ${[cont.length ? `the ${cont.join(' or the ')} for continuous variables` : '', cat ? `the ${cat} for categorical variables` : ''].filter(Boolean).join(' and ')}.`);
    const w = [];
    if (used.has('pairedt')) w.push('paired t-test'); if (used.has('wilcoxon')) w.push('Wilcoxon signed-rank test');
    if (used.has('rmanova')) w.push('repeated-measures ANOVA'); if (used.has('friedman')) w.push('Friedman test');
    if (w.length || used.has('mixed')) s.push(`Changes over time were assessed with the ${listJoin(w.length ? w : ['mixed ANOVA'])}${used.has('postPairedt') || used.has('postWilcoxon') ? ', with Bonferroni-corrected comparisons against baseline' : ''}${used.has('mixed') && w.length ? ', and the group × time interaction with mixed ANOVA' : ''}.`);
    if (used.has('pearson') || used.has('spearman')) s.push(`Correlations were assessed with ${[used.has('pearson') ? "Pearson's" : '', used.has('spearman') ? "Spearman's" : ''].filter(Boolean).join(' or ')} coefficient.`);
    const adv = [['linear', 'multiple linear regression'], ['logistic', 'binary logistic regression'], ['cox', 'Cox proportional hazards regression'], ['ancova', 'ANCOVA'],
      ['roc', 'ROC curve analysis'], ['rocClosest', 'ROC curve analysis'], ['survival', 'Kaplan-Meier analysis with the log-rank test'], ['mcnemar', 'the McNemar test'], ['kappa', "Cohen's kappa"],
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
      return `Of ${c.assessed} ${type === 'consort' ? 'patients assessed for eligibility' : 'potentially eligible individuals'}, ${ex} ${ex === 1 ? 'was' : 'were'} excluded and ${S.sum(inc)} ${verb} (${gl.map((g, i) => `${g}: ${inc[i]}`).join(', ')})${same ? `; all were analysed` : `; ${S.sum(an)} were analysed (${gl.map((g, i) => `${g}: ${an[i]}`).join(', ')})`}.`;
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
    if (used.has('param') || used.has('nonparam')) s.push(`${o.normality === 'ks' ? 'Kolmogorov-Smirnov test (with Lilliefors correction)' : 'Shapiro-Wilk test'} and histograms were used to evaluate the normality of the distribution of data.`);
    if (used.has('param')) {
      let t;
      if (k === 2) t = used.has('welch') && used.has('ttest') ? "unpaired Student's t-test (or Welch's t-test when Levene's test indicated unequal variances)"
        : used.has('welch') ? "Welch's t-test" : "unpaired Student's t-test";
      else t = used.has('welchAnova') && !used.has('anova') ? "Welch's ANOVA with Games-Howell post hoc test"
        : 'ANOVA (F) test with post hoc test (Tukey)' + (used.has('welchAnova') ? " (or Welch's ANOVA with Games-Howell post hoc test when Levene's test indicated unequal variances)" : '');
      s.push(`Quantitative parametric data were presented as mean and standard deviation (SD) and were analyzed by ${t}.`);
    }
    if (used.has('nonparam')) {
      const t = k === 2 ? 'Mann-Whitney test' : used.has('dunn') ? "Kruskal-Wallis test with Dunn's post hoc test (Bonferroni-adjusted)" : 'Kruskal-Wallis test with Mann-Whitney test to compare each two groups';
      s.push(`Quantitative non-parametric data were presented as median and interquartile range (IQR) and were analyzed by ${t}.`);
    }
    if (used.has('cat')) s.push(`Qualitative variables were presented as frequency and percentage (%) and were analyzed utilizing the Chi-square test${used.has('fisher') ? " or Fisher's exact test when appropriate" : ''}.`);
    if (used.has('chiPost')) s.push('When significant, qualitative variables were compared between each two groups with Bonferroni correction.');
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
    if (used.has('rmanova')) within.push('repeated-measures ANOVA with Greenhouse-Geisser correction for parametric data');
    if (used.has('friedman')) within.push('Friedman test for non-parametric data');
    if (within.length) s.push(`Changes over time within each group were assessed using ${listJoin(within)}.`);
    const post = [];
    if (used.has('postPairedt')) post.push('paired t-tests');
    if (used.has('postWilcoxon')) post.push('Wilcoxon signed-rank tests');
    if (post.length) s.push(`When significant, each measurement was compared with the first one using ${listJoin(post)} with Bonferroni correction.`);
    if (used.has('pearson') || used.has('spearman')) {
      const c = [];
      if (used.has('pearson')) c.push("Pearson's correlation coefficient (r) for normally distributed variables");
      if (used.has('spearman')) c.push(`Spearman's rank correlation coefficient (rs)${c.length ? ' otherwise' : ''}`);
      s.push(`Correlation between quantitative variables was assessed using ${c.join(' or ')}.`);
    }
    if (used.has('mixed')) s.push('The group × time interaction was assessed by mixed (split-plot) ANOVA with Greenhouse-Geisser correction.');
    if (used.has('ancova')) s.push('Analysis of covariance (ANCOVA) was used to compare groups after adjustment for covariates, reporting adjusted (estimated marginal) means with 95% CI and Bonferroni-adjusted pairwise comparisons.');
    if (used.has('survival')) s.push('Survival was estimated by the Kaplan-Meier method and compared between groups using the log-rank test.');
    if (used.has('cox')) s.push('Cox proportional hazards regression was used to identify predictors of time to event, reporting hazard ratios (HR) with 95% CI.');
    if (used.has('mcnemar')) s.push('Changes in qualitative variables between two measurements were assessed using the McNemar test (exact binomial when discordant pairs were fewer than 25) or the McNemar-Bowker test for more than two categories.');
    if (used.has('kappa')) s.push("Agreement between qualitative ratings was assessed using Cohen's kappa (κ) coefficient.");
    if (used.has('icc')) s.push('Agreement between quantitative measurements was assessed using the intraclass correlation coefficient (ICC; two-way random effects, absolute agreement) and Bland-Altman analysis with 95% limits of agreement.');
    if (used.has('diagnostic')) s.push('Diagnostic accuracy was expressed as sensitivity, specificity, positive and negative predictive values, likelihood ratios and accuracy, with exact (Clopper-Pearson) 95% CI.');
    if (used.has('cronbach')) s.push("Internal consistency was assessed using Cronbach's alpha (α) coefficient.");
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
    s.push(`A two tailed P value ≤ ${o.alpha} was considered statistically significant.`);
    return s.join(' ');
  }

  // caption of the flow diagram figure
  const FLOW_CAPTIONS = { consort: 'CONSORT flowchart of the enrolled patients', strobe: 'STROBE flow diagram of the study participants',
    stard: 'STARD flow diagram of the study participants', simple: 'Flowchart of the study participants' };
  const flowCaption = cfg => FLOW_CAPTIONS[(cfg.consort && cfg.consort.type) || 'consort'];

  function introText(cfg, gl, gN) {
    const c = cfg.consort, k = gl.length;
    if (!c || !c.enabled) return '';
    const type = c.type || 'consort';
    const ex = c.excluded.filter(e => +e.n > 0), exTotal = ex.reduce((s, e) => s + +e.n, 0);
    const exTxt = exTotal ? `; ${exTotal} were excluded (${ex.map(e => `${lowerFirst(e.text.trim())}: ${e.n}`).join('; ')})` : '';
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
      let t = `In this study, ${c.assessed} individuals were potentially eligible${exTxt}. ${exTotal ? 'The remaining' : 'All'} ${S.sum(inc)} participants were included: ${listJoin(gl.map((g, i) => `${inc[i]} in ${g}`))}.`;
      const lost = c.groups.map((g, i) => ({ g: gl[i], n: +g.lost || 0, why: g.lostReason, ex: +g.excludedAnalysis || 0, exWhy: g.excludedReason }));
      if (lost.every(l => !l.n && !l.ex)) return t + ' All included participants were analyzed.';
      lost.forEach(l => {
        if (l.n) t += ` In ${l.g}, ${l.n} participant${l.n > 1 ? 's were' : ' was'} lost to follow-up or had missing data${l.why ? ` (${l.why.trim()})` : ''}.`;
        if (l.ex) t += ` In ${l.g}, ${l.ex} participant${l.ex > 1 ? 's were' : ' was'} excluded from analysis${l.exWhy ? ` (${l.exWhy.trim()})` : ''}.`;
      });
      return t + ` Finally, ${c.groups.map((g, i) => `${g.analysed} participants in ${gl[i]}`).join(', ')} were analyzed.`;
    }
    let t = `In this study, ${c.assessed} patients were assessed for eligibility`;
    if (exTotal) t += `; ${exTotal} patients were excluded (${ex.map(e => `${lowerFirst(e.text.trim())}: ${e.n}`).join('; ')})`;
    const alloc = c.groups.map(g => +g.allocated);
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

  return { run, normalityTest, significantSentences, fmt, fmtP, toNum, toCat, POSITIVE, NONNORMAL_SHARE, columnLabel, columnKind, levelsOf, isNumberColumn };
})();

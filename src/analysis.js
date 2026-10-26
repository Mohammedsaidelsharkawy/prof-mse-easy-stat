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
  function fmtP(p, alpha) {
    if (p === null || p === undefined || !isFinite(p)) return '—';
    const s = p < 0.001 ? '<0.001' : p.toFixed(3);
    return s + (p <= alpha ? '*' : '');
  }
  // p-value as used inside sentences: "= 0.013" or "< 0.001"
  const pTxt = p => p < 0.001 ? '< 0.001' : '= ' + p.toFixed(3);
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
    let p, test, pw = [];
    if (param) {
      if (k === 2) {
        const lev = S.levene(groupVals), eq = !(lev < 0.05);
        const t = S.tTest(groupVals[0], groupVals[1], eq);
        p = t.p; test = eq ? 't-test' : 'Welch t-test';
        used.add(eq ? 'ttest' : 'welch');
        pw = [{ i: 0, j: 1, p: t.p, diff: t.diff, lo: t.lo, hi: t.hi }];
      } else if (opts.welch && S.levene(groupVals) < 0.05) {
        // unequal variances: Welch's ANOVA with Games–Howell post hoc
        const w = S.welchAnova(groupVals);
        p = w.p; test = 'Welch ANOVA';
        used.add('welchAnova');
        pw = S.gamesHowell(groupVals);
      } else {
        const a = S.anova(groupVals);
        p = a.p; test = 'ANOVA';
        used.add('anova');
        pw = S.tukey(groupVals);
      }
      used.add('param');
    } else {
      if (k === 2) {
        const m = S.mannWhitney(groupVals[0], groupVals[1]);
        p = m.p; test = 'Mann-Whitney';
        used.add('mw');
        const hl = S.hodgesLehmann(groupVals[0], groupVals[1]);
        pw = [{ i: 0, j: 1, p: m.p, ...hl }];
      } else {
        const kw = S.kruskalWallis(groupVals);
        p = kw.p; test = 'Kruskal-Wallis';
        used.add('kw');
        const dn = opts.dunn ? S.dunn(groupVals) : null;
        if (dn) used.add('dunn');
        pw = pr.map(([i, j], q) => ({ i, j, p: dn ? dn[q].p : S.mannWhitney(groupVals[i], groupVals[j]).p, ...S.hodgesLehmann(groupVals[i], groupVals[j]) }));
      }
      used.add('nonparam');
    }
    return { desc, sw, normal, param, p, test, pairs: pw };
  }

  /* ---------- categorical analysis between groups ---------- */
  function analyzeCategorical(groupVals, levels, used, opts) {
    const k = groupVals.length;
    const table = levels.map(l => groupVals.map(g => g.filter(v => v === l).length));
    const ns = groupVals.map(g => g.length);
    const pct = table.map(r => r.map((c, j) => ns[j] ? 100 * c / ns[j] : 0));
    const nonEmpty = table.filter(r => S.sum(r) > 0);
    let p = NaN, test = '—';
    if (nonEmpty.length >= 2 && ns.filter(n => n > 0).length >= 2) {
      const cs = S.chiSquare(nonEmpty);
      p = cs.p; test = 'Chi-square'; used.add('chi');
      if (opts.fisher && nonEmpty.length === 2 && k === 2 && cs.minE < 5) {
        p = S.fisher2x2(nonEmpty).p; test = "Fisher's exact"; used.add('fisher');
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
    return { table, pct, ns, p, test, rr, binary, pairs: catPairs };
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
    if (ps.every(p => p < 0.001)) return '< 0.001 in each';
    const vals = listJoin(ps.map(p => pTxt(p).replace(/^= /, '')));
    return (ps[0] < 0.001 ? '' : '= ') + vals + ' respectively';
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
          label: `${plain(v.label)} at ${cfg.tpLabels[c.tp] || c.tp}${(v.label.match(/\s*\([^)]*\)\s*$/) || [''])[0]}`, table: v.splitTable || 'Other outcomes' }));
      } else out.push({ ...v, cols });
    }
    return out;
  }

  /* ---------- advanced analyses: regression and ROC ---------- */
  // label of any Excel column: the variable label, "<outcome> at <timepoint>", or the column name
  function columnLabel(cfg, col) {
    if (col === cfg.groupCol) return 'Group';
    for (const v of cfg.variables) for (const c of v.cols) if (c.col === col)
      return v.kind === 'repeated' ? `${plain(v.label)} at ${cfg.tpLabels[c.tp] || c.tp}` : v.label;
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
      return logistic ? S.logisticRegression(X, y) : S.linearRegression(X, y);
    };
    const multi = fitOn(preds);
    const uni = a.univariable || !multi ? preds.map(e => fitOn([e])) : null;
    used.add(logistic ? 'logistic' : 'linear');
    const est = t => logistic ? `${fmt(t.or, 2)} (${fmt(t.lo, 2)}-${fmt(t.hi, 2)})` : `${fmt(t.B, d)} (${fmt(t.lo, d)} to ${fmt(t.hi, d)})`;
    const effName = logistic ? 'OR (95% CI)' : 'B (95% CI)';
    const head = [''];
    if (uni) head.push(`Univariable ${effName}`, 'P value');
    if (multi) { head.push(`${uni ? 'Multivariable ' : ''}${effName}`); if (!logistic) head.push('β'); head.push('P value'); }
    // one row per design term: univariable estimate from that predictor's own model, multivariable from the joint model
    const terms = [];
    preds.forEach((e, pi) => e.terms.forEach((t, k) => terms.push({ label: t.label, u: uni && uni[pi] ? uni[pi].terms[k + 1] : null, m: multi ? multi.terms[1 + terms.length] : null })));
    const trows = terms.map(({ label, u, m }) => {
      const row = [{ t: [label], b: true }];
      if (uni) row.push({ t: [u ? est(u) : '—'] }, { t: [u ? fmtP(u.p, alpha) : '—'] });
      if (multi) { row.push({ t: [est(m)] }); if (!logistic) row.push({ t: [fmt(m.beta, 2)] }); row.push({ t: [fmtP(m.p, alpha)] }); }
      return row;
    });
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
    }
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

  function rocSection(a, cfg, rows, alpha, d, used) {
    const outLabel = columnLabel(cfg, a.outcome);
    const tests = a.predictors.filter(c => c !== a.outcome && columnKind(cfg, rows, c) === 'numeric');
    if (!tests.length) return null;
    used.add('roc');
    const res = tests.map(col => {
      const rs = rows.filter(r => toCat(r[a.outcome]) !== null && isFinite(toNum(r[col])));
      const pos = rs.map(r => toCat(r[a.outcome]) === a.positive);
      if (pos.filter(Boolean).length < 2 || pos.filter(x => !x).length < 2) return { col, label: columnLabel(cfg, col), r: null };
      return { col, label: columnLabel(cfg, col), r: S.roc(rs.map(r => toNum(r[col])), pos) };
    });
    const pct = v => `${fmt(100 * v, 1)}%`;
    const head = ['', 'AUC (95% CI)', 'P value', 'Cut-off', 'Sensitivity', 'Specificity', 'PPV', 'NPV', 'Accuracy'];
    const trows = res.map(({ label, r }) => r ? [{ t: [label], b: true }, { t: [`${fmt(r.auc, 3)} (${fmt(r.lo, 3)}-${fmt(r.hi, 3)})`] }, { t: [fmtP(r.p, alpha)] },
      { t: [`${r.higher ? '>' : '≤'} ${fmt(r.cutoff.cut, d)}`] }, { t: [pct(r.cutoff.sens)] }, { t: [pct(r.cutoff.spec)] }, { t: [pct(r.cutoff.ppv)] }, { t: [pct(r.cutoff.npv)] }, { t: [pct(r.cutoff.accuracy)] }]
      : [{ t: [label], b: true }, { t: ['—'], span: 8 }]);
    const grade = auc => auc >= 0.9 ? 'excellent' : auc >= 0.8 ? 'good' : auc >= 0.7 ? 'fair' : auc >= 0.6 ? 'poor' : 'failed';
    const what = eventName(cfg, a);
    const sent = res.filter(x => x.r).map(({ label, r }) => r.p <= alpha
      ? `${cap(plain(label))} ${r.higher ? '' : '(lower values) '}could significantly predict ${what} with ${grade(r.auc)} discrimination (AUC = ${fmt(r.auc, 3)}, 95% CI ${fmt(r.lo, 3)}-${fmt(r.hi, 3)}, P value ${pTxt(r.p)}); at a cut-off of ${r.higher ? '>' : '≤'} ${fmt(r.cutoff.cut, d)}, sensitivity was ${pct(r.cutoff.sens)} and specificity was ${pct(r.cutoff.spec)}.`
      : `${cap(plain(label))} could not significantly predict ${what} (AUC = ${fmt(r.auc, 3)}, P value ${pTxt(r.p)}).`);
    const f = [`*: Significant as P value ≤ ${alpha}`, 'AUC: Area under the curve', 'CI: Confidence interval (DeLong)', 'PPV: Positive predictive value', 'NPV: Negative predictive value', 'Cut-off: Youden index'];
    if (res.some(x => x.r && !x.r.higher)) f.push('≤: lower values predict the outcome');
    const ok = res.filter(x => x.r);
    const n1 = ok.length ? ok[0].r.n1 : 0, n0 = ok.length ? ok[0].r.n0 : 0;
    return {
      kind: 'roc', title: `Diagnostic performance for prediction of ${what}`, head, rows: trows, footnote: f.join(', ') + '.', comment: sent.join(' '),
      figures: ok.length ? [{ sig: ok.some(x => x.r.p <= alpha), caption: `ROC curve for prediction of ${what}`,
        spec: { type: 'roc', series: ok.map(x => ({ name: `${plain(x.label)} (AUC = ${fmt(x.r.auc, 3)})`, points: x.r.points })), note: `n = ${n1} with, ${n0} without` } }] : [],
      meta: { res }
    };
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
      [{ t: ['Mean ± SD (unadjusted)'], b: true }, ...desc.map(x => ({ t: [`${fmt(x.mean, d)} ± ${fmt(x.sd, d)}`] })), { t: [fmtP(unadj, alpha)] }],
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
    const multi = fitOn(preds), uni = a.univariable ? preds.map(e => fitOn([e])) : null;
    if (!multi && !uni) return null;
    used.add('cox');
    const est = t => `${fmt(t.hr, 2)} (${fmt(t.lo, 2)}-${fmt(t.hi, 2)})`;
    const head = [''];
    if (uni) head.push('Univariable HR (95% CI)', 'P value');
    if (multi) head.push(`${uni ? 'Multivariable ' : ''}HR (95% CI)`, 'P value');
    const terms = [];
    preds.forEach((e, pi) => e.terms.forEach((t, k) => terms.push({ label: t.label, u: uni && uni[pi] ? uni[pi].terms[k] : null, m: multi ? multi.terms[terms.length] : null })));
    const trows = terms.map(({ label, u, m }) => {
      const row = [{ t: [label], b: true }];
      if (uni) row.push({ t: [u ? est(u) : '—'] }, { t: [u ? fmtP(u.p, alpha) : '—'] });
      if (multi) row.push({ t: [est(m)] }, { t: [fmtP(m.p, alpha)] });
      return row;
    });
    const sig = terms.filter(x => (x.m || x.u) && (x.m || x.u).p <= alpha);
    const f = [];
    if (sig.length) f.push(`*: Significant as P value ≤ ${alpha}`);
    f.push('HR: Hazard ratio', 'CI: Confidence interval', `Event: ${evLabel} = ${a.positive}`);
    if (multi) f.push(`Model: n=${multi.n} (${multi.events} events), likelihood ratio χ²(${multi.df}) = ${fmt(multi.chi, 2)}, P ${pTxt(multi.pModel)}`);
    if (multi && multi.unstable) f.push('Warning: the model did not converge or has extreme estimates, so they are unreliable');
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
      [{ t: [`${plain(l1)} (mean ± SD)`], b: true }, { t: [`${fmt(dx.mean, d)} ± ${fmt(dx.sd, d)}`] }, { t: ['—'] }, { t: ['—'] }],
      [{ t: [`${plain(l2)} (mean ± SD)`], b: true }, { t: [`${fmt(dy.mean, d)} ± ${fmt(dy.sd, d)}`] }, { t: ['—'] }, { t: ['—'] }],
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
    const head = ['Item', 'Mean ± SD', 'Corrected item-total correlation', "Cronbach's α if item deleted"];
    const trows = cols.map((c, i) => [{ t: [columnLabel(cfg, c)], b: true }, { t: [`${fmt(res.items[i].mean, d)} ± ${fmt(res.items[i].sd, d)}`] }, { t: [fmt(res.items[i].rit, 3)] }, { t: [fmt(res.items[i].alphaDeleted, 3)] }]);
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
    const detailed = opts.commentStyle === 'detailed';
    normality = normalityTest(opts.normality);
    const wording = s => opts.notSig ? s.replace(/insignificant(ly)?/g, 'not significant$1') : s;
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
      if (flags.param) dp.push('mean ± SD');
      if (flags.nonparam) dp.push('median (IQR)');
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
      if (note) f.push(note);
      return f.join(', ') + '.';
    }

    const groupHeads = gl.map((g, i) => `${g} (n=${gN[i]})`);

    for (const b of blocks) {
      if (b.kind === 'repeated') {
        const v = b.vars[0];
        const tps = v.cols.map(c => cfg.tpLabels[c.tp] || c.tp);
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
        if (showPost) head.push('Post hoc');
        if (opts.effect) head.push('MD (95% CI)');
        const trows = results.map((r, t) => {
          const cells = [{ t: [tps[t]], b: true }];
          r.desc.forEach(dd => cells.push({ t: [param ? `${fmt(dd.mean, d)} ± ${fmt(dd.sd, d)}` : `${fmt(dd.median, d)} (${fmt(dd.q1, d)} - ${fmt(dd.q3, d)})`] }));
          cells.push({ t: [fmtP(r.p, alpha)] });
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
        if (mixed) comment += mixed.interaction.p <= alpha
          ? ` There was a significant group × time interaction (P value ${pTxt(mixed.interaction.p)}), indicating that the change in ${lowerFirst(plain(v.label))} over time differed between the groups.`
          : ` The group × time interaction was insignificant (P value ${pTxt(mixed.interaction.p)}), indicating a similar pattern of change over time in the groups.`;
        const sigAny = anySig || (within && within.some(w => w.p <= alpha)) || (mixed && mixed.interaction.p <= alpha);
        const marks = opts.sigMarks ? { sigCat: results.map(r => r.p), alpha } : {};
        sections.push({
          kind: 'repeated', title: `${v.label} of the studied groups`, head, rows: trows,
          footnote: footnote({ sig: sigAny, param, nonparam: !param, effect: opts.effect, posthoc: showPost }, [withinNote, v.note].filter(Boolean).join(', ')),
          comment: wording(comment),
          figures: v.chart === 'none' ? [] : [(() => {
            // per-variable chart type overrides the global chart style
            const ct = v.chart && v.chart !== 'auto' ? v.chart : opts.chartStyle;
            const meanChart = ct === 'bar' || ct === 'line' || (ct === 'auto' && param);
            return {
            sig: sigAny, vid: v.id,
            caption: v.caption || `${v.label} of the studied groups${meanChart && param ? errNote : ''}`,
            spec: meanChart
              ? { type: ct === 'line' ? 'line' : 'bar', categories: tps, yLabel: v.label, xLabel: 'Time', ...marks, ...(ct === 'line' ? {} : valueLabels),
                  series: withN(gl, gN).map((g, i) => ({ name: g, values: results.map(r => param ? r.desc[i].mean : r.desc[i].median),
                    err: results.map(r => param ? errOf(r.desc[i]) : null), lo: param ? null : results.map(r => r.desc[i].q1), hi: param ? null : results.map(r => r.desc[i].q3) })) }
              : { type: 'box', categories: tps, yLabel: v.label, points: opts.points || ct === 'dot', ...marks, series: withN(gl, gN).map((g, i) => ({ name: g, data: per.map(gv => gv[i]) })) }
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
        const head = [{ t: '', span: twoCol ? 2 : 1 }, ...groupHeads, 'P value'];
        if (showPost) head.push('Post hoc');
        if (opts.effect) head.push(effHead);
        const trows = [];
        const tail = (r, span) => {
          const cells = [{ t: [fmtP((r.num || r.cat).p, alpha)], rs: span }];
          if (showPost) cells.push({ t: r.num && r.num.p <= alpha ? postHocLines(r.num) : r.cat && r.cat.pairs ? postHocLines(r.cat) : ['---'], rs: span, small: true });
          if (opts.effect) cells.push({ t: r.num ? effectLines(r.num) : (r.cat.binary ? rrLines(r.cat) : ['---']), rs: span, small: true });
          return cells;
        };
        for (const r of res) {
          if (r.num) {
            const n = r.num, P = n.param;
            const first = [{ t: [r.v.label], b: true, rs: 2 }, { t: [P ? 'Mean ± SD' : 'Median'] },
              ...n.desc.map(dd => ({ t: [P ? `${fmt(dd.mean, d)} ± ${fmt(dd.sd, d)}` : fmt(dd.median, d)] })), ...tail(r, 2)];
            const second = [{ t: [P ? 'Range' : 'IQR'] }, ...n.desc.map(dd => ({ t: [P ? `${fmt(dd.min, d)} - ${fmt(dd.max, d)}` : `${fmt(dd.q1, d)} - ${fmt(dd.q3, d)}`] }))];
            trows.push(first, second);
          } else if (isCompact(r)) {
            const c = r.cat;
            trows.push([{ t: [r.v.label], b: true, span: twoCol ? 2 : 1 }, ...c.table[0].map((cnt, j) => ({ t: [`${cnt} (${fmt(c.pct[0][j], 1)}%)`] })), ...tail(r, 1)]);
          } else {
            const c = r.cat, L = r.levels.length;
            r.levels.forEach((lv, li) => {
              const row = [];
              if (li === 0) row.push({ t: [r.v.label], b: true, rs: L });
              row.push({ t: [lv] }, ...c.table[li].map((cnt, j) => ({ t: [`${cnt} (${fmt(c.pct[li][j], 1)}%)`] })));
              if (li === 0) row.push(...tail(r, L));
              trows.push(row);
            });
          }
        }
        // comment
        // detailed style: "Age (Group A: 45.2 ± 8.1, Group B: 44.9 ± 7.6)" with P values on every sentence
        const values = r => {
          if (r.num) return r.num.desc.map((dd, i) => `${gl[i]}: ${r.num.param ? `${fmt(dd.mean, d)} ± ${fmt(dd.sd, d)}` : `${fmt(dd.median, d)} (${fmt(dd.q1, d)} - ${fmt(dd.q3, d)})`}`).join(', ');
          if (isCompact(r)) return r.cat.pct[0].map((p, i) => `${gl[i]}: ${fmt(p, 1)}%`).join(', ');
          return '';
        };
        const withValues = (r, lab) => detailed && values(r) ? `${lab} (${values(r)})` : lab;
        const nsRes = res.filter(r => !((r.num || r.cat).p <= alpha));
        const sent = [];
        if (detailed) nsRes.forEach(r => {
          const p = (r.num || r.cat).p;
          sent.push(`${cap(withValues(r, plain(r.v.label)))} was insignificantly different ${amongTxt(k)}${isFinite(p) ? ` (P value ${pTxt(p)})` : ''}.`);
        });
        else if (nsRes.length) {
          const nsLabels = nsRes.map(r => lowerFirst(plain(r.v.label)));
          sent.push(`${cap(listJoin(nsLabels))} ${nsLabels.length > 1 ? 'were' : 'was'} insignificantly different ${amongTxt(k)}.`);
        }
        for (const r of res.filter(r => (r.num || r.cat).p <= alpha)) {
          // compact categorical sentences already quote their percentages
          const lab = isCompact(r) ? plain(r.v.label) : withValues(r, plain(r.v.label));
          if (r.num) { const pd = pairDescription(r.num, gl, alpha); sent.push(`${cap(lab)} was ${fillP(pd.key, pd.ps)}.`); }
          else {
            const c = r.cat, row = 0;
            const best = c.pct[row].indexOf(Math.max(...c.pct[row]));
            if (isCompact(r)) {
              if (k === 2) {
                const lo = 1 - best;
                sent.push(`${cap(lab)} was significantly higher in ${gl[best]} than ${gl[lo]} (${fmt(c.pct[0][best], 1)}% vs ${fmt(c.pct[0][lo], 1)}%, P value ${pTxt(c.p)}).`);
              } else sent.push(`${cap(lab)} was significantly different ${amongTxt(k)} (P value ${pTxt(c.p)}), being highest in ${gl[best]} (${fmt(c.pct[0][best], 1)}%).`);
            } else sent.push(`The distribution of ${lowerFirst(lab)} was significantly different ${amongTxt(k)} (P value ${pTxt(c.p)}).`);
            if (c.pairs) {
              const sp = c.pairs.filter(q => q.p <= alpha);
              sent.push(sp.length ? `Pairwise, it differed significantly between ${pairList(sp, gl)} (P value ${pList(sp.map(q => q.p))}).`
                : 'Pairwise comparisons were insignificant after Bonferroni correction.');
            }
          }
        }
        const flags = { sig: anySig, param: res.some(r => r.num && r.num.param), nonparam: res.some(r => r.num && !r.num.param), cat: hasCat, effect: opts.effect, rr: hasRR, posthoc: showPost };
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
              spec: { type: 'dot', perGroup: true, categories: cats, yLabel: r.v.label, median: !P, ...brackets(r.num), series: [{ name: r.v.label, data: r.gv }] } };
            const bar = ct === 'bar' || (ct === 'auto' && P && opts.chartStyle !== 'box');
            if (bar && !P) return { caption: `${r.v.label} of the studied groups (median and IQR)`,
              spec: { type: 'bar', perGroup: true, categories: cats, yLabel: r.v.label, ...valueLabels, ...brackets(r.num), series: [{ name: r.v.label, values: r.num.desc.map(x => x.median), lo: r.num.desc.map(x => x.q1), hi: r.num.desc.map(x => x.q3) }] } };
            return {
              caption: `${r.v.label} of the studied groups${bar ? errNote : ''}`,
              spec: bar
                ? { type: 'bar', perGroup: true, categories: cats, yLabel: r.v.label, ...valueLabels, ...brackets(r.num), series: [{ name: r.v.label, values: r.num.desc.map(x => x.mean), err: r.num.desc.map(errOf) }] }
                : { type: 'box', perGroup: true, categories: cats, yLabel: r.v.label, points: opts.points, ...brackets(r.num), series: [{ name: r.v.label, data: r.gv }] }
            };
          }
          const c = r.cat;
          if (ct === 'stacked' || ct === 'pie') return {
            caption: `${r.v.label} of the studied groups`,
            spec: { type: ct, categories: withN(gl, c.ns), yLabel: '% of the studied patients', series: r.levels.map((lv, li) => ({ name: lv, values: c.pct[li] })) }
          };
          if (isCompact(r)) return {
            caption: `${r.v.label} of the studied groups`,
            spec: { type: 'bar', perGroup: true, percent: true, labels: true, categories: withN(gl, c.ns), yLabel: '% of the studied patients', ...brackets(c), series: [{ name: r.levels[0], values: c.pct[0] }] }
          };
          return {
            caption: `${r.v.label} of the studied groups`,
            spec: { type: 'bar', percent: true, labels: true, categories: withN(gl, c.ns), yLabel: '% of the studied patients', series: r.levels.map((lv, li) => ({ name: lv, values: c.pct[li] })) }
          };
        }
        sections.push({ kind: 'single', title: `${b.table} of the studied groups`, head, rows: trows, footnote: footnote(flags, notes), comment: wording(sent.join(' ')), figures, twoCol, meta: { res } });
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
      const sec = make(a, cfg, rows, alpha, d, used, G);
      if (sec) { sec.comment = wording(sec.comment); sections.push(sec); }
    }

    // which figures go in the report: all, only those of significant results, or none
    if (opts.figures === 'none') sections.forEach(s => { s.figures = []; });
    else if (opts.figures === 'sig') sections.forEach(s => { s.figures = s.figures.filter(f => f.sig !== false); });

    return { sections, used, groups: gl, gN, k, methods: methodsText(used, k, cfg), intro: introText(cfg, gl, gN), flowCaption: flowCaption(cfg) };
  }

  // Correlation table across all analysed patients: single numeric variables and each repeated outcome at its last timepoint
  const MAX_SCATTER = 4;
  function correlationSection(vars, rows, cfg, alpha, d) {
    const items = [];
    for (const v of vars) {
      if (v.type !== 'numeric') continue;
      const c = v.kind === 'repeated' ? v.cols[v.cols.length - 1] : v.cols[0];
      const label = v.kind === 'repeated' ? `${plain(v.label)} at ${cfg.tpLabels[c.tp] || c.tp}` : v.label;
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
    if (used.has('linear')) s.push('Multiple linear regression was used to identify predictors of quantitative outcomes, reporting unstandardized (B) and standardized (β) coefficients with 95% CI.');
    if (used.has('logistic')) s.push('Binary logistic regression was used to identify predictors of binary outcomes, reporting odds ratios (OR) with 95% CI; model fit was assessed by the omnibus chi-square test and Nagelkerke R².');
    if (used.has('roc')) s.push('Receiver operating characteristic (ROC) curve analysis was used to assess diagnostic performance; the area under the curve (AUC) was reported with its 95% CI (DeLong method), and the optimal cut-off was chosen by the Youden index.');
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

  return { run, normalityTest, fmt, fmtP, toNum, toCat, POSITIVE, NONNORMAL_SHARE, columnLabel, columnKind, levelsOf, isNumberColumn };
})();

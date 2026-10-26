/* Prof MSE Easy Stat — runs the analysis and builds report models (tables, comments, figures) */
const Analysis = (() => {
  const S = Stats;
  const POSITIVE = /^(yes|y|true|positive|present|1|done|completed|pos)$/i;
  const NONNORMAL_SHARE = 0.25;
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
  const cap = s => s ? s[0].toUpperCase() + s.slice(1) : s;
  // label without a trailing unit, for use inside sentences: "Age (years)" → "Age"
  const plain = s => s.replace(/\s*\([^)]*\)\s*$/, '');
  const lowerFirst = s => (s && !/^[A-Z]{2,}/.test(s)) ? s[0].toLowerCase() + s.slice(1) : s;
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
    const sw = groupVals.map(g => S.shapiroWilk(g));
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
        pw = pr.map(([i, j]) => ({ i, j, p: S.mannWhitney(groupVals[i], groupVals[j]).p, ...S.hodgesLehmann(groupVals[i], groupVals[j]) }));
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
    const rr = binary ? pairs(k).map(([i, j]) => ({ i, j, ...(S.relativeRisk(table, rrRow, i, j) || { rr: null }) })) : [];
    return { table, pct, ns, p, test, rr, binary };
  }

  /* ---------- within-group repeated measures ---------- */
  function analyzeWithin(matrixByGroup, param, used) {
    return matrixByGroup.map(Y => {
      if (Y.length < 3) return { p: NaN };
      if (param) { used.add('rmanova'); return { ...S.rmAnova(Y), test: 'RM ANOVA' }; }
      used.add('friedman'); return { ...S.friedman(Y), test: 'Friedman' };
    });
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
      parts.push(`significantly lower in ${gl[lo]} than ${target} (P value ${his.length > 1 ? '= ' + his.map(h => pTxt(h.p).replace(/^= /, '')).join(' and ') + ' respectively' : '{P}'})`);
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
    if (n === 1 && ps.length > 1) return key.replace('{P}', '= ' + ps.map(p => pTxt(p).replace(/^= /, '')).join(' and ') + ' respectively');
    let i = 0;
    return key.replace(/\{P\}/g, () => pTxt(ps[i++]));
  }

  function repeatedComment(label, tps, results, gl, alpha) {
    const k = gl.length, sentences = [];
    const nsTps = tps.filter((_, t) => !(results[t].p <= alpha));
    const sigIdx = tps.map((_, t) => t).filter(t => results[t].p <= alpha);
    const tpList = list => list.length === 1 ? list[0] : `(${listJoin(list)})`;
    if (!sigIdx.length) return `${cap(label)} at all measurements was insignificantly different ${amongTxt(k)}.`;
    if (nsTps.length) sentences.push(`${cap(label)} at ${tpList(nsTps)} was insignificantly different ${amongTxt(k)}.`);
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
    const parts = [...buckets].map(([verb, items]) => {
      const ps = items.map(x => pTxt(x.p).replace(/^= /, ''));
      const pPart = items.length === 1 ? pTxt(items[0].p)
        : items.every(x => x.p < 0.001) ? '< 0.001 in each' : '= ' + listJoin(ps) + ' respectively';
      return `${verb} in ${listJoin(items.map(x => x.g))} (P value ${pPart})`;
    });
    return parts.length ? `Within each group, ${lowerFirst(label)} ${parts.join(', while it ')}.` : '';
  }

  /* ---------- main ---------- */
  function run(data, cfg) {
    const opts = cfg.options, alpha = opts.alpha, d = opts.decimals;
    const used = new Set();
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
    const vars = cfg.variables.filter(v => v.include && v.role !== 'ignore');

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
    const rrLines = c => c.rr.map((q, idx) => q.rr === null ? `${numbered ? 'RR' + (idx + 1) + ': ' : ''}—` :
      `${numbered ? 'RR' + (idx + 1) + ': ' : ''}${fmt(q.rr, 2)} (${fmt(q.lo, 2)}-${fmt(q.hi, 2)})`);
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
        if (flags.rr) f.push('RR: Relative risk');
        f.push('CI: Confidence interval');
        if (numbered) {
          if (flags.param || flags.nonparam) f.push(pr.map((_, i) => `M${i + 1}: between ${pairNames[i]}`).join(', '));
          if (flags.rr) f.push(pr.map((_, i) => `RR${i + 1}: Relative risk between ${pairNames[i]}`).join(', '));
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
          const cells = per.flat().map(g => S.shapiroWilk(g));
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
        let within = null;
        if (opts.within && v.cols.length >= 2) {
          const mats = byGroup.map(rs => rs.map(r => v.cols.map(c => toNum(r[c.col]))).filter(a => a.every(isFinite)));
          within = analyzeWithin(mats, param, used);
          const cells = [{ t: ['P (within group)'], b: true }, ...within.map(w => ({ t: [fmtP(w.p, alpha)] }))];
          cells.push({ t: [''], span: head.length - 1 - k });
          trows.push(cells);
        }
        let comment = repeatedComment(plain(v.label), tps, results, gl, alpha);
        if (within) comment += ' ' + withinComment(plain(v.label), tps, within, results, gl, alpha, param);
        const sigAny = anySig || (within && within.some(w => w.p <= alpha));
        sections.push({
          kind: 'repeated', title: `${v.label} of the studied groups`, head, rows: trows,
          footnote: footnote({ sig: sigAny, param, nonparam: !param, effect: opts.effect, posthoc: showPost }, v.note),
          comment,
          figures: [{
            caption: `${v.label} of the studied groups`,
            spec: param && opts.chartStyle !== 'box' || opts.chartStyle === 'bar' || opts.chartStyle === 'line'
              ? { type: opts.chartStyle === 'line' ? 'line' : 'bar', categories: tps, yLabel: v.label, xLabel: 'Time',
                  series: gl.map((g, i) => ({ name: g, values: results.map(r => param ? r.desc[i].mean : r.desc[i].median),
                    err: results.map(r => param ? r.desc[i].sd : null), lo: param ? null : results.map(r => r.desc[i].q1), hi: param ? null : results.map(r => r.desc[i].q3) })) }
              : { type: 'box', categories: tps, yLabel: v.label, series: gl.map((g, i) => ({ name: g, data: per.map(gv => gv[i]) })) }
          }],
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
        const showPost = numbered && res.some(r => r.num && r.num.p <= alpha);
        const hasNum = res.some(r => r.num), hasCat = res.some(r => r.cat);
        const hasRR = opts.effect && res.some(r => r.cat && r.cat.binary);
        const twoCol = res.some(r => r.num || (r.cat && !isCompact(r)));
        const effHead = hasNum && hasRR ? 'MD/RR (95% CI)' : hasRR ? 'RR (95% CI)' : 'MD (95% CI)';
        const head = [{ t: '', span: twoCol ? 2 : 1 }, ...groupHeads, 'P value'];
        if (showPost) head.push('Post hoc');
        if (opts.effect) head.push(effHead);
        const trows = [];
        const tail = (r, span) => {
          const cells = [{ t: [fmtP((r.num || r.cat).p, alpha)], rs: span }];
          if (showPost) cells.push({ t: r.num && r.num.p <= alpha ? postHocLines(r.num) : ['---'], rs: span, small: true });
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
        const nsLabels = res.filter(r => !((r.num || r.cat).p <= alpha)).map(r => lowerFirst(plain(r.v.label)));
        const sent = [];
        if (nsLabels.length) sent.push(`${cap(listJoin(nsLabels))} ${nsLabels.length > 1 ? 'were' : 'was'} insignificantly different ${amongTxt(k)}.`);
        for (const r of res.filter(r => (r.num || r.cat).p <= alpha)) {
          const lab = plain(r.v.label);
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
          }
        }
        const flags = { sig: anySig, param: res.some(r => r.num && r.num.param), nonparam: res.some(r => r.num && !r.num.param), cat: hasCat, effect: opts.effect, rr: hasRR, posthoc: showPost };
        const notes = b.vars.map(v => v.note).filter(Boolean).join(', ');
        const figures = res.map(r => {
          if (r.num) {
            return {
              caption: `${r.v.label} of the studied groups`,
              spec: r.num.param && opts.chartStyle !== 'box'
                ? { type: 'bar', perGroup: true, categories: gl, yLabel: r.v.label, series: [{ name: r.v.label, values: r.num.desc.map(x => x.mean), err: r.num.desc.map(x => x.sd) }] }
                : { type: 'box', perGroup: true, categories: gl, yLabel: r.v.label, series: [{ name: r.v.label, data: r.gv }] }
            };
          }
          const c = r.cat;
          if (isCompact(r)) return {
            caption: `${r.v.label} of the studied groups`,
            spec: { type: 'bar', perGroup: true, percent: true, labels: true, categories: gl, yLabel: '% of the studied patients', series: [{ name: r.levels[0], values: c.pct[0] }] }
          };
          return {
            caption: `${r.v.label} of the studied groups`,
            spec: { type: 'bar', percent: true, labels: true, categories: gl, yLabel: '% of the studied patients', series: r.levels.map((lv, li) => ({ name: lv, values: c.pct[li] })) }
          };
        });
        sections.push({ kind: 'single', title: `${b.table} of the studied groups`, head, rows: trows, footnote: footnote(flags, notes), comment: sent.join(' '), figures, twoCol, meta: { res } });
      }
    }

    return { sections, used, groups: gl, gN, k, methods: methodsText(used, k, cfg), intro: introText(cfg, gl, gN) };
  }

  function isCompact(r) {
    return r.cat && r.levels.length === 2 && POSITIVE.test(r.levels[0]) && (/^(no|n|false|negative|absent|0|not done|neg)$/i.test(r.levels[1]));
  }

  /* ---------- auto-written text ---------- */
  function methodsText(used, k, cfg) {
    const o = cfg.options, s = [];
    s.push(cfg.study.software.trim().replace(/\.?$/, '.'));
    if (used.has('param') || used.has('nonparam')) s.push('Shapiro-Wilk test and histograms were used to evaluate the normality of the distribution of data.');
    if (used.has('param')) {
      let t;
      if (k === 2) t = used.has('welch') && used.has('ttest') ? "unpaired Student's t-test (or Welch's t-test when Levene's test indicated unequal variances)"
        : used.has('welch') ? "Welch's t-test" : "unpaired Student's t-test";
      else t = 'ANOVA (F) test with post hoc test (Tukey)';
      s.push(`Quantitative parametric data were presented as mean and standard deviation (SD) and were analyzed by ${t}.`);
    }
    if (used.has('nonparam')) {
      const t = k === 2 ? 'Mann-Whitney test' : 'Kruskal-Wallis test with Mann-Whitney test to compare each two groups';
      s.push(`Quantitative non-parametric data were presented as median and interquartile range (IQR) and were analyzed by ${t}.`);
    }
    if (used.has('cat')) s.push(`Qualitative variables were presented as frequency and percentage (%) and were analyzed utilizing the Chi-square test${used.has('fisher') ? " or Fisher's exact test when appropriate" : ''}.`);
    if (o.effect) {
      const e = [];
      if (used.has('param')) e.push(k === 2 ? 'mean differences' : 'mean differences (Tukey-adjusted)');
      if (used.has('nonparam')) e.push('Hodges-Lehmann median differences');
      if (used.has('cat')) e.push('relative risks (RR)');
      if (e.length) s.push(`Effect estimates were reported as ${listJoin(e)} with 95% confidence intervals (CI).`);
    }
    if (used.has('rmanova') || used.has('friedman')) {
      const t = [];
      if (used.has('rmanova')) t.push('repeated-measures ANOVA with Greenhouse-Geisser correction for parametric data');
      if (used.has('friedman')) t.push('Friedman test for non-parametric data');
      s.push(`Changes over time within each group were assessed using ${listJoin(t)}.`);
    }
    s.push(`A two tailed P value ≤ ${o.alpha} was considered statistically significant.`);
    return s.join(' ');
  }

  function introText(cfg, gl, gN) {
    const c = cfg.consort, k = gl.length;
    if (!c || !c.enabled) return '';
    const ex = c.excluded.filter(e => +e.n > 0);
    const exTotal = ex.reduce((s, e) => s + +e.n, 0);
    let t = `In this study, ${c.assessed} patients were assessed for eligibility`;
    if (exTotal) t += `; ${exTotal} patients were excluded (${ex.map(e => `${e.text.trim().toLowerCase()}: ${e.n}`).join('; ')})`;
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

  return { run, fmt, fmtP, toNum, toCat, POSITIVE, NONNORMAL_SHARE };
})();

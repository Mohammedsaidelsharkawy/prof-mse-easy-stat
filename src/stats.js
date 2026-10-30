/* Prof MSE Easy Stat — statistics engine (depends on jStat for distributions) */
const Stats = (() => {
  const sum = a => a.reduce((s, v) => s + v, 0);
  const mean = a => sum(a) / a.length;
  const variance = a => { const m = mean(a); return sum(a.map(v => (v - m) ** 2)) / (a.length - 1); };
  const sd = a => Math.sqrt(variance(a));
  const sorted = a => [...a].sort((x, y) => x - y);

  // SPSS "weighted average" percentile (definition 6: position p*(n+1))
  function quantile(a, p) {
    const s = sorted(a), n = s.length;
    if (!n) return NaN;
    const pos = p * (n + 1);
    if (pos <= 1) return s[0];
    if (pos >= n) return s[n - 1];
    const lo = Math.floor(pos), f = pos - lo;
    return s[lo - 1] + f * (s[lo] - s[lo - 1]);
  }
  const median = a => quantile(a, 0.5);

  function describe(a) {
    if (!a.length) return { n: 0 };
    const s = sorted(a);
    return {
      n: a.length, mean: mean(a), sd: a.length > 1 ? sd(a) : NaN,
      median: median(a), q1: quantile(a, 0.25), q3: quantile(a, 0.75),
      min: s[0], max: s[s.length - 1]
    };
  }

  // Midranks with tie information
  function rank(values) {
    const idx = values.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]);
    const r = new Array(values.length), ties = [];
    for (let i = 0; i < idx.length;) {
      let j = i;
      while (j + 1 < idx.length && idx[j + 1][0] === idx[i][0]) j++;
      const rr = (i + j + 2) / 2;
      for (let k = i; k <= j; k++) r[idx[k][1]] = rr;
      if (j > i) ties.push(j - i + 1);
      i = j + 1;
    }
    return { ranks: r, ties };
  }

  /* ---------- Shapiro–Wilk (Royston 1995, AS R94) ---------- */
  function poly(cc, nord, x) {
    let ret = cc[0];
    if (nord > 1) {
      let p = x * cc[nord - 1];
      for (let j = nord - 2; j > 0; j--) p = (p + cc[j]) * x;
      ret += p;
    }
    return ret;
  }
  function shapiroWilk(data) {
    const x = sorted(data), n = x.length;
    if (n < 3 || n > 5000) return null;
    const range = x[n - 1] - x[0];
    if (range < 1e-19) return null;
    const nn2 = Math.floor(n / 2), a = new Array(nn2 + 1);
    const g = [-2.273, 0.459];
    const c1 = [0, 0.221157, -0.147981, -2.07119, 4.434685, -2.706056];
    const c2 = [0, 0.042981, -0.293762, -1.752461, 5.682633, -3.582633];
    const c3 = [0.544, -0.39978, 0.025054, -6.714e-4];
    const c4 = [1.3822, -0.77857, 0.062767, -0.0020322];
    const c5 = [-1.5861, -0.31082, -0.083751, 0.0038915];
    const c6 = [-0.4803, -0.082676, 0.0030302];
    if (n === 3) a[1] = Math.SQRT1_2;
    else {
      const an25 = n + 0.25, m = new Array(nn2 + 1);
      let summ2 = 0;
      for (let i = 1; i <= nn2; i++) { m[i] = jStat.normal.inv((i - 0.375) / an25, 0, 1); summ2 += m[i] * m[i]; }
      summ2 *= 2;
      const ssumm2 = Math.sqrt(summ2), rsn = 1 / Math.sqrt(n);
      const a1 = poly(c1, 6, rsn) - m[1] / ssumm2;
      let i1, fac;
      if (n > 5) {
        i1 = 3;
        const a2 = -m[2] / ssumm2 + poly(c2, 6, rsn);
        fac = Math.sqrt((summ2 - 2 * m[1] * m[1] - 2 * m[2] * m[2]) / (1 - 2 * a1 * a1 - 2 * a2 * a2));
        a[2] = a2;
      } else {
        i1 = 2;
        fac = Math.sqrt((summ2 - 2 * m[1] * m[1]) / (1 - 2 * a1 * a1));
      }
      a[1] = a1;
      for (let i = i1; i <= nn2; i++) a[i] = -m[i] / fac;
    }
    const xm = mean(x);
    let ssq = 0, num = 0;
    for (const v of x) ssq += (v - xm) ** 2;
    for (let i = 1; i <= nn2; i++) num += a[i] * (x[n - i] - x[i - 1]);
    let w = Math.min(1, num * num / ssq);
    let pw;
    if (n === 3) {
      pw = Math.max(0, 1.90985931710274 * (Math.asin(Math.sqrt(w)) - 1.04719755119660));
    } else {
      const w1 = 1 - w, xx = Math.log(n);
      let y = Math.log(w1), mu, s;
      if (n <= 11) {
        const gamma = poly(g, 2, n);
        if (y >= gamma) return { W: w, p: 1e-99 };
        y = -Math.log(gamma - y);
        mu = poly(c3, 4, n); s = Math.exp(poly(c4, 4, n));
      } else {
        mu = poly(c5, 4, xx); s = Math.exp(poly(c6, 3, xx));
      }
      pw = 1 - jStat.normal.cdf((y - mu) / s, 0, 1);
    }
    return { W: w, p: pw };
  }

  /* ---------- Parametric ---------- */
  function tTest(x, y, equalVar = true) {
    const n1 = x.length, n2 = y.length, m1 = mean(x), m2 = mean(y), v1 = variance(x), v2 = variance(y);
    let se, df;
    if (equalVar) {
      const sp = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
      se = Math.sqrt(sp * (1 / n1 + 1 / n2)); df = n1 + n2 - 2;
    } else {
      se = Math.sqrt(v1 / n1 + v2 / n2);
      df = (v1 / n1 + v2 / n2) ** 2 / ((v1 / n1) ** 2 / (n1 - 1) + (v2 / n2) ** 2 / (n2 - 1));
    }
    const t = (m1 - m2) / se, p = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
    const tc = jStat.studentt.inv(0.975, df);
    return { t, df, p, diff: m1 - m2, lo: m1 - m2 - tc * se, hi: m1 - m2 + tc * se };
  }

  // Levene's test (mean-centred, as in SPSS)
  function levene(groups) {
    const z = groups.map(g => { const m = mean(g); return g.map(v => Math.abs(v - m)); });
    return anova(z).p;
  }

  function anova(groups) {
    const all = groups.flat(), N = all.length, k = groups.length, gm = mean(all);
    let ssb = 0, ssw = 0;
    for (const g of groups) {
      const m = mean(g);
      ssb += g.length * (m - gm) ** 2;
      for (const v of g) ssw += (v - m) ** 2;
    }
    const df1 = k - 1, df2 = N - k, msw = ssw / df2, F = (ssb / df1) / msw;
    const p = msw === 0 ? (ssb === 0 ? 1 : 0) : 1 - jStat.centralF.cdf(F, df1, df2);
    return { F, df1, df2, p, msw, etaSq: ssb / (ssb + ssw) };
  }

  function tukey(groups) {
    const a = anova(groups), k = groups.length, out = [];
    const qc = jStat.tukey.inv(0.95, k, a.df2);
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const d = mean(groups[i]) - mean(groups[j]);
      const se = Math.sqrt(a.msw / 2 * (1 / groups[i].length + 1 / groups[j].length));
      const q = se === 0 ? 0 : Math.abs(d) / se;
      const p = Math.min(1, Math.max(0, 1 - jStat.tukey.cdf(q, k, a.df2)));
      out.push({ i, j, diff: d, lo: d - qc * se, hi: d + qc * se, p });
    }
    return out;
  }

  /* ---------- Non-parametric ---------- */
  function mannWhitney(x, y) {
    const n1 = x.length, n2 = y.length, N = n1 + n2;
    const { ranks, ties } = rank([...x, ...y]);
    const r1 = sum(ranks.slice(0, n1));
    const U1 = r1 - n1 * (n1 + 1) / 2, U = Math.min(U1, n1 * n2 - U1);
    const tieSum = sum(ties.map(t => t ** 3 - t));
    const sigma = Math.sqrt(n1 * n2 / 12 * ((N + 1) - tieSum / (N * (N - 1))));
    const z = sigma === 0 ? 0 : (U - n1 * n2 / 2) / sigma;
    const p = sigma === 0 ? 1 : 2 * jStat.normal.cdf(-Math.abs(z), 0, 1);
    return { U, z, p, r: Math.abs(z) / Math.sqrt(N) };
  }

  // Hodges–Lehmann estimate of location shift (x − y) with ~95% CI
  function hodgesLehmann(x, y) {
    const d = [];
    for (const a of x) for (const b of y) d.push(a - b);
    d.sort((p, q) => p - q);
    const n1 = x.length, n2 = y.length, N = d.length;
    const est = N % 2 ? d[(N - 1) / 2] : (d[N / 2 - 1] + d[N / 2]) / 2;
    let ca = Math.floor(n1 * n2 / 2 - 1.959964 * Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12));
    ca = Math.max(1, ca);
    return { diff: est, lo: d[ca - 1], hi: d[N - ca] };
  }

  function kruskalWallis(groups) {
    const all = groups.flat(), N = all.length, k = groups.length;
    const { ranks, ties } = rank(all);
    let H = 0, off = 0;
    for (const g of groups) {
      const R = sum(ranks.slice(off, off + g.length));
      H += R * R / g.length; off += g.length;
    }
    H = 12 / (N * (N + 1)) * H - 3 * (N + 1);
    const C = 1 - sum(ties.map(t => t ** 3 - t)) / (N ** 3 - N);
    if (C > 0) H /= C;
    const df = k - 1;
    return { H, df, p: C > 0 ? 1 - jStat.chisquare.cdf(H, df) : 1, etaSq: Math.max(0, (H - k + 1) / (N - k)) };
  }

  /* ---------- Categorical ---------- */
  // table: rows = categories, cols = groups (counts)
  function chiSquare(table) {
    const R = table.length, C = table[0].length;
    const rs = table.map(r => sum(r)), cs = table[0].map((_, j) => sum(table.map(r => r[j]))), N = sum(rs);
    let chi = 0, minE = Infinity, small = 0;
    for (let i = 0; i < R; i++) for (let j = 0; j < C; j++) {
      const e = rs[i] * cs[j] / N;
      minE = Math.min(minE, e); if (e < 5) small++;
      if (e > 0) chi += (table[i][j] - e) ** 2 / e;
    }
    const df = (R - 1) * (C - 1);
    return { chi, df, p: df > 0 ? 1 - jStat.chisquare.cdf(chi, df) : 1, minE, pctSmall: small / (R * C) };
  }

  function lfact(n) { return jStat.gammaln(n + 1); }
  // Fisher's exact test (two-sided) for 2×2 [[a,b],[c,d]]
  function fisher2x2(t) {
    const [[a, b], [c, d]] = t, r1 = a + b, r2 = c + d, c1 = a + c, N = r1 + r2;
    const lp = x => lfact(r1) + lfact(r2) + lfact(c1) + lfact(N - c1) - lfact(N) - lfact(x) - lfact(r1 - x) - lfact(c1 - x) - lfact(r2 - c1 + x);
    const p0 = lp(a);
    let p = 0;
    for (let x = Math.max(0, c1 - r2); x <= Math.min(r1, c1); x++) {
      const v = lp(x);
      if (v <= p0 + 1e-7) p += Math.exp(v);
    }
    return { p: Math.min(1, p) };
  }

  // Relative risk of category `row` for group i vs group j (Katz log CI)
  function relativeRisk(table, row, i, j) {
    const a = table[row][i], n1 = sum(table.map(r => r[i]));
    const c = table[row][j], n2 = sum(table.map(r => r[j]));
    if (a === 0 || c === 0 || n1 === 0 || n2 === 0) return null;
    const rr = (a / n1) / (c / n2);
    const se = Math.sqrt(1 / a - 1 / n1 + 1 / c - 1 / n2);
    return { rr, lo: Math.exp(Math.log(rr) - 1.959964 * se), hi: Math.exp(Math.log(rr) + 1.959964 * se) };
  }

  /* ---------- Repeated measures (within group) ---------- */
  // Y: array of subjects, each an array of k values (complete cases)
  function friedman(Y) {
    const n = Y.length, k = Y[0].length;
    const Rj = new Array(k).fill(0);
    let tieSum = 0;
    for (const row of Y) {
      const { ranks, ties } = rank(row);
      ranks.forEach((r, j) => Rj[j] += r);
      tieSum += sum(ties.map(t => t ** 3 - t));
    }
    let chi = 12 / (n * k * (k + 1)) * sum(Rj.map(r => r * r)) - 3 * n * (k + 1);
    const C = 1 - tieSum / (n * k * (k * k - 1));
    if (C > 0) chi /= C;
    return { chi, df: k - 1, p: C > 0 ? 1 - jStat.chisquare.cdf(chi, k - 1) : 1 };
  }

  /* ---------- Paired (two timepoints) ---------- */
  function pairedT(x, y) {
    const d = x.map((v, i) => v - y[i]), n = d.length, md = mean(d), se = sd(d) / Math.sqrt(n), df = n - 1;
    if (!(se > 0)) return { t: 0, df, p: md === 0 ? 1 : 0, diff: md, lo: md, hi: md };
    const t = md / se, tc = jStat.studentt.inv(0.975, df);
    return { t, df, p: 2 * (1 - jStat.studentt.cdf(Math.abs(t), df)), diff: md, lo: md - tc * se, hi: md + tc * se };
  }

  // Wilcoxon signed-rank, normal approximation with tie correction, zero differences dropped (as in SPSS)
  function wilcoxonSigned(x, y) {
    const d = x.map((v, i) => v - y[i]).filter(v => v !== 0), n = d.length;
    if (!n) return { z: 0, p: 1, n: 0 };
    const { ranks, ties } = rank(d.map(Math.abs));
    const Wp = sum(ranks.filter((_, i) => d[i] > 0));
    const mu = n * (n + 1) / 4;
    const sigma = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24 - sum(ties.map(t => t ** 3 - t)) / 48);
    const z = sigma === 0 ? 0 : (Wp - mu) / sigma;
    return { W: Wp, z, n, p: sigma === 0 ? 1 : 2 * jStat.normal.cdf(-Math.abs(z), 0, 1) };
  }

  /* ---------- Correlation ---------- */
  function pearson(x, y) {
    const n = x.length, mx = mean(x), my = mean(y);
    let sxy = 0, sxx = 0, syy = 0;
    for (let i = 0; i < n; i++) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
    if (!(sxx > 0 && syy > 0) || n < 3) return { r: NaN, p: NaN, n };
    const r = Math.max(-1, Math.min(1, sxy / Math.sqrt(sxx * syy)));
    if (Math.abs(r) === 1) return { r, p: 0, n };
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    return { r, n, p: 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - 2)) };
  }
  // Spearman's rho with the t approximation used by SPSS
  const spearman = (x, y) => pearson(rank(x).ranks, rank(y).ranks);

  const bonferroni = (p, m) => Math.min(1, p * m);

  /* ---------- Unequal variances, extra post hoc tests ---------- */
  // Welch's one-way ANOVA
  function welchAnova(groups) {
    const k = groups.length, n = groups.map(g => g.length), m = groups.map(mean), w = groups.map((g, i) => n[i] / variance(g));
    const W = sum(w), mw = sum(w.map((wi, i) => wi * m[i])) / W;
    const lam = sum(w.map((wi, i) => (1 - wi / W) ** 2 / (n[i] - 1)));
    const F = (sum(w.map((wi, i) => wi * (m[i] - mw) ** 2)) / (k - 1)) / (1 + 2 * (k - 2) / (k * k - 1) * lam);
    const df1 = k - 1, df2 = (k * k - 1) / (3 * lam);
    return { F, df1, df2, p: 1 - jStat.centralF.cdf(F, df1, df2) };
  }
  // Games–Howell pairwise comparisons (Welch SE and df, studentized range)
  function gamesHowell(groups) {
    const k = groups.length, out = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const a = groups[i], b = groups[j], va = variance(a) / a.length, vb = variance(b) / b.length;
      const d = mean(a) - mean(b), se = Math.sqrt(va + vb);
      const df = (va + vb) ** 2 / (va * va / (a.length - 1) + vb * vb / (b.length - 1));
      const q = Math.abs(d) / se * Math.SQRT2, qc = jStat.tukey.inv(0.95, k, df) / Math.SQRT2;
      out.push({ i, j, diff: d, lo: d - qc * se, hi: d + qc * se, p: Math.min(1, Math.max(0, 1 - jStat.tukey.cdf(q, k, df))) });
    }
    return out;
  }
  // Dunn's test after Kruskal–Wallis, tie-corrected, Bonferroni-adjusted
  function dunn(groups) {
    const all = groups.flat(), N = all.length, k = groups.length, { ranks, ties } = rank(all);
    const R = [];
    let off = 0;
    for (const g of groups) { R.push(mean(ranks.slice(off, off + g.length))); off += g.length; }
    const s2 = N * (N + 1) / 12 - sum(ties.map(t => t ** 3 - t)) / (12 * (N - 1)), m = k * (k - 1) / 2, out = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const z = (R[i] - R[j]) / Math.sqrt(s2 * (1 / groups[i].length + 1 / groups[j].length));
      out.push({ i, j, z, p: bonferroni(2 * jStat.normal.cdf(-Math.abs(z), 0, 1), m) });
    }
    return out;
  }
  // pairwise Chi-square (or Fisher for 2×2 with small expected counts) between groups; table rows = categories, cols = groups
  // adjust: 'bonferroni' (default), 'holm' or 'none'
  function chiSquarePairwise(table, useFisher, adjust = 'bonferroni') {
    const k = table[0].length, m = k * (k - 1) / 2, out = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const sub = table.map(r => [r[i], r[j]]).filter(r => r[0] + r[1] > 0);
      if (sub.length < 2) { out.push({ i, j, p: 1 }); continue; }
      const cs = chiSquare(sub);
      const p = useFisher && sub.length === 2 && cs.minE < 5 ? fisher2x2(sub).p : cs.p;
      out.push({ i, j, p: adjust === 'bonferroni' ? bonferroni(p, m) : p });
    }
    if (adjust === 'holm') { const h = holm(out.map(q => q.p)); out.forEach((q, n) => { q.p = h[n]; }); }
    return out;
  }

  /* ---------- Mixed (split-plot) ANOVA: groups × time ---------- */
  // groupsY: one array per group of subjects, each an array of T values (complete cases)
  function mixedAnova(groupsY) {
    const k = groupsY.length, T = groupsY[0][0].length, all = groupsY.flat(), N = all.length, vals = all.flat(), gm = mean(vals);
    const gMean = groupsY.map(Y => mean(Y.flat())), tMean = Array.from({ length: T }, (_, t) => mean(all.map(r => r[t])));
    const cell = groupsY.map(Y => Array.from({ length: T }, (_, t) => mean(Y.map(r => r[t]))));
    const ssTot = sum(vals.map(v => (v - gm) ** 2));
    const ssBetween = T * sum(groupsY.map((Y, g) => Y.length * (gMean[g] - gm) ** 2));
    const ssSubj = T * sum(groupsY.map((Y, g) => sum(Y.map(r => (mean(r) - gMean[g]) ** 2))));
    const ssTime = N * sum(tMean.map(m => (m - gm) ** 2));
    const ssCells = sum(groupsY.map((Y, g) => Y.length * sum(cell[g].map(m => (m - gm) ** 2))));
    const ssInter = ssCells - ssBetween - ssTime, ssErr = ssTot - ssBetween - ssSubj - ssTime - ssInter;
    const dfB = k - 1, dfS = N - k, dfT = T - 1, dfI = (k - 1) * (T - 1), dfE = (N - k) * (T - 1);
    // Greenhouse–Geisser epsilon from the pooled within-group covariance matrix (as SPSS)
    const S = Array.from({ length: T }, () => new Array(T).fill(0));
    groupsY.forEach((Y, g) => Y.forEach(r => { for (let a = 0; a < T; a++) for (let b = 0; b < T; b++) S[a][b] += (r[a] - cell[g][a]) * (r[b] - cell[g][b]) / dfS; }));
    const sm = mean(S.flat()), rmS = S.map(r => mean(r));
    let tr = 0, sq = 0;
    for (let a = 0; a < T; a++) for (let b = 0; b < T; b++) { const v = S[a][b] - rmS[a] - rmS[b] + sm; if (a === b) tr += v; sq += v * v; }
    const eps = T > 2 && sq > 0 ? Math.min(1, Math.max(1 / (T - 1), tr * tr / ((T - 1) * sq))) : 1;
    const msE = ssErr / dfE;
    const term = (ss, df1, msD, df2, e = 1) => { const F = (ss / df1) / msD; return { F, df1, df2, p: msD > 0 ? 1 - jStat.centralF.cdf(F, e * df1, e * df2) : NaN, pUnc: msD > 0 ? 1 - jStat.centralF.cdf(F, df1, df2) : NaN }; };
    return { group: term(ssBetween, dfB, ssSubj / dfS, dfS), time: term(ssTime, dfT, msE, dfE, eps), interaction: term(ssInter, dfI, msE, dfE, eps), eps, n: N };
  }

  /* ---------- Kaplan–Meier and log-rank ---------- */
  // times: follow-up; events: true = event, false = censored
  function kaplanMeier(times, events) {
    const idx = times.map((t, i) => i).sort((a, b) => times[a] - times[b]);
    let atRisk = times.length, S = 1, gw = 0;
    const steps = [{ t: 0, s: 1, lo: 1, hi: 1 }], censored = [];
    for (let i = 0; i < idx.length;) {
      const t = times[idx[i]];
      let d = 0, c = 0;
      while (i < idx.length && times[idx[i]] === t) { events[idx[i]] ? d++ : c++; i++; }
      if (d) {
        S *= 1 - d / atRisk; gw += atRisk > d ? d / (atRisk * (atRisk - d)) : Infinity;
        // log(-log) limits, as in lifelines
        const se = Math.sqrt(gw) / Math.abs(Math.log(S)), lo = S > 0 && S < 1 && isFinite(se) ? S ** Math.exp(1.959964 * se) : S > 0 ? S : 0, hi = S > 0 && S < 1 && isFinite(se) ? S ** Math.exp(-1.959964 * se) : S > 0 ? S : 0;
        steps.push({ t, s: S, atRisk, d, lo, hi });
      }
      if (c) censored.push({ t, s: S });
      atRisk -= d + c;
    }
    const med = steps.find(q => q.s <= 0.5 + 1e-12);
    return { steps, censored, median: med ? med.t : NaN, n: times.length, events: events.filter(Boolean).length };
  }
  // k-group log-rank test (chi-square, df = k − 1)
  function logRank(groupTimes, groupEvents) {
    const k = groupTimes.length, T = [...new Set(groupTimes.flat())].sort((a, b) => a - b);
    const O = new Array(k).fill(0), E = new Array(k).fill(0), V = Array.from({ length: k }, () => new Array(k).fill(0));
    for (const t of T) {
      const n = groupTimes.map(ts => ts.filter(x => x >= t).length), d = groupTimes.map((ts, g) => ts.filter((x, i) => x === t && groupEvents[g][i]).length);
      const Nt = sum(n), Dt = sum(d);
      if (!Dt || Nt < 2) continue;
      for (let g = 0; g < k; g++) {
        O[g] += d[g]; E[g] += Dt * n[g] / Nt;
        for (let h = 0; h < k; h++) V[g][h] += Dt * (n[g] / Nt) * ((g === h ? 1 : 0) - n[h] / Nt) * (Nt - Dt) / (Nt - 1);
      }
    }
    // chi-square from the first k − 1 groups
    const Vr = V.slice(0, k - 1).map(r => r.slice(0, k - 1)), inv = invert(Vr), u = O.slice(0, k - 1).map((o, g) => o - E[g]);
    const chi = inv ? sum(u.map((ui, a) => ui * sum(inv[a].map((v, b) => v * u[b])))) : NaN;
    return { chi, df: k - 1, p: isFinite(chi) ? 1 - jStat.chisquare.cdf(chi, k - 1) : NaN, O, E };
  }

  /* ---------- Normality: Kolmogorov–Smirnov with Lilliefors correction ---------- */
  // p from the Dallal–Wilkinson approximation; reported as 0.2 (SPSS ".200*") when the approximation exceeds 0.1
  function lilliefors(data) {
    const x = sorted(data), n = x.length;
    if (n < 5) return null;
    const m = mean(x), s = sd(x);
    if (!(s > 0)) return null;
    let D = 0;
    x.forEach((v, i) => { const F = jStat.normal.cdf((v - m) / s, 0, 1); D = Math.max(D, (i + 1) / n - F, F - i / n); });
    let Dn = D, nn = n;
    if (n > 100) { Dn = D * (n / 100) ** 0.49; nn = 100; }
    let p = Math.exp(-7.01256 * Dn * Dn * (nn + 2.78019) + 2.99587 * Dn * Math.sqrt(nn + 2.78019) - 0.122119 + 0.974598 / Math.sqrt(nn) + 1.67997 / nn);
    if (p > 0.1) p = 0.2;
    return { D, p };
  }

  /* ---------- Odds ratio (Woolf log CI) ---------- */
  function oddsRatio(table, row, i, j) {
    const a = table[row][i], b = sum(table.map(r => r[i])) - a, c = table[row][j], d = sum(table.map(r => r[j])) - c;
    if (!a || !b || !c || !d) return null;
    const or = (a * d) / (b * c), se = Math.sqrt(1 / a + 1 / b + 1 / c + 1 / d);
    return { or, lo: Math.exp(Math.log(or) - 1.959964 * se), hi: Math.exp(Math.log(or) + 1.959964 * se) };
  }

  /* ---------- Paired categorical: McNemar (2×2) and Bowker (k×k) ---------- */
  // t: square table, rows = first measurement, cols = second
  function mcnemar(t) {
    const k = t.length;
    if (k === 2) {
      const b = t[0][1], c = t[1][0], n = b + c;
      if (!n) return { p: 1, test: 'McNemar', b, c };
      if (n < 25) {
        // exact binomial, two-sided
        let p = 0;
        const lo = Math.min(b, c);
        for (let x = 0; x <= lo; x++) p += Math.exp(lfact(n) - lfact(x) - lfact(n - x) - n * Math.LN2);
        return { p: Math.min(1, 2 * p), test: 'McNemar (exact)', b, c };
      }
      const chi = (Math.abs(b - c) - 1) ** 2 / n;
      return { chi, df: 1, p: 1 - jStat.chisquare.cdf(chi, 1), test: 'McNemar', b, c };
    }
    // df = k(k − 1)/2 as in SPSS; empty cell pairs add nothing to the statistic
    let chi = 0;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const s = t[i][j] + t[j][i];
      if (s > 0) chi += (t[i][j] - t[j][i]) ** 2 / s;
    }
    const df = k * (k - 1) / 2;
    return { chi, df, p: 1 - jStat.chisquare.cdf(chi, df), test: 'McNemar-Bowker' };
  }

  /* ---------- Agreement ---------- */
  // Cohen's kappa with asymptotic SEs (Fleiss, Cohen & Everitt 1969); square table of counts
  function cohenKappa(t) {
    const k = t.length, n = sum(t.flat()), p = t.map(r => r.map(v => v / n));
    const pr = p.map(r => sum(r)), pc = p[0].map((_, j) => sum(p.map(r => r[j])));
    const po = sum(p.map((r, i) => r[i])), pe = sum(pr.map((v, i) => v * pc[i]));
    const kappa = (po - pe) / (1 - pe);
    let A = 0, B = 0;
    for (let i = 0; i < k; i++) {
      A += p[i][i] * (1 - (pr[i] + pc[i]) * (1 - kappa)) ** 2;
      for (let j = 0; j < k; j++) if (i !== j) B += p[i][j] * (pc[i] + pr[j]) ** 2;
    }
    const se = Math.sqrt((A + (1 - kappa) ** 2 * B - (kappa - pe * (1 - kappa)) ** 2) / (n * (1 - pe) ** 2));
    const se0 = Math.sqrt((pe + pe * pe - sum(pr.map((v, i) => v * pc[i] * (v + pc[i])))) / (n * (1 - pe) ** 2));
    const z = kappa / se0;
    return { kappa, se, lo: kappa - 1.959964 * se, hi: kappa + 1.959964 * se, z, p: 2 * jStat.normal.cdf(-Math.abs(z), 0, 1), po, pe, n };
  }
  // ICC for n subjects × k raters (complete rows): two-way random, absolute agreement (ICC2 / ICC2k, McGraw & Wong CIs)
  function icc(Y) {
    const n = Y.length, k = Y[0].length, gm = mean(Y.flat());
    const rm = Y.map(mean), cm = Array.from({ length: k }, (_, j) => mean(Y.map(r => r[j])));
    const ssR = k * sum(rm.map(m => (m - gm) ** 2)), ssC = n * sum(cm.map(m => (m - gm) ** 2));
    const ssE = sum(Y.flat().map(v => (v - gm) ** 2)) - ssR - ssC;
    const msR = ssR / (n - 1), msC = ssC / (k - 1), msE = ssE / ((n - 1) * (k - 1));
    const single = (msR - msE) / (msR + (k - 1) * msE + k * (msC - msE) / n);
    const average = (msR - msE) / (msR + (msC - msE) / n);
    const F = msR / msE, df1 = n - 1, df2 = (n - 1) * (k - 1);
    // McGraw & Wong (1996) confidence limits for ICC(A,1)
    const a = k * single / (n * (1 - single)), b = 1 + k * single * (n - 1) / (n * (1 - single));
    const v = (a * msC + b * msE) ** 2 / ((a * msC) ** 2 / (k - 1) + (b * msE) ** 2 / ((n - 1) * (k - 1)));
    const Fu = jStat.centralF.inv(0.975, n - 1, v), Fl = jStat.centralF.inv(0.975, v, n - 1);
    const lo = n * (msR - Fu * msE) / (Fu * (k * msC + (k * n - k - n) * msE) + n * msR);
    const hi = n * (Fl * msR - msE) / (k * msC + (k * n - k - n) * msE + n * Fl * msR);
    // consistency (ICC(C,1) and ICC(C,k)), with exact F-based limits
    const cSingle = (msR - msE) / (msR + (k - 1) * msE), cAverage = (msR - msE) / msR;
    const FL = F / jStat.centralF.inv(0.975, df1, df2), FU = F * jStat.centralF.inv(0.975, df2, df1);
    const cLo = (FL - 1) / (FL + k - 1), cHi = (FU - 1) / (FU + k - 1);
    return { single, average, lo, hi, loAvg: lo * k / (1 + lo * (k - 1)), hiAvg: hi * k / (1 + hi * (k - 1)), F, df1, df2, p: 1 - jStat.centralF.cdf(F, df1, df2), n, k,
      consistency: { single: cSingle, average: cAverage, lo: cLo, hi: cHi, loAvg: 1 - 1 / FL, hiAvg: 1 - 1 / FU } };
  }
  // weighted kappa for ordered categories (linear or quadratic disagreement weights), variances as in statsmodels / SAS
  function weightedKappa(table, type = 'linear') {
    const m = table.length, N = sum(table.flat()), f = table.map(r => r.map(c => c / N));
    const row = f.map(r => sum(r)), col = f[0].map((_, j) => sum(f.map(r => r[j])));
    const w = table.map((_, i) => table.map((__, j) => 1 - (type === 'quadratic' ? ((i - j) / (m - 1)) ** 2 : Math.abs(i - j) / (m - 1))));
    let po = 0, pe = 0;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) { po += w[i][j] * f[i][j]; pe += w[i][j] * row[i] * col[j]; }
    const kappa = (po - pe) / (1 - pe);
    const wRow = w.map(r => sum(r.map((v, j) => v * col[j]))), wCol = w[0].map((_, j) => sum(w.map((r, i) => r[j] * row[i])));
    let a = 0, a0 = 0;
    for (let i = 0; i < m; i++) for (let j = 0; j < m; j++) {
      a += f[i][j] * (w[i][j] - (wCol[j] + wRow[i]) * (1 - kappa)) ** 2;
      a0 += row[i] * col[j] * (w[i][j] - (wCol[j] + wRow[i])) ** 2;
    }
    const fac = 1 / ((1 - pe) ** 2 * N), se = Math.sqrt(Math.max(0, (a - (kappa - pe * (1 - kappa)) ** 2) * fac)), se0 = Math.sqrt(Math.max(0, (a0 - pe ** 2) * fac));
    const z = se0 > 0 ? kappa / se0 : 0;
    return { kappa, se, lo: kappa - 1.959964 * se, hi: kappa + 1.959964 * se, z, p: 2 * jStat.normal.cdf(-Math.abs(z), 0, 1), po, pe, n: N, type };
  }
  // Kendall's tau-b with the large-sample test (tie-corrected variance, as scipy's asymptotic method)
  function kendall(x, y) {
    const n = x.length; let S = 0, tx = 0, ty = 0;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) {
      const a = Math.sign(x[i] - x[j]), b = Math.sign(y[i] - y[j]);
      S += a * b; if (!a) tx++; if (!b) ty++;
    }
    const n0 = n * (n - 1) / 2, tau = S / Math.sqrt((n0 - tx) * (n0 - ty));
    const ties = v => { const c = {}; v.forEach(t => { c[t] = (c[t] || 0) + 1; }); return Object.values(c).filter(t => t > 1); };
    const T = ties(x), U = ties(y), s = (L, f) => sum(L.map(f));
    const v = (n * (n - 1) * (2 * n + 5) - s(T, t => t * (t - 1) * (2 * t + 5)) - s(U, t => t * (t - 1) * (2 * t + 5))) / 18
      + s(T, t => t * (t - 1) * (t - 2)) * s(U, t => t * (t - 1) * (t - 2)) / (9 * n * (n - 1) * (n - 2)) + s(T, t => t * (t - 1)) * s(U, t => t * (t - 1)) / (2 * n * (n - 1));
    const z = v > 0 ? S / Math.sqrt(v) : 0;
    return { r: tau, z, n, p: v > 0 ? 2 * jStat.normal.cdf(-Math.abs(z), 0, 1) : 1 };
  }
  // Durbin-Watson statistic of residuals in their order
  const durbinWatson = e => sum(e.slice(1).map((v, i) => (v - e[i]) ** 2)) / sum(e.map(v => v * v));
  // Bland–Altman: bias (a − b) with 95% CI and limits of agreement
  function blandAltman(a, b) {
    const d = a.map((v, i) => v - b[i]), n = d.length, bias = mean(d), s = sd(d), tc = jStat.studentt.inv(0.975, n - 1);
    return { n, bias, sd: s, lo: bias - 1.959964 * s, hi: bias + 1.959964 * s, biasLo: bias - tc * s / Math.sqrt(n), biasHi: bias + tc * s / Math.sqrt(n),
      means: a.map((v, i) => (v + b[i]) / 2), diffs: d, p: pairedT(a, b).p };
  }
  // Cronbach's alpha with Feldt CI, corrected item–total correlations and alpha if item deleted; Y: subjects × items
  function cronbach(Y) {
    const n = Y.length, k = Y[0].length;
    const alphaOf = cols => {
      const vi = sum(cols.map(j => variance(Y.map(r => r[j])))), tot = variance(Y.map(r => sum(cols.map(j => r[j])))), m = cols.length;
      return m / (m - 1) * (1 - vi / tot);
    };
    const all = Array.from({ length: k }, (_, j) => j), alpha = alphaOf(all);
    const df1 = n - 1, df2 = (n - 1) * (k - 1);
    const items = all.map(j => {
      const rest = all.filter(x => x !== j);
      return { mean: mean(Y.map(r => r[j])), sd: sd(Y.map(r => r[j])), rit: pearson(Y.map(r => r[j]), Y.map(r => sum(rest.map(x => r[x])))).r, alphaDeleted: k > 2 ? alphaOf(rest) : NaN };
    });
    return { alpha, lo: 1 - (1 - alpha) * jStat.centralF.inv(0.975, df1, df2), hi: 1 - (1 - alpha) * jStat.centralF.inv(0.025, df1, df2), n, k, items };
  }

  /* ---------- Diagnostic accuracy from a 2×2 table ---------- */
  // Clopper–Pearson exact CIs for proportions; log-method CIs for likelihood ratios
  function clopperPearson(x, n) {
    if (!n) return [NaN, NaN];
    return [x === 0 ? 0 : jStat.beta.inv(0.025, x, n - x + 1), x === n ? 1 : jStat.beta.inv(0.975, x + 1, n - x)];
  }
  function diagnostic2x2(tp, fp, fn, tn) {
    const prop = (x, n) => { const [lo, hi] = clopperPearson(x, n); return { v: x / n, lo, hi }; };
    const sens = prop(tp, tp + fn), spec = prop(tn, tn + fp);
    const lr = (num, den, a, n1, b, n2) => {
      const v = num / den, se = Math.sqrt((1 - a / n1) / a + (1 - b / n2) / b);
      return { v, lo: Math.exp(Math.log(v) - 1.959964 * se), hi: Math.exp(Math.log(v) + 1.959964 * se) };
    };
    return {
      tp, fp, fn, tn, n: tp + fp + fn + tn, sens, spec, ppv: prop(tp, tp + fp), npv: prop(tn, tn + fn), accuracy: prop(tp + tn, tp + fp + fn + tn), prevalence: prop(tp + fn, tp + fp + fn + tn),
      lrPos: tp && fp ? lr(sens.v, 1 - spec.v, tp, tp + fn, fp, fp + tn) : { v: NaN, lo: NaN, hi: NaN },
      lrNeg: fn && tn ? lr(1 - sens.v, spec.v, fn, tp + fn, tn, fp + tn) : { v: NaN, lo: NaN, hi: NaN }
    };
  }

  /* ---------- Cox proportional hazards (Efron ties, Newton–Raphson) ---------- */
  function coxRegression(X0, time, event) {
    const n = time.length, p = X0[0].length;
    const mu = Array.from({ length: p }, (_, j) => mean(X0.map(r => r[j])));
    const X = X0.map(r => r.map((v, j) => v - mu[j])); // centring keeps exp() stable without changing β
    const ord = time.map((_, i) => i).sort((a, b) => time[b] - time[a]); // descending time: risk sets grow
    const fit = beta => {
      let ll = 0;
      const g = new Array(p).fill(0), H = Array.from({ length: p }, () => new Array(p).fill(0));
      const S1 = new Array(p).fill(0), S2 = Array.from({ length: p }, () => new Array(p).fill(0));
      let S0 = 0;
      for (let a = 0; a < n;) {
        const t = time[ord[a]], tied = [];
        while (a < n && time[ord[a]] === t) tied.push(ord[a++]);
        for (const i of tied) {
          const w = Math.exp(sum(X[i].map((v, j) => v * beta[j])));
          S0 += w;
          for (let j = 0; j < p; j++) { S1[j] += w * X[i][j]; for (let l = 0; l < p; l++) S2[j][l] += w * X[i][j] * X[i][l]; }
        }
        const D = tied.filter(i => event[i]), d = D.length;
        if (!d) continue;
        let T0 = 0;
        const T1 = new Array(p).fill(0), T2 = Array.from({ length: p }, () => new Array(p).fill(0));
        for (const i of D) {
          const w = Math.exp(sum(X[i].map((v, j) => v * beta[j])));
          ll += sum(X[i].map((v, j) => v * beta[j]));
          T0 += w;
          for (let j = 0; j < p; j++) { g[j] += X[i][j]; T1[j] += w * X[i][j]; for (let l = 0; l < p; l++) T2[j][l] += w * X[i][j] * X[i][l]; }
        }
        for (let r = 0; r < d; r++) {
          const f = r / d, s0 = S0 - f * T0, s1 = S1.map((v, j) => v - f * T1[j]);
          ll -= Math.log(s0);
          for (let j = 0; j < p; j++) {
            g[j] -= s1[j] / s0;
            for (let l = 0; l < p; l++) H[j][l] -= (S2[j][l] - f * T2[j][l]) / s0 - s1[j] * s1[l] / (s0 * s0);
          }
        }
      }
      return { ll, g, H };
    };
    let beta = new Array(p).fill(0), cur = fit(beta), ll0 = cur.ll, converged = false;
    for (let it = 0; it < 60; it++) {
      const inv = invert(cur.H.map(r => r.map(v => -v)));
      if (!inv) return null;
      let step = inv.map(r => sum(r.map((v, j) => v * cur.g[j])));
      // step halving keeps the likelihood increasing
      let next, nb, tries = 0;
      do { nb = beta.map((b, j) => b + step[j]); next = fit(nb); step = step.map(s => s / 2); } while (next.ll < cur.ll - 1e-10 && ++tries < 20);
      const delta = Math.max(...nb.map((b, j) => Math.abs(b - beta[j])));
      beta = nb; cur = next;
      if (delta < 1e-9) { converged = true; break; }
    }
    const cov = invert(cur.H.map(r => r.map(v => -v)));
    if (!cov) return null;
    const terms = beta.map((B, j) => {
      const se = Math.sqrt(cov[j][j]), z = B / se;
      return { B, se, p: 2 * jStat.normal.cdf(-Math.abs(z), 0, 1), hr: Math.exp(B), lo: Math.exp(B - 1.959964 * se), hi: Math.exp(B + 1.959964 * se) };
    });
    const chi = 2 * (cur.ll - ll0);
    return { terms, n, events: event.filter(Boolean).length, ll: cur.ll, chi, df: p, pModel: 1 - jStat.chisquare.cdf(chi, p), converged, unstable: !converged || terms.some(t => Math.abs(t.B) > 15) };
  }

  /* ---------- Regression ---------- */
  // Gauss–Jordan inverse of a symmetric positive-definite matrix; null when singular
  function invert(A) {
    const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => +(i === j))]);
    for (let c = 0; c < n; c++) {
      let piv = c;
      for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
      if (Math.abs(M[piv][c]) < 1e-12) return null;
      [M[c], M[piv]] = [M[piv], M[c]];
      const d = M[c][c];
      for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c && M[r][c] !== 0) {
        const f = M[r][c];
        for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j];
      }
    }
    return M.map(r => r.slice(n));
  }
  // X'WX and X'Wz for design X (rows include the intercept column)
  function crossprod(X, w, z) {
    const p = X[0].length, A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
    X.forEach((x, i) => {
      const wi = w ? w[i] : 1;
      for (let j = 0; j < p; j++) {
        b[j] += wi * x[j] * z[i];
        for (let k = 0; k < p; k++) A[j][k] += wi * x[j] * x[k];
      }
    });
    return { A, b };
  }

  // Ordinary least squares. X without intercept (array of rows), y numbers
  function linearRegression(X0, y) {
    const n = y.length, X = X0.map(r => [1, ...r]), p = X[0].length;
    const { A, b } = crossprod(X, null, y), inv = invert(A);
    if (!inv || n <= p) return null;
    const coef = inv.map(r => sum(r.map((v, j) => v * b[j])));
    const fit = X.map(x => sum(x.map((v, j) => v * coef[j]))), my = mean(y);
    const sse = sum(y.map((v, i) => (v - fit[i]) ** 2)), sst = sum(y.map(v => (v - my) ** 2));
    const df = n - p, s2 = sse / df, tc = jStat.studentt.inv(0.975, df), sdy = sd(y);
    const terms = coef.map((B, j) => {
      const se = Math.sqrt(inv[j][j] * s2), t = B / se;
      const sdx = j ? sd(X0.map(r => r[j - 1])) : NaN;
      return { B, se, t, p: 2 * (1 - jStat.studentt.cdf(Math.abs(t), df)), lo: B - tc * se, hi: B + tc * se, beta: j ? B * sdx / sdy : NaN };
    });
    const r2 = sst > 0 ? 1 - sse / sst : NaN, k = p - 1;
    const F = k ? ((sst - sse) / k) / s2 : NaN;
    return { terms, n, df, r2, adjR2: 1 - (1 - r2) * (n - 1) / df, F, dfModel: k, pModel: k ? 1 - jStat.centralF.cdf(F, k, df) : NaN,
      coef, sse, cov: inv.map(r => r.map(v => v * s2)) };
  }

  // ANCOVA: group effect on y adjusted for covariates (rows of covariate values); g = group index 0…k−1
  function ancova(y, g, covs, k) {
    const dummies = g.map(gi => Array.from({ length: k - 1 }, (_, j) => +(gi === j + 1)));
    const full = linearRegression(g.map((_, i) => [...dummies[i], ...covs[i]]), y);
    const reduced = linearRegression(covs, y);
    if (!full || !reduced) return null;
    const dfG = k - 1, ssG = reduced.sse - full.sse;
    const F = (ssG / dfG) / (full.sse / full.df), p = 1 - jStat.centralF.cdf(F, dfG, full.df);
    const nc = covs[0] ? covs[0].length : 0, cm = Array.from({ length: nc }, (_, j) => mean(covs.map(r => r[j])));
    const x0 = gi => [1, ...Array.from({ length: k - 1 }, (_, j) => +(gi === j + 1)), ...cm];
    const quad = (a, b) => sum(a.map((ai, r) => ai * sum(b.map((bj, c) => bj * full.cov[r][c]))));
    const dot = x => sum(x.map((v, j) => v * full.coef[j]));
    const adj = Array.from({ length: k }, (_, gi) => { const x = x0(gi); return { mean: dot(x), se: Math.sqrt(quad(x, x)) }; });
    const tc = jStat.studentt.inv(0.975, full.df), m = k * (k - 1) / 2, pairs = [];
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) {
      const c = x0(i).map((v, r) => v - x0(j)[r]), diff = dot(c), se = Math.sqrt(quad(c, c)), t = diff / se;
      pairs.push({ i, j, diff, lo: diff - tc * se, hi: diff + tc * se, p: bonferroni(2 * (1 - jStat.studentt.cdf(Math.abs(t), full.df)), m) });
    }
    const covTerms = full.terms.slice(k).map(t => ({ B: t.B, p: t.p }));
    return { F, df1: dfG, df2: full.df, p, partialEta2: ssG / (ssG + full.sse), adj, pairs, covTerms, n: y.length, r2: full.r2 };
  }

  // Binary logistic regression by Newton–Raphson (IRLS); Wald tests and CIs as in SPSS
  function logisticRegression(X0, y) {
    const n = y.length, X = X0.map(r => [1, ...r]), p = X[0].length;
    let beta = new Array(p).fill(0), inv = null, converged = false, iter = 0;
    const ll = bt => sum(X.map((x, i) => { const e = sum(x.map((v, j) => v * bt[j])); return y[i] * e - Math.log1p(Math.exp(e)); }));
    for (; iter < 50; iter++) {
      const mu = X.map(x => 1 / (1 + Math.exp(-sum(x.map((v, j) => v * beta[j])))));
      const w = mu.map(m => Math.max(m * (1 - m), 1e-10));
      const { A } = crossprod(X, w, y);
      inv = invert(A);
      if (!inv) return null;
      const g = new Array(p).fill(0);
      X.forEach((x, i) => x.forEach((v, j) => { g[j] += v * (y[i] - mu[i]); }));
      const step = inv.map(r => sum(r.map((v, j) => v * g[j])));
      beta = beta.map((b, j) => b + step[j]);
      if (Math.max(...step.map(Math.abs)) < 1e-10) { converged = true; break; }
    }
    // covariance at the final estimate
    const mu = X.map(x => 1 / (1 + Math.exp(-sum(x.map((v, j) => v * beta[j])))));
    inv = invert(crossprod(X, mu.map(m => Math.max(m * (1 - m), 1e-10)), y).A);
    if (!inv) return null;
    const terms = beta.map((B, j) => {
      const se = Math.sqrt(inv[j][j]), z = B / se;
      return { B, se, wald: z * z, p: 2 * jStat.normal.cdf(-Math.abs(z), 0, 1), or: Math.exp(B), lo: Math.exp(B - 1.959964 * se), hi: Math.exp(B + 1.959964 * se) };
    });
    const ny = sum(y), p0 = ny / n;
    const LL = ll(beta), LL0 = ny * Math.log(p0) + (n - ny) * Math.log(1 - p0);
    const chi = 2 * (LL - LL0), k = p - 1;
    const cs = 1 - Math.exp(-chi / n), nag = cs / (1 - Math.exp(2 * LL0 / n));
    const correct = mu.filter((m, i) => (m >= 0.5) === (y[i] === 1)).length;
    // separation shows as huge coefficients that never settle
    const unstable = !converged || terms.slice(1).some(t => Math.abs(t.B) > 15 || !isFinite(t.se));
    return { terms, n, events: ny, m2LL: -2 * LL, chi, dfModel: k, pModel: k ? 1 - jStat.chisquare.cdf(chi, k) : NaN, coxSnell: cs, nagelkerke: nag, accuracy: correct / n, converged, unstable, iter, fitted: mu };
  }

  // Hosmer–Lemeshow goodness of fit: patients sorted by predicted risk, g groups of (nearly) equal size, df = g − 2
  function hosmerLemeshow(y, prob, g = 10) {
    const n = y.length, idx = prob.map((_, i) => i).sort((a, b) => prob[a] - prob[b]);
    g = Math.min(g, n);
    let chi = 0;
    for (let q = 0; q < g; q++) {
      const part = idx.slice(Math.round(q * n / g), Math.round((q + 1) * n / g));
      if (!part.length) continue;
      const o1 = sum(part.map(i => y[i])), e1 = sum(part.map(i => prob[i])), m = part.length, o0 = m - o1, e0 = m - e1;
      if (e1 > 0) chi += (o1 - e1) ** 2 / e1;
      if (e0 > 0) chi += (o0 - e0) ** 2 / e0;
    }
    const df = g - 2;
    return { chi, df, p: df > 0 ? 1 - jStat.chisquare.cdf(chi, df) : NaN };
  }

  /* ---------- ROC curve ---------- */
  // values: test results; pos: booleans (true = condition present). Higher values are taken as positive;
  // when the AUC is below 0.5 the direction is flipped (lower values positive) and reported.
  // cutoff: 'youden' (max sensitivity + specificity − 1), 'closest' (nearest to the top-left corner),
  // 'sens80' / 'sens90' / 'sens95' (best specificity with at least that sensitivity), 'spec80' / 'spec90' / 'spec95',
  // or 'manual' with o.manual (positive when ≥ the value, or ≤ for lower values).
  // o.direction: 'auto' (default), 'higher' or 'lower' values positive
  function roc(values, pos, cutoff = 'youden', o = {}) {
    let higher = o.direction !== 'lower';
    const run = (vals) => {
      const P = vals.filter((_, i) => pos[i]), N = vals.filter((_, i) => !pos[i]), n1 = P.length, n0 = N.length;
      const psi = (a, b) => a > b ? 1 : a === b ? 0.5 : 0;
      const V10 = P.map(a => mean(N.map(b => psi(a, b)))), V01 = N.map(b => mean(P.map(a => psi(a, b))));
      const auc = mean(V10);
      const se = Math.sqrt((n1 > 1 ? variance(V10) / n1 : 0) + (n0 > 1 ? variance(V01) / n0 : 0)); // DeLong
      return { auc, se, n1, n0, P, N };
    };
    let r = run(higher ? values : values.map(v => -v));
    if (!o.direction || o.direction === 'auto') if (r.auc < 0.5) { higher = false; r = run(values.map(v => -v)); }
    const { auc, se, n1, n0 } = r;
    const p = mannWhitney(values.filter((_, i) => pos[i]), values.filter((_, i) => !pos[i])).p;
    // curve and Youden-optimal cut-off at midpoints between observed values
    const sgn = higher ? 1 : -1, u = [...new Set(values)].sort((a, b) => sgn * (b - a));
    const cuts = [u[0] + sgn, ...u.slice(0, -1).map((v, i) => (v + u[i + 1]) / 2), u[u.length - 1] - sgn];
    const points = cuts.map(c => {
      const tp = values.filter((v, i) => pos[i] && sgn * (v - c) > 0).length, fp = values.filter((v, i) => !pos[i] && sgn * (v - c) > 0).length;
      return { cut: c, sens: tp / n1, spec: 1 - fp / n0, tp, fp, fn: n1 - tp, tn: n0 - fp };
    });
    const score = cutoff === 'closest' ? q => -((1 - q.sens) ** 2 + (1 - q.spec) ** 2) : q => q.sens + q.spec;
    let best = points.slice(1, -1).reduce((b, q) => (score(q) > score(b) ? q : b), points[1] || points[0]);
    const target = /^(sens|spec)(\d+)$/.exec(cutoff);
    if (target) {
      // the best of the other measure among cut-offs reaching the target (ties: the better target measure)
      const [, m, x] = target, other = m === 'sens' ? 'spec' : 'sens', lim = +x / 100 - 1e-12;
      const ok = points.filter(q => q[m] >= lim && q[other] > 0); // a cut-off missing every case (or every non-case) is no cut-off
      if (ok.length) best = ok.reduce((b, q) => (q[other] > b[other] || (q[other] === b[other] && q[m] > b[m]) ? q : b));
      else best = { ...best, fallback: true }; // target not reached by any cut-off: Youden index
    } else if (cutoff === 'manual' && isFinite(o.manual)) {
      const c = +o.manual, isPos = v => higher ? v >= c : v <= c;
      const tp = values.filter((v, i) => pos[i] && isPos(v)).length, fp = values.filter((v, i) => !pos[i] && isPos(v)).length;
      best = { cut: c, sens: tp / n1, spec: 1 - fp / n0, tp, fp, fn: n1 - tp, tn: n0 - fp, inclusive: true };
    }
    const [sLo, sHi] = clopperPearson(best.tp, n1), [cLo, cHi] = clopperPearson(best.tn, n0);
    return {
      auc, se, lo: Math.max(0, auc - 1.959964 * se), hi: Math.min(1, auc + 1.959964 * se), p, n1, n0, higher,
      points: points.map(q => ({ fpr: 1 - q.spec, tpr: q.sens })),
      cutoff: { ...best, ppv: best.tp / (best.tp + best.fp), npv: best.tn / (best.tn + best.fn), accuracy: (best.tp + best.tn) / (n1 + n0),
        sensLo: sLo, sensHi: sHi, specLo: cLo, specHi: cHi, youden: best.sens + best.spec - 1,
        lrPos: best.spec < 1 ? best.sens / (1 - best.spec) : Infinity, lrNeg: best.spec > 0 ? (1 - best.sens) / best.spec : Infinity,
        dx: diagnostic2x2(best.tp, best.fp, best.fn, best.tn) } // exact CIs of every measure at the cut-off
    };
  }
  // DeLong test comparing two correlated AUCs (same patients); each test keeps its own direction
  function rocCompare(xa, xb, pos, higherA = true, higherB = true) {
    const comp = (x, h) => {
      const v = h ? x : x.map(t => -t), P = v.filter((_, i) => pos[i]), N = v.filter((_, i) => !pos[i]);
      const psi = (a, b) => a > b ? 1 : a === b ? 0.5 : 0;
      return { V10: P.map(a => mean(N.map(b => psi(a, b)))), V01: N.map(b => mean(P.map(a => psi(a, b)))) };
    };
    const A = comp(xa, higherA), B = comp(xb, higherB), n1 = A.V10.length, n0 = A.V01.length;
    const cov = (u, w) => { const mu = mean(u), mw = mean(w); return sum(u.map((x, i) => (x - mu) * (w[i] - mw))) / (u.length - 1); };
    const aucA = mean(A.V10), aucB = mean(B.V10), diff = aucA - aucB;
    const v = (cov(A.V10, A.V10) + cov(B.V10, B.V10) - 2 * cov(A.V10, B.V10)) / n1 + (cov(A.V01, A.V01) + cov(B.V01, B.V01) - 2 * cov(A.V01, B.V01)) / n0;
    const se = Math.sqrt(Math.max(v, 0)), z = se > 0 ? diff / se : 0;
    return { aucA, aucB, diff, se, z, lo: diff - 1.959964 * se, hi: diff + 1.959964 * se, p: se > 0 ? 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1)) : 1 };
  }

  function rmAnova(Y) {
    const n = Y.length, k = Y[0].length, all = Y.flat(), gm = mean(all);
    const cm = Array.from({ length: k }, (_, j) => mean(Y.map(r => r[j])));
    const rm = Y.map(r => mean(r));
    const ssTime = n * sum(cm.map(m => (m - gm) ** 2));
    const ssSubj = k * sum(rm.map(m => (m - gm) ** 2));
    const ssTot = sum(all.map(v => (v - gm) ** 2));
    const ssErr = ssTot - ssTime - ssSubj;
    const df1 = k - 1, df2 = (k - 1) * (n - 1);
    const F = (ssTime / df1) / (ssErr / df2);
    // Greenhouse–Geisser epsilon from the double-centred covariance matrix
    const S = Array.from({ length: k }, (_, i) => Array.from({ length: k }, (_, j) =>
      sum(Y.map(r => (r[i] - cm[i]) * (r[j] - cm[j]))) / (n - 1)));
    const sm = mean(S.flat()), rmS = S.map(r => mean(r));
    const D = S.map((r, i) => r.map((v, j) => v - rmS[i] - rmS[j] + sm));
    let tr = 0, sq = 0;
    for (let i = 0; i < k; i++) { tr += D[i][i]; for (let j = 0; j < k; j++) sq += D[i][j] ** 2; }
    let eps = sq > 0 ? tr * tr / ((k - 1) * sq) : 1;
    eps = Math.min(1, Math.max(1 / (k - 1), eps));
    const pOf = e => ssErr <= 0 ? (ssTime > 0 ? 0 : 1) : 1 - jStat.centralF.cdf(F, e * df1, e * df2);
    // Huynh–Feldt epsilon (as in SPSS and pingouin), at most 1
    const epsHF = Math.min(1, (n * (k - 1) * eps - 2) / ((k - 1) * (n - 1 - (k - 1) * eps)));
    return { F, df1, df2, eps, p: pOf(eps), epsHF, pHF: pOf(epsHF), pUnc: pOf(1) };
  }
  // Holm step-down adjustment of a list of P values (same order back)
  function holm(ps) {
    const m = ps.length, idx = ps.map((p, i) => i).sort((a, b) => ps[a] - ps[b]), out = new Array(m);
    let run = 0;
    idx.forEach((i, r) => { run = Math.max(run, Math.min(1, (m - r) * ps[i])); out[i] = run; });
    return out;
  }

  /* ---------- Little's MCAR test: EM estimates of the mean and covariance, then d² over the missing-data patterns ---------- */
  function invert(A) {
    const n = A.length, M = A.map((r, i) => [...r, ...Array.from({ length: n }, (_, j) => +(i === j))]);
    for (let c = 0; c < n; c++) {
      let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;
      if (Math.abs(M[p][c]) < 1e-12) return null;
      [M[c], M[p]] = [M[p], M[c]];
      const d = M[c][c]; for (let j = 0; j < 2 * n; j++) M[c][j] /= d;
      for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c]; if (f) for (let j = 0; j < 2 * n; j++) M[r][j] -= f * M[c][j]; }
    }
    return M.map(r => r.slice(n));
  }
  function littleMCAR(X, maxIter = 1000, tol = 1e-8) {
    const rowsAll = X.filter(r => r.some(v => isFinite(v))), n = rowsAll.length, p = X[0] ? X[0].length : 0;
    if (n < 3 || p < 2) return null;
    let mu = Array.from({ length: p }, (_, j) => mean(rowsAll.map(r => r[j]).filter(isFinite)));
    let S = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => { if (i !== j) return 0; const v = rowsAll.map(r => r[i]).filter(isFinite); return v.length > 1 ? variance(v) * (v.length - 1) / v.length : 1; }));
    const pat = r => r.map(v => isFinite(v) ? 1 : 0).join('');
    for (let it = 0; it < maxIter; it++) {
      const T1 = new Array(p).fill(0), T2 = Array.from({ length: p }, () => new Array(p).fill(0));
      for (const r of rowsAll) {
        const o = [], m = []; r.forEach((v, j) => (isFinite(v) ? o : m).push(j));
        const x = r.slice();
        let C = null;
        if (m.length) {
          const Soo = invert(o.map(a => o.map(b => S[a][b]))); if (!Soo) return null;
          const Smo = m.map(a => o.map(b => S[a][b])), dev = o.map(j => r[j] - mu[j]);
          const B = Smo.map(row => o.map((_, k) => row.reduce((acc, v, q) => acc + v * Soo[q][k], 0)));
          m.forEach((j, a) => { x[j] = mu[j] + B[a].reduce((acc, v, q) => acc + v * dev[q], 0); });
          C = m.map((a, i) => m.map((b, j) => S[a][b] - B[i].reduce((acc, v, q) => acc + v * S[o[q]][b], 0)));
        }
        for (let i = 0; i < p; i++) { T1[i] += x[i]; for (let j = 0; j < p; j++) T2[i][j] += x[i] * x[j]; }
        if (C) m.forEach((a, i) => m.forEach((b, j) => { T2[a][b] += C[i][j]; }));
      }
      const mu2 = T1.map(v => v / n), S2 = T2.map((row, i) => row.map((v, j) => v / n - mu2[i] * mu2[j]));
      const diff = Math.max(...mu2.map((v, i) => Math.abs(v - mu[i])), ...S2.flatMap((row, i) => row.map((v, j) => Math.abs(v - S[i][j]))));
      mu = mu2; S = S2;
      if (diff < tol) break;
    }
    const groups = new Map(); rowsAll.forEach(r => { const k = pat(r); if (!groups.has(k)) groups.set(k, []); groups.get(k).push(r); });
    let d2 = 0, df = 0;
    for (const [k, rs] of groups) {
      const o = [...k].map((c, j) => c === '1' ? j : -1).filter(j => j >= 0); if (!o.length) continue;
      const Soo = invert(o.map(a => o.map(b => S[a][b]))); if (!Soo) return null;
      const dev = o.map(j => mean(rs.map(r => r[j])) - mu[j]);
      d2 += rs.length * dev.reduce((acc, v, a) => acc + v * dev.reduce((t, w, b) => t + Soo[a][b] * w, 0), 0);
      df += o.length;
    }
    df -= p;
    return { chi2: d2, df, p: df > 0 ? 1 - jStat.chisquare.cdf(d2, df) : NaN, patterns: groups.size, n, mu, S };
  }
  /* ---------- linear mixed model with a random intercept per subject, REML ----------
     y = Xβ + u(subject) + e; V = σe²(I + γJ) within a subject; γ = σu²/σe² is found by maximising the REML profile likelihood */
  function lmmRandomIntercept(y, X, subj) {
    const N = y.length, p = X[0].length, ids = [...new Set(subj)], idx = ids.map(s => subj.map((x, i) => x === s ? i : -1).filter(i => i >= 0));
    const fit = g => {
      const A = Array.from({ length: p }, () => new Array(p).fill(0)), b = new Array(p).fill(0);
      idx.forEach(I => { const c = g / (1 + I.length * g), sx = new Array(p).fill(0); let sy = 0;
        I.forEach(i => { sy += y[i]; for (let a = 0; a < p; a++) sx[a] += X[i][a]; });
        I.forEach(i => { for (let a = 0; a < p; a++) { b[a] += X[i][a] * y[i]; for (let q = 0; q < p; q++) A[a][q] += X[i][a] * X[i][q]; } });
        for (let a = 0; a < p; a++) { b[a] -= c * sx[a] * sy; for (let q = 0; q < p; q++) A[a][q] -= c * sx[a] * sx[q]; } });
      const Ai = invert(A); if (!Ai) return null;
      const beta = Ai.map(r => r.reduce((t, v, q) => t + v * b[q], 0));
      let rss = 0, logdetV = 0;
      idx.forEach(I => { const c = g / (1 + I.length * g); let sr = 0, s2 = 0; I.forEach(i => { const r = y[i] - X[i].reduce((t, v, a) => t + v * beta[a], 0); sr += r; s2 += r * r; }); rss += s2 - c * sr * sr; logdetV += Math.log(1 + I.length * g); });
      const s2e = rss / (N - p);
      // log det of A by its LU (Cholesky-free): use the inverse's determinant through Gaussian elimination
      const M = A.map(r => r.slice()); let logdetA = 0;
      for (let c2 = 0; c2 < p; c2++) { let pv = c2; for (let r = c2 + 1; r < p; r++) if (Math.abs(M[r][c2]) > Math.abs(M[pv][c2])) pv = r; [M[c2], M[pv]] = [M[pv], M[c2]]; logdetA += Math.log(Math.abs(M[c2][c2]));
        for (let r = c2 + 1; r < p; r++) { const f = M[r][c2] / M[c2][c2]; for (let j = c2; j < p; j++) M[r][j] -= f * M[c2][j]; } }
      return { beta, Ai, s2e, ll: -0.5 * ((N - p) * Math.log(s2e) + logdetV + logdetA) };
    };
    // golden-section search on log γ, with γ = 0 as a candidate
    let lo = -12, hi = 8; const f = t => { const r = fit(Math.exp(t)); return r ? r.ll : -Infinity; };
    for (let it = 0; it < 120; it++) { const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618; if (f(m1) < f(m2)) lo = m1; else hi = m2; }
    let g = Math.exp((lo + hi) / 2), best = fit(g); const zero = fit(0); if (zero && best && zero.ll > best.ll) { g = 0; best = zero; }
    if (!best) return null;
    const cov = best.Ai.map(r => r.map(v => v * best.s2e)), se = cov.map((r, i) => Math.sqrt(r[i]));
    // joint Wald test of a set of coefficients
    const wald = cols => { const b = cols.map(i => best.beta[i]), C = invert(cols.map(i => cols.map(j => cov[i][j]))); if (!C) return null;
      const chi = b.reduce((t, v, a) => t + v * b.reduce((u, w, q) => u + C[a][q] * w, 0), 0); return { chi, df: cols.length, p: 1 - jStat.chisquare.cdf(chi, cols.length) }; };
    return { beta: best.beta, se, cov, s2e: best.s2e, s2u: g * best.s2e, icc: g / (1 + g), nSubj: ids.length, nObs: N, wald, ll: best.ll };
  }
  // Cochran's Q: k binary measurements of the same patients (rows with every value)
  function cochranQ(M) {
    const R = M.filter(r => r.every(v => v === 0 || v === 1)), k = R[0] ? R[0].length : 0, N = R.reduce((t, r) => t + r.reduce((a, b) => a + b, 0), 0);
    if (R.length < 2 || k < 2) return null;
    const C = Array.from({ length: k }, (_, j) => R.reduce((t, r) => t + r[j], 0)), Ri = R.map(r => r.reduce((a, b) => a + b, 0));
    const den = k * N - Ri.reduce((t, v) => t + v * v, 0), Q = den ? (k - 1) * (k * C.reduce((t, v) => t + v * v, 0) - N * N) / den : 0;
    return { Q, df: k - 1, p: den ? 1 - jStat.chisquare.cdf(Q, k - 1) : 1, n: R.length, counts: C };
  }
  return {
    lmmRandomIntercept, cochranQ,
    littleMCAR, invert,
    sum, mean, sd, variance, quantile, median, describe, rank, shapiroWilk,
    tTest, levene, anova, tukey, mannWhitney, hodgesLehmann, kruskalWallis,
    chiSquare, fisher2x2, relativeRisk, friedman, rmAnova,
    pairedT, wilcoxonSigned, pearson, spearman, kendall, bonferroni, holm, weightedKappa, durbinWatson,
    invert, linearRegression, logisticRegression, hosmerLemeshow, roc, rocCompare,
    welchAnova, gamesHowell, dunn, chiSquarePairwise, mixedAnova, kaplanMeier, logRank, ancova,
    lilliefors, oddsRatio, mcnemar, cohenKappa, icc, blandAltman, cronbach, clopperPearson, diagnostic2x2, coxRegression
  };
})();

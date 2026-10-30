/* Prof MSE Easy Stat — statistics engine (depends on jStat for distributions) */
const Stats = (() => {
  // confidence level of every interval (95% by default); the quantiles at 95% are the exact constants used before
  let CONF = 0.95;
  const setConf = c => { CONF = [0.9, 0.95, 0.99].includes(+c) ? +c : 0.95; };
  const QU = () => CONF === 0.95 ? 0.975 : 1 - (1 - CONF) / 2, QL = () => CONF === 0.95 ? 0.025 : (1 - CONF) / 2, ZC = () => CONF === 0.95 ? 1.959964 : jStat.normal.inv(QU(), 0, 1);
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
    const tc = jStat.studentt.inv(QU(), df);
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
    const qc = jStat.tukey.inv(CONF, k, a.df2);
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
    let ca = Math.floor(n1 * n2 / 2 - ZC() * Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12));
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
    return { rr, lo: Math.exp(Math.log(rr) - ZC() * se), hi: Math.exp(Math.log(rr) + ZC() * se) };
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
    const t = md / se, tc = jStat.studentt.inv(QU(), df);
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
      const q = Math.abs(d) / se * Math.SQRT2, qc = jStat.tukey.inv(CONF, k, df) / Math.SQRT2;
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
        const se = Math.sqrt(gw) / Math.abs(Math.log(S)), lo = S > 0 && S < 1 && isFinite(se) ? S ** Math.exp(ZC() * se) : S > 0 ? S : 0, hi = S > 0 && S < 1 && isFinite(se) ? S ** Math.exp(-ZC() * se) : S > 0 ? S : 0;
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
    return { or, lo: Math.exp(Math.log(or) - ZC() * se), hi: Math.exp(Math.log(or) + ZC() * se) };
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
    return { kappa, se, lo: kappa - ZC() * se, hi: kappa + ZC() * se, z, p: 2 * jStat.normal.cdf(-Math.abs(z), 0, 1), po, pe, n };
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
    const Fu = jStat.centralF.inv(QU(), n - 1, v), Fl = jStat.centralF.inv(QU(), v, n - 1);
    const lo = n * (msR - Fu * msE) / (Fu * (k * msC + (k * n - k - n) * msE) + n * msR);
    const hi = n * (Fl * msR - msE) / (k * msC + (k * n - k - n) * msE + n * Fl * msR);
    // consistency (ICC(C,1) and ICC(C,k)), with exact F-based limits
    const cSingle = (msR - msE) / (msR + (k - 1) * msE), cAverage = (msR - msE) / msR;
    const FL = F / jStat.centralF.inv(QU(), df1, df2), FU = F * jStat.centralF.inv(QU(), df2, df1);
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
    return { kappa, se, lo: kappa - ZC() * se, hi: kappa + ZC() * se, z, p: 2 * jStat.normal.cdf(-Math.abs(z), 0, 1), po, pe, n: N, type };
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
    const d = a.map((v, i) => v - b[i]), n = d.length, bias = mean(d), s = sd(d), tc = jStat.studentt.inv(QU(), n - 1);
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
    return { alpha, lo: 1 - (1 - alpha) * jStat.centralF.inv(QU(), df1, df2), hi: 1 - (1 - alpha) * jStat.centralF.inv(QL(), df1, df2), n, k, items };
  }

  /* ---------- Diagnostic accuracy from a 2×2 table ---------- */
  // Clopper–Pearson exact CIs for proportions; log-method CIs for likelihood ratios
  function clopperPearson(x, n) {
    if (!n) return [NaN, NaN];
    return [x === 0 ? 0 : jStat.beta.inv(QL(), x, n - x + 1), x === n ? 1 : jStat.beta.inv(QU(), x + 1, n - x)];
  }
  function diagnostic2x2(tp, fp, fn, tn) {
    const prop = (x, n) => { const [lo, hi] = clopperPearson(x, n); return { v: x / n, lo, hi }; };
    const sens = prop(tp, tp + fn), spec = prop(tn, tn + fp);
    const lr = (num, den, a, n1, b, n2) => {
      const v = num / den, se = Math.sqrt((1 - a / n1) / a + (1 - b / n2) / b);
      return { v, lo: Math.exp(Math.log(v) - ZC() * se), hi: Math.exp(Math.log(v) + ZC() * se) };
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
      return { B, se, p: 2 * jStat.normal.cdf(-Math.abs(z), 0, 1), hr: Math.exp(B), lo: Math.exp(B - ZC() * se), hi: Math.exp(B + ZC() * se) };
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
    const df = n - p, s2 = sse / df, tc = jStat.studentt.inv(QU(), df), sdy = sd(y);
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
    const tc = jStat.studentt.inv(QU(), full.df), m = k * (k - 1) / 2, pairs = [];
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
      return { B, se, wald: z * z, p: 2 * jStat.normal.cdf(-Math.abs(z), 0, 1), or: Math.exp(B), lo: Math.exp(B - ZC() * se), hi: Math.exp(B + ZC() * se) };
    });
    const ny = sum(y), p0 = ny / n;
    const LL = ll(beta), LL0 = ny * Math.log(p0) + (n - ny) * Math.log(1 - p0);
    const chi = 2 * (LL - LL0), k = p - 1;
    const cs = 1 - Math.exp(-chi / n), nag = cs / (1 - Math.exp(2 * LL0 / n));
    const correct = mu.filter((m, i) => (m >= 0.5) === (y[i] === 1)).length;
    // separation shows as huge coefficients that never settle
    const unstable = !converged || terms.slice(1).some(t => Math.abs(t.B) > 15 || !isFinite(t.se));
    return { terms, n, events: ny, m2LL: -2 * LL, chi, dfModel: k, pModel: k ? 1 - jStat.chisquare.cdf(chi, k) : NaN, coxSnell: cs, nagelkerke: nag, accuracy: correct / n, converged, unstable, iter, fitted: mu, cov: inv };
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
      auc, se, lo: Math.max(0, auc - ZC() * se), hi: Math.min(1, auc + ZC() * se), p, n1, n0, higher,
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
    return { aucA, aucB, diff, se, z, lo: diff - ZC() * se, hi: diff + ZC() * se, p: se > 0 ? 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1)) : 1 };
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
  // Mauchly's test of sphericity on orthonormal (Helmert) contrasts of the k measurements;
  // with several groups (a list of matrices) the pooled within-group covariance is used, as SPSS does
  function mauchly(Y) {
    const sets = Array.isArray(Y[0][0]) ? Y.filter(m => m.length) : [Y]; Y = sets.flat();
    const g = sets.length, n = Y.length - g + 1, k = Y[0].length, p = k - 1; if (k < 3 || n <= k) return null;
    const C = Array.from({ length: p }, (_, j) => { const r = new Array(k).fill(0), d = Math.sqrt((j + 1) * (j + 2)); for (let i = 0; i <= j; i++) r[i] = 1 / d; r[j + 1] = -(j + 1) / d; return r; });
    const Z = sets.flatMap(m => { const z = m.map(row => C.map(c => c.reduce((t, v, i) => t + v * row[i], 0))), zm = Array.from({ length: p }, (_, j) => mean(z.map(r => r[j]))); return z.map(r => r.map((v, j) => v - zm[j])); });
    const M = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => sum(Z.map(r => r[i] * r[j])) / (n - 1)));
    let det = 1; const A = M.map(r => r.slice());
    for (let c = 0; c < p; c++) { let piv = c; for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[piv][c])) piv = r;
      if (Math.abs(A[piv][c]) < 1e-300) return null; if (piv !== c) { [A[c], A[piv]] = [A[piv], A[c]]; det = -det; } det *= A[c][c];
      for (let r = c + 1; r < p; r++) { const f = A[r][c] / A[c][c]; for (let q = c; q < p; q++) A[r][q] -= f * A[c][q]; } }
    const tr = sum(M.map((r, i) => r[i])), W = det / (tr / p) ** p;
    const f = 1 - (2 * p * p + p + 2) / (6 * p * (n - 1)), chi = -(n - 1) * f * Math.log(W), df = p * (p + 1) / 2 - 1;
    return { W, chi, df, p: 1 - jStat.chisquare.cdf(chi, df) };
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

  /* ---------- stage 4 statistics ---------- */
  // a seeded random generator, so resampling gives the same answer every time
  const seeded = seed => { let s0 = (seed >>> 0) || 1; return () => { s0 = (s0 + 0x6D2B79F5) >>> 0; let t = s0; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  // normality from the skewness and kurtosis z-scores (both within ±1.96)
  function skewKurtZ(x) {
    const n = x.length; if (n < 4) return null;
    const m = mean(x), m2 = x.reduce((t, v) => t + (v - m) ** 2, 0) / n, m3 = x.reduce((t, v) => t + (v - m) ** 3, 0) / n, m4 = x.reduce((t, v) => t + (v - m) ** 4, 0) / n;
    if (!m2) return null;
    const g1 = m3 / m2 ** 1.5, g2 = m4 / m2 ** 2 - 3, G1 = g1 * Math.sqrt(n * (n - 1)) / (n - 2), G2 = ((n + 1) * g2 + 6) * (n - 1) / ((n - 2) * (n - 3));
    const ses = Math.sqrt(6 * n * (n - 1) / ((n - 2) * (n + 1) * (n + 3))), sek = 2 * ses * Math.sqrt((n * n - 1) / ((n - 3) * (n + 5)));
    const zs = G1 / ses, zk = G2 / sek, p = Math.min(2 * (1 - jStat.normal.cdf(Math.abs(zs), 0, 1)), 2 * (1 - jStat.normal.cdf(Math.abs(zk), 0, 1)));
    return { zs, zk, p, W: NaN };
  }
  // percentile bootstrap CI of the difference in medians (x − y)
  function bootMedianDiff(x, y, B = 2000, seed = 7) {
    const r = seeded(seed), md = median(x) - median(y), out = [];
    for (let b = 0; b < B; b++) { const xs = x.map(() => x[Math.floor(r() * x.length)]), ys = y.map(() => y[Math.floor(r() * y.length)]); out.push(median(xs) - median(ys)); }
    out.sort((a, c) => a - c);
    return { diff: md, lo: out[Math.floor(B * QL())], hi: out[Math.min(B - 1, Math.ceil(B * QU()) - 1)] };
  }
  // Mann-Whitney P: exact (no ties, small samples) by the distribution of U, otherwise a seeded permutation test
  function mannWhitneyExact(x, y, B = 20000, seed = 11) {
    const n1 = x.length, n2 = y.length, all = [...x, ...y], { ranks, ties } = rank(all), R1 = sum(ranks.slice(0, n1)), U = R1 - n1 * (n1 + 1) / 2, Umin = Math.min(U, n1 * n2 - U);
    if (!ties.some(t => t > 1) && n1 * n2 <= 2500) {
      // number of ways to reach each U: f(n1, n2, u) by the recursion over the largest observation
      let prev = Array.from({ length: n2 + 1 }, () => [1]);
      for (let i = 1; i <= n1; i++) { const cur = [[1]]; for (let j = 1; j <= n2; j++) { const a = cur[j - 1], b = prev[j], len = i * j + 1, row = new Array(len).fill(0);
        for (let u = 0; u < len; u++) row[u] = (u - j >= 0 && b[u - j] !== undefined ? b[u - j] : 0) + (a[u] !== undefined ? a[u] : 0); cur.push(row); } prev = cur; }
      const f = prev[n2], tot = f.reduce((t, v) => t + v, 0); let c = 0; for (let u = 0; u <= Umin; u++) c += f[u] || 0;
      return { U: Umin, p: Math.min(1, 2 * c / tot), method: 'exact' };
    }
    const r = seeded(seed), obs = Math.abs(U - n1 * n2 / 2); let hit = 0;
    const rk = ranks.slice();
    for (let b = 0; b < B; b++) { for (let i = rk.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [rk[i], rk[j]] = [rk[j], rk[i]]; } const u = sum(rk.slice(0, n1)) - n1 * (n1 + 1) / 2; if (Math.abs(u - n1 * n2 / 2) >= obs - 1e-9) hit++; }
    return { U: Umin, p: (hit + 1) / (B + 1), method: 'permutation' };
  }
  // Fisher-Freeman-Halton exact test for an r × c table: Monte Carlo over random tables with the same margins (Patefield), like R's simulate.p.value
  function fisherRxC(table, B = 50000, seed = 13) {
    const t = table.filter(r => sum(r) > 0), cs0 = t[0].map((_, j) => sum(t.map(r => r[j]))), keepC = cs0.map((c, j) => c > 0 ? j : -1).filter(j => j >= 0);
    const T = t.map(r => keepC.map(j => r[j])), rs = T.map(sum), cs = T[0].map((_, j) => sum(T.map(r => r[j]))), N = sum(rs);
    const lf = (() => { const a = [0]; for (let i = 1; i <= N; i++) a.push(a[i - 1] + Math.log(i)); return a; })();
    const stat = M => M.reduce((tt, r) => tt + r.reduce((u, v) => u + lf[v], 0), 0); // smaller probability ⇔ larger Σ log x!
    const obs = stat(T), rnd = seeded(seed); let hit = 0;
    for (let b = 0; b < B; b++) {
      // fill row by row: each row's counts drawn without replacement from the remaining column totals
      const left = cs.slice(), M = [];
      let remaining = N;
      for (let i = 0; i < rs.length; i++) { const row = new Array(cs.length).fill(0); let need = rs[i];
        if (i === rs.length - 1) { M.push(left.slice()); break; }
        for (let k = 0; k < need; k++) { let u = Math.floor(rnd() * remaining), j = 0; while (u >= left[j]) { u -= left[j]; j++; } row[j]++; left[j]--; remaining--; }
        M.push(row); }
      if (stat(M) >= obs - 1e-9) hit++;
    }
    return { p: (hit + 1) / (B + 1), B };
  }
  // Jonckheere-Terpstra test for ordered groups (normal approximation with the tie correction)
  function jonckheere(groups) {
    const k = groups.length, n = groups.map(g => g.length), N = sum(n); let J = 0;
    for (let i = 0; i < k; i++) for (let j = i + 1; j < k; j++) for (const a of groups[i]) for (const b of groups[j]) J += b > a ? 1 : b === a ? 0.5 : 0;
    const all = groups.flat(), cnt = {}; all.forEach(v => { cnt[v] = (cnt[v] || 0) + 1; }); const t = Object.values(cnt);
    const E = (N * N - sum(n.map(x => x * x))) / 4;
    const V = (N * (N - 1) * (2 * N + 5) - sum(n.map(x => x * (x - 1) * (2 * x + 5))) - sum(t.map(x => x * (x - 1) * (2 * x + 5)))) / 72
      + sum(n.map(x => x * (x - 1) * (x - 2))) * sum(t.map(x => x * (x - 1) * (x - 2))) / (36 * N * (N - 1) * (N - 2))
      + sum(n.map(x => x * (x - 1))) * sum(t.map(x => x * (x - 1))) / (8 * N * (N - 1));
    const z = (J - E) / Math.sqrt(V);
    return { J, z, p: 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1)) };
  }
  // Cochran-Armitage trend test: a yes/no outcome over ordered groups (scores 1, 2, 3 …), as R's prop.trend.test
  function cochranArmitage(events, totals) {
    const k = events.length, sc = events.map((_, i) => i + 1), N = sum(totals), R = sum(events), pbar = R / N;
    const sb = sum(sc.map((s2, i) => totals[i] * s2)) / N, num = sum(sc.map((s2, i) => events[i] * (s2 - sb))), den = pbar * (1 - pbar) * sum(sc.map((s2, i) => totals[i] * (s2 - sb) ** 2));
    const chi = den > 0 ? num * num / den : 0;
    return { chi, p: 1 - jStat.chisquare.cdf(chi, 1) };
  }
  // effect sizes for two groups
  function effectSizes(x, y) {
    const n1 = x.length, n2 = y.length, m1 = mean(x), m2 = mean(y), s1 = sd(x), s2 = sd(y), sp = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2));
    const d = (m1 - m2) / sp, J = 1 - 3 / (4 * (n1 + n2) - 9), g = d * J;
    let gt = 0, lt = 0; for (const a of x) for (const b of y) { if (a > b) gt++; else if (a < b) lt++; }
    const cliff = (gt - lt) / (n1 * n2);
    return { d, g, glass: (m1 - m2) / s2, cliff, rbc: cliff };
  }
  // power and sample size: two means (t-test) and two proportions (normal approximation)
  function nTwoMeans(diff, sdv, alpha = 0.05, power = 0.8, ratio = 1) {
    const za = jStat.normal.inv(1 - alpha / 2, 0, 1), zb = jStat.normal.inv(power, 0, 1);
    let n = Math.ceil((1 + 1 / ratio) * ((za + zb) * sdv / diff) ** 2);
    // refine with the noncentral t (power of the two-sided t-test)
    const pw = n1 => { const n2 = Math.max(2, Math.round(n1 * ratio)), df = n1 + n2 - 2, ncp = diff / (sdv * Math.sqrt(1 / n1 + 1 / n2)), tc = jStat.studentt.inv(1 - alpha / 2, df); return 1 - nctCdf(tc, df, ncp) + nctCdf(-tc, df, ncp); };
    while (n > 2 && pw(n - 1) >= power) n--; while (pw(n) < power) n++;
    return { n1: n, n2: Math.max(2, Math.round(n * ratio)), power: pw(n) };
  }
  function nctCdf(t, df, ncp) { // noncentral t distribution function by numerical integration over the chi distribution
    // T = (Z + ncp) / V with V = √(χ²_df / df): P(T ≤ t) = E[Φ(t·V − ncp)]
    const steps = 4000, upper = 6; let s2 = 0;
    for (let i = 1; i <= steps; i++) { const v = upper * (i - 0.5) / steps; s2 += jStat.normal.cdf(t * v - ncp, 0, 1) * chiDens(v, df) * upper / steps; }
    return s2;
  }
  const lgam = z => jStat.gammaln(z);
  const chiDens = (v, df) => Math.exp(Math.log(2) + (df / 2) * Math.log(df / 2) - lgam(df / 2) + (df - 1) * Math.log(v) - df * v * v / 2); // density of sqrt(chi²_df / df)
  function nTwoProps(p1, p2, alpha = 0.05, power = 0.8, ratio = 1) {
    const za = jStat.normal.inv(1 - alpha / 2, 0, 1), zb = jStat.normal.inv(power, 0, 1), pb = (p1 + ratio * p2) / (1 + ratio);
    const n = Math.ceil(((za * Math.sqrt(pb * (1 - pb) * (1 + 1 / ratio)) + zb * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2) / ratio)) ** 2) / (p1 - p2) ** 2);
    return { n1: n, n2: Math.ceil(n * ratio) };
  }
  // Mantel-Haenszel common odds ratio over strata (Robins-Breslow-Greenland CI), the Cochran-Mantel-Haenszel test and Breslow-Day homogeneity
  function mantelHaenszel(tables) { // each table [[a, b], [c, d]]: rows exposure yes/no, columns outcome yes/no
    const T = tables.filter(t => t[0][0] + t[0][1] + t[1][0] + t[1][1] > 1);
    let R = 0, Sx = 0, PR = 0, PS_QR = 0, QS = 0, num = 0, varA = 0, EA = 0, A = 0;
    T.forEach(([[a, b], [c, d]]) => { const n = a + b + c + d, r = a * d / n, s2 = b * c / n, P = (a + d) / n, Q = (b + c) / n;
      R += r; Sx += s2; PR += P * r; PS_QR += P * s2 + Q * r; QS += Q * s2;
      const n1 = a + b, n0 = c + d, m1 = a + c, m0 = b + d; A += a; EA += n1 * m1 / n; varA += n1 * n0 * m1 * m0 / (n * n * (n - 1)); });
    const or = R / Sx, se = Math.sqrt(PR / (2 * R * R) + PS_QR / (2 * R * Sx) + QS / (2 * Sx * Sx));
    const cmh = (Math.abs(A - EA) - 0.5) ** 2 / varA;
    // Breslow-Day: expected a in each stratum under the common OR
    let bd = 0;
    T.forEach(([[a, b], [c, d]]) => { const n1 = a + b, m1 = a + c, n = a + b + c + d, lo = Math.max(0, m1 - (n - n1)), hi = Math.min(n1, m1);
      const f = x => x * (n - n1 - m1 + x) - or * (n1 - x) * (m1 - x); let L = lo, H = hi; for (let it = 0; it < 200; it++) { const M = (L + H) / 2; if (f(M) > 0) H = M; else L = M; } const e = (L + H) / 2;
      const v = 1 / (1 / e + 1 / (n1 - e) + 1 / (m1 - e) + 1 / (n - n1 - m1 + e)); if (isFinite(v) && v > 0) bd += (a - e) ** 2 / v; });
    return { or, lo: Math.exp(Math.log(or) - ZC() * se), hi: Math.exp(Math.log(or) + ZC() * se), cmh, p: 1 - jStat.chisquare.cdf(cmh, 1), bd, bdP: T.length > 1 ? 1 - jStat.chisquare.cdf(bd, T.length - 1) : NaN, strata: T.length };
  }
  // Brown-Forsythe test for equal means (F*) and Yuen's trimmed-means t-test (20%)
  function brownForsytheMeans(groups) {
    const k = groups.length, n = groups.map(g => g.length), N = sum(n), m = groups.map(mean), v = groups.map(variance), gm = sum(groups.map((g, i) => n[i] * m[i])) / N;
    const num = sum(n.map((ni, i) => ni * (m[i] - gm) ** 2)), den = sum(n.map((ni, i) => (1 - ni / N) * v[i])), F = num / den;
    const c = n.map((ni, i) => (1 - ni / N) * v[i] / den), df2 = 1 / sum(c.map((ci, i) => ci * ci / (n[i] - 1)));
    return { F, df1: k - 1, df2, p: 1 - jStat.centralF.cdf(F, k - 1, df2) };
  }
  function yuen(x, y, tr = 0.2) {
    const tm = a => { const s2 = a.slice().sort((p, q) => p - q), g = Math.floor(tr * s2.length); return { m: mean(s2.slice(g, s2.length - g)), w: s2.map((v, i) => i < g ? s2[g] : i >= s2.length - g ? s2[s2.length - g - 1] : v), h: s2.length - 2 * g }; };
    const a = tm(x), b = tm(y), da = (x.length - 1) * variance(a.w) / (a.h * (a.h - 1)), db = (y.length - 1) * variance(b.w) / (b.h * (b.h - 1));
    const t = (a.m - b.m) / Math.sqrt(da + db), df = (da + db) ** 2 / (da * da / (a.h - 1) + db * db / (b.h - 1));
    return { t, df, p: 2 * (1 - jStat.studentt.cdf(Math.abs(t), df)), diff: a.m - b.m };
  }
  // conditional logistic regression for matched sets (Newton-Raphson on the conditional likelihood)
  function conditionalLogit(sets) { // sets: [{ y: [0/1 …], X: [[…], …] }]; one or more cases per set
    const p = sets[0].X[0].length; let b = new Array(p).fill(0), ll = 0, H = null, g = null;
    const subsets = (n, k) => { const out = []; const rec = (st, cur) => { if (cur.length === k) { out.push(cur.slice()); return; } for (let i = st; i < n; i++) { cur.push(i); rec(i + 1, cur); cur.pop(); } }; rec(0, []); return out; };
    for (let it = 0; it < 50; it++) {
      ll = 0; g = new Array(p).fill(0); H = Array.from({ length: p }, () => new Array(p).fill(0));
      for (const st of sets) {
        const cases = st.y.map((v, i) => v ? i : -1).filter(i => i >= 0), k = cases.length; if (!k || k === st.y.length) continue;
        const combos = subsets(st.y.length, k), sx = combos.map(c => st.X[0].map((_, j) => c.reduce((t, i) => t + st.X[i][j], 0))), eta = sx.map(v => v.reduce((t, x, j) => t + x * b[j], 0));
        const mx = Math.max(...eta), w = eta.map(e => Math.exp(e - mx)), W = w.reduce((t, x) => t + x, 0), obs = st.X[0].map((_, j) => cases.reduce((t, i) => t + st.X[i][j], 0));
        ll += obs.reduce((t, x, j) => t + x * b[j], 0) - (mx + Math.log(W));
        const ex = st.X[0].map((_, j) => sx.reduce((t, v, q) => t + v[j] * w[q], 0) / W);
        for (let a = 0; a < p; a++) { g[a] += obs[a] - ex[a]; for (let c = 0; c < p; c++) H[a][c] -= sx.reduce((t, v, q) => t + v[a] * v[c] * w[q], 0) / W - ex[a] * ex[c]; }
      }
      const Hi = invert(H.map(r => r.map(v => -v))); if (!Hi) return null;
      const step = Hi.map(r => r.reduce((t, v, j) => t + v * g[j], 0)); b = b.map((v, j) => v + step[j]);
      if (Math.max(...step.map(Math.abs)) < 1e-9) break;
    }
    const cov = invert(H.map(r => r.map(v => -v))), se = cov.map((r, i) => Math.sqrt(r[i]));
    return { b, se, or: b.map(Math.exp), lo: b.map((v, i) => Math.exp(v - ZC() * se[i])), hi: b.map((v, i) => Math.exp(v + ZC() * se[i])), p: b.map((v, i) => 2 * (1 - jStat.normal.cdf(Math.abs(v / se[i]), 0, 1))), ll };
  }
  /* ---------- stage 8: count, ordinal and multinomial models, method comparison, PCA, partial correlation, two-way ANOVA, mediation, model comparison ---------- */
  const zp = z => 2 * jStat.normal.cdf(-Math.abs(z), 0, 1);
  const termsOf = (beta, cov, exp) => beta.map((B, j) => { const se = Math.sqrt(cov[j][j]), z = B / se; return { B, se, z, p: zp(z), lo: B - ZC() * se, hi: B + ZC() * se, ...(exp ? { e: Math.exp(B), elo: Math.exp(B - ZC() * se), ehi: Math.exp(B + ZC() * se) } : {}) }; });
  // Poisson regression (log link) by IRLS; negative binomial (NB2) with α by maximum likelihood
  function poissonReg(X0, y, alpha = 0) {
    const X = X0.map(r => [1, ...r]), p = X[0].length, n = y.length;
    let beta = new Array(p).fill(0); beta[0] = Math.log(Math.max(mean(y), 1e-6));
    let inv = null;
    for (let it = 0; it < 100; it++) {
      const eta = X.map(x => sum(x.map((v, j) => v * beta[j]))), mu = eta.map(Math.exp), w = mu.map(m => m / (1 + alpha * m));
      const z = eta.map((e, i) => e + (y[i] - mu[i]) / mu[i]), { A, b } = crossprod(X, w, z); inv = invert(A); if (!inv) return null;
      const nb = inv.map(r => sum(r.map((v, j) => v * b[j]))), d = Math.max(...nb.map((v, j) => Math.abs(v - beta[j]))); beta = nb; if (d < 1e-10) break;
    }
    const mu = X.map(x => Math.exp(sum(x.map((v, j) => v * beta[j]))));
    inv = invert(crossprod(X, mu.map(m => m / (1 + alpha * m)), y).A);
    const lgam = v => jStat.gammaln(v);
    const ll = alpha > 0 ? sum(y.map((v, i) => lgam(v + 1 / alpha) - lgam(1 / alpha) - lgam(v + 1) - (1 / alpha) * Math.log(1 + alpha * mu[i]) + v * Math.log(alpha * mu[i] / (1 + alpha * mu[i]))))
      : sum(y.map((v, i) => v * Math.log(mu[i]) - mu[i] - lgam(v + 1)));
    const pearsonChi = sum(y.map((v, i) => (v - mu[i]) ** 2 / (mu[i] * (1 + alpha * mu[i]))));
    return { terms: termsOf(beta, inv, true), beta, cov: inv, ll, n, dispersion: pearsonChi / (n - p), mu };
  }
  function negBinReg(X0, y) {
    // profile likelihood over log α (golden section), then the coefficients at that α
    let lo = -8, hi = 4; const f = t => { const r = poissonReg(X0, y, Math.exp(t)); return r ? r.ll : -Infinity; };
    for (let i = 0; i < 80; i++) { const m1 = lo + (hi - lo) * 0.382, m2 = lo + (hi - lo) * 0.618; if (f(m1) < f(m2)) lo = m1; else hi = m2; }
    const alpha = Math.exp((lo + hi) / 2), r = poissonReg(X0, y, alpha); if (!r) return null;
    return { ...r, alpha };
  }
  // numerical Hessian of a log-likelihood from its gradient (central differences)
  function hessOf(grad, th) { const p = th.length, H = []; for (let j = 0; j < p; j++) { const h = 1e-5 * Math.max(1, Math.abs(th[j])), a = th.slice(), b = th.slice(); a[j] += h; b[j] -= h; const ga = grad(a), gb = grad(b); H.push(ga.map((v, i) => (v - gb[i]) / (2 * h))); }
    return H.map((r, i) => r.map((v, j) => (v + H[j][i]) / 2)); }
  function newton(ll, grad, th) {
    for (let it = 0; it < 100; it++) {
      const g = grad(th), Hi = invert(hessOf(grad, th).map(r => r.map(v => -v))); if (!Hi) return null;
      let step = Hi.map(r => sum(r.map((v, j) => v * g[j]))), t = 1, base = ll(th), nt;
      do { nt = th.map((v, j) => v + t * step[j]); t /= 2; } while (!(ll(nt) >= base - 1e-12) && t > 1e-6);
      const d = Math.max(...nt.map((v, j) => Math.abs(v - th[j]))); th = nt; if (d < 1e-9) break;
    }
    const cov = invert(hessOf(grad, th).map(r => r.map(v => -v))); return cov ? { th, cov, ll: ll(th) } : null;
  }
  const sig = x => 1 / (1 + Math.exp(-x));
  // proportional-odds (cumulative logit) model: P(Y ≤ k) = σ(θk − xβ), categories 0 … K−1
  function ordinalLogit(X, y, K) {
    const p = X[0].length, n = y.length;
    const cum = Array.from({ length: K - 1 }, (_, k) => y.filter(v => v <= k).length / n), th0 = [...cum.map(c => Math.log(Math.min(Math.max(c, 1e-4), 1 - 1e-4) / (1 - Math.min(Math.max(c, 1e-4), 1 - 1e-4)))), ...new Array(p).fill(0)];
    const pr = (th, i) => { const xb = sum(X[i].map((v, j) => v * th[K - 1 + j])), F = k => k < 0 ? 0 : k >= K - 1 ? 1 : sig(th[k] - xb); return [F(y[i]) - F(y[i] - 1), F, xb]; };
    const ll = th => { for (let k = 1; k < K - 1; k++) if (th[k] <= th[k - 1]) return -Infinity; return sum(y.map((_, i) => Math.log(Math.max(pr(th, i)[0], 1e-300)))); };
    const grad = th => { const g = new Array(th.length).fill(0);
      y.forEach((yi, i) => { const [P, F] = pr(th, i), d = k => { const f = F(k); return f * (1 - f); }, dU = yi < K - 1 ? d(yi) : 0, dL = yi > 0 ? d(yi - 1) : 0;
        if (yi < K - 1) g[yi] += dU / P; if (yi > 0) g[yi - 1] -= dL / P; X[i].forEach((v, j) => { g[K - 1 + j] += -v * (dU - dL) / P; }); });
      return g; };
    const r = newton(ll, grad, th0); if (!r) return null;
    const all = termsOf(r.th, r.cov, true);
    // likelihood-ratio test of the model, and the null log-likelihood
    const ll0 = sum(Array.from({ length: K }, (_, k) => { const nk = y.filter(v => v === k).length; return nk ? nk * Math.log(nk / n) : 0; }));
    const chi = 2 * (r.ll - ll0);
    return { thresholds: all.slice(0, K - 1), terms: all.slice(K - 1), ll: r.ll, ll0, chi, df: p, p: 1 - jStat.chisquare.cdf(chi, p), mcfadden: 1 - r.ll / ll0 };
  }
  // multinomial logistic regression against the first category; coefficients per other category
  function multinomLogit(X0, y, K) {
    const X = X0.map(r => [1, ...r]), p = X[0].length, n = y.length;
    const probs = (th, i) => { const e = [0, ...Array.from({ length: K - 1 }, (_, k) => sum(X[i].map((v, j) => v * th[k * p + j])))], m = Math.max(...e), ex = e.map(v => Math.exp(v - m)), s2 = sum(ex); return ex.map(v => v / s2); };
    const ll = th => sum(y.map((yi, i) => Math.log(Math.max(probs(th, i)[yi], 1e-300))));
    const grad = th => { const g = new Array(th.length).fill(0); y.forEach((yi, i) => { const P = probs(th, i); for (let k = 1; k < K; k++) X[i].forEach((v, j) => { g[(k - 1) * p + j] += v * ((yi === k) - P[k]); }); }); return g; };
    const r = newton(ll, grad, new Array((K - 1) * p).fill(0)); if (!r) return null;
    const all = termsOf(r.th, r.cov, true), ll0 = sum(Array.from({ length: K }, (_, k) => { const nk = y.filter(v => v === k).length; return nk ? nk * Math.log(nk / n) : 0; }));
    const chi = 2 * (r.ll - ll0), df = (K - 1) * (p - 1);
    return { byCat: Array.from({ length: K - 1 }, (_, k) => all.slice(k * p, k * p + p)), ll: r.ll, chi, df, p: 1 - jStat.chisquare.cdf(chi, df), mcfadden: 1 - r.ll / ll0 };
  }
  // Deming regression (error ratio λ = 1: orthogonal) with jackknife CIs; Passing-Bablok regression with its rank-based CIs
  function deming(x, y, lambda = 1) {
    const fit = (a, b) => { const mx = mean(a), my = mean(b), sxx = sum(a.map(v => (v - mx) ** 2)), syy = sum(b.map(v => (v - my) ** 2)), sxy = sum(a.map((v, i) => (v - mx) * (b[i] - my)));
      const sl = (syy - lambda * sxx + Math.sqrt((syy - lambda * sxx) ** 2 + 4 * lambda * sxy * sxy)) / (2 * sxy); return [my - sl * mx, sl]; };
    const [b0, b1] = fit(x, y), n = x.length, js = x.map((_, k) => fit(x.filter((_, i) => i !== k), y.filter((_, i) => i !== k)));
    const se = j => { const ps = js.map((q, k) => n * [b0, b1][j] - (n - 1) * q[j]), m = mean(ps); return Math.sqrt(sum(ps.map(v => (v - m) ** 2)) / (n * (n - 1))); };
    const t = jStat.studentt.inv(QU(), n - 2), s0 = se(0), s1 = se(1);
    return { intercept: b0, slope: b1, seI: s0, seS: s1, loI: b0 - t * s0, hiI: b0 + t * s0, loS: b1 - t * s1, hiS: b1 + t * s1, n };
  }
  function passingBablok(x, y) {
    const n = x.length, S = [];
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { const dx = x[j] - x[i], dy = y[j] - y[i]; if (dx === 0 && dy === 0) continue; const s2 = dx === 0 ? (dy > 0 ? Infinity : -Infinity) : dy / dx; if (s2 === -1) continue; S.push(s2); }
    S.sort((a, b) => a - b); const N = S.length, K = S.filter(v => v < -1).length;
    const at = q => S[Math.min(N - 1, Math.max(0, q))];
    const b = N % 2 ? at((N + 1) / 2 + K - 1) : (at(N / 2 + K - 1) + at(N / 2 + K)) / 2;
    const C = ZC() * Math.sqrt(n * (n - 1) * (2 * n + 5) / 18), M1 = Math.round((N - C) / 2), M2 = N - M1 + 1;
    const loS = at(M1 + K - 1), hiS = at(M2 + K - 1), a = median(y.map((v, i) => v - b * x[i]));
    return { slope: b, intercept: a, loS, hiS, loI: median(y.map((v, i) => v - hiS * x[i])), hiI: median(y.map((v, i) => v - loS * x[i])), n };
  }
  // symmetric eigen decomposition (Jacobi rotations)
  function eigenSym(A0) {
    const n = A0.length, A = A0.map(r => r.slice()), V = A.map((_, i) => A.map((_, j) => +(i === j)));
    for (let sweep = 0; sweep < 100; sweep++) {
      let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += A[i][j] ** 2; if (off < 1e-20) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) { if (Math.abs(A[p][q]) < 1e-300) continue;
        const th = (A[q][q] - A[p][p]) / (2 * A[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s2 = t * c;
        for (let k = 0; k < n; k++) { const akp = A[k][p], akq = A[k][q]; A[k][p] = c * akp - s2 * akq; A[k][q] = s2 * akp + c * akq; }
        for (let k = 0; k < n; k++) { const apk = A[p][k], aqk = A[q][k]; A[p][k] = c * apk - s2 * aqk; A[q][k] = s2 * apk + c * aqk; }
        for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s2 * vkq; V[k][q] = s2 * vkp + c * vkq; } }
    }
    const idx = A.map((_, i) => i).sort((a, b) => A[b][b] - A[a][a]);
    return { values: idx.map(i => A[i][i]), vectors: idx.map(i => V.map(r => r[i])) };
  }
  // principal components of the correlation matrix; loadings of the components kept (eigenvalue > 1 or a chosen number), varimax-rotated
  function pca(X, nKeep) {
    const p = X[0].length, cols = Array.from({ length: p }, (_, j) => X.map(r => r[j])), z = cols.map(c => { const m = mean(c), s2 = sd(c); return c.map(v => (v - m) / s2); });
    const R = z.map(a => z.map(b => sum(a.map((v, i) => v * b[i])) / (X.length - 1))), e = eigenSym(R);
    const k = nKeep || Math.max(1, e.values.filter(v => v > 1).length);
    let L = Array.from({ length: p }, (_, i) => Array.from({ length: k }, (_, j) => { const v = e.vectors[j]; const sgn = Math.sign(v.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a, 0)) || 1; return sgn * v[i] * Math.sqrt(Math.max(e.values[j], 0)); }));
    const rot = k > 1 ? varimax(L) : L;
    const kmo = (() => { const Ri = invert(R); if (!Ri) return NaN; let r2 = 0, q2 = 0; for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) if (i !== j) { r2 += R[i][j] ** 2; q2 += (-Ri[i][j] / Math.sqrt(Ri[i][i] * Ri[j][j])) ** 2; } return r2 / (r2 + q2); })();
    // Bartlett's test of sphericity
    const det = (() => { let d = 1; const A = R.map(r => r.slice()); for (let c = 0; c < p; c++) { let pv = c; for (let r = c + 1; r < p; r++) if (Math.abs(A[r][c]) > Math.abs(A[pv][c])) pv = r; if (pv !== c) { [A[c], A[pv]] = [A[pv], A[c]]; d = -d; } d *= A[c][c]; for (let r = c + 1; r < p; r++) { const f = A[r][c] / A[c][c]; for (let q = c; q < p; q++) A[r][q] -= f * A[c][q]; } } return d; })();
    const bChi = -(X.length - 1 - (2 * p + 5) / 6) * Math.log(det), bDf = p * (p - 1) / 2;
    return { values: e.values, explained: e.values.map(v => v / p), k, loadings: L, rotated: rot, kmo, bartlett: { chi: bChi, df: bDf, p: 1 - jStat.chisquare.cdf(bChi, bDf) } };
  }
  function varimax(L0) {
    const p = L0.length, k = L0[0].length, h = L0.map(r => Math.sqrt(sum(r.map(v => v * v))) || 1); let L = L0.map((r, i) => r.map(v => v / h[i]));
    for (let it = 0; it < 100; it++) { let ch = 0;
      for (let a = 0; a < k; a++) for (let b = a + 1; b < k; b++) {
        let A = 0, B = 0, C = 0, D = 0; for (let i = 0; i < p; i++) { const u = L[i][a] ** 2 - L[i][b] ** 2, v = 2 * L[i][a] * L[i][b]; A += u; B += v; C += u * u - v * v; D += 2 * u * v; }
        const phi = Math.atan2(D - 2 * A * B / p, C - (A * A - B * B) / p) / 4; if (Math.abs(phi) < 1e-10) continue; ch++;
        const c = Math.cos(phi), s2 = Math.sin(phi); L = L.map(r => { const x = r[a], y = r[b], o = r.slice(); o[a] = c * x + s2 * y; o[b] = -s2 * x + c * y; return o; }); }
      if (!ch) break; }
    return L.map((r, i) => r.map(v => v * h[i]));
  }
  // partial correlation of x and y controlling for the columns of Z (residual method)
  function partialCorr(x, y, Z) {
    const res = v => { const m = linearRegression(Z, v); return v.map((t, i) => t - sum([1, ...Z[i]].map((z, j) => z * m.coef[j]))); };
    const rx = res(x), ry = res(y), r = pearson(rx, ry).r, df = x.length - 2 - Z[0].length, t = r * Math.sqrt(df / (1 - r * r));
    return { r, df, t, p: 2 * (1 - jStat.studentt.cdf(Math.abs(t), df)), n: x.length };
  }
  // two-way ANOVA (type II sums of squares) with the interaction; a, b are level indices 0…ka−1 / 0…kb−1
  function twoWayAnova(y, a, b, ka, kb) {
    const dA = i => Array.from({ length: ka - 1 }, (_, j) => +(a[i] === j + 1)), dB = i => Array.from({ length: kb - 1 }, (_, j) => +(b[i] === j + 1));
    const dAB = i => dA(i).flatMap(u => dB(i).map(v => u * v));
    const fit = f => linearRegression(y.map((_, i) => f(i)), y);
    const mA = fit(dA), mB = fit(dB), mAB = fit(i => [...dA(i), ...dB(i)]), mFull = fit(i => [...dA(i), ...dB(i), ...dAB(i)]);
    if (!mA || !mB || !mAB || !mFull) return null;
    const dfE = mFull.df, msE = mFull.sse / dfE, row = (ss, df) => ({ ss, df, F: ss / df / msE, p: 1 - jStat.centralF.cdf(ss / df / msE, df, dfE), eta: ss / (ss + mFull.sse) });
    return { A: row(mB.sse - mAB.sse, ka - 1), B: row(mA.sse - mAB.sse, kb - 1), AB: row(mAB.sse - mFull.sse, (ka - 1) * (kb - 1)), error: { ss: mFull.sse, df: dfE, ms: msE }, n: y.length };
  }
  // simple mediation x → m → y: paths a, b, c, c′, the indirect effect a·b with Sobel's test and a percentile bootstrap CI (seeded)
  function mediation(x, m, y, B = 2000, seed = 1) {
    const reg = (X, v) => linearRegression(X, v);
    const ra = reg(x.map(v => [v]), m), rb = reg(x.map((v, i) => [v, m[i]]), y), rc = reg(x.map(v => [v]), y);
    if (!ra || !rb || !rc) return null;
    const a = ra.terms[1], b = rb.terms[2], ind = a.B * b.B, seS = Math.sqrt(b.B ** 2 * a.se ** 2 + a.B ** 2 * b.se ** 2), zS = ind / seS;
    const rnd = seeded(seed), n = x.length, boot = [];
    for (let k = 0; k < B; k++) { const ix = Array.from({ length: n }, () => Math.floor(rnd() * n)), X = ix.map(i => x[i]), M = ix.map(i => m[i]), Y = ix.map(i => y[i]);
      const p1 = reg(X.map(v => [v]), M), p2 = reg(X.map((v, i) => [v, M[i]]), Y); if (p1 && p2) boot.push(p1.coef[1] * p2.coef[2]); }
    boot.sort((u, v) => u - v);
    return { a, b, c: rc.terms[1], cPrime: rb.terms[1], indirect: ind, sobelZ: zS, sobelP: zp(zS), bootLo: quantile(boot, QL()), bootHi: quantile(boot, QU()), propMediated: ind / rc.terms[1].B, n };
  }
  // AUC (Mann-Whitney), continuous NRI and IDI between an old and a new risk model, decision-curve net benefit
  function aucOf(p, y) { const pos = p.filter((_, i) => y[i]), neg = p.filter((_, i) => !y[i]); if (!pos.length || !neg.length) return NaN; const r = rank([...pos, ...neg]).ranks; return (sum(r.slice(0, pos.length)) - pos.length * (pos.length + 1) / 2) / (pos.length * neg.length); }
  function nriIdi(pOld, pNew, y) {
    const ev = y.map((v, i) => i).filter(i => y[i]), ne = y.map((v, i) => i).filter(i => !y[i]);
    const up = I => I.filter(i => pNew[i] > pOld[i]).length / I.length, dn = I => I.filter(i => pNew[i] < pOld[i]).length / I.length;
    const nriE = up(ev) - dn(ev), nriN = dn(ne) - up(ne), nri = nriE + nriN;
    const seN = Math.sqrt((up(ev) + dn(ev) - nriE ** 2) / ev.length + (up(ne) + dn(ne) - nriN ** 2) / ne.length);
    const d = pNew.map((v, i) => v - pOld[i]), dE = ev.map(i => d[i]), dN = ne.map(i => d[i]), idi = mean(dE) - mean(dN);
    const seI = Math.sqrt(variance(dE) / ev.length + variance(dN) / ne.length);
    return { nri, nriE, nriN, nriLo: nri - ZC() * seN, nriHi: nri + ZC() * seN, nriP: zp(nri / seN), idi, idiLo: idi - ZC() * seI, idiHi: idi + ZC() * seI, idiP: zp(idi / seI) };
  }
  function netBenefit(p, y, thresholds) { const n = y.length, prev = sum(y) / n;
    return thresholds.map(t => { let tp = 0, fp = 0; p.forEach((v, i) => { if (v >= t) { if (y[i]) tp++; else fp++; } }); return { t, model: tp / n - fp / n * t / (1 - t), all: prev - (1 - prev) * t / (1 - t) }; }); }
  // optimism-corrected AUC of a logistic model by bootstrap (Harrell), B refits on resamples
  function optimismAuc(X, y, B = 200, seed = 1) {
    const pred = (m, R) => R.map(r => sig(sum([1, ...r].map((v, j) => v * m.terms[j].B))));
    const full = logisticRegression(X, y); if (!full) return null;
    const app = aucOf(pred(full, X), y), rnd = seeded(seed), opt = []; const n = y.length;
    for (let k = 0; k < B; k++) { const ix = Array.from({ length: n }, () => Math.floor(rnd() * n)), Xb = ix.map(i => X[i]), yb = ix.map(i => y[i]);
      if (!yb.some(v => v) || yb.every(v => v)) continue; const m = logisticRegression(Xb, yb); if (!m || m.unstable) continue;
      opt.push(aucOf(pred(m, Xb), yb) - aucOf(pred(m, X), y)); }
    const o = mean(opt); return { apparent: app, optimism: o, corrected: app - o, B: opt.length };
  }
  // propensity scores: 1:1 nearest-neighbour matching without replacement within a caliper (0.2 SD of the logit), and inverse probability weights (ATE)
  function propensityMatch(ps, treat, caliperSd = 0.2) {
    const lg = ps.map(p => Math.log(p / (1 - p))), cal = caliperSd * sd(lg), T = treat.map((t, i) => i).filter(i => treat[i]), C = treat.map((t, i) => i).filter(i => !treat[i]);
    const used = new Set(), pairs = [];
    [...T].sort((a, b) => ps[b] - ps[a]).forEach(i => { let best = -1, bd = Infinity; C.forEach(j => { if (used.has(j)) return; const dd = Math.abs(lg[i] - lg[j]); if (dd < bd) { bd = dd; best = j; } });
      if (best >= 0 && bd <= cal) { used.add(best); pairs.push([i, best]); } });
    const w = ps.map((p, i) => treat[i] ? 1 / p : 1 / (1 - p));
    return { pairs, caliper: cal, weights: w };
  }
  // standardized mean difference (pooled SD), optionally weighted
  function smd(x, treat, w) {
    const W = w || x.map(() => 1), grp = t => { const I = x.map((_, i) => i).filter(i => !!treat[i] === t), sw = sum(I.map(i => W[i])), m = sum(I.map(i => W[i] * x[i])) / sw, v = sum(I.map(i => W[i] * (x[i] - m) ** 2)) / sw; return [m, v]; };
    const [m1, v1] = grp(true), [m0, v0] = grp(false); return (m1 - m0) / Math.sqrt((v1 + v0) / 2);
  }
  /* ---------- more advanced: competing risks, splines, time-dependent AUC, multiple imputation, quantile regression, kappas, rmcorr, Firth ---------- */
  // cumulative incidence of cause 1 with competing cause 2 (0 = censored): Aalen-Johansen
  function cumIncidence(times, cause) {
    const idx = times.map((t, i) => i).sort((a, b) => times[a] - times[b]); let atRisk = times.length, S = 1, F = 0;
    const steps = [{ t: 0, s: 0 }], censored = [];
    for (let i = 0; i < idx.length;) { const t = times[idx[i]]; let d1 = 0, d2 = 0, c = 0;
      while (i < idx.length && times[idx[i]] === t) { const k = cause[idx[i]]; k === 1 ? d1++ : k === 2 ? d2++ : c++; i++; }
      if (d1) { F += S * d1 / atRisk; steps.push({ t, s: F }); }
      if (d1 + d2) S *= 1 - (d1 + d2) / atRisk;
      if (c) censored.push({ t, s: F });
      atRisk -= d1 + d2 + c; }
    return { steps, censored, final: F };
  }
  // restricted cubic spline basis (Harrell): knots at quantiles; returns the k − 1 columns for a value
  const q7 = (a, p) => { const v = sorted(a), h = (v.length - 1) * p, l = Math.floor(h); return v[l] + (h - l) * ((v[Math.min(l + 1, v.length - 1)]) - v[l]); };
  function rcsKnots(x, k) { const P = { 3: [0.1, 0.5, 0.9], 4: [0.05, 0.35, 0.65, 0.95], 5: [0.05, 0.275, 0.5, 0.725, 0.95] }[k] || [0.1, 0.5, 0.9]; return P.map(q => q7(x, q)); }
  function rcsBasis(v, t) {
    const k = t.length, pp = u => u > 0 ? u * u * u : 0, d = (t[k - 1] - t[0]) ** 2, out = [v];
    for (let j = 0; j < k - 2; j++) out.push((pp(v - t[j]) - pp(v - t[k - 2]) * (t[k - 1] - t[j]) / (t[k - 1] - t[k - 2]) + pp(v - t[k - 1]) * (t[k - 2] - t[j]) / (t[k - 1] - t[k - 2])) / d);
    return out;
  }
  // Wald test of several coefficients
  function waldTest(beta, cov, idx) { const b = idx.map(i => beta[i]), C = invert(idx.map(i => idx.map(j => cov[i][j]))); if (!C) return null;
    const chi = b.reduce((t, v, a) => t + v * b.reduce((u, w, q) => u + C[a][q] * w, 0), 0); return { chi, df: idx.length, p: 1 - jStat.chisquare.cdf(chi, idx.length) }; }
  // cumulative / dynamic AUC at time t with inverse-probability-of-censoring weights (Uno 2007)
  function tdAuc(time, event, marker, t) {
    const n = time.length, cens = kaplanMeier(time, event.map(e => !e));
    const G = u => { let g = 1; for (const q of cens.steps) { if (q.t < u) g = q.s; else break; } return g; };
    let num = 0, den1 = 0, nCtrl = 0;
    for (let j = 0; j < n; j++) if (time[j] > t) nCtrl++;
    for (let i = 0; i < n; i++) { if (!(time[i] <= t && event[i])) continue; const w = 1 / G(time[i]); den1 += w;
      for (let j = 0; j < n; j++) if (time[j] > t) num += w * (marker[i] > marker[j] ? 1 : marker[i] === marker[j] ? 0.5 : 0); }
    return den1 && nCtrl ? num / (den1 * nCtrl) : NaN;
  }
  // AUC(t) with a percentile bootstrap CI
  function tdAucCI(time, event, marker, t, B = 200, seed = 1) {
    const auc = tdAuc(time, event, marker, t), rnd = seeded(seed), n = time.length, bs = [];
    for (let b = 0; b < B; b++) { const ix = Array.from({ length: n }, () => Math.floor(rnd() * n)), v = tdAuc(ix.map(i => time[i]), ix.map(i => event[i]), ix.map(i => marker[i]), t); if (isFinite(v)) bs.push(v); }
    return { auc, lo: bs.length > 10 ? quantile(bs, QL()) : NaN, hi: bs.length > 10 ? quantile(bs, QU()) : NaN, B: bs.length };
  }
  // Rubin's rules: pooled estimates of m fits (each { b: [], v: [] variances })
  function rubin(fits, dfcom = Infinity) {
    const m = fits.length, p = fits[0].b.length;
    return Array.from({ length: p }, (_, j) => { const q = fits.map(f => f.b[j]), u = fits.map(f => f.v[j]), Q = mean(q), U = mean(u), B = m > 1 ? variance(q) : 0, T = U + (1 + 1 / m) * B;
      const r = (1 + 1 / m) * B / U, g = (1 + 1 / m) * B / T, dfo = isFinite(dfcom) ? (dfcom + 1) / (dfcom + 3) * dfcom * (1 - g) : Infinity, dfr = B > 0 ? (m - 1) * (1 + 1 / r) ** 2 : Infinity, df = isFinite(dfo) ? 1 / (1 / dfr + 1 / dfo) : dfr, se = Math.sqrt(T), tq = isFinite(df) ? jStat.studentt.inv(QU(), df) : ZC(), tt = Q / se;
      return { B: Q, se, df, lo: Q - tq * se, hi: Q + tq * se, p: isFinite(df) ? 2 * (1 - jStat.studentt.cdf(Math.abs(tt), df)) : zp(tt), fmi: (r + 2 / (df + 3)) / (r + 1) }; });
  }
  // multiple imputation by chained equations: numeric columns by predictive mean matching, yes/no and other categories by logistic draws
  function mice(M, kinds, m = 20, iters = 10, seed = 1) {
    const rnd = seeded(seed), n = M.length, p = M[0].length, miss = M.map(r => r.map(v => v === null || !isFinite(v)));
    const norm = () => Math.sqrt(-2 * Math.log(rnd() || 1e-12)) * Math.cos(2 * Math.PI * rnd());
    const chol = A => { const L = A.map(r => r.map(() => 0)); for (let i = 0; i < A.length; i++) for (let j = 0; j <= i; j++) { let s2 = A[i][j]; for (let k = 0; k < j; k++) s2 -= L[i][k] * L[j][k]; L[i][j] = i === j ? Math.sqrt(Math.max(s2, 1e-12)) : s2 / L[j][j]; } return L; };
    const drawB = (b, cov) => { const L = chol(cov), z = b.map(() => norm()); return b.map((v, i) => v + L[i].reduce((t, l, k) => t + l * z[k], 0)); };
    const out = [];
    for (let rep = 0; rep < m; rep++) {
      const D = M.map((r, i) => r.map((v, j) => miss[i][j] ? NaN : v));
      for (let j = 0; j < p; j++) { const obs = D.map(r => r[j]).filter(isFinite); D.forEach((r, i) => { if (miss[i][j]) r[j] = obs[Math.floor(rnd() * obs.length)]; }); }
      for (let it = 0; it < iters; it++) for (let j = 0; j < p; j++) {
        const mi = D.map((_, i) => i).filter(i => miss[i][j]); if (!mi.length) continue;
        const oi = D.map((_, i) => i).filter(i => !miss[i][j]), X = i => D[i].filter((_, k) => k !== j);
        if (kinds[j] === 'num') {
          const fit = linearRegression(oi.map(X), oi.map(i => D[i][j])); if (!fit) continue;
          const df = fit.df, s2 = fit.sse / df, chi = jStat.chisquare.inv(rnd() * 0.999 + 0.0005, df), s2d = s2 * df / chi;
          const bd = drawB(fit.coef, fit.cov.map(r => r.map(v => v * s2d / s2))), pr = (b, i) => sum([1, ...X(i)].map((v, k) => v * b[k]));
          const yhat = oi.map(i => pr(fit.coef, i));
          mi.forEach(i => { const t = pr(bd, i), near = oi.map((o, q) => [Math.abs(yhat[q] - t), o]).sort((a, b) => a[0] - b[0]).slice(0, 5); D[i][j] = M[near[Math.floor(rnd() * near.length)][1]][j]; });
        } else {
          const fit = logisticRegression(oi.map(X), oi.map(i => D[i][j] ? 1 : 0)); if (!fit || !fit.cov) continue;
          const bd = drawB(fit.terms.map(t => t.B), fit.cov);
          mi.forEach(i => { const z = sum([1, ...X(i)].map((v, k) => v * bd[k])); D[i][j] = rnd() < 1 / (1 + Math.exp(-z)) ? 1 : 0; });
        }
      }
      out.push(D);
    }
    return out;
  }
  // quantile regression (IRLS, as statsmodels QuantReg) with the robust kernel (Epanechnikov, Hall-Sheather) covariance
  function quantReg(X0, y, q = 0.5) {
    const X = X0.map(r => [1, ...r]), n = y.length, p = X[0].length; let beta = new Array(p).fill(1), xs = X;
    for (let it = 0; it < 1000; it++) {
      const A = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => sum(xs.map((r, i) => r[a] * X[i][b])))), bv = Array.from({ length: p }, (_, a) => sum(xs.map((r, i) => r[a] * y[i])));
      const Ai = invert(A); if (!Ai) return null; const nb = Ai.map(r => sum(r.map((v, j) => v * bv[j])));
      const diff = Math.max(...nb.map((v, j) => Math.abs(v - beta[j]))); beta = nb;
      let res = y.map((v, i) => v - sum(X[i].map((x, j) => x * beta[j])));
      res = res.map(r => Math.abs(r) < 1e-6 ? (r >= 0 ? 1e-6 : -1e-6) : r).map(r => Math.abs(r < 0 ? q * r : (1 - q) * r));
      xs = X.map((r, i) => r.map(v => v / res[i]));
      if (diff < 1e-6) break;
    }
    const e = y.map((v, i) => v - sum(X[i].map((x, j) => x * beta[j]))), z = jStat.normal.inv(q, 0, 1), alpha = 0.05;
    let h = Math.pow(n, -1 / 3) * Math.pow(jStat.normal.inv(1 - alpha / 2, 0, 1), 2 / 3) * Math.pow(1.5 * jStat.normal.pdf(z, 0, 1) ** 2 / (2 * z * z + 1), 1 / 3);
    const iqre = q7(e, 0.75) - q7(e, 0.25), sdy = Math.sqrt(sum(y.map(v => (v - mean(y)) ** 2)) / n);
    h = Math.min(sdy, iqre / 1.34) * (jStat.normal.inv(q + h, 0, 1) - jStat.normal.inv(q - h, 0, 1));
    const fhat = sum(e.map(r => { const u = r / h; return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0; })) / (n * h);
    const XtX = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => sum(X.map(r => r[a] * r[b])))), XtXi = invert(XtX);
    const dd = e.map(r => r > 0 ? (q / fhat) ** 2 : ((1 - q) / fhat) ** 2), XdX = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => sum(X.map((r, i) => r[a] * dd[i] * r[b]))));
    const cov = XtXi.map((r, a) => XtXi.map((_, b) => sum(r.map((v, k) => v * sum(XdX[k].map((w, l) => w * XtXi[l][b]))))));
    const df = n - p, tq = jStat.studentt.inv(QU(), df);
    return { terms: beta.map((B, j) => { const se = Math.sqrt(cov[j][j]), t = B / se; return { B, se, t, p: 2 * (1 - jStat.studentt.cdf(Math.abs(t), df)), lo: B - tq * se, hi: B + tq * se }; }), n, df, q };
  }
  // Fleiss' kappa for several raters (rows = subjects, values = categories), with the large-sample test (Fleiss, Nee and Landis 1979)
  function fleissKappa(R) {
    const cats = [...new Set(R.flat())], N = R.length, n = R[0].length, cnt = R.map(r => cats.map(c => r.filter(v => v === c).length));
    const pj = cats.map((_, j) => sum(cnt.map(r => r[j])) / (N * n)), Pi = cnt.map(r => (sum(r.map(v => v * v)) - n) / (n * (n - 1)));
    const Pbar = mean(Pi), Pe = sum(pj.map(v => v * v)), kappa = (Pbar - Pe) / (1 - Pe);
    const var0 = 2 / (N * n * (n - 1)) * (Pe - (2 * n - 3) * Pe * Pe + 2 * (n - 2) * sum(pj.map(v => v ** 3))) / (1 - Pe) ** 2, z = kappa / Math.sqrt(var0);
    return { kappa, z, p: zp(z), N, raters: n, cats: cats.length, se0: Math.sqrt(var0) };
  }
  // repeated-measures correlation (Bakdash & Marusich): the common within-subject association
  function rmCorr(x, y, subj) {
    const ids = [...new Set(subj)], k = ids.length, N = x.length, gi = subj.map(s => ids.indexOf(s));
    const mx = ids.map((_, g) => mean(x.filter((_, i) => gi[i] === g))), my = ids.map((_, g) => mean(y.filter((_, i) => gi[i] === g)));
    const dx = x.map((v, i) => v - mx[gi[i]]), dy = y.map((v, i) => v - my[gi[i]]), sxx = sum(dx.map(v => v * v)), sxy = sum(dx.map((v, i) => v * dy[i])), syy = sum(dy.map(v => v * v));
    const b = sxy / sxx, ssx = b * b * sxx, ssr = syy - ssx, df = N - k - 1, r = Math.sign(b) * Math.sqrt(ssx / (ssx + ssr)), F = ssx / (ssr / df);
    const z = Math.atanh(r), se = 1 / Math.sqrt(df - 1);
    return { r, df, p: 1 - jStat.centralF.cdf(F, 1, df), lo: Math.tanh(z - ZC() * se), hi: Math.tanh(z + ZC() * se), n: N, subjects: k };
  }
  // Firth's penalized logistic regression (bias reduction; works under separation), Wald inference
  function firthLogistic(X0, y) {
    const X = X0.map(r => [1, ...r]), n = y.length, p = X[0].length; let b = new Array(p).fill(0), cov = null;
    for (let it = 0; it < 100; it++) {
      const pi = X.map(r => 1 / (1 + Math.exp(-sum(r.map((v, j) => v * b[j]))))), w = pi.map(v => v * (1 - v));
      const I = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, c) => sum(X.map((r, i) => r[a] * w[i] * r[c])))), Ii = invert(I); if (!Ii) return null;
      const h = X.map((r, i) => w[i] * sum(r.map((v, a) => v * sum(r.map((u, c) => Ii[a][c] * u)))));
      const U = Array.from({ length: p }, (_, a) => sum(X.map((r, i) => r[a] * (y[i] - pi[i] + h[i] * (0.5 - pi[i])))));
      const step = Ii.map(r => sum(r.map((v, j) => v * U[j]))), mx = Math.max(...step.map(Math.abs)), sc = mx > 5 ? 5 / mx : 1;
      b = b.map((v, j) => v + sc * step[j]); cov = Ii; if (mx < 1e-9) break;
    }
    return { terms: b.map((B, j) => { const se = Math.sqrt(cov[j][j]), z = B / se; return { B, se, p: zp(z), or: Math.exp(B), lo: Math.exp(B - ZC() * se), hi: Math.exp(B + ZC() * se) }; }), n };
  }
  // JZS Bayes factor BF10 for a two-sample t-test (Cauchy prior on the effect size, r = √2/2), by numerical integration over g
  function bayesFactorT(t, n1, n2, r = Math.SQRT1_2) {
    const N = n1 * n2 / (n1 + n2), df = n1 + n2 - 2;
    const f = g => Math.pow(1 + N * g * r * r, -0.5) * Math.pow(1 + t * t / ((1 + N * g * r * r) * df), -(df + 1) / 2) * Math.pow(2 * Math.PI, -0.5) * Math.pow(g, -1.5) * Math.exp(-1 / (2 * g));
    // integrate over g on a log scale
    let s2 = 0; const lo = -12, hi = 12, steps = 4000, h = (hi - lo) / steps;
    for (let i = 0; i <= steps; i++) { const u = lo + i * h, g = Math.exp(u), w = i === 0 || i === steps ? 1 : i % 2 ? 4 : 2; s2 += w * f(g) * g; }
    s2 *= h / 3;
    return s2 / Math.pow(1 + t * t / df, -(df + 1) / 2);
  }
  // equivalence by two one-sided t-tests (TOST) against the margins (lo, hi) of the mean difference x − y
  // Box-Cox: the λ that maximises the profile log-likelihood (as scipy.stats.boxcox), on positive values
  function boxCoxLambda(x) {
    const n = x.length, sl = sum(x.map(Math.log));
    const llf = l => { const y = x.map(v => Math.abs(l) < 1e-12 ? Math.log(v) : (v ** l - 1) / l), m = mean(y), v2 = sum(y.map(t => (t - m) ** 2)) / n; return (l - 1) * sl - n / 2 * Math.log(v2); };
    // golden-section search after a coarse grid
    let best = -2, bv = -Infinity; for (let l = -5; l <= 5.0001; l += 0.05) { const f = llf(l); if (f > bv) { bv = f; best = l; } }
    let a = best - 0.05, b = best + 0.05; const g = (Math.sqrt(5) - 1) / 2;
    for (let i = 0; i < 100; i++) { const c = b - g * (b - a), d = a + g * (b - a); if (llf(c) > llf(d)) b = d; else a = c; }
    return (a + b) / 2;
  }
  const boxCox = (v, l) => Math.abs(l) < 1e-12 ? Math.log(v) : (v ** l - 1) / l;
  /* ---------- non-inferiority / equivalence / superiority with a margin ---------- */
  const wilsonCI = (x, n, z) => { const p = x / n, den = 1 + z * z / n, c = (p + z * z / (2 * n)) / den, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / den; return [c - h, c + h]; };
  // Newcombe's hybrid score interval of p1 − p2 (method 10)
  function newcombeDiff(x1, n1, x2, n2, conf) {
    const z = jStat.normal.inv(1 - (1 - conf) / 2, 0, 1), p1 = x1 / n1, p2 = x2 / n2, [l1, u1] = wilsonCI(x1, n1, z), [l2, u2] = wilsonCI(x2, n2, z), d = p1 - p2;
    return { d, lo: d - Math.sqrt((p1 - l1) ** 2 + (u2 - p2) ** 2), hi: d + Math.sqrt((u1 - p1) ** 2 + (p2 - l2) ** 2) };
  }
  // Farrington-Manning score statistic for H0: p1 − p2 = delta (restricted maximum likelihood)
  function fmZ(x1, n1, x2, n2, delta) {
    const p1 = x1 / n1, p2 = x2 / n2, N = n1 + n2, C = x1 + x2; let q0 = C / N, q1 = q0;
    if (delta !== 0) { const t3 = N, t2 = (n1 + 2 * n2) * delta - N - C, t1 = (x2 * delta - N - 2 * x2) * delta + C, t0 = x2 * delta * (1 - delta);
      const q = (t2 / (3 * t3)) ** 3 - t1 * t2 / (6 * t3 * t3) + t0 / (2 * t3), pp = Math.sign(q) * Math.sqrt(Math.max(0, (t2 / (3 * t3)) ** 2 - t1 / (3 * t3))), an = (Math.PI + Math.acos(Math.max(-1, Math.min(1, pp ? q / pp ** 3 : 0)))) / 3;
      q0 = 2 * pp * Math.cos(an) - t2 / (3 * t3); q1 = q0 + delta; }
    const se = Math.sqrt(Math.max(1e-300, q1 * (1 - q1) / n1 + q0 * (1 - q0) / n2)); return (p1 - p2 - delta) / se;
  }
  // margin tests of a difference (new − reference): design 'noninf' | 'equiv' | 'superior'; better 'higher' | 'lower'
  // est, se and df (Infinity for z) give the CI and the one-sided P values; zAt(delta) may replace (est − delta) / se (score tests)
  function marginTest(est, se, df, margin, design, better, conf, zAt) {
    const q = isFinite(df) ? jStat.studentt.inv(1 - (1 - conf) / 2, df) : jStat.normal.inv(1 - (1 - conf) / 2, 0, 1), cdf = t => isFinite(df) ? jStat.studentt.cdf(t, df) : jStat.normal.cdf(t, 0, 1);
    const stat = d0 => zAt ? zAt(d0) : (est - d0) / se, pAbove = d0 => 1 - cdf(stat(d0)), pBelow = d0 => cdf(stat(d0)), M = Math.abs(margin), up = better !== 'lower';
    let p;
    if (design === 'equiv') p = Math.max(pAbove(-M), pBelow(M));
    else if (design === 'superior') p = up ? pAbove(M) : pBelow(-M);
    else p = up ? pAbove(-M) : pBelow(M);
    return { est, se, lo: est - q * se, hi: est + q * se, p, pSup0: up ? pAbove(0) : pBelow(0) };
  }
  // sample size per group (equal groups) for a margin design; sd for means, or p (the expected proportion in both groups) for proportions
  function nMargin({ sd, p, margin, design, conf, power, trueDiff = 0 }) {
    const za = jStat.normal.inv(1 - (1 - conf) / 2, 0, 1), zb = jStat.normal.inv(design === 'equiv' ? 1 - (1 - power) / 2 : power, 0, 1), v = isFinite(sd) ? 2 * sd * sd : 2 * p * (1 - p);
    const gap = design === 'equiv' ? Math.abs(margin) - Math.abs(trueDiff) : design === 'superior' ? Math.abs(trueDiff) - Math.abs(margin) : Math.abs(margin) + trueDiff;
    return gap > 0 ? Math.ceil(v * (za + zb) ** 2 / (gap * gap)) : Infinity;
  }
  /* ---------- GEE (binary / count / numeric repeated outcomes) and a random-intercept logistic GLMM ---------- */
  // y, X (with intercept column), cluster ids, time index per row (for AR(1)); robust (sandwich) covariance, as statsmodels GEE
  function gee(y, X, cl, time, family = 'binomial', corr = 'exchangeable') {
    const n = y.length, p = X[0].length, ids = [...new Set(cl)], groups = ids.map(id => cl.map((c, i) => c === id ? i : -1).filter(i => i >= 0));
    const lk = family === 'binomial' ? { inv: e => 1 / (1 + Math.exp(-e)), d: m => m * (1 - m), v: m => m * (1 - m) } : family === 'poisson' ? { inv: Math.exp, d: m => m, v: m => m } : { inv: e => e, d: () => 1, v: () => 1 };
    let beta = new Array(p).fill(0), alpha = 0, mu = [];
    if (family === 'binomial') { const m0 = mean(y); beta[0] = Math.log(Math.max(1e-6, m0) / Math.max(1e-6, 1 - m0)); } else if (family === 'poisson') beta[0] = Math.log(Math.max(1e-6, mean(y))); else beta[0] = mean(y);
    const R = g => g.map((i, a) => g.map((j, b) => a === b ? 1 : corr === 'independence' ? 0 : corr === 'ar1' ? alpha ** Math.abs(time[i] - time[j]) : alpha));
    const means = () => { mu = X.map(r => lk.inv(r.reduce((t, v, j) => t + v * beta[j], 0))); };
    const parts = () => { const B = Array.from({ length: p }, () => new Array(p).fill(0)), U = new Array(p).fill(0), per = [];
      for (const g of groups) { const sdv = g.map(i => Math.sqrt(lk.v(mu[i]))), Rm = R(g), V = Rm.map((r, a) => r.map((v, b) => v * sdv[a] * sdv[b])), Vi = invert(V); if (!Vi) return null;
        const D = g.map(i => X[i].map(x => x * lk.d(mu[i]))), res = g.map(i => y[i] - mu[i]), VD = Vi.map(r => D[0].map((_, j) => r.reduce((t, v, k) => t + v * D[k][j], 0))), Vr = Vi.map(r => r.reduce((t, v, k) => t + v * res[k], 0));
        const u = D[0].map((_, j) => D.reduce((t, row, k) => t + row[j] * Vr[k], 0)); per.push(u);
        for (let a = 0; a < p; a++) { U[a] += u[a]; for (let b = 0; b < p; b++) for (let k = 0; k < g.length; k++) B[a][b] += D[k][a] * VD[k][b]; } }
      return { B, U, per }; };
    const updAssoc = () => { if (corr === 'independence') return; const pr = groups.map(g => g.map(i => (y[i] - mu[i]) / Math.sqrt(lk.v(mu[i]))));
      if (corr === 'ar1') { let l0 = 0, l1 = 0; pr.forEach((r, gi) => { const g = groups[gi], o = g.map((_, k) => k).sort((a, b) => time[g[a]] - time[g[b]]), rr = o.map(k => r[k]); if (rr.length > 1) { let s1 = 0; for (let k = 0; k + 1 < rr.length; k++) s1 += rr[k] * rr[k + 1]; l1 += s1 / (rr.length - 1); l0 += rr.reduce((t, v) => t + v * v, 0) / rr.length; } }); alpha = l0 ? l1 / l0 : 0; return; }
      let scale = 0, rs = 0, np = 0; pr.forEach(r => { const ssr = r.reduce((t, v) => t + v * v, 0), sm = r.reduce((t, v) => t + v, 0); scale += ssr; rs += (sm * sm - ssr) / 2; np += r.length * (r.length - 1) / 2; });
      scale /= (n - p); alpha = np > p ? rs / scale / (np - p) : 0; };
    means(); let it = 0, conv = false, assoc = 0;
    for (; it < 100; it++) {
      const P = parts(); if (!P) return null; const Bi = invert(P.B); if (!Bi) return null;
      const step = Bi.map(r => r.reduce((t, v, j) => t + v * P.U[j], 0)); beta = beta.map((b, j) => b + step[j]); means();
      if (Math.sqrt(P.U.reduce((t, v) => t + v * v, 0)) < 1e-8 && assoc > 0) { conv = true; break; }
      updAssoc(); assoc++;
    }
    const P = parts(), Bi = invert(P.B), C = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => P.per.reduce((t, u) => t + u[a] * u[b], 0)));
    const cov = Bi.map((r, a) => Bi.map((_, b) => r.reduce((t, v, k) => t + v * C[k].reduce((u, w, l) => u + w * Bi[l][b], 0), 0)));
    return { beta, cov, se: cov.map((r, j) => Math.sqrt(r[j])), alpha: corr === 'independence' ? 0 : alpha, n, clusters: groups.length, converged: conv, iter: it,
      wald: idx => waldTest(beta, cov, idx) };
  }
  // Gauss-Hermite nodes and weights (Golub-Welsch would also do; Newton on the Hermite polynomials as in Numerical Recipes)
  function gaussHermite(nq) {
    const x = new Array(nq), w = new Array(nq), m = (nq + 1) >> 1, PIM4 = 0.7511255444649425; let z = 0;
    for (let i = 0; i < m; i++) {
      z = i === 0 ? Math.sqrt(2 * nq + 1) - 1.85575 * Math.pow(2 * nq + 1, -0.16667) : i === 1 ? z - 1.14 * Math.pow(nq, 0.426) / z : i === 2 ? 1.86 * z - 0.86 * x[0] : i === 3 ? 1.91 * z - 0.91 * x[1] : 2 * z - x[i - 2];
      let pp = 0;
      for (let k = 0; k < 100; k++) { let p1 = PIM4, p2 = 0; for (let j = 0; j < nq; j++) { const p3 = p2; p2 = p1; p1 = z * Math.sqrt(2 / (j + 1)) * p2 - Math.sqrt(j / (j + 1)) * p3; } pp = Math.sqrt(2 * nq) * p2; const z1 = z; z = z1 - p1 / pp; if (Math.abs(z - z1) < 1e-14) break; }
      x[i] = z; x[nq - 1 - i] = -z; w[i] = w[nq - 1 - i] = 2 / (pp * pp);
    }
    return { x, w };
  }
  // logistic regression with a random intercept per cluster: maximum likelihood by adaptive Gauss-Hermite quadrature
  function glmmLogit(y, X, cl, nq = 15) {
    const p = X[0].length, ids = [...new Set(cl)], groups = ids.map(id => cl.map((c, i) => c === id ? i : -1).filter(i => i >= 0)), GH = gaussHermite(nq), modes = new Array(groups.length).fill(0);
    const ll = th => { const beta = th.slice(0, p), s2 = Math.exp(2 * th[p]); let tot = 0;
      groups.forEach((g, gi) => { const eta = g.map(i => X[i].reduce((t, v, j) => t + v * beta[j], 0));
        const f = b => g.reduce((t, i, k) => { const e = eta[k] + b; return t + (y[i] ? -Math.log1p(Math.exp(-e)) : -Math.log1p(Math.exp(e))); }, 0) - b * b / (2 * s2) - 0.5 * Math.log(2 * Math.PI * s2);
        let b = modes[gi], h = 1;
        for (let k = 0; k < 30; k++) { let g1 = -b / s2, h1 = -1 / s2; g.forEach((i, q) => { const pr = 1 / (1 + Math.exp(-(eta[q] + b))); g1 += y[i] - pr; h1 -= pr * (1 - pr); }); const st = g1 / h1; b -= st; h = -h1; if (Math.abs(st) < 1e-10) break; }
        modes[gi] = b; const sc = Math.SQRT2 / Math.sqrt(h), f0 = f(b); let L = 0;
        GH.x.forEach((xq, q) => { L += GH.w[q] * Math.exp(f(b + sc * xq) - f0 + xq * xq); });
        tot += f0 + Math.log(L * sc); });
      return tot; };
    const fit0 = logisticRegression(X.map(r => r.slice(1)), y); let th = [...(fit0 ? fit0.terms.map(t => t.B) : new Array(p).fill(0)), 0];
    const grad = t => t.map((_, j) => { const hh = 1e-5 * Math.max(1, Math.abs(t[j])), a = t.slice(), b = t.slice(); a[j] += hh; b[j] -= hh; return (ll(a) - ll(b)) / (2 * hh); });
    // BFGS (maximising)
    let g = grad(th), H = th.map((_, i) => th.map((_, j) => i === j ? 1 : 0)), f = ll(th);
    for (let it = 0; it < 200; it++) {
      const d = H.map(r => r.reduce((t, v, j) => t + v * g[j], 0)); let stp = 1, nt, nf;
      for (let k = 0; k < 30; k++) { nt = th.map((v, j) => v + stp * d[j]); nf = ll(nt); if (nf >= f + 1e-4 * stp * d.reduce((t, v, j) => t + v * g[j], 0)) break; stp /= 2; }
      const ng = grad(nt), sv = nt.map((v, j) => v - th[j]), yv = ng.map((v, j) => -(v - g[j])), sy = sv.reduce((t, v, j) => t + v * yv[j], 0);
      th = nt; const df = nf - f; f = nf; g = ng;
      if (sy > 1e-12) { const Hy = H.map(r => r.reduce((t, v, j) => t + v * yv[j], 0)), yHy = yv.reduce((t, v, j) => t + v * Hy[j], 0);
        H = H.map((r, i) => r.map((v, j) => v + (1 + yHy / sy) * sv[i] * sv[j] / sy - (Hy[i] * sv[j] + sv[i] * Hy[j]) / sy)); }
      if (Math.max(...g.map(Math.abs)) < 1e-5 || Math.abs(df) < 1e-10) break;
    }
    // observed information by central differences
    const k = th.length, hs = th.map(v => 1e-4 * Math.max(1, Math.abs(v))), Hs = Array.from({ length: k }, () => new Array(k).fill(0));
    for (let i = 0; i < k; i++) for (let j = i; j < k; j++) { const e = (di, dj) => { const t = th.slice(); t[i] += di; t[j] += dj; return ll(t); };
      Hs[i][j] = Hs[j][i] = (e(hs[i], hs[j]) - e(hs[i], -hs[j]) - e(-hs[i], hs[j]) + e(-hs[i], -hs[j])) / (4 * hs[i] * hs[j]); }
    const cov = invert(Hs.map(r => r.map(v => -v))); if (!cov) return null;
    const beta = th.slice(0, p), covB = cov.slice(0, p).map(r => r.slice(0, p)), sigma = Math.exp(th[p]);
    return { beta, cov: covB, se: covB.map((r, j) => Math.sqrt(r[j])), sigma, var: sigma * sigma, icc: sigma * sigma / (sigma * sigma + Math.PI * Math.PI / 3), logLik: f, n: y.length, clusters: groups.length, wald: idx => waldTest(beta, covB, idx) };
  }
  function tost(x, y, lo, hi) {
    const n1 = x.length, n2 = y.length, df = n1 + n2 - 2, md = mean(x) - mean(y), sp = Math.sqrt(((n1 - 1) * variance(x) + (n2 - 1) * variance(y)) / df), se = sp * Math.sqrt(1 / n1 + 1 / n2);
    const pL = 1 - jStat.studentt.cdf((md - lo) / se, df), pU = jStat.studentt.cdf((md - hi) / se, df), t90 = jStat.studentt.inv(0.95, df);
    return { md, se, df, pL, pU, p: Math.max(pL, pU), lo90: md - t90 * se, hi90: md + t90 * se };
  }
  return {
    cumIncidence, rcsKnots, rcsBasis, waldTest, tdAuc, tdAucCI, rubin, mice, quantReg, fleissKappa, rmCorr, firthLogistic, poissonReg, negBinReg, ordinalLogit, multinomLogit, deming, passingBablok, eigenSym, pca, partialCorr, twoWayAnova, mediation, aucOf, nriIdi, netBenefit, optimismAuc, propensityMatch, smd, mauchly, skewKurtZ, bootMedianDiff, mannWhitneyExact, fisherRxC, jonckheere, cochranArmitage, effectSizes, nTwoMeans, nTwoProps, mantelHaenszel, brownForsytheMeans, yuen, conditionalLogit, bayesFactorT, tost, newcombeDiff, fmZ, marginTest, boxCoxLambda, boxCox, nMargin, gee, glmmLogit, gaussHermite,
    lmmRandomIntercept, cochranQ, setConf, ZC, QU,
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

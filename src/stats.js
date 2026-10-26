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
    const p = ssErr <= 0 ? (ssTime > 0 ? 0 : 1) : 1 - jStat.centralF.cdf(F, eps * df1, eps * df2);
    return { F, df1, df2, eps, p };
  }

  return {
    sum, mean, sd, variance, quantile, median, describe, rank, shapiroWilk,
    tTest, levene, anova, tukey, mannWhitney, hodgesLehmann, kruskalWallis,
    chiSquare, fisher2x2, relativeRisk, friedman, rmAnova
  };
})();

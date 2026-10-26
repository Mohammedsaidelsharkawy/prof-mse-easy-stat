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
    return { terms, n, df, r2, adjR2: 1 - (1 - r2) * (n - 1) / df, F, dfModel: k, pModel: k ? 1 - jStat.centralF.cdf(F, k, df) : NaN };
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
    return { terms, n, events: ny, m2LL: -2 * LL, chi, dfModel: k, pModel: k ? 1 - jStat.chisquare.cdf(chi, k) : NaN, coxSnell: cs, nagelkerke: nag, accuracy: correct / n, converged, unstable, iter };
  }

  /* ---------- ROC curve ---------- */
  // values: test results; pos: booleans (true = condition present). Higher values are taken as positive;
  // when the AUC is below 0.5 the direction is flipped (lower values positive) and reported.
  function roc(values, pos) {
    let higher = true;
    const run = (vals) => {
      const P = vals.filter((_, i) => pos[i]), N = vals.filter((_, i) => !pos[i]), n1 = P.length, n0 = N.length;
      const psi = (a, b) => a > b ? 1 : a === b ? 0.5 : 0;
      const V10 = P.map(a => mean(N.map(b => psi(a, b)))), V01 = N.map(b => mean(P.map(a => psi(a, b))));
      const auc = mean(V10);
      const se = Math.sqrt((n1 > 1 ? variance(V10) / n1 : 0) + (n0 > 1 ? variance(V01) / n0 : 0)); // DeLong
      return { auc, se, n1, n0, P, N };
    };
    let r = run(values);
    if (r.auc < 0.5) { higher = false; r = run(values.map(v => -v)); }
    const { auc, se, n1, n0 } = r;
    const p = mannWhitney(values.filter((_, i) => pos[i]), values.filter((_, i) => !pos[i])).p;
    // curve and Youden-optimal cut-off at midpoints between observed values
    const sgn = higher ? 1 : -1, u = [...new Set(values)].sort((a, b) => sgn * (b - a));
    const cuts = [u[0] + sgn, ...u.slice(0, -1).map((v, i) => (v + u[i + 1]) / 2), u[u.length - 1] - sgn];
    const points = cuts.map(c => {
      const tp = values.filter((v, i) => pos[i] && sgn * (v - c) > 0).length, fp = values.filter((v, i) => !pos[i] && sgn * (v - c) > 0).length;
      return { cut: c, sens: tp / n1, spec: 1 - fp / n0, tp, fp, fn: n1 - tp, tn: n0 - fp };
    });
    const best = points.slice(1, -1).reduce((b, q) => (q.sens + q.spec > b.sens + b.spec ? q : b), points[1] || points[0]);
    return {
      auc, se, lo: Math.max(0, auc - 1.959964 * se), hi: Math.min(1, auc + 1.959964 * se), p, n1, n0, higher,
      points: points.map(q => ({ fpr: 1 - q.spec, tpr: q.sens })),
      cutoff: { ...best, ppv: best.tp / (best.tp + best.fp), npv: best.tn / (best.tn + best.fn), accuracy: (best.tp + best.tn) / (n1 + n0) }
    };
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
    chiSquare, fisher2x2, relativeRisk, friedman, rmAnova,
    pairedT, wilcoxonSigned, pearson, spearman, bonferroni,
    invert, linearRegression, logisticRegression, roc
  };
})();

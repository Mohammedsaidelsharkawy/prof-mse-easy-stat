/* Prof Easy Stat — round 18, Generate: specialty scenarios with a known truth (pain and rescue analgesia, intraoperative
   vital signs, echocardiography, pharmacokinetics, children's growth, genetic association, cost-effectiveness, a 2×2 factorial
   trial, seasonality, arm switching, rare adverse events, identifiers for de-identification practice), a normal-values library,
   values that depend on sex or age, clinical profiles, one effect for a whole section, locked real columns, the recipe as
   R and Python code, data arriving in waves and specialty packs. Adds to the scenario library (EasyGen3) and the generator. */
(() => {
  const U = window.EasyUI, B = window.EasyBuilder, G3 = window.EasyGen3; if (!U || !B) return;
  const $ = s => document.querySelector(s), esc = U.esc, toast = U.toast;
  const r1 = (x, d = 1) => +(+x).toFixed(d), clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x)), expit = x => 1 / (1 + Math.exp(-x));
  const pid = i => `P${String(i + 1).padStart(4, '0')}`, YN = x => x ? 'Yes' : 'No', mean = a => a.reduce((x, y) => x + y, 0) / (a.length || 1);
  const sdv = a => { const m = mean(a); return Math.sqrt(a.reduce((t, x) => t + (x - m) ** 2, 0) / Math.max(1, a.length - 1)); };
  const rng = seed => { let a = (+seed || 1) >>> 0; const u = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const n = (m = 0, s = 1) => { let x = 0; while (!x) x = u(); return m + s * Math.sqrt(-2 * Math.log(x)) * Math.cos(2 * Math.PI * u()); };
    const pois = l => { if (l > 50) return Math.max(0, Math.round(n(l, Math.sqrt(l)))); let k = 0, p = 1; const L = Math.exp(-l); do { k++; p *= u(); } while (p > L); return k - 1; };
    return { u, n, pois, b: p => u() < p ? 1 : 0, int: (lo, hi) => lo + Math.floor(u() * (hi - lo + 1)), pick: a => a[Math.floor(u() * a.length)] }; };

  /* ================= the scenarios (G1–G8, G10–G12, G18) ================= */
  const SCN = {
    pain: { g: 'R18-G1', spec: 'Anaesthesia', name: 'Postoperative pain and rescue analgesia (nerve block vs control)', make(n, R, s) {
        const H = [0, 2, 4, 6, 12, 24], rows = [], eff = 1.6 * s;
        for (let i = 0; i < n; i++) { const T = i % 2, age = Math.round(clamp(R.n(42, 12), 18, 75)), sex = R.b(0.55) ? 'Female' : 'Male', asa = R.pick(['I', 'II', 'II', 'III']), dur = Math.round(clamp(R.n(95, 25), 40, 200));
          const frail = R.n(0, 0.8), vas = H.map(h => { const block = T ? eff * Math.exp(-h / 14) * (h <= 12 ? 1 : 0.6) : 0, base = 5.6 - 0.09 * h + frail + R.n(0, 0.9) - block; return clamp(Math.round(base), 0, 10); });
          const rate = 0.09 * Math.exp(-eff * 0.35 * T + 0.25 * frail), first = -Math.log(1 - R.u()) / rate, tRescue = first < 24 ? r1(first, 1) : null;
          const doses = tRescue === null ? 0 : 1 + R.pois(clamp((24 - first) / (T ? 10 : 7), 0, 4)), mg = doses * 3; // morphine 3 mg each
          const nausea = R.b(expit(-2 + 0.25 * doses)), sat = clamp(Math.round(4 + (T ? 0.6 * s : 0) - 0.12 * mean(vas) + R.n(0, 0.8)), 1, 5);
          rows.push([pid(i), T ? 'Block' : 'Control', age, sex, asa, dur, ...vas, tRescue === null ? 'No rescue' : 'Rescue', tRescue, doses, mg, YN(nausea), sat]); }
        return { head: ['ID', 'Group', 'Age (years)', 'Sex', 'ASA', 'Surgery duration (min)', ...H.map(h => `VAS ${h}h`), 'Rescue needed', 'Time to first rescue (h)', 'Rescue doses (n)', 'Total morphine 24h (mg)', 'PONV', 'Satisfaction (1–5)'], rows,
          truth: [['VAS reduction by the block at 0 h (points)', r1(eff, 2)], ['Block effect fades with a half-life of about (h)', 9.7], ['Hazard ratio of first rescue (block vs control)', r1(Math.exp(-eff * 0.35), 2)], ['Morphine per rescue dose (mg)', 3], ['PONV rises with each rescue dose (log-odds)', 0.25]],
          task: 'VAS over time by group (repeated measures / mixed model, or area under the curve); time to first rescue (Kaplan–Meier, log-rank, Cox); total morphine (Mann–Whitney); PONV (chi-square).' }; } },
    vitals: { g: 'R18-G2', spec: 'Anaesthesia', name: 'Intraoperative vital signs every 5 minutes (spinal: phenylephrine vs ephedrine)', make(n, R, s) {
        const T5 = Array.from({ length: 13 }, (_, i) => i * 5), rows = [], drop = 22;
        for (let i = 0; i < n; i++) { const A = i % 2, base = R.n(92, 9), hr0 = R.n(80, 10), sens = R.n(1, 0.25); let epi = 0, vaso = 0;
          const map = T5.map(t => { const fall = drop * sens * (1 - Math.exp(-t / 6)) * (t <= 25 ? 1 : Math.exp(-(t - 25) / 30)), fix = A ? 7 * s : 4 * s; const v = base - fall + fix * (t > 5 ? 1 : 0) + R.n(0, 4); if (v < 0.8 * base && t > 0) { epi++; vaso++; } return Math.round(v); });
          const hr = T5.map(t => Math.round(hr0 + (A ? -6 * s : 8 * s) * (t > 5 ? 1 : 0) + R.n(0, 5)));
          const twa = r1(mean(map.map(m => Math.max(0, 0.8 * base - m))), 1), brady = hr.some(h => h < 55);
          rows.push([pid(i), A ? 'Phenylephrine' : 'Ephedrine', Math.round(R.n(29, 5)), Math.round(base), ...map, ...hr.filter((_, j) => j % 2 === 0), epi, YN(epi > 0), r1(twa, 1), YN(brady), vaso]); }
        return { head: ['ID', 'Vasopressor', 'Age (years)', 'Baseline MAP (mmHg)', ...T5.map(t => `MAP ${t} min`), ...T5.filter((_, j) => j % 2 === 0).map(t => `HR ${t} min`), 'Hypotension episodes (n)', 'Any hypotension', 'Time-weighted MAP below 80% baseline (mmHg)', 'Bradycardia (HR < 55)', 'Rescue vasopressor boluses (n)'], rows,
          truth: [['Fall of MAP after the spinal (mmHg, average patient)', drop], ['MAP support by phenylephrine / ephedrine (mmHg)', `${r1(7 * s, 1)} / ${r1(4 * s, 1)}`], ['Heart rate change: phenylephrine / ephedrine (beats/min)', `${r1(-6 * s, 1)} / +${r1(8 * s, 1)}`], ['Hypotension', 'MAP < 80% of baseline at a 5-minute reading']],
          task: 'MAP and HR curves by group (mixed model, or the area under the curve); hypotension and bradycardia (chi-square / Fisher); episodes (Poisson / Mann–Whitney); time-weighted average.' }; } },
    echo: { g: 'R18-G3', spec: 'Cardiology', name: 'Echocardiography panel that fits together (heart failure vs controls)', make(n, R, s) {
        const rows = [];
        for (let i = 0; i < n; i++) { const HF = i % 2, age = Math.round(clamp(R.n(HF ? 64 : 58, 10), 30, 90)), sex = R.b(0.45) ? 'Female' : 'Male', bsa = r1(clamp(R.n(sex === 'Male' ? 1.95 : 1.75, 0.15), 1.4, 2.5), 2);
          const edv = clamp(R.n(HF ? 165 + 25 * s : 110, HF ? 35 : 20), 60, 320), ef = clamp(HF ? R.n(42 - 8 * s, 8) : R.n(62, 5), 15, 75), esv = edv * (1 - ef / 100);
          const lvidd = r1(clamp(R.n(HF ? 5.9 : 4.8, 0.45), 3.5, 8), 1), ivs = r1(clamp(R.n(HF ? 1.15 : 0.95, 0.15), 0.6, 1.8), 2), pw = r1(clamp(ivs + R.n(0, 0.08), 0.6, 1.8), 2);
          const lvm = 0.8 * (1.04 * ((lvidd + ivs + pw) ** 3 - lvidd ** 3)) + 0.6, lvmi = lvm / bsa, fs = r1(clamp(ef * 0.53 + R.n(0, 2), 5, 50), 1);
          const E = r1(clamp(R.n(HF ? 85 : 72, 15), 35, 140), 0), A = r1(clamp(R.n(HF ? 70 : 65, 14), 25, 120), 0), ep = r1(clamp(R.n(HF ? 6 : 10, 1.8), 3, 16), 1), tapse = r1(clamp(R.n(HF ? 17 - 2 * s : 23, 3), 8, 32), 1), pasp = Math.round(clamp(R.n(HF ? 42 + 6 * s : 26, 9), 15, 90));
          const gls = r1(clamp(R.n(HF ? -13 + 2 * s : -19.5, 2.2), -26, -5), 1);
          rows.push([pid(i), HF ? 'Heart failure' : 'Control', age, sex, bsa, Math.round(edv), Math.round(esv), Math.round(ef), fs, lvidd, ivs, pw, Math.round(lvm), Math.round(lvmi), E, A, r1(E / A, 2), ep, r1(E / ep, 1), tapse, pasp, gls]); }
        return { head: ['ID', 'Group', 'Age (years)', 'Sex', 'BSA (m²)', 'LVEDV (mL)', 'LVESV (mL)', 'LVEF (%)', 'FS (%)', 'LVIDd (cm)', 'IVSd (cm)', 'PWd (cm)', 'LV mass (g)', 'LVMI (g/m²)', 'E (cm/s)', 'A (cm/s)', 'E/A', "e' (cm/s)", "E/e'", 'TAPSE (mm)', 'PASP (mmHg)', 'GLS (%)'], rows,
          truth: [['LVESV = LVEDV × (1 − EF)', 'exact'], ['LV mass (Devereux)', '0.8 × 1.04 × [(LVIDd + IVSd + PWd)³ − LVIDd³] + 0.6'], ['LVMI = LV mass / BSA', 'exact'], ['E/A and E/e\' computed from E, A, e\'', 'exact'], ['EF lower in heart failure by (points)', r1(20 + 8 * s, 1)]],
          task: 'Compare the panel between the groups; correlations (EF with GLS, E/e\' with PASP); check that the derived values agree with their formulas; ROC of GLS for heart failure.' }; } },
    pk: { g: 'R18-G4', spec: 'Pharmacology', name: 'Pharmacokinetics: concentration–time curves (new vs reference formulation)', make(n, R, s) {
        const T = [0.25, 0.5, 1, 1.5, 2, 3, 4, 6, 8, 12, 24], rows = [], dose = 100;
        for (let i = 0; i < n; i++) { const F = i % 2, ka = Math.exp(R.n(Math.log(F ? 1.6 * (1 + 0.3 * s) : 1.6), 0.25)), ke = Math.exp(R.n(Math.log(0.12), 0.2)), V = Math.exp(R.n(Math.log(40), 0.2)), bio = F ? 0.9 + 0.08 * s : 0.85;
          const c = T.map(t => Math.max(0, (bio * dose * ka) / (V * (ka - ke)) * (Math.exp(-ke * t) - Math.exp(-ka * t)) * Math.exp(R.n(0, 0.08))));
          const cmax = Math.max(...c), tmax = T[c.indexOf(cmax)]; let auc = 0; for (let j = 1; j < T.length; j++) auc += (c[j] + c[j - 1]) / 2 * (T[j] - T[j - 1]); auc += (c[0] / 2) * T[0];
          rows.push([pid(i), F ? 'New formulation' : 'Reference', Math.round(clamp(R.n(70, 11), 45, 110)), ...c.map(x => r1(x, 3)), r1(cmax, 3), tmax, r1(auc, 2), r1(Math.log(2) / ke, 1)]); }
        return { head: ['ID', 'Formulation', 'Weight (kg)', ...T.map(t => `C ${t}h (mg/L)`), 'Cmax (mg/L)', 'Tmax (h)', 'AUC0–24 (mg·h/L)', 'Half-life (h)'], rows,
          truth: [['Model', 'one compartment, first-order absorption and elimination'], ['Dose (mg)', dose], ['Absorption rate ka: reference / new (per h)', `1.6 / ${r1(1.6 * (1 + 0.3 * s), 2)}`], ['Elimination ke (per h), half-life ≈ 5.8 h', 0.12], ['Bioavailability: reference / new', `0.85 / ${r1(0.9 + 0.08 * s, 2)}`]],
          task: 'Mean concentration–time curves by formulation; Cmax, Tmax and AUC compared (log-transformed, ratio with 90% CI for bioequivalence: 80–125%).' }; } },
    growth: { g: 'R18-G5', spec: 'Paediatrics', name: "Children's growth with z-scores (stunting and wasting)", make(n, R, s) {
        const rows = [], L = (age, sex) => { const b = sex === 'Boy' ? 1 : 0; return { h: 50 + 25 * Math.log1p(age / 6) * 1.25 + 1.2 * b, hs: 2.2 + 0.11 * age, w: 3.3 + 0.55 * age - 0.0035 * age * age + 0.3 * b, ws: 0.45 + 0.06 * age }; };
        for (let i = 0; i < n; i++) { const sex = R.b(0.5) ? 'Boy' : 'Girl', age = R.int(0, 59), poor = R.b(0.35), ref = L(age, sex);
          const hz = R.n(poor ? -1.1 * s : 0, 1), wz = 0.6 * hz + R.n(poor ? -0.6 * s : 0, 0.8), h = ref.h + hz * ref.hs, w = Math.max(2, ref.w + wz * ref.ws), bmi = w / (h / 100) ** 2;
          const haz = hz, waz = wz, whz = r1((wz - 0.6 * hz) / 0.8, 2);
          rows.push([pid(i), sex, age, poor ? 'Low income' : 'Middle/high income', r1(w, 1), r1(h, 1), r1(bmi, 1), r1(haz, 2), r1(waz, 2), whz, YN(haz < -2), YN(whz < -2), YN(waz < -2), r1(clamp(R.n(poor ? 10.6 : 11.8, 1.1), 7, 15), 1)]); }
        return { head: ['ID', 'Sex', 'Age (months)', 'Household', 'Weight (kg)', 'Height/length (cm)', 'BMI (kg/m²)', 'HAZ', 'WAZ', 'WHZ', 'Stunting (HAZ < −2)', 'Wasting (WHZ < −2)', 'Underweight (WAZ < −2)', 'Hb (g/dL)'], rows,
          truth: [['Height-for-age shift in low-income households (z)', r1(-1.1 * s, 2)], ['Weight-for-age shift in low-income households (z, beyond height)', r1(-0.6 * s, 2)], ['Reference curves', 'simplified, WHO-like (not the official LMS tables)'], ['Definitions', 'stunting HAZ < −2, wasting WHZ < −2, underweight WAZ < −2']],
          task: 'Prevalence of stunting, wasting and underweight by household and sex (with 95% CI); z-scores compared; logistic regression of stunting on household, age and sex.' }; } },
    snp: { g: 'R18-G6', spec: 'Genetics', name: 'Genetic association: SNP genotypes in Hardy–Weinberg equilibrium (case–control)', make(n, R, s) {
        const maf = 0.3, orA = 1 + 0.5 * s, rows = []; let k = 0;
        const geno = () => { const a = R.b(maf) + R.b(maf); return a; }, p0 = 0.25;
        while (rows.length < n && k < n * 50) { k++; const a = geno(), case_ = R.b(expit(Math.log(p0 / (1 - p0)) + Math.log(orA) * a)); const want = rows.filter(r => r[1] === 'Case').length < n / 2;
          if ((case_ && want) || (!case_ && rows.filter(r => r[1] === 'Control').length < n / 2)) rows.push([pid(rows.length), case_ ? 'Case' : 'Control', ['GG', 'GA', 'AA'][a], a, Math.round(clamp(R.n(50, 12), 18, 85)), R.b(0.5) ? 'Female' : 'Male']); }
        return { head: ['ID', 'Status', 'Genotype (rs-example)', 'Risk alleles (A)', 'Age (years)', 'Sex'], rows,
          truth: [['Minor (risk) allele A frequency in the population', maf], ['Odds ratio per A allele (additive)', r1(orA, 2)], ['Controls are in Hardy–Weinberg equilibrium', 'yes (genotypes from two independent alleles)']],
          task: 'Hardy–Weinberg test in the controls; genotype and allele frequencies; OR for the additive, dominant (GA+AA vs GG) and recessive (AA vs GG+GA) models, adjusted for age and sex.' }; } },
    cea: { g: 'R18-G7', spec: 'Health economics', name: 'Cost-effectiveness: costs and QALYs per arm', make(n, R, s) {
        const rows = [], dq = 0.04 * s, dc = 1200;
        for (let i = 0; i < n; i++) { const T = i % 2, sev = R.n(0, 1), zero = R.b(0.08);
          const cost = zero ? 0 : Math.round(Math.exp(R.n(Math.log(3500 + (T ? dc : 0)) - 0.18 + 0.25 * sev, 0.6))), u0 = clamp(R.n(0.62 - 0.05 * sev, 0.12), 0.05, 1), u1 = clamp(u0 + R.n(0.05 + (T ? dq : 0), 0.08), 0, 1);
          const qaly = r1((u0 + u1) / 2, 3); rows.push([pid(i), T ? 'New treatment' : 'Usual care', Math.round(clamp(R.n(60, 11), 30, 90)), r1(u0, 3), r1(u1, 3), qaly, cost, Math.round(cost * 0.6), Math.round(cost * 0.4), R.pois(1.2 + 0.4 * sev)]); }
        return { head: ['ID', 'Arm', 'Age (years)', 'EQ-5D baseline', 'EQ-5D 12 months', 'QALYs (1 year)', 'Total cost (EGP)', 'Hospital cost', 'Drug and visit cost', 'Visits (n)'], rows,
          truth: [['Extra mean cost of the new treatment (approx.)', dc], ['Extra QALYs (1 year)', r1(dq, 3)], ['ICER (approx., cost per QALY)', dq ? Math.round(dc / dq) : 'not defined (no QALY gain)'], ['Costs', 'log-normal (skewed) with 8% zeros']],
          task: 'Mean cost and QALYs per arm with bootstrap CIs (costs are skewed: compare means, not medians); ICER; cost-effectiveness plane and acceptability curve from the bootstrap.' }; } },
    factorial: { g: 'R18-G8', spec: 'Trial designs', name: '2×2 factorial trial (drug A, drug B and their interaction)', make(n, R, s) {
        const a = -4 * s, b = -3 * s, ab = 2.5 * s, rows = [];
        for (let i = 0; i < n; i++) { const A = i % 2, Bb = Math.floor(i / 2) % 2, base = R.n(150, 18), y = base + a * A + b * Bb + ab * A * Bb - 0 + R.n(-10, 9);
          rows.push([pid(i), A ? 'Drug A' : 'Placebo A', Bb ? 'Drug B' : 'Placebo B', `${A ? 'A' : '–'}${Bb ? 'B' : '–'}`, Math.round(clamp(R.n(55, 10), 30, 85)), Math.round(base), Math.round(y), Math.round(y - base)]); }
        return { head: ['ID', 'Factor A', 'Factor B', 'Combination', 'Age (years)', 'SBP baseline (mmHg)', 'SBP 12 weeks (mmHg)', 'Change (mmHg)'], rows,
          truth: [['Effect of A (B on placebo)', r1(a, 2)], ['Effect of B (A on placebo)', r1(b, 2)], ['Interaction A×B (the combination adds less than the sum)', r1(ab, 2)], ['Effect of A and B together', r1(a + b + ab, 2)]],
          task: 'Two-way ANOVA (or ANCOVA with the baseline) of the change with A, B and A×B; when the interaction is real, report the four arms rather than the margins.' }; } },
    season: { g: 'R18-G10', spec: 'Epidemiology', name: 'Seasonal pattern: vitamin D and respiratory infections by month', make(n, R, s) {
        const rows = [], amp = 9 * s, start = Date.UTC(2025, 0, 1);
        for (let i = 0; i < n; i++) { const day = R.int(0, 729), d = new Date(start + day * 864e5), m = d.getUTCMonth(), ph = Math.cos(2 * Math.PI * (m - 7) / 12);
          const vd = clamp(R.n(22 + amp * ph, 7), 3, 70), inf = R.b(expit(-1.2 - 0.9 * s * ph - 0.02 * (vd - 22)));
          rows.push([pid(i), d.toISOString().slice(0, 10), ['Winter', 'Winter', 'Spring', 'Spring', 'Spring', 'Summer', 'Summer', 'Summer', 'Autumn', 'Autumn', 'Autumn', 'Winter'][m], m + 1, Math.round(clamp(R.n(40, 14), 18, 85)), r1(vd, 1), YN(vd < 20), YN(inf)]); }
        rows.sort((x, y) => x[1] < y[1] ? -1 : 1); rows.forEach((r, i) => { r[0] = pid(i); });
        return { head: ['ID', 'Date of visit', 'Season', 'Month', 'Age (years)', '25(OH)D (ng/mL)', 'Deficiency (< 20)', 'Respiratory infection'], rows,
          truth: [['Vitamin D: summer – winter amplitude (ng/mL, peak in August)', r1(2 * amp, 1)], ['Infections peak in winter (log-odds amplitude)', r1(0.9 * s, 2)], ['Vitamin D lowers infection (per ng/mL, log-odds)', -0.02], ['Pitfall', 'season confounds vitamin D and infection']],
          task: 'Vitamin D by month and season (ANOVA, or a cosinor model); infection by season; the vitamin D–infection association with and without adjusting for season.' }; } },
    switching: { g: 'R18-G11', spec: 'Trial designs', name: 'Patients switching arm and protocol deviations (ITT vs per-protocol)', make(n, R, s) {
        const rows = [], eff = -6 * s;
        for (let i = 0; i < n; i++) { const arm = i % 2, sick = R.n(0, 1), sw = arm ? R.b(expit(-2.2 + 0.9 * sick)) : R.b(expit(-2.6 + 0.8 * sick)), dev = R.b(0.07);
          const recv = sw ? 1 - arm : arm, y = 40 + 5 * sick + eff * recv + R.n(0, 8);
          rows.push([pid(i), arm ? 'Surgery' : 'Medical', recv ? 'Surgery' : 'Medical', YN(sw), YN(dev), YN(!sw && !dev), r1(clamp(R.n(55, 12), 20, 90), 0), r1(y, 1)]); }
        return { head: ['ID', 'Allocated arm', 'Treatment received', 'Switched arm', 'Protocol deviation', 'Per-protocol population', 'Age (years)', 'Disability score at 1 year'], rows,
          truth: [['True effect of receiving surgery', r1(eff, 2)], ['Switching', 'more likely in sicker patients (both arms)'], ['Expect', 'ITT diluted towards 0; per-protocol and as-treated biased by who switches']],
          task: 'The effect by intention to treat, per protocol and as treated; explain why they differ (switching depends on prognosis).' }; } },
    rareae: { g: 'R18-G12', spec: 'Drug safety', name: 'Rare adverse events (few events, zero-inflated counts)', make(n, R, s) {
        const rows = [], p0 = 0.004, rr = 1 + 2 * s;
        for (let i = 0; i < n; i++) { const T = i % 2, sae = R.b(p0 * (T ? rr : 1)), never = R.b(0.6), minor = never ? 0 : R.pois(T ? 1.1 + 0.4 * s : 1.1);
          rows.push([pid(i), T ? 'New drug' : 'Comparator', Math.round(clamp(R.n(50, 14), 18, 90)), YN(sae), minor, YN(R.b(0.03 + (T ? 0.01 * s : 0))), R.int(150, 365)]); }
        const ev = rows.filter(r => r[3] === 'Yes').length;
        return { head: ['ID', 'Arm', 'Age (years)', 'Serious adverse event', 'Minor adverse events (n)', 'Stopped for side effects', 'Days on treatment'], rows,
          truth: [['Serious adverse event risk in the comparator', p0], ['Relative risk with the new drug', r1(rr, 2)], ['Serious events drawn in this dataset', ev], ['Minor events', 'zero-inflated Poisson: 60% never have any'], ['Rule of three', `with 0 events in N patients the upper 95% limit of the risk ≈ 3/N`]],
          task: 'Fisher exact test and exact (Clopper–Pearson) CIs for the serious events; incidence per 100 patient-years; zero-inflated or negative binomial model for the minor events.' }; } },
    ids: { g: 'R18-G18', spec: 'Data management', name: 'Registry with fake identifiers (de-identification practice)', make(n, R, s) {
        const rows = [];
        for (let i = 0; i < n; i++) { const f = fakePerson(R), age = Math.round(clamp(R.n(48, 15), 18, 90));
          rows.push([pid(i), f.name, f.nameAr, f.nid, f.phone, f.gov, f.address, f.dob(age), age, f.sex, Math.round(clamp(R.n(130, 18), 90, 200)), r1(clamp(R.n(7.2, 1.6), 4.5, 14), 1), YN(R.b(0.35))]); }
        return { head: ['ID', 'Full name', 'Name (Arabic)', 'National ID', 'Mobile', 'Governorate', 'Address', 'Date of birth', 'Age (years)', 'Sex', 'SBP (mmHg)', 'HbA1c (%)', 'Diabetes complications'], rows,
          truth: [['All identifiers', 'FAKE — generated, not real people (the numbers do not follow the real check-digit rules)'], ['Direct identifiers to remove', 'Full name, Arabic name, national ID, mobile, address'], ['Indirect identifiers to coarsen', 'date of birth → year or age group; governorate kept or grouped']],
          task: 'De-identify the sheet: remove the direct identifiers, replace the date of birth with age groups, keep a separate key file linking the study ID; check that no row can be re-identified.' }; } }
  };
  // fake people (clearly fake: national-ID-shaped numbers without a valid check digit, 010/011/012/015 numbers from a reserved-looking block)
  const FIRST_M = [['Ahmed', 'أحمد'], ['Mohamed', 'محمد'], ['Mahmoud', 'محمود'], ['Omar', 'عمر'], ['Youssef', 'يوسف'], ['Mostafa', 'مصطفى'], ['Khaled', 'خالد'], ['Hassan', 'حسن'], ['Ali', 'علي'], ['Tarek', 'طارق'], ['Karim', 'كريم'], ['Amr', 'عمرو']];
  const FIRST_F = [['Fatma', 'فاطمة'], ['Mariam', 'مريم'], ['Aya', 'آية'], ['Nour', 'نور'], ['Salma', 'سلمى'], ['Heba', 'هبة'], ['Mona', 'منى'], ['Sara', 'سارة'], ['Yasmin', 'ياسمين'], ['Dina', 'دينا'], ['Rania', 'رانيا'], ['Eman', 'إيمان']];
  const LAST = [['Abdelrahman', 'عبد الرحمن'], ['Elsayed', 'السيد'], ['Ibrahim', 'إبراهيم'], ['Mansour', 'منصور'], ['Fathy', 'فتحي'], ['Saleh', 'صالح'], ['Hamed', 'حامد'], ['Farouk', 'فاروق'], ['Shawky', 'شوقي'], ['Nasser', 'ناصر'], ['Gaber', 'جابر'], ['Ramadan', 'رمضان']];
  const GOV = ['Cairo', 'Giza', 'Alexandria', 'Dakahlia', 'Sharqia', 'Qalyubia', 'Gharbia', 'Menoufia', 'Beheira', 'Kafr El Sheikh', 'Damietta', 'Port Said', 'Ismailia', 'Suez', 'Fayoum', 'Beni Suef', 'Minya', 'Assiut', 'Sohag', 'Qena', 'Luxor', 'Aswan'];
  function fakePerson(R) { const male = R.b(0.5), f = R.pick(male ? FIRST_M : FIRST_F), m = R.pick(FIRST_M), l = R.pick(LAST);
    return { sex: male ? 'Male' : 'Female', name: `${f[0]} ${m[0]} ${l[0]}`, nameAr: `${f[1]} ${m[1]} ${l[1]}`, nid: `29${String(R.int(0, 99999999)).padStart(8, '0')}${String(R.int(0, 9999)).padStart(4, '0')}`, phone: `01${R.pick(['0', '1', '2', '5'])}${String(R.int(0, 99999999)).padStart(8, '0')}`,
      gov: R.pick(GOV), address: `${R.int(1, 120)} ${R.pick(['El-Nasr', 'El-Gomhoria', 'Tahrir', 'El-Salam', 'El-Horreya', '26 July', 'Port Said', 'El-Galaa'])} St.`, dob: age => `${2026 - age}-${String(R.int(1, 12)).padStart(2, '0')}-${String(R.int(1, 28)).padStart(2, '0')}` }; }
  if (G3 && G3.SC) Object.entries(SCN).forEach(([k, v]) => { G3.SC[k] = v; });

  /* ================= G13: the normal-values library ================= */
  // [pattern, mean, SD, unit, lowest, highest, decimals, skewed]
  const NORMS = [
    [/^age\b|age \(years\)/i, 45, 14, 'years', 18, 90, 0], [/weight/i, 75, 14, 'kg', 35, 180, 1], [/height|length/i, 165, 9, 'cm', 130, 205, 0], [/\bbmi\b|body mass/i, 27.5, 5, 'kg/m²', 15, 60, 1], [/waist/i, 94, 13, 'cm', 55, 160, 0], [/\bbsa\b/i, 1.85, 0.2, 'm²', 1.2, 2.6, 2],
    [/systolic|\bsbp\b/i, 128, 17, 'mmHg', 80, 220, 0], [/diastolic|\bdbp\b/i, 79, 10, 'mmHg', 40, 130, 0], [/\bmap\b|mean arterial/i, 93, 11, 'mmHg', 50, 150, 0], [/heart rate|\bhr\b|pulse/i, 80, 12, 'beats/min', 40, 160, 0], [/resp(iratory)? rate|\brr\b/i, 17, 3, 'breaths/min', 8, 40, 0],
    [/spo2|saturation/i, 97, 2, '%', 80, 100, 0], [/temperature|\btemp\b/i, 37, 0.5, '°C', 35, 41, 1], [/\bgcs\b|glasgow/i, 14, 1.5, '', 3, 15, 0],
    [/hba1c|glycated/i, 7.2, 1.5, '%', 4, 15, 1], [/fasting (blood |plasma )?(glucose|sugar)|\bfbg\b|\bfpg\b/i, 115, 32, 'mg/dL', 60, 350, 0, 1], [/random (blood )?(glucose|sugar)|\brbs\b|\brbg\b/i, 150, 50, 'mg/dL', 60, 450, 0, 1], [/insulin/i, 12, 7, 'µIU/mL', 1, 60, 1, 1], [/homa/i, 2.8, 1.8, '', 0.2, 15, 2, 1],
    [/hdl/i, 46, 11, 'mg/dL', 20, 100, 0], [/ldl/i, 120, 34, 'mg/dL', 30, 260, 0], [/triglycer|\btg\b/i, 150, 70, 'mg/dL', 40, 600, 0, 1], [/total cholesterol|cholesterol/i, 195, 40, 'mg/dL', 100, 350, 0],
    [/creatinine|\bscr\b/i, 0.95, 0.3, 'mg/dL', 0.4, 6, 2, 1], [/urea|\bbun\b/i, 32, 12, 'mg/dL', 8, 150, 0, 1], [/egfr|\bgfr\b/i, 88, 22, 'mL/min/1.73m²', 5, 140, 0], [/uric acid/i, 5.5, 1.4, 'mg/dL', 2, 12, 1], [/acr|albumin.?creatinine/i, 25, 40, 'mg/g', 1, 600, 0, 1],
    [/sodium|\bna\b/i, 139, 3, 'mmol/L', 120, 155, 0], [/potassium|\bk\b/i, 4.2, 0.45, 'mmol/L', 2.8, 6.5, 1], [/calcium|\bca\b/i, 9.3, 0.5, 'mg/dL', 7, 12, 1], [/magnesium|\bmg\b/i, 2, 0.25, 'mg/dL', 1.2, 3, 1], [/phosph/i, 3.7, 0.6, 'mg/dL', 1.8, 7, 1],
    [/h(a)?emoglobin|\bhb\b|\bhgb\b/i, 13, 1.7, 'g/dL', 6, 18, 1], [/h(a)?ematocrit|\bhct\b/i, 39, 5, '%', 20, 55, 1], [/\bwbc|white (blood )?cell|\btlc\b|leucocyt|leukocyt/i, 7.8, 2.6, '×10³/µL', 2, 30, 1, 1], [/platelet|\bplt\b/i, 260, 70, '×10³/µL', 40, 600, 0],
    [/neutrophil/i, 4.8, 2, '×10³/µL', 1, 20, 1, 1], [/lymphocyte/i, 2.1, 0.7, '×10³/µL', 0.3, 6, 1], [/\bnlr\b|neutrophil.?(to.?)?lymphocyte/i, 2.6, 1.6, '', 0.5, 20, 2, 1], [/\bmcv\b/i, 85, 7, 'fL', 60, 110, 0], [/\brdw\b/i, 13.5, 1.4, '%', 10, 22, 1],
    [/\balt\b|sgpt/i, 28, 16, 'U/L', 5, 300, 0, 1], [/\bast\b|sgot/i, 26, 12, 'U/L', 5, 300, 0, 1], [/\balp\b|alkaline phos/i, 85, 30, 'U/L', 30, 400, 0, 1], [/\bggt\b/i, 32, 22, 'U/L', 5, 300, 0, 1], [/bilirubin/i, 0.8, 0.4, 'mg/dL', 0.1, 10, 1, 1], [/albumin/i, 4, 0.5, 'g/dL', 1.5, 5.5, 1],
    [/\binr\b/i, 1.05, 0.12, '', 0.8, 4, 2, 1], [/\bpt\b|prothrombin/i, 12.5, 1.3, 's', 9, 30, 1, 1], [/aptt|\bptt\b/i, 31, 4, 's', 20, 80, 1], [/fibrinogen/i, 330, 80, 'mg/dL', 100, 800, 0], [/d.?dimer/i, 0.6, 0.6, 'mg/L', 0.1, 10, 2, 1],
    [/\bcrp\b|c.reactive/i, 8, 12, 'mg/L', 0.2, 300, 1, 1], [/\besr\b|sedimentation/i, 22, 14, 'mm/h', 2, 120, 0, 1], [/procalcitonin|\bpct\b/i, 0.4, 1.2, 'ng/mL', 0.02, 50, 2, 1], [/ferritin/i, 120, 110, 'ng/mL', 5, 2000, 0, 1], [/\bil.?6\b|interleukin.?6/i, 8, 12, 'pg/mL', 0.5, 300, 1, 1], [/lactate/i, 1.6, 0.9, 'mmol/L', 0.4, 15, 1, 1],
    [/\btsh\b/i, 2.1, 1.2, 'mIU/L', 0.1, 10, 2, 1], [/free t4|\bft4\b/i, 1.25, 0.25, 'ng/dL', 0.5, 3, 2], [/free t3|\bft3\b/i, 3.1, 0.5, 'pg/mL', 1.5, 6, 1], [/vitamin d|25.?\(?oh\)?d/i, 22, 9, 'ng/mL', 3, 80, 1], [/vitamin b12|\bb12\b/i, 380, 150, 'pg/mL', 100, 1200, 0, 1], [/\bpth\b|parathyroid/i, 45, 20, 'pg/mL', 10, 200, 0, 1],
    [/troponin/i, 0.01, 0.03, 'ng/mL', 0, 5, 3, 1], [/nt.?probnp/i, 300, 600, 'pg/mL', 10, 15000, 0, 1], [/\bbnp\b/i, 90, 150, 'pg/mL', 5, 3000, 0, 1], [/ck.?mb/i, 15, 10, 'U/L', 2, 150, 0, 1],
    [/lvef|ejection fraction|\bef\b/i, 58, 9, '%', 15, 80, 0], [/tapse/i, 21, 4, 'mm', 8, 32, 1], [/pasp|pulmonary artery (systolic )?pressure/i, 30, 10, 'mmHg', 15, 90, 0], [/\bgls\b|longitudinal strain/i, -18, 3, '%', -28, -5, 1], [/e\/e'|e\/e’/i, 9, 3.5, '', 4, 25, 1], [/lvedd|lvidd/i, 4.9, 0.6, 'cm', 3.5, 8, 1], [/lvmi/i, 95, 22, 'g/m²', 45, 200, 0],
    [/fev1(?!\/)/i, 2.9, 0.8, 'L', 0.6, 5.5, 2], [/fvc/i, 3.7, 0.9, 'L', 1, 6.5, 2], [/fev1\/fvc/i, 0.77, 0.08, '', 0.3, 0.95, 2], [/6.?mw|six.?minute/i, 420, 90, 'm', 50, 700, 0],
    [/\bvas\b|visual analog|\bnrs\b|pain score/i, 4.5, 2.2, '', 0, 10, 0], [/womac/i, 45, 15, '', 0, 96, 1], [/\bodi\b|oswestry/i, 32, 15, '%', 0, 100, 0], [/\bkoos\b/i, 55, 17, '', 0, 100, 1],
    [/length of (hospital )?stay|\blos\b/i, 5, 3.5, 'days', 1, 60, 0, 1], [/icu stay|days in icu/i, 3, 2.5, 'days', 1, 40, 0, 1], [/operat(ive|ion) (time|duration)|surgery duration|duration of surgery/i, 95, 30, 'min', 20, 400, 0, 1], [/blood loss/i, 300, 180, 'mL', 20, 2500, 0, 1],
    [/apache/i, 16, 6, '', 0, 50, 0], [/\bsofa\b/i, 5, 3, '', 0, 20, 0], [/charlson/i, 2, 1.8, '', 0, 12, 0, 1], [/gestational age/i, 38.5, 1.8, 'weeks', 24, 42, 1], [/birth ?weight/i, 3.1, 0.5, 'kg', 0.8, 5.2, 2], [/apgar/i, 8, 1.2, '', 0, 10, 0],
    [/\bamh\b|anti.?m[uü]llerian/i, 2.8, 2, 'ng/mL', 0.05, 15, 2, 1], [/\bfsh\b/i, 7, 3, 'mIU/mL', 1, 40, 1, 1], [/\blh\b/i, 6, 3, 'mIU/mL', 0.5, 40, 1, 1], [/\bpsa\b/i, 1.5, 1.8, 'ng/mL', 0.1, 30, 2, 1], [/\biop\b|intraocular/i, 15.5, 3, 'mmHg', 8, 40, 0], [/bmd|bone mineral/i, 0.95, 0.13, 'g/cm²', 0.5, 1.4, 2], [/t.?score/i, -1.2, 1.1, '', -4.5, 2.5, 1]
  ];
  const YES_NORMS = [[/diabet|\bdm\b/i, 22], [/hypertens|\bhtn\b/i, 32], [/smok/i, 25], [/obes/i, 30], [/ischa?emic|\bihd\b|coronary/i, 12], [/\bckd\b|chronic kidney/i, 8], [/\bcopd\b/i, 7], [/asthma/i, 8], [/stroke|\bcva\b/i, 5], [/atrial fib/i, 6], [/heart failure/i, 6], [/anaemia|anemia/i, 20], [/hypothyroid/i, 7],
    [/mortality|death|died/i, 6], [/complication/i, 15], [/infection|\bssi\b/i, 8], [/readmission/i, 8], [/reoperation/i, 4], [/ponv|nausea|vomit/i, 25], [/icu admission/i, 10], [/recurrence/i, 12], [/bleeding|haemorrhage|hemorrhage/i, 6], [/female|women/i, 50]];
  function lookup(name) { const n = String(name || ''); const m = NORMS.find(x => x[0].test(n)); if (m) return { mean: m[1], sd: m[2], unit: m[3], min: m[4], max: m[5], dec: m[6], skew: !!m[7] }; const y = YES_NORMS.find(x => x[0].test(n)); return y ? { pct: y[1] } : null; }
  function applyNorms() { const D = B.design; if (!D || !D.vars) { toast('Design the master sheet first (🧱 Build)'); return; } let n = 0;
    D.vars.forEach(v => { const L = lookup(`${v.label || ''} ${v.name || ''}`); if (!L) return;
      if ((v.type === 'num' || v.type === 'calc') && L.mean !== undefined) { v.expect = { ...(v.expect || {}), mean: L.mean, sd: L.sd, dist: L.skew ? 'skewed' : 'normal' }; if (!v.unit && L.unit) v.unit = L.unit; if (v.min === '' || v.min === undefined) v.min = L.min; if (v.max === '' || v.max === undefined) v.max = L.max; if (v.dec === '' || v.dec === undefined) v.dec = L.dec; n++; }
      if (v.type === 'yn' && L.pct !== undefined) { v.expect = { ...(v.expect || {}), pct: [L.pct, 100 - L.pct] }; n++; } });
    try { B.save && B.save(); } catch (e) { /* kept in memory */ } if (window.EasyGen && EasyGen.render) EasyGen.render(); toast(`Realistic values for ${n} variable${n === 1 ? '' : 's'} (mean, SD, unit, range, decimals) — the group targets you typed are kept`); }

  /* ================= G9, G14, G16: rules applied to the generated patients (a hook in the generator) ================= */
  const ST = () => { const G = window.EasyGen && EasyGen.settings; if (!G) return {}; G.r18 = G.r18 || { dep: {}, profile: { name: '', scope: 'all' } }; G.r18.dep = G.r18.dep || {}; return G.r18; };
  const saveG = () => { try { EasyGen.settings = EasyGen.settings; } catch (e) { /* kept in memory */ } };
  // the usual differences by sex and age: [pattern, women − men, per 10 years of age]
  const DEP_LIB = [[/h(a)?emoglobin|\bhb\b/i, -1.4, -0.1], [/h(a)?ematocrit/i, -4, -0.3], [/creatinine/i, -0.2, 0.03], [/height|length/i, -12, -0.5], [/weight/i, -11, 0.5], [/systolic|\bsbp\b/i, -4, 4.5], [/diastolic|\bdbp\b/i, -2, 1], [/egfr/i, -2, -8], [/uric acid/i, -1.2, 0.1], [/hdl/i, 9, 0], [/ferritin/i, -60, 5], [/\bbmi\b/i, 0.8, 0.4], [/fev1|fvc/i, -0.8, -0.25], [/muscle|grip/i, -12, -2], [/waist/i, -6, 2], [/fasting|glucose/i, -3, 4], [/hba1c/i, 0, 0.15], [/ldl|cholesterol/i, 4, 5]];
  const PROFILES = { '': [], diabetic: [[/hba1c/i, 2.2], [/fasting|glucose|fbg|fpg|rbs/i, 70], [/triglycer/i, 50], [/hdl/i, -6], [/creatinine/i, 0.1], [/\bbmi\b/i, 2.5], [/diabet|\bdm\b/i, 'yes', 100]],
    septic: [[/\bcrp\b/i, 120], [/procalcitonin|\bpct\b/i, 6], [/\bwbc|leuco|leuko|\btlc\b/i, 8], [/lactate/i, 2.5], [/heart rate|\bhr\b|pulse/i, 25], [/temperature/i, 1.3], [/\bmap\b|mean arterial|systolic/i, -18], [/\bsofa\b/i, 5], [/platelet/i, -90], [/creatinine/i, 0.9], [/mortality|death/i, 'yes', 28]],
    elderly: [[/^age\b|age \(/i, 25], [/egfr/i, -25], [/systolic|\bsbp\b/i, 12], [/h(a)?emoglobin|\bhb\b/i, -0.8], [/albumin/i, -0.4], [/charlson/i, 2], [/hypertens|\bhtn\b/i, 'yes', 60], [/falls|frail/i, 'yes', 30]],
    pregnant: [[/h(a)?emoglobin|\bhb\b/i, -1.2], [/heart rate|\bhr\b/i, 12], [/diastolic|\bdbp\b/i, -5], [/creatinine/i, -0.25], [/alp|alkaline/i, 90], [/fibrinogen/i, 150], [/d.?dimer/i, 0.8], [/weight/i, 9]],
    ckd: [[/egfr/i, -45], [/creatinine/i, 1.6], [/urea|\bbun\b/i, 45], [/potassium/i, 0.6], [/h(a)?emoglobin|\bhb\b/i, -2], [/phosph/i, 1.2], [/pth/i, 70], [/\bckd\b|chronic kidney/i, 'yes', 100]],
    obese: [[/\bbmi\b/i, 9], [/weight/i, 25], [/waist/i, 18], [/triglycer/i, 40], [/hdl/i, -5], [/systolic/i, 8], [/obes/i, 'yes', 100], [/sleep apn|\bosa\b/i, 'yes', 40]] };
  const sexVar = D => D.vars.find(v => v.type !== 'num' && /\bsex\b|gender/i.test(`${v.label} ${v.name || ''}`)), ageVar = D => D.vars.find(v => (v.type === 'num' || v.type === 'calc') && /^age\b|age \(/i.test(`${v.label}`));
  const isFemale = x => /^(f|female|woman|women|girl|2)$/i.test(String(x ?? '').trim());
  const valsOf = (p, v) => p.vals && p.vals[v.id];
  function hook(D, P) { const st = ST(), dep = st.dep || {}, sv = sexVar(D), av = ageVar(D), prof = PROFILES[(st.profile || {}).name || ''] || [], scope = (st.profile || {}).scope ?? 'all';
    const ages = av ? P.map(p => +(valsOf(p, av) || {}).once).filter(isFinite) : [], am = ages.length ? mean(ages) : 50, R = rng(((window.EasyGen && EasyGen.settings.seed) || 1) + 7177);
    P.forEach((p, i) => { const fem = sv ? isFemale((valsOf(p, sv) || {}).once) : false, age = av ? +(valsOf(p, av) || {}).once : NaN;
      D.vars.forEach(v => { const o = valsOf(p, v); if (!o) return;
        if (v.type === 'num' || v.type === 'calc') { const d = dep[v.id]; const pr = (scope === 'all' || +scope === p.g) ? prof.find(x => typeof x[1] === 'number' && x[0].test(`${v.label} ${v.name || ''}`)) : null;
          Object.keys(o).forEach(k => { let x = +o[k]; if (!isFinite(x) || o[k] === null || o[k] === '') return;
            if (d) { if (fem && +d.sex) x += +d.sex; if (isFinite(age) && +d.age && v !== av) x += +d.age * (age - am) / 10; }
            if (pr) x += pr[1];
            if (x !== +o[k]) { if (v.min !== '' && v.min !== undefined && isFinite(+v.min)) x = Math.max(+v.min, x); if (v.max !== '' && v.max !== undefined && isFinite(+v.max)) x = Math.min(+v.max, x); const dc = v.dec !== '' && v.dec !== undefined ? +v.dec : (String(o[k]).split('.')[1] || '').length; o[k] = +x.toFixed(dc); } }); }
        if (v.type === 'yn' && (scope === 'all' || +scope === p.g)) { const pr = prof.find(x => x[1] === 'yes' && x[0].test(`${v.label} ${v.name || ''}`)); if (pr) Object.keys(o).forEach(k => { if (o[k] === null) return; const yes = D.conv && D.conv.catAs === 'codes' ? 1 : v.cats[0], no = D.conv && D.conv.catAs === 'codes' ? 2 : v.cats[1]; o[k] = R.u() * 100 < pr[2] ? yes : no; }); } }); });
    // G16: columns locked to real values (row by row, in the order of the real file)
    const L = LOCK; if (L && L.rows && L.rows.length && L.map) P.forEach((p, i) => { const src = L.rows[i % L.rows.length]; Object.entries(L.map).forEach(([vid, col]) => { const v = D.vars.find(x => x.id === vid), o = v && valsOf(p, v); if (!o || col === '') return; const k0 = Object.keys(o)[0] || 'once'; o[k0] = src[col] ?? null; }); }); }
  (window.EasyGenHooks = window.EasyGenHooks || []).push(hook);

  /* ================= G15: one effect for a whole section ================= */
  function sectionEffect(sec, d) { const D = B.design, G = window.EasyGen && EasyGen.settings; if (!D || !G) return; const A = D.arms.filter(Boolean), k = A.length; if (k < 2) { toast('The design has one group: there is nothing to compare'); return; }
    const vs = D.vars.filter(v => (v.section || 'Data') === sec && ['num', 'yn'].includes(v.type)); let n = 0; G.targets = G.targets || {};
    vs.forEach(v => { const keys = (v.visits || []).length ? v.visits : ['once'], e = v.expect || {}, L = lookup(`${v.label} ${v.name || ''}`) || {};
      if (v.type === 'num') { const m = +(e.mean !== '' && e.mean !== undefined ? e.mean : L.mean ?? 50), s = +(e.sd !== '' && e.sd !== undefined ? e.sd : (L.sd ?? (Math.abs(m) * 0.2 || 1))); const T = G.targets[v.id] = G.targets[v.id] || {};
        for (let g = 0; g < k; g++) { T[g] = T[g] || {}; keys.forEach(key => { T[g][key] = +(m + (g === 0 ? 0 : d * s * (g === 1 ? 1 : g / (k - 1) * 1))).toFixed(Math.max(0, +(v.dec || 1))); }); } n++; }
      else { const p0 = (e.pct && +e.pct[0]) || L.pct || 30, or = Math.exp(1.81 * d), T = G.targets[v.id] = G.targets[v.id] || {}; // d → odds ratio (Chinn: ln OR = 1.81 d)
        for (let g = 0; g < k; g++) { const o0 = p0 / (100 - p0), p = g === 0 ? p0 : 100 * (o0 * or) / (1 + o0 * or); T[g] = T[g] || {}; keys.forEach(key => { T[g][key] = [+p.toFixed(1), +(100 - p).toFixed(1)]; }); } n++; } });
    saveG(); if (EasyGen.render) EasyGen.render(); toast(`${sec}: ${n} variable${n === 1 ? '' : 's'} set to ${d === 0 ? 'no difference' : `an effect of d = ${d}`} between the groups — generate to see it`); }

  /* ================= G17: the recipe as R and Python code ================= */
  function dataNow() { const g = G3 && G3.last; if (window.__r18src === 'scenario' && g) return { head: g.head, rows: g.rows, name: g.title, seed: g.seed };
    const st = U.state; if (st && st.data && st.data.rows.length) { const h = st.data.headers; return { head: h, rows: st.data.rows.map(r => h.map(c => r[c])), name: (st.cfg && st.cfg.projectName) || st.file || 'Dataset', seed: (window.EasyGen && EasyGen.settings.seed) || 1, group: st.cfg && st.cfg.groupCol }; }
    if (g) return { head: g.head, rows: g.rows, name: g.title, seed: g.seed }; return null; }
  function modelOf(dat) { const H = dat.head, cols = H.map((h, j) => ({ h, x: dat.rows.map(r => r[j]) }));
    const isNum = c => { const ok = c.x.filter(v => v !== null && v !== '' && v !== undefined); return ok.length && ok.filter(v => isFinite(+v)).length >= ok.length * 0.95; };
    const gcol = dat.group && H.includes(dat.group) ? dat.group : (cols.find(c => !isNum(c) && /group|arm|treat|allocat|status|formulation|vasopressor/i.test(c.h) && new Set(c.x).size >= 2 && new Set(c.x).size <= 6) || {}).h;
    const gx = gcol ? cols.find(c => c.h === gcol).x : null, lv = gx ? [...new Set(gx.filter(v => v !== null && v !== ''))] : ['All'];
    const out = cols.filter(c => c.h !== gcol && !/^id$|^patient|^code$/i.test(c.h)).map(c => { const miss = c.x.filter(v => v === null || v === '' || v === undefined).length / c.x.length, dec = Math.min(4, Math.max(0, ...c.x.filter(v => isFinite(+v) && v !== null && v !== '').slice(0, 100).map(v => (String(v).split('.')[1] || '').length)));
      if (isNum(c)) return { h: c.h, type: 'num', miss, dec, by: lv.map(l => { const a = c.x.filter((v, i) => (!gx || gx[i] === l) && v !== null && v !== '' && isFinite(+v)).map(Number); return { l, m: a.length ? mean(a) : 0, s: a.length > 1 ? sdv(a) : 0, lo: a.length ? Math.min(...a) : 0, hi: a.length ? Math.max(...a) : 0 }; }) };
      const cats = [...new Set(c.x.filter(v => v !== null && v !== ''))].map(String); if (cats.length > 30) return null;
      return { h: c.h, type: 'cat', miss, cats, by: lv.map(l => { const a = c.x.filter((v, i) => (!gx || gx[i] === l) && v !== null && v !== '').map(String); return { l, p: cats.map(k => a.length ? a.filter(v => v === k).length / a.length : 0) }; }) }; }).filter(Boolean);
    return { gcol, lv, n: dat.rows.length, nBy: lv.map(l => gx ? gx.filter(v => v === l).length : dat.rows.length), out }; }
  const q = s => JSON.stringify(String(s)), num = x => +(+x).toFixed(6);
  function rCode(dat, M) { const L = [`# Prof Easy Stat — the recipe of "${dat.name}" (${new Date().toISOString().slice(0, 10)})`, '# A dataset from the same model: the same columns, groups, means, SDs, ranges, category % and missing values.', '# The numbers differ from the app\'s (another random generator); the app reproduces its own exact values from its seed.', `set.seed(${+dat.seed || 1})`, ''];
    L.push(`groups <- c(${M.lv.map(q).join(', ')})`, `n_by <- c(${M.nBy.join(', ')})`, `g <- rep(groups, n_by)`, 'n <- length(g)', 'd <- data.frame(ID = sprintf("P%04d", 1:n))', M.gcol ? `d[[${q(M.gcol)}]] <- g` : '', '');
    M.out.forEach(c => { if (c.type === 'num') { L.push(`# ${c.h}`, `x <- numeric(n)`); c.by.forEach((b, i) => L.push(`x[g == ${q(b.l)}] <- rnorm(sum(g == ${q(b.l)}), ${num(b.m)}, ${num(b.s)})`)); L.push(`x <- round(pmin(pmax(x, ${num(Math.min(...c.by.map(b => b.lo)))}), ${num(Math.max(...c.by.map(b => b.hi)))}), ${c.dec})`); }
      else { L.push(`# ${c.h}`, `x <- character(n)`); c.by.forEach(b => L.push(`x[g == ${q(b.l)}] <- sample(c(${c.cats.map(q).join(', ')}), sum(g == ${q(b.l)}), replace = TRUE, prob = c(${b.p.map(num).join(', ')}))`)); }
      if (c.miss > 0) L.push(`x[runif(n) < ${num(c.miss)}] <- NA`); L.push(`d[[${q(c.h)}]] <- x`, ''); });
    L.push('write.csv(d, "simulated_data.csv", row.names = FALSE)', 'summary(d)'); return L.filter(x => x !== null).join('\n'); }
  function pyCode(dat, M) { const L = [`# Prof Easy Stat — the recipe of "${dat.name}" (${new Date().toISOString().slice(0, 10)})`, '# A dataset from the same model: the same columns, groups, means, SDs, ranges, category % and missing values.', "# The numbers differ from the app's (another random generator); the app reproduces its own exact values from its seed.", 'import numpy as np', 'import pandas as pd', `rng = np.random.default_rng(${+dat.seed || 1})`, ''];
    L.push(`groups = [${M.lv.map(q).join(', ')}]`, `n_by = [${M.nBy.join(', ')}]`, 'g = np.repeat(groups, n_by)', 'n = len(g)', 'd = pd.DataFrame({"ID": [f"P{i + 1:04d}" for i in range(n)]})', M.gcol ? `d[${q(M.gcol)}] = g` : '', '');
    M.out.forEach(c => { if (c.type === 'num') { L.push(`# ${c.h}`, 'x = np.zeros(n)'); c.by.forEach(b => L.push(`m = g == ${q(b.l)}; x[m] = rng.normal(${num(b.m)}, ${num(b.s)}, m.sum())`)); L.push(`x = np.round(np.clip(x, ${num(Math.min(...c.by.map(b => b.lo)))}, ${num(Math.max(...c.by.map(b => b.hi)))}), ${c.dec}).astype(object)`); }
      else { L.push(`# ${c.h}`, 'x = np.empty(n, dtype=object)'); c.by.forEach(b => L.push(`m = g == ${q(b.l)}; x[m] = rng.choice([${c.cats.map(q).join(', ')}], m.sum(), p=np.array([${b.p.map(num).join(', ')}]) / ${num(b.p.reduce((a, y) => a + y, 0) || 1)})`)); }
      if (c.miss > 0) L.push(`x[rng.random(n) < ${num(c.miss)}] = None`); L.push(`d[${q(c.h)}] = x`, ''); });
    L.push('d.to_csv("simulated_data.csv", index=False)', 'print(d.describe(include="all"))'); return L.filter(x => x !== null).join('\n'); }
  function recipe(lang) { const dat = dataNow(); if (!dat) { toast('Make a scenario or open data in 📊 Analyse first'); return; } const M = modelOf(dat), txt = lang === 'r' ? rCode(dat, M) : pyCode(dat, M);
    U.saveUrl(URL.createObjectURL(new Blob([txt], { type: 'text/plain' })), `Recipe - ${String(dat.name).replace(/[\\/:*?"<>|→]+/g, '-').slice(0, 50)}.${lang === 'r' ? 'R' : 'py'}`); toast(`${lang === 'r' ? 'R' : 'Python'} recipe saved: ${M.out.length} columns${M.gcol ? `, by ${M.gcol}` : ''}`); }

  /* ================= G18 (identifiers for the generated patients), G19 (waves), G20 (packs) ================= */
  const zipOf = (files, name) => { const z = XLSX.CFB.utils.cfb_new(); files.forEach(([n, d]) => XLSX.CFB.utils.cfb_add(z, n, d)); U.saveUrl(URL.createObjectURL(new Blob([XLSX.CFB.write(z, { fileType: 'zip', type: 'array', compression: true })], { type: 'application/zip' })), name); };
  const xbytes = wb => new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }));
  const sheet = (aoa, nm) => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), nm); return wb; };
  function idSheet() { const dat = dataNow(); if (!dat) { toast('Generate or open data first'); return; } const R = rng((+dat.seed || 1) + 404), idj = dat.head.findIndex(h => /^id$|patient.?id|^code$/i.test(h));
    const rows = dat.rows.map((r, i) => { const f = fakePerson(R); return [idj >= 0 ? r[idj] : pid(i), f.name, f.nameAr, f.nid, f.phone, f.gov, f.address, f.sex]; });
    const wb = sheet([['Study ID', 'Full name (FAKE)', 'Arabic name (FAKE)', 'National ID (FAKE)', 'Mobile (FAKE)', 'Governorate', 'Address (FAKE)', 'Sex'], ...rows], 'Identifiers (fake)');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Fake identifiers for de-identification practice — not real people.'], ['Merge with the data on Study ID, then practise removing them.']]), 'About');
    U.saveUrl(URL.createObjectURL(new Blob([xbytes(wb)])), 'Fake identifiers (practice).xlsx'); toast(`${rows.length} fake identity rows`); }
  function waves(N) { const dat = dataNow(); if (!dat) { toast('Make a scenario or open data first'); return; } N = Math.max(2, Math.min(6, +N || 3)); const n = dat.rows.length;
    const fu = dat.head.map((h, j) => /(\b(m|month|wk|week|day|d|h|hour|visit|follow.?up|fu)\s*-?\s*([1-9]\d*)\b|\b([1-9]\d*)\s*(m|months?|weeks?|days?|h|hours?)\b|12 ?months|discharge|final|end of)/i.test(h) && !/baseline|\b0 ?h\b|pre/i.test(h) ? j : -1).filter(j => j >= 0);
    const files = []; for (let w = 1; w <= N; w++) { const upto = Math.round(n * w / N), rows = dat.rows.slice(0, upto).map((r, i) => { const behind = (upto - i) / n * N; return r.map((x, j) => { const pos = fu.indexOf(j); if (pos < 0) return x; return behind < (pos + 1) / fu.length && w < N ? null : x; }); });
      files.push([`Wave ${w} of ${N} - ${upto} patients.xlsx`, xbytes(sheet([dat.head, ...rows], `Wave ${w}`))]); }
    files.push(['README.txt', new TextEncoder().encode(`Data arriving over time: ${N} waves of "${dat.name}". Each wave has the patients enrolled so far; the most recent patients have not reached their later visits yet (${fu.length ? fu.map(j => dat.head[j]).join(', ') : 'no follow-up columns found'}), so those cells are empty. The last wave is complete.\r\nPractise: clean each wave, merge the next one, and see how the results change.`)]);
    zipOf(files, `Waves - ${String(dat.name).slice(0, 40).replace(/[^\w\- ]+/g, '')}.zip`); toast(`${N} waves saved (${fu.length} follow-up column${fu.length === 1 ? '' : 's'} fill in over time)`); }
  const PACKS = { Anaesthesia: ['pain', 'vitals'], Cardiology: ['echo'], ICU: ['vitals', 'rareae'], Paediatrics: ['growth'], Pharmacology: ['pk', 'rareae'], Genetics: ['snp'], 'Health economics': ['cea'], 'Trials and designs': ['factorial', 'switching'], Epidemiology: ['season'], 'Data management': ['ids'] };
  function pack(name, n, seed) { const SC = G3 && G3.SC; if (!SC) return; const keys = [...(PACKS[name] || []), ...Object.keys(SC).filter(k => !SCN[k] && new RegExp(name.split(' ')[0], 'i').test(SC[k].spec))].filter((k, i, a) => SC[k] && a.indexOf(k) === i); const files = [], idx = [];
    keys.forEach((k, i) => { const R0 = rng((+seed || 2026) + i * 101); let o; try { o = SC[k].make(+n || 200, mkR(R0), 1, SC[k].opts ? SC[k].opts[0][0] : ''); } catch (e) { console.error(e); return; }
      const wb = sheet([o.head, ...o.rows], 'Data'); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['What was built in (the truth)', 'Value'], ...o.truth, [''], ['Analysis to try', o.task], ['Seed', (+seed || 2026) + i * 101]]), 'Answer key');
      const nm = `${String(i + 1).padStart(2, '0')} ${SC[k].name.replace(/[\\/:*?"<>|→]+/g, '-').slice(0, 70)}.xlsx`; files.push([nm, xbytes(wb)]); idx.push(`${nm}\r\n   ${o.task}`); });
    if (!files.length) { toast('No scenarios for this specialty'); return; }
    files.push(['README.txt', new TextEncoder().encode(`${name} pack — Prof Easy Stat\r\nSimulated datasets with a known truth (sheet "Answer key"), ${+n || 200} rows each. Not real patients.\r\n\r\n${idx.join('\r\n\r\n')}\r\n\r\nOpen any file in 📊 Analyse to make its report.`)]);
    zipOf(files, `${name} pack (simulated).zip`); toast(`${name} pack: ${files.length - 1} datasets with their answer keys`); }
  // the generator of gen3 has its own random-number object: an equivalent one for the packs
  function mkR(R) { const gamma = k => { if (k < 1) return gamma(k + 1) * Math.pow(R.u(), 1 / k); const d = k - 1 / 3, c = 1 / Math.sqrt(9 * d); for (;;) { let x, v; do { x = R.n(); v = 1 + c * x; } while (v <= 0); v = v * v * v; const uu = R.u(); if (uu < 1 - 0.0331 * x ** 4 || Math.log(uu) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v; } };
    return { ...R, gamma, pick: (a, w) => { const s = w ? w.reduce((x, y) => x + y, 0) : a.length; let r = R.u() * s; for (let i = 0; i < a.length; i++) { r -= w ? w[i] : 1; if (r < 0) return a[i]; } return a[a.length - 1]; } }; }
  SCN && Object.values(SCN).forEach(sc => { const mk = sc.make; sc.make = (n, R, s, o) => mk(n, R.gamma ? R : mkR(R), s, o); });

  /* ================= the box in the Generate phase ================= */
  let LOCK = null; // the real rows to keep: in memory only
  function html(D) { const st = ST(), A = (D.arms || []).filter(Boolean), nums = D.vars.filter(v => v.type === 'num' || v.type === 'calc'), secs = [...new Set(D.vars.filter(v => ['num', 'yn'].includes(v.type)).map(v => v.section || 'Data'))], sv = sexVar(D), av = ageVar(D), dep = st.dep || {};
    const o = (list, cur) => list.map(([v, l]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('');
    return `<details class="gen-det" id="r18Box" ${st.open ? 'open' : ''}><summary><b>🩺 Realism, specialty packs and recipes</b> <span class="legend-note">— normal values, sex and age, clinical profiles, one effect per section, real columns kept, R / Python recipe, waves, packs</span></summary>
      <div class="row" style="gap:8px;flex-wrap:wrap;margin:8px 0"><button class="btn primary small" type="button" data-r18="norms" title="Each variable named like Hb, ALT, LVEF, TSH… gets a realistic mean, SD, unit, range and decimals">🩺 Realistic values from the names</button><span class="legend-note">${NORMS.length} measurements and ${YES_NORMS.length} conditions in the library; group targets you typed are kept</span></div>
      <details class="gen-det"><summary><b>Values that depend on sex and age</b> <span class="legend-note">${sv ? `sex: ${esc(sv.label)}` : 'no sex variable'} · ${av ? `age: ${esc(av.label)}` : 'no age variable'}</span></summary>
        <div class="row" style="gap:6px;margin:6px 0"><button class="btn ghost small" type="button" data-r18="depsug">Suggest from the library</button><button class="btn ghost small" type="button" data-r18="depclear">Clear</button></div>
        <table class="t" style="font-size:12.5px"><thead><tr><th>Variable</th><th>Women − men</th><th>Per 10 years of age</th></tr></thead><tbody>${nums.filter(v => v !== av).slice(0, 60).map(v => `<tr><td>${esc(v.label)}${v.unit ? ` <span class="legend-note">${esc(v.unit)}</span>` : ''}</td><td><input type="number" step="any" data-r18d="${v.id}|sex" value="${esc((dep[v.id] || {}).sex ?? '')}" style="width:80px" ${sv ? '' : 'disabled'}></td><td><input type="number" step="any" data-r18d="${v.id}|age" value="${esc((dep[v.id] || {}).age ?? '')}" style="width:80px" ${av ? '' : 'disabled'}></td></tr>`).join('')}</tbody></table></details>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin:8px 0"><div><label class="f">Clinical profile</label><select data-r18p="name" style="width:auto">${o([['', 'None'], ['diabetic', 'Diabetic'], ['septic', 'Septic'], ['elderly', 'Elderly'], ['pregnant', 'Pregnant'], ['ckd', 'Chronic kidney disease'], ['obese', 'Obese']], (st.profile || {}).name || '')}</select></div>
        <div><label class="f">for</label><select data-r18p="scope" style="width:auto">${o([['all', 'All patients'], ...A.map((a, i) => [i, a])], (st.profile || {}).scope ?? 'all')}</select></div><span class="legend-note">moves the related values together (e.g. septic: CRP, PCT, WBC, lactate, heart rate, MAP, SOFA…)</span></div>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin:8px 0"><div><label class="f">One effect for a whole section</label><select id="r18Sec" style="width:auto">${o(secs.map(x => [x, x]), secs[0])}</select></div><div><label class="f">Difference between the groups</label><select id="r18Eff" style="width:auto">${o([[0, 'None (comparable, e.g. Table 1)'], [0.2, 'Small (d = 0.2)'], [0.5, 'Medium (d = 0.5)'], [0.8, 'Large (d = 0.8)']], 0.5)}</select></div><button class="btn ghost small" type="button" data-r18="sec">Set the targets</button></div>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0"><b>Keep real columns</b><label class="btn ghost small" style="margin:0">⬆ Real data<input type="file" data-r18f="lock" accept=".xlsx,.xls,.csv" hidden></label>${LOCK && LOCK.rows ? `<span class="legend-note">${LOCK.rows.length} real rows (kept in memory only): ${Object.entries(LOCK.map || {}).filter(([, c]) => c).length} column(s) kept</span><button class="btn ghost small" type="button" data-r18="unlock">Stop</button>` : '<span class="legend-note">e.g. keep the real age and sex, generate the rest</span>'}</div>
      ${LOCK && LOCK.head ? `<div class="row" style="gap:6px;flex-wrap:wrap">${D.vars.filter(v => ['num', 'yn', 'cat', 'calc'].includes(v.type)).slice(0, 40).map(v => `<label class="legend-note">${esc(v.label)} ← <select data-r18l="${v.id}" style="width:auto"><option value="">generated</option>${LOCK.head.map(h => `<option value="${esc(h)}" ${(LOCK.map || {})[v.id] === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></label>`).join('')}</div>` : ''}
      <div class="row" style="gap:8px;flex-wrap:wrap;margin:10px 0 4px"><b>Take away</b><select id="r18Src" style="width:auto"><option value="analyse">the data open in 📊 Analyse</option><option value="scenario">the last scenario</option></select>
        <button class="btn ghost small" type="button" data-r18="r">⬇ R recipe</button><button class="btn ghost small" type="button" data-r18="py">⬇ Python recipe</button><button class="btn ghost small" type="button" data-r18="ids" title="Fake names, national-ID-like numbers, phones and addresses for each study ID">⬇ Fake identifiers</button>
        <span class="gen-ctl">⬇ <input type="number" id="r18W" min="2" max="6" value="3" style="width:46px"> waves<button class="btn ghost small" type="button" data-r18="waves">Go</button></span></div>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end;margin:6px 0"><div><label class="f">Specialty pack</label><select id="r18Pack" style="width:auto">${o(Object.keys(PACKS).map(k => [k, k]), 'Anaesthesia')}</select></div><div><label class="f">Rows each</label><input type="number" id="r18PackN" value="200" min="20" max="5000" style="width:80px"></div><button class="btn primary small" type="button" data-r18="pack">⬇ Pack (zip)</button><span class="legend-note">datasets with their answer keys; the new scenarios are also in 🧪 Scenario library</span></div>
      <p class="legend-note" style="margin:6px 0 0">Simulated data: not real patients.</p></details>`; }
  async function readLock(file) { const buf = await file.arrayBuffer(), wb = XLSX.read(buf, { type: 'array' }), ws = wb.Sheets[wb.SheetNames[0]], aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }); const head = (aoa[0] || []).map(String), rows = aoa.slice(1).filter(r => r.some(x => x !== null && x !== '')).map(r => Object.fromEntries(head.map((h, j) => [h, r[j]])));
    const D = B.design, map = {}; D.vars.forEach(v => { const h = head.find(x => x.toLowerCase() === String(v.label).toLowerCase() || x.toLowerCase() === String(v.name || '').toLowerCase()); if (h && /age|sex|gender/i.test(h)) map[v.id] = h; });
    LOCK = { head, rows, map }; if (EasyGen.render) EasyGen.render(); toast(`${rows.length} real rows read — choose the columns to keep (age and sex matched by name)`); }
  document.addEventListener('click', e => { const b = e.target.closest('[data-r18]'); if (b) { const k = b.dataset.r18, st = ST(); window.__r18src = ($('#r18Src') || {}).value === 'scenario' ? 'scenario' : 'analyse';
      if (k === 'norms') applyNorms(); if (k === 'sec') sectionEffect($('#r18Sec').value, +$('#r18Eff').value); if (k === 'r' || k === 'py') recipe(k); if (k === 'ids') idSheet(); if (k === 'waves') waves($('#r18W').value); if (k === 'pack') pack($('#r18Pack').value, $('#r18PackN').value, (EasyGen.settings || {}).seed);
      if (k === 'unlock') { LOCK = null; EasyGen.render(); }
      if (k === 'depclear') { st.dep = {}; saveG(); EasyGen.render(); }
      if (k === 'depsug') { const D = B.design; let n = 0; D.vars.filter(v => v.type === 'num' || v.type === 'calc').forEach(v => { const m = DEP_LIB.find(x => x[0].test(`${v.label} ${v.name || ''}`)); if (m) { st.dep[v.id] = { sex: m[1], age: m[2] }; n++; } }); saveG(); EasyGen.render(); toast(`${n} variable${n === 1 ? '' : 's'} with the usual sex and age differences`); }
      return; }
    const sm = e.target.closest('#r18Box > summary'); if (sm) { const st = ST(); st.open = !$('#r18Box').open; saveG(); } });
  document.addEventListener('change', e => { const t = e.target; if (!t.closest || !t.closest('#r18Box')) return; const st = ST();
    if (t.dataset.r18d) { const [id, k] = t.dataset.r18d.split('|'); st.dep[id] = st.dep[id] || {}; if (t.value === '') delete st.dep[id][k]; else st.dep[id][k] = +t.value; saveG(); }
    if (t.dataset.r18p) { st.profile = { ...(st.profile || {}), [t.dataset.r18p]: t.value }; saveG(); toast(t.value && t.dataset.r18p === 'name' ? `Profile “${t.selectedOptions[0].textContent}” — generate to apply it` : 'Profile changed'); }
    if (t.dataset.r18l && LOCK) { LOCK.map = LOCK.map || {}; LOCK.map[t.dataset.r18l] = t.value; }
    if (t.dataset.r18f === 'lock' && t.files[0]) readLock(t.files[0]); });

  window.EasyGen4 = { html, lookup, NORMS, applyNorms, hook, recipe, waves, pack, idSheet, SCN, PACKS };
})();

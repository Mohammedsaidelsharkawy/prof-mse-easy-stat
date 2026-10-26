/* Prof MSE Easy Stat — built-in example datasets (simulated, reproducible) */
const Examples = (() => {
  // seeded generator so every user gets the same example data
  function rng(seed) {
    let s = seed >>> 0;
    const u = () => { s = (s * 1664525 + 1013904223) >>> 0; return (s + 0.5) / 4294967296; };
    const n = (m = 0, sd = 1) => m + sd * Math.sqrt(-2 * Math.log(u())) * Math.cos(2 * Math.PI * u());
    return {
      u, n,
      int: (a, b) => a + Math.floor(u() * (b - a + 1)),
      pick: (arr, w) => { if (!w) return arr[Math.floor(u() * arr.length)]; let x = u() * w.reduce((a, b) => a + b, 0); for (let i = 0; i < arr.length; i++) { x -= w[i]; if (x < 0) return arr[i]; } return arr[arr.length - 1]; },
      yes: p => u() < p ? 'Yes' : 'No',
      // occasional blank cell, as in real mastersheets
      miss: (v, p = 0.03) => u() < p ? null : v
    };
  }
  const r1 = v => Math.round(v * 10) / 10, clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  const LIST = [
    {
      id: 'knee-oa-rct', name: 'Two-group RCT — knee osteoarthritis',
      description: 'PRP versus hyaluronic acid injection, 60 patients. Baseline data, WOMAC and VAS at 4 timepoints, complications, satisfaction.',
      title: 'Platelet-rich plasma versus hyaluronic acid injection for knee osteoarthritis: a randomized controlled trial',
      levels: { Satisfaction: ['Poor', 'Fair', 'Good', 'Excellent'], KL_grade: ['II', 'III'] },
      advanced: [{ type: 'ancova', outcome: 'WOMAC_M6', predictors: ['WOMAC_baseline', 'Age_years'] }],
      rows() {
        const R = rng(101), out = [];
        ['PRP', 'HA'].forEach((g, gi) => { for (let i = 0; i < 30; i++) {
          const base = R.n(62, 9), vas0 = clamp(Math.round(R.n(7, 1)), 4, 10), gain = gi ? 0.55 : 1;
          out.push({ ID: out.length + 1, Group: g, Age_years: Math.round(R.n(58, 7)), Sex: R.pick(['Female', 'Male'], [65, 35]),
            BMI_kg_m2: r1(R.n(30, 3.5)), Diabetes: R.yes(0.3), KL_grade: R.pick(['II', 'III'], [55, 45]),
            WOMAC_baseline: r1(base), WOMAC_M1: r1(base - 10 * gain + R.n(0, 6)), WOMAC_M3: r1(base - 17 * gain + R.n(0, 7)), WOMAC_M6: R.miss(r1(base - 20 * gain + R.n(0, 8))),
            VAS_baseline: vas0, VAS_M1: clamp(Math.round(vas0 - 2 * gain + R.n(0, 1)), 0, 10), VAS_M3: clamp(Math.round(vas0 - 3.2 * gain + R.n(0, 1.2)), 0, 10), VAS_M6: clamp(Math.round(vas0 - 3.6 * gain + R.n(0, 1.4)), 0, 10),
            Complications: R.yes(gi ? 0.07 : 0.13), Satisfaction: R.pick(['Poor', 'Fair', 'Good', 'Excellent'], gi ? [15, 35, 35, 15] : [5, 20, 45, 30]) });
        } });
        return out;
      }
    },
    {
      id: 'postop-analgesia-3arm', name: 'Three-group RCT — postoperative analgesia',
      description: 'Control, dexmedetomidine and ketamine, 75 patients. Pain scores at 5 timepoints, blood pressure over time, rescue analgesia, morphine use.',
      title: 'Dexmedetomidine versus ketamine as adjuvants for postoperative analgesia after abdominal surgery',
      options: { within: true, chiPost: true },
      levels: { ASA: ['I', 'II', 'III'] },
      advanced: [{ type: 'logistic', outcome: 'Rescue_analgesia', positive: 'Yes', predictors: ['Group', 'Age_years', 'Surgery_duration_min'], univariable: true }],
      rows() {
        const R = rng(202), out = [];
        ['Control', 'Dexmedetomidine', 'Ketamine'].forEach((g, gi) => { for (let i = 0; i < 25; i++) {
          const eff = [0, 2.2, 1.5][gi], map0 = R.n(92, 8);
          const pain = h => clamp(Math.round(R.n(6.5 - eff * Math.exp(-h / 14) - h * 0.12, 1.2)), 0, 10);
          out.push({ ID: out.length + 1, Group: g, Age_years: Math.round(R.n(45, 11)), Sex: R.pick(['Male', 'Female']), ASA: R.pick(['I', 'II', 'III'], [45, 45, 10]),
            Weight_kg: r1(R.n(78, 11)), Surgery_duration_min: Math.round(R.n(120, 25)),
            Pain_0h: pain(0), Pain_2h: pain(2), Pain_6h: pain(6), Pain_12h: pain(12), Pain_24h: pain(24),
            MAP_baseline: Math.round(map0), MAP_30min: Math.round(map0 - [2, 9, 1][gi] + R.n(0, 5)), MAP_60min: Math.round(map0 - [1, 11, 0][gi] + R.n(0, 5)),
            Rescue_analgesia: R.yes([0.72, 0.28, 0.44][gi]), Nausea: R.yes([0.32, 0.12, 0.28][gi]),
            Morphine_mg: R.miss(r1(Math.exp(R.n([2.4, 1.6, 1.9][gi], 0.45)))) });
        } });
        return out;
      }
    },
    {
      id: 'sepsis-biomarkers', name: 'Diagnostic study — biomarkers of sepsis',
      description: 'Sepsis versus non-sepsis ICU patients, 90 patients. Skewed lab markers (CRP, procalcitonin, lactate), SOFA score, ICU stay, mortality. Good for ROC and logistic regression.',
      title: 'Diagnostic and prognostic value of procalcitonin and C-reactive protein in critically ill patients with sepsis',
      advanced: [
        { type: 'roc', outcome: 'Group', positive: 'Sepsis', predictors: ['CRP_mg_L', 'PCT_ng_mL', 'Lactate_mmol_L'] },
        { type: 'logistic', outcome: 'Mortality', positive: 'Yes', predictors: ['Age_years', 'SOFA_score', 'PCT_ng_mL'], univariable: true }
      ],
      rows() {
        const R = rng(303), out = [];
        [['Sepsis', 40], ['Non-sepsis', 50]].forEach(([g, n], gi) => { for (let i = 0; i < n; i++) {
          const sev = gi ? R.n(0, 1) : R.n(1.2, 1), sofa = clamp(Math.round(R.n(gi ? 4 : 8, 2.5)), 0, 20);
          out.push({ ID: out.length + 1, Group: g, Age_years: Math.round(R.n(gi ? 55 : 61, 13)), Sex: R.pick(['Male', 'Female'], [55, 45]),
            CRP_mg_L: r1(Math.exp(R.n(gi ? 3.3 : 4.6, 0.7))), PCT_ng_mL: Math.round(Math.exp(R.n(gi ? -1.2 : 1.1, 1)) * 100) / 100,
            WBC_10e9_L: r1(R.n(gi ? 10.5 : 15, 4)), Lactate_mmol_L: r1(Math.exp(R.n(gi ? 0.5 : 1.1, 0.4))),
            SOFA_score: sofa, ICU_stay_days: Math.max(1, Math.round(Math.exp(R.n(gi ? 1.4 : 2.1, 0.5)))),
            Mortality: R.u() < 1 / (1 + Math.exp(-(-4.2 + 0.32 * sofa + 0.25 * sev))) ? 'Yes' : 'No' });
        } });
        return out;
      }
    },
    {
      id: 'oncology-survival', name: 'Survival study — two chemotherapy regimens',
      description: 'Regimen A versus regimen B, 90 patients. Stage, ECOG, tumour size over time, response, follow-up time and death. Good for Kaplan-Meier survival.',
      title: 'Overall survival with regimen A versus regimen B in advanced solid tumours',
      levels: { Stage: ['II', 'III', 'IV'], ECOG: ['0', '1', '2'], Response: ['CR', 'PR', 'SD', 'PD'] },
      advanced: [{ type: 'survival', outcome: 'Follow_up_months', event: 'Death', positive: 'Yes', at: '24' }],
      rows() {
        const R = rng(404), out = [];
        ['Regimen A', 'Regimen B'].forEach((g, gi) => { for (let i = 0; i < 45; i++) {
          const stage = R.pick(['II', 'III', 'IV'], [25, 40, 35]), hz = (gi ? 0.032 : 0.055) * (stage === 'IV' ? 1.8 : stage === 'III' ? 1.2 : 0.8);
          const tDeath = -Math.log(R.u()) / hz, tCens = 6 + R.u() * 42, died = tDeath <= tCens;
          const size0 = R.n(6.2, 1.6), shrink = gi ? 0.65 : 0.82;
          out.push({ ID: out.length + 1, Group: g, Age_years: Math.round(R.n(57, 10)), Sex: R.pick(['Male', 'Female']), Stage: stage,
            ECOG: R.pick(['0', '1', '2'], [35, 45, 20]), Tumor_size_baseline: r1(size0), Tumor_size_M3: r1(size0 * (shrink + R.n(0, 0.1))), Tumor_size_M6: R.miss(r1(size0 * (shrink * shrink + R.n(0, 0.12))), 0.08),
            Response: R.pick(['CR', 'PR', 'SD', 'PD'], gi ? [12, 40, 30, 18] : [5, 30, 35, 30]),
            Follow_up_months: r1(Math.min(tDeath, tCens)), Death: died ? 'Yes' : 'No' });
        } });
        return out;
      }
    },
    {
      id: 'dose-response-4arm', name: 'Four-group study — small, non-normal data',
      description: 'Control and three doses, 48 patients (12 per group). Skewed inflammatory markers before and after treatment, adverse events. Shows non-parametric tests and post hoc options.',
      title: 'Dose-dependent anti-inflammatory effect of drug X: a four-arm pilot study',
      options: { dunn: true, within: true },
      rows() {
        const R = rng(505), out = [];
        ['Control', 'Low dose', 'Medium dose', 'High dose'].forEach((g, gi) => { for (let i = 0; i < 12; i++) {
          const il0 = Math.exp(R.n(3, 0.6)), crp0 = Math.exp(R.n(2.5, 0.8)), sym0 = R.int(6, 12);
          out.push({ ID: out.length + 1, Group: g, Age_years: Math.round(R.n(50, 9)), Sex: R.pick(['Male', 'Female']),
            IL6_pre: r1(il0), IL6_post: r1(il0 * Math.exp(R.n(-0.18 * gi, 0.35))), CRP_pre: r1(crp0), CRP_post: r1(crp0 * Math.exp(R.n(-0.15 * gi, 0.4))),
            Symptom_score_pre: sym0, Symptom_score_post: clamp(sym0 - R.int(0, 2 + gi * 2), 0, 12), Adverse_events: R.yes([0.05, 0.15, 0.3, 0.55][gi]) });
        } });
        return out;
      }
    }
  ];

  return { LIST, get: id => LIST.find(e => e.id === id) };
})();
if (typeof module !== 'undefined') module.exports = Examples;

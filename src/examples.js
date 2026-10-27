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
      flow: { type: 'consort', excluded: [{ text: 'Not meeting inclusion criteria', n: 14 }, { text: 'Declined to participate', n: 6 }], groups: [{ lost: 2, lostReason: 'Moved away (n=1), withdrew consent (n=1)' }, { lost: 1, lostReason: 'Withdrew consent' }] },
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
      flow: { type: 'consort', excluded: [{ text: 'Not meeting inclusion criteria', n: 11 }, { text: 'Declined to participate', n: 4 }, { text: 'Surgery cancelled', n: 2 }] },
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
      flow: { type: 'strobe', excluded: [{ text: 'Age < 18 years', n: 7 }, { text: 'Immunosuppression', n: 9 }, { text: 'Antibiotics > 24 h before admission', n: 12 }], groups: [{ description: 'Sepsis (Sepsis-3 criteria)' }, { description: 'ICU patients without infection' }] },
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
      flow: { type: 'consort', excluded: [{ text: 'Not meeting inclusion criteria', n: 18 }, { text: 'Declined to participate', n: 7 }], groups: [{ excludedAnalysis: 1, excludedReason: 'Never received treatment' }, { excludedAnalysis: 2, excludedReason: 'Never received treatment' }] },
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
      flow: { type: 'simple', steps: [{ text: 'Patients screened', n: 61, exText: 'Excluded: not eligible', exN: 13 }, { text: 'Randomized into four groups', n: 48, exText: '', exN: 0 }], splitGroups: true },
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
    },
    {
      id: 'vitd-diabetes-cross-sectional', name: 'Cross-sectional study — vitamin D and diabetes',
      description: 'Type 2 diabetics by vitamin D status (deficient / insufficient / sufficient), 100 patients. HbA1c, insulin resistance, a 6-item distress questionnaire. Good for correlation, linear regression and Cronbach’s alpha (STROBE).',
      title: 'Association between vitamin D status and glycaemic control in adults with type 2 diabetes: a cross-sectional study',
      options: { correlation: true, chiPost: true },
      levels: { Vitamin_D_status: ['Deficient', 'Insufficient', 'Sufficient'], Physical_activity: ['Low', 'Moderate', 'High'] },
      flow: { type: 'strobe', excluded: [{ text: 'Type 1 or secondary diabetes', n: 12 }, { text: 'Taking vitamin D supplements', n: 18 }, { text: 'Incomplete records', n: 9 }],
        groups: [{ description: '25(OH)D < 20 ng/mL' }, { description: '25(OH)D 20-29 ng/mL' }, { description: '25(OH)D ≥ 30 ng/mL' }] },
      advanced: [
        { type: 'linear', outcome: 'HbA1c_percent', predictors: ['Vitamin_D_ng_mL', 'Age_years', 'BMI_kg_m2', 'Diabetes_duration_years'], univariable: true },
        { type: 'cronbach', predictors: ['Distress_Q1', 'Distress_Q2', 'Distress_Q3', 'Distress_Q4', 'Distress_Q5', 'Distress_Q6'] }
      ],
      rows() {
        const R = rng(606), out = [];
        [['Deficient', 40, 14], ['Insufficient', 35, 24], ['Sufficient', 25, 36]].forEach(([g, n, vd]) => { for (let i = 0; i < n; i++) {
          const vitd = r1(clamp(R.n(vd, 4), 4, 60)), bmi = r1(R.n(31 - vd / 12, 4)), dur = Math.max(1, Math.round(R.n(8, 4)));
          const a1c = r1(clamp(R.n(9.6 - 0.06 * vitd + 0.05 * (bmi - 30) + 0.06 * dur, 0.9), 5.5, 14)), distress = R.n(0, 1);
          const item = () => clamp(Math.round(3 + 0.9 * distress + 0.15 * (a1c - 8) + R.n(0, 0.8)), 1, 5);
          out.push({ ID: out.length + 1, Vitamin_D_status: g, Age_years: Math.round(R.n(56, 9)), Sex: R.pick(['Female', 'Male'], [55, 45]), BMI_kg_m2: bmi,
            Diabetes_duration_years: dur, Vitamin_D_ng_mL: vitd, HbA1c_percent: a1c, FBG_mg_dL: Math.round(R.n(80 + 12 * a1c, 25)),
            HOMA_IR: Math.round(Math.exp(R.n(1.2 + 0.03 * (bmi - 30) - 0.01 * vitd, 0.35)) * 100) / 100,
            Neuropathy: R.yes(clamp(0.15 + 0.04 * (a1c - 7), 0.05, 0.7)), Physical_activity: R.pick(['Low', 'Moderate', 'High'], vd < 20 ? [55, 35, 10] : vd < 30 ? [40, 40, 20] : [25, 45, 30]),
            Distress_Q1: item(), Distress_Q2: item(), Distress_Q3: item(), Distress_Q4: item(), Distress_Q5: item(), Distress_Q6: item() });
        } });
        return out;
      }
    },
    {
      id: 'preeclampsia-case-control', name: 'Case-control study — risk factors for preeclampsia',
      description: 'Women with preeclampsia (cases) versus normotensive pregnancies (controls), 110 women. Maternal risk factors, sFlt-1/PlGF ratio, neonatal outcomes. Good for odds ratios, logistic regression and ROC (STROBE).',
      title: 'Maternal risk factors and the sFlt-1/PlGF ratio in preeclampsia: a case-control study',
      options: { catEffect: 'or' },
      levels: { Parity: ['Nulliparous', 'Multiparous'] },
      flow: { type: 'strobe', excluded: [{ text: 'Multiple pregnancy', n: 6 }, { text: 'Pre-existing renal disease', n: 4 }, { text: 'Declined to participate', n: 8 }],
        groups: [{ description: 'Cases: preeclampsia (ACOG criteria)' }, { description: 'Controls: normotensive, matched for gestational age' }] },
      advanced: [
        { type: 'logistic', outcome: 'Group', positive: 'Preeclampsia', predictors: ['Maternal_age_years', 'BMI_kg_m2', 'Parity', 'Previous_preeclampsia', 'Chronic_hypertension'], univariable: true },
        { type: 'roc', outcome: 'Group', positive: 'Preeclampsia', predictors: ['sFlt1_PlGF_ratio', 'Uric_acid_mg_dL'] }
      ],
      rows() {
        const R = rng(707), out = [];
        [['Preeclampsia', 50], ['Normotensive', 60]].forEach(([g, n], gi) => { for (let i = 0; i < n; i++) {
          const ga = r1(clamp(R.n(gi ? 38.4 : 35.2, gi ? 1.3 : 2.4), 28, 41.5));
          out.push({ ID: out.length + 1, Group: g, Maternal_age_years: Math.round(R.n(gi ? 28 : 31, 5)), BMI_kg_m2: r1(R.n(gi ? 26.5 : 30, 4)),
            Parity: R.pick(['Nulliparous', 'Multiparous'], gi ? [40, 60] : [62, 38]), Previous_preeclampsia: R.yes(gi ? 0.04 : 0.22), Chronic_hypertension: R.yes(gi ? 0.03 : 0.16),
            Systolic_BP_mmHg: Math.round(R.n(gi ? 116 : 158, gi ? 9 : 12)), sFlt1_PlGF_ratio: r1(Math.exp(R.n(gi ? 2.3 : 4.3, 0.75))),
            Uric_acid_mg_dL: r1(R.n(gi ? 4.4 : 6.1, 1)), Platelets_10e9_L: Math.round(R.n(gi ? 245 : 198, 50)), Gestational_age_weeks: ga,
            Birth_weight_g: Math.round(R.n(3300 - (39 - ga) * 210 - (gi ? 0 : 250), 330)), NICU_admission: R.yes(gi ? 0.07 : 0.34) });
        } });
        return out;
      }
    },
    {
      id: 'covid-icu-cohort', name: 'Cohort study — dexamethasone in ICU COVID-19',
      description: 'Dexamethasone versus standard care (exposure), 135 ICU patients. SpO2 on days 0/3/7, oxygen support on admission and day 7, 28-day follow-up and death. Good for Kaplan-Meier, Cox regression and McNemar (STROBE).',
      title: 'Dexamethasone and 28-day mortality in critically ill patients with COVID-19: a retrospective cohort study',
      options: { within: true },
      flow: { type: 'strobe', excluded: [{ text: 'Died within 24 h of admission', n: 9 }, { text: 'Transferred from another ICU', n: 14 }, { text: 'Steroids for another indication', n: 6 }],
        groups: [{ description: 'Exposed: dexamethasone 6 mg daily', lost: 3, lostReason: 'Transferred out before day 28' }, { description: 'Not exposed: standard care', lost: 2, lostReason: 'Transferred out before day 28' }] },
      advanced: [
        { type: 'survival', outcome: 'Follow_up_days', event: 'Death', positive: 'Yes', at: '28' },
        { type: 'cox', outcome: 'Follow_up_days', event: 'Death', positive: 'Yes', predictors: ['Group', 'Age_years', 'SOFA_admission', 'Diabetes'], univariable: true },
        { type: 'mcnemar', outcome: 'Oxygen_support_admission', second: 'Oxygen_support_day7', positive: 'High-flow' }
      ],
      rows() {
        const R = rng(808), out = [];
        [['Dexamethasone', 70], ['Standard care', 65]].forEach(([g, n], gi) => { for (let i = 0; i < n; i++) {
          const age = Math.round(R.n(62, 12)), sofa = clamp(Math.round(R.n(6, 2.5)), 1, 16), spo = R.n(86, 4);
          const hz = 0.022 * Math.exp(0.03 * (age - 62) + 0.17 * (sofa - 6)) * (gi ? 1 : 0.62);
          const tDeath = -Math.log(R.u()) / hz, t = Math.min(28, tDeath), died = tDeath <= 28;
          const o2 = v => v < 88 ? 'High-flow' : 'Conventional';
          out.push({ ID: out.length + 1, Group: g, Age_years: age, Sex: R.pick(['Male', 'Female'], [62, 38]), Diabetes: R.yes(0.35), Hypertension: R.yes(0.45),
            SOFA_admission: sofa, CRP_mg_L: r1(Math.exp(R.n(4.6, 0.5))), D_dimer_ng_mL: Math.round(Math.exp(R.n(7, 0.7))),
            SpO2_day0: r1(spo), SpO2_day3: R.miss(r1(clamp(spo + (gi ? 1.5 : 4) + R.n(0, 3), 70, 100)), 0.05), SpO2_day7: R.miss(r1(clamp(spo + (gi ? 3 : 7.5) + R.n(0, 3), 70, 100)), 0.12),
            Oxygen_support_admission: o2(spo + R.n(0, 1)), Oxygen_support_day7: o2(spo + (gi ? 2.5 : 6) + R.n(0, 3)),
            Mechanical_ventilation: R.yes(gi ? 0.38 : 0.24), Follow_up_days: Math.max(1, Math.round(t)), Death: died ? 'Yes' : 'No' });
        } });
        return out;
      }
    },
    {
      id: 'lung-ultrasound-stard', name: 'Diagnostic accuracy study — lung ultrasound for pneumonia',
      description: 'Lung ultrasound against chest CT (reference standard), 120 patients. Two readers’ scores and results. Good for sensitivity / specificity, ROC, kappa and ICC with Bland-Altman (STARD).',
      title: 'Diagnostic accuracy of lung ultrasound compared with chest CT for community-acquired pneumonia',
      // STARD numbers follow the data; a few patients without CT are added as "no reference standard"
      flow: rows => {
        const pos = r => r.LUS_result === 'Positive', dis = r => r.Group === 'Pneumonia';
        const br = (name, f, noRef) => { const rs = rows.filter(f); return { name, n: rs.length + noRef, noRef, present: rs.filter(dis).length, absent: rs.filter(r => !dis(r)).length, inconclusive: 0 }; };
        return { type: 'stard', excluded: [{ text: 'Unable to undergo CT', n: 7 }, { text: 'Declined to participate', n: 5 }],
          stard: { tested: rows.length + 3, branches: [br('Positive', pos, 1), br('Negative', r => !pos(r), 2), { name: 'Inconclusive', n: 0, noRef: 0, present: 0, absent: 0, inconclusive: 0 }] } };
      },
      advanced: [
        { type: 'diagnostic', outcome: 'Group', positive: 'Pneumonia', event: 'LUS_result', eventPositive: 'Positive' },
        { type: 'roc', outcome: 'Group', positive: 'Pneumonia', predictors: ['LUS_score_A', 'CRP_mg_L'] },
        { type: 'kappa', outcome: 'Reader_A_result', second: 'Reader_B_result' },
        { type: 'agreement', outcome: 'LUS_score_A', second: 'LUS_score_B' }
      ],
      rows() {
        const R = rng(909), out = [];
        [['Pneumonia', 55], ['No pneumonia', 65]].forEach(([g, n], gi) => { for (let i = 0; i < n; i++) {
          const truth = clamp(R.n(gi ? 7 : 17, 4.5), 0, 36), a = clamp(Math.round(truth + R.n(0, 1.6)), 0, 36), b = clamp(Math.round(truth + 0.6 + R.n(0, 1.8)), 0, 36);
          const res = v => v >= 12 ? 'Positive' : 'Negative';
          out.push({ ID: out.length + 1, Group: g, Age_years: Math.round(R.n(58, 16)), Sex: R.pick(['Male', 'Female']), Fever: R.yes(gi ? 0.35 : 0.72),
            CRP_mg_L: r1(Math.exp(R.n(gi ? 2.8 : 4.1, 0.8))), WBC_10e9_L: r1(R.n(gi ? 9 : 13.5, 3.5)),
            LUS_score_A: a, LUS_score_B: b, Reader_A_result: res(a), Reader_B_result: res(b), LUS_result: res(a) });
        } });
        return out;
      }
    },
    {
      id: 'sleeve-gastrectomy-cohort', name: 'One-group cohort — weight loss after sleeve gastrectomy', noGroups: true,
      description: 'One group of 64 patients followed for a year: weight at 4 timepoints (with height, to calculate BMI), HbA1c, blood pressure and quality of life before and after. Shows one-group analysis and change over time in the same patients.',
      title: 'Weight loss and metabolic outcomes one year after laparoscopic sleeve gastrectomy: a prospective cohort study',
      options: { within: true, figNotes: true },
      levels: { Satisfaction: ['Poor', 'Fair', 'Good', 'Excellent'] },
      flow: { type: 'strobe', excluded: [{ text: 'Previous bariatric surgery', n: 6 }, { text: 'Declined to participate', n: 4 }], groups: [{ lost: 3, lostReason: 'Lost to follow-up before 12 months' }] },
      advanced: [{ type: 'correlation', outcome: 'Weight_baseline', predictors: ['Age_years', 'HbA1c_baseline', 'SBP_baseline', 'QoL_score_baseline'], method: 'auto', scatter: '2' },
        { type: 'mcnemar', outcome: 'Hypertension_baseline', second: 'Hypertension_12m', positive: 'Yes' }],
      rows() {
        const R = rng(1111), out = [];
        for (let i = 0; i < 64; i++) {
          const h = R.n(166, 9), w0 = R.n(128, 18), loss = clamp(R.n(0.27, 0.07), 0.08, 0.45), dm = R.yes(0.35), htn = R.u() < 0.45;
          const w = f => r1(w0 * (1 - loss * f) + R.n(0, 2));
          const a1c0 = dm === 'Yes' ? R.n(8.1, 1.2) : R.n(5.7, 0.4), sbp0 = R.n(htn ? 146 : 128, 10) + 0.2 * (w0 - 128);
          out.push({ ID: i + 1, Age_years: Math.round(clamp(R.n(38, 10), 18, 62)), Sex: R.pick(['Female', 'Male'], [70, 30]), Height_cm: Math.round(h), Diabetes: dm,
            Weight_baseline: r1(w0), Weight_3m: w(0.45), Weight_6m: R.miss(w(0.75)), Weight_12m: R.miss(w(1), 0.05),
            HbA1c_baseline: r1(a1c0), HbA1c_6m: r1(a1c0 - (dm === 'Yes' ? 1.3 : 0.3) + R.n(0, 0.4)), HbA1c_12m: r1(a1c0 - (dm === 'Yes' ? 1.7 : 0.35) + R.n(0, 0.45)),
            SBP_baseline: Math.round(sbp0), SBP_12m: Math.round(sbp0 - R.n(12, 8)),
            Hypertension_baseline: htn ? 'Yes' : 'No', Hypertension_12m: htn && R.u() < 0.45 ? 'Yes' : 'No',
            QoL_score_baseline: Math.round(clamp(R.n(52, 9) - 0.35 * (w0 - 128), 10, 100)), QoL_score_12m: Math.round(clamp(R.n(74, 11), 10, 100)),
            Complications: R.yes(0.09), Satisfaction: R.pick(['Poor', 'Fair', 'Good', 'Excellent'], [5, 15, 45, 35]) });
        }
        return out;
      }
    }
  ];

  return { LIST, get: id => LIST.find(e => e.id === id) };
})();
if (typeof module !== 'undefined') module.exports = Examples;

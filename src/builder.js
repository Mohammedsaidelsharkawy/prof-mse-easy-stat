/* Prof MSE Easy Stat — master sheet builder: design the data collection sheet of a study (variables, visits, groups, rules),
   then export an Excel master sheet (drop-down lists, allowed ranges, highlighting, formulas, frozen header, codebook, instructions,
   randomisation list, double entry), a case report form (Word) and a REDCap data dictionary. The workbook carries its own setup,
   so when the filled sheet is uploaded the analysis knows every column. Works through window.EasyUI. */
(() => {
  const U = window.EasyUI; if (!U) return;
  const $ = s => document.querySelector(s), esc = U.esc, toast = U.toast;
  const ls = { get: (k, d) => { try { const v = localStorage.getItem('mb.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('mb.' + k, JSON.stringify(v)); } catch (e) { /* not kept */ } } };
  const uid = () => 'm' + Math.random().toString(36).slice(2, 9);

  /* ---------- the variable library ---------- */
  const YN = ['Yes', 'No'];
  const LIB = [
    ['Demographics', [['Age', 'num', 'years', 0, 120, null, 0], ['Sex', 'cat', '', null, null, ['Male', 'Female']], ['Date of birth', 'date'], ['Date of enrolment', 'date'], ['Weight', 'num', 'kg', 2, 300, null, 1], ['Height', 'num', 'cm', 40, 250, null, 0],
      ['Residence', 'cat', '', null, null, ['Urban', 'Rural']], ['Marital status', 'cat', '', null, null, ['Single', 'Married', 'Divorced', 'Widowed']], ['Education', 'cat', '', null, null, ['Illiterate', 'Primary', 'Secondary', 'University']],
      ['Occupation', 'text'], ['Smoking', 'cat', '', null, null, ['Never', 'Former', 'Current']]]],
    ['Medical history', [['Hypertension', 'yn'], ['Diabetes', 'yn'], ['Ischaemic heart disease', 'yn'], ['Heart failure', 'yn'], ['COPD', 'yn'], ['Asthma', 'yn'], ['Chronic kidney disease', 'yn'], ['Chronic liver disease', 'yn'],
      ['Stroke', 'yn'], ['Dyslipidaemia', 'yn'], ['Hypothyroidism', 'yn'], ['Cancer', 'yn'], ['Previous surgery', 'yn'], ['ASA class', 'cat', '', null, null, ['I', 'II', 'III', 'IV', 'V']], ['Charlson comorbidity index', 'num', '', 0, 37, null, 0]]],
    ['Vital signs', [['Systolic BP', 'num', 'mmHg', 50, 260, null, 0], ['Diastolic BP', 'num', 'mmHg', 30, 160, null, 0], ['Heart rate', 'num', 'bpm', 20, 250, null, 0], ['Respiratory rate', 'num', '/min', 4, 70, null, 0],
      ['Temperature', 'num', '°C', 30, 43, null, 1], ['SpO2', 'num', '%', 50, 100, null, 0], ['Glasgow coma scale', 'num', '', 3, 15, null, 0]]],
    ['Laboratory', [['Haemoglobin', 'num', 'g/dL', 3, 22, null, 1], ['WBC', 'num', '×10⁹/L', 0.1, 100, null, 1], ['Platelets', 'num', '×10⁹/L', 1, 1500, null, 0], ['Creatinine', 'num', 'mg/dL', 0.1, 20, null, 2], ['Urea', 'num', 'mg/dL', 1, 400, null, 0],
      ['ALT', 'num', 'U/L', 1, 5000, null, 0], ['AST', 'num', 'U/L', 1, 5000, null, 0], ['Albumin', 'num', 'g/dL', 1, 6, null, 1], ['Total bilirubin', 'num', 'mg/dL', 0.1, 40, null, 1], ['Sodium', 'num', 'mEq/L', 100, 180, null, 0],
      ['Potassium', 'num', 'mEq/L', 1.5, 9, null, 1], ['Fasting glucose', 'num', 'mg/dL', 20, 1000, null, 0], ['HbA1c', 'num', '%', 3, 20, null, 1], ['CRP', 'num', 'mg/L', 0, 500, null, 1], ['INR', 'num', '', 0.5, 10, null, 2],
      ['Troponin', 'num', 'ng/L', 0, 100000, null, 0], ['D-dimer', 'num', 'ng/mL', 0, 100000, null, 0], ['Vitamin D', 'num', 'ng/mL', 1, 150, null, 1], ['LDL cholesterol', 'num', 'mg/dL', 10, 500, null, 0]]],
    ['Scores', [['Pain VAS', 'num', 'cm', 0, 10, null, 1], ['Pain NRS', 'num', '', 0, 10, null, 0], ['WOMAC', 'num', '', 0, 96, null, 0], ['Oswestry disability index', 'num', '%', 0, 100, null, 0], ['Barthel index', 'num', '', 0, 100, null, 0],
      ['PHQ-9', 'num', '', 0, 27, null, 0], ['GAD-7', 'num', '', 0, 21, null, 0], ['MMSE', 'num', '', 0, 30, null, 0], ['APACHE II', 'num', '', 0, 71, null, 0], ['SOFA', 'num', '', 0, 24, null, 0],
      ['Satisfaction', 'cat', '', null, null, ['Poor', 'Fair', 'Good', 'Excellent']]]],
    ['Operative data', [['Date of surgery', 'date'], ['Operative time', 'num', 'min', 1, 1000, null, 0], ['Blood loss', 'num', 'mL', 0, 10000, null, 0], ['Anaesthesia', 'cat', '', null, null, ['General', 'Spinal', 'Regional', 'Local']],
      ['Intraoperative complications', 'yn'], ['Conversion', 'yn']]],
    ['Outcomes', [['Complications', 'yn'], ['Type of complication', 'text'], ['Readmission', 'yn'], ['Reoperation', 'yn'], ['ICU admission', 'yn'], ['Date of admission', 'date'], ['Date of discharge', 'date'],
      ['Length of stay', 'num', 'days', 0, 365, null, 0], ['Recurrence', 'yn'], ['Mortality', 'yn'], ['Date of death', 'date'], ['Follow-up', 'num', 'months', 0, 240, null, 0]]],
    ['Diagnostic accuracy', [['Index test result', 'cat', '', null, null, ['Positive', 'Negative']], ['Reference standard', 'cat', '', null, null, ['Positive', 'Negative']], ['Index test value', 'num', '', null, null, null, 2],
      ['Reader 1 result', 'cat', '', null, null, ['Positive', 'Negative']], ['Reader 2 result', 'cat', '', null, null, ['Positive', 'Negative']]]],
    ['Obstetrics', [['Gestational age', 'num', 'weeks', 20, 44, null, 1], ['Gravidity', 'num', '', 1, 20, null, 0], ['Parity', 'num', '', 0, 15, null, 0], ['Mode of delivery', 'cat', '', null, null, ['Vaginal', 'Caesarean']],
      ['Preeclampsia', 'yn'], ['Gestational diabetes', 'yn'], ['Postpartum haemorrhage', 'yn'], ['Birth weight', 'num', 'g', 300, 6000, null, 0], ['Apgar score at 5 minutes', 'num', '', 0, 10, null, 0], ['NICU admission', 'yn']]],
    ['Intensive care', [['Mechanical ventilation', 'yn'], ['Vasopressors', 'yn'], ['Renal replacement therapy', 'yn'], ['Lactate', 'num', 'mmol/L', 0.1, 30, null, 1], ['PaO2/FiO2 ratio', 'num', '', 20, 700, null, 0],
      ['Days on the ventilator', 'num', 'days', 0, 120, null, 0], ['ICU length of stay', 'num', 'days', 0, 365, null, 0], ['QT interval', 'num', 'ms', 200, 700, null, 0]]],
    ['Anaesthesia and analgesia', [['Duration of anaesthesia', 'num', 'min', 5, 1000, null, 0], ['Intraoperative fentanyl', 'num', 'µg', 0, 2000, null, 0], ['Onset of sensory block', 'num', 'min', 0, 60, null, 1], ['Onset of motor block', 'num', 'min', 0, 60, null, 1],
      ['Duration of sensory block', 'num', 'min', 0, 2880, null, 0], ['Duration of motor block', 'num', 'min', 0, 2880, null, 0], ['Bromage score', 'num', '', 0, 3, null, 0], ['Time to first rescue analgesia', 'num', 'min', 0, 2880, null, 0],
      ['Total morphine consumption (24 h)', 'num', 'mg', 0, 200, null, 1], ['Number of rescue analgesic doses', 'num', '', 0, 20, null, 0], ['Pain NRS on movement', 'num', '', 0, 10, null, 0], ['Mean arterial pressure', 'num', 'mmHg', 30, 180, null, 0],
      ['Ramsay sedation score', 'num', '', 1, 6, null, 0], ['RASS', 'num', '', -5, 4, null, 0], ['Hypotension', 'yn'], ['Bradycardia', 'yn'], ['PONV', 'yn'], ['Pruritus', 'yn'], ['Shivering', 'yn'], ['Respiratory depression', 'yn'], ['Urinary retention', 'yn'],
      ['Block-related complications', 'yn'], ['Vasopressor needed', 'yn'], ['Phenylephrine dose', 'num', 'µg', 0, 5000, null, 0], ['Shoulder tip pain', 'yn'], ['Emergence agitation', 'yn'], ['PAED scale', 'num', '', 0, 20, null, 0], ['FLACC score', 'num', '', 0, 10, null, 0],
      ['Delirium (CAM-ICU)', 'yn'], ['Quality of recovery (QoR-15)', 'num', '', 0, 150, null, 0], ['Time to first flatus', 'num', 'h', 0, 120, null, 1], ['Time to ambulation', 'num', 'h', 0, 120, null, 1], ['Parental satisfaction', 'cat', '', null, null, ['Poor', 'Fair', 'Good', 'Excellent']]]],
    ['Airway', [['Mallampati class', 'cat', '', null, null, ['I', 'II', 'III', 'IV']], ['Time to intubation', 'num', 's', 0, 600, null, 0], ['First-pass success', 'yn'], ['Number of intubation attempts', 'num', '', 1, 5, null, 0],
      ['Cormack-Lehane grade', 'cat', '', null, null, ['I', 'II', 'III', 'IV']], ['Lowest SpO2', 'num', '%', 50, 100, null, 0], ['Postoperative sore throat', 'yn'], ['Airway or dental trauma', 'yn']]],
    ['Neonatal', [['Apgar score at 1 minute', 'num', '', 0, 10, null, 0], ['Umbilical artery pH', 'num', '', 6.8, 7.5, null, 2]]],
    ['Study conduct', [['Site', 'text'], ['Date of randomisation', 'date'], ['Visit date', 'date'], ['Adherence', 'num', '%', 0, 100, null, 0], ['Adverse event', 'yn'], ['Withdrawn', 'yn'], ['Reason for withdrawal', 'text']]]];
  // normal (reference) ranges of the laboratory and vital-sign variables: values outside are shaded in Excel and counted in Analyse
  const NORMAL = { 'Haemoglobin': [12, 16], 'WBC': [4, 11], 'Platelets': [150, 450], 'Creatinine': [0.6, 1.2], 'Urea': [15, 45], 'ALT': [7, 56], 'AST': [10, 40], 'Albumin': [3.5, 5], 'Total bilirubin': [0.1, 1.2], 'Sodium': [135, 145],
    'Potassium': [3.5, 5], 'Fasting glucose': [70, 100], 'HbA1c': [4, 5.6], 'CRP': [0, 5], 'INR': [0.8, 1.2], 'Troponin': [0, 14], 'D-dimer': [0, 500], 'Vitamin D': [30, 100], 'LDL cholesterol': [0, 100], 'Lactate': [0.5, 2],
    'Systolic BP': [90, 139], 'Diastolic BP': [60, 89], 'Heart rate': [60, 100], 'Respiratory rate': [12, 20], 'Temperature': [36.1, 37.5], 'SpO2': [95, 100] };
  // units that can be converted (linear factors from the first unit), e.g. creatinine mg/dL × 88.4 = µmol/L
  const CONV = { 'Creatinine': [['mg/dL', 1, 2], ['µmol/L', 88.4, 0]], 'Urea': [['mg/dL', 1, 0], ['mmol/L', 0.357, 1]], 'Fasting glucose': [['mg/dL', 1, 0], ['mmol/L', 0.0555, 1]], 'Haemoglobin': [['g/dL', 1, 1], ['g/L', 10, 0]],
    'Albumin': [['g/dL', 1, 1], ['g/L', 10, 0]], 'Total bilirubin': [['mg/dL', 1, 1], ['µmol/L', 17.1, 0]], 'LDL cholesterol': [['mg/dL', 1, 0], ['mmol/L', 0.0259, 2]], 'Vitamin D': [['ng/mL', 1, 1], ['nmol/L', 2.496, 0]],
    'Weight': [['kg', 1, 1], ['lb', 2.2046, 1]], 'Height': [['cm', 1, 0], ['in', 0.3937, 1]], 'Temperature': [['°C', 1, 1]], 'CRP': [['mg/L', 1, 1], ['mg/dL', 0.1, 2]], 'Lactate': [['mmol/L', 1, 1], ['mg/dL', 9.01, 0]] };
  // scales with their items (each item a column, the total a formula): PHQ-9 and GAD-7 (free to use), or any Likert scale
  const nums = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  const SCALES = {
    'PHQ-9': { kind: 'scale', min: 0, max: 3, items: ['Little interest or pleasure', 'Feeling down or hopeless', 'Sleep problems', 'Tired or little energy', 'Poor appetite or overeating', 'Feeling bad about yourself', 'Trouble concentrating', 'Moving slowly or restless', 'Thoughts of self-harm'],
      totals: [{ label: 'total', kind: 'sum', def: 'PHQ-9 total: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–19 moderately severe, 20–27 severe depression. Items 0 (not at all) to 3 (nearly every day), last 2 weeks.' }, { label: 'severity', kind: 'cut', cuts: '5, 10, 15, 20', labs: 'Minimal, Mild, Moderate, Moderately severe, Severe' }] },
    'GAD-7': { kind: 'scale', min: 0, max: 3, items: ['Nervous or anxious', 'Cannot stop worrying', 'Worrying too much', 'Trouble relaxing', 'Restless', 'Easily annoyed', 'Afraid something awful might happen'],
      totals: [{ label: 'total', kind: 'sum', def: 'GAD-7 total: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–21 severe anxiety. Items 0 (not at all) to 3 (nearly every day), last 2 weeks.' }, { label: 'severity', kind: 'cut', cuts: '5, 10, 15', labs: 'Minimal, Mild, Moderate, Severe' }] },
    'HADS': { kind: 'scale', min: 0, max: 3, items: nums(14, i => `${i % 2 ? 'D' : 'A'}${Math.floor(i / 2) + 1}`), note: 'Item wording is copyrighted: use the licensed form; enter each item as scored (0–3).',
      totals: [{ label: 'anxiety', kind: 'sum', idx: nums(7, i => 2 * i), def: 'HADS anxiety: 0–7 normal, 8–10 borderline, 11–21 abnormal.' }, { label: 'depression', kind: 'sum', idx: nums(7, i => 2 * i + 1), def: 'HADS depression: 0–7 normal, 8–10 borderline, 11–21 abnormal.' },
        { label: 'anxiety category', kind: 'cut', of: 0, cuts: '8, 11', labs: 'Normal, Borderline, Abnormal' }, { label: 'depression category', kind: 'cut', of: 1, cuts: '8, 11', labs: 'Normal, Borderline, Abnormal' }] },
    'EQ-5D-5L': { kind: 'scale', min: 1, max: 5, items: ['Mobility', 'Self-care', 'Usual activities', 'Pain / discomfort', 'Anxiety / depression', ['EQ VAS', 0, 100]], totals: [], note: 'Register with the EuroQol Group to use EQ-5D. Levels 1 (no problems) to 5 (extreme); the index needs your country\'s value set.' },
    'Oswestry': { kind: 'scale', min: 0, max: 5, items: ['Pain intensity', 'Personal care', 'Lifting', 'Walking', 'Sitting', 'Standing', 'Sleeping', 'Sex life', 'Social life', 'Travelling'],
      totals: [{ label: 'disability index (%)', short: 'ODI', kind: 'pctsum', def: 'Oswestry disability index: points / (5 × sections answered) × 100; 0–20 minimal, 21–40 moderate, 41–60 severe, 61–80 crippled, 81–100 bed-bound.' }, { label: 'disability', kind: 'cut', cuts: '21, 41, 61, 81', labs: 'Minimal, Moderate, Severe, Crippled, Bed-bound' }] },
    'WOMAC': { kind: 'scale', min: 0, max: 4, items: [...nums(5, i => `Pain ${i + 1}`), ...nums(2, i => `Stiffness ${i + 1}`), ...nums(17, i => `Function ${i + 1}`)], note: 'WOMAC is licensed: use the official form; items 0 (none) to 4 (extreme).',
      totals: [{ label: 'pain', kind: 'sum', idx: nums(5, i => i) }, { label: 'stiffness', kind: 'sum', idx: [5, 6] }, { label: 'function', kind: 'sum', idx: nums(17, i => i + 7) }, { label: 'total', kind: 'sum', def: 'WOMAC total 0–96 (pain 0–20, stiffness 0–8, function 0–68); higher is worse.' }] },
    'KOOS': { kind: 'scale', min: 0, max: 4, items: [...nums(7, i => `Symptoms ${i + 1}`), ...nums(9, i => `Pain ${i + 1}`), ...nums(17, i => `ADL ${i + 1}`), ...nums(5, i => `Sport ${i + 1}`), ...nums(4, i => `QoL ${i + 1}`)], note: 'Items 0 (none) to 4 (extreme); subscales 0–100, 100 = no problems.',
      totals: [{ label: 'symptoms', kind: 'rpct', idx: nums(7, i => i) }, { label: 'pain', kind: 'rpct', idx: nums(9, i => i + 7) }, { label: 'ADL', kind: 'rpct', idx: nums(17, i => i + 16) }, { label: 'sport', kind: 'rpct', idx: nums(5, i => i + 33) }, { label: 'QoL', kind: 'rpct', idx: nums(4, i => i + 38) }] },
    'Epworth': { kind: 'scale', min: 0, max: 3, items: ['Sitting and reading', 'Watching TV', 'Sitting inactive in a public place', 'Passenger in a car for an hour', 'Lying down in the afternoon', 'Sitting and talking to someone', 'Sitting quietly after lunch', 'In a car stopped in traffic'],
      totals: [{ label: 'total', kind: 'sum', def: 'Epworth sleepiness scale 0–24; above 10: excessive daytime sleepiness.' }, { label: 'sleepiness', kind: 'cut', cuts: '11', labs: 'Normal, Excessive' }] },
    'IPSS': { kind: 'scale', min: 0, max: 5, items: ['Incomplete emptying', 'Frequency', 'Intermittency', 'Urgency', 'Weak stream', 'Straining', 'Nocturia', ['Quality of life', 0, 6]],
      totals: [{ label: 'total', kind: 'sum', idx: nums(7, i => i), def: 'IPSS 0–35: 0–7 mild, 8–19 moderate, 20–35 severe; quality of life 0–6 separately.' }, { label: 'severity', kind: 'cut', cuts: '8, 20', labs: 'Mild, Moderate, Severe' }] },
    // clinical scores: yes/no items with their points, or points per item, and the total by formula
    'CHA₂DS₂-VASc': { kind: 'score', yn: true, items: [['Congestive heart failure', 1], ['Hypertension', 1], ['Age ≥ 75 years', 2], ['Diabetes', 1], ['Stroke, TIA or thromboembolism', 2], ['Vascular disease', 1], ['Age 65–74 years', 1], ['Female sex', 1]],
      totals: [{ label: 'score', kind: 'wsum', def: 'CHA₂DS₂-VASc 0–9 (stroke risk in atrial fibrillation).' }] },
    'CURB-65': { kind: 'score', yn: true, items: [['Confusion', 1], ['Urea > 7 mmol/L', 1], ['Respiratory rate ≥ 30/min', 1], ['SBP < 90 or DBP ≤ 60 mmHg', 1], ['Age ≥ 65 years', 1]],
      totals: [{ label: 'score', kind: 'wsum', def: 'CURB-65 0–5: 0–1 low, 2 moderate, 3–5 high severity of pneumonia.' }, { label: 'risk', kind: 'cut', cuts: '2, 3', labs: 'Low, Moderate, High' }] },
    'Wells (PE)': { kind: 'score', yn: true, items: [['Clinical signs of DVT', 3], ['PE the most likely diagnosis', 3], ['Heart rate > 100/min', 1.5], ['Immobilisation or surgery in 4 weeks', 1.5], ['Previous DVT or PE', 1.5], ['Haemoptysis', 1], ['Malignancy', 1]],
      totals: [{ label: 'score', kind: 'wsum', def: 'Wells score for pulmonary embolism 0–12.5; above 4: PE likely.' }, { label: 'PE', kind: 'cut', cuts: '4.5', labs: 'Unlikely, Likely' }] },
    'Charlson': { kind: 'score', yn: true, items: [['Myocardial infarction', 1], ['Congestive heart failure', 1], ['Peripheral vascular disease', 1], ['Cerebrovascular disease', 1], ['Dementia', 1], ['Chronic pulmonary disease', 1], ['Connective tissue disease', 1], ['Peptic ulcer disease', 1], ['Mild liver disease', 1], ['Diabetes without complications', 1],
      ['Hemiplegia', 2], ['Moderate or severe renal disease', 2], ['Diabetes with end-organ damage', 2], ['Any tumour', 2], ['Leukaemia', 2], ['Lymphoma', 2], ['Moderate or severe liver disease', 3], ['Metastatic solid tumour', 6], ['AIDS', 6]],
      totals: [{ label: 'comorbidity index', kind: 'wsum', def: 'Charlson comorbidity index (weights 1, 2, 3 and 6), without age points.' }] },
    'Child-Pugh': { kind: 'score', min: 1, max: 3, items: ['Bilirubin points', 'Albumin points', 'INR points', 'Ascites points', 'Encephalopathy points'],
      totals: [{ label: 'score', kind: 'sum', def: 'Child-Pugh 5–15: class A 5–6, B 7–9, C 10–15.' }, { label: 'class', kind: 'cut', cuts: '7, 10', labs: 'A, B, C' }] },
    'SOFA': { kind: 'score', min: 0, max: 4, items: ['Respiration', 'Coagulation', 'Liver', 'Cardiovascular', 'Central nervous system', 'Renal'], totals: [{ label: 'score', kind: 'sum', def: 'SOFA 0–24: 0–4 points for each of six organ systems.' }] },
    'APACHE II': { kind: 'score', min: 0, max: 4, items: ['Temperature', 'Mean arterial pressure', 'Heart rate', 'Respiratory rate', 'Oxygenation', 'Arterial pH', 'Sodium', 'Potassium', ['Creatinine', 0, 8], 'Haematocrit', 'WBC', ['GCS (15 − GCS)', 0, 12], ['Age', 0, 6], ['Chronic health', 0, 5]],
      totals: [{ label: 'score', kind: 'sum', def: 'APACHE II 0–71: acute physiology points, age points and chronic health points.' }] }
  };
  // expected values of each variable (used by the generator): mean ± SD (skewed for lab values that are), % of each category, days after the previous date
  const EXPECT = { 'Age': [50, 12], 'Weight': [75, 14], 'Height': [165, 9], 'Charlson comorbidity index': [2, 1.8, 1], 'Systolic BP': [130, 18], 'Diastolic BP': [80, 11], 'Heart rate': [82, 14], 'Respiratory rate': [18, 4], 'Temperature': [37, 0.5],
    'SpO2': [96, 2.5], 'Glasgow coma scale': [14, 1.5], 'Haemoglobin': [12.8, 1.8], 'WBC': [8, 3, 1], 'Platelets': [250, 70], 'Creatinine': [1, 0.35, 1], 'Urea': [35, 12, 1], 'ALT': [30, 18, 1], 'AST': [28, 14, 1], 'Albumin': [3.9, 0.5],
    'Total bilirubin': [0.8, 0.45, 1], 'Sodium': [138, 3], 'Potassium': [4.2, 0.45], 'Fasting glucose': [110, 30, 1], 'HbA1c': [6.5, 1.3], 'CRP': [15, 20, 1], 'INR': [1.1, 0.2], 'Troponin': [20, 40, 1], 'D-dimer': [800, 600, 1],
    'Vitamin D': [22, 10], 'LDL cholesterol': [120, 35], 'Pain VAS': [6, 2], 'Pain NRS': [6, 2], 'WOMAC': [55, 15], 'Oswestry disability index': [40, 15], 'Barthel index': [70, 20], 'PHQ-9': [8, 5, 1], 'GAD-7': [7, 4, 1],
    'MMSE': [25, 4], 'APACHE II': [15, 7], 'SOFA': [6, 3], 'Operative time': [90, 30], 'Blood loss': [250, 150, 1], 'Length of stay': [5, 3, 1], 'Follow-up': [12, 4], 'Index test value': [50, 20], 'Gestational age': [38.5, 1.8], 'Gravidity': [2.5, 1.6, 1], 'Parity': [1.4, 1.2, 1], 'Birth weight': [3200, 500], 'Apgar score at 5 minutes': [9, 1],
    'Lactate': [2.2, 1.5, 1], 'PaO2/FiO2 ratio': [250, 90], 'Days on the ventilator': [5, 4, 1], 'ICU length of stay': [7, 5, 1], 'QT interval': [400, 30], 'Adherence': [88, 12],
    'Duration of anaesthesia': [120, 35], 'Intraoperative fentanyl': [150, 60], 'Onset of sensory block': [8, 3], 'Onset of motor block': [10, 4], 'Duration of sensory block': [480, 150], 'Duration of motor block': [300, 90], 'Bromage score': [1.5, 1],
    'Time to first rescue analgesia': [360, 200, 1], 'Total morphine consumption (24 h)': [12, 8, 1], 'Number of rescue analgesic doses': [2, 1.4, 1], 'Pain NRS on movement': [5, 2], 'Mean arterial pressure': [88, 12], 'Ramsay sedation score': [2, 0.7], 'RASS': [-1, 1.3],
    'Phenylephrine dose': [400, 250, 1], 'PAED scale': [8, 4], 'FLACC score': [3, 2], 'Quality of recovery (QoR-15)': [118, 15], 'Time to first flatus': [24, 10, 1], 'Time to ambulation': [12, 6, 1], 'Time to intubation': [35, 15, 1],
    'Number of intubation attempts': [1.2, 0.5, 1], 'Lowest SpO2': [96, 3], 'Apgar score at 1 minute': [8, 1.2], 'Umbilical artery pH': [7.28, 0.06] };
  // expected % "Yes" of the new yes/no outcomes
  const YES_MORE = { 'Hypotension': 30, 'Bradycardia': 10, 'PONV': 25, 'Pruritus': 10, 'Shivering': 20, 'Respiratory depression': 3, 'Urinary retention': 8, 'Block-related complications': 3, 'Vasopressor needed': 35, 'Shoulder tip pain': 35, 'Emergence agitation': 25,
    'Delirium (CAM-ICU)': 25, 'First-pass success': 85, 'Postoperative sore throat': 30, 'Airway or dental trauma': 4 };
  const YES_PCT = { 'Hypertension': 30, 'Diabetes': 20, 'Ischaemic heart disease': 10, 'Heart failure': 5, 'COPD': 8, 'Asthma': 7, 'Chronic kidney disease': 6, 'Chronic liver disease': 4, 'Stroke': 4, 'Dyslipidaemia': 25, 'Hypothyroidism': 6,
    'Cancer': 5, 'Previous surgery': 30, 'Intraoperative complications': 5, 'Conversion': 4, 'Complications': 15, 'Readmission': 8, 'Reoperation': 5, 'ICU admission': 10, 'Recurrence': 10, 'Mortality': 5 };
  const CAT_PCT = { 'Smoking': [55, 20, 25], 'ASA class': [30, 45, 20, 4, 1], 'Residence': [60, 40], 'Satisfaction': [10, 20, 40, 30], 'Index test result': [40, 60], 'Reference standard': [35, 65] };
  const DATE_GAP = { 'Date of surgery': [1, 1], 'Date of discharge': [4, 2], 'Date of death': [60, 40] };
  function expectOf(label, type, cats) {
    if (type === 'yn' && YES_MORE[label] !== undefined) return { pct: [YES_MORE[label], 100 - YES_MORE[label]] };
    if (type === 'num' || type === 'calc') { const e = EXPECT[label]; return e ? { mean: e[0], sd: e[1], dist: e[2] ? 'skewed' : 'normal' } : { mean: '', sd: '', dist: 'normal' }; }
    if (type === 'yn') { const y = YES_PCT[label] ?? 30; return { pct: [y, 100 - y] }; }
    if (type === 'cat') { const c = CAT_PCT[label]; return { pct: c && c.length === cats.length ? [...c] : cats.map(() => +(100 / cats.length).toFixed(1)) }; }
    if (type === 'date') { const g = DATE_GAP[label] || [7, 3]; return { mean: g[0], sd: g[1] }; }
    return {};
  }
  const libVar = (section, e) => ({ ...(NORMAL[e[0]] ? { refLo: NORMAL[e[0]][0], refHi: NORMAL[e[0]][1] } : {}), expect: expectOf(e[0], e[1], e[1] === 'yn' ? YN : e[5] || []), id: uid(), section, label: e[0], type: e[1], unit: e[2] || '', min: e[3] ?? '', max: e[4] ?? '', cats: e[1] === 'yn' ? [...YN] : e[5] ? [...e[5]] : [], dec: e[6] ?? '', required: false, visits: [], group: section === 'Medical history' && e[1] === 'yn' ? 'Co-morbidities' : '', role: '', definition: '' });
  const findLib = label => { for (const [sec, list] of LIB) { const e = list.find(x => x[0].toLowerCase() === label.toLowerCase()); if (e) return libVar(sec, e); } return null; };

  /* ---------- templates ---------- */
  const TEMPLATES = {
    rct2: { cat: 'Trials', name: 'Two-arm randomised trial', design: 'rct', arms: ['Intervention', 'Control'], visits: ['Baseline', 'Week 2', 'Month 3'], rand: true,
      vars: [['Age'], ['Sex'], ['Weight'], ['Height'], ['BMI*'], ['Hypertension'], ['Diabetes'], ['Ischaemic heart disease'], ['Smoking'], ['Pain VAS', 'all'], ['Complications', 'last'], ['Satisfaction', 'last']] },
    cohort: { cat: 'Observational', name: 'Cohort with follow-up', design: 'cohort', arms: ['Exposed', 'Not exposed'], visits: ['Baseline', 'Month 6', 'Month 12'],
      vars: [['Age'], ['Sex'], ['Smoking'], ['Hypertension'], ['Diabetes'], ['Chronic kidney disease'], ['Systolic BP', 'all'], ['HbA1c', 'all'], ['Mortality', 'last'], ['Readmission', 'last']] },
    diag: { cat: 'Diagnostic', name: 'Diagnostic accuracy study', design: 'diagnostic', arms: [], visits: ['Baseline'],
      vars: [['Age'], ['Sex'], ['Index test value'], ['Index test result'], ['Reference standard']] },
    before: { cat: 'Trials', name: 'One group, before and after', design: 'beforeafter', arms: [], visits: ['Before', 'After'],
      vars: [['Age'], ['Sex'], ['Weight', 'all'], ['Systolic BP', 'all'], ['Fasting glucose', 'all']] },
    casecontrol: { cat: 'Observational', name: 'Case-control study', design: 'casecontrol', arms: ['Cases', 'Controls'], visits: ['Baseline'],
      vars: [['Age'], ['Sex'], ['Residence'], ['Education'], ['Smoking'], ['Hypertension'], ['Diabetes'], ['Dyslipidaemia'], ['BMI*']] },
    cross: { cat: 'Observational', name: 'Cross-sectional survey', design: 'cross', arms: [], visits: ['Baseline'],
      vars: [['Age'], ['Sex'], ['Residence'], ['Marital status'], ['Education'], ['Occupation'], ['Smoking'], ['Weight'], ['Height'], ['BMI*'], ['Hypertension'], ['Diabetes'], ['PHQ-9'], ['GAD-7']] },
    crossover: { cat: 'Trials', name: 'Crossover trial (AB / BA)', design: 'rct', arms: ['Sequence AB', 'Sequence BA'], visits: ['Period 1', 'Period 2'], rand: true,
      vars: [['Age'], ['Sex'], ['Weight'], ['Systolic BP', 'all'], ['Pain NRS', 'all'], ['Adverse event', 'all']] },
    noninf: { cat: 'Trials', name: 'Non-inferiority trial', design: 'rct', arms: ['New treatment', 'Standard treatment'], visits: ['Baseline', 'Month 3'], rand: true,
      vars: [['Age'], ['Sex'], ['Diabetes'], ['Hypertension'], ['HbA1c', 'all'], ['Adverse event', 'last'], ['Withdrawn', 'last']] },
    cluster: { cat: 'Trials', name: 'Cluster randomised trial', design: 'rct', arms: ['Intervention', 'Control'], visits: ['Baseline', 'Month 6'], rand: true, sites: ['Centre 1', 'Centre 2', 'Centre 3', 'Centre 4'],
      vars: [['Age'], ['Sex'], ['Education'], ['Systolic BP', 'all'], ['Smoking', 'all'], ['Adherence', 'last']] },
    diag2: { cat: 'Diagnostic', name: 'Diagnostic accuracy with two readers', design: 'diagnostic', arms: [], visits: ['Baseline'],
      vars: [['Age'], ['Sex'], ['Index test value'], ['Reader 1 result'], ['Reader 2 result'], ['Reference standard']] },
    icu: { cat: 'Observational', name: 'ICU cohort', design: 'cohort', arms: ['Septic shock', 'No shock'], visits: ['Admission', 'Day 3', 'Day 7'],
      vars: [['Age'], ['Sex'], ['Diabetes'], ['Chronic kidney disease'], ['APACHE II'], ['SOFA', 'all'], ['Lactate', 'all'], ['Creatinine', 'all'], ['Mechanical ventilation'], ['Vasopressors'], ['Renal replacement therapy'], ['ICU length of stay', 'last'], ['Mortality', 'last']] },
    obstetric: { cat: 'Observational', name: 'Obstetric cohort', design: 'cohort', arms: ['Induction', 'Expectant management'], visits: ['Booking', 'Delivery'],
      vars: [['Age'], ['Gravidity'], ['Parity'], ['Weight'], ['Height'], ['BMI*'], ['Gestational diabetes'], ['Preeclampsia', 'last'], ['Gestational age', 'last'], ['Mode of delivery', 'last'], ['Postpartum haemorrhage', 'last'], ['Birth weight', 'last'], ['Apgar score at 5 minutes', 'last'], ['NICU admission', 'last']] },
    // anaesthesia, analgesia and perioperative care
    rarct3: { cat: 'Anaesthesia and pain', name: 'Three-arm regional anaesthesia RCT (block A vs block B vs control)', design: 'rct', arms: ['Block A', 'Block B', 'Control'], visits: ['Baseline', 'PACU', '2 h', '6 h', '12 h', '24 h'], rand: true,
      vars: [['Age'], ['Sex'], ['Weight'], ['Height'], ['BMI*'], ['ASA class'], ['Operative time'], ['Duration of anaesthesia'], ['Intraoperative fentanyl'], ['Onset of sensory block'], ['Duration of sensory block'],
        ['Total morphine consumption (24 h)'], ['Time to first rescue analgesia'], ['Number of rescue analgesic doses'], ['Pain NRS', 'post'], ['Pain NRS on movement', 'post'], ['Mean arterial pressure', 'all'], ['Heart rate', 'all'], ['Ramsay sedation score', 'post'],
        ['PONV', 'last'], ['Pruritus', 'last'], ['Hypotension'], ['Bradycardia'], ['Block-related complications'], ['Satisfaction', 'last']],
      primary: 'Total morphine consumption (24 h)', secondary: ['Time to first rescue analgesia', 'Pain NRS', 'Pain NRS on movement', 'Number of rescue analgesic doses'], ss: { m: 'anova', means: '12, 8, 8', sd: 6 } },
    spinal2: { cat: 'Anaesthesia and pain', name: 'Spinal anaesthesia adjuvant RCT', design: 'rct', arms: ['Bupivacaine + adjuvant', 'Bupivacaine alone'], visits: ['Baseline', '5 min', '10 min', '20 min', '30 min', 'PACU'], rand: true,
      vars: [['Age'], ['Sex'], ['Weight'], ['Height'], ['BMI*'], ['ASA class'], ['Operative time'], ['Onset of sensory block'], ['Onset of motor block'], ['Bromage score', [1, 2, 3, 4]], ['Duration of sensory block'], ['Duration of motor block'],
        ['Time to first rescue analgesia'], ['Mean arterial pressure', 'all'], ['Heart rate', 'all'], ['Hypotension'], ['Bradycardia'], ['Shivering'], ['PONV'], ['Pruritus'], ['Ramsay sedation score', 'last'], ['Satisfaction', 'last']],
      primary: 'Duration of sensory block', secondary: ['Time to first rescue analgesia', 'Duration of motor block', 'Onset of sensory block'], ss: { a: 480, b: 400, sd: 150 } },
    analg3: { cat: 'Anaesthesia and pain', name: 'Three-arm analgesic drug RCT (placebo-controlled)', design: 'rct', arms: ['Drug A', 'Drug B', 'Placebo'], visits: ['Baseline', '1 h', '6 h', '12 h', '24 h', '48 h'], rand: true,
      vars: [['Age'], ['Sex'], ['Weight'], ['ASA class'], ['Operative time'], ['Pain VAS', 'post'], ['Time to first rescue analgesia'], ['Total morphine consumption (24 h)'], ['Number of rescue analgesic doses'], ['Ramsay sedation score', 'post'],
        ['PONV', 'last'], ['Pruritus', 'last'], ['Respiratory depression', 'last'], ['Quality of recovery (QoR-15)', 'last'], ['Satisfaction', 'last']],
      primary: 'Pain VAS', secondary: ['Total morphine consumption (24 h)', 'Time to first rescue analgesia', 'Quality of recovery (QoR-15)'], ss: { m: 'anova', means: '4, 3, 3', sd: 1.8 } },
    csection: { cat: 'Anaesthesia and pain', name: 'Caesarean section: spinal hypotension RCT', design: 'rct', arms: ['Norepinephrine', 'Phenylephrine'], visits: ['Baseline', 'After spinal', 'Delivery', 'End of surgery'], rand: true,
      vars: [['Age'], ['Weight'], ['Height'], ['BMI*'], ['Gestational age'], ['Parity'], ['Mean arterial pressure', 'all'], ['Heart rate', 'all'], ['Hypotension'], ['Bradycardia'], ['Vasopressor needed'], ['Phenylephrine dose'], ['PONV'], ['Shivering'],
        ['Apgar score at 1 minute'], ['Apgar score at 5 minutes'], ['Umbilical artery pH'], ['NICU admission'], ['Satisfaction', 'last']],
      primary: 'Bradycardia', secondary: ['Hypotension', 'Umbilical artery pH', 'Apgar score at 1 minute'], ss: { a: 5, b: 20 } },
    airway: { cat: 'Anaesthesia and pain', name: 'Airway: videolaryngoscope vs direct laryngoscope RCT', design: 'rct', arms: ['Videolaryngoscope', 'Direct laryngoscope'], visits: ['Baseline'], rand: true,
      vars: [['Age'], ['Sex'], ['Weight'], ['Height'], ['BMI*'], ['ASA class'], ['Mallampati class'], ['Time to intubation'], ['First-pass success'], ['Number of intubation attempts'], ['Cormack-Lehane grade'], ['Lowest SpO2'], ['Heart rate'], ['Mean arterial pressure'],
        ['Postoperative sore throat'], ['Airway or dental trauma']],
      primary: 'Time to intubation', secondary: ['First-pass success', 'Cormack-Lehane grade', 'Postoperative sore throat'], ss: { a: 35, b: 28, sd: 12 } },
    paeds: { cat: 'Anaesthesia and pain', name: 'Paediatric anaesthesia RCT (emergence agitation)', design: 'rct', arms: ['Intervention', 'Control'], visits: ['PACU arrival', '15 min', '30 min', '1 h'], rand: true,
      vars: [['Age'], ['Sex'], ['Weight'], ['ASA class'], ['Operative time'], ['Duration of anaesthesia'], ['Emergence agitation'], ['PAED scale', 'all'], ['FLACC score', 'all'], ['Time to first rescue analgesia'], ['PONV'], ['Parental satisfaction', 'last']],
      primary: 'Emergence agitation', secondary: ['PAED scale', 'FLACC score'], ss: { a: 40, b: 15 } },
    icused: { cat: 'Anaesthesia and pain', name: 'ICU sedation RCT (dexmedetomidine vs propofol)', design: 'rct', arms: ['Dexmedetomidine', 'Propofol'], visits: ['Day 1', 'Day 3', 'Day 7'], rand: true,
      vars: [['Age'], ['Sex'], ['APACHE II'], ['SOFA'], ['RASS', 'all'], ['Delirium (CAM-ICU)', 'all'], ['Mean arterial pressure', 'all'], ['Heart rate', 'all'], ['Bradycardia'], ['Hypotension'], ['Days on the ventilator', 'last'], ['ICU length of stay', 'last'], ['Mortality', 'last']],
      primary: 'Delirium (CAM-ICU)', secondary: ['Days on the ventilator', 'ICU length of stay', 'Mortality'], ss: { a: 35, b: 20 } },
    pain1: { cat: 'Anaesthesia and pain', name: 'Interventional pain procedure, before and after (one group)', design: 'beforeafter', arms: [], visits: ['Baseline', '1 month', '3 months', '6 months'],
      vars: [['Age'], ['Sex'], ['Weight'], ['Height'], ['BMI*'], ['Pain NRS', 'all'], ['Oswestry disability index', 'all'], ['Adverse event', 'post'], ['Satisfaction', 'last']],
      primary: 'Pain NRS', secondary: ['Oswestry disability index'], ss: { a: 7, b: 5, sd: 2.5 } },
    lap2: { cat: 'Surgery', name: 'Laparoscopic surgery RCT (recovery and pain)', design: 'rct', arms: ['Technique A', 'Technique B'], visits: ['PACU', '6 h', '24 h'], rand: true,
      vars: [['Age'], ['Sex'], ['Weight'], ['Height'], ['BMI*'], ['ASA class'], ['Operative time'], ['Pain VAS', 'all'], ['Shoulder tip pain', 'all'], ['PONV', 'last'], ['Total morphine consumption (24 h)'], ['Time to first flatus'], ['Time to ambulation'],
        ['Quality of recovery (QoR-15)', 'last'], ['Complications', 'last'], ['Satisfaction', 'last']],
      primary: 'Pain VAS', secondary: ['Shoulder tip pain', 'Quality of recovery (QoR-15)', 'Time to first flatus'], ss: { a: 4, b: 3, sd: 1.8 } },
    retro: { cat: 'Observational', name: 'Retrospective chart review (cohort)', design: 'cohort', arms: ['Exposed', 'Not exposed'], visits: ['Admission', 'Discharge'],
      vars: [['Age'], ['Sex'], ['Hypertension'], ['Diabetes'], ['Chronic kidney disease'], ['Charlson comorbidity index'], ['Date of admission'], ['Date of discharge'], ['LOS*'], ['ICU admission', 'last'], ['Complications', 'last'], ['Readmission', 'last'], ['Mortality', 'last']],
      primary: 'Complications', secondary: ['Length of stay', 'Mortality'], ss: { a: 25, b: 12 } },
    dose4: { cat: 'Trials', name: 'Dose-finding trial (three doses and placebo)', design: 'rct', arms: ['Low dose', 'Medium dose', 'High dose', 'Placebo'], visits: ['Baseline', 'Week 4', 'Week 12'], rand: true,
      vars: [['Age'], ['Sex'], ['Weight'], ['Systolic BP', 'all'], ['Diastolic BP', 'all'], ['Heart rate', 'all'], ['Adverse event', 'post'], ['Withdrawn', 'last']],
      primary: 'Systolic BP', secondary: ['Diastolic BP'], ss: { m: 'anova', means: '132, 128, 125, 135', sd: 12 } },
    surgery: { cat: 'Surgery', name: 'Surgical outcomes study', design: 'cohort', arms: ['Technique A', 'Technique B'], visits: ['Pre-operative', 'Day 1', 'Month 1'],
      vars: [['Age'], ['Sex'], ['ASA class'], ['Hypertension'], ['Diabetes'], ['Date of surgery'], ['Operative time'], ['Blood loss'], ['Pain VAS', 'all'], ['Date of admission'], ['Date of discharge'], ['LOS*'], ['Complications', 'last'], ['Reoperation', 'last']] }
  };
  const blank = () => ({ title: '', design: 'rct', n: 60, arms: ['Group A', 'Group B'], idPrefix: 'P', idDigits: 3, visits: [{ id: 'v0', name: 'Baseline' }], sections: [],
    conv: { naming: 'label', missing: 'blank', date: 'dd/mm/yyyy', catAs: 'words' }, layout: 'wide', rand: { on: false, type: 'block', sizes: '4', strata: [], seed: 20261106, prefill: true }, double: false, checks: [], vars: [] });
  function fromTemplate(key) {
    const t = TEMPLATES[key], D = blank(); D.title = t.name; D.design = t.design; D.arms = [...t.arms]; D.visits = t.visits.map((n, i) => ({ id: 'v' + i, name: n })); D.rand.on = !!t.rand; if (t.sites) D.sites = t.sites.map((x, i) => ({ name: x, prefix: `C${i + 1}-` }));
    t.vars.forEach(([lab, vis]) => {
      if (lab === 'BMI*') { const w = D.vars.find(v => v.label === 'Weight'), h = D.vars.find(v => v.label === 'Height'); if (w && h) D.vars.push({ ...libVar('Demographics', ['BMI', 'calc', 'kg/m²', 10, 80, null, 1]), formula: { kind: 'bmi', a: w.id, b: h.id } }); return; }
      if (lab === 'LOS*') { const a = D.vars.find(v => v.label === 'Date of admission'), b = D.vars.find(v => v.label === 'Date of discharge'); if (a && b) D.vars.push({ ...libVar('Outcomes', ['Length of stay', 'calc', 'days', 0, 365, null, 0]), formula: { kind: 'days', a: a.id, b: b.id } }); return; }
      const v = findLib(lab); if (!v) return; const ids = D.visits.map(x => x.id);
      v.visits = vis === 'all' ? [...ids] : vis === 'last' ? [ids[ids.length - 1]] : vis === 'post' ? ids.slice(1) : Array.isArray(vis) ? vis.map(i => ids[i]).filter(Boolean) : [];
      if (v.visits.length === 1 && v.visits[0] === ids[0]) v.visits = []; D.vars.push(v); });
    (t.primary ? [t.primary] : []).forEach(l => { const v = D.vars.find(x => x.label === l); if (v) { v.role = 'primary'; v.required = true; } });
    (t.secondary || []).forEach(l => { const v = D.vars.find(x => x.label === l); if (v && !v.role) v.role = 'secondary'; });
    const BASE = /^(Operative time|Duration of anaesthesia|Intraoperative fentanyl|ASA class|Mallampati class|Gestational age|Parity|Gravidity|Charlson comorbidity index|APACHE II|SOFA|Date of .*)$/;
    D.vars.forEach(v => { if (v.role) return; if (/^(Demographics|Medical history)$/.test(v.section) || BASE.test(v.label)) { if (!/^Date of (discharge|death)/.test(v.label)) v.role = 'baseline'; } else if (t.primary) v.role = 'outcome'; });
    if (t.ss) { D.ss = { m: 'auto', alpha: 0.05, power: 0.8, drop: 10, ratio: 1, ...t.ss, v: (D.vars.find(x => x.label === t.primary) || {}).id || '' }; D.sections = [...new Set(D.vars.map(v => v.section))]; const r = ssCalc(D); if (r && !r.err) D.n = r.enrol; }
    if (key === 'surgery') D.checks.push({ a: D.vars.find(v => v.label === 'Date of discharge').id, op: '>=', b: D.vars.find(v => v.label === 'Date of admission').id });
    D.sections = [...new Set(D.vars.map(v => v.section))]; return D;
  }

  /* ---------- calculated columns ---------- */
  const FK = {
    bmi: { name: 'BMI = weight / (height m)²', a: 'Weight (kg)', b: 'Height (cm)' }, bsa: { name: 'Body surface area (Mosteller), m²', a: 'Weight (kg)', b: 'Height (cm)' },
    ibw: { name: 'Ideal body weight (Devine), kg', a: 'Height (cm)', c: 'Sex' }, map: { name: 'Mean arterial pressure = (SBP + 2 × DBP) / 3', a: 'Systolic BP', b: 'Diastolic BP' },
    qtc: { name: 'QTc (Bazett) = QT / √(60 / heart rate)', a: 'QT interval (ms)', b: 'Heart rate (bpm)' }, egfr: { name: 'eGFR (CKD-EPI 2021, creatinine in mg/dL)', a: 'Creatinine (mg/dL)', b: 'Age (years)', c: 'Sex' },
    days: { name: 'Days between two dates', a: 'First date', b: 'Second date' }, age: { name: 'Age in years from date of birth', a: 'Date of birth', b: 'Date of the visit (empty: today)' },
    change: { name: 'Change: last − first visit', a: 'Variable' }, pct: { name: '% change: (last − first) / first × 100', a: 'Variable' },
    cut: { name: 'Categories from cut-offs', a: 'Variable', cuts: true },
    sum: { name: 'Sum of items', list: 'num', rev: true }, mean: { name: 'Mean of items', list: 'num', rev: true }, pctsum: { name: 'Score as % of the maximum (e.g. Oswestry)', list: 'num' },
    rpct: { name: '100 − mean as % of the maximum (e.g. KOOS)', list: 'num' }, wsum: { name: 'Weighted score: points per item', list: 'any', weights: true },
    uconv: { name: 'One unit (converted from the unit column)', a: 'Variable', b: 'Unit column' }, any: { name: 'Any of the items is Yes', list: 'yn' }, eligible: { name: 'Eligible: every inclusion Yes and every exclusion No', list: 'yn' }
  };
  const cutsOf = f => String(f.cuts || '').split(/[,;\s]+/).map(Number).filter(x => isFinite(x)), labsOf = f => String(f.labs || '').split(/\s*[,;\/]\s*/).map(x => x.trim()).filter(Boolean);
  // a calculated column that gives categories (written as words)
  const calcCats = v => v.type !== 'calc' || !v.formula ? null : v.formula.kind === 'cut' ? (labsOf(v.formula).length === cutsOf(v.formula).length + 1 ? labsOf(v.formula) : null) : ['any', 'eligible'].includes(v.formula.kind) ? ['Yes', 'No'] : null;
  const yesCat = x => x ? (x.cats.find(c => /^(yes|present|positive|true)$/i.test(c)) || x.cats[0]) : 'Yes', femCat = x => x ? (x.cats.find(c => /^(f|female|woman|women|girl)/i.test(c)) || x.cats[1] || x.cats[0]) : 'Female';
  // the Excel formula of the kinds not written in the sheet loop (ref(id) = the cell of that variable in the same row and visit)
  function calcExcel(D, v, f, ref) {
    const vv = id => D.vars.find(x => x.id === id), lit = (id, cat) => { const x = vv(id); return D.conv.catAs === 'codes' && x ? String(x.cats.indexOf(cat) + 1) : `"${String(cat).replace(/"/g, '""')}"`; }, N = x => `ISNUMBER(${x})`;
    const A = f.a ? ref(f.a) : null, Bc = f.b ? ref(f.b) : null, Cc = f.c ? ref(f.c) : null, list = (f.list || []).map(id => [id, ref(id)]).filter(x => x[1]), refs = list.map(x => x[1]).join(','), n = list.length;
    switch (f.kind) {
      case 'map': return A && Bc ? `IF(AND(${N(A)},${N(Bc)}),ROUND((${A}+2*${Bc})/3,0),"")` : null;
      case 'bsa': return A && Bc ? `IF(AND(${N(A)},${N(Bc)}),ROUND(SQRT(${A}*${Bc}/3600),2),"")` : null;
      case 'qtc': return A && Bc ? `IF(AND(${N(A)},${N(Bc)},${Bc}>0),ROUND(${A}/SQRT(60/${Bc}),0),"")` : null;
      case 'ibw': { if (!A || !Cc) return null; const F = `${Cc}=${lit(f.c, femCat(vv(f.c)))}`; return `IF(AND(${N(A)},${Cc}<>""),ROUND(IF(${F},45.5,50)+2.3*(${A}/2.54-60),1),"")`; }
      case 'egfr': { if (!A || !Bc || !Cc) return null; const F = `(${Cc}=${lit(f.c, femCat(vv(f.c)))})`, k = `IF(${F},0.7,0.9)`;
        return `IF(AND(${N(A)},${N(Bc)},${Cc}<>""),ROUND(142*MIN(${A}/${k},1)^IF(${F},-0.241,-0.302)*MAX(${A}/${k},1)^(-1.2)*0.9938^${Bc}*IF(${F},1.012,1),0),"")`; }
      case 'uconv': return A && Bc ? `IF(${N(A)},ROUND(IF(${Bc}=${lit(f.b, f.from)},${A}*${+f.factor || 1},${A}),2),"")` : null;
      case 'cut': { const c2 = cutsOf(f), L = labsOf(f); if (!A || L.length !== c2.length + 1) return null; let e = `"${L[L.length - 1]}"`; for (let i = c2.length - 1; i >= 0; i--) e = `IF(${A}<${c2[i]},"${L[i]}",${e})`; return `IF(${N(A)},${e},"")`; }
      case 'any': return n ? `IF(COUNTA(${refs})=0,"",IF(OR(${list.map(([id, r]) => `${r}=${lit(id, yesCat(vv(id)))}`).join(',')}),"Yes","No"))` : null;
      case 'eligible': return n ? `IF(COUNTA(${refs})<${n},"",IF(AND(${list.map(([id, r]) => `${r}${(vv(id) || {}).elig === 'exc' ? '<>' : '='}${lit(id, yesCat(vv(id)))}`).join(',')}),"Yes","No"))` : null;
      case 'wsum': { if (!n) return null; const w = f.weights || {}; return `IF(COUNTA(${refs})<${n},"",${list.map(([id, r]) => { const x = vv(id), wt = isFinite(+w[id]) && w[id] !== '' ? +w[id] : 1; return x && (x.type === 'yn' || x.type === 'cat') ? `(${r}=${lit(id, yesCat(x))})*${wt}` : `N(${r})*${wt}`; }).join('+')})`; }
      case 'pctsum': { if (!n) return null; const mx = +(vv(list[0][0]) || {}).max || 1; return `IF(COUNT(${refs})=0,"",ROUND(SUM(${refs})/(COUNT(${refs})*${mx})*100,1))`; }
      case 'rpct': { if (!n) return null; const mx = +(vv(list[0][0]) || {}).max || 1; return `IF(COUNT(${refs})=0,"",ROUND(100-AVERAGE(${refs})/${mx}*100,1))`; }
      case 'sum': case 'mean': { if (!n) return null; const rv = f.rev || [], terms = list.map(([id, r]) => { const x = vv(id); return rv.includes(id) && x ? `(${+x.min + +x.max}-${r})` : r; });
        return `IF(COUNT(${refs})=${n},${f.kind === 'sum' ? `${terms.join('+')}` : `ROUND((${terms.join('+')})/${n},2)`},"")`; }
    }
    return null;
  }
  // the same in JavaScript, for the simulated data (val(id) = the value of that variable at the same visit)
  function calcValue(D, v, f, val) {
    const vv = id => D.vars.find(x => x.id === id), lit = (id, cat) => { const x = vv(id); return D.conv.catAs === 'codes' && x ? x.cats.indexOf(cat) + 1 : cat; }, num = x => typeof x === 'number' && isFinite(x) ? x : NaN, r1 = (x, d) => +x.toFixed(d);
    const a = f.a ? val(f.a) : null, b = f.b ? val(f.b) : null, c = f.c ? val(f.c) : null, A = num(a), B2 = num(b), list = f.list || [], xs = list.map(id => val(id));
    switch (f.kind) {
      case 'map': return isFinite(A) && isFinite(B2) ? Math.round((A + 2 * B2) / 3) : null;
      case 'bsa': return isFinite(A) && isFinite(B2) ? r1(Math.sqrt(A * B2 / 3600), 2) : null;
      case 'qtc': return isFinite(A) && B2 > 0 ? Math.round(A / Math.sqrt(60 / B2)) : null;
      case 'ibw': return isFinite(A) && c != null ? r1((c === lit(f.c, femCat(vv(f.c))) ? 45.5 : 50) + 2.3 * (A / 2.54 - 60), 1) : null;
      case 'egfr': { if (!(A > 0) || !isFinite(B2) || c == null) return null; const F = c === lit(f.c, femCat(vv(f.c))), k = F ? 0.7 : 0.9; return Math.round(142 * Math.min(A / k, 1) ** (F ? -0.241 : -0.302) * Math.max(A / k, 1) ** -1.2 * 0.9938 ** B2 * (F ? 1.012 : 1)); }
      case 'uconv': return isFinite(A) ? r1(b === lit(f.b, f.from) ? A * (+f.factor || 1) : A, 2) : null;
      case 'cut': { const c2 = cutsOf(f), L = labsOf(f); if (!isFinite(A) || L.length !== c2.length + 1) return null; const i = c2.findIndex(x => A < x); return L[i < 0 ? L.length - 1 : i]; }
      case 'any': return xs.every(x => x == null) ? null : list.some((id, i) => xs[i] === lit(id, yesCat(vv(id)))) ? 'Yes' : 'No';
      case 'eligible': return xs.some(x => x == null) ? null : list.every((id, i) => ((vv(id) || {}).elig === 'exc') !== (xs[i] === lit(id, yesCat(vv(id))))) ? 'Yes' : 'No';
      case 'wsum': { if (xs.some(x => x == null)) return null; const w = f.weights || {}; return r1(list.reduce((t, id, i) => { const x = vv(id), wt = isFinite(+w[id]) && w[id] !== '' ? +w[id] : 1; return t + (x && (x.type === 'yn' || x.type === 'cat') ? (xs[i] === lit(id, yesCat(x)) ? wt : 0) : (num(xs[i]) || 0) * wt); }, 0), 2); }
      case 'pctsum': { const ns = xs.map(num).filter(isFinite), mx = +(vv(list[0]) || {}).max || 1; return ns.length ? r1(ns.reduce((t, x) => t + x, 0) / (ns.length * mx) * 100, 1) : null; }
      case 'rpct': { const ns = xs.map(num).filter(isFinite), mx = +(vv(list[0]) || {}).max || 1; return ns.length ? r1(100 - ns.reduce((t, x) => t + x, 0) / ns.length / mx * 100, 1) : null; }
      case 'sum': case 'mean': { const ns = xs.map(num); if (!ns.length || ns.some(x => !isFinite(x))) return null; const rv = f.rev || [], t = list.reduce((s0, id, i) => { const x = vv(id); return s0 + (rv.includes(id) && x ? +x.min + +x.max - ns[i] : ns[i]); }, 0); return f.kind === 'sum' ? r1(t, 2) : r1(t / ns.length, 2); }
    }
    return undefined;
  }

  /* ---------- names and columns ---------- */
  const unitTag = u => String(u || '').replace(/×10⁹\/L/g, 'x10e9_L').replace(/²/g, '2').replace(/%/g, 'percent').replace(/°C/g, 'C').replace(/µ/g, 'u').replace(/\//g, '_').replace(/[^A-Za-z0-9_]+/g, '').replace(/^_+|_+$/g, '');
  const tagOf = s => String(s).trim().replace(/[^A-Za-z0-9]+/g, '') || 'V';
  // short column names of long labels (SPSS keeps 64 characters, many programs 32)
  const ABBR = { 'Mean arterial pressure': 'MAP', 'Total morphine consumption (24 h)': 'Morphine 24h', 'Time to first rescue analgesia': 'Time to rescue', 'Number of rescue analgesic doses': 'Rescue doses', 'Oswestry disability index': 'ODI',
    'Apgar score at 1 minute': 'Apgar 1min', 'Apgar score at 5 minutes': 'Apgar 5min', 'Quality of recovery (QoR-15)': 'QoR15', 'Duration of sensory block': 'Sensory block duration', 'Duration of motor block': 'Motor block duration',
    'Onset of sensory block': 'Sensory block onset', 'Onset of motor block': 'Motor block onset', 'Intraoperative fentanyl': 'Intraop fentanyl', 'Duration of anaesthesia': 'Anaesthesia duration', 'Number of intubation attempts': 'Intubation attempts',
    'Postoperative sore throat': 'Sore throat', 'Block-related complications': 'Block complications', 'Charlson comorbidity index': 'Charlson index', 'Intraoperative complications': 'Intraop complications', 'Days on the ventilator': 'Ventilator days',
    'Renal replacement therapy': 'RRT', 'Ischaemic heart disease': 'IHD', 'Chronic kidney disease': 'CKD', 'Chronic liver disease': 'CLD', 'Glasgow coma scale': 'GCS', 'Reason for withdrawal': 'Withdrawal reason' };
  function baseName(D, v) {
    if (v.name && v.name.trim()) return v.name.trim();
    const words = String(ABBR[v.label] || v.label).replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean), u = ABBR[v.label] && /%|percent/.test(v.unit) ? '' : unitTag(v.unit);
    if (D.conv.naming === 'camel') return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + (u ? u.charAt(0).toUpperCase() + u.slice(1).replace(/_/g, '') : '');
    const s = [...words, ...(u ? [u] : [])].join('_'); return D.conv.naming === 'lower' ? s.toLowerCase() : s;
  }
  // skip logic: a variable asked only when another one has a given category
  const whenParent = (D, v) => v.when && v.when.v ? D.vars.find(x => x.id === v.when.v) : null;
  const whenTxt = (D, v) => { const p = whenParent(D, v); return p ? `${p.label} = ${v.when.cat}` : ''; };
  const secOrder = D => [...new Set([...(D.sections || []), ...D.vars.map(v => v.section)])];
  const visitsOf = (D, v) => (v.visits || []).map(id => D.visits.find(x => x.id === id)).filter(Boolean);
  // every column of the wide sheet: [{ col, v, visit }]
  const isRepeating = (D, v) => (D.repeat || []).includes(v.section);
  function columns(D) {
    const out = [], order = secOrder(D);
    const vs = [...D.vars].filter(v => !isRepeating(D, v)).sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section));
    vs.forEach(v => { const vis = visitsOf(D, v), opts = v.type === 'multi' ? v.cats : [null], nm = o => o === null ? baseName(D, v) : `${baseName(D, v)}_${tagOf(o)}`;
      opts.forEach(o => { const opt = o === null ? undefined : o;
        if (D.layout === 'long' || vis.length <= 1) out.push({ col: nm(o) + (D.layout !== 'long' && vis.length === 1 && D.visits.length > 1 && vis[0].id !== D.visits[0].id ? '_' + tagOf(vis[0].name) : ''), v, visit: D.layout === 'long' ? null : vis[0] || null, opt });
        else vis.forEach(x => out.push({ col: `${nm(o)}_${tagOf(x.name)}`, v, visit: x, opt })); }); });
    return out;
  }
  function problems(D) {
    const out = [], cols = columns(D), seen = {};
    cols.forEach(c => { const k = c.col.toLowerCase(); if (seen[k]) out.push(`Two columns are named “${c.col}”`); seen[k] = 1;
      if (c.col.length > 32) out.push(`“${c.col}” is longer than 32 characters (SPSS)`); if (!/^[A-Za-z]/.test(c.col)) out.push(`“${c.col}” should start with a letter`); });
    D.vars.forEach(v => { if (v.type === 'num' && v.min === '' && v.max === '') out.push(`${v.label}: no allowed range (typing errors are not caught)`);
      if ((v.type === 'cat') && v.cats.length < 2) out.push(`${v.label}: fewer than two categories`); if (v.type === 'calc' && !(v.formula && (v.formula.a || (v.formula.list || []).length))) out.push(`${v.label}: the formula is not complete`);
      if (v.when && v.when.v) { const p = whenParent(D, v); if (!p) out.push(`${v.label}: asked only when a variable that was removed — change it in step 3`); else if (!p.cats.includes(v.when.cat)) out.push(`${v.label}: asked only when ${p.label} = ${v.when.cat}, a category that no longer exists`); } });
    D.vars.forEach(v => { const e = v.expect || {}; if (v.type !== 'num') return; const lo = e.lo === '' || e.lo === undefined ? null : +e.lo, hi = e.hi === '' || e.hi === undefined ? null : +e.hi;
      if (lo !== null && hi !== null && lo >= hi) out.push(`${v.label}: the simulated Min is not below the Max`); else if (isFinite(+e.mean) && e.mean !== '' && ((lo !== null && +e.mean < lo) || (hi !== null && +e.mean > hi))) out.push(`${v.label}: the expected mean is outside the simulated Min–Max`); });
    // the design as a whole
    const labs = {}; D.vars.forEach(v => { const k = v.label.trim().toLowerCase(); if (labs[k]) out.push(`Two variables are labelled “${v.label}”`); labs[k] = 1; });
    if (D.design === 'rct' && D.arms.filter(Boolean).length < 2) out.push('A randomised trial needs at least two groups (step 2)');
    if (D.vars.length && !D.vars.some(v => v.role === 'primary')) out.push('No primary outcome is marked (Role, in step 3) — the sample size and the analysis plan use it');
    if (D.visits.length > 1) D.visits.forEach((x, i) => { if (!D.vars.some(v => (v.visits || []).includes(x.id) || (i === 0 && !(v.visits || []).length))) out.push(`Visit “${x.name}” has no variable`); });
    if ((D.sites || []).some(x => !String(x.name || '').trim())) out.push('A site has no name (step 2)');
    if ((D.sites || []).length && new Set(D.sites.map(x => x.prefix)).size < D.sites.length) out.push('Two sites have the same ID prefix (step 2)');
    if (D.minim && D.minim.on && !(D.minim.factors || []).length) out.push('Minimisation is on without factors (step 2)');
    if (D.visits.some((x, i) => i && x.day !== undefined && x.day !== '') && !D.anchor) out.push('Visit days are set without an anchor date (step 2)');
    const ss = ssCalc(D); if (ss && !ss.err && +D.n < ss.enrol) out.push(`The planned number of patients (${D.n}) is below the sample size (${ss.enrol} to enrol) — step 1`);
    return out;
  }

  /* ---------- sample size: two groups (means or proportions) or one group before and after (paired means) ---------- */
  const ssDef = D => (D.ss = { v: '', alpha: 0.05, power: 0.8, drop: 10, ratio: 1, a: '', b: '', sd: '', ...(D.ss || {}) });
  const ssOutcomes = D => D.vars.filter(v => v.type === 'num' || v.type === 'calc' || ((v.type === 'yn' || v.type === 'cat') && v.cats.length === 2));
  // one-way ANOVA: power from the noncentral F distribution (Poisson mixture of incomplete beta functions)
  function powF(lam, d1, d2, alpha) { const crit = jStat.centralF.inv(1 - alpha, d1, d2), x = d1 * crit / (d1 * crit + d2); let p = 0, w = Math.exp(-lam / 2);
    for (let j = 0; j < 5000; j++) { if (j) w *= (lam / 2) / j; p += w * (1 - jStat.ibeta(x, d1 / 2 + j, d2 / 2)); if (j > lam / 2 && w < 1e-14) break; } return p; }
  function nAnova(means, sd, alpha, power) { const k = means.length, m = means.reduce((a, b) => a + b, 0) / k, f = Math.sqrt(means.reduce((a, b) => a + (b - m) ** 2, 0) / k) / sd; if (!(f > 0)) return null;
    for (let n = 2; n < 1e5; n++) if (powF(f * f * n * k, k - 1, n * k - k, alpha) >= power) return { n, f }; return null; }
  const SS_METHODS = [['auto', 'Two groups or before / after (from the design)'], ['anova', 'Three or more groups (ANOVA)'], ['noninf', 'Non-inferiority (two groups)'], ['survival', 'Survival: log-rank (hazard ratio)'], ['corr', 'Correlation'], ['oneprop', 'One proportion with a margin (precision)'], ['mcnemar', 'Yes / no before and after (McNemar)']];
  function ssOther(D, s) {
    const St = Stats, alpha = +s.alpha || 0.05, power = +s.power || 0.8, drop = Math.min(90, Math.max(0, +s.drop || 0)), up = n => Math.ceil(n / (1 - drop / 100)), arms = D.arms.filter(Boolean), zq = p => jStat.normal.inv(p, 0, 1), r2 = x => +(+x).toFixed(3);
    const fin = (r, text) => { r.enrol = r.enrol || up(r.total); r.text = `${text} with ${Math.round(power * 100)}% power at a${s.m === 'noninf' ? ' one-sided' : ' two-sided'} significance level of ${alpha}.${drop ? ` Allowing for ${drop}% dropout, ${r.enrol} ${s.m === 'corr' || s.m === 'oneprop' || s.m === 'mcnemar' ? 'participants' : 'patients'} will be enrolled.` : ''}`; return Object.assign(r, { alpha, power, drop, arms, method: s.m }); };
    if (s.m === 'anova') { const ms = String(s.means || '').split(/[,;\s]+/).map(Number).filter(isFinite), sd = +s.sd; if (ms.length < 3 || !(sd > 0)) return { err: 'Type the expected mean of each group (three or more, e.g. 5, 6, 7) and the SD.' };
      const x = nAnova(ms, sd, alpha, power); if (!x) return { err: 'The means must differ.' }; const k = ms.length;
      return fin({ n1: x.n, n2: x.n, total: x.n * k, enrol: k * up(x.n), per: true, k }, `A sample size of ${x.n} patients per group (${x.n * k} in total, ${k} groups) is needed to detect means of ${ms.join(', ')} (SD ${sd}; Cohen's f = ${r2(x.f)}) by one-way ANOVA`); }
    if (s.m === 'noninf') { const za = zq(1 - alpha), zb = zq(power), M = +s.margin, d0 = +s.d0 || 0;
      if (!(M > 0)) return { err: 'Type the non-inferiority margin (in the outcome\'s units, or percentage points).' };
      if (s.nik === 'p') { const p = (+s.p || 50) / 100, n = Math.ceil((za + zb) ** 2 * 2 * p * (1 - p) / ((M - d0) / 100) ** 2); return fin({ n1: n, n2: n, total: 2 * n, enrol: 2 * up(n), per: true }, `A sample size of ${n} patients per group (${2 * n} in total) is needed to show non-inferiority with a margin of ${M} percentage points (expected success ${s.p || 50}% in both groups)`); }
      const sd = +s.sd; if (!(sd > 0) || !(M > Math.abs(d0))) return { err: 'The SD must be above 0 and the margin larger than the expected difference.' };
      const n = Math.ceil(2 * sd * sd * (za + zb) ** 2 / (M - Math.abs(d0)) ** 2); return fin({ n1: n, n2: n, total: 2 * n, enrol: 2 * up(n), per: true }, `A sample size of ${n} patients per group (${2 * n} in total) is needed to show non-inferiority with a margin of ${M} (SD ${sd}, true difference ${d0})`); }
    if (s.m === 'survival') { const hr = +s.hr, pe = (+s.pev || 0) / 100; if (!(hr > 0 && hr !== 1) || !(pe > 0 && pe <= 1)) return { err: 'Type the hazard ratio (e.g. 0.7) and the % of patients with the event during follow-up.' };
      const x = St.nSurvival(hr, pe, alpha, power, +s.ratio || 1); return fin({ n1: Math.ceil(x.n / 2), n2: Math.ceil(x.n / 2), total: x.n, events: x.events }, `${x.events} events (${x.n} patients, ${s.pev}% with the event) are needed to detect a hazard ratio of ${hr} by the log-rank test`); }
    if (s.m === 'corr') { const r = +s.r; if (!(Math.abs(r) > 0 && Math.abs(r) < 1)) return { err: 'Type the expected correlation (e.g. 0.3).' }; const n = St.nCorrelation(Math.abs(r), alpha, power); return fin({ total: n, n1: n, n2: 0, one: true }, `A sample size of ${n} participants is needed to detect a correlation of ${r}`); }
    if (s.m === 'oneprop') { const p = (+s.p || 50) / 100, M = (+s.margin || 5) / 100, n = St.nOneProp(p, M, alpha); return Object.assign({ total: n, n1: n, n2: 0, one: true, enrol: up(n), alpha, power, drop, arms, method: s.m },
      { text: `A sample size of ${n} participants estimates an expected proportion of ${s.p || 50}% within ±${s.margin || 5} percentage points (${Math.round((1 - alpha) * 100)}% confidence interval).${drop ? ` Allowing for ${drop}% non-response, ${up(n)} will be approached.` : ''}` }); }
    if (s.m === 'mcnemar') { const a = (+s.a || 0) / 100, b = (+s.b || 0) / 100, del = Math.abs(b - a), pd = s.pd !== '' && s.pd !== undefined ? (+s.pd) / 100 : a * (1 - b) + b * (1 - a);
      if (!(del > 0) || pd < del) return { err: 'Type the % yes before and after (different), and the % of discordant pairs (at least the difference).' };
      const n = Math.ceil((zq(1 - alpha / 2) * Math.sqrt(pd) + zq(power) * Math.sqrt(pd - del * del)) ** 2 / (del * del)); return fin({ total: n, n1: n, n2: 0, one: true }, `A sample size of ${n} patients is needed to detect a change from ${s.a}% to ${s.b}% yes (discordant pairs ${r2(pd * 100)}%) by McNemar's test`); }
    return null;
  }
  function ssCalc(D) {
    const s = ssDef(D); if (s.m && s.m !== 'auto') { if (typeof Stats === 'undefined') return null; const r = ssOther(D, s); return r ? { ...r, v: null } : null; }
    const s0 = s, St = typeof Stats !== 'undefined' ? Stats : null, arms = D.arms.filter(Boolean), k = arms.length;
    void s0; const v = D.vars.find(x => x.id === s.v) || ssOutcomes(D).find(x => x.role === 'primary'); if (!v || !St) return null;
    const e = v.expect && Object.keys(v.expect).length ? v.expect : expectOf(v.label, v.type, v.cats), alpha = +s.alpha || 0.05, power = +s.power || 0.8, drop = Math.min(90, Math.max(0, +s.drop || 0)), ratio = +s.ratio > 0 ? +s.ratio : 1;
    const paired = k < 2 && D.visits.length > 1, num = v.type === 'num' || v.type === 'calc', lab = v.label + (v.unit ? ` (${v.unit})` : ''), r0 = x => +(+x).toFixed(2);
    if (k < 2 && !paired) return { v, err: 'The sample size here compares two groups, or one group before and after (two visits or more).' };
    if (k > 2) return { v, err: 'More than two groups: use the sample-size calculators of Analyse (step 10, ANOVA).' };
    let r;
    if (num) { const m = isFinite(+e.mean) ? +e.mean : 0, sd = s.sd !== '' ? +s.sd : +e.sd || 1, a = s.a !== '' ? +s.a : r0(m), b = s.b !== '' ? +s.b : r0(m - 0.5 * sd), diff = Math.abs(a - b);
      if (!(diff > 0) || !(sd > 0)) return { v, err: 'The two means must differ, and the SD be above 0.' };
      if (paired) { const n = St.nPairedMean(diff, sd, alpha, power); r = { n1: n, n2: 0, total: n, test: 'paired t-test', what: `a mean change of ${r0(diff)} in ${lab} (from ${a} to ${b}; SD of the change ${sd})` }; }
      else { const x = St.nTwoMeans(diff, sd, alpha, power, ratio); r = { n1: x.n1, n2: x.n2, total: x.n1 + x.n2, test: "two-sample Student's t-test", what: `a difference of ${r0(diff)} in the mean ${lab} (${a} in ${arms[0]} vs ${b} in ${arms[1]}; SD ${sd})` }; }
      Object.assign(r, { a, b, sd }); }
    else { if (paired) return { v, err: 'A yes/no outcome before and after: use the calculators of Analyse (step 10, McNemar).' };
      const p0 = isFinite(+(e.pct || [])[0]) ? +(e.pct || [])[0] : 50, a = s.a !== '' ? +s.a : r0(p0), b = s.b !== '' ? +s.b : r0(Math.max(1, Math.min(99, p0 + (p0 >= 50 ? -20 : 20))));
      if (!(a > 0 && a < 100 && b > 0 && b < 100) || a === b) return { v, err: 'Two different percentages between 0 and 100 are needed.' };
      const x = St.nTwoProps(a / 100, b / 100, alpha, power, ratio); r = { n1: x.n1, n2: x.n2, total: x.n1 + x.n2, test: 'Chi-square test', what: `${a}% vs ${b}% ${v.cats[0]} for ${v.label} (${arms[0]} vs ${arms[1]})`, a, b }; }
    const up = n => Math.ceil(n / (1 - drop / 100));
    r.enrol = paired ? up(r.total) : up(r.n1) + up(r.n2);
    Object.assign(r, { v, paired, num, alpha, power, drop, ratio, arms });
    const per = paired ? `${r.total} patients` : r.n1 === r.n2 ? `${r.n1} patients per group (${r.total} in total)` : `${r.n1} patients in ${arms[0]} and ${r.n2} in ${arms[1]} (${r.total} in total)`;
    r.text = `A sample size of ${per} is needed to detect ${r.what} with ${Math.round(power * 100)}% power at a two-sided significance level of ${alpha} (${r.test}).${drop ? ` Allowing for ${drop}% dropout, ${r.enrol} patients will be enrolled.` : ''}`;
    return r;
  }

  /* ---------- a design from an existing sheet: the columns, their types, categories, ranges, visits (from suffixes), groups and expected values ---------- */
  const VIS_RE = /^(.*?)[\s_.\-]+(baseline|pre[\s_-]?op(?:erative)?|post[\s_-]?op(?:erative)?|pre|post|before|after|admission|discharge|follow[\s_-]?up|(?:day|d|week|wk|w|month|mo|m|year|yr|y|visit|v|t|time)[\s_-]?\d+)$/i;
  const visPretty = t => { const m = /^(day|d|week|wk|w|month|mo|m|year|yr|y|visit|v|t|time)[\s_-]?(\d+)$/i.exec(t); if (!m) return t.replace(/[_-]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase()).replace(/^Pre ?Op(erative)?$/i, 'Pre-operative').replace(/^Post ?Op(erative)?$/i, 'Post-operative');
    const u = m[1].toLowerCase(), w = { d: 'Day', day: 'Day', w: 'Week', wk: 'Week', week: 'Week', m: 'Month', mo: 'Month', month: 'Month', y: 'Year', yr: 'Year', year: 'Year', v: 'Visit', visit: 'Visit', t: 'T', time: 'Time' }[u]; return u === 't' ? `T${m[2]}` : `${w} ${m[2]}`; };
  const UNITS = new Set(LIB.flatMap(([, l]) => l.map(e => e[2]).filter(Boolean)).concat(['years', 'yrs', 'kg', 'cm', 'mm', 'm', 'g', 'mg', 'ml', 'mL', 'L', 'min', 'hours', 'h', 'days', 'weeks', 'months', 'mmHg', 'bpm', 'percent', 'IU', 'U/L']).map(x => x.toLowerCase()));
  const UNIT2 = { 'kg m2': 'kg/m²', 'mg dl': 'mg/dL', 'g dl': 'g/dL', 'mmol l': 'mmol/L', 'umol l': 'µmol/L', 'u l': 'U/L', 'iu l': 'IU/L', 'ng ml': 'ng/mL', 'pg ml': 'pg/mL', 'mg l': 'mg/L', 'g l': 'g/L', 'meq l': 'mEq/L', 'x10e9 l': '×10⁹/L', 'ml min': 'mL/min', 'cm h2o': 'cmH₂O' };
  function designFromSheet(aoa, title) {
    const blankCell = x => x === null || x === undefined || String(x).trim() === '', filled = r => (r || []).filter(x => !blankCell(x)).length;
    const wmax = Math.max(1, ...aoa.slice(0, 30).map(filled)), hr = Math.max(0, aoa.slice(0, 20).findIndex(r => filled(r) >= Math.max(2, 0.6 * wmax)));
    const heads = (aoa[hr] || []).map((h, i) => blankCell(h) ? `Column_${i + 1}` : String(h).trim()), body = aoa.slice(hr + 1).filter(r => filled(r));
    const vals = i => body.map(r => r[i]).filter(x => !blankCell(x)), Dn = blank(); Dn.title = title; Dn.vars = []; Dn.arms = []; Dn.visits = []; Dn.n = body.length || 60; Dn.rand.on = false;
    const norm0 = h => h.replace(/[\s_]+/g, ' ').trim();
    let idI = heads.findIndex(h => /^(id|patient id|pt id|patient no\.?|code|serial|serial no\.?|no\.?|number|record id|s\.? ?n\.?|case(?: no\.?)?)$/i.test(norm0(h)));
    if (idI < 0 && vals(0).length && new Set(vals(0).map(String)).size === vals(0).length && vals(0).some(x => typeof x === 'string' || Number.isInteger(x))) idI = 0;
    if (idI >= 0) { const m = /^([A-Za-z\-_]*)(\d+)$/.exec(String(vals(idI)[0] || '')); if (m) { Dn.idPrefix = m[1]; Dn.idDigits = m[2].length; } }
    const grpI = heads.findIndex((h, i) => i !== idI && /^(study )?(group|arm|treatment|allocation|randomi[sz]ation)s?$/i.test(norm0(h)) && (n => n >= 2 && n <= 8)(new Set(vals(i).map(x => String(x).trim())).size));
    if (grpI >= 0) Dn.arms = [...new Set(vals(grpI).map(x => String(x).trim()))];
    // visits: a stem found with two suffixes or more (Pain_Baseline, Pain_M3) — a single "_m2" is a unit, not a visit
    const parts = heads.map((h, i) => { if (i === idI || i === grpI) return null; const m = VIS_RE.exec(h); return m ? { stem: m[1].trim(), tag: m[2] } : null; });
    const stems = {}; parts.forEach((p, i) => { if (p) (stems[p.stem.toLowerCase()] = stems[p.stem.toLowerCase()] || []).push(i); });
    const repStem = st => (stems[st.toLowerCase()] || []).length >= 2;
    parts.forEach(p => { if (p && repStem(p.stem)) { const nm = visPretty(p.tag); if (!Dn.visits.some(x => x.name.toLowerCase() === nm.toLowerCase())) Dn.visits.push({ id: uid(), name: nm }); } });
    if (!Dn.visits.length) Dn.visits = [{ id: 'v0', name: 'Baseline' }];
    const visitOf = tag => Dn.visits.find(x => x.name.toLowerCase() === visPretty(tag).toLowerCase());
    const YESNO = /^(yes|no|y|n|present|absent|true|false)$/i, done = new Set();
    heads.forEach((h, i) => { if (i === idI || i === grpI || done.has(i)) return;
      const p = parts[i], rep = p && repStem(p.stem), cols = rep ? stems[p.stem.toLowerCase()] : [i]; cols.forEach(c => done.add(c));
      const xs = cols.flatMap(vals); let label = rep ? p.stem : h, unit = '';
      const mu = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(label); if (mu) { label = mu[1]; unit = mu[2]; }
      else { const w = label.split(/[_\s]+/), two = w.length > 2 ? UNIT2[w.slice(-2).join(' ').toLowerCase()] : null;
        if (two) { unit = two; w.splice(-2); label = w.join(' '); } else if (w.length > 1 && UNITS.has(w[w.length - 1].toLowerCase())) { unit = w.pop(); label = w.join(' '); unit = { percent: '%', yrs: 'years', ml: 'mL' }[unit.toLowerCase()] || unit; } }
      label = label.replace(/_+/g, ' ').replace(/\s+/g, ' ').trim() || h;
      const lib = findLib(label), nums = xs.map(x => typeof x === 'number' ? x : /^\s*-?\d+([.,]\d+)?\s*$/.test(String(x)) ? +String(x).replace(',', '.') : NaN), nOk = nums.filter(isFinite);
      const strs = [...new Set(xs.map(x => String(x).trim()))], isDate = xs.some(x => x instanceof Date) || (/\bdate\b|\bdob\b/i.test(label) && xs.every(x => x instanceof Date || typeof x === 'number' || /\d{1,4}[\/.-]\d{1,2}[\/.-]\d{1,4}/.test(String(x))));
      let v;
      if (isDate) v = { type: 'date' };
      else if (xs.length && nOk.length >= 0.9 * xs.length && !(strs.length <= 2 && strs.every(x => x === '0' || x === '1'))) {
        const lo = Math.min(...nOk), hi = Math.max(...nOk), dec = Math.min(3, Math.max(0, ...nOk.map(x => (String(x).split('.')[1] || '').length))), m = nOk.reduce((a, b) => a + b, 0) / nOk.length, sd = Math.sqrt(nOk.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, nOk.length - 1));
        const sk = sd > 0 ? nOk.reduce((a, b) => a + ((b - m) / sd) ** 3, 0) / nOk.length : 0;
        v = { type: 'num', dec: String(dec), min: lib && lib.min !== '' ? Math.min(+lib.min, lo) : Math.floor(lo), max: lib && lib.max !== '' ? Math.max(+lib.max, hi) : Math.ceil(hi), expect: { mean: +m.toFixed(2), sd: +sd.toFixed(2), dist: sk > 1 && lo >= 0 ? 'skewed' : 'normal', lo, hi } }; }
      else if (xs.length && (strs.length <= 2 && strs.every(x => x === '0' || x === '1') || strs.every(x => YESNO.test(x)) && strs.length <= 4)) {
        const yes = xs.filter(x => /^(1|yes|y|present|true)$/i.test(String(x).trim())).length; v = { type: 'yn', cats: [...YN], expect: { pct: [+(100 * yes / xs.length).toFixed(1), +(100 - 100 * yes / xs.length).toFixed(1)] } }; }
      else if (xs.length && strs.length <= 12 && strs.length <= Math.max(2, 0.5 * xs.length)) {
        const known = lib && lib.cats.length && strs.every(x => lib.cats.some(c => c.toLowerCase() === x.toLowerCase())) ? lib.cats : strs, cnt = c => xs.filter(x => String(x).trim().toLowerCase() === c.toLowerCase()).length;
        v = { type: 'cat', cats: [...known], expect: { pct: known.map(c => +(100 * cnt(c) / xs.length).toFixed(1)) } }; }
      else v = { type: xs.length ? 'text' : 'num' };
      const base = lib && lib.type === v.type ? lib : { section: 'Study data', unit: '', definition: '' };
      Dn.vars.push({ id: uid(), section: base.section, label, type: v.type, unit: unit || base.unit || '', min: v.min ?? '', max: v.max ?? '', cats: v.cats || [], dec: v.dec ?? '', required: false,
        visits: rep ? cols.map(c => (visitOf(parts[c].tag) || {}).id).filter(Boolean) : [], group: '', role: '', definition: '', name: rep ? '' : h, expect: v.expect || expectOf(label, v.type, v.cats || []) }); });
    // names: a single column keeps its own; a repeated one gets its stem with the visit suffixes
    Dn.vars.forEach(v => { if (v.visits.length === 1 && v.visits[0] === Dn.visits[0].id) v.visits = []; });
    Dn.sections = [...new Set(Dn.vars.map(v => v.section))];
    return { D: Dn, n: body.length, cols: heads.length, id: idI >= 0 ? heads[idI] : '', group: grpI >= 0 ? heads[grpI] : '' };
  }

  /* ---------- a design from a REDCap data dictionary or an XLSForm (KoBoToolbox / ODK) ---------- */
  function designFromDict(wb, title) {
    const Dn = blank(); Dn.title = title; Dn.vars = []; Dn.arms = []; Dn.rand.on = false; let skipped = 0; const byName = {}, rel = [];
    const sheetRows = n => XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: '', raw: false });
    const add = (name, label, type, extra, section) => { const v = { id: uid(), section: section || 'Data', label: String(label || name).replace(/<[^>]+>/g, '').trim() || name, name, type, unit: '', min: '', max: '', cats: [], dec: '', required: false, visits: [], group: '', role: '', definition: '', ...extra }; v.expect = expectOf(v.label, v.type, v.cats); Dn.vars.push(v); byName[name] = v; return v; };
    if (wb.SheetNames.includes('survey')) { // XLSForm
      const choices = {}; (wb.SheetNames.includes('choices') ? sheetRows('choices') : []).forEach(r => { const l = r.list_name || r['list name']; if (!l) return; (choices[l] = choices[l] || []).push({ name: String(r.name), label: String(r.label || r['label::English (en)'] || r.name) }); });
      let sec = 'Data'; sheetRows('survey').forEach(r => { const ty = String(r.type || '').trim(), nm = String(r.name || '').trim(), lb = r.label || r['label::English (en)'] || nm, req = /^(yes|true|1)$/i.test(String(r.required || ''));
        if (/^begin[_ ]group/.test(ty)) { sec = String(lb || nm) || sec; return; } if (/^end[_ ]group/.test(ty)) return; if (!nm || ['start', 'end', 'today', 'deviceid', 'note', 'calculate', 'begin repeat', 'end repeat'].includes(ty.split(' ')[0])) { if (nm) skipped++; return; }
        const c = String(r.constraint || ''), lo = /\.\s*>=?\s*(-?[\d.]+)/.exec(c), hi = /\.\s*<=?\s*(-?[\d.]+)/.exec(c), base = { required: req };
        let v = null; const [t0, list] = ty.split(/\s+/);
        if (t0 === 'integer' || t0 === 'decimal') v = add(nm, lb, 'num', { ...base, min: lo ? +lo[1] : '', max: hi ? +hi[1] : '', dec: t0 === 'integer' ? '0' : '' }, sec);
        else if (t0 === 'select_one' || t0 === 'select_multiple') { const cs = (choices[list] || []); const yes = cs.length === 2 && cs.some(x => /^(yes|1)$/i.test(x.name) || /^yes$/i.test(x.label)); v = add(nm, lb, t0 === 'select_multiple' ? 'multi' : yes ? 'yn' : 'cat', { ...base, cats: yes ? [...YN] : cs.map(x => x.label), __codes: cs.map(x => x.name) }, sec); }
        else if (t0 === 'date' || t0 === 'datetime') v = add(nm, lb, 'date', base, sec); else if (t0 === 'time') v = add(nm, lb, 'time', base, sec); else if (t0 === 'text') v = add(nm, lb, 'text', base, sec); else { skipped++; return; }
        if (r.relevant) rel.push([v, String(r.relevant)]); });
      rel.forEach(([v, x]) => { const m = /\$\{([^}]+)\}\s*=\s*'([^']*)'/.exec(x), p0 = m && byName[m[1]]; if (!p0) return; const i = (p0.__codes || []).indexOf(m[2]); v.when = { v: p0.id, cat: i >= 0 ? p0.cats[i] : p0.cats.find(c => c.toLowerCase() === m[2].toLowerCase()) || p0.cats[0] }; });
      Dn.vars.forEach(v => { delete v.__codes; }); Dn.sections = [...new Set(Dn.vars.map(v => v.section))]; return { D: Dn, kind: 'XLSForm', skipped };
    }
    // REDCap data dictionary (CSV)
    const rows = sheetRows(wb.SheetNames[0]), col = (r, re) => { const k = Object.keys(r).find(x => re.test(x)); return k ? String(r[k] ?? '').trim() : ''; }; let sec = '';
    rows.forEach((r, i) => { const nm = col(r, /^variable|field name/i), ty = col(r, /^field type/i).toLowerCase(), lb = col(r, /^field label/i), sh = col(r, /^section header/i), form = col(r, /^form name/i), ch = col(r, /^choices/i), val = col(r, /^text validation type/i), mn = col(r, /validation min/i), mx = col(r, /validation max/i), req = /^y/i.test(col(r, /^required/i)), br = col(r, /^branching/i);
      if (sh) sec = sh.replace(/<[^>]+>/g, '').trim(); const section = sec || (form || 'Data').replace(/_/g, ' ').replace(/^./, c => c.toUpperCase()); if (!nm || (i === 0 && /record_id|^id$/i.test(nm))) return;
      const opts = ch.split('|').map(x => x.trim()).filter(Boolean).map(x => { const m = /^([^,]+),\s*(.*)$/.exec(x); return m ? { code: m[1].trim(), label: m[2].trim() } : { code: x, label: x }; });
      let v = null, base = { required: req };
      if (ty === 'yesno' || ty === 'truefalse') v = add(nm, lb, 'yn', base, section);
      else if (ty === 'radio' || ty === 'dropdown') v = add(nm, lb, 'cat', { ...base, cats: opts.map(o => o.label), __codes: opts.map(o => o.code) }, section);
      else if (ty === 'checkbox') v = add(nm, lb, 'multi', { ...base, cats: opts.map(o => o.label), __codes: opts.map(o => o.code) }, section);
      else if (ty === 'text' && /^date/.test(val)) v = add(nm, lb, 'date', base, section);
      else if (ty === 'text' && /^time/.test(val)) v = add(nm, lb, 'time', base, section);
      else if (ty === 'text' && /integer|number/.test(val)) v = add(nm, lb, 'num', { ...base, min: mn === '' ? '' : +mn, max: mx === '' ? '' : +mx, dec: val === 'integer' ? '0' : '' }, section);
      else if (ty === 'text' || ty === 'notes') v = add(nm, lb, 'text', base, section); else { skipped++; return; }
      if (br) rel.push([v, br]); });
    rel.forEach(([v, x]) => { const m = /\[([^\]()]+)\]\s*=\s*['"]?([^'"\s]+)['"]?/.exec(x), p0 = m && byName[m[1]]; if (!p0) return; const i = (p0.__codes || []).indexOf(m[2]); v.when = { v: p0.id, cat: p0.type === 'yn' ? (m[2] === '1' ? 'Yes' : 'No') : i >= 0 ? p0.cats[i] : p0.cats[0] }; });
    Dn.vars.forEach(v => { delete v.__codes; }); Dn.sections = [...new Set(Dn.vars.map(v => v.section))]; return { D: Dn, kind: 'REDCap data dictionary', skipped };
  }

  /* ---------- quick entry: a pasted list of variables ---------- */
  function fromLine(D, line, sec) {
    let s = String(line).replace(/^\s*[-•*\d.)]+\s+/, '').trim(); if (!s) return null; let vis = '', cats = null, unit = '';
    const m1 = /\s*@\s*(all|last|every visit)\s*$/i.exec(s); if (m1) { vis = /last/i.test(m1[1]) ? 'last' : 'all'; s = s.slice(0, m1.index).trim(); }
    const m2 = /^(.*?)\s*:\s*(.+)$/.exec(s); if (m2) { s = m2[1].trim(); cats = m2[2].split(/\s*[\/|,;]\s*/).map(x => x.trim()).filter(Boolean); }
    const m3 = /^(.*?)\s*\(([^)]+)\)\s*$/.exec(s); if (m3) { s = m3[1].trim(); unit = m3[2].trim(); }
    let v = findLib(s);
    if (v) { if (unit) v.unit = unit; if (cats && cats.length >= 2) { v.type = cats.length === 2 && cats.every(c => /^(yes|no)$/i.test(c)) ? 'yn' : 'cat'; v.cats = v.type === 'yn' ? [...YN] : cats; v.expect = expectOf(v.label, v.type, v.cats); } }
    else { const type = cats && cats.length >= 2 ? (cats.length === 2 && cats.every(c => /^(yes|no)$/i.test(c)) ? 'yn' : 'cat') : /\bdate\b|\bdob\b/i.test(s) ? 'date' : /^(type|cause|site|reason|comment|notes?|other|specify|details?)\b/i.test(s) ? 'text' : 'num';
      v = { id: uid(), section: sec, label: s, type, unit, min: '', max: '', cats: type === 'yn' ? [...YN] : type === 'cat' ? cats : [], dec: '', required: false, visits: [], group: '', role: '', definition: '' }; v.expect = expectOf(s, type, v.cats); }
    v.visits = vis === 'all' ? D.visits.map(x => x.id) : vis === 'last' && D.visits.length > 1 ? [D.visits[D.visits.length - 1].id] : [];
    return v;
  }
  function addScale(D, name, items, min, max, def) { return addSpec(D, name, { kind: 'scale', min, max, items, totals: [{ label: 'total', kind: 'sum', def: def || `${name}: sum of ${items.length} items (${min}–${max} each)` }] }); }
  function addSpec(D, name, S) {
    const all = D.visits.length > 1 && confirm(`Collect ${name} at every visit (${D.visits.map(x => x.name).join(', ')})?\nOK: every visit · Cancel: the first visit only`), vis = all ? D.visits.map(x => x.id) : [], tag = tagOf(name);
    const base = { section: name, unit: '', cats: [], required: false, visits: [...vis], role: '', definition: '', scale: name };
    const items = S.items.map((it, i) => { const [t, a1, a2] = Array.isArray(it) ? it : [it]; if (S.yn) return { ...base, id: uid(), label: t ? `${name}: ${t}` : `${name} item ${i + 1}`, name: `${tag}_${i + 1}`, type: 'yn', cats: [...YN], min: '', max: '', dec: '', group: name, w: a1 ?? 1, expect: { pct: [20, 80] } };
      const lo = a2 !== undefined ? a1 : S.min, hi = a2 !== undefined ? a2 : S.max; return { ...base, id: uid(), label: t ? `${name} ${i + 1}. ${t}` : `${name} item ${i + 1}`, name: `${tag}_${i + 1}`, type: 'num', min: lo, max: hi, dec: '0', group: '', expect: { mean: +(lo + (hi - lo) * 0.35).toFixed(2), sd: +((hi - lo) / 3.2).toFixed(2), dist: 'normal' } }; });
    items.forEach(v => { const w = v.w; delete v.w; v.__w = w; D.vars.push(v); });
    const tots = [];
    (S.totals || []).forEach((T, ti) => { const lab = `${name} ${T.label}`, nm = `${tag}_${T.short || tagOf(T.label).slice(0, 12)}`;
      if (T.kind === 'cut') { const src = tots[T.of ?? 0]; if (!src) return; const L = String(T.labs).split(/\s*,\s*/); tots.push(null); D.vars.push({ ...base, id: uid(), label: lab, name: nm, type: 'calc', min: '', max: '', dec: '', group: '', definition: src.definition, formula: { kind: 'cut', a: src.id, cuts: T.cuts, labs: T.labs }, expect: { pct: L.map(() => +(100 / L.length).toFixed(1)) } }); return; }
      const its = T.idx ? T.idx.map(k => items[k]) : items.filter((x, k) => !(Array.isArray(S.items[k]) && S.items[k].length === 3 && S.totals.some(t2 => t2.idx)) || !S.totals.some(t2 => t2.idx)), k = its.length;
      const im = its.reduce((t, x) => t + (x.type === 'yn' ? 0.2 * (x.__w || 1) : x.expect.mean), 0), isd = Math.sqrt(its.reduce((t, x) => t + (x.type === 'yn' ? 0.16 * (x.__w || 1) ** 2 : x.expect.sd ** 2), 0) * (1 + (k - 1) * 0.4));
      const lo = its.reduce((t, x) => t + (x.type === 'yn' ? 0 : +x.min), 0), hi = its.reduce((t, x) => t + (x.type === 'yn' ? (x.__w || 1) : +x.max), 0);
      const f = { kind: T.kind, list: its.map(x => x.id), ...(T.kind === 'wsum' ? { weights: Object.fromEntries(its.map(x => [x.id, x.__w || 1])) } : {}) };
      const [mn, mx, mean, sd] = T.kind === 'pctsum' ? [0, 100, 35, 18] : T.kind === 'rpct' ? [0, 100, 60, 18] : T.kind === 'mean' ? [its[0] ? +its[0].min : 0, its[0] ? +its[0].max : 1, im / k, isd / k] : [lo, hi, im, isd];
      const v = { ...base, id: uid(), label: lab, name: nm, type: 'calc', min: mn, max: mx, dec: T.kind === 'wsum' ? '1' : '0', group: '', definition: T.def || S.def || '', formula: f, expect: { mean: +mean.toFixed(1), sd: +sd.toFixed(1), dist: 'normal' } };
      tots.push(v); D.vars.push(v); });
    D.vars.forEach(v => { delete v.__w; });
    if (S.note) { const first = items[0]; if (first) first.definition = S.note; }
    if (!D.sections.includes(name)) D.sections.push(name); return items.length;
  }
  // eligibility: inclusion and exclusion criteria as yes/no columns, and "Eligible" by formula
  function addEligibility(D, inc, exc) {
    const mk = (t, kind) => ({ id: uid(), section: 'Eligibility', label: t, type: 'yn', unit: '', min: '', max: '', cats: [...YN], dec: '', required: true, visits: [], group: kind === 'inc' ? 'Inclusion criteria' : 'Exclusion criteria', role: '', definition: '', elig: kind, expect: { pct: kind === 'inc' ? [97, 3] : [3, 97] } });
    const vs = [...inc.map(t => mk(t, 'inc')), ...exc.map(t => mk(t, 'exc'))]; if (!vs.length) return 0;
    D.vars = D.vars.filter(v => !(v.section === 'Eligibility'));
    D.vars.unshift(...vs, { id: uid(), section: 'Eligibility', label: 'Eligible', name: 'Eligible', type: 'calc', unit: '', min: '', max: '', cats: [], dec: '', required: false, visits: [], group: '', role: '', definition: 'Eligible when every inclusion criterion is Yes and every exclusion criterion is No.', formula: { kind: 'eligible', list: vs.map(v => v.id) } });
    D.sections = ['Eligibility', ...D.sections.filter(x => x !== 'Eligibility')]; return vs.length;
  }

  /* ---------- randomisation (seeded, simple or in blocks, by strata) ---------- */
  const prng = seed => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  function allocation(D, n, rnd) {
    const arms = D.arms, out = []; if (arms.length < 2) return out;
    if (D.rand.type === 'simple') { for (let i = 0; i < n; i++) out.push(arms[Math.floor(rnd() * arms.length)]); return out; }
    const sizes = String(D.rand.sizes || '4').split(/[ ,;]+/).map(Number).filter(x => x >= arms.length && x % arms.length === 0); const S2 = sizes.length ? sizes : [arms.length * 2];
    while (out.length < n) { const sz = S2[Math.floor(rnd() * S2.length)], b = []; for (let i = 0; i < sz; i++) b.push(arms[i % arms.length]); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; } out.push(...b); }
    return out.slice(0, n);
  }
  function randomisation(D) {
    const rnd = prng(+D.rand.seed || 1), strata = (D.rand.strata || []).map(id => D.vars.find(v => v.id === id)).filter(v => v && v.cats.length);
    const sites = (D.sites || []).filter(x => x && x.name), per = sites.length ? Math.ceil((+D.n || 60) / sites.length) : +D.n || 60;
    const combos = strata.reduce((acc, v) => acc.flatMap(a => v.cats.map(c => [...a, `${v.label}: ${c}`])), sites.length ? sites.map(x => [`Site: ${x.name}`]) : [[]]);
    return combos.map(c => ({ stratum: c.join(' · ') || 'All patients', site: sites.length ? c[0].slice(6) : '', list: allocation(D, per, rnd) }));
  }

  /* ---------- a small XLSX writer (inline strings, styles, validations, highlighting, frozen panes, formulas, hidden sheets) ---------- */
  const X = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  const colL = i => { let s = ''; i++; while (i > 0) { const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; };
  const SEC_FILL = ['1F3864', '7B2FBE', '2E7D32', 'C55A11', '0E6B8C', '9C2A54', '5B6770', '806000'];
  // style ids: 0 normal, 1 header, 2 date, 3 bold, 4 wrap, 5.. section headers (white on colour), then 5+8 = calculated (grey)
  function stylesXml() {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">`
      + `<numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts>`
      + `<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts>`
      + `<fills count="${4 + SEC_FILL.length}"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7E1F0"/><bgColor indexed="64"/></patternFill></fill><fill><patternFill patternType="solid"><fgColor rgb="FFF2F2F2"/><bgColor indexed="64"/></patternFill></fill>${SEC_FILL.map(c => `<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`).join('')}</fills>`
      + `<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFBFBFBF"/></left><right style="thin"><color rgb="FFBFBFBF"/></right><top style="thin"><color rgb="FFBFBFBF"/></top><bottom style="thin"><color rgb="FFBFBFBF"/></bottom><diagonal/></border></borders>`
      + `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>`
      + `<cellXfs count="${10 + SEC_FILL.length}"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>`
      + `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>`
      + SEC_FILL.map((_, i) => `<xf numFmtId="0" fontId="2" fillId="${4 + i}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`).join('')
      + `<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyProtection="1"><protection locked="0"/></xf><xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1" applyProtection="1"><protection locked="0"/></xf><xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="164" fontId="0" fillId="3" borderId="0" xfId="0" applyNumberFormat="1" applyFill="1"/></cellXfs>`
      + `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`
      + `<dxfs count="5"><dxf><font><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf><dxf><font><b/><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFEB9C"/></patternFill></fill></dxf><dxf><font><color rgb="FF808080"/></font><fill><patternFill><bgColor rgb="FFD9D9D9"/></patternFill></fill></dxf><dxf><font><color rgb="FF1F4E9A"/></font><fill><patternFill><bgColor rgb="FFDDEBF7"/></patternFill></fill></dxf><dxf><font><b/><color rgb="FFFFFFFF"/></font><fill><patternFill><bgColor rgb="FFC00000"/></patternFill></fill></dxf></dxfs>`
      + `<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
  }
  const CALC_STYLE = 5 + SEC_FILL.length, UNLOCK = CALC_STYLE + 1, DATE_UNLOCK = CALC_STYLE + 2, PCT_STYLE = CALC_STYLE + 3, CALC_DATE = CALC_STYLE + 4;
  // the legacy password hash of a protected sheet (as Excel writes it)
  const pwHash = pw => { let h = 0; for (let i = pw.length - 1; i >= 0; i--) { h = ((h >> 14) & 1) | ((h << 1) & 0x7fff); h ^= pw.charCodeAt(i); } h = ((h >> 14) & 1) | ((h << 1) & 0x7fff); h ^= pw.length; h ^= 0xCE4B; return h.toString(16).toUpperCase(); };
  // one sheet: rows = [[cell…]] with cell = null | string | number | { v, f, s, t } ; opts: widths, freeze {r, c}, merges, validations, cfs
  function sheetXml(rows, o = {}) {
    const W = Math.max(1, ...rows.map(r => r.length)), dims = `A1:${colL(W - 1)}${Math.max(1, rows.length)}`;
    const cell = (c, ri, ci) => { if (c === null || c === undefined || c === '') return ''; const ref = `${colL(ci)}${ri + 1}`, o2 = typeof c === 'object' ? c : { v: c }, s = o2.s ? ` s="${o2.s}"` : '';
      if (o2.f) return o2.cv === undefined || o2.cv === null || o2.cv === '' ? `<c r="${ref}"${s}><f>${X(o2.f)}</f></c>` : typeof o2.cv === 'number' ? `<c r="${ref}"${s}><f>${X(o2.f)}</f><v>${o2.cv}</v></c>` : `<c r="${ref}"${s} t="str"><f>${X(o2.f)}</f><v>${X(o2.cv)}</v></c>`;
      if (typeof o2.v === 'number' && isFinite(o2.v)) return `<c r="${ref}"${s}><v>${o2.v}</v></c>`;
      if (o2.v === undefined || o2.v === null || o2.v === '') return s ? `<c r="${ref}"${s}/>` : '';
      return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${X(o2.v)}</t></is></c>`; };
    const fz = o.freeze ? `<pane ${o.freeze.c ? `xSplit="${o.freeze.c}" ` : ''}ySplit="${o.freeze.r}" topLeftCell="${colL(o.freeze.c || 0)}${o.freeze.r + 1}" activePane="${o.freeze.c ? 'bottomRight' : 'bottomLeft'}" state="frozen"/>` : '';
    let x = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="${dims}"/>`
      + `<sheetViews><sheetView workbookViewId="0"${o.tab ? ' tabSelected="1"' : ''}>${fz}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="15"/>`;
    if (o.widths && o.widths.length) x += `<cols>${o.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"${o.colStyles && o.colStyles[i] ? ` style="${o.colStyles[i]}"` : ''}/>`).join('')}</cols>`;
    x += `<sheetData>${rows.map((r, ri) => `<row r="${ri + 1}"${o.rowH && o.rowH[ri] ? ` ht="${o.rowH[ri]}" customHeight="1"` : ''}>${r.map((c, ci) => cell(c, ri, ci)).join('')}</row>`).join('')}</sheetData>`;
    if (o.protect) x += `<sheetProtection${o.protect.pw ? ` password="${pwHash(o.protect.pw)}"` : ''} sheet="1" objects="1" scenarios="1" formatColumns="0" formatRows="0" sort="0" autoFilter="0"/>`;
    if (o.merges && o.merges.length) x += `<mergeCells count="${o.merges.length}">${o.merges.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>`;
    if (o.cfs && o.cfs.length) { let pr = 1; x += o.cfs.map(cf => `<conditionalFormatting sqref="${cf.ref}"><cfRule type="${cf.type}" dxfId="${cf.dxf || 0}" priority="${pr++}"${cf.op ? ` operator="${cf.op}"` : ''}>${cf.f.map(f => `<formula>${X(f)}</formula>`).join('')}</cfRule></conditionalFormatting>`).join(''); }
    if (o.dv && o.dv.length) x += `<dataValidations count="${o.dv.length}">${o.dv.map(d => `<dataValidation type="${d.type}"${d.op ? ` operator="${d.op}"` : ''} allowBlank="1" showInputMessage="1" showErrorMessage="1"${d.errTitle ? ` errorTitle="${X(d.errTitle.slice(0, 32))}"` : ''}${d.err ? ` error="${X(d.err.slice(0, 225))}"` : ''}${d.pTitle ? ` promptTitle="${X(d.pTitle.slice(0, 32))}"` : ''}${d.prompt ? ` prompt="${X(d.prompt.slice(0, 250))}"` : ''} sqref="${d.ref}"><formula1>${X(d.f1)}</formula1>${d.f2 !== undefined ? `<formula2>${X(d.f2)}</formula2>` : ''}</dataValidation>`).join('')}</dataValidations>`;
    return x + `<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>`;
  }
  function xlsxBlob(sheets) { // sheets: [{ name, xml, hidden }]
    const z = XLSX.CFB.utils.cfb_new(), add = (p, t) => XLSX.CFB.utils.cfb_add(z, p, new TextEncoder().encode(t));
    add('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('')}</Types>`);
    add('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
    add('xl/workbook.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="20000" windowHeight="12000" activeTab="0"/></bookViews><sheets>${sheets.map((s, i) => `<sheet name="${X(s.name.slice(0, 31))}" sheetId="${i + 1}"${s.hidden ? ' state="hidden"' : ''} r:id="rId${i + 1}"/>`).join('')}</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`);
    add('xl/_rels/workbook.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`);
    add('xl/styles.xml', stylesXml());
    sheets.forEach((s, i) => add(`xl/worksheets/sheet${i + 1}.xml`, s.xml));
    return new Blob([XLSX.CFB.write(z, { fileType: 'zip', type: 'array', compression: true })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  }

  /* ---------- the master sheet workbook ---------- */
  const missingCode = D => D.conv.missing === '999' ? 999 : null;
  const codeOf = (v, c) => v.cats.indexOf(c) + 1;
  // fill (from the generator): { patients: [{ id, group, vals: { varId: { visitId | 'once': value } } }], simulated, targets }
  const xlDate = d => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}/.test(d) ? Math.round((Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10)) - Date.UTC(1899, 11, 30)) / 864e5) : d;
  function buildWorkbook(D, fill) {
    const cols = columns(D), long = D.layout === 'long', perVisit = D.layout === 'sheets', arms = D.arms.filter(Boolean), hasGroup = arms.length >= 2;
    const XL = xlOpts(D), sites = (D.sites || []).filter(x => x && x.name), hasSite = sites.length >= 1, shown = D.blind ? arms.map((_, i) => `Group ${String.fromCharCode(65 + i)}`) : arms, armOf = a => a == null ? a : shown[arms.indexOf(a)] ?? a;
    const per = hasSite ? Math.ceil(Math.max(1, +D.n || 60) / sites.length) : 0, pad = i => String(i).padStart(+D.idDigits || 3, '0');
    const n = fill ? fill.patients.length : hasSite ? per * sites.length : Math.max(1, +D.n || 60);
    const ids = fill ? fill.patients.map(p => p.id) : hasSite ? sites.flatMap(x => Array.from({ length: per }, (_, i) => `${x.prefix || ''}${pad(i + 1)}`)) : Array.from({ length: n }, (_, i) => `${D.idPrefix || ''}${pad(i + 1)}`);
    const siteOf = p => fill ? (fill.patients[p].site || '') : hasSite ? sites[Math.floor(p / per)].name : '';
    const rand = hasGroup && D.rand.on ? randomisation(D) : null;
    const prefillGroup = !rand || D.rand.prefill === false ? null : rand.length === 1 ? rand[0].list : hasSite && rand.length === sites.length ? sites.flatMap((x, si) => rand[si].list.slice(0, per)) : null;
    const order = secOrder(D);
    // lists of the categories (a hidden sheet, so any category works in a drop-down list)
    const listCols = [], listOf = {}; D.vars.filter(v => v.type === 'cat' || v.type === 'yn' || v.type === 'multi').forEach(v => { listOf[v.id] = listCols.length; const cs = v.type === 'multi' ? YN : v.cats; listCols.push(D.conv.catAs === 'codes' ? cs.map((_, i) => i + 1) : cs); });
    if (hasGroup) { listOf.__group = listCols.length; listCols.push(shown); }
    if (hasSite) { listOf.__site = listCols.length; listCols.push(sites.map(x => x.name)); }
    listOf.__yn = listCols.length; listCols.push([...YN]);
    const listsRows = Array.from({ length: Math.max(1, ...listCols.map(l => l.length)) }, (_, r) => listCols.map(l => l[r] ?? null));
    const dataSheet = (cs, name, withLead) => {
      const lead = [{ col: 'ID' }, ...(hasSite ? [{ col: 'Site' }] : []), ...(hasGroup ? [{ col: 'Group' }] : []), ...(long ? [{ col: 'Visit' }] : [])], main = withLead && (name === 'Data' || perVisit && name === D.visits[0].name.slice(0, 31));
      const helpers = main && name === 'Data' ? helperCols(D, cs) : [], all = [...lead, ...cs, ...helpers], nRows = long ? n * D.visits.length : n, gK = lead.findIndex(c => c.col === 'Group');
      const head0 = all.map(() => null), head1 = all.map(c => ({ v: c.col, s: 1 })), merges = [];
      // row 1: the sections over their columns, each in its colour
      let i = lead.length; head0[0] = { v: 'Study', s: 5 }; for (let k = 1; k < lead.length; k++) head0[k] = { v: '', s: 5 }; if (lead.length > 1) merges.push(`A1:${colL(lead.length - 1)}1`);
      const secOf = c => c.v ? c.v.section : c.sec;
      while (i < all.length) { const sec = secOf(all[i]); let j = i; while (j + 1 < all.length && secOf(all[j + 1]) === sec) j++; const st = 5 + (order.indexOf(sec) % SEC_FILL.length + SEC_FILL.length) % SEC_FILL.length;
        for (let k = i; k <= j; k++) head0[k] = { v: k === i ? sec : '', s: st }; if (j > i) merges.push(`${colL(i)}1:${colL(j)}1`); i = j + 1; }
      const at = (cid, visitId) => { const k = all.findIndex(c => c.v && c.v.id === cid && (long || !visitId || (c.visit && c.visit.id === visitId) || (!c.visit && !visitId))); return k < 0 ? all.findIndex(c => c.v && c.v.id === cid) : k; };
      const rows = [head0, head1];
      const fv = (p, v, c, vi) => { if (!fill || !withLead) return null; const pv = fill.patients[p].vals[v.id] || {}; if (long) { const vis = (v.visits || []).length ? v.visits : [D.visits[0].id]; const id = D.visits[vi].id; return vis.includes(id) ? (pv[id] ?? (id === D.visits[0].id ? pv.once : null)) : null; }
        return c.visit ? (pv[c.visit.id] ?? (c.visit.id === D.visits[0].id ? pv.once : null)) : (pv.once ?? pv[D.visits[0].id] ?? null); };
      for (let r = 0; r < nRows; r++) { const p = long ? Math.floor(r / D.visits.length) : r, vi = long ? r % D.visits.length : 0, R = r + 3;
        const lk = v0 => XL.protect ? (v0 === null || v0 === undefined || v0 === '' ? null : { v: v0, s: UNLOCK }) : v0;
        const row = all.map((c, ci) => { if (ci === 0) return withLead ? ids[p] : null; if (c.col === 'Site' && !c.v) return withLead ? siteOf(p) : null;
          if (c.col === 'Group' && !c.v) return withLead ? (fill ? armOf(fill.patients[p].group) : prefillGroup ? armOf(prefillGroup[p]) : lk(null)) : null; if (c.col === 'Visit' && !c.v) return D.visits[vi].name;
          if (c.helper) return helperCell(c, p, R);
          const v = c.v, val = fv(p, v, c, vi); if (v.type === 'date') return { v: typeof val === 'string' ? (xlDate(val) ?? val) : val, s: typeof val === 'string' && !/^\d{4}-/.test(val) ? (XL.protect ? UNLOCK : 0) : XL.protect ? DATE_UNLOCK : 2 };
          if (v.type === 'multi') return lk(val == null ? null : Array.isArray(val) ? (val.includes(c.opt) ? (D.conv.catAs === 'codes' ? 1 : 'Yes') : (D.conv.catAs === 'codes' ? 2 : 'No')) : val);
          if (v.type !== 'calc' && fill) return lk(val);
          if (v.type === 'calc' && v.formula) { const f = v.formula, A = at(f.a, c.visit && c.visit.id), B = f.b ? at(f.b, c.visit && c.visit.id) : -1, a = A >= 0 ? `${colL(A)}${R}` : null, b = B >= 0 ? `${colL(B)}${R}` : null;
            let fx = null;
            if (f.kind === 'bmi' && a && b) fx = `IF(AND(ISNUMBER(${a}),ISNUMBER(${b}),${b}>0),ROUND(${a}/(${b}/100)^2,1),"")`;
            if (f.kind === 'days' && a && b) fx = `IF(AND(ISNUMBER(${a}),ISNUMBER(${b})),${b}-${a},"")`;
            if (f.kind === 'age' && a) fx = b ? `IF(AND(ISNUMBER(${a}),ISNUMBER(${b})),DATEDIF(${a},${b},"y"),"")` : `IF(ISNUMBER(${a}),DATEDIF(${a},TODAY(),"y"),"")`;
            if (f.kind === 'change' && !long) { const vs = all.map((x, k) => [x, k]).filter(([x]) => x.v && x.v.id === f.a), first = vs[0], last = vs[vs.length - 1]; if (first && last && first !== last) fx = `IF(AND(ISNUMBER(${colL(last[1])}${R}),ISNUMBER(${colL(first[1])}${R})),${colL(last[1])}${R}-${colL(first[1])}${R},"")`; }
            if (f.kind === 'pct' && !long) { const vs = all.map((x, k) => [x, k]).filter(([x]) => x.v && x.v.id === f.a), first = vs[0], last = vs[vs.length - 1]; if (first && last && first !== last) { const L1 = `${colL(last[1])}${R}`, F1 = `${colL(first[1])}${R}`; fx = `IF(AND(ISNUMBER(${L1}),ISNUMBER(${F1}),${F1}<>0),ROUND((${L1}-${F1})/${F1}*100,1),"")`; } }
            if (!fx && !['bmi', 'days', 'age', 'change', 'pct'].includes(f.kind) && !((f.kind === 'sum' || f.kind === 'mean') && !(f.rev || []).length)) fx = calcExcel(D, v, f, id => { const k = at(id, c.visit && c.visit.id); return k >= 0 ? `${colL(k)}${R}` : null; });
            if ((f.kind === 'sum' || f.kind === 'mean') && (f.list || []).length && !(f.rev || []).length) { const refs = f.list.map(id => at(id, c.visit && c.visit.id)).filter(k => k >= 0).map(k => `${colL(k)}${R}`); if (refs.length) fx = `IF(COUNT(${refs.join(',')})=${refs.length},${f.kind === 'sum' ? 'SUM' : 'AVERAGE'}(${refs.join(',')}),"")`; }
            return fx ? { f: fx, s: CALC_STYLE, cv: fill ? val : undefined } : { v: fill ? val : null, s: CALC_STYLE }; }
          return null; });
        // the helper cells of the row: what is filled, what is missing, the due dates (their values are kept for programs that do not calculate)
        helpers.forEach((c, hi) => { const k = lead.length + cs.length + hi, cell = row[k]; if (!cell || !fill) return; const valAt = j => { const x = row[j]; return x === null || x === undefined ? '' : typeof x === 'object' ? (x.cv ?? x.v ?? '') : x; };
          if (c.helper === 'filled') cell.cv = c.refs.filter(j => String(valAt(j)) !== '').length;
          if (c.helper === 'missreq') cell.cv = c.refs.filter(j => String(valAt(j)) === '').length;
          if (c.helper === 'due') { const a = valAt(c.anchor); cell.cv = typeof a === 'number' ? a + c.day : ''; } });
        rows.push(row); }
      // validations, highlighting and the input message of each column
      const dv = [], cfs = [], last = nRows + 2, ref = k => `${colL(k)}3:${colL(k)}${Math.max(last, 3) + 500}`, lettersOfLists = k => `Lists!$${colL(k)}$1:$${colL(k)}$${listCols[k].length}`;
      if (hasGroup) dv.push({ type: 'list', ref: ref(gK), f1: lettersOfLists(listOf.__group), errTitle: 'Group', err: `Choose: ${shown.join(', ')}`, pTitle: 'Group', prompt: shown.join(' / ') });
      if (hasSite) dv.push({ type: 'list', ref: ref(lead.findIndex(c => c.col === 'Site')), f1: lettersOfLists(listOf.__site), errTitle: 'Site', err: `Choose: ${sites.map(x => x.name).join(', ')}`, pTitle: 'Site', prompt: sites.map(x => x.name).join(' / ') });
      // IDs: a repeated ID in red, an ID of another length in yellow
      if (XL.ids) { cfs.push({ ref: ref(0), type: 'expression', dxf: 0, f: [`AND(A3<>"",COUNTIF($A$3:$A$${Math.max(last, 3) + 500},A3)>1)`] }); if (!hasSite && !fill) cfs.push({ ref: ref(0), type: 'expression', dxf: 1, f: [`AND(A3<>"",LEN(A3)<>${String(ids[0] || '').length})`] }); }
      helpers.forEach((c, hi) => { const k = lead.length + cs.length + hi;
        if (c.helper === 'log' && c.col === 'Verified') dv.push({ type: 'list', ref: ref(k), f1: lettersOfLists(listOf.__yn), errTitle: 'Verified', err: 'Yes or No', pTitle: 'Verified', prompt: 'Checked against the source documents?' });
        if (c.helper === 'log' && c.col === 'Entry_date') dv.push({ type: 'date', op: 'between', ref: ref(k), f1: 1, f2: 2958465, errTitle: 'A date', err: 'A date', pTitle: 'Entry date', prompt: 'The date the row was entered' });
        if (c.helper === 'missreq') cfs.push({ ref: ref(k), type: 'expression', dxf: 1, f: [`AND(${colL(k)}3>0,${colL(c.filledK)}3>0)`] });
        if (c.helper === 'due') { if (c.firstK >= 0) cfs.push({ ref: ref(k), type: 'expression', dxf: 4, f: [`AND(ISNUMBER(${colL(k)}3),TODAY()>${colL(k)}3+${c.tol},${colL(c.firstK)}3="")`] });
          if (c.dateK >= 0) cfs.push({ ref: ref(c.dateK), type: 'expression', dxf: 1, f: [`AND(ISNUMBER(${colL(c.dateK)}3),ISNUMBER(${colL(k)}3),ABS(${colL(c.dateK)}3-${colL(k)}3)>${c.tol})`] }); } });
      all.forEach((c, k) => { const v = c.v; if (!v) return; const unit = v.unit ? ` (${v.unit})` : '', note = [v.definition, v.required ? 'Required' : ''].filter(Boolean).join(' · ');
        if (v.type === 'multi') dv.push({ type: 'list', ref: ref(k), f1: lettersOfLists(listOf[v.id]), errTitle: v.label, err: 'Yes or No', pTitle: `${v.label}: ${c.opt}`.slice(0, 32), prompt: `Ticked? ${D.conv.catAs === 'codes' ? '1 = Yes, 2 = No' : 'Yes / No'}${note ? ` · ${note}` : ''}` });
        if (v.type === 'cat' || v.type === 'yn') dv.push({ type: 'list', ref: ref(k), f1: lettersOfLists(listOf[v.id]), errTitle: v.label, err: `Choose from the list: ${(D.conv.catAs === 'codes' ? v.cats.map((x, i) => `${i + 1}=${x}`) : v.cats).join(', ')}`, pTitle: v.label, prompt: ((D.conv.catAs === 'codes' ? v.cats.map((x, i) => `${i + 1} = ${x}`).join(', ') : v.cats.join(' / ')) + (note ? ` · ${note}` : '')) });
        if (v.type === 'num') { const lo = v.min === '' ? null : +v.min, hi = v.max === '' ? null : +v.max, miss = missingCode(D), whole = String(v.dec) === '0';
          if (lo !== null && hi !== null && miss === null) dv.push({ type: whole ? 'whole' : 'decimal', op: 'between', ref: ref(k), f1: lo, f2: hi, errTitle: 'Out of range', err: `${v.label}${unit}: ${lo} to ${hi}`, pTitle: v.label + unit, prompt: `${lo} to ${hi}${note ? ` · ${note}` : ''}` });
          else dv.push({ type: 'decimal', op: 'between', ref: ref(k), f1: -1e15, f2: 1e15, errTitle: 'A number', err: `${v.label}: a number${miss !== null ? ` (missing: ${miss})` : ''}`, pTitle: v.label + unit, prompt: `${lo !== null && hi !== null ? `${lo} to ${hi}` : 'A number'}${miss !== null ? ` · missing = ${miss}` : ''}${note ? ` · ${note}` : ''}` });
          const rl = v.refLo === undefined || v.refLo === '' ? null : +v.refLo, rh = v.refHi === undefined || v.refHi === '' ? null : +v.refHi;
          const rb = refRules(D, v), sxK = rb.length ? all.findIndex(c2 => c2.v && c2.v.id === (refSexAge(D).sex || {}).id && (!c2.visit || c2.visit.id === D.visits[0].id)) : -1, agK = rb.length ? all.findIndex(c2 => c2.v && c2.v.id === (refSexAge(D).age || {}).id && (!c2.visit || c2.visit.id === D.visits[0].id)) : -1;
          if (rb.length) rb.forEach(x => { const sxv = x.sex && sxK >= 0 ? (D.conv.catAs === 'codes' ? String(refSexAge(D).sex.cats.indexOf(x.sex) + 1) : `"${x.sex}"`) : null, conds = [`ISNUMBER(${colL(k)}3)`, sxv ? `$${colL(sxK)}3=${sxv}` : '', x.ageMin !== '' && x.ageMin !== undefined && agK >= 0 ? `$${colL(agK)}3>=${+x.ageMin}` : '', x.ageMax !== '' && x.ageMax !== undefined && agK >= 0 ? `$${colL(agK)}3<=${+x.ageMax}` : '', `OR(${[x.lo !== '' && x.lo !== undefined ? `${colL(k)}3<${+x.lo}` : '', x.hi !== '' && x.hi !== undefined ? `${colL(k)}3>${+x.hi}` : ''].filter(Boolean).join(',') || 'FALSE'})`, miss !== null ? `${colL(k)}3<>${miss}` : ''].filter(Boolean);
            cfs.push({ ref: ref(k), type: 'expression', dxf: 3, f: [`AND(${conds.join(',')})`] }); });
          else if (rl !== null || rh !== null) cfs.push({ ref: ref(k), type: 'expression', dxf: 3, f: [`AND(ISNUMBER(${colL(k)}3),OR(${[rl !== null ? `${colL(k)}3<${rl}` : '', rh !== null ? `${colL(k)}3>${rh}` : ''].filter(Boolean).join(',')})${miss !== null ? `,${colL(k)}3<>${miss}` : ''})`] });
          if (lo !== null && hi !== null) cfs.push({ ref: ref(k), type: 'expression', f: [`AND(ISNUMBER(${colL(k)}3),OR(${colL(k)}3<${lo},${colL(k)}3>${hi})${miss !== null ? `,${colL(k)}3<>${miss}` : ''})`] }); }
        if (v.consentVer) { const lv = D.conv.catAs === 'codes' ? String(v.cats.indexOf(v.consentVer) + 1) : `"${v.consentVer}"`; cfs.push({ ref: ref(k), type: 'expression', dxf: 1, f: [`AND(${colL(k)}3<>"",${colL(k)}3<>${lv})`] }); }
        if (v.type === 'date') dv.push({ type: 'date', op: 'between', ref: ref(k), f1: 1, f2: 2958465, errTitle: 'A date', err: `${v.label}: a date (${D.conv.date})`, pTitle: v.label, prompt: `A date, ${D.conv.date}${note ? ` · ${note}` : ''}` });
        if (v.type === 'text' || v.type === 'time') dv.push({ type: 'textLength', op: 'lessThanOrEqual', ref: ref(k), f1: 255, pTitle: v.label + unit, prompt: note || (v.type === 'time' ? 'hh:mm' : 'Text') });
        // skip logic: the cells of a patient who is not asked are greyed
        const pv = whenParent(D, v); if (pv) { const pk = at(pv.id, c.visit && c.visit.id); if (pk >= 0 && pk !== k) { const P = `${colL(pk)}3`, want = D.conv.catAs === 'codes' ? String(codeOf(pv, v.when.cat)) : `"${String(v.when.cat).replace(/"/g, '""')}"`; cfs.push({ ref: ref(k), type: 'expression', dxf: 2, f: [`AND(${P}<>"",${P}<>${want})`] }); } } });
      // checks across columns (e.g. discharge ≥ admission): highlighted when broken
      (D.checks || []).forEach(ch => { const ks = all.map((c, k) => [c, k]).filter(([c]) => c.v && c.v.id === ch.a), kb = all.map((c, k) => [c, k]).filter(([c]) => c.v && c.v.id === ch.b);
        ks.forEach(([ca, a], i) => { const b = (kb.find(([cb]) => (cb.visit && cb.visit.id) === (ca.visit && ca.visit.id)) || kb[i] || kb[0] || [])[1]; if (b === undefined) return; const op = { '>': '<=', '>=': '<', '<': '>=', '<=': '>', '=': '<>' }[ch.op] || '<';
          cfs.push({ ref: `${colL(a)}3:${colL(a)}${Math.max(last, 3) + 500}`, type: 'expression', dxf: 1, f: [`AND(ISNUMBER(${colL(a)}3),ISNUMBER(${colL(b)}3),${colL(a)}3${op}${colL(b)}3)`] }); }); });
      // protection: the entry columns stay open, the ID, formulas, helper columns and the header are locked
      const colStyles = XL.protect ? all.map(c => c.helper === 'log' ? (c.col === 'Entry_date' ? DATE_UNLOCK : UNLOCK) : c.helper ? 0 : c.v ? (c.v.type === 'calc' ? 0 : c.v.type === 'date' ? DATE_UNLOCK : UNLOCK) : c.col === 'Group' && !prefillGroup && !fill ? UNLOCK : c.col === 'Site' ? UNLOCK : 0) : null;
      if (main) dataMap = { all, last, lead: lead.length, cs: cs.length, gK };
      return { name, xml: sheetXml(rows, { widths: all.map(c => Math.min(28, Math.max(9, c.col.length + 2))), colStyles, protect: XL.protect && withLead ? { pw: XL.pw } : null, freeze: { r: 2, c: 1 }, merges, dv, cfs, rowH: { 1: 30 }, tab: name === 'Data' }) };
    };
    let dataMap = null;
    // a helper cell: a formula over the row (cached when the values are known)
    function helperCell(c, p, R) {
      if (c.helper === 'log') return XL.protect ? { v: null, s: c.col === 'Entry_date' ? DATE_UNLOCK : UNLOCK } : null;
      if (c.helper === 'filled') return { f: c.refs.length > 400 ? `COUNTA(${colL(c.refs[0])}${R}:${colL(c.refs[c.refs.length - 1])}${R})` : c.refs.map(j => `(LEN(${colL(j)}${R})>0)`).join('+'), s: CALC_STYLE };
      if (c.helper === 'missreq') return { f: c.refs.map(j => `(LEN(${colL(j)}${R})=0)`).join('+'), s: CALC_STYLE };
      if (c.helper === 'due') return { f: `IF(ISNUMBER(${colL(c.anchor)}${R}),${colL(c.anchor)}${R}+${c.day},"")`, s: CALC_DATE };
      return null;
    }
    // the helper columns of the main sheet, with the positions of the cells they use
    function helperCols(D, cs) {
      const L0 = 1 + (hasSite ? 1 : 0) + (hasGroup ? 1 : 0) + (long ? 1 : 0), entry = [], req = [], out = [];
      cs.forEach((c, j) => { if (c.v && c.v.type !== 'calc') { entry.push(L0 + j); if (c.v.required && !whenParent(D, c.v)) req.push(L0 + j); } });
      const base = L0 + cs.length;
      if (XL.dash && entry.length) { out.push({ col: 'Filled', helper: 'filled', sec: 'Data checks', refs: entry }); if (req.length) out.push({ col: 'Missing_required', helper: 'missreq', sec: 'Data checks', refs: req, filledK: base }); }
      // the due date of each visit: the anchor date + its day; overdue when its first value is still empty after the window
      const anc = D.anchor && D.vars.find(v => v.id === D.anchor && v.type === 'date'), ak = anc ? cs.findIndex(c => c.v && c.v.id === anc.id) : -1;
      if (!long && ak >= 0) D.visits.forEach((x, vi) => { if (!vi || x.day === '' || x.day === undefined || !isFinite(+x.day)) return; const first = cs.findIndex(c => c.visit && c.visit.id === x.id && c.v.type !== 'calc'), dk = cs.findIndex(c => c.visit && c.visit.id === x.id && c.v.type === 'date');
        out.push({ col: `Due_${tagOf(x.name)}`, helper: 'due', sec: 'Visit schedule', anchor: L0 + ak, day: +x.day, tol: Math.max(0, +x.tol || 0), firstK: first >= 0 ? L0 + first : -1, dateK: dk >= 0 ? L0 + dk : -1 }); });
      if (XL.log) ['Entered_by', 'Entry_date', 'Checked_by', 'Verified'].forEach(col => out.push({ col, helper: 'log', sec: 'Entry log' }));
      return out;
    }
    const sheets = [];
    if (perVisit) D.visits.forEach((x, vi) => { const cs = cols.filter(c => vi === 0 ? !c.visit || c.visit.id === x.id || !(c.v.visits || []).length : c.visit && c.visit.id === x.id).map(c => ({ ...c, col: baseName(D, c.v) }));
      sheets.push(dataSheet(cs, x.name.slice(0, 31), true)); });
    else sheets.push(dataSheet(cols, 'Data', true));
    if (D.double && !perVisit) { sheets.push(dataSheet(cols, 'Entry 2', true));
      // compare the two entries: a mark where they differ
      const lead = 1 + (hasSite ? 1 : 0) + (hasGroup ? 1 : 0) + (long ? 1 : 0), all = cols.length + lead, nRows = long ? n * D.visits.length : n, cmp = [[{ v: 'Differences between the two entries (≠ marks a cell to check)', s: 3 }], [...Array(all)].map((_, k) => ({ v: k === 0 ? 'ID' : `${(['ID', ...(hasSite ? ['Site'] : []), ...(hasGroup ? ['Group'] : []), ...(long ? ['Visit'] : []), ...cols.map(c => c.col)])[k]}`, s: 1 }))];
      for (let r = 0; r < nRows; r++) { const R = r + 3; cmp.push([...Array(all)].map((_, k) => k === 0 ? { f: `Data!A${R}` } : { f: `IF(Data!${colL(k)}${R}&""='Entry 2'!${colL(k)}${R}&"","","≠")` })); }
      sheets.push({ name: 'Compare', xml: sheetXml(cmp, { widths: [...Array(all)].map(() => 12), freeze: { r: 2, c: 1 }, cfs: [{ ref: `B3:${colL(all - 1)}${nRows + 2}`, type: 'cellIs', op: 'equal', f: ['"≠"'] }] }) }); }
    const M = dataMap, dataRef = (k, abs) => M ? `Data!${abs ? '$' : ''}${colL(k)}${abs ? '$' : ''}3:${abs ? '$' : ''}${colL(k)}${abs ? '$' : ''}${M.last}` : '';
    // the completeness dashboard (live formulas over the Data sheet)
    if (M && XL.dash) { const fk = M.all.findIndex(c => c.helper === 'filled'), mk = M.all.findIndex(c => c.helper === 'missreq'), rowsD = [[{ v: `${D.title || 'Study'} — data completeness`, s: 3 }], ['Updated as the data are typed (Excel and LibreOffice calculate it).']];
      const entered = fk >= 0 ? `COUNTIF(${dataRef(fk)},">0")` : `COUNTA(${dataRef(0)})`;
      rowsD.push([{ v: 'Patients entered', s: 3 }, { f: entered }], [{ v: 'Complete (no required value missing)', s: 3 }, mk >= 0 ? { f: `COUNTIFS(${dataRef(fk)},">0",${dataRef(mk)},0)` } : 'no required variables'],
        [{ v: 'Duplicated IDs', s: 3 }, { f: `SUMPRODUCT((${dataRef(0)}<>"")*(COUNTIF(${dataRef(0)},${dataRef(0)})>1))` }]);
      const ckRows = []; (D.checks || []).forEach(ch => { const a = M.all.findIndex(c => c.v && c.v.id === ch.a), b = M.all.findIndex(c => c.v && c.v.id === ch.b); if (a < 0 || b < 0) return; const op = { '>': '<=', '>=': '<', '<': '>=', '<=': '>', '=': '<>' }[ch.op] || '<';
        const va = D.vars.find(v => v.id === ch.a), vb = D.vars.find(v => v.id === ch.b); ckRows.push([{ v: `Rule broken: ${va.label} ${ch.op} ${vb.label}`, s: 3 }, { f: `SUMPRODUCT(ISNUMBER(${dataRef(a)})*ISNUMBER(${dataRef(b)})*(${dataRef(a)}${op}${dataRef(b)}))` }]); });
      rowsD.push(...ckRows, [''], [{ v: 'Column', s: 1 }, { v: 'Label', s: 1 }, { v: 'Section', s: 1 }, { v: 'Visit', s: 1 }, { v: 'Required', s: 1 }, { v: 'Filled', s: 1 }, { v: '% of entered', s: 1 }]);
      const top = rowsD.length + 1, ent = `$B$3`;
      M.all.forEach((c, k) => { if (!c.v || c.v.type === 'calc') return; const r = rowsD.length + 1; rowsD.push([c.col, c.opt !== undefined ? `${c.v.label}: ${c.opt}` : c.v.label, c.v.section, c.visit ? c.visit.name : '', c.v.required ? 'Yes' : '', { f: `SUMPRODUCT(--(LEN(${dataRef(k)})>0))` }, { f: `IF(${ent}=0,"",F${r}/${ent})`, s: PCT_STYLE }]); });
      const bottom = rowsD.length;
      if (D.visits.length > 1 && !long) { rowsD.push([''], [{ v: 'Visit', s: 1 }, { v: '% filled (mean of its columns)', s: 1 }]); D.visits.forEach(x => rowsD.push([x.name, { f: `IFERROR(AVERAGEIFS(G${top}:G${bottom},D${top}:D${bottom},"${x.name.replace(/"/g, '""')}"),"")`, s: PCT_STYLE }])); }
      sheets.push({ name: 'Dashboard', xml: sheetXml(rowsD, { widths: [34, 34, 18, 14, 10, 10, 14], freeze: { r: top - 1, c: 0 }, cfs: [{ ref: `G${top}:G${bottom}`, type: 'expression', dxf: 1, f: [`AND(ISNUMBER(G${top}),G${top}<0.8)`] }, { ref: 'B5', type: 'expression', dxf: 0, f: ['B5>0'] }] }) }); }
    // one patient at a time: choose the ID, see every value (entry stays in Data)
    if (M && XL.view && !long) { const rowsP = [[{ v: 'Patient ID', s: 3 }, XL.protect ? { v: ids[0] || '', s: UNLOCK } : ids[0] || ''], ['Choose an ID (drop-down) to see the patient; type the data in the Data sheet. (Excel: Data › Form also shows one row at a time.)'], [{ v: 'Column', s: 1 }, { v: 'Label', s: 1 }, { v: 'Visit', s: 1 }, { v: 'Value', s: 1 }]];
      const idR = `Data!$A$3:$A$${M.last}`;
      M.all.forEach((c, k) => { if (!k) return; const lab = c.v ? (c.opt !== undefined ? `${c.v.label}: ${c.opt}` : c.v.label) : c.col, rng = `Data!$${colL(k)}$3:$${colL(k)}$${M.last}`, isD = (c.v && c.v.type === 'date') || c.helper === 'due' || c.col === 'Entry_date';
        rowsP.push([c.col, lab, c.visit ? c.visit.name : '', { f: `IFERROR(IF(INDEX(${rng},MATCH($B$1,${idR},0))="","",INDEX(${rng},MATCH($B$1,${idR},0))),"")`, s: isD ? 2 : 0 }]); });
      sheets.push({ name: 'Patient', xml: sheetXml(rowsP, { widths: [26, 40, 14, 22], freeze: { r: 3, c: 0 }, dv: [{ type: 'list', ref: 'B1', f1: idR, pTitle: 'Patient ID', prompt: 'Choose a patient' }], cfs: [{ ref: `D4:D${rowsP.length}`, type: 'expression', dxf: 2, f: ['D4=""'] }] }) }); }
    // the schedule of assessments: the variables by visit
    if (D.visits.length > 1) { const order2 = secOrder(D), vs = [...D.vars].sort((a, b) => order2.indexOf(a.section) - order2.indexOf(b.section)), rowsS = [[{ v: `${D.title || 'Study'} — schedule of assessments`, s: 3 }], [{ v: 'Variable', s: 1 }, { v: 'Section', s: 1 }, ...D.visits.map(x => ({ v: x.name, s: 1 }))]];
      if (D.visits.some(x => x.day !== undefined && x.day !== '')) rowsS.push(['Day (window)', '', ...D.visits.map((x, i) => x.day === undefined || x.day === '' ? (i ? '' : 'Day 0') : `Day ${x.day}${+x.tol ? ` ± ${x.tol}` : ''}`)]);
      vs.forEach(v => { const vis = (v.visits || []).length ? v.visits : [D.visits[0].id]; rowsS.push([v.label + (v.unit ? ` (${v.unit})` : ''), v.section, ...D.visits.map(x => vis.includes(x.id) ? '✓' : '')]); });
      sheets.push({ name: 'Schedule', xml: sheetXml(rowsS, { widths: [36, 18, ...D.visits.map(() => 13)], freeze: { r: 2, c: 1 } }) }); }
    // minimisation: the next patient's factors give the arm with the smallest imbalance (Pocock and Simon)
    if (M && D.minim && D.minim.on && hasGroup && !long) { const fs = (D.minim.factors || []).map(id => D.vars.find(v => v.id === id)).filter(v => v && (v.type === 'cat' || v.type === 'yn'));
      if (fs.length) { const gk = M.gK, rowsM = [[{ v: 'Minimisation — the arm for the next patient', s: 3 }], ['Type the next patient\'s factors in column B: each arm\'s count of patients already allocated with the same factors is added up; the arm with the smallest total is suggested (ties: the first). Then write the arm in the Data sheet. Allocating to the suggested arm with a probability of 0.8 adds a random element.'], [{ v: 'Factor', s: 1 }, { v: 'The next patient', s: 1 }]];
        fs.forEach(v => rowsM.push([v.label, XL.protect ? { v: null, s: UNLOCK } : null]));
        const f0 = 4, fN = f0 + fs.length - 1; rowsM.push([''], [{ v: 'Arm', s: 1 }, ...fs.map(v => ({ v: v.label, s: 1 })), { v: 'Total', s: 1 }]); const a0 = rowsM.length + 1;
        shown.forEach((a, ai) => { const r = a0 + ai; rowsM.push([a, ...fs.map((v, fi) => { const k = M.all.findIndex(c => c.v && c.v.id === v.id && (!c.visit || c.visit.id === D.visits[0].id)); return k < 0 ? '' : { f: `IF($B$${f0 + fi}="","",COUNTIFS(${dataRef(gk, true)},$A${r},Data!$${colL(k)}$3:$${colL(k)}$${M.last},$B$${f0 + fi}))` }; }), { f: `SUM(B${r}:${colL(fs.length)}${r})` }]); });
        const aN = a0 + shown.length - 1, tc = colL(fs.length + 1); rowsM.push([''], [{ v: 'Suggested arm', s: 3 }, { f: `IF(COUNTA(B${f0}:B${fN})<${fs.length},"(type every factor)",INDEX(A${a0}:A${aN},MATCH(MIN(${tc}${a0}:${tc}${aN}),${tc}${a0}:${tc}${aN},0)))` }]);
        sheets.push({ name: 'Minimisation', xml: sheetXml(rowsM, { widths: [24, ...fs.map(() => 18), 12], dv: fs.map((v, fi) => ({ type: 'list', ref: `B${f0 + fi}`, f1: `Lists!$${colL(listOf[v.id])}$1:$${colL(listOf[v.id])}$${listCols[listOf[v.id]].length}`, pTitle: v.label.slice(0, 32), prompt: 'The next patient' })) }) }); } }
    // B8: recruitment against the plan: each month's planned and actual patients (from the enrolment date), cumulative, by site, red when behind
    if (XL.recruit && M) { const anc = D.vars.find(v => v.id === D.anchor) || D.vars.find(v => v.type === 'date'), ak = anc ? M.all.findIndex(c => c.v && c.v.id === anc.id && (!c.visit || c.visit.id === D.visits[0].id)) : -1;
      if (ak >= 0) { const ssR = ssCalc(D), target = ssR && !ssR.err ? ssR.enrol : +D.n || 60, rate = Math.max(1, +(D.timeline || {}).rate || 10), months = Math.max(3, Math.ceil(target / rate) + 2), start = (D.timeline || {}).start || new Date().toISOString().slice(0, 8) + '01', siteL = (D.sites || []).filter(x => x && x.name), rng = `Data!$${colL(ak)}$3:$${colL(ak)}$${M.last}`, sk = M.all.findIndex(c => c.col === 'Site');
        const rowsR = [[{ v: `${D.title || 'Study'} — recruitment against the plan`, s: 3 }], ['Start of recruitment', { v: Math.round(Date.parse(start) / 864e5) + 25569, s: 2 }, 'Patients a month', rate, 'Target', target], [],
          ['Month', 'From', 'To', 'Planned (cumulative)', 'Actual (month)', 'Actual (cumulative)', '% of the plan', ...(siteL.length >= 2 && sk >= 0 ? siteL.map(x => x.name) : [])].map(v => ({ v, s: 1 }))];
        for (let m = 0; m < months; m++) { const r = 5 + m; rowsR.push([m + 1, { f: m ? `C${r - 1}+1` : '$B$2', s: 2 }, { f: `EOMONTH(B${r},0)`, s: 2 }, { f: `MIN($F$2,$D$2*A${r})` }, { f: `COUNTIFS(${rng},">="&B${r},${rng},"<="&C${r})` }, { f: m ? `F${r - 1}+E${r}` : `E${r}` }, { f: `IF(D${r}=0,"",ROUND(100*F${r}/D${r},0))` },
          ...(siteL.length >= 2 && sk >= 0 ? siteL.map(x => ({ f: `COUNTIFS(${rng},">="&B${r},${rng},"<="&C${r},Data!$${colL(sk)}$3:$${colL(sk)}$${M.last},"${x.name}")` })) : [])]); }
        sheets.push({ name: 'Recruitment', xml: sheetXml(rowsR, { widths: [8, 12, 12, 18, 14, 16, 12, ...siteL.map(() => 14)], freeze: { r: 4, c: 1 }, cfs: [{ ref: `F5:F${4 + months}`, type: 'expression', dxf: 0, f: ['AND(B5<=TODAY(),F5<D5*0.9)'] }] }) }); } }
    // B2: the screening log: every patient screened, the criteria, eligible, consented, randomised and why not (counts for the flowchart)
    if (XL.screen) { const inc = D.vars.filter(v => v.elig === 'inc'), exc = D.vars.filter(v => v.elig === 'exc'), crit = inc.length + exc.length ? [...inc, ...exc] : null, N = Math.max(200, 3 * ids.length), r0 = 6, r1 = r0 + N - 1;
      const head = ['Screening no.', 'Date', 'Initials', 'Age', 'Sex', ...(crit ? crit.map(v => `${v.elig === 'inc' ? 'IN' : 'EX'}: ${v.label}`) : ['Meets the criteria']), 'Eligible', 'Consented', 'Randomised', 'Patient ID', 'Reason not enrolled'];
      const ci = n0 => head.indexOf(n0), cE = ci('Eligible'), cC = ci('Consented'), cR = ci('Randomised'), cW = ci('Reason not enrolled'), rng = c => `$${colL(c)}$${r0}:$${colL(c)}$${r1}`, nCrit = crit ? crit.length : 1;
      const rowsSc = [[{ v: `${D.title || 'Study'} — screening log`, s: 3 }], ['Screened', { f: `COUNTA(${rng(1)})` }, 'Eligible', { f: `COUNTIF(${rng(cE)},"Yes")` }, 'Not eligible', { f: `COUNTIF(${rng(cE)},"No")` }, 'Declined', { f: `COUNTIF(${rng(cW)},"Declined")` }, 'Randomised', { f: `COUNTIF(${rng(cR)},"Yes")` }],
        ['One row per patient screened, in order. Eligible is worked out from the criteria (every IN = Yes and every EX = No). Upload the master sheet to Analyse: these counts fill the flowchart.'], [], head.map(v => ({ v, s: 1 }))];
      for (let i = 0; i < N; i++) { const r = r0 + i, c0 = colL(5), c1 = colL(5 + nCrit - 1);
        const elig = crit ? `IF(COUNTA(${c0}${r}:${c1}${r})<${nCrit},"",IF(AND(${[...inc.map((_, j) => `${colL(5 + j)}${r}="Yes"`), ...exc.map((_, j) => `${colL(5 + inc.length + j)}${r}="No"`)].join(',')}),"Yes","No"))` : `IF(${c0}${r}="","",${c0}${r})`;
        rowsSc.push([`S${String(i + 1).padStart(3, '0')}`, null, null, null, null, ...Array(nCrit).fill(null), { f: elig, s: CALC_STYLE }, null, null, null, null]); }
      const YNl = '"Yes,No"', dvS = [{ type: 'date', op: 'between', ref: `B${r0}:B${r1}`, f1: 1, f2: 2958465, errTitle: 'A date', err: 'A date', pTitle: 'Date', prompt: 'Date of screening' }, { type: 'list', ref: `${colL(5)}${r0}:${colL(5 + nCrit - 1)}${r1}`, f1: YNl, errTitle: 'Yes or No', err: 'Yes or No', pTitle: 'Criterion', prompt: 'Yes / No' },
        { type: 'list', ref: `${colL(cC)}${r0}:${colL(cR)}${r1}`, f1: YNl, errTitle: 'Yes or No', err: 'Yes or No', pTitle: 'Yes / No', prompt: 'Yes / No' }, { type: 'list', ref: `${colL(cW)}${r0}:${colL(cW)}${r1}`, f1: '"Not eligible,Declined,Not approached,Other"', errTitle: 'Reason', err: 'Choose a reason', pTitle: 'Reason not enrolled', prompt: 'Not eligible / Declined / Not approached / Other' }];
      const sv = refSexAge(D).sex; if (sv) dvS.push({ type: 'list', ref: `E${r0}:E${r1}`, f1: `"${sv.cats.join(',')}"`, errTitle: 'Sex', err: sv.cats.join(' / '), pTitle: 'Sex', prompt: sv.cats.join(' / ') });
      sheets.push({ name: 'Screening', xml: sheetXml(rowsSc, { widths: [13, 12, 9, 7, 9, ...Array(nCrit).fill(16), 10, 11, 11, 12, 20], freeze: { r: 5, c: 1 }, dv: dvS, cfs: [{ ref: `${colL(cE)}${r0}:${colL(cE)}${r1}`, type: 'expression', dxf: 0, f: [`${colL(cE)}${r0}="No"`] }] }) }); }
    // B3: data queries: a question on a cell, its answer and its status
    if (XL.queries) { const Nq = 300, q0 = 5, q1 = q0 + Nq - 1, head = ['Query no.', 'Date raised', 'Patient ID', 'Column', 'Value in the sheet', 'Question', 'Raised by', 'Answer / correction', 'Answered by', 'Date answered', 'Status'];
      const rowsQ = [[{ v: `${D.title || 'Study'} — data queries`, s: 3 }], ['Open', { f: `COUNTIF(K${q0}:K${q1},"Open")` }, 'Closed', { f: `COUNTIF(K${q0}:K${q1},"Closed")` }], ['One row per query: the monitor or data manager asks, the site answers (and corrects the Data sheet), then the query is closed.'], head.map(v => ({ v, s: 1 }))];
      for (let i = 0; i < Nq; i++) rowsQ.push([`Q${String(i + 1).padStart(3, '0')}`, ...Array(10).fill(null)]);
      const idRef = M ? `Data!$A$3:$A$${M.last}` : null;
      const dvQ = [{ type: 'date', op: 'between', ref: `B${q0}:B${q1}`, f1: 1, f2: 2958465, errTitle: 'A date', err: 'A date', pTitle: 'Date raised', prompt: 'Date the query was raised' }, { type: 'date', op: 'between', ref: `J${q0}:J${q1}`, f1: 1, f2: 2958465, errTitle: 'A date', err: 'A date', pTitle: 'Date answered', prompt: 'Date answered' },
        { type: 'list', ref: `K${q0}:K${q1}`, f1: '"Open,Answered,Closed"', errTitle: 'Status', err: 'Open / Answered / Closed', pTitle: 'Status', prompt: 'Open / Answered / Closed' }, ...(idRef ? [{ type: 'list', ref: `C${q0}:C${q1}`, f1: idRef, errTitle: 'Patient ID', err: 'An ID of the Data sheet', pTitle: 'Patient ID', prompt: 'Choose the ID' }] : [])];
      sheets.push({ name: 'Queries', xml: sheetXml(rowsQ, { widths: [10, 12, 12, 22, 16, 40, 12, 36, 12, 13, 11], freeze: { r: 4, c: 1 }, dv: dvQ, cfs: [{ ref: `A${q0}:K${q1}`, type: 'expression', dxf: 1, f: [`$K${q0}="Open"`] }, { ref: `A${q0}:K${q1}`, type: 'expression', dxf: 2, f: [`$K${q0}="Closed"`] }] }) }); }
    // codebook, instructions, randomisation, lists and the setup for the analysis
    const cb = [['Column', 'Label', 'Section', 'Type', 'Unit', 'Allowed values / range', 'Codes', 'Visit', 'Required', 'Item group', 'Definition', 'Formula', 'Asked only when', 'Normal range'].map(v => ({ v, s: 1 }))];
    cols.forEach(c => { const v = c.opt !== undefined ? { ...c.v, label: `${c.v.label}: ${c.opt}`, cats: [...YN], type: 'yn' } : calcCats(c.v) ? { ...c.v, cats: calcCats(c.v) } : c.v; cb.push([c.col, v.label, v.section, { num: 'Number', yn: 'Yes / no', cat: 'Categories', date: 'Date', time: 'Time', text: 'Text', calc: 'Calculated' }[v.type] || v.type, v.unit, v.type === 'num' || v.type === 'calc' ? (v.min !== '' || v.max !== '' ? `${v.min} to ${v.max}` : '') : v.cats.join(' / '),
      (v.type === 'cat' || v.type === 'yn') ? v.cats.map((x, i) => `${i + 1}=${x}`).join(', ') : '', c.visit ? c.visit.name : long ? (visitsOf(D, v).map(x => x.name).join(', ') || 'all') : '', v.required ? 'Yes' : '', v.group || '', v.definition || '', v.type === 'calc' && v.formula ? { bmi: 'Weight / (height in m)²', days: 'Days between the two dates', age: 'Completed years between the dates', change: 'Last visit − first visit', sum: 'Sum of items', mean: 'Mean of items' }[v.formula.kind] || (FK[v.formula.kind] || {}).name || '' : '', whenTxt(D, v), v.refLo !== undefined && v.refLo !== '' || v.refHi !== undefined && v.refHi !== '' ? `${v.refLo ?? ''} to ${v.refHi ?? ''}` : '']); });
    // repeating forms: a sheet each, one row per event (several rows per patient), linked by the patient ID
    (D.repeat || []).forEach(sec => { const vs = D.vars.filter(v => v.section === sec); if (!vs.length) return; const head = ['ID', 'No.', ...vs.map(v => baseName(D, v))], rowsR = [[{ v: `${sec} — one row per event (several rows for a patient; keep the patient's ID)`, s: 3 }], head.map(v => ({ v, s: 1 }))];
      for (let r = 0; r < 3; r++) rowsR.push([ids[r] || null, 1, ...vs.map(() => null)]); const last = 2 + 600, dvR = [];
      vs.forEach((v, j) => { const k = j + 2, ref = `${colL(k)}3:${colL(k)}${last}`; if ((v.type === 'cat' || v.type === 'yn') && listOf[v.id] !== undefined) dvR.push({ type: 'list', ref, f1: `Lists!$${colL(listOf[v.id])}$1:$${colL(listOf[v.id])}$${listCols[listOf[v.id]].length}`, pTitle: v.label.slice(0, 32), prompt: (D.conv.catAs === 'codes' ? v.cats.map((x, i) => `${i + 1} = ${x}`) : v.cats).join(' / ') });
        if (v.type === 'date') dvR.push({ type: 'date', op: 'between', ref, f1: 1, f2: 2958465, pTitle: v.label.slice(0, 32), prompt: `A date, ${D.conv.date}` });
        if (v.type === 'num' && v.min !== '' && v.max !== '') dvR.push({ type: 'decimal', op: 'between', ref, f1: +v.min, f2: +v.max, errTitle: 'Out of range', err: `${v.label}: ${v.min} to ${v.max}`, pTitle: v.label.slice(0, 32), prompt: `${v.min} to ${v.max}` }); });
      dvR.push({ type: 'list', ref: `A3:A${last}`, f1: `Data!$A$3:$A$${Math.max(3, n + 2)}`, errTitle: 'Patient ID', err: 'An ID of the Data sheet', pTitle: 'Patient ID', prompt: 'The patient (from the Data sheet)' });
      sheets.push({ name: sec.slice(0, 31), xml: sheetXml(rowsR, { widths: [12, 6, ...vs.map(v => Math.min(28, Math.max(10, baseName(D, v).length + 2)))], freeze: { r: 2, c: 1 }, dv: dvR }) }); });
    sheets.push({ name: 'Codebook', xml: sheetXml(cb, { widths: [22, 26, 16, 12, 10, 26, 26, 12, 9, 16, 40, 26, 26, 14], freeze: { r: 1, c: 0 } }) });
    const ins = [[{ v: D.title || 'Master sheet', s: 3 }], ...(fill && fill.simulated ? [[{ v: `SIMULATED DATA — generated ${fill.simulated.at} (seed ${fill.simulated.seed}${fill.simulated.code ? `, dataset code ${fill.simulated.code}` : ''}). Not real patients.`, s: 3 }, '']] : []), ['How to fill this sheet', ''],
      ['1', 'One row per patient' + (long ? ' and visit' : '') + '. Keep the ID; do not change the column names in row 2 (row 1 shows the sections).'],
      ['2', 'Choose categories from the drop-down list; numbers outside the allowed range are refused or highlighted in red.'],
      ['3', `Missing values: ${D.conv.missing === '999' ? 'type 999' : 'leave the cell empty'}. Dates: ${D.conv.date}.`],
      ['4', 'Grey columns are calculated by Excel — do not type in them.'],
      ['5', 'Cells highlighted in yellow break a rule between columns (e.g. discharge before admission).'],
      ...(D.double ? [['6', 'Double entry: a second person types the same forms in “Entry 2”; the “Compare” sheet marks every difference (≠).']] : []),
      ...(rand ? [['7', `The allocation of each patient is in “Randomisation” (${D.rand.type === 'simple' ? 'simple' : `blocks of ${D.rand.sizes}`}, seed ${D.rand.seed}). Allocate in order and do not skip numbers.`]] : []),
      ...(XL.dash ? [['9', '“Dashboard” shows the patients entered, those complete, duplicated IDs, rule breaks and the % filled of each column and visit; “Filled” and “Missing_required” (yellow when a required value is missing) are at the end of each row.']] : []),
      ...(XL.view && !long ? [['10', '“Patient” shows one patient at a time: choose the ID in B1.']] : []),
      ...(dataMap && dataMap.all.some(c => c.helper === 'due') ? [['11', 'The “Due_” columns give the date of each visit from the anchor date: red when it is overdue (past its window and still empty); a visit date outside its window is yellow.']] : []),
      ...(XL.protect ? [['12', `The Data sheet is protected: only the entry columns can be typed in${XL.pw ? ' (password kept by the study team)' : ' (Review › Unprotect sheet)'}.`]] : []),
      ...(D.blind ? [['13', 'The groups are blinded (Group A, Group B …): the key is kept apart, by the study statistician.']] : []),
      ...(D.vars.some(v => whenParent(D, v)) ? [['8', `Grey cells are not asked for this patient: ${D.vars.filter(v => whenParent(D, v)).map(v => `${v.label} only when ${whenTxt(D, v)}`).join('; ')}.`]] : []),
      ['', ''], ['Upload this file to Prof MSE Easy Stat: the setup (labels, units, groups, visits and categories) is read from it.', '']];
    sheets.push({ name: 'Instructions', xml: sheetXml(ins, { widths: [6, 110] }) });
    if (rand) { const rr = [['Stratum', 'No.', 'Allocation', 'Patient ID', 'Date', 'Initials'].map(v => ({ v, s: 1 }))]; rand.forEach((s, si) => s.list.forEach((a, i) => rr.push([s.stratum, i + 1, armOf(a), rand.length === 1 ? ids[i] : hasSite && rand.length === sites.length ? ids[si * per + i] ?? null : null, null, null]))); sheets.push({ name: 'Randomisation', xml: sheetXml(rr, { widths: [30, 6, 16, 12, 12, 10], freeze: { r: 1, c: 0 } }) }); }
    sheets.push({ name: 'Lists', hidden: true, xml: sheetXml(listsRows, {}) });
    const setup = JSON.stringify({ ...setupFor(D), ...(fill && fill.simulated ? { simulated: fill.simulated, targets: fill.targets || null } : {}) }), chunks = []; for (let k = 0; k < setup.length; k += 30000) chunks.push([setup.slice(k, k + 30000)]);
    sheets.push({ name: '_EasyStatSetup', hidden: true, xml: sheetXml(chunks, {}) });
    return xlsxBlob(sheets);
  }
  // what the analysis needs to know about every column
  // the options of the Excel file (Export tab)
  // usual adult reference values by sex (conventional units); laboratories differ, so they are offered, not imposed
  const SEXREF = [[/ha?emoglobin|\bHb\b/i, [13.5, 17.5], [12, 15.5]], [/ha?ematocrit|\bHct\b/i, [41, 50], [36, 44]], [/creatinine/i, [0.74, 1.35], [0.59, 1.04]], [/ferritin/i, [24, 336], [11, 307]], [/uric/i, [3.4, 7], [2.4, 6]]];
  const xlOpts = D => ({ dash: true, ids: true, view: true, log: false, protect: false, pw: '', screen: false, queries: false, recruit: false, ...(D.xl || {}) });
  // B5: normal ranges by sex and age: the rules of a number, and the design's sex and age variables
  const refRules = (D, v) => (v.refBy || []).filter(x => x && ((x.lo !== '' && x.lo !== undefined) || (x.hi !== '' && x.hi !== undefined)));
  const refSexAge = D => ({ sex: D.vars.find(x => /^(sex|gender)\b/i.test(x.label) && (x.type === 'cat' || x.type === 'yn')), age: D.vars.find(x => /^age\b/i.test(x.label) && (x.type === 'num' || x.type === 'calc')) });
  function setupFor(D) {
    const cols = columns(D), long = D.layout === 'long';
    const XL = xlOpts(D), ar = D.arms.filter(Boolean), helpers = [...(XL.dash ? ['Filled', 'Missing_required'] : []), ...(XL.log ? ['Entered_by', 'Entry_date', 'Checked_by', 'Verified'] : []), ...D.visits.map(x => `Due_${tagOf(x.name)}`)];
    return { app: 'ProfMSE-EasyStat-mastersheet', version: 1, title: D.title, design: D.design, groupCol: ar.length >= 2 ? 'Group' : '', idCol: 'ID', arms: D.blind ? ar.map((_, i) => `Group ${String.fromCharCode(65 + i)}`) : D.arms, blind: !!D.blind, siteCol: (D.sites || []).filter(x => x && x.name).length ? 'Site' : '', helperCols: helpers, layout: D.layout, catAs: D.conv.catAs, missing: D.conv.missing,
      visits: D.visits.map(x => ({ tag: tagOf(x.name), name: x.name })),
      sampleSize: (r => r && !r.err ? r.text : '')(ssCalc(D)),
      plan: (r => r && !r.err && r.v ? { label: r.v.label, num: !!r.num, a: r.a, b: r.b, sd: r.sd, alpha: r.alpha, power: r.power, drop: r.drop, n: r.total, enrol: r.enrol } : undefined)(ssCalc(D)),
      vars: D.vars.flatMap(v => { const rb = refRules(D, v), SA = refSexAge(D), colOf = x => x ? (columns(D).find(c => c.v.id === x.id && (!c.visit || c.visit.id === D.visits[0].id)) || {}).col : undefined;
        const base = { unit: v.unit, role: v.role, definition: v.definition, section: v.section, when: whenTxt(D, v) || undefined, refLo: v.refLo, refHi: v.refHi, ...(v.type === 'num' && (v.min !== '' || v.max !== '') ? { min: v.min, max: v.max } : {}), ...(rb.length ? { refBy: rb, refSexCol: colOf(SA.sex), refAgeCol: colOf(SA.age), refSexCats: SA.sex ? SA.sex.cats : undefined } : {}) },
        colsOf = o => long ? [{ col: o === undefined ? baseName(D, v) : `${baseName(D, v)}_${tagOf(o)}` }] : cols.filter(c => c.v.id === v.id && c.opt === o).map(c => ({ col: c.col, visit: c.visit ? tagOf(c.visit.name) : '', visitName: c.visit ? c.visit.name : '' }));
        if (v.type === 'multi') return v.cats.map((o, i) => ({ ...base, id: `${v.id}_${i}`, label: `${v.label}: ${o}`, type: 'yn', cats: [...YN], group: v.group || v.label, cols: colsOf(o) }));
        const cc = calcCats(v); return [{ ...base, id: v.id, label: v.label, type: cc ? 'cat' : v.type, cats: cc || v.cats, words: cc ? true : undefined, group: v.group, cols: colsOf(undefined) }]; }) };
  }

  /* ---------- case report form (Word) ---------- */
  async function buildCrf(D, raw) {
    const d = window.docx, { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } = d, kids = [];
    const order = secOrder(D), font = 'Calibri';
    const P = (t, o = {}) => new Paragraph({ spacing: { after: o.after ?? 60 }, alignment: o.align, children: [new TextRun({ text: t, bold: o.bold, size: o.size || 21, font, color: o.color })] });
    const answer = v => v.type === 'multi' ? v.cats.map(c => `☐ ${c}`).join('     ') + '   (tick all that apply)' : v.type === 'cat' || v.type === 'yn' ? v.cats.map(c => `☐ ${c}`).join('     ') : v.type === 'date' ? '__ __ / __ __ / __ __ __ __' : v.type === 'time' ? '__ __ : __ __' : v.type === 'calc' ? '(calculated)' : `_____________${v.unit ? ' ' + v.unit : ''}${v.min !== '' && v.max !== '' ? `   (${v.min}–${v.max})` : ''}`;
    const cell = (t, w, b) => new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, children: [P(t, { bold: b, after: 0 })] });
    kids.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun({ text: D.title || 'Case report form', bold: true, size: 32, font })] }));
    kids.push(P(`Patient ID: ______________     ${D.arms.filter(Boolean).length >= 2 ? `Group: ${D.arms.map(a => `☐ ${a}`).join('   ')}` : ''}     Date: __ / __ / ____`, { after: 200 }));
    order.forEach(sec => { const vs = D.vars.filter(v => v.section === sec); if (!vs.length) return;
      kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: sec, bold: true, size: 26, font })] }));
      const once = vs.filter(v => visitsOf(D, v).length <= 1), rep = vs.filter(v => visitsOf(D, v).length > 1);
      if (once.length) kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: once.map(v => new TableRow({ children: [cell((whenParent(D, v) ? '↳ ' : '') + v.label + (v.unit && v.type !== 'num' ? ` (${v.unit})` : '') + (v.required ? ' *' : '') + (whenParent(D, v) ? ` (if ${whenTxt(D, v)})` : ''), 38, true), cell(answer(v), 62)] })) }));
      if (rep.length) { const vis = [...new Set(rep.flatMap(v => visitsOf(D, v).map(x => x.id)))].map(id => D.visits.find(x => x.id === id)), w = Math.floor(62 / vis.length);
        kids.push(P('', { after: 60 }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [cell('', 38, true), ...vis.map(x => cell(x.name, w, true))] }),
          ...rep.map(v => new TableRow({ children: [cell(v.label + (v.unit ? ` (${v.unit})` : '') + (whenParent(D, v) ? ` (if ${whenTxt(D, v)})` : ''), 38, true), ...vis.map(x => cell((v.visits || []).includes(x.id) ? (v.type === 'cat' || v.type === 'yn' || v.type === 'multi' ? v.cats.map(c => `☐ ${c}`).join('  ') : '') : '—', w))] }))] })); }
      const defs = vs.filter(v => v.definition); if (defs.length) kids.push(P(defs.map(v => `${v.label}: ${v.definition}`).join(' · '), { size: 18, color: '555555', after: 120 })); });
    kids.push(P(''), P('Investigator: ____________________     Signature: ____________     Date: __ / __ / ____', { after: 0 }));
    if (raw) return kids;
    return Packer.toBlob(new Document({ creator: 'Prof MSE Easy Stat', title: (D.title || 'CRF') + ' — case report form', sections: [{ properties: { page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } } }, children: kids }] }));
  }

  /* ---------- REDCap data dictionary ---------- */
  function redcap(D) {
    const head = ['Variable / Field Name', 'Form Name', 'Section Header', 'Field Type', 'Field Label', 'Choices, Calculations, OR Slider Labels', 'Field Note', 'Text Validation Type OR Show Slider Number', 'Text Validation Min', 'Text Validation Max', 'Identifier?', 'Branching Logic (Show field only if...)', 'Required Field?', 'Custom Alignment', 'Question Number (surveys only)', 'Matrix Group Name', 'Matrix Ranking?', 'Field Annotation'];
    const rc = s => String(s).toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/^_+|_+$/g, '').replace(/^(\d)/, 'v$1').slice(0, 26), rows = [head], q = s => /[",\n]/.test(String(s)) ? `"${String(s).replace(/"/g, '""')}"` : String(s);
    rows.push(['record_id', 'master_sheet', '', 'text', 'Patient ID', '', '', '', '', '', 'y', '', 'y', '', '', '', '', '']);
    if (D.arms.filter(Boolean).length >= 2) rows.push(['group', 'master_sheet', '', 'radio', 'Group', D.arms.map((a, i) => `${i + 1}, ${a}`).join(' | '), '', '', '', '', '', '', 'y', '', '', '', '', '']);
    const allC = columns(D), branch = c => { const p = whenParent(D, c.v); if (!p) return ''; const pc = allC.find(x => x.v.id === p.id && (x.visit && x.visit.id) === (c.visit && c.visit.id)) || allC.find(x => x.v.id === p.id); if (!pc) return '';
      const code = p.type === 'yn' ? (/^yes$/i.test(c.v.when.cat) ? 1 : 0) : p.cats.indexOf(c.v.when.cat) + 1; return `[${rc(pc.col)}] = '${code}'`; };
    let lastSec = ''; allC.forEach(c => { const v = c.v; if (c.opt !== undefined && c.opt !== v.cats[0]) return; const sec = v.section !== lastSec ? v.section : ''; lastSec = v.section;
      if (v.type === 'multi') { rows.push([rc(`${baseName(D, v)}${c.visit ? '_' + tagOf(c.visit.name) : ''}`), 'master_sheet', sec, 'checkbox', v.label + (c.visit ? ` — ${c.visit.name}` : ''), v.cats.map((x, i) => `${i + 1}, ${x}`).join(' | '), 'Tick all that apply', '', '', '', '', branch(c), v.required ? 'y' : '', '', '', '', '', '']); return; }
      const type = v.type === 'yn' ? 'yesno' : v.type === 'cat' ? 'radio' : v.type === 'calc' ? 'text' : 'text', val = v.type === 'num' ? (String(v.dec) === '0' ? 'integer' : 'number') : v.type === 'date' ? (D.conv.date.startsWith('mm') ? 'date_mdy' : D.conv.date.startsWith('yyyy') ? 'date_ymd' : 'date_dmy') : v.type === 'time' ? 'time' : '';
      rows.push([rc(c.col), 'master_sheet', sec, type, v.label + (c.visit ? ` — ${c.visit.name}` : ''), v.type === 'cat' ? v.cats.map((x, i) => `${i + 1}, ${x}`).join(' | ') : '', [v.unit, v.definition, v.type === 'calc' ? 'calculated in Excel' : ''].filter(Boolean).join(' · '), val, v.type === 'num' ? v.min : '', v.type === 'num' ? v.max : '', '', branch(c), v.required ? 'y' : '', '', '', '', '', '']); });
    return new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' });
  }

  /* ---------- the workspace ---------- */
  let D = ls.get('current', null) || fromTemplate('rct2'), tab = 'study', sel = null, libQ = '', pasteOpen = false, pasteTxt = '', varQ = '', varF = '', bulk = new Set();
  // undo / redo: a snapshot before each change (typing in one field is one step)
  let undoS = [], redoS = [], lastT = 0, prevJ = JSON.stringify(D);
  const save = () => { const j = JSON.stringify(D), now = Date.now(); if (j !== prevJ) { if (now - lastT > 800) { undoS.push(prevJ); if (undoS.length > 80) undoS.shift(); redoS = []; } lastT = now; prevJ = j; } ls.set('current', D); };
  function undo(back) { const from = back ? undoS : redoS, to = back ? redoS : undoS; if (!from.length) { toast(back ? 'Nothing to undo' : 'Nothing to redo'); return; } to.push(JSON.stringify(D)); D = JSON.parse(from.pop()); prevJ = JSON.stringify(D); lastT = 0; ls.set('current', D); if (sel && !D.vars.some(v => v.id === sel)) sel = null; render(); }
  const TABS = [['study', '1 · Study'], ['visits', '2 · Groups & visits'], ['vars', '3 · Variables'], ['rules', '4 · Rules'], ['preview', '5 · Preview'], ['export', '6 · Export']];
  const TYPES = [['num', 'Number'], ['yn', 'Yes / no'], ['cat', 'Categories'], ['multi', 'Tick all that apply (several answers)'], ['date', 'Date'], ['time', 'Time'], ['text', 'Text'], ['calc', 'Calculated (Excel formula)']];
  /* ---------- the three phases: 🧱 Build · 🎲 Generate · 📊 Analyse ---------- */
  const PHASES = [['build', '🧱 Build the master sheet'], ['generate', '🎲 Generate the data'], ['analyse', '📊 Analyse (Easy Stat)']];
  let phase = 'analyse';
  function setPhase(ph) {
    phase = ph; const h = document.documentElement; PHASES.forEach(([k]) => h.classList.toggle('ph-' + k, k === ph));
    document.querySelectorAll('[data-phase]').forEach(b => b.classList.toggle('on', b.dataset.phase === ph));
    if (ph === 'build') { const w = $('#mbWrap'); if (!w.dataset.wired) { w.dataset.wired = 1; w.addEventListener('input', onInput); w.addEventListener('change', onChange); w.addEventListener('click', onClick); } render(); }
    if (ph === 'generate' && window.EasyGen) window.EasyGen.render();
    try { localStorage.setItem('mb.phase', ph); } catch (e) { /* none */ }
    window.scrollTo({ top: 0 });
  }
  const main = document.querySelector('main');
  if (main) { const bar = document.createElement('div'); bar.className = 'phase-bar'; bar.id = 'phaseBar';
    bar.innerHTML = PHASES.map(([k, l], i) => `${i ? '<span class="phase-arrow">›</span>' : ''}<button type="button" class="phase-btn" data-phase="${k}">${l}</button>`).join('');
    main.prepend(bar); const w = document.createElement('div'); w.id = 'mbWrap'; w.className = 'mb-wrap'; bar.after(w); const g = document.createElement('div'); g.id = 'genWrap'; g.className = 'mb-wrap'; w.after(g);
    bar.addEventListener('click', e => { const b = e.target.closest('[data-phase]'); if (b) setPhase(b.dataset.phase); }); }
  const open = () => setPhase('build'), close = () => setPhase('analyse');
  const opt = (list, cur) => list.map(([k, l]) => `<option value="${esc(k)}" ${String(cur) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('');
  function render() {
    const w = $('#mbWrap'); if (!w) return; const pr = problems(D);
    w.innerHTML = `<div class="mb-head"><b>🧱 Master sheet builder</b><span class="legend-note">${esc(D.title || 'Untitled study')} · ${D.vars.length} variables · ${columns(D).length} columns</span><span class="spacer"></span>
      <select id="mbTpl" style="width:auto"><option value="">New from template…</option>${['Anaesthesia and pain', 'Surgery', 'Trials', 'Observational', 'Diagnostic'].map(c => `<optgroup label="${c}">${opt(Object.entries(TEMPLATES).filter(([, t]) => (t.cat || 'Trials') === c).map(([k, t]) => [k, t.name]), '')}</optgroup>`).join('')}<option value="__blank">Empty design</option></select>
      <select id="mbMine" style="width:auto"><option value="">My designs…</option>${opt(Object.keys(ls.get('designs', {})).map(k => [k, k]), '')}</select>
      <button class="btn ghost small" id="mbUndo" type="button" title="Undo (Ctrl+Z)" ${undoS.length ? '' : 'disabled'}>↶</button><button class="btn ghost small" id="mbRedo" type="button" title="Redo (Ctrl+Y)" ${redoS.length ? '' : 'disabled'}>↷</button>
      <label class="btn ghost small" style="margin:0" title="Make the design from a REDCap data dictionary (.csv) or an XLSForm of KoBoToolbox / ODK (.xlsx)">⬆ From REDCap / XLSForm<input type="file" id="mbFromDict" accept=".csv,.xlsx,.xls" hidden></label>
      <label class="btn ghost small" style="margin:0" title="Make the design from a sheet you already have: its columns, types, categories, ranges, visits (from suffixes such as _Baseline, _M3), groups — and its values as the expected values">⬆ From an existing sheet<input type="file" id="mbFromSheet" accept=".xlsx,.xls,.xlsm,.csv,.txt" hidden></label>
      <button class="btn ghost small" id="mbSaveAs" type="button">💾 Save design</button><button class="btn ghost small" id="mbExportJson" type="button" title="The design as a file, to share or keep">⬇ Design file</button><label class="btn ghost small" style="margin:0">⬆ Open design<input type="file" id="mbImportJson" accept=".json" hidden></label>
      <button class="btn primary small" id="mbClose" type="button" title="Phase 2: fill the sheet with simulated patients">🎲 Generate the data ›</button></div>
      <div class="mb-tabs">${TABS.map(([k, l]) => `<button type="button" class="mb-tab ${tab === k ? 'on' : ''}" data-mbtab="${k}">${l}${k === 'preview' && pr.length ? ` <span class="chip warn">${pr.length}</span>` : ''}</button>`).join('')}</div>
      <div class="mb-body">${({ study: tStudy, visits: tVisits, vars: tVars, rules: tRules, preview: tPreview, export: tExport })[tab]()}</div>`;
  }
  const tStudy = () => ext('studyTop') + `<div class="grid g3">
      <div style="grid-column:span 2"><label class="f">Study title</label><input type="text" data-mb="title" value="${esc(D.title)}" placeholder="e.g. Ozone injection versus steroid for shoulder pain: a randomised trial"></div>
      <div><label class="f">Design</label><select data-mb="design">${opt([['rct', 'Randomised controlled trial'], ['cohort', 'Cohort'], ['casecontrol', 'Case-control'], ['cross', 'Cross-sectional'], ['diagnostic', 'Diagnostic accuracy'], ['beforeafter', 'One group, before and after']], D.design)}</select></div>
      <div><label class="f">Planned number of patients (rows)</label><input type="number" min="1" max="20000" data-mb="n" value="${esc(D.n)}"></div>
      <div><label class="f">Patient ID: prefix</label><input type="text" data-mb="idPrefix" value="${esc(D.idPrefix)}" style="width:90px"></div>
      <div><label class="f">Patient ID: digits</label><input type="number" min="1" max="8" data-mb="idDigits" value="${esc(D.idDigits)}" style="width:90px"> <span class="legend-note">e.g. ${esc(D.idPrefix)}${'0'.repeat(Math.max(0, (+D.idDigits || 3) - 1))}1</span></div></div>
    <h3>Conventions</h3><div class="grid g4">
      <div><label class="f">Column names</label><select data-mbc="naming">${opt([['label', 'Age_years, BMI_kg_m2'], ['lower', 'age_years, bmi_kg_m2'], ['camel', 'AgeYears, BmiKgM2']], D.conv.naming)}</select></div>
      <div><label class="f">Categories are typed as</label><select data-mbc="catAs">${opt([['words', 'Words (Male, Female)'], ['codes', 'Codes (1, 2) with a codebook']], D.conv.catAs)}</select></div>
      <div><label class="f">Missing values</label><select data-mbc="missing">${opt([['blank', 'Empty cell'], ['999', 'Code 999 (numbers)']], D.conv.missing)}</select></div>
      <div><label class="f">Dates</label><select data-mbc="date">${opt([['dd/mm/yyyy', 'dd/mm/yyyy'], ['mm/dd/yyyy', 'mm/dd/yyyy'], ['yyyy-mm-dd', 'yyyy-mm-dd']], D.conv.date)}</select></div></div>
    <h3>Layout</h3><div class="grid g3"><div><label class="f">Rows</label><select data-mb="layout">${opt([['wide', 'One row per patient (visits as columns)'], ['long', 'One row per visit (patient × visit)'], ['sheets', 'One sheet per visit']], D.layout)}</select></div>
      <div><label class="check" style="margin-top:22px"><input type="checkbox" data-mb="double" ${D.double ? 'checked' : ''}><span><b>Double data entry</b> — a second entry sheet and a sheet marking every difference</span></label></div></div>${ssBox()}`;
  function ssBox() {
    const s = ssDef(D), r = ssCalc(D), vs = ssOutcomes(D), v = r && r.v, arms = D.arms.filter(Boolean), paired = arms.length < 2 && D.visits.length > 1, m = s.m || 'auto';
    const mSel = `<div><label class="f">Method</label><select data-mbs="m" style="width:auto">${opt(SS_METHODS, m)}</select></div>`;
    if (m !== 'auto') { const inpT = (k, lab, ph, w = 110) => `<div><label class="f">${lab}</label><input type="${k === 'means' ? 'text' : 'number'}" step="any" data-mbs="${k}" value="${esc(s[k] ?? '')}" placeholder="${esc(ph)}" style="width:${w}px"></div>`;
      const f = { anova: inpT('means', 'Means of the groups', '5, 6, 7', 140) + inpT('sd', 'SD', '2', 80),
        noninf: `<div><label class="f">Outcome</label><select data-mbs="nik" style="width:auto">${opt([['m', 'A number (means)'], ['p', 'Success (%)']], s.nik || 'm')}</select></div>` + (s.nik === 'p' ? inpT('p', 'Expected success %', '80', 90) + inpT('margin', 'Margin (percentage points)', '10', 90) : inpT('sd', 'SD', '10', 80) + inpT('margin', 'Margin', '5', 80) + inpT('d0', 'True difference', '0', 80)),
        survival: inpT('hr', 'Hazard ratio', '0.7', 80) + inpT('pev', '% with the event', '40', 80), corr: inpT('r', 'Expected r', '0.3', 80), oneprop: inpT('p', 'Expected %', '50', 80) + inpT('margin', '± margin (points)', '5', 80),
        mcnemar: inpT('a', '% yes before', '30', 80) + inpT('b', '% yes after', '15', 80) + inpT('pd', '% discordant pairs', 'auto', 90) }[m] || '';
      return `<h3>Sample size</h3><div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end">${mSel}${f}
        <div><label class="f">Significance${m === 'noninf' ? ' (one-sided)' : ''}</label><select data-mbs="alpha" style="width:auto">${opt([[0.05, '0.05'], [0.025, '0.025'], [0.01, '0.01'], [0.1, '0.10']], s.alpha)}</select></div>
        ${m === 'oneprop' ? '' : `<div><label class="f">Power</label><select data-mbs="power" style="width:auto">${opt([[0.8, '80%'], [0.85, '85%'], [0.9, '90%'], [0.95, '95%']], s.power)}</select></div>`}
        <div><label class="f">Dropout %</label><input type="number" min="0" max="90" data-mbs="drop" value="${esc(s.drop)}" style="width:70px"></div></div><div id="mbSsOut" class="mb-ss">${ssOut(r)}</div>`; }
    const num = v && (v.type === 'num' || v.type === 'calc'), inp = (k, lab, ph, w = 100) => `<div><label class="f">${lab}</label><input type="number" step="any" data-mbs="${k}" value="${esc(s[k])}" placeholder="${esc(ph ?? '')}" style="width:${w}px"></div>`;
    return `<h3>Sample size</h3><p class="legend-note">From the main outcome and its expected values (step 3) — ${paired ? 'one group, before and after (paired t-test)' : 'two groups (t-test for a number, Chi-square for yes/no)'}.</p>
      <div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end">${mSel}<div><label class="f">Main outcome</label><select data-mbs="v" style="width:auto">${opt([['', v && !s.v ? `${v.label} (primary)` : '—'], ...vs.map(x => [x.id, x.label + (x.role === 'primary' ? ' (primary)' : '')])], s.v)}</select></div>
      ${v ? (num ? inp('a', paired ? 'Mean before' : `Mean in ${esc(arms[0] || 'group 1')}`, r && r.a) + inp('b', paired ? 'Mean after' : `Mean in ${esc(arms[1] || 'group 2')}`, r && r.b) + inp('sd', paired ? 'SD of the change' : 'SD', r && r.sd, 80)
        : inp('a', `% ${esc(v.cats[0])} in ${esc(arms[0] || 'group 1')}`, r && r.a) + inp('b', `% ${esc(v.cats[0])} in ${esc(arms[1] || 'group 2')}`, r && r.b)) : ''}
      <div><label class="f">Significance</label><select data-mbs="alpha" style="width:auto">${opt([[0.05, '0.05'], [0.01, '0.01'], [0.1, '0.10']], s.alpha)}</select></div>
      <div><label class="f">Power</label><select data-mbs="power" style="width:auto">${opt([[0.8, '80%'], [0.85, '85%'], [0.9, '90%'], [0.95, '95%']], s.power)}</select></div>
      <div><label class="f">Dropout %</label><input type="number" min="0" max="90" data-mbs="drop" value="${esc(s.drop)}" style="width:70px"></div>
      ${paired ? '' : `<div><label class="f">Ratio ${esc(arms[1] || '2')} : ${esc(arms[0] || '1')}</label><input type="number" min="0.2" max="5" step="0.5" data-mbs="ratio" value="${esc(s.ratio)}" style="width:70px"></div>`}</div>
      <div id="mbSsOut" class="mb-ss">${ssOut(r)}</div>`;
  }
  function ssOut(r) {
    if (!r) return '<span class="legend-note">Mark the primary outcome (Role, step 3) or choose it here.</span>';
    if (r.err) return `<span class="legend-note">${esc(r.err)}</span>`;
    return `<div class="row" style="gap:14px;align-items:baseline;flex-wrap:wrap"><span class="pbig">${r.events ? `${r.events} events · ${r.total} patients` : r.one || r.paired ? `n = ${r.total}` : r.per || r.n1 === r.n2 ? `${r.n1} per group · ${r.total} in total` : `${r.n1} + ${r.n2} · ${r.total} in total`}</span><span><b>${r.enrol}</b> to enrol${r.drop ? ` (with ${r.drop}% dropout)` : ''}</span>
      <button class="btn ${+D.n === r.enrol ? 'ghost' : 'primary'} small" type="button" id="mbSsUse" ${+D.n === r.enrol ? 'disabled' : ''}>${+D.n === r.enrol ? '✓ The planned number' : `Use ${r.enrol} as the planned number`}</button><button class="btn ghost small" type="button" id="mbSsCopy">📋 Copy the paragraph</button></div>
      <p class="legend-note" style="margin-top:6px">${esc(r.text)}</p>`;
  }
  const tVisits = () => `<h3 style="margin-top:0">Study groups (arms)</h3><p class="legend-note">Leave one or none for a one-group study.</p>
    <div class="mb-list">${D.arms.map((a, i) => `<div class="row" style="gap:6px"><input type="text" data-mbarm="${i}" value="${esc(a)}" style="max-width:260px"><button class="btn ghost small" type="button" data-mbarmdel="${i}">✕</button></div>`).join('')}<button class="btn ghost small" type="button" id="mbArmAdd">+ Group</button></div>
    <h3>Visits</h3><p class="legend-note">Each variable is collected once (at the first visit) unless you tick other visits for it in step 3.</p>
    <div class="mb-list">${D.visits.map((x, i) => `<div class="row" style="gap:6px"><input type="text" data-mbvis="${i}" value="${esc(x.name)}" style="max-width:220px"><span class="legend-note">column suffix _${esc(tagOf(x.name))}</span>${i ? `<span class="legend-note">day</span><input type="number" min="0" data-mbvday="${i}" value="${esc(x.day ?? '')}" placeholder="e.g. 90" style="width:74px" title="Days after the anchor date (for the due date and its window)"><span class="legend-note">±</span><input type="number" min="0" data-mbvtol="${i}" value="${esc(x.tol ?? '')}" placeholder="7" style="width:60px" title="Window, in days">` : '<span class="legend-note">day 0</span>'}${i ? `<button class="btn ghost small" type="button" data-mbvismove="${i}" title="Earlier">↑</button>` : ''}<button class="btn ghost small" type="button" data-mbvisdel="${i}">✕</button></div>`).join('')}<button class="btn ghost small" type="button" id="mbVisAdd">+ Visit</button></div>
    ${D.visits.length > 1 ? `<div class="row" style="gap:8px;margin-top:6px;align-items:center"><span class="legend-note">Anchor date of the visit days</span><select data-mbanchor="1" style="width:auto">${opt([['', '— none —'], ...D.vars.filter(v => v.type === 'date').map(v => [v.id, v.label])], D.anchor || '')}</select><span class="legend-note">${D.vars.some(v => v.type === 'date') ? 'Excel then gives each visit’s due date, red when overdue.' : 'Add a date (e.g. Date of randomisation) to use it.'}</span></div>` : ''}
    <h3>Sites</h3><p class="legend-note">For a multi-centre study: a Site column, IDs with each site's prefix, a randomisation list per site, and a file per site if you wish.</p>
    <div class="mb-list">${(D.sites || []).map((x, i) => `<div class="row" style="gap:6px"><input type="text" data-mbsite="${i}|name" value="${esc(x.name)}" placeholder="Site name" style="max-width:220px"><span class="legend-note">ID prefix</span><input type="text" data-mbsite="${i}|prefix" value="${esc(x.prefix || '')}" style="width:80px"><span class="legend-note">e.g. ${esc(x.prefix || '')}${'0'.repeat(Math.max(0, (+D.idDigits || 3) - 1))}1</span><button class="btn ghost small" type="button" data-mbsitedel="${i}">✕</button></div>`).join('')}<button class="btn ghost small" type="button" id="mbSiteAdd">+ Site</button></div>
    <h3>Randomisation list</h3><div class="grid g4">
      <div><label class="check" style="margin-top:22px"><input type="checkbox" data-mbr="on" ${D.rand.on ? 'checked' : ''} ${D.arms.filter(Boolean).length < 2 ? 'disabled' : ''}><span><b>Make a randomisation list</b></span></label></div>
      <div><label class="f">Method</label><select data-mbr="type">${opt([['block', 'Permuted blocks'], ['simple', 'Simple (coin toss)']], D.rand.type)}</select></div>
      <div><label class="f">Block sizes</label><input type="text" data-mbr="sizes" value="${esc(D.rand.sizes)}" placeholder="4, 6"></div>
      <div><label class="f">Seed (the same seed gives the same list)</label><input type="number" data-mbr="seed" value="${esc(D.rand.seed)}"></div>
      <div style="grid-column:span 2"><label class="f">Stratified by (a list per stratum)</label><div class="row" style="gap:8px;flex-wrap:wrap">${D.vars.filter(v => (v.type === 'cat' || v.type === 'yn') && v.cats.length <= 6).map(v => `<label class="check" style="margin:0"><input type="checkbox" data-mbstrat="${v.id}" ${(D.rand.strata || []).includes(v.id) ? 'checked' : ''}><span>${esc(v.label)}</span></label>`).join('') || '<span class="legend-note">Add categorical variables first.</span>'}</div></div>
      <div><label class="check" style="margin-top:22px"><input type="checkbox" data-mbr="prefill" ${D.rand.prefill !== false ? 'checked' : ''}><span>Fill the Group column in ID order (no strata${(D.sites || []).length ? ' other than the sites' : ''})</span></label></div>
      <div><label class="check" style="margin-top:22px"><input type="checkbox" data-mb="blind" ${D.blind ? 'checked' : ''} ${D.arms.filter(Boolean).length < 2 ? 'disabled' : ''}><span><b>Blinded labels</b> — Group A, Group B … in the sheet; the key goes in a separate file (Export)</span></label></div></div>
    ${D.arms.filter(Boolean).length >= 2 ? `<h3>Minimisation</h3><div class="row" style="gap:10px;flex-wrap:wrap;align-items:center"><label class="check" style="margin:0"><input type="checkbox" data-mbmin="on" ${D.minim && D.minim.on ? 'checked' : ''}><span><b>A minimisation sheet</b> — the arm for each new patient that keeps the groups balanced on</span></label>
      ${D.vars.filter(v => (v.type === 'cat' || v.type === 'yn') && v.cats.length <= 6).map(v => `<label class="check" style="margin:0"><input type="checkbox" data-mbminf="${v.id}" ${((D.minim || {}).factors || []).includes(v.id) ? 'checked' : ''}><span>${esc(v.label)}</span></label>`).join('') || '<span class="legend-note">add categorical variables first</span>'}</div>` : ''}
    ${D.rand.on && D.arms.filter(Boolean).length >= 2 ? (() => { const r = randomisation(D); return `<p class="legend-note">${r.length} list${r.length > 1 ? 's' : ''} of ${D.n}: first allocations ${esc(r[0].list.slice(0, 12).join(', '))} … · per group ${D.arms.map(a => `${esc(a)} ${r[0].list.filter(x => x === a).length}`).join(', ')}</p>`; })() : ''}`;
  const varShown = x => { const q = varQ.trim().toLowerCase(); if (q && !(`${x.label} ${x.name || ''} ${x.section} ${x.group || ''}`.toLowerCase().includes(q))) return false;
    if (!varF) return true; if (varF === 'req') return !!x.required; if (varF === 'out') return /primary|secondary|outcome|safety/.test(x.role || ''); if (varF === 'skip') return !!whenParent(D, x); if (varF === 'calc') return x.type === 'calc';
    if (varF === 'cat') return ['cat', 'yn', 'multi'].includes(x.type); if (varF === 'num') return x.type === 'num'; if (varF.startsWith('v:')) { const id = varF.slice(2); return (x.visits || []).includes(id) || (!(x.visits || []).length && id === D.visits[0].id); } return true; };
  function tVars() {
    const order = secOrder(D), v = D.vars.find(x => x.id === sel), q = libQ.toLowerCase();
    const lib = LIB.map(([sec, list]) => [sec, list.filter(e => !q || e[0].toLowerCase().includes(q) || sec.toLowerCase().includes(q))]).filter(([, l]) => l.length);
    return `<div class="mb-vars"><div class="mb-col"><div class="row" style="gap:6px;margin-bottom:6px"><b>Variables</b><span class="spacer"></span><button class="btn ghost small" type="button" id="mbNewVar">+ New</button><button class="btn ghost small ${pasteOpen ? 'on' : ''}" type="button" id="mbPaste" title="Type or paste many variables at once">+ List</button><button class="btn ghost small" type="button" id="mbNewSec">+ Section</button></div>
      <div class="row" style="gap:4px;margin-bottom:6px"><input type="search" id="mbVarQ" value="${esc(varQ)}" placeholder="Find a variable…" style="flex:1;min-width:90px"><select id="mbVarF" style="width:auto" title="Show only">${opt([['', 'All'], ['req', 'Required'], ['out', 'Outcomes'], ['skip', 'With skip logic'], ['calc', 'Formulas'], ['cat', 'Categories'], ['num', 'Numbers'], ...D.visits.length > 1 ? D.visits.map(x => ['v:' + x.id, 'At ' + x.name]) : []], varF)}</select></div>
      ${bulk.size ? `<div class="mb-bulk"><b>${bulk.size} selected</b> <span class="legend-note">set:</span>
        <input type="text" data-mbbulk="section" list="mbSecList2" placeholder="section" style="width:110px"><datalist id="mbSecList2">${(secOrder(D)).map(x => `<option value="${esc(x)}">`).join('')}</datalist>
        ${D.visits.length > 1 ? `<select data-mbbulk="visits" style="width:auto"><option value="">visits…</option><option value="first">First visit only</option><option value="all">Every visit</option><option value="last">Last visit only</option>${D.visits.map(x => `<option value="+${x.id}">+ ${esc(x.name)}</option>`).join('')}</select>` : ''}
        <select data-mbbulk="role" style="width:auto"><option value="">role…</option>${opt([['none', 'No role'], ['baseline', 'Baseline'], ['primary', 'Primary outcome'], ['secondary', 'Secondary outcome'], ['outcome', 'Other outcome'], ['safety', 'Safety outcome']], '')}</select>
        <select data-mbbulk="required" style="width:auto"><option value="">required…</option><option value="1">Required</option><option value="0">Not required</option></select>
        <input type="text" data-mbbulk="group" placeholder="item group" style="width:110px">
        <button class="btn ghost small" type="button" id="mbBulkDel">✕ Remove</button><button class="btn ghost small" type="button" id="mbBulkClear">Clear</button></div>` : ''}
      ${pasteOpen ? `<div class="mb-paste"><textarea id="mbPasteTxt" rows="7" data-keep="1" placeholder="One variable per line, e.g.
Age
HbA1c @all
Pain score (0-10) @all
Smoking: Never / Former / Current
Readmission: Yes / No @last
Date of surgery">${esc(pasteTxt)}</textarea>
        <div class="legend-note">Names from the library are recognised (with their unit, range and categories). <b>Name (unit)</b> a number · <b>Name: A / B / C</b> categories · <b>@all</b> every visit · <b>@last</b> the last visit.</div>
        <div class="row" style="gap:6px;margin-top:4px"><button class="btn primary small" type="button" id="mbPasteGo">Add them</button><button class="btn ghost small" type="button" id="mbPasteCancel">Cancel</button></div></div>` : ''}
      ${order.map((sec, si) => { const vs = D.vars.filter(x => x.section === sec && varShown(x)); if (!vs.length && (varQ || varF)) return ''; return `<div class="mb-sec"><div class="mb-sec-h" style="border-left:5px solid #${SEC_FILL[si % SEC_FILL.length]}"><b>${esc(sec)}</b> <span class="legend-note">${vs.length}</span><span class="spacer"></span>${si ? `<button class="btn ghost small" type="button" data-mbsecup="${si}" title="Move the section up">↑</button>` : ''}<button class="btn ghost small ${(D.repeat || []).includes(sec) ? 'on' : ''}" type="button" data-mbrep="${esc(sec)}" title="A repeating form: one row per event (e.g. adverse events, medications), on its own sheet">⟳${(D.repeat || []).includes(sec) ? ' per event' : ''}</button><button class="btn ghost small" type="button" data-mbsecren="${si}" title="Rename">✎</button></div>
        ${vs.map(x => `<div class="mb-var ${x.id === sel ? 'on' : ''}" data-mbsel="${x.id}"><input type="checkbox" data-mbchk="${x.id}" ${bulk.has(x.id) ? 'checked' : ''} title="Select (to change several at once)"><span>${whenParent(D, x) ? `<span class="legend-note" title="Asked only when ${esc(whenTxt(D, x))}">↳</span> ` : ''}${x.role === 'primary' ? '<span title="Primary outcome">★</span> ' : ''}${esc(x.label)}${x.unit ? ` <span class="legend-note">(${esc(x.unit)})</span>` : ''}</span><span class="spacer"></span><span class="legend-note">${esc({ num: 'Number', yn: 'Yes/no', cat: 'Categories', date: 'Date', time: 'Time', text: 'Text', calc: 'Formula' }[x.type] || x.type)}${(x.visits || []).length > 1 ? ` · ${x.visits.length} visits` : ''}</span><button class="btn ghost small" type="button" data-mbup="${x.id}" title="Up">↑</button><button class="btn ghost small" type="button" data-mbdup="${x.id}" title="Duplicate">⧉</button><button class="btn ghost small" type="button" data-mbdel="${x.id}" title="Remove">✕</button></div>`).join('') || '<div class="legend-note" style="padding:4px 8px">Empty section</div>'}</div>`; }).join('') || '<p class="legend-note">No variables yet — add some from the library →</p>'}</div>
      <div class="mb-col">${v ? editor(v) : '<p class="legend-note">Click a variable to edit it.</p>'}</div>
      <div class="mb-col"><div class="row" style="gap:6px;margin-bottom:6px"><b>Library</b><input type="search" id="mbLibQ" value="${esc(libQ)}" placeholder="Search, e.g. HbA1c" style="flex:1"></div>
        ${(() => { const my = ls.get('mylib', []); return my.length ? `<div class="mb-lib-sec"><div class="legend-note"><b>☆ My variables</b></div>${my.map((x, i) => `<span class="mb-lib-my"><button type="button" class="mb-lib" data-mbmylib="${i}" title="${esc([x.unit, x.cats && x.cats.join(' / '), x.definition].filter(Boolean).join(' · '))}">+ ${esc(x.label)}</button><button type="button" class="mb-lib-x" data-mbmyldel="${i}" title="Remove from my library">×</button></span>`).join('')}</div>` : ''; })()}
        <div class="mb-lib-sec"><div class="legend-note"><b>Questionnaires</b> <span>(an item per column, totals and categories by formula)</span></div>${Object.keys(SCALES).filter(k => SCALES[k].kind === 'scale').map(k => `<button type="button" class="mb-lib" data-mbscale="${esc(k)}" title="${esc(SCALES[k].items.length)} items${SCALES[k].totals.length ? ' · ' + SCALES[k].totals.map(t => t.label).join(', ') : ''}">+ ${esc(k)}</button>`).join('')}<button type="button" class="mb-lib" data-mbscale="__likert" title="Any questionnaire: its name, the number of items and the points of each">+ Likert scale…</button></div>
        <div class="mb-lib-sec"><div class="legend-note"><b>Clinical scores</b> <span>(items with their points, total by formula)</span></div>${Object.keys(SCALES).filter(k => SCALES[k].kind === 'score').map(k => `<button type="button" class="mb-lib" data-mbscale="${esc(k)}" title="${esc(SCALES[k].items.length)} items">+ ${esc(k)}</button>`).join('')}</div>
        <div class="mb-lib-sec"><div class="legend-note"><b>Eligibility</b></div><button type="button" class="mb-lib" id="mbElig" title="Inclusion and exclusion criteria as yes/no columns, and Eligible by formula">+ Eligibility checklist…</button></div>
        <div class="mb-lib-sec"><div class="legend-note"><b>Repeating forms</b> <span>(one row per event, on a sheet of its own)</span></div><button type="button" class="mb-lib" id="mbAE" title="Event, dates, CTCAE grade, serious, relation to the treatment, action and outcome">+ Adverse-event log</button><button type="button" class="mb-lib" id="mbMeds" title="Medicine, dose, route, start and stop">+ Concomitant medications</button></div>
        ${lib.map(([sec, list]) => `<div class="mb-lib-sec"><div class="legend-note"><b>${esc(sec)}</b></div>${list.map(e => { const has = D.vars.some(x => x.label.toLowerCase() === e[0].toLowerCase()); return `<button type="button" class="mb-lib ${has ? 'has' : ''}" data-mblib="${esc(sec)}|${esc(e[0])}" title="${esc([e[2], e[3] !== undefined && e[3] !== null ? `${e[3]}–${e[4]}` : '', e[5] ? e[5].join(' / ') : ''].filter(Boolean).join(' · '))}">${has ? '✓' : '+'} ${esc(e[0])}</button>`; }).join('')}</div>`).join('')}</div></div>`;
  }
  function editor(v) {
    const others = D.vars.filter(x => x.id !== v.id), sel2 = (k, cur, list) => `<select data-mbv="${k}">${opt(list, cur)}</select>`, varOpt = (filter) => [['', '—'], ...others.filter(filter).map(x => [x.id, x.label])];
    return `<div class="row" style="gap:6px"><b>${esc(v.label)}</b><span class="legend-note">→ ${esc(columns(D).filter(c => c.v.id === v.id).map(c => c.col).join(', '))}</span></div>
      <div class="row" style="gap:6px;margin-top:4px"><button class="btn ghost small" type="button" id="mbToLib" title="Keep this variable (with its range, categories, definition and expected values) in your own library, for every new design">☆ Save to my library</button></div>
      <div class="grid g2" style="margin-top:6px">
      <div><label class="f">Label</label><input type="text" data-mbv="label" value="${esc(v.label)}"></div>
      <div><label class="f">Column name <span class="legend-note">(empty = automatic)</span></label><input type="text" data-mbv="name" value="${esc(v.name || '')}" placeholder="${esc(baseName(D, { ...v, name: '' }))}"></div>
      <div><label class="f">Type</label>${sel2('type', v.type, TYPES)}</div>
      <div><label class="f">Section</label><input type="text" data-mbv="section" value="${esc(v.section)}" list="mbSecList"><datalist id="mbSecList">${(secOrder(D)).map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
      ${v.type === 'num' || v.type === 'calc' ? `<div><label class="f">Unit</label><input type="text" data-mbv="unit" value="${esc(v.unit)}" placeholder="e.g. mg/dL"></div>
        <div><label class="f">Decimals</label><input type="number" min="0" max="6" data-mbv="dec" value="${esc(v.dec)}"></div>
        <div><label class="f">Allowed from</label><input type="number" step="any" data-mbv="min" value="${esc(v.min)}"></div><div><label class="f">to</label><input type="number" step="any" data-mbv="max" value="${esc(v.max)}"></div>` : ''}
      ${v.type === 'num' ? `<div><label class="f">Normal range from <span class="legend-note">(shaded blue outside)</span></label><input type="number" step="any" data-mbv="refLo" value="${esc(v.refLo ?? '')}"></div><div><label class="f">to</label><input type="number" step="any" data-mbv="refHi" value="${esc(v.refHi ?? '')}"></div>
        <div style="grid-column:1/-1"><label class="f">Normal range by sex and age <span class="legend-note">(optional — replaces the range above; uses the design's ${esc((refSexAge(D).sex || {}).label || 'Sex')} and ${esc((refSexAge(D).age || {}).label || 'Age')})</span></label>
          ${(v.refBy || []).map((x, i) => `<div class="row" style="gap:4px;align-items:center;margin:2px 0"><select data-mbrb="${v.id}|${i}|sex" style="width:auto"><option value="">any sex</option>${((refSexAge(D).sex || {}).cats || ['Male', 'Female']).map(c => `<option ${x.sex === c ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select><span class="legend-note">age</span><input type="number" data-mbrb="${v.id}|${i}|ageMin" value="${esc(x.ageMin ?? '')}" placeholder="from" style="width:62px"><input type="number" data-mbrb="${v.id}|${i}|ageMax" value="${esc(x.ageMax ?? '')}" placeholder="to" style="width:62px"><span class="legend-note">normal</span><input type="number" step="any" data-mbrb="${v.id}|${i}|lo" value="${esc(x.lo ?? '')}" placeholder="low" style="width:70px"><input type="number" step="any" data-mbrb="${v.id}|${i}|hi" value="${esc(x.hi ?? '')}" placeholder="high" style="width:70px"><button class="btn ghost small" type="button" data-mbrbdel="${v.id}|${i}">✕</button></div>`).join('')}
          <button class="btn ghost small" type="button" data-mbrbadd="${v.id}">+ a rule</button>${!(v.refBy || []).length && /ha?emoglobin|\bHb\b|creatinine|ha?ematocrit|ferritin|uric/i.test(v.label) ? ` <button class="btn ghost small" type="button" data-mbrbsex="${v.id}" title="Two rules, men and women (usual adult values: check your laboratory's)">♂/♀ Usual adult values</button>` : ''}</div>
        ${(() => { const cv = convOf(v); return cv ? `<div><label class="f">Convert to another unit</label><select data-mbconv="1">${opt(cv.map(([u]) => [u, u]), v.unit)}</select></div>` : ''; })()}` : ''}
      ${v.type === 'multi' ? `<div style="grid-column:1/-1"><label class="f">Options, one per line <span class="legend-note">(each becomes a Yes / No column, analysed together as an item group)</span></label><textarea data-mbv="cats" rows="${Math.max(3, v.cats.length)}">${esc(v.cats.join('\n'))}</textarea></div>` : ''}
      ${v.type === 'cat' || v.type === 'yn' ? `<div style="grid-column:1/-1"><label class="f">Categories, one per line, in order${D.conv.catAs === 'codes' ? ' (coded 1, 2, 3 …)' : ''}</label><textarea data-mbv="cats" rows="${Math.max(2, v.cats.length)}">${esc(v.cats.join('\n'))}</textarea></div>` : ''}
      ${v.type === 'calc' ? (() => { const f = v.formula || { kind: 'bmi' }, K = FK[f.kind] || FK.bmi, pick = (k, lab, filt) => `<div><label class="f">${esc(lab)}</label>${sel2(k, f[k.slice(1)] || '', varOpt(filt))}</div>`;
        const lf = { num: x => x.type === 'num' || x.type === 'calc', yn: x => x.type === 'yn' || x.type === 'cat', any: x => ['num', 'calc', 'yn', 'cat'].includes(x.type) }[K.list];
        return `<div style="grid-column:1/-1"><label class="f">Formula</label>${sel2('fkind', f.kind, Object.entries(FK).map(([k, o]) => [k, o.name]))}</div>`
          + (K.a ? pick('fa', K.a, x => x.type !== 'calc' || ['change', 'pct', 'cut'].includes(f.kind)) : '') + (K.b ? pick('fb', K.b, x => x.type !== 'calc') : '') + (K.c ? pick('fc', K.c, x => x.type === 'cat' || x.type === 'yn') : '')
          + (K.cuts ? `<div><label class="f">Cut-offs <span class="legend-note">(each starts the next category)</span></label><input type="text" data-mbv="fcuts" value="${esc(f.cuts || '')}" placeholder="18.5, 25, 30"></div><div><label class="f">Categories <span class="legend-note">(one more than the cut-offs)</span></label><input type="text" data-mbv="flabs" value="${esc(f.labs || '')}" placeholder="Underweight, Normal, Overweight, Obese"></div>` : '')
          + (lf ? `<div style="grid-column:1/-1"><label class="f">Items${K.weights ? ' and their points' : K.rev ? ' (↺ reverse-scored: max + min − value)' : ''}${f.kind === 'eligible' ? ' — inclusion criteria must be Yes, exclusion criteria No' : ''}</label><div class="mb-items">${others.filter(lf).map(x => { const on = (f.list || []).includes(x.id);
              return `<span class="mb-item"><label class="check" style="margin:0"><input type="checkbox" data-mbflist="${x.id}" ${on ? 'checked' : ''}><span>${esc(x.label)}${x.elig ? ` <span class="legend-note">(${x.elig === 'exc' ? 'exclusion' : 'inclusion'})</span>` : ''}</span></label>${K.weights && on ? `<input type="number" step="any" data-mbfw="${x.id}" value="${esc((f.weights || {})[x.id] ?? 1)}" style="width:58px" title="Points">` : ''}${K.rev && on ? `<label class="check" style="margin:0" title="Reverse-scored"><input type="checkbox" data-mbfrev="${x.id}" ${(f.rev || []).includes(x.id) ? 'checked' : ''}><span>↺</span></label>` : ''}</span>`; }).join('')}</div></div>` : ''); })() : ''}
      ${D.visits.length > 1 ? `<div style="grid-column:1/-1"><label class="f">Collected at</label><div class="row" style="gap:10px;flex-wrap:wrap">${D.visits.map(x => `<label class="check" style="margin:0"><input type="checkbox" data-mbvisit="${x.id}" ${(v.visits || []).includes(x.id) || (!(v.visits || []).length && x.id === D.visits[0].id) ? 'checked' : ''}><span>${esc(x.name)}</span></label>`).join('')}</div></div>` : ''}
      <div><label class="f">Item group <span class="legend-note">(e.g. Co-morbidities)</span></label><input type="text" data-mbv="group" value="${esc(v.group || '')}" list="mbGrpList"><datalist id="mbGrpList">${[...new Set(D.vars.map(x => x.group).filter(Boolean))].map(g => `<option value="${esc(g)}">`).join('')}</datalist></div>
      <div><label class="f">Role</label>${sel2('role', v.role || '', [['', '—'], ['baseline', 'Baseline characteristic'], ['primary', 'Primary outcome'], ['secondary', 'Secondary outcome'], ['outcome', 'Other outcome'], ['safety', 'Safety outcome']])}</div>
      <div style="grid-column:1/-1"><label class="f">Definition</label><input type="text" data-mbv="definition" value="${esc(v.definition || '')}" placeholder="e.g. BP ≥ 140/90 mmHg or antihypertensive treatment"></div>
      <div style="grid-column:1/-1"><label class="f">Asked only when <span class="legend-note">(skip logic — greyed in Excel otherwise, “if …” in the CRF, branching logic in REDCap)</span></label><div class="row" style="gap:6px;flex-wrap:wrap">${(() => { const pw = whenParent(D, v), cands = others.filter(x => (x.type === 'yn' || x.type === 'cat') && x.cats.length);
        return `<select data-mbv="whenV" style="width:auto">${opt([['', '— always asked —'], ...cands.map(x => [x.id, x.label])], pw ? pw.id : '')}</select>${pw ? `<span>is</span><select data-mbv="whenC" style="width:auto">${opt(pw.cats.map(c => [c, c]), v.when.cat)}</select>` : ''}`; })()}</div></div>
      <div><label class="check" style="margin-top:6px"><input type="checkbox" data-mbv="required" ${v.required ? 'checked' : ''}><span>Required</span></label></div></div>
      ${expectBox(v)}`;
  }
  // expected values (for the generator, phase 2): the same fields are in the generator
  // the unit conversions of a variable (by its library name)
  const convOf = v => { const k = Object.keys(CONV).find(n => n.toLowerCase() === String(v.label).replace(/\s*\([^)]*\)\s*$/, '').trim().toLowerCase()); const cv = k && CONV[k]; return cv && cv.length > 1 && cv.some(([u]) => u === v.unit) ? cv : null; };
  function convert(v, to) { const cv = convOf(v); if (!cv) return; const a = cv.find(([u]) => u === v.unit), b = cv.find(([u]) => u === to); if (!a || !b || a === b) return; const f = b[1] / a[1], r = (x, d) => x === '' || x === undefined || x === null || !isFinite(+x) ? x : +(+x * f).toFixed(d);
    v.min = r(v.min, b[2]); v.max = r(v.max, b[2]); v.refLo = r(v.refLo, b[2]); v.refHi = r(v.refHi, b[2]); if (v.expect) { v.expect = { ...v.expect, mean: r(v.expect.mean, b[2] + 1), sd: r(v.expect.sd, b[2] + 1) }; } v.unit = to; v.dec = String(b[2]); }
  function expectBox(v) {
    const e = v.expect || (v.expect = expectOf(v.label, v.type, v.cats));
    if (v.type === 'num' || v.type === 'calc') return `<div class="mb-expect"><b>Expected values</b> <span class="legend-note">(used to simulate data)</span><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:4px">
      <div><label class="f">Mean</label><input type="number" step="any" data-mbe="mean" value="${esc(e.mean ?? '')}" style="width:100px"></div><div><label class="f">SD</label><input type="number" step="any" min="0" data-mbe="sd" value="${esc(e.sd ?? '')}" style="width:100px"></div>
      <div><label class="f">Distribution</label><select data-mbe="dist" style="width:auto">${opt([['normal', 'Normal'], ['skewed', 'Skewed (log-normal)']], e.dist || 'normal')}</select></div>
      ${v.type === 'num' ? `<div><label class="f">Min</label><input type="number" step="any" data-mbe="lo" value="${esc(e.lo ?? '')}" placeholder="${esc(v.min !== '' ? v.min : 'none')}" style="width:90px" title="The lowest simulated value (empty: the allowed range)"></div><div><label class="f">Max</label><input type="number" step="any" data-mbe="hi" value="${esc(e.hi ?? '')}" placeholder="${esc(v.max !== '' ? v.max : 'none')}" style="width:90px" title="The highest simulated value (empty: the allowed range)"></div>` : ''}</div>
      ${v.type === 'num' ? `<div class="legend-note" style="margin-top:4px">Simulated values stay between Min and Max (redrawn when outside, so they do not pile up at the limits); empty: the allowed range.</div>` : ''}</div>`;
    if (v.type === 'multi') { const pc = v.cats.map((_, i) => (e.pct || [])[i] ?? 20); return `<div class="mb-expect"><b>Expected % ticking each option</b> <span class="legend-note">(used to simulate data; options are independent)</span><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:4px">${v.cats.map((c, i) => `<div><label class="f">${esc(c)}</label><input type="number" min="0" max="100" step="any" data-mbep="${i}" value="${esc(pc[i])}" style="width:80px"></div>`).join('')}</div></div>`; }
    if (v.type === 'cat' || v.type === 'yn') { const pc = v.cats.map((_, i) => (e.pct || [])[i] ?? +(100 / v.cats.length).toFixed(1)); return `<div class="mb-expect"><b>Expected %</b> <span class="legend-note">(used to simulate data)</span><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:4px">${v.cats.map((c, i) => `<div><label class="f">${esc(c)}</label><input type="number" min="0" max="100" step="any" data-mbep="${i}" value="${esc(pc[i])}" style="width:80px"></div>`).join('')}</div></div>`; }
    if (v.type === 'date') return `<div class="mb-expect"><b>Expected date</b> <span class="legend-note">(simulation: days after the previous date of the sheet)</span><div class="row" style="gap:8px;margin-top:4px"><div><label class="f">Mean days</label><input type="number" step="any" data-mbe="mean" value="${esc(e.mean ?? 7)}" style="width:90px"></div><div><label class="f">SD</label><input type="number" step="any" data-mbe="sd" value="${esc(e.sd ?? 3)}" style="width:90px"></div></div></div>`;
    return '';
  }
  const tRules = () => { const vs = D.vars.filter(v => ['num', 'date', 'calc'].includes(v.type)), o2 = [['', '—'], ...vs.map(v => [v.id, v.label])];
    return `<h3 style="margin-top:0">Checks between columns</h3><p class="legend-note">Cells that break a rule are highlighted in yellow in the master sheet (e.g. discharge ≥ admission, diastolic &lt; systolic BP).</p>
      ${(D.checks || []).map((c, i) => `<div class="row" style="gap:6px;margin:4px 0"><select data-mbck="${i}:a" style="width:auto">${opt(o2, c.a)}</select><select data-mbck="${i}:op" style="width:auto">${opt([['>', 'greater than'], ['>=', 'greater than or equal to'], ['<', 'less than'], ['<=', 'less than or equal to'], ['=', 'equal to']], c.op)}</select><select data-mbck="${i}:b" style="width:auto">${opt(o2, c.b)}</select><button class="btn ghost small" type="button" data-mbckdel="${i}">✕</button></div>`).join('')}
      <button class="btn ghost small" type="button" id="mbCkAdd">+ Rule</button>
      <h3>Every number has an allowed range</h3><p class="legend-note">${D.vars.filter(v => v.type === 'num' && (v.min === '' || v.max === '')).map(v => esc(v.label)).join(', ') || 'Yes — all set.'}</p>`; };
  function tPreview() {
    const cols = columns(D), pr = problems(D), hasGroup = D.arms.filter(Boolean).length >= 2, order = secOrder(D);
    const lead = ['ID', ...(hasGroup ? ['Group'] : []), ...(D.layout === 'long' ? ['Visit'] : [])], rand = hasGroup && D.rand.on ? randomisation(D)[0].list : null;
    const ex = v => v.type === 'yn' || v.type === 'cat' ? (D.conv.catAs === 'codes' ? '1' : v.cats[0]) : v.type === 'num' ? (v.min !== '' && v.max !== '' ? String(+((+v.min + +v.max) / 2).toFixed(+v.dec || 0)) : '…') : v.type === 'date' ? '15/03/2026' : v.type === 'calc' ? '=…' : '…';
    return `${pr.length ? `<div class="mb-warn"><b>To check (${pr.length})</b><ul>${pr.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>` : '<p class="legend-note">✓ No problem found.</p>'}
      <div class="tbl-wrap" style="max-height:420px"><table class="t mb-prev"><thead><tr><th colspan="${lead.length}" style="background:#${SEC_FILL[0]};color:#fff">Study</th>${(() => { const out = []; let i = 0; while (i < cols.length) { const s = cols[i].v.section; let j = i; while (j + 1 < cols.length && cols[j + 1].v.section === s) j++; out.push(`<th colspan="${j - i + 1}" style="background:#${SEC_FILL[order.indexOf(s) % SEC_FILL.length]};color:#fff">${esc(s)}</th>`); i = j + 1; } return out.join(''); })()}</tr>
        <tr>${lead.map(h => `<th>${h}</th>`).join('')}${cols.map(c => `<th title="${esc(c.v.label)}">${esc(c.col)}</th>`).join('')}</tr></thead>
        <tbody>${[0, 1, 2].map(r => `<tr><td>${esc(D.idPrefix)}${String(r + 1).padStart(+D.idDigits || 3, '0')}</td>${hasGroup ? `<td>${esc(rand ? rand[r] : '▾')}</td>` : ''}${D.layout === 'long' ? `<td>${esc(D.visits[r % D.visits.length].name)}</td>` : ''}${cols.map(c => `<td class="${c.v.type === 'calc' ? 'mb-calc' : ''}">${r ? '' : esc(ex(c.v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="legend-note">${cols.length + lead.length} columns · ${D.layout === 'long' ? `${(+D.n || 0) * D.visits.length} rows (patients × visits)` : `${D.n} rows`} · grey columns are formulas · drop-down lists, ranges and highlighting are in the Excel file.</p>`;
  }
  const tExport = () => { const X0 = xlOpts(D), ck = (k, l, t) => `<label class="check" style="margin:0" title="${esc(t)}"><input type="checkbox" data-mbxl="${k}" ${X0[k] ? 'checked' : ''}><span>${l}</span></label>`;
    return `<div class="mb-xlopts"><b>In the Excel file</b>${ck('dash', 'Completeness dashboard and row checks', 'A Dashboard sheet (patients entered, complete, duplicated IDs, rule breaks, % filled by column and visit) and Filled / Missing_required columns')}${ck('ids', 'ID checks', 'Repeated IDs in red, an ID of another length in yellow')}${ck('view', 'Patient view', 'A sheet showing one patient at a time (choose the ID)')}${ck('log', 'Entry log', 'Entered by, entry date, checked by and verified columns')}${ck('screen', 'Screening log', 'A sheet for every patient screened: the eligibility criteria, eligible, consented, randomised and the reason when not — its counts fill the flowchart in Analyse')}${ck('recruit', 'Recruitment tracker', 'A sheet of the planned and actual patients by month (from the enrolment date) and by site, red when behind the plan')}${ck('queries', 'Data queries', 'A sheet to raise and answer queries on cells: patient, column, value, question, answer, open / closed')}${ck('protect', 'Protect the Data sheet', 'Only the entry columns can be typed in')}${X0.protect ? `<input type="text" data-mbxl="pw" value="${esc(X0.pw)}" placeholder="password (optional)" style="width:150px">` : ''}</div>` + tExport0() + ext('exportCards'); };
  const tExport0 = () => `<div class="grid g2">
      <div class="mb-exp"><b>📗 Excel master sheet</b><p class="legend-note">Section-coloured header, frozen ID column and header, drop-down lists, allowed ranges with messages, out-of-range cells in red, rule breaks in yellow, formula columns, ${D.double ? 'double entry with a compare sheet, ' : ''}${D.rand.on && D.arms.filter(Boolean).length >= 2 ? 'randomisation list, ' : ''}codebook and instructions — and the setup for the analysis inside.</p><button class="btn primary" type="button" id="mbXlsx">⬇ Master sheet (.xlsx)</button>${(D.sites || []).filter(x => x.name).length >= 2 ? ` <button class="btn ghost" type="button" id="mbXlsxSites" title="One file per site, each with its own IDs and randomisation list">⬇ One file per site</button>` : ''}</div>
      <div class="mb-exp"><b>📄 Case report form</b><p class="legend-note">A printable form per patient in Word: sections, check boxes for the categories, blanks with units and ranges, a table per visit.</p><button class="btn ghost" type="button" id="mbCrf">⬇ CRF (.docx)</button></div>
      <div class="mb-exp"><b>🗂 REDCap data dictionary</b><p class="legend-note">To build the same form in REDCap (field types, choices, validation, ranges, required fields).</p><button class="btn ghost" type="button" id="mbRedcap">⬇ Data dictionary (.csv)</button></div>
      <div class="mb-exp"><b>🔁 Use it here</b><p class="legend-note">Open an empty copy of the master sheet in the app now (to check the setup), or upload the filled file later — its setup is read by itself.</p><button class="btn ghost" type="button" id="mbTry">Open the empty sheet here</button></div></div>`;
  // the extension (documents, wizard, sharing) adds its parts here
  const ext = (k, ...a) => { const E = window.EasyBuilderExt; try { return E && E[k] ? E[k](D, ...a) || '' : ''; } catch (err) { console.error(err); return ''; } };
  const fileBase = () => (D.title || 'Master sheet').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 60).trim() || 'Master sheet';
  async function onClick(e) {
    if (window.EasyBuilderExt && window.EasyBuilderExt.onClick && await window.EasyBuilderExt.onClick(e, D)) return;
    if (e.target.dataset && e.target.dataset.mbchk) { const id = e.target.dataset.mbchk; if (e.target.checked) bulk.add(id); else bulk.delete(id); render(); return; }
    const b = e.target.closest('button,[data-mbsel],[data-mbtab]'); if (!b) return; const d = b.dataset;
    if (d.mbtab) { tab = d.mbtab; return render(); }
    if (d.mbrbadd || d.mbrbdel || d.mbrbsex) { const [id, i] = (d.mbrbadd || d.mbrbdel || d.mbrbsex).split('|'), x = D.vars.find(y => y.id === id); if (!x) return; x.refBy = x.refBy || [];
      if (d.mbrbadd) x.refBy.push({ sex: '', ageMin: '', ageMax: '', lo: x.refLo ?? '', hi: x.refHi ?? '' }); else if (d.mbrbdel) x.refBy.splice(+i, 1);
      else { const cats = (refSexAge(D).sex || {}).cats || ['Male', 'Female'], M0 = cats.find(c => /^m/i.test(c)) || cats[0], F0 = cats.find(c => /^f/i.test(c)) || cats[1], U0 = SEXREF.find(([re]) => re.test(x.label)); if (U0) x.refBy = [{ sex: M0, ageMin: 18, ageMax: '', lo: U0[1][0], hi: U0[1][1] }, { sex: F0, ageMin: 18, ageMax: '', lo: U0[2][0], hi: U0[2][1] }]; }
      save(); return render(); }
    if (b.id === 'mbClose') return setPhase('generate');
    if (d.mbsel) { sel = d.mbsel; return render(); }
    if (d.mblib) { const [sec, lab] = d.mblib.split('|'), e2 = LIB.find(x => x[0] === sec)[1].find(x => x[0] === lab); const v = libVar(sec, e2); D.vars.push(v); if (!D.sections.includes(sec)) D.sections.push(sec); sel = v.id; save(); return render(); }
    if (b.id === 'mbNewVar') { const sec = (D.vars.find(x => x.id === sel) || {}).section || D.sections[0] || 'Other'; const v = { id: uid(), section: sec, label: 'New variable', type: 'num', unit: '', min: '', max: '', cats: [], dec: '', required: false, visits: [], group: '', role: '', definition: '' }; D.vars.push(v); if (!D.sections.includes(sec)) D.sections.push(sec); sel = v.id; save(); return render(); }
    if (b.id === 'mbSiteAdd') { const S = D.sites = D.sites || []; S.push({ name: `Site ${S.length + 1}`, prefix: `S${S.length + 1}-` }); save(); return render(); }
    if (d.mbsitedel !== undefined) { D.sites.splice(+d.mbsitedel, 1); save(); return render(); }
    if (b.id === 'mbXlsxSites') { const S = D.sites.filter(x => x.name), per = Math.ceil((+D.n || 60) / S.length);
      S.forEach((x, i) => setTimeout(() => { const d1 = { ...JSON.parse(JSON.stringify(D)), sites: [x], n: per, rand: { ...D.rand, seed: (+D.rand.seed || 1) + i } }; U.saveUrl(URL.createObjectURL(buildWorkbook(d1)), `${fileBase()} - ${x.name.replace(/[\\/:*?"<>|]+/g, ' ')} - master sheet.xlsx`); }, i * 400));
      toast(`${S.length} files, one per site (${per} rows each)`); return; }
    if (b.id === 'mbUndo' || b.id === 'mbRedo') return undo(b.id === 'mbUndo');
    if (b.id === 'mbPaste' || b.id === 'mbPasteCancel') { pasteOpen = !pasteOpen; render(); const t = $('#mbPasteTxt'); if (t) t.focus(); return; }
    if (b.id === 'mbPasteGo') { const sec = (D.vars.find(x => x.id === sel) || {}).section || D.sections[D.sections.length - 1] || 'Other', lines = ($('#mbPasteTxt').value || '').split(/\r?\n/);
      const add = lines.map(l => fromLine(D, l, sec)).filter(Boolean), known = add.filter(v => v.section !== sec || LIB.some(([, l]) => l.some(e => e[0].toLowerCase() === v.label.toLowerCase()))).length;
      add.forEach(v => { D.vars.push(v); if (!D.sections.includes(v.section)) D.sections.push(v.section); }); pasteOpen = false; pasteTxt = ''; if (add.length) sel = add[add.length - 1].id; save(); render();
      toast(add.length ? `${add.length} variable${add.length > 1 ? 's' : ''} added (${known} from the library)` : 'No variable in the list'); return; }
    if (d.mbdup) { const i = D.vars.findIndex(x => x.id === d.mbdup), c = JSON.parse(JSON.stringify(D.vars[i])); c.id = uid(); c.label = `${c.label} (copy)`; c.name = ''; D.vars.splice(i + 1, 0, c); sel = c.id; save(); return render(); }
    if (d.mbscale) { let n;
      if (d.mbscale === '__likert') { const name = (prompt('Name of the scale (e.g. Satisfaction, KOOS pain):', 'Satisfaction') || '').trim(); if (!name) return; const k = Math.round(+prompt('Number of items:', '5')); if (!(k >= 1 && k <= 60)) return;
        const pts = (prompt('Points of each item, from–to:', '1-5') || '1-5').split(/[^0-9]+/).filter(Boolean).map(Number), lo = pts[0] ?? 1, hi = pts[1] ?? 5; if (!(hi > lo)) return;
        n = addScale(D, name, Array.from({ length: k }, () => ''), lo, hi, `${name}: sum of ${k} items scored ${lo}–${hi}`); }
      else n = addSpec(D, d.mbscale, SCALES[d.mbscale]);
      sel = D.vars[D.vars.length - 1].id; save(); render(); toast(`${n} items, their total${(SCALES[d.mbscale] || {}).totals && SCALES[d.mbscale].totals.length > 1 ? 's and categories' : ''} added`); return; }
    if (b.id === 'mbAE' || b.id === 'mbMeds') { const ae = b.id === 'mbAE', sec = ae ? 'Adverse events' : 'Concomitant medications'; if (D.vars.some(v => v.section === sec)) { toast(`“${sec}” is in the design already`); return; }
      const mk = (label, type, extra = {}) => ({ id: uid(), section: sec, label, type, unit: '', min: '', max: '', cats: type === 'yn' ? [...YN] : [], dec: '', required: false, visits: [], group: '', role: ae ? 'safety' : '', definition: '', ...extra });
      const vs = ae ? [mk('Adverse event', 'text', { required: true, definition: 'MedDRA or CTCAE term' }), mk('AE start date', 'date'), mk('AE end date', 'date'), mk('Severity grade', 'cat', { cats: ['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5'], definition: 'CTCAE v5: 1 mild, 2 moderate, 3 severe, 4 life-threatening, 5 death' }), mk('Serious', 'yn', { definition: 'Death, life-threatening, hospitalisation, disability or congenital anomaly' }),
        mk('Related to treatment', 'cat', { cats: ['Not related', 'Unlikely', 'Possible', 'Probable', 'Definite'] }), mk('Action taken', 'cat', { cats: ['None', 'Dose reduced', 'Treatment interrupted', 'Treatment stopped'] }), mk('AE outcome', 'cat', { cats: ['Recovered', 'Recovering', 'Not recovered', 'Recovered with sequelae', 'Fatal'] })]
        : [mk('Medicine', 'text', { required: true }), mk('Dose', 'text'), mk('Route', 'cat', { cats: ['Oral', 'IV', 'IM', 'SC', 'Topical', 'Inhaled', 'Other'] }), mk('Medicine start date', 'date'), mk('Medicine stop date', 'date'), mk('Indication', 'text')];
      vs.forEach(v => { v.expect = expectOf(v.label, v.type, v.cats); }); D.vars.push(...vs); D.sections = [...secOrder(D).filter(x => x !== sec), sec]; D.repeat = [...new Set([...(D.repeat || []), sec])]; sel = vs[0].id; save(); render(); toast(`${sec}: a repeating form (one row per event) added`); return; }
    if (d.mbrep) { const R0 = new Set(D.repeat || []); if (R0.has(d.mbrep)) R0.delete(d.mbrep); else R0.add(d.mbrep); D.repeat = [...R0]; save(); render(); toast(R0.has(d.mbrep) ? `“${d.mbrep}”: one row per event, on its own sheet` : `“${d.mbrep}”: back in the Data sheet`); return; }
    if (b.id === 'mbElig') { const inc = (prompt('Inclusion criteria, separated by ; (e.g. Age 18–80 years; Knee osteoarthritis grade II–III):', 'Age 18 to 80 years; Signed informed consent') || '').split(';').map(x => x.trim()).filter(Boolean);
      const exc = (prompt('Exclusion criteria, separated by ; (e.g. Pregnancy; Previous knee surgery):', 'Pregnancy') || '').split(';').map(x => x.trim()).filter(Boolean);
      const n = addEligibility(D, inc, exc); if (n) { sel = null; save(); render(); toast(`${n} criteria and “Eligible” added (section Eligibility)`); } return; }
    if (d.mbmylib !== undefined) { const x = ls.get('mylib', [])[+d.mbmylib]; if (!x) return; const v = { ...JSON.parse(JSON.stringify(x)), id: uid(), visits: [] }; const sec = v.section || 'Other'; v.section = sec; D.vars.push(v); if (!D.sections.includes(sec)) D.sections.push(sec); sel = v.id; save(); render(); return; }
    if (d.mbmyldel !== undefined) { const my = ls.get('mylib', []); const x = my.splice(+d.mbmyldel, 1)[0]; ls.set('mylib', my); render(); if (x) toast(`“${x.label}” removed from your library`); return; }
    if (b.id === 'mbToLib') { const v = D.vars.find(x => x.id === sel); if (!v) return; const my = ls.get('mylib', []), c = JSON.parse(JSON.stringify(v)); delete c.id; delete c.visits; delete c.when; if (c.formula) { toast('Formulas use other variables: save the variables they use instead'); return; }
      const i = my.findIndex(x => x.label.toLowerCase() === c.label.toLowerCase()); if (i >= 0) my[i] = c; else my.push(c); ls.set('mylib', my); render(); toast(`“${v.label}” is in your library (☆ My variables)`); return; }
    if (b.id === 'mbBulkDel') { if (!confirm(`Remove the ${bulk.size} selected variables?`)) return; D.vars = D.vars.filter(x => !bulk.has(x.id)); D.checks = (D.checks || []).filter(c => !bulk.has(c.a) && !bulk.has(c.b)); if (bulk.has(sel)) sel = null; bulk = new Set(); save(); return render(); }
    if (b.id === 'mbBulkClear') { bulk = new Set(); return render(); }
    if (b.id === 'mbSsUse') { const r = ssCalc(D); if (r && !r.err) { D.n = r.enrol; save(); render(); toast(`Planned number: ${r.enrol} patients`); } return; }
    if (b.id === 'mbSsCopy') { const r = ssCalc(D); if (r && !r.err) { try { await navigator.clipboard.writeText(r.text); toast('Sample-size paragraph copied'); } catch (err) { prompt('Copy the paragraph:', r.text); } } return; }
    if (b.id === 'mbNewSec') { const n = (prompt('Name of the new section:', 'Other') || '').trim(); if (n && !D.sections.includes(n)) { D.sections.push(n); save(); render(); } return; }
    if (d.mbsecup) { const i = +d.mbsecup; D.sections = secOrder(D); [D.sections[i - 1], D.sections[i]] = [D.sections[i], D.sections[i - 1]]; save(); return render(); }
    if (d.mbsecren) { D.sections = secOrder(D); const old = D.sections[+d.mbsecren], n = (prompt('New name of the section:', old) || '').trim(); if (!n || n === old) return; D.sections[+d.mbsecren] = n; D.vars.forEach(v => { if (v.section === old) v.section = n; }); save(); return render(); }
    if (d.mbup) { const i = D.vars.findIndex(x => x.id === d.mbup), sec = D.vars[i].section; let j = i - 1; while (j >= 0 && D.vars[j].section !== sec) j--; if (j >= 0) { [D.vars[i], D.vars[j]] = [D.vars[j], D.vars[i]]; save(); render(); } return; }
    if (d.mbdel) { D.vars = D.vars.filter(x => x.id !== d.mbdel); D.checks = (D.checks || []).filter(c => c.a !== d.mbdel && c.b !== d.mbdel); if (sel === d.mbdel) sel = null; save(); return render(); }
    if (b.id === 'mbArmAdd') { D.arms.push(`Group ${String.fromCharCode(65 + D.arms.length)}`); save(); return render(); }
    if (d.mbarmdel !== undefined) { D.arms.splice(+d.mbarmdel, 1); save(); return render(); }
    if (b.id === 'mbVisAdd') { D.visits.push({ id: uid(), name: `Visit ${D.visits.length + 1}` }); save(); return render(); }
    if (d.mbvisdel !== undefined) { if (D.visits.length < 2) { toast('A study has at least one visit'); return; } const x = D.visits.splice(+d.mbvisdel, 1)[0]; D.vars.forEach(v => { v.visits = (v.visits || []).filter(id => id !== x.id); }); save(); return render(); }
    if (d.mbvismove) { const i = +d.mbvismove; [D.visits[i - 1], D.visits[i]] = [D.visits[i], D.visits[i - 1]]; save(); return render(); }
    if (b.id === 'mbCkAdd') { (D.checks = D.checks || []).push({ a: '', op: '>=', b: '' }); save(); return render(); }
    if (d.mbckdel !== undefined) { D.checks.splice(+d.mbckdel, 1); save(); return render(); }
    if (b.id === 'mbSaveAs') { const n = (prompt('Name of this design:', D.title || 'My study') || '').trim(); if (!n) return; const all = ls.get('designs', {}); all[n] = JSON.parse(JSON.stringify(D)); ls.set('designs', all); toast(`Design “${n}” saved in this browser`); return render(); }
    if (b.id === 'mbExportJson') { U.saveUrl(URL.createObjectURL(new Blob([JSON.stringify({ app: 'ProfMSE-EasyStat-design', version: 1, design: D }, null, 1)], { type: 'application/json' })), `${fileBase()} - design.json`); return; }
    if (b.id === 'mbXlsx') { const pr = problems(D).filter(p => /Two columns|formula/.test(p)); if (pr.length) { toast('Fix first: ' + pr[0]); tab = 'preview'; return render(); }
      try { U.saveUrl(URL.createObjectURL(buildWorkbook(D)), `${fileBase()} - master sheet.xlsx`); toast('Master sheet saved'); } catch (err) { console.error(err); toast('Could not build the sheet: ' + err.message); } return; }
    if (b.id === 'mbCrf') { try { U.saveUrl(URL.createObjectURL(await buildCrf(D)), `${fileBase()} - CRF.docx`); toast('Case report form saved'); } catch (err) { console.error(err); toast('Could not build the form: ' + err.message); } return; }
    if (b.id === 'mbRedcap') { U.saveUrl(URL.createObjectURL(redcap(D)), `${fileBase()} - REDCap data dictionary.csv`); toast('REDCap data dictionary saved'); return; }
    if (b.id === 'mbTry') { const blob = buildWorkbook(D), f = new File([blob], `${fileBase()} - master sheet.xlsx`); setPhase('analyse'); U.go(1); await U.loadFile(f); return; }
  }
  function onInput(e) {
    const t = e.target, d = t.dataset, val = t.type === 'checkbox' ? t.checked : t.value;
    if (window.EasyBuilderExt && window.EasyBuilderExt.onInput && window.EasyBuilderExt.onInput(e, D)) return;
    if (t.id === 'mbPasteTxt') { pasteTxt = t.value; return; }
    if (d.mbvday !== undefined) { D.visits[+d.mbvday].day = val === '' ? '' : +val; save(); return; }
    if (d.mbvtol !== undefined) { D.visits[+d.mbvtol].tol = val === '' ? '' : +val; save(); return; }
    if (d.mbanchor) { D.anchor = val; save(); return render(); }
    if (d.mbsite) { const [i, k] = d.mbsite.split('|'); D.sites[+i][k] = val; save(); return; }
    if (d.mbmin) { D.minim = { factors: [], ...(D.minim || {}), on: !!val }; save(); return render(); }
    if (d.mbminf) { const m = D.minim = { on: true, factors: [], ...(D.minim || {}) }, L = new Set(m.factors); if (val) L.add(d.mbminf); else L.delete(d.mbminf); m.factors = [...L]; save(); return; }
    if (d.mbxl) { D.xl = { ...xlOpts(D), [d.mbxl]: val }; save(); if (t.type === 'checkbox') render(); return; }
    if (d.mbrb) { const [id, i, f] = d.mbrb.split('|'), x = D.vars.find(y => y.id === id); if (x && x.refBy && x.refBy[+i]) { x.refBy[+i][f] = f === 'sex' ? val : val === '' ? '' : +val; save(); } return; }
    if (t.id === 'mbVarQ') { varQ = t.value; const pos = t.selectionStart; render(); const q = $('#mbVarQ'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } return; }
    if (t.id === 'mbVarF') { varF = t.value; return render(); }
    if (d.mbbulk) { if (t.tagName !== 'SELECT' && e.type === 'input') return; const k = d.mbbulk, vs = D.vars.filter(x => bulk.has(x.id)); if (!vs.length || val === '') return;
      vs.forEach(v => { if (k === 'section') { v.section = String(val).trim() || v.section; if (!D.sections.includes(v.section)) D.sections.push(v.section); }
        if (k === 'role') v.role = val === 'none' ? '' : val; if (k === 'required') v.required = val === '1'; if (k === 'group') v.group = String(val).trim();
        if (k === 'visits') { const ids = D.visits.map(x => x.id), cur = (v.visits || []).length ? v.visits : [ids[0]]; v.visits = val === 'first' ? [] : val === 'all' ? [...ids] : val === 'last' ? [ids[ids.length - 1]] : ids.filter(id => cur.includes(id) || '+' + id === val); if (v.visits.length === 1 && v.visits[0] === ids[0]) v.visits = []; } });
      save(); render(); toast(`${vs.length} variable${vs.length > 1 ? 's' : ''}: ${k} set`); return; }
    if (t.id === 'mbLibQ') { libQ = t.value; const pos = t.selectionStart; render(); const q = $('#mbLibQ'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } return; }
    if (d.mb) { D[d.mb] = d.mb === 'n' || d.mb === 'idDigits' ? +val : val; save(); if (t.type !== 'text' && t.type !== 'number') render(); return; }
    if (d.mbc) { D.conv[d.mbc] = val; save(); return render(); }
    if (d.mbs) { ssDef(D)[d.mbs] = ['v', 'm', 'nik', 'means'].includes(d.mbs) ? val : val === '' ? '' : +val; if (d.mbs === 'v') { D.ss.a = ''; D.ss.b = ''; D.ss.sd = ''; } save(); if (t.tagName === 'SELECT') return render(); const o = $('#mbSsOut'); if (o) o.innerHTML = ssOut(ssCalc(D)); return; }
    if (d.mbr) { D.rand[d.mbr] = val; save(); if (t.type !== 'text' && t.type !== 'number') render(); return; }
    if (d.mbarm !== undefined) { D.arms[+d.mbarm] = val; save(); return; }
    if (d.mbvis !== undefined) { D.visits[+d.mbvis].name = val; save(); return; }
    if (d.mbstrat) { D.rand.strata = (D.rand.strata || []).filter(x => x !== d.mbstrat); if (val) D.rand.strata.push(d.mbstrat); save(); return render(); }
    if (d.mbck) { const [i, k] = d.mbck.split(':'); D.checks[+i][k] = val; save(); return; }
    const v = D.vars.find(x => x.id === sel); if (!v) return;
    if (d.mbv) { const k = d.mbv;
      if (k === 'cats') { v.cats = String(val).split('\n').map(x => x.trim()).filter(Boolean); if (!v.expect || !v.expect.pct || v.expect.pct.length !== v.cats.length) v.expect = expectOf(v.label, v.type, v.cats); }
      else if (k === 'whenV') { const p = D.vars.find(x => x.id === val); v.when = p ? { v: p.id, cat: p.cats[0] } : null; }
      else if (k === 'whenC') v.when = { ...(v.when || {}), cat: val };
      else if (k === 'fkind') v.formula = { ...(v.formula || {}), kind: val };
      else if (k === 'fcuts' || k === 'flabs') v.formula = { ...(v.formula || {}), [k.slice(1)]: val };
      else if (k === 'fc') v.formula = { kind: 'bmi', ...(v.formula || {}), c: val };
      else if (k === 'fa' || k === 'fb') v.formula = { kind: 'bmi', ...(v.formula || {}), [k.slice(1)]: val };
      else if (k === 'type') { v.type = val; if (val === 'yn') v.cats = [...YN]; if (val === 'multi' && v.cats.length < 2) v.cats = ['Option 1', 'Option 2', 'Option 3']; if (val === 'calc' && !v.formula) v.formula = { kind: 'bmi' }; v.expect = expectOf(v.label, v.type, v.cats); }
      else v[k] = val;
      save(); if (t.tagName === 'SELECT' || t.type === 'checkbox' || k === 'section') render(); return; }
    if (d.mbvisit) { const on = new Set((v.visits || []).length ? v.visits : [D.visits[0].id]); if (val) on.add(d.mbvisit); else on.delete(d.mbvisit); v.visits = D.visits.map(x => x.id).filter(id => on.has(id)); if (v.visits.length === 1 && v.visits[0] === D.visits[0].id) v.visits = []; save(); return render(); }
    if (d.mbe) { v.expect = { ...(v.expect || {}), [d.mbe]: d.mbe === 'dist' ? val : val === '' ? '' : +val }; save(); return; }
    if (d.mbep !== undefined) { const e = v.expect = v.expect || {}; e.pct = v.cats.map((_, i) => (e.pct || [])[i] ?? +(100 / v.cats.length).toFixed(1)); e.pct[+d.mbep] = +val || 0; save(); return; }
    if (d.mbflist) { const L = new Set((v.formula || {}).list || []); if (val) L.add(d.mbflist); else L.delete(d.mbflist); v.formula = { ...(v.formula || {}), list: [...L] }; save(); return render(); }
    if (d.mbfw) { const f = v.formula = v.formula || {}; f.weights = { ...(f.weights || {}), [d.mbfw]: val === '' ? '' : +val }; save(); return; }
    if (d.mbfrev) { const f = v.formula = v.formula || {}, L = new Set(f.rev || []); if (val) L.add(d.mbfrev); else L.delete(d.mbfrev); f.rev = [...L]; save(); return; }
    if (d.mbconv) { convert(v, val); save(); render(); toast(`${v.label}: ranges and expected values converted to ${v.unit}`); return; }
  }
  function onChange(e) {
    const t = e.target; if (window.EasyBuilderExt && window.EasyBuilderExt.onChange && window.EasyBuilderExt.onChange(e, D)) return;
    if (t.id === 'mbTpl' && t.value) { if (D.vars.length && !confirm('Replace the current design?')) { t.value = ''; return; } D = t.value === '__blank' ? blank() : fromTemplate(t.value); sel = null; tab = 'study'; save(); return render(); }
    if (t.id === 'mbMine' && t.value) { const all = ls.get('designs', {}); if (all[t.value] && (!D.vars.length || confirm(`Open “${t.value}” (the current design is replaced)?`))) { D = JSON.parse(JSON.stringify(all[t.value])); sel = null; save(); render(); } else t.value = ''; return; }
    if (t.id === 'mbFromDict' && t.files[0]) { const f = t.files[0]; t.value = ''; if (D.vars.length && !confirm(`Make a new design from “${f.name}”? The current design is replaced (Undo brings it back).`)) return;
      f.arrayBuffer().then(buf => { try { const wb = XLSX.read(buf, { type: 'array' }), r = designFromDict(wb, f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()); if (!r.D.vars.length) throw new Error('no fields found');
        D = r.D; sel = null; tab = 'vars'; save(); render(); toast(`${r.kind}: ${r.D.vars.length} variables${r.skipped ? ` (${r.skipped} fields skipped: notes, calculations, descriptive)` : ''}`); } catch (err) { console.error(err); toast('Could not read it: ' + err.message); } }); return; }
    if (t.id === 'mbFromSheet' && t.files[0]) { const f = t.files[0]; t.value = '';
      if (D.vars.length && !confirm(`Make a new design from “${f.name}”? The current design is replaced (Undo brings it back).`)) return;
      f.arrayBuffer().then(buf => { try { const wb = XLSX.read(buf, { type: 'array', cellDates: true }), name = wb.SheetNames.find(n => !['_EasyStatSetup', 'Lists', 'Codebook', 'Instructions', 'Randomisation'].includes(n) && (wb.Sheets[n]['!ref'] || '').includes(':')) || wb.SheetNames[0];
        const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true, blankrows: false }), r = designFromSheet(aoa, f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim());
        if (!r.D.vars.length) throw new Error('no columns found'); D = r.D; sel = null; tab = 'vars'; save(); render();
        toast(`“${name}”: ${r.D.vars.length} variables from ${r.cols} columns${r.D.visits.length > 1 ? `, ${r.D.visits.length} visits` : ''}${r.D.arms.length ? `, groups ${r.D.arms.join(' / ')}` : ''}${r.id ? ` · ID: ${r.id}` : ''} — the values (${r.n} rows) became the expected values`); } catch (err) { console.error(err); toast('Could not read the sheet: ' + err.message); } }); return; }
    if (t.id === 'mbImportJson' && t.files[0]) { t.files[0].text().then(txt => { try { const j = JSON.parse(txt); if (!j.design || !Array.isArray(j.design.vars)) throw new Error('not a design file'); D = j.design; sel = null; save(); render(); toast('Design opened'); } catch (err) { toast('Could not open it: ' + err.message); } }); return; }
    if (t.id === 'mbPasteTxt') return;
    if (t.dataset && t.dataset.mbbulk) return onInput({ target: t, type: 'change' });
    if (t.type === 'text' || t.type === 'number' || t.tagName === 'TEXTAREA') render();
  }
  document.addEventListener('keydown', e => { if (phase !== 'build' || !(e.ctrlKey || e.metaKey) || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(true); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); undo(false); } });
  // the entry on step 1
  const anchor = $('#btnTemplate'); if (anchor) { const b = document.createElement('button'); b.className = 'btn ghost small'; b.type = 'button'; b.id = 'btnBuilder'; b.title = 'Design the master sheet of a new study: variables, visits, groups, ranges, randomisation — then an Excel sheet, a case report form and a REDCap dictionary'; b.textContent = '🧱 Master sheet builder'; anchor.parentNode.insertBefore(b, anchor); b.onclick = open; }
  setPhase('analyse');
  window.EasyBuilder = { buildCrf: (d, raw) => buildCrf(d || D, raw), open, close, setPhase, get phase() { return phase; }, buildWorkbook: (d, fill) => buildWorkbook(d || D, fill), setupFor, columns, visitsOf: v => visitsOf(D, v), baseName: v => baseName(D, v), tagOf, expectOf, prng, randomisation, redcap, fromTemplate, fileBase, save, render: () => render(), designFromDict, isRepeating: v => isRepeating(D, v), X, colL, sheetXml, xlsxBlob, secOrder, whenTxt, whenParent, xlOpts, SS_METHODS, LIB, TEMPLATES, findLib, uid, calcValue, calcCats, addSpec, addEligibility, SCALES, FK, nAnova, convert, ssCalc: d => ssCalc(d || D), designFromSheet, fromLine: (l, sec) => fromLine(D, l, sec || 'Other'), addScale: (n, it, lo, hi, def) => addScale(D, n, it, lo, hi, def), problems: d => problems(d || D), undo, get design() { return D; }, set design(x) { D = x; save(); } };
})();

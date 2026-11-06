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
    ['Diagnostic accuracy', [['Index test result', 'cat', '', null, null, ['Positive', 'Negative']], ['Reference standard', 'cat', '', null, null, ['Positive', 'Negative']], ['Index test value', 'num', '', null, null, null, 2]]]];
  // scales with their items (each item a column, the total a formula): PHQ-9 and GAD-7 (free to use), or any Likert scale
  const SCALES = {
    'PHQ-9': { items: ['Little interest or pleasure', 'Feeling down or hopeless', 'Sleep problems', 'Tired or little energy', 'Poor appetite or overeating', 'Feeling bad about yourself', 'Trouble concentrating', 'Moving slowly or restless', 'Thoughts of self-harm'],
      min: 0, max: 3, def: 'PHQ-9 total: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–19 moderately severe, 20–27 severe depression. Items scored 0 (not at all) to 3 (nearly every day), over the last 2 weeks.' },
    'GAD-7': { items: ['Nervous or anxious', 'Cannot stop worrying', 'Worrying too much', 'Trouble relaxing', 'Restless', 'Easily annoyed', 'Afraid something awful might happen'],
      min: 0, max: 3, def: 'GAD-7 total: 0–4 minimal, 5–9 mild, 10–14 moderate, 15–21 severe anxiety. Items scored 0 (not at all) to 3 (nearly every day), over the last 2 weeks.' }
  };
  // expected values of each variable (used by the generator): mean ± SD (skewed for lab values that are), % of each category, days after the previous date
  const EXPECT = { 'Age': [50, 12], 'Weight': [75, 14], 'Height': [165, 9], 'Charlson comorbidity index': [2, 1.8, 1], 'Systolic BP': [130, 18], 'Diastolic BP': [80, 11], 'Heart rate': [82, 14], 'Respiratory rate': [18, 4], 'Temperature': [37, 0.5],
    'SpO2': [96, 2.5], 'Glasgow coma scale': [14, 1.5], 'Haemoglobin': [12.8, 1.8], 'WBC': [8, 3, 1], 'Platelets': [250, 70], 'Creatinine': [1, 0.35, 1], 'Urea': [35, 12, 1], 'ALT': [30, 18, 1], 'AST': [28, 14, 1], 'Albumin': [3.9, 0.5],
    'Total bilirubin': [0.8, 0.45, 1], 'Sodium': [138, 3], 'Potassium': [4.2, 0.45], 'Fasting glucose': [110, 30, 1], 'HbA1c': [6.5, 1.3], 'CRP': [15, 20, 1], 'INR': [1.1, 0.2], 'Troponin': [20, 40, 1], 'D-dimer': [800, 600, 1],
    'Vitamin D': [22, 10], 'LDL cholesterol': [120, 35], 'Pain VAS': [6, 2], 'Pain NRS': [6, 2], 'WOMAC': [55, 15], 'Oswestry disability index': [40, 15], 'Barthel index': [70, 20], 'PHQ-9': [8, 5, 1], 'GAD-7': [7, 4, 1],
    'MMSE': [25, 4], 'APACHE II': [15, 7], 'SOFA': [6, 3], 'Operative time': [90, 30], 'Blood loss': [250, 150, 1], 'Length of stay': [5, 3, 1], 'Follow-up': [12, 4], 'Index test value': [50, 20] };
  const YES_PCT = { 'Hypertension': 30, 'Diabetes': 20, 'Ischaemic heart disease': 10, 'Heart failure': 5, 'COPD': 8, 'Asthma': 7, 'Chronic kidney disease': 6, 'Chronic liver disease': 4, 'Stroke': 4, 'Dyslipidaemia': 25, 'Hypothyroidism': 6,
    'Cancer': 5, 'Previous surgery': 30, 'Intraoperative complications': 5, 'Conversion': 4, 'Complications': 15, 'Readmission': 8, 'Reoperation': 5, 'ICU admission': 10, 'Recurrence': 10, 'Mortality': 5 };
  const CAT_PCT = { 'Smoking': [55, 20, 25], 'ASA class': [30, 45, 20, 4, 1], 'Residence': [60, 40], 'Satisfaction': [10, 20, 40, 30], 'Index test result': [40, 60], 'Reference standard': [35, 65] };
  const DATE_GAP = { 'Date of surgery': [1, 1], 'Date of discharge': [4, 2], 'Date of death': [60, 40] };
  function expectOf(label, type, cats) {
    if (type === 'num' || type === 'calc') { const e = EXPECT[label]; return e ? { mean: e[0], sd: e[1], dist: e[2] ? 'skewed' : 'normal' } : { mean: '', sd: '', dist: 'normal' }; }
    if (type === 'yn') { const y = YES_PCT[label] ?? 30; return { pct: [y, 100 - y] }; }
    if (type === 'cat') { const c = CAT_PCT[label]; return { pct: c && c.length === cats.length ? [...c] : cats.map(() => +(100 / cats.length).toFixed(1)) }; }
    if (type === 'date') { const g = DATE_GAP[label] || [7, 3]; return { mean: g[0], sd: g[1] }; }
    return {};
  }
  const libVar = (section, e) => ({ expect: expectOf(e[0], e[1], e[1] === 'yn' ? YN : e[5] || []), id: uid(), section, label: e[0], type: e[1], unit: e[2] || '', min: e[3] ?? '', max: e[4] ?? '', cats: e[1] === 'yn' ? [...YN] : e[5] ? [...e[5]] : [], dec: e[6] ?? '', required: false, visits: [], group: section === 'Medical history' && e[1] === 'yn' ? 'Co-morbidities' : '', role: '', definition: '' });
  const findLib = label => { for (const [sec, list] of LIB) { const e = list.find(x => x[0].toLowerCase() === label.toLowerCase()); if (e) return libVar(sec, e); } return null; };

  /* ---------- templates ---------- */
  const TEMPLATES = {
    rct2: { name: 'Two-arm randomised trial', design: 'rct', arms: ['Intervention', 'Control'], visits: ['Baseline', 'Week 2', 'Month 3'], rand: true,
      vars: [['Age'], ['Sex'], ['Weight'], ['Height'], ['BMI*'], ['Hypertension'], ['Diabetes'], ['Ischaemic heart disease'], ['Smoking'], ['Pain VAS', 'all'], ['Complications', 'last'], ['Satisfaction', 'last']] },
    cohort: { name: 'Cohort with follow-up', design: 'cohort', arms: ['Exposed', 'Not exposed'], visits: ['Baseline', 'Month 6', 'Month 12'],
      vars: [['Age'], ['Sex'], ['Smoking'], ['Hypertension'], ['Diabetes'], ['Chronic kidney disease'], ['Systolic BP', 'all'], ['HbA1c', 'all'], ['Mortality', 'last'], ['Readmission', 'last']] },
    diag: { name: 'Diagnostic accuracy study', design: 'diagnostic', arms: [], visits: ['Baseline'],
      vars: [['Age'], ['Sex'], ['Index test value'], ['Index test result'], ['Reference standard']] },
    before: { name: 'One group, before and after', design: 'beforeafter', arms: [], visits: ['Before', 'After'],
      vars: [['Age'], ['Sex'], ['Weight', 'all'], ['Systolic BP', 'all'], ['Fasting glucose', 'all']] },
    surgery: { name: 'Surgical outcomes study', design: 'cohort', arms: ['Technique A', 'Technique B'], visits: ['Pre-operative', 'Day 1', 'Month 1'],
      vars: [['Age'], ['Sex'], ['ASA class'], ['Hypertension'], ['Diabetes'], ['Date of surgery'], ['Operative time'], ['Blood loss'], ['Pain VAS', 'all'], ['Date of admission'], ['Date of discharge'], ['LOS*'], ['Complications', 'last'], ['Reoperation', 'last']] }
  };
  const blank = () => ({ title: '', design: 'rct', n: 60, arms: ['Group A', 'Group B'], idPrefix: 'P', idDigits: 3, visits: [{ id: 'v0', name: 'Baseline' }], sections: [],
    conv: { naming: 'label', missing: 'blank', date: 'dd/mm/yyyy', catAs: 'words' }, layout: 'wide', rand: { on: false, type: 'block', sizes: '4', strata: [], seed: 20261106, prefill: true }, double: false, checks: [], vars: [] });
  function fromTemplate(key) {
    const t = TEMPLATES[key], D = blank(); D.title = t.name; D.design = t.design; D.arms = [...t.arms]; D.visits = t.visits.map((n, i) => ({ id: 'v' + i, name: n })); D.rand.on = !!t.rand;
    t.vars.forEach(([lab, vis]) => {
      if (lab === 'BMI*') { const w = D.vars.find(v => v.label === 'Weight'), h = D.vars.find(v => v.label === 'Height'); if (w && h) D.vars.push({ ...libVar('Demographics', ['BMI', 'calc', 'kg/m²', 10, 80, null, 1]), formula: { kind: 'bmi', a: w.id, b: h.id } }); return; }
      if (lab === 'LOS*') { const a = D.vars.find(v => v.label === 'Date of admission'), b = D.vars.find(v => v.label === 'Date of discharge'); if (a && b) D.vars.push({ ...libVar('Outcomes', ['Length of stay', 'calc', 'days', 0, 365, null, 0]), formula: { kind: 'days', a: a.id, b: b.id } }); return; }
      const v = findLib(lab); if (!v) return; v.visits = vis === 'all' ? D.visits.map(x => x.id) : vis === 'last' ? [D.visits[D.visits.length - 1].id] : []; D.vars.push(v); });
    if (key === 'surgery') D.checks.push({ a: D.vars.find(v => v.label === 'Date of discharge').id, op: '>=', b: D.vars.find(v => v.label === 'Date of admission').id });
    D.sections = [...new Set(D.vars.map(v => v.section))]; return D;
  }

  /* ---------- names and columns ---------- */
  const unitTag = u => String(u || '').replace(/×10⁹\/L/g, 'x10e9_L').replace(/²/g, '2').replace(/%/g, 'percent').replace(/°C/g, 'C').replace(/µ/g, 'u').replace(/\//g, '_').replace(/[^A-Za-z0-9_]+/g, '').replace(/^_+|_+$/g, '');
  const tagOf = s => String(s).trim().replace(/[^A-Za-z0-9]+/g, '') || 'V';
  function baseName(D, v) {
    if (v.name && v.name.trim()) return v.name.trim();
    const words = String(v.label).replace(/[^A-Za-z0-9 ]+/g, ' ').trim().split(/\s+/).filter(Boolean), u = unitTag(v.unit);
    if (D.conv.naming === 'camel') return words.map(w => w.charAt(0).toUpperCase() + w.slice(1)).join('') + (u ? u.charAt(0).toUpperCase() + u.slice(1).replace(/_/g, '') : '');
    const s = [...words, ...(u ? [u] : [])].join('_'); return D.conv.naming === 'lower' ? s.toLowerCase() : s;
  }
  // skip logic: a variable asked only when another one has a given category
  const whenParent = (D, v) => v.when && v.when.v ? D.vars.find(x => x.id === v.when.v) : null;
  const whenTxt = (D, v) => { const p = whenParent(D, v); return p ? `${p.label} = ${v.when.cat}` : ''; };
  const visitsOf = (D, v) => (v.visits || []).map(id => D.visits.find(x => x.id === id)).filter(Boolean);
  // every column of the wide sheet: [{ col, v, visit }]
  function columns(D) {
    const out = [], order = D.sections.length ? D.sections : [...new Set(D.vars.map(v => v.section))];
    const vs = [...D.vars].sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section));
    vs.forEach(v => { const vis = visitsOf(D, v);
      if (D.layout === 'long' || vis.length <= 1) out.push({ col: baseName(D, v) + (D.layout !== 'long' && vis.length === 1 && D.visits.length > 1 && vis[0].id !== D.visits[0].id ? '_' + tagOf(vis[0].name) : ''), v, visit: D.layout === 'long' ? null : vis[0] || null });
      else vis.forEach(x => out.push({ col: `${baseName(D, v)}_${tagOf(x.name)}`, v, visit: x })); });
    return out;
  }
  function problems(D) {
    const out = [], cols = columns(D), seen = {};
    cols.forEach(c => { const k = c.col.toLowerCase(); if (seen[k]) out.push(`Two columns are named “${c.col}”`); seen[k] = 1;
      if (c.col.length > 32) out.push(`“${c.col}” is longer than 32 characters (SPSS)`); if (!/^[A-Za-z]/.test(c.col)) out.push(`“${c.col}” should start with a letter`); });
    D.vars.forEach(v => { if (v.type === 'num' && v.min === '' && v.max === '') out.push(`${v.label}: no allowed range (typing errors are not caught)`);
      if ((v.type === 'cat') && v.cats.length < 2) out.push(`${v.label}: fewer than two categories`); if (v.type === 'calc' && !(v.formula && (v.formula.a || (v.formula.list || []).length))) out.push(`${v.label}: the formula is not complete`);
      if (v.when && v.when.v) { const p = whenParent(D, v); if (!p) out.push(`${v.label}: asked only when a variable that was removed — change it in step 3`); else if (!p.cats.includes(v.when.cat)) out.push(`${v.label}: asked only when ${p.label} = ${v.when.cat}, a category that no longer exists`); } });
    // the design as a whole
    const labs = {}; D.vars.forEach(v => { const k = v.label.trim().toLowerCase(); if (labs[k]) out.push(`Two variables are labelled “${v.label}”`); labs[k] = 1; });
    if (D.design === 'rct' && D.arms.filter(Boolean).length < 2) out.push('A randomised trial needs at least two groups (step 2)');
    if (D.vars.length && !D.vars.some(v => v.role === 'primary')) out.push('No primary outcome is marked (Role, in step 3) — the sample size and the analysis plan use it');
    if (D.visits.length > 1) D.visits.forEach((x, i) => { if (!D.vars.some(v => (v.visits || []).includes(x.id) || (i === 0 && !(v.visits || []).length))) out.push(`Visit “${x.name}” has no variable`); });
    const ss = ssCalc(D); if (ss && !ss.err && +D.n < ss.enrol) out.push(`The planned number of patients (${D.n}) is below the sample size (${ss.enrol} to enrol) — step 1`);
    return out;
  }

  /* ---------- sample size: two groups (means or proportions) or one group before and after (paired means) ---------- */
  const ssDef = D => (D.ss = { v: '', alpha: 0.05, power: 0.8, drop: 10, ratio: 1, a: '', b: '', sd: '', ...(D.ss || {}) });
  const ssOutcomes = D => D.vars.filter(v => v.type === 'num' || v.type === 'calc' || ((v.type === 'yn' || v.type === 'cat') && v.cats.length === 2));
  function ssCalc(D) {
    const s = ssDef(D), St = typeof Stats !== 'undefined' ? Stats : null, arms = D.arms.filter(Boolean), k = arms.length;
    const v = D.vars.find(x => x.id === s.v) || ssOutcomes(D).find(x => x.role === 'primary'); if (!v || !St) return null;
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
        v = { type: 'num', dec: String(dec), min: lib && lib.min !== '' ? Math.min(+lib.min, lo) : Math.floor(lo), max: lib && lib.max !== '' ? Math.max(+lib.max, hi) : Math.ceil(hi), expect: { mean: +m.toFixed(2), sd: +sd.toFixed(2), dist: sk > 1 && lo >= 0 ? 'skewed' : 'normal' } }; }
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
  function addScale(D, name, items, min, max, def) {
    const all = D.visits.length > 1 && confirm(`Collect ${name} at every visit (${D.visits.map(x => x.name).join(', ')})?\nOK: every visit · Cancel: the first visit only`), vis = all ? D.visits.map(x => x.id) : [];
    const im = +(min + (max - min) * 0.35).toFixed(2), isd = +((max - min) / 3.2).toFixed(2), tag = tagOf(name);
    const ids = items.map((t, i) => { const v = { id: uid(), section: name, label: t ? `${name} ${i + 1}. ${t}` : `${name} item ${i + 1}`, name: `${tag}_${i + 1}`, type: 'num', unit: '', min, max, cats: [], dec: '0', required: false, visits: [...vis], group: '', role: '', definition: '', scale: name, expect: { mean: im, sd: isd, dist: 'normal' } }; D.vars.push(v); return v.id; });
    const k = items.length, tsd = +(isd * Math.sqrt(k * (1 + (k - 1) * 0.6))).toFixed(1);
    D.vars.push({ id: uid(), section: name, label: `${name} total`, name: `${tag}_total`, type: 'calc', unit: '', min: k * min, max: k * max, cats: [], dec: '0', required: false, visits: [...vis], group: '', role: '', definition: def || `${name}: sum of ${k} items (${min}–${max} each)`, formula: { kind: 'sum', list: ids }, expect: { mean: +(k * im).toFixed(1), sd: tsd, dist: 'normal' } });
    if (!D.sections.includes(name)) D.sections.push(name); return ids.length;
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
    const combos = strata.reduce((acc, v) => acc.flatMap(a => v.cats.map(c => [...a, `${v.label}: ${c}`])), [[]]);
    return combos.map(c => ({ stratum: c.join(' · ') || 'All patients', list: allocation(D, +D.n || 60, rnd) }));
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
      + `<cellXfs count="${6 + SEC_FILL.length}"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>`
      + `<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>`
      + SEC_FILL.map((_, i) => `<xf numFmtId="0" fontId="2" fillId="${4 + i}" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>`).join('')
      + `<xf numFmtId="0" fontId="0" fillId="3" borderId="0" xfId="0" applyFill="1"/></cellXfs>`
      + `<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>`
      + `<dxfs count="3"><dxf><font><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf><dxf><font><b/><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFEB9C"/></patternFill></fill></dxf><dxf><font><color rgb="FF808080"/></font><fill><patternFill><bgColor rgb="FFD9D9D9"/></patternFill></fill></dxf></dxfs>`
      + `<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
  }
  const CALC_STYLE = 5 + SEC_FILL.length;
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
    if (o.widths && o.widths.length) x += `<cols>${o.widths.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols>`;
    x += `<sheetData>${rows.map((r, ri) => `<row r="${ri + 1}"${o.rowH && o.rowH[ri] ? ` ht="${o.rowH[ri]}" customHeight="1"` : ''}>${r.map((c, ci) => cell(c, ri, ci)).join('')}</row>`).join('')}</sheetData>`;
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
    const n = fill ? fill.patients.length : Math.max(1, +D.n || 60), ids = fill ? fill.patients.map(p => p.id) : Array.from({ length: n }, (_, i) => `${D.idPrefix || ''}${String(i + 1).padStart(+D.idDigits || 3, '0')}`);
    const rand = hasGroup && D.rand.on ? randomisation(D) : null, prefillGroup = rand && rand.length === 1 && D.rand.prefill !== false ? rand[0].list : null;
    const order = D.sections.length ? D.sections : [...new Set(D.vars.map(v => v.section))];
    // lists of the categories (a hidden sheet, so any category works in a drop-down list)
    const listCols = [], listOf = {}; D.vars.filter(v => v.type === 'cat' || v.type === 'yn').forEach(v => { listOf[v.id] = listCols.length; listCols.push(D.conv.catAs === 'codes' ? v.cats.map((_, i) => i + 1) : v.cats); });
    if (hasGroup) { listOf.__group = listCols.length; listCols.push(arms); }
    const listsRows = Array.from({ length: Math.max(1, ...listCols.map(l => l.length)) }, (_, r) => listCols.map(l => l[r] ?? null));
    const dataSheet = (cs, name, withLead) => {
      const lead = [{ col: 'ID' }, ...(hasGroup ? [{ col: 'Group' }] : []), ...(long ? [{ col: 'Visit' }] : [])], all = [...lead, ...cs], nRows = long ? n * D.visits.length : n;
      const head0 = all.map(() => null), head1 = all.map(c => ({ v: c.col, s: 1 })), merges = [];
      // row 1: the sections over their columns, each in its colour
      let i = lead.length; head0[0] = { v: 'Study', s: 5 }; for (let k = 1; k < lead.length; k++) head0[k] = { v: '', s: 5 }; if (lead.length > 1) merges.push(`A1:${colL(lead.length - 1)}1`);
      while (i < all.length) { const sec = all[i].v.section; let j = i; while (j + 1 < all.length && all[j + 1].v.section === sec) j++; const st = 5 + (order.indexOf(sec) % SEC_FILL.length + SEC_FILL.length) % SEC_FILL.length;
        for (let k = i; k <= j; k++) head0[k] = { v: k === i ? sec : '', s: st }; if (j > i) merges.push(`${colL(i)}1:${colL(j)}1`); i = j + 1; }
      const at = (cid, visitId) => { const k = all.findIndex(c => c.v && c.v.id === cid && (long || !visitId || (c.visit && c.visit.id === visitId) || (!c.visit && !visitId))); return k < 0 ? all.findIndex(c => c.v && c.v.id === cid) : k; };
      const rows = [head0, head1];
      const fv = (p, v, c, vi) => { if (!fill || !withLead) return null; const pv = fill.patients[p].vals[v.id] || {}; if (long) { const vis = (v.visits || []).length ? v.visits : [D.visits[0].id]; const id = D.visits[vi].id; return vis.includes(id) ? (pv[id] ?? (id === D.visits[0].id ? pv.once : null)) : null; }
        return c.visit ? (pv[c.visit.id] ?? (c.visit.id === D.visits[0].id ? pv.once : null)) : (pv.once ?? pv[D.visits[0].id] ?? null); };
      for (let r = 0; r < nRows; r++) { const p = long ? Math.floor(r / D.visits.length) : r, vi = long ? r % D.visits.length : 0, R = r + 3;
        const row = all.map((c, ci) => { if (ci === 0) return withLead ? ids[p] : null; if (c.col === 'Group') return withLead ? (fill ? fill.patients[p].group : prefillGroup ? prefillGroup[p] : null) : null; if (c.col === 'Visit') return D.visits[vi].name;
          const v = c.v, val = fv(p, v, c, vi); if (v.type === 'date') return { v: typeof val === 'string' ? (xlDate(val) ?? val) : val, s: typeof val === 'string' && !/^\d{4}-/.test(val) ? 0 : 2 };
          if (v.type !== 'calc' && fill) return val;
          if (v.type === 'calc' && v.formula) { const f = v.formula, A = at(f.a, c.visit && c.visit.id), B = f.b ? at(f.b, c.visit && c.visit.id) : -1, a = A >= 0 ? `${colL(A)}${R}` : null, b = B >= 0 ? `${colL(B)}${R}` : null;
            let fx = null;
            if (f.kind === 'bmi' && a && b) fx = `IF(AND(ISNUMBER(${a}),ISNUMBER(${b}),${b}>0),ROUND(${a}/(${b}/100)^2,1),"")`;
            if (f.kind === 'days' && a && b) fx = `IF(AND(ISNUMBER(${a}),ISNUMBER(${b})),${b}-${a},"")`;
            if (f.kind === 'age' && a) fx = b ? `IF(AND(ISNUMBER(${a}),ISNUMBER(${b})),DATEDIF(${a},${b},"y"),"")` : `IF(ISNUMBER(${a}),DATEDIF(${a},TODAY(),"y"),"")`;
            if (f.kind === 'change' && !long) { const vs = all.map((x, k) => [x, k]).filter(([x]) => x.v && x.v.id === f.a), first = vs[0], last = vs[vs.length - 1]; if (first && last && first !== last) fx = `IF(AND(ISNUMBER(${colL(last[1])}${R}),ISNUMBER(${colL(first[1])}${R})),${colL(last[1])}${R}-${colL(first[1])}${R},"")`; }
            if ((f.kind === 'sum' || f.kind === 'mean') && (f.list || []).length) { const refs = f.list.map(id => at(id, c.visit && c.visit.id)).filter(k => k >= 0).map(k => `${colL(k)}${R}`); if (refs.length) fx = `IF(COUNT(${refs.join(',')})=${refs.length},${f.kind === 'sum' ? 'SUM' : 'AVERAGE'}(${refs.join(',')}),"")`; }
            return fx ? { f: fx, s: CALC_STYLE, cv: fill ? val : undefined } : { v: fill ? val : null, s: CALC_STYLE }; }
          return null; });
        rows.push(row); }
      // validations, highlighting and the input message of each column
      const dv = [], cfs = [], last = nRows + 2, ref = k => `${colL(k)}3:${colL(k)}${Math.max(last, 3) + 500}`, lettersOfLists = k => `Lists!$${colL(k)}$1:$${colL(k)}$${listCols[k].length}`;
      if (hasGroup) dv.push({ type: 'list', ref: ref(1), f1: lettersOfLists(listOf.__group), errTitle: 'Group', err: `Choose: ${arms.join(', ')}`, pTitle: 'Group', prompt: arms.join(' / ') });
      all.forEach((c, k) => { const v = c.v; if (!v) return; const unit = v.unit ? ` (${v.unit})` : '', note = [v.definition, v.required ? 'Required' : ''].filter(Boolean).join(' · ');
        if (v.type === 'cat' || v.type === 'yn') dv.push({ type: 'list', ref: ref(k), f1: lettersOfLists(listOf[v.id]), errTitle: v.label, err: `Choose from the list: ${(D.conv.catAs === 'codes' ? v.cats.map((x, i) => `${i + 1}=${x}`) : v.cats).join(', ')}`, pTitle: v.label, prompt: ((D.conv.catAs === 'codes' ? v.cats.map((x, i) => `${i + 1} = ${x}`).join(', ') : v.cats.join(' / ')) + (note ? ` · ${note}` : '')) });
        if (v.type === 'num') { const lo = v.min === '' ? null : +v.min, hi = v.max === '' ? null : +v.max, miss = missingCode(D), whole = String(v.dec) === '0';
          if (lo !== null && hi !== null && miss === null) dv.push({ type: whole ? 'whole' : 'decimal', op: 'between', ref: ref(k), f1: lo, f2: hi, errTitle: 'Out of range', err: `${v.label}${unit}: ${lo} to ${hi}`, pTitle: v.label + unit, prompt: `${lo} to ${hi}${note ? ` · ${note}` : ''}` });
          else dv.push({ type: 'decimal', op: 'between', ref: ref(k), f1: -1e15, f2: 1e15, errTitle: 'A number', err: `${v.label}: a number${miss !== null ? ` (missing: ${miss})` : ''}`, pTitle: v.label + unit, prompt: `${lo !== null && hi !== null ? `${lo} to ${hi}` : 'A number'}${miss !== null ? ` · missing = ${miss}` : ''}${note ? ` · ${note}` : ''}` });
          if (lo !== null && hi !== null) cfs.push({ ref: ref(k), type: 'expression', f: [`AND(ISNUMBER(${colL(k)}3),OR(${colL(k)}3<${lo},${colL(k)}3>${hi})${miss !== null ? `,${colL(k)}3<>${miss}` : ''})`] }); }
        if (v.type === 'date') dv.push({ type: 'date', op: 'between', ref: ref(k), f1: 1, f2: 2958465, errTitle: 'A date', err: `${v.label}: a date (${D.conv.date})`, pTitle: v.label, prompt: `A date, ${D.conv.date}${note ? ` · ${note}` : ''}` });
        if (v.type === 'text' || v.type === 'time') dv.push({ type: 'textLength', op: 'lessThanOrEqual', ref: ref(k), f1: 255, pTitle: v.label + unit, prompt: note || (v.type === 'time' ? 'hh:mm' : 'Text') });
        // skip logic: the cells of a patient who is not asked are greyed
        const pv = whenParent(D, v); if (pv) { const pk = at(pv.id, c.visit && c.visit.id); if (pk >= 0 && pk !== k) { const P = `${colL(pk)}3`, want = D.conv.catAs === 'codes' ? String(codeOf(pv, v.when.cat)) : `"${String(v.when.cat).replace(/"/g, '""')}"`; cfs.push({ ref: ref(k), type: 'expression', dxf: 2, f: [`AND(${P}<>"",${P}<>${want})`] }); } } });
      // checks across columns (e.g. discharge ≥ admission): highlighted when broken
      (D.checks || []).forEach(ch => { const ks = all.map((c, k) => [c, k]).filter(([c]) => c.v && c.v.id === ch.a), kb = all.map((c, k) => [c, k]).filter(([c]) => c.v && c.v.id === ch.b);
        ks.forEach(([ca, a], i) => { const b = (kb.find(([cb]) => (cb.visit && cb.visit.id) === (ca.visit && ca.visit.id)) || kb[i] || kb[0] || [])[1]; if (b === undefined) return; const op = { '>': '<=', '>=': '<', '<': '>=', '<=': '>', '=': '<>' }[ch.op] || '<';
          cfs.push({ ref: `${colL(a)}3:${colL(a)}${Math.max(last, 3) + 500}`, type: 'expression', dxf: 1, f: [`AND(ISNUMBER(${colL(a)}3),ISNUMBER(${colL(b)}3),${colL(a)}3${op}${colL(b)}3)`] }); }); });
      return { name, xml: sheetXml(rows, { widths: all.map(c => Math.min(28, Math.max(9, c.col.length + 2))), freeze: { r: 2, c: 1 }, merges, dv, cfs, rowH: { 1: 30 }, tab: name === 'Data' }) };
    };
    const sheets = [];
    if (perVisit) D.visits.forEach((x, vi) => { const cs = cols.filter(c => vi === 0 ? !c.visit || c.visit.id === x.id || !(c.v.visits || []).length : c.visit && c.visit.id === x.id).map(c => ({ ...c, col: baseName(D, c.v) }));
      sheets.push(dataSheet(cs, x.name.slice(0, 31), true)); });
    else sheets.push(dataSheet(cols, 'Data', true));
    if (D.double && !perVisit) { sheets.push(dataSheet(cols, 'Entry 2', true));
      // compare the two entries: a mark where they differ
      const lead = 1 + (hasGroup ? 1 : 0) + (long ? 1 : 0), all = cols.length + lead, nRows = long ? n * D.visits.length : n, cmp = [[{ v: 'Differences between the two entries (≠ marks a cell to check)', s: 3 }], [...Array(all)].map((_, k) => ({ v: k === 0 ? 'ID' : `${(['ID', ...(hasGroup ? ['Group'] : []), ...(long ? ['Visit'] : []), ...cols.map(c => c.col)])[k]}`, s: 1 }))];
      for (let r = 0; r < nRows; r++) { const R = r + 3; cmp.push([...Array(all)].map((_, k) => k === 0 ? { f: `Data!A${R}` } : { f: `IF(Data!${colL(k)}${R}&""='Entry 2'!${colL(k)}${R}&"","","≠")` })); }
      sheets.push({ name: 'Compare', xml: sheetXml(cmp, { widths: [...Array(all)].map(() => 12), freeze: { r: 2, c: 1 }, cfs: [{ ref: `B3:${colL(all - 1)}${nRows + 2}`, type: 'cellIs', op: 'equal', f: ['"≠"'] }] }) }); }
    // codebook, instructions, randomisation, lists and the setup for the analysis
    const cb = [['Column', 'Label', 'Section', 'Type', 'Unit', 'Allowed values / range', 'Codes', 'Visit', 'Required', 'Item group', 'Definition', 'Formula', 'Asked only when'].map(v => ({ v, s: 1 }))];
    cols.forEach(c => { const v = c.v; cb.push([c.col, v.label, v.section, { num: 'Number', yn: 'Yes / no', cat: 'Categories', date: 'Date', time: 'Time', text: 'Text', calc: 'Calculated' }[v.type] || v.type, v.unit, v.type === 'num' || v.type === 'calc' ? (v.min !== '' || v.max !== '' ? `${v.min} to ${v.max}` : '') : v.cats.join(' / '),
      (v.type === 'cat' || v.type === 'yn') ? v.cats.map((x, i) => `${i + 1}=${x}`).join(', ') : '', c.visit ? c.visit.name : long ? (visitsOf(D, v).map(x => x.name).join(', ') || 'all') : '', v.required ? 'Yes' : '', v.group || '', v.definition || '', v.type === 'calc' && v.formula ? { bmi: 'Weight / (height in m)²', days: 'Days between the two dates', age: 'Completed years between the dates', change: 'Last visit − first visit', sum: 'Sum of items', mean: 'Mean of items' }[v.formula.kind] || '' : '', whenTxt(D, v)]); });
    sheets.push({ name: 'Codebook', xml: sheetXml(cb, { widths: [22, 26, 16, 12, 10, 26, 26, 12, 9, 16, 40, 26, 26], freeze: { r: 1, c: 0 } }) });
    const ins = [[{ v: D.title || 'Master sheet', s: 3 }], ...(fill && fill.simulated ? [[{ v: `SIMULATED DATA — generated ${fill.simulated.at} (seed ${fill.simulated.seed}). Not real patients.`, s: 3 }, '']] : []), ['How to fill this sheet', ''],
      ['1', 'One row per patient' + (long ? ' and visit' : '') + '. Keep the ID; do not change the column names in row 2 (row 1 shows the sections).'],
      ['2', 'Choose categories from the drop-down list; numbers outside the allowed range are refused or highlighted in red.'],
      ['3', `Missing values: ${D.conv.missing === '999' ? 'type 999' : 'leave the cell empty'}. Dates: ${D.conv.date}.`],
      ['4', 'Grey columns are calculated by Excel — do not type in them.'],
      ['5', 'Cells highlighted in yellow break a rule between columns (e.g. discharge before admission).'],
      ...(D.double ? [['6', 'Double entry: a second person types the same forms in “Entry 2”; the “Compare” sheet marks every difference (≠).']] : []),
      ...(rand ? [['7', `The allocation of each patient is in “Randomisation” (${D.rand.type === 'simple' ? 'simple' : `blocks of ${D.rand.sizes}`}, seed ${D.rand.seed}). Allocate in order and do not skip numbers.`]] : []),
      ...(D.vars.some(v => whenParent(D, v)) ? [['8', `Grey cells are not asked for this patient: ${D.vars.filter(v => whenParent(D, v)).map(v => `${v.label} only when ${whenTxt(D, v)}`).join('; ')}.`]] : []),
      ['', ''], ['Upload this file to Prof MSE Easy Stat: the setup (labels, units, groups, visits and categories) is read from it.', '']];
    sheets.push({ name: 'Instructions', xml: sheetXml(ins, { widths: [6, 110] }) });
    if (rand) { const rr = [['Stratum', 'No.', 'Allocation', 'Patient ID', 'Date', 'Initials'].map(v => ({ v, s: 1 }))]; rand.forEach(s => s.list.forEach((a, i) => rr.push([s.stratum, i + 1, a, rand.length === 1 ? ids[i] : null, null, null]))); sheets.push({ name: 'Randomisation', xml: sheetXml(rr, { widths: [30, 6, 16, 12, 12, 10], freeze: { r: 1, c: 0 } }) }); }
    sheets.push({ name: 'Lists', hidden: true, xml: sheetXml(listsRows, {}) });
    const setup = JSON.stringify({ ...setupFor(D), ...(fill && fill.simulated ? { simulated: fill.simulated, targets: fill.targets || null } : {}) }), chunks = []; for (let k = 0; k < setup.length; k += 30000) chunks.push([setup.slice(k, k + 30000)]);
    sheets.push({ name: '_EasyStatSetup', hidden: true, xml: sheetXml(chunks, {}) });
    return xlsxBlob(sheets);
  }
  // what the analysis needs to know about every column
  function setupFor(D) {
    const cols = columns(D), long = D.layout === 'long';
    return { app: 'ProfMSE-EasyStat-mastersheet', version: 1, title: D.title, design: D.design, groupCol: D.arms.filter(Boolean).length >= 2 ? 'Group' : '', idCol: 'ID', arms: D.arms, layout: D.layout, catAs: D.conv.catAs, missing: D.conv.missing,
      visits: D.visits.map(x => ({ tag: tagOf(x.name), name: x.name })),
      sampleSize: (r => r && !r.err ? r.text : '')(ssCalc(D)),
      vars: D.vars.map(v => ({ id: v.id, label: v.label, unit: v.unit, type: v.type, cats: v.cats, group: v.group || (v.scale ? '' : v.group), role: v.role, definition: v.definition, section: v.section, when: whenTxt(D, v) || undefined,
        cols: long ? [{ col: baseName(D, v) }] : cols.filter(c => c.v.id === v.id).map(c => ({ col: c.col, visit: c.visit ? tagOf(c.visit.name) : '', visitName: c.visit ? c.visit.name : '' })) })) };
  }

  /* ---------- case report form (Word) ---------- */
  async function buildCrf(D) {
    const d = window.docx, { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, HeadingLevel, AlignmentType } = d, kids = [];
    const order = D.sections.length ? D.sections : [...new Set(D.vars.map(v => v.section))], font = 'Calibri';
    const P = (t, o = {}) => new Paragraph({ spacing: { after: o.after ?? 60 }, alignment: o.align, children: [new TextRun({ text: t, bold: o.bold, size: o.size || 21, font, color: o.color })] });
    const answer = v => v.type === 'cat' || v.type === 'yn' ? v.cats.map(c => `☐ ${c}`).join('     ') : v.type === 'date' ? '__ __ / __ __ / __ __ __ __' : v.type === 'time' ? '__ __ : __ __' : v.type === 'calc' ? '(calculated)' : `_____________${v.unit ? ' ' + v.unit : ''}${v.min !== '' && v.max !== '' ? `   (${v.min}–${v.max})` : ''}`;
    const cell = (t, w, b) => new TableCell({ width: { size: w, type: WidthType.PERCENTAGE }, children: [P(t, { bold: b, after: 0 })] });
    kids.push(new Paragraph({ heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, children: [new TextRun({ text: D.title || 'Case report form', bold: true, size: 32, font })] }));
    kids.push(P(`Patient ID: ______________     ${D.arms.filter(Boolean).length >= 2 ? `Group: ${D.arms.map(a => `☐ ${a}`).join('   ')}` : ''}     Date: __ / __ / ____`, { after: 200 }));
    order.forEach(sec => { const vs = D.vars.filter(v => v.section === sec); if (!vs.length) return;
      kids.push(new Paragraph({ heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 80 }, children: [new TextRun({ text: sec, bold: true, size: 26, font })] }));
      const once = vs.filter(v => visitsOf(D, v).length <= 1), rep = vs.filter(v => visitsOf(D, v).length > 1);
      if (once.length) kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: once.map(v => new TableRow({ children: [cell((whenParent(D, v) ? '↳ ' : '') + v.label + (v.unit && v.type !== 'num' ? ` (${v.unit})` : '') + (v.required ? ' *' : '') + (whenParent(D, v) ? ` (if ${whenTxt(D, v)})` : ''), 38, true), cell(answer(v), 62)] })) }));
      if (rep.length) { const vis = [...new Set(rep.flatMap(v => visitsOf(D, v).map(x => x.id)))].map(id => D.visits.find(x => x.id === id)), w = Math.floor(62 / vis.length);
        kids.push(P('', { after: 60 }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [cell('', 38, true), ...vis.map(x => cell(x.name, w, true))] }),
          ...rep.map(v => new TableRow({ children: [cell(v.label + (v.unit ? ` (${v.unit})` : '') + (whenParent(D, v) ? ` (if ${whenTxt(D, v)})` : ''), 38, true), ...vis.map(x => cell((v.visits || []).includes(x.id) ? (v.type === 'cat' || v.type === 'yn' ? v.cats.map(c => `☐ ${c}`).join('  ') : '') : '—', w))] }))] })); }
      const defs = vs.filter(v => v.definition); if (defs.length) kids.push(P(defs.map(v => `${v.label}: ${v.definition}`).join(' · '), { size: 18, color: '555555', after: 120 })); });
    kids.push(P(''), P('Investigator: ____________________     Signature: ____________     Date: __ / __ / ____', { after: 0 }));
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
    let lastSec = ''; allC.forEach(c => { const v = c.v, sec = v.section !== lastSec ? v.section : ''; lastSec = v.section;
      const type = v.type === 'yn' ? 'yesno' : v.type === 'cat' ? 'radio' : v.type === 'calc' ? 'text' : 'text', val = v.type === 'num' ? (String(v.dec) === '0' ? 'integer' : 'number') : v.type === 'date' ? (D.conv.date.startsWith('mm') ? 'date_mdy' : D.conv.date.startsWith('yyyy') ? 'date_ymd' : 'date_dmy') : v.type === 'time' ? 'time' : '';
      rows.push([rc(c.col), 'master_sheet', sec, type, v.label + (c.visit ? ` — ${c.visit.name}` : ''), v.type === 'cat' ? v.cats.map((x, i) => `${i + 1}, ${x}`).join(' | ') : '', [v.unit, v.definition, v.type === 'calc' ? 'calculated in Excel' : ''].filter(Boolean).join(' · '), val, v.type === 'num' ? v.min : '', v.type === 'num' ? v.max : '', '', branch(c), v.required ? 'y' : '', '', '', '', '', '']); });
    return new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' });
  }

  /* ---------- the workspace ---------- */
  let D = ls.get('current', null) || fromTemplate('rct2'), tab = 'study', sel = null, libQ = '', pasteOpen = false, pasteTxt = '';
  // undo / redo: a snapshot before each change (typing in one field is one step)
  let undoS = [], redoS = [], lastT = 0, prevJ = JSON.stringify(D);
  const save = () => { const j = JSON.stringify(D), now = Date.now(); if (j !== prevJ) { if (now - lastT > 800) { undoS.push(prevJ); if (undoS.length > 80) undoS.shift(); redoS = []; } lastT = now; prevJ = j; } ls.set('current', D); };
  function undo(back) { const from = back ? undoS : redoS, to = back ? redoS : undoS; if (!from.length) { toast(back ? 'Nothing to undo' : 'Nothing to redo'); return; } to.push(JSON.stringify(D)); D = JSON.parse(from.pop()); prevJ = JSON.stringify(D); lastT = 0; ls.set('current', D); if (sel && !D.vars.some(v => v.id === sel)) sel = null; render(); }
  const TABS = [['study', '1 · Study'], ['visits', '2 · Groups & visits'], ['vars', '3 · Variables'], ['rules', '4 · Rules'], ['preview', '5 · Preview'], ['export', '6 · Export']];
  const TYPES = [['num', 'Number'], ['yn', 'Yes / no'], ['cat', 'Categories'], ['date', 'Date'], ['time', 'Time'], ['text', 'Text'], ['calc', 'Calculated (Excel formula)']];
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
      <select id="mbTpl" style="width:auto"><option value="">New from template…</option>${opt(Object.entries(TEMPLATES).map(([k, t]) => [k, t.name]), '')}<option value="__blank">Empty design</option></select>
      <select id="mbMine" style="width:auto"><option value="">My designs…</option>${opt(Object.keys(ls.get('designs', {})).map(k => [k, k]), '')}</select>
      <button class="btn ghost small" id="mbUndo" type="button" title="Undo (Ctrl+Z)" ${undoS.length ? '' : 'disabled'}>↶</button><button class="btn ghost small" id="mbRedo" type="button" title="Redo (Ctrl+Y)" ${redoS.length ? '' : 'disabled'}>↷</button>
      <label class="btn ghost small" style="margin:0" title="Make the design from a sheet you already have: its columns, types, categories, ranges, visits (from suffixes such as _Baseline, _M3), groups — and its values as the expected values">⬆ From an existing sheet<input type="file" id="mbFromSheet" accept=".xlsx,.xls,.xlsm,.csv,.txt" hidden></label>
      <button class="btn ghost small" id="mbSaveAs" type="button">💾 Save design</button><button class="btn ghost small" id="mbExportJson" type="button" title="The design as a file, to share or keep">⬇ Design file</button><label class="btn ghost small" style="margin:0">⬆ Open design<input type="file" id="mbImportJson" accept=".json" hidden></label>
      <button class="btn primary small" id="mbClose" type="button" title="Phase 2: fill the sheet with simulated patients">🎲 Generate the data ›</button></div>
      <div class="mb-tabs">${TABS.map(([k, l]) => `<button type="button" class="mb-tab ${tab === k ? 'on' : ''}" data-mbtab="${k}">${l}${k === 'preview' && pr.length ? ` <span class="chip warn">${pr.length}</span>` : ''}</button>`).join('')}</div>
      <div class="mb-body">${({ study: tStudy, visits: tVisits, vars: tVars, rules: tRules, preview: tPreview, export: tExport })[tab]()}</div>`;
  }
  const tStudy = () => `<div class="grid g3">
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
    const s = ssDef(D), r = ssCalc(D), vs = ssOutcomes(D), v = r && r.v, arms = D.arms.filter(Boolean), paired = arms.length < 2 && D.visits.length > 1;
    const num = v && (v.type === 'num' || v.type === 'calc'), inp = (k, lab, ph, w = 100) => `<div><label class="f">${lab}</label><input type="number" step="any" data-mbs="${k}" value="${esc(s[k])}" placeholder="${esc(ph ?? '')}" style="width:${w}px"></div>`;
    return `<h3>Sample size</h3><p class="legend-note">From the main outcome and its expected values (step 3) — ${paired ? 'one group, before and after (paired t-test)' : 'two groups (t-test for a number, Chi-square for yes/no)'}.</p>
      <div class="row" style="gap:10px;flex-wrap:wrap;align-items:flex-end"><div><label class="f">Main outcome</label><select data-mbs="v" style="width:auto">${opt([['', v && !s.v ? `${v.label} (primary)` : '—'], ...vs.map(x => [x.id, x.label + (x.role === 'primary' ? ' (primary)' : '')])], s.v)}</select></div>
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
    return `<div class="row" style="gap:14px;align-items:baseline;flex-wrap:wrap"><span class="pbig">${r.paired ? `n = ${r.total}` : `${r.n1}${r.n1 === r.n2 ? ' per group' : ` + ${r.n2}`} · ${r.total} in total`}</span><span><b>${r.enrol}</b> to enrol${r.drop ? ` (with ${r.drop}% dropout)` : ''}</span>
      <button class="btn ${+D.n === r.enrol ? 'ghost' : 'primary'} small" type="button" id="mbSsUse" ${+D.n === r.enrol ? 'disabled' : ''}>${+D.n === r.enrol ? '✓ The planned number' : `Use ${r.enrol} as the planned number`}</button><button class="btn ghost small" type="button" id="mbSsCopy">📋 Copy the paragraph</button></div>
      <p class="legend-note" style="margin-top:6px">${esc(r.text)}</p>`;
  }
  const tVisits = () => `<h3 style="margin-top:0">Study groups (arms)</h3><p class="legend-note">Leave one or none for a one-group study.</p>
    <div class="mb-list">${D.arms.map((a, i) => `<div class="row" style="gap:6px"><input type="text" data-mbarm="${i}" value="${esc(a)}" style="max-width:260px"><button class="btn ghost small" type="button" data-mbarmdel="${i}">✕</button></div>`).join('')}<button class="btn ghost small" type="button" id="mbArmAdd">+ Group</button></div>
    <h3>Visits</h3><p class="legend-note">Each variable is collected once (at the first visit) unless you tick other visits for it in step 3.</p>
    <div class="mb-list">${D.visits.map((x, i) => `<div class="row" style="gap:6px"><input type="text" data-mbvis="${i}" value="${esc(x.name)}" style="max-width:220px"><span class="legend-note">column suffix _${esc(tagOf(x.name))}</span>${i ? `<button class="btn ghost small" type="button" data-mbvismove="${i}" title="Earlier">↑</button>` : ''}<button class="btn ghost small" type="button" data-mbvisdel="${i}">✕</button></div>`).join('')}<button class="btn ghost small" type="button" id="mbVisAdd">+ Visit</button></div>
    <h3>Randomisation list</h3><div class="grid g4">
      <div><label class="check" style="margin-top:22px"><input type="checkbox" data-mbr="on" ${D.rand.on ? 'checked' : ''} ${D.arms.filter(Boolean).length < 2 ? 'disabled' : ''}><span><b>Make a randomisation list</b></span></label></div>
      <div><label class="f">Method</label><select data-mbr="type">${opt([['block', 'Permuted blocks'], ['simple', 'Simple (coin toss)']], D.rand.type)}</select></div>
      <div><label class="f">Block sizes</label><input type="text" data-mbr="sizes" value="${esc(D.rand.sizes)}" placeholder="4, 6"></div>
      <div><label class="f">Seed (the same seed gives the same list)</label><input type="number" data-mbr="seed" value="${esc(D.rand.seed)}"></div>
      <div style="grid-column:span 2"><label class="f">Stratified by (a list per stratum)</label><div class="row" style="gap:8px;flex-wrap:wrap">${D.vars.filter(v => (v.type === 'cat' || v.type === 'yn') && v.cats.length <= 6).map(v => `<label class="check" style="margin:0"><input type="checkbox" data-mbstrat="${v.id}" ${(D.rand.strata || []).includes(v.id) ? 'checked' : ''}><span>${esc(v.label)}</span></label>`).join('') || '<span class="legend-note">Add categorical variables first.</span>'}</div></div>
      <div><label class="check" style="margin-top:22px"><input type="checkbox" data-mbr="prefill" ${D.rand.prefill !== false ? 'checked' : ''}><span>Fill the Group column in ID order (no strata)</span></label></div></div>
    ${D.rand.on && D.arms.filter(Boolean).length >= 2 ? (() => { const r = randomisation(D); return `<p class="legend-note">${r.length} list${r.length > 1 ? 's' : ''} of ${D.n}: first allocations ${esc(r[0].list.slice(0, 12).join(', '))} … · per group ${D.arms.map(a => `${esc(a)} ${r[0].list.filter(x => x === a).length}`).join(', ')}</p>`; })() : ''}`;
  function tVars() {
    const order = D.sections.length ? D.sections : [...new Set(D.vars.map(v => v.section))], v = D.vars.find(x => x.id === sel), q = libQ.toLowerCase();
    const lib = LIB.map(([sec, list]) => [sec, list.filter(e => !q || e[0].toLowerCase().includes(q) || sec.toLowerCase().includes(q))]).filter(([, l]) => l.length);
    return `<div class="mb-vars"><div class="mb-col"><div class="row" style="gap:6px;margin-bottom:6px"><b>Variables</b><span class="spacer"></span><button class="btn ghost small" type="button" id="mbNewVar">+ New</button><button class="btn ghost small ${pasteOpen ? 'on' : ''}" type="button" id="mbPaste" title="Type or paste many variables at once">+ List</button><button class="btn ghost small" type="button" id="mbNewSec">+ Section</button></div>
      ${pasteOpen ? `<div class="mb-paste"><textarea id="mbPasteTxt" rows="7" data-keep="1" placeholder="One variable per line, e.g.
Age
HbA1c @all
Pain score (0-10) @all
Smoking: Never / Former / Current
Readmission: Yes / No @last
Date of surgery">${esc(pasteTxt)}</textarea>
        <div class="legend-note">Names from the library are recognised (with their unit, range and categories). <b>Name (unit)</b> a number · <b>Name: A / B / C</b> categories · <b>@all</b> every visit · <b>@last</b> the last visit.</div>
        <div class="row" style="gap:6px;margin-top:4px"><button class="btn primary small" type="button" id="mbPasteGo">Add them</button><button class="btn ghost small" type="button" id="mbPasteCancel">Cancel</button></div></div>` : ''}
      ${order.map((sec, si) => { const vs = D.vars.filter(x => x.section === sec); return `<div class="mb-sec"><div class="mb-sec-h" style="border-left:5px solid #${SEC_FILL[si % SEC_FILL.length]}"><b>${esc(sec)}</b> <span class="legend-note">${vs.length}</span><span class="spacer"></span>${si ? `<button class="btn ghost small" type="button" data-mbsecup="${si}" title="Move the section up">↑</button>` : ''}<button class="btn ghost small" type="button" data-mbsecren="${si}" title="Rename">✎</button></div>
        ${vs.map(x => `<div class="mb-var ${x.id === sel ? 'on' : ''}" data-mbsel="${x.id}"><span>${whenParent(D, x) ? `<span class="legend-note" title="Asked only when ${esc(whenTxt(D, x))}">↳</span> ` : ''}${x.role === 'primary' ? '<span title="Primary outcome">★</span> ' : ''}${esc(x.label)}${x.unit ? ` <span class="legend-note">(${esc(x.unit)})</span>` : ''}</span><span class="spacer"></span><span class="legend-note">${esc({ num: 'Number', yn: 'Yes/no', cat: 'Categories', date: 'Date', time: 'Time', text: 'Text', calc: 'Formula' }[x.type] || x.type)}${(x.visits || []).length > 1 ? ` · ${x.visits.length} visits` : ''}</span><button class="btn ghost small" type="button" data-mbup="${x.id}" title="Up">↑</button><button class="btn ghost small" type="button" data-mbdup="${x.id}" title="Duplicate">⧉</button><button class="btn ghost small" type="button" data-mbdel="${x.id}" title="Remove">✕</button></div>`).join('') || '<div class="legend-note" style="padding:4px 8px">Empty section</div>'}</div>`; }).join('') || '<p class="legend-note">No variables yet — add some from the library →</p>'}</div>
      <div class="mb-col">${v ? editor(v) : '<p class="legend-note">Click a variable to edit it.</p>'}</div>
      <div class="mb-col"><div class="row" style="gap:6px;margin-bottom:6px"><b>Library</b><input type="search" id="mbLibQ" value="${esc(libQ)}" placeholder="Search, e.g. HbA1c" style="flex:1"></div>
        <div class="mb-lib-sec"><div class="legend-note"><b>Scales with their items</b> <span>(an item per column, the total by formula)</span></div>${Object.keys(SCALES).map(k => `<button type="button" class="mb-lib" data-mbscale="${esc(k)}" title="${esc(SCALES[k].items.length)} items, ${SCALES[k].min}–${SCALES[k].max} each, and the total">+ ${esc(k)}</button>`).join('')}<button type="button" class="mb-lib" data-mbscale="__likert" title="Any questionnaire: its name, the number of items and the points of each">+ Likert scale…</button></div>
        ${lib.map(([sec, list]) => `<div class="mb-lib-sec"><div class="legend-note"><b>${esc(sec)}</b></div>${list.map(e => { const has = D.vars.some(x => x.label.toLowerCase() === e[0].toLowerCase()); return `<button type="button" class="mb-lib ${has ? 'has' : ''}" data-mblib="${esc(sec)}|${esc(e[0])}" title="${esc([e[2], e[3] !== undefined && e[3] !== null ? `${e[3]}–${e[4]}` : '', e[5] ? e[5].join(' / ') : ''].filter(Boolean).join(' · '))}">${has ? '✓' : '+'} ${esc(e[0])}</button>`; }).join('')}</div>`).join('')}</div></div>`;
  }
  function editor(v) {
    const others = D.vars.filter(x => x.id !== v.id), sel2 = (k, cur, list) => `<select data-mbv="${k}">${opt(list, cur)}</select>`, varOpt = (filter) => [['', '—'], ...others.filter(filter).map(x => [x.id, x.label])];
    return `<div class="row" style="gap:6px"><b>${esc(v.label)}</b><span class="legend-note">→ ${esc(columns(D).filter(c => c.v.id === v.id).map(c => c.col).join(', '))}</span></div>
      <div class="grid g2" style="margin-top:6px">
      <div><label class="f">Label</label><input type="text" data-mbv="label" value="${esc(v.label)}"></div>
      <div><label class="f">Column name <span class="legend-note">(empty = automatic)</span></label><input type="text" data-mbv="name" value="${esc(v.name || '')}" placeholder="${esc(baseName(D, { ...v, name: '' }))}"></div>
      <div><label class="f">Type</label>${sel2('type', v.type, TYPES)}</div>
      <div><label class="f">Section</label><input type="text" data-mbv="section" value="${esc(v.section)}" list="mbSecList"><datalist id="mbSecList">${(D.sections.length ? D.sections : [...new Set(D.vars.map(x => x.section))]).map(s => `<option value="${esc(s)}">`).join('')}</datalist></div>
      ${v.type === 'num' || v.type === 'calc' ? `<div><label class="f">Unit</label><input type="text" data-mbv="unit" value="${esc(v.unit)}" placeholder="e.g. mg/dL"></div>
        <div><label class="f">Decimals</label><input type="number" min="0" max="6" data-mbv="dec" value="${esc(v.dec)}"></div>
        <div><label class="f">Allowed from</label><input type="number" step="any" data-mbv="min" value="${esc(v.min)}"></div><div><label class="f">to</label><input type="number" step="any" data-mbv="max" value="${esc(v.max)}"></div>` : ''}
      ${v.type === 'cat' || v.type === 'yn' ? `<div style="grid-column:1/-1"><label class="f">Categories, one per line, in order${D.conv.catAs === 'codes' ? ' (coded 1, 2, 3 …)' : ''}</label><textarea data-mbv="cats" rows="${Math.max(2, v.cats.length)}">${esc(v.cats.join('\n'))}</textarea></div>` : ''}
      ${v.type === 'calc' ? `<div><label class="f">Formula</label>${sel2('fkind', (v.formula || {}).kind || 'bmi', [['bmi', 'BMI = weight / (height m)²'], ['days', 'Days between two dates'], ['age', 'Age in years from date of birth'], ['change', 'Change: last − first visit'], ['sum', 'Sum of items'], ['mean', 'Mean of items']])}</div>
        ${['bmi', 'days', 'age', 'change'].includes((v.formula || {}).kind || 'bmi') ? `<div><label class="f">${{ bmi: 'Weight (kg)', days: 'First date', age: 'Date of birth', change: 'Variable' }[(v.formula || {}).kind || 'bmi']}</label>${sel2('fa', (v.formula || {}).a || '', varOpt(x => x.type !== 'calc'))}</div>` : ''}
        ${['bmi', 'days', 'age'].includes((v.formula || {}).kind || 'bmi') ? `<div><label class="f">${{ bmi: 'Height (cm)', days: 'Second date', age: 'Date of the visit (empty: today)' }[(v.formula || {}).kind || 'bmi']}</label>${sel2('fb', (v.formula || {}).b || '', varOpt(x => x.type !== 'calc'))}</div>` : ''}
        ${['sum', 'mean'].includes((v.formula || {}).kind) ? `<div style="grid-column:1/-1"><label class="f">Items</label><div class="row" style="gap:8px;flex-wrap:wrap">${others.filter(x => x.type === 'num').map(x => `<label class="check" style="margin:0"><input type="checkbox" data-mbflist="${x.id}" ${((v.formula || {}).list || []).includes(x.id) ? 'checked' : ''}><span>${esc(x.label)}</span></label>`).join('')}</div></div>` : ''}` : ''}
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
  function expectBox(v) {
    const e = v.expect || (v.expect = expectOf(v.label, v.type, v.cats));
    if (v.type === 'num' || v.type === 'calc') return `<div class="mb-expect"><b>Expected values</b> <span class="legend-note">(used to simulate data)</span><div class="row" style="gap:8px;flex-wrap:wrap;margin-top:4px">
      <div><label class="f">Mean</label><input type="number" step="any" data-mbe="mean" value="${esc(e.mean ?? '')}" style="width:100px"></div><div><label class="f">SD</label><input type="number" step="any" min="0" data-mbe="sd" value="${esc(e.sd ?? '')}" style="width:100px"></div>
      <div><label class="f">Distribution</label><select data-mbe="dist" style="width:auto">${opt([['normal', 'Normal'], ['skewed', 'Skewed (log-normal)']], e.dist || 'normal')}</select></div></div></div>`;
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
    const cols = columns(D), pr = problems(D), hasGroup = D.arms.filter(Boolean).length >= 2, order = D.sections.length ? D.sections : [...new Set(D.vars.map(v => v.section))];
    const lead = ['ID', ...(hasGroup ? ['Group'] : []), ...(D.layout === 'long' ? ['Visit'] : [])], rand = hasGroup && D.rand.on ? randomisation(D)[0].list : null;
    const ex = v => v.type === 'yn' || v.type === 'cat' ? (D.conv.catAs === 'codes' ? '1' : v.cats[0]) : v.type === 'num' ? (v.min !== '' && v.max !== '' ? String(+((+v.min + +v.max) / 2).toFixed(+v.dec || 0)) : '…') : v.type === 'date' ? '15/03/2026' : v.type === 'calc' ? '=…' : '…';
    return `${pr.length ? `<div class="mb-warn"><b>To check (${pr.length})</b><ul>${pr.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>` : '<p class="legend-note">✓ No problem found.</p>'}
      <div class="tbl-wrap" style="max-height:420px"><table class="t mb-prev"><thead><tr><th colspan="${lead.length}" style="background:#${SEC_FILL[0]};color:#fff">Study</th>${(() => { const out = []; let i = 0; while (i < cols.length) { const s = cols[i].v.section; let j = i; while (j + 1 < cols.length && cols[j + 1].v.section === s) j++; out.push(`<th colspan="${j - i + 1}" style="background:#${SEC_FILL[order.indexOf(s) % SEC_FILL.length]};color:#fff">${esc(s)}</th>`); i = j + 1; } return out.join(''); })()}</tr>
        <tr>${lead.map(h => `<th>${h}</th>`).join('')}${cols.map(c => `<th title="${esc(c.v.label)}">${esc(c.col)}</th>`).join('')}</tr></thead>
        <tbody>${[0, 1, 2].map(r => `<tr><td>${esc(D.idPrefix)}${String(r + 1).padStart(+D.idDigits || 3, '0')}</td>${hasGroup ? `<td>${esc(rand ? rand[r] : '▾')}</td>` : ''}${D.layout === 'long' ? `<td>${esc(D.visits[r % D.visits.length].name)}</td>` : ''}${cols.map(c => `<td class="${c.v.type === 'calc' ? 'mb-calc' : ''}">${r ? '' : esc(ex(c.v))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>
      <p class="legend-note">${cols.length + lead.length} columns · ${D.layout === 'long' ? `${(+D.n || 0) * D.visits.length} rows (patients × visits)` : `${D.n} rows`} · grey columns are formulas · drop-down lists, ranges and highlighting are in the Excel file.</p>`;
  }
  const tExport = () => `<div class="grid g2">
      <div class="mb-exp"><b>📗 Excel master sheet</b><p class="legend-note">Section-coloured header, frozen ID column and header, drop-down lists, allowed ranges with messages, out-of-range cells in red, rule breaks in yellow, formula columns, ${D.double ? 'double entry with a compare sheet, ' : ''}${D.rand.on && D.arms.filter(Boolean).length >= 2 ? 'randomisation list, ' : ''}codebook and instructions — and the setup for the analysis inside.</p><button class="btn primary" type="button" id="mbXlsx">⬇ Master sheet (.xlsx)</button></div>
      <div class="mb-exp"><b>📄 Case report form</b><p class="legend-note">A printable form per patient in Word: sections, check boxes for the categories, blanks with units and ranges, a table per visit.</p><button class="btn ghost" type="button" id="mbCrf">⬇ CRF (.docx)</button></div>
      <div class="mb-exp"><b>🗂 REDCap data dictionary</b><p class="legend-note">To build the same form in REDCap (field types, choices, validation, ranges, required fields).</p><button class="btn ghost" type="button" id="mbRedcap">⬇ Data dictionary (.csv)</button></div>
      <div class="mb-exp"><b>🔁 Use it here</b><p class="legend-note">Open an empty copy of the master sheet in the app now (to check the setup), or upload the filled file later — its setup is read by itself.</p><button class="btn ghost" type="button" id="mbTry">Open the empty sheet here</button></div></div>`;
  const fileBase = () => (D.title || 'Master sheet').replace(/[\\/:*?"<>|]+/g, ' ').slice(0, 60).trim() || 'Master sheet';
  async function onClick(e) {
    const b = e.target.closest('button,[data-mbsel],[data-mbtab]'); if (!b) return; const d = b.dataset;
    if (d.mbtab) { tab = d.mbtab; return render(); }
    if (b.id === 'mbClose') return setPhase('generate');
    if (d.mbsel) { sel = d.mbsel; return render(); }
    if (d.mblib) { const [sec, lab] = d.mblib.split('|'), e2 = LIB.find(x => x[0] === sec)[1].find(x => x[0] === lab); const v = libVar(sec, e2); D.vars.push(v); if (!D.sections.includes(sec)) D.sections.push(sec); sel = v.id; save(); return render(); }
    if (b.id === 'mbNewVar') { const sec = (D.vars.find(x => x.id === sel) || {}).section || D.sections[0] || 'Other'; const v = { id: uid(), section: sec, label: 'New variable', type: 'num', unit: '', min: '', max: '', cats: [], dec: '', required: false, visits: [], group: '', role: '', definition: '' }; D.vars.push(v); if (!D.sections.includes(sec)) D.sections.push(sec); sel = v.id; save(); return render(); }
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
      else { const S = SCALES[d.mbscale]; n = addScale(D, d.mbscale, S.items, S.min, S.max, S.def); }
      sel = D.vars[D.vars.length - 1].id; save(); render(); toast(`${n} items and their total added`); return; }
    if (b.id === 'mbSsUse') { const r = ssCalc(D); if (r && !r.err) { D.n = r.enrol; save(); render(); toast(`Planned number: ${r.enrol} patients`); } return; }
    if (b.id === 'mbSsCopy') { const r = ssCalc(D); if (r && !r.err) { try { await navigator.clipboard.writeText(r.text); toast('Sample-size paragraph copied'); } catch (err) { prompt('Copy the paragraph:', r.text); } } return; }
    if (b.id === 'mbNewSec') { const n = (prompt('Name of the new section:', 'Other') || '').trim(); if (n && !D.sections.includes(n)) { D.sections.push(n); save(); render(); } return; }
    if (d.mbsecup) { const i = +d.mbsecup; D.sections = D.sections.length ? D.sections : [...new Set(D.vars.map(v => v.section))]; [D.sections[i - 1], D.sections[i]] = [D.sections[i], D.sections[i - 1]]; save(); return render(); }
    if (d.mbsecren) { D.sections = D.sections.length ? D.sections : [...new Set(D.vars.map(v => v.section))]; const old = D.sections[+d.mbsecren], n = (prompt('New name of the section:', old) || '').trim(); if (!n || n === old) return; D.sections[+d.mbsecren] = n; D.vars.forEach(v => { if (v.section === old) v.section = n; }); save(); return render(); }
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
    if (t.id === 'mbPasteTxt') { pasteTxt = t.value; return; }
    if (t.id === 'mbLibQ') { libQ = t.value; const pos = t.selectionStart; render(); const q = $('#mbLibQ'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } return; }
    if (d.mb) { D[d.mb] = d.mb === 'n' || d.mb === 'idDigits' ? +val : val; save(); if (t.type !== 'text' && t.type !== 'number') render(); return; }
    if (d.mbc) { D.conv[d.mbc] = val; save(); return render(); }
    if (d.mbs) { ssDef(D)[d.mbs] = d.mbs === 'v' ? val : val === '' ? '' : +val; if (d.mbs === 'v') { D.ss.a = ''; D.ss.b = ''; D.ss.sd = ''; } save(); if (t.tagName === 'SELECT') return render(); const o = $('#mbSsOut'); if (o) o.innerHTML = ssOut(ssCalc(D)); return; }
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
      else if (k === 'fa' || k === 'fb') v.formula = { kind: 'bmi', ...(v.formula || {}), [k.slice(1)]: val };
      else if (k === 'type') { v.type = val; if (val === 'yn') v.cats = [...YN]; if (val === 'calc' && !v.formula) v.formula = { kind: 'bmi' }; v.expect = expectOf(v.label, v.type, v.cats); }
      else v[k] = val;
      save(); if (t.tagName === 'SELECT' || t.type === 'checkbox' || k === 'section') render(); return; }
    if (d.mbvisit) { const on = new Set((v.visits || []).length ? v.visits : [D.visits[0].id]); if (val) on.add(d.mbvisit); else on.delete(d.mbvisit); v.visits = D.visits.map(x => x.id).filter(id => on.has(id)); if (v.visits.length === 1 && v.visits[0] === D.visits[0].id) v.visits = []; save(); return render(); }
    if (d.mbe) { v.expect = { ...(v.expect || {}), [d.mbe]: d.mbe === 'dist' ? val : val === '' ? '' : +val }; save(); return; }
    if (d.mbep !== undefined) { const e = v.expect = v.expect || {}; e.pct = v.cats.map((_, i) => (e.pct || [])[i] ?? +(100 / v.cats.length).toFixed(1)); e.pct[+d.mbep] = +val || 0; save(); return; }
    if (d.mbflist) { const L = new Set((v.formula || {}).list || []); if (val) L.add(d.mbflist); else L.delete(d.mbflist); v.formula = { ...(v.formula || {}), list: [...L] }; save(); return; }
  }
  function onChange(e) {
    const t = e.target;
    if (t.id === 'mbTpl' && t.value) { if (D.vars.length && !confirm('Replace the current design?')) { t.value = ''; return; } D = t.value === '__blank' ? blank() : fromTemplate(t.value); sel = null; tab = 'study'; save(); return render(); }
    if (t.id === 'mbMine' && t.value) { const all = ls.get('designs', {}); if (all[t.value] && (!D.vars.length || confirm(`Open “${t.value}” (the current design is replaced)?`))) { D = JSON.parse(JSON.stringify(all[t.value])); sel = null; save(); render(); } else t.value = ''; return; }
    if (t.id === 'mbFromSheet' && t.files[0]) { const f = t.files[0]; t.value = '';
      if (D.vars.length && !confirm(`Make a new design from “${f.name}”? The current design is replaced (Undo brings it back).`)) return;
      f.arrayBuffer().then(buf => { try { const wb = XLSX.read(buf, { type: 'array', cellDates: true }), name = wb.SheetNames.find(n => !['_EasyStatSetup', 'Lists', 'Codebook', 'Instructions', 'Randomisation'].includes(n) && (wb.Sheets[n]['!ref'] || '').includes(':')) || wb.SheetNames[0];
        const aoa = XLSX.utils.sheet_to_json(wb.Sheets[name], { header: 1, defval: null, raw: true, blankrows: false }), r = designFromSheet(aoa, f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim());
        if (!r.D.vars.length) throw new Error('no columns found'); D = r.D; sel = null; tab = 'vars'; save(); render();
        toast(`“${name}”: ${r.D.vars.length} variables from ${r.cols} columns${r.D.visits.length > 1 ? `, ${r.D.visits.length} visits` : ''}${r.D.arms.length ? `, groups ${r.D.arms.join(' / ')}` : ''}${r.id ? ` · ID: ${r.id}` : ''} — the values (${r.n} rows) became the expected values`); } catch (err) { console.error(err); toast('Could not read the sheet: ' + err.message); } }); return; }
    if (t.id === 'mbImportJson' && t.files[0]) { t.files[0].text().then(txt => { try { const j = JSON.parse(txt); if (!j.design || !Array.isArray(j.design.vars)) throw new Error('not a design file'); D = j.design; sel = null; save(); render(); toast('Design opened'); } catch (err) { toast('Could not open it: ' + err.message); } }); return; }
    if (t.id === 'mbPasteTxt') return;
    if (t.type === 'text' || t.type === 'number' || t.tagName === 'TEXTAREA') render();
  }
  document.addEventListener('keydown', e => { if (phase !== 'build' || !(e.ctrlKey || e.metaKey) || /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return; const k = e.key.toLowerCase();
    if (k === 'z' && !e.shiftKey) { e.preventDefault(); undo(true); } else if (k === 'y' || (k === 'z' && e.shiftKey)) { e.preventDefault(); undo(false); } });
  // the entry on step 1
  const anchor = $('#btnTemplate'); if (anchor) { const b = document.createElement('button'); b.className = 'btn ghost small'; b.type = 'button'; b.id = 'btnBuilder'; b.title = 'Design the master sheet of a new study: variables, visits, groups, ranges, randomisation — then an Excel sheet, a case report form and a REDCap dictionary'; b.textContent = '🧱 Master sheet builder'; anchor.parentNode.insertBefore(b, anchor); b.onclick = open; }
  setPhase('analyse');
  window.EasyBuilder = { open, close, setPhase, get phase() { return phase; }, buildWorkbook: (d, fill) => buildWorkbook(d || D, fill), setupFor, columns, visitsOf: v => visitsOf(D, v), baseName: v => baseName(D, v), tagOf, expectOf, prng, randomisation, redcap, fromTemplate, fileBase, save, ssCalc: d => ssCalc(d || D), designFromSheet, fromLine: (l, sec) => fromLine(D, l, sec || 'Other'), addScale: (n, it, lo, hi, def) => addScale(D, n, it, lo, hi, def), problems: d => problems(d || D), undo, get design() { return D; }, set design(x) { D = x; save(); } };
})();

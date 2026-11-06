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
  const libVar = (section, e) => ({ id: uid(), section, label: e[0], type: e[1], unit: e[2] || '', min: e[3] ?? '', max: e[4] ?? '', cats: e[1] === 'yn' ? [...YN] : e[5] ? [...e[5]] : [], dec: e[6] ?? '', required: false, visits: [], group: section === 'Medical history' && e[1] === 'yn' ? 'Co-morbidities' : '', role: '', definition: '' });
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
      if ((v.type === 'cat') && v.cats.length < 2) out.push(`${v.label}: fewer than two categories`); if (v.type === 'calc' && !(v.formula && v.formula.a)) out.push(`${v.label}: the formula is not complete`); });
    return out;
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
      + `<dxfs count="2"><dxf><font><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFC7CE"/></patternFill></fill></dxf><dxf><font><b/><color rgb="FF9C0006"/></font><fill><patternFill><bgColor rgb="FFFFEB9C"/></patternFill></fill></dxf></dxfs>`
      + `<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/></styleSheet>`;
  }
  const CALC_STYLE = 5 + SEC_FILL.length;
  // one sheet: rows = [[cell…]] with cell = null | string | number | { v, f, s, t } ; opts: widths, freeze {r, c}, merges, validations, cfs
  function sheetXml(rows, o = {}) {
    const W = Math.max(1, ...rows.map(r => r.length)), dims = `A1:${colL(W - 1)}${Math.max(1, rows.length)}`;
    const cell = (c, ri, ci) => { if (c === null || c === undefined || c === '') return ''; const ref = `${colL(ci)}${ri + 1}`, o2 = typeof c === 'object' ? c : { v: c }, s = o2.s ? ` s="${o2.s}"` : '';
      if (o2.f) return `<c r="${ref}"${s}><f>${X(o2.f)}</f></c>`;
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
  function buildWorkbook(D) {
    const cols = columns(D), long = D.layout === 'long', perVisit = D.layout === 'sheets', arms = D.arms.filter(Boolean), hasGroup = arms.length >= 2;
    const n = Math.max(1, +D.n || 60), ids = Array.from({ length: n }, (_, i) => `${D.idPrefix || ''}${String(i + 1).padStart(+D.idDigits || 3, '0')}`);
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
      for (let r = 0; r < nRows; r++) { const p = long ? Math.floor(r / D.visits.length) : r, vi = long ? r % D.visits.length : 0, R = r + 3;
        const row = all.map((c, ci) => { if (ci === 0) return withLead ? ids[p] : null; if (c.col === 'Group') return prefillGroup && withLead ? prefillGroup[p] : null; if (c.col === 'Visit') return D.visits[vi].name;
          const v = c.v; if (v.type === 'date') return { v: null, s: 2 };
          if (v.type === 'calc' && v.formula) { const f = v.formula, A = at(f.a, c.visit && c.visit.id), B = f.b ? at(f.b, c.visit && c.visit.id) : -1, a = A >= 0 ? `${colL(A)}${R}` : null, b = B >= 0 ? `${colL(B)}${R}` : null;
            let fx = null;
            if (f.kind === 'bmi' && a && b) fx = `IF(AND(ISNUMBER(${a}),ISNUMBER(${b}),${b}>0),ROUND(${a}/(${b}/100)^2,1),"")`;
            if (f.kind === 'days' && a && b) fx = `IF(AND(ISNUMBER(${a}),ISNUMBER(${b})),${b}-${a},"")`;
            if (f.kind === 'age' && a) fx = b ? `IF(AND(ISNUMBER(${a}),ISNUMBER(${b})),DATEDIF(${a},${b},"y"),"")` : `IF(ISNUMBER(${a}),DATEDIF(${a},TODAY(),"y"),"")`;
            if (f.kind === 'change' && !long) { const vs = all.map((x, k) => [x, k]).filter(([x]) => x.v && x.v.id === f.a), first = vs[0], last = vs[vs.length - 1]; if (first && last && first !== last) fx = `IF(AND(ISNUMBER(${colL(last[1])}${R}),ISNUMBER(${colL(first[1])}${R})),${colL(last[1])}${R}-${colL(first[1])}${R},"")`; }
            if ((f.kind === 'sum' || f.kind === 'mean') && (f.list || []).length) { const refs = f.list.map(id => at(id, c.visit && c.visit.id)).filter(k => k >= 0).map(k => `${colL(k)}${R}`); if (refs.length) fx = `IF(COUNT(${refs.join(',')})=${refs.length},${f.kind === 'sum' ? 'SUM' : 'AVERAGE'}(${refs.join(',')}),"")`; }
            return fx ? { f: fx, s: CALC_STYLE } : { v: null, s: CALC_STYLE }; }
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
        if (v.type === 'text' || v.type === 'time') dv.push({ type: 'textLength', op: 'lessThanOrEqual', ref: ref(k), f1: 255, pTitle: v.label + unit, prompt: note || (v.type === 'time' ? 'hh:mm' : 'Text') }); });
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
    const cb = [['Column', 'Label', 'Section', 'Type', 'Unit', 'Allowed values / range', 'Codes', 'Visit', 'Required', 'Item group', 'Definition', 'Formula'].map(v => ({ v, s: 1 }))];
    cols.forEach(c => { const v = c.v; cb.push([c.col, v.label, v.section, { num: 'Number', yn: 'Yes / no', cat: 'Categories', date: 'Date', time: 'Time', text: 'Text', calc: 'Calculated' }[v.type] || v.type, v.unit, v.type === 'num' || v.type === 'calc' ? (v.min !== '' || v.max !== '' ? `${v.min} to ${v.max}` : '') : v.cats.join(' / '),
      (v.type === 'cat' || v.type === 'yn') ? v.cats.map((x, i) => `${i + 1}=${x}`).join(', ') : '', c.visit ? c.visit.name : long ? (visitsOf(D, v).map(x => x.name).join(', ') || 'all') : '', v.required ? 'Yes' : '', v.group || '', v.definition || '', v.type === 'calc' && v.formula ? { bmi: 'Weight / (height in m)²', days: 'Days between the two dates', age: 'Completed years between the dates', change: 'Last visit − first visit', sum: 'Sum of items', mean: 'Mean of items' }[v.formula.kind] || '' : '']); });
    sheets.push({ name: 'Codebook', xml: sheetXml(cb, { widths: [22, 26, 16, 12, 10, 26, 26, 12, 9, 16, 40, 26], freeze: { r: 1, c: 0 } }) });
    const ins = [[{ v: D.title || 'Master sheet', s: 3 }], ['How to fill this sheet', ''],
      ['1', 'One row per patient' + (long ? ' and visit' : '') + '. Keep the ID; do not change the column names in row 2 (row 1 shows the sections).'],
      ['2', 'Choose categories from the drop-down list; numbers outside the allowed range are refused or highlighted in red.'],
      ['3', `Missing values: ${D.conv.missing === '999' ? 'type 999' : 'leave the cell empty'}. Dates: ${D.conv.date}.`],
      ['4', 'Grey columns are calculated by Excel — do not type in them.'],
      ['5', 'Cells highlighted in yellow break a rule between columns (e.g. discharge before admission).'],
      ...(D.double ? [['6', 'Double entry: a second person types the same forms in “Entry 2”; the “Compare” sheet marks every difference (≠).']] : []),
      ...(rand ? [['7', `The allocation of each patient is in “Randomisation” (${D.rand.type === 'simple' ? 'simple' : `blocks of ${D.rand.sizes}`}, seed ${D.rand.seed}). Allocate in order and do not skip numbers.`]] : []),
      ['', ''], ['Upload this file to Prof MSE Easy Stat: the setup (labels, units, groups, visits and categories) is read from it.', '']];
    sheets.push({ name: 'Instructions', xml: sheetXml(ins, { widths: [6, 110] }) });
    if (rand) { const rr = [['Stratum', 'No.', 'Allocation', 'Patient ID', 'Date', 'Initials'].map(v => ({ v, s: 1 }))]; rand.forEach(s => s.list.forEach((a, i) => rr.push([s.stratum, i + 1, a, rand.length === 1 ? ids[i] : null, null, null]))); sheets.push({ name: 'Randomisation', xml: sheetXml(rr, { widths: [30, 6, 16, 12, 12, 10], freeze: { r: 1, c: 0 } }) }); }
    sheets.push({ name: 'Lists', hidden: true, xml: sheetXml(listsRows, {}) });
    const setup = JSON.stringify(setupFor(D)), chunks = []; for (let k = 0; k < setup.length; k += 30000) chunks.push([setup.slice(k, k + 30000)]);
    sheets.push({ name: '_EasyStatSetup', hidden: true, xml: sheetXml(chunks, {}) });
    return xlsxBlob(sheets);
  }
  // what the analysis needs to know about every column
  function setupFor(D) {
    const cols = columns(D), long = D.layout === 'long';
    return { app: 'ProfMSE-EasyStat-mastersheet', version: 1, title: D.title, design: D.design, groupCol: D.arms.filter(Boolean).length >= 2 ? 'Group' : '', idCol: 'ID', arms: D.arms, layout: D.layout, catAs: D.conv.catAs, missing: D.conv.missing,
      visits: D.visits.map(x => ({ tag: tagOf(x.name), name: x.name })),
      vars: D.vars.map(v => ({ id: v.id, label: v.label, unit: v.unit, type: v.type, cats: v.cats, group: v.group, role: v.role, definition: v.definition, section: v.section,
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
      if (once.length) kids.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: once.map(v => new TableRow({ children: [cell(v.label + (v.unit && v.type !== 'num' ? ` (${v.unit})` : '') + (v.required ? ' *' : ''), 38, true), cell(answer(v), 62)] })) }));
      if (rep.length) { const vis = [...new Set(rep.flatMap(v => visitsOf(D, v).map(x => x.id)))].map(id => D.visits.find(x => x.id === id)), w = Math.floor(62 / vis.length);
        kids.push(P('', { after: 60 }), new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ children: [cell('', 38, true), ...vis.map(x => cell(x.name, w, true))] }),
          ...rep.map(v => new TableRow({ children: [cell(v.label + (v.unit ? ` (${v.unit})` : ''), 38, true), ...vis.map(x => cell((v.visits || []).includes(x.id) ? (v.type === 'cat' || v.type === 'yn' ? v.cats.map(c => `☐ ${c}`).join('  ') : '') : '—', w))] }))] })); }
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
    let lastSec = ''; columns(D).forEach(c => { const v = c.v, sec = v.section !== lastSec ? v.section : ''; lastSec = v.section;
      const type = v.type === 'yn' ? 'yesno' : v.type === 'cat' ? 'radio' : v.type === 'calc' ? 'text' : 'text', val = v.type === 'num' ? (String(v.dec) === '0' ? 'integer' : 'number') : v.type === 'date' ? (D.conv.date.startsWith('mm') ? 'date_mdy' : D.conv.date.startsWith('yyyy') ? 'date_ymd' : 'date_dmy') : v.type === 'time' ? 'time' : '';
      rows.push([rc(c.col), 'master_sheet', sec, type, v.label + (c.visit ? ` — ${c.visit.name}` : ''), v.type === 'cat' ? v.cats.map((x, i) => `${i + 1}, ${x}`).join(' | ') : '', [v.unit, v.definition, v.type === 'calc' ? 'calculated in Excel' : ''].filter(Boolean).join(' · '), val, v.type === 'num' ? v.min : '', v.type === 'num' ? v.max : '', '', '', v.required ? 'y' : '', '', '', '', '', '']); });
    return new Blob(['﻿' + rows.map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' });
  }

  /* ---------- the workspace ---------- */
  let D = ls.get('current', null) || fromTemplate('rct2'), tab = 'study', sel = null, libQ = '';
  const save = () => ls.set('current', D);
  const TABS = [['study', '1 · Study'], ['visits', '2 · Groups & visits'], ['vars', '3 · Variables'], ['rules', '4 · Rules'], ['preview', '5 · Preview'], ['export', '6 · Export']];
  const TYPES = [['num', 'Number'], ['yn', 'Yes / no'], ['cat', 'Categories'], ['date', 'Date'], ['time', 'Time'], ['text', 'Text'], ['calc', 'Calculated (Excel formula)']];
  function open() {
    let w = $('#mbWrap'); if (!w) { w = document.createElement('div'); w.id = 'mbWrap'; w.className = 'mb-wrap'; document.body.appendChild(w); w.addEventListener('input', onInput); w.addEventListener('change', onChange); w.addEventListener('click', onClick); }
    w.style.display = ''; document.documentElement.classList.add('mb-open'); render();
  }
  const close = () => { const w = $('#mbWrap'); if (w) w.style.display = 'none'; document.documentElement.classList.remove('mb-open'); };
  const opt = (list, cur) => list.map(([k, l]) => `<option value="${esc(k)}" ${String(cur) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('');
  function render() {
    const w = $('#mbWrap'); if (!w) return; const pr = problems(D);
    w.innerHTML = `<div class="mb-head"><b>🧱 Master sheet builder</b><span class="legend-note">${esc(D.title || 'Untitled study')} · ${D.vars.length} variables · ${columns(D).length} columns</span><span class="spacer"></span>
      <select id="mbTpl" style="width:auto"><option value="">New from template…</option>${opt(Object.entries(TEMPLATES).map(([k, t]) => [k, t.name]), '')}<option value="__blank">Empty design</option></select>
      <select id="mbMine" style="width:auto"><option value="">My designs…</option>${opt(Object.keys(ls.get('designs', {})).map(k => [k, k]), '')}</select>
      <button class="btn ghost small" id="mbSaveAs" type="button">💾 Save design</button><button class="btn ghost small" id="mbExportJson" type="button" title="The design as a file, to share or keep">⬇ Design file</button><label class="btn ghost small" style="margin:0">⬆ Open design<input type="file" id="mbImportJson" accept=".json" hidden></label>
      <button class="btn primary small" id="mbClose" type="button">✕ Close</button></div>
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
      <div><label class="check" style="margin-top:22px"><input type="checkbox" data-mb="double" ${D.double ? 'checked' : ''}><span><b>Double data entry</b> — a second entry sheet and a sheet marking every difference</span></label></div></div>`;
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
    return `<div class="mb-vars"><div class="mb-col"><div class="row" style="gap:6px;margin-bottom:6px"><b>Variables</b><span class="spacer"></span><button class="btn ghost small" type="button" id="mbNewVar">+ New</button><button class="btn ghost small" type="button" id="mbNewSec">+ Section</button></div>
      ${order.map((sec, si) => { const vs = D.vars.filter(x => x.section === sec); return `<div class="mb-sec"><div class="mb-sec-h" style="border-left:5px solid #${SEC_FILL[si % SEC_FILL.length]}"><b>${esc(sec)}</b> <span class="legend-note">${vs.length}</span><span class="spacer"></span>${si ? `<button class="btn ghost small" type="button" data-mbsecup="${si}" title="Move the section up">↑</button>` : ''}<button class="btn ghost small" type="button" data-mbsecren="${si}" title="Rename">✎</button></div>
        ${vs.map(x => `<div class="mb-var ${x.id === sel ? 'on' : ''}" data-mbsel="${x.id}"><span>${esc(x.label)}${x.unit ? ` <span class="legend-note">(${esc(x.unit)})</span>` : ''}</span><span class="spacer"></span><span class="legend-note">${esc({ num: 'Number', yn: 'Yes/no', cat: 'Categories', date: 'Date', time: 'Time', text: 'Text', calc: 'Formula' }[x.type] || x.type)}${(x.visits || []).length > 1 ? ` · ${x.visits.length} visits` : ''}</span><button class="btn ghost small" type="button" data-mbup="${x.id}" title="Up">↑</button><button class="btn ghost small" type="button" data-mbdel="${x.id}" title="Remove">✕</button></div>`).join('') || '<div class="legend-note" style="padding:4px 8px">Empty section</div>'}</div>`; }).join('') || '<p class="legend-note">No variables yet — add some from the library →</p>'}</div>
      <div class="mb-col">${v ? editor(v) : '<p class="legend-note">Click a variable to edit it.</p>'}</div>
      <div class="mb-col"><div class="row" style="gap:6px;margin-bottom:6px"><b>Library</b><input type="search" id="mbLibQ" value="${esc(libQ)}" placeholder="Search, e.g. HbA1c" style="flex:1"></div>
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
      <div><label class="check" style="margin-top:6px"><input type="checkbox" data-mbv="required" ${v.required ? 'checked' : ''}><span>Required</span></label></div></div>`;
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
    if (b.id === 'mbClose') return close();
    if (d.mbsel) { sel = d.mbsel; return render(); }
    if (d.mblib) { const [sec, lab] = d.mblib.split('|'), e2 = LIB.find(x => x[0] === sec)[1].find(x => x[0] === lab); const v = libVar(sec, e2); D.vars.push(v); if (!D.sections.includes(sec)) D.sections.push(sec); sel = v.id; save(); return render(); }
    if (b.id === 'mbNewVar') { const sec = (D.vars.find(x => x.id === sel) || {}).section || D.sections[0] || 'Other'; const v = { id: uid(), section: sec, label: 'New variable', type: 'num', unit: '', min: '', max: '', cats: [], dec: '', required: false, visits: [], group: '', role: '', definition: '' }; D.vars.push(v); if (!D.sections.includes(sec)) D.sections.push(sec); sel = v.id; save(); return render(); }
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
    if (b.id === 'mbTry') { const blob = buildWorkbook(D), f = new File([blob], `${fileBase()} - master sheet.xlsx`); close(); U.go(1); await U.loadFile(f); return; }
  }
  function onInput(e) {
    const t = e.target, d = t.dataset, val = t.type === 'checkbox' ? t.checked : t.value;
    if (t.id === 'mbLibQ') { libQ = t.value; const pos = t.selectionStart; render(); const q = $('#mbLibQ'); if (q) { q.focus(); q.setSelectionRange(pos, pos); } return; }
    if (d.mb) { D[d.mb] = d.mb === 'n' || d.mb === 'idDigits' ? +val : val; save(); if (t.type !== 'text' && t.type !== 'number') render(); return; }
    if (d.mbc) { D.conv[d.mbc] = val; save(); return render(); }
    if (d.mbr) { D.rand[d.mbr] = val; save(); if (t.type !== 'text' && t.type !== 'number') render(); return; }
    if (d.mbarm !== undefined) { D.arms[+d.mbarm] = val; save(); return; }
    if (d.mbvis !== undefined) { D.visits[+d.mbvis].name = val; save(); return; }
    if (d.mbstrat) { D.rand.strata = (D.rand.strata || []).filter(x => x !== d.mbstrat); if (val) D.rand.strata.push(d.mbstrat); save(); return render(); }
    if (d.mbck) { const [i, k] = d.mbck.split(':'); D.checks[+i][k] = val; save(); return; }
    const v = D.vars.find(x => x.id === sel); if (!v) return;
    if (d.mbv) { const k = d.mbv;
      if (k === 'cats') v.cats = String(val).split('\n').map(x => x.trim()).filter(Boolean);
      else if (k === 'fkind') v.formula = { ...(v.formula || {}), kind: val };
      else if (k === 'fa' || k === 'fb') v.formula = { kind: 'bmi', ...(v.formula || {}), [k.slice(1)]: val };
      else if (k === 'type') { v.type = val; if (val === 'yn') v.cats = [...YN]; if (val === 'calc' && !v.formula) v.formula = { kind: 'bmi' }; }
      else v[k] = val;
      save(); if (t.tagName === 'SELECT' || t.type === 'checkbox' || k === 'section') render(); return; }
    if (d.mbvisit) { const on = new Set((v.visits || []).length ? v.visits : [D.visits[0].id]); if (val) on.add(d.mbvisit); else on.delete(d.mbvisit); v.visits = D.visits.map(x => x.id).filter(id => on.has(id)); if (v.visits.length === 1 && v.visits[0] === D.visits[0].id) v.visits = []; save(); return render(); }
    if (d.mbflist) { const L = new Set((v.formula || {}).list || []); if (val) L.add(d.mbflist); else L.delete(d.mbflist); v.formula = { ...(v.formula || {}), list: [...L] }; save(); return; }
  }
  function onChange(e) {
    const t = e.target;
    if (t.id === 'mbTpl' && t.value) { if (D.vars.length && !confirm('Replace the current design?')) { t.value = ''; return; } D = t.value === '__blank' ? blank() : fromTemplate(t.value); sel = null; tab = 'study'; save(); return render(); }
    if (t.id === 'mbMine' && t.value) { const all = ls.get('designs', {}); if (all[t.value] && (!D.vars.length || confirm(`Open “${t.value}” (the current design is replaced)?`))) { D = JSON.parse(JSON.stringify(all[t.value])); sel = null; save(); render(); } else t.value = ''; return; }
    if (t.id === 'mbImportJson' && t.files[0]) { t.files[0].text().then(txt => { try { const j = JSON.parse(txt); if (!j.design || !Array.isArray(j.design.vars)) throw new Error('not a design file'); D = j.design; sel = null; save(); render(); toast('Design opened'); } catch (err) { toast('Could not open it: ' + err.message); } }); return; }
    if (t.type === 'text' || t.type === 'number' || t.tagName === 'TEXTAREA') render();
  }
  // the entry on step 1
  const anchor = $('#btnTemplate'); if (anchor) { const b = document.createElement('button'); b.className = 'btn ghost small'; b.type = 'button'; b.id = 'btnBuilder'; b.title = 'Design the master sheet of a new study: variables, visits, groups, ranges, randomisation — then an Excel sheet, a case report form and a REDCap dictionary'; b.textContent = '🧱 Master sheet builder'; anchor.parentNode.insertBefore(b, anchor); b.onclick = open; }
  window.EasyBuilder = { open, close, buildWorkbook: d => buildWorkbook(d || D), setupFor, columns, randomisation, redcap, fromTemplate, get design() { return D; }, set design(x) { D = x; save(); } };
})();

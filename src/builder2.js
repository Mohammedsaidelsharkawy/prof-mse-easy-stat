/* Prof MSE Easy Stat — phase 1, more from the design: a protocol and statistical analysis plan, the schedule of assessments,
   shell tables, a data dictionary and a one-page summary (Word); randomisation envelopes and the blinding key; an XLSForm for
   KoBoToolbox / ODK and SPSS syntax; versions of a design and the differences between two; and a guided start. */
(() => {
  const B = window.EasyBuilder, U = window.EasyUI; if (!B || !U) return;
  const esc = U.esc, toast = U.toast;
  const ls = { get: (k, d) => { try { const v = localStorage.getItem('mb.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('mb.' + k, JSON.stringify(v)); } catch (e) { /* not kept */ } } };
  const arms = D => D.arms.filter(Boolean), K = D => arms(D).length, shownArms = D => D.blind ? arms(D).map((_, i) => `Group ${String.fromCharCode(65 + i)}`) : arms(D);
  const visOf = (D, v) => { const ids = (v.visits || []).length ? v.visits : [D.visits[0].id]; return D.visits.filter(x => ids.includes(x.id)); };
  const DESIGN = { rct: 'randomised controlled trial', cohort: 'cohort study', casecontrol: 'case-control study', cross: 'cross-sectional study', diagnostic: 'diagnostic accuracy study', beforeafter: 'one-group before-and-after study' };
  const kindOf = v => v.type === 'calc' ? (B.calcCats(v) ? 'cat' : 'num') : v.type === 'multi' ? 'cat' : v.type;
  const isOutcome = v => /primary|secondary|outcome|safety/.test(v.role || '') || (!v.role && /outcome|follow|complication|operative/i.test(v.section));
  const today = () => new Date().toISOString().slice(0, 10);

  /* ---------- the planned test of each variable ---------- */
  function plannedTest(D, v) {
    const k = K(D), rep = visOf(D, v).length > 1, t = kindOf(v);
    if (D.design === 'diagnostic' && /index|reader|reference/i.test(v.label)) return 'sensitivity, specificity, predictive values and accuracy with 95% CI (Wilson); the area under the ROC curve for a numeric index test; Cohen\'s kappa between readers';
    if (t === 'num') {
      if (rep) return k >= 2 ? 'mixed (group × time) ANOVA; between the groups at each visit: independent t-test or Mann-Whitney U test; within each group: repeated-measures ANOVA or Friedman test' : visOf(D, v).length === 2 ? 'paired t-test (Wilcoxon signed-rank test when not normal)' : 'repeated-measures ANOVA (Friedman test when not normal) with Bonferroni-adjusted comparisons';
      return k > 2 ? 'one-way ANOVA with Tukey post hoc tests (Kruskal-Wallis with Dunn tests when not normal)' : k === 2 ? 'independent t-test (Mann-Whitney U test when not normal)' : 'mean ± SD or median (IQR)';
    }
    if (t === 'cat' || t === 'yn') return k >= 2 ? (rep ? "Chi-square test at each visit (Fisher's exact test when expected counts are below 5)" : "Chi-square test (Fisher's exact test when expected counts are below 5)") : rep ? "McNemar's test (two visits) or Cochran's Q test" : 'frequency and percentage';
    if (t === 'date') return 'used for time intervals (e.g. length of stay, follow-up)';
    return 'described';
  }
  const vLabel = v => v.label + (v.unit ? ` (${v.unit})` : '');

  /* ---------- Word helpers ---------- */
  const X = () => window.docx, FONT = 'Calibri';
  const P = (t, o = {}) => { const { Paragraph, TextRun, AlignmentType } = X(); return new Paragraph({ alignment: o.center ? AlignmentType.CENTER : undefined, pageBreakBefore: o.pb, spacing: { before: o.before || 0, after: o.after ?? 80 }, indent: o.ind ? { left: 360 } : undefined, children: [new TextRun({ text: t, bold: o.bold, italics: o.it, size: o.size || 21, font: FONT, color: o.color })] }); };
  const H = (t, lvl = 1, o = {}) => P(t, { bold: true, size: lvl === 1 ? 28 : 24, before: lvl === 1 ? 240 : 160, after: 100, color: '1F3864', ...o });
  const bullet = t => P(`•  ${t}`, { ind: true, after: 40 });
  function T(head, rows, o = {}) {
    const { Table, TableRow, TableCell, WidthType, ShadingType, AlignmentType, Paragraph, TextRun } = X();
    const cell = (t, h, i) => new TableCell({ shading: h ? { type: ShadingType.CLEAR, fill: 'D9D9D9', color: 'auto' } : undefined, children: [new Paragraph({ alignment: i && o.center ? AlignmentType.CENTER : AlignmentType.LEFT, children: [new TextRun({ text: String(t ?? ''), bold: h || (o.boldFirst && i === 0), size: o.size || 18, font: FONT, color: o.grey && !h && i ? '808080' : undefined })] })] });
    return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [new TableRow({ tableHeader: true, children: head.map((t, i) => cell(t, true, i)) }), ...rows.map(r => new TableRow({ children: r.map((t, i) => cell(t, false, i)) }))] });
  }
  async function saveDoc(children, name, title, landscape) {
    const { Document, Packer, PageOrientation } = X();
    const doc = new Document({ creator: 'Prof MSE Easy Stat', title, sections: [{ properties: { page: { margin: { top: 1000, bottom: 1000, left: 1000, right: 1000 }, ...(landscape ? { size: { orientation: PageOrientation.LANDSCAPE } } : {}) } }, children }] });
    U.saveUrl(URL.createObjectURL(await Packer.toBlob(doc)), `${B.fileBase()} - ${name}.docx`); toast(`${title} saved`);
  }

  /* ---------- the parts of the documents ---------- */
  const eligOf = D => ({ inc: D.vars.filter(v => v.elig === 'inc').map(v => v.label), exc: D.vars.filter(v => v.elig === 'exc').map(v => v.label) });
  const roleList = (D, r) => D.vars.filter(v => v.role === r);
  function randText(D) {
    if (K(D) < 2) return 'Not applicable (one group).';
    if (!D.rand.on) return D.design === 'rct' ? 'Allocation: to be described (no randomisation list made in the builder).' : `Groups: ${arms(D).join(', ')} (not randomised).`;
    const st = (D.rand.strata || []).map(id => (D.vars.find(v => v.id === id) || {}).label).filter(Boolean), sites = (D.sites || []).filter(x => x.name);
    return `Patients are allocated ${arms(D).length === 2 ? '1:1' : 'equally'} to ${arms(D).join(' or ')} by a computer-generated list (${D.rand.type === 'simple' ? 'simple randomisation' : `permuted blocks of ${D.rand.sizes}`}, seed ${D.rand.seed})${sites.length ? `, stratified by site (${sites.map(x => x.name).join(', ')})` : ''}${st.length ? `${sites.length ? ' and' : ', stratified'} by ${st.join(' and ')}` : ''}. The list is kept by a person not involved in recruitment; allocation is concealed in sequentially numbered, opaque, sealed envelopes opened after consent and eligibility are confirmed.${D.blind ? ' The groups are labelled Group A and Group B in the data; the key is held by the study statistician until the analysis is complete.' : ''}`;
  }
  function scheduleRows(D) {
    const order = B.secOrder(D), vs = [...D.vars].sort((a, b) => order.indexOf(a.section) - order.indexOf(b.section));
    const head = ['Assessment', ...D.visits.map((x, i) => x.day !== undefined && x.day !== '' ? `${x.name}\n(day ${x.day}${+x.tol ? ` ± ${x.tol}` : ''})` : i ? x.name : `${x.name}\n(day 0)`)];
    return { head, rows: vs.map(v => [vLabel(v), ...D.visits.map(x => visOf(D, v).some(y => y.id === x.id) ? '✓' : '')]) };
  }
  function shellTables(D) {
    const k = K(D), cols = k >= 2 ? [...shownArms(D).map(a => `${a} (n = __)`), 'P value'] : ['All patients (n = __)'], out = [];
    const cellsFor = v => { const t = kindOf(v); return cols.map((c, i) => k >= 2 && i === cols.length - 1 ? 'x.xxx' : t === 'num' ? 'xx ± xx' : 'xx (xx.x%)'); };
    const rowsFor = vs => vs.flatMap(v => { const t = kindOf(v), cats = v.type === 'calc' ? B.calcCats(v) || [] : v.cats || [];
      if (t === 'num') return [[vLabel(v), ...cellsFor(v)]];
      if (v.type === 'multi') return [[v.label, ...cols.map(() => '')], ...cats.map(c => [`   ${c}`, ...cellsFor(v)])];
      if (cats.length <= 2) return [[`${v.label}: ${cats[0] || 'Yes'}`, ...cellsFor(v)]];
      return [[v.label, ...cols.map((c, i) => k >= 2 && i === cols.length - 1 ? 'x.xxx' : '')], ...cats.map(c => [`   ${c}`, ...cols.map((x, i) => k >= 2 && i === cols.length - 1 ? '' : 'xx (xx.x%)')])]; });
    const single = D.vars.filter(v => !['date', 'time', 'text'].includes(v.type) && !v.elig && !(v.formula && v.formula.kind === 'eligible') && visOf(D, v).length <= 1 && !(v.scale && v.type !== 'calc'));
    const base = single.filter(v => !isOutcome(v)), outc = single.filter(isOutcome);
    if (base.length) out.push({ title: `Baseline characteristics of the studied ${k >= 2 ? 'groups' : 'patients'}`, rows: rowsFor(base) });
    if (outc.length) out.push({ title: `Outcomes of the studied ${k >= 2 ? 'groups' : 'patients'}`, rows: rowsFor(outc) });
    D.vars.filter(v => visOf(D, v).length > 1 && !['date', 'time', 'text'].includes(v.type) && !(v.scale && v.type !== 'calc')).forEach(v => out.push({ title: `${v.label} over the visits`, rows: visOf(D, v).flatMap(x => kindOf(v) === 'num' ? [[x.name, ...cellsFor(v)]] : [[`${x.name}: ${(v.cats || [])[0] || 'Yes'}`, ...cellsFor(v)]]) }));
    return { cols: ['', ...cols], tables: out };
  }
  const typeName = v => ({ num: 'Number', yn: 'Yes / no', cat: 'Categories', multi: 'Several answers', date: 'Date', time: 'Time', text: 'Text', calc: 'Calculated' })[v.type] || v.type;
  const allowed = v => v.type === 'num' || v.type === 'calc' ? (B.calcCats(v) ? B.calcCats(v).join(' / ') : v.min !== '' || v.max !== '' ? `${v.min} to ${v.max}` : '') : (v.cats || []).join(' / ');
  const formulaTxt = v => v.type === 'calc' && v.formula ? ((B.FK[v.formula.kind] || {}).name || v.formula.kind) + (v.formula.kind === 'cut' ? `: ${v.formula.cuts} → ${v.formula.labs}` : '') : '';

  /* ---------- the documents ---------- */
  async function protocol(D) {
    const k = K(D), el = eligOf(D), ss = B.ssCalc(D), alpha = (D.ss && +D.ss.alpha) || 0.05, kids = [], sch = scheduleRows(D);
    kids.push(P(D.title || 'Study title', { bold: true, size: 32, center: true, after: 120 }), P('Study protocol and statistical analysis plan — draft', { center: true, it: true, size: 22 }), P(`Version ${(D.versionNote && D.versionNote.v) || '1.0'} · ${today()}`, { center: true, color: '555555', after: 240 }));
    kids.push(H('1. Study design'), P(`This is a ${DESIGN[D.design] || D.design}${k >= 2 ? ` comparing ${arms(D).join(' and ')}` : ''}${(D.sites || []).filter(x => x.name).length > 1 ? `, conducted at ${D.sites.filter(x => x.name).length} sites (${D.sites.filter(x => x.name).map(x => x.name).join(', ')})` : ''}. Patients are assessed at ${D.visits.length === 1 ? 'one visit' : `${D.visits.length} visits: ${D.visits.map(x => x.name + (x.day !== undefined && x.day !== '' ? ` (day ${x.day}${+x.tol ? ` ± ${x.tol}` : ''})` : '')).join(', ')}`}.`));
    kids.push(H('2. Participants'), ...(el.inc.length || el.exc.length ? [P('Inclusion criteria:', { bold: true }), ...el.inc.map(bullet), P('Exclusion criteria:', { bold: true, before: 80 }), ...(el.exc.length ? el.exc.map(bullet) : [bullet('None listed.')])] : [P('Inclusion and exclusion criteria: to be completed (add an eligibility checklist in step 3 to list them here).', { it: true })]));
    kids.push(H('3. Allocation and blinding'), P(randText(D)));
    const outs = r => roleList(D, r).map(v => `${vLabel(v)}${visOf(D, v).length > 1 ? ` at ${visOf(D, v).map(x => x.name).join(', ')}` : visOf(D, v)[0] && D.visits.length > 1 ? ` at ${visOf(D, v)[0].name}` : ''}${v.definition ? ` — ${v.definition}` : ''}`);
    kids.push(H('4. Outcomes'), P('Primary outcome:', { bold: true }), ...(outs('primary').length ? outs('primary').map(bullet) : [bullet('To be marked (Role: primary outcome, step 3).')]));
    if (outs('secondary').length || outs('outcome').length) kids.push(P('Secondary outcomes:', { bold: true, before: 80 }), ...[...outs('secondary'), ...outs('outcome')].map(bullet));
    if (outs('safety').length) kids.push(P('Safety outcomes:', { bold: true, before: 80 }), ...outs('safety').map(bullet));
    const defs = D.vars.filter(v => v.definition && !/primary|secondary|outcome|safety/.test(v.role || ''));
    if (defs.length) kids.push(P('Definitions:', { bold: true, before: 80 }), ...defs.map(v => bullet(`${v.label}: ${v.definition}`)));
    kids.push(H('5. Sample size'), P(ss && !ss.err ? ss.text : 'To be calculated (step 1 of the master sheet builder: main outcome, expected values, power).', { it: !(ss && !ss.err) }));
    const xl = B.xlOpts(D);
    kids.push(H('6. Data collection and management'), P(`Data are recorded on a case report form and typed into an Excel master sheet with drop-down lists for categories, allowed ranges for numbers${D.checks && D.checks.length ? ', rules between columns' : ''}${D.vars.some(v => B.whenParent(D, v)) ? ', skip logic' : ''}${xl.dash ? ', a completeness dashboard' : ''}${xl.ids ? ' and checks of the patient IDs' : ''}.${D.double ? ' Data are entered twice by two people and every difference is checked against the source.' : ''}${xl.protect ? ' The sheet is protected so that only the entry columns can be changed.' : ''}${xl.log ? ' Each row records who entered it and when, and whether it was verified against the source documents.' : ''} Missing values are left ${D.conv.missing === '999' ? 'as 999' : 'empty'}.`));
    kids.push(H('7. Statistical analysis'), P(`Data will be analysed with Prof MSE Easy Stat. Numeric variables will be checked for normality (Shapiro-Wilk test, histograms and Q-Q plots) and presented as mean ± SD or median (interquartile range); categorical variables as frequency and percentage.${k >= 2 ? ` Baseline characteristics of the ${k} groups will be compared to describe the groups.` : ''} All tests will be two-sided at a significance level of ${alpha}.${D.design === 'rct' ? ' The primary analysis will follow the intention-to-treat principle, with a per-protocol analysis as a sensitivity analysis.' : ''}`));
    const planned = D.vars.filter(v => !['text', 'time'].includes(v.type) && !v.elig && !(v.formula && v.formula.kind === 'eligible') && !(v.scale && v.type !== 'calc'));
    kids.push(P('Planned analysis of each variable:', { bold: true, before: 80 }), T(['Variable', 'Role', 'Visits', 'Planned analysis'], planned.map(v => [vLabel(v), { baseline: 'Baseline', primary: 'Primary outcome', secondary: 'Secondary outcome', outcome: 'Other outcome', safety: 'Safety' }[v.role] || '', visOf(D, v).map(x => x.name).join(', '), plannedTest(D, v)])));
    kids.push(P(`Missing data will be described for each variable; the main analysis will use the available data${D.visits.length > 1 ? ', and patients lost to follow-up will be reported in the flow diagram' : ''}. ${D.visits.length > 1 && D.vars.some(v => visOf(D, v).length > 2) ? 'Comparisons between more than two visits will be adjusted with the Bonferroni method. ' : ''}${D.vars.some(v => v.role === 'primary') ? '' : 'The primary outcome is to be confirmed. '}`, { before: 80 }));
    if (D.visits.length > 1) kids.push(H('Appendix: schedule of assessments', 1, { pb: true }), T(sch.head, sch.rows, { center: true }));
    await saveDoc(kids, 'protocol and analysis plan', 'Protocol and analysis plan');
  }
  async function schedule(D) { const s = scheduleRows(D); await saveDoc([P(`${D.title || 'Study'} — schedule of assessments`, { bold: true, size: 28, after: 160 }), T(s.head, s.rows, { center: true }), P('✓ collected at that visit. Days are counted from the anchor date' + (D.anchor ? ` (${(D.vars.find(v => v.id === D.anchor) || {}).label})` : '') + '.', { it: true, size: 18, before: 80 })], 'schedule of assessments', 'Schedule of assessments', D.visits.length > 4); }
  async function shells(D) { const s = shellTables(D), kids = [P(`${D.title || 'Study'} — shell tables`, { bold: true, size: 28, after: 80 }), P('The tables of the results, before the data: replace xx with the values. Data are presented as mean ± SD (or median (IQR)) and frequency (%).', { it: true, color: '555555', after: 160 })];
    s.tables.forEach((t, i) => kids.push(P(`Table ${i + 1}: ${t.title}`, { bold: true, before: 200 }), T(s.cols, t.rows, { center: true, grey: true })));
    await saveDoc(kids, 'shell tables', 'Shell tables'); }
  async function dictionary(D) { const cols = B.columns(D);
    const rows = cols.map(c => { const v = c.v; return [c.col, c.opt !== undefined ? `${v.label}: ${c.opt}` : vLabel(v), c.opt !== undefined ? 'Yes / no' : typeName(v), c.opt !== undefined ? 'Yes / No' : allowed(v), c.visit ? c.visit.name : '', v.required ? 'Yes' : '', [v.definition, B.whenTxt(D, v) ? `Asked when ${B.whenTxt(D, v)}` : '', formulaTxt(v), v.refLo !== undefined && v.refLo !== '' ? `Normal ${v.refLo}–${v.refHi}` : ''].filter(Boolean).join('; ')]; });
    await saveDoc([P(`${D.title || 'Study'} — data dictionary`, { bold: true, size: 28, after: 80 }), P(`${cols.length} columns, besides ID${(D.sites || []).length ? ', Site' : ''}${K(D) >= 2 ? ', Group' : ''}. Categories are typed as ${D.conv.catAs === 'codes' ? 'codes (1, 2 …, as listed)' : 'words'}; missing values ${D.conv.missing === '999' ? 'as 999' : 'are left empty'}; dates as ${D.conv.date}.`, { it: true, after: 160 }), T(['Column', 'Label', 'Type', 'Allowed values', 'Visit', 'Required', 'Notes'], rows, { size: 16 })], 'data dictionary', 'Data dictionary', true); }
  async function summary(D) { const ss = B.ssCalc(D), secs = B.secOrder(D).map(s0 => [s0, D.vars.filter(v => v.section === s0).length]).filter(x => x[1]), prim = roleList(D, 'primary');
    const kv = [['Design', DESIGN[D.design] || D.design], ['Groups', K(D) >= 2 ? arms(D).join(' · ') + (D.blind ? ' (blinded labels in the data)' : '') : 'One group'], ['Sites', (D.sites || []).filter(x => x.name).map(x => x.name).join(', ') || 'One'],
      ['Visits', D.visits.map(x => x.name + (x.day !== undefined && x.day !== '' ? ` (day ${x.day})` : '')).join(' → ')], ['Primary outcome', prim.map(vLabel).join('; ') || 'not marked yet'], ['Planned patients', `${D.n}${ss && !ss.err ? ` (sample size: ${ss.enrol} to enrol)` : ''}`],
      ['Randomisation', K(D) >= 2 && D.rand.on ? `${D.rand.type === 'simple' ? 'simple' : `blocks of ${D.rand.sizes}`}${(D.rand.strata || []).length || (D.sites || []).length ? ', stratified' : ''}` : 'none'], ['Variables', `${D.vars.length} (${B.columns(D).length} columns)`]];
    await saveDoc([P(D.title || 'Study', { bold: true, size: 30, after: 60 }), P(`Design summary · ${today()}`, { it: true, color: '555555', after: 160 }), T(['', ''], kv, { boldFirst: true }), P('Variables by section', { bold: true, before: 200 }), T(['Section', 'Variables'], secs), ...(ss && !ss.err ? [P('Sample size', { bold: true, before: 200 }), P(ss.text)] : [])], 'design summary', 'Design summary'); }
  async function envelopes(D) { if (K(D) < 2 || !D.rand.on) { toast('Make a randomisation list first (step 2)'); return; }
    const R = B.randomisation(D), sites = (D.sites || []).filter(x => x.name), per = sites.length ? Math.ceil((+D.n || 60) / sites.length) : +D.n || 60, pad = i => String(i).padStart(3, '0'), kids = []; let first = true;
    R.forEach((r, ri) => r.list.forEach((a, i) => { const no = `${r.site ? (sites.find(x => x.name === r.site) || {}).prefix || '' : ''}${pad(i + 1)}`, lab = D.blind ? shownArms(D)[arms(D).indexOf(a)] : a;
      kids.push(P(D.title || 'Study', { bold: true, size: 24, center: true, pb: !first, before: 400 }), P('Randomisation envelope', { center: true, it: true, after: 300 }), P(`Number ${no}`, { bold: true, size: 40, center: true, after: 120 }),
        P(r.stratum === 'All patients' ? '' : r.stratum, { center: true, after: 300 }), P('— inside —', { center: true, color: '999999', after: 200 }), P(`Allocation: ${lab}`, { bold: true, size: 36, center: true, after: 300 }),
        P('Open in order, only after the patient has consented and is eligible. Write the patient ID, the date, the time and your initials:', { size: 18, center: true }), P('ID ________   Date ___/___/______   Time ___:___   Initials ______', { size: 18, center: true })); first = false; void ri; void per; }));
    await saveDoc(kids, 'randomisation envelopes', 'Randomisation envelopes'); }
  function blindKey(D) { const rows = [['Label in the data', 'Treatment'].map(v => ({ v, s: 1 })), ...arms(D).map((a, i) => [`Group ${String.fromCharCode(65 + i)}`, a])];
    const blob = B.xlsxBlob([{ name: 'Blinding key', xml: B.sheetXml([[{ v: `${D.title || 'Study'} — blinding key (keep apart from the data until the analysis is complete)`, s: 3 }], ...rows], { widths: [24, 40] }) }]);
    U.saveUrl(URL.createObjectURL(blob), `${B.fileBase()} - blinding key.xlsx`); toast('Blinding key saved — keep it apart from the data'); }

  /* ---------- XLSForm (KoBoToolbox / ODK) and SPSS syntax ---------- */
  const xname = s => { let n = String(s).replace(/[^A-Za-z0-9_]+/g, '_').replace(/^_+|_+$/g, ''); if (!/^[A-Za-z_]/.test(n)) n = 'v_' + n; return n.slice(0, 60) || 'v'; };
  function xlsform(D) {
    const cols = B.columns(D), codes = D.conv.catAs === 'codes', survey = [['type', 'name', 'label', 'hint', 'required', 'constraint', 'constraint_message', 'relevant', 'calculation'].map(v => ({ v, s: 1 }))], choices = [['list_name', 'name', 'label'].map(v => ({ v, s: 1 }))], lists = new Set();
    const listFor = (nm, cats) => { if (!lists.has(nm)) { lists.add(nm); cats.forEach((c, i) => choices.push([nm, codes ? String(i + 1) : xname(c), c])); } return nm; };
    const nameOf = new Map(); cols.forEach(c => { if (c.opt === undefined) nameOf.set(c.v.id + '|' + (c.visit ? c.visit.id : ''), xname(c.col)); });
    const ref = (id, vis) => nameOf.get(id + '|' + (vis || '')) || nameOf.get(id + '|') || [...nameOf.entries()].find(([k2]) => k2.startsWith(id + '|'))?.[1];
    survey.push(['text', 'patient_id', 'Patient ID', '', 'yes', '', '', '', '']);
    if ((D.sites || []).filter(x => x.name).length) survey.push([`select_one ${listFor('site', D.sites.filter(x => x.name).map(x => x.name))}`, 'site', 'Site', '', 'yes', '', '', '', '']);
    if (K(D) >= 2) survey.push([`select_one ${listFor('group', shownArms(D))}`, 'group', 'Group', '', 'yes', '', '', '', '']);
    let sec = null;
    cols.forEach(c => { const v = c.v; if (c.opt !== undefined && c.opt !== v.cats[0]) return;
      if (v.section !== sec) { if (sec !== null) survey.push(['end_group', '', '', '', '', '', '', '', '']); sec = v.section; survey.push(['begin_group', xname(sec), sec, '', '', '', '', '', '']); }
      const nm = c.opt !== undefined ? xname(`${B.baseName(v)}${c.visit ? '_' + B.tagOf(c.visit.name) : ''}`) : xname(c.col), lab = vLabel(v) + (c.visit ? ` — ${c.visit.name}` : ''), req = v.required ? 'yes' : '';
      const pv = B.whenParent(D, v), rel = pv ? `\${${ref(pv.id, c.visit && c.visit.id)}} = '${codes ? pv.cats.indexOf(v.when.cat) + 1 : xname(v.when.cat)}'` : '';
      if (v.type === 'num') { const lo = v.min, hi = v.max; survey.push([String(v.dec) === '0' ? 'integer' : 'decimal', nm, lab, v.definition || '', req, lo !== '' && hi !== '' ? `. >= ${lo} and . <= ${hi}` : '', lo !== '' && hi !== '' ? `${lo} to ${hi}` : '', rel, '']); }
      else if (v.type === 'yn' || v.type === 'cat') survey.push([`select_one ${listFor(xname(v.label), v.cats)}`, nm, lab, v.definition || '', req, '', '', rel, '']);
      else if (v.type === 'multi') survey.push([`select_multiple ${listFor(xname(v.label), v.cats)}`, nm, lab, 'Tick all that apply', req, '', '', rel, '']);
      else if (v.type === 'date') survey.push(['date', nm, lab, v.definition || '', req, '', '', rel, '']);
      else if (v.type === 'time') survey.push(['time', nm, lab, '', req, '', '', rel, '']);
      else if (v.type === 'text') survey.push(['text', nm, lab, v.definition || '', req, '', '', rel, '']);
      else if (v.type === 'calc') { const f = v.formula || {}, r = id => `\${${ref(id, c.visit && c.visit.id)}}`; let calc = '';
        if (f.kind === 'bmi' && f.a && f.b) calc = `round(${r(f.a)} div ((${r(f.b)} div 100) * (${r(f.b)} div 100)), 1)`;
        if (f.kind === 'map' && f.a && f.b) calc = `round((${r(f.a)} + 2 * ${r(f.b)}) div 3, 0)`;
        if (f.kind === 'days' && f.a && f.b) calc = `int(decimal-date-time(${r(f.b)}) - decimal-date-time(${r(f.a)}))`;
        if ((f.kind === 'sum' || f.kind === 'mean') && (f.list || []).length && !(f.rev || []).length) calc = f.kind === 'sum' ? f.list.map(r).join(' + ') : `round((${f.list.map(r).join(' + ')}) div ${f.list.length}, 2)`;
        survey.push(calc ? ['calculate', nm, lab, '', '', '', '', '', calc] : ['note', nm, `${lab}: calculated in the Excel master sheet`, '', '', '', '', '', '']); } });
    if (sec !== null) survey.push(['end_group', '', '', '', '', '', '', '', '']);
    const settings = [['form_title', 'form_id', 'version'].map(v => ({ v, s: 1 })), [D.title || 'Master sheet', xname(D.title || 'master_sheet').toLowerCase().slice(0, 40), today().replace(/-/g, '')]];
    const blob = B.xlsxBlob([{ name: 'survey', xml: B.sheetXml(survey, { widths: [26, 28, 44, 30, 9, 24, 18, 30, 40] }) }, { name: 'choices', xml: B.sheetXml(choices, { widths: [24, 16, 30] }) }, { name: 'settings', xml: B.sheetXml(settings, { widths: [40, 30, 12] }) }]);
    U.saveUrl(URL.createObjectURL(blob), `${B.fileBase()} - XLSForm.xlsx`); toast('XLSForm saved — upload it to KoBoToolbox or ODK Central'); return { survey, choices };
  }
  function spss(D) {
    const cols = B.columns(D), q = t => `'${String(t).replace(/'/g, "''")}'`, sn = c => xname(c).slice(0, 64), codes = D.conv.catAs === 'codes', L = [];
    L.push(`* SPSS syntax for "${D.title || 'Master sheet'}" — written by Prof MSE Easy Stat, ${today()}.`, '* 1. Change the path of the file, then run all.', `GET DATA /TYPE=XLSX /FILE='${B.fileBase()} - master sheet.xlsx' /SHEET=name 'Data' /CELLRANGE=RANGE 'A2:${B.colL(cols.length + 16)}100000' /READNAMES=ON.`, 'EXECUTE.', '');
    L.push('VARIABLE LABELS', ...cols.map((c, i) => `  ${sn(c.col)} ${q(c.opt !== undefined ? `${c.v.label}: ${c.opt}` : vLabel(c.v) + (c.visit ? ` — ${c.visit.name}` : ''))}${i === cols.length - 1 ? '.' : ''}`), '');
    if (codes) { const vl = cols.filter(c => c.opt !== undefined || c.v.type === 'yn' || c.v.type === 'cat'); if (vl.length) L.push('VALUE LABELS', ...vl.map((c, i) => `  ${i ? '/' : ''}${sn(c.col)} ${(c.opt !== undefined ? ['Yes', 'No'] : c.v.cats).map((x, j) => `${j + 1} ${q(x)}`).join(' ')}`), '  .', ''); }
    const nums = cols.filter(c => c.v.type === 'num' || (c.v.type === 'calc' && !B.calcCats(c.v))).map(c => sn(c.col)), cats = cols.filter(c => c.opt !== undefined || ['yn', 'cat'].includes(c.v.type) || B.calcCats(c.v)).map(c => sn(c.col));
    if (D.conv.missing === '999' && nums.length) L.push(`MISSING VALUES ${nums.join(' ')} (999).`, '');
    if (nums.length || cats.length) L.push(`VARIABLE LEVEL${nums.length ? ` ${nums.join(' ')} (SCALE)` : ''}${cats.length ? ` ${cats.join(' ')} (NOMINAL)` : ''}.`, '');
    if (!codes && cats.length) L.push('* Categories are typed as words: AUTORECODE makes numeric copies with value labels if needed.', '');
    L.push('EXECUTE.');
    U.saveUrl(URL.createObjectURL(new Blob([L.join('\r\n')], { type: 'text/plain' })), `${B.fileBase()} - SPSS syntax.sps`); toast('SPSS syntax saved'); return L.join('\n');
  }

  /* ---------- versions and the differences between two designs ---------- */
  let cmpOut = '';
  function diff(A, Bd) {
    const key = v => v.id, byId = new Map(A.vars.map(v => [key(v), v])), byLab = new Map(A.vars.map(v => [v.label.toLowerCase(), v])), seen = new Set(), add = [], rem = [], chg = [];
    const F = ['label', 'type', 'unit', 'min', 'max', 'dec', 'section', 'required', 'role', 'group', 'definition'], vn = (D, v) => visOf(D, v).map(x => x.name).join(', ');
    Bd.vars.forEach(v => { const o = byId.get(key(v)) || byLab.get(v.label.toLowerCase()); if (!o) { add.push(v.label); return; } seen.add(o);
      const d = F.filter(f => String(o[f] ?? '') !== String(v[f] ?? '')).map(f => `${f}: “${o[f] ?? ''}” → “${v[f] ?? ''}”`);
      if ((o.cats || []).join('|') !== (v.cats || []).join('|')) d.push(`categories: ${(o.cats || []).join(' / ')} → ${(v.cats || []).join(' / ')}`);
      if (vn(A, o) !== vn(Bd, v)) d.push(`visits: ${vn(A, o)} → ${vn(Bd, v)}`); if (JSON.stringify(o.formula || null) !== JSON.stringify(v.formula || null)) d.push('formula changed');
      if (B.whenTxt(A, o) !== B.whenTxt(Bd, v)) d.push(`skip logic: ${B.whenTxt(A, o) || 'none'} → ${B.whenTxt(Bd, v) || 'none'}`); if (d.length) chg.push([v.label, d]); });
    A.vars.forEach(v => { if (!seen.has(v)) rem.push(v.label); });
    const top = []; if (A.title !== Bd.title) top.push(`Title: “${A.title}” → “${Bd.title}”`); if (+A.n !== +Bd.n) top.push(`Planned patients: ${A.n} → ${Bd.n}`);
    if (arms(A).join('|') !== arms(Bd).join('|')) top.push(`Groups: ${arms(A).join(', ') || 'one'} → ${arms(Bd).join(', ') || 'one'}`); if (A.visits.map(x => x.name).join('|') !== Bd.visits.map(x => x.name).join('|')) top.push(`Visits: ${A.visits.map(x => x.name).join(', ')} → ${Bd.visits.map(x => x.name).join(', ')}`);
    return { top, add, rem, chg };
  }
  const diffHtml = (r, an, bn) => `<div class="bx-diff"><b>${esc(an)}</b> → <b>${esc(bn)}</b>${!r.top.length && !r.add.length && !r.rem.length && !r.chg.length ? '<p class="legend-note">No differences.</p>' : ''}
    ${r.top.length ? `<ul>${r.top.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}${r.add.length ? `<p><b class="bx-add">+ Added (${r.add.length}):</b> ${r.add.map(esc).join(', ')}</p>` : ''}${r.rem.length ? `<p><b class="bx-rem">− Removed (${r.rem.length}):</b> ${r.rem.map(esc).join(', ')}</p>` : ''}
    ${r.chg.length ? `<p><b>~ Changed (${r.chg.length}):</b></p><ul>${r.chg.map(([l, d]) => `<li><b>${esc(l)}</b>: ${d.map(esc).join('; ')}</li>`).join('')}</ul>` : ''}</div>`;

  /* ---------- the cards on the export tab ---------- */
  function exportCards(D) {
    const mine = Object.keys(ls.get('designs', {})), vers = mine.filter(n => n.startsWith((D.title || 'Design') + ' — v'));
    const card = (icon, t, note, btns) => `<div class="mb-exp"><b>${icon} ${t}</b><p class="legend-note">${note}</p>${btns}</div>`, btn = (k, l, pr) => `<button class="btn ${pr ? 'primary' : 'ghost'}" type="button" data-bx="${k}">${l}</button>`;
    return `<h3 style="margin-top:18px">Documents from the design</h3><div class="grid g3">
      ${card('📑', 'Protocol and analysis plan', 'A Word draft: design, participants (the eligibility checklist), allocation and blinding, outcomes with their definitions, sample size, data management and the planned analysis of each variable, with the schedule as an appendix.', btn('protocol', '⬇ Protocol (.docx)', true))}
      ${card('🗓', 'Schedule of assessments', 'The visits × assessments grid (✓), with each visit\'s day and window — also a sheet of the Excel file.', btn('schedule', '⬇ Schedule (.docx)'))}
      ${card('▦', 'Shell tables', 'The empty tables of the results: baseline characteristics, outcomes, and each repeated measure by visit, with the groups and the P value.', btn('shells', '⬇ Shell tables (.docx)'))}
      ${card('📘', 'Data dictionary', 'Every column: label, type, allowed values, visit, required, definition, skip logic, formula and normal range — for an appendix or the data manager.', btn('dict', '⬇ Dictionary (.docx)'))}
      ${card('🪪', 'Design summary', 'One page for the supervisor or a committee: design, groups, sites, visits, primary outcome, sample size and the variables by section.', btn('summary', '⬇ Summary (.docx)'))}
      ${K(D) >= 2 ? card('✉', 'Randomisation envelopes', D.rand.on ? 'One page per allocation: the number outside, the arm inside — for sequentially numbered, opaque, sealed envelopes.' : 'Turn on the randomisation list (step 2) first.', btn('env', '⬇ Envelopes (.docx)')) : ''}
      ${D.blind ? card('🔑', 'Blinding key', 'Which treatment is Group A and Group B — a separate file for the statistician, kept apart from the data.', btn('key', '⬇ Key (.xlsx)')) : ''}</div>
      <h3>Other ways to collect and analyse</h3><div class="grid g3">
      ${card('📱', 'XLSForm (KoBoToolbox / ODK)', 'For data collection on a tablet or phone: the same questions, choice lists, ranges, required fields, skip logic and some calculations.', btn('xlsform', '⬇ XLSForm (.xlsx)'))}
      ${card('🧮', 'SPSS syntax', 'Reads the master sheet into SPSS with variable labels, value labels (codes), missing values and measurement levels.', btn('spss', '⬇ Syntax (.sps)'))}
      ${card('🌐', 'Google Sheets', 'The Excel master sheet opens in Google Sheets (File › Import): drop-down lists, ranges, highlighting and formulas keep working, for entry by several people.', '')}</div>
      <h3>Versions</h3><div class="mb-exp"><div class="row" style="gap:8px;flex-wrap:wrap;align-items:center">${btn('saveVer', '💾 Save a version…')}<span class="legend-note">${vers.length ? `${vers.length} version${vers.length > 1 ? 's' : ''} of this design` : 'No versions yet'}</span>
        <span class="legend-note">Compare with</span><select data-bxcmp="1" style="width:auto"><option value="">a saved design…</option>${mine.map(n => `<option value="${esc(n)}">${esc(n)}</option>`).join('')}</select><label class="btn ghost small" style="margin:0">or a design file<input type="file" data-bxcmpf="1" accept=".json" hidden></label></div>${cmpOut}</div>`;
  }

  /* ---------- a guided start: six questions, then a design with its sample size ---------- */
  const WIZ_DESIGNS = Object.entries(B.TEMPLATES).map(([k, x]) => [k, x.name]);
  let wizOpen = false, wizMsg = '';
  function studyTop(D) {
    const w = { design: 'rct2', groups: '', visits: '', outcome: '', a: '', b: '', sd: '', avail: '', ...ls.get('wiz', {}) }, t = B.TEMPLATES[w.design] || B.TEMPLATES.rct2;
    const lib = B.LIB.flatMap(([, l]) => l.filter(e => ['num', 'yn'].includes(e[1])).map(e => e[0])), lv = B.findLib(w.outcome || ''), isNum = !lv || lv.type === 'num', e = lv ? lv.expect || {} : {};
    const open = wizOpen || !D.vars.length;
    return `<details class="bx-wiz" ${open ? 'open' : ''}><summary><b>🧭 Guided start</b> <span class="legend-note">six questions → a design with its variables, sample size and planned analysis</span></summary>
      <div class="grid g3" style="margin-top:8px">
        <div><label class="f">1 · Design</label><select data-bxw="design">${WIZ_DESIGNS.map(([k, l]) => `<option value="${k}" ${w.design === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>
        <div><label class="f">2 · Groups <span class="legend-note">(comma; empty for one group)</span></label><input type="text" data-bxw="groups" value="${esc(w.groups)}" placeholder="${esc(t.arms.join(', '))}"></div>
        <div><label class="f">3 · Visits</label><input type="text" data-bxw="visits" value="${esc(w.visits)}" placeholder="${esc(t.visits.join(', '))}"></div>
        <div><label class="f">4 · Main outcome <span class="legend-note">(from the library, or your own)</span></label><input type="text" data-bxw="outcome" value="${esc(w.outcome)}" list="bxLib" placeholder="e.g. Pain VAS"><datalist id="bxLib">${lib.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>
        <div><label class="f">5 · Expected ${isNum ? 'means' : '% yes'} <span class="legend-note">(${t.arms.length >= 2 ? 'group 1 / group 2' : 'before / after'}${isNum ? ' / SD' : ''})</span></label><div class="row" style="gap:4px"><input type="number" step="any" data-bxw="a" value="${esc(w.a)}" placeholder="${esc(isNum ? e.mean ?? '' : (e.pct || [])[0] ?? '')}" style="width:80px"><input type="number" step="any" data-bxw="b" value="${esc(w.b)}" style="width:80px" placeholder="effect">${isNum ? `<input type="number" step="any" data-bxw="sd" value="${esc(w.sd)}" placeholder="${esc(e.sd ?? '')}" style="width:70px">` : ''}</div></div>
        <div><label class="f">6 · Patients you can recruit</label><input type="number" data-bxw="avail" value="${esc(w.avail)}" placeholder="e.g. 80"></div></div>
      <div class="row" style="gap:8px;margin-top:8px"><button class="btn primary" type="button" data-bx="wizGo">Make the design</button><span class="legend-note">It replaces the current design (Undo brings it back).</span></div>${wizMsg}</details>`;
  }
  function wizMake(D0) {
    const w = { design: 'rct2', ...ls.get('wiz', {}) }, D = B.fromTemplate(w.design), list = s => String(s || '').split(',').map(x => x.trim()).filter(Boolean);
    const g = list(w.groups); if (g.length) D.arms = g.length >= 2 ? g : []; const vs = list(w.visits); if (vs.length) { const old = D.visits; D.visits = vs.map((n, i) => ({ id: old[i] ? old[i].id : B.uid(), name: n })); D.vars.forEach(v => { v.visits = (v.visits || []).filter(id => D.visits.some(x => x.id === id)); }); }
    let v = w.outcome ? D.vars.find(x => x.label.toLowerCase() === w.outcome.toLowerCase()) || B.findLib(w.outcome) : D.vars.find(x => /primary/.test(x.role || ''));
    if (w.outcome && !v) v = { id: B.uid(), section: 'Outcomes', label: w.outcome, type: 'num', unit: '', min: '', max: '', cats: [], dec: '', required: false, visits: [], group: '', role: '', definition: '', expect: B.expectOf(w.outcome, 'num', []) };
    if (v) { if (!D.vars.includes(v)) { v.section = v.section || 'Outcomes'; D.vars.push(v); } D.vars.forEach(x => { if (x.role === 'primary') x.role = 'secondary'; }); v.role = 'primary'; v.required = true; if (D.visits.length > 1) v.visits = D.visits.map(x => x.id);
      const num = v.type === 'num'; D.ss = { m: 'auto', v: v.id, alpha: 0.05, power: 0.8, drop: 10, ratio: 1, a: w.a === '' || w.a === undefined ? '' : +w.a, b: w.b === '' || w.b === undefined ? '' : +w.b, sd: num && w.sd !== '' && w.sd !== undefined ? +w.sd : '' }; }
    D.sections = B.secOrder(D); D.rand.on = D.arms.filter(Boolean).length >= 2 && D.design === 'rct';
    const r = B.ssCalc(D), avail = +w.avail || 0; let pw = '';
    if (r && !r.err) { D.n = avail && avail < r.enrol ? avail : r.enrol;
      if (avail && avail < r.enrol && typeof Stats !== 'undefined' && !r.paired && r.n1) { const nn = Math.floor(avail * (1 - (r.drop || 0) / 100) / 2), p = r.num ? Stats.powerTwoMeans(Math.abs(r.a - r.b), r.sd, nn, nn, r.alpha) : Stats.powerTwoProps(r.a / 100, r.b / 100, nn, nn, r.alpha); pw = ` With ${avail} patients (${nn} per group analysed) the power is about ${Math.round(p * 100)}%: recruit longer, at more sites, or expect a larger effect.`; } }
    else if (avail) D.n = avail;
    D.title = D.title || 'New study';
    B.design = D; B.save();
    const plan = v ? `${v.label}: ${plannedTest(D, v)}.` : '';
    wizMsg = `<div class="bx-wiz-out"><b>✓ Design made:</b> ${esc(D.vars.length)} variables, ${esc(D.visits.length)} visit${D.visits.length > 1 ? 's' : ''}, ${esc(D.arms.filter(Boolean).length >= 2 ? D.arms.join(' vs ') : 'one group')}.<br>${r && !r.err ? `<b>Sample size:</b> ${esc(r.text)}` : esc(r && r.err ? r.err : 'Add the expected values to get the sample size.')}${esc(pw)}<br>${plan ? `<b>Planned analysis:</b> ${esc(plan)}` : ''}<br><span class="legend-note">Check the variables (step 3), then export (step 6).</span></div>`;
    void D0; wizOpen = true; return D;
  }

  /* ---------- events ---------- */
  async function onClick(e, D) {
    const b = e.target.closest('[data-bx]'); if (!b) return false; const k = b.dataset.bx;
    try {
      if (k === 'protocol') await protocol(D); else if (k === 'schedule') await schedule(D); else if (k === 'shells') await shells(D); else if (k === 'dict') await dictionary(D); else if (k === 'summary') await summary(D);
      else if (k === 'env') await envelopes(D); else if (k === 'key') blindKey(D); else if (k === 'xlsform') xlsform(D); else if (k === 'spss') spss(D);
      else if (k === 'saveVer') { const note = prompt('What changed in this version?', 'Amendment: '); if (note === null) return true; const all = ls.get('designs', {}), base = (D.title || 'Design') + ' — v', n = Object.keys(all).filter(x => x.startsWith(base)).length + 1;
        D.versionNote = { v: `${n}.0`, date: today(), note }; all[`${base}${n} (${today()})`] = JSON.parse(JSON.stringify(D)); ls.set('designs', all); B.save(); B.render(); toast(`Version ${n} saved: ${note}`); }
      else if (k === 'wizGo') { if (D.vars.length && !confirm('Replace the current design with a new one from these answers? (Undo brings it back)')) return true; wizMake(D); B.render(); toast('Design made from your answers'); }
    } catch (err) { console.error(err); toast('Could not make it: ' + err.message); }
    return true;
  }
  function onInput(e) { const t = e.target, d = t.dataset; if (d.bxw) { const w = ls.get('wiz', {}); w[d.bxw] = t.value; ls.set('wiz', w); if (t.tagName === 'SELECT' || d.bxw === 'outcome' && e.type === 'change') { wizOpen = true; B.render(); } return true; } return false; }
  function onChange(e, D) { const t = e.target, d = t.dataset;
    if (d.bxw) return onInput(e);
    if (d.bxcmp && t.value) { const o = ls.get('designs', {})[t.value]; if (o) { cmpOut = diffHtml(diff(o, D), t.value, 'this design'); B.render(); } return true; }
    if (d.bxcmpf && t.files[0]) { t.files[0].text().then(txt => { try { const j = JSON.parse(txt), o = j.design || j; if (!Array.isArray(o.vars)) throw new Error('not a design file'); cmpOut = diffHtml(diff(o, D), t.files[0].name, 'this design'); B.render(); } catch (err) { toast('Could not read it: ' + err.message); } }); return true; }
    return false; }
  window.EasyBuilderExt = { exportCards, studyTop, onClick, onInput, onChange };
  window.EasyBuilderDocs = { plannedTest, shellTables, scheduleRows, diff, xlsform, spss, protocol, wizMake };
})();

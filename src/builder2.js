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

  /* ---------- B1: an offline data-entry form (one HTML file): one patient per screen, lists, ranges, skip logic, required fields; saved in that browser, exported as CSV ---------- */
  function entryForm(D) {
    const cols = B.columns(D), sites = (D.sites || []).filter(x => x.name), arms0 = shownArms(D), codes = D.conv.catAs === 'codes';
    const F = cols.filter(c => c.v.type !== 'calc').map(c => { const v = c.v, pw = B.whenParent(D, v), pc = pw ? cols.find(x => x.v.id === pw.id && (x.visit && x.visit.id) === (c.visit && c.visit.id)) || cols.find(x => x.v.id === pw.id) : null;
      const opts = c.opt !== undefined ? (codes ? ['1', '2'] : ['Yes', 'No']) : (v.type === 'cat' || v.type === 'yn') ? (codes ? v.cats.map((_, i) => String(i + 1)) : v.cats) : null, labs = c.opt !== undefined ? ['Yes', 'No'] : (v.type === 'cat' || v.type === 'yn') ? v.cats : null;
      return { col: c.col, label: (c.opt !== undefined ? `${v.label}: ${c.opt}` : v.label) + (v.unit ? ` (${v.unit})` : ''), sec: v.section, visit: c.visit ? c.visit.name : '', type: opts ? 'list' : v.type === 'num' ? 'num' : v.type === 'date' ? 'date' : v.type === 'time' ? 'time' : 'text', opts, labs,
        min: v.type === 'num' ? v.min : '', max: v.type === 'num' ? v.max : '', req: !!v.required, def: v.definition || '', when: pc ? { col: pc.col, val: codes ? String(pw.cats.indexOf(v.when.cat) + 1) : v.when.cat } : null }; });
    const spec = { title: D.title || 'Study', key: 'easystat-form:' + (D.title || 'study').replace(/\W+/g, '-').toLowerCase(), idPrefix: D.idPrefix || '', idDigits: +D.idDigits || 3, sites: sites.map(x => ({ name: x.name, prefix: x.prefix || '' })), arms: arms0, fields: F };
    const page = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(spec.title)} — data entry</title><style>
body{font-family:system-ui,Segoe UI,Arial,sans-serif;margin:0;background:#F6F4FA;color:#222}header{background:#1C1648;color:#fff;padding:10px 16px;display:flex;gap:10px;align-items:center;flex-wrap:wrap}header b{font-size:17px}
main{display:grid;grid-template-columns:240px 1fr;gap:12px;padding:12px}@media(max-width:800px){main{grid-template-columns:1fr}}aside,section{background:#fff;border:1px solid #ddd;border-radius:10px;padding:10px}
aside button.p{display:block;width:100%;text-align:left;margin:2px 0;padding:6px 8px;border:1px solid #eee;border-radius:6px;background:#fafafa;cursor:pointer}aside button.p.on{background:#EBDDFB;border-color:#7B2FBE}
h3{margin:14px 0 6px;color:#1C1648;border-bottom:2px solid #EBDDFB;padding-bottom:3px}.f{display:grid;grid-template-columns:minmax(180px,40%) 1fr;gap:8px;align-items:center;margin:5px 0}.f label{font-size:14px}.f small{color:#777;display:block}
input,select{font:inherit;padding:5px 7px;border:1px solid #bbb;border-radius:6px;width:100%;box-sizing:border-box}.bad input,.bad select{border-color:#C00000;background:#FFF0F0}.miss input,.miss select{border-color:#E6A700;background:#FFF8E1}
.btn{border:0;border-radius:8px;padding:7px 12px;cursor:pointer;background:#7B2FBE;color:#fff;font-weight:600}.btn.g{background:#eee;color:#222}.msg{font-size:13px;color:#555;margin-left:auto}.hide{display:none}</style></head><body>
<header><b>${esc(spec.title)}</b><span>— data entry</span><button class="btn" id="new">+ New patient</button><button class="btn g" id="csv">⬇ Export CSV</button><label class="btn g">⬆ Import CSV<input type="file" id="imp" accept=".csv" hidden></label><span class="msg" id="msg"></span></header>
<main><aside><b>Patients</b> <small id="cnt"></small><div id="list"></div></aside><section id="form"><p>Choose a patient or press <b>+ New patient</b>. The data stay in this browser until you export them.</p></section></main>
<script>
var S=${JSON.stringify(spec).replace(/</g, '\\u003c')};var DB=JSON.parse(localStorage.getItem(S.key)||'{}'),cur=null;
function lead(){var L=['ID'];if(S.sites.length)L.push('Site');if(S.arms.length>1)L.push('Group');return L}
function save(){localStorage.setItem(S.key,JSON.stringify(DB));list()}
function msg(t){document.getElementById('msg').textContent=t}
function list(){var ids=Object.keys(DB).sort();document.getElementById('cnt').textContent='('+ids.length+')';document.getElementById('list').innerHTML=ids.map(function(id){var r=DB[id],m=S.fields.filter(function(f){return f.req&&shown(f,r)&&(r[f.col]===undefined||r[f.col]==='')}).length;return '<button class="p'+(id===cur?' on':'')+'" data-id="'+id+'">'+id+(m?' <small style="color:#B45309">· '+m+' missing</small>':' <small style="color:#2E7D32">✓</small>')+'</button>'}).join('')}
function shown(f,r){return !f.when||String(r[f.when.col]||'')===String(f.when.val)}
function esc(t){return String(t==null?'':t).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function input(f,v){if(f.type==='list')return '<select data-c="'+f.col+'"><option value=""></option>'+f.opts.map(function(o,i){return '<option value="'+esc(o)+'"'+(String(v)===String(o)?' selected':'')+'>'+esc(f.labs[i]===o?o:o+' = '+f.labs[i])+'</option>'}).join('')+'</select>';
 return '<input data-c="'+f.col+'" type="'+(f.type==='num'?'number':f.type==='date'?'date':f.type==='time'?'time':'text')+'" step="any" value="'+esc(v)+'"'+(f.min!==''&&f.min!=null?' min="'+f.min+'"':'')+(f.max!==''&&f.max!=null?' max="'+f.max+'"':'')+'>'}
function open1(id){cur=id;var r=DB[id],h='<h2 style="margin:0 0 6px">'+esc(id)+'</h2>',sec=null,vis=null;
 lead().slice(1).forEach(function(c){var opts=c==='Site'?S.sites.map(function(s){return s.name}):S.arms;h+='<div class="f"><label>'+c+'</label><select data-c="'+c+'"><option></option>'+opts.map(function(o){return '<option'+(r[c]===o?' selected':'')+'>'+esc(o)+'</option>'}).join('')+'</select></div>'});
 S.fields.forEach(function(f){var head=f.sec+(f.visit?' — '+f.visit:'');if(head!==sec){sec=head;h+='<h3>'+esc(head)+'</h3>'}h+='<div class="f'+(shown(f,r)?'':' hide')+'" data-row="'+f.col+'"><label>'+esc(f.label)+(f.req?' *':'')+(f.min!==''&&f.min!=null?'<small>'+f.min+' to '+f.max+'</small>':'')+(f.def?'<small>'+esc(f.def)+'</small>':'')+'</label>'+input(f,r[f.col])+'</div>'});
 h+='<p style="margin-top:14px"><button class="btn" id="sv">Save</button> <button class="btn g" id="del">Delete this patient</button></p>';document.getElementById('form').innerHTML=h;check();list()}
function check(){var r=DB[cur],bad=0,miss=0;S.fields.forEach(function(f){var row=document.querySelector('[data-row="'+f.col+'"]');if(!row)return;var on=shown(f,r);row.classList.toggle('hide',!on);var v=r[f.col];var b=on&&f.type==='num'&&v!==''&&v!=null&&((f.min!==''&&+v<+f.min)||(f.max!==''&&+v>+f.max)),m=on&&f.req&&(v===undefined||v==='');row.classList.toggle('bad',!!b);row.classList.toggle('miss',!!m);if(b)bad++;if(m)miss++});msg((bad?bad+' out of range · ':'')+(miss?miss+' required missing':'complete'))}
document.addEventListener('input',function(e){var c=e.target.dataset&&e.target.dataset.c;if(!c||!cur)return;DB[cur][c]=e.target.value;if(S.fields.some(function(f){return f.when&&f.when.col===c}))S.fields.forEach(function(f){if(f.when&&f.when.col===c&&!shown(f,DB[cur]))delete DB[cur][f.col]});check()});
document.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.id)return open1(b.dataset.id);
 if(b.id==='new'){var site=S.sites.length?prompt('Site ('+S.sites.map(function(s){return s.name}).join(', ')+'):',S.sites[0].name):null;var pre=site?(S.sites.find(function(s){return s.name===site})||{prefix:''}).prefix:S.idPrefix,n=1;while(DB[pre+String(n).padStart(S.idDigits,'0')])n++;var id=prompt('Patient ID:',pre+String(n).padStart(S.idDigits,'0'));if(!id)return;if(DB[id]){alert('This ID exists already');return}DB[id]={};if(site)DB[id].Site=site;save();open1(id)}
 if(b.id==='sv'){save();msg('Saved '+new Date().toLocaleTimeString())}if(b.id==='del'&&confirm('Delete '+cur+'?')){delete DB[cur];cur=null;save();document.getElementById('form').innerHTML='<p>Deleted.</p>'}
 if(b.id==='csv'){var H=lead().concat(S.fields.map(function(f){return f.col})),q=function(x){x=x==null?'':String(x);return /[",\\n]/.test(x)?'"'+x.replace(/"/g,'""')+'"':x};var rows=[H.map(q).join(',')].concat(Object.keys(DB).sort().map(function(id){return H.map(function(h){return q(h==='ID'?id:DB[id][h])}).join(',')}));var a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['\\ufeff'+rows.join('\\r\\n')],{type:'text/csv'}));a.download=S.title.replace(/[\\\\/:*?"<>|]+/g,' ')+' - data entry.csv';a.click()}});
document.getElementById('imp').onchange=function(e){var f=e.target.files[0];if(!f)return;f.text().then(function(t){var L=t.replace(/^\\ufeff/,'').split(/\\r?\\n/).filter(Boolean),split=function(l){var o=[],c='',q=false;for(var i=0;i<l.length;i++){var ch=l[i];if(q){if(ch==='"'){if(l[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}else if(ch==='"')q=true;else if(ch===','){o.push(c);c=''}else c+=ch}o.push(c);return o},H=split(L[0]),n=0;
 L.slice(1).forEach(function(l){var r=split(l),id=r[H.indexOf('ID')];if(!id)return;DB[id]=DB[id]||{};H.forEach(function(h,i){if(h!=='ID'&&r[i]!=='')DB[id][h]=r[i]});n++});save();msg(n+' patients imported')})};
list();
</script></body></html>`;
    U.saveUrl(URL.createObjectURL(new Blob([page], { type: 'text/html' })), `${B.fileBase()} - data entry form.html`); toast('Data-entry form saved — open it in any browser, even offline');
  }

  /* ---------- B5: participant information sheet and consent form; B6: ethics application summary; B10: data management plan ---------- */
  async function consentDoc(D) { const k = K(D), arms0 = arms(D), el = eligOf(D), sch = D.visits, kids = [], ss = B.ssCalc(D), safety = D.vars.filter(v => v.role === 'safety').map(v => v.label);
    kids.push(P('PARTICIPANT INFORMATION SHEET', { bold: true, size: 28, center: true }), P(D.title || 'Study title', { bold: true, center: true, after: 200 }), P('Draft from the study design — adapt the wording to your committee\'s template and language.', { it: true, color: '555555', after: 200 }));
    const q = (h, t) => { kids.push(H(h, 2)); (Array.isArray(t) ? t : [t]).forEach(x => kids.push(typeof x === 'string' ? P(x) : x)); };
    q('What is this study about?', `We are doing a ${DESIGN[D.design] || 'study'}${k >= 2 ? ` comparing ${arms0.join(' and ')}` : ''}. We want to find out ${roleList(D, 'primary').length ? `how ${roleList(D, 'primary').map(v => v.label.toLowerCase()).join(' and ')} change${roleList(D, 'primary').length > 1 ? '' : 's'}` : 'whether the treatment helps'}.`);
    q('Why have I been invited?', el.inc.length ? ['You may be able to take part because:', ...el.inc.map(bullet)] : 'You have been invited because you have the condition we are studying. [Add the main inclusion criteria.]');
    q('Do I have to take part?', 'No. Taking part is voluntary. If you decide not to, or to stop later, your usual care will not change in any way.');
    if (D.design === 'rct' && k >= 2) q('How will my treatment be chosen?', `The treatment you receive (${arms0.join(' or ')}) will be decided by chance, like tossing a coin, so that the groups are similar. Neither you nor your doctor can choose it.${D.blind ? ' You will not be told which treatment you received until the study ends, unless it is needed for your safety.' : ''}`);
    q('What will happen if I take part?', [`You will be seen ${sch.length === 1 ? 'once' : `${sch.length} times`}: ${sch.map(x => x.name + (x.day !== undefined && x.day !== '' ? ` (around day ${x.day})` : '')).join(', ')}.`, 'At these visits we will record: ' + [...new Set(D.vars.filter(v => !v.elig && v.type !== 'calc').map(v => v.label))].slice(0, 14).join(', ') + (D.vars.length > 14 ? ', and a few other details.' : '.')]);
    q('What are the possible benefits and risks?', ['[Describe the expected benefits and the known risks of each treatment.]', safety.length ? `We will watch carefully for: ${safety.join(', ')}.` : '']);
    q('Will my information be kept confidential?', `Yes. Your information will be stored under a study number (${D.idPrefix || 'P'}${'0'.repeat(Math.max(0, (+D.idDigits || 3) - 1))}1 …) instead of your name, on password-protected computers. Only the research team will see it. The results will be published without any information that could identify you.`);
    q('How many people will take part?', `About ${ss && !ss.err ? ss.enrol : D.n} patients${(D.sites || []).filter(x => x.name).length > 1 ? ` at ${D.sites.filter(x => x.name).length} hospitals` : ''}.`);
    q('Who can I contact?', 'Investigator: ____________________   Telephone: ______________   Ethics committee: ____________________');
    kids.push(P('CONSENT FORM', { bold: true, size: 28, center: true, pb: true, after: 160 }), P(D.title || 'Study title', { bold: true, center: true, after: 240 }), P('Please initial each box:', { bold: true }));
    ['I have read and understood the information sheet and have had the chance to ask questions.', 'I understand that taking part is voluntary and that I can stop at any time without giving a reason, without my care being affected.', 'I agree that my information may be looked at by the research team and the regulatory authorities, kept confidential.', ...(D.design === 'rct' && k >= 2 ? ['I understand that my treatment will be chosen by chance.'] : []), 'I agree to take part in this study.']
      .forEach((t, i) => kids.push(T(['', 'Statement', 'Initials'], [[String(i + 1), t, '']], { size: 20 })));
    kids.push(P('', { after: 200 }), P('Name of participant ______________________  Signature ____________  Date ___/___/______'), P('Name of person taking consent _____________  Signature ____________  Date ___/___/______', { before: 120 }));
    await saveDoc(kids, 'information sheet and consent form', 'Information sheet and consent form'); }
  async function ethicsDoc(D) { const k = K(D), ss = B.ssCalc(D), el = eligOf(D), sch = scheduleRows(D), xl = B.xlOpts(D), kids = [P(D.title || 'Study title', { bold: true, size: 30, center: true }), P('Summary for the research ethics committee — draft', { it: true, center: true, after: 200 })];
    const sec = (t, x) => { kids.push(H(t, 2)); (Array.isArray(x) ? x : [x]).forEach(y => kids.push(typeof y === 'string' ? P(y) : y)); };
    sec('Design', `${(DESIGN[D.design] || D.design).replace(/^./, c => c.toUpperCase())}${k >= 2 ? ` of ${arms(D).join(' versus ')}` : ''}${(D.sites || []).filter(x => x.name).length > 1 ? `, at ${D.sites.filter(x => x.name).map(x => x.name).join(', ')}` : ''}.`);
    sec('Objectives', [P('Primary:', { bold: true }), ...(roleList(D, 'primary').length ? roleList(D, 'primary').map(v => bullet(vLabel(v) + (v.definition ? ` — ${v.definition}` : ''))) : [bullet('[to be marked]')]), ...(roleList(D, 'secondary').length ? [P('Secondary:', { bold: true }), ...roleList(D, 'secondary').map(v => bullet(vLabel(v)))] : [])]);
    sec('Participants', [`Number: ${ss && !ss.err ? `${ss.enrol} (${ss.text})` : D.n}`, ...(el.inc.length ? [P('Inclusion:', { bold: true }), ...el.inc.map(bullet)] : []), ...(el.exc.length ? [P('Exclusion:', { bold: true }), ...el.exc.map(bullet)] : [])]);
    sec('Allocation and blinding', randText(D));
    sec('Procedures and visits', [T(sch.head, sch.rows, { center: true, size: 16 })]);
    sec('Risks and safety monitoring', [`Safety outcomes recorded: ${D.vars.filter(v => v.role === 'safety').map(v => v.label).join(', ') || '[none marked]'}.${D.vars.some(v => v.section === 'Adverse events') ? ' Adverse events are recorded on a log (term, dates, CTCAE grade, seriousness, relation to the treatment, action and outcome); serious adverse events are reported to the committee within the required time.' : ' [Describe how adverse events are recorded and reported.]'}`, '[Describe the foreseeable risks and how they are reduced.]']);
    sec('Consent', 'Written informed consent is taken by a trained investigator before any study procedure (information sheet and consent form attached).');
    sec('Data protection', `Patients are identified by a study number only; the list linking numbers to names is kept separately and securely. Data are entered in a password-protected master sheet${xl.protect ? ' with a protected structure' : ''}${D.double ? ', entered twice and compared' : ''}, and kept for the period required by the institution.`);
    sec('Statistical analysis', 'Described in the attached protocol and statistical analysis plan (Prof MSE Easy Stat).');
    const g = ganttPhases(D); sec('Timeline', [T(['Phase', 'From month', 'To month'], g.map(x => [x.name, String(x.from + 1), String(x.to)]), { size: 18 })]);
    await saveDoc(kids, 'ethics summary', 'Ethics application summary'); }
  async function dmpDoc(D) { const xl = B.xlOpts(D), cols = B.columns(D), kids = [P(`${D.title || 'Study'} — data management plan`, { bold: true, size: 28, after: 160 }), P('Draft from the design of the master sheet.', { it: true, color: '555555', after: 160 })];
    const sec = (t, x) => { kids.push(H(t, 2)); (Array.isArray(x) ? x : [x]).forEach(y => kids.push(typeof y === 'string' ? bullet(y) : y)); };
    sec('Data collected', [`${D.vars.length} variables in ${cols.length} columns (data dictionary attached), ${D.visits.length} visit${D.visits.length > 1 ? 's' : ''}, about ${D.n} patients.`, ...(D.repeat || []).map(r => `“${r}”: a repeating form (one row per event).`)]);
    sec('Collection and entry', [`Paper case report forms${D.vars.length ? ' (from the design)' : ''}, typed into the Excel master sheet${D.double ? ' twice by two people, every difference checked' : ''}.`, 'Or on a tablet: the offline entry form or the XLSForm (KoBoToolbox / ODK).']);
    sec('Coding', [`Patient ID: ${D.idPrefix || ''}${'0'.repeat(Math.max(0, (+D.idDigits || 3) - 1))}1 …; categories as ${D.conv.catAs === 'codes' ? 'numeric codes (codebook)' : 'words'}; dates ${D.conv.date}; missing values ${D.conv.missing === '999' ? 'as 999' : 'left empty'}.`]);
    sec('Quality control', [`Drop-down lists and allowed ranges in every column; ${(D.checks || []).length} rules between columns; ${D.vars.filter(v => B.whenParent(D, v)).length} questions with skip logic.`, ...(xl.dash ? ['A completeness dashboard (patients entered, complete, duplicated IDs, rule breaks, % filled).'] : []), ...(xl.ids ? ['Duplicated or malformed IDs highlighted.'] : []), ...(xl.log ? ['An entry log: who entered and checked each row, and source data verification.'] : []), ...(xl.protect ? ['The Data sheet is protected: only the entry columns can be changed.'] : [])]);
    sec('Storage, security and backup', ['Files kept on an encrypted, password-protected institutional computer; a dated backup weekly on a second secure location.', 'The list linking study numbers to patients\' names is kept apart from the data.']);
    sec('Versions and changes', ['Each version of the design is saved with a note; the analysis records every change made while cleaning (change log).']);
    sec('Sharing and archiving', ['Anonymised data and the data dictionary archived for at least 5 years (or as required by the institution).']);
    await saveDoc(kids, 'data management plan', 'Data management plan'); }

  /* ---------- B7: the visit calendar of each patient, from a filled master sheet (dates and windows; list and calendar file) ---------- */
  async function calendar(D, file) {
    const wb = XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: true }), ws = wb.Sheets.Data || wb.Sheets[wb.SheetNames[0]], aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }), head = (aoa[1] || []).map(x => String(x || ''));
    const anc = D.vars.find(v => v.id === D.anchor); if (!anc) { toast('Set the anchor date and the visit days first (step 2)'); return; } const ak = head.indexOf(B.baseName(anc)); if (ak < 0) { toast(`No column “${B.baseName(anc)}” in this sheet`); return; }
    const toD = x => x instanceof Date ? x : typeof x === 'number' ? new Date(Math.round((x - 25569) * 864e5)) : x ? new Date(Date.parse(x)) : null, fmt = d0 => d0.toISOString().slice(0, 10), rows = [['Patient ID', 'Visit', 'Due date', 'Window from', 'Window to']], ev = [];
    aoa.slice(2).forEach(r => { const id = r[0], a = toD(r[ak]); if (!id || !a || isNaN(a)) return; D.visits.forEach((x, i) => { if (!i || x.day === undefined || x.day === '') return; const due = new Date(a.getTime() + (+x.day) * 864e5), tl = +x.tol || 0;
      rows.push([id, x.name, fmt(due), fmt(new Date(due.getTime() - tl * 864e5)), fmt(new Date(due.getTime() + tl * 864e5))]); ev.push({ id, visit: x.name, due, tl }); }); });
    if (rows.length < 2) { toast('No patient with an anchor date in this sheet'); return; }
    rows.splice(1, rows.length - 1, ...rows.slice(1).sort((p, q) => p[2] < q[2] ? -1 : 1));
    const wb2 = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb2, XLSX.utils.aoa_to_sheet(rows), 'Visit calendar'); XLSX.writeFile(wb2, `${B.fileBase()} - visit calendar.xlsx`);
    const dt = d0 => d0.toISOString().slice(0, 10).replace(/-/g, ''), stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Prof MSE Easy Stat//Visit calendar//EN', 'CALSCALE:GREGORIAN', ...ev.flatMap((e, i) => ['BEGIN:VEVENT', `UID:${dt(e.due)}-${i}@easystat`, `DTSTAMP:${stamp}`, `DTSTART;VALUE=DATE:${dt(e.due)}`, `DTEND;VALUE=DATE:${dt(new Date(e.due.getTime() + 864e5))}`, `SUMMARY:${String(e.id).replace(/[,;]/g, ' ')} — ${e.visit}`, `DESCRIPTION:${(D.title || '').replace(/[,;\n]/g, ' ')}${e.tl ? ` (window ± ${e.tl} days)` : ''}`, 'END:VEVENT']), 'END:VCALENDAR'].join('\r\n');
    setTimeout(() => U.saveUrl(URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })), `${B.fileBase()} - visits.ics`), 400); toast(`${ev.length} visits: a list (Excel) and a calendar file (.ics)`); }

  /* ---------- B8: labels with a Code 128 barcode (A4, 3 × 8), printed from the browser ---------- */
  const C128 = '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ');
  function code128(text) { const vals = [...String(text)].map(c => Math.max(0, Math.min(94, c.charCodeAt(0) - 32))), chk = (104 + vals.reduce((a, v, i) => a + v * (i + 1), 0)) % 103, seq = [104, ...vals, chk, 106];
    let x = 10; const bars = []; seq.forEach(c => { [...C128[c]].forEach((w, i) => { if (i % 2 === 0) bars.push(`<rect x="${x}" y="0" width="${w}" height="40"/>`); x += +w; }); });
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${x + 10} 40" preserveAspectRatio="none" style="width:100%;height:11mm">${bars.join('')}</svg>`; }
  function labels(D, per) { const sites = (D.sites || []).filter(x => x.name), n = +D.n || 60, pad = i => String(i).padStart(+D.idDigits || 3, '0');
    const ids = sites.length ? sites.flatMap(x => Array.from({ length: Math.ceil(n / sites.length) }, (_, i) => [`${x.prefix || ''}${pad(i + 1)}`, x.name])) : Array.from({ length: n }, (_, i) => [`${D.idPrefix || ''}${pad(i + 1)}`, '']);
    const L = ids.flatMap(([id, site]) => per === 'visit' ? D.visits.map(v => [id, site, v.name]) : [[id, site, '']]);
    const page = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(D.title || 'Labels')}</title><style>@page{size:A4;margin:12.9mm 7.2mm}body{margin:0;font-family:Arial,sans-serif}.sheet{display:grid;grid-template-columns:repeat(3,63.5mm);grid-auto-rows:33.9mm;column-gap:2.5mm}
.l{box-sizing:border-box;padding:2mm 3mm;overflow:hidden;font-size:8pt;border:1px dashed #ccc}.l b{font-size:12pt;display:block}.t{white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#444}@media print{.l{border:0}.no{display:none}}</style></head><body>
<p class="no" style="font:14px Arial;padding:8px">${L.length} labels on A4 sheets of 3 × 8 (63.5 × 33.9 mm, e.g. L7160). Print at 100% (no scaling).</p><div class="sheet">${L.map(([id, site, vis]) => `<div class="l"><div class="t">${esc(D.title || '')}</div><b>${esc(id)}</b><div class="t">${esc([site, vis].filter(Boolean).join(' · '))}</div>${code128(id)}</div>`).join('')}</div></body></html>`;
    U.saveUrl(URL.createObjectURL(new Blob([page], { type: 'text/html' })), `${B.fileBase()} - labels.html`); toast(`${L.length} labels — open the file and print`); }

  /* ---------- B9: the study timeline (Gantt) from the sample size and the recruitment rate ---------- */
  function ganttPhases(D) { const tl = D.timeline || {}, ss = B.ssCalc(D), n = ss && !ss.err ? ss.enrol : +D.n || 60, rate = Math.max(1, +tl.rate || 10), setup = +tl.setup || 2, rec = Math.ceil(n / rate), lastDay = Math.max(0, ...D.visits.map(x => +x.day || 0)), fu = Math.ceil(lastDay / 30.4) || 0, an = +tl.analysis || 2, wr = +tl.writing || 3;
    const ph = []; let t = 0; const add = (name, len, overlap) => { const from = overlap !== undefined ? overlap : t; ph.push({ name, from, to: from + len }); t = Math.max(t, from + len); };
    add('Approvals and set-up', setup); add(`Recruitment (${n} patients at ${rate} a month)`, rec); if (fu) add(`Follow-up (last visit: day ${lastDay})`, fu, setup + 1); t = Math.max(t, setup + rec + fu); add('Data cleaning and analysis', an); add('Writing and submission', wr); return ph; }
  async function gantt(D) { const ph = ganttPhases(D), end = Math.max(...ph.map(x => x.to)), W = 1100, RH = 40, LW = 330, c = document.createElement('canvas'), H = 70 + ph.length * RH + 40; c.width = W * 2; c.height = H * 2; const g = c.getContext('2d'); g.scale(2, 2);
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H); g.fillStyle = '#1C1648'; g.font = 'bold 18px Arial'; g.fillText(`${D.title || 'Study'} — timeline`, 16, 30); const X = m => LW + (W - LW - 20) * m / end;
    g.font = '11px Arial'; g.fillStyle = '#777'; for (let m = 0; m <= end; m++) { if (end > 24 && m % 3) continue; g.fillText(String(m), X(m) - 3, 55); g.strokeStyle = '#eee'; g.beginPath(); g.moveTo(X(m), 60); g.lineTo(X(m), H - 30); g.stroke(); }
    ph.forEach((p, i) => { const y = 64 + i * RH; g.fillStyle = '#222'; g.font = '13px Arial'; g.fillText(p.name, 16, y + 24); g.fillStyle = ['#7B2FBE', '#1F4E9A', '#2E7D32', '#C55A11', '#9C2A54'][i % 5]; g.fillRect(X(p.from), y + 8, Math.max(4, X(p.to) - X(p.from)), RH - 16); });
    g.fillStyle = '#555'; g.font = '12px Arial'; g.fillText('months from the start', LW, H - 10);
    const { ImageRun } = X0(); const img = new (window.docx.Paragraph)({ children: [new ImageRun({ data: Uint8Array.from(atob(c.toDataURL('image/png').split(',')[1]), ch => ch.charCodeAt(0)), transformation: { width: 620, height: Math.round(620 * H / W) } })] });
    await saveDoc([P(`${D.title || 'Study'} — timeline`, { bold: true, size: 28 }), img, T(['Phase', 'From month', 'To month', 'Length (months)'], ph.map(x => [x.name, String(x.from + 1), String(x.to), String(x.to - x.from)]), { size: 18 }), P(`Total: about ${end} months. Change the recruitment rate and the phases' lengths in the Export tab.`, { it: true, before: 80 })], 'timeline', 'Study timeline', true); }
  const X0 = () => window.docx;

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
      ${card('🧾', 'Information sheet and consent form', 'Drafts for the participants from the design: purpose, why invited (inclusion criteria), visits and what is recorded, allocation by chance, confidentiality, contacts — and a consent form with initials and signatures.', btn('consent', '⬇ Information & consent (.docx)'))}
      ${card('⚖', 'Ethics application summary', 'Design, objectives, participants and sample size, allocation and blinding, procedures (schedule), risks and safety monitoring, consent, data protection and the timeline — laid out for a committee form.', btn('ethics', '⬇ Ethics summary (.docx)'))}
      ${card('🗄', 'Data management plan', 'Data collected, entry, coding, quality control (lists, ranges, rules, dashboard, log, protection), storage and backup, versions, sharing and archiving.', btn('dmp', '⬇ Data management plan (.docx)'))}
      ${card('📈', 'Study timeline (Gantt)', `Set-up, recruitment, follow-up, analysis and writing in months, from the sample size and the recruitment rate.<br><span class="gen-ctl">patients a month <input type="number" min="1" data-bxtl="rate" value="${esc((D.timeline || {}).rate ?? 10)}" style="width:56px"></span> <span class="gen-ctl">set-up <input type="number" min="0" data-bxtl="setup" value="${esc((D.timeline || {}).setup ?? 2)}" style="width:46px"></span> <span class="gen-ctl">analysis <input type="number" min="0" data-bxtl="analysis" value="${esc((D.timeline || {}).analysis ?? 2)}" style="width:46px"></span> <span class="gen-ctl">writing <input type="number" min="0" data-bxtl="writing" value="${esc((D.timeline || {}).writing ?? 3)}" style="width:46px"></span>`, btn('gantt', '⬇ Timeline (.docx)'))}
      ${D.blind ? card('🔑', 'Blinding key', 'Which treatment is Group A and Group B — a separate file for the statistician, kept apart from the data.', btn('key', '⬇ Key (.xlsx)')) : ''}</div>
      <h3>Other ways to collect and analyse</h3><div class="grid g3">
      ${card('🖥', 'Offline data-entry form', 'One HTML file from the design: one patient per screen, drop-down lists, ranges, required fields and skip logic. Works in any browser without the internet; the data stay in that browser and are exported as CSV (the master sheet\'s column names) to analyse here.', btn('form', '⬇ Entry form (.html)', true))}
      ${card('🗓', 'Visit calendar', D.anchor && D.visits.some((x, i) => i && x.day !== undefined && x.day !== '') ? 'Upload the filled master sheet: each patient\'s visit dates and windows, as a list (Excel) and a calendar file (.ics) for reminders.' : 'Set the anchor date and the day of each visit (step 2) first.', `<label class="btn ghost" style="margin:0">⬆ Master sheet → calendar<input type="file" data-bxcal="1" accept=".xlsx,.xls" hidden></label>`)}
      ${card('🏷', 'Patient labels', 'A4 label sheets (3 × 8, e.g. L7160) with the study, ID, site and visit, and a Code 128 barcode — for folders, CRFs and tubes.', `${btn('labels', '⬇ One per patient')} ${btn('labelsVisit', '⬇ One per visit')}`)}
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
      else if (k === 'env') await envelopes(D); else if (k === 'form') entryForm(D); else if (k === 'consent') await consentDoc(D); else if (k === 'ethics') await ethicsDoc(D); else if (k === 'dmp') await dmpDoc(D); else if (k === 'gantt') await gantt(D);
      else if (k === 'labels' || k === 'labelsVisit') labels(D, k === 'labelsVisit' ? 'visit' : 'patient'); else if (k === 'key') blindKey(D); else if (k === 'xlsform') xlsform(D); else if (k === 'spss') spss(D);
      else if (k === 'saveVer') { const note = prompt('What changed in this version?', 'Amendment: '); if (note === null) return true; const all = ls.get('designs', {}), base = (D.title || 'Design') + ' — v', n = Object.keys(all).filter(x => x.startsWith(base)).length + 1;
        D.versionNote = { v: `${n}.0`, date: today(), note }; all[`${base}${n} (${today()})`] = JSON.parse(JSON.stringify(D)); ls.set('designs', all); B.save(); B.render(); toast(`Version ${n} saved: ${note}`); }
      else if (k === 'wizGo') { if (D.vars.length && !confirm('Replace the current design with a new one from these answers? (Undo brings it back)')) return true; wizMake(D); B.render(); toast('Design made from your answers'); }
    } catch (err) { console.error(err); toast('Could not make it: ' + err.message); }
    return true;
  }
  function onInput(e) { const t = e.target, d = t.dataset; if (d.bxw) { const w = ls.get('wiz', {}); w[d.bxw] = t.value; ls.set('wiz', w); if (t.tagName === 'SELECT' || d.bxw === 'outcome' && e.type === 'change') { wizOpen = true; B.render(); } return true; } return false; }
  function onChange(e, D) { const t = e.target, d = t.dataset;
    if (d.bxcal && t.files[0]) { const f = t.files[0]; t.value = ''; calendar(D, f).catch(err => { console.error(err); toast('Could not read it: ' + err.message); }); return true; }
    if (d.bxtl) { D.timeline = { ...(D.timeline || {}), [d.bxtl]: t.value === '' ? '' : +t.value }; B.save(); return true; }
    if (d.bxw) return onInput(e);
    if (d.bxcmp && t.value) { const o = ls.get('designs', {})[t.value]; if (o) { cmpOut = diffHtml(diff(o, D), t.value, 'this design'); B.render(); } return true; }
    if (d.bxcmpf && t.files[0]) { t.files[0].text().then(txt => { try { const j = JSON.parse(txt), o = j.design || j; if (!Array.isArray(o.vars)) throw new Error('not a design file'); cmpOut = diffHtml(diff(o, D), t.files[0].name, 'this design'); B.render(); } catch (err) { toast('Could not read it: ' + err.message); } }); return true; }
    return false; }
  window.EasyBuilderExt = { exportCards, studyTop, onClick, onInput, onChange };
  window.EasyBuilderDocs = { code128, ganttPhases, entryForm, labels, plannedTest, shellTables, scheduleRows, diff, xlsform, spss, protocol, wizMake };
})();

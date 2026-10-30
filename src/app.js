/* Prof MSE Easy Stat — user interface */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STEPS = [['Upload', 'Excel file'], ['Variables', 'Groups & roles'], ['Timepoints', 'Per outcome'], ['Tests', 'Statistics'], ['Tables', 'Layout & numbers'],
    ['Comments', 'Text'], ['Figures', 'Charts'], ['Advanced', 'Regression, ROC …'], ['Flowchart', 'CONSORT / STROBE …'], ['Results', 'Each variable'], ['Report', 'Preview & Word']];
  const TP_RE = /^(baseline|base|bl|pre|post|preop|postop|before|after|final|end|(t|v|visit|day|d|week|wk|w|month|mo|m|h|hr|y|yr|session)\d+(\.\d+)?|\d+(\.\d+)?(h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|m|mo|mon|month|months|y|yr|yrs|year|years|min|mins))$/i;
  const UNIT_RE = /^(\d+(\.\d+)?-\d+(\.\d+)?|years?|yrs|months?|days?|weeks?|hours?|deg|degrees?|kg|g|cm|mm|m2|kg\/m2|mmhg|bpm|percent|pct|%|min|mins|sec|ml|mg|mg\/dl|mmol\/l|iu|u\/l|ng|pg|ug|mcg|µg|mmol|umol|µmol|meq|x?10e\d+)$/i;
  // a unit followed by one of these reads as "per": mg_L → mg/L, kg_m2 → kg/m2
  const PER_RE = /^(l|dl|ml|m2|kg|min|h|hr|day)$/i;
  const fixCase = u => u.replace(/^(m|d)?l$/i, m => m.length === 1 ? 'L' : m[0].toLowerCase() + 'L');
  const ID_RE = /(^id$|_id$|^id_|study.?id|patient.?(id|no|code)|^code$|^serial|^no\.?$|^s\.?n\.?$|^name$)/i;
  const GROUP_RE = /^(group|groups|arm|treatment|allocation|intervention|study.?group)$/i;

  const DEFAULT_OPTIONS = {
    decimals: 2, alpha: 0.05, chartStyle: 'auto', palette: 'brand', effect: true, within: false, fisher: true, branding: false,
    commentStyle: 'concise', notSig: false, tableStyle: 'grid', font: 'Times New Roman', unitsInText: true, correlation: false, corrWhich: 'sig', corrN: 'all', corrFit: 'linear', corrNote: 'coef', corrPt: 'normal', corrGroup: false, corrZero: false, corrHeat: false, sigMarks: true, points: false,
    figures: 'all', errorBar: 'sd', figWidth: 'full', figPerRow: 1, valueLabels: false,
    chartText: 'normal', chartAspect: 'wide', barFill: 'gradient', yAxis: 'auto', legendPos: 'bottom', chartRes: 1,
    gridlines: true, axisArrows: true, nLabels: false, legendSize: 'normal', legendTitle: '', legendFrame: false,
    welch: false, dunn: true, chiPost: true, mixed: false, normality: 'sw', catEffect: 'rr',
    figPlacement: 'after', captionStyle: 'colon', chartTitle: false,
    pctDecimals: 1, meanStyle: 'pm', iqrStyle: 'dash', secondRow: 'auto', pDigits: 3, pHead: 'P value', sigSym: '*', showStat: false, missingNote: false,
    orientation: 'portrait', tableCaption: 'colon', pWord: 'P value', commentPlace: 'after', commentEffect: false, summary: false, barWidth: 'normal', boxMean: false,
    pLead: 1, totalCol: false, nHead: true, boldSig: false, figNotes: true, chartFont: 'sans', testNote: 'none', tableNewPage: true,
    rmPost: 'first', rmAdjust: 'bonferroni', rmSph: 'gg', rmChange: 'none', rmPostAlways: false, rmAuc: false, rmIndividual: false,
    mwAdjust: 'none', chiAdjust: 'bonferroni', shadeSig: false, commentMagnitude: false, figFrame: false,
    sigLabel: 'stars', seriesStyle: 'colour', lineWeight: 'normal', errBars: 'both', gridStyle: 'solid', yTicks: 'normal',
    tableFontSize: '10', tableCapAlign: 'justify', tableWidth: '100', footExtra: '', rmLmm: false, rmTrend: false, rmImpute: 'none', panelStyle: 'classic', axisSize: 'normal', titleSize: 'normal', valueSize: 'normal', boxMeanVal: false, figHeat: false, figForestAll: false, figPanels: false, capAbove: false, commentTpl: false, tplSig: '{Variable} differed significantly {groups} (P value {P}), being highest in {highest}.', tplNs: '{Variable} did not differ significantly {groups} (P value {P}).', varyWording: false, commentTone: 'standard', trendWord: false, nsCI: false, comMaxWords: '', boldSigText: false, phraseDict: '', keyFindings: false, absMaxWords: '', effConv: 'cohen', figRef: false, commentMerge: 'table', catLayout: 'merged', baselineNoP: false, postLetters: false, nCol: false, missCol: false, effectShow: 'all', tableGroupOrder: '', pColor: 'none', tableFont: 'same', decAlign: false, splitRows: '0', catTotal: false, confLevel: '95', alternative: 'two', npEffect: 'hl', effSize: 'auto', fdr: false, cltRule: false, exactSmall: false, ffh: false, groupTrend: false, completeCase: false, autoAbbr: false, labelLang: 'en', pageSize: 'a4', pageMargin: 'normal', lineSpacing: '1.5', pageNum: 'center', listTF: false, headerText: '', errColor: 'black', tableHead: 'auto', tableBands: false, firstColLeft: false, tablePad: 'normal', catFormat: 'npct',
    customColors: ['#7B2FBE', '#1C1648', '#B57EDC', '#E08A2E', '#2E9E8F', '#C2185B']
  };
  // option key → [element id, checkbox?]
  const OPTION_FIELDS = {
    decimals: ['optDec'], alpha: ['optAlpha'], chartStyle: ['optChart'], palette: ['optPal'], commentStyle: ['optComment'],
    tableStyle: ['optTable'], font: ['optFont'], effect: ['optEffect', true], within: ['optWithin', true], fisher: ['optFisher', true],
    branding: ['optBrand', true], notSig: ['optNotSig', true], unitsInText: ['optUnitsInText', true], correlation: ['optCorr', true], corrWhich: ['optCorrWhich'], corrN: ['optCorrN'], corrFit: ['optCorrFit'], corrNote: ['optCorrNote'], corrPt: ['optCorrPt'], corrGroup: ['optCorrGroup', true], corrZero: ['optCorrZero', true], corrHeat: ['optCorrHeat', true], sigMarks: ['optSigMarks', true], points: ['optPoints', true],
    figures: ['optFigures'], errorBar: ['optErrorBar'], figWidth: ['optFigWidth'], figPerRow: ['optFigPerRow'], valueLabels: ['optValueLabels', true],
    chartText: ['optChartText'], chartAspect: ['optAspect'], barFill: ['optBarFill'], yAxis: ['optYAxis'], legendPos: ['optLegend'], chartRes: ['optRes'],
    gridlines: ['optGrid', true], axisArrows: ['optArrows', true], nLabels: ['optNLabels', true],
    legendSize: ['optLegendSize'], legendTitle: ['optLegendTitle'], legendFrame: ['optLegendFrame', true],
    normality: ['optNormality'], catEffect: ['optCatEffect'], welch: ['optWelch', true],
    figPlacement: ['optFigPlacement'], captionStyle: ['optCaptionStyle'], chartTitle: ['optChartTitle', true],
    pctDecimals: ['optPctDec'], meanStyle: ['optMeanStyle'], iqrStyle: ['optIqrStyle'], secondRow: ['optSecondRow'], pDigits: ['optPDigits'], pHead: ['optPHead'],
    sigSym: ['optSigSym'], showStat: ['optShowStat', true], missingNote: ['optMissingNote', true], orientation: ['optOrientation'], tableCaption: ['optTableCaption'],
    pWord: ['optPWord'], commentPlace: ['optCommentPlace'], commentEffect: ['optCommentEffect', true], summary: ['optSummary', true], barWidth: ['optBarWidth'], boxMean: ['optBoxMean', true], dunn: ['optDunn', true], chiPost: ['optChiPost', true], mixed: ['optMixed', true],
    pLead: ['optPLead'], totalCol: ['optTotalCol', true], nHead: ['optNHead', true], boldSig: ['optBoldSig', true], figNotes: ['optFigNotes', true], chartFont: ['optChartFont'], testNote: ['optTestNote'], tableNewPage: ['optTableNewPage', true],
    rmPost: ['optRmPost'], rmAdjust: ['optRmAdjust'], rmSph: ['optRmSph'], rmChange: ['optRmChange'], rmPostAlways: ['optRmPostAlways', true], rmAuc: ['optRmAuc', true], rmIndividual: ['optRmIndividual', true],
    mwAdjust: ['optMwAdjust'], chiAdjust: ['optChiAdjust'], shadeSig: ['optShadeSig', true], commentMagnitude: ['optCommentMagnitude', true], figFrame: ['optFigFrame', true],
    sigLabel: ['optSigLabel'], seriesStyle: ['optSeriesStyle'], lineWeight: ['optLineWeight'], errBars: ['optErrBars'], gridStyle: ['optGridStyle'], yTicks: ['optYTicks'],
    tableFontSize: ['optTableFontSize'], tableCapAlign: ['optTableCapAlign'], tableWidth: ['optTableWidth'], footExtra: ['optFootExtra'], rmLmm: ['optRmLmm', true], panelStyle: ['optPanelStyle'], axisSize: ['optAxisSize'], titleSize: ['optTitleSize'], valueSize: ['optValueSize'], boxMeanVal: ['optBoxMeanVal', true], figHeat: ['optFigHeat', true], figForestAll: ['optFigForestAll', true], figPanels: ['optFigPanels', true], capAbove: ['optCapAbove', true], commentTpl: ['optCommentTpl', true], tplSig: ['optTplSig'], tplNs: ['optTplNs'], varyWording: ['optVaryWording', true], commentTone: ['optCommentTone'], trendWord: ['optTrendWord', true], nsCI: ['optNsCI', true], comMaxWords: ['optComMaxWords'], boldSigText: ['optBoldSigText', true], phraseDict: ['optPhraseDict'], keyFindings: ['optKeyFindings', true], absMaxWords: ['optAbsMaxWords'], effConv: ['optEffConv'], figRef: ['optFigRef', true], commentMerge: ['optCommentMerge'], catLayout: ['optCatLayout'], baselineNoP: ['optBaselineNoP', true], postLetters: ['optPostLetters', true], nCol: ['optNCol', true], missCol: ['optMissCol', true], effectShow: ['optEffectShow'], tableGroupOrder: ['optTableGroupOrder'], pColor: ['optPColor'], tableFont: ['optTableFont'], decAlign: ['optDecAlign', true], splitRows: ['optSplitRows'], catTotal: ['optCatTotal', true], confLevel: ['optConfLevel'], alternative: ['optAlternative'], npEffect: ['optNpEffect'], effSize: ['optEffSize'], fdr: ['optFdr', true], cltRule: ['optCltRule', true], exactSmall: ['optExactSmall', true], ffh: ['optFfh', true], groupTrend: ['optGroupTrend', true], completeCase: ['optCompleteCase', true], rmTrend: ['optRmTrend', true], rmImpute: ['optRmImpute'], autoAbbr: ['optAutoAbbr', true], labelLang: ['optLabelLang'], pageSize: ['optPageSize'], pageMargin: ['optPageMargin'], lineSpacing: ['optLineSpacing'], pageNum: ['optPageNum'], listTF: ['optListTF', true], headerText: ['optHeaderText'], errColor: ['optErrColor'], tableHead: ['optTableHead'], tableBands: ['optTableBands', true], firstColLeft: ['optFirstColLeft', true], tablePad: ['optTablePad'], catFormat: ['optCatFormat']
  };
  const defaultOptions = () => ({ ...DEFAULT_OPTIONS, customColors: [...DEFAULT_OPTIONS.customColors] });
  // chart palette and drawing style from the options
  const chartPalette = o => o.palette === 'custom' ? o.customColors : o.palette;
  const chartStyle = o => ({ text: o.chartText, aspect: o.chartAspect, barFill: o.barFill, yAxis: o.yAxis, legend: o.legendPos, res: o.chartRes, grid: o.gridlines, arrows: o.axisArrows,
    legendSize: o.legendSize, legendTitle: o.legendTitle.trim(), legendFrame: o.legendFrame, barWidth: o.barWidth, boxMean: o.boxMean, font: o.chartFont, frame: o.figFrame,
    sigLabel: o.sigLabel, panel: o.panelStyle === 'classic' ? '' : o.panelStyle, axisSize: o.axisSize, titleSize: o.titleSize, valueSize: o.valueSize, boxMeanVal: !!o.boxMeanVal, series: o.seriesStyle, lineWeight: o.lineWeight, errBars: o.errBars, errColor: o.errColor, gridStyle: o.gridStyle, ticks: o.yTicks, pLead: +o.pLead !== 0 });

  const state = { file: null, wb: null, sheet: null, data: null, cfg: null, result: null, step: 1, edits: {} };

  /* ---------- helpers ---------- */
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
  const busy = on => $('#busy').classList.toggle('show', on);
  // "Month 3", "Week 12", "6 months" stay one token, so they read as timepoints
  const GLUED = new Map(); // glued token → how the sheet wrote it ("Month3" → "Month 3"), for its label
  const glue = (m, a, b) => { GLUED.set(a + b, `${a} ${b}`); return a + b; };
  const lowerFirstApp = t => /^[A-Z][a-z]/.test(t) ? t[0].toLowerCase() + t.slice(1) : t;
  const tokens = name => String(name).trim().replace(/(?<![A-Za-z])(month|mo|week|wk|day|visit|year|yr|hour|hr|session)\s+(\d+)(?![\d.])/gi, glue)
    .replace(/(?<![\d.])(\d+)\s+(months?|weeks?|days?|years?|hours?|hrs?|mins?)(?![A-Za-z])/gi, glue).split(/[_\s.]+/).filter(Boolean);
  function labelFrom(toks) {
    const words = [], units = [];
    toks.forEach((t, i) => {
      const prevUnit = i > 0 && units.length && (UNIT_RE.test(toks[i - 1]) || PER_RE.test(toks[i - 1]) && units.length);
      if (prevUnit && PER_RE.test(t) && units[units.length - 1].split('/').length < 2) units[units.length - 1] += '/' + fixCase(t);
      else if (UNIT_RE.test(t)) units.push(t);
      else words.push(t);
    });
    // the first token is a name, never a unit ("PCT_ng_mL" → "PCT (ng/mL)")
    if (!words.length && units.length) words.push(units.shift());
    let s = words.join(' ');
    if (units.length) s += ` (${units.join(', ')})`;
    return s || toks.join(' ');
  }
  const tpLabel = tp => /^(baseline|base|bl)$/i.test(tp) ? 'Baseline' : /^(pre|post|before|after|final|end)$/i.test(tp) ? tp[0].toUpperCase() + tp.slice(1)
    : GLUED.get(tp) || tp; // "Month 3" as the sheet wrote it

  /* ---------- stepper ---------- */
  function renderStepper() {
    $('#stepper').innerHTML = STEPS.map(([l, s], i) => {
      const n = i + 1, cls = n === state.step ? 'active' : n < state.step ? 'done' : '';
      const dis = !state.data && n > 1 ? 'disabled' : '';
      return `<div class="step ${cls} ${dis}" data-go="${n}"><div class="num">${n < state.step ? '✓' : n}</div><div><div class="lbl">${l}</div><div class="sub">${s}</div></div></div>`;
    }).join('');
  }
  function go(n) {
    if (n > 1 && !state.data) return;
    readUiIntoCfg();
    state.step = n;
    document.querySelectorAll('.panel').forEach((p, i) => p.classList.toggle('active', i + 1 === n));
    renderStepper();
    if (n === 2) renderVariables();
    if (n === 1) renderMessyTasks();
    if (n === 3) renderTimepoints();
    if (n >= 4 && n <= 8) renderOptions();
    if (n === 7) { renderFigureTable(); renderFigDesign(); }
    if (n === 4) renderTestPlan();
    if (n === 6) renderCommentPreview();
    if (n === 5) { renderTableTools(); renderTablePreview(); }
    if (n === 8) renderAdvanced();
    if (n === 9) renderConsortForm();
    if (n === 10) renderExplore();
    if (n === 11) runAnalysis();
    $('#presetBar').style.display = n >= 4 ? '' : 'none';
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  document.addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) go(+g.dataset.go); });

  /* ---------- step 1: file ---------- */
  const drop = $('#drop');
  drop.onclick = () => $('#file').click();
  drop.ondragover = e => { e.preventDefault(); drop.classList.add('over'); };
  drop.ondragleave = () => drop.classList.remove('over');
  drop.ondrop = e => { e.preventDefault(); drop.classList.remove('over'); if (e.dataTransfer.files[0]) loadFile(e.dataTransfer.files[0]); };
  $('#file').onchange = e => e.target.files[0] && loadFile(e.target.files[0]);

  async function loadFile(f) {
    try {
      busy(true);
      const buf = await f.arrayBuffer();
      state.messy = null; state.savMeta = null;
      if (/\.z?sav$/i.test(f.name)) {
        // SPSS: the data with its variable labels, value labels and missing values
        const sv = await Sav.readAny(buf), wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([sv.headers, ...sv.rows.map(r => sv.headers.map(h => r[h]))]), 'Data');
        state.savMeta = sv; state.pendingCfg = null;
        openWorkbook(wb, f.name);
        toast(`SPSS file: ${sv.rows.length} cases, ${sv.headers.length} variables, ${Object.keys(sv.varLabels).length} variable labels and ${Object.keys(sv.valueLabels).length} value-label sets read`);
        return;
      }
      if (/\.(csv|txt|tsv)$/i.test(f.name)) { openCsv(buf, f.name); return; }
      openWorkbook(XLSX.read(buf, { type: 'array' }), f.name);
    } catch (err) { console.error(err); toast('Could not read this file: ' + err.message); }
    finally { busy(false); }
  }
  /* ---------- CSV / text files: encoding, separator and decimal mark, with a preview ---------- */
  let csvBuf = null, csvName = '';
  function parseDelimited(text, sep, decMark) {
    const lines = text.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
    if (sep === 'auto') { const first = lines.split('\n').slice(0, 5).join('\n'); sep = ['\t', ';', ',', '|'].map(s => [s, (first.match(new RegExp(s === '|' ? '\\|' : s, 'g')) || []).length]).sort((a, b) => b[1] - a[1])[0][0]; }
    const rows = []; let row = [], cell = '', q = false;
    for (let i = 0; i < lines.length; i++) {
      const ch = lines[i];
      if (q) { if (ch === '"') { if (lines[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; continue; }
      if (ch === '"' && cell === '') q = true;
      else if (ch === sep) { row.push(cell); cell = ''; }
      else if (ch === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else cell += ch;
    }
    if (cell !== '' || row.length) { row.push(cell); rows.push(row); }
    const body = rows.filter(r => r.some(c => c.trim() !== ''));
    if (decMark === 'auto') { const s = body.slice(1, 50).flat().join(' '); decMark = (s.match(/\d,\d{1,2}(?!\d)/g) || []).length > (s.match(/\d\.\d/g) || []).length && sep !== ',' ? ',' : '.'; }
    const num = c => { const t = c.trim(); if (t === '') return null;
      const n = decMark === ',' ? t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.') : t.replace(/,(?=\d{3}(\D|$))/g, '');
      return /^[-+]?\d*\.?\d+(e[-+]?\d+)?$/i.test(n) ? Number(n) : t; };
    return { sep, decMark, aoa: body.map((r, i) => i === 0 ? r.map(c => c.trim()) : r.map(num)) };
  }
  function csvPreview() {
    let text; try { text = new TextDecoder($('#csvEnc').value).decode(csvBuf); } catch (e) { text = new TextDecoder().decode(csvBuf); }
    const p = parseDelimited(text, $('#csvSep').value, $('#csvDec').value), a = p.aoa;
    $('#csvPrev').innerHTML = a.length ? `<thead><tr>${a[0].map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${a.slice(1, 7).map(r => `<tr>${r.map(c => `<td>${esc(c ?? '')}</td>`).join('')}</tr>`).join('')}</tbody>` : '';
    $('#csvInfo').textContent = `${Math.max(0, a.length - 1)} rows × ${a[0] ? a[0].length : 0} columns · separator ${p.sep === '\t' ? 'tab' : `“${p.sep}”`} · decimal mark “${p.decMark}”`;
    return a;
  }
  function openCsv(buf, name) {
    csvBuf = buf; csvName = name;
    const u = new Uint8Array(buf.slice(0, 2)); $('#csvEnc').value = u[0] === 0xFF && u[1] === 0xFE ? 'utf-16le' : 'utf-8';
    try { new TextDecoder('utf-8', { fatal: true }).decode(buf); } catch (e) { if ($('#csvEnc').value === 'utf-8') $('#csvEnc').value = 'windows-1256'; }
    $('#csvSep').value = 'auto'; $('#csvDec').value = 'auto'; csvPreview(); $('#csvDlg').showModal();
  }
  ['#csvEnc', '#csvSep', '#csvDec'].forEach(id => { $(id).onchange = csvPreview; });
  $('#csvCancel').onclick = () => $('#csvDlg').close();
  $('#csvGo').onclick = () => { const a = csvPreview(); $('#csvDlg').close(); const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(a), 'Data'); state.pendingCfg = null; openWorkbook(wb, csvName); };
  function openWorkbook(wb, name) {
    state.wb = wb; state.file = name; state.hdr = { row: 1, two: false, auto: true }; state.cleanLog = [{ time: new Date().toLocaleString(), what: `Opened ${name}` }]; state.snapshots = []; if (state.grid) { state.grid.cf = {}; state.grid.rowsOnly = null; }
    $('#fileName').textContent = name;
    $('#sheetSel').innerHTML = wb.SheetNames.map(s => `<option>${esc(s)}</option>`).join('');
    $('#sheetBox').style.display = '';
    selectSheet(wb.SheetNames[0]);
  }
  // paste cells copied from Excel (tab-separated) or comma-separated text
  $('#btnPaste').onclick = () => { $('#pasteText').value = ''; $('#pasteInfo').textContent = ''; $('#pasteDlg').showModal(); $('#pasteText').focus(); };
  $('#pasteCancel').onclick = () => $('#pasteDlg').close();
  $('#pasteText').oninput = () => { const t = $('#pasteText').value.trim(); const lines = t ? t.split(/\r?\n/).filter(l => l.trim()) : [];
    $('#pasteInfo').textContent = lines.length ? `${lines.length - 1} rows × ${lines[0].split(lines[0].includes('\t') ? '\t' : ',').length} columns` : ''; };
  $('#pasteGo').onclick = () => {
    const t = $('#pasteText').value.replace(/\r/g, '').trim(); if (!t) return;
    if (state.data && !confirm('Replace the current data with the pasted cells?')) return;
    const sep = t.split('\n')[0].includes('\t') ? '\t' : t.split('\n')[0].includes(';') && !t.split('\n')[0].includes(',') ? ';' : ',';
    const aoa = t.split('\n').filter(l => l.trim()).map(l => l.split(sep).map(c => { c = c.trim().replace(/^"(.*)"$/, '$1'); return c === '' ? null : parseCell(c); }));
    const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(aoa), 'Pasted');
    state.pendingCfg = null; state.messy = null; $('#pasteDlg').close();
    openWorkbook(wb, 'Pasted data');
  };
  // an empty sheet laid out the way the app reads it, with a guide
  $('#btnTemplate').onclick = () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['ID', 'Group', 'Age', 'Sex', 'BMI', 'Diabetes', 'VAS_Baseline', 'VAS_W1', 'VAS_M3', 'VAS_M6', 'Complications']]), 'Data');
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['How to fill the Data sheet'], [],
      ['1', 'One row per patient, one column per variable. Keep the column names in the first row.'],
      ['2', 'Group: the study arm of each patient (e.g. A / B, or Drug / Placebo). Leave it out for a one-group study.'],
      ['3', 'Numbers as numbers (54, not "54 years"); use a dot or a comma for decimals.'],
      ['4', 'Categories as words (Male / Female, Yes / No) or codes (1 / 2) — codes can be labelled in step 2 (1=Male, 2=Female).'],
      ['5', 'Repeated measures: one column per timepoint with the timepoint in the name, e.g. VAS_Baseline, VAS_W1, VAS_M3.'],
      ['6', 'Leave missing values empty (or use one code such as 999 and blank it in step 1 → Prepare the data).'],
      ['7', 'No merged cells, totals or notes below the data. Rename, add or delete columns as you need.']]), 'Guide');
    XLSX.writeFile(wb, 'Easy Stat template.xlsx');
  };
  $('#sheetSel').onchange = e => { state.hdr = { row: 1, two: false, auto: true }; selectSheet(e.target.value); };
  $('#hdrRow').onchange = e => { if (!state.wb) return; state.hdr.row = +e.target.value; state.pendingCfg = null; selectSheet(state.sheet); };
  $('#hdrTwo').onchange = e => { if (!state.wb) { e.target.checked = false; toast('Open the Excel file again to change its header rows'); return; } state.hdr.two = e.target.checked; state.pendingCfg = null; selectSheet(state.sheet); };

  /* ---------- software statement presets (first sentence of Statistical Analysis) ---------- */
  const SOFTWARE = [
    ['IBM SPSS Statistics', 'Statistical analysis was performed using IBM SPSS Statistics, version 28.0 (IBM Corp., Armonk, NY, USA).'],
    ['Prof MSE Easy Stat', 'Statistical analysis was done by Prof MSE Easy Stat v1.0.'],
    ['R', 'Statistical analysis was performed using R software, version 4.4 (R Foundation for Statistical Computing, Vienna, Austria).'],
    ['Stata', 'Statistical analysis was performed using Stata, version 18 (StataCorp LLC, College Station, TX, USA).'],
    ['GraphPad Prism', 'Statistical analysis was performed using GraphPad Prism, version 10 (GraphPad Software, Boston, MA, USA).'],
    ['SAS', 'Statistical analysis was performed using SAS, version 9.4 (SAS Institute Inc., Cary, NC, USA).'],
    ['MedCalc', 'Statistical analysis was performed using MedCalc Statistical Software, version 22 (MedCalc Software Ltd, Ostend, Belgium).'],
    ['JASP', 'Statistical analysis was performed using JASP, version 0.18 (JASP Team, University of Amsterdam, Amsterdam, the Netherlands).'],
    ['jamovi', 'Statistical analysis was performed using jamovi, version 2.5 (The jamovi project, Sydney, Australia).'],
    ['Python', 'Statistical analysis was performed using Python, version 3.12 (Python Software Foundation, Wilmington, DE, USA), with the SciPy and statsmodels libraries.'],
    ['Minitab', 'Statistical analysis was performed using Minitab, version 21 (Minitab LLC, State College, PA, USA).'],
    ['Epi Info', 'Statistical analysis was performed using Epi Info, version 7.2 (Centers for Disease Control and Prevention, Atlanta, GA, USA).'],
    ['Microsoft Excel', 'Statistical analysis was performed using Microsoft Excel 365 (Microsoft Corp., Redmond, WA, USA).'],
    ['Excel + SPSS', 'Data were collected and coded in Microsoft Excel (Microsoft Corp., Redmond, WA, USA) and analyzed using IBM SPSS Statistics, version 28.0 (IBM Corp., Armonk, NY, USA).']
  ];
  $('#softwarePreset').innerHTML = '<option value="">— choose a template —</option>' + SOFTWARE.map(([n], i) => `<option value="${i}">${esc(n)}</option>`).join('');
  $('#software').value = SOFTWARE[0][1]; $('#softwarePreset').value = '0';
  $('#softwarePreset').onchange = e => {
    if (e.target.value === '') return;
    $('#software').value = SOFTWARE[+e.target.value][1];
    if (state.cfg) state.cfg.study.software = $('#software').value;
    toast('Software statement set — edit the version number if needed');
  };

  /* ---------- example datasets ---------- */
  const exampleBook = ex => { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ex.rows()), 'Data'); return wb; };
  $('#examples').innerHTML = Examples.LIST.map(ex => `<div class="excard"><h4>${esc(ex.name)}</h4><p>${esc(ex.description)}</p>
    <div class="row"><button class="btn primary small" data-exopen="${ex.id}" type="button">Open example</button><button class="btn ghost small" data-exsave="${ex.id}" type="button">⬇ Excel file</button></div></div>`).join('');
  // messy datasets: open one with its cleaning checklist, or download it as Excel
  $('#messyList').innerHTML = Examples.MESSY.map(ex => `<div class="excard"><h4>${esc(ex.name)} <span class="chip ${ex.level === 'Beginner' ? 'ok' : ex.level === 'Advanced' ? 'warn' : 'info'}">${ex.level}</span></h4><p>${esc(ex.description)}</p>
    <div class="row"><button class="btn primary small" data-mopen="${ex.id}" type="button">Open and clean</button><button class="btn ghost small" data-msave="${ex.id}" type="button">⬇ Excel file</button><span class="legend-note">${ex.tasks.length} tasks</span></div></div>`).join('');
  $('#messyList').addEventListener('click', e => {
    const o = e.target.closest('[data-mopen]'), d = e.target.closest('[data-msave]');
    if (d) { const ex = Examples.getMessy(d.dataset.msave); XLSX.writeFile(ex.book(XLSX), ex.id + '.xlsx'); return; }
    if (!o) return;
    if (state.data && !confirm('Open this messy dataset? The current data and settings are replaced.')) return;
    const ex = Examples.getMessy(o.dataset.mopen);
    state.pendingCfg = null; $('#studyTitle').value = '';
    openWorkbook(ex.book(XLSX), ex.id + '.xlsx');
    state.messy = ex.id; $('#prepBox').open = true; renderMessyTasks();
    $('#messyTasks').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  // the checklist of the open messy dataset, checked against the sheet and the setup each time they change
  function renderMessyTasks() {
    const box = $('#messyTasks'), ex = state.messy && Examples.getMessy(state.messy);
    if (!ex || !state.data) { box.style.display = 'none'; return; }
    const done = ex.tasks.map(t => { try { return !!t.done(state.data, state.cfg, Analysis); } catch (err) { return false; } }), n = done.filter(Boolean).length;
    box.style.display = '';
    box.innerHTML = `<div class="row"><b>🧹 ${esc(ex.name)}</b><span class="spacer"></span><progress max="${ex.tasks.length}" value="${n}"></progress> <b>${n} of ${ex.tasks.length}</b>
      <button class="btn ghost small" id="messyClose" type="button" title="Hide the checklist">✕</button></div>
      ${n === ex.tasks.length ? '<p style="margin:6px 0;color:var(--ok);font-weight:600">🎉 All clean! Continue to step 2 to set up the analysis.</p>' : ''}
      ${ex.tasks.map((t, i) => `<div class="mt ${done[i] ? 'done' : ''}"><span class="${done[i] ? 'ok' : 'no'}">${done[i] ? '✓' : '○'}</span><span><span class="t">${esc(t.text)}</span>${done[i] ? '' : `<br><span class="h">How: ${esc(t.hint)}</span>`}</span></div>`).join('')}`;
    $('#messyClose').onclick = () => { state.messy = null; renderMessyTasks(); };
  }
  $('#examples').addEventListener('click', e => {
    const o = e.target.closest('[data-exopen]'), d = e.target.closest('[data-exsave]');
    if (d) { const ex = Examples.get(d.dataset.exsave); XLSX.writeFile(exampleBook(ex), ex.id + '.xlsx'); return; }
    if (!o) return;
    const ex = Examples.get(o.dataset.exopen);
    state.wb = exampleBook(ex); state.file = ex.id + '.xlsx'; state.pendingCfg = null; state.messy = null; state.hdr = { row: 1, two: false, auto: true };
    $('#fileName').textContent = state.file + ' (example)';
    $('#sheetSel').innerHTML = '<option>Data</option>'; $('#sheetBox').style.display = '';
    $('#studyTitle').value = ex.title;
    selectSheet('Data');
    // the example's suggested options and advanced analyses
    if (ex.noGroups) setNoGroups(state.cfg, true);
    Object.assign(state.cfg.options, ex.options || {});
    for (const [col, lv] of Object.entries(ex.levels || {})) {
      const v = state.cfg.variables.find(x => x.kind === 'single' && x.cols[0].col === col);
      if (v) v.levels = [...lv];
    }
    // the example's flowchart: type, exclusions, losses (added on top of the analysed patients in the sheet)
    if (ex.flow) {
      const f = typeof ex.flow === 'function' ? ex.flow(state.data.rows) : ex.flow, c = ensureConsort();
      c.type = f.type || 'consort';
      if (f.excluded) c.excluded = f.excluded.map(e => ({ ...e }));
      (f.groups || []).forEach((g, i) => {
        const cg = c.groups[i]; if (!cg) return;
        Object.assign(cg, g);
        cg.allocated = cg.analysed + (+cg.lost || 0) + (+cg.excludedAnalysis || 0);
      });
      if (f.stard) c.stard = JSON.parse(JSON.stringify(f.stard));
      if (f.steps) c.steps = f.steps.map(x => ({ ...x }));
      if (f.splitGroups !== undefined) c.splitGroups = f.splitGroups;
      syncAssessed(c);
    }
    state.cfg.advanced = (ex.advanced || []).filter(a => [a.outcome, a.event, ...(a.predictors || [])].filter(Boolean).every(c => state.data.headers.includes(c)))
      .map(a => ({ positive: '', predictors: [], univariable: false, include: true, ...a }));
    toast(`Example loaded: ${ex.name}${state.cfg.advanced.length ? ' — with suggested advanced analyses in step 8' : ''}`);
  });

  function selectSheet(name) {
    const ws = state.wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, blankrows: true });
    let lead = 0; // empty rows above the data
    while (aoa.length && !aoa[0].some(v => v !== null && String(v).trim() !== '')) { aoa.shift(); lead++; }
    if (!aoa.length) { toast('This sheet is empty'); return; }
    // the header: the chosen row (title rows above it are skipped), optionally joined with a second row ("VAS" above "Baseline" → VAS_Baseline)
    const hdr = state.hdr || (state.hdr = { row: 1, two: false, auto: true });
    const r0 = XLSX.utils.decode_range(ws['!ref'] || 'A1').s, filled = r => r.filter(v => v !== null && String(v).trim() !== '').length;
    if (hdr.auto) {
      // found by itself: the first row filled across most of the columns (title and note rows above it are skipped),
      // and two header rows when that row has a title merged across columns ("VAS" over Baseline / W1 / M3)
      const wmax = Math.max(...aoa.slice(0, 30).map(filled));
      hdr.row = 1 + Math.max(0, aoa.slice(0, 20).findIndex(r => filled(r) >= Math.max(2, 0.6 * wmax)));
      hdr.two = (ws['!merges'] || []).some(m => m.s.r === r0.r + lead + hdr.row - 1 && m.e.c > m.s.c && m.e.r === m.s.r) && !!aoa[hdr.row];
      hdr.auto = false;
      if (hdr.row > 1 || hdr.two) setTimeout(() => toast(`Column names found in row ${hdr.row}${hdr.two ? ` and ${hdr.row + 1} (two header rows)` : ''} — change it in “Prepare the data” if needed`), 600);
    }
    const hr = Math.min(hdr.row, aoa.length) - 1;
    $('#hdrRow').innerHTML = Array.from({ length: Math.min(20, aoa.length) }, (_, i) => `<option value="${i + 1}" ${i === hr ? 'selected' : ''}>${i + 1}${i ? '' : ' (first row)'}</option>`).join('');
    $('#hdrTwo').checked = hdr.two;
    const cell = v => v === null || v === undefined ? '' : String(v).trim();
    const width = Math.max(...aoa.map(r => r.length));
    let names = Array.from({ length: width }, (_, i) => cell(aoa[hr][i]));
    if (hdr.two && aoa[hr + 1]) {
      // a title merged across several columns names each of them (from the sheet's merged cells)
      const top = [...names];
      (ws['!merges'] || []).forEach(m => { if (m.s.r === r0.r + lead + hr) for (let c = m.s.c + 1; c <= m.e.c; c++) if (!top[c - r0.c]) top[c - r0.c] = top[m.s.c - r0.c]; });
      names = names.map((_, i) => { const a = top[i], b = cell(aoa[hr + 1][i]); return a && b && a !== b ? `${a}_${b}` : a || b; });
    }
    const seen = {};
    const headers = names.map((h, i) => { let n = h || `Column_${i + 1}`; if (seen[n]) n = `${n}_${++seen[n]}`; else seen[n] = 1; return n; });
    const rows = aoa.slice(hr + (hdr.two ? 2 : 1)).filter(r => r.some(v => v !== null && String(v).trim() !== ''))
      .map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? null])));
    state.sheet = name;
    state.data = { headers, rows };
    state.undo = []; state.redo = []; state.grid.page = 0; state.grid.sort = null;
    const prevCfg = state.pendingCfg;
    state.cfg = detect(state.data);
    if (prevCfg) applySavedCfg(prevCfg);
    if (state.savMeta) applySavMeta(state.cfg, state.savMeta);
    renderGrid();
    $('#to2').disabled = false;
    renderStepper(); renderPrep();
    toast(`Loaded ${rows.length} patients · ${state.cfg.variables.length} variables detected`);
  }
  $('#to2').onclick = () => go(2);

  /* ---------- data grid: preview options, editing and rearranging the sheet ---------- */
  state.grid = { page: 0, per: 10, q: '', onlyMissing: false, hlMissing: true, summary: false, edit: false, sort: null, density: 'normal', hidden: [], types: true, wrap: false, freeze: false, stripes: true, outliers: false };
  const isMissing = v => v === null || v === undefined || String(v).trim() === '';
  const parseCell = t => { t = t.replace(/\u00a0/g, ' ').trim(); if (t === '') return null; const n = Number(t.replace(',', '.')); return isFinite(n) && /^[-+]?[\d.,]+(e[-+]?\d+)?$/i.test(t) ? n : t; };
  function renderGrid() {
    const g = state.grid, { headers: allHeaders, rows } = state.data;
    const kinds = Object.fromEntries(allHeaders.map(h => [h, columnInfo(rows, h).numeric ? 'num' : 'text']));
    g.hidden = g.hidden.filter(h => allHeaders.includes(h));
    const headers = allHeaders.filter(h => !g.hidden.includes(h));
    $('#gridCols').innerHTML = allHeaders.map(h => `<label><input type="checkbox" data-gcol="${esc(h)}"${g.hidden.includes(h) ? '' : ' checked'}>${esc(h)} <span class="legend-note">${kinds[h] === 'num' ? 'numeric' : 'text'}</span></label>`).join('');
    $('#gridColCount').textContent = g.hidden.length ? `(${headers.length} of ${allHeaders.length})` : '';
    const tbl = $('#preview');
    ['compact', 'comfy'].forEach(d => tbl.classList.toggle(d, g.density === d));
    tbl.classList.toggle('wrap', g.wrap); tbl.classList.toggle('freeze', g.freeze); tbl.classList.toggle('stripes', g.stripes);
    const cc = (h, ci) => [kinds[h] === 'num' ? 'num' : '', ci === 0 ? 'c1' : ''].filter(Boolean).join(' ');
    const typeTag = h => g.types ? `<span class="ty" title="${kinds[h] === 'num' ? 'Numeric' : 'Text / categories'}">${kinds[h] === 'num' ? '123' : 'abc'}</span>` : '';
    $('#dims').textContent = `${rows.length} rows × ${headers.length} columns`;
    const q = g.q.trim().toLowerCase();
    // column filters of the column menus, and a set of rows (rule breaks, duplicates) to show alone
    g.cf = g.cf || {}; Object.keys(g.cf).forEach(h => { if (!allHeaders.includes(h)) delete g.cf[h]; });
    const cfPass = i => Object.entries(g.cf).every(([h, f]) => { const v = rows[i][h];
      if (f.vals) return f.vals.includes(isMissing(v) ? '(blank)' : String(v).trim());
      const n = Analysis.toNum(v); return isFinite(n) && (f.min === '' || f.min == null || n >= +f.min) && (f.max === '' || f.max == null || n <= +f.max); });
    const only = g.rowsOnly ? new Set(g.rowsOnly.rows) : null;
    const idx = rows.map((_, i) => i).filter(i => (!only || only.has(i)) && cfPass(i) && (!q || headers.some(h => String(rows[i][h] ?? '').toLowerCase().includes(q))) && (!g.onlyMissing || headers.some(h => isMissing(rows[i][h]))));
    const per = g.per === 'all' ? Math.max(1, idx.length) : +g.per, pages = Math.max(1, Math.ceil(idx.length / per));
    g.page = Math.min(g.page, pages - 1);
    const shown = idx.slice(g.page * per, g.page * per + per), cfg = state.cfg;
    // outliers: beyond 1.5 × IQR of the column (numeric columns)
    const fences = g.outliers ? Object.fromEntries(headers.filter(h => kinds[h] === 'num').map(h => [h, Analysis.outFence(rows.map(r => Analysis.toNum(r[h])).filter(isFinite), '1.5')])) : {};
    const isOut = (h, v) => { const f = fences[h], n = Analysis.toNum(v); return !!f && isFinite(n) && (n < f[0] || n > f[1]); };
    const role = h => !cfg ? '' : h === cfg.groupCol && !cfg.noGroups ? '<span class="chip info">group</span>' : cfg.idCols.includes(h) ? '<span class="chip">ID</span>' : '';
    const sortMark = h => g.sort && g.sort.col === h ? (g.sort.dir > 0 ? ' ▲' : ' ▼') : '';
    const head = headers.map((h, ci) => g.edit
      ? `<th class="${cc(h, ci)}"><div class="gh"><input type="text" data-hname="${esc(h)}" value="${esc(h)}" title="Rename column">
          <span class="gh-btns"><button data-hmove="${ci},-1" title="Move left" type="button">◀</button><button data-hmove="${ci},1" title="Move right" type="button">▶</button><button data-hsort="${esc(h)}" title="Sort rows" type="button">⇅</button><button data-hdel="${esc(h)}" title="Delete column" type="button">✕</button></span></div>${role(h)}</th>`
      : `<th data-hsort="${esc(h)}" class="sortable ${cc(h, ci)}${g.cf[h] ? ' filtered' : ''}" title="Click to sort the rows (Undo in edit mode restores the order)"${g.widths && g.widths[h] ? ` style="min-width:${g.widths[h]}px;max-width:${g.widths[h]}px"` : ''}>${esc(h)}${typeTag(h)}${sortMark(h)} ${role(h)}<span class="cm" data-cmenu="${esc(h)}" title="Chart, statistics and filter of this column">${g.cf[h] ? '⏷' : '▾'}</span><span class="rsz" data-rsz="${esc(h)}"></span></th>`).join('');
    let summary = '';
    if (g.summary) summary = `<tr class="gsum"><td class="rn">Summary</td>${headers.map((h, ci) => {
      const info = columnInfo(rows, h), miss = rows.length - info.n, nums = rows.map(r => Analysis.toNum(r[h])).filter(isFinite);
      const desc = info.numeric && nums.length ? `num · ${Analysis.fmt(Math.min(...nums), 2)}–${Analysis.fmt(Math.max(...nums), 2)}` : `text · ${info.distinct.length} values`;
      return `<td class="${ci === 0 ? 'c1' : ''}">${desc}<br><span class="${miss ? 'miss-n' : ''}">${miss} missing</span></td>`; }).join('')}</tr>`;
    const body = shown.map(i => `<tr><td class="rn">${i + 1}${g.edit ? `<span class="gr-btns"><button data-rmove="${i},-1" title="Move up" type="button">↑</button><button data-rmove="${i},1" title="Move down" type="button">↓</button><button data-rdel="${i}" title="Delete row" type="button">✕</button></span>` : ''}</td>${
      headers.map((h, ci) => `<td class="${cc(h, ci)}${g.hlMissing && isMissing(rows[i][h]) ? ' miss' : ''}${isOut(h, rows[i][h]) ? ' gout' : ''}" title="${esc(rows[i][h] ?? '')}"${g.edit ? ` contenteditable="true" data-cell="${i}" data-col="${esc(h)}"` : ''}>${esc(rows[i][h] ?? '')}</td>`).join('')}</tr>`).join('');
    $('#preview').innerHTML = `<thead><tr><th class="rn">#</th>${head}</tr></thead><tbody>${summary}${body || `<tr><td colspan="${headers.length + 1}" class="legend-note">No rows match.</td></tr>`}</tbody>`;
    const rn = tbl.querySelector('th.rn'); if (rn) tbl.style.setProperty('--rnw', rn.getBoundingClientRect().width + 'px');
    const notes = [Object.keys(g.cf).length ? `<span class="flt-chip chip warn">${Object.keys(g.cf).length} column filter${Object.keys(g.cf).length > 1 ? 's' : ''} <a href="#" data-cfclear="1">clear</a></span>` : '', g.rowsOnly ? `<span class="flt-chip chip warn">${esc(g.rowsOnly.label)} <a href="#" data-roclear="1">show all</a></span>` : ''].join(' ');
    $('#gridNotes').innerHTML = notes;
    $('#gridInfo').textContent = idx.length ? `Rows ${g.page * per + 1}–${Math.min(idx.length, g.page * per + per)} of ${idx.length}${idx.length < rows.length ? ` (filtered from ${rows.length})` : ''}` : '0 rows';
    $('#gridPrev').disabled = g.page === 0; $('#gridNext').disabled = g.page >= pages - 1;
    $('#gridEditBar').style.display = g.edit ? '' : 'none';
    $('#gridUndo').disabled = !state.undo.length; $('#gridRedo').disabled = !(state.redo && state.redo.length);
    $('#gridEdit').classList.toggle('primary', g.edit); $('#gridEdit').classList.toggle('ghost', !g.edit);
    $('#gridEdit').textContent = g.edit ? '✓ Done editing' : '✎ Edit sheet';
    renderOverview(kinds); renderMessyTasks();
  }
  // a line of facts about the sheet: patients, column types, missing cells, duplicate IDs, empty or constant columns, the filter
  function renderOverview(kinds) {
    const { headers, rows } = state.data, cfg = state.cfg, nNum = headers.filter(h => kinds[h] === 'num').length;
    const miss = rows.reduce((a, r) => a + headers.filter(h => isMissing(r[h])).length, 0), cells = rows.length * headers.length;
    const empty = headers.filter(h => rows.every(r => isMissing(r[h]))), constant = headers.filter(h => { const d = new Set(rows.map(r => r[h]).filter(v => !isMissing(v)).map(String)); return d.size === 1 && rows.length > 1; });
    const id = cfg && cfg.idCols[0], ids = id ? rows.map(r => r[id]).filter(v => !isMissing(v)).map(String) : [], dup = ids.length - new Set(ids).size;
    const kept = cfg ? Analysis.filterRows(cfg, rows).length : rows.length;
    const chip = (cls, t, tip = '') => `<span class="chip ${cls}" ${tip ? `title="${esc(tip)}"` : ''}>${t}</span>`;
    $('#dataOverview').innerHTML = [chip('info', `${rows.length} patients`), chip('info', `${nNum} numeric · ${headers.length - nNum} text columns`),
      chip(miss ? 'warn' : 'ok', cells ? `${(100 * miss / cells).toFixed(1)}% cells missing` : 'no cells'),
      id ? chip(dup ? 'warn' : 'ok', dup ? `${dup} duplicate ${esc(id)}` : `${esc(id)} unique`) : '',
      empty.length ? chip('warn', `${empty.length} empty column${empty.length > 1 ? 's' : ''}`, empty.join(', ')) : '',
      constant.length ? chip('warn', `${constant.length} column${constant.length > 1 ? 's' : ''} with one value`, constant.join(', ')) : '',
      kept < rows.length ? chip('warn', `Filter: ${kept} of ${rows.length} analysed`) : ''].join('');
  }
  /* ---------- step 1: prepare the data (missing codes, row filter, combining files) ---------- */
  function renderPrep() {
    const cfg = state.cfg, h = state.data.headers;
    $('#mergeKey').innerHTML = h.map(c => `<option ${cfg && cfg.idCols[0] === c ? 'selected' : ''}>${esc(c)}</option>`).join('');
    const others = state.wb ? state.wb.SheetNames.filter(n => n !== state.sheet) : [];
    $('#mergeSheet').innerHTML = others.map(n => `<option>${esc(n)}</option>`).join('');
    $('#mergeSheetBox').style.display = $('#mergeSheetGo').style.display = others.length ? '' : 'none';
    $('#stackSheets').style.display = others.length ? '' : 'none';
    renderFilters(); renderStep1Tools();
  }
  const filterNote = (cfg, n, kept) => { const sm = cfg.sample && cfg.sample.on, c = (cfg.rowFilter || []).length;
    return !c && !sm ? 'All patients are analysed.' : `${kept} of ${n} patients analysed${c ? ` (${c > 1 ? 'all the conditions' : 'the condition'})` : ''}${sm ? `${c ? ',' : ' —'} random sample of ${cfg.sample.n}, seed ${cfg.sample.seed}` : ''}`; };
  function renderFilters() {
    const cfg = state.cfg; if (!cfg) return;
    cfg.rowFilter = cfg.rowFilter || [];
    const h = state.data.headers, ops = Object.entries(Analysis.FILTER_OPS);
    $('#filterList').innerHTML = cfg.rowFilter.map((f, i) => `<div class="flt" data-fi="${i}">
      <input type="checkbox" data-ff="on" ${f.on !== false ? 'checked' : ''} title="Use this condition">
      <select data-ff="col">${h.map(c => `<option ${c === f.col ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>
      <select data-ff="op">${ops.map(([k, t]) => `<option value="${k}" ${k === f.op ? 'selected' : ''}>${t}</option>`).join('')}</select>
      <input type="text" data-ff="val" value="${esc(f.val ?? '')}" list="fltVals${i}" style="width:140px;${['blank', 'notblank'].includes(f.op) ? 'display:none' : ''}" placeholder="value">
      <datalist id="fltVals${i}">${columnInfo(state.data.rows, f.col).distinct.slice(0, 50).map(v => `<option value="${esc(v)}">`).join('')}</datalist>
      <button class="btn ghost small" data-fdel="${i}" type="button" title="Remove">✕</button></div>`).join('');
    const n = state.data.rows.length, kept = Analysis.filterRows(cfg, state.data.rows).length;
    $('#filterInfo').textContent = filterNote(cfg, n, kept);
  }
  $('#filterAdd').onclick = () => { const cfg = state.cfg; if (!cfg) return; cfg.rowFilter = cfg.rowFilter || [];
    cfg.rowFilter.push({ col: state.data.headers.find(h => h !== cfg.groupCol && !cfg.idCols.includes(h)) || state.data.headers[0], op: 'eq', val: '', on: true }); renderFilters(); };
  $('#filterList').addEventListener('click', e => { const b = e.target.closest('[data-fdel]'); if (!b) return; state.cfg.rowFilter.splice(+b.dataset.fdel, 1); afterFilter(true); });
  $('#filterList').addEventListener('change', e => {
    const el = e.target.closest('[data-ff]'); if (!el) return;
    const f = state.cfg.rowFilter[+el.closest('[data-fi]').dataset.fi], k = el.dataset.ff;
    f[k] = k === 'on' ? el.checked : el.value;
    afterFilter(k !== 'val');
  });
  $('#filterList').addEventListener('input', e => { const el = e.target.closest('[data-ff="val"]'); if (!el) return; state.cfg.rowFilter[+el.closest('[data-fi]').dataset.fi].val = el.value; afterFilter(false); });
  function afterFilter(redraw) {
    state.cfg.consort = null; state.result = null;
    if (redraw) renderFilters();
    else { const n = state.data.rows.length, kept = Analysis.filterRows(state.cfg, state.data.rows).length; $('#filterInfo').textContent = filterNote(state.cfg, n, kept); }
    renderGrid();
  }
  // missing-value codes (999, NA, "."): blank the matching cells
  $('#missApply').onclick = () => {
    const codes = $('#missCodes').value.split(/[,;]+/).map(c => c.trim()).filter(Boolean); if (!codes.length || !state.data) { toast('Type the codes first, e.g. 999, NA'); return; }
    const low = codes.map(c => c.toLowerCase()), nums = codes.map(c => Number(c)).filter(isFinite);
    const hit = (v, h) => !isMissing(v) && h !== state.cfg.groupCol && (low.includes(String(v).trim().toLowerCase()) || (typeof v === 'number' && nums.includes(v)));
    const { headers, rows } = state.data, per = {};
    rows.forEach(r => headers.forEach(h => { if (hit(r[h], h)) per[h] = (per[h] || 0) + 1; }));
    const n = Object.values(per).reduce((a, b) => a + b, 0);
    if (!n) { $('#missInfo').textContent = 'No cell has these values.'; return; }
    editSheet(() => { rows.forEach(r => headers.forEach(h => { if (hit(r[h], h)) r[h] = null; }));
      state.cfg.variables.forEach(v => { if (v.type === 'categorical' && per[v.cols[0].col]) v.levels = v.levels.filter(l => !low.includes(String(l).toLowerCase())); }); refreshGroups(); });
    $('#missInfo').textContent = `${n} cell${n > 1 ? 's' : ''} blanked: ${Object.entries(per).map(([h, k]) => `${h} (${k})`).join(', ')}.`;
    toast(`${n} missing-value code${n > 1 ? 's' : ''} blanked`);
  };
  // another file: more patients (rows matched by column name) or more variables (columns matched by ID)
  $('#mergeMode').onchange = e => { $('#mergeKeyBox').style.display = e.target.value === 'cols' ? '' : 'none'; };
  $('#mergeBtn').onclick = () => $('#mergeFile').click();
  $('#mergeFile').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f || !state.data) return;
    try {
      const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' });
      mergeSheet(wb.Sheets[wb.SheetNames[0]], f.name);
    } catch (err) { console.error(err); toast('Could not read the other file: ' + err.message); }
  };
  // every sheet one under another, matched by column name, with the sheet's name in a new first column
  $('#stackSheets').onclick = () => {
    if (!state.wb) return;
    const col = 'Sheet', names = state.wb.SheetNames;
    let added = 0;
    editSheet(() => {
      const { headers, rows } = state.data;
      if (!headers.includes(col)) { headers.unshift(col); rows.forEach(r => { r[col] = state.sheet; }); }
      names.filter(n => n !== state.sheet).forEach(n => {
        const aoa = XLSX.utils.sheet_to_json(state.wb.Sheets[n], { header: 1, defval: null, raw: true, blankrows: false }); if (aoa.length < 2) return;
        const oh = aoa[0].map((h, i) => h === null || h === '' ? `Column_${i + 1}` : String(h).trim());
        oh.forEach(h => { if (!headers.includes(h)) { headers.push(h); rows.forEach(r => { r[h] = null; }); } });
        aoa.slice(1).filter(r => r.some(v => !isMissing(v))).forEach(r => { const o = Object.fromEntries(headers.map(h => [h, null])); oh.forEach((h, i) => { o[h] = r[i] ?? null; }); o[col] = n; rows.push(o); added++; });
      });
      if (!state.cfg.variables.some(v => v.cols[0].col === col)) state.cfg.variables.push({ ...singleVariable(rows, col, 0, 'Demographic and baseline data'), id: 'sheet' + Date.now().toString(36), include: false });
      refreshGroups();
    });
    renderPrep(); toast(`${added} rows from ${names.length - 1} other sheet${names.length > 2 ? 's' : ''} stacked, with their sheet name in “${col}”`);
  };
  $('#mergeSheetGo').onclick = () => { const n = $('#mergeSheet').value; if (state.wb && state.wb.Sheets[n]) mergeSheet(state.wb.Sheets[n], `sheet ${n}`); };
  function mergeSheet(ws, src) {
    {
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, blankrows: false });
      if (aoa.length < 2) { toast('The other file has no data rows'); return; }
      const oh = aoa[0].map((h, i) => h === null || h === '' ? `Column_${i + 1}` : String(h).trim());
      const orows = aoa.slice(1).filter(r => r.some(v => !isMissing(v))).map(r => Object.fromEntries(oh.map((h, i) => [h, r[i] ?? null])));
      const { headers, rows } = state.data, cfg = state.cfg, added = [];
      const addVars = () => added.forEach(h => cfg.variables.push({ ...singleVariable(state.data.rows, h, state.data.headers.indexOf(h), 'Other outcomes'), id: 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }));
      if ($('#mergeMode').value === 'rows') {
        const common = oh.filter(h => headers.includes(h));
        if (!common.length) { toast('No column name is shared with the current sheet'); return; }
        editSheet(() => {
          oh.forEach(h => { if (!headers.includes(h)) { headers.push(h); rows.forEach(r => { r[h] = null; }); added.push(h); } });
          orows.forEach(o => rows.push(Object.fromEntries(headers.map(h => [h, o[h] ?? null]))));
          addVars(); refreshGroups();
        });
        toast(`${orows.length} patients added from ${src}${added.length ? ` with ${added.length} new column${added.length > 1 ? 's' : ''}` : ''}${oh.length > common.length ? '' : ' (all columns matched)'}`);
      } else {
        const key = $('#mergeKey').value, okey = oh.includes(key) ? key : oh[0];
        const byId = new Map(orows.map(o => [String(o[okey] ?? '').trim(), o]));
        let matched = 0;
        editSheet(() => {
          const names = oh.filter(h => h !== okey).map(h => { let n = h, k = 2; while (headers.includes(n) || added.includes(n)) n = `${h}_${k++}`; added.push(n); return [h, n]; });
          headers.push(...names.map(x => x[1]));
          rows.forEach(r => { const o = byId.get(String(r[key] ?? '').trim()); if (o) matched++; names.forEach(([h, n]) => { r[n] = o ? o[h] ?? null : null; }); });
          addVars();
        });
        toast(`${added.length} column${added.length > 1 ? 's' : ''} added from ${src}: ${matched} of ${rows.length} patients matched by ${key}${byId.size > matched ? `, ${byId.size - matched} rows of the other file had no match` : ''}`);
      }
      if (newRepeated()) toast('The added columns include repeated measures — see step 2');
      renderPrep(); renderGrid();
    }
  }
  // undo / redo: snapshots of the data and setup; a new change clears what could be redone
  function pushUndo() {
    state.undo = state.undo || []; state.undo.push(JSON.stringify({ data: state.data, cfg: state.cfg }));
    if (state.undo.length > 30) state.undo.shift();
    state.redo = [];
  }
  function undoRedo(redo) {
    state.undo = state.undo || []; state.redo = state.redo || [];
    const from = redo ? state.redo : state.undo, to = redo ? state.undo : state.redo;
    const snap = from.pop(); if (!snap) { toast(redo ? 'Nothing to redo' : 'Nothing to undo'); return false; }
    to.push(JSON.stringify({ data: state.data, cfg: state.cfg })); if (to.length > 30) to.shift();
    const o = JSON.parse(snap); state.data = o.data; state.cfg = o.cfg; state.result = null;
    toast(redo ? 'Redone' : 'Undone');
    return true;
  }
  // every change to the sheet goes through here: snapshot for undo, apply, keep the setup in step, redraw
  function editSheet(fn, what) {
    pushUndo();
    const before = JSON.parse(state.undo[state.undo.length - 1]).data;
    fn();
    logChange(what ? `${what} — ${describeChange(before, state.data)}` : describeChange(before, state.data));
    renderGrid(); renderStepper();
  }
  function refreshGroups() {
    const cfg = state.cfg; if (!cfg) return;
    const cur = []; state.data.rows.forEach(r => { const g = Analysis.groupOf(cfg, r); if (g !== null && !cur.includes(g)) cur.push(g); });
    const before = cfg.groupOrder.join('|');
    cur.forEach(g => { if (!cfg.groupOrder.includes(g)) { cfg.groupOrder.push(g); cfg.groupLabels[g] = groupName(g); cfg.groupInclude[g] = true; } });
    cfg.groupOrder = cfg.groupOrder.filter(g => cur.includes(g));
    if (cfg.groupOrder.join('|') !== before) cfg.consort = null;
  }
  const replaceCol = (cfg, from, to) => {
    if (cfg.groupCol === from) cfg.groupCol = to;
    cfg.idCols = cfg.idCols.map(c => c === from ? to : c);
    cfg.variables.forEach(v => v.cols.forEach(c => { if (c.col === from) c.col = to; }));
    cfg.advanced.forEach(a => { ['outcome', 'second', 'event'].forEach(k => { if (a[k] === from) a[k] = to; }); a.predictors = (a.predictors || []).map(c => c === from ? to : c); });
  };
  function renameColumn(from, to) {
    const { headers, rows } = state.data;
    to = to.trim();
    if (!to || to === from) return renderGrid();
    if (headers.includes(to)) { toast(`A column named “${to}” already exists`); return renderGrid(); }
    editSheet(() => {
      headers[headers.indexOf(from)] = to;
      state.data.rows = rows.map(r => { const o = {}; headers.forEach(h => { o[h] = h === to ? r[from] : r[h]; }); return o; });
      if (state.cfg) replaceCol(state.cfg, from, to);
    });
  }
  function deleteColumn(col) {
    const cfg = state.cfg;
    if (cfg && col === cfg.groupCol && !cfg.noGroups) { toast('This is the group column — choose another group column in step 2 first'); return; }
    if (!confirm(`Delete column “${col}” from the sheet?`)) return;
    editSheet(() => {
      state.data.headers = state.data.headers.filter(h => h !== col);
      state.data.rows.forEach(r => delete r[col]);
      if (!cfg) return;
      cfg.idCols = cfg.idCols.filter(c => c !== col);
      const out = [];
      cfg.variables.forEach(v => {
        if (v.kind === 'single') { if (v.cols[0].col !== col) out.push(v); return; }
        v.cols = v.cols.filter(c => c.col !== col);
        // a repeated measure left with one column becomes a single variable
        if (v.cols.length >= 2) out.push(v);
        else if (v.cols.length === 1) out.push(singleVariable(state.data.rows, v.cols[0].col, 0, 'Other outcomes'));
      });
      cfg.variables = out;
      cfg.advanced.forEach(a => { ['outcome', 'second', 'event'].forEach(k => { if (a[k] === col) a[k] = ''; }); a.predictors = (a.predictors || []).filter(c => c !== col); });
      syncPositions();
    });
  }
  // variable order (and so table order) follows the column order of the sheet
  function syncPositions() {
    const cfg = state.cfg; if (!cfg) return;
    const h = state.data.headers;
    cfg.variables.forEach(v => { v.pos = Math.min(...v.cols.map(c => h.indexOf(c.col))); });
    cfg.variables.sort((a, b) => a.pos - b.pos);
  }
  function moveColumn(i, d) {
    const h = state.data.headers, j = i + d;
    if (j < 0 || j >= h.length) return;
    editSheet(() => { [h[i], h[j]] = [h[j], h[i]]; syncPositions(); });
  }
  function sortRows(col) {
    const g = state.grid, dir = g.sort && g.sort.col === col ? -g.sort.dir : 1;
    editSheet(() => {
      g.sort = { col, dir };
      const key = v => { const n = Analysis.toNum(v); return isFinite(n) ? n : v === null || v === undefined || v === '' ? null : String(v); };
      state.data.rows.sort((a, b) => {
        const x = key(a[col]), y = key(b[col]);
        if (x === null) return y === null ? 0 : 1;
        if (y === null) return -1;
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), undefined, { numeric: true })) * dir;
      });
    });
  }
  $('#gridWrap').addEventListener('click', e => {
    const b = e.target.closest('button,[data-hsort]'); if (!b || !state.data) return;
    const g = state.grid, d = b.dataset;
    if (b.id === 'gridPrev') { g.page--; renderGrid(); }
    else if (b.id === 'gridNext') { g.page++; renderGrid(); }
    else if (b.id === 'gridEdit') { g.edit = !g.edit; renderGrid(); }
    else if (d.gcols) {
      const hs = state.data.headers, isNum = h => columnInfo(state.data.rows, h).numeric;
      g.hidden = d.gcols === 'all' ? [] : d.gcols === 'none' ? [...hs] : hs.filter(h => d.gcols === 'num' ? !isNum(h) : isNum(h));
      renderGrid();
    }
    else if (b.id === 'gridUndo' || b.id === 'gridRedo') { if (undoRedo(b.id === 'gridRedo')) { renderGrid(); renderPrep(); renderStepper(); } }
    else if (b.id === 'gridAddRow') { editSheet(() => { state.data.rows.push(Object.fromEntries(state.data.headers.map(h => [h, null]))); }); g.page = 1e9; renderGrid(); }
    else if (b.id === 'gridAddCol') {
      let n = 1; while (state.data.headers.includes(`New_column_${n}`)) n++;
      const name = `New_column_${n}`;
      editSheet(() => {
        state.data.headers.push(name); state.data.rows.forEach(r => { r[name] = null; });
        // added as an unticked variable; tick it in step 2 once it has values
        if (state.cfg) state.cfg.variables.push({ ...singleVariable(state.data.rows, name, state.data.headers.length - 1, 'Other outcomes'), include: false });
      });
    }
    else if (b.id === 'gridRedetect') {
      if (!confirm('Detect the group, ID, variables and repeated measures again from the edited sheet? Your variable setup in steps 2–8 will be replaced.')) return;
      editSheet(() => { state.cfg = detect(state.data); }); renderPrep();
      toast(`Re-detected: ${state.cfg.variables.length} variables`);
    }
    else if (b.id === 'gridSave') {
      const ws = XLSX.utils.json_to_sheet(state.data.rows, { header: state.data.headers }), wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, (state.sheet || 'Data').slice(0, 31));
      XLSX.writeFile(wb, (state.file || 'data').replace(/\.[^.]+$/, '').replace(/ \(example\)$/, '') + ' (edited).xlsx');
    }
    else if (d.hmove) { const [i, k] = d.hmove.split(',').map(Number); moveColumn(i, k); }
    else if (d.hdel) deleteColumn(d.hdel);
    else if (d.hsort) sortRows(d.hsort);
    else if (d.rmove) {
      const [i, k] = d.rmove.split(',').map(Number), r = state.data.rows, j = i + k;
      if (j >= 0 && j < r.length) editSheet(() => { [r[i], r[j]] = [r[j], r[i]]; g.sort = null; });
    }
    else if (d.rdel) { const i = +d.rdel; editSheet(() => { state.data.rows.splice(i, 1); refreshGroups(); }); }
  });
  // a cell is committed when it loses focus (Enter moves on, Esc cancels)
  $('#gridWrap').addEventListener('focusout', e => {
    const td = e.target.closest('[data-cell]'); if (!td) return;
    const i = +td.dataset.cell, col = td.dataset.col, v = parseCell(td.textContent), old = state.data.rows[i][col];
    if ((old ?? null) === v || String(old ?? '') === String(v ?? '')) return;
    // update only this cell (a full redraw here would swallow a click on a button)
    pushUndo();
    state.data.rows[i][col] = v;
    if (state.cfg && col === state.cfg.groupCol) refreshGroups();
    td.textContent = v ?? '';
    td.classList.toggle('miss', state.grid.hlMissing && isMissing(v));
    $('#gridUndo').disabled = false;
  });
  $('#gridWrap').addEventListener('keydown', e => {
    const td = e.target.closest('[data-cell]');
    if (td && e.key === 'Enter') { e.preventDefault(); td.blur(); }
    if (td && e.key === 'Escape') { td.textContent = state.data.rows[+td.dataset.cell][td.dataset.col] ?? ''; td.blur(); }
    if (e.target.dataset.hname !== undefined && e.key === 'Enter') e.target.blur();
  });
  $('#gridWrap').addEventListener('change', e => {
    const t = e.target, g = state.grid;
    if (t.dataset.hname !== undefined) return renameColumn(t.dataset.hname, t.value);
    if (t.id === 'gridPer') { g.per = t.value; g.page = 0; }
    else if (t.id === 'gridOnlyMissing') { g.onlyMissing = t.checked; g.page = 0; }
    else if (t.id === 'gridHl') g.hlMissing = t.checked;
    else if (t.id === 'gridSummary') g.summary = t.checked;
    else if (t.id === 'gridDensity') g.density = t.value;
    else if (t.id === 'gridTypes') g.types = t.checked;
    else if (t.id === 'gridWrapText') g.wrap = t.checked;
    else if (t.id === 'gridFreeze') g.freeze = t.checked;
    else if (t.id === 'gridStripes') g.stripes = t.checked;
    else if (t.id === 'gridOut') g.outliers = t.checked;
    else if (t.dataset.gcol !== undefined) g.hidden = t.checked ? g.hidden.filter(h => h !== t.dataset.gcol) : [...g.hidden, t.dataset.gcol];
    else return;
    renderGrid();
  });
  $('#gridSearch').addEventListener('input', e => { state.grid.q = e.target.value; state.grid.page = 0; renderGrid(); });

  // step 2: the same change for every variable
  // labels of every variable: sentence case, title case, or made again from the column names
  const SMALL = /^(of|and|or|in|at|to|the|a|an|with|by|for|on|per|vs)$/i, KEEP = w => /[A-Z].*[A-Z]|\d|^\(/.test(w);
  const sentence = t => t.split(' ').map((w, i) => KEEP(w) ? w : i === 0 ? w.charAt(0).toUpperCase() + w.slice(1).toLowerCase() : w.toLowerCase()).join(' ');
  const titleCase = t => t.split(' ').map((w, i) => KEEP(w) ? w : i > 0 && SMALL.test(w) ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
  $('#varBulk').addEventListener('click', e => {
    const lb = e.target.closest('[data-vlabel]'); if (!lb || !state.cfg) return;
    readUiIntoCfg(); const k = lb.dataset.vlabel;
    state.cfg.variables.forEach(v => { v.label = k === 'cols' ? (v.kind === 'repeated' ? labelFrom(tokens(v.cols[0].col).filter(t => !TP_RE.test(t))) : labelFrom(tokens(v.cols[0].col))) : k === 'title' ? titleCase(v.label) : sentence(v.label); });
    renderVariables(); toast(k === 'cols' ? 'Labels made from the column names' : `Labels in ${k === 'title' ? 'Title Case' : 'sentence case'}`);
  });
  $('#varBulk').addEventListener('click', e => {
    const b = e.target.closest('[data-vbulk]'); if (!b || !state.cfg) return;
    readUiIntoCfg();
    const k = b.dataset.vbulk, vs = state.cfg.variables;
    if (k === 'inc' || k === 'exc') vs.forEach(v => { v.include = k === 'inc'; });
    else if (k === 'num' || k === 'cat') vs.forEach(v => { v.include = (v.type === 'numeric') === (k === 'num'); });
    else vs.filter(v => v.type === 'numeric').forEach(v => { v.dist = k.slice(2); });
    renderVariables(); renderStepper();
  });

  /* ---------- step 1: find & replace, and a check of the sheet for common problems ---------- */
  // one tool panel at a time under the grid bar
  const TOOL_BOXES = ['findBox', 'checkBox', 'recodeBox', 'reshapeBox', 'splitBox', 'fillBox'];
  function toggleTool(id) { const on = $('#' + id).style.display === 'none'; TOOL_BOXES.forEach(b => { $('#' + b).style.display = b === id && on ? '' : 'none'; }); return on; }
  $('#gridFind').onclick = () => {
    const on = toggleTool('findBox');
    if (on) { $('#frCol').innerHTML = '<option value="">All columns</option>' + state.data.headers.map(h => `<option>${esc(h)}</option>`).join(''); $('#frFind').focus(); }
  };
  $('#frGo').onclick = () => {
    const f = $('#frFind').value, r = $('#frRepl').value, col = $('#frCol').value, whole = $('#frWhole').checked, cs = $('#frCase').checked;
    if (f === '' && !whole) { $('#frInfo').textContent = 'Type what to find'; return; }
    const cols = col ? [col] : state.data.headers, norm = v => cs ? v : v.toLowerCase(), target = norm(f.trim());
    const re = whole ? null : new RegExp(f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), cs ? 'g' : 'gi');
    let n = 0;
    const hits = [];
    state.data.rows.forEach((row, i) => cols.forEach(h => {
      const v = row[h], t = v === null || v === undefined ? '' : String(v);
      if (whole ? norm(t.trim()) === target : re.test(t)) { if (re) re.lastIndex = 0; hits.push([i, h, whole ? parseCell(r) : parseCell(t.replace(re, r))]); }
    }));
    if (!hits.length) { $('#frInfo').textContent = 'Nothing found'; return; }
    editSheet(() => { hits.forEach(([i, h, v]) => { state.data.rows[i][h] = v; n++; }); if (state.cfg && cols.includes(state.cfg.groupCol)) refreshGroups(); });
    $('#frInfo').textContent = `${n} cell${n > 1 ? 's' : ''} replaced (↶ Undo in edit mode to go back)`;
  };
  // the data check: duplicate IDs, text in numeric columns, spelling variants of categories, empty / constant columns, extreme values
  function dataIssues() {
    const { headers, rows } = state.data, cfg = state.cfg, out = [];
    const idc = cfg && cfg.idCols[0];
    if (idc) {
      const seen = {}, dup = [];
      rows.forEach((r, i) => { const v = r[idc]; if (v === null || v === undefined || String(v).trim() === '') return; const k = String(v).trim(); if (seen[k] !== undefined) dup.push(`${k} (rows ${seen[k] + 1} and ${i + 1})`); else seen[k] = i; });
      if (dup.length) out.push({ ico: '⚠️', txt: `<b>Duplicate IDs in ${esc(idc)}:</b> ${esc(dup.slice(0, 8).join('; '))}${dup.length > 8 ? ` and ${dup.length - 8} more` : ''}`, q: dup[0].split(' ')[0] });
    }
    // rows that repeat another row in every column
    const seenRow = new Set(), dupRows = [];
    rows.forEach((r, i) => { const k = JSON.stringify(headers.map(h => isMissing(r[h]) ? null : String(r[h]).trim())); if (seenRow.has(k)) dupRows.push(i + 1); else seenRow.add(k); });
    if (dupRows.length) out.push({ ico: '⧉', txt: `<b>${dupRows.length} row${dupRows.length > 1 ? 's repeat' : ' repeats'} another row exactly</b> (row${dupRows.length > 1 ? 's' : ''} ${dupRows.slice(0, 8).join(', ')}) — the same patient entered twice?`, fix: { kind: 'dedupe' }, fixLabel: 'Remove duplicate rows' });
    headers.forEach(h => {
      const vals = rows.map(r => r[h]).filter(v => v !== null && v !== undefined && String(v).trim() !== '');
      if (!vals.length) { out.push({ ico: '◻️', txt: `<b>${esc(h)}</b> is empty.`, fix: { col: h, kind: 'dropCol' }, fixLabel: 'Delete' }); return; }
      const nums = vals.map(Analysis.toNum), numShare = nums.filter(isFinite).length / vals.length;
      if (numShare >= 0.8 && numShare < 1) {
        const bad = [...new Set(vals.filter(v => !isFinite(Analysis.toNum(v))).map(v => String(v).trim()))];
        const unit = bad.filter(v => unitNumber(v) !== null);
        out.push({ ico: '🔤', txt: `<b>${esc(h)}</b> is numeric but has text in ${vals.length - nums.filter(isFinite).length} cell(s): ${bad.slice(0, 6).map(v => `“${esc(v)}”`).join(', ')} — these count as missing.${unit.length ? ` ${unit.length === bad.length ? 'All' : unit.length} can be read as numbers (“${esc(unit[0])}” → ${unitNumber(unit[0])}).` : ''}`, q: bad[0], ...(unit.length ? { fix: { col: h, kind: 'units' } } : {}) });
      }
      if (numShare < 0.8) {
        // the same category written in different ways ("male", "Male ", "MALE")
        const groups = {};
        vals.forEach(v => { const k = String(v).trim().toLowerCase().replace(/\s+/g, ' '); (groups[k] = groups[k] || {})[String(v)] = ((groups[k] || {})[String(v)] || 0) + 1; });
        const variants = Object.values(groups).filter(g => Object.keys(g).length > 1);
        if (variants.length) out.push({ ico: '✏️', txt: `<b>${esc(h)}</b> has categories written in different ways: ${variants.slice(0, 4).map(g => Object.keys(g).map(k => `“${esc(k)}”`).join(' / ')).join('; ')}.`, fix: { col: h, kind: 'spelling' } });
      }
      const distinct = new Set(vals.map(v => String(v).trim()));
      if (distinct.size === 1 && rows.length > 2) out.push({ ico: '➖', txt: `<b>${esc(h)}</b> has the same value in every row (“${esc([...distinct][0])}”).` });
      if (numShare === 1 && vals.length >= 8) {
        const m = Stats.mean(nums), sd = Stats.sd(nums), ext = vals.filter((v, i) => sd > 0 && Math.abs((nums[i] - m) / sd) > 4);
        if (ext.length) out.push({ ico: '📍', txt: `<b>${esc(h)}</b> has extreme value(s) more than 4 SD from the mean: ${ext.slice(0, 6).map(v => esc(v)).join(', ')} — check for typing errors.`, q: String(ext[0]) });
      }
      // yes/no written as Y/N, +/−, true/false or positive/negative
      const yn = [...new Set(vals.map(v => String(v).trim().toLowerCase()))];
      const ynCol = yn.length >= 2 && yn.every(v => YES_NO[v] !== undefined) && !yn.every(v => v === '0' || v === '1');
      if (ynCol && !(yn.length === 2 && vals.every(v => /^(Yes|No)$/.test(String(v).trim()))))
        out.push({ ico: '☑', txt: `<b>${esc(h)}</b> is yes/no written as ${yn.map(v => `“${esc(v)}”`).join(', ')} — write it as Yes / No.`, fix: { col: h, kind: 'yesno' } });
      // words and codes that mean missing
      const missWords = [...new Set(vals.filter(v => MISS_WORD.test(String(v).trim())).map(v => String(v).trim()))];
      if (missWords.length && !ynCol) out.push({ ico: '∅', txt: `<b>${esc(h)}</b> uses ${missWords.map(v => `“${esc(v)}”`).join(', ')} for missing values (${vals.filter(v => MISS_WORD.test(String(v).trim())).length} cells) — blank cells are clearer.`, q: missWords[0], fix: { col: h, kind: 'missWords' } });
      if (numShare >= 0.8) {
        const ok = nums.filter(v => isFinite(v) && !MISS_CODES.includes(v)), lo = Math.min(...ok), hi = Math.max(...ok);
        const codes = [...new Set(nums.filter(v => MISS_CODES.includes(v) && ok.length >= 5 && (v > Math.max(3 * hi, hi + 50) || (v < 0 && lo >= 0) || (new Set(ok).size <= 5 && v >= 7 && v > hi))))];
        if (codes.length) out.push({ ico: '∅', txt: `<b>${esc(h)}</b> has ${codes.join(', ')} — far outside the other values (${Analysis.fmt(lo, 2)} to ${Analysis.fmt(hi, 2)}), probably a code for missing.`, q: String(codes[0]), fix: { col: h, kind: 'missCodes', codes } });
        // values that cannot be right for what the column measures
        const rule = RANGE_RULES.find(x => x.re.test(h));
        if (rule) { const outR = ok.filter(v => v < rule.lo || v > rule.hi); if (outR.length) out.push({ ico: '🚫', txt: `<b>${esc(h)}</b> has value(s) outside ${rule.lo}–${rule.hi} ${rule.what}: ${[...new Set(outR)].slice(0, 6).map(v => Analysis.fmt(v, 2)).join(', ')} — check the source.`, q: String(outR[0]) }); }
      }
      if (vals.some(v => typeof v === 'string' && v !== v.trim())) out.push({ ico: '␣', txt: `<b>${esc(h)}</b> has values with extra spaces at the start or end.`, fix: { col: h, kind: 'trim' } });
    });
    return out;
  }
  // "54 years", "82 kg", "12,5 mg/dL" → the number; null when the cell is not a number with a unit
  const unitNumber = v => { const m = String(v).trim().match(/^([-+]?\d+(?:[.,]\d+)?)\s*([a-zA-Zµμ%°/²³.]+[a-zA-Zµμ%°/²³. ]*)$/); return m ? Number(m[1].replace(',', '.')) : null; };
  const MISS_WORD = /^(na|n\/a|n\.a\.|nan|null|none|missing|not recorded|not done|unknown|-+|\.|\?|—)$/i;
  const YES_NO = { y: 'Yes', yes: 'Yes', '+': 'Yes', true: 'Yes', positive: 'Yes', pos: 'Yes', present: 'Yes', '1': 'Yes', n: 'No', no: 'No', '-': 'No', '−': 'No', false: 'No', negative: 'No', neg: 'No', absent: 'No', '0': 'No' };
  const MISS_CODES = [9, 99, 999, 9999, 99999, -9, -99, -999, -9999, 888, 8888, -1];
  const RANGE_RULES = [{ re: /^age/i, lo: 0, hi: 120, what: 'years' }, { re: /bmi/i, lo: 10, hi: 80, what: 'kg/m²' }, { re: /(%|percent|pct|sat)/i, lo: 0, hi: 100, what: '%' },
    { re: /^(sbp|dbp|systolic|diastolic)/i, lo: 30, hi: 300, what: 'mmHg' }, { re: /(heart.?rate|^hr\b|pulse)/i, lo: 20, hi: 250, what: 'beats/min' }, { re: /^(vas|nrs)/i, lo: 0, hi: 10, what: 'on a 0–10 scale' },
    { re: /^fev1/i, lo: 0.2, hi: 8, what: 'L' }, { re: /hba1c/i, lo: 3, hi: 20, what: '%' }, { re: /(weight|wt)\b/i, lo: 1, hi: 350, what: 'kg' }, { re: /(height|ht)\b/i, lo: 40, hi: 250, what: 'cm' }];
  function renderCheck() {
    const issues = dataIssues();
    $('#checkBox').innerHTML = `<div class="row"><b>Data check</b><span class="legend-note">${issues.length ? `${issues.length} thing${issues.length > 1 ? 's' : ''} to look at` : 'no problems found ✓'}</span><span class="spacer"></span>${issues.some(x => x.fix) ? `<button class="btn ghost small" data-chkfix="all" type="button" title="Spelling, spaces, units, missing-value words and codes, duplicate rows and empty columns">Fix all (${issues.filter(x => x.fix).length})</button>` : ''}</div>`
      + issues.map((x, i) => `<div class="chk-item"><span class="ico">${x.ico}</span><span class="txt">${x.txt}</span>${x.q ? `<button class="btn ghost small" data-chkq="${esc(x.q)}" type="button">Show</button>` : ''}${x.fix ? `<button class="btn ghost small" data-chkfix="${i}" type="button">${x.fixLabel || 'Fix'}</button>` : ''}</div>`).join('');
    state.checkIssues = issues;
  }
  // fixes: trim spaces; write each category the way most rows write it
  function applyFix(f) {
    const rows = state.data.rows;
    if (f.kind === 'trim') rows.forEach(r => { if (typeof r[f.col] === 'string') r[f.col] = parseCell(r[f.col]); });
    if (f.kind === 'units') rows.forEach(r => { const v = r[f.col]; if (typeof v === 'string') { const n = unitNumber(v); r[f.col] = n !== null ? n : parseCell(v); } });
    if (f.kind === 'yesno') rows.forEach(r => { if (!isMissing(r[f.col])) { const k = YES_NO[String(r[f.col]).trim().toLowerCase()]; if (k) r[f.col] = k; } });
    if (f.kind === 'missWords') rows.forEach(r => { if (!isMissing(r[f.col]) && MISS_WORD.test(String(r[f.col]).trim())) r[f.col] = null; });
    if (f.kind === 'missCodes') rows.forEach(r => { if (f.codes.includes(Analysis.toNum(r[f.col]))) r[f.col] = null; });
    if (f.kind === 'dedupe') { const seen = new Set(), h = state.data.headers; state.data.rows = rows.filter(r => { const k = JSON.stringify(h.map(x => isMissing(r[x]) ? null : String(r[x]).trim())); if (seen.has(k)) return false; seen.add(k); return true; }); }
    if (f.kind === 'dropCol') { state.data.headers = state.data.headers.filter(h => h !== f.col); rows.forEach(r => delete r[f.col]); if (state.cfg) state.cfg.variables = state.cfg.variables.filter(v => !v.cols.some(c => c.col === f.col)); }
    if (f.kind === 'spelling') {
      const cnt = {}; rows.forEach(r => { const v = r[f.col]; if (v === null || v === undefined || String(v).trim() === '') return; const k = String(v).trim().toLowerCase().replace(/\s+/g, ' '); (cnt[k] = cnt[k] || {})[String(v).trim()] = ((cnt[k] || {})[String(v).trim()] || 0) + 1; });
      const best = Object.fromEntries(Object.entries(cnt).map(([k, g]) => [k, Object.entries(g).sort((a, b) => b[1] - a[1])[0][0]]));
      rows.forEach(r => { const v = r[f.col]; if (v === null || v === undefined || String(v).trim() === '') return; r[f.col] = best[String(v).trim().toLowerCase().replace(/\s+/g, ' ')]; });
    }
  }
  $('#gridCheck').onclick = () => { if (toggleTool('checkBox')) renderCheck(); };
  /* ---------- recode values: rename, merge or blank the categories of a column ---------- */
  function renderRecode() {
    const h = state.data.headers, col = h.includes($('#rcCol').value) ? $('#rcCol').value : (state.data.headers.find(x => columnInfo(state.data.rows, x).distinct.length <= 20 && !columnInfo(state.data.rows, x).numeric) || h[0]);
    $('#rcCol').innerHTML = h.map(x => `<option ${x === col ? 'selected' : ''}>${esc(x)}</option>`).join('');
    const cnt = new Map(); state.data.rows.forEach(r => { const v = r[col]; if (isMissing(v)) return; const k = String(v); cnt.set(k, (cnt.get(k) || 0) + 1); });
    const list = [...cnt.entries()].sort((a, b) => b[1] - a[1]);
    $('#rcTbl').innerHTML = `<thead><tr><th>Value in the sheet</th><th>Rows</th><th>New value</th><th>Blank</th></tr></thead><tbody>${list.slice(0, 200).map(([v, n], i) =>
      `<tr><td class="mono">“${esc(v)}”</td><td>${n}</td><td><input type="text" data-rcv="${i}" value="${esc(v)}"></td><td><input type="checkbox" data-rcb="${i}"></td></tr>`).join('')}</tbody>`;
    state.rcList = list.map(x => x[0]);
    $('#rcInfo').textContent = `${list.length} different value${list.length === 1 ? '' : 's'}${list.length > 200 ? ' (first 200 shown)' : ''}`;
  }
  $('#gridRecode').onclick = () => { if (toggleTool('recodeBox')) renderRecode(); };
  $('#rcCol').onchange = renderRecode;
  $('#rcTitle').onclick = () => document.querySelectorAll('[data-rcv]').forEach(el => { const t = el.value.trim(); if (/[a-z]/i.test(t) && !/\d/.test(t)) el.value = t.charAt(0).toUpperCase() + t.slice(1).toLowerCase(); });
  $('#rcGo').onclick = () => {
    const col = $('#rcCol').value, map = new Map();
    document.querySelectorAll('[data-rcv]').forEach(el => { const i = +el.dataset.rcv, old = state.rcList[i], blank = document.querySelector(`[data-rcb="${i}"]`).checked;
      const nv = blank ? null : parseCell(el.value); if (blank || String(nv ?? '') !== old) map.set(old, nv); });
    if (!map.size) { toast('Nothing to change — type new values or tick blank'); return; }
    let n = 0;
    editSheet(() => {
      state.data.rows.forEach(r => { const v = r[col]; if (!isMissing(v) && map.has(String(v))) { r[col] = map.get(String(v)); n++; } });
      if (state.cfg) { if (col === state.cfg.groupCol) refreshGroups();
        state.cfg.variables.forEach(v => { if (v.type === 'categorical' && v.cols.some(c => c.col === col)) v.levels = defaultLevels(columnInfo(state.data.rows, v.cols[0].col).distinct); }); }
    });
    renderRecode(); toast(`${n} cell${n === 1 ? '' : 's'} recoded in ${col}`);
  };

  /* ---------- step 1, more tools: column menu, widths, rules, duplicates, missing data, dates, anonymising, snapshots, log, form ---------- */
  // dates: Excel day numbers, yyyy-mm-dd, and d/m/y or m/d/y with / - . separators → yyyy-mm-dd
  function parseDate(v, order = 'dmy') {
    if (isMissing(v)) return null;
    const iso = d => isNaN(d) ? null : d.toISOString().slice(0, 10);
    if (typeof v === 'number') return v > 59 && v < 2958466 ? iso(new Date(Date.UTC(1899, 11, 30) + Math.round(v) * 864e5)) : null;
    const t = String(v).trim(); let m;
    if ((m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(t))) return iso(new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])));
    if ((m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{2,4})$/.exec(t))) { let [a, b, y] = [+m[1], +m[2], +m[3]]; if (y < 100) y += y < 50 ? 2000 : 1900;
      const [d, mo] = order === 'mdy' ? [b, a] : [a, b]; if (mo > 12 || d > 31) return null; return iso(new Date(Date.UTC(y, mo - 1, d))); }
    if (/[a-z]/i.test(t) && /\d{4}/.test(t)) { const d = new Date(t + ' UTC'); return isNaN(d) ? null : iso(d); }
    return null;
  }
  const dateShare = (h, order) => { const v = state.data.rows.map(r => r[h]).filter(x => !isMissing(x)); if (!v.length) return 0;
    const named = /date|dob|birth|admi|discharge|visit|onset|death|surgery|operation|follow/i.test(h);
    return v.filter(x => typeof x === 'number' ? named && x > 0 && x < 73051 : parseDate(x, order)).length / v.length; };
  function renderStep1Tools() {
    const h = state.data.headers, cfg = state.cfg, dates = h.filter(c => dateShare(c, $('#dtOrder').value) >= 0.6);
    const opts = (list, sel) => list.map(c => `<option ${c === sel ? 'selected' : ''}>${esc(c)}</option>`).join('');
    $('#dtCol').innerHTML = opts(h, dates[0] || $('#dtCol').value);
    $('#dtFrom').innerHTML = opts(dates.length ? dates : h, dates[0]); $('#dtTo').innerHTML = opts(dates.length ? dates : h, dates[1] || dates[0]);
    const keep = id => [...$(id).selectedOptions].map(o => o.value);
    const dsel = keep('#dupCols'), asel = keep('#anonCols');
    $('#dupCols').innerHTML = h.map(c => `<option ${dsel.includes(c) || (!dsel.length && cfg && cfg.idCols.includes(c)) ? 'selected' : ''}>${esc(c)}</option>`).join('');
    $('#anonCols').innerHTML = h.map(c => `<option ${asel.includes(c) || (!asel.length && /name|phone|mobile|tel|address|national|file.?no|mrn|ssn/i.test(c)) ? 'selected' : ''}>${esc(c)}</option>`).join('');
    const sm = (cfg && cfg.sample) || {}; $('#sampleOn').checked = !!sm.on; $('#sampleN').value = sm.n || 30; $('#sampleSeed').value = sm.seed || 1;
    renderRules(); renderSnaps();
  }
  // a menu per column: its chart and statistics, sorting, and a filter of the grid
  let cmenu = null;
  function closeCmenu() { if (cmenu) { cmenu.remove(); cmenu = null; } }
  function openCmenu(h, anchor) {
    closeCmenu();
    const rows = state.data.rows, g = state.grid, info = columnInfo(rows, h), vals = rows.map(r => r[h]), miss = vals.filter(isMissing).length, o = state.cfg ? state.cfg.options : DEFAULT_OPTIONS;
    let spec, stats;
    if (info.numeric) {
      const x = vals.map(Analysis.toNum).filter(isFinite), d = Stats.describe(x), f = v => Analysis.fmt(v, 2);
      const k = Math.min(12, Math.max(4, Math.ceil(Math.sqrt(x.length)))), lo = d.min, w = (d.max - d.min) / k || 1, cnt = new Array(k).fill(0); x.forEach(v => cnt[Math.min(k - 1, Math.floor((v - lo) / w))]++);
      spec = { type: 'bar', integer: true, legend: false, categories: cnt.map((_, i) => f(lo + i * w)), yLabel: 'Patients', series: [{ name: h, values: cnt }] };
      stats = `n ${x.length} · missing ${miss}<br>mean ${f(d.mean)} ± ${f(d.sd)} · median ${f(d.median)} (${f(d.q1)}–${f(d.q3)})<br>range ${f(d.min)} to ${f(d.max)}`;
    } else {
      const c = {}; vals.forEach(v => { const k = isMissing(v) ? '(blank)' : String(v).trim(); c[k] = (c[k] || 0) + 1; });
      const top = Object.entries(c).sort((a, b) => b[1] - a[1]).slice(0, 10);
      spec = { type: 'hbar', legend: false, categories: top.map(t => t[0]), yLabel: 'Patients', series: [{ name: h, values: top.map(t => t[1]) }] };
      stats = `${Object.keys(c).length} different values · missing ${miss}`;
    }
    let img = ''; try { img = Charts.draw(spec, chartPalette(o), { ...chartStyle(o), res: 1, aspect: 'standard', legend: 'none' }).toDataURL('image/png'); } catch (e) { /* no chart */ }
    const f = g.cf[h] || {}, distinct = [...new Set(vals.map(v => isMissing(v) ? '(blank)' : String(v).trim()))].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    const filt = info.numeric ? `<div class="row" style="gap:6px"><input type="number" id="cmMin" placeholder="from" value="${esc(f.min ?? '')}" style="width:90px"><input type="number" id="cmMax" placeholder="to" value="${esc(f.max ?? '')}" style="width:90px"></div>`
      : distinct.length <= 60 ? `<div class="vals">${distinct.map(v => `<label class="check" style="margin:2px 0"><input type="checkbox" data-cmv="${esc(v)}" ${!f.vals || f.vals.includes(v) ? 'checked' : ''}><span>${esc(v)}</span></label>`).join('')}</div>` : '<p class="legend-note">Too many values to list — use Search.</p>';
    cmenu = document.createElement('div'); cmenu.className = 'colmenu';
    cmenu.innerHTML = `<div class="row"><b style="flex:1">${esc(h)}</b><button class="btn ghost small" type="button" data-cmx="1">✕</button></div>${img ? `<img src="${img}" alt="">` : ''}<div class="legend-note" style="margin:4px 0">${stats}</div>
      <div class="row" style="gap:6px"><button class="btn ghost small" type="button" data-cmsort="1">Sort A→Z / 1→9</button><button class="btn ghost small" type="button" data-cmsort="-1">Z→A / 9→1</button></div>
      <label class="f" style="margin-top:6px">Show only rows with</label>${filt}
      <div class="row" style="gap:6px"><button class="btn primary small" type="button" data-cmapply="1">Filter</button><button class="btn ghost small" type="button" data-cmclear="1">Clear filter</button></div>`;
    document.body.appendChild(cmenu);
    const r = anchor.getBoundingClientRect(); cmenu.style.left = Math.min(window.scrollX + r.left, window.scrollX + document.documentElement.clientWidth - 316) + 'px'; cmenu.style.top = (window.scrollY + r.bottom + 4) + 'px';
    cmenu.onclick = e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.dataset.cmx) return closeCmenu();
      if (b.dataset.cmsort) { closeCmenu(); g.sort = { col: h, dir: +b.dataset.cmsort }; editSheet(() => { const dir = +b.dataset.cmsort; state.data.rows.sort((a, c) => { const x = a[h], y = c[h]; if (isMissing(x)) return 1; if (isMissing(y)) return -1; const nx = Analysis.toNum(x), ny = Analysis.toNum(y); return dir * (isFinite(nx) && isFinite(ny) ? nx - ny : String(x).localeCompare(String(y))); }); }); return; }
      if (b.dataset.cmclear) delete g.cf[h];
      if (b.dataset.cmapply) {
        if (info.numeric) { const mn = $('#cmMin').value, mx = $('#cmMax').value; if (mn === '' && mx === '') delete g.cf[h]; else g.cf[h] = { min: mn, max: mx }; }
        else { const on = [...cmenu.querySelectorAll('[data-cmv]')].filter(x => x.checked).map(x => x.dataset.cmv); if (on.length === distinct.length) delete g.cf[h]; else g.cf[h] = { vals: on }; }
      }
      closeCmenu(); g.page = 0; renderGrid();
    };
  }
  document.addEventListener('click', e => { if (cmenu && !cmenu.contains(e.target) && !e.target.closest('[data-cmenu]')) closeCmenu(); });
  $('#preview').addEventListener('click', e => {
    const m = e.target.closest('[data-cmenu]'); if (m) { e.stopPropagation(); openCmenu(m.dataset.cmenu, m); return; }
    if (e.target.closest('[data-rsz]')) e.stopPropagation();
  }, true);
  // column widths: drag the right edge of a heading
  $('#preview').addEventListener('mousedown', e => {
    const z = e.target.closest('[data-rsz]'); if (!z) return; e.preventDefault(); e.stopPropagation();
    const th = z.closest('th'), h = z.dataset.rsz, x0 = e.clientX, w0 = th.getBoundingClientRect().width, g = state.grid; g.widths = g.widths || {};
    const mv = ev => { const w = Math.max(50, Math.round(w0 + ev.clientX - x0)); g.widths[h] = w; th.style.minWidth = th.style.maxWidth = w + 'px'; };
    const up = () => { document.removeEventListener('mousemove', mv); document.removeEventListener('mouseup', up); };
    document.addEventListener('mousemove', mv); document.addEventListener('mouseup', up);
  });
  $('#gridNotes').addEventListener('click', e => { const a = e.target.closest('a'); if (!a) return; e.preventDefault(); if (a.dataset.cfclear) state.grid.cf = {}; if (a.dataset.roclear) state.grid.rowsOnly = null; state.grid.page = 0; renderGrid(); });
  const showRows = (rows, label) => { state.grid.rowsOnly = { rows, label }; state.grid.page = 0; renderGrid(); $('#preview').scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  // block paste in edit mode (cells copied from Excel fill to the right and down) and Ctrl+D (the value of the cell above)
  $('#preview').addEventListener('paste', e => {
    const td = e.target.closest('[data-cell]'); if (!td) return;
    const t = (e.clipboardData || window.clipboardData).getData('text'); if (!/[\t\n]/.test(t.trim())) return;
    e.preventDefault();
    const lines = t.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split('\t')), heads = state.data.headers.filter(h => !state.grid.hidden.includes(h));
    const r0 = +td.dataset.cell, c0 = heads.indexOf(td.dataset.col); let n = 0;
    editSheet(() => { lines.forEach((l, i) => { const row = state.data.rows[r0 + i]; if (!row) return; l.forEach((v, j) => { const h = heads[c0 + j]; if (h) { row[h] = parseCell(v); n++; } }); }); });
    toast(`${n} cells pasted`);
  });
  $('#preview').addEventListener('keydown', e => {
    const td = e.target.closest('[data-cell]'); if (!td || !(e.ctrlKey || e.metaKey) || e.key.toLowerCase() !== 'd') return;
    e.preventDefault(); const i = +td.dataset.cell, h = td.dataset.col; if (i < 1) return;
    editSheet(() => { state.data.rows[i][h] = state.data.rows[i - 1][h]; });
  });
  /* rules: column vs column or number (or between two numbers); dates compare as dates */
  const RULE_OPS = { lt: '<', le: '≤', gt: '>', ge: '≥', eq: '=', ne: '≠', between: 'between' };
  // a date column (typed dates or Excel day numbers) compares as days; any other column as numbers
  const dateCols = new Map();
  function ruleValue(r, col) {
    const v = r[col]; if (isMissing(v)) return NaN;
    if (!dateCols.has(col)) dateCols.set(col, dateShare(col) >= 0.6);
    if (dateCols.get(col)) { const d = parseDate(v); return d ? Date.parse(d) / 864e5 : NaN; }
    return Analysis.toNum(v);
  }
  function ruleBreaks(rule) {
    const rows = state.data.rows, out = []; dateCols.clear();
    rows.forEach((r, i) => {
      const a = ruleValue(r, rule.a); if (!isFinite(a)) return;
      if (rule.op === 'between') { if (a < +rule.lo || a > +rule.hi) out.push(i); return; }
      const b = rule.bCol ? ruleValue(r, rule.bCol) : +rule.val; if (!isFinite(b)) return;
      const ok = { lt: a < b, le: a <= b, gt: a > b, ge: a >= b, eq: a === b, ne: a !== b }[rule.op];
      if (!ok) out.push(i);
    });
    return out;
  }
  const ruleText = r => r.op === 'between' ? `${r.a} between ${r.lo} and ${r.hi}` : `${r.a} ${RULE_OPS[r.op]} ${r.bCol || r.val}`;
  function renderRules() {
    const cfg = state.cfg; if (!cfg) return; cfg.rules = cfg.rules || [];
    const h = state.data.headers, sel = (list, v, attr) => `<select ${attr} style="width:auto">${list.map(c => `<option ${c === v ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>`;
    $('#ruleList').innerHTML = cfg.rules.map((r, i) => `<div class="flt" data-ri="${i}">${sel(h, r.a, 'data-rf="a"')}<select data-rf="op" style="width:auto">${Object.entries(RULE_OPS).map(([k, t]) => `<option value="${k}" ${k === r.op ? 'selected' : ''}>${t}</option>`).join('')}</select>
      ${r.op === 'between' ? `<input type="number" data-rf="lo" value="${esc(r.lo ?? '')}" style="width:80px"> and <input type="number" data-rf="hi" value="${esc(r.hi ?? '')}" style="width:80px">`
        : `<select data-rf="bCol" style="width:auto"><option value="">a number…</option>${h.map(c => `<option ${c === r.bCol ? 'selected' : ''}>${esc(c)}</option>`).join('')}</select>${r.bCol ? '' : `<input type="number" data-rf="val" value="${esc(r.val ?? '')}" style="width:90px">`}`}
      <span class="legend-note">${(() => { const n = ruleBreaks(r).length; return n ? `<a href="#" data-rshow="${i}">${n} row${n > 1 ? 's' : ''} break it</a>` : '✓ no row breaks it'; })()}</span><button class="btn ghost small" data-rdel2="${i}" type="button">✕</button></div>`).join('');
    $('#ruleInfo').textContent = cfg.rules.length ? '' : 'No rules yet.';
  }
  $('#ruleAdd').onclick = () => { const h = state.data.headers, n = h.find(c => columnInfo(state.data.rows, c).numeric) || h[0]; state.cfg.rules = state.cfg.rules || []; state.cfg.rules.push({ a: n, op: 'between', lo: 0, hi: 100 }); renderRules(); };
  document.querySelectorAll('[data-rulepreset]').forEach(b => { b.onclick = () => {
    const h = state.data.headers, f = re => h.find(c => re.test(c)), cfg = state.cfg; cfg.rules = cfg.rules || []; const k = b.dataset.rulepreset;
    if (k === 'bp') { const d = f(/^(dbp|diastolic)/i), s = f(/^(sbp|systolic)/i); if (d && s) cfg.rules.push({ a: d, op: 'lt', bCol: s }); else return toast('No SBP / DBP columns found'); }
    if (k === 'dates') { const a = f(/admi/i), d = f(/discharge/i); if (a && d) cfg.rules.push({ a: d, op: 'ge', bCol: a }); else return toast('No admission / discharge date columns found'); }
    if (k === 'age') { const a = f(/^age$/i) || f(/^age[_ (]/i); if (a) cfg.rules.push({ a, op: 'between', lo: 0, hi: 120 }); else return toast('No age column found'); }
    renderRules(); }; });
  $('#ruleList').addEventListener('change', e => { const el = e.target.closest('[data-rf]'); if (!el) return; const r = state.cfg.rules[+el.closest('[data-ri]').dataset.ri]; r[el.dataset.rf] = el.value; if (el.dataset.rf === 'bCol' && el.value) delete r.val; renderRules(); });
  $('#ruleList').addEventListener('click', e => {
    const d = e.target.closest('[data-rdel2]'); if (d) { state.cfg.rules.splice(+d.dataset.rdel2, 1); renderRules(); return; }
    const s = e.target.closest('[data-rshow]'); if (s) { e.preventDefault(); const r = state.cfg.rules[+s.dataset.rshow]; showRows(ruleBreaks(r), `Rows breaking: ${ruleText(r)}`); }
  });
  // duplicates by chosen columns; near matches ignore case and spaces and allow one typing error in text
  const lev1 = (a, b) => { if (Math.abs(a.length - b.length) > 1) return false; let i = 0, j = 0, e = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { i++; j++; continue; } if (++e > 1) return false; if (a.length > b.length) i++; else if (b.length > a.length) j++; else { i++; j++; } } return e + (a.length - i) + (b.length - j) <= 1; };
  $('#dupGo').onclick = () => {
    const cols = [...$('#dupCols').selectedOptions].map(o => o.value); if (!cols.length) { $('#dupInfo').textContent = 'Choose one or more columns.'; return; }
    const fuzzy = $('#dupFuzzy').checked, norm = v => isMissing(v) ? '' : String(v).trim().toLowerCase().replace(/\s+/g, ' ');
    const keys = state.data.rows.map(r => cols.map(c => norm(r[c])));
    const hit = new Set(), groups = [];
    for (let i = 0; i < keys.length; i++) { if (keys[i].every(k => k === '')) continue; const grp = [i];
      // a near match may differ by one letter, never by its numbers (Patient 1 and Patient 2 are different people)
      const digits = t => t.replace(/\D/g, '');
      for (let j = i + 1; j < keys.length; j++) if (!hit.has(j) && keys[i].every((k, c) => k === keys[j][c] || (fuzzy && k.length >= 4 && /[a-z\u0600-\u06FF]/.test(k) && digits(k) === digits(keys[j][c]) && lev1(k, keys[j][c])))) grp.push(j);
      if (grp.length > 1 && !hit.has(i)) { grp.forEach(x => hit.add(x)); groups.push(grp); } }
    $('#dupInfo').innerHTML = groups.length ? `${groups.length} group${groups.length > 1 ? 's' : ''} of possible duplicates (${hit.size} rows): ${groups.slice(0, 4).map(g => 'rows ' + g.map(x => x + 1).join(' & ')).join('; ')}${groups.length > 4 ? ' …' : ''} — <a href="#" id="dupShow">show them</a>` : '✓ No duplicates on these columns.';
    const a = $('#dupShow'); if (a) a.onclick = ev => { ev.preventDefault(); showRows([...hit].sort((x, y) => x - y), `Possible duplicates on ${cols.join(' + ')}`); };
  };
  // missing data: a map of the sheet, Little's MCAR test on the numeric columns, and rows with too many blanks
  $('#missMap').onclick = () => {
    const { headers, rows } = state.data, cv = $('#mapCanvas'), cw = Math.max(6, Math.min(26, Math.floor(900 / headers.length))), rh = Math.max(1, Math.min(6, Math.floor(420 / rows.length))), top = 110, barH = 60;
    cv.width = headers.length * cw + 20; cv.height = top + rows.length * rh + barH + 30;
    const x = cv.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height);
    x.font = '11px sans-serif'; x.fillStyle = '#333';
    headers.forEach((h, j) => { x.save(); x.translate(10 + j * cw + cw / 2 + 4, top - 6); x.rotate(-Math.PI / 3); x.fillText(h.length > 18 ? h.slice(0, 17) + '…' : h, 0, 0); x.restore(); });
    rows.forEach((r, i) => headers.forEach((h, j) => { x.fillStyle = isMissing(r[h]) ? '#C0392B' : '#E8E4EE'; x.fillRect(10 + j * cw, top + i * rh, cw - 1, rh); }));
    const y0 = top + rows.length * rh + 10;
    headers.forEach((h, j) => { const p = rows.filter(r => isMissing(r[h])).length / rows.length; x.fillStyle = '#7B2FBE'; x.fillRect(10 + j * cw, y0 + barH * (1 - p), cw - 1, barH * p); if (p > 0.0001 && cw >= 14) { x.fillStyle = '#333'; x.fillText(Math.round(100 * p) + '', 10 + j * cw, y0 + barH + 12); } });
    const num = headers.filter(h => columnInfo(rows, h).numeric && !(state.cfg && state.cfg.idCols.includes(h)) && rows.some(r => !isMissing(r[h])));
    const M = rows.map(r => num.map(h => Analysis.toNum(r[h])));
    const anyMiss = M.some(r => r.some(v => !isFinite(v)));
    let txt;
    if (num.length < 2) txt = 'Little’s MCAR test needs at least two numeric columns.';
    else if (!anyMiss) txt = 'No missing values in the numeric columns — nothing to test.';
    else { const t = Stats.littleMCAR(M); txt = t ? `<b>Little’s MCAR test</b> (${num.length} numeric columns, ${t.patterns} missing-data patterns): χ²(${t.df}) = ${Analysis.fmt(t.chi2, 2)}, P ${Analysis.fmtP(t.p, 0.05).replace(/\*/g, '').replace(/^(?=\d)/, '= ')}. ${t.p > 0.05 ? 'The missing values may be missing completely at random (MCAR), so analysing the available data is reasonable.' : 'The values are not missing completely at random: who is missing depends on other measurements — say so in the limitations, and consider multiple imputation.'}` : 'The test could not be computed (too few complete data).'; }
    $('#mcarInfo').innerHTML = txt; $('#mapDlg').showModal();
  };
  $('#missRows').onclick = () => {
    const pct = +$('#missPct').value || 50, { headers, rows } = state.data, bad = rows.map((r, i) => [i, headers.filter(h => isMissing(r[h])).length / headers.length]).filter(x => x[1] * 100 > pct).map(x => x[0]);
    if (!bad.length) { $('#missRowInfo').textContent = `No row misses more than ${pct}% of its cells.`; return; }
    if (!confirm(`Delete ${bad.length} row${bad.length > 1 ? 's' : ''} missing more than ${pct}% of their cells?`)) return;
    const del = new Set(bad); editSheet(() => { state.data.rows = rows.filter((_, i) => !del.has(i)); refreshGroups(); }, `Deleted ${bad.length} rows missing more than ${pct}% of their cells`);
    $('#missRowInfo').textContent = `${bad.length} row${bad.length > 1 ? 's' : ''} deleted.`; renderPrep();
  };
  // dates
  $('#dtOrder').onchange = renderStep1Tools;
  $('#dtConvert').onclick = () => {
    const col = $('#dtCol').value, order = $('#dtOrder').value; let n = 0, bad = 0;
    editSheet(() => { state.data.rows.forEach(r => { if (isMissing(r[col])) return; const d = parseDate(r[col], order); if (d) { if (r[col] !== d) n++; r[col] = d; } else bad++; }); }, `Converted ${col} to dates`);
    $('#dtInfo').textContent = `${n} value${n === 1 ? '' : 's'} of ${col} written as yyyy-mm-dd${bad ? `; ${bad} could not be read as dates` : ''}.`; renderStep1Tools();
  };
  $('#dtDiff').onclick = () => {
    const a = $('#dtFrom').value, b = $('#dtTo').value, u = $('#dtUnit').value, order = $('#dtOrder').value; if (a === b) { $('#dtInfo').textContent = 'Choose two different columns.'; return; }
    const div = { days: 1, weeks: 7, months: 30.4375, years: 365.25 }[u], name0 = u === 'years' && /birth|dob/i.test(a) ? 'Age_years' : `${b}_minus_${a}_${u}`;
    let name = name0, k = 2; while (state.data.headers.includes(name)) name = `${name0}_${k++}`;
    let n = 0;
    editSheet(() => { const { headers, rows } = state.data; headers.splice(headers.indexOf(b) + 1, 0, name);
      rows.forEach(r => { const x = parseDate(r[a], order), y = parseDate(r[b], order); r[name] = x && y ? +((Date.parse(y) - Date.parse(x)) / 864e5 / div).toFixed(u === 'days' ? 0 : 1) : null; if (r[name] !== null) n++; });
      state.cfg.variables.push({ ...singleVariable(rows, name, headers.indexOf(name), 'Demographic and baseline data'), id: 'dt' + Date.now().toString(36) }); }, `New column ${name} (${u} from ${a} to ${b})`);
    $('#dtInfo').textContent = `${name} added: ${n} of ${state.data.rows.length} patients have both dates.`; renderStep1Tools();
  };
  // anonymise
  $('#anonGo').onclick = () => {
    const cols = [...$('#anonCols').selectedOptions].map(o => o.value).filter(c => c !== state.cfg.groupCol), how = $('#anonHow').value;
    if (!cols.length) { $('#anonInfo').textContent = 'Choose the columns (not the group column).'; return; }
    if (!confirm(`${how === 'delete' ? 'Delete' : 'Replace with codes'}: ${cols.join(', ')}?`)) return;
    editSheet(() => {
      const { rows } = state.data;
      if (how === 'delete') { state.data.headers = state.data.headers.filter(h => !cols.includes(h)); rows.forEach(r => cols.forEach(c => delete r[c])); state.cfg.variables = state.cfg.variables.filter(v => !v.cols.some(c => cols.includes(c.col))); state.cfg.idCols = state.cfg.idCols.filter(c => !cols.includes(c)); }
      else cols.forEach(c => { const map = new Map(); const pad = String(rows.length).length; rows.forEach(r => { if (isMissing(r[c])) return; const k = String(r[c]).trim(); if (!map.has(k)) map.set(k, 'P' + String(map.size + 1).padStart(Math.max(3, pad), '0')); r[c] = map.get(k); }); });
    }, `Anonymised (${how === 'delete' ? 'deleted' : 'coded'}): ${cols.join(', ')}`);
    $('#anonInfo').textContent = `${cols.length} column${cols.length > 1 ? 's' : ''} ${how === 'delete' ? 'deleted' : 'replaced with codes'}.`; renderPrep();
  };
  // snapshots of the data and setup, kept with the project
  function renderSnaps() {
    const s = state.snapshots || [];
    $('#snapList').innerHTML = s.map((x, i) => `<div class="row" style="gap:6px"><span style="flex:1">${esc(x.name)} <span class="legend-note">${esc(x.time)} · ${x.data.rows.length} rows</span></span><button class="btn ghost small" data-snaprest="${i}" type="button">Restore</button><button class="btn ghost small" data-snapdel="${i}" type="button">✕</button></div>`).join('') || '<span class="legend-note">No snapshots yet.</span>';
    $('#logInfo').textContent = `${(state.cleanLog || []).length} change${(state.cleanLog || []).length === 1 ? '' : 's'} logged`;
  }
  $('#snapSave').onclick = () => { state.snapshots = state.snapshots || []; if (state.snapshots.length >= 8) state.snapshots.shift();
    state.snapshots.push({ name: $('#snapName').value.trim() || `Snapshot ${state.snapshots.length + 1}`, time: new Date().toLocaleString(), data: JSON.parse(JSON.stringify(state.data)), cfg: JSON.parse(JSON.stringify(state.cfg)) });
    $('#snapName').value = ''; renderSnaps(); toast('Snapshot saved'); };
  $('#snapList').addEventListener('click', e => {
    const r = e.target.closest('[data-snaprest]'), d = e.target.closest('[data-snapdel]');
    if (d) { state.snapshots.splice(+d.dataset.snapdel, 1); renderSnaps(); }
    if (r) { const s = state.snapshots[+r.dataset.snaprest]; if (!confirm(`Restore “${s.name}”? The current data are kept in Undo.`)) return; pushUndo(); state.data = JSON.parse(JSON.stringify(s.data)); state.cfg = JSON.parse(JSON.stringify(s.cfg)); state.result = null; logChange(`Restored snapshot “${s.name}”`); renderGrid(); renderPrep(); renderStepper(); toast(`Snapshot “${s.name}” restored`); }
  });
  // cleaning log: every change to the data, with what changed
  function logChange(what) { (state.cleanLog = state.cleanLog || []).push({ time: new Date().toLocaleString(), what }); }
  function describeChange(before, after) {
    const hb = before.headers, ha = after.headers, add = ha.filter(h => !hb.includes(h)), rem = hb.filter(h => !ha.includes(h)), out = [];
    if (add.length) out.push(`added ${add.join(', ')}`); if (rem.length) out.push(`removed ${rem.join(', ')}`);
    if (after.rows.length !== before.rows.length) out.push(`${after.rows.length > before.rows.length ? 'added' : 'removed'} ${Math.abs(after.rows.length - before.rows.length)} rows`);
    else { let n = 0; const per = {}; after.rows.forEach((r, i) => ha.forEach(h => { if (hb.includes(h) && String(before.rows[i][h] ?? '') !== String(r[h] ?? '')) { n++; per[h] = (per[h] || 0) + 1; } }));
      if (n) out.push(`changed ${n} cell${n > 1 ? 's' : ''} (${Object.entries(per).slice(0, 5).map(([h, k]) => `${h}: ${k}`).join(', ')})`); }
    return out.join('; ') || 'no change to the data';
  }
  $('#logXlsx').onclick = () => {
    const log = state.cleanLog || []; if (!log.length) { toast('No change logged yet'); return; }
    const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet([['#', 'Time', 'Change'], ...log.map((l, i) => [i + 1, l.time, l.what])]); ws['!cols'] = [{ wch: 5 }, { wch: 22 }, { wch: 110 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Cleaning log'); XLSX.writeFile(wb, `${baseName()} - Cleaning log.xlsx`);
  };
  // CSV of the current sheet (UTF-8 with a BOM, so Excel shows Arabic and accents)
  $('#gridCsv').onclick = () => { const ws = XLSX.utils.json_to_sheet(state.data.rows, { header: state.data.headers }), csv = XLSX.utils.sheet_to_csv(ws);
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); saveUrl(url, `${baseName()} - edited.csv`); setTimeout(() => URL.revokeObjectURL(url), 5000); };
  // a form: one patient per screen
  let fmRow = 0;
  function fmRender() {
    const { headers, rows } = state.data; fmRow = Math.max(0, Math.min(rows.length - 1, fmRow));
    $('#fmPos').textContent = `${fmRow + 1} of ${rows.length}`;
    $('#fmFields').innerHTML = headers.map(h => `<div><label>${esc(h)}</label><input type="text" data-fm="${esc(h)}" value="${esc(rows[fmRow][h] ?? '')}"></div>`).join('');
  }
  function fmSave() {
    const row = state.data.rows[fmRow]; if (!row) return; const ch = [];
    document.querySelectorAll('#fmFields [data-fm]').forEach(el => { const v = parseCell(el.value); if (String(row[el.dataset.fm] ?? '') !== String(v ?? '')) ch.push([el.dataset.fm, v]); });
    if (ch.length) editSheet(() => { ch.forEach(([h, v]) => { row[h] = v; }); if (ch.some(([h]) => h === state.cfg.groupCol)) refreshGroups(); }, `Form: patient ${fmRow + 1}, ${ch.map(c => c[0]).join(', ')}`);
  }
  $('#gridForm').onclick = () => { fmRow = state.grid.page * (state.grid.per === 'all' ? 0 : +state.grid.per); fmRender(); $('#formDlg').showModal(); };
  $('#fmPrev').onclick = () => { fmSave(); fmRow--; fmRender(); };
  $('#fmNext').onclick = () => { fmSave(); fmRow++; fmRender(); };
  $('#fmNew').onclick = () => { fmSave(); editSheet(() => { state.data.rows.push(Object.fromEntries(state.data.headers.map(h => [h, null]))); }, 'Form: new patient'); fmRow = state.data.rows.length - 1; fmRender(); $('#fmFields input').focus(); };
  $('#fmClose').onclick = () => { fmSave(); $('#formDlg').close(); };
  // random sample
  const readSample = () => { state.cfg.sample = { on: $('#sampleOn').checked, n: +$('#sampleN').value || 30, seed: +$('#sampleSeed').value || 1 }; state.result = null; state.cfg.consort = null; renderFilters(); renderGrid(); };
  ['#sampleOn', '#sampleN', '#sampleSeed'].forEach(id => { $(id).onchange = readSample; });

  /* ---------- step 2, more: warnings, per-variable settings, selection, drag order, tables, categorising, setup CSV, subgroups ---------- */
  // small flags beside each variable: many missing values, a group with fewer than 5, many categories, sparse cells
  function varWarnings(byGroup) {
    const out = {}, n0 = state.data.rows.length;
    state.cfg.variables.forEach(v => {
      if (!v.include) return; const w = []; const c = v.cols[0].col;
      const miss = state.data.rows.filter(r => isMissing(r[c])).length; if (n0 && miss / n0 > 0.2) w.push(['missing', `${Math.round(100 * miss / n0)}% missing values`]);
      if (v.type === 'numeric') { const small = byGroup.filter(rs => rs.filter(r => isFinite(Analysis.toNum(r[c]))).length < 5).length; if (small) w.push(['n<5', `${small} group${small > 1 ? 's have' : ' has'} fewer than 5 values`]); }
      else if (v.kind === 'single') {
        const lv = columnInfo(state.data.rows, c).distinct; if (lv.length > 8) w.push(['many', `${lv.length} categories — merge some?`]);
        if (byGroup.length > 1 && lv.length >= 2 && lv.length <= 8) {
          const t = lv.map(l => byGroup.map(rs => rs.filter(r => String(r[c] ?? '').trim() === l).length)), N = t.flat().reduce((a, b) => a + b, 0);
          const rs = t.map(r => r.reduce((a, b) => a + b, 0)), cs = byGroup.map((_, j) => t.reduce((a, r) => a + r[j], 0));
          const lowE = N ? t.flatMap((r, i) => r.map((_, j) => rs[i] * cs[j] / N)).filter(e => e < 5).length / (lv.length * byGroup.length) : 0;
          if (lowE > 0.2) w.push(['sparse', `${Math.round(100 * lowE)}% of the expected counts are below 5 (Fisher's exact test or merging categories)`]);
        }
      }
      if (w.length) out[v.id] = w;
    });
    return out;
  }
  const varBadges = v => [v.test ? ' test' : '', v.unit ? ' u' : '', v.ordinal ? ' ord' : '', v.transform ? ' tf' : '', v.memo ? ' ℹ' : ''].join('');
  // the settings window of one variable
  let vdVar = null;
  function openVarDlg(id) {
    readUiIntoCfg();
    const v = state.cfg.variables.find(x => x.id === id); if (!v) return; vdVar = v;
    $('#vdTitle').textContent = v.label; $('#vdUnit').value = v.unit || ''; $('#vdDec').value = v.dec ?? ''; $('#vdRole').value = v.role || '';
    $('#vdTf').value = v.transform || ''; $('#vdTf').disabled = v.type !== 'numeric';
    $('#vdOrd').checked = !!v.ordinal; $('#vdOrd').disabled = v.type !== 'categorical'; $('#vdOrdTest').value = v.ordTest || 'rank';
    $('#vdAr').value = v.labelAr || ''; $('#vdMemo').value = v.memo || ''; $('#vdNoSecond').checked = !!v.noSecond; $('#vdMcid').value = v.mcid || ''; $('#vdMcid').disabled = v.type !== 'numeric'; $('#vdNoSecondBox').style.display = v.type === 'numeric' && v.kind === 'single' ? '' : 'none';
    const tests = v.type === 'numeric' ? [['t', "Student's t-test"], ['welch', "Welch's t-test"], ['anova', 'One-way ANOVA'], ['welchanova', "Welch's ANOVA"], ['mw', 'Mann-Whitney U'], ['kw', 'Kruskal-Wallis']]
      : [['chi', 'Chi-square'], ['fisher', "Fisher's exact (2×2)"], ['ffh', 'Fisher-Freeman-Halton (larger tables)']];
    $('#vdTest').innerHTML = `<option value="">Automatic (step 4 settings)</option>` + tests.map(([k, l]) => `<option value="${k}" ${v.test === k ? 'selected' : ''}>${esc(l)}</option>`).join('');
    const lv = v.type === 'categorical' ? (v.levels.length ? v.levels : columnInfo(state.data.rows, v.cols[0].col).distinct) : [];
    $('#vdShowBox').style.display = lv.length === 2 ? '' : 'none';
    $('#vdShow').innerHTML = lv.map(l => `<option ${l === lv[0] ? 'selected' : ''}>${esc(l)}</option>`).join('');
    // merging categories: each category gets a new name; categories with the same new name become one (written as value labels)
    const vl = Analysis.parseValueLabels(v.valueLabels || '');
    $('#vdMerge').innerHTML = v.type === 'categorical' && v.kind === 'single' ? `<label class="f">Merge or rename categories (the sheet keeps its values) — give several categories the same new name to merge them</label>
      <table class="t"><tbody>${lv.map(l => `<tr><td class="mono">${esc(l)}</td><td>→</td><td><input type="text" data-vdm="${esc(l)}" value="${esc(vl[l] ?? '')}" placeholder="${esc(l)}"></td></tr>`).join('')}</tbody></table>` : '';
    const num = state.data.headers.filter(h => columnInfo(state.data.rows, h).numeric && !v.cols.some(c => c.col === h) && h !== state.cfg.groupCol);
    $('#vdCov').innerHTML = num.map(h => `<option ${/base|pre|before|age/i.test(h) && v.cols.some(c => tokens(c.col)[0] === tokens(h)[0]) ? 'selected' : ''}>${esc(h)}</option>`).join('');
    $('#vdAdjBox').style.display = v.type === 'numeric' && v.kind === 'single' && !state.cfg.noGroups ? '' : 'none';
    $('#varDlg').showModal();
  }
  $('#varsTbl').addEventListener('click', e => { const b = e.target.closest('[data-vgear]'); if (b) openVarDlg(b.dataset.vgear); const l = e.target.closest('[data-lvarr]'); if (l) openLevelsDlg(l.dataset.lvarr); });

  /* ---------- arranging the categories (levels) of a categorical variable ---------- */
  const lvValues = v => v.cols.flatMap(c => state.data.rows.map(r => r[c.col])).filter(x => x !== null && x !== undefined && String(x).trim() !== '').map(x => String(x).trim());
  const lvOf = v => v.levels && v.levels.length ? [...v.levels] : columnInfo(state.data.rows, v.cols[0].col).distinct.map(String);
  // a rank for scale words: none → mild → moderate → severe, low → high, never → always; yes before no
  const SCALE = [[/\b(very severe|very high|very good|critical|extreme|always|excellent|grade (iv|4))\b/i, 5], [/\b(very low|very poor|minimal|trace)\b/i, 1],
    [/^(none|nil|never|absent|normal|no pain|negative|grade 0|0)$/i, 0], [/\b(mild|low|slight|light|rarely|seldom|poor|grade (i|1))\b/i, 2],
    [/\b(moderate|medium|intermediate|sometimes|fair|average|grade (ii|2))\b/i, 3], [/\b(severe|high|heavy|often|frequently|good|marked|grade (iii|3))\b/i, 4]];
  const scaleRank = t => { const m = SCALE.find(([re]) => re.test(t)); return m ? m[1] : null; };
  function sortLevels(v, lv, how) {
    const vals = lvValues(v), cnt = {}; vals.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
    const vl = Analysis.parseValueLabels(v.valueLabels || ''), name = l => String(vl[l] ?? l), cmp = (a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
    const out = [...lv];
    if (how === 'az') out.sort((a, b) => cmp(name(a), name(b)));
    else if (how === 'za') out.sort((a, b) => cmp(name(b), name(a)));
    else if (how === 'num') out.sort((a, b) => (isFinite(+a) && isFinite(+b) ? a - b : cmp(a, b)));
    else if (how === 'freq') out.sort((a, b) => (cnt[b] || 0) - (cnt[a] || 0) || cmp(a, b));
    else if (how === 'rare') out.sort((a, b) => (cnt[a] || 0) - (cnt[b] || 0) || cmp(a, b));
    else if (how === 'rev') out.reverse();
    else if (how === 'sheet') { const first = [...new Set(vals)]; out.sort((a, b) => (first.indexOf(a) + 1 || 1e9) - (first.indexOf(b) + 1 || 1e9)); }
    else if (how === 'default') return defaultLevels(lv);
    else if (how === 'smart') {
      if (out.length === 2 && out.some(l => Analysis.POSITIVE.test(name(l)) || Analysis.POSITIVE.test(l))) return defaultLevels(lv);
      const rk = out.map(l => [l, scaleRank(name(l)) ?? scaleRank(l)]);
      if (rk.filter(x => x[1] !== null).length >= 2) return rk.map((x, i) => [x[0], x[1] ?? 99, i]).sort((a, b) => a[1] - b[1] || a[2] - b[2]).map(x => x[0]);
      out.sort((a, b) => cmp(name(a), name(b)));
    }
    return out;
  }
  let lvVar = null, lvCur = [];
  function renderLevelsList() {
    const v = lvVar, vals = lvValues(v), cnt = {}; vals.forEach(x => { cnt[x] = (cnt[x] || 0) + 1; });
    const vl = Analysis.parseValueLabels(v.valueLabels || '');
    $('#lvList').innerHTML = lvCur.map((l, i) => `<li draggable="true" data-lvi="${i}"><span class="h" title="Drag">⋮⋮</span><span class="k">${i + 1}.</span><span>${esc(vl[l] !== undefined && vl[l] !== l ? `${vl[l]} (${l})` : l)}</span>${i === 0 ? '<span class="chip info" title="Reference category">ref</span>' : ''}<span class="legend-note n">n=${cnt[l] || 0}</span>
      <button type="button" class="btn ghost small" data-lvmv="${i},-1" ${i === 0 ? 'disabled' : ''}>↑</button><button type="button" class="btn ghost small" data-lvmv="${i},1" ${i === lvCur.length - 1 ? 'disabled' : ''}>↓</button></li>`).join('');
  }
  function openLevelsDlg(id) {
    readUiIntoCfg(); lvVar = state.cfg.variables.find(v => v.id === id); if (!lvVar) return;
    lvCur = lvOf(lvVar); $('#lvTitle').textContent = `Arrange categories — ${lvVar.label}`; renderLevelsList(); $('#lvDlg').showModal();
  }
  $('#lvSorts').onclick = e => { const b = e.target.closest('[data-lvsort]'); if (!b) return; lvCur = sortLevels(lvVar, lvCur, b.dataset.lvsort); renderLevelsList(); };
  $('#lvList').addEventListener('click', e => { const b = e.target.closest('[data-lvmv]'); if (!b) return; const [i, d] = b.dataset.lvmv.split(',').map(Number), j = i + d; if (j < 0 || j >= lvCur.length) return; [lvCur[i], lvCur[j]] = [lvCur[j], lvCur[i]]; renderLevelsList(); });
  let lvDrag = null;
  $('#lvList').addEventListener('dragstart', e => { const li = e.target.closest('li'); if (!li) return; lvDrag = +li.dataset.lvi; li.classList.add('drag'); e.dataTransfer.effectAllowed = 'move'; try { e.dataTransfer.setData('text/plain', String(lvDrag)); } catch (_) {} });
  $('#lvList').addEventListener('dragover', e => { const li = e.target.closest('li'); if (!li || lvDrag === null) return; e.preventDefault(); document.querySelectorAll('#lvList li.over').forEach(x => x.classList.remove('over')); li.classList.add('over'); });
  $('#lvList').addEventListener('drop', e => { const li = e.target.closest('li'); if (!li || lvDrag === null) return; e.preventDefault(); const to = +li.dataset.lvi, [m] = lvCur.splice(lvDrag, 1); lvCur.splice(to, 0, m); lvDrag = null; renderLevelsList(); });
  $('#lvList').addEventListener('dragend', () => { lvDrag = null; document.querySelectorAll('#lvList li').forEach(x => x.classList.remove('drag', 'over')); });
  $('#lvCancel').onclick = () => $('#lvDlg').close();
  $('#lvSave').onclick = () => { lvVar.levels = [...lvCur]; $('#lvDlg').close(); renderVariables(); toast(`${lvVar.label}: categories ${lvCur.join(' → ')}`); };
  $('#vsLevels').onchange = e => { readUiIntoCfg(); const how = e.target.value; if (!how) return; const list = selVars().filter(v => v.type === 'categorical');
    list.forEach(v => { v.levels = sortLevels(v, lvOf(v), how); }); e.target.value = ''; renderVariables(); toast(list.length ? `Categories arranged in ${list.length} variable${list.length > 1 ? 's' : ''}` : 'No categorical variable selected'); };
  $('#vdCancel').onclick = () => $('#varDlg').close();
  $('#vdSave').onclick = () => {
    const v = vdVar; if (!v) return;
    const set = (k, val) => { if (val === '' || val === false || val === null) delete v[k]; else v[k] = val; };
    set('unit', $('#vdUnit').value.trim()); set('dec', $('#vdDec').value); set('role', $('#vdRole').value); set('transform', v.type === 'numeric' ? $('#vdTf').value : '');
    set('ordinal', v.type === 'categorical' && $('#vdOrd').checked); set('ordTest', $('#vdOrd').checked ? $('#vdOrdTest').value : '');
    set('labelAr', $('#vdAr').value.trim()); set('memo', $('#vdMemo').value.trim()); set('test', $('#vdTest').value); set('noSecond', v.type === 'numeric' && $('#vdNoSecond').checked); set('mcid', v.type === 'numeric' ? $('#vdMcid').value.trim() : '');
    if (v.type === 'categorical' && $('#vdShowBox').style.display !== 'none') { const first = $('#vdShow').value, lv = v.levels.length ? v.levels : columnInfo(state.data.rows, v.cols[0].col).distinct; v.levels = [first, ...lv.filter(l => l !== first)]; }
    const m = [...document.querySelectorAll('[data-vdm]')].filter(el => el.value.trim()).map(el => `${el.dataset.vdm}=${el.value.trim()}`);
    if (document.querySelector('[data-vdm]')) v.valueLabels = m.join(', ');
    $('#varDlg').close(); renderVariables(); toast(`${v.label}: settings saved`);
  };
  $('#vdAdj').onclick = () => {
    const v = vdVar, cov = [...$('#vdCov').selectedOptions].map(o => o.value); if (!cov.length) { toast('Choose one or more covariates'); return; }
    state.cfg.advanced.push({ type: 'ancova', outcome: v.cols[0].col, predictors: cov, positive: '', univariable: false, include: true });
    toast(`ANCOVA of ${v.label} adjusted for ${cov.join(', ')} added to step 8`);
  };
  // selection and the bulk actions on it
  state.varSel = new Set();
  function renderSelBar() {
    const n = state.varSel.size; $('#varSelBar').style.display = n ? '' : 'none'; $('#varSelN').textContent = `${n} selected:`;
    $('#vsFrom').innerHTML = state.cfg.variables.map(v => `<option value="${v.id}">${esc(v.label)}</option>`).join('');
  }
  $('#varsTbl').addEventListener('change', e => { const c = e.target.closest('[data-vsel]'); if (!c) return; c.checked ? state.varSel.add(c.dataset.vsel) : state.varSel.delete(c.dataset.vsel); renderSelBar(); });
  const selVars = () => state.cfg.variables.filter(v => state.varSel.has(v.id));
  $('#vsTableGo').onclick = () => { readUiIntoCfg(); const t = $('#vsTable').value.trim(); if (!t) return; selVars().forEach(v => { if (v.kind === 'repeated') { v.split = true; v.splitTable = t; } else v.table = t; }); renderVariables(); toast(`Table “${t}” set for ${state.varSel.size} variables`); };
  $('#vsType').onchange = e => { readUiIntoCfg(); const t = e.target.value; if (!t) return; selVars().filter(v => v.kind === 'single').forEach(v => { v.type = t; if (t === 'categorical' && !v.levels.length) v.levels = defaultLevels(columnInfo(state.data.rows, v.cols[0].col).distinct); }); e.target.value = ''; renderVariables(); };
  $('#vsCopyGo').onclick = () => { readUiIntoCfg(); const src = state.cfg.variables.find(v => v.id === $('#vsFrom').value); if (!src) return;
    let n = 0; selVars().filter(v => v !== src).forEach(v => { ['dist', 'table', 'dec', 'unit', 'role', 'ordinal', 'ordTest', 'transform', 'chart'].forEach(k => { if (src[k] === undefined) delete v[k]; else if (k !== 'table' || v.kind === 'single') v[k] = src[k]; }); n++; });
    renderVariables(); toast(`Settings of ${src.label} copied to ${n} variable${n === 1 ? '' : 's'}`); };
  $('#vsClear').onclick = () => { state.varSel.clear(); renderVariables(); };
  // drag and drop: the order of the list is the order in the tables
  let dragId = null;
  $('#varsTbl').addEventListener('dragstart', e => { const tr = e.target.closest('tr[data-vid]'); if (!tr) return; dragId = tr.dataset.vid; e.dataTransfer.effectAllowed = 'move'; tr.classList.add('dragging'); });
  $('#varsTbl').addEventListener('dragover', e => { if (dragId) { e.preventDefault(); const tr = e.target.closest('tr[data-vid]'); document.querySelectorAll('#varsTbl tr.dropto').forEach(x => x.classList.remove('dropto')); if (tr) tr.classList.add('dropto'); } });
  $('#varsTbl').addEventListener('drop', e => {
    const tr = e.target.closest('tr[data-vid]'); if (!dragId || !tr) return; e.preventDefault(); readUiIntoCfg();
    const vs = state.cfg.variables, a = vs.findIndex(v => v.id === dragId), b = vs.findIndex(v => v.id === tr.dataset.vid);
    if (a >= 0 && b >= 0 && a !== b) { const [m] = vs.splice(a, 1); vs.splice(b, 0, m); vs.forEach((v, i) => { v.pos = i; }); }
    dragId = null; renderVariables();
  });
  $('#varsTbl').addEventListener('dragend', () => { dragId = null; document.querySelectorAll('#varsTbl tr.dragging,#varsTbl tr.dropto').forEach(x => x.classList.remove('dragging', 'dropto')); });
  // tables by the variable names
  const TABLE_RULES = [['Demographic data', /^(age|sex|gender|bmi|weight|height|wt|ht|occupation|education|residence|marital|smok|parity|gravid|income)/i],
    ['Medical history', /(diabet|dm\b|htn|hypertens|ihd|cardiac|asthma|copd|ckd|renal|liver|comorbid|history|duration|asa\b|previous)/i],
    ['Vital signs', /^(sbp|dbp|map|hr|rr|spo2|temp|pulse|systolic|diastolic|heart.?rate|resp)/i],
    ['Laboratory investigations', /^(hb|wbc|tlc|plt|platelet|crp|esr|alt|ast|alb|bilirubin|creat|urea|na|k|ca|glucose|fbg|rbs|hba1c|ldl|hdl|tg|chol|tsh|t3|t4|inr|pt|ptt|ferritin|vit|d.?dimer|troponin|procalcitonin)/i]];
  $('#autoTables').onclick = () => {
    readUiIntoCfg(); let n = 0;
    state.cfg.variables.filter(v => v.kind === 'single').forEach(v => { const name = v.cols[0].col + ' ' + v.label, hit = TABLE_RULES.find(([, re]) => re.test(v.cols[0].col) || re.test(v.label));
      const t = hit ? hit[0] : 'Outcomes'; if (v.table !== t) { v.table = t; n++; } });
    renderVariables(); toast(`${n} variable${n === 1 ? '' : 's'} assigned to tables by their names — adjust any of them in the Table column`);
  };
  // a numeric variable cut at its median, tertiles or quartiles into a new column
  $('#qGo').onclick = () => {
    readUiIntoCfg(); const v = state.cfg.variables.find(x => x.id === $('#qVar').value); if (!v) return;
    const k = +$('#qHow').value, col = v.cols[0].col, x = state.data.rows.map(r => Analysis.toNum(r[col])).filter(isFinite).sort((a, b) => a - b);
    const cuts = Array.from({ length: k - 1 }, (_, i) => Stats.quantile(x, (i + 1) / k)), f = c => Analysis.fmt(c, 2);
    const names = k === 2 ? [`≤ ${f(cuts[0])}`, `> ${f(cuts[0])}`] : Array.from({ length: k }, (_, i) => `${['Q', 'T'][k === 3 ? 1 : 0]}${i + 1} (${i === 0 ? `≤ ${f(cuts[0])}` : i === k - 1 ? `> ${f(cuts[k - 2])}` : `${f(cuts[i - 1])}–${f(cuts[i])}`})`);
    let name = `${col}_${k === 2 ? 'median_split' : k === 3 ? 'tertiles' : 'quartiles'}`, j = 2; while (state.data.headers.includes(name)) name = `${name}_${j++}`;
    editSheet(() => { const { headers, rows } = state.data; headers.splice(headers.indexOf(col) + 1, 0, name);
      rows.forEach(r => { const n = Analysis.toNum(r[col]); r[name] = isFinite(n) ? names[cuts.filter(c => n > c).length] : null; });
      state.cfg.variables.push({ ...singleVariable(rows, name, headers.indexOf(name), v.table || 'Other outcomes'), id: 'q' + Date.now().toString(36), type: 'categorical', levels: names, label: `${v.label.replace(/\s*\([^)]*\)\s*$/, '')} ${k === 2 ? 'groups (median split)' : k === 3 ? 'tertiles' : 'quartiles'}` }); }, `New column ${name}`);
    renderVariables(); toast(`${name} added: ${names.join(', ')}`);
  };
  // the setup as CSV (edit in Excel, read back by column)
  const SETUP_COLS = ['column', 'include', 'label', 'type', 'table', 'levels', 'valueLabels', 'unit', 'dec', 'role', 'ordinal', 'transform', 'note', 'memo'];
  $('#setupCsv').onclick = () => { readUiIntoCfg();
    const aoa = [SETUP_COLS, ...state.cfg.variables.filter(v => v.kind === 'single').map(v => [v.cols[0].col, v.include ? 'yes' : 'no', v.label, v.type, v.table, (v.levels || []).join('; '), v.valueLabels || '', v.unit || '', v.dec ?? '', v.role || '', v.ordinal ? (v.ordTest || 'rank') : '', v.transform || '', v.note || '', v.memo || ''])];
    const csv = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet(aoa)), url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })); saveUrl(url, `${baseName()} - Variable setup.csv`); setTimeout(() => URL.revokeObjectURL(url), 5000); };
  $('#setupCsvIn').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    const p = parseDelimited(new TextDecoder().decode(await f.arrayBuffer()), 'auto', '.'), head = p.aoa[0].map(h => String(h).trim());
    let n = 0;
    p.aoa.slice(1).forEach(r => { const o = Object.fromEntries(head.map((h, i) => [h, r[i] === null || r[i] === undefined ? '' : String(r[i]).trim()]));
      const v = state.cfg.variables.find(x => x.kind === 'single' && x.cols[0].col === o.column); if (!v) return;
      if (o.include) v.include = /^(yes|1|true|y)$/i.test(o.include); if (o.label) v.label = o.label; if (/^(numeric|categorical)$/.test(o.type)) v.type = o.type; if (o.table) v.table = o.table;
      if (o.levels) v.levels = o.levels.split(';').map(x => x.trim()).filter(Boolean); v.valueLabels = o.valueLabels || v.valueLabels;
      ['unit', 'dec', 'role', 'transform', 'note', 'memo'].forEach(k => { if (o[k] !== undefined) { if (o[k] === '') delete v[k]; else v[k] = o[k]; } });
      if (o.ordinal !== undefined) { if (o.ordinal) { v.ordinal = true; v.ordTest = o.ordinal === 'trend' ? 'trend' : 'rank'; } else { delete v.ordinal; delete v.ordTest; } }
      n++; });
    renderVariables(); toast(`Setup read: ${n} variable${n === 1 ? '' : 's'} updated`);
  };
  // groups: merge one into another, and the control group first
  $('#groupsTbl').addEventListener('change', e => {
    const m = e.target.closest('[data-gmerge]'), c = e.target.closest('[data-gctrl]'), cfg = state.cfg;
    if (m) { readUiIntoCfg(); if (m.value) cfg.groupMerge[m.dataset.gmerge] = m.value; else delete cfg.groupMerge[m.dataset.gmerge]; cfg.consort = null; renderVariables(); toast(m.value ? `${cfg.groupLabels[m.dataset.gmerge]} is analysed as part of ${cfg.groupLabels[m.value]}` : 'Groups kept apart'); }
    if (c) { readUiIntoCfg(); const g = c.dataset.gctrl; cfg.groupOrder = [g, ...cfg.groupOrder.filter(x => x !== g)]; cfg.consort = null; renderVariables(); toast(`${cfg.groupLabels[g]} is the control group (first in tables)`); }
  });
  // subgroup analysis
  function renderSubgroup() {
    const cfg = state.cfg, rows = state.data.rows, sg = cfg.subgroup || {};
    const on = subCols(sg), cands = subCands();
    $('#subCols').innerHTML = cands.length ? cands.map(h => `<label><input type="checkbox" data-subcol="${esc(h)}" ${on.includes(h) ? 'checked' : ''}>${esc(Analysis.columnLabel(cfg, h))}${h === cfg.groupCol ? ' <span class="legend-note">group</span>' : ''} <span class="legend-note">${columnInfo(rows, h).distinct.length}</span></label>`).join('')
      : '<span class="legend-note">No categorical variables.</span>';
    $('#subOverall').checked = sg.overall !== false;
    const qv = cfg.variables.filter(v => v.kind === 'single' && v.type === 'numeric');
    $('#qVar').innerHTML = qv.map(v => `<option value="${v.id}">${esc(v.label)}</option>`).join('');
    renderSelBar();
  }
  // the columns of the subgroup analysis (older setups keep one column in `col`), and the categorical columns that can be chosen: the group variable and any column of 2 to 12 categories
  const subCols = sg => !sg ? [] : Array.isArray(sg.cols) ? sg.cols : sg.col ? [sg.col] : [];
  function subCands() {
    const cfg = state.cfg, rows = state.data.rows;
    return state.data.headers.filter(h => !cfg.idCols.includes(h) && (h === cfg.groupCol || ((n => n >= 2 && n <= 12)(columnInfo(rows, h).distinct.length) && Analysis.columnKind(cfg, rows, h) === 'categorical')));
  }
  const readSub = () => { state.cfg.subgroup = { cols: [...document.querySelectorAll('[data-subcol]')].filter(x => x.checked).map(x => x.dataset.subcol), overall: $('#subOverall').checked }; state.cfg.consort = null; };
  $('#subCols').onchange = $('#subOverall').onchange = readSub;
  $('#subAll').onclick = () => { document.querySelectorAll('[data-subcol]').forEach(x => { x.checked = true; }); readSub(); };
  $('#subNone').onclick = () => { document.querySelectorAll('[data-subcol]').forEach(x => { x.checked = false; }); readSub(); };

  /* ---------- step 3 tools: time values, templates, derived outcomes, merging timepoints, overview tables, every patient over time ---------- */
  function guessTime(t) { const s = String(t).toLowerCase(); if (/^(baseline|base|bl|pre|preop|before|t0|v0|d0|day0)$/.test(s)) return '0';
    let m = /^(\d+(?:\.\d+)?)([a-z]+)$/.exec(s); if (m) return m[1]; m = /^([a-z]+)(\d+(?:\.\d+)?)$/.exec(s); return m ? m[2] : ''; }
  const TPL = { T: i => `T${i}`, prepost: i => ['Before', 'After'][i] || `After ${i}`, periop: i => ['Pre-op', 'Intra-op', 'Post-op'][i] || `Day ${i - 2}`, visit: i => i ? `Visit ${i}` : 'Baseline', month: i => ['Baseline', 'Month 1', 'Month 3', 'Month 6', 'Month 12'][i] || `Month ${i}` };
  $('#tpTemplate').onchange = e => { const f = TPL[e.target.value]; if (!f) return; readUiIntoCfg(); state.cfg.tpOrder.forEach((t, i) => { state.cfg.tpLabels[t] = f(i); }); e.target.value = ''; renderTimepoints(); toast('Labels set in order — adjust any of them'); };
  $('#tpReverse').onclick = () => { readUiIntoCfg(); state.cfg.tpOrder.reverse(); state.cfg.variables.filter(v => v.kind === 'repeated' && v.ownOrder).forEach(v => v.cols.reverse()); renderTimepoints(); };
  function renderTpTools() {
    const cfg = state.cfg, reps = cfg.variables.filter(v => v.kind === 'repeated'), rows = state.data.rows;
    const opt = (list, sel) => list.map(v => `<option value="${v.id}" ${v.id === sel ? 'selected' : ''}>${esc(v.label)}</option>`).join('');
    $('#drVar').innerHTML = opt(reps, $('#drVar').value); $('#spVar').innerHTML = opt(reps, $('#spVar').value);
    $('#mgFrom').innerHTML = $('#mgTo').innerHTML = cfg.tpOrder.map(t => `<option value="${esc(t)}">${esc(cfg.tpLabels[t] || t)}</option>`).join('');
    if (cfg.tpOrder.length > 1) $('#mgTo').selectedIndex = 1;
    // outcomes × timepoints, and outcomes that do not share the same timepoints
    $('#tpMatrix').innerHTML = reps.length ? `<thead><tr><th>Outcome</th>${cfg.tpOrder.map(t => `<th>${esc(cfg.tpLabels[t] || t)}</th>`).join('')}</tr></thead><tbody>${reps.map(v => `<tr><td class="b">${esc(v.label)}</td>${cfg.tpOrder.map(t => { const i = v.cols.findIndex(c => c.tp === t); return `<td style="text-align:center">${i < 0 ? '' : `<input type="checkbox" data-mx="${v.id}:${i}" ${v.cols[i].include !== false ? 'checked' : ''}>`}</td>`; }).join('')}</tr>`).join('')}</tbody>` : '';
    const sets = reps.map(v => v.cols.filter(c => c.include !== false).map(c => c.tp).join('|')), uneq = new Set(sets).size > 1;
    $('#tpWarn').textContent = uneq ? '⚠ The outcomes do not all use the same timepoints — check that this is intended.' : reps.length > 1 ? '✓ Every outcome uses the same timepoints.' : '';
    // missing values per timepoint and group
    const groups = activeGroups();
    $('#tpMissing').innerHTML = reps.length ? `<thead><tr><th>Outcome · timepoint</th>${groups.map(g => `<th>${esc(cfg.groupLabels[g] || g)}</th>`).join('')}</tr></thead><tbody>${reps.flatMap(v => v.cols.filter(c => c.include !== false).map(c => `<tr><td>${esc(v.label)} · ${esc(colTp(c))}</td>${groups.map(g => { const rs = rows.filter(r => Analysis.groupOf(cfg, r) === g), m = rs.filter(r => isMissing(r[c.col])).length; return `<td class="${m ? 'miss-n' : ''}">${m} of ${rs.length}</td>`; }).join('')}</tr>`)).join('')}</tbody>` : '';
    drawSpaghetti();
  }
  $('#tpMatrix').addEventListener('change', e => { const c = e.target.closest('[data-mx]'); if (!c) return; const [id, i] = c.dataset.mx.split(':'), v = state.cfg.variables.find(x => x.id === id); v.cols[+i].include = c.checked; renderTpVars(); renderTpTools(); });
  function drawSpaghetti() {
    const cfg = state.cfg, v = cfg.variables.find(x => x.id === $('#spVar').value); if (!v) { $('#spImg').removeAttribute('src'); return; }
    const cols = v.cols.filter(c => c.include !== false), groups = activeGroups(), o = cfg.options;
    const mats = groups.map(g => state.data.rows.filter(r => Analysis.groupOf(cfg, r) === g).map(r => cols.map(c => Analysis.toNum(r[c.col]))).filter(a => a.filter(isFinite).length >= 2).map(a => a.map(x => isFinite(x) ? x : NaN)));
    const spec = { type: 'line', categories: cols.map(colTp), yLabel: v.label, xLabel: 'Time', individual: mats.map(Y => Y.filter(a => a.every(isFinite))), legend: groups.length > 1,
      series: groups.map((g, i) => ({ name: cfg.groupLabels[g] || g, values: cols.map((_, t) => Stats.mean(mats[i].map(a => a[t]).filter(isFinite))), err: cols.map(() => null) })) };
    try { $('#spImg').src = Charts.draw(spec, chartPalette(o), { ...chartStyle(o), res: 1 }).toDataURL('image/png'); } catch (e) { console.error(e); }
  }
  $('#spVar').onchange = drawSpaghetti;
  $('#drKind').onchange = () => { $('#drThrBox').style.display = $('#drKind').value === 'ttt' ? '' : 'none'; };
  $('#drGo').onclick = () => {
    readUiIntoCfg(); const cfg = state.cfg, v = cfg.variables.find(x => x.id === $('#drVar').value); if (!v) return;
    const cols = v.cols.filter(c => c.include !== false), kind = $('#drKind').value, tv = cols.map(c => cfg.tpTime[c.tp]), real = tv.every(x => x !== undefined && isFinite(x)), tt = real ? tv : cols.map((_, i) => i);
    const thr = +$('#drThr').value, le = $('#drDir').value === 'le';
    const NAME = { auc: 'AUC', max: 'peak', min: 'lowest', tmax: 'time_of_peak', mean: 'mean', change: 'change_last_first', ttt: `time_to_${le ? 'le' : 'ge'}_${thr}` }[kind];
    const base = tokens(cols[0].col).filter(t => !TP_RE.test(t)).join('_') || 'outcome';
    let name = `${base}_${NAME}`, k = 2; while (state.data.headers.includes(name)) name = `${base}_${NAME}_${k++}`;
    const calc = a => { const ok = a.map((x, i) => [tt[i], x]).filter(p => isFinite(p[1])); if (!ok.length) return null;
      if (kind === 'auc') { if (ok.length < cols.length) return null; return +a.slice(1).reduce((s2, y, i) => s2 + (y + a[i]) / 2 * (tt[i + 1] - tt[i]), 0).toFixed(3); }
      if (kind === 'max') return Math.max(...ok.map(p => p[1])); if (kind === 'min') return Math.min(...ok.map(p => p[1]));
      if (kind === 'tmax') { const m = Math.max(...ok.map(p => p[1])); return ok.find(p => p[1] === m)[0]; }
      if (kind === 'mean') return +(ok.reduce((s2, p) => s2 + p[1], 0) / ok.length).toFixed(3);
      if (kind === 'change') return ok.length >= 2 ? +(ok[ok.length - 1][1] - ok[0][1]).toFixed(3) : null;
      const hit = ok.find(p => le ? p[1] <= thr : p[1] >= thr); return hit ? hit[0] : null; };
    editSheet(() => { const { headers, rows } = state.data; headers.splice(headers.indexOf(cols[cols.length - 1].col) + 1, 0, name);
      rows.forEach(r => { r[name] = calc(cols.map(c => Analysis.toNum(r[c.col]))); });
      cfg.variables.push({ ...singleVariable(rows, name, headers.indexOf(name), 'Other outcomes'), id: 'dr' + Date.now().toString(36), type: 'numeric', label: `${v.label}: ${{ auc: 'area under the curve', max: 'peak value', min: 'lowest value', tmax: 'time of the peak', mean: 'mean over time', change: 'change (last − first)', ttt: `time to reach ${le ? '≤' : '≥'} ${thr}` }[kind]}` }); }, `New column ${name}`);
    $('#drInfo').textContent = `${name} added (${real ? 'with the time values' : 'timepoints numbered 0, 1, 2 …'}); it is analysed as a single variable in step 2.`;
  };
  $('#mgGo').onclick = () => {
    readUiIntoCfg(); const a = $('#mgFrom').value, b = $('#mgTo').value, cfg = state.cfg; if (a === b) { toast('Choose two different timepoints'); return; }
    let n = 0;
    editSheet(() => { cfg.variables.filter(v => v.kind === 'repeated').forEach(v => { const ca = v.cols.find(c => c.tp === a), cb = v.cols.find(c => c.tp === b); if (!ca) return;
      if (!cb) { ca.tp = b; return; }
      state.data.rows.forEach(r => { if (isMissing(r[cb.col]) && !isMissing(r[ca.col])) { r[cb.col] = r[ca.col]; n++; } });
      v.cols = v.cols.filter(c => c !== ca); }); cfg.tpOrder = cfg.tpOrder.filter(t => t !== a || cfg.variables.some(v => v.kind === 'repeated' && v.cols.some(c => c.tp === a))); }, `Merged timepoint ${a} into ${b}`);
    renderTimepoints(); toast(`${a} merged into ${b}: ${n} empty cell${n === 1 ? '' : 's'} filled`);
  };
  // after the analysis: the primary endpoint in bold, and line charts spaced by the real time between timepoints
  function postRepeated(res, cfg) {
    res.sections.forEach(s => {
      const v = s.vid && cfg.variables.find(x => x.id === s.vid); if (!v) return;
      const cols = v.cols.filter(c => c.include !== false && (cfg.tpInclude || {})[c.tp] !== false);
      if (v.primaryTp !== undefined && v.primaryTp !== '' && v.cols[+v.primaryTp]) {
        const c = v.cols[+v.primaryTp], lab = c.label || cfg.tpLabels[c.tp] || c.tp;
        let hit = false; s.rows.forEach(r => { if ((r[0].t || []).join(' ') === lab || (r[0].t || []).join(' ').endsWith(': ' + lab)) { r.forEach(cell => { cell.b = true; }); hit = true; } });
        if (hit) s.footnote = s.footnote.replace(/\.$/, '') + `, Bold: ${lab}, the primary endpoint.`;
      }
      const tv = cols.map(c => (cfg.tpTime || {})[c.tp]);
      if (tv.length > 1 && tv.every(x => x !== undefined && isFinite(x))) s.figures.forEach(f => { if (f.spec && f.spec.type === 'line' && f.spec.categories && f.spec.categories.length === tv.length) f.spec.xValues = tv.map(Number); });
    });
  }
  /* ---------- defaults for one step: every option whose control is on that step ---------- */
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-reset]'); if (!b || !state.cfg) return;
    const n = +b.dataset.reset, panel = $('#p' + n);
    if (!confirm(`Set every option of step ${n} back to its default?`)) return;
    const o = state.cfg.options;
    let k0 = 0;
    for (const [k, [id]] of Object.entries(OPTION_FIELDS)) { const el = $('#' + id); if (el && panel.contains(el)) { o[k] = Array.isArray(DEFAULT_OPTIONS[k]) ? [...DEFAULT_OPTIONS[k]] : DEFAULT_OPTIONS[k]; k0++; } }
    if (n === 7) o.customColors = [...DEFAULT_OPTIONS.customColors];
    renderOptions();
    if (n === 4) renderTestPlan(); if (n === 5) renderTablePreview(); if (n === 6) renderCommentPreview(); if (n === 7) { renderFigDesign(); schedulePreview(); }
    toast(`${k0} options of step ${n} back to their defaults`);
  });
  /* ---------- tidy column names: one clean, unique name per column; the setup follows ---------- */
  $('#tidyNames').onclick = () => {
    const tidy = h => String(h).replace(/[\r\n\t]+/g, ' ').trim().replace(/[^\p{L}\p{N}_().%\-/\s]+/gu, ' ').trim().replace(/\s+/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '') || 'Column';
    const heads = state.data.headers, used = new Set(), map = [];
    heads.forEach(h => { let n = tidy(h), k = 2; while (used.has(n.toLowerCase())) n = `${tidy(h)}_${k++}`; used.add(n.toLowerCase()); if (n !== h) map.push([h, n]); });
    if (!map.length) { $('#tidyInfo').textContent = 'The column names are already tidy.'; return; }
    editSheet(() => {
      const ren = Object.fromEntries(map);
      state.data.rows = state.data.rows.map(r => Object.fromEntries(heads.map(h => [ren[h] || h, r[h]])));
      state.data.headers = heads.map(h => ren[h] || h);
      map.forEach(([a, b]) => replaceCol(state.cfg, a, b));
    });
    const gained = newRepeated(); renderPrep(); renderGrid();
    $('#tidyInfo').textContent = `${map.length} name${map.length > 1 ? 's' : ''} tidied: ${map.slice(0, 4).map(([a, b]) => `“${a}” → ${b}`).join(', ')}${map.length > 4 ? ' …' : ''}${gained ? ` — ${gained} repeated measure${gained > 1 ? 's' : ''} found` : ''}.`;
  };
  /* ---------- fill down: empty cells take the value above (merged cells, group written once per block) ---------- */
  const fillCount = col => { let last = null, n = 0; state.data.rows.forEach(r => { if (!isMissing(r[col])) last = r[col]; else if (last !== null) n++; }); return n; };
  function renderFill() {
    const h = state.data.headers, best = h.slice().sort((a, b) => fillCount(b) - fillCount(a))[0], cur = h.includes($('#fdCol').value) ? $('#fdCol').value : best;
    $('#fdCol').innerHTML = h.map(c => `<option ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join('');
    const n = fillCount(cur); $('#fdInfo').textContent = n ? `${n} empty cell${n > 1 ? 's' : ''} would be filled` : 'No empty cell below a value in this column.'; $('#fdGo').disabled = !n;
  }
  $('#gridFill').onclick = () => { if (toggleTool('fillBox')) renderFill(); };
  $('#fdCol').onchange = renderFill;
  $('#fdGo').onclick = () => {
    const col = $('#fdCol').value, n = fillCount(col); let last = null;
    editSheet(() => { state.data.rows.forEach(r => { if (!isMissing(r[col])) last = r[col]; else if (last !== null) r[col] = last; }); if (col === state.cfg.groupCol) refreshGroups(); });
    renderFill(); toast(`${n} cell${n > 1 ? 's' : ''} filled in ${col}`);
  };
  /* ---------- split a column at a separator (120/80 → SBP, DBP) ---------- */
  const SPLIT_RE = { '/': /\s*\/\s*/, '-': /\s*-\s*/, ',': /\s*,\s*/, ';': /\s*;\s*/, ' ': /\s+/, x: /\s*[x×]\s*/i };
  function splitParts(v, sep) { if (isMissing(v)) return []; const t = String(v).trim(); return sep === '-' ? t.split(/(?<=\S)\s*-\s*(?=\S)/) : t.split(SPLIT_RE[sep]); }
  function renderSplit() {
    const h = state.data.headers, rows = state.data.rows;
    // the first text column whose values hold a separator, else the first column
    const guess = h.find(c => rows.filter(r => /\d\s*\/\s*\d/.test(String(r[c] ?? ''))).length > rows.length * 0.3) || h.find(c => !columnInfo(rows, c).numeric) || h[0];
    if (!h.includes($('#spCol').value)) $('#spCol').innerHTML = h.map(c => `<option ${c === guess ? 'selected' : ''}>${esc(c)}</option>`).join('');
    else { const cur = $('#spCol').value; $('#spCol').innerHTML = h.map(c => `<option ${c === cur ? 'selected' : ''}>${esc(c)}</option>`).join(''); }
    splitPreview();
  }
  function splitPreview() {
    const col = $('#spCol').value, sep = $('#spSep').value, rows = state.data.rows;
    const parts = rows.map(r => splitParts(r[col], sep)), n = Math.max(0, ...parts.map(p => p.length));
    const ex = rows.map(r => r[col]).filter(v => !isMissing(v)).slice(0, 3);
    if (!$('#spNames').dataset.touched) $('#spNames').value = /^(bp|blood.?pressure)/i.test(col) && n === 2 ? 'SBP, DBP' : Array.from({ length: n }, (_, i) => `${col}_${i + 1}`).join(', ');
    $('#spInfo').textContent = n > 1 ? `${n} parts: ${ex.map(v => `“${v}” → ${splitParts(v, sep).join(' | ')}`).join(' · ')}` : 'No value contains this separator.';
    $('#spGo').disabled = n < 2;
  }
  $('#gridSplit').onclick = () => { if (toggleTool('splitBox')) { $('#spNames').dataset.touched = ''; renderSplit(); } };
  $('#spCol').onchange = () => { $('#spNames').dataset.touched = ''; splitPreview(); };
  $('#spSep').onchange = () => { $('#spNames').dataset.touched = ''; splitPreview(); };
  $('#spNames').oninput = () => { $('#spNames').dataset.touched = '1'; };
  $('#spGo').onclick = () => {
    const col = $('#spCol').value, sep = $('#spSep').value, keep = $('#spKeep').checked, rows = state.data.rows;
    const parts = rows.map(r => splitParts(r[col], sep)), n = Math.max(0, ...parts.map(p => p.length)); if (n < 2) return;
    const names = $('#spNames').value.split(',').map(x => x.trim()).filter(Boolean), headers = state.data.headers;
    const made = Array.from({ length: n }, (_, i) => { let nm = names[i] || `${col}_${i + 1}`, k = 2; while (headers.includes(nm) && nm !== col) nm = `${names[i] || col + '_' + (i + 1)}_${k++}`; return nm; });
    editSheet(() => {
      rows.forEach((r, ri) => made.forEach((nm, i) => { const v = parts[ri][i]; r[nm] = v === undefined || v === '' ? null : parseCell(v); }));
      const at = headers.indexOf(col);
      headers.splice(at + 1, 0, ...made);
      if (!keep) { headers.splice(at, 1); rows.forEach(r => delete r[col]); state.cfg.variables = state.cfg.variables.filter(v => !v.cols.some(c => c.col === col)); }
      made.forEach(nm => state.cfg.variables.push({ ...singleVariable(rows, nm, headers.indexOf(nm), 'Other outcomes'), id: 'sp' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6) }));
    });
    newRepeated(); renderPrep(); toggleTool('splitBox');
    toast(`${col} split into ${made.join(', ')}${keep ? '' : ' (original column removed)'}`);
  };
  /* ---------- long to wide: one row per visit → one row per patient ---------- */
  function renderReshape() {
    const h = state.data.headers, rows = state.data.rows, cfg = state.cfg;
    const repeats = x => new Set(rows.map(r => String(r[x] ?? ''))).size < rows.length;
    const id = h.find(x => /^(id|patient|code|mrn|file)/i.test(x)) || (cfg && cfg.idCols[0]) || h[0];
    const time = h.find(x => /visit|time|week|month|day|period|occasion/i.test(x) && x !== id) || h.find(x => x !== id && !columnInfo(rows, x).numeric && columnInfo(rows, x).distinct.length <= 12) || h[1];
    $('#rsId').innerHTML = h.map(x => `<option ${x === id ? 'selected' : ''}>${esc(x)}</option>`).join('');
    $('#rsTime').innerHTML = h.map(x => `<option ${x === time ? 'selected' : ''}>${esc(x)}</option>`).join('');
    renderReshapeVals();
    if (!repeats(id)) $('#rsInfo').textContent = `Each ${id} appears once — the sheet is already one row per patient.`;
  }
  // value columns: numeric columns that change within a patient
  function renderReshapeVals() {
    const id = $('#rsId').value, time = $('#rsTime').value, rows = state.data.rows, by = new Map();
    rows.forEach(r => { const k = String(r[id] ?? ''); if (!by.has(k)) by.set(k, []); by.get(k).push(r); });
    const varies = x => [...by.values()].some(rs => new Set(rs.map(r => String(r[x] ?? ''))).size > 1);
    $('#rsVals').innerHTML = state.data.headers.filter(x => x !== id && x !== time).map(x => `<label class="check" style="margin:0"><input type="checkbox" data-rsv="${esc(x)}" ${varies(x) ? 'checked' : ''}><span>${esc(x)}</span></label>`).join('');
    const times = [...new Set(rows.map(r => r[time]).filter(v => !isMissing(v)).map(String))];
    $('#rsInfo').textContent = `${by.size} patients × ${times.length} visits (${times.slice(0, 8).join(', ')}${times.length > 8 ? ' …' : ''})${times.length > 8 ? ' — many visit names: recode them first?' : ''}`;
  }
  $('#gridReshape').onclick = () => { if (toggleTool('reshapeBox')) renderReshape(); };
  $('#rsId').onchange = renderReshapeVals; $('#rsTime').onchange = renderReshapeVals;
  $('#rsGo').onclick = () => {
    const id = $('#rsId').value, time = $('#rsTime').value, vals = [...document.querySelectorAll('[data-rsv]:checked')].map(el => el.dataset.rsv);
    if (id === time) { toast('Choose different ID and visit columns'); return; }
    if (!vals.length) { toast('Tick the values measured at each visit'); return; }
    // visit windows: "0=Baseline; 25-35=Month 1" turn a day number into a visit; values outside every window are left out
    const wins = $('#rsWin').value.split(';').map(p => p.trim()).filter(Boolean).map(p => { const m = /^(-?[\d.]+)\s*(?:-\s*(-?[\d.]+))?\s*=\s*(.+)$/.exec(p); return m ? { lo: +m[1], hi: m[2] !== undefined ? +m[2] : +m[1], label: m[3].trim() } : null; }).filter(Boolean);
    const tl = r => { if (!wins.length) return isMissing(r[time]) ? '' : String(r[time]); const n = Analysis.toNum(r[time]); const w = wins.find(x => n >= x.lo && n <= x.hi); return w ? w.label : ''; };
    const rows = state.data.rows, times = wins.length ? wins.map(w => w.label).filter((l, i, a) => a.indexOf(l) === i && rows.some(r => tl(r) === l)) : [...new Set(rows.map(r => r[time]).filter(v => !isMissing(v)).map(String))];
    const keep = state.data.headers.filter(x => x !== time && !vals.includes(x)), by = new Map();
    let clash = 0;
    rows.forEach(r => { const k = String(r[id] ?? '').trim(); if (!k) return;
      if (!by.has(k)) by.set(k, Object.fromEntries(keep.map(x => [x, r[x]])));
      const o = by.get(k), t = tl(r);
      keep.forEach(x => { if (isMissing(o[x]) && !isMissing(r[x])) o[x] = r[x]; });
      if (t) vals.forEach(v => { const c = `${v}_${t}`; if (!isMissing(o[c]) && !isMissing(r[v])) clash++; if (!isMissing(r[v])) o[c] = r[v]; }); });
    const headers = [...keep, ...vals.flatMap(v => times.map(t => `${v}_${t}`))];
    editSheet(() => {
      state.data = { headers, rows: [...by.values()].map(o => Object.fromEntries(headers.map(x => [x, o[x] ?? null]))) };
      state.cfg = detect(state.data);
    });
    renderPrep(); toggleTool('reshapeBox');
    toast(`${by.size} patients × ${times.length} visits → ${headers.length} columns${clash ? ` (${clash} repeated visit value${clash > 1 ? 's' : ''}: the later row was kept)` : ''}`);
  };
  $('#checkBox').addEventListener('click', e => {
    const q = e.target.closest('[data-chkq]'), fx = e.target.closest('[data-chkfix]');
    if (q) { state.grid.q = q.dataset.chkq; $('#gridSearch').value = q.dataset.chkq; state.grid.page = 0; renderGrid(); }
    if (fx) {
      const list = fx.dataset.chkfix === 'all' ? state.checkIssues.filter(x => x.fix) : [state.checkIssues[+fx.dataset.chkfix]];
      editSheet(() => { list.forEach(x => applyFix(x.fix)); if (state.cfg) {
        // a column that became numbers (units, missing codes removed) is analysed as numbers again
        state.cfg.variables.forEach(v => { if (v.kind === 'single' && list.some(x => x.fix.col === v.cols[0].col && ['units', 'missWords', 'missCodes'].includes(x.fix.kind))) {
          const t = singleVariable(state.data.rows, v.cols[0].col, v.pos, v.table); if (t.type !== v.type) { v.type = t.type; v.levels = t.levels; } } }); refreshGroups(); state.cfg.variables.forEach(v => { if (v.type === 'categorical' && list.some(x => v.cols.some(c => c.col === x.fix.col))) v.levels = defaultLevels(columnInfo(state.data.rows, v.cols[0].col).distinct); }); } });
      const gained = state.cfg ? newRepeated() : 0;
      renderCheck(); renderGrid(); toast(`Fixed${gained ? ` — ${gained} repeated measure${gained > 1 ? 's' : ''} found in the cleaned columns` : ''} — ↶ Undo in edit mode to go back`);
    }
  });

  /* ---------- auto-detection ---------- */
  function columnInfo(rows, col) {
    const vals = rows.map(r => r[col]).filter(v => v !== null && String(v).trim() !== '');
    const nums = vals.map(Analysis.toNum).filter(isFinite);
    const distinct = [...new Set(vals.map(v => String(v).trim()))];
    return { nNum: nums.length, n: vals.length, distinct, numeric: vals.length > 0 && nums.length / vals.length >= 0.9 };
  }

  function detect(data) {
    const { headers, rows } = data;
    const info = Object.fromEntries(headers.map(h => [h, columnInfo(rows, h)]));
    let groupCol = headers.find(h => GROUP_RE.test(h)) || headers.find(h => /group|arm/i.test(h));
    if (!groupCol) groupCol = headers.find(h => !info[h].numeric && info[h].distinct.length >= 2 && info[h].distinct.length <= 6 && !ID_RE.test(h)) || headers[0];
    const idCols = headers.filter(h => h !== groupCol && (ID_RE.test(h) || (!info[h].numeric && info[h].distinct.length === info[h].n && info[h].n > 6)));

    // find repeated-measure families
    const fam = new Map();
    headers.forEach((h, pos) => {
      if (h === groupCol || idCols.includes(h)) return;
      const t = tokens(h);
      t.forEach((tok, ti) => {
        if (!TP_RE.test(tok)) return;
        const base = [...t.slice(0, ti), ...t.slice(ti + 1)];
        const key = base.join('_').toLowerCase();
        if (!fam.has(key)) fam.set(key, { base, cols: [] });
        fam.get(key).cols.push({ col: h, tp: tok, pos });
      });
    });
    const inRepeated = new Set(), repeated = [];
    for (const [key, f] of fam) {
      const tps = new Set(f.cols.map(c => c.tp.toLowerCase()));
      if (f.cols.length >= 2 && tps.size === f.cols.length && f.cols.every(c => info[c.col].numeric && !inRepeated.has(c.col))) {
        f.cols.forEach(c => inRepeated.add(c.col));
        repeated.push({ key, ...f });
      }
    }
    const firstRepPos = Math.min(...repeated.map(r => r.cols[0].pos), Infinity);
    const variables = [];
    headers.forEach((h, pos) => {
      if (h === groupCol || idCols.includes(h) || inRepeated.has(h)) return;
      variables.push(singleVariable(rows, h, pos, pos < firstRepPos ? 'Demographic and baseline data' : 'Other outcomes', info[h]));
    });
    repeated.forEach(r => variables.push({
      id: 'r' + r.cols[0].pos, kind: 'repeated', pos: r.cols[0].pos, cols: r.cols.map(c => ({ col: c.col, tp: c.tp })),
      label: labelFrom(r.base), type: 'numeric', dist: 'auto', table: '', levels: [], note: '', include: true
    }));
    variables.sort((a, b) => a.pos - b.pos);
    const tpOrder = [];
    repeated.forEach(r => r.cols.forEach(c => { if (!tpOrder.includes(c.tp)) tpOrder.push(c.tp); }));
    const cfg = {
      groupCol, idCols, variables, tpOrder, tpLabels: Object.fromEntries(tpOrder.map(t => [t, tpLabel(t)])),
      options: defaultOptions(),
      study: { title: '', software: $('#software').value },
      consort: null, tpInclude: {}, advanced: [], exportExclude: {}, report: { ...DEFAULT_REPORT }
    };
    setGroups(cfg);
    return cfg;
  }
  // detect the variables again after cleaning (columns that became numbers can now form repeated measures),
  // keeping the group settings, options and the labels already typed for the same columns
  // re-detect only when the cleaned sheet has repeated measures the setup does not have yet
  function newRepeated() {
    const key = v => v.cols.map(c => c.col).join('|'), have = new Set(state.cfg.variables.filter(v => v.kind === 'repeated').map(key));
    return detect(state.data).variables.some(v => v.kind === 'repeated' && !have.has(key(v))) ? Math.max(1, redetectVariables()) : 0;
  }
  function redetectVariables() {
    const cfg = state.cfg, fresh = detect(state.data), old = new Map(cfg.variables.map(v => [v.cols.map(c => c.col).join('|'), v]));
    fresh.variables.forEach(v => { const o = old.get(v.cols.map(c => c.col).join('|')); if (o) ['label', 'table', 'note', 'valueLabels', 'include', 'dist', 'chart', 'caption', 'ylabel', 'ymin', 'ymax', 'ref', 'refLabel'].forEach(k => { if (o[k] !== undefined && (o.type === v.type || !['dist'].includes(k))) v[k] = o[k]; }); });
    const before = cfg.variables.filter(v => v.kind === 'repeated').length;
    cfg.variables = fresh.variables; cfg.tpOrder = fresh.tpOrder; cfg.tpLabels = { ...fresh.tpLabels, ...Object.fromEntries(Object.entries(cfg.tpLabels || {}).filter(([k]) => fresh.tpOrder.includes(k))) };
    cfg.idCols = cfg.idCols.filter(h => state.data.headers.includes(h)); if (!cfg.idCols.length) cfg.idCols = fresh.idCols;
    return fresh.variables.filter(v => v.kind === 'repeated').length - before;
  }
  // SPSS labels: variable labels become report labels; value labels become value labels (codes analysed as categories) and group names
  function applySavMeta(cfg, sv) {
    const join = m => Object.entries(m).map(([k, v]) => `${k}=${v}`).join(', ');
    cfg.variables.forEach(v => {
      if (v.kind !== 'single') return;
      const col = v.cols[0].col, vl = sv.valueLabels[col];
      if (sv.varLabels[col]) v.label = sv.varLabels[col];
      if (vl && Object.keys(vl).length) {
        const present = columnInfo(state.data.rows, col).distinct;
        // a numeric column whose values are all labelled codes is a category
        if (present.every(x => x in vl)) { v.type = 'categorical'; v.levels = Object.keys(vl).filter(k => present.includes(k)); }
        if (v.type === 'categorical') v.valueLabels = join(vl);
      }
    });
    const gl = sv.valueLabels[cfg.groupCol];
    if (gl) cfg.groupOrder.forEach(g => { if (gl[g]) cfg.groupLabels[g] = gl[g]; });
  }
  // a single (one-column) variable with the detected type and default levels
  function singleVariable(rows, h, pos, table, inf = columnInfo(rows, h)) {
    const type = inf.numeric && inf.distinct.length > 5 ? 'numeric' : 'categorical';
    return { id: 'v' + pos, kind: 'single', pos, cols: [{ col: h }], label: labelFrom(tokens(h)), type, dist: 'auto', table,
      levels: type === 'categorical' ? defaultLevels(inf.distinct) : [], note: '', include: true };
  }
  function defaultLevels(distinct) {
    const pos = distinct.filter(v => Analysis.POSITIVE.test(v));
    if (distinct.length === 2 && pos.length === 1) return [pos[0], distinct.find(v => v !== pos[0])];
    const nums = distinct.every(v => isFinite(+v));
    return [...distinct].sort((a, b) => nums ? a - b : a.localeCompare(b));
  }
  // default label of a group value; one-group studies have a single group of all patients
  const groupName = g => g === Analysis.ALL_GROUP ? 'All patients' : /group/i.test(g) ? g : `${g} group`;
  // one group: the former group column (e.g. sex, picked by the detection) becomes an ordinary variable again
  function setNoGroups(cfg, on) {
    cfg.noGroups = on; setGroups(cfg);
    const v = cfg.variables.find(x => x.kind === 'single' && x.cols[0].col === cfg.groupCol);
    if (on && !v && state.data.headers.includes(cfg.groupCol)) {
      const pos = state.data.headers.indexOf(cfg.groupCol), near = cfg.variables.filter(x => x.kind === 'single').sort((a, b) => Math.abs(a.pos - pos) - Math.abs(b.pos - pos))[0];
      cfg.variables.push(singleVariable(state.data.rows, cfg.groupCol, pos, near ? near.table : 'Demographic and baseline data'));
      cfg.variables.sort((a, b) => a.pos - b.pos);
    } else if (v) v.include = on;
  }
  function setGroups(cfg) {
    const seen = [];
    state.data.rows.forEach(r => { const g = Analysis.groupOf(cfg, r); if (g !== null && !seen.includes(g)) seen.push(g); });
    cfg.groupOrder = seen;
    cfg.groupLabels = Object.fromEntries(seen.map(g => [g, groupName(g)]));
    cfg.groupInclude = Object.fromEntries(seen.map(g => [g, true]));
    cfg.consort = null;
  }
  const activeGroups = () => state.cfg.groupOrder.filter(g => state.cfg.groupInclude[g] !== false);
  const groupN = g => Analysis.filterRows(state.cfg, state.data.rows).filter(r => Analysis.groupOf(state.cfg, r) === g).length;

  /* ---------- step 2: variables ---------- */
  function renderVariables() {
    renderCalcForm();
    const cfg = state.cfg, { headers } = state.data;
    $('#groupCol').innerHTML = headers.map(h => `<option ${h === cfg.groupCol ? 'selected' : ''}>${esc(h)}</option>`).join('');
    // study design: compare the groups of a column, or analyse every patient as one group
    $('#groupMode').value = cfg.noGroups ? 'one' : 'groups';
    $('#groupColBox').style.display = cfg.noGroups ? 'none' : '';
    $('#groupMode').onchange = e => { readUiIntoCfg(); setNoGroups(cfg, e.target.value === 'one'); renderVariables(); renderStepper();
      toast(cfg.noGroups ? 'All patients are analysed as one group: descriptive tables and changes over time' : 'Groups are compared again'); };
    $('#groupCol').onchange = e => { readUiIntoCfg(); cfg.groupCol = e.target.value; cfg.variables.forEach(v => { if (v.cols[0].col === cfg.groupCol) v.include = false; }); setGroups(cfg); renderVariables(); };
    cfg.groupMerge = cfg.groupMerge || {};
    $('#groupsTbl').innerHTML = `<thead><tr><th>Use</th><th>Value in Excel</th><th>Label in report</th><th>n</th><th>Order</th><th title="Analyse this group as part of another group">Merge into</th><th title="The control (reference) group comes first in tables and comparisons">Control</th></tr></thead><tbody>${
      cfg.groupOrder.map((g, i) => `<tr><td><input type="checkbox" data-ginc="${esc(g)}" ${cfg.groupInclude[g] !== false ? 'checked' : ''} ${cfg.noGroups ? 'disabled' : ''}></td><td class="mono">${g === Analysis.ALL_GROUP ? '(every row)' : esc(g)}</td>
      <td><input type="text" data-glabel="${esc(g)}" value="${esc(cfg.groupLabels[g])}"></td><td>${groupN(g)}</td>
      <td><button class="btn ghost small" data-gmove="${i},-1">↑</button> <button class="btn ghost small" data-gmove="${i},1">↓</button></td>
      <td>${cfg.noGroups ? '' : `<select data-gmerge="${esc(g)}" style="width:auto"><option value="">—</option>${cfg.groupOrder.filter(x => x !== g).map(x => `<option value="${esc(x)}" ${cfg.groupMerge[g] === x ? 'selected' : ''}>${esc(cfg.groupLabels[x] || x)}</option>`).join('')}</select>`}</td>
      <td>${cfg.noGroups ? '' : `<input type="radio" name="gctrl" data-gctrl="${esc(g)}" ${i === 0 ? 'checked' : ''}>`}</td></tr>`).join('')}</tbody>`;
    if (cfg.groupOrder.length > 6 && !cfg.noGroups) toast('The group column has many values — is it the right column?');

    const groups = activeGroups();
    const byGroup = groups.map(g => state.data.rows.filter(r => Analysis.groupOf(cfg, r) === g));
    const swChip = v => {
      if (v.type !== 'numeric') return '<span class="chip info">categorical</span>';
      let total = 0, fail = 0;
      v.cols.forEach(c => byGroup.forEach(rs => {
        const x = rs.map(r => Analysis.toNum(r[c.col])).filter(isFinite);
        const sw = Analysis.normalityTest(cfg.options.normality)(x); total++; if (sw && sw.p <= 0.05) fail++;
      }));
      const tip = `title="${fail} of ${total} group/timepoint cells failed ${cfg.options.normality === 'ks' ? 'Kolmogorov-Smirnov' : 'Shapiro-Wilk'} (p ≤ 0.05)"`;
      const nonNormal = v.kind === 'repeated' ? fail > total * Analysis.NONNORMAL_SHARE : fail > 0;
      if (nonNormal) return `<span class="chip warn" ${tip}>non-normal (${fail}/${total})</span>`;
      return fail ? `<span class="chip ok" ${tip}>normal (${fail}/${total} failed)</span>` : '<span class="chip ok">normal</span>';
    };
    const warn = varWarnings(byGroup);
    $('#varsTbl').innerHTML = `<thead><tr><th title="Drag to reorder · tick to select">⋮⋮</th><th>Use</th><th>Label</th><th>Column(s)</th><th>Type</th><th>Distribution</th><th>Table</th><th>Levels (categories)</th><th title="Labels for coded values, e.g. 1=Male, 2=Female. The report shows the labels; the sheet keeps its codes.">Value labels</th><th>Footnote (abbreviations)</th><th>More</th></tr></thead><tbody>${
      cfg.variables.map(v => `<tr data-vid="${v.id}" draggable="true">
        <td class="vdrag"><span class="grip" title="Drag to reorder">⋮⋮</span><input type="checkbox" data-vsel="${v.id}" ${state.varSel && state.varSel.has(v.id) ? 'checked' : ''} title="Select for the bulk actions"></td>
        <td><input type="checkbox" data-k="include" ${v.include ? 'checked' : ''}></td>
        <td><input type="text" data-k="label" value="${esc(v.label)}"></td>
        <td class="mono" title="${esc(v.cols.map(c => c.col).join('\n'))}">${v.kind === 'repeated' ? `<span class="chip info">repeated × ${v.cols.length}</span><div class="tpchks">${v.cols.map((c, i) =>
          `<label title="${esc(c.col)}"><input type="checkbox" data-vtp="${i}" ${c.include !== false ? 'checked' : ''}>${esc(c.label || cfg.tpLabels[c.tp] || c.tp)}</label>`).join('')}</div>` : esc(v.cols[0].col)}</td>
        <td>${v.kind === 'repeated' ? `<select data-k="split" title="Analyse the timepoints together, or each as its own variable"><option value="">repeated measure</option><option value="1" ${v.split ? 'selected' : ''}>separate variables</option></select>` : `<select data-k="type"><option value="numeric" ${v.type === 'numeric' ? 'selected' : ''}>numeric</option><option value="categorical" ${v.type === 'categorical' ? 'selected' : ''}>categorical</option></select>`}</td>
        <td>${v.type === 'numeric' ? `<select data-k="dist"><option value="auto" ${v.dist === 'auto' ? 'selected' : ''}>Auto</option><option value="param" ${v.dist === 'param' ? 'selected' : ''}>Parametric</option><option value="nonparam" ${v.dist === 'nonparam' ? 'selected' : ''}>Non-parametric</option></select><div style="margin-top:4px">${swChip(v)}</div>` : swChip(v)}</td>
        <td>${v.kind === 'repeated' ? (v.split ? `<input type="text" data-k="splitTable" value="${esc(v.splitTable || 'Other outcomes')}">` : '<span class="legend-note">own table</span>') : `<input type="text" data-k="table" value="${esc(v.table)}">`}</td>
        <td>${v.type === 'categorical' ? `<div class="row" style="gap:4px;flex-wrap:nowrap"><input type="text" data-k="levels" value="${esc(v.levels.join(', '))}"><button class="btn ghost small" data-lvarr="${v.id}" type="button" title="Arrange the categories: drag, A-Z, by frequency, severity order …">↕</button></div>` : '<span class="legend-note">—</span>'}</td>
        <td>${v.type === 'categorical' ? `<input type="text" data-k="valueLabels" value="${esc(v.valueLabels || '')}" placeholder="${esc(v.levels.slice(0, 3).map(l => `${l}=…`).join(', ') || 'e.g. 1=Male, 2=Female')}" title="Code=label pairs separated by commas, e.g. 1=Male, 2=Female">` : '<span class="legend-note" title="Set the type to categorical to label coded values">—</span>'}</td>
        <td><input type="text" data-k="note" value="${esc(v.note)}" placeholder="e.g. NRS: Numeric rating scale"></td>
        <td style="white-space:nowrap"><button class="btn ghost small" data-vgear="${v.id}" type="button" title="Unit, decimals, role, ordinal, transformation, Arabic label, merging categories, adjusted comparison">⚙${varBadges(v)}</button>${(warn[v.id] || []).map(w => `<span class="chip warn" title="${esc(w[1])}">${w[0]}</span>`).join('')}</td>
      </tr>`).join('')}</tbody>`;
    renderRepeated(); filterVars(); renderSubgroup();
  }
  function filterVars() {
    const q = ($('#varSearch').value || '').trim().toLowerCase(), trs = [...document.querySelectorAll('#varsTbl tr[data-vid]')];
    let n = 0;
    const onlyInc = $('#varOnlyInc').checked;
    trs.forEach(tr => { const v = state.cfg.variables.find(x => x.id === tr.dataset.vid), hit = (!q || (v && (v.label + ' ' + v.cols.map(c => c.col).join(' ')).toLowerCase().includes(q))) && (!onlyInc || (v && v.include)); tr.style.display = hit ? '' : 'none'; if (hit) n++; });
    $('#varCount').textContent = q || onlyInc ? `${n} of ${trs.length} variables` : `${trs.length} variables · ${state.cfg.variables.filter(v => v.include).length} included`;
  }
  $('#varSearch').addEventListener('input', filterVars);
  $('#varOnlyInc').onchange = () => { readUiIntoCfg(); filterVars(); };
  // the codebook (data dictionary): every column with its role, label, type, levels, value labels, missing values and range
  $('#btnCodebook').onclick = () => {
    readUiIntoCfg();
    const cfg = state.cfg, { headers, rows } = state.data;
    const varOf = h => cfg.variables.find(v => v.cols.some(c => c.col === h));
    const aoa = [['Column', 'Label in the report', 'Role', 'Type', 'Timepoint', 'Table', 'Levels / categories (n)', 'Value labels', 'n', 'Missing', 'Mean ± SD', 'Median (IQR)', 'Min', 'Max', 'Footnote']];
    headers.forEach(h => {
      const v = varOf(h), vals = rows.map(r => r[h]).filter(x => !isMissing(x)), nums = vals.map(Analysis.toNum).filter(isFinite), numeric = v ? v.type === 'numeric' : columnInfo(rows, h).numeric;
      const role = h === cfg.groupCol && !cfg.noGroups ? 'Group' : cfg.idCols.includes(h) ? 'ID' : !v ? 'Not analysed' : v.include ? (v.kind === 'repeated' ? 'Repeated measure' : 'Analysed') : 'Not analysed';
      const c = v && v.cols.find(x => x.col === h), tp = v && v.kind === 'repeated' && c ? (c.label || cfg.tpLabels[c.tp] || c.tp) : '';
      const cnt = {}; if (!numeric) vals.forEach(x => { const k = String(x).trim(); cnt[k] = (cnt[k] || 0) + 1; });
      const lv = !numeric ? Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 12).map(([k, n]) => `${k} (${n})`).join('; ') : '';
      const st = numeric && nums.length && role !== 'ID' ? Stats.describe(nums) : null, f = x => Analysis.fmt(x, 2);
      aoa.push([h, h === cfg.groupCol && !cfg.noGroups ? 'Groups: ' + cfg.groupOrder.map(g => cfg.groupLabels[g] || g).join(', ') : v ? v.label : '', role, numeric ? 'Numeric' : 'Categorical', tp, v ? (v.kind === 'repeated' ? 'own table' : v.table || '') : '',
        lv, v && v.valueLabels || '', vals.length, rows.length - vals.length, st ? `${f(st.mean)} ± ${f(st.sd)}` : '', st ? `${f(st.median)} (${f(st.q1)} - ${f(st.q3)})` : '', st ? f(st.min) : '', st ? f(st.max) : '', v && v.note || '']);
    });
    const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet(aoa);
    ws['!cols'] = [18, 26, 16, 12, 12, 24, 40, 24, 6, 8, 16, 18, 8, 8, 30].map(w => ({ wch: w }));
    XLSX.utils.book_append_sheet(wb, ws, 'Codebook');
    XLSX.writeFile(wb, `${baseName()} - Codebook.xlsx`);
    toast(`Codebook of ${headers.length} columns saved`);
  };
  $('#groupsTbl').addEventListener('click', e => {
    const b = e.target.closest('[data-gmove]'); if (!b) return;
    readUiIntoCfg();
    const [i, d] = b.dataset.gmove.split(',').map(Number), o = state.cfg.groupOrder, j = i + d;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]]; state.cfg.consort = null; renderVariables();
  });
  $('#varsTbl').addEventListener('change', e => {
    if (e.target.dataset.k === 'split') { readUiIntoCfg(); renderVariables(); return; }
    if (e.target.dataset.k === 'type') {
      readUiIntoCfg();
      const v = state.cfg.variables.find(x => x.id === e.target.closest('tr').dataset.vid);
      if (v.type === 'categorical' && !v.levels.length) v.levels = defaultLevels(columnInfo(state.data.rows, v.cols[0].col).distinct);
      renderVariables();
    }
  });
  /* ---------- repeated-measure builder: create, edit, ungroup ---------- */
  let repEdit = null; // { id (null = new), label, cols: [{ col, tp }] } while the editor is open
  const tpText = tp => state.cfg.tpLabels[tp] || tp;
  function renderRepeated() {
    const cfg = state.cfg, reps = cfg.variables.filter(v => v.kind === 'repeated');
    $('#repList').innerHTML = reps.length ? reps.map(v => `<div class="gcard row" style="margin-bottom:6px">
        <div style="flex:1"><b>${esc(v.label)}</b> <span class="legend-note">— ${v.cols.map(c => `${esc(c.label || tpText(c.tp))} <span class="mono">(${esc(c.col)})</span>`).join(' → ')}</span></div>
        <button class="btn ghost small" data-repedit="${v.id}" type="button">✎ Edit</button>
        <button class="btn ghost small" data-repungroup="${v.id}" type="button" title="Turn the columns back into single variables">Ungroup</button></div>`).join('')
      : '<p class="legend-note">No repeated measures yet. Create one from columns measured at several timepoints.</p>';
    if (!repEdit) { $('#repEditor').innerHTML = ''; return; }
    // columns that can be added: numeric, not the group / ID, not already in another repeated measure
    const used = new Set(cfg.variables.filter(v => v.kind === 'repeated' && v.id !== repEdit.id).flatMap(v => v.cols.map(c => c.col)));
    const avail = state.data.headers.filter(h => h !== cfg.groupCol && !cfg.idCols.includes(h) && !used.has(h) && !repEdit.cols.some(c => c.col === h) && columnInfo(state.data.rows, h).numeric);
    $('#repEditor').innerHTML = `<div class="gcard" style="margin-top:10px">
      <h4>${repEdit.id ? 'Edit repeated measure' : 'New repeated measure'}</h4>
      <div class="grid g2"><div><label class="f">Name (outcome label)</label><input type="text" id="repName" value="${esc(repEdit.label)}" placeholder="e.g. Pain score"></div></div>
      <label class="f" style="margin-top:10px">Columns in time order — give each its timepoint label (this order is kept in tables and charts)</label>
      <table class="t"><thead><tr><th>#</th><th>Column</th><th>Timepoint label</th><th></th></tr></thead><tbody>${repEdit.cols.map((c, i) => `<tr>
        <td>${i + 1}</td><td class="mono">${esc(c.col)}</td><td><input type="text" data-reptp="${i}" value="${esc(c.label ?? tpText(c.tp))}"></td>
        <td><button class="btn ghost small" data-repmove="${i},-1" type="button">↑</button> <button class="btn ghost small" data-repmove="${i},1" type="button">↓</button> <button class="btn ghost small" data-repdel="${i}" type="button">✕</button></td></tr>`).join('') || '<tr><td colspan="4" class="legend-note">Add at least two columns.</td></tr>'}</tbody></table>
      <div class="row" style="margin-top:8px"><select id="repAdd" style="max-width:320px"><option value="">+ Add a column…</option>${avail.map(h => `<option>${esc(h)}</option>`).join('')}</select>
        <span class="spacer"></span><button class="btn ghost" data-repact="cancel" type="button">Cancel</button><button class="btn primary" data-repact="save" type="button">Save repeated measure</button></div>
    </div>`;
  }
  // keep the editor's typed values before re-rendering it
  function readRepEditor() {
    if (!repEdit || !$('#repName')) return;
    repEdit.label = $('#repName').value;
    document.querySelectorAll('[data-reptp]').forEach(el => { repEdit.cols[+el.dataset.reptp].label = el.value; });
  }
  function saveRepeated() {
    readRepEditor();
    const cfg = state.cfg, rows = state.data.rows, h = state.data.headers;
    if (repEdit.cols.length < 2) { toast('A repeated measure needs at least two columns'); return; }
    const labels = repEdit.cols.map(c => (c.label ?? tpText(c.tp)).trim() || c.col);
    if (new Set(labels.map(l => l.toLowerCase())).size !== labels.length) { toast('Each timepoint label must be different'); return; }
    // timepoint tokens: reuse one whose label matches, otherwise the label becomes a new token
    const cols = repEdit.cols.map((c, i) => {
      const existing = cfg.tpOrder.find(t => tpText(t).toLowerCase() === labels[i].toLowerCase());
      const tp = existing || labels[i];
      if (!existing) { cfg.tpOrder.push(tp); cfg.tpLabels[tp] = labels[i]; }
      // the label belongs to this outcome; only a different spelling from the shared name is stored
      const col = { col: c.col, tp };
      if (c.include === false) col.include = false;
      if (labels[i] !== tpText(tp)) col.label = labels[i];
      return col;
    });
    const old = repEdit.id ? cfg.variables.find(v => v.id === repEdit.id) : null;
    const chosen = new Set(cols.map(c => c.col));
    // chosen columns leave the single variables; columns dropped from an edited measure come back as single variables
    cfg.variables = cfg.variables.filter(v => !(v.kind === 'single' && chosen.has(v.cols[0].col)));
    if (old) old.cols.filter(c => !chosen.has(c.col)).forEach(c => cfg.variables.push(singleVariable(rows, c.col, h.indexOf(c.col), 'Other outcomes')));
    const pos = Math.min(...cols.map(c => h.indexOf(c.col)));
    const label = repEdit.label.trim() || labelFrom(tokens(cols[0].col));
    if (old) Object.assign(old, { cols, label, pos, ownOrder: true });
    else cfg.variables.push({ id: 'rc' + pos + '_' + Date.now().toString(36), kind: 'repeated', pos, cols, label, type: 'numeric', dist: 'auto', table: '', levels: [], note: '', include: true, ownOrder: true });
    cfg.variables.sort((a, b) => a.pos - b.pos);
    repEdit = null;
    renderVariables();
    toast(`Repeated measure “${label}” saved`);
  }
  function ungroupRepeated(id) {
    const cfg = state.cfg, v = cfg.variables.find(x => x.id === id), h = state.data.headers;
    cfg.variables = cfg.variables.filter(x => x !== v);
    v.cols.forEach(c => cfg.variables.push(singleVariable(state.data.rows, c.col, h.indexOf(c.col), 'Other outcomes')));
    cfg.variables.sort((a, b) => a.pos - b.pos);
    renderVariables();
    toast(`“${v.label}” ungrouped into ${v.cols.length} single variables`);
  }
  $('#repCreate').onclick = () => { readUiIntoCfg(); repEdit = { id: null, label: '', cols: [] }; renderRepeated(); };
  $('#repCard').addEventListener('click', e => {
    const b = e.target.closest('[data-repedit],[data-repungroup],[data-repmove],[data-repdel],[data-repact]'); if (!b) return;
    readUiIntoCfg(); readRepEditor();
    if (b.dataset.repedit) { const v = state.cfg.variables.find(x => x.id === b.dataset.repedit); repEdit = { id: v.id, label: v.label, cols: v.cols.map(c => ({ ...c })) }; }
    else if (b.dataset.repungroup) { repEdit = null; ungroupRepeated(b.dataset.repungroup); return; }
    else if (b.dataset.repmove) { const [i, d] = b.dataset.repmove.split(',').map(Number), j = i + d, a = repEdit.cols; if (j >= 0 && j < a.length) [a[i], a[j]] = [a[j], a[i]]; }
    else if (b.dataset.repdel !== undefined) repEdit.cols.splice(+b.dataset.repdel, 1);
    else if (b.dataset.repact === 'cancel') repEdit = null;
    else if (b.dataset.repact === 'save') { saveRepeated(); return; }
    renderRepeated();
  });
  $('#repCard').addEventListener('change', e => {
    if (e.target.id !== 'repAdd' || !e.target.value) return;
    readRepEditor();
    const col = e.target.value, toks = tokens(col), tp = toks.find(t => TP_RE.test(t));
    repEdit.cols.push({ col, tp: tp || ('T' + (repEdit.cols.length + 1)), label: tp ? tpLabel(tp) : 'T' + (repEdit.cols.length + 1) });
    renderRepeated();
  });

  $('#groupsTbl').addEventListener('change', e => { if (e.target.dataset.ginc !== undefined) { readUiIntoCfg(); state.cfg.consort = null; renderVariables(); } });

  /* ---------- step 3: timepoints & options ---------- */
  function renderTimepoints() {
    const cfg = state.cfg;
    cfg.tpTime = cfg.tpTime || {}; cfg.tpPhase = cfg.tpPhase || {};
    $('#tpTbl').innerHTML = cfg.tpOrder.length ? `<thead><tr><th>Use</th><th>Token in column names</th><th>Label in report</th><th title="For proportional spacing in line charts, the area under the curve, the mixed model and the trend test">Time value</th><th title="Shown before the label, e.g. Intra-operative: 30 min">Phase</th><th>Order</th></tr></thead><tbody>${
      cfg.tpOrder.map((t, i) => `<tr><td><input type="checkbox" data-tpinc="${esc(t)}" ${cfg.tpInclude[t] !== false ? 'checked' : ''}></td><td class="mono">${esc(t)}</td>
        <td><input type="text" data-tp="${esc(t)}" value="${esc(cfg.tpLabels[t])}"></td>
        <td><input type="number" data-tptime="${esc(t)}" value="${esc(cfg.tpTime[t] ?? '')}" style="width:80px" placeholder="${esc(guessTime(t))}"></td>
        <td><input type="text" data-tpphase="${esc(t)}" value="${esc(cfg.tpPhase[t] || '')}" style="width:130px"></td>
        <td><button class="btn ghost small" data-tpmove="${i},-1">↑</button> <button class="btn ghost small" data-tpmove="${i},1">↓</button></td></tr>`).join('')}</tbody>`
      : '<tbody><tr><td>No repeated measures detected.</td></tr></tbody>';
    renderTpVars(); renderTpTools();
  }
  // option controls of steps 4–8 show the saved options
  function renderOptions() {
    const o = state.cfg.options;
    for (const [k, [id, box]] of Object.entries(OPTION_FIELDS)) $('#' + id)[box ? 'checked' : 'value'] = o[k];
    const gNames = state.data && !state.cfg.noGroups ? activeGroups().map(g => state.cfg.groupLabels[g] || g) : [];
    $('#customColors').innerHTML = o.customColors.map((col, i) => `<label class="cc"><input type="color" data-ccol="${i}" value="${esc(col)}" title="${esc(gNames[i] || `Colour ${i + 1}`)}"><span>${esc(gNames[i] || `Colour ${i + 1}`)}</span></label>`).join('');
    $('#customBox').style.display = o.palette === 'custom' ? '' : 'none';
  }

  /* ---------- timepoints: time order and readable names ---------- */
  const UNIT_H = { min: 1 / 60, mins: 1 / 60, h: 1, hr: 1, hrs: 1, hour: 1, hours: 1, d: 24, day: 24, days: 24, w: 168, wk: 168, wks: 168, week: 168, weeks: 168, m: 730, mo: 730, mon: 730, month: 730, months: 730, y: 8760, yr: 8760, yrs: 8760, year: 8760, years: 8760 };
  function tpRank(t) {
    const s = String(t).toLowerCase().replace(/\s+/g, '');
    if (/^(baseline|base|bl|pre|preop|before|screening|t0|v0|day0|d0)$/.test(s)) return -1;
    if (/^(post|postop|after|final|end|discharge)$/.test(s)) return 1e9;
    let m = /^(\d+(?:\.\d+)?)([a-z]+)$/.exec(s); if (m && UNIT_H[m[2]]) return +m[1] * UNIT_H[m[2]];
    m = /^([a-z]+)(\d+(?:\.\d+)?)$/.exec(s); if (m) return +m[2] * (UNIT_H[m[1]] || 1);
    return 5e8;
  }
  const TP_WORD = { m: 'Month', mo: 'Month', month: 'Month', w: 'Week', wk: 'Week', week: 'Week', d: 'Day', day: 'Day', y: 'Year', yr: 'Year', year: 'Year', v: 'Visit', visit: 'Visit', t: 'T', session: 'Session' };
  function tpReadable(t) {
    const s = String(t).trim(); let m = /^([a-z]+)\s*(\d+(?:\.\d+)?)$/i.exec(s);
    if (m && TP_WORD[m[1].toLowerCase()]) return TP_WORD[m[1].toLowerCase()] === 'T' ? 'T' + m[2] : `${TP_WORD[m[1].toLowerCase()]} ${m[2]}`;
    m = /^(\d+(?:\.\d+)?)\s*(h|hr|hrs|hours?|min|mins|d|days?|w|wks?|weeks?|m|mo|months?|y|yrs?|years?)$/i.exec(s);
    if (m) { const u = m[2].toLowerCase(), one = +m[1] === 1, name = /^(h|hr|hrs|hour|hours)$/.test(u) ? 'h' : /^min/.test(u) ? 'min' : /^d/.test(u) ? (one ? 'day' : 'days') : /^w/.test(u) ? (one ? 'week' : 'weeks') : /^m/.test(u) ? (one ? 'month' : 'months') : (one ? 'year' : 'years'); return `${m[1]} ${name}`; }
    return tpLabel(s);
  }
  // per outcome: its own first and last timepoint (in its order), every shared timepoint left on
  $('#tpFirstLast').onclick = () => {
    readUiIntoCfg(); const cfg = state.cfg, at = t => { const i = cfg.tpOrder.indexOf(t); return i < 0 ? 1e9 : i; }; let n = 0;
    cfg.tpOrder.forEach(t => { cfg.tpInclude[t] = true; });
    cfg.variables.filter(v => v.kind === 'repeated').forEach(v => { const order = v.ownOrder ? v.cols : [...v.cols].sort((a, b) => at(a.tp) - at(b.tp));
      order.forEach((c, i) => { c.include = i === 0 || i === order.length - 1; }); n++; });
    renderTimepoints(); toast(n ? `${n} repeated measure${n > 1 ? 's' : ''}: only the first and last timepoint are used` : 'No repeated measures');
  };
  $('#tpAll').onclick = () => { readUiIntoCfg(); const cfg = state.cfg; cfg.tpOrder.forEach(t => { cfg.tpInclude[t] = true; }); cfg.variables.forEach(v => { if (v.kind === 'repeated') v.cols.forEach(c => { c.include = true; }); }); renderTimepoints(); toast('Every timepoint is used'); };
  $('#tpSort').onclick = () => { readUiIntoCfg(); const o = state.cfg.tpOrder; state.cfg.tpOrder = o.map((t, i) => [t, i]).sort((a, b) => tpRank(a[0]) - tpRank(b[0]) || a[1] - b[1]).map(x => x[0]); renderTimepoints(); toast('Timepoints in time order'); };
  $('#tpRelabel').onclick = () => { readUiIntoCfg(); const cfg = state.cfg; let n = 0; cfg.tpOrder.forEach(t => { const nw = tpReadable(t); if (cfg.tpLabels[t] !== nw && (cfg.tpLabels[t] === t || cfg.tpLabels[t] === tpLabel(t))) { cfg.tpLabels[t] = nw; n++; } }); renderTimepoints(); toast(n ? `${n} timepoint label${n > 1 ? 's' : ''} made readable` : 'The labels are already readable (or typed by you)'); };
  /* ---------- timepoints per outcome (step 3) ---------- */
  const colTp = c => c.label || state.cfg.tpLabels[c.tp] || c.tp;
  function renderTpVars() {
    const reps = state.cfg.variables.filter(v => v.kind === 'repeated');
    $('#tpVars').innerHTML = reps.length ? reps.map(v => `<div class="gcard" style="margin-bottom:10px"><div class="row"><h4 style="margin:0">${esc(v.label)}</h4><span class="spacer"></span>
        <span class="legend-note">${v.include ? '' : 'not included (step 2) · '}${v.split ? 'analysed as separate variables · ' : ''}${v.ownOrder ? 'own order' : 'shared order'}</span></div>
      <div class="row" style="gap:8px;margin-top:6px;flex-wrap:wrap;align-items:center">
        <span class="legend-note">Reference for change</span><select data-vset="${v.id}" data-vk="refTp" style="width:auto">${v.cols.map((c, i) => `<option value="${i}" ${+(v.refTp || 0) === i ? 'selected' : ''}>${esc(colTp(c))}</option>`).join('')}</select>
        <span class="legend-note">Primary endpoint</span><select data-vset="${v.id}" data-vk="primaryTp" style="width:auto"><option value="">—</option>${v.cols.map((c, i) => `<option value="${i}" ${v.primaryTp !== undefined && +v.primaryTp === i ? 'selected' : ''}>${esc(colTp(c))}</option>`).join('')}</select>
        <span class="legend-note">Responders: a</span><select data-vset="${v.id}" data-vk="respDir" style="width:auto"><option value="fall" ${(v.resp || {}).dir !== 'rise' ? 'selected' : ''}>fall</option><option value="rise" ${(v.resp || {}).dir === 'rise' ? 'selected' : ''}>rise</option></select><span class="legend-note">of ≥</span><input type="number" data-vset="${v.id}" data-vk="respPct" value="${esc((v.resp || {}).pct || '')}" placeholder="e.g. 50" style="width:70px"><span class="legend-note">% from the reference</span>
        <button class="btn ghost small" data-tpcopy="${v.id}" type="button" title="The timepoints used, their labels and order, the reference and the primary endpoint — to every other outcome with the same timepoints">Copy to other outcomes</button>
      </div>
      <table class="t" style="margin-top:6px"><thead><tr><th>Use</th><th>Column</th><th>Timepoint label for this outcome</th><th>Order</th></tr></thead><tbody>${v.cols.map((c, i) => `<tr>
        <td><input type="checkbox" data-tv="${v.id}:${i}" data-tf="include" ${c.include !== false ? 'checked' : ''}></td><td class="mono">${esc(c.col)}</td>
        <td><input type="text" data-tv="${v.id}:${i}" data-tf="label" value="${esc(colTp(c))}"></td>
        <td><button class="btn ghost small" data-tvmove="${v.id}:${i}:-1" type="button">↑</button> <button class="btn ghost small" data-tvmove="${v.id}:${i}:1" type="button">↓</button></td></tr>`).join('')}</tbody></table></div>`).join('')
      : '<p class="legend-note">No repeated measures. Create one in step 2 (Repeated measures).</p>';
  }
  function readTpVars() {
    document.querySelectorAll('#tpVars [data-tv]').forEach(el => {
      const [id, i] = el.dataset.tv.split(':'), v = state.cfg.variables.find(x => x.id === id); if (!v) return;
      const c = v.cols[+i];
      if (el.dataset.tf === 'include') c.include = el.checked;
      else {
        const t = el.value.trim();
        // a label equal to the shared name is not an override
        if (!t || t === (state.cfg.tpLabels[c.tp] || c.tp)) delete c.label; else c.label = t;
      }
    });
  }
  $('#tpVars').addEventListener('click', e => {
    const cp = e.target.closest('[data-tpcopy]');
    if (cp) { readUiIntoCfg(); const src = state.cfg.variables.find(x => x.id === cp.dataset.tpcopy), toks = src.cols.map(c => c.tp); let n = 0;
      state.cfg.variables.filter(v => v.kind === 'repeated' && v !== src && v.cols.length === src.cols.length && v.cols.every(c => toks.includes(c.tp))).forEach(v => {
        v.cols = src.cols.map(sc => { const c = v.cols.find(x => x.tp === sc.tp); return { ...c, include: sc.include, ...(sc.label ? { label: sc.label } : {}) }; });
        v.ownOrder = src.ownOrder; ['refTp', 'primaryTp'].forEach(k => { if (src[k] === undefined) delete v[k]; else v[k] = src[k]; }); if (src.resp) v.resp = { ...src.resp }; else delete v.resp; n++; });
      renderTpVars(); toast(n ? `Copied to ${n} outcome${n > 1 ? 's' : ''}` : 'No other outcome has the same timepoints'); return; }
    const b = e.target.closest('[data-tvmove]'); if (!b) return;
    readUiIntoCfg();
    const [id, i, d] = b.dataset.tvmove.split(':'), v = state.cfg.variables.find(x => x.id === id), a = v.cols, j = +i + +d;
    if (j < 0 || j >= a.length) return;
    // the outcome now keeps its own order; start from the order currently in use
    if (!v.ownOrder) { const ord = t => { const k = state.cfg.tpOrder.indexOf(t); return k < 0 ? 1e9 : k; }; a.sort((x, y) => ord(x.tp) - ord(y.tp)); v.ownOrder = true; }
    const from = +i, to = j;
    [a[from], a[to]] = [a[to], a[from]];
    renderTpVars();
  });
  /* ---------- calculated variables: new columns computed from existing ones ---------- */
  const CALC_TYPES = {
    bmi: 'BMI = weight (kg) / height (m)²', diff: 'Change = B − A', pct: '% change = (B − A) / A × 100', ratio: 'Ratio = A / B',
    sum: 'Total score (sum of columns)', mean: 'Mean of columns', log: 'Logarithm (ln or log10)', cat: 'Categories from cut-offs (e.g. BMI classes)', formula: 'Own formula'
  };
  const calc = { type: 'bmi' };
  const numCols = () => state.data.headers.filter(h => columnInfo(state.data.rows, h).numeric);
  function renderCalcForm() {
    if (!state.data) return;
    const t = calc.type, nums = numCols(), reps = state.cfg.variables.filter(v => v.kind === 'repeated' && v.type === 'numeric');
    const opt = (list, v) => list.map(h => `<option ${h === v ? 'selected' : ''}>${esc(h)}</option>`).join('');
    const sel = (k, label, list = nums) => `<div><label class="f">${label}</label><select data-calc="${k}"><option value="">— choose —</option>${opt(list, calc[k])}</select></div>`;
    let f = `<div><label class="f">Calculation</label><select data-calc="type">${Object.entries(CALC_TYPES).map(([k, l]) => `<option value="${k}" ${k === t ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    if (t === 'bmi') f += `<div><label class="f">Weight (kg)</label><select data-calc="a"><option value="">— choose —</option>${opt(nums, calc.a)}${reps.map(v => `<option value="rep:${v.id}" ${calc.a === 'rep:' + v.id ? 'selected' : ''}>${esc(v.label)} — every timepoint</option>`).join('')}</select></div>`
      + sel('b', 'Height') + `<div><label class="f">Height unit</label><select data-calc="unit"><option value="cm" ${calc.unit !== 'm' ? 'selected' : ''}>cm</option><option value="m" ${calc.unit === 'm' ? 'selected' : ''}>m</option></select></div>`;
    if (t === 'diff' || t === 'pct' || t === 'ratio') f += sel('a', t === 'ratio' ? 'A (numerator)' : 'A (first, e.g. baseline)') + sel('b', t === 'ratio' ? 'B (denominator)' : 'B (second, e.g. follow-up)');
    if (t === 'log') f += sel('a', 'Column') + `<div><label class="f">Base</label><select data-calc="base"><option value="ln" ${calc.base !== '10' ? 'selected' : ''}>Natural (ln)</option><option value="10" ${calc.base === '10' ? 'selected' : ''}>log10</option></select></div>`;
    if (t === 'cat') f += sel('a', 'Column') + `<div><label class="f">Cut-offs (lower limits)</label><input type="text" data-calc="cuts" value="${esc(calc.cuts ?? '18.5, 25, 30')}" placeholder="18.5, 25, 30"></div>`
      + `<div><label class="f">Category names (one more than cut-offs)</label><input type="text" data-calc="labels" value="${esc(calc.labels ?? 'Underweight, Normal, Overweight, Obese')}"></div>`;
    if (t === 'sum' || t === 'mean') f += `<div style="grid-column:span 3"><label class="f">Columns (a patient with any of them missing gets no value)</label><div class="predlist">${nums.map(h => `<label><input type="checkbox" data-calccol="${esc(h)}" ${(calc.cols || []).includes(h) ? 'checked' : ''}>${esc(h)}</label>`).join('')}</div></div>`;
    if (t === 'formula') f += `<div style="grid-column:span 3"><label class="f">Formula — column names in [brackets]; + − × / ^ ( ), ln, log10, sqrt, abs, exp, round, min, max</label><input type="text" data-calc="expr" value="${esc(calc.expr || '')}" placeholder="e.g. [Weight_kg] / ([Height_cm] / 100) ^ 2"></div>`;
    f += `<div><label class="f">New column name</label><input type="text" data-calc="name" value="${esc(calc.name || '')}" placeholder="${esc(calcDefaultName())}"></div>`;
    // where the new column goes in the sheet, and which report table shows it
    const heads = state.data.headers, where = calc.where || 'source';
    f += `<div><label class="f">Place in the sheet</label><select data-calc="where"><option value="source" ${where === 'source' ? 'selected' : ''}>After its source column</option><option value="end" ${where === 'end' ? 'selected' : ''}>At the end of the sheet</option><option value="start" ${where === 'start' ? 'selected' : ''}>At the start of the sheet</option>
      <optgroup label="After column…">${heads.map(h => `<option value="after:${esc(h)}" ${where === 'after:' + h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</optgroup></select></div>`;
    const tables = [...new Set([...state.cfg.variables.filter(v => v.kind === 'single' && v.table).map(v => v.table), 'Other outcomes'])];
    if (!(t === 'bmi' && String(calc.a || '').startsWith('rep:')))
      f += `<div><label class="f">Table in the report</label><input type="text" data-calc="table" list="calcTables" value="${esc(calc.table || '')}" placeholder="same as its source column"><datalist id="calcTables">${tables.map(x => `<option value="${esc(x)}">`).join('')}</datalist></div>`;
    $('#calcForm').innerHTML = f;
    const done = state.cfg.computed || [];
    $('#calcList').innerHTML = done.length ? `<table class="t"><thead><tr><th>Column</th><th>Calculation</th><th></th></tr></thead><tbody>${done.map((c, i) =>
      `<tr><td class="mono">${esc(c.names.join(', '))}</td><td>${esc(c.desc)}</td><td><button class="btn ghost small" data-calcre="${i}" type="button" title="Calculate again from the current sheet">⟳ Recalculate</button></td></tr>`).join('')}</tbody></table>` : '';
    calcPreview();
  }
  function calcDefaultName() {
    const t = calc.type, a = String(calc.a || '').replace(/^rep:.*/, 'BMI');
    return { bmi: 'BMI_kg_m2', diff: a ? `${a}_change` : 'Change', pct: a ? `${a}_pct_change` : 'Pct_change', ratio: 'Ratio', sum: 'Total_score', mean: 'Mean_score',
      log: a ? `${calc.base === '10' ? 'Log10' : 'Ln'}_${a}` : 'Log', cat: a ? `${a}_class` : 'Class', formula: 'Calculated' }[t];
  }
  // own formulas: every token is checked against a whitelist (numbers, operators, column names, a few functions) before it becomes code
  const FUNCS = { ln: Math.log, log: Math.log, log10: Math.log10, sqrt: Math.sqrt, abs: Math.abs, exp: Math.exp, round: (x, n = 0) => Math.round(x * 10 ** n) / 10 ** n, min: Math.min, max: Math.max };
  function compileFormula(expr) {
    const heads = state.data.headers, used = [], re = /\s*(\d+(?:\.\d+)?(?:e[+-]?\d+)?|\[[^\]]+\]|[A-Za-z_][A-Za-z0-9_.]*|[-+*/^(),])/gy;
    let js = '', m, pos = 0;
    const src = String(expr || '').trim();
    if (!src) throw new Error('type a formula');
    while (pos < src.length) {
      re.lastIndex = pos; m = re.exec(src);
      if (!m) throw new Error(`cannot read “${src.slice(pos, pos + 12)}”`);
      pos = re.lastIndex;
      const t = m[1];
      if (/^\d/.test(t)) js += t;
      else if (t[0] === '[' || heads.includes(t)) {
        const name = t[0] === '[' ? t.slice(1, -1).trim() : t;
        if (!heads.includes(name)) throw new Error(`no column named “${name}”`);
        if (!used.includes(name)) used.push(name);
        js += `c[${used.indexOf(name)}]`;
      } else if (/^[A-Za-z_]/.test(t)) {
        if (!FUNCS[t.toLowerCase()]) throw new Error(`unknown name “${t}” — put column names in [brackets]`);
        js += `F.${t.toLowerCase()}`;
      } else js += t === '^' ? '**' : t;
    }
    if (!used.length) throw new Error('the formula uses no column');
    let fn;
    try { fn = new Function('c', 'F', `return (${js});`); } catch (e) { throw new Error('the formula is incomplete'); }
    return { cols: used, f: vals => fn(vals, FUNCS) };
  }
  // the calculation as a list of [new column, source columns, function of their values]
  function calcPlan() {
    const t = calc.type, num = Analysis.toNum, name = String(calc.name || '').trim() || calcDefaultName();
    const need = (...k) => { k.forEach(x => { if (!calc[x]) throw new Error('choose the columns'); }); };
    if (t === 'bmi') {
      need('a', 'b');
      const div = calc.unit === 'm' ? 1 : 100, bmi = ([w, h]) => w / (h / div) ** 2;
      if (String(calc.a).startsWith('rep:')) {
        const v = state.cfg.variables.find(x => x.id === calc.a.slice(4)); if (!v) throw new Error('choose the weight');
        const base = name.replace(/_?kg_m2$/i, '') || 'BMI';
        return { desc: `BMI from ${v.label} at every timepoint and ${calc.b}`, repeated: { label: 'BMI (kg/m2)', from: v },
          items: v.cols.map(c => ({ name: `${base}_${c.tp}`, src: [c.col, calc.b], f: bmi, tp: c.tp, label: c.label })) };
      }
      return { desc: `${calc.a} / (${calc.b}${calc.unit === 'm' ? '' : ' / 100'})²`, items: [{ name, src: [calc.a, calc.b], f: bmi }] };
    }
    if (t === 'diff') { need('a', 'b'); return { desc: `${calc.b} − ${calc.a}`, items: [{ name, src: [calc.a, calc.b], f: ([a, b]) => b - a }] }; }
    if (t === 'pct') { need('a', 'b'); return { desc: `(${calc.b} − ${calc.a}) / ${calc.a} × 100`, items: [{ name, src: [calc.a, calc.b], f: ([a, b]) => a ? (b - a) / a * 100 : NaN }] }; }
    if (t === 'ratio') { need('a', 'b'); return { desc: `${calc.a} / ${calc.b}`, items: [{ name, src: [calc.a, calc.b], f: ([a, b]) => b ? a / b : NaN }] }; }
    if (t === 'log') { need('a'); return { desc: `${calc.base === '10' ? 'log10' : 'ln'}(${calc.a})`, items: [{ name, src: [calc.a], f: ([a]) => a > 0 ? (calc.base === '10' ? Math.log10(a) : Math.log(a)) : NaN }] }; }
    if (t === 'sum' || t === 'mean') {
      const cols = calc.cols || []; if (cols.length < 2) throw new Error('tick at least two columns');
      return { desc: `${t === 'sum' ? 'sum' : 'mean'} of ${cols.join(', ')}`, items: [{ name, src: cols, f: v => t === 'sum' ? v.reduce((a, b) => a + b, 0) : v.reduce((a, b) => a + b, 0) / v.length }] };
    }
    if (t === 'cat') {
      need('a');
      const cuts = String(calc.cuts ?? '18.5, 25, 30').split(/[,;]/).map(x => parseFloat(x.trim().replace(',', '.'))).filter(isFinite).sort((a, b) => a - b);
      const labels = String(calc.labels ?? 'Underweight, Normal, Overweight, Obese').split(',').map(x => x.trim()).filter(Boolean);
      if (!cuts.length || labels.length !== cuts.length + 1) throw new Error(`give ${cuts.length + 1} category names for ${cuts.length} cut-offs`);
      return { desc: `${calc.a}: ${labels.map((l, i) => `${l} ${i === 0 ? `< ${cuts[0]}` : i === cuts.length ? `≥ ${cuts[i - 1]}` : `${cuts[i - 1]}–<${cuts[i]}`}`).join(', ')}`, levels: labels, text: true,
        items: [{ name, src: [calc.a], f: ([a]) => labels[cuts.filter(c => a >= c).length] }] };
    }
    const fm = compileFormula(calc.expr);
    return { desc: String(calc.expr).trim(), items: [{ name, src: fm.cols, f: fm.f }] };
  }
  // value of one item for one patient: missing when any source value is missing or the result is not a number
  function calcValue(it, r, text) {
    const vals = it.src.map(c => Analysis.toNum(r[c]));
    if (vals.some(v => !isFinite(v))) return null;
    const v = it.f(vals);
    if (text) return v ?? null;
    return isFinite(v) ? Math.round(v * 100) / 100 : null;
  }
  function calcPreview() {
    try {
      const plan = calcPlan(), it = plan.items[0], r = state.data.rows.find(x => calcValue(it, x, plan.text) !== null);
      $('#calcPreview').textContent = `${plan.items.map(x => x.name).join(', ')} = ${plan.desc}${r ? ` — first patient: ${calcValue(it, r, plan.text)}` : ''}`;
      $('#calcPreview').style.color = '';
    } catch (e) { $('#calcPreview').textContent = e.message; $('#calcPreview').style.color = 'var(--bad)'; }
  }
  function applyCalc(plan, existing) {
    const { headers } = state.data, cfg = state.cfg;
    editSheet(() => {
      // new columns go after their (last) source column, at the start or end, or after a chosen column
      const where = calc.where || 'source';
      let at = where === 'end' ? headers.length : where === 'start' ? 0
        : where.startsWith('after:') && headers.includes(where.slice(6)) ? headers.indexOf(where.slice(6)) + 1
        : Math.max(...plan.items.flatMap(it => it.src.map(c => headers.indexOf(c)))) + 1;
      plan.items.forEach(it => {
        if (!headers.includes(it.name)) headers.splice(Math.min(at++, headers.length), 0, it.name);
        state.data.rows.forEach(r => { r[it.name] = calcValue(it, r, plan.text); });
      });
      const uid = () => 'calc' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      if (existing) return;
      // new variables: one repeated measure (BMI at every timepoint) or one single variable in the table of its first source column
      if (plan.repeated) {
        const pos = headers.indexOf(plan.items[0].name), from = plan.repeated.from;
        cfg.variables.push({ ...from, id: uid(), pos, label: plan.repeated.label, cols: plan.items.map(it => ({ col: it.name, tp: it.tp, ...(it.label ? { label: it.label } : {}) })),
          chart: undefined, caption: undefined, ylabel: undefined, include: true });
      } else {
        const it = plan.items[0], pos = headers.indexOf(it.name);
        const src = cfg.variables.find(v => v.kind === 'single' && v.cols[0].col === it.src[0]);
        const v = { ...singleVariable(state.data.rows, it.name, pos, String(calc.table || '').trim() || (src ? src.table : 'Other outcomes')), id: uid() };
        if (plan.levels) { v.type = 'categorical'; v.levels = plan.levels.filter(l => state.data.rows.some(r => r[it.name] === l)); }
        if (!cfg.variables.some(x => x.cols.some(c => c.col === it.name))) cfg.variables.push(v);
      }
      cfg.computed = [...(cfg.computed || []), { names: plan.items.map(i => i.name), desc: plan.desc, calc: JSON.parse(JSON.stringify(calc)) }];
      syncPositions(); // the variables follow the new column order
    });
  }
  $('#calcCard').addEventListener('input', e => {
    const k = e.target.dataset.calc;
    if (e.target.dataset.calccol !== undefined) { const h = e.target.dataset.calccol; calc.cols = e.target.checked ? [...(calc.cols || []), h] : (calc.cols || []).filter(x => x !== h); }
    else if (k) { calc[k] = e.target.value; if (k === 'type' || k === 'a') { if (k === 'type') calc.name = ''; renderCalcForm(); return; } }
    calcPreview();
  });
  $('#calcAdd').onclick = () => {
    readUiIntoCfg();
    let plan;
    try { plan = calcPlan(); } catch (e) { toast('Cannot calculate: ' + e.message); return; }
    const clash = plan.items.find(it => state.data.headers.includes(it.name));
    if (clash && !confirm(`A column named “${clash.name}” exists. Replace its values?`)) return;
    applyCalc(plan, !!clash);
    const n = state.data.rows.filter(r => r[plan.items[0].name] !== null).length;
    toast(`${plan.items.map(i => i.name).join(', ')} added (${n} of ${state.data.rows.length} patients have a value)`);
    calc.name = ''; renderVariables();
  };
  $('#calcList').addEventListener('click', e => {
    const b = e.target.closest('[data-calcre]'); if (!b) return;
    const c = state.cfg.computed[+b.dataset.calcre], keep = { ...calc };
    Object.keys(calc).forEach(k => delete calc[k]); Object.assign(calc, c.calc);
    try { const plan = calcPlan(); state.cfg.computed.splice(+b.dataset.calcre, 1); applyCalc(plan, true); state.cfg.computed.push(c); toast('Recalculated from the current sheet'); }
    catch (err) { toast('Cannot recalculate: ' + err.message); }
    Object.keys(calc).forEach(k => delete calc[k]); Object.assign(calc, keep); renderVariables();
  });

  /* ---------- figures by variable + live preview ---------- */
  const CHART_TYPES = {
    repeated: [['auto', 'Auto (chart style)'], ['bar', 'Bars'], ['line', 'Lines over time'], ['meanci', 'Means with 95% CI over time'], ['box', 'Box plots'], ['dot', 'Box plots + every patient'], ['violin', 'Violin plots'], ['rain', 'Raincloud plots'], ['waterfall', 'Waterfall (each patient, first → last)'], ['none', 'No figure']],
    numeric: [['auto', 'Auto'], ['bar', 'Bars (mean ± error / median, IQR)'], ['box', 'Box plot'], ['violin', 'Violin plot'], ['dot', 'Dot plot (every patient)'], ['meanci', 'Mean with 95% CI (error plot)'], ['dotci', 'Every patient + mean with 95% CI'], ['rain', 'Raincloud plot'], ['hist', 'Histogram'], ['none', 'No figure']],
    categorical: [['auto', 'Auto (bars)'], ['hbar', 'Horizontal bars'], ['stacked', '100% stacked bar'], ['pie', 'Donut'], ['piefull', 'Pie'], ['mosaic', 'Mosaic (widths = group sizes)'], ['none', 'No figure']]
  };
  const chartKind = v => v.kind === 'repeated' ? 'repeated' : v.type;
  // one chart type for every variable of a kind
  [['#fbNum', 'numeric'], ['#fbCat', 'categorical'], ['#fbRep', 'repeated']].forEach(([id, kind]) => {
    $(id).onchange = e => { const k = e.target.value; if (!k) return; readUiIntoCfg();
      let n = 0; state.cfg.variables.forEach(v => { if (v.include && chartKind(v) === kind) { v.chart = k; n++; } });
      e.target.value = ''; renderFigureTable(); toast(`${n} ${kind} variable${n === 1 ? '' : 's'}: ${CHART_TYPES[kind].find(x => x[0] === k)[1]}`); };
  });
  function renderFigureTable() {
    [['#fbNum', 'numeric'], ['#fbCat', 'categorical'], ['#fbRep', 'repeated']].forEach(([id, kind]) => { $(id).innerHTML = `<option value="">${kind}…</option>` + CHART_TYPES[kind].map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join(''); });
    const vars = state.cfg.variables.filter(v => v.include);
    $('#figTbl').innerHTML = `<thead><tr><th>Variable</th><th>Chart type</th><th>Caption (optional)</th><th>Y-axis title (optional)</th><th>Y axis from – to</th><th>Reference line (value, label)</th><th>Log scale</th><th>Shape</th><th></th></tr></thead><tbody>${vars.map(v => `<tr>
      <td><b>${esc(v.label)}</b>${v.memo ? ` <span title="${esc(v.memo)}" style="cursor:help">ℹ</span>` : ''}<div class="legend-note">${v.kind === 'repeated' ? 'repeated' : v.type}</div></td>
      <td><select data-fv="${v.id}" data-fk="chart">${CHART_TYPES[chartKind(v)].map(([k, l]) => `<option value="${k}" ${(v.chart || 'auto') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td><input type="text" data-fv="${v.id}" data-fk="caption" value="${esc(v.caption || '')}" placeholder="${esc(v.label)} of the studied groups"></td>
      <td><input type="text" data-fv="${v.id}" data-fk="ylabel" value="${esc(v.ylabel || '')}" placeholder="${esc(v.type === 'categorical' ? '% of the studied patients' : v.label)}"></td>
      <td style="white-space:nowrap">${v.type === 'categorical' ? '<span class="legend-note">—</span>' : `<input type="text" class="mini" data-fv="${v.id}" data-fk="ymin" value="${esc(v.ymin || '')}" placeholder="auto"> – <input type="text" class="mini" data-fv="${v.id}" data-fk="ymax" value="${esc(v.ymax || '')}" placeholder="auto">`}</td>
      <td style="white-space:nowrap">${v.type === 'categorical' ? '<span class="legend-note">—</span>' : `<input type="text" class="mini" data-fv="${v.id}" data-fk="ref" value="${esc(v.ref || '')}" placeholder="value"> <input type="text" data-fv="${v.id}" data-fk="refLabel" value="${esc(v.refLabel || '')}" placeholder="label, e.g. Normal limit" style="min-width:120px;width:140px">`}</td>
      <td>${v.type === 'numeric' ? `<label class="check" style="margin:0"><input type="checkbox" data-fv="${v.id}" data-fk="logY" ${v.logY ? 'checked' : ''}><span>log</span></label>` : ''}</td>
      <td><select data-fv="${v.id}" data-fk="aspect">${[['', 'As in the style'], ['wide', 'Wide'], ['standard', '4:3'], ['square', 'Square'], ['tall', 'Tall']].map(([k, l]) => `<option value="${k}" ${(v.aspect || '') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td><button class="btn ghost small" data-fprev="${v.id}" type="button" title="Preview this figure">👁</button></td></tr>`).join('')}</tbody>`;
    const cur = $('#figPrevVar').value;
    $('#figPrevVar').innerHTML = vars.map(v => `<option value="${v.id}">${esc(v.label)}</option>`).join('');
    if (vars.some(v => v.id === cur)) $('#figPrevVar').value = cur;
    schedulePreview();
  }
  let prevTimer = null;
  const schedulePreview = () => { clearTimeout(prevTimer); prevTimer = setTimeout(drawFigurePreview, 200); };
  // runs the analysis for the chosen variable only, with the options as they stand on the page
  function drawFigurePreview() {
    if (!isActive(7)) return;
    readUiIntoCfg();
    renderPalGallery();
    const cfg = state.cfg, v = cfg.variables.find(x => x.id === $('#figPrevVar').value), cv = $('#figPrevCanvas');
    if (!v) { cv.width = cv.height = 0; $('#figPrevNote').textContent = 'No variable selected.'; return; }
    try {
      const res = Analysis.run(state.data, { ...cfg, variables: [{ ...v, include: true }], advanced: [], options: { ...cfg.options, correlation: false, figures: 'all' } });
      const f = res.sections.flatMap(x => x.figures)[0];
      if (!f) { cv.width = cv.height = 0; $('#figPrevNote').textContent = 'No figure for this variable (chart type “No figure”).'; return; }
      figVarProps(f); renderFigure(f, cfg.options); state.prevFig = f; state.prevHits = Charts.hits();
      const img = new Image();
      img.onload = () => { cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0); };
      img.src = f.url;
      $('#figPrevNote').textContent = `${Report.figLabel(1, cfg.options.captionStyle)} ${f.caption}`;
    } catch (err) { console.error(err); $('#figPrevNote').textContent = 'Preview failed: ' + err.message; }
  }
  $('#p7').addEventListener('input', schedulePreview);
  // hover values in the preview: the nearest bar, point or box under the mouse
  $('#figPrevCanvas').addEventListener('mousemove', e => {
    const h = state.prevHits, tip = $('#figPrevTip'); if (!h || !h.list.length) { tip.style.display = 'none'; return; }
    const r = e.target.getBoundingClientRect(), lx = (e.clientX - r.left) / r.width * h.W, ly = (e.clientY - r.top) / r.height * h.H;
    let best = null, bd = 60 * 60; h.list.forEach(p => { const d = (p.x - lx) ** 2 + (p.y - ly) ** 2; if (d < bd) { bd = d; best = p; } });
    if (!best) { tip.style.display = 'none'; return; }
    tip.textContent = best.t; tip.style.display = 'block'; tip.style.left = (e.clientX - r.left + 14) + 'px'; tip.style.top = (e.clientY - r.top + 10) + 'px';
  });
  $('#figPrevCanvas').addEventListener('mouseleave', () => { $('#figPrevTip').style.display = 'none'; });
  $('#figPrevPng').onclick = () => { const f = state.prevFig; if (f) openFigExport([chartItem(f, String(f.caption), state.cfg.options)]); };
  $('#p7').addEventListener('change', schedulePreview);
  /* ---------- design previews: a real table (step 5) and four sample figures (step 7), redrawn as the options change ---------- */
  let designTimer = null;
  const scheduleDesign = fn => () => { clearTimeout(designTimer); designTimer = setTimeout(() => { if (!state.cfg) return; readUiIntoCfg(); fn(); }, 250); };
  // step 5 tools: headings of the group columns, merging two tables, saved table styles
  function renderTableTools() {
    const cfg = state.cfg; if (!cfg || !state.data) return;
    const th = cfg.tableHeads || {}, groups = cfg.noGroups ? [] : activeGroups();
    $('#tableHeadsBox').innerHTML = groups.length > 1 ? groups.map(g => `<div><label class="f">${esc(cfg.groupLabels[g] || g)}</label><input type="text" data-thead="${esc(g)}" value="${esc(th[g] || '')}" placeholder="${esc(cfg.groupLabels[g] || g)}"></div>`).join('') : '<p class="legend-note">No study groups.</p>';
    const tabs = [...new Set(cfg.variables.filter(v => v.include !== false && v.kind === 'single' && v.table).map(v => v.table))];
    $('#mtFrom').innerHTML = tabs.map(t => `<option>${esc(t)}</option>`).join(''); $('#mtInto').innerHTML = tabs.map((t, i) => `<option ${i === 1 ? 'selected' : ''}>${esc(t)}</option>`).join('');
    const ts = tableStyles(); $('#tsList').innerHTML = '<option value="">— saved table styles —</option>' + Object.keys(ts).map(n => `<option>${esc(n)}</option>`).join('');
  }
  $('#tableHeadsBox').addEventListener('input', e => { const g = e.target.dataset.thead; if (g === undefined) return; const th = state.cfg.tableHeads = state.cfg.tableHeads || {};
    if (e.target.value.trim()) th[g] = e.target.value; else delete th[g]; });
  $('#mtGo').onclick = () => {
    const from = $('#mtFrom').value, into = $('#mtInto').value; if (!from || !into || from === into) { toast('Choose two different tables'); return; }
    let n = 0; state.cfg.variables.forEach(v => { if (v.table === from) { v.table = into; n++; } });
    renderTableTools(); renderTablePreview(); toast(`${n} variable${n === 1 ? '' : 's'} moved from “${from}” into “${into}”`);
  };
  // table styles: every option of step 5, saved in this browser under a name
  const TS_KEY = 'pmse-table-styles';
  const tableStyles = () => { try { return JSON.parse(localStorage.getItem(TS_KEY) || '{}'); } catch (e) { return {}; } };
  const step5Keys = () => Object.entries(OPTION_FIELDS).filter(([, [id]]) => { const el = $('#' + id); return el && $('#p5').contains(el); }).map(([k]) => k);
  $('#tsSave').onclick = () => {
    readUiIntoCfg(); const name = (prompt('Name of this table style:', 'My journal style') || '').trim(); if (!name) return;
    const ts = tableStyles(); ts[name] = Object.fromEntries(step5Keys().map(k => [k, state.cfg.options[k]]));
    try { localStorage.setItem(TS_KEY, JSON.stringify(ts)); } catch (e) { toast('This browser does not allow saving'); return; }
    renderTableTools(); $('#tsList').value = name; toast(`Table style “${name}” saved`);
  };
  $('#tsApply').onclick = () => { const st = tableStyles()[$('#tsList').value]; if (!st) return; Object.assign(state.cfg.options, st); renderOptions(); renderTablePreview(); toast(`Table style “${$('#tsList').value}” applied`); };
  $('#tsDel').onclick = () => { const n = $('#tsList').value, ts = tableStyles(); if (!n || !ts[n] || !confirm(`Delete the table style “${n}”?`)) return; delete ts[n];
    try { localStorage.setItem(TS_KEY, JSON.stringify(ts)); } catch (e) { } renderTableTools(); };
  $('#p5').addEventListener('change', scheduleDesign(() => renderTablePreview()));
  $('#p5').addEventListener('input', scheduleDesign(() => renderTablePreview()));
  $('#p7').addEventListener('change', scheduleDesign(() => renderFigDesign()));
  // one numeric and one or two categorical variables of the sheet, analysed with the current options (a significant one first when there is one)
  function previewSection() {
    const cfg = state.cfg, o = cfg.options, singles = cfg.variables.filter(v => v.include && v.kind === 'single' && v.cols[0].col !== cfg.groupCol);
    const pick = [singles.find(v => v.type === 'numeric'), ...singles.filter(v => v.type === 'categorical').slice(0, 2)].filter(Boolean).slice(0, 3);
    if (!pick.length) return { msg: 'Tick at least one variable in step 2 to see a preview.' };
    try { return { s: Analysis.run(state.data, { ...cfg, variables: pick.map(v => ({ ...v, include: true, table: pick[0].table || 'Demographic and baseline data' })), advanced: [], consort: null, options: { ...o, correlation: false, figures: 'none', summary: false } }).sections.find(x => x.rows && x.rows.length) }; }
    catch (err) { console.error(err); return { msg: err.message }; }
  }
  function renderCommentPreview() {
    const box = $('#comPreview'); if (!box || !state.cfg || !state.data) return;
    const o = state.cfg.options, { s, msg } = previewSection();
    box.style.fontFamily = `'${o.font}', serif`;
    box.innerHTML = msg ? `<p class="legend-note">${esc(msg)}</p>` : !s ? '' : o.commentPlace === 'none' ? '<p class="legend-note">Comments are switched off (Comment placement: No comments).</p>'
      : `<div class="legend-note" style="margin-bottom:6px">Comment ${o.commentPlace === 'before' ? 'before' : 'after'} “Table 1: ${esc(s.title)}”${s.comment ? ` · ${s.comment.split(/\s+/).length} words` : ''}</div><div class="pcom" style="margin:0">${esc(s.comment || '')}</div>`;
  }
  $('#p6').addEventListener('change', scheduleDesign(() => renderCommentPreview()));
  $('#p6').addEventListener('input', e => { if (['optTplSig', 'optTplNs', 'optPhraseDict', 'optComMaxWords'].includes(e.target.id)) scheduleDesign(() => renderCommentPreview())(); });
  // presets: several comment options at once
  const COM_PRESET = {
    thesis: { commentStyle: 'detailed', pWord: 'P value', notSig: false, commentMagnitude: true, commentEffect: false, commentTone: 'standard', summary: true, varyWording: false },
    journal: { commentStyle: 'concise', pWord: 'P', notSig: true, commentMagnitude: false, commentEffect: true, commentTone: 'standard', varyWording: true },
    plain: { commentStyle: 'concise', pWord: 'P value', notSig: true, commentMagnitude: false, commentEffect: false, commentTone: 'plain', varyWording: true }
  };
  $('#comPreset').onchange = e => { const p = COM_PRESET[e.target.value]; if (!p) return; readUiIntoCfg(); Object.assign(state.cfg.options, p); renderOptions(); renderCommentPreview(); toast(`Preset applied: ${e.target.selectedOptions[0].textContent}`); e.target.value = ''; };
  /* ---------- test plan (step 4): the test each variable gets, and the post hoc test when the result is significant ---------- */
  function postHocOf(it, o, k) {
    if (k < 3) return k === 2 ? '—' : '';
    const t = (it.test || '').toLowerCase();
    if (it.kind === 'repeated') return `Groups at each timepoint; ${o.rmPost === 'all' ? 'every pair of timepoints' : 'each timepoint vs the first'} within groups (${{ bonferroni: 'Bonferroni', holm: 'Holm', none: 'unadjusted' }[o.rmAdjust] || o.rmAdjust})`;
    if (it.kind === 'categorical') return o.chiPost ? `Chi-square / Fisher between each two groups (${{ holm: 'Holm', none: 'no correction' }[o.chiAdjust] || 'Bonferroni'})` : '— (switched off)';
    if (/kruskal/.test(t)) return o.dunn ? "Dunn's test (Bonferroni)" : `Mann-Whitney${o.mwAdjust && o.mwAdjust !== 'none' ? ` (${o.mwAdjust === 'holm' ? 'Holm' : 'Bonferroni'})` : ''}`;
    if (/welch/.test(t)) return 'Games-Howell';
    if (/anova/.test(t)) return 'Tukey HSD';
    return '—';
  }
  function renderTestPlan() {
    const tbl = $('#testPlan'); if (!tbl || !state.cfg || !state.data) return;
    let x; try { x = Analysis.explore(state.data, state.cfg, {}); } catch (e) { tbl.innerHTML = `<tbody><tr><td>${esc(e.message)}</td></tr></tbody>`; return; }
    const o = state.cfg.options, k = x.k;
    tbl.innerHTML = `<thead><tr><th>Variable</th><th>Type</th><th>Distribution</th><th>Test between the groups</th><th>Post hoc (when significant)</th><th>Normality P (per group)</th><th>Levene P</th><th>Sphericity (Mauchly)</th><th>P value</th><th>Check</th></tr></thead><tbody>${x.items.map(it => {
      const nps = (it.normPs || []).map(p => isFinite(p) ? Analysis.fmtP(p, -1) : '—').join(' / ') || '—';
      const chk = it.disagree ? '<span class="chip warn" title="The parametric and non-parametric tests disagree on significance — check the distribution">⚠ tests disagree</span>' : '';
      const v = state.cfg.variables.find(q => q.id === it.id), forced = v && v.dist && v.dist !== 'auto' ? ` · set to ${v.dist === 'param' ? 'parametric' : 'non-parametric'}` : '';
      return `<tr><td class="b">${esc(it.label)}</td><td>${it.kind}</td><td>${esc((it.normal || '—') + forced)}</td><td>${esc(it.test || '—')}</td><td>${esc(postHocOf(it, o, k))}</td><td>${esc(nps)}</td><td>${isFinite(it.levP) ? esc(Analysis.fmtP(it.levP, -1)) : '—'}</td><td>${it.sph ? esc(`W = ${it.sph.W.toFixed(3)}, P ${Analysis.fmtP(it.sph.p, -1)}`) : '—'}</td><td class="${it.sig ? 'sig' : ''}">${isFinite(it.p) ? esc(Analysis.fmtP(it.p, o.alpha)) : it.sig ? 'significant' : '—'}</td><td>${chk}</td></tr>`; }).join('')}</tbody>`;
  }
  $('#p4').addEventListener('change', scheduleDesign(() => renderTestPlan()));
  // sample size for two groups: means (difference, SD) or proportions, at the chosen α, power and allocation ratio
  function renderPower() {
    const box = $('#pwOut'); if (!box) return;
    const kind = $('#pwKind').value, a = +$('#pwAlpha').value || 0.05, pw = +$('#pwPower').value / 100 || 0.8, ratio = +$('#pwRatio').value || 1, A = +$('#pwA').value, B = +$('#pwB').value;
    $('#pwALab').textContent = kind === 'means' ? 'Mean difference to detect' : 'Proportion in group 1 (%)'; $('#pwBLab').textContent = kind === 'means' ? 'Standard deviation' : 'Proportion in group 2 (%)';
    let r = null;
    if (kind === 'means' && A > 0 && B > 0) r = Stats.nTwoMeans(A, B, a, pw, ratio);
    if (kind === 'props' && A > 0 && A < 100 && B > 0 && B < 100 && A !== B) r = Stats.nTwoProps(A / 100, B / 100, a, pw, ratio);
    if (!r) { box.textContent = 'Enter the values above.'; return; }
    const drop = +$('#pwDrop').value || 0, up = n => Math.ceil(n / (1 - drop / 100));
    box.innerHTML = `<b>${r.n1} + ${r.n2} = ${r.n1 + r.n2} patients</b>${drop ? ` · with ${drop}% drop-out: <b>${up(r.n1)} + ${up(r.n2)} = ${up(r.n1) + up(r.n2)}</b>` : ''}<br><span class="legend-note">${kind === 'means'
      ? `Two-sided independent t-test, α = ${a}, power ${Math.round(pw * 100)}%, effect size d = ${(A / B).toFixed(2)}.` : `Two-sided comparison of two proportions (normal approximation), α = ${a}, power ${Math.round(pw * 100)}%.`}</span>`;
  }
  ['#pwKind', '#pwAlpha', '#pwPower', '#pwRatio', '#pwA', '#pwB', '#pwDrop'].forEach(id => { const el = $(id); if (el) el.addEventListener('input', renderPower); });
  if ($('#pwKind')) renderPower();
  $('#planXlsx').onclick = () => { const wb = XLSX.utils.table_to_book($('#testPlan'), { sheet: 'Test plan' }); XLSX.writeFile(wb, `${baseName()} - Test plan.xlsx`); };
  function renderTablePreview() {
    const box = $('#tblPreview'); if (!box || !state.cfg || !state.data) return;
    const o = state.cfg.options, { s, msg } = previewSection();
    if (msg) { box.innerHTML = `<p class="legend-note">${esc(msg)}</p>`; return; }
    if (!s) { box.innerHTML = ''; return; }
    const apa = o.tableCaption === 'apa', align = { justify: 'justify', left: 'left' }[o.tableCapAlign] || 'center';
    const cap = apa ? `<div class="pcap" style="text-align:left">Table 1</div><div class="pcap" style="text-align:left;font-weight:400;font-style:italic">${esc(s.title)}</div>`
      : `<div class="pcap" style="text-align:${align}">Table 1${o.tableCaption === 'period' ? '.' : ':'} ${esc(s.title)}</div>`;
    const comment = o.commentPlace !== 'none' && s.comment ? `<div class="pcom">${esc(s.comment)}</div>` : '';
    box.style.fontFamily = `'${o.font}', serif`;
    box.innerHTML = (o.commentPlace === 'before' ? comment : '') + cap + htmlTable(s.head, s.rows) + `<div class="pfoot">${esc(s.footnote || '')}</div>` + (o.commentPlace === 'after' ? comment : '');
  }
  function renderFigDesign() {
    const box = $('#figDesign'); if (!box || !state.cfg) return;
    const o = state.cfg.options, gl = state.data ? activeGroups().map(g => state.cfg.groupLabels[g] || g).slice(0, 3) : [];
    const groups = gl.length >= 2 ? gl : ['A group', 'B group'];
    const R = (k => () => (k = (k * 16807) % 2147483647) / 2147483647)(7), nrm = (m, sd) => m + sd * Math.sqrt(-2 * Math.log(R())) * Math.cos(2 * Math.PI * R());
    const tps = ['Baseline', 'Month 1', 'Month 3', 'Month 6'], err = o.errorBar, lab = !!o.valueLabels;
    const specs = [
      ['Groups compared (bars, mean ± error)', { type: 'bar', perGroup: true, categories: groups, yLabel: 'Age (years)', labels: lab, alpha: 0.05, errKind: err,
        series: [{ name: 'Age', values: groups.map((_, i) => 52 + i * 6), err: groups.map(() => 7) }], sig: o.sigMarks ? [{ i: 0, j: groups.length - 1, p: 0.004 }] : [], legend: false }],
      ['Change over time (lines)', { type: 'line', categories: tps, yLabel: 'VAS', alpha: 0.05, errKind: err,
        series: groups.map((g, i) => ({ name: g, values: tps.map((_, t) => 7 - t * (1.4 - i * 0.5)), err: tps.map(() => 1) })), sigCat: o.sigMarks ? [0.6, 0.03, 0.002, 0.0004] : [] }],
      ['Distribution (box plots)', { type: 'box', categories: tps.slice(0, 3), yLabel: 'WOMAC', alpha: 0.05, points: !!o.points,
        series: groups.map((g, i) => ({ name: g, data: tps.slice(0, 3).map((_, t) => Array.from({ length: 24 }, () => nrm(60 - t * (8 - i * 4), 9))) })), sigCat: o.sigMarks ? [0.5, 0.01, 0.0008] : [] }],
      ['Categories (100% stacked bars)', { type: 'stacked', categories: groups, yLabel: 'Patients (%)',
        series: ['Poor', 'Fair', 'Good', 'Excellent'].map((n, k) => ({ name: n, values: groups.map((_, i) => [[15, 35, 35, 15], [5, 20, 45, 30], [10, 30, 40, 20]][i % 3][k]) })) }]
    ];
    box.innerHTML = specs.map(([t, sp]) => { let url = ''; try { url = Charts.draw({ ...sp, title: o.chartTitle ? t : null }, chartPalette(o), { ...chartStyle(o), res: 1 }).toDataURL('image/png'); } catch (e) { console.error(e); }
      return `<figure>${url ? `<img src="${url}" alt="">` : ''}<figcaption>${esc(t)}</figcaption></figure>`; }).join('');
  }
  $('#figTbl').addEventListener('click', e => { const b = e.target.closest('[data-fprev]'); if (b) { $('#figPrevVar').value = b.dataset.fprev; schedulePreview(); } });

  $('#tpTbl').addEventListener('click', e => {
    const b = e.target.closest('[data-tpmove]'); if (!b) return;
    readUiIntoCfg();
    const [i, d] = b.dataset.tpmove.split(',').map(Number), o = state.cfg.tpOrder, j = i + d;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]]; renderTimepoints();
  });

  /* ---------- advanced analyses (regression, ROC) ---------- */
  const ADV_TYPES = { paired: 'Paired comparison (two measurements)', correlation: 'Correlation (Pearson / Spearman)', linear: 'Linear regression', logistic: 'Logistic regression', roc: 'ROC curve', ancova: 'ANCOVA (adjusted group comparison)', survival: 'Kaplan-Meier survival',
    cox: 'Cox regression (hazard ratios)', mcnemar: 'McNemar test (paired categorical)', kappa: "Cohen's kappa (agreement, categorical)",
    agreement: 'ICC + Bland-Altman (agreement, numeric)', diagnostic: 'Diagnostic accuracy (2×2)', cronbach: "Cronbach's alpha (reliability)", cochran: "Cochran's Q (the same yes/no outcome measured repeatedly)",
    count: 'Poisson / negative binomial regression (counts)', ordinal: 'Ordinal logistic regression', multinom: 'Multinomial logistic regression', methodcomp: 'Method comparison (Passing-Bablok / Deming)',
    pca: 'Principal component analysis (questionnaire items)', partial: 'Partial correlation', anova2: 'Two-way ANOVA (group × factor)', mediation: 'Mediation analysis (X → M → Y)',
    psm: 'Propensity-score matching and weighting', lmm: 'Linear mixed model (repeated outcome + covariates)',
    tost: 'Equivalence (TOST, two one-sided t-tests)', mh: 'Mantel-Haenszel (stratified odds ratio)', clogit: 'Conditional logistic regression (matched sets)',
    cif: 'Competing risks (cumulative incidence)', tdroc: 'Time-dependent ROC (AUC at set times)', quantreg: 'Quantile (median) regression', fleiss: "Fleiss' kappa (agreement of 3+ raters)",
    rmcorr: 'Repeated-measures correlation (long data)', firth: 'Firth logistic regression (small samples, separation)', mi: 'Regression with multiple imputation',
    noninf: 'Non-inferiority / equivalence / superiority trial', gee: 'GEE / mixed-effects logistic (repeated binary, count or numeric outcome)' };
  // the analyses by category: the add buttons, the headings of the list and the order of "group by category"
  const ADV_GROUPS = [
    ['Compare groups', 'Adjusted, stratified and matched comparisons of the study groups', [['ancova', 'ANCOVA'], ['anova2', 'Two-way ANOVA'], ['mh', 'Mantel-Haenszel'], ['psm', 'Propensity score']]],
    ['Non-inferiority & equivalence trials', 'A margin for the difference: non-inferiority, equivalence or superiority, ITT and per-protocol', [['noninf', 'Non-inferiority / equivalence / superiority'], ['tost', 'Equivalence of means (TOST)']]],
    ['Paired & repeated measurements', 'The same patients measured twice or more', [['paired', 'Paired comparison'], ['mcnemar', 'McNemar (paired categorical)'], ['cochran', "Cochran's Q (repeated yes/no)"], ['lmm', 'Linear mixed model'], ['gee', 'GEE / mixed logistic (binary repeated)'], ['rmcorr', 'Repeated-measures correlation']]],
    ['Correlation & mediation', 'Associations between numeric variables', [['correlation', 'Correlation'], ['partial', 'Partial correlation'], ['mediation', 'Mediation']]],
    ['Regression models', 'Predictors of an outcome', [['linear', 'Linear'], ['logistic', 'Logistic'], ['firth', 'Firth logistic'], ['mi', 'With multiple imputation'], ['quantreg', 'Quantile (median)'], ['count', 'Poisson / negative binomial'], ['ordinal', 'Ordinal logistic'], ['multinom', 'Multinomial logistic'], ['clogit', 'Conditional logistic']]],
    ['Survival & time to event', 'Follow-up time with an event', [['survival', 'Kaplan-Meier'], ['cox', 'Cox regression'], ['cif', 'Competing risks'], ['tdroc', 'Time-dependent ROC']]],
    ['Diagnostic accuracy & prediction', 'Tests against a reference standard', [['roc', 'ROC curve'], ['diagnostic', 'Diagnostic accuracy (2×2)']]],
    ['Agreement, reliability & questionnaires', 'Raters, methods and scales', [['kappa', "Cohen's kappa"], ['fleiss', "Fleiss' kappa"], ['agreement', 'ICC / Bland-Altman'], ['methodcomp', 'Passing-Bablok / Deming'], ['cronbach', "Cronbach's alpha"], ['pca', 'PCA (items)']]]];
  const ADV_CAT = {}; ADV_GROUPS.forEach(([g, , list], gi) => list.forEach(([t]) => { ADV_CAT[t] = gi; }));
  $('#advAdd').innerHTML = ADV_GROUPS.map(([g, note, list]) => `<div class="adv-cat"><h4>${esc(g)}</h4><p class="legend-note">${esc(note)}</p><div class="btns">${list.map(([t, l]) => `<button class="btn ghost small" data-advadd="${t}" type="button" title="${esc(ADV_TYPES[t] || l)}" data-find="${esc((l + ' ' + (ADV_TYPES[t] || '') + ' ' + g).toLowerCase())}">+ ${esc(l)}</button>`).join('')}</div></div>`).join('');
  $('#advFind').oninput = e => { const q = e.target.value.trim().toLowerCase();
    document.querySelectorAll('#advAdd .adv-cat').forEach(c => { let any = false; c.querySelectorAll('[data-advadd]').forEach(b => { const ok = !q || b.dataset.find.includes(q); b.classList.toggle('hide', !ok); any = any || ok; }); c.classList.toggle('hide', !any); }); };
  $('#advSortCat').onclick = () => { readUiIntoCfg(); const A = state.cfg.advanced; if (A.length < 2) return; const idx = A.map((a, i) => [a, i]); idx.sort((x, y) => (ADV_CAT[x[0].type] ?? 99) - (ADV_CAT[y[0].type] ?? 99) || x[1] - y[1]);
    state.cfg.advanced = idx.map(x => x[0]); renderAdvanced(); toast('Analyses grouped by category — the report follows this order'); };
  const analysedRows = () => { const g = activeGroups(); return Analysis.filterRows(state.cfg, state.data.rows).filter(r => g.includes(Analysis.groupOf(state.cfg, r))); };
  function advColumns() {
    const cfg = state.cfg, rows = analysedRows();
    return state.data.headers.filter(h => !cfg.idCols.includes(h)).map(h => ({ col: h, label: Analysis.columnLabel(cfg, h), kind: Analysis.columnKind(cfg, rows, h) }));
  }
  // the label of a coded value from the variable's value labels (1 → Male), else the value itself
  function valueLabel(col, l) {
    const v = state.cfg.variables.find(x => x.type === 'categorical' && x.valueLabels && x.cols.some(c => c.col === col));
    const m = v ? Analysis.parseValueLabels(v.valueLabels) : {};
    return Object.prototype.hasOwnProperty.call(m, l) ? m[l] : l;
  }
  function defaultPositive(col) {
    const lv = Analysis.levelsOf(state.cfg, analysedRows(), col);
    return lv.find(l => [l, valueLabel(col, l)].some(t => Analysis.POSITIVE.test(t) || /^(dead|death|died|event|relapse|recurrence)$/i.test(t))) || lv[lv.length - 1] || '';
  }
  function renderAdvanced() {
    const cfg = state.cfg, cols = advColumns(), rows = analysedRows();
    const isCat = c => c.kind === 'categorical' && Analysis.levelsOf(cfg, rows, c.col).length >= 2;
    const select = (key, label, list, value) => `<div><label class="f">${label}</label><select data-af="${key}"><option value="">— choose —</option>${
      list.map(c => `<option value="${esc(c.col)}" ${c.col === value ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>`;
    const levelSelect = (label, col, value, key = 'positive') => `<div><label class="f">${label}</label><select data-af="${key}">${
      (col ? Analysis.levelsOf(cfg, rows, col) : []).map(l => { const t = valueLabel(col, l); return `<option value="${esc(l)}" ${l === value || t === value ? 'selected' : ''}>${esc(t === l ? l : `${t} (${l})`)}</option>`; }).join('')}</select></div>`;
    $('#advList').innerHTML = cfg.advanced.length ? cfg.advanced.map((a, ai) => {
      const t = a.type, num = cols.filter(c => c.kind === 'numeric');
      let fields = '', predLabel = '', preds = [];
      if (t === 'linear') { fields = select('outcome', 'Dependent variable (outcome)', num, a.outcome) + '<div></div>'; predLabel = 'Predictors (independent variables)'; preds = cols; }
      if (t === 'logistic') { fields = select('outcome', 'Dependent variable (outcome)', cols.filter(isCat), a.outcome) + levelSelect('Positive (event) value', a.outcome, a.positive); predLabel = 'Predictors (independent variables)'; preds = cols; }
      if (t === 'roc') { fields = select('outcome', 'Outcome (true state)', cols.filter(isCat), a.outcome) + levelSelect('Positive (event) value', a.outcome, a.positive); predLabel = 'Test variables (numeric)'; preds = num; }
      if (t === 'ancova') { fields = select('outcome', 'Outcome compared between the study groups', num, a.outcome) + '<div></div>'; predLabel = 'Covariates to adjust for (e.g. the baseline value, age)'; preds = cols.filter(c => c.col !== cfg.groupCol); }
      if (t === 'survival') fields = select('outcome', 'Follow-up time', num, a.outcome) + select('event', 'Event column', cols.filter(isCat), a.event)
        + levelSelect('Event value (others are censored)', a.event, a.positive)
        + `<div><label class="f">Survival at time(s) (optional)</label><input type="text" data-af="at" value="${esc(a.at || '')}" placeholder="e.g. 12 or 6, 12, 24"></div>`;
      const cat = cols.filter(isCat);
      if (t === 'cox') { fields = select('outcome', 'Follow-up time', num, a.outcome) + select('event', 'Event column', cat, a.event) + levelSelect('Event value (others are censored)', a.event, a.positive); predLabel = 'Predictors (covariates, e.g. group, age, stage)'; preds = cols.filter(c => c.col !== a.event); }
      if (t === 'mcnemar') fields = select('outcome', 'First measurement (e.g. before)', cat, a.outcome) + select('second', 'Second measurement (e.g. after)', cat.filter(c => c.col !== a.outcome), a.second) + levelSelect('Category to report', a.outcome, a.positive);
      if (t === 'kappa') fields = select('outcome', 'Rater / method A', cat, a.outcome) + select('second', 'Rater / method B', cat.filter(c => c.col !== a.outcome), a.second);
      if (t === 'paired') fields = select('outcome', 'First measurement (e.g. before)', num, a.outcome) + select('second', 'Second measurement (e.g. after)', num.filter(c => c.col !== a.outcome), a.second);
      if (t === 'agreement') fields = select('outcome', 'Method / rater A', num, a.outcome) + select('second', 'Method / rater B', num.filter(c => c.col !== a.outcome), a.second);
      if (t === 'diagnostic') fields = select('outcome', 'Reference standard (true diagnosis)', cat, a.outcome) + levelSelect('Condition present when', a.outcome, a.positive)
        + select('event', 'Index test (categorical result)', cat.filter(c => c.col !== a.outcome), a.event) + levelSelect('Test positive when', a.event, a.eventPositive, 'eventPositive');
      if (t === 'correlation') { fields = select('outcome', 'Main variable (optional — correlated with each ticked variable)', cols.filter(c => Analysis.isNumberColumn(rows, c.col)), a.outcome)
        + '<p class="legend-note" style="margin:22px 0 0">Leave the main variable empty to correlate every pair of the ticked variables.</p>'; predLabel = 'Variables (numeric or ordinal scores)'; preds = cols.filter(c => Analysis.isNumberColumn(rows, c.col)); }
      if (t === 'cronbach') { fields = '<p class="legend-note" style="margin:0">Tick the questionnaire items (numeric scores). Patients with any missing item are left out.</p>'; predLabel = 'Items'; preds = cols.filter(c => Analysis.isNumberColumn(rows, c.col)); }
      if (t === 'cochran') { fields = `<p class="legend-note" style="margin:0">Tick the measurements in time order (e.g. Complication_D1, _D3, _D7). Patients with every measurement are used.</p><div><label class="f">Counted as</label><input type="text" data-af="positive" value="${esc(a.positive || 'Yes')}" style="width:120px"></div>`; predLabel = 'Measurements'; preds = cols.filter(c => c.kind === 'categorical'); }
      if (t === 'tost') fields = select('outcome', 'Outcome compared between the study groups', num, a.outcome)
        + `<div><label class="f">Equivalence margin ± Δ (outcome units)</label><input type="number" step="any" data-af="margin" value="${esc(a.margin ?? '')}" placeholder="e.g. 5"></div>`;
      if (t === 'mh') fields = select('outcome', 'Yes/no outcome (two study groups compared)', cat, a.outcome) + levelSelect('Event value', a.outcome, a.positive)
        + select('second', 'Stratify by (e.g. sex, centre, age band)', cat.filter(c => c.col !== a.outcome && c.col !== cfg.groupCol), a.second);
      if (t === 'clogit') { fields = select('outcome', 'Case / control column', cat, a.outcome) + levelSelect('Case value', a.outcome, a.positive)
        + select('second', 'Matched-set ID column', state.data.headers.filter(h => h !== a.outcome).map(h => ({ col: h, label: Analysis.columnLabel(cfg, h) })), a.second); predLabel = 'Exposures (predictors)'; preds = cols.filter(c => c.col !== a.outcome && c.col !== a.second); }
      if (t === 'count') { fields = select('outcome', 'Count outcome (0, 1, 2 …)', num, a.outcome) + '<div></div>'; predLabel = 'Predictors'; preds = cols.filter(c => c.col !== a.outcome); }
      if (t === 'ordinal' || t === 'multinom') { fields = select('outcome', t === 'ordinal' ? 'Ordered outcome (categories in their order, step 2)' : 'Outcome (the first category is the reference)', cols.filter(isCat), a.outcome) + '<div></div>'; predLabel = 'Predictors'; preds = cols.filter(c => c.col !== a.outcome); }
      if (t === 'methodcomp') fields = select('outcome', 'Method A (reference, x)', num, a.outcome) + select('second', 'Method B (new, y)', num.filter(c => c.col !== a.outcome), a.second);
      if (t === 'pca') { fields = '<p class="legend-note" style="margin:0">Tick the items (numeric scores). Patients with any missing item are left out.</p>'; predLabel = 'Items'; preds = num; }
      if (t === 'partial') { fields = select('outcome', 'Variable X', num, a.outcome) + select('second', 'Variable Y', num.filter(c => c.col !== a.outcome), a.second); predLabel = 'Control for'; preds = num.filter(c => c.col !== a.outcome && c.col !== a.second); }
      if (t === 'anova2') fields = select('outcome', 'Numeric outcome', num, a.outcome) + select('second', 'Second factor (e.g. sex)', cat.filter(c => c.col !== cfg.groupCol), a.second);
      if (t === 'mediation') fields = select('xvar', 'Exposure X', num, a.xvar) + select('second', 'Mediator M', num.filter(c => c.col !== a.xvar), a.second) + select('outcome', 'Outcome Y', num.filter(c => c.col !== a.xvar && c.col !== a.second), a.outcome);
      if (t === 'psm') { fields = `<p class="legend-note" style="margin:0">Treatment = the two study groups. Tick the covariates of the propensity score.</p>` + select('outcome', 'Outcome compared in the matched sample (optional)', cols.filter(c => c.col !== cfg.groupCol), a.outcome); predLabel = 'Covariates'; preds = cols.filter(c => c.col !== cfg.groupCol && c.col !== a.outcome); }
      if (t === 'lmm') { const reps = cfg.variables.filter(v => v.kind === 'repeated' && v.type === 'numeric');
        fields = `<div><label class="f">Repeated outcome</label><select data-af="rvar"><option value="">— choose —</option>${reps.map(v => `<option value="${esc(v.id)}" ${v.id === a.rvar ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></div><div></div>`;
        predLabel = 'Covariates (baseline)'; preds = cols.filter(c => c.col !== cfg.groupCol); }
      if (t === 'cif') fields = select('outcome', 'Follow-up time', num, a.outcome) + select('event', 'Status column (event / competing event / censored)', cat, a.event)
        + levelSelect('Event of interest', a.event, a.positive) + levelSelect('Competing event (e.g. death)', a.event, a.competing, 'competing')
        + `<div><label class="f">Cumulative incidence at time(s) (optional)</label><input type="text" data-af="at" value="${esc(a.at || '')}" placeholder="e.g. 12 or 6, 12, 24"></div>`;
      if (t === 'tdroc') { fields = select('outcome', 'Follow-up time', num, a.outcome) + select('event', 'Event column', cat, a.event) + levelSelect('Event value (others are censored)', a.event, a.positive)
        + `<div><label class="f">AUC at time(s)</label><input type="text" data-af="at" value="${esc(a.at || '')}" placeholder="automatic: quartiles of the event times"></div>`; predLabel = 'Markers (numeric; higher = higher risk)'; preds = num.filter(c => c.col !== a.outcome); }
      if (t === 'quantreg') { fields = select('outcome', 'Numeric outcome', num, a.outcome) + `<div><label class="f">Quantile(s)</label><input type="text" data-af="quantiles" value="${esc(a.quantiles || '')}" placeholder="0.5 (median); e.g. 0.25, 0.5, 0.75"></div>`; predLabel = 'Predictors'; preds = cols.filter(c => c.col !== a.outcome); }
      if (t === 'fleiss') { fields = '<p class="legend-note" style="margin:0">Tick one column per rater (the same categories in each). Patients rated by every rater are used.</p>'; predLabel = 'Raters'; preds = cat; }
      if (t === 'rmcorr') fields = select('second', 'Variable X', num, a.second) + select('outcome', 'Variable Y', num.filter(c => c.col !== a.second), a.outcome)
        + select('idcol', 'Patient ID column (one row per visit)', state.data.headers.filter(h => h !== a.outcome && h !== a.second).map(h => ({ col: h, label: Analysis.columnLabel(cfg, h) })), a.idcol);
      if (t === 'firth') { fields = select('outcome', 'Yes/no outcome', cols.filter(isCat), a.outcome) + levelSelect('Positive (event) value', a.outcome, a.positive); predLabel = 'Predictors'; preds = cols.filter(c => c.col !== a.outcome); }
      if (t === 'mi') { const isC = a.outcome && (cols.find(c => c.col === a.outcome) || {}).kind !== 'numeric';
        fields = select('outcome', 'Outcome (numeric → linear, categorical → logistic)', cols.filter(c => c.kind === 'numeric' || isCat(c)), a.outcome) + (isC ? levelSelect('Positive (event) value', a.outcome, a.positive) : '<div></div>'); predLabel = 'Predictors (missing values are imputed)'; preds = cols.filter(c => c.col !== a.outcome); }
      if (t === 'noninf') { const gs = activeGroups(), gsel = (key, label, val, auto) => `<div><label class="f">${label}</label><select data-af="${key}"><option value="">${auto}</option>${gs.map(g => `<option value="${esc(g)}" ${g === val ? 'selected' : ''}>${esc(cfg.groupLabels[g] || g)}</option>`).join('')}</select></div>`;
        const ocol = cols.find(c => c.col === a.outcome), isC = ocol && ocol.kind !== 'numeric', cats = cols.filter(isCat);
        const sl = (key, label, opts, v) => `<div><label class="f">${label}</label><select data-af="${key}">${opts.map(([k, l]) => `<option value="${k}" ${(v || opts[0][0]) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
        fields = select('outcome', 'Primary outcome (numeric or yes/no)', cols.filter(c => c.kind === 'numeric' || isCat(c)), a.outcome) + (isC ? levelSelect('Outcome event / success value', a.outcome, a.positive) : '<div></div>')
          + sl('design', 'Trial design', [['noninf', 'Non-inferiority'], ['equiv', 'Equivalence'], ['superior', 'Superiority (by a margin)']], a.design)
          + gsel('treat', 'New (experimental) treatment', a.treat, '— automatic (second group) —') + gsel('control', 'Reference (control) treatment', a.control, '— automatic (first group) —')
          + `<div><label class="f">Margin Δ ${isC ? '(percentage points, e.g. 10)' : '(outcome units)'}</label><input type="number" step="any" min="0" data-af="margin" value="${esc(a.margin ?? '')}" placeholder="${isC ? 'e.g. 10' : 'e.g. 5'}"></div>`
          + sl('better', 'Better outcome', [['higher', isC ? 'Higher proportion is better (e.g. cure)' : 'Higher values are better'], ['lower', isC ? 'Lower proportion is better (e.g. complications)' : 'Lower values are better (e.g. pain)']], a.better)
          + sl('conf', 'Confidence interval', [['', 'Automatic (95% non-inferiority / superiority, 90% equivalence)'], ['95', '95% (one-sided α = 0.025)'], ['90', '90% (one-sided α = 0.05)'], ['99', '99%']], a.conf)
          + select('ppCol', 'Per-protocol population column (optional)', cats.filter(c => c.col !== a.outcome && c.col !== cfg.groupCol), a.ppCol) + (a.ppCol ? levelSelect('Per-protocol when', a.ppCol, a.ppVal, 'ppVal') : '<div></div>');
        predLabel = 'Adjust the mean difference for (ANCOVA, numeric outcome only)'; preds = isC ? [] : num.filter(c => c.col !== a.outcome); }
      if (t === 'gee') { const reps = cfg.variables.filter(v => v.kind === 'repeated'), rv = reps.find(v => v.id === a.rvar), isB = rv && rv.type === 'categorical';
        const sl = (key, label, opts, v) => `<div><label class="f">${label}</label><select data-af="${key}">${opts.map(([k, l]) => `<option value="${k}" ${(v || opts[0][0]) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
        fields = `<div><label class="f">Repeated outcome (binary, count or numeric)</label><select data-af="rvar"><option value="">— choose —</option>${reps.map(v => `<option value="${esc(v.id)}" ${v.id === a.rvar ? 'selected' : ''}>${esc(v.label)} (${v.type === 'categorical' ? 'categorical' : 'numeric'})</option>`).join('')}</select></div>`
          + (isB ? levelSelect('Counted as the event', rv.cols[0].col, a.positive) + sl('method', 'Model', [['gee', 'GEE (population-averaged)'], ['glmm', 'Mixed-effects logistic (random intercept)']], a.method)
            : sl('family', 'Outcome type', [['gaussian', 'Numeric (linear GEE)'], ['poisson', 'Count (Poisson GEE)']], a.family) + '<div></div>')
          + sl('corr', 'Working correlation (GEE)', [['exchangeable', 'Exchangeable'], ['ar1', 'AR(1) — closer visits more alike'], ['independence', 'Independence']], a.corr)
          + sl('timeAs', 'Time', [['cat', 'Categories (each visit vs the first)'], ['linear', 'Continuous (a linear trend; time values of step 3)']], a.timeAs)
          + `<div><label class="check" style="margin-top:22px"><input type="checkbox" data-af="inter" ${a.inter !== false ? 'checked' : ''}><span>Group × time interaction</span></label></div>`;
        predLabel = 'Baseline covariates (optional)'; preds = cols.filter(c => c.col !== cfg.groupCol); }
      const withPreds = ['noninf', 'gee', 'tdroc', 'quantreg', 'fleiss', 'firth', 'mi', 'linear', 'logistic', 'roc', 'ancova', 'cox', 'cronbach', 'correlation', 'cochran', 'clogit', 'count', 'ordinal', 'multinom', 'pca', 'partial', 'psm', 'lmm'].includes(t);
      const uni = t === 'linear' || t === 'logistic' || t === 'cox' ? `<div><label class="check" style="margin-top:24px"><input type="checkbox" data-af="univariable" ${a.univariable ? 'checked' : ''}><span>Also show univariable results</span></label></div>` : '';
      const ci = ADV_CAT[t] ?? 99, prevC = ai ? ADV_CAT[cfg.advanced[ai - 1].type] ?? 99 : -1, sep = ci !== prevC && ADV_GROUPS[ci] ? `<div class="adv-sep">${esc(ADV_GROUPS[ci][0])}</div>` : '';
      return `${sep}<div class="gcard" data-adv="${ai}">
        <div class="row"><h4 style="margin:0">${ai + 1}. ${ADV_TYPES[t]}</h4><span class="spacer"></span>
          <label class="check" style="margin:0"><input type="checkbox" data-af="include" ${a.include !== false ? 'checked' : ''}><span>Include</span></label>
 <button class="btn ghost small" data-advmove="${ai},-1" type="button" title="Move up" ${ai === 0 ? 'disabled' : ''}>↑</button><button class="btn ghost small" data-advmove="${ai},1" type="button" title="Move down" ${ai === state.cfg.advanced.length - 1 ? 'disabled' : ''}>↓</button>
          <button class="btn ghost small" data-advdup="${ai}" type="button" title="A copy of this analysis, to change one setting">⧉ Duplicate</button>
          <button class="btn ghost small" data-advdel="${ai}" type="button">✕ Remove</button></div>
        <div class="grid g3" style="margin-top:8px">${fields}${uni}</div>
        <div class="grid g4 adv-opts">${advOptions(a)}</div>
        ${t === 'survival' ? '<p class="legend-note" style="margin:6px 0 0">Curves are drawn for each study group; patients without the event are censored at their follow-up time.</p>' : t === 'mcnemar' ? '<p class="legend-note" style="margin:6px 0 0">Tested in each study group and in all patients together.</p>' : !withPreds || (t === 'noninf' && !preds.length) ? '' : `
        <label class="f" style="margin-top:8px">${predLabel}</label>
        <div class="predlist">${preds.filter(c => c.col !== a.outcome).map(c => `<label><input type="checkbox" data-apred="${esc(c.col)}" ${(a.predictors || []).includes(c.col) ? 'checked' : ''}>${esc(c.label)} <span class="legend-note">${c.kind === 'numeric' ? 'num' : 'cat'}</span></label>`).join('')}</div>`}
        <details class="adv-out" data-advout="${ai}" ${advOpen.has(a) ? 'open' : ''}><summary><b>Show output</b> <span class="legend-note">— table, comment and figure of this analysis, as in the report</span></summary><div class="adv-out-body"></div></details>
      </div>`;
    }).join('') : '<p class="legend-note">No advanced analyses yet — add one below.</p>';
    cfg.advanced.forEach((a, ai) => { if (advOpen.has(a)) advOutput(ai); });
  }
  // the output of one advanced analysis (collapsed by default): only that analysis is run, with the report's options
  const advOpen = new WeakSet(), advTimers = {};
  function advOutput(ai, delay = 0) {
    clearTimeout(advTimers[ai]);
    advTimers[ai] = setTimeout(() => {
      const box = document.querySelector(`[data-advout="${ai}"] .adv-out-body`), a = state.cfg.advanced[ai]; if (!box || !a) return;
      box.innerHTML = '<p class="legend-note">Running…</p>';
      setTimeout(() => {
        let res;
        try { const o = effOptions();
          res = Analysis.run(state.data, { ...state.cfg, options: { ...o, correlation: false, summary: false, fdr: false }, variables: state.cfg.variables.map(v => ({ ...v, include: false })), advanced: [{ ...a, include: true }], timeline: null });
          const secs = res.sections.filter(s => !['single', 'repeated'].includes(s.kind));
          if (!secs.length) { box.innerHTML = '<p class="legend-note">No output yet: choose the variables this analysis needs (or there are too few complete patients).</p>'; return; }
          const st = chartStyle(o), pal = chartPalette(o), place = o.commentPlace || 'after';
          box.innerHTML = secs.map(s => { const cp = s.place && place !== 'none' ? s.place : place, com = cp !== 'none' && s.comment ? `<div class="pcom">${esc(s.comment)}</div>` : '';
            return `<div class="adv-out-sec"><div class="cap tcap">${esc(s.title)}</div>${cp === 'before' ? com : ''}<div style="overflow-x:auto">${htmlTable(s.head, s.rows)}</div><div class="pfoot">${esc(s.footnote || '')}</div>${cp !== 'before' ? com : ''}
              <div class="adv-out-figs">${s.figures.map((f, fi) => { try { const c = Charts.draw({ ...f.spec, title: o.chartTitle ? f.caption : null }, pal, st); return `<figure><img src="${c.toDataURL('image/png')}" alt=""><figcaption class="legend-note">${esc(f.caption)}</figcaption></figure>`; } catch (e) { return ''; } }).join('')}</div></div>`; }).join('');
        } catch (e) { box.innerHTML = `<p class="legend-note">This analysis could not be run with the current settings (${esc(e.message || String(e))}).</p>`; }
      }, 20);
    }, delay);
  }
  $('#advList').addEventListener('toggle', e => {
    const d = e.target; if (!d.matches || !d.matches('[data-advout]')) return;
    const ai = +d.dataset.advout, a = state.cfg.advanced[ai]; if (!a) return;
    if (d.open) { advOpen.add(a); readAdvanced(); advOutput(ai); } else advOpen.delete(a);
  }, true);
  // a changed setting refreshes the open output of that analysis
  const advRefresh = e => { const card = e.target.closest('[data-adv]'); if (!card || e.target.closest('.adv-out')) return; const ai = +card.dataset.adv, a = state.cfg.advanced[ai];
    if (a && advOpen.has(a)) { readAdvanced(); advOutput(ai, e.type === 'input' ? 700 : 150); } };
  $('#advList').addEventListener('change', advRefresh); $('#advList').addEventListener('input', advRefresh);
  // per-analysis options: title, patients (subset), variable selection and type-specific extras
  function advOptions(a) {
    const t = a.type, sel = (key, opts, v) => `<select data-af="${key}">${opts.map(([k, l]) => `<option value="${esc(k)}" ${(v || opts[0][0]) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const box = (key, label) => `<label class="check" style="margin-top:22px"><input type="checkbox" data-af="${key}" ${a[key] ? 'checked' : ''}><span>${label}</span></label>`;
    const out = [`<div><label class="f">Title (optional)</label><input type="text" data-af="title" value="${esc(a.title || '')}" placeholder="automatic"></div>`,
      `<div><label class="f">Comment</label>${sel('commentDetail', [['standard', 'Standard'], ['detailed', 'Detailed — more numbers and interpretation'], ['brief', 'Brief — one sentence'], ['none', 'No comment (table only)']], a.commentDetail)}</div>`];
    { const set = ['commentFocus', 'commentNumbers', 'commentPlace', 'commentPre', 'commentPost', 'commentCustom'].some(k => a[k] && !['all', 'default'].includes(a[k]));
      out.push(`<details style="grid-column:1/-1" ${set ? 'open' : ''}><summary class="legend-note" style="cursor:pointer"><b>Comment options</b> — significant findings only, words only, placement, your own text</summary><div class="grid g4" style="margin-top:6px">${[`<div><label class="f">Comment content</label>${sel('commentFocus', [['all', 'All findings'], ['sig', 'Only the significant findings']], a.commentFocus)}</div>`,
      `<div><label class="f">Numbers in the comment</label>${sel('commentNumbers', [['all', 'With the numbers in brackets'], ['none', 'Without the numbers (words only)']], a.commentNumbers)}</div>`,
      `<div><label class="f">Comment placement</label>${sel('commentPlace', [['default', 'As in step 6'], ['after', 'After the table'], ['before', 'Before the table']], a.commentPlace)}</div>`,
      `<div><label class="f">Text before the comment (optional)</label><input type="text" data-af="commentPre" value="${esc(a.commentPre || '')}" placeholder="e.g. To identify the predictors of …"></div>`,
      `<div><label class="f">Text after the comment (optional)</label><input type="text" data-af="commentPost" value="${esc(a.commentPost || '')}" placeholder="e.g. This supports the hypothesis that …"></div>`,
      `<div style="grid-column:1/-1"><label class="f">Your own comment (optional — replaces the automatic one)</label><textarea data-af="commentCustom" rows="2" placeholder="Leave empty for the automatic comment">${esc(a.commentCustom || '')}</textarea></div>`].join('')}</div></details>`); }
    if (!['ancova', 'survival', 'cif', 'mcnemar', 'anova2', 'psm', 'lmm', 'noninf', 'gee'].includes(t))
      out.push(`<div><label class="f">Patients</label>${sel('subset', [['all', 'All patients'], ['each', 'Each group separately'], ...activeGroups().map(g => [g, 'Only ' + (state.cfg.groupLabels[g] || g)])], a.subset)}</div>`);
    if (['linear', 'logistic', 'cox'].includes(t))
      out.push(`<div><label class="f">Variable selection (multivariable)</label>${sel('method', [['enter', 'Enter — all predictors'], ['backward', 'Backward elimination (P > 0.10 out)'], ['forward', 'Forward selection (P < 0.05 in)']], a.method)}</div>`);
    if (t === 'correlation') out.push(`<div><label class="f">Coefficient</label>${sel('method', [['auto', 'Automatic (Pearson if normal, else Spearman)'], ['pearson', 'Pearson'], ['spearman', 'Spearman'], ['kendall', "Kendall's tau-b"]], a.method)}</div>`,
      `<div><label class="f">Table layout</label>${sel('layout', [['auto', 'Automatic'], ['matrix', 'Matrix'], ['pairs', 'List of pairs']], a.layout)}</div>`,
      `<div><label class="f">Scatter plots of</label>${sel('figWhich', [['sig', 'Significant pairs only'], ['all', 'All pairs (also non-significant)']], a.figWhich)}</div>`,
      `<div><label class="f">Number of scatter plots (strongest first)</label>${sel('scatter', [['all', 'All'], ['0', 'None'], ['1', 'Up to 1'], ['2', 'Up to 2'], ['4', 'Up to 4'], ['6', 'Up to 6'], ['10', 'Up to 10']], a.scatter)}</div>`,
      `<div><label class="f">Line on the scatter plot</label>${sel('figFit', [['linear', 'Regression line'], ['band', 'Regression line with 95% CI band'], ['none', 'No line']], a.figFit)}</div>`,
      `<div><label class="f">Text on the plot</label>${sel('figNote', [['coef', 'Coefficient and P value'], ['eq', 'Coefficient, P, equation and R²'], ['none', 'None']], a.figNote)}</div>`,
      `<div><label class="f">Point size</label>${sel('figPt', [['normal', 'Normal'], ['small', 'Small'], ['large', 'Large']], a.figPt)}</div>`,
      `<div>${box('figGroup', 'Colour the points by study group')}</div>`, `<div>${box('figZero', 'Axes start at zero')}</div>`, `<div>${box('figHeat', 'Heat map of the coefficients (3+ variables, matrix)')}</div>`,
      `<div>${box('ci', '95% CI of the coefficients')}</div>`);
    if (t === 'linear') out.push(`<div>${box('vif', 'Collinearity (VIF)')}</div>`, `<div>${box('diag', 'Residual diagnostics (Durbin-Watson, normality, residual plot)')}</div>`);
    if (['linear', 'logistic', 'cox'].includes(t)) out.push(`<div>${box('forest', 'Forest plot of the estimates')}</div>`);
    if (['linear', 'logistic'].includes(t)) { const pc = [['', '— none —'], ...(a.predictors || []).map(c => [c, Analysis.columnLabel(state.cfg, c)])];
      out.push(`<div><label class="f">Interaction term</label><div class="row" style="gap:4px">${sel('int1', pc, a.int1 || '')}×${sel('int2', pc, a.int2 || '')}</div></div>`,
        `<div>${box('epv', 'Sample size check (events per variable)')}</div>`, `<div>${box('calc', 'Model equation + risk calculator (step 11)')}</div>`); }
    if (t === 'logistic') out.push(`<div>${box('optimism', 'Bootstrap validation (optimism-corrected AUC)')}</div>`, `<div>${box('dca', 'Decision curve (net benefit)')}</div>`,
      `<div><label class="f">Added value of one predictor (NRI, IDI)</label>${sel('nriVar', [['', '— none —'], ...(a.predictors || []).map(c => [c, Analysis.columnLabel(state.cfg, c)])], a.nriVar || '')}</div>`);
    if (['linear', 'logistic'].includes(t)) { const nc = (a.predictors || []).filter(c => Analysis.columnKind(state.cfg, analysedRows(), c) === 'numeric').map(c => [c, Analysis.columnLabel(state.cfg, c)]);
      out.push(`<div><label class="f">Non-linear predictor (restricted cubic spline)</label>${sel('rcs', [['', '— none —'], ...nc], a.rcs || '')}</div>`, `<div><label class="f">Spline knots</label>${sel('rcsK', [['4', '4 knots'], ['3', '3 knots'], ['5', '5 knots']], a.rcsK || '4')}</div>`); }
    if (t === 'logistic') out.push(`<div>${box('nomogram', 'Nomogram of the model')}</div>`);
    if (t === 'noninf') out.push(`<div><label class="f">Sample size check</label>${sel('ssPower', [['', 'None'], ['80', 'n needed for 80% power'], ['90', 'n needed for 90% power']], a.ssPower || '')}</div>`,
      `<div><label class="check" style="margin-top:22px"><input type="checkbox" data-af="marginFig" ${a.marginFig !== false ? 'checked' : ''}><span>CI-and-margin plot</span></label></div>`);
    if (t === 'mi') out.push(`<div><label class="f">Number of imputations</label>${sel('mImp', [['20', '20'], ['5', '5'], ['10', '10'], ['50', '50']], a.mImp || '20')}</div>`);
    if (t === 'count') out.push(`<div><label class="f">Model</label>${sel('family', [['auto', 'Automatic (negative binomial if overdispersed)'], ['poisson', 'Poisson'], ['negbin', 'Negative binomial']], a.family)}</div>`);
    if (t === 'methodcomp') out.push(`<div><label class="f">Method</label>${sel('method', [['pb', 'Passing-Bablok'], ['deming', 'Deming (equal error variances)']], a.method)}</div>`);
    if (t === 'pca') out.push(`<div><label class="f">Components kept</label>${sel('nComp', [['', 'Eigenvalue above 1'], ['1', '1'], ['2', '2'], ['3', '3'], ['4', '4'], ['5', '5']], a.nComp || '')}</div>`);
    if (t === 'psm') out.push(`<div><label class="f">Caliper (SD of the logit)</label>${sel('caliper', [['0.2', '0.2 (recommended)'], ['0.1', '0.1'], ['0.05', '0.05'], ['1', 'Wide (1)']], a.caliper || '0.2')}</div>`);
    if (t === 'logistic') out.push(`<div>${box('modelRoc', 'ROC curve and AUC of the model')}</div>`,
      `<div><label class="f">Classification cut-off (predicted probability)</label><input type="text" data-af="cut" value="${esc(a.cut || '')}" placeholder="0.5"></div>`);
    if (t === 'survival') out.push(`<div>${box('swimmer', 'Swimmer plot of every patient')}</div>`, `<div>${box('ciBand', '95% CI bands on the curves')}</div>`, `<div>${box('risk', 'Number at risk table')}</div>`, `<div>${box('pairwise', 'Pairwise log-rank tests (3+ groups, Bonferroni)')}</div>`);
    if (t === 'kappa') out.push(`<div><label class="f">Weighted kappa (ordered categories)</label>${sel('weights', [['none', 'No — Cohen\'s kappa only'], ['linear', 'Linear weights'], ['quadratic', 'Quadratic weights']], a.weights)}</div>`);
    if (t === 'agreement') out.push(`<div><label class="f">ICC type</label>${sel('iccType', [['agreement', 'Absolute agreement (A,1)'], ['consistency', 'Consistency (C,1)']], a.iccType)}</div>`, `<div>${box('baPct', 'Bland-Altman of % differences')}</div>`);
    if (t === 'diagnostic') out.push(`<div><label class="f">Predictive values at a prevalence of (%)</label><input type="text" data-af="prev" value="${esc(a.prev || '')}" placeholder="e.g. 10"></div>`);
    if (t === 'paired') out.push(`<div><label class="f">Test</label>${sel('test', [['auto', 'Automatic (normality of the differences)'], ['param', 'Paired t-test'], ['nonparam', 'Wilcoxon signed-rank test']], a.test)}</div>`,
      `<div><label class="f">Figure</label>${sel('figure', [['lines', "Each patient's two values joined"], ['none', 'No figure']], a.figure)}</div>`);
    if (t === 'ancova') out.push(`<div>${box('slopes', 'Test homogeneity of regression slopes')}</div>`);
    if (t === 'cronbach') out.push(`<div>${box('split', 'Split-half reliability (Spearman-Brown)')}</div>`);
    if (t === 'logistic') out.push(`<div>${box('hl', 'Hosmer-Lemeshow goodness of fit')}</div>`);
    if (t === 'logistic') out.push(`<div>${box('classTable', 'Classification table (sensitivity / specificity)')}</div>`);
    if (t === 'linear' || t === 'logistic') out.push(`<div>${box('constant', 'Show the constant')}</div>`);
    if (t === 'roc') {
      out.push(`<div><label class="f">Optimal cut-off</label>${sel('cutoff', [['youden', 'Youden index'], ['closest', 'Closest to top-left corner'],
        ['sens80', 'Sensitivity ≥ 80% (best specificity)'], ['sens90', 'Sensitivity ≥ 90% (best specificity)'], ['sens95', 'Sensitivity ≥ 95% (best specificity)'],
        ['spec80', 'Specificity ≥ 80% (best sensitivity)'], ['spec90', 'Specificity ≥ 90% (best sensitivity)'], ['spec95', 'Specificity ≥ 95% (best sensitivity)'],
        ['manual', 'My own cut-off value']], a.cutoff)}</div>`);
      if (a.cutoff === 'manual') out.push(`<div><label class="f">Cut-off value (positive when ≥, or ≤ for lower values)</label><input type="text" data-af="manualCut" value="${esc(a.manualCut || '')}" placeholder="e.g. 2.5"></div>`);
      out.push(`<div><label class="f">AUC interpretation in the comment</label>${sel('aucScale', [['standard', 'Excellent ≥0.9, good ≥0.8, fair ≥0.7, poor ≥0.6'], ['hosmer', 'Hosmer & Lemeshow: outstanding ≥0.9, excellent ≥0.8, acceptable ≥0.7']], a.aucScale)}</div>`);
      out.push(`<div><label class="f">Positive test direction</label>${sel('direction', [['auto', 'Automatic (from the AUC)'], ['higher', 'Higher values positive'], ['lower', 'Lower values positive']], a.direction)}</div>`);
      out.push(`<div>${box('ci', '95% CI of sensitivity and specificity')}</div>`, `<div>${box('ciAll', '95% CI of every measure (PPV, NPV, accuracy, LRs)')}</div>`, `<div>${box('lr', 'Likelihood ratios (LR+, LR−)')}</div>`, `<div>${box('youdenCol', 'Youden index column')}</div>`,
        `<div>${box('compare', 'Compare the AUCs (DeLong test)')}</div>`, `<div>${box('combined', 'Combined model of all tests (logistic)')}</div>`);
      // the ROC figure
      out.push(`<div><label class="f">ROC figure</label>${sel('figure', [['one', 'All curves in one figure'], ['each', 'One figure per test'], ['none', 'No figure']], a.figure)}</div>`,
        `<div><label class="f">Curve lines</label>${sel('figLines', [['normal', 'Normal'], ['thin', 'Thin'], ['bold', 'Bold']], a.figLines)}</div>`,
        `<div>${box('showCut', 'Mark the cut-off on the curve')}</div>`, `<div>${box('figAucCi', 'AUC with its 95% CI in the legend')}</div>`,
        `<div>${box('noDiagonal', 'Hide the diagonal reference line')}</div>`, `<div>${box('figFill', 'Shade the area under a single curve')}</div>`);
    }
    return out.join('');
  }
  function readAdvanced() {
    document.querySelectorAll('[data-adv]').forEach(card => {
      const a = state.cfg.advanced[+card.dataset.adv]; if (!a) return;
      card.querySelectorAll('[data-af]').forEach(el => { a[el.dataset.af] = el.type === 'checkbox' ? el.checked : el.value; });
      a.predictors = [...card.querySelectorAll('[data-apred]')].filter(el => el.checked).map(el => el.dataset.apred);
    });
  }
  // the comment options of every advanced analysis at once
  $('#advComApply').onclick = () => {
    readUiIntoCfg(); const set = {}; ['commentDetail', 'commentFocus', 'commentNumbers', 'commentPlace'].forEach(k => { const v = $(`[data-acall="${k}"]`).value; if (v) set[k] = v; });
    if (!Object.keys(set).length) { toast('Choose at least one comment option to apply'); return; }
    state.cfg.advanced.forEach(a => Object.assign(a, set)); renderAdvanced(); toast(`Comment options applied to ${state.cfg.advanced.length} analyses`);
  };
  $('#advAdd').addEventListener('click', e => {
    const b = e.target.closest('[data-advadd]'); if (!b) return;
    readUiIntoCfg();
    state.cfg.advanced.push({ type: b.dataset.advadd, outcome: '', positive: '', predictors: [], univariable: ['logistic', 'cox'].includes(b.dataset.advadd), include: true });
    renderAdvanced();
  });
  $('#advList').addEventListener('click', e => {
    const mv = e.target.closest('[data-advmove]');
    if (mv) { readUiIntoCfg(); const [i, dd] = mv.dataset.advmove.split(',').map(Number), A = state.cfg.advanced, j = i + dd; if (j >= 0 && j < A.length) { [A[i], A[j]] = [A[j], A[i]]; renderAdvanced(); } return; }
    const d = e.target.closest('[data-advdup]');
    if (d) { readUiIntoCfg(); const i = +d.dataset.advdup; state.cfg.advanced.splice(i + 1, 0, JSON.parse(JSON.stringify(state.cfg.advanced[i]))); renderAdvanced(); toast('Analysis duplicated — change what you need in the copy'); return; }
    const b = e.target.closest('[data-advdel]'); if (!b) return;
    readUiIntoCfg(); state.cfg.advanced.splice(+b.dataset.advdel, 1); renderAdvanced();
  });
  $('#advList').addEventListener('change', e => {
    const f = e.target.dataset.af;
    if (f === 'cutoff') { readUiIntoCfg(); renderAdvanced(); return; }
    if (!['outcome', 'event', 'second', 'rvar', 'ppCol', 'design'].includes(f)) return;
    readUiIntoCfg();
    const a = state.cfg.advanced[+e.target.closest('[data-adv]').dataset.adv];
    if (f === 'rvar') { const rv = state.cfg.variables.find(v => v.id === a.rvar); a.positive = rv && rv.type === 'categorical' ? defaultPositive(rv.cols[0].col) : ''; renderAdvanced(); return; }
    if (f === 'ppCol') { a.ppVal = a.ppCol ? defaultPositive(a.ppCol) : ''; renderAdvanced(); return; }
    if (f === 'design') { renderAdvanced(); return; }
    a.predictors = (a.predictors || []).filter(c => c !== a.outcome);
    // the positive value belongs to the outcome (logistic, ROC) or to the event column (survival)
    if (a.type === 'survival' || a.type === 'cox' || a.type === 'tdroc') { if (f === 'event') a.positive = defaultPositive(a.event); }
    else if (a.type === 'cif') { if (f === 'event') { const lv = Analysis.levelsOf(state.cfg, analysedRows(), a.event), tx = l => l + ' ' + valueLabel(a.event, l), cens = l => /^(no|none|alive|censor(ed)?|0|free|event-free)$/i.test(valueLabel(a.event, l));
      const comp = lv.find(l => /death|died|dead|compet/i.test(tx(l))), pos = lv.find(l => l !== comp && /relapse|recurr|progress|event|yes|fail|infect|readmi/i.test(tx(l))) || lv.find(l => l !== comp && !cens(l)) || '';
      a.positive = pos; a.competing = comp || lv.find(l => l !== pos && !cens(l)) || ''; } }
    else if (a.type === 'rmcorr') { /* no positive value */ }
    else if (a.type === 'diagnostic') { if (f === 'event') a.eventPositive = defaultPositive(a.event); else a.positive = defaultPositive(a.outcome); }
    else a.positive = ['logistic', 'roc', 'mcnemar', 'firth', 'mi', 'noninf'].includes(a.type) ? defaultPositive(a.outcome) : '';
    renderAdvanced();
  });

  // colour themes: a list of swatch strips (as in Office's colour menu) with a sample chart of the theme under the pointer
  $('#optPal').innerHTML = Charts.PALETTE_GROUPS.map(([g, keys]) => `<optgroup label="${esc(g)}">${keys.map(k => `<option value="${k}">${esc(Charts.PALETTE_NAMES[k])}</option>`).join('')}</optgroup>`).join('')
    + '<option value="custom">Custom colours…</option>';
  const SAMPLE = { type: 'bar', categories: ['Baseline', 'Week 4', 'Week 12'], yLabel: 'Score', series: ['A group', 'B group', 'C group', 'D group'].map((g, i) => ({ name: g, values: [62 - i * 2, 50 - i * 5, 44 - i * 7], err: [7, 8, 8] })) };
  const swatches = cols => `<span class="pal-sw">${cols.map(c => `<span style="background:${c}"></span>`).join('')}</span>`;
  function renderPalGallery() {
    if (!state.cfg || !$('#palWrap').open) return;
    const o = state.cfg.options, cur = $('#optPal').value;
    const row = (k, name, cols) => `<button type="button" class="pal-row${cur === k ? ' on' : ''}" data-pal="${k}">${swatches(cols)}<span>${esc(name)}</span></button>`;
    $('#palGallery').innerHTML = `<div class="pal-list">${Charts.PALETTE_GROUPS.map(([g, keys]) => `<div class="pal-head">${esc(g)}</div>${keys.map(k => row(k, Charts.PALETTE_NAMES[k], Charts.PALETTES[k])).join('')}`).join('')}
      <div class="pal-head">Your own</div>${row('custom', 'Custom colours', o.customColors)}</div>
      <div class="pal-prev"><b id="palPrevName"></b><img id="palPrevImg" alt=""><span class="legend-note">Point at a theme to preview it; click to use it.</span></div>`;
    palPreview(cur);
  }
  // the sample chart in a theme, drawn with the current chart appearance options
  function palPreview(k) {
    const o = state.cfg.options, img = $('#palPrevImg'); if (!img) return;
    img.src = Charts.draw(SAMPLE, k === 'custom' ? o.customColors : k, { ...chartStyle(o), res: 1 }).toDataURL('image/png');
    $('#palPrevName').textContent = k === 'custom' ? 'Custom colours' : Charts.PALETTE_NAMES[k] || k;
  }
  $('#palWrap').addEventListener('toggle', () => { readUiIntoCfg(); renderPalGallery(); });
  $('#palGallery').addEventListener('mouseover', e => { const b = e.target.closest('[data-pal]'); if (b) palPreview(b.dataset.pal); });
  $('#palGallery').addEventListener('mouseleave', () => palPreview($('#optPal').value));
  $('#palGallery').addEventListener('click', e => {
    const b = e.target.closest('[data-pal]'); if (!b) return;
    const sel = $('#optPal'); sel.value = b.dataset.pal; sel.dispatchEvent(new Event('change', { bubbles: true }));
    document.querySelectorAll('.pal-row').forEach(x => x.classList.toggle('on', x === b));
  });
  $('#optPal').addEventListener('change', e => { $('#customBox').style.display = e.target.value === 'custom' ? '' : 'none'; document.querySelectorAll('.pal-row').forEach(x => x.classList.toggle('on', x.dataset.pal === e.target.value)); });
  $('#customReset').onclick = () => { readUiIntoCfg(); state.cfg.options.customColors = defaultOptions().customColors; renderTimepoints(); };

  /* ---------- step 4: flowchart (CONSORT, STROBE, STARD or simple) ---------- */
  const FLOW_HINTS = {
    consort: 'CONSORT 2010 — for randomized controlled trials. Numbers randomized and analysed are pre-filled from your data.',
    strobe: 'STROBE — for observational studies (cohort, case-control, cross-sectional). Numbers included and analysed are pre-filled from your data.',
    stard: 'STARD 2015 — for diagnostic accuracy studies: index test results and the reference standard (final diagnosis).',
    simple: 'A simple flowchart: a chain of steps, each with an optional exclusion box, optionally split into the study groups at the end.',
    crossover: 'CONSORT for crossover trials: each group is a treatment sequence, with its two periods and the washout between them.',
    cluster: 'CONSORT for cluster-randomized trials: clusters and participants allocated and analysed in each group.',
    prisma: 'PRISMA 2020 — for systematic reviews and meta-analyses: records identified, screened, assessed and included. Later numbers follow from those entered.'
  };
  function ensureConsort() {
    const cfg = state.cfg, groups = activeGroups();
    const ns = groups.map(groupN), total = ns.reduce((a, b) => a + b, 0);
    if (!cfg.consort || cfg.consort.groups.length !== groups.length) {
      const prev = cfg.consort;
      cfg.consort = {
        enabled: prev ? prev.enabled : true, type: prev ? prev.type : cfg.noGroups ? 'strobe' : 'consort', assessed: total,
        excluded: [{ text: 'Not meeting inclusion criteria', n: 0 }, { text: 'Declined to participate', n: 0 }],
        groups: groups.map((g, i) => ({ allocated: ns[i], description: '', lost: 0, lostReason: '', excludedAnalysis: 0, excludedReason: '', analysed: ns[i] }))
      };
    }
    const c = cfg.consort, branch = name => ({ name, n: 0, noRef: 0, present: 0, absent: 0, inconclusive: 0 });
    c.type = c.type || 'consort';
    c.stard = c.stard || { tested: total, branches: [branch('Positive'), branch('Negative'), branch('Inconclusive')] };
    c.steps = c.steps || [{ text: 'Assessed for eligibility', n: total, exText: 'Excluded', exN: 0 }, { text: 'Included in the study', n: total, exText: '', exN: 0 }];
    if (c.splitGroups === undefined) c.splitGroups = true;
    c.prisma = c.prisma || { db: 0, reg: 0, dup: 0, auto: 0, other: 0, scrExcl: 0, notRetrieved: 0, reasons: [{ text: 'Wrong population', n: 0 }, { text: 'Wrong outcome', n: 0 }], studies: 0, reports: 0 };
    c.pre = c.pre || { on: false, text: 'Screened', n: 0, exText: 'Not eligible at screening', exN: 0 };
    return c;
  }
  const num = (attrs, v) => `<input type="number" min="0" ${attrs} value="${+v || 0}">`;
  // assessed / potentially eligible = all excluded + all groups (CONSORT, STROBE) or + those who received the index test (STARD)
  function syncAssessed(c) {
    if (c.type === 'simple' || c.type === 'prisma') return;
    const ex = c.excluded.reduce((s, e) => s + (+e.n || 0), 0);
    c.assessed = ex + (c.type === 'stard' ? +c.stard.tested || 0 : c.groups.reduce((s, g) => s + (+g.allocated || 0), 0));
    const el = document.querySelector('#cForm [data-calc="assessed"]'); if (el) el.value = c.assessed;
  }
  const calcBox = (label, v, note) => `<div><label class="f">${label}</label><input type="number" data-calc="assessed" value="${v}" readonly title="${note}" style="background:var(--lav)"><div class="legend-note">${note}</div></div>`;
  function renderConsortForm() {
    const c = ensureConsort(), gl = activeGroups().map(g => state.cfg.groupLabels[g]), t = c.type;
    syncAssessed(c);
    $('#cEnabled').checked = c.enabled;
    $('#cType').value = t;
    const fsv = { ...FLOW_STYLE, ...(c.style || {}) };
    const accent0 = chartPalette(state.cfg.options)[0] || '#7B2FBE';
    document.querySelectorAll('#p9 [data-fs]').forEach(el => {
      const k = el.dataset.fs, v = k === 'colorMode' ? (fsv.color ? 'custom' : 'palette') : k === 'color' ? (fsv.color || accent0)
        : k === 'pillMode' ? (fsv.pillColor ? 'custom' : 'theme') : k === 'pillColor' ? (fsv.pillColor || fsv.color || accent0)
        : k === 'arrowMode' ? (fsv.arrowColor ? 'custom' : 'theme') : k === 'arrowColor' ? (fsv.arrowColor || '#222222') : fsv[k];
      el.type === 'checkbox' ? (el.checked = !!v) : (el.value = v);
    });
    // section labels: own text per flowchart type, the standard text as placeholder
    $('#flLabels').style.display = t === 'simple' ? 'none' : '';
    const defs = Charts.FLOW_LABELS[t] || [], own = (fsv.labels || {})[t] || [];
    document.querySelectorAll('#p9 [data-fsl]').forEach(el => { el.placeholder = defs[+el.dataset.fsl] || ''; el.value = own[+el.dataset.fsl] || ''; });
    $('#cHint').textContent = FLOW_HINTS[t];
    const excluded = `<h3>Excluded (reasons)</h3>${c.excluded.map((e, i) => `<div class="row" style="margin-bottom:6px"><input type="text" data-ex="${i}" data-f="text" value="${esc(e.text)}" style="flex:3">${num(`data-ex="${i}" data-f="n" style="flex:1;max-width:100px"`, e.n)}<button class="btn ghost small" data-exdel="${i}" type="button">✕</button></div>`).join('')}
      <button class="btn ghost small" data-cact="addEx" type="button">+ Add reason</button>`;
    let html = '';
    const pr = c.prisma, prNum = (k, label) => `<div><label class="f">${label}</label>${num(`data-pr="${k}"`, pr[k])}</div>`;
    if (t === 'prisma') {
      html = `<h3>Identification</h3><div class="grid g2">${prNum('db', 'Records from databases')}${prNum('reg', 'Records from registers')}${prNum('dup', 'Duplicate records removed')}${prNum('auto', 'Marked ineligible by automation tools')}${prNum('other', 'Removed for other reasons')}</div>
        <h3>Screening</h3><div class="grid g2">${prNum('scrExcl', 'Records excluded (title / abstract)')}${prNum('notRetrieved', 'Reports not retrieved')}</div>
        <h3>Reports excluded at full text (reasons)</h3>${pr.reasons.map((r, i) => `<div class="row" style="margin-bottom:6px"><input type="text" data-prr="${i}" data-f="text" value="${esc(r.text)}" style="flex:3">${num(`data-prr="${i}" data-f="n" style="flex:1;max-width:110px"`, r.n)}<button class="btn ghost small" data-prdel="${i}" type="button">✕</button></div>`).join('')}
        <button class="btn ghost small" data-cact="addPr" type="button">+ Add reason</button>
        <h3>Included</h3><div class="grid g2">${prNum('studies', 'Studies included')}${prNum('reports', 'Reports of included studies')}</div>`;
    } else if (t === 'consort' || t === 'strobe' || t === 'crossover' || t === 'cluster') {
      const S = t === 'strobe';
      html = `<h3>${S ? 'Identification' : 'Enrollment'}</h3><div class="grid g2">${calcBox(S ? 'Potentially eligible individuals' : 'Assessed for eligibility', c.assessed, `= excluded + total ${S ? 'included' : 'allocated'} in the groups`)}</div>
        ${excluded}<h3>Per group</h3><div class="grid">${c.groups.map((g, i) => `<div class="gcard"><h4>${esc(gl[i])}</h4>
        <div class="grid g2">
          <div><label class="f">${S ? 'Included' : 'Allocated'} (n)</label>${num(`data-cg="${i}" data-f="allocated"`, g.allocated)}</div>
          <div><label class="f">Analysed (n)</label>${num(`data-cg="${i}" data-f="analysed"`, g.analysed)}</div>
          <div><label class="f">${S ? 'Lost to follow-up / missing data' : 'Lost to follow-up'} (n)</label>${num(`data-cg="${i}" data-f="lost"`, g.lost)}</div>
          <div><label class="f">Reason</label><input type="text" data-cg="${i}" data-f="lostReason" value="${esc(g.lostReason)}"></div>
          <div><label class="f">Excluded from analysis (n)</label>${num(`data-cg="${i}" data-f="excludedAnalysis"`, g.excludedAnalysis)}</div>
          <div><label class="f">Reason excluded</label><input type="text" data-cg="${i}" data-f="excludedReason" value="${esc(g.excludedReason)}"></div>
          ${t === 'crossover' ? `<div><label class="f">Period 1 treatment</label><input type="text" data-cg="${i}" data-f="p1" value="${esc(g.p1 || '')}" placeholder="e.g. Drug A"></div><div><label class="f">Period 2 treatment</label><input type="text" data-cg="${i}" data-f="p2" value="${esc(g.p2 || '')}" placeholder="e.g. Placebo"></div>` : ''}
          ${t === 'cluster' ? `<div><label class="f">Clusters allocated</label>${num(`data-cg="${i}" data-f="clusters"`, g.clusters)}</div><div><label class="f">Clusters analysed</label>${num(`data-cg="${i}" data-f="clustersAnalysed"`, g.clustersAnalysed)}</div>` : ''}
        </div>
        <label class="f" style="margin-top:8px">${S ? 'Group description (optional, e.g. "Exposed", "Cases")' : 'Intervention description (optional)'}</label><textarea data-cg="${i}" data-f="description" style="min-height:60px">${esc(g.description)}</textarea></div>`).join('')}</div>`;
    } else if (t === 'stard') {
      html = `<h3>Enrollment</h3><div class="grid g2">${calcBox('Potentially eligible participants', c.assessed, '= excluded + received the index test')}
          <div><label class="f">Received the index test</label>${num('data-sd="tested"', c.stard.tested)}</div></div>
        ${excluded}<h3>Index test results</h3><div class="grid">${c.stard.branches.map((b, i) => `<div class="gcard"><h4>Index test ${b.name.toLowerCase()}${i === 2 ? ' (shown only when n > 0)' : ''}</h4>
        <div class="grid g3">
          <div><label class="f">Participants (n)</label>${num(`data-sb="${i}" data-f="n"`, b.n)}</div>
          <div><label class="f">No reference standard (n)</label>${num(`data-sb="${i}" data-f="noRef"`, b.noRef)}</div>
          <div></div>
          <div><label class="f">Target condition present (n)</label>${num(`data-sb="${i}" data-f="present"`, b.present)}</div>
          <div><label class="f">Target condition absent (n)</label>${num(`data-sb="${i}" data-f="absent"`, b.absent)}</div>
          <div><label class="f">Inconclusive (n)</label>${num(`data-sb="${i}" data-f="inconclusive"`, b.inconclusive)}</div>
        </div></div>`).join('')}</div>`;
    } else {
      html = `<h3>Steps (top to bottom)</h3>${c.steps.map((st, i) => `<div class="gcard" style="margin-bottom:8px"><div class="row"><b>Step ${i + 1}</b><span class="spacer"></span><button class="btn ghost small" data-stdel="${i}" type="button">✕</button></div>
          <div class="grid g2" style="margin-top:6px">
            <div><label class="f">Text</label><input type="text" data-st="${i}" data-f="text" value="${esc(st.text)}"></div>
            <div><label class="f">n</label>${num(`data-st="${i}" data-f="n"`, st.n)}</div>
            <div><label class="f">Exclusion box text (optional)</label><input type="text" data-st="${i}" data-f="exText" value="${esc(st.exText)}" placeholder="e.g. Excluded: refused consent"></div>
            <div><label class="f">Excluded (n)</label>${num(`data-st="${i}" data-f="exN"`, st.exN)}</div>
          </div></div>`).join('')}
        <button class="btn ghost small" data-cact="addStep" type="button">+ Add step</button>
        <h3>Groups</h3><label class="check"><input type="checkbox" data-c="splitGroups" ${c.splitGroups ? 'checked' : ''}><span>Split into the study groups at the end</span></label>
        <div class="grid g3">${c.groups.map((g, i) => `<div><label class="f">${esc(gl[i])} — analysed (n)</label>${num(`data-cg="${i}" data-f="analysed"`, g.analysed)}</div>`).join('')}</div>`;
    }
    // more for every type: an earlier stage, randomisation details, ITT / per-protocol, a footnote, reasons read from the data, the enrolment timeline
    const trial = ['consort', 'crossover', 'cluster'].includes(t), cols = state.data.headers;
    html += `<details class="gcard" style="margin-top:10px"><summary><b>More</b> — earlier stage, randomisation, populations, footnote, reasons from the data, enrolment timeline</summary>
      ${['consort', 'strobe', 'crossover', 'cluster'].includes(t) ? `<label class="check"><input type="checkbox" data-cp="on" ${c.pre.on ? 'checked' : ''}><span><b>Earlier stage</b> above the eligibility assessment (e.g. screened)</span></label>
      <div class="grid g4"><div><label class="f">Text</label><input type="text" data-cp="text" value="${esc(c.pre.text)}"></div><div><label class="f">n</label>${num('data-cp="n"', c.pre.n)}</div>
        <div><label class="f">Excluded text</label><input type="text" data-cp="exText" value="${esc(c.pre.exText)}"></div><div><label class="f">Excluded (n)</label>${num('data-cp="exN"', c.pre.exN)}</div></div>` : ''}
      ${trial ? `<div><label class="f">Randomisation details (under “Randomized”)</label><input type="text" data-c="randInfo" value="${esc(c.randInfo || '')}" placeholder="e.g. 1:1, blocks of 4, stratified by sex and centre" style="width:100%"></div>
      <label class="check"><input type="checkbox" data-c="itt" ${c.itt ? 'checked' : ''}><span><b>Intention-to-treat and per-protocol</b> populations instead of “Analysed”</span></label>` : ''}
      ${t === 'crossover' ? `<div><label class="f">Washout</label><input type="text" data-c="washout" value="${esc(c.washout || '')}" placeholder="e.g. 2 weeks"></div>` : ''}
      <div><label class="f">Footnote under the flowchart</label><textarea data-c="footnote" style="min-height:44px">${esc(c.footnote || '')}</textarea></div>
      ${t !== 'prisma' && t !== 'stard' ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px"><label class="f" style="margin:0">Reasons from a column</label><select id="cReasonCol">${cols.map(h => `<option>${esc(h)}</option>`).join('')}</select>
        <select id="cReasonTo"><option value="excluded">→ Excluded (enrolment)</option><option value="lost">→ Lost to follow-up (per group)</option><option value="exAnalysis">→ Excluded from analysis (per group)</option></select><button class="btn ghost small" id="cReasonGo" type="button">Fill</button></div>
        <p class="legend-note" style="margin:2px 0 0">Every non-empty value of the column is a reason; patients are counted per reason (and per group).</p>` : ''}
      <div class="row" style="gap:6px;margin-top:6px"><label class="f" style="margin:0">Enrolment timeline (report table and chart) from the date column</label><select id="cTimeline"><option value="">— none —</option>${cols.map(h => `<option ${state.cfg.timeline && state.cfg.timeline.col === h ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select></div>
    </details>`;
    $('#cForm').innerHTML = html;
    drawConsortPreview();
  }
  // checks that the numbers of the flowchart add up
  function flowWarnings(c) {
    const w = [], n = v => +v || 0;
    if (['consort', 'strobe', 'crossover', 'cluster', 'simple'].includes(c.type)) {
      const N = activeGroups().map(groupN);
      c.groups.forEach((g, i) => { const gl = state.cfg.groupLabels[activeGroups()[i]] || `Group ${i + 1}`;
        if (c.type !== 'simple' && n(g.allocated) - n(g.lost) - n(g.excludedAnalysis) !== n(g.analysed)) w.push(`${gl}: allocated (${n(g.allocated)}) − lost (${n(g.lost)}) − excluded (${n(g.excludedAnalysis)}) ≠ analysed (${n(g.analysed)})`);
        if (N[i] !== undefined && n(g.analysed) !== N[i] && !c.itt) w.push(`${gl}: analysed ${n(g.analysed)}, but the data have ${N[i]} patients`);
        if (c.type === 'cluster' && n(g.clustersAnalysed) > n(g.clusters)) w.push(`${gl}: more clusters analysed than allocated`); });
      if (c.pre && c.pre.on && n(c.pre.n) && n(c.pre.n) - n(c.pre.exN) !== n(c.assessed)) w.push(`Screened (${n(c.pre.n)}) − not eligible (${n(c.pre.exN)}) ≠ assessed for eligibility (${n(c.assessed)})`);
    }
    if (c.type === 'simple') c.steps.forEach((s2, i) => { const nx = c.steps[i + 1]; if (nx && n(s2.n) - n(s2.exN) !== n(nx.n)) w.push(`Step ${i + 1}: ${n(s2.n)} − ${n(s2.exN)} excluded ≠ ${n(nx.n)} in step ${i + 2}`); });
    if (c.type === 'stard') { const b = c.stard.branches; if (b.reduce((t, x) => t + n(x.n), 0) !== n(c.stard.tested)) w.push('The index test results do not add up to those who received the test');
      b.forEach(x => { if (n(x.n) && n(x.noRef) + n(x.present) + n(x.absent) + n(x.inconclusive) !== n(x.n)) w.push(`Index test ${x.name.toLowerCase()}: no reference + present + absent + inconclusive ≠ ${n(x.n)}`); }); }
    if (c.type === 'prisma') { const p = c.prisma, as = n(p.db) + n(p.reg) - n(p.dup) - n(p.auto) - n(p.other) - n(p.scrExcl) - n(p.notRetrieved), ex = p.reasons.reduce((t, r) => t + n(r.n), 0);
      if (as < 0) w.push('More records removed or excluded than identified');
      if (as - ex !== n(p.studies) && n(p.studies)) w.push(`Reports assessed (${as}) − excluded (${ex}) = ${as - ex}, but ${n(p.studies)} studies are included (fine when several reports belong to one study)`); }
    return w;
  }
  const FLOW_STYLE = { theme: 'classic', color: '', corners: 'square', lines: 'normal', textSize: 'normal', font: 'sans', pills: true, shadow: false, pillColor: '', pillTextColor: '#ffffff', labels: {}, nFmt: 'tight', spacing: 'normal', exSide: 'right', res: '1', pct: false, emph: false, boxWidth: 'normal', arrowHead: 'filled', arrowColor: '', sideText: 'normal', legend: false, direction: 'tb' };
  function readConsort() {
    const c = state.cfg && state.cfg.consort; if (!c || !$('#cForm').innerHTML) return;
    c.enabled = $('#cEnabled').checked;
    // appearance: the custom colour applies only when "Custom" is chosen
    const st = {}; document.querySelectorAll('#p9 [data-fs]').forEach(el => { st[el.dataset.fs] = el.type === 'checkbox' ? el.checked : el.value; });
    const labels = { ...((c.style || {}).labels || {}) };
    if (c.type !== 'simple') labels[c.type] = [...document.querySelectorAll('#p9 [data-fsl]')].map(el => el.value);
    c.style = { theme: st.theme, color: st.colorMode === 'custom' ? st.color : '', corners: st.corners, lines: st.lines, textSize: st.textSize, font: st.font, pills: st.pills, shadow: st.shadow,
      pillColor: st.pillMode === 'custom' ? st.pillColor : '', pillTextColor: st.pillTextColor, labels,
      nFmt: st.nFmt, spacing: st.spacing, exSide: st.exSide, res: st.res, pct: st.pct, emph: st.emph,
      direction: st.direction, boxWidth: st.boxWidth, arrowHead: st.arrowHead, arrowColor: st.arrowMode === 'custom' ? st.arrowColor : '', sideText: st.sideText, legend: st.legend };
    const val = el => el.type === 'checkbox' ? el.checked : el.type === 'number' ? (+el.value || 0) : el.value;
    document.querySelectorAll('#cForm [data-pr]').forEach(el => { c.prisma[el.dataset.pr] = val(el); });
    document.querySelectorAll('#cForm [data-prr]').forEach(el => { c.prisma.reasons[+el.dataset.prr][el.dataset.f] = val(el); });
    document.querySelectorAll('#cForm [data-cp]').forEach(el => { c.pre[el.dataset.cp] = val(el); });
    if ($('#cTimeline')) { const tl = $('#cTimeline').value; if (tl) state.cfg.timeline = { col: tl }; else delete state.cfg.timeline; }
    document.querySelectorAll('#cForm [data-c]').forEach(el => { c[el.dataset.c] = val(el); });
    document.querySelectorAll('#cForm [data-ex]').forEach(el => { c.excluded[+el.dataset.ex][el.dataset.f] = val(el); });
    document.querySelectorAll('#cForm [data-cg]').forEach(el => { const g = c.groups[+el.dataset.cg]; if (g) g[el.dataset.f] = val(el); });
    document.querySelectorAll('#cForm [data-sd]').forEach(el => { c.stard[el.dataset.sd] = val(el); });
    document.querySelectorAll('#cForm [data-sb]').forEach(el => { c.stard.branches[+el.dataset.sb][el.dataset.f] = val(el); });
    document.querySelectorAll('#cForm [data-st]').forEach(el => { c.steps[+el.dataset.st][el.dataset.f] = val(el); });
    syncAssessed(c);
  }
  // group sizes from the data again; the type, style, labels and the on/off switch stay
  $('#cRebuild').onclick = () => {
    if (!state.cfg) return; readConsort();
    const prev = state.cfg.consort; state.cfg.consort = null; const c = ensureConsort();
    if (prev) Object.assign(c, { enabled: prev.enabled, type: prev.type, style: prev.style, labels: prev.labels });
    renderConsortForm(); drawConsortPreview(); toast('Flowchart numbers taken from the data again');
  };
  function drawConsortPreview() {
    const c = state.cfg.consort, gl = activeGroups().map(g => state.cfg.groupLabels[g]);
    if (!state.flowDrag) flowPush(c);
    const wn = flowWarnings(c); $('#cWarn').innerHTML = wn.length ? `<div class="chip warn" style="display:block;white-space:normal;padding:6px 10px"><b>Check the numbers:</b><br>${wn.map(esc).join('<br>')}</div>` : '';
    const cv = Charts.consort(c, gl, chartPalette(state.cfg.options));
    const tgt = $('#consortCanvas');
    tgt.width = cv.width; tgt.height = cv.height; tgt.getContext('2d').drawImage(cv, 0, 0);
  }
  $('#p9').addEventListener('input', e => {
    if (e.target.id === 'cType') return;
    readConsort();
    const el = e.target, c = state.cfg.consort;
    // analysed = allocated − lost − excluded, kept in step as the user types (CONSORT / STROBE)
    if (el.dataset.cg !== undefined && ['allocated', 'lost', 'excludedAnalysis'].includes(el.dataset.f) && c.type !== 'simple') {
      const g = c.groups[+el.dataset.cg];
      g.analysed = Math.max(0, g.allocated - g.lost - g.excludedAnalysis);
      const a = document.querySelector(`#cForm [data-cg="${el.dataset.cg}"][data-f="analysed"]`); if (a) a.value = g.analysed;
    }
    drawConsortPreview();
  });
  // exclusion or loss counts from a "reason" column: one line per distinct reason
  function fillReasons(col, to) {
    const c = state.cfg.consort, cfg = state.cfg, groups = activeGroups(), rows = state.data.rows, val = r => r[col] === null || r[col] === undefined ? '' : String(r[col]).trim();
    const count = rs => { const m = new Map(); rs.forEach(r => { const v = val(r); if (v) m.set(v, (m.get(v) || 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
    if (to === 'excluded') { const cs = count(rows); if (!cs.length) { toast('The column has no values'); return; } c.excluded = cs.map(([text, n]) => ({ text, n })); }
    else groups.forEach((g, i) => { const cs = count(rows.filter(r => Analysis.groupOf(cfg, r) === g)), tot = cs.reduce((t, x) => t + x[1], 0), why = cs.map(([t, n]) => `${t} (n=${n})`).join(', '), G = c.groups[i]; if (!G) return;
      if (to === 'lost') { G.lost = tot; G.lostReason = why; } else { G.excludedAnalysis = tot; G.excludedReason = why; } G.analysed = Math.max(0, G.allocated - G.lost - G.excludedAnalysis); });
    renderConsortForm(); toast(`Reasons taken from “${col}”`);
  }
  // dragging boxes of the flowchart preview: the move is kept as an offset of that box (in the Word file and every export too)
  const flowBoxAt = (e, cv) => { const h = Charts.flowHits(), r = cv.getBoundingClientRect(), k = h.W / r.width, x = (e.clientX - r.left) * k, y = (e.clientY - r.top) * k;
    return { k, hit: [...h.list].reverse().find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h), W: h.W }; };
  $('#consortCanvas').addEventListener('mousedown', e => {
    const c = state.cfg && state.cfg.consort; if (!c) return; const { k, hit, W } = flowBoxAt(e, e.target); if (!hit) return;
    e.preventDefault(); c.offsets = c.offsets || {}; const o0 = { ...(c.offsets[hit.key] || { dx: 0, dy: 0 }) }, x0 = e.clientX, y0 = e.clientY, base = { x: hit.x - o0.dx, y: hit.y - o0.dy, w: hit.w };
    state.flowDrag = true;
    const move = ev => { const snap = v => Math.round(v / 5) * 5;
      let dx = snap(o0.dx + (ev.clientX - x0) * k), dy = snap(o0.dy + (ev.clientY - y0) * k);
      dx = Math.max(-base.x, Math.min(W - base.x - base.w, dx)); dy = Math.max(-base.y, dy);
      if (dx || dy) c.offsets[hit.key] = { dx, dy }; else delete c.offsets[hit.key]; drawConsortPreview(); };
    const up = () => { document.removeEventListener('mousemove', move); document.removeEventListener('mouseup', up); state.flowDrag = false; drawConsortPreview(); };
    document.addEventListener('mousemove', move); document.addEventListener('mouseup', up);
  });
  $('#consortCanvas').addEventListener('mousemove', e => { if (state.flowDrag || !state.cfg || !state.cfg.consort) return; e.target.style.cursor = flowBoxAt(e, e.target).hit ? 'move' : ''; });
  $('#flowResetPos').onclick = () => { const c = state.cfg && state.cfg.consort; if (!c) return; c.offsets = {}; drawConsortPreview(); toast('Boxes back to their automatic positions'); };
  // undo / redo of the flowchart: snapshots of its settings
  const flowHist = { past: [], future: [], last: '' };
  function flowPush(c) { const j = JSON.stringify(c); if (j === flowHist.last) return; if (flowHist.last) { flowHist.past.push(flowHist.last); if (flowHist.past.length > 60) flowHist.past.shift(); } flowHist.future = []; flowHist.last = j; }
  const flowGo = back => { const from = back ? flowHist.past : flowHist.future, to = back ? flowHist.future : flowHist.past; if (!from.length) { toast(back ? 'Nothing to undo' : 'Nothing to redo'); return; }
    to.push(flowHist.last); flowHist.last = from.pop(); state.cfg.consort = JSON.parse(flowHist.last); const keep = flowHist.last; renderConsortForm(); flowHist.last = keep; };
  $('#cUndo').onclick = () => flowGo(true); $('#cRedo').onclick = () => flowGo(false);
  // section labels in Arabic, or back to the standard text
  const AR_LABELS = { consort: ['التسجيل', 'التوزيع', 'المتابعة', 'التحليل'], crossover: ['التسجيل', 'التوزيع', 'المتابعة', 'التحليل'], cluster: ['التسجيل', 'التوزيع', 'المتابعة', 'التحليل'],
    strobe: ['التحديد', 'الإدراج', 'المتابعة', 'التحليل'], stard: ['التسجيل', 'الاختبار', 'المرجع', 'التشخيص'], prisma: ['التحديد', 'الفرز', 'المُدرَجة'] };
  $('#cArabic').onclick = () => { const t = state.cfg.consort.type; document.querySelectorAll('#p9 [data-fsl]').forEach((el, i) => { el.value = (AR_LABELS[t] || [])[i] || ''; }); readConsort(); drawConsortPreview(); };
  $('#cEnglish').onclick = () => { document.querySelectorAll('#p9 [data-fsl]').forEach(el => { el.value = ''; }); readConsort(); drawConsortPreview(); };
  // flowchart styles saved in this browser
  const FS_KEY = 'pmse-flow-styles', flowStyles = () => { try { return JSON.parse(localStorage.getItem(FS_KEY) || '{}'); } catch (e) { return {}; } };
  const renderFlowStyles = () => { $('#cStyleList').innerHTML = '<option value="">— saved flowchart styles —</option>' + Object.keys(flowStyles()).map(n => `<option>${esc(n)}</option>`).join(''); };
  $('#cStyleSave').onclick = () => { readConsort(); const name = (prompt('Name of this flowchart style:', 'My flowchart style') || '').trim(); if (!name) return; const all = flowStyles(); all[name] = state.cfg.consort.style;
    try { localStorage.setItem(FS_KEY, JSON.stringify(all)); } catch (e) { toast('This browser does not allow saving'); return; } renderFlowStyles(); $('#cStyleList').value = name; toast(`Flowchart style “${name}” saved`); };
  $('#cStyleApply').onclick = () => { const st = flowStyles()[$('#cStyleList').value]; if (!st) return; state.cfg.consort.style = JSON.parse(JSON.stringify(st)); renderConsortForm(); toast('Flowchart style applied'); };
  renderFlowStyles();
  $('#cType').addEventListener('change', e => { readConsort(); state.cfg.consort.type = e.target.value; renderConsortForm(); });
  $('#cForm').addEventListener('click', e => {
    if (e.target.id === 'cReasonGo') { readConsort(); fillReasons($('#cReasonCol').value, $('#cReasonTo').value); return; }
    const c = state.cfg.consort, b = e.target.closest('[data-cact],[data-exdel],[data-stdel],[data-prdel]'); if (!b) return;
    readConsort();
    if (b.dataset.cact === 'addEx') c.excluded.push({ text: 'Other reasons', n: 0 });
    else if (b.dataset.cact === 'addStep') c.steps.push({ text: 'Next step', n: 0, exText: '', exN: 0 });
    else if (b.dataset.cact === 'addPr') c.prisma.reasons.push({ text: 'Other reason', n: 0 });
    else if (b.dataset.prdel !== undefined) c.prisma.reasons.splice(+b.dataset.prdel, 1);
    else if (b.dataset.exdel !== undefined) c.excluded.splice(+b.dataset.exdel, 1);
    else if (b.dataset.stdel !== undefined) c.steps.splice(+b.dataset.stdel, 1);
    renderConsortForm();
  });

  /* ---------- read UI into cfg ---------- */
  // each step's controls are read only while that step is on screen, so a hidden, older copy never overwrites the setup
  const isActive = n => $('#p' + n).classList.contains('active');
  function readUiIntoCfg() {
    const cfg = state.cfg; if (!cfg) return;
    cfg.study.title = $('#studyTitle').value; cfg.study.software = $('#software').value;
    if (isActive(2)) readVariables();
    if (isActive(3)) {
      document.querySelectorAll('[data-tp]').forEach(el => cfg.tpLabels[el.dataset.tp] = el.value.trim() || el.dataset.tp);
      document.querySelectorAll('[data-tptime]').forEach(el => { if (el.value === '') delete cfg.tpTime[el.dataset.tptime]; else cfg.tpTime[el.dataset.tptime] = +el.value; });
      document.querySelectorAll('[data-tpphase]').forEach(el => { if (el.value.trim()) cfg.tpPhase[el.dataset.tpphase] = el.value.trim(); else delete cfg.tpPhase[el.dataset.tpphase]; });
      document.querySelectorAll('[data-vset]').forEach(el => { const v = cfg.variables.find(x => x.id === el.dataset.vset); if (!v) return; const k = el.dataset.vk;
        if (k === 'respPct' || k === 'respDir') { v.resp = v.resp || {}; v.resp[k === 'respPct' ? 'pct' : 'dir'] = el.value; if (!+v.resp.pct) delete v.resp; }
        else if (el.value === '') delete v[k]; else v[k] = +el.value; });
      document.querySelectorAll('[data-tpinc]').forEach(el => { cfg.tpInclude[el.dataset.tpinc] = el.checked; });
      readTpVars();
    }
    const o = cfg.options;
    for (const [k, [id, box]] of Object.entries(OPTION_FIELDS)) {
      const el = $('#' + id);
      if (!el.closest('.panel').classList.contains('active')) continue;
      o[k] = box ? el.checked : typeof DEFAULT_OPTIONS[k] === 'number' ? +el.value : el.value;
    }
    if (isActive(7)) {
      document.querySelectorAll('[data-ccol]').forEach(el => { o.customColors[+el.dataset.ccol] = el.value; });
      document.querySelectorAll('#figTbl [data-fv]').forEach(el => { const v = cfg.variables.find(x => x.id === el.dataset.fv); if (!v) return;
        if (el.type === 'checkbox') { if (el.checked) v[el.dataset.fk] = true; else delete v[el.dataset.fk]; } else v[el.dataset.fk] = el.value.trim(); });
    }
    if (isActive(8)) readAdvanced();
    if (isActive(9)) readConsort();
  }
  function readVariables() {
    const cfg = state.cfg;
    document.querySelectorAll('[data-glabel]').forEach(el => cfg.groupLabels[el.dataset.glabel] = el.value.trim() || (el.dataset.glabel === Analysis.ALL_GROUP ? 'All patients' : el.dataset.glabel));
    document.querySelectorAll('[data-ginc]').forEach(el => cfg.groupInclude[el.dataset.ginc] = el.checked);
    document.querySelectorAll('#varsTbl tr[data-vid]').forEach(tr => {
      const v = cfg.variables.find(x => x.id === tr.dataset.vid); if (!v) return;
      tr.querySelectorAll('[data-k]').forEach(el => {
        const k = el.dataset.k;
        if (k === 'include') v.include = el.checked;
        else if (k === 'levels') v.levels = el.value.split(',').map(s => s.trim()).filter(Boolean);
        else if (k === 'table') v.table = el.value.trim() || 'Other outcomes';
        else if (k === 'split') v.split = !!el.value;
        else if (k === 'splitTable') v.splitTable = el.value.trim() || 'Other outcomes';
        else v[k] = el.value;
      });
      tr.querySelectorAll('[data-vtp]').forEach(el => { v.cols[+el.dataset.vtp].include = el.checked; });
    });
  }

  /* ---------- step 5: analysis + preview ---------- */
  const HEAD_BG = { auto: '', lavender: '#EBDDF6', blue: '#DCE6F2', green: '#E2EFDA', navy: '#1F3864', none: '#fff' };
  function htmlTable(head, rows) {
    const h = head.map(c => typeof c === 'string' ? { t: c } : c);
    const o = state.cfg.options, bg = HEAD_BG[o.tableHead] || '', thStyle = bg ? `style="background:${bg};${o.tableHead === 'navy' ? 'color:#fff' : ''}"` : '';
    // banded rows and left-aligned names follow the variables: a row starts a new variable unless a row span covers its first column
    let cover = 0, band = -1;
    // significant P values in colour (as in the Word file)
    const pcol = { red: '#C00000', green: '#2E7D32', blue: '#1F4E9A' }[o.pColor], sym = o.sigSym || '', sigRe = new RegExp(`^<?\\.?\\d[\\d.]*${sym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z\u1d43-\u1dbf]*$`);
    const pcolOn = pcol && sym;
    const body = rows.map((r, ri) => {
      const first = cover === 0; if (first) { if (!(r[0] && r[0].ind)) band++; cover = Math.max(0, ...r.map(c => (c.rs || 1) - 1)); } else cover--;
      return `<tr class="${o.tableBands && band % 2 ? 'band' : ''}">${r.map((c, ci) => `<td ${c.rs > 1 ? `rowspan="${c.rs}"` : ''} ${c.span > 1 ? `colspan="${c.span}"` : ''} class="${c.b ? 'b' : ''} ${c.small ? 's' : ''} ${c.hl ? 'hl' : ''} ${ri + (c.rs || 1) === rows.length ? 'last' : ''} ${(o.firstColLeft && first && ci === 0) || c.ind || c.left ? 'left' : ''}"${pcolOn && (c.t || []).length === 1 && sigRe.test(String(c.t[0])) ? ` style="color:${pcol}"` : ''}>${(c.t || []).map(esc).join('<br>')}</td>`).join('')}</tr>`;
    }).join('');
    return `<table class="rt ${o.tableStyle === 'apa' ? 'apa' : ''} ${o.tablePad && o.tablePad !== 'normal' ? 'rt-' + o.tablePad : ''}" style="font-family:'${esc(o.tableFont && o.tableFont !== 'same' ? o.tableFont : o.font)}',serif;${+o.tableFontSize && +o.tableFontSize !== 10 ? `font-size:${(1.4 * o.tableFontSize).toFixed(1)}px` : ''}"><thead><tr>${h.map(c => `<th ${c.span ? `colspan="${c.span}"` : ''} ${o.tableStyle === 'apa' ? '' : thStyle}>${esc(c.t)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  }

  /* ---------- step 10: results by variable — every statistic and candidate test, for checking before the report ---------- */
  const tblHtml = t => `<div class="xp-tbl"><h4>${esc(t.title)}</h4><div style="overflow-x:auto"><table class="t xp"><thead><tr>${t.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
    t.rows.map(r => `<tr>${r.map((c, i) => `<td class="${i === 0 ? 'b' : ''}${/\*$/.test(c) ? ' sig' : ''}${c === '✓' ? ' used' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  // options of the stage, saved with the setup / project
  const XP_DEFAULT = { tq: '', cmp: '', subBy: '', comBeside: false, type: 'all', q: '', sig: false, desc: true, extra: false, tests: true, pairs: true, time: true, fig: 'auto', out: '1.5', dec: '', openData: false, wordData: false, view: 'half', overview: true, comments: true, sort: 'sheet' };
  const xpo = () => (state.cfg.explore = { ...XP_DEFAULT, ...(state.cfg.explore || {}) });
  function renderXpOpts() {
    const o = xpo();
    document.querySelectorAll('[data-xo]').forEach(el => { const v = o[el.dataset.xo]; el.type === 'checkbox' ? (el.checked = !!v) : (el.value = v); });
    $('#xpView').value = o.view;
  }
  $('#p10').addEventListener('input', e => {
    const k = e.target.dataset.xo; if (!k) return;
    const o = xpo(); o[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    // the statistics themselves change with these; the rest only filters what is shown
    if (['extra', 'fig', 'out', 'dec'].includes(k)) renderExplore(); else drawExplore();
  });
  // the variables shown: type, search and "significant only"
  const xpList = () => {
    const x = state.explore, o = xpo(), q = o.q.trim().toLowerCase(), id = $('#xpVar').value;
    // one variable (its own export), two variables side by side, or the filters; text searched in the labels or, with "in tables", in every result table
    const tq = (o.tq || '').trim().toLowerCase(), inTables = it => JSON.stringify(it.tables).toLowerCase().includes(tq);
    const list = state.xpOnly ? x.items.filter(it => it.id === state.xpOnly) : x.items.filter(it => (!id || it.id === id || (o.cmp && it.id === o.cmp)) && (o.type === 'all' || it.kind === o.type) && (!q || it.label.toLowerCase().includes(q)) && (!o.sig || it.sig) && (!tq || inTables(it)));
    const pins = state.cfg.xpPins || [];
    if (pins.length && !state.xpOnly) list.sort((a, b) => (pins.includes(b.id) ? 1 : 0) - (pins.includes(a.id) ? 1 : 0));
    // order: as in the sheet, significant first, smallest P first (repeated measures, without one P, after), A–Z, or by type
    const pv = it => isFinite(it.p) ? it.p : it.sig ? 0.0499 : 2, KIND = { numeric: 0, categorical: 1, repeated: 2 };
    const by = { sig: (a, b) => (b.sig ? 1 : 0) - (a.sig ? 1 : 0), p: (a, b) => pv(a) - pv(b), az: (a, b) => a.label.localeCompare(b.label), kind: (a, b) => KIND[a.kind] - KIND[b.kind] }[o.sort];
    const pinFirst = (a, b) => (pins.includes(b.id) ? 1 : 0) - (pins.includes(a.id) ? 1 : 0);
    return by ? list.map((it, i) => [it, i]).sort((a, b) => pinFirst(a[0], b[0]) || by(a[0], b[0]) || a[1] - b[1]).map(x => x[0]) : list;
  };
  const xpTables = it => { const o = xpo(); return it.tables.filter(t => !t.cat || o[t.cat] !== false); };
  function renderExplore() {
    const box = $('#explore'); if (!state.cfg) return;
    const o = xpo(); renderXpOpts();
    let x;
    try { x = Analysis.explore(state.data, state.cfg, { dec: o.dec, extra: o.extra, fig: o.fig === 'none' ? 'auto' : o.fig, out: o.out }); } catch (err) { console.error(err); box.innerHTML = `<p style="color:var(--bad)">${esc(err.message)}</p>`; return; }
    state.explore = x; state.xpComments = new Map();
    const sel = $('#xpVar'), cur = sel.value, kinds = { numeric: 'numeric', categorical: 'categorical', repeated: 'repeated' };
    sel.innerHTML = `<option value="">All variables (${x.items.length})</option>` + x.items.map(it => `<option value="${esc(it.id)}">${esc(it.label)} — ${kinds[it.kind]}</option>`).join('');
    if (x.items.some(it => it.id === cur)) sel.value = cur;
    $('#xpCmp').innerHTML = `<option value="">— one variable (choose it above) —</option>` + x.items.map(it => `<option value="${esc(it.id)}">${esc(it.label)}</option>`).join(''); $('#xpCmp').value = o.cmp || '';
    drawExplore();
  }
  // every patient's value in each group, editable; outliers (beyond 1.5 × IQR in the group) and missing values marked
  state.xpOpen = new Set(); state.xpChanged = new Set();
  function dataHtml(it) {
    const cfg = state.cfg, idc = cfg.idCols[0], rows = state.data.rows, num = it.kind !== 'categorical';
    return `<div class="xp-groups">${activeGroups().map(g => {
      const idx = rows.map((r, i) => i).filter(i => Analysis.groupOf(cfg, rows[i]) === g);
      const fence = it.cols.map(c => num ? Analysis.outFence(idx.map(i => Analysis.toNum(rows[i][c.col])).filter(isFinite), xpo().out) : null);
      const cls = (val, ci, i, col) => {
        const miss = val === null || val === undefined || String(val).trim() === '', n = Analysis.toNum(val), f = fence[ci];
        return [miss ? 'miss' : f && isFinite(n) && (n < f[0] || n > f[1]) ? 'out' : '', state.xpChanged.has(i + '|' + col) ? 'chg' : ''].filter(Boolean).join(' ');
      };
      return `<div class="xp-group"><h5>${esc(cfg.groupLabels[g] || g)} (n=${idx.length})</h5><table class="t xd"><thead><tr><th>#</th>${idc ? `<th>${esc(idc)}</th>` : ''}${it.cols.map(c => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${
        idx.map(i => `<tr><td class="rn">${i + 1}</td>${idc ? `<td class="rn">${esc(rows[i][idc] ?? '')}</td>` : ''}${it.cols.map((c, ci) =>
          `<td class="${cls(rows[i][c.col], ci, i, c.col)}" contenteditable="true" data-xr="${i}" data-xc="${esc(c.col)}">${esc(rows[i][c.col] ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }).join('')}</div><div class="xp-legend">${Analysis.OUT_RULE[xpo().out] ? `Orange: outlier (${Analysis.OUT_RULE[xpo().out]} of its group) · ` : ''}red: missing · purple edge: changed here. Click a value to change it; Enter to confirm, Esc to cancel.</div>`;
  }
  const XP_NOFIG = ['compact', 'tables'];
  // one summary table for a variable: each group's n, mean ± SD and median (IQR), with the P value and effect size of the test used in the report
  function summaryTable(it) {
    const d = it.tables.find(t => t.cat === 'desc'), tests = it.tables.filter(t => t.cat === 'tests'); if (!d) return null;
    const ix = n => d.head.indexOf(n), used = tests.map(t => t.rows.find(r => r[r.length - 1] === '✓')).find(Boolean);
    const P = used ? used[3] : isFinite(it.p) ? Analysis.fmtP(it.p, state.cfg.options.alpha) : '—';
    if (it.kind === 'categorical') {
      const eff = tests.find(t => /^Effect of/.test(t.title)), levels = d.rows.filter(r => r[0] !== 'Missing');
      // two groups and two categories: the relative risk; otherwise Cramér's V from χ² (V = √(χ² / (N × (min(rows, columns) − 1))))
      const g = d.head.length - 2, cnt = levels.map(r => r.slice(1, 1 + g).map(c => parseInt(c, 10) || 0)), N = cnt.flat().reduce((x, y) => x + y, 0);
      const rs = cnt.map(r => r.reduce((x, y) => x + y, 0)), cs = cnt[0] ? cnt[0].map((_, j) => cnt.reduce((x, r) => x + r[j], 0)) : [];
      const chi2 = cnt.reduce((x, r, i) => x + r.reduce((y, o, j) => { const e = rs[i] * cs[j] / N; return e > 0 ? y + (o - e) ** 2 / e : y; }, 0), 0), kk = Math.min(rs.filter(Boolean).length, cs.filter(Boolean).length);
      const V = used && /χ²/.test(used[1] || '') && N && kk > 1 ? Math.sqrt(chi2 / (N * (kk - 1))) : NaN;
      const ef = eff && eff.rows.length === 1 ? `RR ${eff.rows[0][1]}` : isFinite(V) ? `Cramér's V = ${V.toFixed(3)}` : '—';
      return { title: 'Summary', head: [...d.head, 'P value', 'Effect size'], rows: levels.map((r, i) => [...r, i ? '' : P, i ? '' : ef]),
        note: used ? `${used[0]}${used[1] ? ` (${used[1]}${used[2] ? `, df ${used[2]}` : ''})` : ''}.${/^RR/.test(ef) ? ' RR: relative risk (95% CI).' : ''}` : it.test };
    }
    const ms = r => `${r[ix('Mean')]} ± ${r[ix('SD')]}`, mi = r => `${r[ix('Median')]} (${r[ix('IQR')]})`;
    if (it.kind === 'repeated') {
      const bt = tests.find(t => t.head[0] === 'Timepoint'), normalAt = tp => d.rows.filter(r => r[0] === tp).every(r => /\(normal\)/.test(r[r.length - 1]));
      const at = tp => { const r = bt && bt.rows.find(x => x[0] === tp); return r ? [normalAt(tp) ? r[1] : r[2], r[3] || ''] : ['', '']; };
      const tps = [...new Set(d.rows.map(r => r[0]))];
      return { title: 'Summary', head: ['Timepoint', '', 'n', 'Mean ± SD', 'Median (IQR)', 'P value', 'Effect size'],
        rows: d.rows.filter(r => r[1] !== 'All patients').map((r, i, all) => { const first = all.findIndex(x => x[0] === r[0]) === i, [p, e] = at(r[0]); return [first ? r[0] : '', r[1], r[ix('n')], ms(r), mi(r), first ? p : '', first ? e : '']; }),
        note: `P value between the groups at each timepoint: ${bt ? `${bt.head[1].replace(/ P$/, '')} when every group is normally distributed, otherwise ${bt.head[2].replace(/ P$/, '')}` : '—'}. ${tps.length} timepoints.` };
    }
    const rows = d.rows.map((r, i) => [r[0], r[ix('n')], ms(r), mi(r), i ? '' : P, i ? '' : (used && used[4]) || '—']);
    return { title: 'Summary', head: ['', 'n', 'Mean ± SD', 'Median (IQR)', 'P value', 'Effect size'], rows,
      note: used ? `${used[0]}${used[1] ? ` (${used[1]}${used[2] ? `, df ${used[2]}` : ''})` : ''}.` : it.test };
  }
  // the half view drawn as the Word file: titled grid tables (grey header, report font), the groups' patients side by side, values still editable
  const wordTbl = (title, head, body, cls = '') => `<div class="xw-title">${esc(title)}</div><table class="rt xw ${cls}" style="font-family:'${esc(state.cfg.options.font)}',serif"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${body}</tbody></table>`;
  function dataWordHtml(it) {
    const cfg = state.cfg, idc = cfg.idCols[0], rows = state.data.rows, num = it.kind !== 'categorical', gs = activeGroups();
    const idx = gs.map(g => rows.map((r, i) => i).filter(i => Analysis.groupOf(cfg, rows[i]) === g)), n = Math.max(0, ...idx.map(x => x.length));
    const fence = idx.map(ix => it.cols.map(c => num ? Analysis.outFence(ix.map(i => Analysis.toNum(rows[i][c.col])).filter(isFinite), xpo().out) : null));
    const cls = (val, f, i, col) => { const miss = val === null || val === undefined || String(val).trim() === '', v = Analysis.toNum(val);
      return [miss ? 'miss' : f && isFinite(v) && (v < f[0] || v > f[1]) ? 'out' : '', state.xpChanged.has(i + '|' + col) ? 'chg' : ''].filter(Boolean).join(' '); };
    const per = [idc || '#', ...it.cols.map(c => c.label)];
    const head = gs.flatMap(g => per.map((h, j) => j === 0 ? `${cfg.groupLabels[g] || g}: ${h}` : h));
    const body = Array.from({ length: n }, (_, r) => `<tr>${idx.map((ix, gi) => { const i = ix[r];
      if (i === undefined) return per.map(() => '<td></td>').join('');
      return `<td>${esc(idc ? rows[i][idc] ?? '' : i + 1)}</td>` + it.cols.map((c, ci) => `<td class="${cls(rows[i][c.col], fence[gi][ci], i, c.col)}" contenteditable="true" data-xr="${i}" data-xc="${esc(c.col)}">${esc(rows[i][c.col] ?? '')}</td>`).join(''); }).join('')}</tr>`).join('');
    return wordTbl("Data of each group — every patient's value", head, body, 'small')
      + `<div class="xp-legend">${Analysis.OUT_RULE[xpo().out] ? `Orange: outlier (${Analysis.OUT_RULE[xpo().out]} of its group) · ` : ''}red: missing · purple edge: changed here. Click a value to change it; Enter to confirm, Esc to cancel.</div>`;
  }
  const sumWordHtml = it => { const t = summaryTable(it); if (!t) return xpTables(it).map(tblHtml).join('');
    return wordTbl(t.note ? `Summary — ${t.note}` : 'Summary', t.head, t.rows.map(r => `<tr>${r.map(c => `<td class="${/\*$/.test(c) ? 'sigp' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')); };
  const effWordHtml = it => it.effects ? wordTbl(it.effects.title, it.effects.head, it.effects.rows.map(r => `<tr>${r.map(c => `<td>${esc(c)}</td>`).join('')}</tr>`).join(''))
    + (it.effects.note ? `<div class="xp-sum-note">${esc(it.effects.note)}</div>` : '') : '';
  // the comment the report writes for this variable alone (as in step 11), shown below its figure
  function xpComment(it) {
    if (!xpo().comments) return '';
    const cache = state.xpComments || (state.xpComments = new Map());
    if (cache.has(it.id)) return cache.get(it.id);
    const cfg = state.cfg; let v = cfg.variables.find(x => x.id === it.id);
    if (!v) { const m = /^(.*)_(\d+)$/.exec(it.id), o = m && cfg.variables.find(x => x.id === m[1]), c = o && o.cols.find(x => x.col === it.cols[0].col);
      if (c) v = { ...o, id: it.id, kind: 'single', type: 'numeric', split: false, cols: [c], label: it.label }; }
    let txt = '';
    if (v) try { txt = Analysis.run(state.data, { ...cfg, variables: [{ ...v, include: true }], advanced: [], consort: null, options: { ...effOptions(), correlation: false, figures: 'none', summary: false } }).sections.map(s => s.comment).filter(Boolean).join(' '); } catch (e) { console.error(e); }
    cache.set(it.id, txt);
    return txt;
  }
  const commentHtml = it => { if (xpo().comBeside) return ''; const t = xpComment(it); return t ? `<div class="xp-comment">${esc(t)}</div>` : ''; };
  // the result tables; with "comment beside the test", the report's comment follows the table of the test it came from (✓)
  const tablesHtml = it => { let done = false; return xpTables(it).map(t => { let h = tblHtml(t);
    if (xpo().comBeside && !done && t.rows.some(r => r[r.length - 1] === '✓')) { done = true; const c = xpComment(it); if (c) h += `<div class="xp-comment"><b>Report comment from this test:</b> ${esc(c)}</div>`; } return h; }).join(''); };
  // the 🔬 panel of a variable: sensitivity without outliers, subgroups, assumptions (Q-Q plot, Levene), bootstrap CIs, the test chosen live, outliers in the sheet and the edits made
  state.xpLab = new Set(); state.xpCollapsed = new Set(); state.xpNoteOpen = new Set(); state.xpHist = [];
  function labHtml(it) {
    const cfg = state.cfg, rows = state.data.rows, gs = activeGroups(), gl = gs.map(g => cfg.groupLabels[g] || g), o = xpo(), out = [];
    const v = cfg.variables.find(q => q.id === it.id || it.id.startsWith(q.id + '_')), col = it.cols[0].col, num = it.kind === 'numeric';
    const F = (x, d = 3) => isFinite(x) ? (+x).toFixed(d) : '—', P = p => Analysis.fmtP(p, cfg.options.alpha);
    const vals = (rs, c = col) => gs.map(g => rs.filter(r => Analysis.groupOf(cfg, r) === g).map(r => Analysis.toNum(r[c])).filter(isFinite));
    const testP = (gv, param) => gv.length === 2 ? (param ? Stats.tTest(gv[0], gv[1]).p : Stats.mannWhitney(gv[0], gv[1]).p) : (param ? Stats.anova(gv).p : Stats.kruskalWallis(gv).p);
    const param = /t-test|ANOVA/i.test(it.test || '');
    if (num && gs.length >= 2) {
      // sensitivity: the same test with every patient and without the outliers of each group
      const all = vals(rows), fences = all.map(a => Analysis.outFence(a, o.out === 'none' ? '1.5' : o.out)), trimmed = all.map((a, i) => fences[i] ? a.filter(x => x >= fences[i][0] && x <= fences[i][1]) : a);
      if (all.every(a => a.length > 1) && trimmed.every(a => a.length > 1)) { const p1 = testP(all, param), p2 = testP(trimmed, param);
        out.push(`<div class="xp-lt"><h5>Sensitivity: without outliers</h5><table class="t xp"><thead><tr><th></th>${gl.map(g => `<th>${esc(g)} n</th>`).join('')}<th>P (${param ? 'parametric' : 'non-parametric'})</th></tr></thead><tbody>
          <tr><td class="b">All patients</td>${all.map(a => `<td>${a.length}</td>`).join('')}<td>${esc(P(p1))}</td></tr><tr><td class="b">Without outliers</td>${trimmed.map(a => `<td>${a.length}</td>`).join('')}<td>${esc(P(p2))}</td></tr></tbody></table>
          <div class="legend-note">${(p1 <= cfg.options.alpha) === (p2 <= cfg.options.alpha) ? 'The conclusion does not change without the outliers.' : '⚠ The conclusion changes without the outliers.'}</div></div>`); }
      // assumptions: Levene's test and a normal Q-Q plot per group
      const lev = Stats.levene(all.filter(a => a.length > 1));
      let qq = ''; try { qq = Charts.draw({ type: 'qq', series: gl.map((g, i) => ({ name: g, data: all[i] })) }, chartPalette(cfg.options), { ...chartStyle(cfg.options), aspect: 'standard', res: 1 }).toDataURL('image/png'); } catch (e) { }
      out.push(`<div class="xp-lt"><h5>Assumptions</h5><div>Levene's test of equal variances: P ${esc(P(lev))} — ${lev < 0.05 ? 'unequal variances' : 'equal variances'}</div>${qq ? `<img src="${qq}" alt="" style="max-width:100%">` : ''}</div>`);
      // bootstrap 95% CIs of each group's mean and median (1000 resamples, seeded)
      const boot = a => { let s0 = 7; const rnd = () => (s0 = (s0 * 16807) % 2147483647) / 2147483647, mm = [], md = [];
        for (let b = 0; b < 1000; b++) { const x = a.map(() => a[Math.floor(rnd() * a.length)]); mm.push(Stats.mean(x)); md.push(Stats.median(x)); }
        const q = (arr, p) => Stats.quantile(arr, p); return [q(mm, 0.025), q(mm, 0.975), q(md, 0.025), q(md, 0.975)]; };
      out.push(`<div class="xp-lt"><h5>Bootstrap 95% CIs (1000 resamples)</h5><table class="t xp"><thead><tr><th>Group</th><th>Mean (95% CI)</th><th>Median (95% CI)</th></tr></thead><tbody>${all.map((a, i) => { if (a.length < 2) return ''; const b = boot(a);
        return `<tr><td class="b">${esc(gl[i])}</td><td>${F(Stats.mean(a), 2)} (${F(b[0], 2)} to ${F(b[1], 2)})</td><td>${F(Stats.median(a), 2)} (${F(b[2], 2)} to ${F(b[3], 2)})</td></tr>`; }).join('')}</tbody></table></div>`);
      // outliers: jump to their row in the sheet
      const outs = rows.map((r, i) => [r, i]).filter(([r]) => { const gi = gs.indexOf(Analysis.groupOf(cfg, r)), x = Analysis.toNum(r[col]); return gi >= 0 && fences[gi] && isFinite(x) && (x < fences[gi][0] || x > fences[gi][1]); });
      out.push(`<div class="xp-lt"><h5>Outliers (${outs.length})</h5>${outs.length ? outs.map(([r, i]) => `<a href="#" data-xprow="${i}">row ${i + 1}: ${esc(r[col])}${cfg.idCols[0] ? ` (${esc(cfg.idCols[0])} ${esc(r[cfg.idCols[0]] ?? '')})` : ''}</a>`).join(' · ') + ` <a href="#" data-xprows="${outs.map(x => x[1]).join(',')}">all in the sheet →</a>` : '<span class="legend-note">none</span>'}</div>`);
    }
    // subgroups: the P value of the report's test within each level of a chosen column
    const sub = o.subBy && state.data.headers.includes(o.subBy) ? o.subBy : '';
    const subCols = state.data.headers.filter(h => h !== cfg.groupCol && !cfg.idCols.includes(h) && (n => n >= 2 && n <= 6)(new Set(rows.map(r => r[h]).filter(x => x !== null && x !== undefined && x !== '')).size));
    let subTbl = '';
    if (sub && v) { const levels = [...new Set(rows.map(r => r[sub]).filter(x => x !== null && x !== undefined && x !== ''))];
      subTbl = `<table class="t xp"><thead><tr><th>${esc(sub)}</th><th>n</th><th>Test</th><th>P value</th></tr></thead><tbody>${levels.map(l => { const rs = rows.filter(r => String(r[sub]) === String(l));
        let x = null; try { x = Analysis.explore({ ...state.data, rows: rs }, { ...cfg, variables: [{ ...v, include: true }] }, {}).items.find(q => q.id === it.id); } catch (e) { }
        return `<tr><td class="b">${esc(l)}</td><td>${rs.length}</td><td>${esc(x ? x.test || '—' : '—')}</td><td>${x && isFinite(x.p) ? esc(P(x.p)) : '—'}</td></tr>`; }).join('')}</tbody></table>`; }
    out.push(`<div class="xp-lt"><h5>Subgroups</h5><select data-xpsub="1"><option value="">— by a column —</option>${subCols.map(h => `<option ${h === sub ? 'selected' : ''}>${esc(h)}</option>`).join('')}</select>${subTbl}</div>`);
    // the test of this variable, changed here (the report follows)
    if (v && (v.type === 'numeric' || v.type === 'categorical') && v.kind === 'single') {
      const tests = v.type === 'numeric' ? [['t', "Student's t-test"], ['welch', "Welch's t-test"], ['anova', 'One-way ANOVA'], ['welchanova', "Welch's ANOVA"], ['mw', 'Mann-Whitney U'], ['kw', 'Kruskal-Wallis']] : [['chi', 'Chi-square'], ['fisher', "Fisher's exact (2×2)"], ['ffh', 'Fisher-Freeman-Halton']];
      out.push(`<div class="xp-lt"><h5>Test in the report</h5><select data-xptest="${esc(v.id)}"><option value="">Automatic (step 4)</option>${tests.map(([k, l]) => `<option value="${k}" ${v.test === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`);
    }
    // edits of this variable's data made in this step
    const hist = state.xpHist.filter(h => it.cols.some(c => c.col === h.col));
    out.push(`<div class="xp-lt"><h5>Edits of the data here (${hist.length})</h5>${hist.length ? `<ul class="xp-hist">${hist.slice(-12).reverse().map(h => `<li>${esc(h.time)} — row ${h.row + 1}, ${esc(h.col)}: ${esc(h.old ?? '(empty)')} → ${esc(h.val ?? '(empty)')}</li>`).join('')}</ul>` : '<span class="legend-note">none</span>'}</div>`);
    return `<div class="xp-labgrid">${out.join('')}</div>`;
  }
  const sumHtml = it => { const t = summaryTable(it); return t ? tblHtml(t) + (t.note ? `<div class="xp-sum-note">${esc(t.note)}</div>` : '') : xpTables(it).map(tblHtml).join(''); };
  // a card's lines: each group's mean ± SD or median (IQR), its frequencies, or the values at the first and last timepoint
  function keyLines(it) {
    const t = it.tables.find(x => x.cat === 'desc'); if (!t) return [];
    const col = n => t.head.indexOf(n), normal = /^normal/.test(it.normal || '');
    const val = r => normal ? `${r[col('Mean')]} ± ${r[col('SD')]}` : `${r[col('Median')]} (IQR ${r[col('IQR')]})`;
    if (it.kind === 'categorical') return t.rows.filter(r => r[0] !== 'Missing').slice(0, 3).map(r => `<b>${esc(r[0])}:</b> ${t.head.slice(1).map((h, i) => `${esc(h.replace(/ \(n=\d+\)$/, ''))} ${esc(r[i + 1])}`).join(' · ')}`);
    // repeated: rows are [timepoint, group, n, missing, mean, …], in line with the header
    if (it.kind === 'repeated') { const tps = [...new Set(t.rows.map(r => r[0]))], ends = [tps[0], tps[tps.length - 1]];
      return t.rows.filter(r => ends.includes(r[0]) && r[1] !== 'All patients').map(r => `<b>${esc(r[1])}</b> at ${esc(r[0])}: ${esc(val(r))}`).slice(0, 6); }
    return t.rows.map(r => `<b>${esc(r[0])}:</b> ${esc(val(r))}`).slice(0, 4);
  }
  function drawExplore() {
    const x = state.explore; if (!x) return;
    const list = xpList(), o = state.cfg.options, figs = $('#xpFigs').checked && xpo().fig !== 'none' && !XP_NOFIG.includes(xpo().view);
    if (xpo().openData) list.forEach(it => state.xpOpen.add(it.id));
    // overview of every shown variable: click a row to open that variable
    const ov = xpo().overview && !$('#xpVar').value && list.length > 1 ? `<div class="report-sec"><h3 style="margin:0 0 6px">Overview</h3><div style="overflow-x:auto"><table class="t xp xp-ov"><thead><tr><th>Variable</th><th>Type</th><th>n</th><th>Distribution</th><th>Test in the report</th><th>P value</th><th>Significant</th></tr></thead><tbody>${
      list.map(it => `<tr data-xpgo="${esc(it.id)}"><td class="b">${esc(it.label)}</td><td>${it.kind}</td><td>${it.n ?? '—'}</td><td>${esc(it.normal || '—')}</td><td>${esc(it.test || '—')}</td><td>${isFinite(it.p) ? esc(Analysis.fmtP(it.p, state.cfg.options.alpha)) : '—'}</td><td class="${it.sig ? 'sig' : ''}">${it.sig ? 'Yes' : 'No'}</td></tr>`).join('')}</tbody></table></div></div>` : '';
    const view = xpo().view, figUrl = it => { if (!figs || !it.spec) return ''; try { return Charts.draw(it.spec, chartPalette(o), { ...chartStyle(o), res: 1 }).toDataURL('image/png'); } catch (e) { return ''; } };
    const pTxt = it => isFinite(it.p) ? Analysis.fmtP(it.p, o.alpha) : '—';
    const empty = `<p class="legend-note">${x.items.length ? 'No variable matches the options (type, search, significant only).' : 'No variables are ticked in step 2.'}</p>`;
    // key results: a card per variable with its group values, test and P; click to open it
    if (view === 'cards' || view === 'gallery') {
      $('#explore').innerHTML = ov + (!list.length ? empty : view === 'cards'
        ? `<div class="xp-cards">${list.map(it => { const u = figUrl(it); return `<div class="xp-card ${it.sig ? 'sig' : ''}" data-xpgo="${esc(it.id)}" title="Open all the results of this variable">
            <div class="row" style="gap:6px"><h4 style="flex:1">${esc(it.label)}</h4><span class="chip info">${it.kind}</span></div>
            <div class="kv">${keyLines(it).map(l => `<div>${l}</div>`).join('')}</div>
            <div class="row" style="gap:8px;align-items:baseline">${isFinite(it.p) ? `<span class="pbig ${it.sig ? 'sig' : ''}">P ${esc(pTxt(it).replace(/^([<>=≤])?/, m => m ? m + ' ' : '= '))}</span>` : `<span class="pbig ${it.sig ? 'sig' : ''}">${it.sig ? 'Significant' : 'Not significant'}</span>`}<span class="legend-note">${esc(it.test || '')}</span></div>
            ${u ? `<img src="${u}" alt="">` : ''}<div class="legend-note">n = ${it.n ?? '—'} · ${esc(it.normal || '')}</div></div>`; }).join('')}</div>`
        : `<div class="xp-gallery">${list.map(it => { const u = figUrl(it); return u ? `<figure data-xpgo="${esc(it.id)}" title="Open all the results of this variable"><img src="${u}" alt=""><figcaption><b>${esc(it.label)}</b> — ${esc(it.test || 'no test')}, P ${esc(pTxt(it))}${it.sig ? ' ✓' : ''}</figcaption></figure>` : ''; }).join('') || '<p class="legend-note">No figures — tick “Figures” and choose a figure type in Options.</p>'}</div>`);
      $('#xpUndo').disabled = !state.undo || !state.undo.length; $('#xpRedo').disabled = !(state.redo && state.redo.length);
      return;
    }
    const html = list.map(it => {
      const u = figUrl(it), img = u ? `<img class="xp-fig" src="${u}" alt="">` : '';
      const memo = (state.cfg.variables.find(q => q.id === it.id || it.id.startsWith(q.id + '_')) || {}).memo;
      const pinned = (state.cfg.xpPins || []).includes(it.id), coll = state.xpCollapsed.has(it.id);
      const tools = `<span class="xp-tools"><button class="btn ghost small" data-xt="pin" data-id="${esc(it.id)}" title="${pinned ? 'Unpin' : 'Pin to the top'}">${pinned ? '★' : '☆'}</button><button class="btn ghost small" data-xt="coll" data-id="${esc(it.id)}" title="${coll ? 'Expand' : 'Collapse'}">${coll ? '▸' : '▾'}</button><button class="btn ghost small" data-xt="lab" data-id="${esc(it.id)}" title="Sensitivity, subgroups, assumptions, bootstrap, test, outliers, edits">🔬</button><button class="btn ghost small" data-xt="note" data-id="${esc(it.id)}" title="Your note (in the Word file)">✎</button><button class="btn ghost small" data-xt="fig" data-id="${esc(it.id)}" title="Copy the figure">⧉</button><button class="btn ghost small" data-xt="print" data-id="${esc(it.id)}" title="Print this variable">🖨</button><button class="btn ghost small" data-xt="word" data-id="${esc(it.id)}" title="This variable alone in Word">W</button><button class="btn ghost small" data-xt="xlsx" data-id="${esc(it.id)}" title="This variable alone in Excel">X</button></span>`;
      const flag = it.disagree ? `<span class="chip warn" title="The parametric and non-parametric tests disagree on significance">⚠ tests disagree</span>` : '';
      const note = (state.cfg.xpNotes || {})[it.id], noteBox = state.xpNoteOpen.has(it.id) || note ? `<div class="xp-note"><label class="f">Your note (in the Word file)</label><textarea data-xpnote="${esc(it.id)}" placeholder="Your interpretation of this variable">${esc(note || '')}</textarea></div>` : '';
      const lab = state.xpLab.has(it.id) ? `<div class="xp-lab">${labHtml(it)}</div>` : '';
      const headRow = `<div class="row"><h3 style="margin:0">${esc(it.label)}</h3>${memo ? `<span class="chip" title="${esc(memo)}" style="cursor:help">ℹ note</span>` : ''}<span class="chip info">${it.kind}</span>${flag}${tools}<span class="spacer"></span><span class="legend-note">${esc(it.summary)}</span></div>` + noteBox + lab;
      if (coll) return `<div data-xpitem="${esc(it.id)}" class="report-sec xp-item xp-coll" data-xpitem="${esc(it.id)}">${headRow}</div>`;
      // data beside results: every patient's value on the left, the result tables on the right, the figure below (as in the Word file)
      if (view === 'side') return `<div data-xpitem="${esc(it.id)}" class="report-sec xp-item">${headRow}
        <div class="xp-side"><div class="xp-side-data"><h4>Data of each group — every patient's value</h4>${dataHtml(it)}</div><div class="xp-tables">${tablesHtml(it)}</div></div>
        ${img ? `<div class="xp-fig-below">${img}</div>` : ''}${commentHtml(it)}</div>`;
      // data of each group in the left half, the summary table (and the figure) in the right half
      if (view === 'half') return `<div data-xpitem="${esc(it.id)}" class="report-sec xp-item">${headRow}
        <div class="xp-half"><div class="xp-half-data">${dataWordHtml(it)}</div><div><div class="xp-sumcopy">${sumWordHtml(it)}${effWordHtml(it)}</div><div style="text-align:right"><button class="btn ghost small" data-xpcopy="${esc(it.id)}" type="button" title="Copy these tables, to paste into Word">⧉ Copy tables</button></div>${img}${commentHtml(it)}</div></div></div>`;
      if (view === 'stacked') return `<div data-xpitem="${esc(it.id)}" class="report-sec xp-item xp-stacked">${headRow}${img}${commentHtml(it)}<div class="xp-tables">${tablesHtml(it)}</div>
        <details class="xp-data" data-xpdata="${esc(it.id)}"${state.xpOpen.has(it.id) ? ' open' : ''}><summary>Data of each group — every patient's value</summary>${state.xpOpen.has(it.id) ? dataHtml(it) : ''}</details></div>`;
      if (view === 'tables') return `<div data-xpitem="${esc(it.id)}" class="report-sec xp-item">${headRow}<div class="xp-tables" style="margin-top:6px">${tablesHtml(it)}</div></div>`;
      if (view === 'twocol') return `<div data-xpitem="${esc(it.id)}" class="report-sec xp-item">${headRow}${img}${commentHtml(it)}<div class="xp-tables">${tablesHtml(it)}</div></div>`;
      if (view === 'compact') return `<div data-xpitem="${esc(it.id)}" class="report-sec xp-item">${headRow}<div class="xp-tables" style="margin-top:6px">${tablesHtml(it)}</div>
        <details class="xp-data" data-xpdata="${esc(it.id)}"${state.xpOpen.has(it.id) ? ' open' : ''}><summary>Data of each group — every patient's value</summary>${state.xpOpen.has(it.id) ? dataHtml(it) : ''}</details></div>`;
      return `<div data-xpitem="${esc(it.id)}" class="report-sec xp-item">${headRow}
        <div class="xp-body">${img ? `<div class="xp-figcol">${img}${commentHtml(it)}</div>` : ''}<div class="xp-tables">${tablesHtml(it)}</div></div>
        <details class="xp-data" data-xpdata="${esc(it.id)}"${state.xpOpen.has(it.id) ? ' open' : ''}><summary>Data of each group — every patient's value</summary>${state.xpOpen.has(it.id) ? dataHtml(it) : ''}</details></div>`;
    }).join('');
    // dashboard: variables, patients, missing values and significant results of what is shown
    const nMiss = list.reduce((t, it) => t + it.cols.reduce((u, c) => u + state.data.rows.filter(r => Analysis.groupOf(state.cfg, r) !== null && (r[c.col] === null || r[c.col] === undefined || String(r[c.col]).trim() === '')).length, 0), 0);
    const dash = `<div class="xp-dash"><div><b>${list.length}</b><span>variables</span></div><div><b>${state.data.rows.length}</b><span>patients</span></div><div><b>${list.filter(it => it.sig).length}</b><span>significant</span></div><div><b>${nMiss}</b><span>missing values</span></div><div><b>${list.filter(it => it.disagree).length}</b><span>tests disagree</span></div></div>`;
    const cmp = $('#xpVar').value && xpo().cmp && list.length === 2;
    $('#explore').innerHTML = dash + ov + (list.length ? (view === 'twocol' || cmp ? `<div class="xp-twocol">${html}</div>` : html) : empty);
    // matches of the table search highlighted
    const tq = (xpo().tq || '').trim().toLowerCase(); if (tq) document.querySelectorAll('#explore td').forEach(td => { if (td.textContent.toLowerCase().includes(tq)) td.classList.add('xp-hit'); });
    $('#xpUndo').disabled = !state.undo || !state.undo.length; $('#xpRedo').disabled = !(state.redo && state.redo.length);
  }
  $('#explore').addEventListener('click', e => {
    const b = e.target.closest('[data-xt]'), rw = e.target.closest('[data-xprow],[data-xprows]');
    if (rw) { e.preventDefault(); const rs = (rw.dataset.xprows || rw.dataset.xprow).split(',').map(Number); go(1); showRows(rs, 'Outliers from step 10'); return; }
    if (!b) return; const id = b.dataset.id, it = state.explore.items.find(q => q.id === id), t = b.dataset.xt, y = window.scrollY;
    const toggle = (set, k) => { set.has(k) ? set.delete(k) : set.add(k); };
    if (t === 'pin') { const p = state.cfg.xpPins = state.cfg.xpPins || []; const i = p.indexOf(id); i >= 0 ? p.splice(i, 1) : p.push(id); }
    if (t === 'coll') toggle(state.xpCollapsed, id);
    if (t === 'lab') toggle(state.xpLab, id);
    if (t === 'note') toggle(state.xpNoteOpen, id);
    if (t === 'fig') { if (!it || !it.spec) { toast('No figure'); return; } copyImage(Charts.draw(it.spec, chartPalette(state.cfg.options), { ...chartStyle(state.cfg.options), res: 2 }).toDataURL('image/png')); return; }
    if (t === 'print') { const node = document.querySelector(`[data-xpitem="${CSS.escape(id)}"]`); if (node) printPart(it.label, node); return; }
    if (t === 'word' || t === 'xlsx') { state.xpOnly = id; Promise.resolve($(t === 'word' ? '#xpWord' : '#xpXlsx').onclick()).finally(() => { state.xpOnly = null; }); return; }
    drawExplore(); window.scrollTo(0, y);
  });
  $('#explore').addEventListener('input', e => { const n = e.target.dataset.xpnote; if (n === undefined) return; const m = state.cfg.xpNotes = state.cfg.xpNotes || {}; if (e.target.value.trim()) m[n] = e.target.value; else delete m[n]; });
  $('#explore').addEventListener('change', e => {
    const y = window.scrollY;
    if (e.target.dataset.xpsub) { xpo().subBy = e.target.value; drawExplore(); window.scrollTo(0, y); }
    if (e.target.dataset.xptest !== undefined) { const v = state.cfg.variables.find(q => q.id === e.target.dataset.xptest); if (v) { if (e.target.value) v.test = e.target.value; else delete v.test; } renderExplore(); window.scrollTo(0, y); toast('Test changed — the results and the report follow it'); }
  });
  // J / K: next / previous variable
  document.addEventListener('keydown', e => {
    if (!isActive(10) || typing(document.activeElement) || e.ctrlKey || e.metaKey || e.altKey || !/^[jk]$/i.test(e.key)) return;
    const items = [...document.querySelectorAll('#explore [data-xpitem]')]; if (!items.length) return;
    const top = items.findIndex(n => n.getBoundingClientRect().top > 90), cur = top < 0 ? items.length : top;
    const next = e.key.toLowerCase() === 'j' ? items[Math.min(items.length - 1, cur)] : items[Math.max(0, cur - 2)];
    if (next) { next.scrollIntoView({ behavior: 'smooth', block: 'start' }); e.preventDefault(); }
  });
  // saved views of this step
  const XV_KEY = 'pmse-xp-views', xpViews = () => { try { return JSON.parse(localStorage.getItem(XV_KEY) || '{}'); } catch (e) { return {}; } };
  const renderXpViews = () => { $('#xpViewList').innerHTML = '<option value="">— saved views —</option>' + Object.keys(xpViews()).map(n => `<option>${esc(n)}</option>`).join(''); };
  $('#xpViewSave').onclick = () => { const name = (prompt('Name of this view:', 'My view') || '').trim(); if (!name) return; const all = xpViews(); const { q, tq, ...keep } = xpo(); all[name] = keep;
    try { localStorage.setItem(XV_KEY, JSON.stringify(all)); } catch (e) { toast('This browser does not allow saving'); return; } renderXpViews(); $('#xpViewList').value = name; toast(`View “${name}” saved`); };
  $('#xpViewList').onchange = e => { const v = xpViews()[e.target.value]; if (!v) return; state.cfg.explore = { ...xpo(), ...v }; renderExplore(); toast(`View “${e.target.value}” applied`); };
  $('#xpCollAll').onclick = () => { const ids = xpList().map(it => it.id), all = ids.every(id => state.xpCollapsed.has(id)); ids.forEach(id => all ? state.xpCollapsed.delete(id) : state.xpCollapsed.add(id)); drawExplore(); };
  renderXpViews();
  // the data panel is filled when opened, and stays open when the results are redrawn
  $('#explore').addEventListener('toggle', e => {
    const d = e.target.closest && e.target.closest('[data-xpdata]'); if (!d || d !== e.target) return;
    const id = d.dataset.xpdata;
    if (d.open) { state.xpOpen.add(id); if (!d.querySelector('.xp-groups')) d.insertAdjacentHTML('beforeend', dataHtml(state.explore.items.find(it => it.id === id))); }
    else state.xpOpen.delete(id);
  }, true);
  // a changed value goes into the sheet (undoable) and every result is recalculated
  $('#explore').addEventListener('focusout', e => {
    const td = e.target.closest('[data-xr]'); if (!td) return;
    const i = +td.dataset.xr, col = td.dataset.xc, old = state.data.rows[i][col], v = parseCell(td.textContent);
    if ((old ?? null) === v || String(old ?? '') === String(v ?? '')) return;
    pushUndo();
    state.xpHist.push({ row: i, col, old, val: v, time: new Date().toLocaleTimeString() });
    state.data.rows[i][col] = v; state.xpChanged.add(i + '|' + col);
    if (col === state.cfg.groupCol && !state.cfg.noGroups) refreshGroups();
    const y = window.scrollY; renderExplore(); renderGrid(); window.scrollTo(0, y);
    toast(`Value changed: ${col}, row ${i + 1} — results updated`);
  });
  $('#explore').addEventListener('keydown', e => {
    const td = e.target.closest('[data-xr]'); if (!td) return;
    if (e.key === 'Enter') { e.preventDefault(); td.blur(); }
    if (e.key === 'Escape') { td.textContent = state.data.rows[+td.dataset.xr][td.dataset.xc] ?? ''; td.blur(); }
  });
  $('#xpUndo').onclick = $('#xpRedo').onclick = e => { if (!undoRedo(e.currentTarget.id === 'xpRedo')) return; const y = window.scrollY; renderExplore(); renderGrid(); window.scrollTo(0, y); };
  // every table shown, one sheet per variable (tables one under another, each with its title)
  // print a part of the page (or save it as PDF) through a hidden frame with the page's own styles; boxes become plain text
  function printPart(title, node) {
    const clone = node.cloneNode(true);
    clone.querySelectorAll('textarea').forEach(t => { const d = document.createElement('div'); d.className = 'print-text'; d.textContent = t.value; t.replaceWith(d); });
    clone.querySelectorAll('input[type=text],input:not([type])').forEach(i => { const s = document.createElement('span'); s.textContent = i.value; i.replaceWith(s); });
    clone.querySelectorAll('button,input[type=checkbox],.exp-bar,.fr-rep,label.check.exp,select').forEach(el => el.remove());
    const f = document.createElement('iframe'); f.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0'; document.body.appendChild(f);
    const styles = [...document.querySelectorAll('style')].map(s => s.outerHTML).join('');
    f.contentDocument.open();
    f.contentDocument.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title>${styles}<style>body{background:#fff;color:#111;padding:12px}.report-sec{break-inside:auto;border:0;box-shadow:none}.print-text{white-space:pre-wrap;font-family:'${esc(state.cfg.options.font)}',serif;font-size:12pt;line-height:1.5;margin:6px 0}img{max-width:100%;break-inside:avoid}table{break-inside:auto}tr{break-inside:avoid}.xp-half-data,.xp-side-data{max-height:none;overflow:visible}</style></head><body><h1 style="font-family:'${esc(state.cfg.options.font)}',serif">${esc(title)}</h1>${clone.innerHTML}</body></html>`);
    f.contentDocument.close();
    setTimeout(() => { f.contentWindow.focus(); f.contentWindow.print(); setTimeout(() => f.remove(), 2000); }, 400);
  }
  $('#xpPrint').onclick = () => { if (state.explore) printPart('Results by variable', $('#explore')); };
  $('#btnCopyText').onclick = async () => {
    if (!state.result) return; syncEdits();
    const r = state.result, plan = exportPlan(r), o = effOptions(), lab = n => Report.figLabel(n, o.captionStyle), out = [];
    if (r.abstract && plan.rep.abstract) out.push('Results for the abstract', r.abstract, '');
    if (!isOut('methods')) out.push('Statistical analysis', r.methods, '');
    out.push('Results'); if (r.intro) out.push(r.intro); if (r.narrative) out.push(r.narrative);
    if (plan.consortOn && r.consort) out.push(`${lab(plan.consortNum)} ${r.flowCaption}`);
    r.sections.forEach(s => { if (plan.tabNum.get(s)) out.push('', `Table ${plan.tabNum.get(s)}${o.tableCaption === 'period' ? '.' : ':'} ${s.title}`, s.footnote || ''); if (s.comment && !plan.paper && o.commentPlace !== 'none') out.push(s.comment);
      s.figures.forEach(f => { if (plan.figNum.get(f)) out.push(`${lab(plan.figNum.get(f))} ${f.caption}${f.note ? ' ' + f.note : ''}`); }); });
    if (r.summary && !isOut('summary')) out.push('', 'Summary of key findings', r.summary);
    const txt = out.join('\n').replace(/\n{3,}/g, '\n\n').trim();
    try { await navigator.clipboard.writeText(txt); } catch (e) { const t = document.createElement('textarea'); t.value = txt; document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); }
    toast(`Report text copied (${txt.split(/\s+/).length} words)`);
  };
  $('#btnPrint').onclick = () => { if (!state.result) return; syncEdits(); printPart(state.cfg.study.title || 'Statistical report', $('#report')); };
  $('#xpXlsx').onclick = () => {
    const x = state.explore; if (!x) return;
    const list = xpList(); if (!list.length) { toast('No variable to export'); return; }
    const wb = XLSX.utils.book_new(), used = new Set();
    list.forEach(it => {
      const aoa = [[it.label], [it.summary || ''], []];
      xpTables(it).forEach(t => { aoa.push([t.title], t.head, ...t.rows, []); });
      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!cols'] = [{ wch: 26 }, ...Array.from({ length: 14 }, () => ({ wch: 14 }))];
      let name = it.label.replace(/[\\/?*[\]:]/g, ' ').slice(0, 28).trim() || 'Variable', k = 2; while (used.has(name.toLowerCase())) name = `${name.slice(0, 25)} (${k++})`; used.add(name.toLowerCase());
      XLSX.utils.book_append_sheet(wb, ws, name);
    });
    XLSX.writeFile(wb, `${baseName()} - Results by variable.xlsx`);
    toast(`${list.length} variable${list.length > 1 ? 's' : ''} saved to Excel`);
  };
  $('#xpWord').onclick = async () => {
    const x = state.explore; if (!x) return;
    busy(true);
    try {
      const list = xpList(), o = state.cfg.options, figs = $('#xpFigs').checked && xpo().fig !== 'none' && !XP_NOFIG.includes(xpo().view);
      const idc = state.cfg.idCols[0], rows = state.data.rows;
      // optional: each group's patients and values after the results
      const dataTables = it => activeGroups().map(g => {
        const idx = rows.map((r, i) => i).filter(i => Analysis.groupOf(state.cfg, rows[i]) === g);
        return { title: `Data — ${state.cfg.groupLabels[g] || g} (n=${idx.length})`, head: ['#', ...(idc ? [idc] : []), ...it.cols.map(c => c.label)],
          rows: idx.map(i => [String(i + 1), ...(idc ? [String(rows[i][idc] ?? '')] : []), ...it.cols.map(c => String(rows[i][c.col] ?? ''))]) };
      });
      // beside the results: one compact table, the groups' patients side by side (row i = the i-th patient of each group)
      const sideData = it => {
        const gs = activeGroups(), idx = gs.map(g => rows.map((r, i) => i).filter(i => Analysis.groupOf(state.cfg, rows[i]) === g));
        const per = [...(idc ? [idc] : ['#']), ...it.cols.map(c => c.label)], n = Math.max(0, ...idx.map(x => x.length));
        return { title: "Data of each group — every patient's value", head: gs.flatMap(g => per.map((h, j) => j === 0 ? `${state.cfg.groupLabels[g] || g}: ${h}` : h)),
          rows: Array.from({ length: n }, (_, r) => idx.flatMap(ix => ix[r] === undefined ? per.map(() => '') : [idc ? String(rows[ix[r]][idc] ?? '') : String(ix[r] + 1), ...it.cols.map(c => String(rows[ix[r]][c.col] ?? ''))])) };
      };
      const items = list.map(it => {
        // the Word file follows the view: data beside the results, or after them when asked for
        const view = xpo().view, out = { label: it.label, summary: it.summary, test: it.test, p: isFinite(it.p) ? Analysis.fmtP(it.p, o.alpha) : '', sig: it.sig, key: keyLines(it).map(l => l.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")), n: it.n, tables: xpTables(it), data: view === 'side' || view === 'half' ? [sideData(it)] : xpo().wordData ? dataTables(it) : [] };
        if (view === 'half') { const t = summaryTable(it); if (t) out.tables = [t.note ? { ...t, title: `Summary — ${t.note}` } : t, ...(it.effects ? [{ ...it.effects, title: it.effects.note ? `${it.effects.title} — ${it.effects.note}` : it.effects.title }] : [])]; }
        if (!['cards', 'gallery', 'tables', 'compact'].includes(view)) out.comment = xpComment(it);
        out.note = (state.cfg.xpNotes || {})[it.id] || '';
        if (figs && it.spec) { try { const c = Charts.draw(it.spec, chartPalette(o), chartStyle(o)); Object.assign(out, { url: c.toDataURL('image/png'), w: c.width, h: c.height }); } catch (e) { /* no figure */ } }
        return out;
      });
      const blob = await Report.buildResults({ items }, { layout: { twocol: 'standard', tables: 'compact' }[xpo().view] || xpo().view, title: 'Results by variable', subtitle: [state.cfg.study.title, `${state.data.rows.length} patients · ${x.k > 1 ? x.groups.join(', ') : 'one group'}`].filter(Boolean).join(' — '), font: o.font });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = (state.file || 'data').replace(/\.[^.]+$/, '').replace(/ \(example\)$/, '') + ' - Results by variable.docx';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast('Results by variable downloaded');
    } catch (err) { console.error(err); toast('Word export failed: ' + err.message); }
    finally { busy(false); }
  };
  $('#xpVar').onchange = drawExplore;
  $('#explore').addEventListener('click', e => {
    const c = e.target.closest('[data-xpcopy]'); if (!c) return;
    const box = c.closest('.xp-half').querySelector('.xp-sumcopy').cloneNode(true), font = state.cfg.options.font;
    box.querySelectorAll('table').forEach(t => { t.setAttribute('border', '1'); t.setAttribute('cellspacing', '0'); t.setAttribute('cellpadding', '4'); t.style.cssText = `border-collapse:collapse;font-family:'${font}',serif;font-size:10pt`; t.querySelectorAll('th').forEach(th => { th.style.background = '#D9D9D9'; }); });
    box.querySelectorAll('.xw-title').forEach(d => { d.style.cssText = `font-family:'${font}',serif;font-weight:bold;margin:8px 0 4px`; });
    copyHtml(box.innerHTML, box.innerText);
  });
  $('#explore').addEventListener('click', e => { const r = e.target.closest('[data-xpgo]'); if (!r) return; $('#xpVar').value = r.dataset.xpgo; drawExplore(); window.scrollTo(0, $('#p10').offsetTop); });
  $('#xpView').onchange = e => { xpo().view = e.target.value; const y = window.scrollY; drawExplore(); window.scrollTo(0, y); };
  $('#xpFigs').onchange = drawExplore;
  $('#xpCom').onchange = e => { xpo().comments = e.target.checked; renderXpOpts(); const y = window.scrollY; drawExplore(); window.scrollTo(0, y); };
  $('#xpOv').onchange = e => { xpo().overview = e.target.checked; renderXpOpts(); const y = window.scrollY; drawExplore(); window.scrollTo(0, y); };
  $('#xpCopy').onclick = async () => {
    // all tables as tab-separated text, ready to paste into Excel or Word
    const x = state.explore; if (!x) return;
    const list = xpList();
    const txt = list.map(it => [it.label, ...xpTables(it).map(t => [t.title, t.head.join('\t'), ...t.rows.map(r => r.join('\t'))].join('\n'))].join('\n\n')).join('\n\n\n');
    try { await navigator.clipboard.writeText(txt); toast('Tables copied — paste them into Excel or Word'); } catch (e) { toast('Copying is blocked in this browser'); }
  };

  /* ---------- report format: thesis, journal paper, or as configured ---------- */
  const DEFAULT_REPORT = { bilingual: false, cover: false, coverCandidate: '', coverSupervisor: '', coverDept: '', coverDate: '', toc: false, wordStyles: false, headNum: false, lineNumbers: false, twoCol: false, watermark: '', abbrFoot: false, refs: false, checklist: '', wordLimit: '', appCodebook: false, appPlan: false, appFull: false, format: 'custom', chapter: '', sectionHeads: true, maxFigs: 3, abstract: true, style: 'none', newPage: true, nonSig: false, tabStart: 1, figStart: 1 };
  // journal styles: number, P value and caption conventions applied on top of the format (italicP and midDot are applied in Word / to the text)
  const JOURNAL_STYLES = {
    none: { name: 'As in steps 5–7', note: 'Number and caption styles exactly as chosen in steps 5–7.', o: {} },
    vancouver: { name: 'Vancouver / ICMJE (medical journals)', note: 'P = 0.013, P < 0.001; mean ± SD; median (IQR) as 25–30; “Table 1.” and “Figure 1.”',
      o: { pWord: 'P', pHead: 'P value', pLead: 1, meanStyle: 'pm', iqrStyle: 'endash', tableCaption: 'period', captionStyle: 'period' } },
    apa: { name: 'APA 7th edition', note: 'p = .013 (italic p, no leading zero); M (SD); three-line tables; “Table 1” in bold with the title in italics below; “Figure 1” above the figure.',
      o: { pWord: 'p', pHead: 'p', pLead: 0, meanStyle: 'paren', tableStyle: 'apa', tableCaption: 'apa', captionStyle: 'apa', italicP: true } },
    ama: { name: 'AMA 11th edition (JAMA)', note: 'P = .01, P < .001 (italic P, no leading zero); mean (SD); “Table 1.” and “Figure 1.”',
      o: { pWord: 'P', pHead: 'P value', pLead: 0, meanStyle: 'paren', iqrStyle: 'endash', tableCaption: 'period', captionStyle: 'period', italicP: true } },
    nejm: { name: 'NEJM', note: 'P = 0.01 (italic P); mean ±SD; “Table 1.” and “Figure 1.”',
      o: { pWord: 'P', pHead: 'P Value', pLead: 1, meanStyle: 'pm', iqrStyle: 'endash', tableCaption: 'period', captionStyle: 'period', italicP: true } },
    lancet: { name: 'The Lancet', note: 'p=0·013 with the mid-line decimal point (0·5); mean (SD); IQR as 25–30.',
      o: { pWord: 'p', pHead: 'p value', pLead: 1, meanStyle: 'paren', iqrStyle: 'endash', tableCaption: 'colon', captionStyle: 'colon', midDot: true } }
  };
  $('#fmtStyle').innerHTML = Object.entries(JOURNAL_STYLES).map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join('');
  // the format adjusts a copy of the options; the options of steps 4–9 are never changed
  const FORMAT_PRESETS = {
    custom: {},
    thesis: { figPlacement: 'after', paperStyle: false },
    paper: { paperStyle: true, pWord: 'P', secondRow: 'none', commentPlace: 'none', figPlacement: 'end', figPerRow: 2, figWidth: 'medium', tableStyle: 'apa',
      summary: false, commentStyle: 'concise', showStat: false, missingNote: false, chartTitle: false }
  };
  const report = () => (state.cfg.report = { ...DEFAULT_REPORT, ...(state.cfg.report || {}) });
  function effOptions() {
    const o = { ...state.cfg.options, ...FORMAT_PRESETS[report().format], ...(JOURNAL_STYLES[report().style] || JOURNAL_STYLES.none).o };
    if (report().format === 'thesis' && o.commentPlace === 'none') o.commentPlace = 'after';
    return o;
  }
  function renderFormatBar() {
    const r = report();
    document.querySelectorAll('[data-format]').forEach(b => b.classList.toggle('on', b.dataset.format === r.format));
    $('#fmtThesis').style.display = r.format === 'thesis' ? '' : 'none';
    $('#fmtPaper').style.display = r.format === 'paper' ? '' : 'none';
    $('#fmtChapter').value = r.chapter; $('#fmtHeads').checked = r.sectionHeads; $('#fmtMaxFigs').value = String(r.maxFigs); $('#fmtAbstract').checked = r.abstract;
    $('#fmtNewPage').checked = r.newPage; $('#fmtNonSig').checked = r.nonSig;
    $('#fmtTabStart').value = r.tabStart; $('#fmtFigStart').value = r.figStart;
    renderRepSnaps();
    document.querySelectorAll('[data-rx]').forEach(el => { const v = r[el.dataset.rx]; el.type === 'checkbox' ? (el.checked = !!v) : (el.value = v ?? ''); });
    $('#fmtStyle').value = JOURNAL_STYLES[r.style] ? r.style : 'none'; $('#fmtStyleNote').textContent = (JOURNAL_STYLES[r.style] || JOURNAL_STYLES.none).note;
  }
  $('#rxBox').addEventListener('input', e => { const k = e.target.dataset.rx; if (!k) return; report()[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; if (k === 'wordLimit') renderReport(); });
  // references of the methods named in the statistical analysis
  const METHOD_REFS = [
    [/Shapiro/, 'Shapiro SS, Wilk MB. An analysis of variance test for normality (complete samples). Biometrika. 1965;52:591–611.'],
    [/Lilliefors|Kolmogorov/, 'Lilliefors HW. On the Kolmogorov-Smirnov test for normality with mean and variance unknown. J Am Stat Assoc. 1967;62:399–402.'],
    [/Welch/, "Welch BL. The generalization of 'Student's' problem when several different population variances are involved. Biometrika. 1947;34:28–35."],
    [/Mann-Whitney/, 'Mann HB, Whitney DR. On a test of whether one of two random variables is stochastically larger than the other. Ann Math Stat. 1947;18:50–60.'],
    [/Kruskal-Wallis/, 'Kruskal WH, Wallis WA. Use of ranks in one-criterion variance analysis. J Am Stat Assoc. 1952;47:583–621.'],
    [/Tukey/, 'Tukey JW. Comparing individual means in the analysis of variance. Biometrics. 1949;5:99–114.'],
    [/Dunn/, 'Dunn OJ. Multiple comparisons using rank sums. Technometrics. 1964;6:241–252.'],
    [/Games-Howell/, "Games PA, Howell JF. Pairwise multiple comparison procedures with unequal n's and/or variances: a Monte Carlo study. J Educ Stat. 1976;1:113–125."],
    [/Fisher's exact|Fisher exact/, 'Fisher RA. On the interpretation of χ² from contingency tables, and the calculation of P. J R Stat Soc. 1922;85:87–94.'],
    [/Wilcoxon/, 'Wilcoxon F. Individual comparisons by ranking methods. Biometrics Bull. 1945;1:80–83.'],
    [/Friedman/, 'Friedman M. The use of ranks to avoid the assumption of normality implicit in the analysis of variance. J Am Stat Assoc. 1937;32:675–701.'],
    [/Greenhouse-Geisser/, 'Greenhouse SW, Geisser S. On methods in the analysis of profile data. Psychometrika. 1959;24:95–112.'],
    [/Benjamini-Hochberg|false discovery/, 'Benjamini Y, Hochberg Y. Controlling the false discovery rate: a practical and powerful approach to multiple testing. J R Stat Soc B. 1995;57:289–300.'],
    [/Cohen's d|Cohen 1988|effect size/i, 'Cohen J. Statistical power analysis for the behavioral sciences. 2nd ed. Hillsdale, NJ: Lawrence Erlbaum; 1988.'],
    [/DeLong/, 'DeLong ER, DeLong DM, Clarke-Pearson DL. Comparing the areas under two or more correlated receiver operating characteristic curves: a nonparametric approach. Biometrics. 1988;44:837–845.'],
    [/Kaplan-Meier/, 'Kaplan EL, Meier P. Nonparametric estimation from incomplete observations. J Am Stat Assoc. 1958;53:457–481.'],
    [/Cox regression|Cox proportional/, 'Cox DR. Regression models and life-tables. J R Stat Soc B. 1972;34:187–220.'],
    [/Hosmer-Lemeshow/, 'Hosmer DW, Lemeshow S. Goodness of fit tests for the multiple logistic regression model. Commun Stat Theory Methods. 1980;9:1035–1049.'],
    [/McNemar/, 'McNemar Q. Note on the sampling error of the difference between correlated proportions or percentages. Psychometrika. 1947;12:153–157.'],
    [/kappa/i, 'Cohen J. A coefficient of agreement for nominal scales. Educ Psychol Meas. 1960;20:37–46.'],
    [/Bland-Altman/, 'Bland JM, Altman DG. Statistical methods for assessing agreement between two methods of clinical measurement. Lancet. 1986;1:307–310.'],
    [/Cronbach/, 'Cronbach LJ. Coefficient alpha and the internal structure of tests. Psychometrika. 1951;16:297–334.'],
    [/Mantel-Haenszel/, 'Mantel N, Haenszel W. Statistical aspects of the analysis of data from retrospective studies of disease. J Natl Cancer Inst. 1959;22:719–748.'],
    [/TOST|two one-sided/, 'Schuirmann DJ. A comparison of the two one-sided tests procedure and the power approach for assessing the equivalence of average bioavailability. J Pharmacokinet Biopharm. 1987;15:657–680.'],
    [/Passing-Bablok/, 'Passing H, Bablok W. A new biometrical procedure for testing the equality of measurements from two different analytical methods. J Clin Chem Clin Biochem. 1983;21:709–720.'],
    [/[Pp]ropensity/, 'Rosenbaum PR, Rubin DB. The central role of the propensity score in observational studies for causal effects. Biometrika. 1983;70:41–55.'],
    [/reclassification|NRI/, 'Pencina MJ, D’Agostino RB Sr, D’Agostino RB Jr, Vasan RS. Evaluating the added predictive ability of a new marker: from area under the ROC curve to reclassification and beyond. Stat Med. 2008;27:157–172.'],
    [/decision curve/i, 'Vickers AJ, Elkin EB. Decision curve analysis: a novel method for evaluating prediction models. Med Decis Making. 2006;26:565–574.'],
    [/CONSORT/, 'Schulz KF, Altman DG, Moher D; CONSORT Group. CONSORT 2010 statement: updated guidelines for reporting parallel group randomised trials. BMJ. 2010;340:c332.']
  ];
  // appendix tables: codebook, test plan, every test of each variable, and the reporting checklist
  function appendixTables(r, plan) {
    const rp = report(), cfg = state.cfg, out = [];
    if (rp.appCodebook) out.push({ title: 'Codebook of the variables', head: ['Column', 'Label', 'Type', 'Categories / timepoints', 'Unit', 'In the report'],
      rows: cfg.variables.map(v => [v.cols.map(c => c.col).join(', '), v.label, v.kind === 'repeated' ? 'repeated' : v.type, v.kind === 'repeated' ? v.cols.map(c => c.label || c.tp).join(', ') : (v.levels || []).join(', '), v.unit || '', v.include ? 'yes' : 'no']) });
    if (rp.appPlan || rp.appFull) { let x = null; try { x = Analysis.explore(state.data, { ...cfg, options: effOptions() }, {}); } catch (e) { }
      if (x && rp.appPlan) out.push({ title: 'Test plan', head: ['Variable', 'Type', 'Distribution', 'Test', 'P value'], rows: x.items.map(it => [it.label, it.kind, it.normal || '—', it.test || '—', isFinite(it.p) ? Analysis.fmtP(it.p, cfg.options.alpha) : '—']) });
      if (x && rp.appFull) x.items.forEach(it => it.tables.filter(t => t.cat === 'tests').forEach(t => out.push({ title: `${it.label}: ${t.title}`, head: t.head, rows: t.rows }))); }
    if (rp.checklist) {
      const tabs = r.sections.filter(s => plan.tabNum.get(s)), tn = s => `Table ${plan.tabNum.get(s)}`, first = tabs[0], rest = tabs.slice(1), where = list => list.length ? list.map(tn).join(', ') : '—';
      const flow = plan.consortOn && r.consort ? `Figure ${plan.consortNum}` : '—', adv = tabs.filter(s => !['single', 'repeated'].includes(s.kind));
      const items = rp.checklist === 'consort'
        ? [['12a', 'Statistical methods used to compare groups for primary and secondary outcomes', 'Statistical analysis'], ['12b', 'Methods for additional analyses (subgroup, adjusted)', adv.length ? where(adv) : 'Statistical analysis'],
          ['13a', 'Participants randomly assigned, receiving treatment and analysed, per group', flow], ['13b', 'Losses and exclusions after randomisation, with reasons', flow],
          ['15', 'Baseline demographic and clinical characteristics of each group', first ? tn(first) : '—'], ['16', 'Number of participants analysed in each group', first ? tn(first) : flow],
          ['17a', 'Results for each outcome per group, effect size and its precision (95% CI)', where(rest)], ['17b', 'Absolute and relative effect sizes for binary outcomes', effOptions().effect ? 'Effect column of the tables (RR / OR, 95% CI)' : '—'], ['18', 'Results of other analyses', where(adv)]]
        : [['12', 'Statistical methods, including those to control for confounding', 'Statistical analysis'], ['13', 'Numbers of individuals at each stage of the study (flow diagram)', flow],
          ['14', 'Characteristics of study participants', first ? tn(first) : '—'], ['15', 'Numbers of outcome events or summary measures', where(rest)],
          ['16', 'Unadjusted and adjusted estimates with their precision (95% CI)', where([...rest, ...adv])], ['17', 'Other analyses (subgroups, interactions, sensitivity)', where(adv)]];
      out.push({ title: `${rp.checklist === 'consort' ? 'CONSORT 2010' : 'STROBE'} checklist (results items)`, head: ['Item', 'Recommendation', 'Reported in'], rows: items, note: 'Page numbers can be added after the final layout in Word.' });
    }
    return out;
  }
  // the report text as Markdown, LaTeX, or a stand-alone HTML page
  const tableRowsText = rows => { const grid = [], occ = []; rows.forEach((r, ri) => { let c = 0; const line = []; r.forEach(cell => { while (occ[ri] && occ[ri][c]) { line[c] = ''; c++; } line[c] = (cell.t || []).join(' '); for (let s = 1; s < (cell.span || 1); s++) line[c + s] = '';
      if (cell.rs > 1) for (let k = 1; k < cell.rs; k++) { occ[ri + k] = occ[ri + k] || []; occ[ri + k][c] = true; } c += cell.span || 1; }); grid.push(line); }); return grid; };
  const headText = h => h.flatMap(c => typeof c === 'string' ? [c] : [c.t || '', ...Array.from({ length: (c.span || 1) - 1 }, () => '')]);
  function exportText(kind) {
    syncEdits(); const r = state.result, plan = exportPlan(r), o = effOptions(), md = kind === 'md', out = [];
    const tex = t => String(t ?? '').replace(/\\/g, '\\textbackslash{}').replace(/([&%$#_{}])/g, '\\$1').replace(/±/g, '$\\pm$').replace(/≤/g, '$\\le$').replace(/≥/g, '$\\ge$').replace(/χ²/g, '$\\chi^2$').replace(/η²/g, '$\\eta^2$').replace(/ε²/g, '$\\varepsilon^2$').replace(/²/g, '$^2$')
      .replace(/—/g, '---').replace(/–/g, '--').replace(/×/g, '$\\times$').replace(/[‘’]/g, "'").replace(/“/g, '``').replace(/”/g, "''").replace(/α/g, '$\\alpha$').replace(/β/g, '$\\beta$').replace(/δ/g, '$\\delta$').replace(/Δ/g, '$\\Delta$')
      .replace(/κ/g, '$\\kappa$').replace(/τ/g, '$\\tau$').replace(/η/g, '$\\eta$').replace(/ε/g, '$\\varepsilon$').replace(/μ/g, '$\\mu$').replace(/≠/g, '$\\neq$').replace(/→/g, '$\\rightarrow$').replace(/[^\x00-\x7F]/g, '?');
    const H = (lvl, t) => md ? `${'#'.repeat(lvl)} ${t}` : `\\${lvl === 1 ? 'section' : 'subsection'}*{${tex(t)}}`, P = t => md ? t : tex(t);
    if (!md) out.push(['\\documentclass{article}', '\\usepackage[utf8]{inputenc}', '\\usepackage{booktabs}', '\\usepackage{graphicx}', `\\title{${tex(state.cfg.study.title || 'Statistical report')}}`, '\\begin{document}', '\\maketitle'].join('\n'));
    else out.push(`# ${state.cfg.study.title || 'Statistical report'}`);
    if (!isOut('methods') && r.methods) out.push(H(2, 'Statistical analysis'), P(r.methods));
    out.push(H(2, 'Results')); if (r.intro) out.push(P(r.intro)); if (r.narrative && plan.paper) out.push(P(r.narrative));
    r.sections.forEach(s => { if (!plan.tabNum.get(s)) return; const head = headText(s.head), grid = tableRowsText(s.rows), cap = `Table ${plan.tabNum.get(s)}: ${s.title}`;
      if (md) out.push(`**${cap}**`, '', `| ${head.join(' | ')} |`, `| ${head.map(() => '---').join(' | ')} |`, ...grid.map(l => `| ${head.map((_, j) => (l[j] ?? '').replace(/\|/g, '\\|')).join(' | ')} |`), '', `*${s.footnote || ''}*`);
      else out.push(['\\begin{table}[ht]\\centering\\small', `\\caption{${tex(s.title)}}`, `\\begin{tabular}{${head.map((_, j) => j ? 'c' : 'l').join('')}}\\toprule`, head.map(tex).join(' & ') + ' \\\\ \\midrule',
        ...grid.map(l => head.map((_, j) => tex(l[j] ?? '')).join(' & ') + ' \\\\'), '\\bottomrule\\end{tabular}', `\\par\\footnotesize ${tex(s.footnote || '')}`, '\\end{table}'].join('\n'));
      if (s.comment && !plan.paper && o.commentPlace !== 'none') out.push(P(s.comment));
      s.figures.forEach(f => { if (plan.figNum.get(f)) out.push(md ? `*Figure ${plan.figNum.get(f)}: ${f.caption}*` : `% Figure ${plan.figNum.get(f)}: ${tex(f.caption)} - export the figures from step 11 and add \\includegraphics here`); }); });
    if (r.summary && !isOut('summary')) out.push(H(2, 'Summary of key findings'), P(r.summary));
    if (!md) out.push('\\end{document}');
    const txt = out.join('\n\n'), name = `${baseName()} - Report.${md ? 'md' : 'tex'}`;
    saveUrl(URL.createObjectURL(new Blob([txt], { type: 'text/plain;charset=utf-8' })), name);
  }
  $('#btnMd').onclick = () => { if (state.result) exportText('md'); };
  $('#btnTex').onclick = () => { if (state.result) exportText('tex'); };
  $('#btnHtml').onclick = () => {
    if (!state.result) return; syncEdits(); const clone = $('#report').cloneNode(true);
    clone.querySelectorAll('textarea').forEach(t => { const d = document.createElement('div'); d.className = 'print-text'; d.textContent = t.value; t.replaceWith(d); });
    clone.querySelectorAll('input[type=text],input:not([type])').forEach(i => { const s = document.createElement('span'); s.textContent = i.value; i.replaceWith(s); });
    clone.querySelectorAll('button,input[type=checkbox],.exp-bar,.fr-rep,label.check.exp,select,#comCheckOut').forEach(el => el.remove());
    const styles = [...document.querySelectorAll('style')].map(s => s.outerHTML).join('');
    const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(state.cfg.study.title || 'Statistical report')}</title>${styles}<style>body{background:#fff;color:#111;max-width:1000px;margin:24px auto;padding:0 16px}.print-text{white-space:pre-wrap;line-height:1.6}</style></head><body><h1>${esc(state.cfg.study.title || 'Statistical report')}</h1>${clone.innerHTML}</body></html>`;
    saveUrl(URL.createObjectURL(new Blob([html], { type: 'text/html' })), `${baseName()} - Report.html`);
  };
  // snapshots of the report text, and what changed since one
  const repSnapText = r => ({ methods: r.methods || '', intro: r.intro || '', narrative: r.narrative || '', summary: r.summary || '', sections: r.sections.map(s => ({ title: s.title, comment: s.comment || '', footnote: s.footnote || '' })) });
  const renderRepSnaps = () => { const ss = (state.cfg && state.cfg.reportSnaps) || []; $('#repSnapList').innerHTML = ss.length ? ss.map((s, i) => `<option value="${i}">${esc(s.name)}</option>`).join('') : '<option value="">— no snapshot —</option>'; };
  $('#repSnapSave').onclick = () => { if (!state.result) return; syncEdits(); const ss = state.cfg.reportSnaps = state.cfg.reportSnaps || [];
    ss.push({ name: `${new Date().toLocaleString()}`, text: repSnapText(state.result) }); if (ss.length > 10) ss.shift(); renderRepSnaps(); $('#repSnapList').value = String(ss.length - 1); toast('Snapshot saved (kept in the saved project)'); };
  $('#repSnapCmp').onclick = () => { const s = (state.cfg.reportSnaps || [])[+$('#repSnapList').value]; if (!s || !state.result) return; syncEdits(); const now = repSnapText(state.result), old = s.text, rows = [];
    ['methods', 'intro', 'narrative', 'summary'].forEach(k => { if (old[k] !== now[k]) rows.push([k === 'methods' ? 'Statistical analysis' : k === 'intro' ? 'Flowchart text' : k === 'narrative' ? 'Results text' : 'Summary', old[k], now[k]]); });
    now.sections.forEach(ns => { const os = old.sections.find(x => x.title === ns.title); if (!os) rows.push([ns.title, '(new table)', ns.comment]); else if (os.comment !== ns.comment) rows.push([`${ns.title} — comment`, os.comment, ns.comment]); else if (os.footnote !== ns.footnote) rows.push([`${ns.title} — footnote`, os.footnote, ns.footnote]); });
    old.sections.forEach(os => { if (!now.sections.find(x => x.title === os.title)) rows.push([os.title, os.comment, '(removed)']); });
    $('#repSnapOut').innerHTML = rows.length ? `<table class="t xp" style="margin-top:8px"><thead><tr><th>Part</th><th>Snapshot (${esc(s.name)})</th><th>Now</th></tr></thead><tbody>${rows.map(r => `<tr><td class="b">${esc(r[0])}</td><td>${esc(r[1])}</td><td>${esc(r[2])}</td></tr>`).join('')}</tbody></table>` : '<p class="legend-note">No change since this snapshot.</p>'; };
  renderRepSnaps();
  $('#fmtBar').addEventListener('click', e => {
    const b = e.target.closest('[data-format]'); if (!b) return;
    report().format = b.dataset.format; renderFormatBar(); runAnalysis();
  });
  $('#fmtBar').addEventListener('change', e => {
    const r = report();
    if (e.target.id === 'fmtChapter') r.chapter = e.target.value.trim();
    else if (e.target.id === 'fmtHeads') r.sectionHeads = e.target.checked;
    else if (e.target.id === 'fmtMaxFigs') r.maxFigs = +e.target.value;
    else if (e.target.id === 'fmtAbstract') r.abstract = e.target.checked;
    else if (e.target.id === 'fmtNewPage') { r.newPage = e.target.checked; return; }
    else if (e.target.id === 'fmtNonSig') r.nonSig = e.target.checked;
    else if (e.target.id === 'fmtTabStart' || e.target.id === 'fmtFigStart') r[e.target.id === 'fmtTabStart' ? 'tabStart' : 'figStart'] = Math.max(1, Math.round(+e.target.value) || 1);
    // the journal style changes number formats: run the analysis again
    else if (e.target.id === 'fmtStyle') { r.style = e.target.value; syncEdits(); runAnalysis(); return; }
    else return;
    syncEdits(); state.result.narrativeEdited = false; renderReport();
  });

  function runAnalysis() {
    busy(true);
    renderFormatBar();
    setTimeout(() => {
      try {
        syncAssessed(ensureConsort());
        const cfg = { ...state.cfg, options: effOptions() };
        const res = Analysis.run(state.data, cfg);
        postRepeated(res, state.cfg);
        if (cfg.options.rmImpute === 'locf') res.methods += ' Missing follow-up values were replaced by the last observation carried forward.';
        // subgroup analysis: every table again within each category of the chosen column
        const sg = state.cfg.subgroup, sgCols = subCols(sg).filter(c => state.data.headers.includes(c));
        if (sgCols.length) {
          const subs = [], done = [];
          sgCols.forEach(col => {
            const isG = col === state.cfg.groupCol, lab = Analysis.columnLabel(state.cfg, col), lvName = l => isG ? (state.cfg.groupLabels[l] || l) : valueLabel(col, l);
            const lv = isG ? activeGroups() : Analysis.levelsOf(state.cfg, Analysis.filterRows(state.cfg, state.data.rows), col);
            lv.forEach(l => {
              let r2; try { r2 = Analysis.run(state.data, { ...cfg, rowFilter: [...(cfg.rowFilter || []), { col, op: 'eq', val: l, on: true }], advanced: [], ...(isG ? { groupInclude: Object.fromEntries(cfg.groupOrder.map(g => [g, g === l])), timeline: null } : {}) }); } catch (e) { return; }
              const name = `${lab}: ${lvName(l)}`;
              r2.sections.forEach(s => { s.title = `${s.title} — ${name}`; s.key = s.title; s.figures.forEach(f => { f.caption = `${f.caption} (${name})`; }); subs.push(s); });
            });
            done.push(`${lowerFirstApp(lab)} (${lv.map(lvName).join(', ')})`);
          });
          res.sections = [...(sg.overall !== false ? res.sections : []), ...subs];
          if (done.length) res.methods += ` Subgroup analyses were performed within each category of ${done.length > 1 ? done.slice(0, -1).join(', ') + ' and ' + done[done.length - 1] : done[0]}.`;
        }
        // a journal style's P wording also goes into the table footnotes
        if (report().style !== 'none' && cfg.options.pWord !== 'P value') res.sections.forEach(s => { s.footnote = s.footnote.replace(/\bP value\b/g, cfg.options.pWord); });
        // P values without the leading zero: also the significance level in the footnotes
        if (+cfg.options.pLead === 0) res.sections.forEach(s => { s.footnote = s.footnote.replace(/(P value|\bP|\bp) ([≤<]) 0\./g, '$1 $2 .'); });
        // the extra footnote line of step 5 closes every table footnote
        const fx = String(cfg.options.footExtra || '').trim();
        if (fx) res.sections.forEach(s => { s.footnote = s.footnote ? `${s.footnote.replace(/\s*\.?\s*$/, '.')} ${fx}` : fx; });
        if (cfg.options.midDot) midDots(res);
        res.sections.forEach(s => { s.key = s.title; s.figures.forEach(f => {
          f.key = f.caption; figVarProps(f); renderFigure(f, cfg.options);
          f.note = cfg.options.figNotes ? figNote(f.spec, cfg.options) : '';
          if (cfg.options.midDot) f.note = dot(f.note);
        }); });
        const pal = chartPalette(cfg.options);
        const gl = res.groups;
        if (cfg.consort.enabled) {
          const cv = Charts.consort(cfg.consort, gl, pal);
          res.consort = { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
        }
        state.result = res;
        if (state.pendingEdits) { applyEdits(res, state.pendingEdits); state.pendingEdits = null; }
        renderReport();
      } catch (err) { console.error(err); $('#report').innerHTML = `<p style="color:var(--bad)"><b>Analysis failed:</b> ${esc(err.message)}</p>`; }
      finally { busy(false); }
    }, 30);
  }

  // The Lancet's mid-line decimal point (0·5) in every text of the report
  const dot = t => typeof t === 'string' ? t.replace(/(\d)\.(\d)/g, '$1·$2') : t;
  function midDots(res) {
    ['methods', 'intro', 'summary', 'flowCaption'].forEach(k => { res[k] = dot(res[k]); });
    res.sections.forEach(s => {
      ['title', 'comment', 'footnote', 'brief'].forEach(k => { s[k] = dot(s[k]); });
      s.head = s.head.map(h => typeof h === 'string' ? dot(h) : h && { ...h, t: dot(h.t) });
      s.rows.forEach(r => r.forEach(c => { c.t = (c.t || []).map(dot); }));
      s.figures.forEach(f => { f.caption = dot(f.caption); });
    });
  }
  // the caption's explanation of what the chart shows: bars, error bars, boxes, markers and significance stars
  function figNote(spec, o) {
    const P = o.pWord === 'p' ? 'p' : 'P', out = [], series = spec.series || [];
    const err = { sem: 'the standard error of the mean (SEM)', ci: 'the 95% CI of the mean' }[spec.errKind || o.errorBar] || '±1 standard deviation (SD)';
    if ((spec.type === 'bar' || spec.type === 'line') && !spec.percent && !spec.integer) {
      const what = spec.type === 'bar' ? 'Bars' : 'Points';
      if (series.some(s => s.err && s.err.some(v => v !== null && v !== undefined))) out.push(`${what} show the mean; error bars show ${err}${o.errBars === 'up' ? ' (drawn upward only)' : ''}.`);
      else if (series.some(s => s.lo)) out.push(`${what} show the median; error bars show the interquartile range (IQR)${o.errBars === 'up' ? ', drawn upward only (to the 75th percentile)' : ''}.`);
    }
    if (spec.individual) out.push('Thin lines show individual patients.');
    if (isFinite(spec.refLine)) out.push(`The dashed red line marks ${spec.refLabel ? `${spec.refLabel} (${spec.refLine})` : `the value ${spec.refLine}`}.`);
    if (spec.type === 'box') {
      out.push('Boxes show the median and interquartile range (IQR); whiskers extend to the most extreme values within 1.5 × IQR, and points beyond them are outliers.');
      if (o.boxMean) out.push('◆ marks the mean.');
      if (spec.points) out.push('Each dot is one patient.');
    }
    if (spec.type === 'violin') out.push(`Violins show the distribution of the values (kernel density); the inner bar shows the interquartile range (IQR), the white dot the median and the line the range within 1.5 × IQR.${o.boxMean ? ' ◆ marks the mean.' : ''}${spec.points ? ' Each dot is one patient.' : ''}`);
    if (spec.type === 'dot') out.push(`Each dot is one patient; the line and whiskers show the ${spec.median ? 'median and IQR' : 'mean ± SD'}.`);
    if (spec.type === 'roc') out.push([spec.diagonal === false ? '' : 'The dashed diagonal is the line of no discrimination (AUC = 0.5).', spec.fill && series.length === 1 ? 'The shaded region is the area under the curve.' : '',
      series.some(s => s.cut) ? 'Circles mark the chosen cut-off values.' : ''].filter(Boolean).join(' '));
    if (spec.type === 'km') out.push(`Vertical ticks mark censored patients.${spec.band ? ' Shaded bands show the 95% CI.' : ''}`);
    if (spec.type === 'forest') out.push(`Squares show the estimates and lines their 95% CI; the dashed line marks no effect (${spec.log ? '1' : '0'}). Significant estimates are coloured.`);
    if (spec.type === 'scatter' && spec.zeroLine) out.push('Each point is one patient; the dashed line marks zero.');
    if (spec.type === 'ba') out.push('The middle line shows the mean difference (bias) and the dashed lines the 95% limits of agreement (mean ± 1.96 SD).');
    if (['bar', 'line', 'box', 'dot', 'violin'].includes(spec.type)) {
      const ps = [...(spec.sig || []).map(q => q.p), ...(spec.sigCat || [])].filter(p => p <= spec.alpha);
      const what = spec.sig ? 'brackets: comparison between the groups' : spec.sigWhat ? `compared with ${spec.sigWhat}` : 'difference between the groups at that time';
      if (ps.length && o.sigLabel === 'p') out.push(`Exact ${P} values are shown for significant differences (${what}).`);
      else if (ps.length) {
        const lv = [`*${P} ≤ ${+o.pLead === 0 ? String(spec.alpha).replace(/^0\./, '.') : spec.alpha}`];
        if (ps.some(p => p <= 0.01)) lv.push(`**${P} ≤ 0.01`);
        if (ps.some(p => p <= 0.001)) lv.push(`***${P} ≤ 0.001`);
        out.push(`${lv.join(', ')} (${what}).`);
      }
    }
    return Analysis.relabelCI(out.filter(Boolean).join(' '), o.confLevel);
  }
  // per-variable figure settings of step 7: y-axis range and a reference line
  function figVarProps(f) {
    const v = f.vid && state.cfg.variables.find(x => x.id === f.vid); if (!v) return;
    const n = x => { const t = parseFloat(String(x ?? '').replace(',', '.')); return isFinite(t) ? t : undefined; };
    const yMin = n(v.ymin), yMax = n(v.ymax), ref = n(v.ref);
    if (yMin !== undefined) f.spec.yMin = yMin; if (yMax !== undefined) f.spec.yMax = yMax;
    if (ref !== undefined) { f.spec.refLine = ref; if (v.refLabel) f.spec.refLabel = v.refLabel; }
  }
  // draws a figure's image; the caption is printed on the chart when "chart titles" is on
  function renderFigure(f, o) {
    const c = Charts.draw({ ...f.spec, title: o.chartTitle ? f.caption : null }, chartPalette(o), chartStyle(o));
    f.url = c.toDataURL('image/png'); f.w = c.width; f.h = c.height;
  }

  // export selection: keys of items left out of the Word file (kept across re-runs and in saved setups);
  // a figure keeps its original caption as key, so editing the caption keeps the choice
  const exKey = { methods: () => 'methods', consort: () => 'consort', table: s => 't:' + (s.key || s.title), figure: f => 'f:' + (f.key || f.caption) };
  const isOut = key => !!state.cfg.exportExclude[key];
  const exBox = (key, label) => `<label class="check exp"><input type="checkbox" data-export="${esc(key)}" ${isOut(key) ? '' : 'checked'}><span>${label}</span></label>`;
  // pull the editable text back into the result before re-rendering or exporting
  function syncEdits() {
    const r = state.result; if (!r || !$('#edMethods')) return;
    r.methods = $('#edMethods').value;
    if ($('#edIntro')) r.intro = $('#edIntro').value;
    document.querySelectorAll('[data-comment]').forEach(t => { r.sections[+t.dataset.comment].comment = t.value; });
    document.querySelectorAll('[data-fcap]').forEach(t => { const [si, fi] = t.dataset.fcap.split(':').map(Number); r.sections[si].figures[fi].caption = t.value; });
    document.querySelectorAll('[data-fnote]').forEach(t => { const [si, fi] = t.dataset.fnote.split(':').map(Number); r.sections[si].figures[fi].note = t.value; });
    document.querySelectorAll('[data-ttl]').forEach(t => { r.sections[+t.dataset.ttl].title = t.value; });
    if ($('#edSummary')) r.summary = $('#edSummary').value;
    if ($('#edNarrative') && $('#edNarrative').value !== r.narrative) { r.narrative = $('#edNarrative').value; r.narrativeEdited = true; }
    if ($('#edAbstract') && $('#edAbstract').value !== r.abstract) { r.abstract = $('#edAbstract').value; r.abstractEdited = true; }
  }
  // what goes into the Word file and how it is numbered — shared by the preview and the export
  function exportPlan(r) {
    const o = effOptions(), rep = report(), paper = rep.format === 'paper';
    const pre = rep.format === 'thesis' && rep.chapter ? rep.chapter + '.' : '';
    let figs = r.sections.flatMap(s => s.figures).filter(f => !isOut(exKey.figure(f)));
    if (paper) {
      // the paper keeps a few figures: repeated outcomes before single variables
      const kindOf = f => r.sections.find(s => s.figures.includes(f)).kind;
      // only figures of significant results; the limit is a maximum
      const ranked = figs.filter(f => rep.nonSig || f.sig !== false).map((f, i) => ({ f, i, k: kindOf(f) === 'repeated' ? 0 : 1 })).sort((a, b) => a.k - b.k || a.i - b.i);
      const keep = new Set(ranked.slice(0, rep.maxFigs).map(x => x.f));
      figs = figs.filter(f => keep.has(f));
    }
    const kept = new Set(figs);
    const filtered = r.sections.map(s => ({ ...s, figures: s.figures.filter(f => kept.has(f)) }));
    const order = Report.arrangeFigures(filtered, o.figPlacement) || filtered.flatMap(s => s.figures);
    const consortOn = !!r.consort && !isOut('consort');
    const f0 = +rep.figStart || 1, figNum = new Map(); let n = consortOn ? f0 + 1 : f0;
    order.forEach(f => figNum.set(f, pre + n++));
    const tabNum = new Map(); let t = +rep.tabStart || 1;
    r.sections.forEach(s => { if (!isOut(exKey.table(s))) tabNum.set(s, pre + t++); });
    return { o, rep, paper, pre, kept, order, figNum, tabNum, consortNum: pre + f0, consortOn };
  }
  // the paper's Results narrative: significant findings per table, each citing its table and figure
  function paperNarrative(r, plan) {
    const out = [];
    r.sections.forEach((s, i) => {
      if (!plan.tabNum.has(s)) return;
      const figs = s.figures.filter(f => plan.figNum.has(f)).map(f => `Figure ${plan.figNum.get(f)}`);
      const ref = [`Table ${plan.tabNum.get(s)}`, ...figs].join('; ');
      const what = s.title.replace(/ of the studied groups$/, '').replace(/^./, c => c.toLowerCase());
      const b = briefOf(s);
      if (i === 0 && s.kind === 'single' && !b.sig && r.k > 1) out.push(`Baseline characteristics were comparable between the groups (${ref}).`);
      else if (b.text) out.push(b.text.replace(/\.$/, ` (${ref}).`));
      else out.push(`No significant differences were found in ${what} (${ref}).`);
    });
    return out.join(' ');
  }
  // one-sentence summary of a table: the analysis' own summary for main tables, else the key significant sentence
  function briefOf(s) {
    if (s.brief) return { text: s.brief, sig: !!s.briefSig };
    const sent = Analysis.significantSentences(s.comment);
    const key = sent.filter(x => /independent predictor|could significantly predict|survival was significantly|agreement|internal consistency|sensitivity/i.test(x));
    return { text: (key.length ? key.slice(0, 1) : sent.slice(0, 2)).join(' '), sig: sent.length > 0 };
  }
  // abstract: summaries of the outcome tables with a significant result (baseline left out), at most three
  const abstractResults = r => r.sections.slice(1).map(briefOf).filter(b => b.sig && b.text).slice(0, 3).map(b => b.text).join(' ')
    || 'No statistically significant differences were found.';
  const words = t => (t || '').split(/\s+/).filter(Boolean).length;

  function renderReport() {
    const r = state.result, plan = exportPlan(r), o = plan.o, lab = n => Report.figLabel(n, o.captionStyle);
    if (plan.paper && !r.narrativeEdited) r.narrative = paperNarrative(r, plan);
    if (plan.paper && plan.rep.abstract && !r.abstractEdited) r.abstract = Analysis.trimWords(abstractResults(r), +state.cfg.options.absMaxWords || 0);
    let html = '';
    html += `<div class="row exp-bar"><b>In the Word file:</b> <span class="legend-note">untick any section, table or figure to leave it out — numbering follows what is kept.</span><span class="spacer"></span>
      <button class="btn ghost small" data-exall="1" type="button">Include all</button><button class="btn ghost small" data-exall="0" type="button">Exclude all</button>
      <button class="btn ghost small" id="comCheck" type="button" title="Numbers in the comments that are not in their table, causal wording and comment lengths">✓ Check comments</button></div><div id="comCheckOut"></div>`;
    // find & replace in every text of the report: methods, comments, titles, captions and the results text
    html += `<details class="report-sec fr-rep"><summary><b>🔍 Find &amp; replace in the report text</b> — methods, comments, table titles, captions</summary><div class="row" style="gap:8px;align-items:flex-end;margin-top:8px">
      <div><label class="f">Find</label><input type="text" id="frRepFind" style="width:200px" placeholder="e.g. insignificantly"></div><div><label class="f">Replace with</label><input type="text" id="frRepWith" style="width:200px" placeholder="e.g. not significantly"></div>
      <label class="check" style="margin:0 0 8px"><input type="checkbox" id="frRepWhole" checked><span>Whole words</span></label><label class="check" style="margin:0 0 8px"><input type="checkbox" id="frRepCase"><span>Match case</span></label>
      <button class="btn primary small" id="frRepGo" type="button" style="margin-bottom:6px">Replace all</button></div></details>`;
    const off = key => isOut(key) ? ' off' : '';
    if (plan.paper && plan.rep.abstract) html += `<div class="report-sec"><h3>Results for the abstract</h3><textarea id="edAbstract">${esc(r.abstract)}</textarea><div class="legend-note">${words(r.abstract)} words</div></div>`;
    html += `<div class="report-sec${off('methods')}"><div class="row"><h3>Statistical analysis</h3><span class="spacer"></span>${exBox('methods', 'Include')}</div><textarea id="edMethods">${esc(r.methods)}</textarea>${plan.paper ? `<div class="legend-note">${words(r.methods)} words</div>` : ''}</div>`;
    html += `<div class="report-sec"><h3>Results</h3>`;
    if (r.consort) html += `<div class="${off('consort')}"><div class="row"><span class="spacer"></span>${exBox('consort', 'Include flowchart and its text')}</div><textarea id="edIntro">${esc(r.intro)}</textarea><img src="${r.consort.url}" class="consort-prev" style="margin-top:12px"><div class="cap">${plan.consortOn ? lab(plan.consortNum) : 'Not exported:'} ${esc(r.flowCaption)}</div></div>`;
    const wl = +report().wordLimit; if (wl) { const n = words(r.narrative || '') + words(r.intro || '') + (plan.paper ? 0 : r.sections.reduce((t, s) => t + words(s.comment || ''), 0));
      html += `<div class="chip ${n > wl ? 'warn' : 'ok'}" style="display:block;margin:6px 0">${n > wl ? '⚠' : '✓'} Results: ${n} words (limit ${wl})${n > wl ? ` — ${n - wl} over` : ''}</div>`; }
    if (plan.paper) html += `<label class="f" style="margin-top:12px">Results text (written from the significant results, citing tables and figures — edit freely)</label><textarea id="edNarrative" style="min-height:180px">${esc(r.narrative)}</textarea>
      <div class="legend-note">${words(r.narrative) + words(r.intro)} words in Results · ${words(r.narrative) + words(r.intro) + words(r.methods)} words with the statistical analysis</div>`;
    html += `</div>`;
    const atEnd = o.figPlacement === 'end' || o.figPlacement === 'endType';
    const figHtml = f => {
      const si = r.sections.findIndex(s => s.figures.includes(f)), fi = r.sections[si].figures.indexOf(f), fk = exKey.figure(f);
      const label = isOut(fk) ? 'Not exported:' : plan.kept.has(f) ? lab(plan.figNum.get(f)) : (f.sig === false && !plan.rep.nonSig ? 'Not in the paper (not significant):' : `Not in the paper (limit ${plan.rep.maxFigs}):`);
      const note = f.note !== undefined && (f.note || o.figNotes) ? `<input type="text" class="fcap fnote" data-fnote="${si}:${fi}" value="${esc(f.note)}" title="Explanation of the symbols (printed after the caption)" placeholder="Explanation of the symbols">` : '';
      return `<figure class="${plan.kept.has(f) ? '' : 'off'}"><img src="${f.url}" alt=""><figcaption>${label} <input type="text" class="fcap" data-fcap="${si}:${fi}" value="${esc(f.caption)}" title="Edit the caption">${note} <button class="btn ghost small" data-copyfig="${si}:${fi}" type="button" title="Copy the figure, to paste into Word or PowerPoint">⧉ Copy</button></figcaption>${exBox(fk, 'Figure')}</figure>`;
    };
    r.sections.forEach((s, i) => {
      const tk = exKey.table(s), tOut = isOut(tk), place = s.place && o.commentPlace !== 'none' ? s.place : o.commentPlace || 'after';
      const comment = plan.paper ? '' : `<label class="f">Comment (editable — ${place === 'none' ? 'not exported: comments are switched off in step 6' : `placed ${place} the table`})</label><textarea data-comment="${i}" spellcheck="true" lang="en">${esc(s.comment)}</textarea>
        <div class="row" style="gap:6px"><button class="btn ghost small" data-copycom="${i}" type="button">⧉ Copy comment</button><button class="btn ghost small" data-explain="${i}" type="button" title="What the statistical terms of this comment mean">ℹ Explain</button><span class="legend-note">${words(s.comment)} words</span></div><div class="explain" data-explainbox="${i}"></div>
        ${o.keyFindings && s.findings && s.findings.length ? `<div class="legend-note"><b>Key findings:</b><ol style="margin:4px 0 0 18px;padding:0">${s.findings.map(x => `<li>${esc(x)}</li>`).join('')}</ol></div>` : ''}`;
      html += `<div class="report-sec"><div class="${off(tk)}"><div class="row"><div class="cap" style="flex:1">${tOut ? 'Not exported:' : `Table ${plan.tabNum.get(s)}${o.tableCaption === 'period' ? '.' : o.tableCaption === 'apa' ? '' : ':'}`} <input type="text" class="fcap" data-ttl="${i}" value="${esc(s.title)}" title="Edit the table title"></div>${exBox(tk, 'Table')}</div>
        ${place === 'before' ? comment : ''}<div style="overflow-x:auto">${htmlTable(s.head, s.rows)}</div><div style="text-align:right"><button class="btn ghost small" data-copytbl="${i}" type="button" title="Copy the table with its caption and footnote, to paste into Word">⧉ Copy table</button> <button class="btn ghost small" data-wordtbl="${i}" type="button" title="This table alone, with its caption and footnote, as a Word file">⬇ Word</button> <button class="btn ghost small" data-pngtbl="${i}" type="button" title="This table as a picture (PNG)">⬇ PNG</button>${s.meta && s.meta.calc ? ` <button class="btn ghost small" data-riskcalc="${i}" type="button" title="A small web page that computes the prediction of this model">⬇ Risk calculator</button>` : ''}</div>
        <div class="foot">${esc(s.footnote)}</div>
        ${place !== 'before' ? comment : ''}</div>
        ${atEnd ? '' : `<div class="figs">${s.figures.map(figHtml).join('')}</div>`}</div>`;
    });
    if (atEnd) {
      const all = Report.arrangeFigures(r.sections, o.figPlacement) || [];
      const sorted = [...all.filter(f => plan.kept.has(f)).sort((a, b) => plan.order.indexOf(a) - plan.order.indexOf(b)), ...all.filter(f => !plan.kept.has(f))];
      if (sorted.length) html += `<div class="report-sec"><h3>Figures</h3><div class="figs">${sorted.map(figHtml).join('')}</div></div>`;
    }
    if (r.summary) html += `<div class="report-sec${off('summary')}"><div class="row"><h3>Summary of key findings</h3><span class="spacer"></span>${exBox('summary', 'Include')}</div><textarea id="edSummary">${esc(r.summary)}</textarea></div>`;
    $('#report').innerHTML = html;
  }
  /* ---------- clipboard: a figure as an image, a table as a formatted table (paste into Word or PowerPoint) ---------- */
  async function copyImage(url) {
    try { const blob = await (await fetch(url)).blob(); await navigator.clipboard.write([new ClipboardItem({ [blob.type || 'image/png']: blob })]); toast('Figure copied — paste it into Word or PowerPoint'); }
    catch (e) { toast('This browser does not allow copying images here — use ⬇ Export instead'); }
  }
  async function copyHtml(html, text) {
    try { await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html], { type: 'text/html' }), 'text/plain': new Blob([text], { type: 'text/plain' }) })]); }
    catch (e) { const d = document.createElement('div'); d.innerHTML = html; d.style.position = 'fixed'; d.style.left = '-9999px'; document.body.appendChild(d);
      const rg = document.createRange(); rg.selectNodeContents(d); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(rg); document.execCommand('copy'); sel.removeAllRanges(); d.remove(); }
    toast('Table copied — paste it into Word');
  }
  // a stand-alone page that computes a regression model's prediction (probability for logistic models)
  function calcPage(c) {
    const inputs = c.terms.map((t, i) => t.dummy ? `<label><input type="checkbox" data-i="${i}"> ${esc(t.label)}</label>` : `<label>${esc(t.label)} <input type="number" step="any" data-i="${i}" value="0"></label>`).join('');
    return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Risk calculator</title>
<style>body{font-family:system-ui,Arial,sans-serif;max-width:560px;margin:24px auto;padding:0 16px;color:#1C1648;background:#fff}label{display:flex;justify-content:space-between;gap:12px;margin:8px 0}input[type=number]{width:120px}#out{font-size:22px;font-weight:700;margin-top:16px}small{color:#666}</style></head>
<body><h2>${esc(c.logistic ? `Predicted probability of ${c.outcome}` : `Predicted ${c.outcome}`)}</h2>${inputs}<div id="out"></div>
<p><small>From the ${c.logistic ? 'logistic' : 'linear'} regression model of the study (Prof MSE Easy Stat). For research use; not validated for clinical decisions.</small></p>
<script>const B0=${c.b0},B=${JSON.stringify(c.terms.map(t => t.B))},L=${c.logistic};function f(){let z=B0;document.querySelectorAll('[data-i]').forEach(e=>{const v=e.type==='checkbox'?(e.checked?1:0):(+e.value||0);z+=B[+e.dataset.i]*v;});
document.getElementById('out').textContent=L?(100/(1+Math.exp(-z))).toFixed(1)+' %':z.toFixed(2);}document.addEventListener('input',f);f();<\/script></body></html>`;
  }
  // plain explanations of the statistical terms found in a comment (for students)
  const GLOSSARY = [
    [/P value/i, 'P value', 'The probability of a difference at least this large if the groups truly did not differ. Below the significance level (usually 0.05) the difference is called statistically significant.'],
    [/insignificant|not significant|no significant/i, 'Not significant', 'The data do not show a difference beyond chance. It does not prove that the groups are equal.'],
    [/\bsignificant/i, 'Significant', 'Statistically significant: unlikely to be due to chance alone. It says nothing about how large or important the difference is.'],
    [/95% CI|confidence interval/i, '95% confidence interval', 'The range of values compatible with the data; if it excludes 0 (for a difference) or 1 (for a ratio), the result is significant.'],
    [/\bMD\b|mean difference/i, 'Mean difference', 'The average of one group minus the average of the other.'],
    [/median difference|Hodges/i, 'Median difference (Hodges-Lehmann)', 'The typical difference between a value of one group and a value of the other; used with skewed data.'],
    [/\bRR\b|relative risk/i, 'Relative risk', 'How many times more often the outcome happened in one group than in the other (1 = no difference).'],
    [/\bOR\b|odds ratio/i, 'Odds ratio', 'The ratio of the odds of the outcome between two groups (1 = no difference).'],
    [/Mann-Whitney/i, 'Mann-Whitney U test', 'Compares two groups using ranks; does not need normally distributed data.'],
    [/Kruskal-Wallis/i, 'Kruskal-Wallis test', 'The rank-based comparison of three or more groups.'],
    [/t-test/i, 't-test', 'Compares the means of two groups of normally distributed data.'],
    [/ANOVA/i, 'ANOVA', 'Compares the means of three or more groups.'],
    [/Chi-square/i, 'Chi-square test', 'Compares proportions (percentages) between groups.'],
    [/Fisher/i, "Fisher's exact test", 'Compares proportions when the numbers are small.'],
    [/Cohen's d|Hedges/i, 'Effect size (d, g)', 'The difference in standard-deviation units: about 0.2 small, 0.5 medium, 0.8 large.'],
    [/Cramér|\bη²|\bε²|\br = /i, 'Effect size', 'How strong the difference or association is, independent of the sample size.'],
    [/interaction/i, 'Interaction', 'The change over time was different between the groups.'],
    [/trend/i, 'Trend', 'A P value close to but above the significance level; the result is suggestive only.']
  ];
  const explainHtml = t => { const hits = GLOSSARY.filter(([re]) => re.test(t || '')); return hits.length ? `<dl class="gloss">${hits.map(([, n, d]) => `<dt>${esc(n)}</dt><dd>${esc(d)}</dd>`).join('')}</dl>` : '<p class="legend-note">No statistical terms to explain.</p>'; };
  // checks of the edited comments: numbers that are not in the table (or the generated comment), causal wording, length
  const CAUSAL = /\b(caus(e|ed|es|ing)|led to|lead to|resulted in|due to|because of|prov(e|ed|es)|effect of .{0,30} on|improv(ed|es) .{0,20} because|thanks to)\b/i;
  function checkComments(r) {
    const nums = t => (String(t || '').match(/-?\d+(?:\.\d+)?/g) || []);
    const out = r.sections.map((s, i) => {
      if (!s.comment) return '';
      const pool = new Set([...nums(JSON.stringify(s.rows)), ...nums(JSON.stringify(s.head)), ...nums(s.footnote), ...nums(s.autoComment)].map(x => String(+x)));
      const bad = [...new Set(nums(s.comment).filter(x => !pool.has(String(+x)) && !/^(19|20)\d\d$/.test(x)))];
      const causal = Analysis.sentencesOf(s.comment).filter(x => CAUSAL.test(x));
      const issues = [...(bad.length ? [`numbers not found in the table: <b>${bad.map(esc).join(', ')}</b>`] : []), ...causal.map(x => `causal wording — an association does not show cause: “${esc(x)}”`)];
      return issues.length ? `<li><b>${esc(s.title)}</b><ul>${issues.map(x => `<li>${x}</li>`).join('')}</ul></li>` : '';
    }).filter(Boolean);
    return `<div class="report-sec">${out.length ? `<b>${out.length} comment${out.length > 1 ? 's' : ''} to check</b><ul>${out.join('')}</ul>` : '<b>✓ Every number in the comments is in its table, and no causal wording was found.</b>'}</div>`;
  }
  // multi-panel figures: the figures of one table joined in a grid (two per row) with the panel letters A, B, C …
  async function panelize(r) {
    const load = url => new Promise((ok, bad) => { const im = new Image(); im.onload = () => ok(im); im.onerror = bad; im.src = url; });
    for (const s of r.sections) {
      const fs = s.figures.filter(f => f.url); if (fs.length < 2) continue;
      const ims = await Promise.all(fs.map(f => load(f.url))), cols = 2, W = Math.max(...ims.map(i => i.width)), rows = Math.ceil(ims.length / cols);
      const hs = ims.map(i => i.height * W / i.width), rowH = Array.from({ length: rows }, (_, k) => Math.max(...hs.slice(k * cols, k * cols + cols)));
      const c = document.createElement('canvas'); c.width = W * cols; c.height = rowH.reduce((a, b) => a + b, 0); const x = c.getContext('2d');
      x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); let y0 = 0;
      ims.forEach((im, i) => { const col = i % cols, row = Math.floor(i / cols); if (col === 0 && i) y0 += rowH[row - 1];
        x.drawImage(im, col * W, y0, W, hs[i]); x.fillStyle = '#111'; x.font = `700 ${Math.round(W * 0.045)}px Arial, sans-serif`; x.textBaseline = 'top'; x.fillText(String.fromCharCode(65 + i), col * W + W * 0.015, y0 + W * 0.012); });
      const L = i => String.fromCharCode(65 + i);
      const merged = { ...fs[0], url: c.toDataURL('image/png'), w: c.width, h: c.height, caption: fs.map((f, i) => `(${L(i)}) ${f.caption}`).join('; '),
        note: fs.map((f, i) => f.note ? `${L(i)}: ${f.note}` : '').filter(Boolean).join(' ') };
      s.figures = [merged, ...s.figures.filter(f => !f.url)];
    }
  }
  /* ---------- bilingual report: Arabic by rules (arabic.js), with the Arabic labels of step 2 ⚙ and of the groups, and your edits ---------- */
  function arLabels() {
    const cfg = state.cfg, m = new Map(), lf = t => t ? t[0].toLowerCase() + t.slice(1) : t, plainL = t => String(t).replace(/ \([^)]*\)$/, '');
    cfg.variables.forEach(v => { const ar = (v.labelAr || '').trim(); [v.label, plainL(v.label)].forEach(l => { [l, lf(l)].forEach(x => { if (x && !m.has(x)) m.set(x, ar || x); }); });
      (v.cols || []).forEach(c => { const tl = c.label || cfg.tpLabels[c.tp]; if (tl && !m.has(tl)) m.set(tl, tl); }); });
    const ga = report().groupAr || {};
    activeGroups().forEach(g => { const l = cfg.groupLabels[g] || g; m.set(l, (ga[g] || '').trim() || l); });
    return m;
  }
  function arApi() {
    const map = arLabels(), ed = (state.result && state.result.arEdits) || {};
    return { text: t => ed[t] !== undefined ? ed[t] : Ar.translate(t, map).text, head: t => Ar.head(t, map), caption: t => Ar.caption(t, map), footnote: t => Ar.footnote(t, map), heading: t => Ar.heading(t) };
  }
  $('#arPrev').onclick = () => {
    if (!state.result) return; syncEdits(); const r = state.result, map = arLabels(), ed = r.arEdits = r.arEdits || {}, rpa = report(), ga = rpa.groupAr || (rpa.groupAr = {});
    const paras = [['Statistical analysis', r.methods], ['Flowchart text', r.intro], ...(r.narrative ? r.narrative.split(/\n\s*\n/).map(t => ['Results text', t.trim()]) : []), ...r.sections.map(s => [s.title, s.comment]), ['Summary', r.summary]].filter(x => x[1]);
    let bad = 0;
    const rows = paras.map(([where, en]) => { const tr = Ar.translate(en, map), flag = tr.bad > 0 && ed[en] === undefined; if (flag) bad++;
      return `<div class="ar-row${flag ? ' flag' : ''}"><div class="legend-note"><b>${esc(where)}</b>${flag ? ` · <span class="chip warn">${tr.bad} of ${tr.total} sentence${tr.total > 1 ? 's' : ''} partly in English — please check</span>` : ''}</div>
        <div class="ar-en">${esc(en)}</div><textarea dir="rtl" lang="ar" data-aren="${esc(en)}">${esc(ed[en] !== undefined ? ed[en] : tr.text)}</textarea></div>`; }).join('');
    $('#arOut').innerHTML = `<div class="report-sec"><b>Arabic names of the groups</b> (used in the Arabic text): ${activeGroups().map(g => `<label style="display:inline-flex;gap:4px;align-items:center;margin:4px 10px 4px 0">${esc(state.cfg.groupLabels[g] || g)} <input type="text" dir="rtl" data-grpar="${esc(g)}" value="${esc(ga[g] || '')}" style="width:150px"></label>`).join('')}
      <p class="legend-note">Arabic names of the variables come from step 2 ⚙. The Arabic below is written by rules from the English; edit any paragraph — your text is used in the Word file. ${bad ? `<b>${bad} paragraph${bad > 1 ? 's' : ''}</b> still hold English words (often your own reasons or category names).` : 'Every paragraph was translated.'}</p>
      <button class="btn ghost small" id="arRedo" type="button">↻ Translate again (drops your edits)</button>${rows}</div>`;
  };
  $('#arOut').addEventListener('input', e => {
    const en = e.target.dataset.aren, g = e.target.dataset.grpar;
    if (en !== undefined && state.result) { (state.result.arEdits = state.result.arEdits || {})[en] = e.target.value; e.target.closest('.ar-row').classList.remove('flag'); }
    if (g !== undefined) { const rpa = report(), ga = rpa.groupAr || (rpa.groupAr = {}); if (e.target.value.trim()) ga[g] = e.target.value.trim(); else delete ga[g]; }
  });
  // a new group name refreshes the Arabic paragraphs that were not edited (the boxes stay where they are)
  $('#arOut').addEventListener('change', e => { if (e.target.dataset.grpar === undefined || !state.result) return; const map = arLabels(), ed = state.result.arEdits || {};
    document.querySelectorAll('#arOut [data-aren]').forEach(t => { if (ed[t.dataset.aren] === undefined) t.value = Ar.translate(t.dataset.aren, map).text; }); });
  $('#arOut').addEventListener('click', e => { if (e.target.id === 'arRedo' && state.result) { state.result.arEdits = {}; $('#arPrev').onclick(); } });
  /* ---------- your own Word template (.dotx / .docx): its styles, theme fonts and colours, and page setup ---------- */
  async function applyTemplate(blob, tplBytes) {
    const CFB = XLSX.CFB, doc = CFB.read(new Uint8Array(await blob.arrayBuffer()), { type: 'array' }), tpl = CFB.read(tplBytes, { type: 'array' });
    const get = (z, p) => z.FileIndex[z.FullPaths.indexOf('Root Entry/' + p)], txt = e => new TextDecoder().decode(e.content), put = (e, s) => { const u = new TextEncoder().encode(s); e.content = u; e.size = u.length; };
    const set = (p, s) => { const e = get(doc, p); if (e) put(e, s); else CFB.utils.cfb_add(doc, '/' + p, new TextEncoder().encode(s)); };
    const ts = get(tpl, 'word/styles.xml'); if (!ts) throw new Error('the template has no styles');
    set('word/styles.xml', txt(ts));
    // the theme carries the template's fonts (+Headings / +Body) and colours
    const th = get(tpl, 'word/theme/theme1.xml');
    if (th && !get(doc, 'word/theme/theme1.xml')) {
      set('word/theme/theme1.xml', txt(th));
      const rels = get(doc, 'word/_rels/document.xml.rels'); put(rels, txt(rels).replace('</Relationships>', '<Relationship Id="rIdTheme1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/></Relationships>'));
      const ct = get(doc, '[Content_Types].xml'); put(ct, txt(ct).replace('</Types>', '<Override PartName="/word/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/></Types>'));
    }
    // page size and margins of the template (landscape sections keep their orientation)
    const td = get(tpl, 'word/document.xml'), tx = td ? txt(td) : '', sect = tx.slice(tx.lastIndexOf('<w:sectPr'));
    const pgSz = (sect.match(/<w:pgSz[^>]*\/>/) || [])[0], pgMar = (sect.match(/<w:pgMar[^>]*\/>/) || [])[0];
    if (pgSz || pgMar) { const dd = get(doc, 'word/document.xml'); let x = txt(dd);
      const wh = pgSz ? [(pgSz.match(/w:w="(\d+)"/) || [])[1], (pgSz.match(/w:h="(\d+)"/) || [])[1]] : null;
      if (wh && wh[0] && wh[1]) x = x.replace(/<w:pgSz[^>]*\/>/g, m => /landscape/.test(m) ? `<w:pgSz w:w="${Math.max(+wh[0], +wh[1])}" w:h="${Math.min(+wh[0], +wh[1])}" w:orient="landscape"/>` : `<w:pgSz w:w="${wh[0]}" w:h="${wh[1]}"/>`);
      if (pgMar) x = x.replace(/<w:pgMar[^>]*\/>/g, pgMar);
      put(dd, x); }
    return new Blob([CFB.write(doc, { fileType: 'zip', type: 'array', compression: true })], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
  }
  $('#tplFile').onchange = async e => { const f = e.target.files[0]; if (!f) return;
    try { const bytes = new Uint8Array(await f.arrayBuffer()), z = XLSX.CFB.read(bytes, { type: 'array' }); if (z.FullPaths.indexOf('Root Entry/word/styles.xml') < 0) throw new Error('no Word styles found');
      // its page (twentieths of a point) for laying out the tables and figures
      const de = z.FileIndex[z.FullPaths.indexOf('Root Entry/word/document.xml')], dx = de ? new TextDecoder().decode(de.content) : '', sp = dx.slice(dx.lastIndexOf('<w:sectPr')), at = (re2, d) => +((sp.match(re2) || [])[1]) || d;
      const page = /<w:pgSz/.test(sp) ? { w: at(/<w:pgSz[^>]*w:w="(\d+)"/, 11906), h: at(/<w:pgSz[^>]*w:h="(\d+)"/, 16838), l: at(/<w:pgMar[^>]*w:left="(\d+)"/, 1440), r: at(/<w:pgMar[^>]*w:right="(\d+)"/, 1440) } : null;
      state.wordTemplate = { name: f.name, bytes, page }; $('#tplName').textContent = `Template: ${f.name}`; toast(`Word template “${f.name}” will be used for the Word file`); }
    catch (err) { toast('Not a Word template: ' + err.message); } e.target.value = ''; };
  $('#tplClear').onclick = () => { state.wordTemplate = null; $('#tplName').textContent = 'No template — the report\'s own styles'; toast('Template removed'); };
  /* ---------- direct PDF: the report laid out as HTML on A4 pages, each page drawn to an image, written as a PDF ---------- */
  const PDF_W = 794, PDF_H = 1123, PDF_M = 68; // A4 at 96 px per inch, margins
  function pdfBlocks(r, plan) {
    const o = effOptions(), lab = n => Report.figLabel(n, o.captionStyle), B = [], P = (t, cls = 'p') => t && B.push({ html: `<div class="${cls}">${esc(t)}</div>` });
    const img = (url, w, h, cap) => B.push({ html: `<div class="fig"><img src="${url}" style="width:${Math.min(560, w)}px;height:${Math.round(Math.min(560, w) * h / w)}px"><div class="cap">${esc(cap)}</div></div>`, keep: true });
    if (state.cfg.study.title) B.push({ html: `<div class="title">${esc(state.cfg.study.title)}</div>` });
    if (!isOut('methods') && r.methods) { B.push({ html: '<div class="h1">Statistical Analysis</div>', head: true }); P(r.methods); }
    B.push({ html: '<div class="h1">Results</div>', head: true });
    if (plan.consortOn && r.consort) { P(r.intro); img(r.consort.url, 560, 560 * r.consort.h / r.consort.w, `${lab(plan.consortNum)} ${r.flowCaption}`); }
    if (plan.paper && r.narrative) r.narrative.split(/\n\s*\n/).forEach(t => P(t.trim()));
    r.sections.forEach(s => {
      if (plan.tabNum.get(s)) {
        const cp = s.place && o.commentPlace !== 'none' ? s.place : o.commentPlace || 'after';
        if (s.comment && cp === 'before' && !plan.paper) P(s.comment);
        B.push({ html: `<div class="cap tcap">Table ${plan.tabNum.get(s)}${o.tableCaption === 'period' ? '.' : ':'} ${esc(s.title)}</div>`, head: true });
        B.push({ table: s }); B.push({ html: `<div class="foot">${esc(s.footnote || '')}</div>` });
        if (s.comment && cp === 'after' && !plan.paper) P(s.comment);
      }
      s.figures.forEach(f => { const n = plan.figNum.get(f); if (n && f.url) img(f.url, 560, 560 * f.h / f.w, `${lab(n)} ${f.caption}${f.note ? ' ' + f.note : ''}`); });
    });
    if (r.summary && !isOut('summary')) { B.push({ html: '<div class="h1">Summary of key findings</div>', head: true }); P(r.summary); }
    return B;
  }
  async function buildPdf() {
    syncEdits(); const r = state.result, plan = exportPlan(r), o = effOptions();
    const css = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (e) { return []; } }).map(x => x.cssText).filter(t => /table\.rt|\.rt[ .{]/.test(t)).join('\n');
    const font = o.font || 'Times New Roman', W = PDF_W - 2 * PDF_M, H = PDF_H - 2 * PDF_M;
    const style = `${css} .pg{width:${W}px;font-family:'${font}',serif;font-size:15px;line-height:1.5;color:#000}.pg .p{text-align:justify;margin:0 0 10px}.pg .h1{font-weight:700;font-size:20px;margin:6px 0 10px}.pg .title{font-weight:700;font-size:22px;text-align:center;margin:0 0 16px}
      .pg .cap{font-weight:700;margin:4px 0 6px}.pg .tcap{text-align:${{ left: 'left', center: 'center' }[o.tableCapAlign] || 'justify'}}.pg .foot{font-size:12px;margin:4px 0 12px}.pg .fig{text-align:center;margin:6px 0 12px}.pg .fig .cap{font-size:13px}.pg table.rt{width:100%;font-size:12px}`;
    // measure each block at the page width; tables are cut into row groups that fit
    const probe = document.createElement('div'); probe.style.cssText = 'position:absolute;left:-10000px;top:0'; probe.innerHTML = `<style>${style}</style><div class="pg"></div>`; document.body.appendChild(probe);
    const pg = probe.querySelector('.pg'), measure = html => { pg.innerHTML = html; return pg.firstElementChild ? pg.firstElementChild.getBoundingClientRect().height + 12 : 0; };
    const items = [];
    for (const b of pdfBlocks(r, plan)) {
      if (!b.table) { items.push({ html: b.html, h: measure(b.html), head: b.head }); continue; }
      const s = b.table, rows = s.rows, blocks = []; let cover = 0;
      rows.forEach(rw => { if (cover === 0) blocks.push([]); blocks[blocks.length - 1].push(rw); cover = Math.max(cover - 1, ...rw.map(c => (c.rs || 1) - 1)); });
      let cur = [];
      const flush = () => { if (!cur.length) return; const html = htmlTable(s.head, cur); items.push({ html, h: measure(html) }); cur = []; };
      blocks.forEach(bk => { const trial = htmlTable(s.head, [...cur, ...bk]); if (cur.length && measure(trial) > H * 0.92) flush(); cur.push(...bk); });
      flush();
    }
    probe.remove();
    // pack into pages: a heading or caption stays with what follows it
    const pages = [[]]; let used = 0;
    items.forEach((it, i) => { const nxt = it.head && items[i + 1] ? items[i + 1].h : 0;
      if (pages[pages.length - 1].length && used + it.h + nxt > H) { pages.push([]); used = 0; } pages[pages.length - 1].push(it); used += it.h; });
    // draw every page: HTML in an SVG foreignObject, at 2× for sharp text, as JPEG
    const jpgs = [];
    for (let i = 0; i < pages.length; i++) {
      const body = pages[i].map(it => it.html).join('') + `<div style="position:absolute;left:0;right:0;bottom:${-PDF_M + 24}px;text-align:center;font-size:12px">${i + 1}</div>`;
      const html = `<div xmlns="http://www.w3.org/1999/xhtml" style="width:${PDF_W}px;height:${PDF_H}px;background:#fff;box-sizing:border-box;padding:${PDF_M}px"><style>${style}</style><div class="pg" style="position:relative;height:${H}px">${body}</div></div>`;
      const xhtml = new XMLSerializer().serializeToString(new DOMParser().parseFromString(`<div>${html}</div>`, 'text/html').body.firstChild.firstChild);
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PDF_W}" height="${PDF_H}"><foreignObject width="100%" height="100%">${xhtml}</foreignObject></svg>`;
      const im = await new Promise((ok, bad) => { const x = new Image(); x.onload = () => ok(x); x.onerror = () => bad(new Error('page ' + (i + 1) + ' could not be drawn')); x.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
      const c = document.createElement('canvas'); c.width = PDF_W * 2; c.height = PDF_H * 2; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.scale(2, 2); x.drawImage(im, 0, 0);
      jpgs.push({ bytes: new Uint8Array(await (await new Promise(ok => c.toBlob(ok, 'image/jpeg', 0.88))).arrayBuffer()), w: c.width, h: c.height });
    }
    return pdfFromJpegs(jpgs, state.cfg.study.title || 'Statistical report');
  }
  // a minimal PDF: one JPEG image (DCTDecode) filling each A4 page
  function pdfFromJpegs(pages, title) {
    const enc = new TextEncoder(), parts = [], offs = []; let len = 0;
    const add = b => { const u = typeof b === 'string' ? enc.encode(b) : b; parts.push(u); len += u.length; };
    const obj = (n, body) => { offs[n] = len; add(`${n} 0 obj\n`); body(); add('\nendobj\n'); };
    add('%PDF-1.4\n%\xE2\xE3\xCF\xD3\n');
    const n = pages.length, kids = pages.map((_, i) => `${3 + i * 3} 0 R`).join(' '), safe = String(title).replace(/[()\\]/g, ' ').replace(/[^\x20-\x7E]/g, '');
    obj(1, () => add('<< /Type /Catalog /Pages 2 0 R >>'));
    obj(2, () => add(`<< /Type /Pages /Kids [${kids}] /Count ${n} >>`));
    pages.forEach((p, i) => { const pn = 3 + i * 3, cn = pn + 1, im = pn + 2, content = `q 595.28 0 0 841.89 0 0 cm /Im0 Do Q`;
      obj(pn, () => add(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595.28 841.89] /Resources << /XObject << /Im0 ${im} 0 R >> >> /Contents ${cn} 0 R >>`));
      obj(cn, () => { add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`); });
      obj(im, () => { add(`<< /Type /XObject /Subtype /Image /Width ${p.w} /Height ${p.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${p.bytes.length} >>\nstream\n`); add(p.bytes); add('\nendstream'); }); });
    const info = 3 + n * 3; obj(info, () => add(`<< /Title (${safe}) /Producer (Prof MSE Easy Stat) >>`));
    const xref = len; add(`xref\n0 ${info + 1}\n0000000000 65535 f \n`); for (let k = 1; k <= info; k++) add(`${String(offs[k]).padStart(10, '0')} 00000 n \n`);
    add(`trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF`);
    return new Blob(parts, { type: 'application/pdf' });
  }
  $('#btnPdf').onclick = async () => { if (!state.result) return; busy(true); await new Promise(r => setTimeout(r, 30));
    try { const blob = await buildPdf(); saveUrl(URL.createObjectURL(blob), `${baseName()} - ${{ thesis: 'Thesis results', paper: 'Paper results' }[report().format] || 'Statistical report'}.pdf`); toast('PDF saved'); }
    catch (err) { console.error(err); toast('PDF failed: ' + err.message); } busy(false); };
  // a table as a picture: its HTML with the page's table styles, drawn through an SVG foreignObject at 2× resolution
  function tableImage(tbl, cap, foot) {
    const css = [...document.styleSheets].flatMap(sh => { try { return [...sh.cssRules]; } catch (e) { return []; } }).map(r => r.cssText).filter(t => /table\.rt|\.rt[ .{]/.test(t)).join('\n');
    const o = effOptions(), w = Math.max(400, Math.ceil(tbl.getBoundingClientRect().width) + 24), font = o.tableFont && o.tableFont !== 'same' ? o.tableFont : o.font;
    const html = `<div xmlns="http://www.w3.org/1999/xhtml" style="background:#fff;color:#000;padding:12px;width:${w - 24}px;font-family:'${font}',serif"><style>${css}</style>`
      + `<p style="font-weight:bold;margin:0 0 6px">${esc(cap)}</p>${new XMLSerializer().serializeToString(tbl)}<p style="font-size:11px;margin:6px 0 0">${esc(foot || '')}</p></div>`;
    const probe = document.createElement('div'); probe.style.cssText = 'position:absolute;left:-9999px;top:0'; probe.innerHTML = html; document.body.appendChild(probe);
    const h = Math.ceil(probe.firstChild.getBoundingClientRect().height) + 4; probe.remove();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`;
    return new Promise((ok, bad) => { const img = new Image(); img.onload = () => { const c = document.createElement('canvas'); c.width = 2 * w; c.height = 2 * h; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, c.width, c.height); x.scale(2, 2); x.drawImage(img, 0, 0); ok(c.toDataURL('image/png')); };
      img.onerror = () => bad(new Error('drawing failed')); img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg); });
  }
  $('#figPrevCopy').onclick = () => { const f = state.prevFig; if (f) copyImage(f.url); };
  $('#flowCopy').onclick = () => copyImage($('#consortCanvas').toDataURL('image/png'));
  $('#report').addEventListener('click', e => {
    const cc = e.target.closest('[data-copycom]'), ex = e.target.closest('[data-explain]'), ca = e.target.closest('[data-riskcalc]');
    if (ca) { const c = state.result.sections[+ca.dataset.riskcalc].meta.calc; saveUrl(URL.createObjectURL(new Blob([calcPage(c)], { type: 'text/html' })), `${baseName()} - Risk calculator.html`); }
    if (cc) { syncEdits(); const t = state.result.sections[+cc.dataset.copycom].comment || ''; navigator.clipboard.writeText(t).then(() => toast('Comment copied'), () => toast('Copying was blocked by the browser')); }
    if (ex) { syncEdits(); const box = document.querySelector(`[data-explainbox="${ex.dataset.explain}"]`); box.innerHTML = box.innerHTML ? '' : explainHtml(state.result.sections[+ex.dataset.explain].comment); }
    if (e.target.closest('#comCheck')) { syncEdits(); $('#comCheckOut').innerHTML = checkComments(state.result); }
    const fc = e.target.closest('[data-copyfig]'), tc = e.target.closest('[data-copytbl]'), wt = e.target.closest('[data-wordtbl]'), pt = e.target.closest('[data-pngtbl]');
    if (wt) { syncEdits(); const s = state.result.sections[+wt.dataset.wordtbl], plan = exportPlan(state.result), n = plan.tabNum.get(s) || 1;
      Report.build({ sections: [{ ...s, tableOn: true, figures: [] }], methods: '', consort: null }, { ...wordOptions(), tabStart: n, listTF: false, title: '', sectionHeads: false, tableNewPage: false, bare: true })
        .then(blob => saveUrl(URL.createObjectURL(blob), `${baseName()} - Table ${n}.docx`)); }
    if (pt) { syncEdits(); const s = state.result.sections[+pt.dataset.pngtbl], plan = exportPlan(state.result), n = plan.tabNum.get(s) || 1;
      tableImage(pt.closest('.report-sec').querySelector('table.rt'), `Table ${n}${effOptions().tableCaption === 'period' ? '.' : ':'} ${s.title}`, s.footnote)
        .then(url => saveUrl(url, `${baseName()} - Table ${n}.png`)).catch(err => toast('The picture could not be made: ' + err.message)); }
    if (fc) { const [si, fi] = fc.dataset.copyfig.split(':').map(Number); copyImage(state.result.sections[si].figures[fi].url); }
    if (tc) {
      syncEdits(); const s = state.result.sections[+tc.dataset.copytbl], o = effOptions(), plan = exportPlan(state.result);
      const box = tc.closest('.report-sec'), tbl = box.querySelector('table.rt').outerHTML.replace('<table', `<table border="1" cellspacing="0" cellpadding="4" style="border-collapse:collapse;font-family:'${o.font}',serif;font-size:10pt"`);
      const cap = `Table ${plan.tabNum.get(s) || ''}${o.tableCaption === 'period' ? '.' : ':'} ${s.title}`;
      copyHtml(`<p style="font-family:'${o.font}',serif;font-weight:bold">${esc(cap)}</p>${tbl}<p style="font-family:'${o.font}',serif;font-size:9pt">${esc(s.footnote || '')}</p>`,
        [cap, s.head.map(h => h.t ?? h).join('\t'), ...s.rows.map(r => r.map(c => (c.t || []).join(' ')).join('\t')), s.footnote || ''].join('\n'));
    }
    if (e.target.closest('#frRepGo')) {
      const find = $('#frRepFind').value; if (!find) return;
      const repl = $('#frRepWith').value, cs = $('#frRepCase').checked, whole = $('#frRepWhole').checked;
      const re = new RegExp((whole ? '\\b' : '') + find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + (whole ? '\\b' : ''), cs ? 'g' : 'gi');
      syncEdits(); const r = state.result; let n = 0;
      const sub = t => typeof t === 'string' ? t.replace(re, () => { n++; return repl; }) : t;
      ['methods', 'intro', 'narrative', 'abstract', 'summary'].forEach(k => { if (r[k]) r[k] = sub(r[k]); });
      if (n && r.narrative) r.narrativeEdited = true; if (n && r.abstract) r.abstractEdited = true;
      r.sections.forEach(s => { s.comment = sub(s.comment); s.title = sub(s.title); s.figures.forEach(f => { f.caption = sub(f.caption); if (f.note) f.note = sub(f.note); }); });
      const y = window.scrollY; renderReport(); window.scrollTo(0, y); document.querySelector('.fr-rep').open = true;
      $('#frRepFind').value = find; $('#frRepWith').value = repl; $('#frRepCase').checked = cs; $('#frRepWhole').checked = whole;
      toast(n ? `${n} replacement${n > 1 ? 's' : ''} in the report text` : `“${find}” was not found`);
    }
  });
  $('#report').addEventListener('change', e => {
    // an edited caption redraws its chart when the caption is printed on the chart
    if (e.target.dataset.fcap !== undefined) {
      syncEdits();
      const [si, fi] = e.target.dataset.fcap.split(':').map(Number), f = state.result.sections[si].figures[fi];
      if (effOptions().chartTitle) { renderFigure(f, effOptions()); e.target.closest('figure').querySelector('img').src = f.url; }
      return;
    }
    const key = e.target.dataset.export; if (key === undefined) return;
    syncEdits();
    if (e.target.checked) delete state.cfg.exportExclude[key]; else state.cfg.exportExclude[key] = true;
    const y = window.scrollY; renderReport(); window.scrollTo(0, y);
  });
  $('#report').addEventListener('click', e => {
    const b = e.target.closest('[data-exall]'); if (!b) return;
    syncEdits();
    const r = state.result, keys = ['methods', ...(r.consort ? ['consort'] : []), ...(r.summary ? ['summary'] : []), ...r.sections.flatMap(s => [exKey.table(s), ...s.figures.map(exKey.figure)])];
    keys.forEach(k => { if (b.dataset.exall === '1') delete state.cfg.exportExclude[k]; else state.cfg.exportExclude[k] = true; });
    const y = window.scrollY; renderReport(); window.scrollTo(0, y);
  });
  // the report model limited to what the user chose to export
  function exportModel(r) {
    const plan = exportPlan(r);
    return {
      ...r, methods: isOut('methods') ? '' : r.methods, consort: isOut('consort') ? null : r.consort, summary: isOut('summary') ? '' : r.summary,
      narrative: plan.paper ? r.narrative : '', abstract: plan.paper && plan.rep.abstract ? r.abstract : '',
      sections: r.sections.map(s => ({ ...s, tableOn: !isOut(exKey.table(s)), figures: s.figures.filter(f => plan.kept.has(f)) }))
        .filter(s => s.tableOn || s.figures.length)
    };
  }
  $('#btnRerun').onclick = () => runAnalysis();
  // the options of the Word file, from the steps and the report format
  function wordOptions() {
    const o = effOptions(), rp = report(), r0 = state.result, plan0 = r0 ? exportPlan(r0) : null;
    const extras = { cover: rp.cover ? { candidate: rp.coverCandidate, supervisor: rp.coverSupervisor, dept: rp.coverDept, date: rp.coverDate } : null, toc: !!rp.toc, wordStyles: !!rp.wordStyles,
      headNum: !!rp.headNum, lineNumbers: !!rp.lineNumbers, twoCol: !!rp.twoCol, watermark: String(rp.watermark || '').trim(), abbrFoot: !!rp.abbrFoot,
      ar: rp.bilingual ? arApi() : null,
      template: !!state.wordTemplate, tplPage: state.wordTemplate && state.wordTemplate.page,
      refs: rp.refs && r0 ? METHOD_REFS.filter(([re]) => re.test(r0.methods || '')).map(x => x[1]) : null, appendix: r0 ? appendixTables(r0, plan0) : [] };
    return { ...extras, numberPrefix: rp.format === 'thesis' && rp.chapter ? rp.chapter + '.' : '', sectionHeads: rp.format === 'thesis' && rp.sectionHeads, paper: rp.format === 'paper',
        tableNewPage: rp.format === 'thesis' ? !!rp.newPage : rp.format === 'paper' ? false : !!o.tableNewPage, tabStart: +rp.tabStart || 1, figStart: +rp.figStart || 1, italicP: !!o.italicP, title: state.cfg.study.title, branding: o.branding, logo: LOGO, font: o.font, tableStyle: o.tableStyle, tableCapAlign: o.tableCapAlign, page: { size: o.pageSize, margin: o.pageMargin, spacing: o.lineSpacing, pageNum: o.pageNum }, listTF: !!o.listTF, headerText: String(o.headerText || '').trim(), tableLook: { width: o.tableWidth, size: o.tableFontSize, head: o.tableHead, bands: o.tableBands, left: o.firstColLeft, pad: o.tablePad, font: o.tableFont && o.tableFont !== 'same' ? o.tableFont : undefined, decAlign: !!o.decAlign, pColor: o.pColor, sigSym: o.sigSym }, splitRows: o.splitRows, figWidth: o.figWidth, figPerRow: o.figPerRow, figPlacement: o.figPlacement, captionStyle: o.captionStyle,
        orientation: o.orientation, tableCaption: o.tableCaption, commentPlace: o.commentPlace, figRef: !!o.figRef, boldSigText: !!o.boldSigText, capAbove: !!o.capAbove, commentMerge: o.commentMerge, keyFindings: !!o.keyFindings };
  }
  const baseName = () => (state.file || 'data').replace(/\.[^.]+$/, '').replace(/ \(example\)$/, '');
  const saveUrl = (url, name) => { const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); };
  const safeName = t => String(t).replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80);
  // every exported table to Excel, one sheet each, with the merged cells of the Word table
  $('#btnXlsx').onclick = () => {
    if (!state.result) return;
    syncEdits();
    const r = state.result, plan = exportPlan(r), wb = XLSX.utils.book_new(), used = new Set();
    const sheetName = base => { let n = base.slice(0, 31), q = 2; while (used.has(n)) n = `${base.slice(0, 27)} (${q++})`; used.add(n); return n; };
    if (!isOut('methods') && r.methods) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Statistical analysis'], [r.methods]]), sheetName('Methods'));
    r.sections.forEach(sec => {
      if (!plan.tabNum.has(sec)) return;
      const head = sec.head.map(h => typeof h === 'string' ? { t: h } : h), aoa = [[`Table ${plan.tabNum.get(sec)}: ${sec.title}`]], merges = [];
      // header row with column spans
      const hr = []; head.forEach(h => { const c0 = hr.length; hr.push(h.t || ''); for (let q = 1; q < (h.span || 1); q++) hr.push(''); if ((h.span || 1) > 1) merges.push({ s: { r: 1, c: c0 }, e: { r: 1, c: c0 + h.span - 1 } }); });
      aoa.push(hr);
      const occ = [];
      sec.rows.forEach((row, ri) => {
        const out = [], R = ri + 2; let c = 0;
        for (const cell of row) {
          while (occ[ri] && occ[ri][c]) { out[c] = ''; c++; }
          out[c] = (cell.t || []).join('\n'); for (let q = 1; q < (cell.span || 1); q++) out[c + q] = '';
          if ((cell.rs || 1) > 1 || (cell.span || 1) > 1) merges.push({ s: { r: R, c }, e: { r: R + (cell.rs || 1) - 1, c: c + (cell.span || 1) - 1 } });
          if (cell.rs > 1) for (let q = 1; q < cell.rs; q++) { occ[ri + q] = occ[ri + q] || []; for (let s2 = 0; s2 < (cell.span || 1); s2++) occ[ri + q][c + s2] = true; }
          c += cell.span || 1;
        }
        while (occ[ri] && occ[ri][c]) { out[c] = ''; c++; }
        aoa.push(out);
      });
      aoa.push([], [sec.footnote]);
      const ws = XLSX.utils.aoa_to_sheet(aoa); ws['!merges'] = merges;
      ws['!cols'] = hr.map((_, i) => ({ wch: i === 0 ? 28 : 18 }));
      XLSX.utils.book_append_sheet(wb, ws, sheetName(`Table ${plan.tabNum.get(sec)}`));
    });
    if (!wb.SheetNames.length) { toast('No table is selected for export'); return; }
    XLSX.writeFile(wb, `${baseName()} - Tables.xlsx`);
    toast(`${wb.SheetNames.length} sheet${wb.SheetNames.length > 1 ? 's' : ''} saved to Excel`);
  };
  /* ---------- figure export: one, several or all figures as PNG, JPEG or TIFF, at a set dpi, in colour or greyscale ---------- */
  // width of a figure in the Word file, in 96-dpi pixels as docx.js sizes images (as in report.js), and of the flowchart
  const FIG_PT = { small: [380, 200], medium: [470, 250], full: [560, 295] };
  const flowPt = () => report().format === 'paper' ? 470 : 600;
  // an export item: its file name, its size at res 1, its width in the report and how to draw it at a resolution
  const chartItem = (f, name, o) => {
    const res1 = +o.chartRes || 1, w = (f.w || 1500 * res1) / res1, h = (f.h || 820 * res1) / res1;
    return { name, w, h, pt: (FIG_PT[o.figWidth] || FIG_PT.full)[o.figPerRow === 2 || +o.figPerRow === 2 ? 1 : 0],
      draw: (res, text) => Charts.draw({ ...f.spec, title: o.chartTitle ? f.caption : null }, chartPalette(o), { ...chartStyle(o), res, ...(text ? { text } : {}) }),
      svg: text => Charts.drawSVG({ ...f.spec, title: o.chartTitle ? f.caption : null }, chartPalette(o), { ...chartStyle(o), ...(text ? { text } : {}) }) };
  };
  const flowItem = (c, gl, name) => {
    const pal = chartPalette(state.cfg.options), cv = Charts.consort(c, gl, pal, 1);
    return { name, w: cv.width, h: cv.height, pt: flowPt(), draw: res => Charts.consort(c, gl, pal, res), svg: () => Charts.flowSVG(c, gl, pal) };
  };
  let fxItems = [];
  function openFigExport(items, preselect) {
    if (!items.length) { toast('No figure to export'); return; }
    fxItems = items;
    $('#fxList').innerHTML = items.map((it, i) => `<label class="check"><input type="checkbox" data-fx="${i}" ${!preselect || preselect.includes(i) ? 'checked' : ''}><span>${esc(it.name)}</span></label>`).join('');
    $('#fxList').style.display = items.length > 1 ? '' : 'none';
    $('#fxAll').style.display = $('#fxNone').style.display = items.length > 1 ? '' : 'none';
    try { const p = JSON.parse(localStorage.getItem('easystat.figExport') || '{}'); ['Format', 'Dpi', 'Width', 'Color', 'Zip'].forEach(k => { if (p[k] && $('#fx' + k).querySelector(`option[value="${p[k]}"]`)) $('#fx' + k).value = p[k]; }); } catch (e) { /* defaults */ }
    fxUpdate();
    $('#figDlg').showModal();
  }
  const fxChosen = () => [...document.querySelectorAll('[data-fx]:checked')].map(el => fxItems[+el.dataset.fx]);
  // the drawing scale for an item: its print width × dpi, kept within what browsers can draw (16 000 px a side, 120 Mpx)
  function fxScale(it) {
    const dpi = +$('#fxDpi').value, wv = $('#fxWidth').value, inch = wv === 'report' ? it.pt / 96 : +wv / 2.54;
    const want = inch * dpi / it.w, cap = Math.min(16000 / it.w, 16000 / it.h, Math.sqrt(120e6 / (it.w * it.h)));
    const res = Math.min(want, cap);
    return { res, px: [Math.round(it.w * res), Math.round(it.h * res)], dpi: Math.max(1, Math.round(res === want ? dpi : res * it.w / inch)), capped: res < want };
  }
  function fxUpdate() {
    const ch = fxChosen(), n = ch.length;
    $('#fxCount').textContent = fxItems.length > 1 ? `${n} of ${fxItems.length} figures selected` : fxItems[0].name;
    $('#fxZipBox').style.display = n > 1 ? '' : 'none';
    $('#fxGo').disabled = !n;
    if (!n) { $('#fxInfo').textContent = 'Select at least one figure.'; return; }
    const s = fxScale(ch[0]), fmt = $('#fxFormat').value;
    $('#fxInfo').textContent = `${n > 1 ? 'First figure: ' : ''}${s.px[0]} × ${s.px[1]} pixels at ${s.dpi} dpi (${(s.px[0] / s.dpi * 2.54).toFixed(1)} × ${(s.px[1] / s.dpi * 2.54).toFixed(1)} cm)`
      + (s.capped ? ' — reduced to the largest size the browser can draw' : '')
      + (fmt === 'tiff' && s.px[0] * s.px[1] > 2e7 ? '. Large TIFF files can take a few seconds each.' : '.');
  }
  $('#fxForm').addEventListener('change', fxUpdate);
  $('#fxAll').onclick = () => { document.querySelectorAll('[data-fx]').forEach(el => { el.checked = true; }); fxUpdate(); };
  $('#fxNone').onclick = () => { document.querySelectorAll('[data-fx]').forEach(el => { el.checked = false; }); fxUpdate(); };
  $('#fxCancel').onclick = () => $('#figDlg').close();
  $('#fxGo').onclick = async () => {
    const ch = fxChosen(); if (!ch.length) return;
    const fmt = $('#fxFormat').value, grey = $('#fxColor').value === 'grey', zip = ch.length > 1 && $('#fxZip').value === 'zip', ext = { png: 'png', jpg: 'jpg', tiff: 'tif', svg: 'svg' }[fmt];
    try { localStorage.setItem('easystat.figExport', JSON.stringify(Object.fromEntries(['Format', 'Dpi', 'Width', 'Color', 'Zip', 'Text'].map(k => [k, $('#fx' + k).value])))); } catch (e) { /* not kept */ }
    $('#figDlg').close(); busy(true);
    await new Promise(r => setTimeout(r, 30));
    try {
      const z = zip ? XLSX.CFB.utils.cfb_new() : null, used = new Set();
      for (const it of ch) {
        // journal text size: the axis numbers printed at 8 or 10 pt at the chosen width
        const s = fxScale(it), pt = +$('#fxText').value, inch = $('#fxWidth').value === 'report' ? it.pt / 96 : +$('#fxWidth').value / 2.54, txt = pt ? pt * it.w / (72 * 26 * inch) : 0;
        if (fmt === 'svg' && !it.svg) { toast(`${it.name}: SVG is not available for this figure — exported as PNG`); }
        const blob = fmt === 'svg' && it.svg ? new Blob([it.svg(txt)], { type: 'image/svg+xml' }) : await Charts.exportImage(it.draw(s.res, txt), { format: fmt === 'svg' ? 'png' : fmt, dpi: s.dpi, grey });
        let name = safeName(it.name) + (grey ? ' (greyscale)' : ''), k = 2; while (used.has(name)) name = `${safeName(it.name)} (${k++})`; used.add(name);
        if (z) XLSX.CFB.utils.cfb_add(z, `${name}.${ext}`, new Uint8Array(await blob.arrayBuffer()));
        else { const url = URL.createObjectURL(blob); saveUrl(url, `${name}.${ext}`); setTimeout(() => URL.revokeObjectURL(url), 60000); await new Promise(r => setTimeout(r, 300)); }
      }
      if (z) {
        const out = XLSX.CFB.write(z, { fileType: 'zip', type: 'array', compression: fmt === 'tiff' });
        const url = URL.createObjectURL(new Blob([out], { type: 'application/zip' }));
        saveUrl(url, `${baseName()} - Figures (${ext.toUpperCase()}, ${$('#fxDpi').value} dpi${grey ? ', greyscale' : ''}).zip`); setTimeout(() => URL.revokeObjectURL(url), 60000);
      }
      toast(`${ch.length} figure${ch.length > 1 ? 's' : ''} exported as ${ext.toUpperCase()}${zip ? ' in one ZIP file' : ''}${ch.length > 1 && !zip ? ' (allow multiple downloads if the browser asks)' : ''}`);
    } catch (err) { console.error(err); toast('Export failed: ' + err.message); }
    busy(false);
  };
  // step 11: every exported figure (and the flowchart), named by their number
  $('#btnPngs').onclick = () => {
    if (!state.result) return;
    syncEdits();
    const r = state.result, plan = exportPlan(r), o = effOptions(), items = [];
    if (plan.consortOn && r.consort) items.push(flowItem(state.cfg.consort, r.groups, `Figure ${plan.consortNum} - ${r.flowCaption}`));
    plan.order.forEach(f => items.push(chartItem(f, `Figure ${plan.figNum.get(f)} - ${f.caption}`, o)));
    if (!items.length) { toast('No figure is selected for export'); return; }
    openFigExport(items);
  };
  $('#flowPng').onclick = () => { readConsort(); openFigExport([flowItem(state.cfg.consort, activeGroups().map(g => state.cfg.groupLabels[g]), `${baseName()} - Flowchart`)]); };

  $('#btnDocx').onclick = async () => {
    if (!state.result) return;
    busy(true);
    try {
      syncEdits();
      const r = exportModel(state.result);
      if (effOptions().figPanels) await panelize(r);
      if (!r.methods && !r.consort && !r.sections.length) { toast('Nothing is selected for export'); return; }
      const o = effOptions(), rp = report();
      let blob = await Report.build(r, wordOptions());
      if (state.wordTemplate) blob = await applyTemplate(blob, state.wordTemplate.bytes);
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (state.file || 'data').replace(/\.[^.]+$/, '').replace(/ \(example\)$/, '') + ` - ${{ thesis: 'Thesis results', paper: 'Paper results' }[report().format] || 'Statistical report'}.docx`;
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast('Word report downloaded');
    } catch (err) { console.error(err); toast('Word export failed: ' + err.message); }
    finally { busy(false); }
  };

  /* ---------- presets: ready-made settings for steps 4–10, and the user's own (kept in this browser) ---------- */
  // built-in presets start from the defaults; o = options, flow = flowchart appearance, report = report format fields
  const PRESETS = [
    { id: 'default', name: 'Default settings', note: 'The settings the app starts with.', o: {} },
    { id: 'thesis', name: 'Thesis — classic', note: 'Detailed comments after each table, grid tables, figures after each table, summary of key findings, each table on a new page.',
      o: { commentStyle: 'detailed', summary: true, within: true, tableNewPage: true }, report: { format: 'thesis', style: 'none', newPage: true } },
    { id: 'thesisFull', name: 'Thesis — fully descriptive', note: 'Descriptive comments (values, tests, effect sizes), Total column, tests as letters after P values, bold significant P values, post hoc and interaction tests.',
      o: { commentStyle: 'descriptive', commentEffect: true, totalCol: true, testNote: 'marks', boldSig: true, within: true, dunn: true, chiPost: true, mixed: true, summary: true, tableNewPage: true },
      report: { format: 'thesis', style: 'none', newPage: true } },
    { id: 'medical', name: 'Journal — medical (Vancouver)', note: 'Concise paper, three-line tables, P = 0.013, tests listed in the footnotes, significant figures only, two per row.',
      o: { tableStyle: 'apa', testNote: 'list', figures: 'sig', figPerRow: 2, figWidth: 'medium', captionStyle: 'period', tableCaption: 'period', boldSig: false },
      report: { format: 'paper', style: 'vancouver', maxFigs: 3, nonSig: false } },
    { id: 'apa', name: 'Journal — APA 7th', note: 'APA style: p = .013 in italics, M (SD), three-line tables, captions above figures, figures after the tables at the end.',
      o: { tableStyle: 'apa', testNote: 'list', figPerRow: 1, figWidth: 'medium' }, report: { format: 'paper', style: 'apa', maxFigs: 3 } },
    { id: 'jama', name: 'Journal — AMA / JAMA', note: 'P = .01 in italics, mean (SD), three-line tables, effect sizes in the comments.',
      o: { tableStyle: 'apa', commentEffect: true, testNote: 'list' }, report: { format: 'paper', style: 'ama', maxFigs: 3 } },
    { id: 'print', name: 'Black and white print', note: 'Grayscale charts with outlined bars, black-and-white flowchart, Times New Roman in charts.',
      o: { palette: 'gray', barFill: 'outline', chartFont: 'times', gridlines: false }, flow: { theme: 'bw', font: 'times' } },
    { id: 'slides', name: 'Presentation', note: 'Large chart text, value labels, every patient shown on box plots, colourful filled flowchart.',
      o: { chartText: 'xlarge', valueLabels: true, points: true, boxMean: true, legendSize: 'large', chartRes: 2, figWidth: 'full' }, flow: { theme: 'filled', corners: 'rounded', shadow: true, textSize: 'large' } },
    { id: 'minimal', name: 'Tables only', note: 'Concise comments, no figures, no effect-size columns.', o: { figures: 'none', effect: false, commentStyle: 'concise' } },
    { id: 'complete', name: 'Comprehensive analysis', note: 'Every optional test: within-group change, Welch / Games-Howell, Dunn, pairwise Chi-square, group × time interaction, correlations, effect sizes in comments and a summary.',
      o: { within: true, welch: true, dunn: true, chiPost: true, mixed: true, correlation: true, commentEffect: true, summary: true, showStat: true } }
  ];
  const MY_KEY = 'easystat-presets';
  const myPresets = () => { try { return JSON.parse(localStorage.getItem(MY_KEY) || '[]'); } catch (e) { return []; } };
  const saveMine = list => { try { localStorage.setItem(MY_KEY, JSON.stringify(list)); return true; } catch (e) { toast('Presets cannot be stored in this browser — use Export'); return false; } };
  const REPORT_KEYS = ['format', 'style', 'chapter', 'sectionHeads', 'newPage', 'maxFigs', 'nonSig', 'abstract'];
  function renderPresets(sel) {
    const mine = myPresets();
    $('#presetSel').innerHTML = `<optgroup label="Ready-made">${PRESETS.map(p => `<option value="b:${p.id}">${esc(p.name)}</option>`).join('')}</optgroup>`
      + (mine.length ? `<optgroup label="My presets">${mine.map((p, i) => `<option value="m:${i}">${esc(p.name)}</option>`).join('')}</optgroup>` : '');
    if (sel) $('#presetSel').value = sel;
    presetNote();
  }
  const selectedPreset = () => { const [k, v] = $('#presetSel').value.split(':'); return k === 'b' ? PRESETS.find(p => p.id === v) : myPresets()[+v]; };
  function presetNote() {
    const p = selectedPreset(), mine = $('#presetSel').value.startsWith('m:');
    $('#presetNote').textContent = p ? (mine ? `Your preset${p.saved ? ', saved ' + p.saved : ''}.` : p.note) : '';
    $('#presetDel').disabled = !mine;
  }
  $('#presetSel').onchange = presetNote;
  $('#presetApply').onclick = () => {
    const p = selectedPreset(); if (!p || !state.cfg) return;
    readUiIntoCfg();
    const cfg = state.cfg, keepColors = cfg.options.customColors;
    // ready-made presets start from the defaults; your own presets hold every option
    cfg.options = { ...defaultOptions(), ...JSON.parse(JSON.stringify(p.o || {})) };
    if (!(p.o && p.o.customColors)) cfg.options.customColors = keepColors;
    // the flowchart's own section-label wording is kept unless the preset brings its own
    const labels = (cfg.consort && cfg.consort.style || {}).labels || {};
    if (cfg.consort) cfg.consort.style = { ...FLOW_STYLE, labels, ...JSON.parse(JSON.stringify(p.flow || {})) };
    cfg.report = { ...DEFAULT_REPORT, ...(cfg.report || {}), ...(p.report || (p.mine ? {} : { format: 'custom', style: 'none' })) };
    // show the new settings on the current step without reading the old controls back
    renderOptions();
    if (state.step === 7) renderFigureTable();
    if (state.step === 9) renderConsortForm();
    if (state.step === 10) renderExplore();
    if (state.step === 11) runAnalysis();
    toast(`Preset applied: ${p.name}`);
  };
  $('#presetSave').onclick = () => {
    if (!state.cfg) return;
    readUiIntoCfg();
    const name = (prompt('Name of the preset:', 'My settings') || '').trim(); if (!name) return;
    const r = report(), list = myPresets().filter(x => x.name !== name);
    list.push({ name, mine: true, saved: new Date().toISOString().slice(0, 10), o: JSON.parse(JSON.stringify(state.cfg.options)),
      flow: state.cfg.consort && state.cfg.consort.style ? JSON.parse(JSON.stringify(state.cfg.consort.style)) : null,
      report: Object.fromEntries(REPORT_KEYS.map(k => [k, r[k]])) });
    if (saveMine(list)) { renderPresets('m:' + (list.length - 1)); toast(`Preset “${name}” saved`); }
  };
  $('#presetDel').onclick = () => {
    const v = $('#presetSel').value; if (!v.startsWith('m:')) return;
    const list = myPresets(), p = list[+v.slice(2)];
    if (!p || !confirm(`Delete the preset “${p.name}”?`)) return;
    list.splice(+v.slice(2), 1); saveMine(list); renderPresets(); toast('Preset deleted');
  };
  $('#presetExport').onclick = () => {
    const list = myPresets(); if (!list.length) { toast('No presets of your own yet — save one first'); return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ app: 'ProfMSE-EasyStat-presets', presets: list }, null, 2)], { type: 'application/json' }));
    a.download = 'EasyStat presets.json'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  };
  $('#presetFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== 'ProfMSE-EasyStat-presets' || !Array.isArray(j.presets)) throw new Error('not an Easy Stat presets file');
      const list = myPresets();
      j.presets.filter(p => p && p.name && p.o).forEach(p => { const i = list.findIndex(x => x.name === p.name); const q = { ...p, mine: true }; if (i >= 0) list[i] = q; else list.push(q); });
      if (saveMine(list)) { renderPresets(); toast(`${j.presets.length} preset(s) imported`); }
    } catch (err) { toast('Could not import presets: ' + err.message); }
    e.target.value = '';
  };
  renderPresets();

  /* ---------- projects: the data, every setting and the edited report text in one file ---------- */
  // text edited in step 11, keyed like the export choices so it finds its table or figure again after the analysis is re-run
  function reportEdits() {
    const r = state.result; if (!r) return null;
    syncEdits();
    return { methods: r.methods, intro: r.intro, summary: r.summary, narrative: r.narrativeEdited ? r.narrative : undefined, abstract: r.abstractEdited ? r.abstract : undefined,
      sections: Object.fromEntries(r.sections.map(s => [s.key, { title: s.title, comment: s.comment }])),
      figures: Object.fromEntries(r.sections.flatMap(s => s.figures.map(f => [f.key, { caption: f.caption, note: f.note }]))) };
  }
  function applyEdits(r, e) {
    ['methods', 'intro', 'summary'].forEach(k => { if (typeof e[k] === 'string' && r[k] !== undefined) r[k] = e[k]; });
    if (typeof e.narrative === 'string') { r.narrative = e.narrative; r.narrativeEdited = true; }
    if (typeof e.abstract === 'string') { r.abstract = e.abstract; r.abstractEdited = true; }
    r.sections.forEach(s => {
      const x = (e.sections || {})[s.key]; if (x) { s.title = x.title ?? s.title; s.comment = x.comment ?? s.comment; }
      s.figures.forEach(f => { const y = (e.figures || {})[f.key]; if (y) { f.caption = y.caption ?? f.caption; if (y.note !== undefined) f.note = y.note; } });
    });
  }
  $('#btnSaveProj').onclick = () => {
    if (!state.data) { toast('Nothing to save yet — load an Excel file or an example'); return; }
    readUiIntoCfg();
    const proj = { app: 'ProfMSE-EasyStat-project', version: 1, saved: new Date().toISOString(), file: state.file, sheet: state.sheet, step: state.step,
      data: state.data, cfg: state.cfg, edits: reportEdits() || state.pendingEdits || null, cleanLog: state.cleanLog || [], snapshots: state.snapshots || [] };
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(proj)], { type: 'application/json' }));
    a.download = (state.file || 'data').replace(/\.[^.]+$/, '').replace(/ \(example\)$/, '') + ' - project.easystat.json';
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    toast('Project saved — open it later with 📂 Open project');
  };
  $('#projFile').onchange = async e => {
    const f = e.target.files[0]; e.target.value = ''; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== 'ProfMSE-EasyStat-project' || !j.data || !j.cfg) throw new Error(j.app === 'ProfMSE-EasyStat' ? 'this is a setup file — use Load setup' : 'not an Easy Stat project');
      if (state.data && !confirm('Open this project? Unsaved changes to the current one are lost.')) return;
      openProject(j, f.name);
    } catch (err) { toast('Could not open the project: ' + err.message); }
  };
  function openProject(j, fname) {
    {
      const cfg = j.cfg;
      cfg.options = { ...defaultOptions(), ...cfg.options };
      cfg.tpInclude = cfg.tpInclude || {}; cfg.advanced = cfg.advanced || []; cfg.exportExclude = cfg.exportExclude || {}; cfg.report = { ...DEFAULT_REPORT, ...(cfg.report || {}) };
      state.data = j.data; state.cfg = cfg; state.file = j.file || fname; state.messy = null; state.cleanLog = j.cleanLog || []; state.snapshots = j.snapshots || []; state.sheet = j.sheet || 'Data'; state.wb = null; state.result = null;
      state.undo = []; state.redo = []; state.grid.page = 0; state.grid.sort = null; state.pendingCfg = null; state.pendingEdits = j.edits || null;
      $('#fileName').textContent = `${state.file} (project)`; $('#sheetSel').innerHTML = `<option>${esc(state.sheet)}</option>`; $('#sheetBox').style.display = '';
      $('#studyTitle').value = cfg.study.title || ''; $('#software').value = cfg.study.software || $('#software').value;
      $('#to2').disabled = false; renderGrid(); renderPrep(); $('#hdrRow').innerHTML = '<option>1</option>';
      // leave no step active, so the controls of the old project are not read into the opened one
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      go(Math.min(STEPS.length, Math.max(2, +j.step || 2)));
      toast(`Project opened: ${state.data.rows.length} patients, saved ${String(j.saved || '').slice(0, 10)}`);
    }
  }
  /* ---------- autosave: the current work is kept in this browser and offered back on the next visit ---------- */
  const AUTOSAVE_KEY = 'easystat.autosave';
  let autosaveTimer = null;
  function autosave() {
    clearTimeout(autosaveTimer);
    autosaveTimer = setTimeout(() => {
      if (!state.data || !state.cfg) return;
      try {
        const txt = JSON.stringify({ app: 'ProfMSE-EasyStat-project', version: 1, saved: new Date().toISOString(), file: state.file, sheet: state.sheet, step: state.step, data: state.data, cfg: state.cfg });
        if (txt.length < 4.5e6) localStorage.setItem(AUTOSAVE_KEY, txt);
      } catch (e) { /* storage full or blocked: nothing kept */ }
    }, 1500);
  }
  document.addEventListener('change', autosave); document.addEventListener('click', e => { if (e.target.closest('button,[data-go]')) autosave(); });
  (function offerRestore() {
    let j = null; try { j = JSON.parse(localStorage.getItem(AUTOSAVE_KEY) || 'null'); } catch (e) { /* none */ }
    if (!j || !j.data || !j.cfg) return;
    const box = document.createElement('div'); box.className = 'restore-bar';
    const when = new Date(j.saved), ago = isFinite(when) ? when.toLocaleString() : '';
    box.innerHTML = `<span>↺ Continue where you left off? <b>${esc(String(j.file || 'data').replace(/\.[^.]+$/, ''))}</b> — ${j.data.rows.length} patients, step ${j.step || 2}, saved ${esc(ago)}.</span><span class="spacer"></span><button class="btn primary small" type="button" data-rs="yes">Restore</button><button class="btn ghost small" type="button" data-rs="no">Dismiss</button>`;
    $('#p1').prepend(box);
    box.onclick = e => { const b = e.target.closest('[data-rs]'); if (!b) return; box.remove();
      if (b.dataset.rs === 'yes') { try { openProject(j, j.file || 'data'); } catch (err) { toast('Could not restore: ' + err.message); } }
      else { try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) { /* ignore */ } } };
  })();
  /* ---------- keyboard shortcuts (single keys only when not typing) ---------- */
  const KEYS = [['Anywhere'], [['Ctrl', 'S'], 'Save the project'], [['Ctrl', 'O'], 'Open a project'], [['Ctrl', 'Z'], 'Undo the last change to the data'], [['Ctrl', 'Y'], 'Redo (also Ctrl+Shift+Z)'],
    [['Alt', '→'], 'Next step'], [['Alt', '←'], 'Previous step'], [[']'], 'Next step'], [['['], 'Previous step'], [['1 … 9'], 'Go to step 1 … 9'], [['0'], 'Step 10 · Results by variable'],
    [['R'], 'Step 11 · Report'], [['/'], 'Search on this step'], [['T'], 'Light / dark theme'], [['?'], 'This list'],
    ['On a step'], [['C'], 'Check the data (step 1)'], [['E'], 'Edit the sheet (step 1)'], [['F'], 'Export figures (steps 7, 9 and 11)'], [['W'], 'Download Word (steps 10 and 11)'], [['X'], 'Download Excel (steps 10 and 11)'], [['V'], 'Next view (step 10)']];
  const typing = el => el && (el.isContentEditable || /^(TEXTAREA|SELECT)$/.test(el.tagName) || (el.tagName === 'INPUT' && !/^(checkbox|radio|button|submit|reset|color|range|file)$/i.test(el.type)));
  function showKeys() {
    $('#keysList').innerHTML = KEYS.map(k => k.length === 1 ? `<div class="sec">${k[0]}</div>` : `<div class="k">${k[0].map(x => `<kbd>${esc(x === 'Ctrl' && /Mac/.test(navigator.platform) ? '⌘' : x)}</kbd>`).join('+')}</div><div>${esc(k[1])}</div>`).join('');
    $('#keysDlg').showModal();
  }
  $('#btnKeys').onclick = showKeys;
  const clickIf = id => { const b = $(id); if (b && !b.disabled) { b.click(); return true; } return false; };
  document.addEventListener('keydown', e => {
    if (document.querySelector('dialog[open]') && e.key !== 'Escape') { if (!(e.ctrlKey || e.metaKey)) return; }
    const mod = e.ctrlKey || e.metaKey, k = e.key.toLowerCase();
    if (mod && !e.altKey) {
      if (k === 's') { e.preventDefault(); $('#btnSaveProj').click(); }
      else if (k === 'o') { e.preventDefault(); $('#projFile').click(); }
      else if ((k === 'z' || k === 'y') && !typing(e.target) && state.data) {
        e.preventDefault(); const redo = k === 'y' || e.shiftKey;
        if (undoRedo(redo)) { if (state.step === 10) { const y = window.scrollY; renderExplore(); window.scrollTo(0, y); } renderGrid(); renderPrep(); renderStepper(); if (state.step === 2) renderVariables(); }
      }
      return;
    }
    if (e.altKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft') && state.data) { e.preventDefault(); go(Math.min(STEPS.length, Math.max(1, state.step + (e.key === 'ArrowRight' ? 1 : -1)))); return; }
    if (e.altKey || typing(e.target)) return;
    const step = state.step, at = n => step === n;
    let done = true;
    if (e.key === '?') showKeys();
    else if (/^[0-9]$/.test(e.key) && (state.data || e.key === '1')) go(e.key === '0' ? 10 : +e.key);
    else if (k === 'r' && state.data) go(11);
    else if ((e.key === ']' || e.key === '[') && state.data) go(Math.min(STEPS.length, Math.max(1, step + (e.key === ']' ? 1 : -1))));
    else if (e.key === '/') { const box = at(1) ? $('#gridSearch') : at(2) ? $('#varSearch') : at(10) ? ($('#xpOpts').open = true, document.querySelector('[data-xo="q"]')) : null; if (box && box.offsetParent !== null) box.focus(); else done = false; }
    else if (k === 't') $('#btnTheme').click();
    else if (k === 'c' && at(1) && state.data) $('#gridCheck').click();
    else if (k === 'e' && at(1) && state.data) $('#gridEdit').click();
    else if (k === 'f') done = at(11) ? clickIf('#btnPngs') : at(7) ? clickIf('#figPrevPng') : at(9) ? clickIf('#flowPng') : false;
    else if (k === 'w') done = at(11) ? clickIf('#btnDocx') : at(10) ? clickIf('#xpWord') : false;
    else if (k === 'x') done = at(11) ? clickIf('#btnXlsx') : at(10) ? clickIf('#xpXlsx') : false;
    else if (k === 'v' && at(10)) { const sel = $('#xpView'); sel.selectedIndex = (sel.selectedIndex + 1) % sel.options.length; sel.dispatchEvent(new Event('change')); toast(`View: ${sel.options[sel.selectedIndex].text}`); }
    else done = false;
    if (done) e.preventDefault();
  });
  $('#btnNew').onclick = () => {
    if (state.data && !confirm('Start a new project? The current data and settings are cleared (save the project first to keep them).')) return;
    Object.assign(state, { file: null, wb: null, sheet: null, data: null, cfg: null, result: null, pendingCfg: null, pendingEdits: null, undo: [], redo: [], messy: null });
    try { localStorage.removeItem(AUTOSAVE_KEY); } catch (e) { /* ignore */ }
    $('#sheetBox').style.display = 'none'; $('#fileName').textContent = ''; $('#studyTitle').value = ''; $('#file').value = '';
    $('#to2').disabled = true; $('#report').innerHTML = '';
    go(1); toast('New project — upload an Excel file or open an example');
  };

  /* ---------- save / load setup ---------- */
  $('#btnSaveCfg').onclick = () => {
    if (!state.cfg) { toast('Load an Excel file first'); return; }
    readUiIntoCfg();
    const blob = new Blob([JSON.stringify({ app: 'ProfMSE-EasyStat', version: 1, headers: state.data.headers, cfg: state.cfg }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'EasyStat setup.json'; a.click();
    toast('Setup saved');
  };
  $('#cfgFile').onchange = async e => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const j = JSON.parse(await f.text());
      if (j.app !== 'ProfMSE-EasyStat') throw new Error('not an Easy Stat setup file');
      if (state.data) { applySavedCfg(j.cfg); go(2); toast('Setup applied'); }
      else { state.pendingCfg = j.cfg; toast('Setup loaded — now upload the Excel file'); }
    } catch (err) { toast('Could not load setup: ' + err.message); }
    e.target.value = '';
  };
  function applySavedCfg(saved) {
    const h = state.data.headers;
    const ok = saved.variables.every(v => v.cols.every(c => h.includes(c.col))) && h.includes(saved.groupCol);
    if (!ok) { toast('Saved setup does not match this file’s columns — using auto-detection'); return; }
    saved.options = { ...defaultOptions(), ...saved.options };
    saved.tpInclude = saved.tpInclude || {}; saved.advanced = saved.advanced || []; saved.exportExclude = saved.exportExclude || {}; // setups saved by older versions lack the newer options
    state.cfg = saved;
    $('#studyTitle').value = saved.study.title || ''; $('#software').value = saved.study.software;
    // keep any new group values found in this file
    const cur = []; state.data.rows.forEach(r => { const g = Analysis.groupOf(saved, r); if (g !== null && !cur.includes(g)) cur.push(g); });
    cur.forEach(g => { if (!saved.groupOrder.includes(g)) { saved.groupOrder.push(g); saved.groupLabels[g] = groupName(g); saved.groupInclude[g] = true; } });
    saved.groupOrder = saved.groupOrder.filter(g => cur.includes(g));
    state.pendingCfg = null;
  }

  /* ---------- light / dark theme ---------- */
  function setTheme(t) {
    document.documentElement.dataset.theme = t;
    try { localStorage.setItem('easystat-theme', t); } catch (e) { /* storage unavailable */ }
  }
  let savedTheme = null;
  try { savedTheme = localStorage.getItem('easystat-theme'); } catch (e) { /* storage unavailable */ }
  setTheme(savedTheme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));
  $('#btnTheme').onclick = () => setTheme(document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark');

  renderStepper();
  window.EasyStat = state; // for debugging
})();

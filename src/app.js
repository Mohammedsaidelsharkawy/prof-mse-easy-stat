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
    commentStyle: 'concise', notSig: false, tableStyle: 'grid', font: 'Times New Roman', correlation: false, sigMarks: true, points: false,
    figures: 'all', errorBar: 'sd', figWidth: 'full', figPerRow: 1, valueLabels: false,
    chartText: 'normal', chartAspect: 'wide', barFill: 'gradient', yAxis: 'auto', legendPos: 'bottom', chartRes: 1,
    gridlines: true, axisArrows: true, nLabels: false, legendSize: 'normal', legendTitle: '', legendFrame: false,
    welch: false, dunn: false, chiPost: false, mixed: false, normality: 'sw', catEffect: 'rr',
    figPlacement: 'after', captionStyle: 'colon', chartTitle: false,
    pctDecimals: 1, meanStyle: 'pm', iqrStyle: 'dash', secondRow: 'auto', pDigits: 3, pHead: 'P value', sigSym: '*', showStat: false, missingNote: false,
    orientation: 'portrait', tableCaption: 'colon', pWord: 'P value', commentPlace: 'after', commentEffect: false, summary: false, barWidth: 'normal', boxMean: false,
    pLead: 1, totalCol: false, nHead: true, boldSig: false, figNotes: true, chartFont: 'sans', testNote: 'none', tableNewPage: false,
    rmPost: 'first', rmAdjust: 'bonferroni', rmSph: 'gg', rmChange: 'none', rmPostAlways: false, rmAuc: false, rmIndividual: false,
    customColors: ['#7B2FBE', '#1C1648', '#B57EDC', '#E08A2E', '#2E9E8F', '#C2185B']
  };
  // option key → [element id, checkbox?]
  const OPTION_FIELDS = {
    decimals: ['optDec'], alpha: ['optAlpha'], chartStyle: ['optChart'], palette: ['optPal'], commentStyle: ['optComment'],
    tableStyle: ['optTable'], font: ['optFont'], effect: ['optEffect', true], within: ['optWithin', true], fisher: ['optFisher', true],
    branding: ['optBrand', true], notSig: ['optNotSig', true], correlation: ['optCorr', true], sigMarks: ['optSigMarks', true], points: ['optPoints', true],
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
    rmPost: ['optRmPost'], rmAdjust: ['optRmAdjust'], rmSph: ['optRmSph'], rmChange: ['optRmChange'], rmPostAlways: ['optRmPostAlways', true], rmAuc: ['optRmAuc', true], rmIndividual: ['optRmIndividual', true]
  };
  const defaultOptions = () => ({ ...DEFAULT_OPTIONS, customColors: [...DEFAULT_OPTIONS.customColors] });
  // chart palette and drawing style from the options
  const chartPalette = o => o.palette === 'custom' ? o.customColors : o.palette;
  const chartStyle = o => ({ text: o.chartText, aspect: o.chartAspect, barFill: o.barFill, yAxis: o.yAxis, legend: o.legendPos, res: o.chartRes, grid: o.gridlines, arrows: o.axisArrows,
    legendSize: o.legendSize, legendTitle: o.legendTitle.trim(), legendFrame: o.legendFrame, barWidth: o.barWidth, boxMean: o.boxMean, font: o.chartFont });

  const state = { file: null, wb: null, sheet: null, data: null, cfg: null, result: null, step: 1, edits: {} };

  /* ---------- helpers ---------- */
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
  const busy = on => $('#busy').classList.toggle('show', on);
  const tokens = name => String(name).trim().split(/[_\s.]+/).filter(Boolean);
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
  const tpLabel = tp => /^(baseline|base|bl)$/i.test(tp) ? 'Baseline' : /^(pre|post|before|after|final|end)$/i.test(tp) ? tp[0].toUpperCase() + tp.slice(1) : tp;

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
    if (n === 3) renderTimepoints();
    if (n >= 4 && n <= 8) renderOptions();
    if (n === 7) renderFigureTable();
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
      state.wb = XLSX.read(buf, { type: 'array' });
      state.file = f.name;
      $('#fileName').textContent = f.name;
      $('#sheetSel').innerHTML = state.wb.SheetNames.map(s => `<option>${esc(s)}</option>`).join('');
      $('#sheetBox').style.display = '';
      selectSheet(state.wb.SheetNames[0]);
    } catch (err) { console.error(err); toast('Could not read this file: ' + err.message); }
    finally { busy(false); }
  }
  $('#sheetSel').onchange = e => selectSheet(e.target.value);

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
  $('#examples').addEventListener('click', e => {
    const o = e.target.closest('[data-exopen]'), d = e.target.closest('[data-exsave]');
    if (d) { const ex = Examples.get(d.dataset.exsave); XLSX.writeFile(exampleBook(ex), ex.id + '.xlsx'); return; }
    if (!o) return;
    const ex = Examples.get(o.dataset.exopen);
    state.wb = exampleBook(ex); state.file = ex.id + '.xlsx'; state.pendingCfg = null;
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
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, blankrows: false });
    if (!aoa.length) { toast('This sheet is empty'); return; }
    const headers = aoa[0].map((h, i) => h === null || h === '' ? `Column_${i + 1}` : String(h).trim());
    const rows = aoa.slice(1).filter(r => r.some(v => v !== null && String(v).trim() !== ''))
      .map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? null])));
    state.sheet = name;
    state.data = { headers, rows };
    state.undo = []; state.grid.page = 0; state.grid.sort = null;
    renderGrid();
    const prevCfg = state.pendingCfg;
    state.cfg = detect(state.data);
    if (prevCfg) applySavedCfg(prevCfg);
    $('#to2').disabled = false;
    renderStepper();
    toast(`Loaded ${rows.length} patients · ${state.cfg.variables.length} variables detected`);
  }
  $('#to2').onclick = () => go(2);

  /* ---------- data grid: preview options, editing and rearranging the sheet ---------- */
  state.grid = { page: 0, per: 10, q: '', onlyMissing: false, hlMissing: true, summary: false, edit: false, sort: null, density: 'normal', hidden: [], types: true, wrap: false, freeze: false, stripes: false };
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
    const idx = rows.map((_, i) => i).filter(i => (!q || headers.some(h => String(rows[i][h] ?? '').toLowerCase().includes(q))) && (!g.onlyMissing || headers.some(h => isMissing(rows[i][h]))));
    const per = g.per === 'all' ? Math.max(1, idx.length) : +g.per, pages = Math.max(1, Math.ceil(idx.length / per));
    g.page = Math.min(g.page, pages - 1);
    const shown = idx.slice(g.page * per, g.page * per + per), cfg = state.cfg;
    const role = h => !cfg ? '' : h === cfg.groupCol && !cfg.noGroups ? '<span class="chip info">group</span>' : cfg.idCols.includes(h) ? '<span class="chip">ID</span>' : '';
    const sortMark = h => g.sort && g.sort.col === h ? (g.sort.dir > 0 ? ' ▲' : ' ▼') : '';
    const head = headers.map((h, ci) => g.edit
      ? `<th class="${cc(h, ci)}"><div class="gh"><input type="text" data-hname="${esc(h)}" value="${esc(h)}" title="Rename column">
          <span class="gh-btns"><button data-hmove="${ci},-1" title="Move left" type="button">◀</button><button data-hmove="${ci},1" title="Move right" type="button">▶</button><button data-hsort="${esc(h)}" title="Sort rows" type="button">⇅</button><button data-hdel="${esc(h)}" title="Delete column" type="button">✕</button></span></div>${role(h)}</th>`
      : `<th data-hsort="${esc(h)}" class="sortable ${cc(h, ci)}" title="Click to sort the rows (Undo in edit mode restores the order)">${esc(h)}${typeTag(h)}${sortMark(h)} ${role(h)}</th>`).join('');
    let summary = '';
    if (g.summary) summary = `<tr class="gsum"><td class="rn">Summary</td>${headers.map((h, ci) => {
      const info = columnInfo(rows, h), miss = rows.length - info.n, nums = rows.map(r => Analysis.toNum(r[h])).filter(isFinite);
      const desc = info.numeric && nums.length ? `num · ${Analysis.fmt(Math.min(...nums), 2)}–${Analysis.fmt(Math.max(...nums), 2)}` : `text · ${info.distinct.length} values`;
      return `<td class="${ci === 0 ? 'c1' : ''}">${desc}<br><span class="${miss ? 'miss-n' : ''}">${miss} missing</span></td>`; }).join('')}</tr>`;
    const body = shown.map(i => `<tr><td class="rn">${i + 1}${g.edit ? `<span class="gr-btns"><button data-rmove="${i},-1" title="Move up" type="button">↑</button><button data-rmove="${i},1" title="Move down" type="button">↓</button><button data-rdel="${i}" title="Delete row" type="button">✕</button></span>` : ''}</td>${
      headers.map((h, ci) => `<td class="${cc(h, ci)}${g.hlMissing && isMissing(rows[i][h]) ? ' miss' : ''}" title="${esc(rows[i][h] ?? '')}"${g.edit ? ` contenteditable="true" data-cell="${i}" data-col="${esc(h)}"` : ''}>${esc(rows[i][h] ?? '')}</td>`).join('')}</tr>`).join('');
    $('#preview').innerHTML = `<thead><tr><th class="rn">#</th>${head}</tr></thead><tbody>${summary}${body || `<tr><td colspan="${headers.length + 1}" class="legend-note">No rows match.</td></tr>`}</tbody>`;
    const rn = tbl.querySelector('th.rn'); if (rn) tbl.style.setProperty('--rnw', rn.getBoundingClientRect().width + 'px');
    $('#gridInfo').textContent = idx.length ? `Rows ${g.page * per + 1}–${Math.min(idx.length, g.page * per + per)} of ${idx.length}${idx.length < rows.length ? ` (filtered from ${rows.length})` : ''}` : '0 rows';
    $('#gridPrev').disabled = g.page === 0; $('#gridNext').disabled = g.page >= pages - 1;
    $('#gridEditBar').style.display = g.edit ? '' : 'none';
    $('#gridUndo').disabled = !state.undo.length;
    $('#gridEdit').classList.toggle('primary', g.edit); $('#gridEdit').classList.toggle('ghost', !g.edit);
    $('#gridEdit').textContent = g.edit ? '✓ Done editing' : '✎ Edit sheet';
  }
  // every change to the sheet goes through here: snapshot for undo, apply, keep the setup in step, redraw
  function editSheet(fn) {
    state.undo.push(JSON.stringify({ data: state.data, cfg: state.cfg }));
    if (state.undo.length > 30) state.undo.shift();
    fn();
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
    else if (b.id === 'gridUndo') {
      const snap = state.undo.pop(); if (!snap) return;
      const o = JSON.parse(snap); state.data = o.data; state.cfg = o.cfg; renderGrid(); renderStepper(); toast('Undone');
    }
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
      editSheet(() => { state.cfg = detect(state.data); });
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
    state.undo.push(JSON.stringify({ data: state.data, cfg: state.cfg }));
    if (state.undo.length > 30) state.undo.shift();
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
    else if (t.dataset.gcol !== undefined) g.hidden = t.checked ? g.hidden.filter(h => h !== t.dataset.gcol) : [...g.hidden, t.dataset.gcol];
    else return;
    renderGrid();
  });
  $('#gridSearch').addEventListener('input', e => { state.grid.q = e.target.value; state.grid.page = 0; renderGrid(); });

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
  const groupN = g => state.data.rows.filter(r => Analysis.groupOf(state.cfg, r) === g).length;

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
    $('#groupsTbl').innerHTML = `<thead><tr><th>Use</th><th>Value in Excel</th><th>Label in report</th><th>n</th><th>Order</th></tr></thead><tbody>${
      cfg.groupOrder.map((g, i) => `<tr><td><input type="checkbox" data-ginc="${esc(g)}" ${cfg.groupInclude[g] !== false ? 'checked' : ''} ${cfg.noGroups ? 'disabled' : ''}></td><td class="mono">${g === Analysis.ALL_GROUP ? '(every row)' : esc(g)}</td>
      <td><input type="text" data-glabel="${esc(g)}" value="${esc(cfg.groupLabels[g])}"></td><td>${groupN(g)}</td>
      <td><button class="btn ghost small" data-gmove="${i},-1">↑</button> <button class="btn ghost small" data-gmove="${i},1">↓</button></td></tr>`).join('')}</tbody>`;
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
    $('#varsTbl').innerHTML = `<thead><tr><th>Use</th><th>Label</th><th>Column(s)</th><th>Type</th><th>Distribution</th><th>Table</th><th>Levels (categories)</th><th>Footnote (abbreviations)</th></tr></thead><tbody>${
      cfg.variables.map(v => `<tr data-vid="${v.id}">
        <td><input type="checkbox" data-k="include" ${v.include ? 'checked' : ''}></td>
        <td><input type="text" data-k="label" value="${esc(v.label)}"></td>
        <td class="mono" title="${esc(v.cols.map(c => c.col).join('\n'))}">${v.kind === 'repeated' ? `<span class="chip info">repeated × ${v.cols.length}</span><div class="tpchks">${v.cols.map((c, i) =>
          `<label title="${esc(c.col)}"><input type="checkbox" data-vtp="${i}" ${c.include !== false ? 'checked' : ''}>${esc(c.label || cfg.tpLabels[c.tp] || c.tp)}</label>`).join('')}</div>` : esc(v.cols[0].col)}</td>
        <td>${v.kind === 'repeated' ? `<select data-k="split" title="Analyse the timepoints together, or each as its own variable"><option value="">repeated measure</option><option value="1" ${v.split ? 'selected' : ''}>separate variables</option></select>` : `<select data-k="type"><option value="numeric" ${v.type === 'numeric' ? 'selected' : ''}>numeric</option><option value="categorical" ${v.type === 'categorical' ? 'selected' : ''}>categorical</option></select>`}</td>
        <td>${v.type === 'numeric' ? `<select data-k="dist"><option value="auto" ${v.dist === 'auto' ? 'selected' : ''}>Auto</option><option value="param" ${v.dist === 'param' ? 'selected' : ''}>Parametric</option><option value="nonparam" ${v.dist === 'nonparam' ? 'selected' : ''}>Non-parametric</option></select><div style="margin-top:4px">${swChip(v)}</div>` : swChip(v)}</td>
        <td>${v.kind === 'repeated' ? (v.split ? `<input type="text" data-k="splitTable" value="${esc(v.splitTable || 'Other outcomes')}">` : '<span class="legend-note">own table</span>') : `<input type="text" data-k="table" value="${esc(v.table)}">`}</td>
        <td>${v.type === 'categorical' ? `<input type="text" data-k="levels" value="${esc(v.levels.join(', '))}">` : '<span class="legend-note">—</span>'}</td>
        <td><input type="text" data-k="note" value="${esc(v.note)}" placeholder="e.g. NRS: Numeric rating scale"></td>
      </tr>`).join('')}</tbody>`;
    renderRepeated();
  }
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
    $('#tpTbl').innerHTML = cfg.tpOrder.length ? `<thead><tr><th>Use</th><th>Token in column names</th><th>Label in report</th><th>Order</th></tr></thead><tbody>${
      cfg.tpOrder.map((t, i) => `<tr><td><input type="checkbox" data-tpinc="${esc(t)}" ${cfg.tpInclude[t] !== false ? 'checked' : ''}></td><td class="mono">${esc(t)}</td>
        <td><input type="text" data-tp="${esc(t)}" value="${esc(cfg.tpLabels[t])}"></td>
        <td><button class="btn ghost small" data-tpmove="${i},-1">↑</button> <button class="btn ghost small" data-tpmove="${i},1">↓</button></td></tr>`).join('')}</tbody>`
      : '<tbody><tr><td>No repeated measures detected.</td></tr></tbody>';
    renderTpVars();
  }
  // option controls of steps 4–8 show the saved options
  function renderOptions() {
    const o = state.cfg.options;
    for (const [k, [id, box]] of Object.entries(OPTION_FIELDS)) $('#' + id)[box ? 'checked' : 'value'] = o[k];
    $('#customColors').innerHTML = o.customColors.map((col, i) => `<input type="color" data-ccol="${i}" value="${esc(col)}" title="Colour ${i + 1}">`).join('');
    $('#customBox').style.display = o.palette === 'custom' ? '' : 'none';
  }

  /* ---------- timepoints per outcome (step 3) ---------- */
  const colTp = c => c.label || state.cfg.tpLabels[c.tp] || c.tp;
  function renderTpVars() {
    const reps = state.cfg.variables.filter(v => v.kind === 'repeated');
    $('#tpVars').innerHTML = reps.length ? reps.map(v => `<div class="gcard" style="margin-bottom:10px"><div class="row"><h4 style="margin:0">${esc(v.label)}</h4><span class="spacer"></span>
        <span class="legend-note">${v.include ? '' : 'not included (step 2) · '}${v.split ? 'analysed as separate variables · ' : ''}${v.ownOrder ? 'own order' : 'shared order'}</span></div>
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
    repeated: [['auto', 'Auto (chart style)'], ['bar', 'Bars'], ['line', 'Lines over time'], ['meanci', 'Means with 95% CI over time'], ['box', 'Box plots'], ['dot', 'Box plots + every patient'], ['violin', 'Violin plots'], ['none', 'No figure']],
    numeric: [['auto', 'Auto'], ['bar', 'Bars (mean ± error / median, IQR)'], ['box', 'Box plot'], ['violin', 'Violin plot'], ['dot', 'Dot plot (every patient)'], ['meanci', 'Mean with 95% CI (error plot)'], ['hist', 'Histogram'], ['none', 'No figure']],
    categorical: [['auto', 'Auto (bars)'], ['hbar', 'Horizontal bars'], ['stacked', '100% stacked bar'], ['pie', 'Donut'], ['piefull', 'Pie'], ['none', 'No figure']]
  };
  const chartKind = v => v.kind === 'repeated' ? 'repeated' : v.type;
  function renderFigureTable() {
    const vars = state.cfg.variables.filter(v => v.include);
    $('#figTbl').innerHTML = `<thead><tr><th>Variable</th><th>Chart type</th><th>Caption (optional)</th><th>Y-axis title (optional)</th><th></th></tr></thead><tbody>${vars.map(v => `<tr>
      <td><b>${esc(v.label)}</b><div class="legend-note">${v.kind === 'repeated' ? 'repeated' : v.type}</div></td>
      <td><select data-fv="${v.id}" data-fk="chart">${CHART_TYPES[chartKind(v)].map(([k, l]) => `<option value="${k}" ${(v.chart || 'auto') === k ? 'selected' : ''}>${l}</option>`).join('')}</select></td>
      <td><input type="text" data-fv="${v.id}" data-fk="caption" value="${esc(v.caption || '')}" placeholder="${esc(v.label)} of the studied groups"></td>
      <td><input type="text" data-fv="${v.id}" data-fk="ylabel" value="${esc(v.ylabel || '')}" placeholder="${esc(v.type === 'categorical' ? '% of the studied patients' : v.label)}"></td>
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
      renderFigure(f, cfg.options);
      const img = new Image();
      img.onload = () => { cv.width = img.width; cv.height = img.height; cv.getContext('2d').drawImage(img, 0, 0); };
      img.src = f.url;
      $('#figPrevNote').textContent = `${Report.figLabel(1, cfg.options.captionStyle)} ${f.caption}`;
    } catch (err) { console.error(err); $('#figPrevNote').textContent = 'Preview failed: ' + err.message; }
  }
  $('#p7').addEventListener('input', schedulePreview);
  $('#p7').addEventListener('change', schedulePreview);
  $('#figTbl').addEventListener('click', e => { const b = e.target.closest('[data-fprev]'); if (b) { $('#figPrevVar').value = b.dataset.fprev; schedulePreview(); } });

  $('#tpTbl').addEventListener('click', e => {
    const b = e.target.closest('[data-tpmove]'); if (!b) return;
    readUiIntoCfg();
    const [i, d] = b.dataset.tpmove.split(',').map(Number), o = state.cfg.tpOrder, j = i + d;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]]; renderTimepoints();
  });

  /* ---------- advanced analyses (regression, ROC) ---------- */
  const ADV_TYPES = { correlation: 'Correlation (Pearson / Spearman)', linear: 'Linear regression', logistic: 'Logistic regression', roc: 'ROC curve', ancova: 'ANCOVA (adjusted group comparison)', survival: 'Kaplan-Meier survival',
    cox: 'Cox regression (hazard ratios)', mcnemar: 'McNemar test (paired categorical)', kappa: "Cohen's kappa (agreement, categorical)",
    agreement: 'ICC + Bland-Altman (agreement, numeric)', diagnostic: 'Diagnostic accuracy (2×2)', cronbach: "Cronbach's alpha (reliability)" };
  const analysedRows = () => { const g = activeGroups(); return state.data.rows.filter(r => g.includes(Analysis.groupOf(state.cfg, r))); };
  function advColumns() {
    const cfg = state.cfg, rows = analysedRows();
    return state.data.headers.filter(h => !cfg.idCols.includes(h)).map(h => ({ col: h, label: Analysis.columnLabel(cfg, h), kind: Analysis.columnKind(cfg, rows, h) }));
  }
  function defaultPositive(col) {
    const lv = Analysis.levelsOf(state.cfg, analysedRows(), col);
    return lv.find(l => Analysis.POSITIVE.test(l) || /^(dead|death|died|event|relapse|recurrence)$/i.test(l)) || lv[lv.length - 1] || '';
  }
  function renderAdvanced() {
    const cfg = state.cfg, cols = advColumns(), rows = analysedRows();
    const isCat = c => c.kind === 'categorical' && Analysis.levelsOf(cfg, rows, c.col).length >= 2;
    const select = (key, label, list, value) => `<div><label class="f">${label}</label><select data-af="${key}"><option value="">— choose —</option>${
      list.map(c => `<option value="${esc(c.col)}" ${c.col === value ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></div>`;
    const levelSelect = (label, col, value, key = 'positive') => `<div><label class="f">${label}</label><select data-af="${key}">${
      (col ? Analysis.levelsOf(cfg, rows, col) : []).map(l => `<option ${l === value ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
    $('#advList').innerHTML = cfg.advanced.length ? cfg.advanced.map((a, ai) => {
      const t = a.type, num = cols.filter(c => c.kind === 'numeric');
      let fields = '', predLabel = '', preds = [];
      if (t === 'linear') { fields = select('outcome', 'Dependent variable (outcome)', num, a.outcome) + '<div></div>'; predLabel = 'Predictors (independent variables)'; preds = cols; }
      if (t === 'logistic') { fields = select('outcome', 'Dependent variable (outcome)', cols.filter(isCat), a.outcome) + levelSelect('Positive (event) value', a.outcome, a.positive); predLabel = 'Predictors (independent variables)'; preds = cols; }
      if (t === 'roc') { fields = select('outcome', 'Outcome (true state)', cols.filter(isCat), a.outcome) + levelSelect('Positive (event) value', a.outcome, a.positive); predLabel = 'Test variables (numeric)'; preds = num; }
      if (t === 'ancova') { fields = select('outcome', 'Outcome compared between the study groups', num, a.outcome) + '<div></div>'; predLabel = 'Covariates to adjust for (e.g. the baseline value, age)'; preds = cols.filter(c => c.col !== cfg.groupCol); }
      if (t === 'survival') fields = select('outcome', 'Follow-up time', num, a.outcome) + select('event', 'Event column', cols.filter(isCat), a.event)
        + levelSelect('Event value (others are censored)', a.event, a.positive)
        + `<div><label class="f">Survival at time (optional)</label><input type="text" data-af="at" value="${esc(a.at || '')}" placeholder="e.g. 12"></div>`;
      const cat = cols.filter(isCat);
      if (t === 'cox') { fields = select('outcome', 'Follow-up time', num, a.outcome) + select('event', 'Event column', cat, a.event) + levelSelect('Event value (others are censored)', a.event, a.positive); predLabel = 'Predictors (covariates, e.g. group, age, stage)'; preds = cols.filter(c => c.col !== a.event); }
      if (t === 'mcnemar') fields = select('outcome', 'First measurement (e.g. before)', cat, a.outcome) + select('second', 'Second measurement (e.g. after)', cat.filter(c => c.col !== a.outcome), a.second) + levelSelect('Category to report', a.outcome, a.positive);
      if (t === 'kappa') fields = select('outcome', 'Rater / method A', cat, a.outcome) + select('second', 'Rater / method B', cat.filter(c => c.col !== a.outcome), a.second);
      if (t === 'agreement') fields = select('outcome', 'Method / rater A', num, a.outcome) + select('second', 'Method / rater B', num.filter(c => c.col !== a.outcome), a.second);
      if (t === 'diagnostic') fields = select('outcome', 'Reference standard (true diagnosis)', cat, a.outcome) + levelSelect('Condition present when', a.outcome, a.positive)
        + select('event', 'Index test (categorical result)', cat.filter(c => c.col !== a.outcome), a.event) + levelSelect('Test positive when', a.event, a.eventPositive, 'eventPositive');
      if (t === 'correlation') { fields = select('outcome', 'Main variable (optional — correlated with each ticked variable)', cols.filter(c => Analysis.isNumberColumn(rows, c.col)), a.outcome)
        + '<p class="legend-note" style="margin:22px 0 0">Leave the main variable empty to correlate every pair of the ticked variables.</p>'; predLabel = 'Variables (numeric or ordinal scores)'; preds = cols.filter(c => Analysis.isNumberColumn(rows, c.col)); }
      if (t === 'cronbach') { fields = '<p class="legend-note" style="margin:0">Tick the questionnaire items (numeric scores). Patients with any missing item are left out.</p>'; predLabel = 'Items'; preds = cols.filter(c => Analysis.isNumberColumn(rows, c.col)); }
      const withPreds = ['linear', 'logistic', 'roc', 'ancova', 'cox', 'cronbach', 'correlation'].includes(t);
      const uni = t === 'linear' || t === 'logistic' || t === 'cox' ? `<div><label class="check" style="margin-top:24px"><input type="checkbox" data-af="univariable" ${a.univariable ? 'checked' : ''}><span>Also show univariable results</span></label></div>` : '';
      return `<div class="gcard" data-adv="${ai}">
        <div class="row"><h4 style="margin:0">${ai + 1}. ${ADV_TYPES[t]}</h4><span class="spacer"></span>
          <label class="check" style="margin:0"><input type="checkbox" data-af="include" ${a.include !== false ? 'checked' : ''}><span>Include</span></label>
          <button class="btn ghost small" data-advdel="${ai}" type="button">✕ Remove</button></div>
        <div class="grid g3" style="margin-top:8px">${fields}${uni}</div>
        <div class="grid g4 adv-opts">${advOptions(a)}</div>
        ${t === 'survival' ? '<p class="legend-note" style="margin:6px 0 0">Curves are drawn for each study group; patients without the event are censored at their follow-up time.</p>' : t === 'mcnemar' ? '<p class="legend-note" style="margin:6px 0 0">Tested in each study group and in all patients together.</p>' : !withPreds ? '' : `
        <label class="f" style="margin-top:8px">${predLabel}</label>
        <div class="predlist">${preds.filter(c => c.col !== a.outcome).map(c => `<label><input type="checkbox" data-apred="${esc(c.col)}" ${(a.predictors || []).includes(c.col) ? 'checked' : ''}>${esc(c.label)} <span class="legend-note">${c.kind === 'numeric' ? 'num' : 'cat'}</span></label>`).join('')}</div>`}
      </div>`;
    }).join('') : '<p class="legend-note">No advanced analyses yet — add one below.</p>';
  }
  // per-analysis options: title, patients (subset), variable selection and type-specific extras
  function advOptions(a) {
    const t = a.type, sel = (key, opts, v) => `<select data-af="${key}">${opts.map(([k, l]) => `<option value="${esc(k)}" ${(v || opts[0][0]) === k ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
    const box = (key, label) => `<label class="check" style="margin-top:22px"><input type="checkbox" data-af="${key}" ${a[key] ? 'checked' : ''}><span>${label}</span></label>`;
    const out = [`<div><label class="f">Title (optional)</label><input type="text" data-af="title" value="${esc(a.title || '')}" placeholder="automatic"></div>`];
    if (!['ancova', 'survival', 'mcnemar'].includes(t))
      out.push(`<div><label class="f">Patients</label>${sel('subset', [['all', 'All patients'], ['each', 'Each group separately'], ...activeGroups().map(g => [g, 'Only ' + (state.cfg.groupLabels[g] || g)])], a.subset)}</div>`);
    if (['linear', 'logistic', 'cox'].includes(t))
      out.push(`<div><label class="f">Variable selection (multivariable)</label>${sel('method', [['enter', 'Enter — all predictors'], ['backward', 'Backward elimination (P > 0.10 out)'], ['forward', 'Forward selection (P < 0.05 in)']], a.method)}</div>`);
    if (t === 'correlation') out.push(`<div><label class="f">Coefficient</label>${sel('method', [['auto', 'Automatic (Pearson if normal, else Spearman)'], ['pearson', 'Pearson'], ['spearman', 'Spearman']], a.method)}</div>`,
      `<div><label class="f">Table layout</label>${sel('layout', [['auto', 'Automatic'], ['matrix', 'Matrix'], ['pairs', 'List of pairs']], a.layout)}</div>`,
      `<div><label class="f">Scatter plots of significant pairs</label>${sel('scatter', [['2', 'Up to 2'], ['0', 'None'], ['1', 'Up to 1'], ['4', 'Up to 4'], ['all', 'All']], a.scatter)}</div>`,
      `<div>${box('ci', '95% CI of the coefficients')}</div>`);
    if (t === 'linear') out.push(`<div>${box('vif', 'Collinearity (VIF)')}</div>`);
    if (t === 'logistic') out.push(`<div>${box('hl', 'Hosmer-Lemeshow goodness of fit')}</div>`);
    if (t === 'logistic') out.push(`<div>${box('classTable', 'Classification table (sensitivity / specificity)')}</div>`);
    if (t === 'linear' || t === 'logistic') out.push(`<div>${box('constant', 'Show the constant')}</div>`);
    if (t === 'roc') {
      out.push(`<div><label class="f">Optimal cut-off</label>${sel('cutoff', [['youden', 'Youden index'], ['closest', 'Closest to top-left corner'],
        ['sens80', 'Sensitivity ≥ 80% (best specificity)'], ['sens90', 'Sensitivity ≥ 90% (best specificity)'], ['sens95', 'Sensitivity ≥ 95% (best specificity)'],
        ['spec80', 'Specificity ≥ 80% (best sensitivity)'], ['spec90', 'Specificity ≥ 90% (best sensitivity)'], ['spec95', 'Specificity ≥ 95% (best sensitivity)'],
        ['manual', 'My own cut-off value']], a.cutoff)}</div>`);
      if (a.cutoff === 'manual') out.push(`<div><label class="f">Cut-off value (positive when ≥, or ≤ for lower values)</label><input type="text" data-af="manualCut" value="${esc(a.manualCut || '')}" placeholder="e.g. 2.5"></div>`);
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
  $('#advAdd').addEventListener('click', e => {
    const b = e.target.closest('[data-advadd]'); if (!b) return;
    readUiIntoCfg();
    state.cfg.advanced.push({ type: b.dataset.advadd, outcome: '', positive: '', predictors: [], univariable: ['logistic', 'cox'].includes(b.dataset.advadd), include: true });
    renderAdvanced();
  });
  $('#advList').addEventListener('click', e => {
    const b = e.target.closest('[data-advdel]'); if (!b) return;
    readUiIntoCfg(); state.cfg.advanced.splice(+b.dataset.advdel, 1); renderAdvanced();
  });
  $('#advList').addEventListener('change', e => {
    const f = e.target.dataset.af;
    if (f === 'cutoff') { readUiIntoCfg(); renderAdvanced(); return; }
    if (f !== 'outcome' && f !== 'event' && f !== 'second') return;
    readUiIntoCfg();
    const a = state.cfg.advanced[+e.target.closest('[data-adv]').dataset.adv];
    a.predictors = (a.predictors || []).filter(c => c !== a.outcome);
    // the positive value belongs to the outcome (logistic, ROC) or to the event column (survival)
    if (a.type === 'survival' || a.type === 'cox') { if (f === 'event') a.positive = defaultPositive(a.event); }
    else if (a.type === 'diagnostic') { if (f === 'event') a.eventPositive = defaultPositive(a.event); else a.positive = defaultPositive(a.outcome); }
    else a.positive = ['logistic', 'roc', 'mcnemar'].includes(a.type) ? defaultPositive(a.outcome) : '';
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
    simple: 'A simple flowchart: a chain of steps, each with an optional exclusion box, optionally split into the study groups at the end.'
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
    return c;
  }
  const num = (attrs, v) => `<input type="number" min="0" ${attrs} value="${+v || 0}">`;
  // assessed / potentially eligible = all excluded + all groups (CONSORT, STROBE) or + those who received the index test (STARD)
  function syncAssessed(c) {
    if (c.type === 'simple') return;
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
        : k === 'pillMode' ? (fsv.pillColor ? 'custom' : 'theme') : k === 'pillColor' ? (fsv.pillColor || fsv.color || accent0) : fsv[k];
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
    if (t === 'consort' || t === 'strobe') {
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
    $('#cForm').innerHTML = html;
    drawConsortPreview();
  }
  const FLOW_STYLE = { theme: 'classic', color: '', corners: 'square', lines: 'normal', textSize: 'normal', font: 'sans', pills: true, shadow: false, pillColor: '', pillTextColor: '#ffffff', labels: {} };
  function readConsort() {
    const c = state.cfg && state.cfg.consort; if (!c || !$('#cForm').innerHTML) return;
    c.enabled = $('#cEnabled').checked;
    // appearance: the custom colour applies only when "Custom" is chosen
    const st = {}; document.querySelectorAll('#p9 [data-fs]').forEach(el => { st[el.dataset.fs] = el.type === 'checkbox' ? el.checked : el.value; });
    const labels = { ...((c.style || {}).labels || {}) };
    if (c.type !== 'simple') labels[c.type] = [...document.querySelectorAll('#p9 [data-fsl]')].map(el => el.value);
    c.style = { theme: st.theme, color: st.colorMode === 'custom' ? st.color : '', corners: st.corners, lines: st.lines, textSize: st.textSize, font: st.font, pills: st.pills, shadow: st.shadow,
      pillColor: st.pillMode === 'custom' ? st.pillColor : '', pillTextColor: st.pillTextColor, labels };
    const val = el => el.type === 'checkbox' ? el.checked : el.type === 'number' ? (+el.value || 0) : el.value;
    document.querySelectorAll('#cForm [data-c]').forEach(el => { c[el.dataset.c] = val(el); });
    document.querySelectorAll('#cForm [data-ex]').forEach(el => { c.excluded[+el.dataset.ex][el.dataset.f] = val(el); });
    document.querySelectorAll('#cForm [data-cg]').forEach(el => { const g = c.groups[+el.dataset.cg]; if (g) g[el.dataset.f] = val(el); });
    document.querySelectorAll('#cForm [data-sd]').forEach(el => { c.stard[el.dataset.sd] = val(el); });
    document.querySelectorAll('#cForm [data-sb]').forEach(el => { c.stard.branches[+el.dataset.sb][el.dataset.f] = val(el); });
    document.querySelectorAll('#cForm [data-st]').forEach(el => { c.steps[+el.dataset.st][el.dataset.f] = val(el); });
    syncAssessed(c);
  }
  function drawConsortPreview() {
    const c = state.cfg.consort, gl = activeGroups().map(g => state.cfg.groupLabels[g]);
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
  $('#cType').addEventListener('change', e => { readConsort(); state.cfg.consort.type = e.target.value; renderConsortForm(); });
  $('#cForm').addEventListener('click', e => {
    const c = state.cfg.consort, b = e.target.closest('[data-cact],[data-exdel],[data-stdel]'); if (!b) return;
    readConsort();
    if (b.dataset.cact === 'addEx') c.excluded.push({ text: 'Other reasons', n: 0 });
    else if (b.dataset.cact === 'addStep') c.steps.push({ text: 'Next step', n: 0, exText: '', exN: 0 });
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
      document.querySelectorAll('#figTbl [data-fv]').forEach(el => { const v = cfg.variables.find(x => x.id === el.dataset.fv); if (v) v[el.dataset.fk] = el.value.trim(); });
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
  function htmlTable(head, rows) {
    const h = head.map(c => typeof c === 'string' ? { t: c } : c);
    const o = state.cfg.options;
    return `<table class="rt ${o.tableStyle === 'apa' ? 'apa' : ''}" style="font-family:'${esc(o.font)}',serif"><thead><tr>${h.map(c => `<th ${c.span ? `colspan="${c.span}"` : ''}>${esc(c.t)}</th>`).join('')}</tr></thead><tbody>${
      rows.map((r, ri) => `<tr>${r.map(c => `<td ${c.rs > 1 ? `rowspan="${c.rs}"` : ''} ${c.span > 1 ? `colspan="${c.span}"` : ''} class="${c.b ? 'b' : ''} ${c.small ? 's' : ''} ${ri + (c.rs || 1) === rows.length ? 'last' : ''}">${(c.t || []).map(esc).join('<br>')}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }

  /* ---------- step 10: results by variable — every statistic and candidate test, for checking before the report ---------- */
  const tblHtml = t => `<div class="xp-tbl"><h4>${esc(t.title)}</h4><div style="overflow-x:auto"><table class="t xp"><thead><tr>${t.head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${
    t.rows.map(r => `<tr>${r.map((c, i) => `<td class="${i === 0 ? 'b' : ''}${/\*$/.test(c) ? ' sig' : ''}${c === '✓' ? ' used' : ''}">${esc(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></div>`;
  // options of the stage, saved with the setup / project
  const XP_DEFAULT = { type: 'all', q: '', sig: false, desc: true, extra: false, tests: true, pairs: true, time: true, fig: 'auto', out: '1.5', dec: '', openData: false, wordData: false };
  const xpo = () => (state.cfg.explore = { ...XP_DEFAULT, ...(state.cfg.explore || {}) });
  function renderXpOpts() {
    const o = xpo();
    document.querySelectorAll('[data-xo]').forEach(el => { const v = o[el.dataset.xo]; el.type === 'checkbox' ? (el.checked = !!v) : (el.value = v); });
  }
  $('#xpOpts').addEventListener('input', e => {
    const k = e.target.dataset.xo; if (!k) return;
    const o = xpo(); o[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
    // the statistics themselves change with these; the rest only filters what is shown
    if (['extra', 'fig', 'out', 'dec'].includes(k)) renderExplore(); else drawExplore();
  });
  // the variables shown: type, search and "significant only"
  const xpList = () => {
    const x = state.explore, o = xpo(), q = o.q.trim().toLowerCase(), id = $('#xpVar').value;
    return x.items.filter(it => (!id || it.id === id) && (o.type === 'all' || it.kind === o.type) && (!q || it.label.toLowerCase().includes(q)) && (!o.sig || it.sig));
  };
  const xpTables = it => { const o = xpo(); return it.tables.filter(t => !t.cat || o[t.cat] !== false); };
  function renderExplore() {
    const box = $('#explore'); if (!state.cfg) return;
    const o = xpo(); renderXpOpts();
    let x;
    try { x = Analysis.explore(state.data, state.cfg, { dec: o.dec, extra: o.extra, fig: o.fig === 'none' ? 'auto' : o.fig, out: o.out }); } catch (err) { console.error(err); box.innerHTML = `<p style="color:var(--bad)">${esc(err.message)}</p>`; return; }
    state.explore = x;
    const sel = $('#xpVar'), cur = sel.value, kinds = { numeric: 'numeric', categorical: 'categorical', repeated: 'repeated' };
    sel.innerHTML = `<option value="">All variables (${x.items.length})</option>` + x.items.map(it => `<option value="${esc(it.id)}">${esc(it.label)} — ${kinds[it.kind]}</option>`).join('');
    if (x.items.some(it => it.id === cur)) sel.value = cur;
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
  function drawExplore() {
    const x = state.explore; if (!x) return;
    const list = xpList(), o = state.cfg.options, figs = $('#xpFigs').checked && xpo().fig !== 'none';
    if (xpo().openData) list.forEach(it => state.xpOpen.add(it.id));
    $('#explore').innerHTML = list.length ? list.map(it => {
      let img = '';
      if (figs && it.spec) { try { img = `<img class="xp-fig" src="${Charts.draw(it.spec, chartPalette(o), { ...chartStyle(o), res: 1 }).toDataURL('image/png')}" alt="">`; } catch (e) { /* no figure */ } }
      return `<div class="report-sec xp-item"><div class="row"><h3 style="margin:0">${esc(it.label)}</h3><span class="chip info">${it.kind}</span><span class="spacer"></span><span class="legend-note">${esc(it.summary)}</span></div>
        <div class="xp-body">${img}<div class="xp-tables">${xpTables(it).map(tblHtml).join('')}</div></div>
        <details class="xp-data" data-xpdata="${esc(it.id)}"${state.xpOpen.has(it.id) ? ' open' : ''}><summary>Data of each group — every patient's value</summary>${state.xpOpen.has(it.id) ? dataHtml(it) : ''}</details></div>`;
    }).join('') : `<p class="legend-note">${x.items.length ? 'No variable matches the options (type, search, significant only).' : 'No variables are ticked in step 2.'}</p>`;
    $('#xpUndo').disabled = !state.undo || !state.undo.length;
  }
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
    state.undo.push(JSON.stringify({ data: state.data, cfg: state.cfg }));
    if (state.undo.length > 30) state.undo.shift();
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
  $('#xpUndo').onclick = () => {
    const snap = state.undo.pop(); if (!snap) return;
    const o = JSON.parse(snap); state.data = o.data; state.cfg = o.cfg;
    const y = window.scrollY; renderExplore(); renderGrid(); window.scrollTo(0, y); toast('Undone');
  };
  $('#xpWord').onclick = async () => {
    const x = state.explore; if (!x) return;
    busy(true);
    try {
      const list = xpList(), o = state.cfg.options, figs = $('#xpFigs').checked && xpo().fig !== 'none';
      const idc = state.cfg.idCols[0], rows = state.data.rows;
      // optional: each group's patients and values after the results
      const dataTables = it => activeGroups().map(g => {
        const idx = rows.map((r, i) => i).filter(i => Analysis.groupOf(state.cfg, rows[i]) === g);
        return { title: `Data — ${state.cfg.groupLabels[g] || g} (n=${idx.length})`, head: ['#', ...(idc ? [idc] : []), ...it.cols.map(c => c.label)],
          rows: idx.map(i => [String(i + 1), ...(idc ? [String(rows[i][idc] ?? '')] : []), ...it.cols.map(c => String(rows[i][c.col] ?? ''))]) };
      });
      const items = list.map(it => {
        const out = { label: it.label, summary: it.summary, tables: [...xpTables(it), ...(xpo().wordData ? dataTables(it) : [])] };
        if (figs && it.spec) { try { const c = Charts.draw(it.spec, chartPalette(o), chartStyle(o)); Object.assign(out, { url: c.toDataURL('image/png'), w: c.width, h: c.height }); } catch (e) { /* no figure */ } }
        return out;
      });
      const blob = await Report.buildResults({ items }, { title: 'Results by variable', subtitle: [state.cfg.study.title, `${state.data.rows.length} patients · ${x.k > 1 ? x.groups.join(', ') : 'one group'}`].filter(Boolean).join(' — '), font: o.font });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
      a.download = (state.file || 'data').replace(/\.[^.]+$/, '').replace(/ \(example\)$/, '') + ' - Results by variable.docx';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast('Results by variable downloaded');
    } catch (err) { console.error(err); toast('Word export failed: ' + err.message); }
    finally { busy(false); }
  };
  $('#xpVar').onchange = drawExplore;
  $('#xpFigs').onchange = drawExplore;
  $('#xpCopy').onclick = async () => {
    // all tables as tab-separated text, ready to paste into Excel or Word
    const x = state.explore; if (!x) return;
    const list = xpList();
    const txt = list.map(it => [it.label, ...xpTables(it).map(t => [t.title, t.head.join('\t'), ...t.rows.map(r => r.join('\t'))].join('\n'))].join('\n\n')).join('\n\n\n');
    try { await navigator.clipboard.writeText(txt); toast('Tables copied — paste them into Excel or Word'); } catch (e) { toast('Copying is blocked in this browser'); }
  };

  /* ---------- report format: thesis, journal paper, or as configured ---------- */
  const DEFAULT_REPORT = { format: 'custom', chapter: '', sectionHeads: true, maxFigs: 3, abstract: true, style: 'none', newPage: true, nonSig: false, tabStart: 1, figStart: 1 };
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
    $('#fmtStyle').value = JOURNAL_STYLES[r.style] ? r.style : 'none'; $('#fmtStyleNote').textContent = (JOURNAL_STYLES[r.style] || JOURNAL_STYLES.none).note;
  }
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
        // a journal style's P wording also goes into the table footnotes
        if (report().style !== 'none' && cfg.options.pWord !== 'P value') res.sections.forEach(s => { s.footnote = s.footnote.replace(/\bP value\b/g, cfg.options.pWord); });
        // P values without the leading zero: also the significance level in the footnotes
        if (+cfg.options.pLead === 0) res.sections.forEach(s => { s.footnote = s.footnote.replace(/(P value|\bP|\bp) ([≤<]) 0\./g, '$1 $2 .'); });
        if (cfg.options.midDot) midDots(res);
        res.sections.forEach(s => { s.key = s.title; s.figures.forEach(f => {
          f.key = f.caption; renderFigure(f, cfg.options);
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
      if (series.some(s => s.err && s.err.some(v => v !== null && v !== undefined))) out.push(`${what} show the mean; error bars show ${err}.`);
      else if (series.some(s => s.lo)) out.push(`${what} show the median; error bars show the interquartile range (IQR).`);
    }
    if (spec.individual) out.push('Thin lines show individual patients.');
    if (spec.type === 'box') {
      out.push('Boxes show the median and interquartile range (IQR); whiskers extend to the most extreme values within 1.5 × IQR, and points beyond them are outliers.');
      if (o.boxMean) out.push('◆ marks the mean.');
      if (spec.points) out.push('Each dot is one patient.');
    }
    if (spec.type === 'violin') out.push(`Violins show the distribution of the values (kernel density); the inner bar shows the interquartile range (IQR), the white dot the median and the line the range within 1.5 × IQR.${o.boxMean ? ' ◆ marks the mean.' : ''}${spec.points ? ' Each dot is one patient.' : ''}`);
    if (spec.type === 'dot') out.push(`Each dot is one patient; the line and whiskers show the ${spec.median ? 'median and IQR' : 'mean ± SD'}.`);
    if (spec.type === 'roc') out.push([spec.diagonal === false ? '' : 'The dashed diagonal is the line of no discrimination (AUC = 0.5).', spec.fill && series.length === 1 ? 'The shaded region is the area under the curve.' : '',
      series.some(s => s.cut) ? 'Circles mark the chosen cut-off values.' : ''].filter(Boolean).join(' '));
    if (spec.type === 'km') out.push('Vertical ticks mark censored patients.');
    if (spec.type === 'ba') out.push('The middle line shows the mean difference (bias) and the dashed lines the 95% limits of agreement (mean ± 1.96 SD).');
    if (['bar', 'line', 'box', 'dot', 'violin'].includes(spec.type)) {
      const ps = [...(spec.sig || []).map(q => q.p), ...(spec.sigCat || [])].filter(p => p <= spec.alpha);
      if (ps.length) {
        const lv = [`*${P} ≤ ${+o.pLead === 0 ? String(spec.alpha).replace(/^0\./, '.') : spec.alpha}`];
        if (ps.some(p => p <= 0.01)) lv.push(`**${P} ≤ 0.01`);
        if (ps.some(p => p <= 0.001)) lv.push(`***${P} ≤ 0.001`);
        out.push(`${lv.join(', ')} (${spec.sig ? 'brackets: comparison between the groups' : spec.sigWhat ? `compared with ${spec.sigWhat}` : 'difference between the groups at that time'}).`);
      }
    }
    return out.filter(Boolean).join(' ');
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
    if (plan.paper && plan.rep.abstract && !r.abstractEdited) r.abstract = abstractResults(r);
    let html = '';
    html += `<div class="row exp-bar"><b>In the Word file:</b> <span class="legend-note">untick any section, table or figure to leave it out — numbering follows what is kept.</span><span class="spacer"></span>
      <button class="btn ghost small" data-exall="1" type="button">Include all</button><button class="btn ghost small" data-exall="0" type="button">Exclude all</button></div>`;
    const off = key => isOut(key) ? ' off' : '';
    if (plan.paper && plan.rep.abstract) html += `<div class="report-sec"><h3>Results for the abstract</h3><textarea id="edAbstract">${esc(r.abstract)}</textarea><div class="legend-note">${words(r.abstract)} words</div></div>`;
    html += `<div class="report-sec${off('methods')}"><div class="row"><h3>Statistical analysis</h3><span class="spacer"></span>${exBox('methods', 'Include')}</div><textarea id="edMethods">${esc(r.methods)}</textarea>${plan.paper ? `<div class="legend-note">${words(r.methods)} words</div>` : ''}</div>`;
    html += `<div class="report-sec"><h3>Results</h3>`;
    if (r.consort) html += `<div class="${off('consort')}"><div class="row"><span class="spacer"></span>${exBox('consort', 'Include flowchart and its text')}</div><textarea id="edIntro">${esc(r.intro)}</textarea><img src="${r.consort.url}" class="consort-prev" style="margin-top:12px"><div class="cap">${plan.consortOn ? lab(plan.consortNum) : 'Not exported:'} ${esc(r.flowCaption)}</div></div>`;
    if (plan.paper) html += `<label class="f" style="margin-top:12px">Results text (written from the significant results, citing tables and figures — edit freely)</label><textarea id="edNarrative" style="min-height:180px">${esc(r.narrative)}</textarea>
      <div class="legend-note">${words(r.narrative) + words(r.intro)} words in Results · ${words(r.narrative) + words(r.intro) + words(r.methods)} words with the statistical analysis</div>`;
    html += `</div>`;
    const atEnd = o.figPlacement === 'end' || o.figPlacement === 'endType';
    const figHtml = f => {
      const si = r.sections.findIndex(s => s.figures.includes(f)), fi = r.sections[si].figures.indexOf(f), fk = exKey.figure(f);
      const label = isOut(fk) ? 'Not exported:' : plan.kept.has(f) ? lab(plan.figNum.get(f)) : (f.sig === false && !plan.rep.nonSig ? 'Not in the paper (not significant):' : `Not in the paper (limit ${plan.rep.maxFigs}):`);
      const note = f.note !== undefined && (f.note || o.figNotes) ? `<input type="text" class="fcap fnote" data-fnote="${si}:${fi}" value="${esc(f.note)}" title="Explanation of the symbols (printed after the caption)" placeholder="Explanation of the symbols">` : '';
      return `<figure class="${plan.kept.has(f) ? '' : 'off'}"><img src="${f.url}" alt=""><figcaption>${label} <input type="text" class="fcap" data-fcap="${si}:${fi}" value="${esc(f.caption)}" title="Edit the caption">${note}</figcaption>${exBox(fk, 'Figure')}</figure>`;
    };
    r.sections.forEach((s, i) => {
      const tk = exKey.table(s), tOut = isOut(tk), place = o.commentPlace || 'after';
      const comment = plan.paper ? '' : `<label class="f">Comment (editable — ${place === 'none' ? 'not exported: comments are switched off in step 6' : `placed ${place} the table`})</label><textarea data-comment="${i}">${esc(s.comment)}</textarea>`;
      html += `<div class="report-sec"><div class="${off(tk)}"><div class="row"><div class="cap" style="flex:1">${tOut ? 'Not exported:' : `Table ${plan.tabNum.get(s)}${o.tableCaption === 'period' ? '.' : o.tableCaption === 'apa' ? '' : ':'}`} <input type="text" class="fcap" data-ttl="${i}" value="${esc(s.title)}" title="Edit the table title"></div>${exBox(tk, 'Table')}</div>
        ${place === 'before' ? comment : ''}<div style="overflow-x:auto">${htmlTable(s.head, s.rows)}</div>
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

  $('#btnDocx').onclick = async () => {
    if (!state.result) return;
    busy(true);
    try {
      syncEdits();
      const r = exportModel(state.result);
      if (!r.methods && !r.consort && !r.sections.length) { toast('Nothing is selected for export'); return; }
      const o = effOptions(), rp = report();
      const blob = await Report.build(r, { numberPrefix: rp.format === 'thesis' && rp.chapter ? rp.chapter + '.' : '', sectionHeads: rp.format === 'thesis' && rp.sectionHeads, paper: rp.format === 'paper',
        tableNewPage: (rp.format === 'thesis' && rp.newPage) || !!o.tableNewPage, tabStart: +rp.tabStart || 1, figStart: +rp.figStart || 1, italicP: !!o.italicP, title: state.cfg.study.title, branding: o.branding, logo: LOGO, font: o.font, tableStyle: o.tableStyle, figWidth: o.figWidth, figPerRow: o.figPerRow, figPlacement: o.figPlacement, captionStyle: o.captionStyle,
        orientation: o.orientation, tableCaption: o.tableCaption, commentPlace: o.commentPlace });
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
      data: state.data, cfg: state.cfg, edits: reportEdits() || state.pendingEdits || null };
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
      const cfg = j.cfg;
      cfg.options = { ...defaultOptions(), ...cfg.options };
      cfg.tpInclude = cfg.tpInclude || {}; cfg.advanced = cfg.advanced || []; cfg.exportExclude = cfg.exportExclude || {}; cfg.report = { ...DEFAULT_REPORT, ...(cfg.report || {}) };
      state.data = j.data; state.cfg = cfg; state.file = j.file || f.name; state.sheet = j.sheet || 'Data'; state.wb = null; state.result = null;
      state.undo = []; state.grid.page = 0; state.grid.sort = null; state.pendingCfg = null; state.pendingEdits = j.edits || null;
      $('#fileName').textContent = `${state.file} (project)`; $('#sheetSel').innerHTML = `<option>${esc(state.sheet)}</option>`; $('#sheetBox').style.display = '';
      $('#studyTitle').value = cfg.study.title || ''; $('#software').value = cfg.study.software || $('#software').value;
      $('#to2').disabled = false; renderGrid();
      // leave no step active, so the controls of the old project are not read into the opened one
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      go(Math.min(STEPS.length, Math.max(2, +j.step || 2)));
      toast(`Project opened: ${state.data.rows.length} patients, saved ${String(j.saved || '').slice(0, 10)}`);
    } catch (err) { toast('Could not open the project: ' + err.message); }
  };
  $('#btnNew').onclick = () => {
    if (state.data && !confirm('Start a new project? The current data and settings are cleared (save the project first to keep them).')) return;
    Object.assign(state, { file: null, wb: null, sheet: null, data: null, cfg: null, result: null, pendingCfg: null, pendingEdits: null, undo: [] });
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

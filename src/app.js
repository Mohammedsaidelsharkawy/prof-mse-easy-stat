/* Prof MSE Easy Stat — user interface */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STEPS = [['Upload', 'Excel file'], ['Variables', 'Groups & roles'], ['Timepoints', 'Per outcome'], ['Tests', 'Statistics'], ['Tables', 'Layout & numbers'],
    ['Comments', 'Text'], ['Figures', 'Charts'], ['Advanced', 'Regression, ROC …'], ['Flowchart', 'CONSORT / STROBE …'], ['Report', 'Preview & Word']];
  const TP_RE = /^(baseline|base|bl|pre|post|preop|postop|before|after|final|end|(t|v|visit|day|d|week|wk|w|month|mo|m|h|hr|y|yr|session)\d+(\.\d+)?|\d+(\.\d+)?(h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|m|mo|mon|month|months|y|yr|yrs|year|years|min|mins))$/i;
  const UNIT_RE = /^(\d+(\.\d+)?-\d+(\.\d+)?|years?|yrs|months?|days?|weeks?|hours?|deg|degrees?|kg|g|cm|mm|m2|kg\/m2|mmhg|bpm|percent|pct|%|min|mins|sec|ml|mg|mg\/dl|mmol\/l|iu|u\/l|ng|pg|ug|mcg|µg|mmol|umol|µmol|meq|x?10e\d+)$/i;
  // a unit followed by one of these reads as "per": mg_L → mg/L, kg_m2 → kg/m2
  const PER_RE = /^(l|dl|ml|m2|kg|min|h|hr|day)$/i;
  const fixCase = u => u.replace(/^(m|d)?l$/i, m => m.length === 1 ? 'L' : m[0].toLowerCase() + 'L');
  const ID_RE = /(^id$|_id$|^id_|study.?id|patient.?(id|no|code)|^code$|^serial|^no\.?$|^s\.?n\.?$|^name$)/i;
  const GROUP_RE = /^(group|groups|arm|treatment|allocation|intervention|study.?group)$/i;

  const DEFAULT_OPTIONS = {
    decimals: 2, alpha: 0.05, chartStyle: 'auto', palette: 'brand', effect: true, within: false, fisher: true, branding: true,
    commentStyle: 'concise', notSig: false, tableStyle: 'grid', font: 'Times New Roman', correlation: false, sigMarks: true, points: false,
    figures: 'all', errorBar: 'sd', figWidth: 'full', figPerRow: 1, valueLabels: false,
    chartText: 'normal', chartAspect: 'wide', barFill: 'gradient', yAxis: 'auto', legendPos: 'bottom', chartRes: 1,
    gridlines: true, axisArrows: true, nLabels: false, legendSize: 'normal', legendTitle: '', legendFrame: false,
    welch: false, dunn: false, chiPost: false, mixed: false, normality: 'sw', catEffect: 'rr',
    figPlacement: 'after', captionStyle: 'colon', chartTitle: false,
    pctDecimals: 1, meanStyle: 'pm', iqrStyle: 'dash', secondRow: 'auto', pDigits: 3, pHead: 'P value', sigSym: '*', showStat: false, missingNote: false,
    orientation: 'portrait', tableCaption: 'colon', pWord: 'P value', commentPlace: 'after', commentEffect: false, summary: false, barWidth: 'normal', boxMean: false,
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
    pWord: ['optPWord'], commentPlace: ['optCommentPlace'], commentEffect: ['optCommentEffect', true], summary: ['optSummary', true], barWidth: ['optBarWidth'], boxMean: ['optBoxMean', true], dunn: ['optDunn', true], chiPost: ['optChiPost', true], mixed: ['optMixed', true]
  };
  const defaultOptions = () => ({ ...DEFAULT_OPTIONS, customColors: [...DEFAULT_OPTIONS.customColors] });
  // chart palette and drawing style from the options
  const chartPalette = o => o.palette === 'custom' ? o.customColors : o.palette;
  const chartStyle = o => ({ text: o.chartText, aspect: o.chartAspect, barFill: o.barFill, yAxis: o.yAxis, legend: o.legendPos, res: o.chartRes, grid: o.gridlines, arrows: o.axisArrows,
    legendSize: o.legendSize, legendTitle: o.legendTitle.trim(), legendFrame: o.legendFrame, barWidth: o.barWidth, boxMean: o.boxMean });

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
    if (n === 10) runAnalysis();
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
    ['Prof MSE Easy Stat', 'Statistical analysis was done by Prof MSE Easy Stat v1.0.'],
    ['IBM SPSS Statistics', 'Statistical analysis was performed using IBM SPSS Statistics, version 28.0 (IBM Corp., Armonk, NY, USA).'],
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
  state.grid = { page: 0, per: 10, q: '', onlyMissing: false, hlMissing: true, summary: false, edit: false, sort: null };
  const isMissing = v => v === null || v === undefined || String(v).trim() === '';
  const parseCell = t => { t = t.replace(/\u00a0/g, ' ').trim(); if (t === '') return null; const n = Number(t.replace(',', '.')); return isFinite(n) && /^[-+]?[\d.,]+(e[-+]?\d+)?$/i.test(t) ? n : t; };
  function renderGrid() {
    const g = state.grid, { headers, rows } = state.data;
    $('#dims').textContent = `${rows.length} rows × ${headers.length} columns`;
    const q = g.q.trim().toLowerCase();
    const idx = rows.map((_, i) => i).filter(i => (!q || headers.some(h => String(rows[i][h] ?? '').toLowerCase().includes(q))) && (!g.onlyMissing || headers.some(h => isMissing(rows[i][h]))));
    const per = g.per === 'all' ? Math.max(1, idx.length) : +g.per, pages = Math.max(1, Math.ceil(idx.length / per));
    g.page = Math.min(g.page, pages - 1);
    const shown = idx.slice(g.page * per, g.page * per + per), cfg = state.cfg;
    const role = h => !cfg ? '' : h === cfg.groupCol ? '<span class="chip info">group</span>' : cfg.idCols.includes(h) ? '<span class="chip">ID</span>' : '';
    const sortMark = h => g.sort && g.sort.col === h ? (g.sort.dir > 0 ? ' ▲' : ' ▼') : '';
    const head = headers.map((h, ci) => g.edit
      ? `<th><div class="gh"><input type="text" data-hname="${esc(h)}" value="${esc(h)}" title="Rename column">
          <span class="gh-btns"><button data-hmove="${ci},-1" title="Move left" type="button">◀</button><button data-hmove="${ci},1" title="Move right" type="button">▶</button><button data-hsort="${esc(h)}" title="Sort rows" type="button">⇅</button><button data-hdel="${esc(h)}" title="Delete column" type="button">✕</button></span></div>${role(h)}</th>`
      : `<th data-hsort="${esc(h)}" class="sortable" title="Click to sort the rows (Undo in edit mode restores the order)">${esc(h)}${sortMark(h)} ${role(h)}</th>`).join('');
    let summary = '';
    if (g.summary) summary = `<tr class="gsum"><td>Summary</td>${headers.map(h => {
      const info = columnInfo(rows, h), miss = rows.length - info.n, nums = rows.map(r => Analysis.toNum(r[h])).filter(isFinite);
      const desc = info.numeric && nums.length ? `num · ${Analysis.fmt(Math.min(...nums), 2)}–${Analysis.fmt(Math.max(...nums), 2)}` : `text · ${info.distinct.length} values`;
      return `<td>${desc}<br><span class="${miss ? 'miss-n' : ''}">${miss} missing</span></td>`; }).join('')}</tr>`;
    const body = shown.map(i => `<tr><td class="rn">${i + 1}${g.edit ? `<span class="gr-btns"><button data-rmove="${i},-1" title="Move up" type="button">↑</button><button data-rmove="${i},1" title="Move down" type="button">↓</button><button data-rdel="${i}" title="Delete row" type="button">✕</button></span>` : ''}</td>${
      headers.map(h => `<td class="${g.hlMissing && isMissing(rows[i][h]) ? 'miss' : ''}"${g.edit ? ` contenteditable="true" data-cell="${i}" data-col="${esc(h)}"` : ''}>${esc(rows[i][h] ?? '')}</td>`).join('')}</tr>`).join('');
    $('#preview').innerHTML = `<thead><tr><th class="rn">#</th>${head}</tr></thead><tbody>${summary}${body || `<tr><td colspan="${headers.length + 1}" class="legend-note">No rows match.</td></tr>`}</tbody>`;
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
    const cur = []; state.data.rows.forEach(r => { const g = Analysis.toCat(r[cfg.groupCol]); if (g !== null && !cur.includes(g)) cur.push(g); });
    const before = cfg.groupOrder.join('|');
    cur.forEach(g => { if (!cfg.groupOrder.includes(g)) { cfg.groupOrder.push(g); cfg.groupLabels[g] = /group/i.test(g) ? g : `${g} group`; cfg.groupInclude[g] = true; } });
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
    if (cfg && col === cfg.groupCol) { toast('This is the group column — choose another group column in step 2 first'); return; }
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
      consort: null, tpInclude: {}, advanced: [], exportExclude: {}
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
  function setGroups(cfg) {
    const seen = [];
    state.data.rows.forEach(r => { const g = Analysis.toCat(r[cfg.groupCol]); if (g !== null && !seen.includes(g)) seen.push(g); });
    cfg.groupOrder = seen;
    cfg.groupLabels = Object.fromEntries(seen.map(g => [g, /group/i.test(g) ? g : `${g} group`]));
    cfg.groupInclude = Object.fromEntries(seen.map(g => [g, true]));
    cfg.consort = null;
  }
  const activeGroups = () => state.cfg.groupOrder.filter(g => state.cfg.groupInclude[g] !== false);
  const groupN = g => state.data.rows.filter(r => Analysis.toCat(r[state.cfg.groupCol]) === g).length;

  /* ---------- step 2: variables ---------- */
  function renderVariables() {
    const cfg = state.cfg, { headers } = state.data;
    $('#groupCol').innerHTML = headers.map(h => `<option ${h === cfg.groupCol ? 'selected' : ''}>${esc(h)}</option>`).join('');
    $('#groupCol').onchange = e => { readUiIntoCfg(); cfg.groupCol = e.target.value; cfg.variables.forEach(v => { if (v.cols[0].col === cfg.groupCol) v.include = false; }); setGroups(cfg); renderVariables(); };
    $('#groupsTbl').innerHTML = `<thead><tr><th>Use</th><th>Value in Excel</th><th>Label in report</th><th>n</th><th>Order</th></tr></thead><tbody>${
      cfg.groupOrder.map((g, i) => `<tr><td><input type="checkbox" data-ginc="${esc(g)}" ${cfg.groupInclude[g] !== false ? 'checked' : ''}></td><td class="mono">${esc(g)}</td>
      <td><input type="text" data-glabel="${esc(g)}" value="${esc(cfg.groupLabels[g])}"></td><td>${groupN(g)}</td>
      <td><button class="btn ghost small" data-gmove="${i},-1">↑</button> <button class="btn ghost small" data-gmove="${i},1">↓</button></td></tr>`).join('')}</tbody>`;
    if (cfg.groupOrder.length > 6) toast('The group column has many values — is it the right column?');

    const groups = activeGroups();
    const byGroup = groups.map(g => state.data.rows.filter(r => Analysis.toCat(r[cfg.groupCol]) === g));
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
  /* ---------- figures by variable + live preview ---------- */
  const CHART_TYPES = {
    repeated: [['auto', 'Auto (chart style)'], ['bar', 'Bars'], ['line', 'Lines over time'], ['box', 'Box plots'], ['dot', 'Box plots + every patient'], ['none', 'No figure']],
    numeric: [['auto', 'Auto'], ['bar', 'Bars (mean ± error / median, IQR)'], ['box', 'Box plot'], ['dot', 'Dot plot (every patient)'], ['hist', 'Histogram'], ['none', 'No figure']],
    categorical: [['auto', 'Auto (bars)'], ['stacked', '100% stacked bar'], ['pie', 'Donut / pie'], ['none', 'No figure']]
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
  const ADV_TYPES = { linear: 'Linear regression', logistic: 'Logistic regression', roc: 'ROC curve', ancova: 'ANCOVA (adjusted group comparison)', survival: 'Kaplan-Meier survival',
    cox: 'Cox regression (hazard ratios)', mcnemar: 'McNemar test (paired categorical)', kappa: "Cohen's kappa (agreement, categorical)",
    agreement: 'ICC + Bland-Altman (agreement, numeric)', diagnostic: 'Diagnostic accuracy (2×2)', cronbach: "Cronbach's alpha (reliability)" };
  const analysedRows = () => { const g = activeGroups(); return state.data.rows.filter(r => g.includes(Analysis.toCat(r[state.cfg.groupCol]))); };
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
      if (t === 'cronbach') { fields = '<p class="legend-note" style="margin:0">Tick the questionnaire items (numeric scores). Patients with any missing item are left out.</p>'; predLabel = 'Items'; preds = cols.filter(c => Analysis.isNumberColumn(rows, c.col)); }
      const withPreds = ['linear', 'logistic', 'roc', 'ancova', 'cox', 'cronbach'].includes(t);
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
    if (t === 'linear') out.push(`<div>${box('vif', 'Collinearity (VIF)')}</div>`);
    if (t === 'logistic') out.push(`<div>${box('hl', 'Hosmer-Lemeshow goodness of fit')}</div>`);
    if (t === 'roc') out.push(`<div><label class="f">Optimal cut-off</label>${sel('cutoff', [['youden', 'Youden index'], ['closest', 'Closest to top-left corner']], a.cutoff)}</div>`);
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

  $('#optPal').addEventListener('change', e => { $('#customBox').style.display = e.target.value === 'custom' ? '' : 'none'; });
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
        enabled: prev ? prev.enabled : true, type: prev ? prev.type : 'consort', assessed: total,
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
  function readConsort() {
    const c = state.cfg && state.cfg.consort; if (!c || !$('#cForm').innerHTML) return;
    c.enabled = $('#cEnabled').checked;
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
    document.querySelectorAll('[data-glabel]').forEach(el => cfg.groupLabels[el.dataset.glabel] = el.value.trim() || el.dataset.glabel);
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

  function runAnalysis() {
    busy(true);
    setTimeout(() => {
      try {
        syncAssessed(ensureConsort());
        const cfg = state.cfg;
        const res = Analysis.run(state.data, cfg);
        res.sections.forEach(s => { s.key = s.title; s.figures.forEach(f => { f.key = f.caption; renderFigure(f, cfg.options); }); });
        const pal = chartPalette(cfg.options);
        const gl = res.groups;
        if (cfg.consort.enabled) {
          const cv = Charts.consort(cfg.consort, gl, pal);
          res.consort = { url: cv.toDataURL('image/png'), w: cv.width, h: cv.height };
        }
        state.result = res;
        renderReport();
      } catch (err) { console.error(err); $('#report').innerHTML = `<p style="color:var(--bad)"><b>Analysis failed:</b> ${esc(err.message)}</p>`; }
      finally { busy(false); }
    }, 30);
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
    document.querySelectorAll('[data-ttl]').forEach(t => { r.sections[+t.dataset.ttl].title = t.value; });
    if ($('#edSummary')) r.summary = $('#edSummary').value;
  }
  function renderReport() {
    const r = state.result;
    let fig = 1, tab = 1, html = '';
    const nIn = 1 + (r.consort ? 1 : 0) + r.sections.reduce((n, s) => n + (isOut(exKey.table(s)) ? 0 : 1) + s.figures.filter(f => !isOut(exKey.figure(f))).length, 0);
    html += `<div class="row exp-bar"><b>In the Word file:</b> <span class="legend-note">untick any section, table or figure to leave it out — numbering follows what is kept.</span><span class="spacer"></span>
      <button class="btn ghost small" data-exall="1" type="button">Include all</button><button class="btn ghost small" data-exall="0" type="button">Exclude all</button></div>`;
    const off = key => isOut(key) ? ' off' : '';
    html += `<div class="report-sec${off('methods')}"><div class="row"><h3>Statistical Analysis</h3><span class="spacer"></span>${exBox('methods', 'Include')}</div><textarea id="edMethods">${esc(r.methods)}</textarea></div>`;
    html += `<div class="report-sec"><h3>Results</h3>`;
    if (r.consort) {
      const out = isOut('consort');
      html += `<div class="${off('consort')}"><div class="row"><span class="spacer"></span>${exBox('consort', 'Include flowchart and its text')}</div><textarea id="edIntro">${esc(r.intro)}</textarea><img src="${r.consort.url}" class="consort-prev" style="margin-top:12px"><div class="cap">${out ? 'Not exported:' : Report.figLabel(fig++, state.cfg.options.captionStyle)} ${esc(r.flowCaption)}</div></div>`;
    }
    html += `</div>`;
    // figure numbers follow the Word layout: after each table, or all at the end (optionally grouped by type)
    const o = state.cfg.options, lab = n => Report.figLabel(n, o.captionStyle);
    const atEnd = Report.arrangeFigures(r.sections, o.figPlacement);
    const num = new Map();
    (atEnd || r.sections.flatMap(s => s.figures)).forEach(f => { if (!isOut(exKey.figure(f))) num.set(f, fig++); });
    const figHtml = f => {
      const si = r.sections.findIndex(s => s.figures.includes(f)), fi = r.sections[si].figures.indexOf(f), fk = exKey.figure(f), fOut = isOut(fk);
      return `<figure class="${fOut ? 'off' : ''}"><img src="${f.url}" alt=""><figcaption>${fOut ? 'Not exported:' : lab(num.get(f))} <input type="text" class="fcap" data-fcap="${si}:${fi}" value="${esc(f.caption)}" title="Edit the caption"></figcaption>${exBox(fk, 'Figure')}</figure>`;
    };
    r.sections.forEach((s, i) => {
      const tk = exKey.table(s), tOut = isOut(tk);
      const place = o.commentPlace || 'after';
      const comment = `<label class="f">Comment (editable — ${place === 'none' ? 'not exported: comments are switched off in step 6' : `placed ${place} the table`})</label><textarea data-comment="${i}">${esc(s.comment)}</textarea>`;
      html += `<div class="report-sec"><div class="${off(tk)}"><div class="row"><div class="cap" style="flex:1">${tOut ? 'Not exported:' : `Table ${tab++}${o.tableCaption === 'period' ? '.' : ':'}`} <input type="text" class="fcap" data-ttl="${i}" value="${esc(s.title)}" title="Edit the table title"></div>${exBox(tk, 'Table')}</div>
        ${place === 'before' ? comment : ''}<div style="overflow-x:auto">${htmlTable(s.head, s.rows)}</div>
        <div class="foot">${esc(s.footnote)}</div>
        ${place !== 'before' ? comment : ''}</div>
        ${atEnd ? '' : `<div class="figs">${s.figures.map(figHtml).join('')}</div>`}</div>`;
    });
    if (atEnd && atEnd.length) html += `<div class="report-sec"><h3>Figures</h3><div class="figs">${atEnd.map(figHtml).join('')}</div></div>`;
    if (r.summary) html += `<div class="report-sec${off('summary')}"><div class="row"><h3>Summary of key findings</h3><span class="spacer"></span>${exBox('summary', 'Include')}</div><textarea id="edSummary">${esc(r.summary)}</textarea></div>`;
    $('#report').innerHTML = html;
  }
  $('#report').addEventListener('change', e => {
    // an edited caption redraws its chart when the caption is printed on the chart
    if (e.target.dataset.fcap !== undefined) {
      syncEdits();
      const [si, fi] = e.target.dataset.fcap.split(':').map(Number), f = state.result.sections[si].figures[fi];
      if (state.cfg.options.chartTitle) { renderFigure(f, state.cfg.options); e.target.closest('figure').querySelector('img').src = f.url; }
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
    return {
      ...r, methods: isOut('methods') ? '' : r.methods, consort: isOut('consort') ? null : r.consort, summary: isOut('summary') ? '' : r.summary,
      sections: r.sections.map(s => ({ ...s, tableOn: !isOut(exKey.table(s)), figures: s.figures.filter(f => !isOut(exKey.figure(f))) }))
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
      const o = state.cfg.options;
      const blob = await Report.build(r, { title: state.cfg.study.title, branding: o.branding, logo: LOGO, font: o.font, tableStyle: o.tableStyle, figWidth: o.figWidth, figPerRow: o.figPerRow, figPlacement: o.figPlacement, captionStyle: o.captionStyle,
        orientation: o.orientation, tableCaption: o.tableCaption, commentPlace: o.commentPlace });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = (state.file || 'data').replace(/\.[^.]+$/, '') + ' - Statistical report.docx';
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      toast('Word report downloaded');
    } catch (err) { console.error(err); toast('Word export failed: ' + err.message); }
    finally { busy(false); }
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
    const cur = []; state.data.rows.forEach(r => { const g = Analysis.toCat(r[saved.groupCol]); if (g !== null && !cur.includes(g)) cur.push(g); });
    cur.forEach(g => { if (!saved.groupOrder.includes(g)) { saved.groupOrder.push(g); saved.groupLabels[g] = g + ' group'; saved.groupInclude[g] = true; } });
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

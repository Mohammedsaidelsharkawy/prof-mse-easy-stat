/* Prof MSE Easy Stat — user interface */
(() => {
  const $ = s => document.querySelector(s);
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const STEPS = [['Upload', 'Excel file'], ['Variables', 'Groups & roles'], ['Timepoints', 'Options'], ['CONSORT', 'Flowchart'], ['Report', 'Preview & Word']];
  const TP_RE = /^(baseline|base|bl|pre|post|preop|postop|before|after|final|end|(t|v|visit|day|d|week|wk|w|month|mo|m|h|hr|y|yr|session)\d+(\.\d+)?|\d+(\.\d+)?(h|hr|hrs|hour|hours|d|day|days|w|wk|wks|week|weeks|m|mo|mon|month|months|y|yr|yrs|year|years|min|mins))$/i;
  const UNIT_RE = /^(\d+(\.\d+)?-\d+(\.\d+)?|years?|yrs|months?|days?|weeks?|hours?|deg|degrees?|kg|g|cm|mm|m2|kg\/m2|mmhg|bpm|percent|pct|%|min|mins|sec|ml|mg|mg\/dl|mmol\/l|iu|u\/l)$/i;
  const ID_RE = /(^id$|_id$|^id_|study.?id|patient.?(id|no|code)|^code$|^serial|^no\.?$|^s\.?n\.?$|^name$)/i;
  const GROUP_RE = /^(group|groups|arm|treatment|allocation|intervention|study.?group)$/i;

  const DEFAULT_OPTIONS = {
    decimals: 2, alpha: 0.05, chartStyle: 'auto', palette: 'brand', effect: true, within: false, fisher: true, branding: true,
    commentStyle: 'concise', notSig: false, tableStyle: 'grid', font: 'Times New Roman', correlation: false, sigMarks: true, points: false,
    figures: 'all', errorBar: 'sd', figWidth: 'full', figPerRow: 1, valueLabels: false,
    chartText: 'normal', chartAspect: 'wide', barFill: 'gradient', yAxis: 'auto', legendPos: 'bottom', chartRes: 1,
    gridlines: true, axisArrows: true, nLabels: false,
    customColors: ['#7B2FBE', '#1C1648', '#B57EDC', '#E08A2E', '#2E9E8F', '#C2185B']
  };
  // option key → [element id, checkbox?]
  const OPTION_FIELDS = {
    decimals: ['optDec'], alpha: ['optAlpha'], chartStyle: ['optChart'], palette: ['optPal'], commentStyle: ['optComment'],
    tableStyle: ['optTable'], font: ['optFont'], effect: ['optEffect', true], within: ['optWithin', true], fisher: ['optFisher', true],
    branding: ['optBrand', true], notSig: ['optNotSig', true], correlation: ['optCorr', true], sigMarks: ['optSigMarks', true], points: ['optPoints', true],
    figures: ['optFigures'], errorBar: ['optErrorBar'], figWidth: ['optFigWidth'], figPerRow: ['optFigPerRow'], valueLabels: ['optValueLabels', true],
    chartText: ['optChartText'], chartAspect: ['optAspect'], barFill: ['optBarFill'], yAxis: ['optYAxis'], legendPos: ['optLegend'], chartRes: ['optRes'],
    gridlines: ['optGrid', true], axisArrows: ['optArrows', true], nLabels: ['optNLabels', true]
  };
  const defaultOptions = () => ({ ...DEFAULT_OPTIONS, customColors: [...DEFAULT_OPTIONS.customColors] });
  // chart palette and drawing style from the options
  const chartPalette = o => o.palette === 'custom' ? o.customColors : o.palette;
  const chartStyle = o => ({ text: o.chartText, aspect: o.chartAspect, barFill: o.barFill, yAxis: o.yAxis, legend: o.legendPos, res: o.chartRes, grid: o.gridlines, arrows: o.axisArrows });

  const state = { file: null, wb: null, sheet: null, data: null, cfg: null, result: null, step: 1, edits: {} };

  /* ---------- helpers ---------- */
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600); }
  const busy = on => $('#busy').classList.toggle('show', on);
  const tokens = name => String(name).trim().split(/[_\s.]+/).filter(Boolean);
  function labelFrom(toks) {
    const words = [], units = [];
    toks.forEach(t => UNIT_RE.test(t) ? units.push(t) : words.push(t));
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
    if (n === 4) renderConsortForm();
    if (n === 5) runAnalysis();
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

  function selectSheet(name) {
    const ws = state.wb.Sheets[name];
    const aoa = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, blankrows: false });
    if (!aoa.length) { toast('This sheet is empty'); return; }
    const headers = aoa[0].map((h, i) => h === null || h === '' ? `Column_${i + 1}` : String(h).trim());
    const rows = aoa.slice(1).filter(r => r.some(v => v !== null && String(v).trim() !== ''))
      .map(r => Object.fromEntries(headers.map((h, i) => [h, r[i] ?? null])));
    state.sheet = name;
    state.data = { headers, rows };
    $('#dims').textContent = `${rows.length} rows × ${headers.length} columns`;
    $('#preview').innerHTML = `<thead><tr>${headers.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.slice(0, 8).map(r => `<tr>${headers.map(h => `<td>${esc(r[h])}</td>`).join('')}</tr>`).join('')}</tbody>`;
    const prevCfg = state.pendingCfg;
    state.cfg = detect(state.data);
    if (prevCfg) applySavedCfg(prevCfg);
    $('#to2').disabled = false;
    renderStepper();
    toast(`Loaded ${rows.length} patients · ${state.cfg.variables.length} variables detected`);
  }
  $('#to2').onclick = () => go(2);

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
      const inf = info[h];
      const type = inf.numeric && inf.distinct.length > 5 ? 'numeric' : 'categorical';
      variables.push({
        id: 'v' + pos, kind: 'single', pos, cols: [{ col: h }], label: labelFrom(tokens(h)), type, dist: 'auto',
        table: pos < firstRepPos ? 'Demographic and baseline data' : 'Other outcomes',
        levels: type === 'categorical' ? defaultLevels(inf.distinct) : [], note: '', include: true
      });
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
      consort: null
    };
    setGroups(cfg);
    return cfg;
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
        const sw = Stats.shapiroWilk(x); total++; if (sw && sw.p <= 0.05) fail++;
      }));
      const tip = `title="${fail} of ${total} group/timepoint cells failed Shapiro-Wilk (p ≤ 0.05)"`;
      const nonNormal = v.kind === 'repeated' ? fail > total * Analysis.NONNORMAL_SHARE : fail > 0;
      if (nonNormal) return `<span class="chip warn" ${tip}>non-normal (${fail}/${total})</span>`;
      return fail ? `<span class="chip ok" ${tip}>normal (${fail}/${total} failed)</span>` : '<span class="chip ok">normal</span>';
    };
    $('#varsTbl').innerHTML = `<thead><tr><th>Use</th><th>Label</th><th>Column(s)</th><th>Type</th><th>Distribution</th><th>Table</th><th>Levels (categories)</th><th>Footnote (abbreviations)</th></tr></thead><tbody>${
      cfg.variables.map(v => `<tr data-vid="${v.id}">
        <td><input type="checkbox" data-k="include" ${v.include ? 'checked' : ''}></td>
        <td><input type="text" data-k="label" value="${esc(v.label)}"></td>
        <td class="mono" title="${esc(v.cols.map(c => c.col).join('\n'))}">${v.kind === 'repeated' ? `<span class="chip info">repeated × ${v.cols.length}</span><br>${esc(v.cols[0].col)} …` : esc(v.cols[0].col)}</td>
        <td>${v.kind === 'repeated' ? 'numeric' : `<select data-k="type"><option value="numeric" ${v.type === 'numeric' ? 'selected' : ''}>numeric</option><option value="categorical" ${v.type === 'categorical' ? 'selected' : ''}>categorical</option></select>`}</td>
        <td>${v.type === 'numeric' ? `<select data-k="dist"><option value="auto" ${v.dist === 'auto' ? 'selected' : ''}>Auto</option><option value="param" ${v.dist === 'param' ? 'selected' : ''}>Parametric</option><option value="nonparam" ${v.dist === 'nonparam' ? 'selected' : ''}>Non-parametric</option></select><div style="margin-top:4px">${swChip(v)}</div>` : swChip(v)}</td>
        <td>${v.kind === 'repeated' ? '<span class="legend-note">own table</span>' : `<input type="text" data-k="table" value="${esc(v.table)}">`}</td>
        <td>${v.type === 'categorical' ? `<input type="text" data-k="levels" value="${esc(v.levels.join(', '))}">` : '<span class="legend-note">—</span>'}</td>
        <td><input type="text" data-k="note" value="${esc(v.note)}" placeholder="e.g. NRS: Numeric rating scale"></td>
      </tr>`).join('')}</tbody>`;
  }
  $('#groupsTbl').addEventListener('click', e => {
    const b = e.target.closest('[data-gmove]'); if (!b) return;
    readUiIntoCfg();
    const [i, d] = b.dataset.gmove.split(',').map(Number), o = state.cfg.groupOrder, j = i + d;
    if (j < 0 || j >= o.length) return;
    [o[i], o[j]] = [o[j], o[i]]; state.cfg.consort = null; renderVariables();
  });
  $('#varsTbl').addEventListener('change', e => {
    if (e.target.dataset.k === 'type') {
      readUiIntoCfg();
      const v = state.cfg.variables.find(x => x.id === e.target.closest('tr').dataset.vid);
      if (v.type === 'categorical' && !v.levels.length) v.levels = defaultLevels(columnInfo(state.data.rows, v.cols[0].col).distinct);
      renderVariables();
    }
  });
  $('#groupsTbl').addEventListener('change', e => { if (e.target.dataset.ginc !== undefined) { readUiIntoCfg(); state.cfg.consort = null; renderVariables(); } });

  /* ---------- step 3: timepoints & options ---------- */
  function renderTimepoints() {
    const cfg = state.cfg;
    $('#tpTbl').innerHTML = cfg.tpOrder.length ? `<thead><tr><th>Token in column names</th><th>Label in report</th></tr></thead><tbody>${
      cfg.tpOrder.map(t => `<tr><td class="mono">${esc(t)}</td><td><input type="text" data-tp="${esc(t)}" value="${esc(cfg.tpLabels[t])}"></td></tr>`).join('')}</tbody>`
      : '<tbody><tr><td>No repeated measures detected.</td></tr></tbody>';
    const o = cfg.options;
    for (const [k, [id, box]] of Object.entries(OPTION_FIELDS)) $('#' + id)[box ? 'checked' : 'value'] = o[k];
    $('#customColors').innerHTML = o.customColors.map((col, i) => `<input type="color" data-ccol="${i}" value="${esc(col)}" title="Colour ${i + 1}">`).join('');
    $('#customBox').style.display = o.palette === 'custom' ? '' : 'none';
  }

  $('#optPal').addEventListener('change', e => { $('#customBox').style.display = e.target.value === 'custom' ? '' : 'none'; });
  $('#customReset').onclick = () => { readUiIntoCfg(); state.cfg.options.customColors = defaultOptions().customColors; renderTimepoints(); };

  /* ---------- step 4: CONSORT ---------- */
  function ensureConsort() {
    const cfg = state.cfg, groups = activeGroups();
    if (cfg.consort && cfg.consort.groups.length === groups.length) return cfg.consort;
    const ns = groups.map(groupN), total = ns.reduce((a, b) => a + b, 0);
    cfg.consort = {
      enabled: true, assessed: total,
      excluded: [{ text: 'Not meeting inclusion criteria', n: 0 }, { text: 'Declined to participate', n: 0 }],
      groups: groups.map((g, i) => ({ allocated: ns[i], description: '', lost: 0, lostReason: '', excludedAnalysis: 0, excludedReason: '', analysed: ns[i] }))
    };
    return cfg.consort;
  }
  function renderConsortForm() {
    const c = ensureConsort(), gl = activeGroups().map(g => state.cfg.groupLabels[g]);
    $('#cEnabled').checked = c.enabled;
    $('#cAssessed').value = c.assessed;
    $('#cExcluded').innerHTML = c.excluded.map((e, i) => `<div class="row" style="margin-bottom:6px"><input type="text" data-ex="${i}" data-f="text" value="${esc(e.text)}" style="flex:3"><input type="number" min="0" data-ex="${i}" data-f="n" value="${e.n}" style="flex:1;max-width:100px"><button class="btn ghost small" data-exdel="${i}">✕</button></div>`).join('');
    $('#cGroups').innerHTML = c.groups.map((g, i) => `<div class="gcard"><h4>${esc(gl[i])}</h4>
      <div class="grid g2">
        <div><label class="f">Allocated (n)</label><input type="number" min="0" data-cg="${i}" data-f="allocated" value="${g.allocated}"></div>
        <div><label class="f">Analysed (n)</label><input type="number" min="0" data-cg="${i}" data-f="analysed" value="${g.analysed}"></div>
        <div><label class="f">Lost to follow-up (n)</label><input type="number" min="0" data-cg="${i}" data-f="lost" value="${g.lost}"></div>
        <div><label class="f">Reason lost</label><input type="text" data-cg="${i}" data-f="lostReason" value="${esc(g.lostReason)}"></div>
        <div><label class="f">Excluded from analysis (n)</label><input type="number" min="0" data-cg="${i}" data-f="excludedAnalysis" value="${g.excludedAnalysis}"></div>
        <div><label class="f">Reason excluded</label><input type="text" data-cg="${i}" data-f="excludedReason" value="${esc(g.excludedReason)}"></div>
      </div>
      <label class="f" style="margin-top:8px">Intervention description (optional)</label><textarea data-cg="${i}" data-f="description" style="min-height:60px">${esc(g.description)}</textarea></div>`).join('');
    drawConsortPreview();
  }
  function readConsort() {
    const c = state.cfg && state.cfg.consort; if (!c || !$('#cAssessed').value && $('#cAssessed').value !== '0') return;
    c.enabled = $('#cEnabled').checked;
    c.assessed = +$('#cAssessed').value || 0;
    document.querySelectorAll('[data-ex]').forEach(el => { c.excluded[+el.dataset.ex][el.dataset.f] = el.dataset.f === 'n' ? (+el.value || 0) : el.value; });
    document.querySelectorAll('[data-cg]').forEach(el => {
      const g = c.groups[+el.dataset.cg]; if (!g) return;
      g[el.dataset.f] = el.type === 'number' ? (+el.value || 0) : el.value;
    });
  }
  function drawConsortPreview() {
    const c = state.cfg.consort, gl = activeGroups().map(g => state.cfg.groupLabels[g]);
    const cv = Charts.consort(c, gl, chartPalette(state.cfg.options));
    const tgt = $('#consortCanvas');
    tgt.width = cv.width; tgt.height = cv.height; tgt.getContext('2d').drawImage(cv, 0, 0);
  }
  $('#p4').addEventListener('input', e => {
    readConsort();
    const el = e.target;
    if (el.dataset.cg !== undefined && ['allocated', 'lost', 'excludedAnalysis'].includes(el.dataset.f)) {
      const g = state.cfg.consort.groups[+el.dataset.cg];
      g.analysed = Math.max(0, g.allocated - g.lost - g.excludedAnalysis);
      const a = document.querySelector(`[data-cg="${el.dataset.cg}"][data-f="analysed"]`); if (a) a.value = g.analysed;
    }
    drawConsortPreview();
  });
  $('#cAddEx').onclick = () => { readConsort(); state.cfg.consort.excluded.push({ text: 'Other reasons', n: 0 }); renderConsortForm(); };
  $('#cExcluded').addEventListener('click', e => { const b = e.target.closest('[data-exdel]'); if (!b) return; readConsort(); state.cfg.consort.excluded.splice(+b.dataset.exdel, 1); renderConsortForm(); });

  /* ---------- read UI into cfg ---------- */
  function readUiIntoCfg() {
    const cfg = state.cfg; if (!cfg) return;
    cfg.study.title = $('#studyTitle').value; cfg.study.software = $('#software').value;
    document.querySelectorAll('[data-glabel]').forEach(el => cfg.groupLabels[el.dataset.glabel] = el.value.trim() || el.dataset.glabel);
    document.querySelectorAll('[data-ginc]').forEach(el => cfg.groupInclude[el.dataset.ginc] = el.checked);
    document.querySelectorAll('#varsTbl tr[data-vid]').forEach(tr => {
      const v = cfg.variables.find(x => x.id === tr.dataset.vid); if (!v) return;
      tr.querySelectorAll('[data-k]').forEach(el => {
        const k = el.dataset.k;
        if (k === 'include') v.include = el.checked;
        else if (k === 'levels') v.levels = el.value.split(',').map(s => s.trim()).filter(Boolean);
        else if (k === 'table') v.table = el.value.trim() || 'Other outcomes';
        else v[k] = el.value;
      });
    });
    document.querySelectorAll('[data-tp]').forEach(el => cfg.tpLabels[el.dataset.tp] = el.value.trim() || el.dataset.tp);
    if ($('#p3').classList.contains('active')) {
      const o = cfg.options;
      for (const [k, [id, box]] of Object.entries(OPTION_FIELDS)) {
        const el = $('#' + id);
        o[k] = box ? el.checked : typeof DEFAULT_OPTIONS[k] === 'number' ? +el.value : el.value;
      }
      document.querySelectorAll('[data-ccol]').forEach(el => { o.customColors[+el.dataset.ccol] = el.value; });
    }
    if ($('#p4').classList.contains('active')) readConsort();
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
        ensureConsort();
        const cfg = state.cfg;
        const res = Analysis.run(state.data, cfg);
        const pal = chartPalette(cfg.options), sty = chartStyle(cfg.options);
        res.sections.forEach(s => s.figures.forEach(f => { const c = Charts.draw(f.spec, pal, sty); f.url = c.toDataURL('image/png'); f.w = c.width; f.h = c.height; }));
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

  function renderReport() {
    const r = state.result;
    let fig = 1, tab = 1, html = '';
    html += `<div class="report-sec"><h3>Statistical Analysis</h3><textarea id="edMethods">${esc(r.methods)}</textarea></div>`;
    html += `<div class="report-sec"><h3>Results</h3>`;
    if (r.consort) html += `<textarea id="edIntro">${esc(r.intro)}</textarea><img src="${r.consort.url}" class="consort-prev" style="margin-top:12px"><div class="cap">Figure ${fig++}: CONSORT flowchart of the enrolled patients</div>`;
    html += `</div>`;
    r.sections.forEach((s, i) => {
      html += `<div class="report-sec"><div class="cap">Table ${tab++}: ${esc(s.title)}</div><div style="overflow-x:auto">${htmlTable(s.head, s.rows)}</div>
        <div class="foot">${esc(s.footnote)}</div>
        <label class="f">Comment (editable)</label><textarea data-comment="${i}">${esc(s.comment)}</textarea>
        <div class="figs">${s.figures.map(f => `<figure><img src="${f.url}" alt=""><figcaption>Figure ${fig++}: ${esc(f.caption)}</figcaption></figure>`).join('')}</div></div>`;
    });
    $('#report').innerHTML = html;
  }
  $('#btnRerun').onclick = () => runAnalysis();

  $('#btnDocx').onclick = async () => {
    if (!state.result) return;
    busy(true);
    try {
      const r = state.result;
      r.methods = $('#edMethods').value;
      if ($('#edIntro')) r.intro = $('#edIntro').value;
      document.querySelectorAll('[data-comment]').forEach(t => r.sections[+t.dataset.comment].comment = t.value);
      const o = state.cfg.options;
      const blob = await Report.build(r, { title: state.cfg.study.title, branding: o.branding, logo: LOGO, font: o.font, tableStyle: o.tableStyle, figWidth: o.figWidth, figPerRow: o.figPerRow });
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
    saved.options = { ...defaultOptions(), ...saved.options }; // setups saved by older versions lack the newer options
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

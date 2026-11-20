/* Prof MSE Easy Stat — Select Cases and Split File, as in SPSS (Data menu).
   Select Cases: all cases, a condition (AND / OR, brackets), a random sample, a range of rows or dates, a filter variable;
   unselected cases filtered out (greyed in the sheet), copied to a new dataset, or deleted.
   Split File: off, compare groups (the subgroups side by side in one table) or organise output by groups (tables for each subgroup). */
(() => {
  const U = window.EasyUI; if (!U || typeof Analysis === 'undefined') return;
  const A = Analysis, S = () => U.state, $ = s => document.querySelector(s), esc = U.esc;
  const css = document.createElement('style');
  css.textContent = `.dgrid tr.sel-out td:not(.rn){color:#9a9a9a;text-decoration:line-through}.dgrid tr.sel-out td.rn{opacity:.55}
.sc-badge{white-space:nowrap}.sc-badge .sv{max-width:150px;overflow:hidden;text-overflow:ellipsis;display:inline-block;vertical-align:bottom}
@media (max-width:1480px){.sc-badge:not(.on) .sv{display:none}.sc-badge .sv{max-width:90px}}
.top-actions{flex-wrap:wrap!important;row-gap:6px}@media (max-width:1100px){#uxMore .tl{display:none}.top-actions{gap:5px!important}}
#uxMore.r13-on::after{content:'●';color:#7CE38B;margin-left:4px;font-size:10px}.sc-badge.on{background:#FFF4D6;border-color:#E5B53A;color:#5a4300}
.sc-dlg fieldset{border:1px solid var(--line,#ddd);border-radius:10px;padding:6px 10px 8px;margin:0 0 10px}.sc-dlg legend{font-weight:700;padding:0 4px}
.sc-dlg .sc-opt{display:block;margin:6px 0 2px}.sc-dlg .sc-sub{margin:2px 0 6px 24px;display:flex;flex-wrap:wrap;gap:6px;align-items:center}
.sc-dlg .sc-sub.off{opacity:.45;pointer-events:none}.sc-dlg input[type=number]{width:80px}.sc-dlg select{width:auto;max-width:100%}
.sc-cond{display:flex;flex-wrap:wrap;gap:4px;align-items:center;padding:4px 0;border-bottom:1px dashed var(--line,#e5e5e5)}.sc-cond input[type=text]{width:120px}
.sc-words{background:var(--soft,#f6f2fc);border-radius:8px;padding:6px 8px;margin:6px 0;font-size:13px}.sc-count{font-weight:700}
.sc-two{display:grid;grid-template-columns:1fr auto 1fr;gap:8px;align-items:start}.sc-two select[multiple]{width:100%;min-height:150px}
.sc-arrows{display:flex;flex-direction:column;gap:6px;padding-top:24px}
@media (max-width:640px){.sc-two{grid-template-columns:1fr}.sc-arrows{flex-direction:row;padding-top:0}.sc-cond input[type=text]{width:100px}}`;
  document.head.appendChild(css);
  const clone = x => JSON.parse(JSON.stringify(x === undefined ? null : x));
  const OPS = Object.entries(A.FILTER_OPS);
  const colsAll = () => (S().data && S().data.headers) || [];
  const lab = c => { try { return A.columnLabel(S().cfg, c); } catch (e) { return c; } };
  const optCols = (cur, list = colsAll()) => list.map(c => `<option value="${esc(c)}" ${c === cur ? 'selected' : ''}>${esc(lab(c) === c ? c : `${lab(c)} (${c})`)}</option>`).join('');

  /* ---------- the status badges in the header ---------- */
  function badges() {
    const cfg = S().cfg, d = S().data, sel = $('#scBadge'), spl = $('#sfBadge'); if (!sel || !spl) return;
    const set = (b, ic, lbl, val) => { const h = `${ic} <span class="tl">${lbl}: </span><span class="sv">${esc(val)}</span>`; if (b.innerHTML !== h) b.innerHTML = h; };
    if (!cfg || !d) { set(sel, '🔎', 'Filter', 'off'); set(spl, '🧩', 'Split', 'off'); sel.classList.remove('on'); spl.classList.remove('on'); return; }
    const on = A.selectionOn(cfg), n = d.rows.length, k = on ? A.filterRows(cfg, d.rows).length : n;
    set(sel, '🔎', 'Filter', on ? `${k} of ${n}` : 'off'); sel.classList.toggle('on', on); sel.title = on ? `Select Cases: ${A.filterText(cfg)}` : 'Select Cases: all patients are analysed';
    const sg = cfg.subgroup || {}, sc = (U.subCols ? U.subCols(sg) : sg.cols || []).filter(c => d.headers.includes(c)), son = sc.length && sg.mode !== 'off';
    set(spl, '🧩', 'Split', son ? `by ${sc.map(lab).join(sg.combine === 'all' ? ' × ' : ', ')}` : 'off'); spl.classList.toggle('on', !!son);
    spl.title = son ? `Split File: ${sg.mode === 'compare' ? 'compare groups (side by side)' : 'organise output by groups'}` : 'Split File: analyse all cases, no subgroups';
  }
  setInterval(badges, 1500);

  /* ---------- Select Cases ---------- */
  let D = null; // the dialog's working copy; OK applies it
  function draftFrom(cfg) {
    const conds = clone(cfg.rowFilter || []).filter(f => !f.sys), sm = clone(cfg.sample || {}), cr = clone(cfg.caseRange || {}), fv = clone(cfg.filterVar || {});
    const mode = conds.some(f => f.on !== false) ? 'if' : sm.on ? 'random' : cr.on ? 'range' : fv.on ? 'var' : 'all';
    return { mode, conds: conds.length ? conds.map(f => ({ ...f, on: true })) : [{ col: colsAll().find(h => h !== cfg.groupCol && !(cfg.idCols || []).includes(h)) || colsAll()[0], op: 'eq', val: '', on: true }],
      sample: { kind: sm.kind || 'exact', pct: sm.pct || 50, n: sm.n || 30, from: sm.from || '', seed: sm.seed || 1 },
      range: { by: cr.dateCol ? 'date' : 'rows', from: cr.from || 1, to: cr.to || '', dateCol: cr.dateCol || '', d1: cr.d1 || '', d2: cr.d2 || '' },
      fvar: fv.col || '', output: 'filter', flow: cfg.selFlow !== false };
  }
  // the selection the dialog describes, as the analysis reads it
  function cfgOf(dr) {
    const cfg = S().cfg, sys = (cfg.rowFilter || []).filter(f => f.sys), m = dr.mode;
    return { ...cfg, rowFilter: [...dr.conds.map(f => ({ ...f, on: m === 'if' })), ...sys],
      sample: { kind: dr.sample.kind, pct: +dr.sample.pct, n: +dr.sample.n, from: +dr.sample.from || '', seed: +dr.sample.seed || 1, on: m === 'random' },
      caseRange: dr.range.by === 'date' ? { on: m === 'range', dateCol: dr.range.dateCol, d1: dr.range.d1, d2: dr.range.d2 } : { on: m === 'range', from: +dr.range.from || 1, to: +dr.range.to || '' },
      filterVar: { on: m === 'var' && !!dr.fvar, col: dr.fvar } };
  }
  function condRow(f, i) {
    const vals = U.columnInfo ? U.columnInfo(S().data.rows, f.col).distinct.slice(0, 60) : [];
    const br = (k, ch) => `<select data-sck="${k}" title="${ch === '(' ? 'Opening' : 'Closing'} brackets">${[0, 1, 2, 3].map(n => `<option value="${n}" ${(+f[k] || 0) === n ? 'selected' : ''}>${n ? ch.repeat(n) : ch === '(' ? '·' : '·'}</option>`).join('')}</select>`;
    return `<div class="sc-cond" data-sci="${i}">${i ? `<select data-sck="join"><option value="and">AND</option><option value="or" ${f.join === 'or' ? 'selected' : ''}>OR</option></select>` : '<span class="legend-note" style="min-width:42px">IF</span>'}
      ${br('open', '(')}<select data-sck="col">${optCols(f.col)}</select><select data-sck="op">${OPS.map(([k, t]) => `<option value="${k}" ${k === f.op ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select>
      ${['blank', 'notblank'].includes(f.op) ? '' : `<input type="text" data-sck="val" value="${esc(f.val ?? '')}" list="scVals${i}" placeholder="${f.op === 'in' ? 'a, b, c' : 'value'}">`}${f.op === 'between' ? `<span>and</span><input type="text" data-sck="val2" value="${esc(f.val2 ?? '')}" placeholder="value">` : ''}
      <datalist id="scVals${i}">${vals.map(v => `<option value="${esc(v)}">`).join('')}</datalist>${br('close', ')')}
      <button class="btn ghost small" type="button" data-scdel="${i}" title="Remove this condition">✕</button></div>`;
  }
  function selectDialog() {
    if (!S().data || !S().cfg) { U.toast('Open a data file first'); return; }
    D = D && D.__open ? D : draftFrom(S().cfg); D.__open = true; drawSelect();
  }
  function drawSelect() {
    const d = D, cols = colsAll(), sub = m => `sc-sub ${d.mode === m ? '' : 'off'}`, r = (m, t) => `<label class="sc-opt"><input type="radio" name="scMode" value="${m}" ${d.mode === m ? 'checked' : ''}> ${t}</label>`;
    const p = window.EasyUX2.panel('scPanel', '🔎 Select Cases', `<div class="sc-dlg">
      <fieldset><legend>Select</legend>
        ${r('all', '<b>All cases</b>')}
        ${r('if', '<b>If condition is satisfied</b>')}<div class="${sub('if')}" style="display:block">${d.conds.map(condRow).join('')}
          <div class="row" style="gap:6px;margin-top:6px"><button class="btn ghost small" type="button" data-scact="add">＋ Add condition</button><span class="legend-note">AND is applied before OR; use the brackets to change that.</span></div></div>
        ${r('random', '<b>Random sample of cases</b>')}<div class="${sub('random')}">
          <label><input type="radio" name="scSk" value="pct" ${d.sample.kind === 'pct' ? 'checked' : ''}> Approximately <input type="number" min="1" max="99" data-scs="pct" value="${esc(d.sample.pct)}"> % of all cases</label></div>
          <div class="${sub('random')}"><label><input type="radio" name="scSk" value="exact" ${d.sample.kind !== 'pct' ? 'checked' : ''}> Exactly <input type="number" min="2" data-scs="n" value="${esc(d.sample.n)}"> cases from the first <input type="number" min="0" data-scs="from" value="${esc(d.sample.from)}" placeholder="all"> cases</label></div>
          <div class="${sub('random')}"><label>Seed <input type="number" min="1" data-scs="seed" value="${esc(d.sample.seed)}"></label><span class="legend-note">the same seed gives the same patients</span></div>
        ${r('range', '<b>Based on case range</b>')}<div class="${sub('range')}"><label><input type="radio" name="scRb" value="rows" ${d.range.by !== 'date' ? 'checked' : ''}> Rows from <input type="number" min="1" data-scr="from" value="${esc(d.range.from)}"> to <input type="number" min="1" data-scr="to" value="${esc(d.range.to)}" placeholder="last"></label></div>
          <div class="${sub('range')}"><label><input type="radio" name="scRb" value="date" ${d.range.by === 'date' ? 'checked' : ''}> Date</label><select data-scr="dateCol"><option value="">— column —</option>${optCols(d.range.dateCol)}</select> from <input type="date" data-scr="d1" value="${esc(d.range.d1)}"> to <input type="date" data-scr="d2" value="${esc(d.range.d2)}"></div>
        ${r('var', '<b>Use filter variable</b>')}<div class="${sub('var')}"><select data-scf="1"><option value="">— column —</option>${optCols(d.fvar, cols)}</select><span class="legend-note">keeps the rows where it is 1, yes or any value other than 0 / no / blank</span></div>
      </fieldset>
      <div class="sc-words" id="scWords"></div>
      <fieldset><legend>Output</legend>
        <label class="sc-opt"><input type="radio" name="scOut" value="filter" ${d.output === 'filter' ? 'checked' : ''}> <b>Filter out unselected cases</b> <span class="legend-note">— kept in the data, greyed and struck through in the sheet</span></label>
        <label class="sc-opt"><input type="radio" name="scOut" value="copy" ${d.output === 'copy' ? 'checked' : ''}> <b>Copy selected cases to a new dataset</b> <span class="legend-note">— a snapshot (step 1 › Snapshots) and an Excel file; the data stay whole</span></label>
        <label class="sc-opt"><input type="radio" name="scOut" value="delete" ${d.output === 'delete' ? 'checked' : ''}> <b>Delete unselected cases</b> <span class="legend-note">— removed from the data (Undo restores them)</span></label>
        <label class="check" style="margin:6px 0 0"><input type="checkbox" data-scflow ${d.flow ? 'checked' : ''}><span>A box for the patients not selected in the flowchart</span></label>
      </fieldset>
      <div class="row" style="gap:6px;justify-content:flex-end"><button class="btn ghost small" type="button" data-scact="reset">↺ Reset</button><button class="btn ghost small" type="button" data-scact="cancel">Cancel</button><button class="btn primary small" type="button" data-scact="ok">OK</button></div></div>`);
    p.querySelector('.x').onclick = () => { D = null; p.classList.remove('open'); };
    words();
  }
  function words() { const w = $('#scWords'); if (!w || !D) return; const c = cfgOf(D), n = S().data.rows.length, on = A.selectionOn(c), k = on ? A.filterRows(c, S().data.rows).length : n;
    w.innerHTML = on ? `<span class="sc-count">${k} of ${n} patients</span> selected — ${esc(A.filterText(c))}.` : D.mode === 'all' ? `<span class="sc-count">All ${n} patients</span> are analysed.` : `<span class="sc-count">${n} of ${n}</span> — the selection is not complete yet.`; }
  const readField = t => { const d = D; if (!d) return;
    const ci = t.closest('[data-sci]'); if (ci && t.dataset.sck) { const f = d.conds[+ci.dataset.sci], k = t.dataset.sck; f[k] = t.value; if (k === 'op' || k === 'col') return 'redraw'; return; }
    if (t.name === 'scMode') { d.mode = t.value; return 'redraw'; }
    if (t.name === 'scSk') { d.sample.kind = t.value; return; } if (t.dataset.scs) { d.sample[t.dataset.scs] = t.value; return; }
    if (t.name === 'scRb') { d.range.by = t.value; return; } if (t.dataset.scr) { d.range[t.dataset.scr] = t.value; if (t.dataset.scr === 'dateCol' && t.value) d.range.by = 'date'; return 'redraw'; }
    if (t.dataset.scf) { d.fvar = t.value; return; } if (t.name === 'scOut') { d.output = t.value; return; } if (t.dataset.scflow !== undefined) { d.flow = t.checked; } };
  document.addEventListener('input', e => { if (!e.target.closest || !e.target.closest('#scPanel')) return; if (e.target.type === 'radio' || e.target.tagName === 'SELECT') return; readField(e.target); words(); });
  document.addEventListener('change', e => { if (!e.target.closest || !e.target.closest('#scPanel')) return; if (readField(e.target) === 'redraw') drawSelect(); else words(); });
  document.addEventListener('click', e => { const b = e.target.closest('#scPanel [data-scact], #scPanel [data-scdel]'); if (!b || !D) return;
    if (b.dataset.scdel !== undefined) { D.conds.splice(+b.dataset.scdel, 1); if (!D.conds.length) D.conds.push({ col: colsAll()[0], op: 'eq', val: '', on: true }); drawSelect(); return; }
    const k = b.dataset.scact;
    if (k === 'add') { D.mode = 'if'; D.conds.push({ col: D.conds[D.conds.length - 1].col, op: 'eq', val: '', on: true, join: 'and' }); drawSelect(); return; }
    if (k === 'reset') { const o = D.output; D = { ...draftFrom({ ...S().cfg, rowFilter: [], sample: {}, caseRange: {}, filterVar: {} }), output: o, __open: true }; drawSelect(); return; }
    if (k === 'cancel') { D = null; $('#scPanel').classList.remove('open'); return; }
    if (k === 'ok') applySelect(); });
  function applySelect() {
    const d = D, cfg = S().cfg, c = cfgOf(d), n = S().data.rows.length;
    if (d.mode === 'if') { const bal = d.conds.reduce((t, f) => t + (+f.open || 0) - (+f.close || 0), 0); if (bal !== 0) { alert(`The brackets do not match: ${bal > 0 ? bal + ' “(” not closed' : -bal + ' “)” too many'}.`); return; } }
    if (d.mode === 'var' && !d.fvar) { alert('Choose the filter variable.'); return; }
    if (d.mode === 'range' && d.range.by === 'date' && !d.range.dateCol) { alert('Choose the date column.'); return; }
    const keep = A.selectionOn(c) ? A.filterRows(c, S().data.rows) : S().data.rows, out = n - keep.length;
    if (d.mode !== 'all' && !keep.length) { alert('No patient meets this selection — nothing was changed.'); return; }
    const setSel = () => { cfg.rowFilter = c.rowFilter; cfg.sample = c.sample; cfg.caseRange = c.caseRange; cfg.filterVar = c.filterVar; cfg.selFlow = d.flow; };
    const off = () => { (cfg.rowFilter || []).forEach(f => { if (!f.sys) f.on = false; }); if (cfg.sample) cfg.sample.on = false; if (cfg.caseRange) cfg.caseRange.on = false; if (cfg.filterVar) cfg.filterVar.on = false; };
    const done = msg => { D = null; $('#scPanel').classList.remove('open'); cfg.consort = null; S().result = null; try { U.renderFilters(); } catch (e) { /* step 1 not drawn yet */ } try { U.renderGrid(); } catch (e) { /* no grid */ } badges(); U.toast(msg); };
    if (d.output === 'filter' || d.mode === 'all') { setSel(); done(d.mode === 'all' ? 'All patients are analysed' : `${keep.length} of ${n} patients selected`); return; }
    if (d.output === 'copy') {
      const desc = A.filterText(c), snap = { name: `Selected cases: ${desc}`.slice(0, 120), time: new Date().toLocaleString(), data: { ...clone(S().data), rows: clone(keep) }, cfg: (() => { const x = clone({ ...cfg, ...c }); (x.rowFilter || []).forEach(f => { f.on = false; }); ['sample', 'caseRange', 'filterVar'].forEach(k => { if (x[k]) x[k].on = false; }); return x; })() };
      S().snapshots = S().snapshots || []; if (S().snapshots.length >= 8) S().snapshots.shift(); S().snapshots.push(snap);
      try { const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(keep, { header: S().data.headers }), 'Selected cases'); XLSX.writeFile(wb, `${(U.baseName && U.baseName()) || 'Data'} - selected cases.xlsx`); } catch (e) { console.error(e); }
      done(`${keep.length} patients copied: a snapshot (step 1 › Snapshots) and an Excel file — the data on screen are unchanged`); return; }
    if (d.output === 'delete') {
      if (!out) { done('Every patient is selected — nothing to delete'); return; }
      if (!confirm(`Delete the ${out} patients who are not selected? Undo (Ctrl+Z) restores them.`)) return;
      const ks = new Set(keep); U.editSheet(() => { S().data.rows = S().data.rows.filter(r => ks.has(r)); off(); try { U.refreshGroups(); } catch (e) { /* groups redrawn later */ } }, `Select Cases: deleted ${out} unselected patients (${A.filterText(c)})`);
      try { U.renderPrep(); } catch (e) { /* not on step 1 */ } done(`${out} unselected patients deleted`); }
  }

  /* ---------- Split File ---------- */
  let F = null;
  function splitDialog() {
    if (!S().data || !S().cfg) { U.toast('Open a data file first'); return; }
    const sg = S().cfg.subgroup || {}, cols = (U.subCols ? U.subCols(sg) : sg.cols || []).filter(c => colsAll().includes(c));
    F = F && F.__open ? F : { mode: cols.length && sg.mode !== 'off' ? (sg.mode === 'compare' ? 'compare' : 'organize') : 'off', cols: [...cols], combine: sg.combine === 'all' ? 'all' : 'each', overall: sg.overall !== false, minN: sg.minN ?? 5, __open: true };
    drawSplit();
  }
  function drawSplit() {
    const f = F, cands = U.subCands ? U.subCands() : colsAll(), avail = cands.filter(c => !f.cols.includes(c)), dis = f.mode === 'off' ? 'disabled' : '';
    const r = (m, t, note) => `<label class="sc-opt"><input type="radio" name="sfMode" value="${m}" ${f.mode === m ? 'checked' : ''}> <b>${t}</b>${note ? ` <span class="legend-note">— ${note}</span>` : ''}</label>`;
    const p = window.EasyUX2.panel('sfPanel', '🧩 Split File', `<div class="sc-dlg">
      <fieldset><legend>Split</legend>${r('off', 'Analyze all cases, do not create groups')}${r('compare', 'Compare groups', 'one table, the subgroups side by side (a wide table turns to a landscape page)')}${r('organize', 'Organize output by groups', 'tables, figures and comments for each subgroup')}</fieldset>
      <fieldset ${dis}><legend>Groups based on</legend><div class="sc-two">
        <div><label class="f">Variables (categorical, 2–12 categories)</label><select multiple id="sfAvail" size="8">${avail.map(c => `<option value="${esc(c)}">${esc(lab(c))}${c === S().cfg.groupCol ? ' (group)' : ''}</option>`).join('')}</select></div>
        <div class="sc-arrows"><button class="btn ghost small" type="button" data-sfact="in" title="Add">➡</button><button class="btn ghost small" type="button" data-sfact="out" title="Remove">⬅</button></div>
        <div><label class="f">Groups based on</label><select multiple id="sfIn" size="8">${f.cols.map(c => `<option value="${esc(c)}">${esc(lab(c))}</option>`).join('')}</select>
          <div class="row" style="gap:4px;margin-top:4px"><button class="btn ghost small" type="button" data-sfact="up" title="Move up">▲</button><button class="btn ghost small" type="button" data-sfact="down" title="Move down">▼</button></div></div></div>
        ${f.cols.length > 1 ? `<label class="sc-opt"><input type="radio" name="sfComb" value="all" ${f.combine === 'all' ? 'checked' : ''}> Every combination of the variables (as SPSS: e.g. Male · Diabetic)</label><label class="sc-opt"><input type="radio" name="sfComb" value="each" ${f.combine !== 'all' ? 'checked' : ''}> Each variable separately</label>` : ''}
        <label class="check" style="margin:6px 0 2px"><input type="checkbox" id="sfOverall" ${f.overall ? 'checked' : ''}><span>Also the tables of all the patients</span></label>
        <label style="display:block;margin-top:4px">Skip subgroups with fewer than <input type="number" min="0" id="sfMin" value="${esc(f.minN)}" style="width:70px"> patients</label>
      </fieldset>
      <div class="sc-words" id="sfWords"></div>
      <div class="row" style="gap:6px;justify-content:flex-end"><button class="btn ghost small" type="button" data-sfact="reset">↺ Reset</button><button class="btn ghost small" type="button" data-sfact="cancel">Cancel</button><button class="btn primary small" type="button" data-sfact="ok">OK</button></div></div>`);
    p.querySelector('.x').onclick = () => { F = null; p.classList.remove('open'); };
    splitWords();
  }
  function splitWords() { const w = $('#sfWords'); if (!w || !F) return; const f = F;
    if (f.mode === 'off' || !f.cols.length) { w.textContent = f.mode === 'off' ? 'All patients are analysed together.' : 'Choose at least one variable.'; return; }
    const rows = A.filterRows(S().cfg, S().data.rows), lv = c => A.levelsOf(S().cfg, rows, c), nm = (c, l) => c === S().cfg.groupCol ? (S().cfg.groupLabels[l] || l) : (U.valueLabel ? U.valueLabel(c, l) : l);
    const sets = f.combine === 'all' && f.cols.length > 1 ? f.cols.reduce((acc, c) => acc.flatMap(a => lv(c).map(l => [...a, [c, l]])), [[]]) : f.cols.flatMap(c => lv(c).map(l => [[c, l]]));
    const sizes = sets.map(s => [s.map(([c, l]) => nm(c, l)).join(' · '), rows.filter(r => s.every(([c, l]) => String(r[c] ?? '').trim().toLowerCase() === String(l).trim().toLowerCase() || (A.toNum(r[c]) === A.toNum(l) && isFinite(A.toNum(l))))).length]);
    const small = sizes.filter(x => +f.minN && x[1] < +f.minN);
    w.innerHTML = `<b>${sets.length} subgroup${sets.length > 1 ? 's' : ''}</b>: ${sizes.map(([t, n]) => `${esc(t)} (n = ${n})`).join(', ')}${small.length ? `<br><span class="legend-note">Skipped as smaller than ${+f.minN}: ${small.map(x => esc(x[0])).join(', ')}</span>` : ''}`; }
  const sel = id => [...$(id).selectedOptions].map(o => o.value);
  document.addEventListener('change', e => { const t = e.target; if (!t.closest || !t.closest('#sfPanel') || !F) return;
    if (t.name === 'sfMode') { F.mode = t.value; if (F.mode !== 'off' && !F.cols.length && U.subCands) { /* nothing chosen yet */ } drawSplit(); return; }
    if (t.name === 'sfComb') { F.combine = t.value; } if (t.id === 'sfOverall') F.overall = t.checked; if (t.id === 'sfMin') F.minN = +t.value || 0; splitWords(); });
  document.addEventListener('dblclick', e => { const o = e.target.closest('#sfAvail option, #sfIn option'); if (!o || !F) return; const c = o.value; if (o.parentElement.id === 'sfAvail') F.cols.push(c); else F.cols = F.cols.filter(x => x !== c); if (F.mode === 'off') F.mode = 'organize'; drawSplit(); });
  document.addEventListener('click', e => { const b = e.target.closest('#sfPanel [data-sfact]'); if (!b || !F) return; const k = b.dataset.sfact;
    if (k === 'in') { const s = sel('#sfAvail'); if (!s.length) return; F.cols.push(...s); if (F.mode === 'off') F.mode = 'organize'; drawSplit(); return; }
    if (k === 'out') { const s = sel('#sfIn'); F.cols = F.cols.filter(c => !s.includes(c)); drawSplit(); return; }
    if (k === 'up' || k === 'down') { const s = sel('#sfIn')[0]; if (!s) return; const i = F.cols.indexOf(s), j = k === 'up' ? i - 1 : i + 1; if (j < 0 || j >= F.cols.length) return; [F.cols[i], F.cols[j]] = [F.cols[j], F.cols[i]]; drawSplit(); [...$('#sfIn').options].forEach(o => { o.selected = o.value === s; }); return; }
    if (k === 'reset') { F = { mode: 'off', cols: [], combine: 'each', overall: true, minN: 5, __open: true }; drawSplit(); return; }
    if (k === 'cancel') { F = null; $('#sfPanel').classList.remove('open'); return; }
    if (k === 'ok') { const f = F; if (f.mode !== 'off' && !f.cols.length) { alert('Choose at least one variable to split by, or “Analyze all cases”.'); return; }
      const cfg = S().cfg; cfg.subgroup = { cols: f.mode === 'off' ? [] : [...f.cols], overall: f.overall, mode: f.mode, combine: f.combine, minN: +f.minN || 0 };
      cfg.consort = null; S().result = null; F = null; $('#sfPanel').classList.remove('open'); try { U.renderSubgroup(); } catch (e) { /* step 2 not drawn yet */ } badges();
      U.toast(f.mode === 'off' ? 'Split File off: all patients together' : `Split File: ${f.mode === 'compare' ? 'compare groups' : 'organise output by groups'}`); } });

  /* ---------- the buttons: header badges, the ☰ More menu, step 1 (filter) and step 2 (subgroups) ---------- */
  const btn = (id, text, title, fn, cls = 'btn light small') => { const b = document.createElement('button'); b.type = 'button'; b.className = cls; if (id) b.id = id; b.textContent = text; b.title = title; b.onclick = fn; return b; };
  (function mount() {
    const more = $('.ux-more'), top = more && more.parentElement;
    if (top) { top.insertBefore(btn('scBadge', '🔎 Filter: off', 'Select Cases', selectDialog, 'btn light small sc-badge'), more); top.insertBefore(btn('sfBadge', '🧩 Split: off', 'Split File', splitDialog, 'btn light small sc-badge'), more); }
    const menu0 = $('.ux-menu'); if (menu0) ['#btnTheme', '#btnKeys'].forEach(q => { const b = $(q); if (b && b.closest('.top-actions')) { b.classList.remove('light'); b.classList.add('ghost'); menu0.appendChild(b); } });
    const menu = $('.ux-menu'); if (menu) { menu.appendChild(btn('', '🔎 Select Cases…', 'Choose the patients to analyse (as SPSS: Data › Select Cases)', selectDialog, 'btn ghost small')); menu.appendChild(btn('', '🧩 Split File…', 'Repeat the analysis in subgroups (as SPSS: Data › Split File)', splitDialog, 'btn ghost small')); }
    const fa = $('#filterAdd'); if (fa) fa.after(btn('', '🔎 Select Cases…', 'AND / OR with brackets, random samples, row or date ranges, a filter variable — and what to do with the others', selectDialog, 'btn ghost small'));
    const sa = $('#subNone'); if (sa) sa.after(btn('', '🧩 Split File…', 'Compare the subgroups side by side, or tables for each subgroup; combinations of two variables; small subgroups skipped', splitDialog, 'btn ghost small'));
    badges();
  })();
  window.EasySelect = { selectDialog, splitDialog, badges };
})();

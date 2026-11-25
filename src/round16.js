/* Prof Easy Stat — round 16: Report details first in step 1 once data are open (with "What do you want to do?" and
   ⚡ Make my report), and a tick view of the tables of the report (each variable ticked into a table, a new table, or left out). */
(() => {
  const U = window.EasyUI; if (!U) return;
  const S = () => U.state, $ = s => document.querySelector(s), esc = U.esc;
  const css = document.createElement('style');
  css.textContent = `.r16-quick{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 10px}.r16-quick .ux-goals{margin:0}
#r16Tick{margin:8px 0 10px}#r16Tick table{border-collapse:collapse;width:100%;font-size:13px}#r16Tick th,#r16Tick td{border-bottom:1px solid var(--line);padding:4px 6px;text-align:center;white-space:nowrap}
#r16Tick th{position:sticky;top:0;background:var(--card);z-index:1;font-size:12px}#r16Tick td:first-child,#r16Tick th:first-child,#r16Tick td:nth-child(2),#r16Tick th:nth-child(2){text-align:left}
#r16Tick tr:hover td{background:var(--lav)}#r16Tick .r16-wrap{max-height:460px;overflow:auto;border:1px solid var(--line);border-radius:10px}#r16Tick input[type=radio]{width:18px;height:18px;cursor:pointer}
#r16Tick .r16-bar{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin:0 0 6px}html.r16-tickview #tablesBoard{display:none!important}`;
  document.head.appendChild(css);

  /* ---------- step 1: Report details first once data are open; the goals and ⚡ Make my report in it ---------- */
  function details() { const p1 = $('#p1'); if (!p1) return; const card = [...p1.querySelectorAll(':scope > .card')].find(c => /^\s*(▾\s*)?Report details/.test((c.querySelector('h2') || {}).textContent || '')); if (!card) return;
    const first = p1.querySelector(':scope > .card');
    if (S().data) { if (first !== card) p1.insertBefore(card, first); } // after the data are chosen it comes first
    let q = card.querySelector('.r16-quick'); if (!q) { q = document.createElement('div'); q.className = 'r16-quick'; const h = card.querySelector('h2'); h.after(q); if (false) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'btn primary small'; b.id = 'r16Quick'; b.textContent = '⚡ Make my report (2 choices)'; b.title = 'The group column and the main outcome, then the report — everything else as recommended'; b.onclick = () => { if (window.EasyUX2 && EasyUX2.quickStart) EasyUX2.quickStart(); }; q.appendChild(b); } }
    const g = document.querySelector('.ux-goals'); if (g && !q.contains(g)) q.prepend(g); }

  /* ---------- the tick view of the tables ---------- */
  let tick = false, newName = '';
  const names = () => { const cfg = S().cfg, seen = []; [...cfg.variables].filter(v => v.include && v.kind !== 'repeated').sort((a, b) => (a.pos ?? 0) - (b.pos ?? 0)).forEach(v => { const t = v.table || ''; if (!seen.includes(t)) seen.push(t); }); (cfg.emptyTables || []).forEach(t => { if (!seen.includes(t)) seen.push(t); }); return seen; };
  const vars = () => { const cfg = S().cfg; return cfg.variables.filter(v => v.kind !== 'repeated' && v.role !== 'ignore' && !(v.cols && v.cols[0] && v.cols[0].col === cfg.groupCol)); };
  function drawTick() { const host = $('#r16Tick'); if (!host) return; if (!tick || !S().cfg) { host.innerHTML = ''; return; }
    const T = names(), vs = vars(), sel = S().r16sel = S().r16sel || new Set();
    host.innerHTML = `<div class="r16-bar"><b>☑ Tick view</b><span class="legend-note">one row per variable: tick its table, a new table, or leave it out</span><span class="spacer" style="flex:1"></span>
      <span class="legend-note">${sel.size} ticked →</span><select id="r16To" style="width:auto"><option value="">Put the ticked into…</option>${T.map(t => `<option value="t:${esc(t)}">${esc(t || '(no table name)')}</option>`).join('')}<option value="new">➕ A new table…</option><option value="out">✕ Leave out of the report</option></select></div>
      <div class="r16-wrap"><table><thead><tr><th><input type="checkbox" id="r16All" title="Tick every variable"></th><th>Variable</th>${T.map((t, i) => `<th title="${esc(t)}">${esc((t || '(no name)').slice(0, 22))}${t.length > 22 ? '…' : ''}</th>`).join('')}<th title="A new table">➕ New</th><th>Left out</th></tr></thead>
      <tbody>${vs.map(v => `<tr><td><input type="checkbox" data-r16s="${esc(v.id)}" ${sel.has(v.id) ? 'checked' : ''}></td><td><b>${esc(v.label)}</b></td>${T.map((t, i) => `<td><input type="radio" name="r16_${esc(v.id)}" data-r16v="${esc(v.id)}" data-r16t="${i}" ${v.include && (v.table || '') === t ? 'checked' : ''} aria-label="${esc(v.label)} in ${esc(t)}"></td>`).join('')}
        <td><input type="radio" name="r16_${esc(v.id)}" data-r16v="${esc(v.id)}" data-r16t="new" aria-label="${esc(v.label)} in a new table"></td><td><input type="radio" name="r16_${esc(v.id)}" data-r16v="${esc(v.id)}" data-r16t="out" ${!v.include ? 'checked' : ''} aria-label="Leave ${esc(v.label)} out"></td></tr>`).join('')}</tbody></table></div>`; }
  function askNew() { const n = (prompt('Name of the new table:', newName || `Table ${names().length + 1}`) || '').trim(); if (n) newName = n; return n; }
  function put(ids, where) { const cfg = S().cfg; let n = 0; const T = names();
    let target = null; if (where === 'new') { target = askNew(); if (!target) return; } else if (where !== 'out') target = typeof where === 'number' ? T[where] : where;
    const maxPos = Math.max(0, ...cfg.variables.map(v => v.pos ?? 0));
    ids.forEach(id => { const v = cfg.variables.find(x => x.id === id); if (!v) return; if (where === 'out') v.include = false; else { v.include = true; if ((v.table || '') !== target) { v.table = target; if (where === 'new') v.pos = maxPos + 1; } } n++; });
    S().result = null; try { U.renderTablesBoard && U.renderTablesBoard(); } catch (e) { /* drawn later */ } drawTick(); U.toast(where === 'out' ? `${n} left out of the report` : `${n} in “${target}”`); }
  document.addEventListener('change', e => { const t = e.target; if (!t.closest || !t.closest('#r16Tick')) return; const sel = S().r16sel = S().r16sel || new Set();
    if (t.dataset.r16v) { const w = t.dataset.r16t; put([t.dataset.r16v], w === 'new' || w === 'out' ? w : +w); return; }
    if (t.dataset.r16s) { t.checked ? sel.add(t.dataset.r16s) : sel.delete(t.dataset.r16s); drawTick(); return; }
    if (t.id === 'r16All') { vars().forEach(v => t.checked ? sel.add(v.id) : sel.delete(v.id)); drawTick(); return; }
    if (t.id === 'r16To' && t.value) { if (!sel.size) { U.toast('Tick the variables first'); t.value = ''; return; } const v = t.value; put([...sel], v === 'new' || v === 'out' ? v : v.slice(2)); sel.clear(); drawTick(); } });
  (function mount() { const pa = $('#tbPrevAll'); if (!pa) return; const b = document.createElement('button'); b.type = 'button'; b.className = 'btn ghost small'; b.id = 'r16TickBtn'; b.textContent = '☑ Tick view'; b.title = 'Another view: each variable on a row, its table ticked — tick another table, a new table, or leave it out';
    b.onclick = () => { tick = !tick; document.documentElement.classList.toggle('r16-tickview', tick); b.textContent = tick ? '🗂 Card view' : '☑ Tick view'; drawTick(); }; pa.before(b);
    const host = document.createElement('div'); host.id = 'r16Tick'; const board = $('#tablesBoard'); if (board) { board.before(host); let t0 = null; new MutationObserver(() => { if (!tick) return; clearTimeout(t0); t0 = setTimeout(drawTick, 150); }).observe(board, { childList: true }); } })();

  // step 1: the ways to start, in one row before “📋 Paste from Excel”
  function startRow() { const pb = $('#btnPaste'); if (!pb) return; const row = pb.parentElement;
    ['#r19Imp .btn', '#r19Imp label.btn', '#ezSample', '#ezQuickB'].forEach(q => document.querySelectorAll(q).forEach(x => { if (x.parentElement !== row) row.insertBefore(x, pb); }));
    // round 20: 📋 Paste from Excel first; no ⚡ Make my report, 🧱 Master sheet builder or 👀 example-report buttons here (the builder is in the bar above, the examples below)
    ['#ezSample', '#btnBuilder'].forEach(q => { const x = $(q); if (x) x.style.display = 'none'; }); if (row.firstElementChild !== pb) row.prepend(pb);
    const qb = $('#ezQuickB'); if (qb) { qb.style.display = ''; if (pb.nextElementSibling !== qb) pb.after(qb); }
    document.querySelectorAll('#p1 .card > .row').forEach(r => { if (r !== row && ![...r.children].some(c => c.style.display !== 'none')) r.style.display = 'none'; }); }
  setInterval(() => { if (S().step === 1 || !S().data) { details(); startRow(); } }, 800); details(); setTimeout(startRow, 900);
  window.EasyR16 = { drawTick, details };
})();

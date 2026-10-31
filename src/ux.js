/* Prof MSE Easy Stat — interface layer: tour, command palette, navigation aids, display settings, sheet helpers,
   report-reading aids, feedback, export centre, sharing and personalisation. Works through window.EasyUI. */
(() => {
  const U = window.EasyUI; if (!U) return;
  const S = () => U.state, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], esc = U.esc;
  const ls = { get: (k, d) => { try { const v = localStorage.getItem('ux.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('ux.' + k, JSON.stringify(v)); } catch (e) { /* storage blocked */ } } };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const stepOf = node => { const p = node && node.closest && node.closest('.panel'); return p ? +p.id.slice(1) : 0; };
  const activeStep = () => S().step || 1;
  const flash = node => { if (!node) return; node.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.classList.contains('ux-still') ? 'auto' : 'smooth', block: 'center' }); node.classList.add('ux-flash'); setTimeout(() => node.classList.remove('ux-flash'), 1600); };
  const goTo = (n, then) => { if (n && n !== activeStep()) U.go(n); setTimeout(() => then && then(), 60); };
  const words = t => (String(t || '').trim().match(/\S+/g) || []).length;

  /* ---------- header tools: palette, tour, view settings, messages, export centre, autosave time ---------- */
  const keys = $('#btnKeys'), bar = el('span', 'ux-hbar');
  bar.innerHTML = `<button class="btn light small" id="uxPal" title="Find any action or setting (Ctrl+K)">🔍 Find</button><button class="btn light small" id="uxTour" title="A short guided tour">❓ Tour</button>
    <button class="btn light small" id="uxView" title="Display: text size, density, contrast, font, motion, layout">👁 View</button><button class="btn light small" id="uxBell" title="Recent messages">🔔 <span id="uxBellN"></span></button>
    <button class="btn light small" id="uxExport" title="Every export in one place">📦 Exports</button><span class="ux-saved" id="uxSaved" title="Your work is kept in this browser automatically"></span>`;
  if (keys) keys.parentNode.insertBefore(bar, keys.nextSibling);
  // the header on one row: everyday actions in view, the rest under "☰ More"; the labels shrink to icons on narrow screens
  (function tidyHeader() { const top = $('.top-actions'); if (!top) return;
    const more = el('div', 'ux-more'), mb = el('button', 'btn light small', '☰ <span class="tl">More</span>'); mb.type = 'button'; mb.id = 'uxMore'; mb.title = 'Theme, shortcuts, tour, display, setups'; mb.setAttribute('aria-haspopup', 'true'); mb.setAttribute('aria-expanded', 'false');
    const menu = el('div', 'ux-menu'); menu.setAttribute('role', 'menu'); more.append(mb, menu);
    ['#uxTour', '#uxView', '#btnTheme', '#btnKeys', '#btnSaveCfg'].forEach(q => { const b = $(q); if (b) menu.appendChild(b); });
    const load = $('#cfgFile') && $('#cfgFile').closest('label'); if (load) menu.appendChild(load);
    const order = ['#btnNew', () => $('#projFile') && $('#projFile').closest('label'), '#btnSaveProj', '#uxPal', '#uxExport', '#uxBell', '#uxSaved'];
    order.forEach(q => { const n = typeof q === 'function' ? q() : $(q); if (n) top.appendChild(n); }); top.appendChild(more); bar.remove();
    // icon + label: the label hides on narrow screens, the full name stays as the tooltip
    [...top.querySelectorAll(':scope > .btn, :scope > label.btn'), ...menu.querySelectorAll('.btn')].forEach(b => { if (b.querySelector('.tl')) return; const t = [...b.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (!t) return;
      const m = /^(\s*[^\sA-Za-z0-9]+\s*)?(.*)$/s.exec(t.textContent), ic = (m[1] || '').trim(), lab = (m[2] || '').trim(); const sp = el('span', 'tl', esc(lab)); t.replaceWith(document.createTextNode(ic ? ic + ' ' : ''), sp); if (!b.title) b.title = lab; if (!b.getAttribute('aria-label')) b.setAttribute('aria-label', lab); });
    const close = () => { menu.classList.remove('open'); mb.setAttribute('aria-expanded', 'false'); };
    mb.onclick = e => { e.stopPropagation(); document.querySelectorAll('.ux-pop.open').forEach(p => p.classList.remove('open')); const o = menu.classList.toggle('open'); mb.setAttribute('aria-expanded', String(o)); };
    menu.addEventListener('click', e => { if (e.target.closest('.btn') && !e.target.closest('label')) close(); });
    document.addEventListener('click', e => { if (!more.contains(e.target)) close(); }); document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); }); })();
  const live = el('div', 'ux-sr'); live.setAttribute('aria-live', 'polite'); live.id = 'uxLive'; document.body.appendChild(live);

  /* ---------- 34. message history (every toast) ---------- */
  const msgs = []; const toastEl = $('#toast');
  if (toastEl) { toastEl.setAttribute('role', 'status'); new MutationObserver(() => { const t = toastEl.textContent.trim(); if (t && (!msgs.length || msgs[0].t !== t || Date.now() - msgs[0].at > 1500)) { msgs.unshift({ t, at: Date.now() }); if (msgs.length > 50) msgs.pop(); $('#uxBellN').textContent = msgs.length; live.textContent = t; } }).observe(toastEl, { childList: true, characterData: true, subtree: true }); }
  const panel = (id, title, html) => { $$('.ux-pop.open').forEach(x => { if (x.id !== id) x.classList.remove('open'); }); let p = document.getElementById(id); if (!p) { p = el('div', 'ux-pop'); p.id = id; document.body.appendChild(p); }
    p.innerHTML = `<div class="ux-pop-h"><b>${title}</b><span class="spacer"></span><button class="btn ghost small" data-uxclose type="button" aria-label="Close">✕</button></div><div class="ux-pop-b">${html}</div>`; p.classList.add('open'); p.querySelector('[data-uxclose]').onclick = () => p.classList.remove('open'); return p; };
  $('#uxBell').onclick = () => panel('uxMsgs', 'Recent messages', msgs.length ? `<ul class="ux-list">${msgs.map(m => `<li><span class="legend-note">${new Date(m.at).toLocaleTimeString()}</span> ${esc(m.t)}</li>`).join('')}</ul>` : '<p class="legend-note">No messages yet.</p>');

  /* ---------- 36. autosave indicator ---------- */
  setInterval(() => { let t = null; try { const s = localStorage.getItem('easystat.autosave'); if (s) { const i = s.indexOf('"saved":"'); if (i >= 0) t = new Date(s.slice(i + 9, i + 33)); } } catch (e) { /* blocked */ }
    const box = $('#uxSaved'); if (!box) return; if (!t || !isFinite(t) || !S().data) { box.textContent = ''; return; } const sec = Math.max(0, Math.round((Date.now() - t) / 1000)); box.textContent = `✓ Saved ${sec < 60 ? sec + ' s' : Math.round(sec / 60) + ' min'} ago`; }, 5000);

  /* ---------- 39, 40, 42, 43, 10. display settings ---------- */
  const VIEW = { zoom: '100', density: 'normal', contrast: false, dyslexic: false, still: false, rtl: false, rail: false, ...ls.get('view', {}) };
  function applyView() { const h = document.documentElement; h.style.fontSize = VIEW.zoom === '100' ? '' : `${VIEW.zoom}%`; h.style.zoom = VIEW.zoom === '100' ? '' : String(+VIEW.zoom / 100);
    ['contrast', 'dyslexic', 'still', 'rail'].forEach(k => h.classList.toggle('ux-' + k, !!VIEW[k])); h.classList.toggle('ux-compact', VIEW.density === 'compact'); h.classList.toggle('ux-roomy', VIEW.density === 'roomy');
    document.body.dir = VIEW.rtl ? 'rtl' : ''; ls.set('view', VIEW); }
  applyView();
  $('#uxView').onclick = () => { const p = panel('uxViewP', 'View', `<div class="grid g2">
      <div><label class="f">Interface size</label><select data-uv="zoom">${['85', '100', '115', '130'].map(z => `<option ${VIEW.zoom === z ? 'selected' : ''}>${z}</option>`).join('')}</select></div>
      <div><label class="f">Density</label><select data-uv="density">${[['compact', 'Compact'], ['normal', 'Comfortable'], ['roomy', 'Spacious']].map(([k, l]) => `<option value="${k}" ${VIEW.density === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div></div>
      ${[['contrast', 'High contrast'], ['dyslexic', 'Easy-reading font (wider spacing)'], ['still', 'Reduce motion'], ['rtl', 'Right-to-left layout'], ['rail', 'Steps as a side rail']].map(([k, l]) => `<label class="check"><input type="checkbox" data-uv="${k}" ${VIEW[k] ? 'checked' : ''}><span>${l}</span></label>`).join('')}
      <div class="row" style="gap:6px;margin-top:6px"><button class="btn ghost small" id="uxSplit" type="button">▤ Data sheet beside the step</button><button class="btn ghost small" id="uxTimeline" type="button">↶ Undo timeline</button></div>`);
    p.onchange = e => { const k = e.target.dataset.uv; if (!k) return; VIEW[k] = e.target.type === 'checkbox' ? e.target.checked : e.target.value; applyView(); };
    $('#uxSplit').onclick = toggleSplit; $('#uxTimeline').onclick = undoTimeline; };

  /* ---------- 41. accessibility of the controls: names for icon-only buttons, visible focus ---------- */
  const nameIcons = root => (root || document).querySelectorAll('button:not([aria-label]),.btn:not([aria-label])').forEach(b => { const t = b.textContent.trim(); if (!/[A-Za-z]{2}/.test(t) && b.title) b.setAttribute('aria-label', b.title); });
  nameIcons(); new MutationObserver(ms => ms.forEach(m => m.addedNodes.forEach(n => { if (n.nodeType === 1) nameIcons(n); }))).observe(document.body, { childList: true, subtree: true });

  /* ---------- 7, 13, 48. command palette: steps, buttons, settings and analyses ---------- */
  function paletteItems() {
    const out = U.STEPS.map(([l, s], i) => ({ kind: 'Step', label: `${i + 1} · ${l} — ${s}`, run: () => U.go(i + 1) }));
    $$('main .panel button, main .panel [data-advadd], header button').forEach(b => { const t = (b.textContent || '').replace(/\s+/g, ' ').trim(), lab = t.length > 1 ? t : b.title; if (!lab || b.closest('.ux-pop')) return;
      out.push({ kind: 'Action', label: lab + (b.title && t.length > 1 && b.title !== t ? ` — ${b.title}` : ''), node: b, run: () => goTo(stepOf(b), () => { flash(b); if (!b.disabled) b.click(); }) }); });
    $$('main .panel label.f, main .panel label.check span').forEach(l => { const t = l.textContent.replace(/\s+/g, ' ').trim(); if (t.length < 3 || t.length > 120) return;
      out.push({ kind: 'Setting', label: t, node: l, run: () => goTo(stepOf(l), () => { const c = l.closest('label.check') || l.parentNode; const d = c.closest('details'); if (d) d.open = true; flash(c); const inp = c.querySelector('input,select,textarea'); if (inp) inp.focus(); }) }); });
    const fav = ls.get('fav', []); out.forEach(o => { o.fav = fav.some(f => o.label.startsWith(f)); });
    return out;
  }
  function openPalette() {
    const items = paletteItems(), p = panel('uxPalP', 'Find an action or setting', `<input type="search" id="uxPq" placeholder="Type, e.g. kaplan, decimals, export word…" style="width:100%"><ul class="ux-list ux-pl" id="uxPl"></ul><p class="legend-note">↑ ↓ to choose, Enter to go, Esc to close.</p>`);
    p.classList.add('ux-center'); const q = $('#uxPq'), list = $('#uxPl'); let sel = 0, shown = [];
    const draw = () => { const t = q.value.trim().toLowerCase().split(/\s+/).filter(Boolean); shown = items.filter(o => t.every(w => o.label.toLowerCase().includes(w))).sort((a, b) => (b.fav ? 1 : 0) - (a.fav ? 1 : 0)).slice(0, 40); sel = Math.min(sel, shown.length - 1);
      list.innerHTML = shown.map((o, i) => `<li class="${i === sel ? 'on' : ''}" data-pi="${i}"><span class="chip">${o.kind}</span> ${o.fav ? '★ ' : ''}${esc(o.label)}</li>`).join('') || '<li class="legend-note">Nothing found.</li>'; };
    q.oninput = () => { sel = 0; draw(); }; draw(); q.focus();
    q.onkeydown = e => { if (e.key === 'ArrowDown') { sel = Math.min(shown.length - 1, sel + 1); draw(); e.preventDefault(); } else if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); } else if (e.key === 'Enter' && shown[sel]) { p.classList.remove('open'); shown[sel].run(); } else if (e.key === 'Escape') p.classList.remove('open'); };
    list.onclick = e => { const li = e.target.closest('[data-pi]'); if (!li) return; p.classList.remove('open'); shown[+li.dataset.pi].run(); };
  }
  $('#uxPal').onclick = openPalette;
  document.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); } if (e.key === 'Escape') $$('.ux-pop.open').forEach(p => p.classList.remove('open')); }, true);

  /* ---------- 1. guided tour (offered once, never blocking) ---------- */
  const TOUR = [['#stepper', 'The 11 steps', 'Work from left to right: upload, choose variables, set tests, tables, comments, figures, advanced analyses, flowchart, check results, then the Word report. Click any step to jump to it.'],
    ['#p1 .card', 'Step 1 · Your data', 'Upload an Excel, CSV, SPSS or Stata file — or open an example. The sheet can be edited here, with undo.'],
    ['#btnSaveProj', 'Save your project', 'Saves the data, every setting and your edited text in one file. Your work is also kept in this browser automatically.'],
    ['#uxPal', 'Find anything', 'Press Ctrl+K to find any action or setting by name, from any step.'],
    ['#uxMore', 'More', 'Theme, keyboard shortcuts, this tour, display settings (text size, contrast, easy-reading font, reduced motion) and saved setups.'], ['#uxExport', 'Exports', 'Every export — Word, PDF, PowerPoint, figures, Excel — in one place.']];
  function tour(i = 0) {
    $$('.ux-tour').forEach(x => x.remove()); if (i >= TOUR.length) return; const [sel, h, t] = TOUR[i], target = $(sel); if (!target || !target.offsetParent) return tour(i + 1);
    target.scrollIntoView({ block: 'center' }); const r = target.getBoundingClientRect(), hl = el('div', 'ux-tour ux-tour-hl'), card = el('div', 'ux-tour ux-tour-card');
    Object.assign(hl.style, { left: r.left - 6 + 'px', top: r.top - 6 + 'px', width: r.width + 12 + 'px', height: r.height + 12 + 'px' });
    card.innerHTML = `<b>${esc(h)}</b><p>${esc(t)}</p><div class="row" style="gap:6px"><span class="legend-note">${i + 1} / ${TOUR.length}</span><span class="spacer"></span>${i ? '<button class="btn ghost small" data-t="-1" type="button">Back</button>' : ''}<button class="btn ghost small" data-t="x" type="button">Skip</button><button class="btn primary small" data-t="1" type="button">${i === TOUR.length - 1 ? 'Done' : 'Next'}</button></div>`;
    const top = r.bottom + 14 + 200 < innerHeight ? r.bottom + 14 : Math.max(10, r.top - 214); Object.assign(card.style, { left: Math.min(innerWidth - 360, Math.max(10, r.left)) + 'px', top: top + 'px' });
    document.body.append(hl, card); card.querySelector('[data-t="1"]').focus();
    card.onclick = e => { const b = e.target.closest('[data-t]'); if (!b) return; const d = b.dataset.t; if (d === 'x') return $$('.ux-tour').forEach(x => x.remove()); tour(i + +d); };
  }
  $('#uxTour').onclick = () => tour(0);
  if (!ls.get('tourOffered', false)) { ls.set('tourOffered', true); const o = el('div', 'ux-offer', `New here? <button class="btn primary small" type="button" data-o="y">Take a 1-minute tour</button> <button class="btn ghost small" type="button" data-o="n">No thanks</button>`); document.body.appendChild(o);
    o.onclick = e => { const b = e.target.closest('[data-o]'); if (!b) return; o.remove(); if (b.dataset.o === 'y') tour(0); }; setTimeout(() => o.remove(), 20000); }

  /* ---------- 2. "What do you want to do?" — sets up the analyses for the goal ---------- */
  const GOALS = [['groups', 'Compare groups'], ['paired', 'Before / after'], ['survival', 'Survival'], ['diagnostic', 'Diagnostic test'], ['agreement', 'Agreement'], ['prediction', 'Prediction model']];
  const p1card = $('#p1 .card');
  if (p1card) { const g = el('div', 'ux-goals'); g.innerHTML = `<span class="legend-note">What do you want to do?</span> ${GOALS.map(([k, l]) => `<button class="chip ux-goal ${ls.get('goal') === k ? 'on' : ''}" data-goal="${k}" type="button">${l}</button>`).join('')}<span class="legend-note" id="uxGoalNote"></span>`;
    p1card.insertBefore(g, p1card.children[1] || null);
    g.onclick = e => { const b = e.target.closest('[data-goal]'); if (!b) return; const k = ls.get('goal') === b.dataset.goal ? null : b.dataset.goal; ls.set('goal', k); $$('.ux-goal').forEach(x => x.classList.toggle('on', x.dataset.goal === k)); S().uxGoalDone = null;
      $('#uxGoalNote').textContent = k ? 'The matching analyses are added when you reach step 2.' : ''; if (k && S().cfg) applyGoal(); }; }
  function applyGoal() {
    const st = S(), k = ls.get('goal'); if (!k || !st.cfg || !st.data || st.uxGoalDone === st.file + k) return; st.uxGoalDone = st.file + k;
    const H = st.data.headers, rows = st.data.rows, isNum = h => rows.filter(r => r[h] !== null && r[h] !== '' && r[h] !== undefined).every(r => isFinite(+r[h])) && rows.some(r => isFinite(+r[h]) && r[h] !== '' && r[h] !== null);
    const lv = h => [...new Set(rows.map(r => r[h]).filter(v => v !== null && v !== undefined && v !== ''))], bin = H.filter(h => !isNum(h) && lv(h).length === 2 && h !== st.cfg.groupCol), num = H.filter(h => isNum(h) && !st.cfg.idCols.includes(h));
    const pos = h => lv(h).find(v => /^(yes|1|true|positive|dead|died|death|event)$/i.test(String(v))) || lv(h)[1], A = st.cfg.advanced, n0 = A.length, add = a => { if (!A.some(x => x.type === a.type && (x.outcome || '') === (a.outcome || ''))) A.push({ include: true, predictors: [], ...a }); };
    const t = num.find(h => /time|days|month|follow|survival/i.test(h)), ev = bin.find(h => /death|died|event|status|relapse|recur|dead/i.test(h));
    if (k === 'survival' && t && ev) { add({ type: 'survival', outcome: t, event: ev, positive: pos(ev) }); add({ type: 'cox', outcome: t, event: ev, positive: pos(ev), predictors: [st.cfg.groupCol].filter(Boolean) }); }
    else if (k === 'paired') { const base = h => h.replace(/[_\s-]*(pre|post|before|after|baseline|base|d?\d+|day\s?\d+|m\d+|w\d+|t\d+)$/i, ''); const pair = num.map((a, i) => num.slice(i + 1).find(b => base(a) === base(b) && a !== b) && [a, num.slice(i + 1).find(b => base(a) === base(b))]).find(Boolean);
      if (pair) add({ type: 'paired', outcome: pair[0], second: pair[1] }); }
    else if (k === 'diagnostic' && bin[0]) add({ type: 'roc', outcome: bin[0], positive: pos(bin[0]), predictors: num.slice(0, 3) });
    else if (k === 'prediction' && bin[0]) add({ type: 'logistic', outcome: bin[0], positive: pos(bin[0]), predictors: num.slice(0, 5) });
    else if (k === 'agreement') add({ type: 'kappa' });
    else if (k === 'groups') { U.toast('Goal: compare groups — every variable ticked in step 2 is compared between the groups'); return; }
    U.toast(A.length > n0 ? `Goal “${GOALS.find(g => g[0] === k)[1]}”: analysis added in step 8 — check its columns there` : 'Goal set — the matching analyses are already in step 8, or choose the columns there');
  }

  /* ---------- 3, 4, 12. stepper health, time left, "back to where I was" ---------- */
  const visited = new Set(); let lastStep = 0, lastFile = null, backFrom = null;
  const tl = el('div', 'ux-timeleft legend-note'); const stepper = $('#stepper'); if (stepper) stepper.after(tl);
  const backBtn = el('button', 'btn primary small ux-back'); backBtn.type = 'button'; document.body.appendChild(backBtn);
  backBtn.onclick = () => { if (!backFrom) return; const b = backFrom; backFrom = null; backBtn.style.display = 'none'; U.go(b.step); setTimeout(() => scrollTo(0, b.y), 80); };
  function health() {
    const st = S(); if (!st.cfg) return {}; const h = {};
    if (cleanIssues().length) h[1] = 'warn';
    if (!st.cfg.variables.some(v => v.include)) h[2] = 'warn';
    if ((st.cfg.advanced || []).some(a => a.include !== false && a.type !== 'ssize' && !a.outcome && !(a.predictors || []).length && !a.rvar)) h[8] = 'warn';
    try { if (st.cfg.consort && U.flowWarnings(st.cfg.consort).length) h[9] = 'warn'; } catch (e) { /* not ready */ }
    return h;
  }
  function onStepper() {
    const st = S(), n = st.step || 1; visited.add(n);
    if (st.file !== lastFile) { lastFile = st.file; if (st.file && st.data) recordRecent(); visited.clear(); visited.add(n); }
    if (n !== lastStep) { if (n === 1 && lastStep > 1 && st.data) { backFrom = { step: lastStep, y: scrollY }; backBtn.textContent = `↩ Back to step ${lastStep}`; backBtn.style.display = ''; } else if (n !== 1) { backFrom = null; backBtn.style.display = 'none'; }
      lastStep = n; if (n >= 2) applyGoal(); onStepEnter(n); }
    const h = health(); $$('#stepper .step').forEach((s, i) => { const k = i + 1; s.classList.toggle('ux-ok', visited.has(k) && !h[k] && k !== n); s.classList.toggle('ux-warn', !!h[k]); if (h[k]) s.title = 'Needs checking'; });
    const left = st.data ? [...Array(10)].map((_, i) => i + 2).filter(k => !visited.has(k)).length : 11; tl.textContent = !st.data ? '' : st.result ? '✓ Report ready — download it in step 11' : `≈ ${Math.max(1, Math.round(left * 0.7))} min to a Word report (${left} step${left === 1 ? '' : 's'} not opened yet)`;
    showSampleBanner(); crumb();
  }
  if (stepper) new MutationObserver(onStepper).observe(stepper, { childList: true });

  /* ---------- 5. recent work ---------- */
  function recordRecent() { const st = S(), list = ls.get('recent', []).filter(r => r.file !== st.file); list.unshift({ file: st.file, rows: st.data.rows.length, at: Date.now() }); ls.set('recent', list.slice(0, 6)); drawRecent(); }
  function drawRecent() { const list = ls.get('recent', []); let box = $('#uxRecent'); if (!p1card) return; if (!box) { box = el('div', 'ux-recent'); box.id = 'uxRecent'; p1card.appendChild(box); }
    box.innerHTML = list.length ? `<h4 style="margin:10px 0 4px">Recent work</h4>${list.map((r, i) => `<button class="chip ux-rc" type="button" data-rc="${i}" title="Continue this work">📄 ${esc(String(r.file || '').replace(/\.[^.]+$/, ''))} · ${r.rows} rows · ${new Date(r.at).toLocaleDateString()}</button>`).join(' ')}` : ''; }
  drawRecent();
  document.addEventListener('click', e => { const b = e.target.closest('[data-rc]'); if (!b) return; const r = ls.get('recent', [])[+b.dataset.rc]; let j = null; try { j = JSON.parse(localStorage.getItem('easystat.autosave') || 'null'); } catch (err) { /* none */ }
    if (j && j.file === r.file) { if (!S().data || confirm('Continue this work? The current data are replaced.')) U.openProject(j, j.file); } else U.toast(`“${r.file}” is not kept in this browser — open its project file (📂 Open project) or the data file again`); });

  /* ---------- 6. example-data banner ---------- */
  function showSampleBanner() {
    const st = S(), ex = st.data && /example/i.test(($('#fileName') || {}).textContent || ''); let b = $('#uxSample');
    if (!ex) { if (b) b.remove(); return; } if (b) return;
    b = el('div', 'ux-sample', `<b>You are using example data.</b> <span class="spacer"></span><button class="btn primary small" type="button" id="uxOwn">Use my own file, keep these settings</button>`); b.id = 'uxSample'; const main = $('main'); main.insertBefore(b, main.firstChild);
    $('#uxOwn').onclick = () => { U.readUiIntoCfg(); st.pendingCfg = JSON.parse(JSON.stringify(st.cfg)); U.go(1); $('#file').click(); U.toast('Choose your file — the settings are applied when its columns match'); };
  }

  const fnEl = $('#fileName'); if (fnEl) new MutationObserver(() => setTimeout(showSampleBanner, 50)).observe(fnEl, { childList: true, characterData: true, subtree: true });
  /* ---------- 9. breadcrumb of the step ---------- */
  const bc = el('div', 'ux-crumb'); document.body.appendChild(bc);
  function crumb() { const n = activeStep(), pnl = $('#p' + n); if (!pnl || !S().data) { bc.style.display = 'none'; return; }
    const hs = [...pnl.querySelectorAll('h2,h3,h4,summary b')].filter(h => h.offsetParent && h.getBoundingClientRect().top < 160);
    const last = hs[hs.length - 1], parts = [`Step ${n} · ${U.STEPS[n - 1][0]}`]; if (last && !/^\d+ ·/.test(last.textContent.trim())) parts.push(last.textContent.replace(/\s+/g, ' ').trim().slice(0, 70));
    bc.textContent = parts.join('  ›  '); bc.style.display = scrollY > 260 ? '' : 'none'; }
  let ct = 0; addEventListener('scroll', () => { clearTimeout(ct); ct = setTimeout(crumb, 60); miniSpy(); }, { passive: true });

  /* ---------- 11. data sheet beside the step ---------- */
  let splitHome = null;
  function toggleSplit() { const g = $('#gridWrap'); if (!g) return; let dock = $('#uxDock'); $$('.ux-pop.open').forEach(p => p.classList.remove('open'));
    if (dock && dock.contains(g)) { splitHome.parent.insertBefore(g, splitHome.next); dock.remove(); document.documentElement.classList.remove('ux-split'); return; }
    splitHome = { parent: g.parentNode, next: g.nextSibling }; dock = el('div', 'ux-dock', '<div class="row"><b>Data sheet</b><span class="spacer"></span><button class="btn ghost small" type="button" id="uxDockX">✕ Close</button></div>'); dock.id = 'uxDock'; dock.appendChild(g); document.body.appendChild(dock);
    document.documentElement.classList.add('ux-split'); $('#uxDockX').onclick = toggleSplit; U.renderGrid(); }

  /* ---------- 37. undo timeline ---------- */
  function undoTimeline() { const st = S(), log = (st.cleanLog || []).slice().reverse(), n = (st.undo || []).length;
    // one line per undo step (newest first), named from the change log where it has an entry
    const items = Array.from({ length: Math.min(n, 30) }, (_, i) => log[i] ? `${esc(log[i].time)} — ${esc(log[i].what)}` : 'Edit of the sheet or the setup');
    const p = panel('uxUndoP', 'Undo timeline — recent changes', items.length ? `<ul class="ux-list">${items.map((t, i) => `<li>${t} <button class="btn ghost small" type="button" data-ut="${i + 1}">↶ Undo to before this</button></li>`).join('')}</ul>` : '<p class="legend-note">No changes to undo yet.</p>');
    p.onclick = e => { const b = e.target.closest('[data-ut]'); if (!b) return; const k = +b.dataset.ut; let done = 0; for (let i = 0; i < k; i++) if (U.undoRedo(false)) done++; U.renderGrid(); U.go(activeStep()); U.toast(`${done} change${done === 1 ? '' : 's'} undone`); p.classList.remove('open'); }; }

  /* ---------- 14, 15. changed-from-default marks, reset per section, option examples ---------- */
  const EXAMPLES = { optNotSig: 'Example: “Age was not significantly different between the groups (P = 0.41).”', optUnitsInText: 'Example: “58.7 ± 7.6 years” instead of “58.7 ± 7.6”.', optClinWord: 'Example: adds “which may be of limited clinical importance” after a small significant effect.',
    optTestInText: 'Example: “(t-test, P = 0.03)” instead of “(P = 0.03)”.', optTableIntro: 'Example: “Table 3 shows the laboratory results of the studied groups.” before each comment.', optLimits: 'Writes a limitations paragraph: small groups, missing data, many tests…',
    optDiscuss: 'Writes discussion points from the significant results.', optConclusion: 'Writes a conclusion from the primary outcome(s).', optNumWords: 'Example: “three patients” instead of “3 patients”.', optSpelling: 'Example: “randomised”, “analysed” (British).',
    optHedge: 'Example: “appeared to be higher” instead of “was higher”.', optVoice: 'Example: “We compared the groups with…” instead of “The groups were compared with…”.', optEsCol: 'Adds a column with the effect size of each test (d, r, V).',
    optBoldMax: 'The highest value of each row in bold.', optTranspose: 'Groups as rows and variables as columns.', optNnt: 'Example: “NNT = 8 (95% CI 5 to 20)” for yes/no outcomes.', optEvalue: 'How strong an unmeasured confounder would have to be to explain the effect away.',
    optBayesEst: 'Example: “probability that A is higher than B = 97%”.', optCatCI: 'Example: “45.0% (95% CI 33.1 to 57.4)” for each percentage.', optWelchUnequalN: "Welch's t-test whenever group sizes differ a lot.", optSigMarks: 'Example: “*” or “P = 0.01” above the bars of significant differences.', optPoints: 'Every patient as a dot on box and bar charts.' };
  function markChanged() { const st = S(); if (!st.cfg) return; const d = U.defaultOptions(), o = st.cfg.options;
    Object.entries(U.OPTION_FIELDS).forEach(([k, [id]]) => { const inp = document.getElementById(id); if (!inp) return; const wrap = inp.closest('label.check') || inp.parentNode, ch = JSON.stringify(o[k]) !== JSON.stringify(d[k]);
      wrap.classList.toggle('ux-changed', ch); if (EXAMPLES[id] && !inp.dataset.uxex) { inp.dataset.uxex = 1; wrap.title = (wrap.title ? wrap.title + ' — ' : '') + EXAMPLES[id]; } });
    $$('main .panel details.fl-style, main .panel .card').forEach(sec => { if (!sec.closest('#p4,#p5,#p6,#p7,#p8')) return; const any = sec.querySelector(':scope .ux-changed'); let b = sec.querySelector(':scope > summary .ux-reset, :scope > .ux-reset');
      if (any && !b) { b = el('button', 'btn ghost small ux-reset', '↺ Reset this section'); b.type = 'button'; b.title = 'Back to the default settings of this section'; const sum = sec.querySelector(':scope > summary'); (sum || sec).appendChild(b); b.onclick = e => { e.preventDefault(); e.stopPropagation(); resetSection(sec); }; }
      else if (!any && b) b.remove(); }); }
  function resetSection(sec) { const d = U.defaultOptions(); let n = 0; Object.entries(U.OPTION_FIELDS).forEach(([k, [id, cb]]) => { const inp = document.getElementById(id); if (!inp || !sec.contains(inp)) return; if (cb) inp.checked = !!d[k]; else inp.value = d[k] ?? ''; inp.dispatchEvent(new Event('input', { bubbles: true })); inp.dispatchEvent(new Event('change', { bubbles: true })); n++; });
    U.readUiIntoCfg(); markChanged(); U.toast(`${n} setting${n === 1 ? '' : 's'} back to default`); }
  document.addEventListener('change', e => { if (e.target.closest('#p4,#p5,#p6,#p7,#p8')) setTimeout(() => { U.readUiIntoCfg(); markChanged(); }, 30); });

  /* ---------- 16. why the automatic tests were chosen (step 4) ---------- */
  function smartBanner() { const st = S(), card = $('#p4 .card'); if (!card || !st.cfg) return; let b = $('#uxSmart'); if (!b) { b = el('div', 'ux-smart'); b.id = 'uxSmart'; card.insertBefore(b, card.children[1] || null); }
    let x = null; try { x = Analysis.explore(st.data, { ...st.cfg, options: U.effOptions() }, {}); } catch (e) { b.innerHTML = ''; return; }
    const by = {}; x.items.forEach(it => { if (!it.test) return; (by[it.test] = by[it.test] || []).push(it.label); });
    b.innerHTML = Object.keys(by).length ? `<b>Automatic choices:</b> ${Object.entries(by).map(([t, l]) => `${esc(t)} for ${l.length} variable${l.length > 1 ? 's' : ''} <span class="legend-note">(${esc(l.slice(0, 3).join(', '))}${l.length > 3 ? ' …' : ''})</span>`).join(' · ')}. <span class="legend-note">Chosen from the normality of each group, equal variances and expected counts — change any test in the test plan below or in step 10.</span>` : ''; }

  /* ---------- 17. preview pictures of chart types and flowchart themes ---------- */
  const tip = el('div', 'ux-tip'); document.body.appendChild(tip);
  const mockSpec = t => { const a = [52, 55, 60, 58, 63, 49, 57, 61, 54, 59], b = [60, 66, 63, 70, 68, 64, 72, 61, 67, 69];
    if (['stacked', 'hbar', 'pie', 'piefull', 'mosaic', 'diverging'].includes(t)) return { type: t === 'mosaic' ? 'stacked' : t, categories: ['Group A', 'Group B'], series: [{ name: 'Mild', values: [40, 25] }, { name: 'Moderate', values: [35, 40] }, { name: 'Severe', values: [25, 35] }] };
    if (t === 'hist') return { type: 'hist', series: [{ name: 'A', data: a }, { name: 'B', data: b }] };
    if (t === 'bar') return { type: 'bar', perGroup: true, categories: ['Group A', 'Group B'], series: [{ name: 'Value', values: [57, 66], err: [4, 4] }] };
    return { type: t === 'auto' ? 'box' : t, perGroup: true, categories: ['Group A', 'Group B'], series: [{ name: 'Value', data: [a, b] }] }; };
  const showTip = (node, url) => { if (!url) { tip.style.display = 'none'; return; } const r = node.getBoundingClientRect(); tip.innerHTML = `<img src="${url}" alt="">`; Object.assign(tip.style, { display: 'block', left: Math.min(innerWidth - 330, r.left) + 'px', top: (r.bottom + 6 + 200 > innerHeight ? r.top - 206 : r.bottom + 6) + 'px' }); clearTimeout(tip._h); tip._h = setTimeout(() => { tip.style.display = 'none'; }, 3500); };
  document.addEventListener('change', e => { const t = e.target;
    if (t.matches('[data-fk="chart"],[data-xpfe][data-k="chart"]')) { let u = null; try { u = Charts.draw(mockSpec(t.value), U.chartPalette(S().cfg.options), { ...U.chartStyle(S().cfg.options), aspect: 'standard', res: 0.5 }).toDataURL(); } catch (err) { /* type needs real data */ } showTip(t, u); }
    if (t.matches('[data-fs="theme"]') && S().cfg && S().cfg.consort) { let u = null; try { const c = JSON.parse(JSON.stringify(S().cfg.consort)); c.style = { ...(c.style || {}), theme: t.value }; u = Charts.consort(c, U.activeGroups().map(g => S().cfg.groupLabels[g] || g), U.chartPalette(S().cfg.options)).toDataURL(); } catch (err) { /* none */ } showTip(t, u); } });

  /* ---------- 19, 48, 50. advanced analyses: drag to reorder, favourites, learn-more cards ---------- */
  const LEARN = { survival: 'Kaplan-Meier curves show the share of patients still free of the event over time; the log-rank test compares the curves. Example: death within 28 days by treatment group.',
    cox: 'Cox regression gives hazard ratios: HR = 2 means twice the risk at any moment. Check the proportional hazards assumption (PH check).', logistic: 'Logistic regression gives odds ratios for a yes/no outcome; aim for at least 10 events per predictor.',
    linear: 'Linear regression: B is the change in the outcome per unit of the predictor, adjusted for the others.', roc: 'ROC curves: the AUC is the chance that a random patient with the condition has a higher test value than one without (0.5 = useless, 1 = perfect).',
    paired: 'Paired comparison of two measurements of the same patients (paired t-test or Wilcoxon).', kappa: "Cohen's kappa: agreement of two raters beyond chance (> 0.6 substantial).", agreement: 'ICC and Bland-Altman: how well two methods agree — the bias and the 95% limits of agreement.',
    ancova: 'ANCOVA compares the groups adjusted for covariates such as the baseline value.', cfa: 'Confirmatory factor analysis tests a measurement model you specify; good fit: CFI and TLI ≥ 0.95, RMSEA ≤ 0.06, SRMR ≤ 0.08.',
    efa: 'Exploratory factor analysis finds groups of items that measure the same thing; parallel analysis suggests how many factors.', finegray: 'Fine-Gray regression: effects on the cumulative incidence of the event when another event (e.g. death) can prevent it.',
    rmst: 'RMST is the average event-free time up to a fixed time — easy to explain and valid without proportional hazards.', its: 'Interrupted time series: the level and trend before and after an intervention.', did: 'Difference-in-differences: the change in the treated group minus the change in the control group.',
    noninf: 'Non-inferiority: is the new treatment not worse than the reference by more than a margin Δ? Compare the confidence interval with the margin.', gee: 'GEE / mixed logistic models handle repeated yes/no outcomes of the same patients.',
    lasso: 'LASSO shrinks coefficients and drops weak predictors; the penalty is chosen by cross-validation.', icer: 'ICER: extra cost per extra unit of effect (e.g. per QALY) of one treatment over another.', ssize: 'Sample size for a planned study: effect to detect, variability, significance level and power.' };
  function decorateAdv() { const box = $('#advList'); if (!box) return; const dismissed = ls.get('learnDone', []);
    box.querySelectorAll('.gcard[data-adv]').forEach(card => { const ai = +card.dataset.adv, a = (S().cfg.advanced || [])[ai]; if (!a) return;
      if (!card.querySelector('.ux-grip')) { const g = el('span', 'ux-grip', '⋮⋮'); g.title = 'Drag to reorder'; const h = card.querySelector('h4'); if (h) h.prepend(g); }
      if (LEARN[a.type] && !dismissed.includes(a.type) && !card.querySelector('.ux-learn')) { const l = el('div', 'ux-learn', `💡 ${esc(LEARN[a.type])} <button class="btn ghost small" type="button" data-learn="${a.type}">Got it</button>`); card.insertBefore(l, card.children[1] || null); } }); }
  let dragI = null;
  // a card is draggable only while its grip is held, so text in its fields can still be selected
  document.addEventListener('mousedown', e => { const g = e.target.closest && e.target.closest('.ux-grip'); if (g) g.closest('.gcard').draggable = true; });
  document.addEventListener('mouseup', () => $$('#advList .gcard[draggable="true"]').forEach(c => { if (dragI === null) c.draggable = false; }));
  document.addEventListener('dragstart', e => { const c = e.target.closest && e.target.closest('#advList .gcard[data-adv]'); if (c) { dragI = +c.dataset.adv; e.dataTransfer.effectAllowed = 'move'; } });
  document.addEventListener('dragover', e => { if (dragI !== null && e.target.closest && e.target.closest('#advList .gcard[data-adv]')) e.preventDefault(); });
  document.addEventListener('drop', e => { const c = dragI !== null && e.target.closest && e.target.closest('#advList .gcard[data-adv]'); if (!c) return; e.preventDefault(); const to = +c.dataset.adv; U.readUiIntoCfg(); const A = S().cfg.advanced, [m] = A.splice(dragI, 1); A.splice(to, 0, m); dragI = null; U.renderAdvanced(); U.toast('Analysis moved'); });
  document.addEventListener('dragend', () => { dragI = null; $$('#advList .gcard[draggable="true"]').forEach(c => { c.draggable = false; }); });
  document.addEventListener('click', e => { const b = e.target.closest('[data-learn]'); if (b) { const d = ls.get('learnDone', []); d.push(b.dataset.learn); ls.set('learnDone', d); b.parentNode.remove(); }
    const f = e.target.closest('.ux-fav'); if (f) { e.stopPropagation(); e.preventDefault(); const t = f.dataset.fav, fav = ls.get('favAdv', []), i = fav.indexOf(t); i >= 0 ? fav.splice(i, 1) : fav.push(t); ls.set('favAdv', fav); favRow(); } }, true);
  function favRow() { const add = $('#advAdd'); if (!add) return; add.querySelectorAll('[data-advadd]').forEach(b => { if (!b.querySelector('.ux-fav')) { const s = el('span', 'ux-fav'); s.dataset.fav = b.dataset.advadd; s.title = 'Favourite'; b.appendChild(s); } b.querySelector('.ux-fav').textContent = ls.get('favAdv', []).includes(b.dataset.advadd) ? ' ★' : ' ☆'; });
    let row = $('#uxFavRow'); const fav = ls.get('favAdv', []); if (!row) { row = el('div', 'adv-cat'); row.id = 'uxFavRow'; add.prepend(row); }
    row.innerHTML = fav.length ? `<h4>★ Favourites</h4><div class="btns">${fav.map(t => { const o = add.querySelector(`[data-advadd="${t}"]`); return o ? `<button class="btn ghost small" type="button" data-advadd="${t}">+ ${esc(o.textContent.replace(/[★☆]/g, '').replace(/^\+\s*/, '').trim())}</button>` : ''; }).join('')}</div>` : ''; ls.set('fav', fav); }
  favRow();
  const advList = $('#advList'); if (advList) new MutationObserver(decorateAdv).observe(advList, { childList: true });

  /* ---------- 20. validation as you type ---------- */
  // [lowest, highest, message, lowest itself not allowed]
  const RULES = { sd: [0, null, 'must be above 0', true], hr: [0, null, 'must be above 0', true], priorSd: [0, null, 'must be above 0', true], alpha: [0, 1, 'must be between 0 and 1', true], r: [-1, 1, 'between −1 and 1 (not ±1)', true],
    p1: [0, 100, '0 to 100 %'], p2: [0, 100, '0 to 100 %'], pevent: [0, 100, '0 to 100 %'], dropout: [0, 99, '0 to 99 %'], power: [1, 99.9, '1 to 99.9 %'] };
  document.addEventListener('input', e => { const t = e.target; if (!t.classList || t.tagName !== 'INPUT' || t.type !== 'number') return; if (t.value === '') { t.classList.remove('ux-bad'); return; }
    const v = +t.value, r = RULES[t.dataset.af] || [t.min !== '' ? +t.min : null, t.max !== '' ? +t.max : null, `allowed: ${t.min !== '' ? t.min : '−∞'} to ${t.max !== '' ? t.max : '∞'}`, false];
    const strict = !!r[3], bad = !isFinite(v) || (r[0] !== null && (strict ? v <= r[0] : v < r[0])) || (r[1] !== null && (strict ? v >= r[1] : v > r[1]));
    t.classList.toggle('ux-bad', bad); if (bad) { t.dataset.uxmsg = r[2]; t.setAttribute('aria-invalid', 'true'); t.title = `⚠ ${r[2]}`; } else { t.removeAttribute('aria-invalid'); if (t.dataset.uxmsg) { t.title = ''; delete t.dataset.uxmsg; } } });

  /* ---------- 33. the busy overlay counts the seconds ---------- */
  const busyEl = $('#busy'); if (busyEl) { let t0 = 0, iv = 0; new MutationObserver(() => { const on = busyEl.classList.contains('show'), lab = busyEl.firstElementChild; if (on && !iv) { t0 = Date.now(); iv = setInterval(() => { if (lab) lab.textContent = `Working… ${Math.round((Date.now() - t0) / 1000)} s`; }, 500); } else if (!on && iv) { clearInterval(iv); iv = 0; if (lab) lab.textContent = 'Working…'; } }).observe(busyEl, { attributes: true, attributeFilter: ['class'] }); }

  /* ---------- 21, 22, 24, 25. data sheet: column profile, heat shading, find preview, Enter / Tab editing ---------- */
  const colStats = h => { const v = S().data.rows.map(r => r[h]), miss = v.filter(x => x === null || x === undefined || String(x).trim() === '').length, nums = v.map(Number).filter((x, i) => isFinite(x) && v[i] !== null && v[i] !== '' && v[i] !== undefined), isN = nums.length >= (v.length - miss) * 0.9 && nums.length > 0; return { v, miss, nums, isN }; };
  document.addEventListener('mouseover', e => { const th = e.target.closest && e.target.closest('#preview th[data-hsort]'); if (!th || !S().data) return; const h = th.dataset.hsort, c = colStats(h);
    const cv = document.createElement('canvas'); cv.width = 260; cv.height = 70; const x = cv.getContext('2d'); x.fillStyle = '#7B2FBE';
    if (c.isN && c.nums.length) { const mn = Math.min(...c.nums), mx = Math.max(...c.nums), bins = new Array(20).fill(0); c.nums.forEach(v => { bins[Math.min(19, Math.floor((v - mn) / ((mx - mn) || 1) * 20))]++; }); const top = Math.max(...bins); bins.forEach((b, i) => x.fillRect(i * 13, 70 - 66 * b / top, 11, 66 * b / top)); }
    else { const cnt = {}; c.v.forEach(v => { if (v !== null && v !== '' && v !== undefined) cnt[v] = (cnt[v] || 0) + 1; }); const e2 = Object.entries(cnt).sort((a, b) => b[1] - a[1]).slice(0, 6), top = Math.max(1, ...e2.map(q => q[1])); e2.forEach(([k, n], i) => { x.fillRect(0, i * 11 + 2, 150 * n / top, 9); x.fillStyle = '#333'; x.font = '9px sans-serif'; x.fillText(String(k).slice(0, 18) + ` (${n})`, 155, i * 11 + 10); x.fillStyle = '#7B2FBE'; }); }
    tip.innerHTML = `<b>${esc(h)}</b><div class="legend-note">${c.isN ? `numeric · min ${Math.min(...c.nums)} · max ${Math.max(...c.nums)} · mean ${(c.nums.reduce((a, b) => a + b, 0) / c.nums.length).toFixed(2)}` : `categories: ${new Set(c.v.filter(v => v !== null && v !== '' && v !== undefined)).size}`} · missing ${c.miss} (${(100 * c.miss / c.v.length).toFixed(0)}%)</div><img src="${cv.toDataURL()}" alt="">`;
    const r = th.getBoundingClientRect(); Object.assign(tip.style, { display: 'block', left: Math.min(innerWidth - 300, r.left) + 'px', top: r.bottom + 4 + 'px' }); clearTimeout(tip._h); tip._h = setTimeout(() => { tip.style.display = 'none'; }, 4000); });
  document.addEventListener('mouseout', e => { if (e.target.closest && e.target.closest('#preview th[data-hsort]')) tip.style.display = 'none'; });
  const hl = $('#gridHl'); if (hl) { const lab = el('label', 'check', '<input type="checkbox" id="uxHeat"><span>Heat shading</span>'); lab.style.margin = '0'; hl.closest('label').after(lab); $('#uxHeat').checked = ls.get('heat', false); $('#uxHeat').onchange = e => { ls.set('heat', e.target.checked); heat(); }; }
  function heat() { const on = ls.get('heat', false), tb = $('#preview'); if (!tb || !S().data) return; const cache = {};
    const hr = [...tb.querySelectorAll('thead tr')].find(tr => tr.querySelector('th[data-hsort]')), heads = hr ? [...hr.children].map(th => th.dataset.hsort || null) : [];
    tb.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, ci) => { const h = td.dataset.col || heads[ci]; if (!h || !S().data.headers.includes(h)) return; if (!on) { td.style.background = ''; return; } if (!cache[h]) { const c = colStats(h); cache[h] = c.isN && c.nums.length ? [Math.min(...c.nums), Math.max(...c.nums)] : 'x'; }
      const r = cache[h], v = +td.textContent; if (r === 'x' || td.textContent.trim() === '' || !isFinite(v) || r[1] === r[0]) { td.style.background = ''; return; } td.style.background = `rgba(123,47,190,${(0.06 + 0.4 * (v - r[0]) / (r[1] - r[0])).toFixed(2)})`; })); }
  const prev = $('#preview'); if (prev) new MutationObserver(() => { heat(); }).observe(prev, { childList: true });
  const fr = () => { const q = ($('#frFind') || {}).value, info = $('#frInfo'); if (!info || !S().data) return; if (!q) { info.textContent = ''; return; } const col = ($('#frCol') || {}).value, whole = ($('#frWhole') || {}).checked, cs = ($('#frCase') || {}).checked, H = S().data.headers.filter(h => !col || col === '*' || col === h || col === '' || !S().data.headers.includes(col) ? true : h === col);
    let n = 0; S().data.rows.forEach(r => H.forEach(h => { const v = String(r[h] ?? ''), a = cs ? v : v.toLowerCase(), b = cs ? q : q.toLowerCase(); if (whole ? a === b : a.includes(b)) n++; })); info.textContent = `${n} matching cell${n === 1 ? '' : 's'}`; };
  ['frFind', 'frCol', 'frWhole', 'frCase'].forEach(id => { const x = document.getElementById(id); if (x) x.addEventListener(id === 'frFind' ? 'input' : 'change', fr); });
  const gw = $('#gridWrap'); if (gw) gw.addEventListener('keydown', e => { const td = e.target.closest && e.target.closest('[data-cell]'); if (!td || !(e.key === 'Enter' || e.key === 'Tab') || e.shiftKey && e.key === 'Enter') return;
    const i = +td.dataset.cell, col = td.dataset.col, heads = [...td.closest('tr').querySelectorAll('[data-cell]')].map(c => c.dataset.col), j = heads.indexOf(col);
    const target = e.key === 'Enter' ? [i + 1, col] : [i, heads[j + (e.shiftKey ? -1 : 1)]]; if (e.key === 'Tab') { e.preventDefault(); td.blur(); }
    setTimeout(() => { const n = document.querySelector(`#preview [data-cell="${target[0]}"][data-col="${CSS.escape(target[1] || '')}"]`); if (n) { n.focus(); const r = document.createRange(); r.selectNodeContents(n); const s = getSelection(); s.removeAllRanges(); s.addRange(r); } }, 80); }, true);

  /* ---------- 26. data checks to do ---------- */
  function cleanIssues() { const st = S(); if (!st.data) return []; const out = [], rows = st.data.rows, dis = st.uxDismiss || (st.uxDismiss = new Set());
    st.data.headers.forEach(h => { const v = rows.map(r => r[h]).filter(x => x !== null && x !== undefined && String(x).trim() !== '');
      if (!v.length) out.push({ id: 'empty|' + h, text: `“${h}” is empty`, fix: null });
      const nNum = v.filter(x => isFinite(+x)).length; if (nNum && nNum < v.length && nNum >= v.length * 0.8) out.push({ id: 'mixed|' + h, text: `“${h}” is mostly numbers but has ${v.length - nNum} text value${v.length - nNum > 1 ? 's' : ''} (e.g. “${esc(String(v.find(x => !isFinite(+x))))}”)`, fix: null });
      const sp = v.filter(x => typeof x === 'string' && x !== x.trim()).length; if (sp) out.push({ id: 'space|' + h, text: `“${h}”: ${sp} value${sp > 1 ? 's' : ''} with extra spaces`, fix: () => U.editSheet(() => rows.forEach(r => { if (typeof r[h] === 'string') r[h] = r[h].trim(); }), `Spaces trimmed in ${h}`) });
      if (!nNum) { const lv = [...new Set(v.map(String))], low = {}; lv.forEach(x => { const k = x.trim().toLowerCase(); (low[k] = low[k] || []).push(x); }); const dup = Object.values(low).filter(a => a.length > 1);
        if (dup.length) out.push({ id: 'case|' + h, text: `“${h}”: the same category written differently (${esc(dup.map(a => a.join(' / ')).join('; '))})`, fix: () => U.editSheet(() => rows.forEach(r => { const k = String(r[h] ?? '').trim().toLowerCase(); const g = dup.find(a => a[0].trim().toLowerCase() === k); if (g) r[h] = g[0].trim(); }), `Categories unified in ${h}`) }); }
      if (v.length > 5 && new Set(v.map(String)).size === 1) out.push({ id: 'const|' + h, text: `“${h}” has the same value in every row`, fix: null }); });
    const id = st.cfg && st.cfg.idCols && st.cfg.idCols[0]; if (id) { const seen = {}, d = []; rows.forEach((r, i) => { const k = String(r[id] ?? ''); if (k && seen[k] !== undefined) d.push(i); else seen[k] = i; }); if (d.length) out.push({ id: 'dupid', text: `${d.length} repeated ${esc(id)} value${d.length > 1 ? 's' : ''}`, fix: null }); }
    return out.filter(o => !dis.has(o.id)); }
  function drawChecks() { if (!p1card || !S().data) return; let box = $('#uxChecks'); if (!box) { box = el('details', 'ux-checks'); box.id = 'uxChecks'; const rc = $('#uxRecent'); p1card.insertBefore(box, rc || null); }
    const is = cleanIssues(); box.style.display = is.length ? '' : 'none'; const open = box.open;
    box.innerHTML = `<summary><b>🧽 Data checks to do (${is.length})</b></summary>${is.map((o, i) => `<div class="ux-issue">${o.text} <span class="spacer"></span>${o.fix ? `<button class="btn ghost small" type="button" data-ifix="${i}">Fix</button>` : ''}<button class="btn ghost small" type="button" data-idis="${i}">Dismiss</button></div>`).join('')}`; box.open = open;
    box.onclick = e => { const f = e.target.closest('[data-ifix]'), d = e.target.closest('[data-idis]'); if (f) { is[+f.dataset.ifix].fix(); U.toast('Fixed (Undo is available)'); drawChecks(); } if (d) { S().uxDismiss.add(is[+d.dataset.idis].id); drawChecks(); onStepper(); } }; }
  if (prev) new MutationObserver(() => { clearTimeout(drawChecks._h); drawChecks._h = setTimeout(() => { drawChecks(); showSampleBanner(); }, 300); }).observe(prev, { childList: true });

  /* ---------- step 11 reading aids: 8 mini-map, 27 P colours, 28 all sources, 29 changes, 30 focus, 31 word bar, 32 column glossary, 45 copy as, 35 what changed, 38 problems ---------- */
  const GLOSS = { 'OR': 'Odds ratio: the odds of the outcome in one group divided by those in the other (1 = no difference).', 'RR': 'Relative risk: the risk in one group divided by the risk in the other.', 'HR': 'Hazard ratio: the instantaneous risk of the event in one group relative to the other.',
    'CI': 'Confidence interval: the range of values compatible with the data (95%: would contain the true value 95% of the time).', 'P': 'P value: how surprising the data would be if there were no real difference (small = surprising).', 'SD': 'Standard deviation: the spread of the values around the mean.',
    'IQR': 'Interquartile range: the middle 50% of the values (25th to 75th percentile).', 'B': 'Regression coefficient: the change in the outcome for one unit of the predictor.', 'β': 'Standardised coefficient: the change in SDs of the outcome per SD of the predictor.',
    'η²': 'Eta squared: the share of the variance explained by the groups.', 'MD': 'Mean difference between the groups.', 'AUC': 'Area under the ROC curve: 0.5 = no discrimination, 1 = perfect.', 'ICC': 'Intraclass correlation: agreement or reliability (0 to 1).',
    'SMD': 'Standardised mean difference: the difference in SDs (|SMD| < 0.1 = balanced).', 'n': 'Number of patients.', 'CFI': 'Comparative fit index (≥ 0.95 good).', 'RMSEA': 'Root mean square error of approximation (≤ 0.06 good).', 'NNT': 'Number needed to treat to prevent one event.',
    'Median': 'The middle value: half of the patients are below it.', 'Effect size': 'How big a difference is, independent of the sample size (d, r, V, η²).', 'df': 'Degrees of freedom.', 'χ²': 'Chi-square statistic.', 't': 't statistic of the t-test.', 'F': 'F statistic of ANOVA.', 'Z': 'z statistic (standard normal).' };
  const sigBand = v => v < 0.001 ? 'ux-p1' : v < 0.01 ? 'ux-p2' : v <= 0.05 ? 'ux-p3' : v <= 0.1 ? 'ux-p4' : '';
  let prevSig = null, prevResult = null;
  function onReport() { const rep = $('#report'), r = S().result; if (!rep || !r) return;
    // toolbar once
    if (!$('#uxRepBar')) { const b = el('div', 'ux-repbar'); b.id = 'uxRepBar'; b.innerHTML = `<span id="uxWords"></span><span class="spacer"></span><button class="btn ghost small" type="button" id="uxPcol" title="Colour P values by size in the preview">🎨 P colours</button><button class="btn ghost small" type="button" id="uxSrcAll" title="Point at a number to see its table cell — for every comment">🔗 All sources</button><button class="btn ghost small" type="button" id="uxFocus" title="One table at a time">🎯 Focus mode</button><button class="btn ghost small" type="button" id="uxReady" title="Word limit, figures, captions, abbreviations, accessibility…">✅ Ready to submit?</button><button class="btn ghost small" type="button" id="uxShare" title="One HTML file that opens this report, with its data and settings">🔗 Shareable file</button>`;
      rep.parentNode.insertBefore(b, rep);
      $('#uxPcol').onclick = () => { document.documentElement.classList.toggle('ux-pcol'); };
      $('#uxSrcAll').onclick = () => $$('[data-srcs]').forEach(x => x.click());
      $('#uxFocus').onclick = () => { const on = document.documentElement.classList.toggle('ux-focus'); if (on) focusSec(0); else $$('#report .report-sec').forEach(s => s.classList.remove('ux-cur')); };
      $('#uxReady').onclick = readyCheck; $('#uxShare').onclick = shareFile; }
    // what changed since the previous run, and models that need attention
    if (r !== prevResult) { const sig = r.sections.map(s => ({ t: s.title, c: s.comment || '', p: (JSON.stringify(s.rows).match(/[<=]?\s?0\.\d{3}\*?/g) || []).join(',') }));
      let note = ''; if (prevSig) { const was = new Map(prevSig.map(x => [x.t, x])), now = new Map(sig.map(x => [x.t, x])), add = sig.filter(x => !was.has(x.t)).length, rem = prevSig.filter(x => !now.has(x.t)).length, ch = sig.filter(x => was.has(x.t) && (was.get(x.t).p !== x.p || was.get(x.t).c !== x.c)).length;
        if (add || rem || ch) note = `Since the last run: ${[add && `${add} table${add > 1 ? 's' : ''} added`, rem && `${rem} removed`, ch && `${ch} with changed numbers or text`].filter(Boolean).join(', ')}.`; }
      const probs = r.sections.map((s, i) => { const m = s.meta && (s.meta.m || s.meta.model); const bad = m && (m.unstable || m.converged === false || m.heywood); return bad ? `Table “${esc(s.title)}”: ${m.heywood ? 'a negative residual variance (Heywood case) — fewer factors or more patients may help' : 'the model is unstable (very large coefficients or no convergence) — usually separation: a predictor that perfectly predicts the outcome, or too few events. Remove that predictor or use Firth logistic regression (step 8).'}` : ''; }).filter(Boolean);
      let ban = $('#uxRunNote'); if (!ban) { ban = el('div', 'ux-runnote'); ban.id = 'uxRunNote'; rep.parentNode.insertBefore(ban, rep); }
      ban.innerHTML = [note && `<div>🔄 ${esc(note)}</div>`, ...probs.map(p => `<div>⚠ ${p} <button class="btn ghost small" type="button" onclick="EasyUI.go(8)">Open step 8</button></div>`)].filter(Boolean).join(''); ban.style.display = ban.innerHTML ? '' : 'none';
      prevSig = sig; prevResult = r; stylMemory(); }
    // per section tools
    rep.querySelectorAll('[data-copytbl]').forEach(b => { if (b.parentNode.querySelector('.ux-copyas')) return; const i = +b.dataset.copytbl;
      const sel = el('select', 'ux-copyas', '<option value="">Copy as…</option><option value="md">Markdown</option><option value="tex">LaTeX</option><option value="csv">CSV</option>'); sel.style.width = 'auto'; sel.title = 'Copy the table in another format';
      sel.onchange = () => { const f = sel.value; sel.value = ''; if (f) copyAs(i, f); }; const g = el('button', 'btn ghost small', 'ℹ Columns'); g.type = 'button'; g.title = 'What the column headings mean'; g.onclick = () => glossary(i, g); b.parentNode.append(' ', sel, ' ', g); });
    rep.querySelectorAll('[data-rephrase]').forEach(b => { if (b.parentNode.querySelector('[data-uxdiff]')) return; const d = el('button', 'btn ghost small', '⇄ Changes'); d.type = 'button'; d.dataset.uxdiff = b.dataset.rephrase; d.title = 'Your edits against the automatic text'; d.onclick = () => showDiff(+b.dataset.rephrase, d); b.after(d); });
    pcolour(); wordBar(); miniMap(); }
  function pcolour() { $$('#report table.rt').forEach(t => { const hd = [...t.querySelectorAll('thead th')].map(h => /\bP\b|P value/i.test(h.textContent)); t.querySelectorAll('tbody tr').forEach(tr => [...tr.children].forEach((td, ci) => { const m = /^\s*([<≤=])?\s*(0?\.\d+|1(\.0+)?)\*?\s*$/.exec(td.textContent); td.classList.remove('ux-p1', 'ux-p2', 'ux-p3', 'ux-p4'); if (m && (hd[ci] || hd[hd.length - 1] && ci === tr.children.length - 1)) { const c = sigBand(+m[2] * (m[1] === '<' ? 0.99 : 1)); if (c) td.classList.add(c); } })); }); }
  function wordBar() { const r = S().result, b = $('#uxWords'); if (!b || !r) return; const res = r.sections.reduce((t, s) => t + words(s.comment), 0), all = res + words(r.methods) + words(r.intro) + words(r.summary) + words(r.discussion) + words(r.conclusion) + words(r.limitations), lim = +U.report().wordLimit || 0;
    b.innerHTML = `<b>${all.toLocaleString()}</b> words · about ${Math.max(1, Math.round(all / 230))} min to read · Results ${res.toLocaleString()}${lim ? ` / ${lim} <span class="${res > lim ? 'ux-over' : ''}">${res > lim ? '(over the limit)' : '(within the limit)'}</span>` : ''}`; }
  function copyAs(i, f) { U.syncEdits(); const s = S().result.sections[i], cell = c => (typeof c === 'object' && c ? (c.t || []).join(' ') : String(c ?? '')).replace(/\s+/g, ' ').trim(), head = s.head.map(h => typeof h === 'string' ? h : h.t || ''), rows = s.rows.map(r => r.map(cell));
    const esc2 = v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v, tex = v => v.replace(/([&%$#_{}])/g, '\\$1').replace(/≤/g, '$\\le$').replace(/±/g, '$\\pm$');
    const out = f === 'md' ? [`**${s.title}**`, '', `| ${head.join(' | ')} |`, `|${head.map(() => '---').join('|')}|`, ...rows.map(r => `| ${r.join(' | ')} |`), '', s.footnote || ''].join('\n')
      : f === 'csv' ? [head, ...rows].map(r => r.map(esc2).join(',')).join('\n')
      : [`\\begin{table}[ht]\\centering\\caption{${tex(s.title)}}`, `\\begin{tabular}{${head.map((_, k) => k ? 'c' : 'l').join('')}}\\hline`, head.map(tex).join(' & ') + ' \\\\ \\hline', ...rows.map(r => r.map(tex).join(' & ') + ' \\\\'), '\\hline\\end{tabular}', `\\par\\footnotesize ${tex(s.footnote || '')}`, '\\end{table}'].join('\n');
    navigator.clipboard.writeText(out).then(() => U.toast(`Table copied as ${{ md: 'Markdown', csv: 'CSV', tex: 'LaTeX' }[f]}`), () => U.toast('Copying was blocked by the browser')); }
  function glossary(i, btn) { const s = S().result.sections[i], txt = s.head.map(h => typeof h === 'string' ? h : h.t || '').join(' ') + ' ' + (s.footnote || ''), hits = Object.entries(GLOSS).filter(([k]) => new RegExp(`(^|[^A-Za-z])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z]|$)`).test(txt));
    let box = btn.parentNode.nextElementSibling; if (box && box.classList.contains('ux-gloss')) { box.remove(); return; } box = el('div', 'ux-gloss', hits.length ? hits.map(([k, v]) => `<div><b>${esc(k)}</b>: ${esc(v)}</div>`).join('') : '<span class="legend-note">No abbreviations to explain.</span>'); btn.parentNode.after(box); }
  function showDiff(i, btn) { U.syncEdits(); const r = S().result, a = ((r.auto || {}).sections || [])[i], now = r.sections[i].comment || ''; let box = btn.parentNode.parentNode.querySelector('.ux-diff'); if (box) { box.remove(); return; }
    const d = U.wordDiff(a ? a.comment : now, now); box = el('div', 'ux-diff', d.some(x => x[0] !== '=') ? d.map(([k, t]) => k === '=' ? esc(t) : k === '+' ? `<ins>${esc(t)}</ins>` : `<del>${esc(t)}</del>`).join('') : '<span class="legend-note">No edits — this is the automatic text.</span>'); btn.parentNode.after(box); }
  let focusI = 0; function focusSec(k) { const ss = $$('#report .report-sec'); if (!ss.length) return; focusI = Math.max(0, Math.min(ss.length - 1, k)); ss.forEach((s, i) => s.classList.toggle('ux-cur', i === focusI)); let nav = $('#uxFocusNav');
    if (!nav) { nav = el('div', 'ux-focusnav', '<button class="btn primary small" type="button" data-fn="-1">‹ Previous</button><span id="uxFocusN"></span><button class="btn primary small" type="button" data-fn="1">Next ›</button><button class="btn ghost small" type="button" data-fn="x">Exit</button>'); document.body.appendChild(nav);
      nav.onclick = e => { const b = e.target.closest('[data-fn]'); if (!b) return; if (b.dataset.fn === 'x') { document.documentElement.classList.remove('ux-focus'); return; } focusSec(focusI + +b.dataset.fn); }; }
    $('#uxFocusN').textContent = ` ${focusI + 1} / ${ss.length} `; scrollTo(0, ss[focusI].getBoundingClientRect().top + scrollY - 140); }
  function miniMap() { let m = $('#uxMini'); if (!m) { m = el('nav', 'ux-mini'); m.id = 'uxMini'; m.setAttribute('aria-label', 'Report sections'); document.body.appendChild(m); }
    const secs = $$('#report .report-sec'); m.innerHTML = '<b>Report</b>' + secs.map((s, i) => { const t = (s.querySelector('.fcap') || {}).value || (s.querySelector('h3') || {}).textContent || `Section ${i + 1}`; return `<a href="#" data-mm="${i}" title="${esc(t)}">${esc(String(t).slice(0, 42))}</a>`; }).join('');
    m.onclick = e => { const a = e.target.closest('[data-mm]'); if (!a) return; e.preventDefault(); const s = secs[+a.dataset.mm]; if (document.documentElement.classList.contains('ux-focus')) focusSec(+a.dataset.mm); else scrollTo(0, s.getBoundingClientRect().top + scrollY - 140); }; miniSpy(); }
  function miniSpy() { const m = $('#uxMini'); if (!m) return; m.style.display = activeStep() === 11 && S().result ? '' : 'none'; if (m.style.display) return; const secs = $$('#report .report-sec'); let cur = 0; secs.forEach((s, i) => { if (s.getBoundingClientRect().top < 200) cur = i; }); m.querySelectorAll('[data-mm]').forEach((a, i) => a.classList.toggle('on', i === cur)); }
  const repEl = $('#report'); if (repEl) new MutationObserver(() => { clearTimeout(onReport._h); onReport._h = setTimeout(onReport, 120); }).observe(repEl, { childList: true });
  document.addEventListener('input', e => { if (e.target.closest && e.target.closest('#report')) { clearTimeout(wordBar._h); wordBar._h = setTimeout(wordBar, 400); } });

  /* ---------- 46. ready to submit ---------- */
  function readyCheck() { U.syncEdits(); const r = S().result, rp = U.report(), o = S().cfg.options, out = [], ok = (c, good, bad) => out.push([c, c ? good : bad]);
    const res = r.sections.reduce((t, s) => t + words(s.comment), 0); ok(!rp.wordLimit || res <= +rp.wordLimit, `Results within the word limit (${res} words)`, `Results have ${res} words, over the limit of ${rp.wordLimit}`);
    ok(!!(S().cfg.study.title || '').trim(), 'The report has a title', 'No study title (step 1)'); ok(+o.figRes >= 2 || +(o.res || 0) >= 2 || /^(2|3|4)$/.test(String(o.figRes || '')), 'Figures at high resolution', 'Figures at screen resolution — choose 300 dpi or more when exporting (⬇ Figures) or in step 7');
    ok(!!o.tableCaption, 'A caption style is set', 'Choose a table caption style (step 5)'); ok(!!(o.abbrEnd || r.sections.every(s => !/[A-Z]{2,}/.test(s.title) || /:/.test(s.footnote || ''))), 'Abbreviations are defined', 'Some abbreviations may not be defined in the footnotes');
    ok(!!rp.altText, 'Figures have alternative text', 'Tick “Alternative text of the figures” (Word document extras)'); ok(!!rp.refs, 'Method references included', 'Tick “References of the statistical methods”');
    ok(!!rp.checklist || !['consort', 'strobe'].includes((S().cfg.consort || {}).type), 'Reporting checklist chosen', 'Add the CONSORT / STROBE checklist (Word document extras)');
    ok(!r.sections.some(s => s.meta && s.meta.m && (s.meta.m.unstable || s.meta.m.heywood)), 'No unstable models', 'Some models are unstable — see the warning above the report');
    panel('uxReadyP', 'Ready to submit?', out.map(([g, t]) => `<div>${g ? '✅' : '⚠️'} ${esc(t)}</div>`).join('') + `<p class="legend-note">${out.filter(x => x[0]).length} of ${out.length} checks passed.</p>`); }

  /* ---------- 47. shareable report file: this page with the project inside, opening at step 11 ---------- */
  function shareFile() { const st = S(); if (!st.data || !window.__SRC_HTML) { U.toast('Not available'); return; } U.syncEdits(); U.readUiIntoCfg();
    const proj = { app: 'ProfMSE-EasyStat-project', version: 1, saved: new Date().toISOString(), file: st.file, sheet: st.sheet, step: 11, data: st.data, cfg: st.cfg, shared: true };
    // the tag is built from pieces so that this code never contains it (the page's own text is copied below)
    const SC = '<scr' + 'ipt', open = `${SC} id="ux-project">`, close = '</scr' + 'ipt>', inj = `${open}window.__PROJECT__=${JSON.stringify(proj).replace(/<\//g, '<\\/')};${close}`;
    let src = window.__SRC_HTML; const h = src.indexOf('<head>') + 6; if (src.startsWith(open, h)) src = src.slice(0, h) + src.slice(src.indexOf(close, h) + close.length);
    const html = '<!DOCTYPE html>\n' + src.replace('<head>', '<head>' + inj); U.saveUrl(URL.createObjectURL(new Blob([html], { type: 'text/html' })), `${U.baseName()} - shared report.html`); U.toast('Shareable file saved — it opens this report with its data, in any browser, offline'); }
  if (window.__PROJECT__) setTimeout(() => { try { U.openProject(window.__PROJECT__, window.__PROJECT__.file); U.go(11); document.documentElement.classList.add('ux-shared');
      const b = el('div', 'ux-sample', '<b>Shared report</b> — opened from a shared file. Changes stay in this browser; 💾 Save project to keep your own copy.'); $('main').prepend(b); } catch (e) { U.toast('The shared report could not be opened'); } }, 300);

  /* ---------- 44. export centre ---------- */
  const EXPORTS = [['Report', [['btnDocx', 11], ['btnPdf', 11], ['btnReview', 11], ['btnSupp', 11], ['btnOnePage', 11], ['btnMd', 11], ['btnTex', 11], ['btnHtml', 11], ['btnLetter', 11]]],
    ['Figures', [['btnPngs', 11], ['btnPptx', 11], ['btnFigPdf', 11], ['btnCombo', 11], ['btnGA', 11], ['flowPng', 9], ['flowPptx', 9]]], ['Tables and data', [['btnXlsx', 11], ['btnXlsxF', 11], ['xpWord', 10], ['xpXlsx', 10]]], ['Other', [['btnRis', 11], ['btnGdocs', 11], ['btnSaveProj', 0]]]];
  $('#uxExport').onclick = () => { const last = ls.get('lastExport', []), lab = id => { const b = document.getElementById(id); return b ? (b.textContent.replace(/\s+/g, ' ').trim() || b.title) + (b.title ? ` <span class="legend-note">— ${esc(b.title)}</span>` : '') : ''; };
    const p = panel('uxExpP', 'Exports', (last.length ? `<h4>Recently used</h4>${last.map(id => `<div class="ux-exp"><button class="btn primary small" type="button" data-ex="${id}">Go</button> ${lab(id)}</div>`).join('')}` : '')
      + EXPORTS.map(([g, list]) => `<h4>${g}</h4>${list.filter(([id]) => document.getElementById(id)).map(([id]) => `<div class="ux-exp"><button class="btn ghost small" type="button" data-ex="${id}">Go</button> ${lab(id)}</div>`).join('')}`).join('') + '<p class="legend-note">Report exports need a run of the report (step 11).</p>');
    p.onclick = e => { const b = e.target.closest('[data-ex]'); if (!b) return; const id = b.dataset.ex, step = (EXPORTS.flatMap(x => x[1]).find(x => x[0] === id) || [0, 0])[1]; p.classList.remove('open'); ls.set('lastExport', [id, ...ls.get('lastExport', []).filter(x => x !== id)].slice(0, 3));
      goTo(step, () => { const t = document.getElementById(id); if (!t) return; const d = t.closest('details'); if (d) d.open = true; if (step === 11 && !S().result) { U.toast('Run the report first (step 11)'); return; } flash(t); t.click(); }); }; };

  /* ---------- 49. style memory: settings you keep choosing, offered as your default preset ---------- */
  function stylMemory() { const st = S(); if (!st.cfg) return; const d = U.defaultOptions(), o = st.cfg.options, h = ls.get('optHist', {}), day = new Date().toISOString().slice(0, 10);
    Object.keys(U.OPTION_FIELDS).forEach(k => { if (JSON.stringify(o[k]) === JSON.stringify(d[k])) return; const key = k + '=' + JSON.stringify(o[k]); h[key] = h[key] || []; if (!h[key].includes(day)) h[key].push(day); }); ls.set('optHist', h);
    const often = Object.entries(h).filter(([, days]) => days.length >= 3).map(([k]) => k); if (!often.length || ls.get('presetOffered', '') === often.join('|')) return; ls.set('presetOffered', often.join('|'));
    const b = el('div', 'ux-offer', `You often use the same settings (${often.length}). <button class="btn primary small" type="button" data-o="y">Save them as a preset</button> <button class="btn ghost small" type="button" data-o="n">Not now</button>`); document.body.appendChild(b);
    b.onclick = e => { const x = e.target.closest('[data-o]'); if (!x) return; b.remove(); if (x.dataset.o === 'y' && $('#presetSave')) $('#presetSave').click(); }; setTimeout(() => b.remove(), 20000); }

  setTimeout(onStepper, 0); // after every part of this module is set up
  /* ---------- step entry hooks ---------- */
  function onStepEnter(n) { if (n >= 4 && n <= 8) setTimeout(markChanged, 50); if (n === 4) setTimeout(smartBanner, 80); if (n === 8) setTimeout(() => { favRow(); decorateAdv(); }, 80); if (n === 1) setTimeout(drawChecks, 80); if (n === 11) setTimeout(onReport, 150); miniSpy(); }
})();

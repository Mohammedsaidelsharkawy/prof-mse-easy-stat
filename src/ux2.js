/* Prof MSE Easy Stat — interface, round 4: report tools in tabs with previews and favourites, report status map, inline editing,
   changes highlighted, page view, step status, next best action, undo toasts, empty states, review mode. Works through window.EasyUI. */
(() => {
  const U = window.EasyUI; if (!U) return;
  const S = () => U.state, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], esc = U.esc;
  const ls = { get: (k, d) => { try { const v = localStorage.getItem('ux2.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('ux2.' + k, JSON.stringify(v)); } catch (e) { /* not kept */ } } };
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const step = () => S().step || 1;
  window.EasyUX2 = {};

  const css = el('style'); css.textContent = `
.ux2-tabs{display:flex;gap:4px;flex-wrap:wrap;border-bottom:2px solid var(--line);margin:10px 0 8px}.ux2-tabs button{border:0;background:none;padding:6px 12px;font:inherit;font-weight:600;color:var(--muted);cursor:pointer;border-bottom:3px solid transparent;margin-bottom:-2px}
.ux2-tabs button.on{color:var(--title,#3B2A8C);border-bottom-color:#7B2FBE}.ux2-pane{display:none;flex-wrap:wrap;gap:8px}.ux2-pane.on{display:flex}
.ux2-fav{display:flex;flex-wrap:wrap;gap:6px;align-items:center;margin:4px 0 8px;padding:6px 8px;border:1px dashed var(--line);border-radius:10px}.ux2-fav:empty{display:none}
.ux2-star{border:0;background:none;cursor:pointer;font-size:14px;color:#bbb;padding:0 2px;margin-left:-6px}.ux2-star.on{color:#E2A400}
.ux2-card{position:fixed;z-index:9000;max-width:300px;background:var(--card,#fff);border:1px solid var(--line);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,.18);padding:8px 10px;font-size:13px;pointer-events:none}
.ux2-card .k{display:inline-block;font-size:11px;padding:1px 6px;border-radius:8px;background:#EFE7FB;color:#5B2A9B;margin-right:4px}
.ux-mini a .ux2-ic{float:right;margin-left:4px}
.ux2-changed{animation:ux2fl 4s ease-out}@keyframes ux2fl{0%{box-shadow:0 0 0 3px #FFD54F;background:#FFF8D6}100%{box-shadow:0 0 0 0 transparent}}
html.ux2-page #report{max-width:21cm;margin:0 auto;background:#fff;color:#111;padding:var(--ux2m,2.54cm);box-shadow:0 2px 14px rgba(0,0,0,.2);background-image:repeating-linear-gradient(to bottom,transparent 0,transparent calc(29.7cm - 2px),#c9c3d6 calc(29.7cm - 2px),#c9c3d6 29.7cm)}
html.ux2-page #report textarea,html.ux2-page #report .btn,html.ux2-page #report select{font-family:var(--ux2f,inherit)}html.ux2-page #report .report-sec{border:0;box-shadow:none;background:transparent}
.ux2-st{display:block;font-size:10px;line-height:1.1;margin-top:2px;font-weight:600}.ux2-st.auto{color:#2E7D32}.ux2-st.opt{color:#888}.ux2-st.warn{color:#C62828}
.ux2-nba{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:8px 0;padding:8px 12px;border-radius:10px;background:#FFF6E0;border:1px solid #F3D48A;color:#5a4300}
[data-theme="dark"] .ux2-nba{background:#3a3020;color:#f3e2b0;border-color:#6b5a2a}
.ux2-toast{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:9999;background:#1C1648;color:#fff;padding:9px 14px;border-radius:10px;display:flex;gap:10px;align-items:center;box-shadow:0 6px 18px rgba(0,0,0,.3);font-size:14px}
.ux2-toast button{background:#fff;color:#1C1648;border:0;border-radius:6px;padding:4px 10px;font-weight:700;cursor:pointer}
.ux2-empty{border:2px dashed var(--line);border-radius:14px;padding:22px;text-align:center;margin:12px 0;background:var(--lav,#F7F3FD)}.ux2-empty h3{margin:0 0 6px}
html.ux2-review #report textarea{border-color:transparent;background:transparent;resize:none}html.ux2-review #report .report-sec .row .btn,html.ux2-review #report .ux-copyas,html.ux2-review #report [data-copytbl],html.ux2-review #report .tb-tools{display:none}
.ux2-rv{display:none;gap:6px;margin:6px 0}html.ux2-review .ux2-rv{display:flex}.ux2-rv .on-ok{background:#2E7D32;color:#fff}.ux2-rv .on-no{background:#C62828;color:#fff}
#report .foot[contenteditable]:hover,#report table.rt thead th[contenteditable]:hover{outline:1px dashed #7B2FBE;cursor:text}
@media (max-width:700px){#report table.rt{font-size:12px}#report .report-sec{padding:8px}#report figure img{max-width:100%;height:auto}.ux2-tabs button{padding:6px 8px}}
.ux2-panel{position:fixed;z-index:8000;top:70px;right:16px;width:min(560px,calc(100vw - 32px));max-height:calc(100vh - 100px);overflow:auto;background:var(--card,#fff);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 40px rgba(0,0,0,.25);padding:12px 14px;display:none}
.ux2-panel.open{display:block}.ux2-panel h3{margin:0 0 8px;display:flex;align-items:center;gap:8px}.ux2-panel h3 .x{margin-left:auto}
.ux2-tbl{border-collapse:collapse;width:100%;font-size:13px}.ux2-tbl td,.ux2-tbl th{border-bottom:1px solid var(--line);padding:4px 6px;text-align:left;vertical-align:top}
`; document.head.appendChild(css);

  // a floating panel (shared by the organisation tools)
  function panel(id, title, html) { let p = document.getElementById(id); if (!p) { p = el('div', 'ux2-panel'); p.id = id; document.body.appendChild(p); }
    p.innerHTML = `<h3>${title}<button class="btn ghost small x" type="button">✕</button></h3><div class="ux2-body">${html}</div>`; p.querySelector('.x').onclick = () => p.classList.remove('open'); p.classList.add('open'); return p; }
  window.EasyUX2.panel = panel;

  /* ---------- U12: a toast with Undo ---------- */
  function undoToast(msg, undo) { $$('.ux2-toast').forEach(t => t.remove()); const t = el('div', 'ux2-toast', `<span>${esc(msg)}</span>${undo ? '<button type="button">Undo</button>' : ''}`); document.body.appendChild(t);
    const b = t.querySelector('button'); if (b) b.onclick = () => { t.remove(); undo(); }; setTimeout(() => t.remove(), 7000); }
  window.EasyUX2.undoToast = undoToast;

  /* ---------- U1, U2, U3: the report tools in tabs, a preview card, favourites ---------- */
  const TABS = [['check', '🩺 Check', ['btnHealth', 'btnTextCheck', 'btnSampl', 'btnChecklist', 'btnAccess', 'btnSapCmp', 'btnPlanned', 'btnTrySet', 'wsFile', 'btnReviewer', 'btnConsist', 'btnHandoff', 'btnStory', 'btnSentCheck', 'randAudFile', 'scrFile']],
    ['write', '✍ Write', ['btnAbs', 'btnLay', 'btnDiscussion', 'btnMethFull', 'btnThesisCh', 'btnRvResp', 'clJournal', 'btnLetter', 'btnAbsTable', 'btnLimits', 'btnHighlights', 'btnTwoCol', 'rvBackFile', 'btnJournal', 'btnStyles3', 'btnGlossApp', 'btnRebut', 'btnPoster']],
    ['explore', '🔬 Explore', ['btnSubForest', 'btnSensDash', 'btnMissRep', 'btnAssume', 'btnEffSize', 'btnBayesRead', 'btnForestAll', 'btnResSnap', 'resSnapList', 'btnMultiplicity', 'btnOutSens', 'btnItt', 'btnLove', 'btnMdd', 'btnEquiv', 'btnAncAll', 'btnInter', 'btnTipping']],
    ['export', '⬇ Export', ['btnMd', 'btnTex', 'btnHtml', 'btnReview', 'btnSupp', 'btnOnePage', 'gaLayout', 'btnGA', 'btnRis', 'btnGdocs', 'btnResPage', 'btnSharePack', 'btnRScript', 'btnDeck', 'btnSap', 'btnVersions', 'btnArchive']]];
  const OUT = { btnMd: 'a file (.md)', btnTex: 'a file (.tex)', btnHtml: 'a web page file', btnReview: 'a Word file', btnSupp: 'a Word file', btnOnePage: 'a Word file', btnGA: 'an image', btnRis: 'a file (.ris)', btnResPage: 'a web page file', btnSharePack: 'a zip file', btnRScript: 'an R script', btnDeck: 'a PowerPoint file', btnSap: 'a Word file', btnThesisCh: 'a Word file', btnGdocs: 'the clipboard' };
  const outOf = id => OUT[id] || (/^btn(Md|Tex)/.test(id) ? 'a file' : 'a panel below the buttons');
  function toolTabs() { const first = $('#btnMd'); if (!first || $('#ux2Tabs')) return; const row = first.parentNode, kids = [...row.children], favs = new Set(ls.get('favTools', []));
    const bar = el('div', 'ux2-tabs'); bar.id = 'ux2Tabs'; bar.setAttribute('role', 'tablist'); const favRow = el('div', 'ux2-fav'); favRow.id = 'ux2Fav';
    const panes = {}; [...TABS, ['more', '⋯ More', []]].forEach(([k, l]) => { const b = el('button', '', l); b.type = 'button'; b.dataset.ux2tab = k; b.setAttribute('role', 'tab'); bar.appendChild(b); panes[k] = el('div', 'ux2-pane'); panes[k].dataset.ux2pane = k; });
    const tail = el('div', 'row'); tail.style.cssText = 'gap:8px;margin-top:8px;flex-wrap:wrap'; let inTail = false;
    kids.forEach(c => { if (c.classList.contains('spacer')) inTail = true; if (inTail) { tail.appendChild(c); return; } const ids = [c.id, ...[...c.querySelectorAll('[id]')].map(x => x.id)].filter(Boolean), t = TABS.find(T => ids.some(i => T[2].includes(i)));
      panes[t ? t[0] : 'more'].appendChild(c); });
    row.style.display = 'none'; row.after(bar, favRow, ...Object.values(panes), tail);
    if (!panes.more.children.length) bar.querySelector('[data-ux2tab="more"]').remove();
    const pick = k => { bar.querySelectorAll('button').forEach(b => { b.classList.toggle('on', b.dataset.ux2tab === k); b.setAttribute('aria-selected', String(b.dataset.ux2tab === k)); }); Object.entries(panes).forEach(([kk, p]) => p.classList.toggle('on', kk === k)); ls.set('tab', k); };
    bar.onclick = e => { const b = e.target.closest('[data-ux2tab]'); if (b) pick(b.dataset.ux2tab); }; pick(ls.get('tab', 'check'));
    // stars and the favourites row
    Object.values(panes).forEach(p => p.querySelectorAll('button.btn[id], label.btn').forEach(b => { const id = b.id || (b.querySelector('input[id]') || {}).id; if (!id) return; const s = el('button', 'ux2-star' + (favs.has(id) ? ' on' : ''), favs.has(id) ? '★' : '☆'); s.type = 'button'; s.title = 'Pin to My tools'; s.dataset.ux2star = id; b.after(s); }));
    const drawFav = () => { const f = ls.get('favTools', []); favRow.innerHTML = f.length ? `<b style="font-size:13px">★ My tools</b>${f.map(id => { const b = document.getElementById(id), lab = b ? (b.closest('label.btn') || b).textContent.trim() : ''; return b ? `<button class="btn ghost small" type="button" data-ux2go="${esc(id)}">${esc(lab || id)}</button>` : ''; }).join('')}` : ''; };
    drawFav();
    document.addEventListener('click', e => { const s = e.target.closest('[data-ux2star]'); if (s) { e.preventDefault(); const id = s.dataset.ux2star, f = new Set(ls.get('favTools', [])); f.has(id) ? f.delete(id) : f.add(id); ls.set('favTools', [...f]); s.classList.toggle('on', f.has(id)); s.textContent = f.has(id) ? '★' : '☆'; drawFav(); return; }
      const g = e.target.closest('[data-ux2go]'); if (g) { const b = document.getElementById(g.dataset.ux2go); if (b) b.click(); } });
    // U2: the preview card of a tool: what it does and what it gives
    const card = el('div', 'ux2-card'); card.style.display = 'none'; document.body.appendChild(card); let ht = 0;
    const show = (b, ev) => { const id = b.id || (b.querySelector('input[id]') || {}).id || ''; const t = b.title || (b.closest('label') || {}).title || ''; if (!t) return; const tab = TABS.find(T => T[2].includes(id));
      card.innerHTML = `<b>${esc(b.textContent.trim())}</b><div style="margin:4px 0">${esc(t)}</div><span class="k">${tab ? tab[1] : 'Tool'}</span><span class="k">gives ${esc(outOf(id))}</span>`; card.style.display = '';
      const r = b.getBoundingClientRect(); card.style.left = Math.min(innerWidth - 320, Math.max(8, r.left)) + 'px'; card.style.top = (r.bottom + 6 + card.offsetHeight > innerHeight ? r.top - card.offsetHeight - 6 : r.bottom + 6) + 'px'; };
    Object.values(panes).forEach(p => { p.addEventListener('mouseover', e => { const b = e.target.closest('.btn'); if (!b) return; clearTimeout(ht); ht = setTimeout(() => show(b, e), 350); }); p.addEventListener('mouseout', () => { clearTimeout(ht); card.style.display = 'none'; }); });
    // the tools keep their tooltip text for the card only
    Object.values(panes).forEach(p => p.querySelectorAll('.btn[title], label.btn[title]').forEach(b => { b.dataset.ux2t = b.title; b.setAttribute('aria-description', b.title); b.removeAttribute('title'); b.title = ''; Object.defineProperty(b, 'title', { get: () => b.dataset.ux2t, configurable: true }); })); }
  window.EasyUX2.toolTabs = toolTabs;

  /* ---------- U4: the status of each report part in the mini-map; U6: changed parts flash; U5: footnotes and headings edited in place ---------- */
  let prevSigs = null;
  const secIndex = sec => { const t = sec.querySelector('[data-ttl],[data-comment]'); return t ? +(t.dataset.ttl ?? t.dataset.comment) : -1; };
  function statusOf(i) { const r = S().result, s = r && r.sections[i]; if (!s) return ''; const auto = ((r.auto || {}).sections || []).find(x => x.title === s.title), locked = (S().cfg.lockedSecs || {})[s.title] || (S().cfg.lockedSecs || []).includes && (S().cfg.lockedSecs || []).includes(s.title);
    const task = ((S().cfg.org || {}).tasks || []).some(t => t.sec === s.title && !t.done), warn = !String(s.comment || '').trim() || (s.rows || []).length > 30;
    return `${locked ? '🔒' : ''}${task ? '📌' : ''}${warn ? '⚠' : auto && auto.comment !== s.comment ? '✓' : ''}`; }
  function onReport() { const r = S().result, rep = $('#report'); if (!r || !rep) return;
    if (!r.sections.length && !rep.querySelector('.ux2-empty')) { const box = el('div', 'ux2-empty', `<h3>Nothing to report yet</h3><p class="legend-note">No variable is ticked for the analysis, or every table is switched off.</p><button class="btn primary" type="button">Choose the variables (step 2)</button>`); rep.prepend(box); box.querySelector('button').onclick = () => U.go(2); }
    // the mini-map marks
    const mini = $('#uxMini'); if (mini) { const secs = $$('#report .report-sec'); mini.querySelectorAll('[data-mm]').forEach(a => { const s = secs[+a.dataset.mm], i = s ? secIndex(s) : -1; let ic = a.querySelector('.ux2-ic'); const st = i >= 0 ? statusOf(i) : ''; if (!ic) { ic = el('span', 'ux2-ic'); a.prepend(ic); } ic.textContent = st; ic.title = st ? '✓ comment edited · ⚠ needs a look (no comment or a long table) · 🔒 locked · 📌 open task' : ''; }); }
    // what changed since the last run
    const sigs = new Map(r.sections.map(s => [s.title, JSON.stringify([s.rows, s.comment])]));
    if (prevSigs && prevSigs.run !== r) { $$('#report .report-sec').forEach(sec => { const i = secIndex(sec), s = r.sections[i]; if (!s) return; const was = prevSigs.map.get(s.title); if (was !== undefined && was !== sigs.get(s.title)) { sec.classList.remove('ux2-changed'); void sec.offsetWidth; sec.classList.add('ux2-changed'); } }); }
    prevSigs = { map: sigs, run: r };
    // footnotes and column headings editable in place
    $$('#report .report-sec').forEach(sec => { const i = secIndex(sec), s = r.sections[i]; if (!s) return;
      const f = sec.querySelector('.foot'); if (f && !f.isContentEditable) { f.contentEditable = 'true'; f.title = 'Click to edit the footnote'; f.onblur = () => { if (s.footnote !== f.textContent) { s.footnote = f.textContent; logOrg(`Footnote of “${s.title}” edited`); } }; }
      const ths = sec.querySelectorAll('table.rt thead tr:last-child th'); if (ths.length === (s.head || []).length) ths.forEach((th, k) => { if (th.isContentEditable) return; th.contentEditable = 'true'; th.title = 'Click to edit the column heading'; th.onblur = () => { const h = s.head[k], nv = th.textContent.trim(); if ((typeof h === 'string' ? h : h && h.t) === nv) return; s.head[k] = typeof h === 'string' || !h ? nv : { ...h, t: nv }; logOrg(`Column heading of “${s.title}” edited`); }; });
      // U14: review buttons
      if (!sec.querySelector('.ux2-rv') && sec.querySelector('[data-comment]')) { const rv = el('div', 'ux2-rv', `<button class="btn ghost small" type="button" data-ux2rv="ok">✓ Approve</button><button class="btn ghost small" type="button" data-ux2rv="no">✗ Back to the automatic text</button><input type="text" placeholder="Note for the author" data-ux2rvn style="flex:1;min-width:120px">`); sec.querySelector('[data-comment]').after(rv);
        const mk = (S().cfg.org || {}).review || {}, m = mk[s.title]; if (m) { rv.querySelector(`[data-ux2rv="${m.v}"]`).classList.add(m.v === 'ok' ? 'on-ok' : 'on-no'); rv.querySelector('[data-ux2rvn]').value = m.note || ''; } } });
    nextBest(); }
  window.EasyUX2.onReport = onReport;
  document.addEventListener('click', e => { const b = e.target.closest('[data-ux2rv]'); if (!b) return; const sec = b.closest('.report-sec'), i = secIndex(sec), r = S().result, s = r && r.sections[i]; if (!s) return;
    const org = org0(), rv = org.review = org.review || {}, v = b.dataset.ux2rv; rv[s.title] = { ...(rv[s.title] || {}), v, at: new Date().toISOString() };
    if (v === 'no') { const a = ((r.auto || {}).sections || []).find(x => x.title === s.title), ta = sec.querySelector('[data-comment]'); if (a && ta) { ta.value = a.comment; ta.dispatchEvent(new Event('input', { bubbles: true })); } }
    sec.querySelectorAll('[data-ux2rv]').forEach(x => x.classList.remove('on-ok', 'on-no')); b.classList.add(v === 'ok' ? 'on-ok' : 'on-no'); logOrg(`Review: “${s.title}” ${v === 'ok' ? 'approved' : 'sent back to the automatic text'}`); reviewCount(); });
  document.addEventListener('change', e => { const n = e.target.closest('[data-ux2rvn]'); if (!n) return; const sec = n.closest('.report-sec'), s = S().result.sections[secIndex(sec)]; if (!s) return; const rv = org0().review = org0().review || {}; rv[s.title] = { ...(rv[s.title] || {}), note: n.value }; });
  function reviewCount() { const b = $('#ux2RevN'); if (!b) return; const rv = (S().cfg.org || {}).review || {}, v = Object.values(rv); b.textContent = v.length ? ` (${v.filter(x => x.v === 'ok').length} ✓, ${v.filter(x => x.v === 'no').length} ✗)` : ''; }

  /* ---------- the organisation data of the project (kept in the setup, so it is saved with the project) ---------- */
  function org0() { const c = S().cfg; if (!c) return {}; return c.org = c.org || {}; }
  function logOrg(what, kind = 'auto') { const c = S().cfg; if (!c) return; const o = org0(); (o.log = o.log || []).push({ at: new Date().toISOString(), what, kind }); if (o.log.length > 500) o.log.splice(0, o.log.length - 500); }
  window.EasyUX2.org = org0; window.EasyUX2.log = logOrg;

  /* ---------- U7 page view, U14 review mode: buttons on the report bar ---------- */
  function reportBar() { const b = $('#uxRepBar'); if (!b || $('#ux2Page')) return;
    const pg = el('button', 'btn ghost small', '📄 Page view'); pg.type = 'button'; pg.id = 'ux2Page'; pg.title = 'The report as A4 pages with the margins and the font of step 11 (approximate page breaks)';
    pg.onclick = () => { const on = document.documentElement.classList.toggle('ux2-page'), o = S().cfg.options || {}, mar = { narrow: 1.27, normal: 2.54, moderate: 1.91, wide: 5.08 }[o.pageMargin] || (o.pageMargin === 'custom' ? +o.marLeft || 2.54 : 2.54);
      document.documentElement.style.setProperty('--ux2m', mar + 'cm'); document.documentElement.style.setProperty('--ux2f', `'${o.font || 'Times New Roman'}', serif`); pg.classList.toggle('primary', on); };
    const rv = el('button', 'btn ghost small', '📱 Review mode<span id="ux2RevN"></span>'); rv.type = 'button'; rv.id = 'ux2Rev'; rv.title = 'Read the report and approve each comment or send it back (works on a phone); the editing buttons are hidden';
    rv.onclick = () => { const on = document.documentElement.classList.toggle('ux2-review'); rv.classList.toggle('primary', on); $$('#report textarea[data-comment]').forEach(t => { t.readOnly = on; }); };
    b.append(pg, rv); reviewCount(); if (innerWidth < 700 && !ls.get('revAsked', false)) { ls.set('revAsked', true); rv.click(); U.toast('Review mode is on (a small screen): approve or send back each comment'); } }

  /* ---------- U10: the status of each step on the stepper ---------- */
  const OPT_STEPS = new Set([8, 9, 10, 11]), AUTO_STEPS = new Set([3, 4, 5, 6, 7]);
  function stepStatus() { const st = S(); $$('#stepper .step').forEach((s, i) => { const k = i + 1; let t = s.querySelector('.ux2-st'); if (!t) { t = el('div', 'ux2-st'); (s.querySelector('.sub') || s).after(t); }
      const warn = s.classList.contains('ux-warn'), txt = !st.data ? '' : warn ? 'needs a look' : k === 2 && st.cfg && !st.cfg.variables.some(v => v.role === 'primary') ? 'mark the outcomes' : AUTO_STEPS.has(k) ? 'auto-chosen ✓' : OPT_STEPS.has(k) ? 'optional' : '';
      t.textContent = txt; t.className = 'ux2-st ' + (warn || txt === 'mark the outcomes' ? 'warn' : AUTO_STEPS.has(k) ? 'auto' : 'opt'); }); }
  const stp = $('#stepper'); if (stp) new MutationObserver(() => { clearTimeout(stepStatus._t); stepStatus._t = setTimeout(() => { stepStatus(); emptyState(); }, 30); }).observe(stp, { childList: true, subtree: false });

  /* ---------- U11: the next best action ---------- */
  let nbaI = 0;
  function nbaList() { const st = S(), out = []; if (!st.data || !st.cfg) return out; const cfg = st.cfg, rows = st.data.rows;
    if (!(cfg.study && String(cfg.study.title || '').trim())) out.push(['The report has no study title', 'Add it', () => { U.go(1); setTimeout(() => { const t = $('#studyTitle'); if (t) t.focus(); }, 80); }]);
    if (!cfg.variables.some(v => v.include && v.role === 'primary')) out.push(['The primary outcome is not marked', 'Mark it (step 2)', () => U.go(2)]);
    const miss = cfg.variables.filter(v => v.include && v.cols && v.cols.length).map(v => ({ v, p: rows.length ? rows.filter(r => U.isMissing(r[v.cols[v.cols.length - 1].col])).length / rows.length : 0 })).filter(x => x.p > 0.2).sort((a, b) => b.p - a.p);
    if (miss.length) out.push([`${miss[0].v.label} has ${Math.round(100 * miss[0].p)}% missing values${miss.length > 1 ? ` (and ${miss.length - 1} more variable${miss.length > 2 ? 's' : ''})` : ''}`, 'See the missing data', () => { U.go(12); setTimeout(() => { const b = $('#btnMissRep'); if (b) { const d = b.closest('details'); if (d) d.open = true; b.click(); } }, 400); }]);
    const tasks = ((cfg.org || {}).tasks || []).filter(t => !t.done); if (tasks.length) out.push([`${tasks.length} open task${tasks.length > 1 ? 's' : ''} on the report`, 'Show the tasks', () => window.EasyUX2.tasks && window.EasyUX2.tasks()]);
    if (window.EasyUX2.extraNba) try { out.unshift(...window.EasyUX2.extraNba()); } catch (e) { /* none */ }
    const r = st.result; if (r && r.auto) { const same = r.sections.filter(s => { const a = (r.auto.sections || []).find(x => x.title === s.title); return a && a.comment === s.comment && s.comment; }).length; if (same >= 3) out.push([`${same} tables still have the automatic comment — read them once`, 'Go to the first', () => { const ta = [...$$('#report textarea[data-comment]')].find(t => { const s = r.sections[+t.dataset.comment], a = (r.auto.sections || []).find(x => x.title === s.title); return a && a.comment === t.value; }); if (ta) { ta.scrollIntoView({ block: 'center' }); ta.focus(); } }]); }
    return out; }
  function nextBest() { const host = $('#report'); if (!host) return; let b = $('#ux2Nba'); const L = nbaList(); if (!L.length) { if (b) b.remove(); return; }
    if (!b) { b = el('div', 'ux2-nba'); b.id = 'ux2Nba'; host.parentNode.insertBefore(b, host); } nbaI = nbaI % L.length; const [t, l] = L[nbaI];
    b.innerHTML = `<b>👉 Next:</b> <span>${esc(t)}</span><span class="spacer"></span><button class="btn primary small" type="button" data-nba="go">${esc(l)}</button>${L.length > 1 ? `<button class="btn ghost small" type="button" data-nba="next">Another (${nbaI + 1}/${L.length})</button>` : ''}`;
    b.onclick = e => { const x = e.target.closest('[data-nba]'); if (!x) return; if (x.dataset.nba === 'next') { nbaI++; nextBest(); } else L[nbaI][2](); }; }

  /* ---------- U13: empty states ---------- */
  function emptyState() { const n = step(), st = S(); $$('.ux2-empty').forEach(e => { if (st.data || +e.dataset.step !== n) e.remove(); }); if (st.data || n < 2) return; const p = $('#p' + n); if (!p || p.querySelector('.ux2-empty')) return;
    const box = el('div', 'ux2-empty', `<h3>No data yet</h3><p class="legend-note">This step works on your data. Upload an Excel file, or open an example to see what it does.</p><div class="row" style="gap:8px;justify-content:center"><button class="btn primary" type="button" data-ux2e="up">⬆ Upload a file (step 1)</button><button class="btn ghost" type="button" data-ux2e="ex">Try an example</button></div>`); box.dataset.step = n;
    (p.querySelector('.card') || p).prepend(box); box.onclick = e => { const b = e.target.closest('[data-ux2e]'); if (!b) return; U.go(1); setTimeout(() => { if (b.dataset.ux2e === 'up') { const f = $('#file'); if (f) f.click(); } else { const x = $('[data-exopen]'); if (x) x.scrollIntoView({ block: 'center' }); } }, 80); }; }

  /* ---------- U12: an undo toast for the changes made by a click in steps 2 and 12 ---------- */
  let before = null; const noOrg = (k, v) => k === 'org' ? undefined : v;
  document.addEventListener('pointerdown', e => { const t = e.target.closest('button, .btn, [data-tbo], input[type=checkbox]'); if (!t || !t.closest('#p12, #p2') || t.closest('.ux2-rv, #ux2Tabs, .ux2-fav, .ux2-panel')) { before = null; return; } try { before = { json: JSON.stringify(S().cfg, noOrg), label: (t.textContent || t.title || '').trim().slice(0, 50) || 'Setting changed', step: step() }; } catch (err) { before = null; } }, true);
  document.addEventListener('click', () => { const b = before; before = null; if (!b) return; setTimeout(() => { let now; try { now = JSON.stringify(S().cfg, noOrg); } catch (e) { return; } if (now === b.json) return;
      logOrg(`${b.label} (step ${b.step})`); undoToast(`${b.label}`, () => { const keep = S().cfg.org; S().cfg = JSON.parse(b.json); if (keep) S().cfg.org = keep; try { U.renderOptions && U.renderOptions(); U.renderVariables && U.renderVariables(); } catch (e) { /* not on screen */ } if (b.step === 12 && S().result) U.runAnalysis(); U.toast('Undone'); }); }, 120); });

  /* ---------- report observer ---------- */
  const rep = $('#report'); if (rep) new MutationObserver(() => { clearTimeout(onReport._h); onReport._h = setTimeout(() => { reportBar(); onReport(); }, 200); }).observe(rep, { childList: true });
  setTimeout(() => { toolTabs(); stepStatus(); }, 0);
})();

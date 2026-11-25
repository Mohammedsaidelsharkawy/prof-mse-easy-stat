/* Prof Easy Stat — round 15, UI and UX:
   N1 live report beside the options · N2 what changed · N3 step rings · N4 breadcrumb menu · N5 collapsible cards
   F2 bulk edit (more) · F3 smart-defaults banner · F4 favourite options · F5 recent actions
   P1 progress with stages and Cancel · P2 placeholders · P3 friendly errors · P4 finished summary
   A1 keyboard · A2 labels for icon buttons · A3 phone tab bar · A4 installable · A5 remembered layout
   L1 hover glossary · L2 why greyed out · L3 first-time tips · L4 sandbox · D1 interface colour · D3 arrange the header */
(() => {
  const U = window.EasyUI; if (!U) return;
  const S = () => U.state, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], esc = U.esc;
  const el = (t, c, h) => { const e = document.createElement(t); if (c) e.className = c; if (h !== undefined) e.innerHTML = h; return e; };
  const LS = { get: (k, d) => { try { const v = localStorage.getItem('u15.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('u15.' + k, JSON.stringify(v)); } catch (e) { /* storage full or blocked */ } } };
  const proj = () => { try { return (U.baseName && U.baseName()) || 'project'; } catch (e) { return 'project'; } };
  const step = () => S().step || 1;
  const menuAdd = (text, title, fn, id) => { const m = $('.ux-menu'); if (!m) return null; const b = el('button', 'btn ghost small', text); b.type = 'button'; b.title = title; if (id) b.id = id; b.onclick = () => { m.classList.remove('open'); fn(); }; m.appendChild(b); return b; };
  const panel = (id, title, html) => window.EasyUX2 && EasyUX2.panel ? EasyUX2.panel(id, title, html) : null;
  const flash = n => { if (!n) return; n.scrollIntoView({ behavior: 'smooth', block: 'center' }); n.classList.remove('u15-flash'); void n.offsetWidth; n.classList.add('u15-flash'); setTimeout(() => n.classList.remove('u15-flash'), 2200); };

  const css = el('style'); css.textContent = `
#report textarea,#u15PaneB .u15-ta,.paper-prev p,.paper-prev .pc,#comPreview p{text-align:justify}
.u15-flash{animation:u15f 2s ease}@keyframes u15f{0%,40%{box-shadow:0 0 0 4px #F5C04A}100%{box-shadow:0 0 0 0 transparent}}
#busy .u15-prog{background:var(--card);color:var(--ink);border-radius:14px;padding:16px 18px;min-width:min(380px,90vw);box-shadow:0 12px 40px rgba(0,0,0,.3)}
#busy .u15-st{font-weight:700;margin-bottom:8px}#busy .u15-done{font-size:12px;color:var(--muted);margin:0 0 8px;max-height:84px;overflow:hidden}
#busy .u15-bar{height:8px;border-radius:6px;background:var(--lav2);overflow:hidden;position:relative}#busy .u15-bar i{position:absolute;inset:0 auto 0 0;width:35%;border-radius:6px;background:var(--purple);animation:u15b 1.3s ease-in-out infinite}
@keyframes u15b{0%{left:-35%}100%{left:100%}}#busy .u15-sub{display:flex;justify-content:space-between;align-items:center;margin-top:8px;font-size:12px;color:var(--muted)}
#busy.u15-mini{background:transparent!important;pointer-events:none;inset:auto 14px 14px auto!important;width:auto!important;height:auto!important}#busy.u15-mini .u15-prog{pointer-events:auto;min-width:240px;padding:10px 12px}
.u15-skel{border-radius:10px;background:linear-gradient(90deg,var(--lav) 25%,var(--lav2) 50%,var(--lav) 75%);background-size:400% 100%;animation:u15s 1.4s ease infinite;margin:10px 0}@keyframes u15s{0%{background-position:100% 0}100%{background-position:0 0}}
.report-sec.u15-chg{animation:u15c 6s ease}@keyframes u15c{0%,60%{box-shadow:0 0 0 3px #F5C04A;background:#FFF8E1}100%{box-shadow:none}}
.u15-chip{position:fixed;right:16px;bottom:74px;z-index:8500;display:flex;gap:4px;align-items:center;background:#F5C04A;color:#3a2a00;border-radius:20px;padding:4px 6px 4px 12px;font-weight:700;box-shadow:0 6px 18px rgba(0,0,0,.2)}
.u15-chip button{border:0;background:rgba(255,255,255,.55);border-radius:14px;padding:3px 9px;cursor:pointer;font:inherit}
.u15-done-card{position:fixed;left:50%;transform:translateX(-50%);bottom:18px;z-index:8400;background:var(--card);color:var(--ink);border:1px solid var(--line);border-radius:14px;box-shadow:0 12px 30px rgba(0,0,0,.2);padding:10px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;max-width:calc(100vw - 24px)}
.u15-err{border:1px solid #E8B4AE;background:#FFF5F3;color:#5b1d16;border-radius:12px;padding:12px 14px}.u15-err h3{margin:0 0 6px;font-size:16px}
#stepper .step .num.u15-r-done{box-shadow:0 0 0 3px #3FB27F}#stepper .step .num.u15-r-warn{box-shadow:0 0 0 3px #E0533F}#stepper .step .num.u15-r-new{box-shadow:0 0 0 2px dashed #B9AFCB;outline:2px dashed #CFC6DE;outline-offset:2px}
.ux-crumb{cursor:pointer;top:var(--u15top,62px)!important}.ux-crumb::after{content:' ▾';opacity:.7}.u15-cmenu{position:fixed;z-index:9000;background:var(--card);border:1px solid var(--line);border-radius:10px;box-shadow:0 10px 28px rgba(0,0,0,.2);padding:4px;max-height:60vh;overflow:auto;min-width:220px}
.u15-cmenu button{display:block;width:100%;text-align:left;border:0;background:none;padding:6px 10px;border-radius:7px;cursor:pointer;color:var(--ink);font:inherit}.u15-cmenu button:hover{background:var(--lav)}
.card.u15-coll > :not(:first-child){display:none!important}.u15-ct{border:0;background:none;cursor:pointer;font-size:14px;color:var(--muted);padding:0 4px;margin-right:4px;transition:transform .15s}.card.u15-coll .u15-ct{transform:rotate(-90deg)}
.u15-cbar{display:flex;gap:6px;justify-content:flex-end;margin:6px 0 4px}#u15GBar{max-width:var(--maxw,1600px);margin-left:auto;margin-right:auto;padding:0 6px}#u15GBar.u15-inphase{margin:0 0 0 14px;padding:0;max-width:none}.ph-build #u15GBar,.ph-generate #u15GBar{display:none}.u15-cbar button{font-size:12px}
.u15-fav{border:0;background:none;cursor:pointer;color:#bbb;font-size:13px;padding:0 3px}.u15-fav.on{color:#E2A400}
.u15-my{border:1px dashed #E2C060;background:#FFFBEF}.u15-my .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.u15-banner{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:var(--lav);border:1px solid var(--lav2);border-radius:12px;padding:10px 12px;margin:0 0 10px}
#u15Pane{position:fixed;top:var(--u15top,72px);right:0;bottom:0;z-index:15;background:var(--bg);border-left:1px solid var(--line);display:flex;flex-direction:column;box-shadow:-6px 0 18px rgba(0,0,0,.06)}
#u15Pane .u15-ph{display:flex;gap:6px;align-items:center;padding:6px 10px;border-bottom:1px solid var(--line);background:var(--card);font-size:13px}#u15Pane .u15-pb{overflow:auto;padding:10px 14px;flex:1}
#u15Pane .u15-grip{position:absolute;left:-5px;top:0;bottom:0;width:10px;cursor:col-resize}#u15Pane .u15-ta{white-space:pre-wrap;font-size:13px;margin:6px 0}#u15Pane .btn,#u15Pane button{display:none}
html.u15-live main,html.u15-live .wrap,html.u15-live #app{margin-right:var(--u15w,520px)!important}
#u15LiveBtn{position:fixed;right:0;top:45%;z-index:16;writing-mode:vertical-rl;border-radius:10px 0 0 10px;padding:10px 6px}
.u15-tip{position:fixed;z-index:9500;max-width:300px;background:#1C1648;color:#fff;border-radius:10px;padding:8px 10px;font-size:12.5px;box-shadow:0 8px 24px rgba(0,0,0,.3);pointer-events:none}.u15-tip b{color:#E9D7FF}
::highlight(u15g){text-decoration:underline dotted #7B2FBE;text-decoration-thickness:2px}
.u15-gchips{display:flex;flex-wrap:wrap;gap:4px;margin:3px 0 0}.u15-gchips span{font-size:11px;border-bottom:1px dotted var(--purple);color:var(--muted);cursor:help}
.u15-why{position:fixed;z-index:9500;background:#FFF4D6;color:#4a3800;border:1px solid #E5B53A;border-radius:10px;padding:6px 9px;font-size:12.5px;max-width:280px;pointer-events:none;box-shadow:0 6px 18px rgba(0,0,0,.15)}
.u15-hint{position:fixed;z-index:9400;max-width:290px;background:var(--card);color:var(--ink);border:2px solid #F5C04A;border-radius:12px;padding:10px 12px;font-size:13px;box-shadow:0 10px 26px rgba(0,0,0,.25)}.u15-hint .row{margin-top:6px;gap:6px}
.u15-sbx{position:sticky;top:var(--u15top,72px);z-index:19;background:#E8F7EE;border-bottom:2px solid #3FB27F;color:#14532d;padding:6px 12px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;justify-content:center;font-size:13.5px}
.u15-skip{position:absolute;left:-9999px;top:6px;z-index:10000;background:#fff;color:#1C1648;padding:8px 12px;border-radius:8px;font-weight:700}.u15-skip:focus{left:12px}
:focus-visible{outline:3px solid #F5A623!important;outline-offset:2px}.rt td:focus,.rt th:focus,table.t td:focus{outline:3px solid #F5A623;outline-offset:-3px}
.u15-tabs{display:none}
@media (max-width:640px){.u15-tabs{display:flex;position:fixed;left:0;right:0;bottom:0;z-index:7900;background:var(--card);border-top:1px solid var(--line);padding:4px 4px calc(4px + env(safe-area-inset-bottom))}
 .u15-tabs button{flex:1;border:0;background:none;color:var(--muted);font:600 11px/1.2 inherit;padding:6px 2px;border-radius:10px;display:flex;flex-direction:column;align-items:center;gap:2px;min-height:48px}.u15-tabs button span{font-size:19px}
 .u15-tabs button.on{color:var(--purple);background:var(--lav)}body{padding-bottom:64px}#stepper{display:none!important}.u15-chip{bottom:72px}.u15-done-card{bottom:70px}#u15LiveBtn{display:none}}
.u15-hdr li{display:flex;gap:6px;align-items:center;padding:5px 6px;border:1px solid var(--line);border-radius:8px;margin:4px 0;background:var(--card)}.u15-hdr li.drag{opacity:.4}.u15-hdr ol{list-style:none;padding:0;margin:6px 0}
.u15-sw{width:30px;height:30px;border-radius:50%;border:2px solid #fff;box-shadow:0 0 0 1px var(--line);cursor:pointer}.u15-sw.on{box-shadow:0 0 0 3px var(--ink)}
`; document.head.appendChild(css);
  const topH = () => { const h = $('header.top'); return h ? Math.round(h.getBoundingClientRect().height) : 72; };
  setInterval(() => document.documentElement.style.setProperty('--u15top', topH() + 'px'), 1000);

  /* ================= P1, P2: progress with stages, Cancel, placeholders ================= */
  const P = { on: false, cancel: false, t0: 0, list: [], timer: null };
  function progBox() { const b = $('#busy'); if (!b) return null; let p = b.querySelector('.u15-prog'); if (p && !p.querySelector('.u15-st')) { p.remove(); p = null; } if (!p) { b.innerHTML = '<div hidden class="u15-old">Working…</div><div class="u15-prog" role="status" aria-live="polite"><div class="u15-st">Working…</div><div class="u15-done"></div><div class="u15-bar"><i></i></div><div class="u15-sub"><span class="u15-t">0 s</span><button class="btn ghost small" type="button" id="u15Cancel">Cancel</button></div></div>'; p = b.querySelector('.u15-prog'); p.querySelector('#u15Cancel').onclick = () => { P.cancel = true; p.querySelector('.u15-st').textContent = 'Stopping after this stage…'; }; } return p; }
  window.EasyProgress = {
    busy(on) { const b = $('#busy'), p = progBox(); if (!b || !p) return;
      if (on) { if (!P.on) { P.on = true; P.cancel = false; P.t0 = Date.now(); P.list = []; p.querySelector('.u15-st').textContent = 'Working…'; p.querySelector('.u15-done').innerHTML = ''; clearInterval(P.timer);
          P.timer = setInterval(() => { const t = p.querySelector('.u15-t'); if (t) t.textContent = `${Math.round((Date.now() - P.t0) / 1000)} s`; }, 500); }
        b.classList.toggle('u15-mini', document.documentElement.classList.contains('u15-live') && step() !== 12); skeleton(); }
      else { P.on = false; clearInterval(P.timer); b.classList.remove('u15-mini'); } },
    stage(t) { const p = progBox(); if (!p) return; const st = p.querySelector('.u15-st'); if (P.list.length || st.textContent !== 'Working…') { const prev = st.textContent; if (prev && !/Stopping/.test(prev) && prev !== 'Working…') P.list.push(prev); }
      st.textContent = t + '…'; p.querySelector('.u15-done').innerHTML = P.list.slice(-4).map(x => `✓ ${esc(x.replace(/…$/, ''))}`).join('<br>'); },
    cancelled: () => P.cancel };
  function skeleton() { const r = $('#report'); if (!r || step() !== 12 || r.querySelector('.report-sec, .u15-skel')) return; r.insertAdjacentHTML('afterbegin', [60, 22, 180, 22, 140].map(h => `<div class="u15-skel" style="height:${h}px"></div>`).join('')); }

  /* ================= P3: friendly error cards ================= */
  const ERRS = [[/not enough|too few|fewer than|at least \d/i, 'Too few patients for this test', 'A test needs more patients in each group. Merge small groups (step 2) or choose a simpler test (step 4).', 2],
    [/undefined|null|cannot read/i, 'A setting points to something that is missing', 'Usually a variable, group or column that was renamed or removed. Check the variables in step 2 — the report runs again when you come back.', 2],
    [/group/i, 'A problem with the groups', 'Check the group column and the groups used in step 2.', 2], [/column|variable/i, 'A problem with a variable', 'Check the variables in step 2.', 2], [/memory|maximum call|too large/i, 'The data are too large for one go', 'Try fewer variables, or turn off the heaviest options (bootstrap, many figures).', 5]];
  window.EasyFriendly = { html(err) { const m = String((err && err.message) || err || 'Unknown error'), hit = ERRS.find(([re]) => re.test(m)) || [null, 'The analysis stopped', 'Something in the settings could not be calculated.', 2];
    const cols = (S().data && S().data.headers || []).filter(h => h.length > 2 && m.includes(h)).slice(0, 3);
    return `<div class="u15-err"><h3>⚠ ${esc(hit[1])}</h3><p style="margin:0 0 6px">${esc(hit[2])}${cols.length ? ` It involves <b>${cols.map(esc).join(', ')}</b>.` : ''}</p>
      <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn primary small" type="button" onclick="EasyUI.go(${hit[3]})">🔧 Fix it (step ${hit[3]})</button><button class="btn ghost small" type="button" onclick="EasyUI.runAnalysis()">↻ Try again</button>
      <details style="margin-left:6px"><summary class="legend-note">Technical details</summary><code style="font-size:11px">${esc(m)}</code></details></div></div>`; } };

  /* ================= N2, P4: what changed, finished summary ================= */
  const sig = s => JSON.stringify([s.comment || '', (s.rows || []).map(r => r.map(c => (c && c.t || []).join(' ')).join('|')), (s.figures || []).length, s.footnote || '']);
  let changed = [], ci = 0;
  window.EasyAfterRun = (res, before) => {
    if (before && before.sections) { const old = new Map(before.sections.map(s => [s.title, sig(s)])); changed = res.sections.map((s, i) => old.get(s.title) === sig(s) ? -1 : i).filter(i => i >= 0); }
    else changed = [];
    setTimeout(() => { markChanged($('#report')); livePaint(); summary(res, before); }, 60);
  };
  const secNode = (root, i) => { const t = root && root.querySelector(`[data-ttl="${i}"]`); return t && t.closest('.report-sec'); };
  function markChanged(root) { if (!root) return; changed.forEach(i => { const n = secNode(root, i); if (n) { n.classList.remove('u15-chg'); void n.offsetWidth; n.classList.add('u15-chg'); } });
    let chip = $('#u15Chip'); if (!changed.length) { if (chip) chip.remove(); return; } if (root.id !== 'report') return;
    if (!chip) { chip = el('div', 'u15-chip'); chip.id = 'u15Chip'; document.body.appendChild(chip); } ci = 0;
    chip.innerHTML = `<span>${changed.length} change${changed.length > 1 ? 's' : ''}</span><button type="button" data-u15c="next" title="Go to the next changed part">▸</button><button type="button" data-u15c="x" title="Close">✕</button>`;
    chip.onclick = e => { const b = e.target.closest('[data-u15c]'); if (!b) return; if (b.dataset.u15c === 'x') { chip.remove(); return; } if (step() !== 12) U.go(12); setTimeout(() => { const n = secNode($('#report'), changed[ci % changed.length]); ci++; flash(n); }, step() === 12 ? 0 : 400); };
    clearTimeout(markChanged.t); markChanged.t = setTimeout(() => chip && chip.remove(), 45000); }
  function summary(res, before) { if (document.documentElement.classList.contains('u15-live') && step() !== 12) return; if (before && !changed.length) return;
    const alpha = (S().cfg.options || {}).alpha || 0.05, tables = res.sections.filter(s => !s.figOnly && s.rows && s.rows.length).length, figs = res.sections.reduce((t, s) => t + (s.figures || []).length, 0);
    const sigN = res.sections.filter(s => (s.figures || []).some(f => f.sig === true && f.spec) || /\b(was|were) significantly\b|\bsignificant(ly)? (higher|lower|different|associated|more|less)/.test(s.comment || '')).length;
    let c = $('#u15Done'); if (c) c.remove(); c = el('div', 'u15-done-card'); c.id = 'u15Done'; c.setAttribute('role', 'status');
    c.innerHTML = `<b>✓ Report ready:</b> <span>${tables} table${tables === 1 ? '' : 's'}, ${figs} figure${figs === 1 ? '' : 's'}, ${sigN} with a significant result</span><button class="btn primary small" type="button" data-u15d="word">⬇ Word</button>${step() !== 12 ? '<button class="btn ghost small" type="button" data-u15d="see">See the report</button>' : ''}<button class="btn ghost small" type="button" data-u15d="chk" title="The checks of the report (what is left to do)">Review warnings</button><button class="btn ghost small" type="button" data-u15d="x" aria-label="Close">✕</button>`;
    document.body.appendChild(c); c.onclick = e => { const b = e.target.closest('[data-u15d]'); if (!b) return; const k = b.dataset.u15d; c.remove();
      if (k === 'word') { const w = $('#uxWord') || $('#btnDocx'); if (w) w.click(); } if (k === 'see') U.go(12);
      if (k === 'chk') { const m = [...$$('.ux-menu .btn')].find(x => /What's left|Project checklist/.test(x.textContent)); if (m) m.click(); else U.go(12); } };
    setTimeout(() => c.remove(), 12000); }

  /* ================= N1: the live report beside the options ================= */
  const live = { on: false, w: LS.get('liveW.' + proj(), 520), t: null };
  function liveBtn() { let b = $('#u15LiveBtn'); if (!b) { b = el('button', 'btn primary small', '📄 Live report'); b.id = 'u15LiveBtn'; b.type = 'button'; b.title = 'The report beside the options, updated as you change them'; b.onclick = () => liveToggle(); document.body.appendChild(b); }
    b.style.display = S().data && step() > 1 && step() < 12 && !live.on ? '' : 'none'; }
  function liveToggle(on = !live.on) { if (on && innerWidth < 1000) { U.toast('The live report needs a wider window (at least 1000 px)'); return; } live.on = on; document.documentElement.classList.toggle('u15-live', on);
    let p = $('#u15Pane'); if (!on) { if (p) p.remove(); liveBtn(); return; }
    if (!p) { p = el('aside', ''); p.id = 'u15Pane'; p.setAttribute('aria-label', 'Live report'); p.innerHTML = '<div class="u15-grip" title="Drag to resize"></div><div class="u15-ph"><b>📄 Live report</b><span class="legend-note" id="u15PaneT"></span><span class="spacer" style="flex:1"></span><a href="#" id="u15PaneRun" title="Run again now">⟳</a><a href="#" id="u15PaneX" title="Close the live report">✕</a></div><div class="u15-pb" id="u15PaneB"><p class="legend-note">Running the report…</p></div>'; document.body.appendChild(p);
      p.querySelector('#u15PaneX').onclick = e => { e.preventDefault(); liveToggle(false); }; p.querySelector('#u15PaneRun').onclick = e => { e.preventDefault(); liveRun(); };
      p.querySelector('.u15-grip').onpointerdown = e => { e.preventDefault(); const mv = ev => { live.w = Math.max(320, Math.min(innerWidth - 420, innerWidth - ev.clientX)); sizeLive(); }, up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); LS.set('liveW.' + proj(), live.w); }; addEventListener('pointermove', mv); addEventListener('pointerup', up); }; }
    sizeLive(); liveBtn(); if (S().result) livePaint(); else liveRun(); }
  function sizeLive() { document.documentElement.style.setProperty('--u15w', live.w + 'px'); const p = $('#u15Pane'); if (p) p.style.width = live.w + 'px'; }
  function liveRun() { if (!live.on || !S().data) return; try { U.readUiIntoCfg(); } catch (e) { /* the step has nothing to read */ } U.runAnalysis(); }
  function livePaint() { const b = $('#u15PaneB'), r = $('#report'); if (!live.on || !b || !r) return; const y = b.scrollTop, cl = r.cloneNode(true), tas = r.querySelectorAll('textarea'), ins = r.querySelectorAll('input[type=text], input:not([type])');
    cl.querySelectorAll('textarea').forEach((t, i) => { const d = el('div', 'u15-ta'); d.textContent = tas[i] ? tas[i].value : t.value; t.replaceWith(d); });
    cl.querySelectorAll('input[type=text], input:not([type])').forEach((t, i) => { const d = el('b', ''); d.textContent = ins[i] ? ins[i].value : t.value; t.replaceWith(d); });
    cl.querySelectorAll('input, select').forEach(x => { x.disabled = true; x.tabIndex = -1; }); cl.querySelectorAll('[contenteditable]').forEach(x => x.removeAttribute('contenteditable')); cl.querySelectorAll('[id]').forEach(x => x.removeAttribute('id'));
    b.innerHTML = ''; b.appendChild(cl); b.scrollTop = y; markChanged(b); const t = $('#u15PaneT'); if (t) t.textContent = '· updated ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); glossPaint(); }
  document.addEventListener('change', e => { if (!live.on || step() === 12 || step() === 1) return; const t = e.target; if (!t.closest || !t.closest('main, #app, .wrap, [id^=p]') || t.closest('#u15Pane, .ux2-panel, .ux-menu')) return; clearTimeout(live.t); live.t = setTimeout(liveRun, 1200); }, true);

  /* ================= N3: step rings ================= */
  const visited = () => LS.get('visited.' + proj(), []);
  function rings() { const st = S(); if (!st.data) return; const v = new Set(visited()); if (!v.has(step())) { v.add(step()); LS.set('visited.' + proj(), [...v]); }
    $$('#stepper .step').forEach((s, i) => { const n = i + 1, num = s.querySelector('.num'); if (!num) return; const w = s.querySelector('.ux2-st.warn'), cls = w ? 'u15-r-warn' : v.has(n) ? 'u15-r-done' : 'u15-r-new';
      if (!num.classList.contains(cls)) { num.classList.remove('u15-r-warn', 'u15-r-done', 'u15-r-new'); num.classList.add(cls); }
      const tip = w ? `Needs attention: ${w.textContent.trim()}` : v.has(n) ? 'Opened — done or checked' : 'Not opened yet'; if (s.title !== tip) s.title = tip; }); }

  /* ================= N4: the breadcrumb opens a list of the step's cards ================= */
  document.addEventListener('click', e => { const c = e.target.closest('.ux-crumb'); const old = $('.u15-cmenu'); if (old && !old.contains(e.target)) old.remove(); if (!c) return;
    const pnl = $('#p' + step()); if (!pnl) return; const hs = [...pnl.querySelectorAll('.card h2, .card h3')].filter(h => h.offsetParent || h.closest('.card.u15-coll'));
    const m = el('div', 'u15-cmenu'); m.setAttribute('role', 'menu'); m.innerHTML = hs.map((h, i) => `<button type="button" data-u15h="${i}">${esc(h.textContent.replace(/[▾▸☆★]/g, '').trim().slice(0, 60))}</button>`).join('') || '<div class="legend-note" style="padding:6px">No sections</div>';
    const r = c.getBoundingClientRect(); m.style.left = Math.max(6, Math.min(r.left, innerWidth - 260)) + 'px'; m.style.top = (r.bottom + 4) + 'px'; document.body.appendChild(m);
    m.onclick = ev => { const b = ev.target.closest('[data-u15h]'); if (!b) return; const h = hs[+b.dataset.u15h], card = h.closest('.card'); if (card && card.classList.contains('u15-coll')) toggleCard(card, false); m.remove(); flash(card || h); }; });

  /* ================= N5, A5: collapsible cards, remembered per project ================= */
  const cardKey = c => { const h = c.querySelector('h2, h3'), p = c.closest('[id^=p]'); return `${p ? p.id : ''}|${h ? h.textContent.replace(/[▾▸☆★]/g, '').trim().slice(0, 50) : ''}`; };
  const collSet = () => new Set(LS.get('coll.' + proj(), []));
  function toggleCard(c, to) { const on = to === undefined ? !c.classList.contains('u15-coll') : to; c.classList.toggle('u15-coll', on); const s = collSet(), k = cardKey(c); on ? s.add(k) : s.delete(k); LS.set('coll.' + proj(), [...s]); const b = c.querySelector('.u15-ct'); if (b) b.setAttribute('aria-expanded', String(!on)); }
  function cards() { const pnl = $('#p' + step()); if (!pnl) return; const s = collSet();
    const list = [...pnl.querySelectorAll(':scope .card')].filter(c => !c.closest('#report, .ux2-panel') && c.firstElementChild && c.firstElementChild.querySelector && (c.firstElementChild.matches('h2,h3') || c.firstElementChild.querySelector(':scope > h2, :scope > h3')));
    list.forEach(c => { if (c.dataset.u15c) return; c.dataset.u15c = '1'; const h = c.firstElementChild.matches('h2,h3') ? c.firstElementChild : c.firstElementChild.querySelector('h2, h3'); const b = el('button', 'u15-ct', '▾'); b.type = 'button'; b.title = 'Collapse / expand this card'; b.setAttribute('aria-expanded', 'true'); b.onclick = e => { e.stopPropagation(); toggleCard(c); }; h.prepend(b); if (s.has(cardKey(c))) toggleCard(c, true); });
    // one bar for every step, in the space above the step bar: it folds the cards of the step on screen
    let bar = $('#u15GBar'); const sp = $('#stepper'); if (!bar && sp) { bar = el('div', 'u15-cbar', '<button class="btn ghost small" type="button" data-u15all="1">▸ Collapse all</button><button class="btn ghost small" type="button" data-u15all="0">▾ Expand all</button>'); bar.id = 'u15GBar'; const pbar = $('#phaseBar'); if (pbar) { bar.classList.add('u15-inphase'); pbar.append(bar); } else sp.before(bar);
      bar.onclick = e => { const b = e.target.closest('[data-u15all]'); if (!b) return; const p0 = $('#p' + step()); if (p0) p0.querySelectorAll('.card[data-u15c]').forEach(c => toggleCard(c, b.dataset.u15all === '1')); }; }
    if (bar) bar.style.visibility = list.length && !document.documentElement.matches('.ph-build, .ph-generate') ? 'visible' : 'hidden'; }
  // A5: the scroll position of each step, per project
  let scT = null; addEventListener('scroll', () => { clearTimeout(scT); scT = setTimeout(() => { if (!S().data) return; const m = LS.get('scroll.' + proj(), {}); m[step()] = Math.round(scrollY); LS.set('scroll.' + proj(), m); }, 400); }, { passive: true });

  /* ================= F2: more in the bulk-edit bar, which stays in view ================= */
  function bulk() { const bar = $('#varSelBar'); if (!bar || bar.dataset.u15) return; bar.dataset.u15 = '1'; bar.style.position = 'sticky'; bar.style.top = 'calc(var(--u15top,72px) + 4px)'; bar.style.zIndex = '12'; bar.style.background = 'var(--card)'; bar.style.padding = '6px'; bar.style.borderRadius = '10px'; bar.style.boxShadow = '0 6px 16px rgba(0,0,0,.08)';
    const ct = U.CHART_TYPES || {}, charts = [...new Map(Object.values(ct).flat().map(([k, l]) => [k, l.split(' (')[0]])).entries()];
    bar.querySelector('#vsClear').insertAdjacentHTML('beforebegin', `<span class="legend-note">Test</span><select id="u15Dist" style="width:auto" aria-label="Test of the selected variables"><option value="">—</option><option value="auto">Automatic</option><option value="param">Parametric (t-test / ANOVA)</option><option value="nonparam">Non-parametric (Mann-Whitney / Kruskal)</option></select>
      <span class="legend-note">Decimals</span><select id="u15Dec" style="width:auto" aria-label="Decimals of the selected variables"><option value="">—</option><option value="auto">As step 5</option>${[0, 1, 2, 3].map(n => `<option value="${n}">${n}</option>`).join('')}</select>
      <span class="legend-note">Chart</span><select id="u15Chart" style="width:auto" aria-label="Chart of the selected variables"><option value="">—</option>${charts.map(([k, l]) => `<option value="${k}">${esc(l)}</option>`).join('')}</select>
      <span class="legend-note">In the report</span><select id="u15Inc" style="width:auto" aria-label="Selected variables in the report"><option value="">—</option><option value="1">Include</option><option value="0">Leave out</option></select>`);
    bar.addEventListener('change', e => { const t = e.target; if (!['u15Dist', 'u15Dec', 'u15Chart', 'u15Inc'].includes(t.id) || t.value === '') return; const vs = S().cfg.variables.filter(v => S().varSel && S().varSel.has(v.id)); let n = 0, skip = 0;
      vs.forEach(v => { if (t.id === 'u15Dist') { if (v.type === 'categorical') { skip++; return; } v.dist = t.value; }
        if (t.id === 'u15Dec') { if (t.value === 'auto') delete v.dec; else v.dec = t.value; } if (t.id === 'u15Inc') v.include = t.value === '1';
        if (t.id === 'u15Chart') { const ok = (ct[U.chartKind ? U.chartKind(v) : v.type] || []).some(([k]) => k === t.value); if (!ok) { skip++; return; } v.chart = t.value; } n++; });
      t.value = ''; S().result = null; try { U.renderVariables(); } catch (e) { /* redrawn on the next step */ } U.toast(`${n} variable${n === 1 ? '' : 's'} changed${skip ? ` · ${skip} skipped (not possible for their type)` : ''}`); }); }

  /* ================= F3: the smart-defaults banner ================= */
  function banner() { const p2 = $('#p2'); if (!p2 || !S().cfg || S().cfg.defaultsSeen) { const o = $('#u15Ban'); if (o) o.remove(); return; } if ($('#u15Ban')) return;
    const cfg = S().cfg, k = (cfg.groupOrder || []).filter(g => (cfg.groupInclude || {})[g] !== false).length, st = String(cfg.studyType || cfg.design || '').replace(/[_-]/g, ' ');
    const b = el('div', 'u15-banner', `<span>✨ <b>We chose the settings for ${st ? `a ${esc(st)} study` : 'your study'} with ${k > 1 ? `${k} groups` : 'one group'}</b> — tests, tables, figures and comments are set automatically.</span><span class="spacer" style="flex:1"></span><button class="btn ghost small" type="button" data-u15b="rev">Review step by step</button><button class="btn primary small" type="button" data-u15b="ok">Accept all → report</button><button class="btn ghost small" type="button" data-u15b="x" aria-label="Close">✕</button>`); b.id = 'u15Ban';
    const first = p2.querySelector('.card'); (first || p2).before ? (first ? first.before(b) : p2.prepend(b)) : p2.prepend(b);
    b.onclick = e => { const x = e.target.closest('[data-u15b]'); if (!x) return; S().cfg.defaultsSeen = true; b.remove(); if (x.dataset.u15b === 'ok') { try { U.readUiIntoCfg(); } catch (er) { /* nothing to read */ } U.go(12); } if (x.dataset.u15b === 'rev') U.go(3); }; }

  /* ================= F4: favourite options, mirrored in "My options" ================= */
  const favs = () => LS.get('favOpts', []);
  const ctlOf = l => { if (l.matches('label.f')) { const n = l.nextElementSibling; return n && n.matches('select[id], input[id]') ? n : null; } const i = l.querySelector('input[type=checkbox][id]'); return i; };
  const labText = l => (l.matches('label.f') ? l.textContent : (l.querySelector('span') || l).textContent).replace(/[☆★]/g, '').trim();
  function stars() { for (let n = 2; n <= 11; n++) { const pnl = $('#p' + n); if (!pnl) continue; pnl.querySelectorAll('label.f, label.check').forEach(l => { if (l.dataset.u15s || l.closest('.u15-my, #report, table')) return; const c = ctlOf(l); if (!c || !/^opt/.test(c.id)) return; l.dataset.u15s = '1';
      const s = el('button', 'u15-fav' + (favs().includes(c.id) ? ' on' : ''), favs().includes(c.id) ? '★' : '☆'); s.type = 'button'; s.title = 'Add to “My options” (top of every step)'; s.dataset.u15f = c.id; s.setAttribute('aria-label', 'Favourite: ' + labText(l)); l.appendChild(s); }); } }
  document.addEventListener('click', e => { const s = e.target.closest('[data-u15f]'); if (!s) return; e.preventDefault(); e.stopPropagation(); const id = s.dataset.u15f, f = favs(), i = f.indexOf(id); i >= 0 ? f.splice(i, 1) : f.push(id); LS.set('favOpts', f);
    $$(`[data-u15f="${id}"]`).forEach(x => { x.classList.toggle('on', i < 0); x.textContent = i < 0 ? '★' : '☆'; }); myOptions(true); U.toast(i < 0 ? 'Added to My options' : 'Removed from My options'); }, true);
  function myOptions(force) { const pnl = $('#p' + step()); if (!pnl || step() < 2 || step() > 11) return; let box = pnl.querySelector('.u15-my'); const f = favs().map(id => document.getElementById(id)).filter(Boolean);
    if (!f.length) { if (box) box.remove(); return; } if (box && !force && box.dataset.k === f.map(x => x.id).join()) { syncProxies(box); return; }
    if (!box) { box = el('div', 'card u15-my'); const first = pnl.querySelector('.card:not(.u15-my)'); first ? first.before(box) : pnl.prepend(box); } box.dataset.k = f.map(x => x.id).join();
    box.innerHTML = `<div class="row"><h2 style="margin:0;font-size:15px">★ My options</h2><span class="legend-note" style="margin-left:8px">the options you starred, from any step</span></div><div class="grid" style="margin-top:6px">${f.map(c => { const l = [...document.querySelectorAll('label')].find(x => ctlOf(x) === c), st = (c.closest('[id^=p]') || {}).id || '';
      return `<div><label class="f">${esc(l ? labText(l) : c.id)} <span class="legend-note">(step ${st.slice(1)})</span></label>${c.tagName === 'SELECT' ? `<select data-u15p="${c.id}">${[...c.options].map(o => `<option value="${esc(o.value)}">${esc(o.textContent)}</option>`).join('')}</select>` : c.type === 'checkbox' ? `<label class="check" style="margin:0"><input type="checkbox" data-u15p="${c.id}"><span>on</span></label>` : `<input type="${c.type === 'number' ? 'number' : 'text'}" data-u15p="${c.id}">`}</div>`; }).join('')}</div>`; syncProxies(box); }
  function syncProxies(box) { box.querySelectorAll('[data-u15p]').forEach(p => { const c = document.getElementById(p.dataset.u15p); if (!c || document.activeElement === p) return; if (p.type === 'checkbox') p.checked = c.checked; else p.value = c.value; }); }
  document.addEventListener('change', e => { const p = e.target.closest && e.target.closest('[data-u15p]'); if (!p) return; const c = document.getElementById(p.dataset.u15p); if (!c) return; if (p.type === 'checkbox') c.checked = p.checked; else c.value = p.value; c.dispatchEvent(new Event('input', { bubbles: true })); c.dispatchEvent(new Event('change', { bubbles: true })); });

  /* ================= F5: recent actions, each one a way back ================= */
  const REC = []; try { REC.push(...JSON.parse(sessionStorage.getItem('u15.rec') || '[]')); } catch (e) { /* none */ }
  const nameOf = t => { let l = t.id && document.querySelector(`label[for="${t.id}"]`); if (!l && t.previousElementSibling && t.previousElementSibling.matches('label')) l = t.previousElementSibling; if (!l) l = t.closest('label'); const s = t.getAttribute('aria-label') || (l ? (l.querySelector('span') && t.type === 'checkbox' ? l.querySelector('span') : l).textContent : '') || t.title || t.placeholder || t.name || t.id || ''; return s.replace(/[☆★▾]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60); };
  const valOf = t => t.type === 'checkbox' ? (t.checked ? 'on' : 'off') : t.tagName === 'SELECT' ? (t.selectedOptions[0] || {}).textContent || t.value : String(t.value).slice(0, 40);
  document.addEventListener('change', e => { const t = e.target; if (!t.matches || !t.matches('input, select, textarea') || t.type === 'file' || t.closest('#u15Rec, .u15-my') || !S().data) return; const what = nameOf(t); if (!what) return;
    REC.unshift({ at: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), step: step(), what, val: valOf(t), id: t.id || '' }); REC.length = Math.min(REC.length, 40); try { sessionStorage.setItem('u15.rec', JSON.stringify(REC)); } catch (er) { /* full */ } }, true);
  function recent() { const p = panel('u15Rec', '🕘 Recent actions', REC.length ? `<p class="legend-note" style="margin:0 0 6px">Click one to go back to that place.</p>${REC.map((r, i) => `<button class="btn ghost small" type="button" data-u15r="${i}" style="display:block;width:100%;text-align:left;margin:2px 0">${esc(r.at)} · <b>${esc(r.what)}</b> → ${esc(r.val)} <span class="legend-note">· step ${r.step}</span></button>`).join('')}` : '<p class="legend-note">Nothing changed yet in this session.</p>');
    if (p) p.onclick = e => { const b = e.target.closest('[data-u15r]'); if (!b) return; const r = REC[+b.dataset.u15r]; p.classList.remove('open'); U.go(r.step); setTimeout(() => flash(r.id && document.getElementById(r.id)), 450); }; }

  /* ================= A1: keyboard ================= */
  const skip = el('a', 'u15-skip', 'Skip to the report'); skip.href = '#report'; skip.onclick = e => { e.preventDefault(); U.go(12); setTimeout(() => { const r = $('#report'); if (r) { r.tabIndex = -1; r.focus(); } }, 300); }; document.body.prepend(skip);
  document.addEventListener('keydown', e => { if (!/^Arrow/.test(e.key) || e.altKey || e.ctrlKey || e.metaKey) return; const c = document.activeElement; if (!c || !c.matches('td, th') || !c.closest('table.rt, table.t')) return;
    const tr = c.parentElement, rows = [...c.closest('table').rows], ri = rows.indexOf(tr), ci = [...tr.cells].indexOf(c); let n = null;
    if (e.key === 'ArrowRight') n = tr.cells[ci + 1]; if (e.key === 'ArrowLeft') n = tr.cells[ci - 1];
    if (e.key === 'ArrowDown' && rows[ri + 1]) n = rows[ri + 1].cells[Math.min(ci, rows[ri + 1].cells.length - 1)]; if (e.key === 'ArrowUp' && rows[ri - 1]) n = rows[ri - 1].cells[Math.min(ci, rows[ri - 1].cells.length - 1)];
    if (n) { e.preventDefault(); if (!n.hasAttribute('tabindex')) n.tabIndex = -1; n.focus(); } });
  document.addEventListener('focusin', e => { const t = e.target; if (t.matches && t.matches('table.rt, table.t') && !t.querySelector('td[tabindex]')) { const c = t.querySelector('td, th'); if (c) { c.tabIndex = -1; c.focus(); } } });
  function kbdTables() { $$('#report table.rt, #p10 table.t').forEach(t => { if (!t.hasAttribute('tabindex')) { t.tabIndex = 0; t.setAttribute('aria-label', 'Table: use the arrow keys to move between cells'); } }); }

  /* ================= A2: a name for every icon-only button ================= */
  const named = new WeakSet();
  function names() { $$('.top-actions .btn, button:not([aria-label]), a.btn:not([aria-label]), label.btn:not([aria-label])').forEach(b => { if (b.hasAttribute('aria-label') || (named.has(b) && !b.closest('.top-actions'))) return; named.add(b); const vis = (b.textContent || '').replace(/[^\p{L}\p{N}]/gu, ''), tl = b.querySelector('.tl');
    if (vis.length >= 2 && !(tl && getComputedStyle(tl).display === 'none')) return; const name = (tl && tl.textContent.trim()) || b.title || (b.textContent || '').trim(); if (name) b.setAttribute('aria-label', name.replace(/\s+/g, ' ').slice(0, 80)); }); }

  /* ================= A3: the tab bar on phones ================= */
  const tabs = el('nav', 'u15-tabs'); tabs.setAttribute('aria-label', 'Main sections');
  tabs.innerHTML = '<button type="button" data-u15t="data"><span>📁</span>Data</button><button type="button" data-u15t="setup"><span>⚙</span>Setup</button><button type="button" data-u15t="report"><span>📄</span>Report</button><button type="button" data-u15t="more"><span>☰</span>More</button>'; document.body.appendChild(tabs);
  tabs.onclick = e => { const b = e.target.closest('[data-u15t]'); if (!b) return; const k = b.dataset.u15t;
    if (k === 'data') U.go(1); if (k === 'report') { if (!S().data) { U.toast('Open data first'); return; } U.go(12); } if (k === 'more') { const m = $('#uxMore'); if (m) m.click(); }
    if (k === 'setup') { if (!S().data) { U.toast('Open data first'); return; } const old = $('.u15-cmenu'); if (old) old.remove(); const m = el('div', 'u15-cmenu'); m.style.left = '8px'; m.style.right = '8px'; m.style.bottom = '70px';
      m.innerHTML = (U.STEPS || []).slice(1, 11).map(([l, s], i) => `<button type="button" data-u15g="${i + 2}"><b>${i + 2}</b> · ${esc(l)} <span class="legend-note">${esc(s)}</span></button>`).join(''); document.body.appendChild(m);
      m.onclick = ev => { const g = ev.target.closest('[data-u15g]'); if (!g) return; m.remove(); U.go(+g.dataset.u15g); }; e.stopPropagation(); } };
  function tabsOn() { const s = step(); tabs.querySelectorAll('button').forEach(b => b.classList.toggle('on', (b.dataset.u15t === 'data' && s === 1) || (b.dataset.u15t === 'setup' && s > 1 && s < 12) || (b.dataset.u15t === 'report' && s === 12))); }

  /* ================= A4: installable (when the page is served from a web address) ================= */
  (function install() { try { const logo = ($('.brand img, header img') || {}).src || '';
      const man = { name: 'Prof Easy Stat', short_name: 'Easy Stat', start_url: '.', display: 'standalone', background_color: '#1C1648', theme_color: '#1C1648', icons: logo ? [{ src: logo, sizes: '192x192 512x512', type: logo.startsWith('data:image/png') ? 'image/png' : 'image/jpeg', purpose: 'any' }] : [] };
      const l = el('link'); l.rel = 'manifest'; l.href = 'data:application/manifest+json,' + encodeURIComponent(JSON.stringify(man)); document.head.appendChild(l);
      [['theme-color', '#1C1648'], ['apple-mobile-web-app-capable', 'yes'], ['mobile-web-app-capable', 'yes'], ['apple-mobile-web-app-title', 'Easy Stat']].forEach(([n, c]) => { if (!document.querySelector(`meta[name="${n}"]`)) { const m = el('meta'); m.name = n; m.content = c; document.head.appendChild(m); } });
    } catch (e) { /* no manifest */ }
    let ev = null; addEventListener('beforeinstallprompt', e => { e.preventDefault(); ev = e; const b = $('#u15Install'); if (b) b.style.display = ''; });
    setTimeout(() => { const b = menuAdd('⬇ Install as an app', 'Open Easy Stat in its own window from the desktop or home screen', async () => {
      if (ev) { ev.prompt(); try { await ev.userChoice; } catch (e) { /* closed */ } ev = null; return; }
      alert(location.protocol === 'file:' ? 'This copy is opened from a file, so it already works offline. To install it as an app, open it from a web address (https) in Chrome or Edge and use this button again — or on a phone: Share › Add to Home Screen.' : 'Use the browser menu: Chrome/Edge › Install app, or on a phone: Share › Add to Home Screen.'); }, 'u15Install'); }, 500); })();

  /* ================= L1: hover glossary ================= */
  const GL = (U.GLOSSARY || []).filter(g => g[0] instanceof RegExp);
  const ranges = [];
  function glossPaint() { if (!window.CSS || !CSS.highlights || !GL.length) return; ranges.length = 0;
    const roots = ['#report', '#u15PaneB', '#p10'].map(q => $(q)).filter(Boolean);
    roots.forEach(root => { const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, { acceptNode: n => n.nodeValue.trim().length > 2 && !n.parentElement.closest('textarea, input, select, button, script, style') ? 1 : 2 });
      let n; while ((n = w.nextNode())) { const t = n.nodeValue; GL.forEach(([re, name, def]) => { const g = new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'); let m; while ((m = g.exec(t))) { if (!m[0]) { g.lastIndex++; continue; } if (m[0].length <= 4 && m[0] !== m[0].toUpperCase() && /[A-Z]{2}/.test(re.source)) continue; const r = new Range(); r.setStart(n, m.index); r.setEnd(n, m.index + m[0].length); ranges.push({ r, name, def, sec: (n.parentElement.closest('.report-sec') || {}).querySelector }); } }); } });
    try { CSS.highlights.set('u15g', new Highlight(...ranges.map(x => x.r))); } catch (e) { /* no highlight support */ }
    // the comments (text boxes) list their terms under them
    $$('#report textarea[data-comment]').forEach(ta => { const hits = GL.filter(([re]) => re.test(ta.value)); let c = ta.nextElementSibling && ta.nextElementSibling.classList.contains('u15-gchips') ? ta.nextElementSibling : null;
      if (!hits.length) { if (c) c.remove(); return; } if (!c) { c = el('div', 'u15-gchips'); ta.after(c); } c.innerHTML = '<span style="border:0;cursor:default">Terms:</span>' + hits.slice(0, 6).map(([, n, d]) => `<span title="${esc(d)}">${esc(n)}</span>`).join(''); }); }
  let tipEl = null; const hideTip = () => { if (tipEl) { tipEl.remove(); tipEl = null; } };
  document.addEventListener('mousemove', e => { if (!ranges.length || !document.caretRangeFromPoint) return; const cr = document.caretRangeFromPoint(e.clientX, e.clientY); if (!cr) { hideTip(); return; }
    const hit = ranges.find(x => x.r.startContainer === cr.startContainer && cr.startOffset >= x.r.startOffset && cr.startOffset <= x.r.endOffset); if (!hit) { hideTip(); return; }
    const sec = cr.startContainer.parentElement && cr.startContainer.parentElement.closest('.report-sec'), tt = sec && sec.querySelector('[data-ttl]');
    if (!tipEl) { tipEl = el('div', 'u15-tip'); document.body.appendChild(tipEl); } tipEl.innerHTML = `<b>${esc(hit.name)}</b><br>${esc(hit.def)}${tt ? `<br><span style="opacity:.8">Here: ${esc(tt.value || tt.textContent || '')}</span>` : ''}`;
    tipEl.style.left = Math.min(e.clientX + 14, innerWidth - 310) + 'px'; tipEl.style.top = Math.min(e.clientY + 16, innerHeight - 120) + 'px'; });

  /* ================= L2: why is this greyed out? ================= */
  let whyEl = null, whyT = null;
  function reason(x) { const st = S(), t = (x.title || '').trim(), lab = (x.closest('div, label, td') || x).textContent || '';
    if (x.closest('#stepper')) return st.data ? 'Finish the earlier steps first.' : 'Open a data file (step 1) or an example first.';
    if (!st.data) return 'Open a data file (step 1) or an example first.';
    const row = x.closest('.row, div, td'), pick = row && [...row.querySelectorAll('select, input[type=text], input[type=number]')].find(c => c !== x && !c.disabled && (c.value === '' || c.selectedIndex === -1));
    const what = t && !/^(Undo|Redo)/.test(t) ? ` <span style="opacity:.75">— ${esc(t)}</span>` : '';
    if (pick) return 'Choose or type something in the field beside it first.' + what;
    if (/3\+ groups|three or more|3 or more/i.test(lab)) return 'Needs 3 or more groups (step 2).';
    if (/timepoint|repeated|paired|over time/i.test(lab)) return 'Needs a repeated measure (timepoints in step 3).';
    if (/survival|time to event|event/i.test(lab)) return 'Needs a time-to-event outcome (Advanced, step 8).';
    if (/Undo/i.test(x.id + t)) return 'Nothing to undo yet.'; if (/Redo/i.test(x.id + t)) return 'Nothing to redo.';
    if (!st.result) return 'Run the report first (step 12).';
    return (what ? 'Not available yet with the current choices.' + what : 'Not available with the current settings — another option turns it on.'); }
  document.addEventListener('pointermove', e => { clearTimeout(whyT); const x = document.elementFromPoint(e.clientX, e.clientY), d = x && x.closest && x.closest('button:disabled, input:disabled, select:disabled, .step.disabled');
    if (!d) { if (whyEl) { whyEl.remove(); whyEl = null; } return; }
    whyT = setTimeout(() => { if (!whyEl) { whyEl = el('div', 'u15-why'); document.body.appendChild(whyEl); } whyEl.innerHTML = `<b>Why is this greyed out?</b><br>${reason(d)}`; whyEl.style.left = Math.min(e.clientX + 12, innerWidth - 290) + 'px'; whyEl.style.top = Math.min(e.clientY + 14, innerHeight - 80) + 'px'; }, 350); });

  /* ================= L3: first-time tips ================= */
  const HINTS = [['select', '#scBadge', 'New: <b>🔎 Select Cases</b> — analyse only some patients (age ≥ 40, a random sample, a date range…).'], ['split', '#sfBadge', 'New: <b>🧩 Split File</b> — repeat the tables by sex or any other variable, side by side.'],
    ['live', '#u15LiveBtn', '<b>📄 Live report</b> — see the report beside the options while you change them.'], ['bulk', '#varsTbl [data-vsel]', 'Tick several variables to change their table, test, chart or decimals together.'],
    ['rclick', '#report .report-sec', 'Tip: <b>right-click</b> a table or a figure for its tools.'], ['crumb', '.ux-crumb', 'Click the step name at the top for a list of the sections of this step.'], ['star', '.u15-fav', 'Star (☆) the options you use often — they appear in <b>My options</b> at the top of every step.'], ['tpl', '[data-ffbtn="tplSave"]', 'Save a figure’s look as a <b>template</b> and apply it to the others.']];
  let lastHint = Date.now() - 37000, hintOpen = false;
  function hints() { if (hintOpen || LS.get('hintsOff', false) || Date.now() - lastHint < 45000 || $('.ux2-panel.open') || $('#busy.show')) return; const seen = LS.get('hintsSeen', []);
    for (const [k, q, txt] of HINTS) { if (seen.includes(k)) continue; const t = [...document.querySelectorAll(q)].find(x => x.offsetParent && (r => r.top > 0 && r.bottom < innerHeight && r.width)(x.getBoundingClientRect())); if (!t) continue;
      const r = t.getBoundingClientRect(), h = el('div', 'u15-hint', `${txt}<div class="row"><button class="btn primary small" type="button" data-u15k="ok">Got it</button><button class="btn ghost small" type="button" data-u15k="off">No more tips</button></div>`); h.setAttribute('role', 'dialog');
      document.body.appendChild(h); const hr = h.getBoundingClientRect(); h.style.left = Math.max(8, Math.min(r.left, innerWidth - hr.width - 8)) + 'px'; h.style.top = (r.bottom + 8 + hr.height < innerHeight ? r.bottom + 8 : Math.max(8, r.top - hr.height - 8)) + 'px';
      hintOpen = true; lastHint = Date.now(); seen.push(k); LS.set('hintsSeen', seen);
      h.onclick = e => { const b = e.target.closest('[data-u15k]'); if (!b) return; if (b.dataset.u15k === 'off') LS.set('hintsOff', true); h.remove(); hintOpen = false; lastHint = Date.now(); }; setTimeout(() => { if (h.isConnected) { h.remove(); hintOpen = false; } }, 20000); break; } }

  /* ================= L4: the sandbox ================= */
  let SBX = null; const realSet = Storage.prototype.setItem;
  Storage.prototype.setItem = function (k, v) { if (SBX && this === window.localStorage && /autosave|easystat\.(proj|last)/i.test(k)) return; return realSet.call(this, k, v); };
  function sandbox() { if (SBX) return; if (!S().data) { U.toast('Open your data or an example first'); return; }
    let res = null; try { res = structuredClone(S().result); } catch (e) { res = null; }
    SBX = { data: JSON.parse(JSON.stringify(S().data)), cfg: JSON.parse(JSON.stringify(S().cfg)), result: res, step: step() };
    const b = el('div', 'u15-sbx', '🧪 <b>Sandbox</b> — try anything: nothing is kept or saved. <button class="btn ghost small" type="button" data-u15x="keep">Keep these changes</button><button class="btn primary small" type="button" data-u15x="leave">Leave and restore</button>'); b.id = 'u15Sbx';
    const h = $('header.top'); h ? h.after(b) : document.body.prepend(b); U.toast('Sandbox on — your project is safe');
    b.onclick = e => { const x = e.target.closest('[data-u15x]'); if (!x) return; if (x.dataset.u15x === 'keep') { if (!confirm('Keep the changes made in the sandbox as your project?')) return; SBX = null; b.remove(); U.toast('Changes kept'); return; }
      const st = S(); st.data = SBX.data; st.cfg = SBX.cfg; st.result = SBX.result; const s0 = SBX.step; SBX = null; b.remove();
      ['renderGrid', 'renderVariables', 'renderOptions', 'renderAdvanced', 'renderStepper'].forEach(f => { try { U[f] && U[f](); } catch (er) { /* not drawn */ } }); try { if (st.result) U.renderReport(); } catch (er) { /* no report */ } U.go(s0); U.toast('Sandbox closed — your project is as it was'); }; }

  /* ================= D1: the interface colour ================= */
  const ACC = { purple: null, teal: ['#0F766E', '#0B5A54', '#0F2E2C', '#7FD1C7', '#E7F6F4', '#CDEDE8'], blue: ['#1D4ED8', '#1E3A8A', '#0F1E46', '#93B4F5', '#EAF0FD', '#D3DFFA'], green: ['#2F7D32', '#1F5A22', '#13301A', '#9BD49E', '#EDF7EE', '#D6EDD7'], crimson: ['#B4235A', '#86163F', '#3A0F21', '#F2A3C0', '#FCEEF3', '#F6D6E2'], graphite: ['#3F4A5A', '#2B333F', '#151A21', '#B6C0CC', '#F1F3F5', '#DEE2E7'] };
  function accent(k) { let s = $('#u15Acc'); if (!s) { s = el('style'); s.id = 'u15Acc'; document.head.appendChild(s); } const a = ACC[k]; LS.set('accent', k);
    s.textContent = a ? `:root{--purple:${a[0]};--purple-d:${a[1]};--navy:${a[2]};--accent:${a[3]}}:root:not([data-theme="dark"]){--lav:${a[4]};--lav2:${a[5]}}` : ''; }
  accent(LS.get('accent', 'purple'));
  function accentPanel() { const cur = LS.get('accent', 'purple'), col = { purple: '#7B2FBE', teal: '#0F766E', blue: '#1D4ED8', green: '#2F7D32', crimson: '#B4235A', graphite: '#3F4A5A' };
    const p = panel('u15AccP', '🎨 Interface colour', `<p class="legend-note" style="margin:0 0 8px">The colour of the app only — the report keeps its own colours (step 11).</p><div class="row" style="gap:10px;flex-wrap:wrap">${Object.keys(col).map(k => `<button type="button" class="u15-sw ${k === cur ? 'on' : ''}" data-u15a="${k}" style="background:${col[k]}" title="${k}" aria-label="${k}"></button>`).join('')}</div>`);
    if (p) p.onclick = e => { const b = e.target.closest('[data-u15a]'); if (!b) return; accent(b.dataset.u15a); p.querySelectorAll('.u15-sw').forEach(x => x.classList.toggle('on', x === b)); }; }

  /* ================= D3: arrange the header ================= */
  const keyOf = n => n.id || ((n.querySelector && n.querySelector('[id]')) || {}).id || '';
  const nameOfBtn = n => (n.title || n.getAttribute('aria-label') || n.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 50);
  function headerItems() { const top = $('.top-actions'), menu = $('.ux-menu'); if (!top || !menu) return []; return [...top.children].filter(n => !n.classList.contains('ux-more') && keyOf(n) && n.id !== 'uxSaved'); }
  function applyHeader() { const H = LS.get('header', null), top = $('.top-actions'), menu = $('.ux-menu'), more = $('.ux-more'); if (!H || !top || !menu || !more) return;
    H.order.forEach(k => { const n = document.getElementById(k), box = n && (n.closest('.top-actions > *, .ux-menu > *') || n); if (!box) return; if (H.hidden.includes(k)) { box.classList.remove('light'); menu.appendChild(box); } else { top.insertBefore(box, more); } }); }
  function headerPanel() { const top = $('.top-actions'), menu = $('.ux-menu'); if (!top) return; const H = LS.get('header', null) || { order: headerItems().map(keyOf), hidden: [] };
    const all = [...H.order, ...headerItems().map(keyOf).filter(k => !H.order.includes(k))].filter(k => document.getElementById(k));
    const p = panel('u15HdrP', '🧩 Arrange the header', `<p class="legend-note" style="margin:0 0 6px">Drag to change the order; untick to move a button into ☰ More.</p><ol class="u15-hdr">${all.map(k => { const n = document.getElementById(k), box = n.closest('.top-actions > *, .ux-menu > *') || n; return `<li draggable="true" data-u15o="${esc(k)}"><span style="cursor:grab">⠿</span><label class="check" style="margin:0;flex:1"><input type="checkbox" ${H.hidden.includes(k) ? '' : 'checked'}><span>${esc(nameOfBtn(box))}</span></label><button class="btn ghost small" type="button" data-u15m="-1" aria-label="Move up">▲</button><button class="btn ghost small" type="button" data-u15m="1" aria-label="Move down">▼</button></li>`; }).join('')}</ol><div class="row" style="gap:6px;justify-content:flex-end"><button class="btn ghost small" type="button" data-u15hr="reset">↺ As it was</button></div>`);
    if (!p) return; const ol = p.querySelector('ol'), save = () => { LS.set('header', { order: [...ol.children].map(li => li.dataset.u15o), hidden: [...ol.children].filter(li => !li.querySelector('input').checked).map(li => li.dataset.u15o) }); applyHeader(); };
    let drag = null; ol.addEventListener('dragstart', e => { drag = e.target.closest('li'); drag.classList.add('drag'); }); ol.addEventListener('dragend', () => { if (drag) drag.classList.remove('drag'); drag = null; save(); });
    ol.addEventListener('dragover', e => { e.preventDefault(); const o = e.target.closest('li'); if (!o || !drag || o === drag) return; const r = o.getBoundingClientRect(); o[e.clientY > r.top + r.height / 2 ? 'after' : 'before'](drag); });
    ol.addEventListener('change', save); ol.addEventListener('click', e => { const b = e.target.closest('[data-u15m]'); if (!b) return; const li = b.closest('li'); if (b.dataset.u15m === '-1' && li.previousElementSibling) li.previousElementSibling.before(li); if (b.dataset.u15m === '1' && li.nextElementSibling) li.nextElementSibling.after(li); save(); });
    p.querySelector('[data-u15hr]').onclick = () => { localStorage.removeItem('u15.header'); U.toast('Reload the page to put the header back as it was'); }; }
  setTimeout(applyHeader, 300);

  /* ================= the menu, and what runs on each step ================= */
  setTimeout(() => { menuAdd('🕘 Recent actions', 'What you changed in this session — click one to go back there', recent); menuAdd('🧪 Try without risk (sandbox)', 'Try options on a copy: leave the sandbox and everything is as before', sandbox);
    menuAdd('🎨 Interface colour', 'The colour of the app (not of the report)', accentPanel); menuAdd('🧩 Arrange the header', 'Choose the buttons of the header and their order', headerPanel);
    menuAdd('📄 Live report beside the options', 'The report on the right, updated as you change options', () => liveToggle(true)); menuAdd('💡 Show the tips again', 'The first-time tips', () => { LS.set('hintsSeen', []); LS.set('hintsOff', false); lastHint = 0; U.toast('Tips back on'); }); }, 600);
  let lastStep = 0, tick = 0, starStep = 0;
  setInterval(() => { const s = step();
    if (s !== lastStep) { const prev = lastStep; lastStep = s; if (S().data && prev) { const m = LS.get('scroll.' + proj(), {}); if (m[s] > 0) setTimeout(() => scrollTo(0, m[s]), 120); } myOptions(true); }
    rings(); cards(); bulk(); banner(); if (tick++ % 5 === 0 || s !== starStep) { starStep = s; stars(); } myOptions(false); liveBtn(); tabsOn(); kbdTables(); if (tick % 3 === 0) names(); hints();
    if (s === 12 && !glossPaint.done && $('#report .report-sec')) { glossPaint(); glossPaint.done = true; } }, 900);
  new MutationObserver(() => { glossPaint.done = false; }).observe(document.getElementById('report') || document.body, { childList: true });
  window.EasyUX15 = { liveToggle, sandbox, recent, accent, headerPanel, glossPaint };
})();

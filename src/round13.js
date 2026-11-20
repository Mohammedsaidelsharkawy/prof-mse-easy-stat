/* Prof MSE Easy Stat — round 13: a right-click menu on the tables and figures of the report (E3),
   and auto-save of the project to a folder on the computer (E5). */
(() => {
  const U = window.EasyUI; if (!U) return;
  const $ = s => document.querySelector(s), esc = U.esc || (s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])));
  const css = document.createElement('style');
  css.textContent = `.r13-menu{position:fixed;z-index:9999;min-width:220px;max-width:min(320px,92vw);max-height:70vh;overflow:auto;background:var(--card,#fff);color:var(--ink,#1c1648);border:1px solid var(--line,#ddd);border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.18);padding:4px;font-size:13px}
.r13-menu button{display:block;width:100%;text-align:left;border:0;background:none;color:inherit;padding:7px 10px;border-radius:7px;cursor:pointer;font:inherit}.r13-menu button:hover,.r13-menu button:focus{background:var(--soft,#f3effa);outline:none}
.r13-menu .r13-h{padding:5px 10px 3px;font-size:11px;color:var(--muted,#777);text-transform:uppercase;letter-spacing:.04em}.r13-menu hr{border:0;border-top:1px solid var(--line,#eee);margin:3px 0}`;
  document.head.appendChild(css);

  /* ---------- E3: right-click on a table or a figure of the report: its own tools in a menu ---------- */
  let menu = null; const close = () => { if (menu) { menu.remove(); menu = null; } };
  const labelOf = b => { const t = (b.textContent || '').replace(/\s+/g, ' ').trim(), ti = (b.getAttribute('title') || '').trim(); return t.length >= 3 && !/^[^\w]{1,3}$/.test(t) ? t : ti || t; };
  const usable = b => b.offsetParent !== null && !b.disabled && labelOf(b);
  document.addEventListener('contextmenu', e => {
    if (e.shiftKey) return; // Shift + right-click: the browser's own menu
    const sec = e.target.closest('.report-sec'); if (!sec || e.target.closest('input, textarea, [contenteditable="true"]')) return;
    const onFig = e.target.closest('.figs, canvas, img, svg'), figBox = onFig && (e.target.closest('.figs > *') || onFig);
    const own = figBox ? [...figBox.querySelectorAll('button, a.btn, label.btn')].filter(usable) : [];
    const secBtns = [...sec.querySelectorAll('button, a.btn')].filter(b => usable(b) && !own.includes(b) && !(b.closest('.figs') && !figBox));
    const items = [...own.map(b => ({ b, g: 'This figure' })), ...secBtns.slice(0, 18).map(b => ({ b, g: 'This table' }))];
    e.preventDefault(); close(); menu = document.createElement('div'); menu.className = 'r13-menu'; menu.setAttribute('role', 'menu');
    const seen = {}; items.forEach(x => { x.l = labelOf(x.b); seen[x.l] = (seen[x.l] || 0) + 1; }); items.forEach(x => { const ti = (x.b.getAttribute('title') || '').trim(); if (seen[x.l] > 1 && ti && ti !== x.l) x.l = `${x.l} — ${ti.length > 60 ? ti.slice(0, 57) + '…' : ti}`; });
    let html = '', g0 = '';
    items.forEach((x, i) => { if (x.g !== g0) { html += `${g0 ? '<hr>' : ''}<div class="r13-h">${x.g}</div>`; g0 = x.g; } html += `<button type="button" role="menuitem" data-r13="${i}">${esc(x.l)}</button>`; });
    const sel = String(window.getSelection() || '').trim();
    html += `<hr>${sel ? '<button type="button" data-r13="copysel">⧉ Copy the selected text</button>' : ''}${onFig && e.target.tagName === 'CANVAS' ? '<button type="button" data-r13="png">⬇ Save this figure as PNG</button>' : ''}<button type="button" data-r13="top">↑ Go to the top of this section</button><div class="r13-h" style="text-transform:none">Shift + right-click: the browser's menu</div>`;
    menu.innerHTML = html; document.body.appendChild(menu); opened = Date.now();
    const r = menu.getBoundingClientRect(); menu.style.left = Math.max(4, Math.min(e.clientX, innerWidth - r.width - 6)) + 'px'; menu.style.top = Math.max(4, Math.min(e.clientY, innerHeight - r.height - 6)) + 'px';
    menu.onclick = ev => { const b = ev.target.closest('[data-r13]'); if (!b) return; const k = b.dataset.r13; close();
      if (k === 'copysel') { navigator.clipboard && navigator.clipboard.writeText(sel).then(() => U.toast('Copied'), () => U.toast('Copy blocked by the browser')); return; }
      if (k === 'png') { const a = document.createElement('a'); a.download = `${(U.baseName && U.baseName()) || 'figure'} - figure.png`; a.href = e.target.toDataURL('image/png'); a.click(); return; }
      if (k === 'top') { sec.scrollIntoView({ behavior: 'smooth', block: 'start' }); return; }
      const it = items[+k]; if (it) it.b.click(); };
    const f = menu.querySelector('button'); if (f) f.focus();
  });
  document.addEventListener('click', e => { if (menu && !menu.contains(e.target)) close(); }, true);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
  let opened = 0; addEventListener('scroll', () => { if (Date.now() - opened > 400) close(); }, true); addEventListener('resize', close);

  /* ---------- E5: auto-save the project to a folder (Chrome and Edge: the File System Access API) ---------- */
  let dir = null, timer = null, last = '', mins = 5;
  const nameOf = () => { const b = (U.baseName && U.baseName()) || 'Project'; return `${b} - project (autosave).easystat.json`.replace(/[\\/:*?"<>|]+/g, '-'); };
  async function writeNow(quiet) { if (!dir || !U.state.data) return; try {
      const json = JSON.stringify(U.projectObj()); if (json === last && quiet) return;
      const fh = await dir.getFileHandle(nameOf(), { create: true }), w = await fh.createWritable(); await w.write(json); await w.close(); last = json;
      const t = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); setBtn(`📁 Auto-saved ${t}`); if (!quiet) U.toast(`Saved to the folder “${dir.name}” as ${nameOf()}`);
    } catch (err) { console.error(err); setBtn('📁 Auto-save stopped'); stop(); U.toast('Auto-save to the folder failed (permission?) — turn it on again'); } }
  function stop() { clearInterval(timer); timer = null; }
  function setBtn(t) { const b = $('#r13Auto'); if (b) { b.textContent = t; b.classList.toggle('primary', !!timer); } const m = $('#uxMore'); if (m) m.classList.toggle('r13-on', !!timer); }
  async function choose() {
    if (dir && timer) { if (confirm(`Auto-saving every ${mins} minutes to the folder “${dir.name}”.\n\nOK: stop auto-saving. Cancel: keep it on.`)) { stop(); dir = null; setBtn('📁 Auto-save to a folder'); U.toast('Auto-save to the folder stopped'); } return; }
    if (!window.showDirectoryPicker) { alert('This browser cannot write to a folder. Use Chrome or Edge on a computer — or 💾 Save project (Ctrl+S), which also keeps versions in the browser (☰ More → Versions).'); return; }
    try { dir = await window.showDirectoryPicker({ mode: 'readwrite', id: 'easystat-autosave' }); } catch (e) { return; }
    const m = prompt('Save the project to this folder every how many minutes?', String(mins)); if (m === null) { dir = null; return; } mins = Math.max(1, Math.min(60, Math.round(+m) || 5));
    stop(); timer = setInterval(() => writeNow(true), mins * 60000); setBtn('📁 Auto-save on'); await writeNow(false);
  }
  (function mount() { const sv = $('#btnSaveProj'); if (!sv) return; const b = document.createElement('button'); b.className = 'btn light small'; b.id = 'r13Auto'; b.type = 'button';
    b.title = 'Save the project into a folder on this computer every few minutes (Chrome / Edge). Click again to stop.'; b.textContent = '📁 Auto-save to a folder'; b.onclick = choose; const menu = document.querySelector('.ux-menu'); if (menu) { b.className = 'btn ghost small'; menu.appendChild(b); } else sv.after(b); })();
  addEventListener('beforeunload', () => { if (dir && timer) writeNow(true); });
  window.EasyR13 = { autosaveNow: () => writeNow(false) };
})();

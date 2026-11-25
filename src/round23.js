/* Prof Easy Stat — round 23: ↶ Undo / ↷ Redo in the Analyse steps (1–12): every change of the settings (groups, variables, tests, tables,
   comments, figures, advanced analyses, report…) and every edit of the data, in one history (up to 80 steps; Ctrl+Z / Ctrl+Y). */
(function () {
  'use strict';
  const U = window.EasyUI; if (!U) return;
  const S = () => U.state, H = document.documentElement, $ = s => document.querySelector(s);
  let hist = [], fut = [], prev = null, owner = null, dataLen = 0, t = 0, restoring = false, quietUntil = 0;
  const analyse = () => !H.classList.contains('ph-build') && !H.classList.contains('ph-generate');
  // a new data file or project: a new history
  function same() { const st = S(); if (!st.cfg) return false; if (owner !== st.cfg && !(owner && owner.__r23 && owner.__r23 === st.cfg.__r23)) { owner = st.cfg; Object.defineProperty(st.cfg, '__r23', { value: Math.random(), enumerable: false, configurable: true }); hist = []; fut = []; prev = JSON.stringify(st.cfg); dataLen = (st.undo || []).length; state(); return false; } return true; }
  function snap(readUi = true) { if (restoring || !analyse()) return; const st = S(); if (!same()) return;
    // an edit of the data (its own undo list grew): one step of the history
    const dl = (st.undo || []).length; if (dl > dataLen) { for (let i = dataLen; i < dl; i++) hist.push({ data: true }); fut = []; dataLen = dl; prev = JSON.stringify(st.cfg); if (hist.length > 80) hist.splice(0, hist.length - 80); state(); return; } dataLen = dl; // an edit of the data also holds its settings
    if (readUi) try { U.readUiIntoCfg(); } catch (e) { /* the screen is being drawn */ }
    const j = JSON.stringify(st.cfg); if (j !== prev) { if (Date.now() < quietUntil) prev = j; else { hist.push({ cfg: prev }); fut = []; prev = j; } } // just after an undo, the screen settling is not a change
    if (hist.length > 80) hist.splice(0, hist.length - 80); state(); }
  const later = () => { clearTimeout(t); t = setTimeout(snap, 350); };
  document.addEventListener('change', e => { if (e.target.closest && e.target.closest('main section.panel, #report, .ux2-panel')) later(); }, true);
  document.addEventListener('click', e => { if (e.target.closest && e.target.closest('main section.panel button, main section.panel .chip')) later(); }, true);
  setInterval(() => { if (analyse() && S().cfg && !document.querySelector('main section.panel :focus')) snap(false); }, 1500);
  // the settings put back: the step drawn again from them (no screen value read over them)
  function restoreCfg(j) { const st = S(); restoring = true;
    try { const cfg = JSON.parse(j); Object.defineProperty(cfg, '__r23', { value: st.cfg.__r23, enumerable: false, configurable: true }); st.cfg = cfg; owner = cfg; prev = j;
      $('#studyTitle').value = cfg.study.title || ''; $('#software').value = cfg.study.software || $('#software').value; if ($('#projName')) $('#projName').value = cfg.study.project || ''; if ($('#studyType')) $('#studyType').value = cfg.study.type || '';
      const step = st.step || 2, y = scrollY; document.querySelectorAll('.panel').forEach(p => p.classList.remove('active')); U.go(step); scrollTo(0, y);
      try { U.readUiIntoCfg(); } catch (e) { /* drawn later */ } prev = JSON.stringify(st.cfg); } // the screen as drawn is the new reference
    finally { restoring = false; } }
  function move(back) { if (!analyse()) return false; snap(); const from = back ? hist : fut, to = back ? fut : hist; if (!from.length) { U.toast(back ? 'Nothing to undo' : 'Nothing to redo'); return false; }
    const it = from.pop(), st = S();
    if (it.data) { if (U.undoRedo && U.undoRedo(!back)) { const id0 = owner && owner.__r23; owner = st.cfg; if (st.cfg && !st.cfg.__r23) Object.defineProperty(st.cfg, '__r23', { value: id0, enumerable: false, configurable: true }); to.push({ data: true }); dataLen = (st.undo || []).length; prev = JSON.stringify(st.cfg); const y = scrollY; try { U.renderGrid(); } catch (e) { /* not on screen */ } document.querySelectorAll('.panel').forEach(p => p.classList.remove('active')); restoring = true; try { U.go(st.step); try { U.readUiIntoCfg(); } catch (e) { /* drawn later */ } prev = JSON.stringify(st.cfg); } finally { restoring = false; } scrollTo(0, y); } }
    else { to.push({ cfg: JSON.stringify(st.cfg) }); restoreCfg(it.cfg); }
    quietUntil = Date.now() + 1500; state(); U.toast(back ? '↶ Undone' : '↷ Redone'); return true; }
  function state() { const u = $('#r21Undo'); if (!u || !analyse()) return; u.style.display = S().cfg ? '' : 'none'; const [bu, br] = u.querySelectorAll('button'); bu.disabled = !hist.length; br.disabled = !fut.length; }
  // the buttons of the top bar act on Analyse when it is on screen
  document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-r21ur]'); if (!b || !analyse()) return; e.stopImmediatePropagation(); move(b.dataset.r21ur === 'undo'); }, true);
  setInterval(state, 800);
  window.EasyR23 = { undo: back => move(back !== false), get canUndo() { return hist.length > 0; }, get canRedo() { return fut.length > 0; }, snap };
})();

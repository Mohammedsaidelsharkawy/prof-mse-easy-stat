/* Prof Easy Stat — round 24: the type of the study shared by 📊 Analyse and 🧱 Build; the page not saved or shown as source by the usual shortcuts. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), U = () => window.EasyUI, B = () => window.EasyBuilder;
  // Build's designs ↔ Analyse's types of study
  const B2A = { rct: 'rct', cohort: 'pcohort', casecontrol: 'casecontrol', cross: 'cross', diagnostic: 'diagnostic', beforeafter: 'prepost' };
  const A2B = { rct: 'rct', nrct: 'rct', pcohort: 'cohort', rcohort: 'cohort', casecontrol: 'casecontrol', cross: 'cross', diagnostic: 'diagnostic', prepost: 'beforeafter' };
  let busy = false;
  function toAnalyse(design) { const t = B2A[design], s = $('#studyType'); if (!t || !s || busy) return; busy = true; try { if (s.value !== t && !(A2B[s.value] === design)) { s.value = t; s.dispatchEvent(new Event('change', { bubbles: true })); }
    const st = U() && U().state; if (st && st.cfg && st.cfg.study && A2B[st.cfg.study.type] !== design) st.cfg.study.type = t; } finally { busy = false; } }
  function toBuild(type) { const d = A2B[type], b = B(); if (!d || !b || busy) return; const D = b.design; if (!D || D.design === d) return; busy = true; try { D.design = d; b.save(); } finally { busy = false; } }
  const onPick = e => { const t = e.target; if (!t) return; if (t.id === 'studyType') toBuild(t.value); else if (t.dataset && t.dataset.mb === 'design') toAnalyse(t.value); };
  document.addEventListener('input', onPick, true); document.addEventListener('change', onPick, true); // (the builder redraws on input: read it first)
  // (data made from a master sheet of the builder bring its design into Analyse: see applyBuilderSetup)
  window.EasyR24 = { toAnalyse, toBuild, B2A, A2B };

  // the page itself not saved or opened as source by the keyboard (Ctrl+S saves the project instead) nor by the right-click menu (kept in boxes for copy / paste)
  document.addEventListener('keydown', e => { const k = (e.key || '').toLowerCase(), mod = e.ctrlKey || e.metaKey;
    if ((mod && (k === 'u' || (k === 's' && e.shiftKey))) || (mod && e.shiftKey && ['i', 'j', 'c'].includes(k)) || e.key === 'F12' || (e.metaKey && e.altKey && ['i', 'j', 'u'].includes(k))) { e.preventDefault(); e.stopPropagation(); }
    if (mod && k === 's' && !e.shiftKey) e.preventDefault(); // Ctrl+S: the project (step 1 handler), never the page
  }, true);
  document.addEventListener('contextmenu', e => { const t = e.target; if (t && t.closest && t.closest('input, textarea, select, [contenteditable="true"]')) return; e.preventDefault(); }, true);
})();

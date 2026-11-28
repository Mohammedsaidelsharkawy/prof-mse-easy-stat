/* Prof Easy Stat — round 22: dialog boxes and side panels close when you click outside them. */
(function () {
  'use strict';
  // a <dialog> shown as a modal: a press that starts and ends on its backdrop (outside its box) closes it
  let downOn = null;
  const outside = (d, e) => { const r = d.getBoundingClientRect(); return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom; };
  document.addEventListener('pointerdown', e => {
    const d = e.target && e.target.tagName === 'DIALOG' && e.target.open ? e.target : null; downOn = d && outside(d, e) ? d : null;
    // the floating panels (⚡ Make my report, tools, settings…): a press outside every open panel closes them
    // (not a press on a button: a button may open or toggle a panel itself)
    if (!e.target.closest || e.target.closest('.ux2-panel, .ux-pop, dialog, .toast, #toast, button, [role="button"], label.btn, a, summary, select')) return;
    document.querySelectorAll('.ux2-panel.open, .ux-pop.open').forEach(p => { if (p.dataset.r22keep) return; p.classList.remove('open'); });
  }, true);
  document.addEventListener('click', e => { const d = downOn; downOn = null; if (d && e.target === d && outside(d, e)) { if (d.dataset.r22keep) return; d.close('outside'); } }, true);
})();

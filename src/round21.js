/* Prof Easy Stat — round 21: every option shown in all stages (Build, Generate, Analyse), with a switch;
   ▸ Collapse all / ▾ Expand all and the switch at the right end of the phase bar. */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), H = document.documentElement;
  const LS = { get(k, d) { try { const v = localStorage.getItem('r21.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('r21.' + k, JSON.stringify(v)); } catch (e) { /* none */ } } };
  const css = document.createElement('style');
  css.textContent = `#phaseBar{position:relative;max-width:none}
#r21Right{position:absolute;right:8px;top:50%;transform:translateY(-50%);display:flex;align-items:center;gap:6px}
#r21Right #u15GBar.u15-inphase{margin:0}
#r21Right .r21-sw{font-size:12px;display:inline-flex;align-items:center;gap:4px;white-space:nowrap;color:var(--muted);cursor:pointer}
@media (max-width:1180px){#r21Right{position:static;transform:none;margin-left:auto}}
html.r21-all .ux2-tabs{display:none}html.r21-all .ux2-pane{display:flex!important;padding-top:4px}
html.r21-all .ux2-pane::before{content:attr(data-r21lab);flex-basis:100%;font-weight:700;font-size:13px;color:var(--title,#3B2A8C);margin-top:6px}`;
  document.head.append(css);
  const on = () => H.classList.contains('r21-all');
  // a details section the user closes stays closed until the page is drawn again
  document.addEventListener('toggle', e => { const d = e.target; if (d.tagName === 'DETAILS' && !d.open && on()) d.dataset.r21 = 'shut'; }, true);
  function openAll() { if (!on()) return;
    document.querySelectorAll('#mbWrap details:not([open]):not([data-r21]), #genWrap details:not([open]):not([data-r21]), main section.panel details:not([open]):not([data-r21])').forEach(d => { if (d.closest('#report')) return; d.dataset.r21 = 'auto'; d.open = true; });
    document.querySelectorAll('.ux2-pane:not([data-r21lab])').forEach(p => { const b = document.querySelector(`[data-ux2tab="${p.dataset.ux2pane}"]`); p.dataset.r21lab = b ? b.textContent.trim() : ''; });
    if (H.classList.contains('e-simple')) { H.classList.remove('e-simple'); try { localStorage.setItem('ez.simple', 'false'); } catch (e) { /* none */ } document.querySelectorAll('[data-ezsimple],[data-ezv2="simple"]').forEach(x => { x.checked = false; }); } }
  function set(v) { H.classList.toggle('r21-all', v); LS.set('all', v); const sw = $('#r21All'); if (sw) sw.checked = v;
    if (!v) document.querySelectorAll('details[data-r21="auto"]').forEach(d => { d.open = false; delete d.dataset.r21; });
    openAll(); if (window.EasyGen && H.classList.contains('ph-generate')) { const y = scrollY; window.EasyGen.render(); scrollTo(0, y); } }
  function place() { const pb = $('#phaseBar'); if (!pb) return; let r = $('#r21Right');
    if (!r) { r = document.createElement('div'); r.id = 'r21Right'; r.innerHTML = `<label class="r21-sw" title="Show every option of every step, with no folded sections (untick for a shorter page)"><input type="checkbox" id="r21All" ${on() ? 'checked' : ''}> Show all options</label>`; pb.append(r); r.querySelector('#r21All').onchange = e => set(e.target.checked); }
    const g = $('#u15GBar'); if (g && g.parentElement !== r) r.append(g); }
  H.classList.toggle('r21-all', LS.get('all', true));
  setInterval(() => { place(); openAll(); }, 700); place(); openAll();
  window.EasyR21 = { set, openAll, get on() { return on(); } };
})();

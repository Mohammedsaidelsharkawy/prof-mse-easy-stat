/* Prof MSE Easy Stat — round 10 tools in ☰ More: an interactive ROC cut-off explorer (R10) and the sample size of a
   diagnostic accuracy study (R11). */
(() => {
  const U = window.EasyUI, X = window.EasyUX2; if (!U || !X || !X.panel) return;
  const esc = U.esc, S = () => U.state, $ = s => document.querySelector(s), pct = v => isFinite(v) ? `${(100 * v).toFixed(1)}%` : '—';

  /* ---------- R10: move the cut-off and see every measure ---------- */
  function explorer() { const st = S(); if (!st.data || !st.cfg) { U.toast('Open your data first'); return; }
    const rocs = (st.cfg.advanced || []).filter(a => a.type === 'roc' && a.outcome && a.positive && (a.predictors || []).length); if (!rocs.length) { U.toast('Add a ROC analysis (step 8) first'); return; }
    const opts = rocs.flatMap((a, ai) => a.predictors.map(c => [`${ai}|${c}`, `${Analysis.columnLabel(st.cfg, c)} → ${Analysis.columnLabel(st.cfg, a.outcome)} = ${a.positive}`]));
    const p = X.panel('rocExplorer', '🎚 ROC cut-off explorer', `<label class="f">Test</label><select id="rxT">${opts.map(([k, l]) => `<option value="${esc(k)}">${esc(l)}</option>`).join('')}</select><div id="rxBody" style="margin-top:8px"></div>`);
    const draw = () => { const [ai, col] = $('#rxT').value.split('|'), a = rocs[+ai], rows = Analysis.filterRows(st.cfg, st.data.rows).filter(r => Analysis.toCat(r[a.outcome]) !== null && isFinite(Analysis.toNum(r[col]))), v = rows.map(r => Analysis.toNum(r[col])), pos = rows.map(r => Analysis.toCat(r[a.outcome]) === a.positive);
      if (pos.filter(Boolean).length < 2 || pos.filter(x => !x).length < 2) { $('#rxBody').textContent = 'Too few patients with and without the outcome.'; return; }
      const r0 = Stats.roc(v, pos, 'youden', { direction: a.direction === 'lower' || a.direction === 'higher' ? a.direction : 'auto' }), hi = r0.higher, u = [...new Set(v)].sort((x, y) => x - y), start = Math.max(0, u.findIndex(x => x >= r0.cutoff.cut));
      $('#rxBody').innerHTML = `<p class="legend-note">AUC ${r0.auc.toFixed(3)}; positive when ${hi ? '≥' : '≤'} the cut-off. The Youden cut-off is marked ★.</p><input type="range" id="rxS" min="0" max="${u.length - 1}" value="${start}" style="width:100%"><div id="rxOut"></div>`;
      const show = () => { const c = u[+$('#rxS').value], m = RocReg.at(v, pos, c, hi), you = Math.abs(c - u[start]) < 1e-12;
        $('#rxOut').innerHTML = `<h3 style="margin:8px 0">Cut-off ${hi ? '≥' : '≤'} ${c}${you ? ' ★' : ''}</h3><table class="t"><thead><tr><th></th><th>With</th><th>Without</th></tr></thead><tbody><tr><td>Test positive</td><td>${m.tp}</td><td>${m.fp}</td></tr><tr><td>Test negative</td><td>${m.fn}</td><td>${m.tn}</td></tr></tbody></table>
          <table class="t" style="margin-top:6px"><tbody>${[['Sensitivity', pct(m.sens)], ['Specificity', pct(m.spec)], ['PPV', pct(m.ppv)], ['NPV', pct(m.npv)], ['Accuracy', pct((m.tp + m.tn) / v.length)], ['LR+', isFinite(m.lrP) ? m.lrP.toFixed(2) : '∞'], ['LR−', isFinite(m.lrN) ? m.lrN.toFixed(2) : '∞'], ['Youden index', (m.sens + m.spec - 1).toFixed(3)]].map(([k, x]) => `<tr><td>${k}</td><td><b>${x}</b></td></tr>`).join('')}</tbody></table>
          <button class="btn primary small" type="button" id="rxUse" style="margin-top:8px">Use this cut-off in the report</button>`;
        $('#rxUse').onclick = () => { a.cutoff = 'manual'; a.manualCut = String(c); a.direction = hi ? 'higher' : 'lower'; U.toast(`The ROC analysis now uses the cut-off ${c} — run the report again (step 12)`); if (U.renderAdvanced) U.renderAdvanced(); }; };
      $('#rxS').oninput = show; show(); };
    $('#rxT').onchange = draw; draw(); }

  /* ---------- R11: sample size of a diagnostic accuracy study ---------- */
  function sampleSize() { const p = X.panel('dxSize', '🧮 Sample size for a diagnostic study', `<div class="grid g2"><div><label class="f">Expected sensitivity (%)</label><input id="dzSe" type="number" value="85"></div><div><label class="f">Expected specificity (%)</label><input id="dzSp" type="number" value="80"></div>
      <div><label class="f">Prevalence in the study (%)</label><input id="dzPr" type="number" value="30"></div><div><label class="f">Precision (± half-width of the 95% CI, %)</label><input id="dzD" type="number" value="7"></div><div><label class="f">Expected AUC</label><input id="dzA" type="number" step="0.01" value="0.80"></div><div><label class="f">AUC precision (± half-width)</label><input id="dzAd" type="number" step="0.01" value="0.05"></div></div><div id="dzOut" style="margin-top:8px"></div>`);
    const go = () => { const v = id => parseFloat($(id).value), se = v('#dzSe') / 100, sp = v('#dzSp') / 100, pr = v('#dzPr') / 100, d = v('#dzD') / 100, z = 1.96, A = v('#dzA'), dA = v('#dzAd');
      const tpfn = z * z * se * (1 - se) / (d * d), tnfp = z * z * sp * (1 - sp) / (d * d), nSe = Math.ceil(tpfn / pr), nSp = Math.ceil(tnfp / (1 - pr));
      // Hanley & McNeil variance of the AUC with equal numbers with and without the condition, scaled by the prevalence
      const Q1 = A / (2 - A), Q2 = 2 * A * A / (1 + A), varA = k => (A * (1 - A) + (k - 1) * (Q1 - A * A) + (k - 1) * (Q2 - A * A)) / (k * k); let k = 5; while (k < 100000 && z * Math.sqrt(varA(k)) > dA) k++; const nA = Math.ceil(k / Math.min(pr, 1 - pr));
      $('#dzOut').innerHTML = `<table class="t"><tbody><tr><td>For the sensitivity (Buderer)</td><td><b>${nSe}</b> patients (${Math.ceil(tpfn)} with the condition)</td></tr><tr><td>For the specificity (Buderer)</td><td><b>${nSp}</b> patients (${Math.ceil(tnfp)} without)</td></tr><tr><td>For the AUC (Hanley-McNeil)</td><td><b>${nA}</b> patients (about ${k} in the smaller group)</td></tr><tr><td><b>Recruit at least</b></td><td><b>${Math.max(nSe, nSp)}</b> (sensitivity and specificity)${nA > Math.max(nSe, nSp) ? `, or ${nA} for the AUC` : ''}</td></tr></tbody></table>
        <p class="legend-note">Methods sentence: “Assuming a sensitivity of ${(100 * se).toFixed(0)}%, a specificity of ${(100 * sp).toFixed(0)}% and a prevalence of ${(100 * pr).toFixed(0)}%, ${Math.max(nSe, nSp)} patients were needed to estimate both with a 95% CI of ±${(100 * d).toFixed(0)}% (Buderer 1996).”</p>`; };
    p.querySelectorAll('input').forEach(i => { i.oninput = go; }); go(); }

  (function menu() { const more = $('.ux-menu') || $('.top-actions'); if (!more) return; const add = (label, title, fn) => { const b = document.createElement('button'); b.className = 'btn light small'; b.type = 'button'; b.textContent = label; b.title = title; b.onclick = fn; more.appendChild(b); };
    add('🎚 ROC cut-off explorer', 'Move the cut-off of a ROC test and see the 2×2 table, sensitivity, specificity, PPV, NPV and LRs; use it in the report', explorer);
    add('🧮 Diagnostic study sample size', 'Patients needed to estimate sensitivity, specificity (Buderer) or an AUC (Hanley-McNeil) with a chosen precision', sampleSize); })();
  window.EasyRocUI = { explorer, sampleSize };
})();

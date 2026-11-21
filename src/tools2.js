/* Prof MSE Easy Stat — report tools, round 4: review sheet in two columns, reviewer mode, multiplicity, outliers, ITT vs per-protocol,
   the story order of the tables, number consistency, limitations, journal styles, highlights, the balance (Love) plot. */
(() => {
  const U = window.EasyUI, X = window.EasyUX2; if (!U || !X) return;
  const S = () => U.state, $ = s => document.querySelector(s), esc = U.esc, log = X.log;
  const A = () => Analysis, St = () => Stats;
  const F = (x, d = 2) => isFinite(x) ? A().fmt(x, d) : '—', FP = p => isFinite(p) ? A().fmtP(p, S().cfg.options.alpha) : '—';
  const groups = () => U.activeGroups(), gLab = g => S().cfg.groupLabels[g] || g;
  const show = (title, html, note) => { const o = $('#accOut'); if (!o) return; o.innerHTML = `<div class="report-sec"><h3 style="margin:0 0 6px">${title}</h3>${html}${note ? `<p class="legend-note">${note}</p>` : ''}</div>`; o.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); };
  const tbl = (head, rows) => `<table class="t"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map((c, i) => `<td>${i ? esc(c) : `<b>${esc(c)}</b>`}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  const copyText = t => navigator.clipboard.writeText(t).then(() => U.toast('Copied'), () => U.toast('Copying was blocked'));
  const ready = () => { if (!S().result) { U.toast('Run the report first'); return false; } U.syncEdits(); return true; };
  // every P value of the report's variable tables, with its variable and table
  function allP() { const out = []; S().result.sections.forEach(s => { const L = (s.meta && Array.isArray(s.meta.res)) ? s.meta.res : []; L.forEach(r => { const t = r && (r.num || r.cat); if (t && isFinite(t.p)) out.push({ label: r.v.label, table: s.title, p: t.p, r }); }); });
    S().result.sections.forEach(s => { if (s.kind === 'repeated' && s.meta && Array.isArray(s.meta.results)) s.meta.results.forEach((q, i) => { if (q && isFinite(q.p)) out.push({ label: `${(S().cfg.variables.find(v => v.id === s.vid) || {}).label || s.title} (${(s.meta.tps || [])[i] || i + 1})`, table: s.title, p: q.p }); }); });
    return out; }

  /* ---------- R1: the review sheet: the automatic text beside a column for the supervisor's wording, and back ---------- */
  function reviewSheet() { if (!ready()) return; const r = S().result, rows = [['#', 'Table / part', 'Text now (English)', 'Your wording (leave empty to keep)', 'Notes']];
    if (r.methods) rows.push(['M', 'Statistical analysis', r.methods, '', '']); r.sections.forEach((s, i) => { if (s.comment && s.comment.trim()) rows.push([i + 1, s.title, s.comment, '', '']); });
    const ws = XLSX.utils.aoa_to_sheet(rows); ws['!cols'] = [{ wch: 4 }, { wch: 34 }, { wch: 80 }, { wch: 80 }, { wch: 30 }]; const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Review');
    U.saveUrl(URL.createObjectURL(new Blob([XLSX.write(wb, { type: 'array', bookType: 'xlsx' })], { type: 'application/octet-stream' })), `${U.baseName()} - review sheet.xlsx`); log('Review sheet saved'); }
  async function reviewBack(file) { if (!ready()) return; const wb = XLSX.read(new Uint8Array(await file.arrayBuffer()), { type: 'array' }), rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 }); let n = 0;
    rows.slice(1).forEach(r0 => { const w = String(r0[3] || '').trim(); if (!w) return; if (r0[0] === 'M') { const m = $('#edMethods'); if (m) { m.value = w; m.dispatchEvent(new Event('input', { bubbles: true })); n++; } return; }
      const i = S().result.sections.findIndex(s => s.title === r0[1]); const ta = document.querySelector(`[data-comment="${i}"]`); if (i >= 0 && ta) { ta.value = w; ta.dispatchEvent(new Event('input', { bubbles: true })); n++; } });
    U.syncEdits(); log(`Review sheet applied: ${n} text${n === 1 ? '' : 's'} replaced`); U.toast(`${n} text${n === 1 ? '' : 's'} replaced from the review sheet (⇄ Changes shows them)`); }

  /* ---------- R3: reviewer mode: the weak spots a reviewer would find ---------- */
  function reviewer() { if (!ready()) return; const cfg = S().cfg, rows = U.aRows(), gs = groups(), out = [], ps = allP();
    if (gs.length === 2) U.aOuts().forEach(v => { const e = U.aEffect(v, rows, gs); if (!e) return; const lab = U.vLab(v);
      if (e.kind === 'md') { const sd = Math.sqrt(((e.na - 1) * e.sa ** 2 + (e.nb - 1) * e.sb ** 2) / (e.na + e.nb - 2)); if ((e.hi - e.lo) / 2 > 0.8 * sd) out.push(['Wide confidence interval', `${lab}: MD ${F(e.est)} (${F(e.lo)} to ${F(e.hi)}) — half its width is ${F((e.hi - e.lo) / 2 / sd)} SD; the estimate is imprecise (few patients for this outcome).`]); }
      else if (e.hi / e.lo > 4) out.push(['Wide confidence interval', `${lab}: RR ${F(e.est)} (${F(e.lo)}–${F(e.hi)}) — the upper limit is ${F(e.hi / e.lo, 1)} times the lower.`]);
      if (Math.min(e.na || 99, e.nb || 99) < 10) out.push(['Small groups', `${lab}: ${Math.min(e.na, e.nb)} patients in the smaller group.`]); });
    S().result.sections.forEach(s => ((s.meta && Array.isArray(s.meta.res)) ? s.meta.res : []).forEach(r => { const c = r && r.cat; if (!c || !c.table || !/Chi/i.test(c.test || '')) return; const T = c.table, cs = T[0].map((_, j) => T.reduce((a, row) => a + row[j], 0)), rs = T.map(row => row.reduce((a, b) => a + b, 0)), N = rs.reduce((a, b) => a + b, 0); if (!N) return;
      const ex = T.flatMap((row, i) => row.map((_, j) => rs[i] * cs[j] / N)), low = ex.filter(x => x < 5).length; if (low) out.push(['Small expected counts', `${r.v.label}: ${low} of ${ex.length} cells have an expected count below 5 with the chi-square test (smallest ${F(Math.min(...ex), 1)}) — Fisher's exact test is safer (step 4).`]); }));
    ps.filter(x => x.p >= 0.04 && x.p <= 0.05).forEach(x => out.push(['P value just under 0.05', `${x.label} (${x.table}): P ${FP(x.p)} — a fragile result; report the effect and its CI, and avoid strong conclusions.`]));
    const adj = /bonf|holm|fdr|bh/i.test(JSON.stringify(cfg.options).match(/"(?:padj|pAdjust|multAdj|adjust)[^,]*/i) || ''); if (ps.length > 20 && !adj) out.push(['Many tests without a correction', `${ps.length} P values in the report and no correction for multiple testing: name the primary outcome, call the others exploratory, or see ⚖ Multiplicity.`]);
    if (!cfg.variables.some(v => v.role === 'primary')) out.push(['No primary outcome', 'A reviewer will ask which outcome the study was powered for (🎭 Roles, step 2).']);
    show('🧐 Reviewer mode — what a reviewer may ask', out.length ? tbl(['Point', 'Detail'], out) : '<p>✓ No weak spots found by these checks.</p>', 'Checks: CI half-width above 0.8 SD (or a RR CI wider than ×4), groups below 10, chi-square with expected counts below 5, P between 0.04 and 0.05, more than 20 tests without a correction, no primary outcome.'); }

  /* ---------- R4: multiplicity: Bonferroni, Holm and Benjamini-Hochberg ---------- */
  function adjustP(ps) { const m = ps.length, idx = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]), bon = ps.map(p => Math.min(1, p * m)), holm = Array(m), bh = Array(m); let run = 0;
    idx.forEach(([p, i], k) => { run = Math.max(run, Math.min(1, (m - k) * p)); holm[i] = run; }); let mn = 1; for (let k = m - 1; k >= 0; k--) { const [p, i] = idx[k]; mn = Math.min(mn, p * m / (k + 1)); bh[i] = Math.min(1, mn); } return { bon, holm, bh }; }
  X.adjustP = adjustP;
  function multiplicity() { if (!ready()) return; const L = allP(); if (!L.length) { show('⚖ Multiplicity', '<p class="legend-note">No P values.</p>'); return; } const a = adjustP(L.map(x => x.p)), al = +S().cfg.options.alpha || 0.05;
    const rows = L.map((x, i) => [x.label, x.table, FP(x.p), FP(a.bon[i]), FP(a.holm[i]), FP(a.bh[i]), x.p <= al ? (a.holm[i] <= al ? (a.bh[i] <= al ? 'survives all' : 'Holm only') : a.bh[i] <= al ? 'FDR only' : 'lost after correction') : '—']);
    const nS = L.filter(x => x.p <= al).length, nH = a.holm.filter(p => p <= al).length, nB = a.bh.filter(p => p <= al).length;
    show('⚖ Multiplicity — the P values corrected', `<p>${L.length} tests; ${nS} significant before correction, ${a.bon.filter(p => p <= al).length} after Bonferroni, ${nH} after Holm, ${nB} after Benjamini-Hochberg (false discovery rate).</p>${tbl(['Variable', 'Table', 'P', 'Bonferroni', 'Holm', 'Benjamini-Hochberg', 'Significance'], rows)}
      <p><button class="btn ghost small" type="button" id="t2MultCopy">⧉ Copy a methods sentence</button></p>`, 'Bonferroni and Holm control the family-wise error; Benjamini-Hochberg the false discovery rate. The primary outcome usually needs no correction.');
    $('#t2MultCopy').onclick = () => copyText(`To account for multiple testing, P values were adjusted with the Holm method (family-wise error) and the Benjamini-Hochberg method (false discovery rate); ${nS} of ${L.length} comparisons were significant before and ${nH} after the Holm correction.`); }

  /* ---------- R5: sensitivity to outliers (beyond 3 SD of the group) ---------- */
  function outlierSens() { if (!ready()) return; const rows = U.aRows(), gs = groups(), cfg = S().cfg; if (gs.length !== 2) { show('Sensitivity to outliers', '<p class="legend-note">Two groups are needed.</p>'); return; } const out = [];
    U.aOuts().filter(v => v.type !== 'categorical').forEach(v => { const val = g => rows.filter(r => A().groupOf(cfg, r) === g).map(r => U.aVal(v, r)).filter(x => x !== null), a = val(gs[0]), b = val(gs[1]); if (a.length < 3 || b.length < 3) return;
      const trim = x => { const m = St().mean(x), s = St().sd(x); return x.filter(y => Math.abs(y - m) <= 3 * s); }, a2 = trim(a), b2 = trim(b), t1 = St().tTest(a, b, false), t2 = St().tTest(a2, b2, false), m1 = St().mannWhitney(a, b), m2 = St().mannWhitney(a2, b2), k = a.length + b.length - a2.length - b2.length;
      const al = +cfg.options.alpha || 0.05, flip = (t1.p <= al) !== (t2.p <= al);
      out.push([U.vLab(v), String(k), `${F(t1.diff)} (${F(t1.lo)} to ${F(t1.hi)}), P ${FP(t1.p)}`, k ? `${F(t2.diff)} (${F(t2.lo)} to ${F(t2.hi)}), P ${FP(t2.p)}` : 'no outliers', `${FP(m1.p)} → ${k ? FP(m2.p) : '='}`, !k ? '—' : flip ? '⚠ the conclusion changes' : 'the same conclusion']); });
    show('🔍 Sensitivity to outliers', out.length ? tbl(['Outcome', 'Values beyond 3 SD', 'All patients: MD (95% CI), P', 'Without them', 'Mann-Whitney P', 'Verdict'], out) : '<p class="legend-note">No numeric outcomes (mark the outcomes in 🎭 Roles).</p>', `MD: ${esc(gLab(gs[0]))} − ${esc(gLab(gs[1]))}, Welch's t-test; values more than 3 SD from their group's mean removed.`); }

  /* ---------- R6: intention-to-treat against per-protocol ---------- */
  function itt(col, val) { if (!ready()) return; const cfg = S().cfg, rows = U.aRows(), gs = groups(); if (gs.length !== 2) { show('ITT vs per-protocol', '<p class="legend-note">Two groups are needed.</p>'); return; }
    const vs = cfg.variables.filter(v => v.cols && v.cols.length), guess = vs.find(v => /per.?protocol|protocol deviation|deviation|non.?adheren|withdr|lost to|drop.?out|cross.?over|received/i.test(v.label));
    const c = col !== undefined ? vs.find(v => v.id === col) : guess, lv = c ? [...new Set(rows.map(r => r[c.cols[0].col]).filter(x => x !== '' && x != null))].map(String) : [];
    const bad = val !== undefined ? val : c ? (lv.find(x => /^(yes|y|1|true|deviat|withdr|lost)/i.test(x)) || lv[0]) : '', pp = c ? rows.filter(r => String(r[c.cols[0].col]) !== bad) : rows;
    const out = U.aOuts().map(v => { const e1 = U.aEffect(v, rows, gs), e2 = U.aEffect(v, pp, gs); if (!e1) return null; const fe = e => !e ? '—' : e.kind === 'md' ? `${F(e.est)} (${F(e.lo)} to ${F(e.hi)}), P ${FP(e.p)}` : `RR ${F(e.est)} (${F(e.lo)}–${F(e.hi)}), P ${FP(e.p)}`; return [U.vLab(v), `${(e1.na || 0) + (e1.nb || 0)}`, fe(e1), e2 ? `${(e2.na || 0) + (e2.nb || 0)}` : '—', fe(e2)]; }).filter(Boolean);
    show('👥 Intention-to-treat and per-protocol', `<div class="row" style="gap:6px;align-items:center;flex-wrap:wrap"><span>Per-protocol excludes patients where</span><select id="t2IttCol" style="width:auto"><option value="">— choose —</option>${vs.map(v => `<option value="${esc(v.id)}" ${c && c.id === v.id ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select><span>is</span><select id="t2IttVal" style="width:auto">${lv.map(x => `<option ${x === bad ? 'selected' : ''}>${esc(x)}</option>`).join('')}</select><button class="btn ghost small" type="button" id="t2IttGo">Run</button></div>
      ${c ? `<p class="legend-note">${rows.length - pp.length} patient${rows.length - pp.length === 1 ? '' : 's'} excluded from the per-protocol analysis.</p>` : '<p class="legend-note">Choose the column that marks a protocol deviation (withdrawal, non-adherence, crossover …).</p>'}${tbl(['Outcome', 'n (ITT)', 'ITT: effect (95% CI), P', 'n (PP)', 'Per-protocol: effect (95% CI), P'], out)}`, 'ITT: every patient in the group allocated; per-protocol: only those who followed the protocol. Similar results support the robustness of the findings (for non-inferiority, both should agree).');
    $('#t2IttGo').onclick = () => itt($('#t2IttCol').value, $('#t2IttVal').value); $('#t2IttCol').onchange = () => itt($('#t2IttCol').value || undefined); }

  /* ---------- R7: the story order of the tables: baseline, primary, secondary, safety, then the rest ---------- */
  function storyOrder() { if (!S().cfg) return; const rk = v => /demograph|baseline|characteristic/i.test(v.table || '') && !v.role ? 0 : v.role === 'primary' ? 1 : v.role === 'secondary' ? 2 : v.role === 'safety' ? 3 : 4;
    const before = S().cfg.variables.map(v => v.id).join(); S().cfg.variables = S().cfg.variables.map((v, i) => [v, i]).sort((a, b) => rk(a[0]) - rk(b[0]) || a[1] - b[1]).map(x => x[0]); S().cfg.variables.forEach((v, i) => { v.pos = i; });
    if (before === S().cfg.variables.map(v => v.id).join()) { U.toast('The tables are already in this order'); return; } U.renderVariables(); log('Tables put in the story order'); if (S().result) U.runAnalysis(); U.toast('Order: baseline, primary, secondary, safety, the rest — numbers and references follow'); }

  /* ---------- R8: the numbers checked across the report ---------- */
  function consistency() { if (!ready()) return; const cfg = S().cfg, rows = U.aRows(), gs = groups(), nG = Object.fromEntries(gs.map(g => [gLab(g), rows.filter(r => A().groupOf(cfg, r) === g).length])), out = [];
    S().result.sections.forEach(s => { const head = (s.head || []).map(h => typeof h === 'string' ? h : (h && h.t) || '').join(' | '); Object.entries(nG).forEach(([g, n]) => { const m = new RegExp(`${g.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^|]*?\\(n\\s*=\\s*(\\d+)\\)`, 'i').exec(head); if (m && +m[1] !== n) out.push(['n in a heading', `“${s.title}”: ${g} (n = ${m[1]}) but ${n} patients in the data${+m[1] < n ? ' (missing values?)' : ''}.`]); }); });
    try { (U.flowWarnings(cfg.consort) || []).forEach(w => out.push(['Flowchart', String(w)])); } catch (e) { /* no flowchart */ }
    if (cfg.consort && cfg.consort.enabled && Array.isArray(cfg.consort.groups)) cfg.consort.groups.forEach((g, i) => { const an = +(g.analysed ?? g.analyzed ?? g.nAnalysed); const lab = gLab(gs[i] ?? ''); if (isFinite(an) && an && nG[lab] !== undefined && an !== nG[lab]) out.push(['Flowchart against the data', `${lab}: ${an} analysed in the flowchart, ${nG[lab]} in the data.`]); });
    const pd = +cfg.options.pctDecimals; S().result.sections.forEach(s => ((s.meta && Array.isArray(s.meta.res)) ? s.meta.res : []).forEach(r => { const c = r && r.cat; if (!c || !c.pct || c.pct.length < 3) return; c.pct[0].forEach((_, j) => { const sum = c.pct.reduce((a, row) => a + +(+row[j]).toFixed(isFinite(pd) ? pd : 1), 0); if (Math.abs(sum - 100) > 0.05) out.push(['Percentages', `${r.v.label}, ${gLab(gs[j] ?? '') || 'column ' + (j + 1)}: the shown percentages add up to ${F(sum, 1)}% (rounding) — a reviewer may ask; the footnote can say “may not add to 100 because of rounding”.`]); }); }));
    show('🔢 Numbers across the report', out.length ? tbl(['Where', 'What'], out) : '<p>✓ The numbers agree: the n of each group in the headings, the flowchart and the data; the percentages add up.</p>', 'Checked: n of each group in the table headings against the data; the flowchart (its own checks and the analysed numbers); percentages of variables with three or more categories.'); }

  /* ---------- T1: limitations paragraph ---------- */
  function limitations() { if (!ready()) return; const cfg = S().cfg, st = S(), rows = U.aRows(), n = rows.length, out = [], ps = allP();
    if (n < 100) out.push(`the sample size was relatively small (${n} patients), which limits the precision of the estimates and the power for secondary outcomes`);
    const site = cfg.variables.find(v => /\b(site|centre|center|hospital)\b/i.test(v.label)); const nSites = site ? new Set(rows.map(r => r[site.cols[0].col]).filter(Boolean)).size : 1; if (nSites <= 1) out.push('it was a single-centre study, which may limit the generalisability of the findings');
    const rct = (cfg.consort || {}).type === 'consort' || /random/i.test(JSON.stringify(cfg.methodsInfo || {})); if (!rct) out.push('as an observational study, residual confounding cannot be excluded');
    const miss = cfg.variables.filter(v => v.include && v.cols && v.cols.length).map(v => ({ v, p: rows.filter(r => U.isMissing(r[v.cols[v.cols.length - 1].col])).length / Math.max(1, n) })).sort((a, b) => b.p - a.p)[0]; if (miss && miss.p >= 0.05) out.push(`some data were missing (up to ${Math.round(100 * miss.p)}% for ${miss.v.label.replace(/\s*\(.*\)$/, '').toLowerCase()})`);
    const rep = cfg.variables.filter(v => v.include && v.kind === 'repeated'); if (rep.length) { const c = rep[0].cols[rep[0].cols.length - 1]; out.push(`the follow-up was limited to ${c.label || (cfg.tpLabels || {})[c.tp] || c.tp || 'the last visit'}, so longer-term effects are unknown`); }
    if (ps.length > 20) out.push(`multiple comparisons were made (${ps.length} tests), so the secondary findings should be considered exploratory`);
    if (rct && !/blind|mask/i.test(JSON.stringify(cfg.methodsInfo || {}))) out.push('blinding of the participants and the assessors was not described, which may introduce performance or detection bias');
    const txt = out.length ? `This study has some limitations. ${out.map((x, i) => `${['First', 'Second', 'Third', 'Fourth', 'Fifth', 'Sixth', 'Seventh'][i] || 'Also'}, ${x}.`).join(' ')}` : 'No major limitations were identified from the data and the design; describe the ones you know (selection, measurement, follow-up).';
    show('⚠ Limitations — a draft', `<textarea id="t2Lim" style="width:100%;min-height:140px">${esc(txt)}</textarea><div class="row" style="gap:6px"><button class="btn ghost small" type="button" id="t2LimCopy">⧉ Copy</button><button class="btn primary small" type="button" id="t2LimAdd">Put it in the report (Statistical limitations)</button></div>`, 'Drafted from the design and the data: sample size, centres, design, missing data, follow-up, number of tests, blinding. Edit before use.');
    $('#t2LimCopy').onclick = () => copyText($('#t2Lim').value); $('#t2LimAdd').onclick = () => { st.result.limitations = $('#t2Lim').value; U.renderReport(); log('Limitations added to the report'); U.toast('Added at the end of the report'); }; }

  /* ---------- T2: journal styles ---------- */
  const JSTYLE = { ama: ['AMA (JAMA and others)', { pLead: 0, pWord: 'P', tableCaption: 'period', captionStyle: 'period' }, 'P without the leading zero (P = .04, P < .001), “Table 1.” and “Figure 1.”'],
    apa: ['APA 7th edition', { pLead: 0, pWord: 'p', tableCaption: 'period', captionStyle: 'period' }, 'p in lower case without the leading zero (p = .04, p < .001)'],
    icmje: ['ICMJE / Vancouver (most medical journals)', { pLead: 1, pWord: 'P', tableCaption: 'period', captionStyle: 'period' }, 'P with the leading zero (P = 0.04, P < 0.001), “Table 1.” and “Figure 1.”'],
    thesis: ['Thesis (the defaults)', { pLead: 1, pWord: 'P value', tableCaption: 'colon', captionStyle: 'colon' }, '“P value = 0.04”, “Table 1:” and “Figure 1:”'] };
  function journal() { if (!S().cfg) return; show('📰 Journal style', `<div class="row" style="gap:6px;flex-wrap:wrap">${Object.entries(JSTYLE).map(([k, [l, , d]]) => `<button class="btn ghost small" type="button" data-js="${k}" title="${esc(d)}">${esc(l)}</button>`).join('')}</div>
      <div class="row" style="gap:6px;align-items:center;margin-top:8px"><span>Word limit of the Results</span><input type="number" id="t2Wl" min="0" step="50" value="${esc((S().cfg.report || {}).wordLimit || '')}" style="width:90px"><span class="legend-note">a warning above the report when over</span></div>`, 'Sets the P value style and the captions of tables and figures; the journal\'s own instructions decide anything else (word limit, number of tables). The report runs again.');
    $('#accOut').onclick = e => { const b = e.target.closest('[data-js]'); if (!b) return; const [l, o] = JSTYLE[b.dataset.js]; Object.assign(S().cfg.options, o); U.renderOptions(); log(`Journal style: ${l}`); U.runAnalysis(); U.toast(`${l}: applied`); };
    $('#t2Wl').onchange = e => { S().cfg.report = { ...(S().cfg.report || {}), wordLimit: e.target.value }; const i = document.querySelector('[data-rx="wordLimit"]'); if (i) i.value = e.target.value; U.toast('Word limit set'); }; }

  /* ---------- T3: highlights ---------- */
  function highlights() { if (!ready()) return; const cfg = S().cfg, t = U.abstractTable(), gs = groups(), al = +cfg.options.alpha || 0.05, ps = allP(), H = [];
    const pv = cfg.variables.find(v => v.role === 'primary'), prim = t.rows.find(r => pv && r[0].startsWith(pv.label)) || t.rows[0], n = U.aRows().length;
    H.push(`${n} patients${gs.length >= 2 ? ` were compared: ${gs.map(gLab).join(' vs ')}` : ' were studied'}.`);
    if (prim) H.push(`${prim[0]}: ${prim.slice(1, -2).join(' vs ')}${prim[prim.length - 2] && prim[prim.length - 2] !== '—' ? `; ${prim[prim.length - 2]}` : ''} (P ${String(prim[prim.length - 1]).replace(/\*/g, "")}).`);
    const sig = t.rows.filter(r => r !== prim && /\*/.test(r[r.length - 1])); if (sig.length) H.push(`Also different: ${sig.slice(0, 4).map(r => r[0]).join(', ')}.`);
    const ns = t.rows.filter(r => r !== prim && !/\*/.test(r[r.length - 1])); if (ns.length) H.push(`No significant difference in ${ns.slice(0, 4).map(r => r[0].toLowerCase()).join(', ')}.`);
    const saf = cfg.variables.filter(v => v.role === 'safety'); if (saf.length) H.push(`Safety: ${saf.map(v => v.label).join(', ')} — see the safety table.`);
    if (!t.rows.length) H.push(`${ps.filter(x => x.p <= al).length} of ${ps.length} comparisons were significant.`);
    const txt = H.slice(0, 5).map(h => `• ${h}`).join('\n');
    show('✨ Highlights — a draft', `<textarea id="t2Hl" style="width:100%;min-height:120px">${esc(txt)}</textarea><button class="btn ghost small" type="button" id="t2HlCopy">⧉ Copy</button>`, 'Three to five bullets for the journal\'s highlights or key points, from the outcomes (🎭 Roles): edit them into short statements (often 85 characters at most each). The cover letter is in “Cover letter” (Write tab).');
    $('#t2HlCopy').onclick = () => copyText($('#t2Hl').value); }

  /* ---------- F4: the balance (Love) plot of the baseline SMDs ---------- */
  function lovePlot() { if (!ready()) return; const cfg = S().cfg, rows = U.aRows(), gs = groups(); if (gs.length !== 2) { show('Balance plot', '<p class="legend-note">Two groups are needed.</p>'); return; }
    const outs = new Set(U.aOuts().map(v => v.id)), vs = cfg.variables.filter(v => v.include && v.kind !== 'repeated' && !outs.has(v.id) && (v.type !== 'categorical' || U.isBin(v))), pts = [];
    vs.forEach(v => { const x = g => rows.filter(r => A().groupOf(cfg, r) === g).map(r => U.aVal(v, r)).filter(y => y !== null), a = x(gs[0]), b = x(gs[1]); if (a.length < 2 || b.length < 2) return; let d;
      if (v.type !== 'categorical') { const sp = Math.sqrt((St().sd(a) ** 2 + St().sd(b) ** 2) / 2); d = sp > 0 ? (St().mean(a) - St().mean(b)) / sp : 0; } else { const p1 = St().mean(a), p2 = St().mean(b), sp = Math.sqrt((p1 * (1 - p1) + p2 * (1 - p2)) / 2); d = sp > 0 ? (p1 - p2) / sp : 0; }
      pts.push({ l: U.vLab(v) + (v.type === 'categorical' ? ` (${U.aLev(v)})` : ''), d }); });
    if (!pts.length) { show('Balance plot', '<p class="legend-note">No baseline variables.</p>'); return; } pts.sort((a, b) => Math.abs(b.d) - Math.abs(a.d));
    const W = 1400, rowH = 46, top = 70, H = top + pts.length * rowH + 90, L = 520, R = W - 80, mx = Math.max(0.5, Math.ceil(Math.max(...pts.map(p => Math.abs(p.d))) * 10) / 10), X0 = x => L + (x + mx) / (2 * mx) * (R - L);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H; const c = cv.getContext('2d'), font = cfg.options.font || 'Arial'; c.fillStyle = '#fff'; c.fillRect(0, 0, W, H);
    c.strokeStyle = '#bbb'; c.setLineDash([8, 6]); [-0.1, 0.1].forEach(x => { c.beginPath(); c.moveTo(X0(x), top - 20); c.lineTo(X0(x), top + pts.length * rowH); c.stroke(); }); c.setLineDash([]); c.strokeStyle = '#555'; c.beginPath(); c.moveTo(X0(0), top - 20); c.lineTo(X0(0), top + pts.length * rowH); c.stroke();
    pts.forEach((p, i) => { const y = top + i * rowH + rowH / 2; c.fillStyle = '#222'; c.font = `26px ${font}`; c.textAlign = 'right'; c.textBaseline = 'middle'; c.fillText(p.l.length > 38 ? p.l.slice(0, 37) + '…' : p.l, L - 20, y); c.fillStyle = Math.abs(p.d) > 0.1 ? '#C62828' : '#3B2A8C'; c.beginPath(); c.arc(X0(p.d), y, 10, 0, 7); c.fill(); });
    c.fillStyle = '#222'; c.textAlign = 'center'; c.font = `24px ${font}`; { const stp = mx <= 0.6 ? 0.1 : mx <= 1.2 ? 0.2 : 0.5; for (let t = -Math.floor(mx / stp) * stp; t <= mx + 1e-9; t += stp) c.fillText(F(Math.abs(t) < 1e-9 ? 0 : t, 1), X0(t), top + pts.length * rowH + 30); } c.font = `26px ${font}`; c.fillText(`Standardised mean difference (${gLab(gs[0])} − ${gLab(gs[1])})`, (L + R) / 2, H - 22);
    const url = cv.toDataURL('image/png'), cap = 'Balance of the baseline characteristics between the studied groups (standardised mean differences; dashed lines at ±0.1)';
    show('⚖ Balance plot (Love plot)', `<img src="${url}" style="max-width:100%;border:1px solid var(--line)"><p class="legend-note">${pts.filter(p => Math.abs(p.d) > 0.1).length} of ${pts.length} baseline variables with |SMD| > 0.1 (red).</p><div class="row" style="gap:6px"><button class="btn primary small" type="button" id="t2LoveAdd">＋ Add to the Word report</button><button class="btn ghost small" type="button" id="t2LovePng">⬇ PNG</button></div>`, 'SMD: difference in means (or proportions) divided by the pooled SD; |SMD| < 0.1 is usually taken as balanced.');
    $('#t2LovePng').onclick = () => U.saveUrl(url, `${U.baseName()} - balance plot.png`); $('#t2LoveAdd').onclick = () => { U.combos().push({ url, w: W, h: H, caption: cap }); log('Balance plot added to the report'); U.toast('Added: it goes at the end of the Word report'); }; }

  // the buttons
  const on = (id, fn) => { const b = document.getElementById(id); if (b) b.onclick = fn; };
  on('btnTwoCol', reviewSheet); on('btnReviewer', reviewer); on('btnMultiplicity', multiplicity); on('btnOutSens', outlierSens); on('btnItt', () => itt()); on('btnStory', storyOrder); on('btnConsist', consistency); on('btnLimits', limitations); on('btnJournal', journal); on('btnHighlights', highlights); on('btnLove', lovePlot);
  const rb = document.getElementById('rvBackFile'); if (rb) rb.onchange = e => { const f = e.target.files[0]; e.target.value = ''; if (f) reviewBack(f).catch(err => U.toast('Could not read it: ' + err.message)); };
})();

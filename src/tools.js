/* Prof MSE Easy Stat — project tools: dashboard, study templates, explain-my-result, batch reports, help centre,
   reproducibility package (R and Python), audit log and the consistency check. Works through window.EasyUI. */
(() => {
  const U = window.EasyUI; if (!U) return;
  const S = () => U.state, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], esc = U.esc;
  const ls = { get: (k, d) => { try { const v = localStorage.getItem('tools.' + k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set: (k, v) => { try { localStorage.setItem('tools.' + k, JSON.stringify(v)); } catch (e) { /* blocked */ } } };
  const panel = (id, title, html, wide) => { $$('.ux-pop.open').forEach(x => { if (x.id !== id) x.classList.remove('open'); }); let p = document.getElementById(id); if (!p) { p = document.createElement('div'); p.className = 'ux-pop'; p.id = id; document.body.appendChild(p); }
    const toggledOff = p._off && Date.now() - p._off < 600; p._off = 0; const dn = window.__uxDown; p._opener = dn && dn.closest ? dn.closest('button,.btn,[role="button"]') : null;
    p.classList.toggle('ux-center', !!wide); p.innerHTML = `<div class="ux-pop-h"><b>${title}</b><span class="spacer"></span><button class="btn ghost small" data-uxclose type="button" aria-label="Close">✕</button></div><div class="ux-pop-b">${html}</div>`; if (!toggledOff) p.classList.add('open'); p.querySelector('[data-uxclose]').onclick = () => p.classList.remove('open'); return p; };
  const cellText = c => typeof c === 'object' && c ? (c.t || []).join(' ') : String(c ?? '');
  const words = t => (String(t || '').trim().match(/\S+/g) || []).length;

  // menu entries (header ☰ More) and report-bar buttons
  const menu = $('.ux-menu'), addMenu = (id, label, title, fn) => { if (!menu) return; const b = document.createElement('button'); b.className = 'btn light small'; b.type = 'button'; b.id = id; b.title = title; b.innerHTML = label; b.onclick = fn; menu.appendChild(b); };
  addMenu('tlDash', '📊 <span class="tl">Project dashboard</span>', 'Data, variables, analyses, figures, warnings and exports at a glance', () => dashboard());
  addMenu('tlTpl', '🧩 <span class="tl">Study templates</span>', 'Reusable setups such as “RCT thesis”', () => templates());
  addMenu('tlHelp', '📚 <span class="tl">Help centre</span>', 'Guides for every test and analysis', () => help());
  addMenu('tlBatch', '🗂 <span class="tl">Batch reports</span>', 'One report per file or per centre with the same setup', () => batch());
  addMenu('tlAudit', '🧾 <span class="tl">Audit log (PDF)</span>', 'Every data edit, setting change, run and export with times', () => auditPdf());

  /* ---------- audit trail: setting changes, runs and exports (data edits come from the cleaning log) ---------- */
  const audit = () => (S().toolsAudit = S().toolsAudit || []), now = () => new Date().toLocaleString();
  document.addEventListener('change', e => { const t = e.target; if (!t.id && !t.dataset.af && !t.dataset.rx) return; const p = t.closest('.panel'); if (!p || p.id === 'p1') return;
    const lab = (t.closest('div,label') || {}).textContent || t.id; audit().push({ time: now(), kind: 'Setting', what: `Step ${p.id.slice(1)}: ${String(lab).replace(/\s+/g, ' ').trim().slice(0, 70)} → ${t.type === 'checkbox' ? (t.checked ? 'on' : 'off') : String(t.value).slice(0, 40)}` }); }, true);
  const EXPORT_IDS = ['btnDocx', 'btnPdf', 'btnXlsx', 'btnXlsxF', 'btnPngs', 'btnPptx', 'btnFigPdf', 'btnMd', 'btnTex', 'btnHtml', 'btnReview', 'btnSupp', 'btnOnePage', 'btnGA', 'btnRis', 'btnLetter', 'btnSap', 'xpWord', 'xpXlsx', 'flowPng', 'flowPptx', 'btnSaveProj', 'tlRepro'];
  document.addEventListener('click', e => { const b = e.target.closest('button'); if (!b || !EXPORT_IDS.includes(b.id)) return; const log = ls.get('exports', {}); log[b.id] = Date.now(); ls.set('exports', log);
    audit().push({ time: now(), kind: 'Export', what: (b.textContent || b.title).replace(/\s+/g, ' ').trim().slice(0, 60) }); }, true);
  let lastRes = null; const rep = $('#report'); if (rep) new MutationObserver(() => { const r = S().result; if (r && r !== lastRes) { lastRes = r; audit().push({ time: now(), kind: 'Run', what: `Report run: ${r.sections.length} tables, ${r.sections.reduce((t, s) => t + s.figures.length, 0)} figures` }); addReportTools(); } }).observe(rep, { childList: true });

  /* ---------- 31. project dashboard ---------- */
  function dashboard() { const st = S(); if (!st.data) { U.toast('Load data first'); return; } const cfg = st.cfg, d = st.data, r = st.result, cells = d.rows.length * d.headers.length, miss = d.rows.reduce((t, row) => t + d.headers.filter(h => U.isMissing(row[h])).length, 0);
    const inc = cfg ? cfg.variables.filter(v => v.include) : [], by = k => inc.filter(v => (v.kind === 'repeated' ? 'repeated' : v.type) === k).length, adv = cfg ? (cfg.advanced || []).filter(a => a.include !== false) : [];
    const warn = []; try { if (cfg && cfg.consort) U.flowWarnings(cfg.consort).forEach(w => warn.push(`Flowchart: ${w}`)); } catch (e) { /* not ready */ }
    if (r) r.sections.forEach(s => { const m = s.meta && s.meta.m; if (m && (m.unstable || m.heywood || m.converged === false)) warn.push(`Model needs attention: ${s.title}`); });
    if (miss / cells > 0.1) warn.push(`${(100 * miss / cells).toFixed(0)}% of the cells are empty`);
    const ex = ls.get('exports', {}), exRows = Object.entries(ex).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([id, t]) => `<li>${esc(((document.getElementById(id) || {}).textContent || id).replace(/\s+/g, ' ').trim())} — ${new Date(t).toLocaleString()}</li>`).join('');
    const card = (n, l) => `<div class="tl-card"><b>${n}</b><span>${l}</span></div>`, groups = cfg ? U.activeGroups().map(g => `${esc(cfg.groupLabels[g] || g)}: ${d.rows.filter(row => Analysis.groupOf(cfg, row) === g).length}`).join(' · ') : '';
    panel('tlDashP', 'Project dashboard', `<div class="tl-cards">${card(d.rows.length, 'patients')}${card(d.headers.length, 'columns')}${card((100 * miss / cells).toFixed(1) + '%', 'empty cells')}${card(inc.length, 'variables in the report')}${card(adv.length, 'advanced analyses')}${card(r ? r.sections.length : '—', 'tables')}${card(r ? r.sections.reduce((t, s) => t + s.figures.length, 0) : '—', 'figures')}${card(r ? r.sections.reduce((t, s) => t + words(s.comment), 0) : '—', 'words of results')}</div>
      <p><b>Groups:</b> ${groups || '—'}</p><p><b>Variables:</b> ${by('numeric')} numeric, ${by('categorical')} categorical, ${by('repeated')} repeated measures${adv.length ? `; <b>analyses:</b> ${esc(adv.map(a => U.ADV_TYPES[a.type] || a.type).join('; '))}` : ''}</p>
      <h4>Warnings (${warn.length})</h4>${warn.length ? `<ul>${warn.map(w => `<li>${esc(w)}</li>`).join('')}</ul>` : '<p class="legend-note">None.</p>'}<h4>Exports</h4>${exRows ? `<ul>${exRows}</ul>` : '<p class="legend-note">Nothing exported yet in this browser.</p>'}
      <p class="legend-note">${r ? `Report last run with ${r.sections.length} tables.` : 'The report has not been run yet (step 12).'}</p>`, true); }

  /* ---------- 32. study templates ---------- */
  const BUILTIN = { rct: { name: 'RCT thesis', note: 'CONSORT flowchart, thesis format with chapter numbers, effect sizes and 95% CIs, comments with the tests named.', o: { esCol: true, testInText: true, tableIntro: true, limits: true, conclusion: true }, report: { format: 'thesis', checklist: 'consort', refs: true, toc: true }, flow: 'consort', adv: [] },
    cohort: { name: 'Observational cohort paper', note: 'STROBE flowchart, journal format, Vancouver style, adjusted analyses ready to fill in.', o: { esCol: true, tableIntro: false }, report: { format: 'paper', style: 'vancouver', checklist: 'strobe', refs: true }, flow: 'strobe', adv: ['logistic', 'survival'] },
    diag: { name: 'Diagnostic accuracy study', note: 'STARD flowchart, ROC curves, calibration and accuracy tables.', o: {}, report: { format: 'paper', refs: true }, flow: 'stard', adv: ['roc', 'diagnostic', 'calib'] },
    quest: { name: 'Questionnaire validation', note: 'Reliability and structure: Cronbach’s alpha, EFA, CFA, measurement invariance.', o: {}, report: { format: 'thesis', refs: true }, flow: 'simple', adv: ['cronbach', 'efa', 'cfa', 'invariance'] } };
  function templateOf() { const c = S().cfg; return { o: JSON.parse(JSON.stringify(c.options)), report: JSON.parse(JSON.stringify(U.report())), flowStyle: c.consort ? JSON.parse(JSON.stringify(c.consort.style || {})) : null, flow: c.consort ? c.consort.type : '', adv: (c.advanced || []).map(a => a.type) }; }
  function applyTemplate(t) { const c = S().cfg; if (!c) { U.toast('Load data first — a template sets up the analysis of your data'); return; } U.readUiIntoCfg();
    c.options = { ...c.options, ...(t.o || {}) }; c.report = { ...U.DEFAULT_REPORT, ...(c.report || {}), ...(t.report || {}) };
    if (c.consort) { if (t.flow) c.consort.type = t.flow; if (t.flowStyle) c.consort.style = { ...c.consort.style, ...t.flowStyle }; }
    (t.adv || []).forEach(type => { if (!(c.advanced || []).some(a => a.type === type)) c.advanced.push({ type, include: true, outcome: '', positive: '', predictors: [], ...(U.advDefaults ? U.advDefaults(type) : {}) }); });
    U.renderOptions(); U.go(S().step || 2); U.toast(`Template applied${(t.adv || []).length ? ` — choose the columns of the added analyses in step 8` : ''}`); }
  function templates() { const mine = ls.get('templates', {});
    const p = panel('tlTplP', 'Study templates', `<p class="legend-note">A template keeps the settings of steps 4–12, the flowchart type and style and the kinds of advanced analyses — not the data or the columns.</p>
      <h4>Ready-made</h4>${Object.entries(BUILTIN).map(([k, t]) => `<div class="tl-row"><div><b>${esc(t.name)}</b><div class="legend-note">${esc(t.note)}</div></div><button class="btn primary small" type="button" data-tpl="b:${k}">Apply</button></div>`).join('')}
      <h4>Yours</h4>${Object.keys(mine).length ? Object.entries(mine).map(([k, t]) => `<div class="tl-row"><div><b>${esc(k)}</b><div class="legend-note">saved ${esc(t.saved || '')}</div></div><span><button class="btn primary small" type="button" data-tpl="m:${esc(k)}">Apply</button> <button class="btn ghost small" type="button" data-tpldel="${esc(k)}">✕</button></span></div>`).join('') : '<p class="legend-note">None yet.</p>'}
      <div class="row" style="gap:6px;margin-top:8px"><button class="btn ghost small" type="button" id="tplSave">💾 Save this setup as a template…</button><button class="btn ghost small" type="button" id="tplExp">⬇ Export</button><label class="btn ghost small">⬆ Import<input type="file" id="tplImp" accept=".json" hidden></label></div>`);
    p.onclick = e => { const a = e.target.closest('[data-tpl]'), d = e.target.closest('[data-tpldel]');
      if (a) { const [k, n] = [a.dataset.tpl.slice(0, 1), a.dataset.tpl.slice(2)]; applyTemplate(k === 'b' ? BUILTIN[n] : ls.get('templates', {})[n]); }
      if (d) { const m = ls.get('templates', {}); delete m[d.dataset.tpldel]; ls.set('templates', m); templates(); } };
    $('#tplSave').onclick = () => { if (!S().cfg) { U.toast('Load data first'); return; } U.readUiIntoCfg(); const n = (prompt('Template name:', 'My study template') || '').trim(); if (!n) return; const m = ls.get('templates', {}); m[n] = { ...templateOf(), saved: new Date().toISOString().slice(0, 10) }; ls.set('templates', m); templates(); U.toast(`Template “${n}” saved`); };
    $('#tplExp').onclick = () => U.saveUrl(URL.createObjectURL(new Blob([JSON.stringify({ app: 'Prof MSE Easy Stat', kind: 'templates', templates: ls.get('templates', {}) }, null, 1)], { type: 'application/json' })), 'Easy Stat templates.json');
    $('#tplImp').onchange = async e => { const f = e.target.files[0]; if (!f) return; try { const j = JSON.parse(await f.text()); ls.set('templates', { ...ls.get('templates', {}), ...(j.templates || {}) }); templates(); U.toast('Templates imported'); } catch (err) { U.toast('Not a templates file'); } }; }

  /* ---------- 35. help centre ---------- */
  const GUIDE = window.EasyToolsGuide = [
    ['Independent t-test', 'Compares the means of a numeric variable between two groups.', 'Roughly normal data in each group (Shapiro-Wilk, histogram); Welch’s version when the variances differ.', 'Age was higher in A than B (58.2 ± 7.1 vs 54.9 ± 8.0 years, P = 0.03).'],
    ['Mann-Whitney U test', 'Compares two groups when the numeric data are skewed or ordinal.', 'Independent observations; compares the distributions (often reported with medians and IQR).', 'CRP was higher in A (median 120, IQR 80–160 mg/L) than in B (P = 0.01).'],
    ['One-way ANOVA', 'Compares the means of three or more groups.', 'Normal data and similar variances (Levene); post hoc tests (Tukey) show which groups differ.', 'BMI differed between the three groups (F(2, 117) = 4.3, P = 0.02).'],
    ['Kruskal-Wallis test', 'Compares three or more groups with skewed data.', 'Pairwise Dunn tests with adjusted P values show which groups differ.', 'Pain scores differed between the groups (H = 9.1, P = 0.01).'],
    ['Chi-square test', 'Compares proportions (categories) between groups.', 'Expected counts of at least 5 in most cells; otherwise Fisher’s exact test.', 'Diabetes was more common in A (40% vs 22%, P = 0.03).'],
    ['Fisher’s exact test', 'Compares proportions when counts are small.', 'Exact; used automatically when expected counts are below 5.', 'Complications: 3 (10%) vs 0 (0%), P = 0.24.'],
    ['Paired t-test / Wilcoxon signed-rank', 'Compares two measurements of the same patients (before / after).', 'Paired t-test for normal differences; Wilcoxon otherwise.', 'SpO2 rose from 86 ± 4 to 92 ± 3% (P < 0.001).'],
    ['Repeated-measures and mixed ANOVA', 'Several measurements over time, in one or more groups.', 'Sphericity (Mauchly); Greenhouse-Geisser correction when it fails; the group × time interaction tests whether groups change differently.', 'WOMAC fell more in A than in B (interaction F = 12.3, P < 0.001).'],
    ['Correlation (Pearson / Spearman)', 'Strength of the linear (Pearson) or monotonic (Spearman) relation of two variables.', 'r from −1 to 1; Spearman for skewed data or outliers.', 'Age correlated with SBP (r = 0.42, P < 0.001).'],
    ['Linear regression', 'Predicts a numeric outcome from several variables.', 'Linear relations, independent normal residuals with equal spread; VIF for collinearity.', 'Each year of age raised SBP by 0.6 mmHg (95% CI 0.3 to 0.9).'],
    ['Logistic regression', 'Predicts a yes/no outcome; gives odds ratios.', 'About 10 events per predictor; Firth logistic for small samples or separation.', 'Diabetes doubled the odds of complications (OR 2.1, 95% CI 1.2–3.7).'],
    ['Kaplan-Meier and log-rank', 'Time to an event with censoring; compares survival curves.', 'Censoring unrelated to the outcome; the log-rank test compares whole curves.', '28-day survival was 63% vs 51% (log-rank P = 0.16).'],
    ['Cox regression', 'Hazard ratios for time-to-event outcomes, adjusted for covariates.', 'Proportional hazards (check with Schoenfeld residuals).', 'SOFA raised the hazard of death (HR 1.23 per point, 95% CI 1.10–1.38).'],
    ['ROC curve', 'How well a numeric test separates patients with and without a condition.', 'AUC 0.5 = useless, 0.7–0.8 acceptable, 0.8–0.9 excellent; Youden index for the cut-off.', 'CRP had an AUC of 0.82 (95% CI 0.75–0.89); cut-off 100 mg/L.'],
    ['Cohen’s kappa and ICC', 'Agreement of raters or methods (categories: kappa; numbers: ICC).', 'Kappa > 0.6 substantial; ICC > 0.75 good.', 'Agreement was substantial (κ = 0.71).'],
    ['Cronbach’s alpha', 'Internal consistency of a questionnaire scale.', '≥ 0.7 acceptable; very high values (> 0.95) suggest redundant items.', 'The scale was reliable (α = 0.86).'],
    ['Exploratory and confirmatory factor analysis', 'EFA finds the structure of items; CFA tests a structure you specify.', 'EFA: KMO ≥ 0.6, parallel analysis. CFA: CFI/TLI ≥ 0.95, RMSEA ≤ 0.06, SRMR ≤ 0.08.', 'The two-factor model fitted well (CFI = 0.97, RMSEA = 0.05).'],
    ['Non-inferiority and equivalence', 'Whether a new treatment is not worse (or not different) by more than a margin Δ.', 'The CI of the difference against the margin; one-sided tests.', 'PRP was non-inferior (difference −1.2, 95% CI −3.9 to 1.5; margin −5).'],
    ['GEE and mixed models', 'Repeated measurements of the same patients (numeric, yes/no or counts).', 'Account for the correlation within patients; mixed models give patient-specific effects.', 'The odds of fever fell over time (OR per day 0.71, P < 0.001).'],
    ['Multiple imputation', 'Missing values replaced by several plausible values, results pooled (Rubin’s rules).', 'Assumes data missing at random given the variables in the model.', 'Results were similar with imputed data.'],
    ['Sample size and power', 'How many patients are needed to detect a chosen effect.', 'Effect size, variability, significance level (0.05) and power (80–90%), plus drop-out.', '64 patients per group detect a difference of 5 (SD 10) with 80% power.'],
    ['Bayes factors', 'Evidence for a difference (BF₁₀) or for no difference (BF₀₁).', 'BF > 3 moderate, > 10 strong evidence; check the prior sensitivity.', 'The data gave moderate evidence for no difference (BF₀₁ = 4.2).'],
    ['P values and confidence intervals', 'P: how surprising the data are if there were no difference; CI: the range of plausible effects.', 'Report the effect with its 95% CI, not only P; P > 0.05 is not proof of no difference.', 'MD 3.1 (95% CI 0.4 to 5.8), P = 0.03.']];
  function help() { const p = panel('tlHelpP', 'Help centre', `<input type="search" id="hlQ" placeholder="Search, e.g. survival, kappa, small samples…" style="width:100%"><div id="hlList"></div>`, true);
    const draw = () => { const q = $('#hlQ').value.trim().toLowerCase().split(/\s+/).filter(Boolean), list = GUIDE.filter(g => q.every(w => g.join(' ').toLowerCase().includes(w)));
      $('#hlList').innerHTML = list.map(([n, w, a, ex]) => `<details class="tl-guide"><summary><b>${esc(n)}</b> — ${esc(w)}</summary><p><b>Check:</b> ${esc(a)}</p><p><b>Reported as:</b> <i>${esc(ex)}</i></p></details>`).join('') || '<p class="legend-note">Nothing found.</p>'; };
    $('#hlQ').oninput = draw; draw(); $('#hlQ').focus(); void p; }

  /* ---------- 34. batch reports: other files, or each level of a column (e.g. centre) ---------- */
  function batch() { const st = S(); if (!st.cfg || !st.result) { U.toast('Set up the analysis and run the report (step 12) first; the batch uses this setup'); return; }
    const cols = st.data.headers.filter(h => { const n = new Set(st.data.rows.map(r => r[h]).filter(v => !U.isMissing(v))).size; return n >= 2 && n <= 30 && h !== st.cfg.groupCol; });
    const p = panel('tlBatchP', 'Batch reports', `<p class="legend-note">The current setup (variables, tests, options, analyses) is run again for each part and a Word file is saved for each.</p>
      <h4>Each level of a column</h4><div class="row" style="gap:6px"><select id="btCol">${cols.map(h => `<option>${esc(h)}</option>`).join('')}</select><button class="btn primary small" type="button" id="btGo">One report per level</button></div>
      <h4>Other files with the same columns</h4><div class="row" style="gap:6px"><button class="btn primary small" type="button" id="btFiles">Choose files…</button><input type="file" id="btFileIn" accept=".xlsx,.xls,.csv" multiple hidden></div><div id="btOut" class="legend-note" style="margin-top:8px"></div>`);
    const out = t => { $('#btOut').innerHTML += esc(t) + '<br>'; };
    const runOne = async (data, name) => { const keep = { data: st.data, file: st.file, result: st.result }; st.data = data; st.file = name; st.result = null;
      try { U.runAnalysis(); const t0 = Date.now(); while (!st.result && Date.now() - t0 < 180000) await new Promise(r => setTimeout(r, 300)); if (!st.result) throw new Error('timed out');
        await new Promise(r => setTimeout(r, 400)); $('#btnDocx').click(); await new Promise(r => setTimeout(r, 2500)); out(`✓ ${name}: ${data.rows.length} patients, ${st.result.sections.length} tables`); }
      catch (err) { out(`✕ ${name}: ${err.message}`); } finally { Object.assign(st, keep); } };
    const finish = () => { U.runAnalysis(); U.toast('Batch finished — the current data are back'); };
    $('#btGo').onclick = async () => { const col = $('#btCol').value, lv = [...new Set(st.data.rows.map(r => r[col]).filter(v => !U.isMissing(v)).map(String))]; if (S().step !== 12) U.go(12);
      for (const l of lv) await runOne({ headers: st.data.headers, rows: st.data.rows.filter(r => String(r[col]) === l) }, `${String(st.file || 'data').replace(/\.[^.]+$/, '')} - ${col} ${l}.xlsx`); finish(); };
    $('#btFiles').onclick = () => $('#btFileIn').click();
    $('#btFileIn').onchange = async e => { const fs = [...e.target.files]; e.target.value = ''; if (S().step !== 12) U.go(12);
      for (const f of fs) { try { const wb = XLSX.read(await f.arrayBuffer(), { type: 'array' }), aoa = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: null, raw: true, blankrows: false }), hd = aoa[0].map((h, i) => h === null || h === '' ? `Column_${i + 1}` : String(h).trim());
          const missing = st.data.headers.filter(h => !hd.includes(h) && st.cfg.variables.some(v => v.include && v.cols.some(c => c.col === h))); if (missing.length) { out(`✕ ${f.name}: missing column${missing.length > 1 ? 's' : ''} ${missing.slice(0, 5).join(', ')}`); continue; }
          await runOne({ headers: hd, rows: aoa.slice(1).filter(r => r.some(v => v !== null && String(v).trim() !== '')).map(r => Object.fromEntries(hd.map((h, i) => [h, r[i] ?? null]))) }, f.name); } catch (err) { out(`✕ ${f.name}: ${err.message}`); } }
      finish(); }; void p; }

  /* ---------- 37. reproducibility package: data and R / Python code for the tests of each variable ---------- */
  function reproPackage() { const st = S(); if (!st.cfg) return; let x = null; try { x = Analysis.explore(st.data, { ...st.cfg, options: U.effOptions() }, {}); } catch (e) { U.toast('The analysis could not be prepared'); return; }
    const cfg = st.cfg, gcol = cfg.groupCol, groups = U.activeGroups(), safe = h => h.replace(/[^A-Za-z0-9_]/g, '_').replace(/^(\d)/, 'X$1'), headers = st.data.headers, nm = new Map(headers.map(h => [h, safe(h)]));
    const csv = [headers.map(h => nm.get(h)).join(','), ...st.data.rows.map(r => headers.map(h => { const v = r[h]; if (U.isMissing(v)) return ''; const s2 = String(v); return /[",\n]/.test(s2) ? `"${s2.replace(/"/g, '""')}"` : s2; }).join(','))].join('\n');
    const G = nm.get(gcol), keep = groups.map(g => JSON.stringify(String(g))).join(', '), rL = [], pyL = [];
    rL.push('# Reproduces the tests of each variable of the Prof MSE Easy Stat report', '# Packages: base R only', 'd <- read.csv("data.csv", stringsAsFactors = FALSE)', `d <- d[d$${G} %in% c(${keep}), ]`, `d$${G} <- factor(d$${G}, levels = c(${keep}))`, `alpha <- ${cfg.options.alpha}`, '');
    pyL.push('# Reproduces the tests of each variable of the Prof MSE Easy Stat report', '# Packages: pandas, scipy', 'import pandas as pd', 'from scipy import stats', 'd = pd.read_csv("data.csv")', `d = d[d["${G}"].astype(str).isin([${keep}])]`, `groups = [${keep}]`, '');
    x.items.filter(it => it.kind !== 'repeated').forEach(it => { const c = nm.get(it.cols[0].col); if (!c) return; const t = String(it.test || '').toLowerCase(); rL.push(`# ${it.label}: ${it.test || 'no test'} (report P ${isFinite(it.p) ? Analysis.fmtP(it.p, cfg.options.alpha) : '—'})`);
      pyL.push(`# ${it.label}: ${it.test || 'no test'} (report P ${isFinite(it.p) ? Analysis.fmtP(it.p, cfg.options.alpha) : '—'})`); const gv = `[d.loc[d["${G}"].astype(str) == g, "${c}"].dropna() for g in groups]`;
      if (/welch.*anova/.test(t)) { rL.push(`print(oneway.test(${c} ~ ${G}, data = d, var.equal = FALSE))`); pyL.push(`# Welch's ANOVA: use pingouin.welch_anova(d, dv="${c}", between="${G}")`); }
      else if (/welch/.test(t)) { rL.push(`print(t.test(${c} ~ ${G}, data = d, var.equal = FALSE))`); pyL.push(`print(stats.ttest_ind(*${gv}, equal_var=False))`); }
      else if (/t-test/.test(t)) { rL.push(`print(t.test(${c} ~ ${G}, data = d, var.equal = TRUE))`); pyL.push(`print(stats.ttest_ind(*${gv}, equal_var=True))`); }
      else if (/mann/.test(t)) { rL.push(`print(wilcox.test(${c} ~ ${G}, data = d, exact = FALSE, correct = FALSE))`); pyL.push(`print(stats.mannwhitneyu(*${gv}, alternative="two-sided", method="asymptotic", use_continuity=False))`); }
      else if (/anova/.test(t)) { rL.push(`print(summary(aov(${c} ~ ${G}, data = d)))`); pyL.push(`print(stats.f_oneway(*${gv}))`); }
      else if (/kruskal/.test(t)) { rL.push(`print(kruskal.test(${c} ~ ${G}, data = d))`); pyL.push(`print(stats.kruskal(*${gv}))`); }
      else if (/fisher/.test(t)) { rL.push(`print(fisher.test(table(d$${c}, d$${G})))`); pyL.push(`tab = pd.crosstab(d["${c}"], d["${G}"]); print(stats.fisher_exact(tab) if tab.shape == (2, 2) else "Fisher-Freeman-Halton: use R fisher.test")`); }
      else if (/chi/.test(t)) { rL.push(`print(chisq.test(table(d$${c}, d$${G}), correct = FALSE))`); pyL.push(`print(stats.chi2_contingency(pd.crosstab(d["${c}"], d["${G}"]), correction=False))`); }
      else { rL.push('# (no matching base test — see the report)'); pyL.push('# (no matching base test — see the report)'); }
      rL.push(''); pyL.push(''); });
    rL.push('# Repeated measures, regression and the other advanced analyses are listed in the report; their settings are in setup.json.'); pyL.push('# Repeated measures and the advanced analyses: see the report and setup.json.');
    const readme = `Reproducibility package — ${cfg.study.title || 'study'}\nMade ${new Date().toISOString().slice(0, 10)} with Prof MSE Easy Stat.\n\ndata.csv      the data (column names made R-safe)\nanalysis.R    the test of each variable in base R\nanalysis.py   the same with scipy\nsetup.json    every setting of the analysis\n\nSmall differences can arise from ties, continuity corrections or exact versus asymptotic P values; the report states the method used.\n`;
    const z = XLSX.CFB.utils.cfb_new(), add = (p2, t) => XLSX.CFB.utils.cfb_add(z, p2, new TextEncoder().encode(t));
    add('README.txt', readme); add('data.csv', csv); add('analysis.R', rL.join('\n')); add('analysis.py', pyL.join('\n')); add('setup.json', JSON.stringify({ app: 'ProfMSE-EasyStat', cfg }, null, 1));
    U.saveUrl(URL.createObjectURL(new Blob([XLSX.CFB.write(z, { fileType: 'zip', type: 'array' })], { type: 'application/zip' })), `${U.baseName()} - reproducibility package.zip`); U.toast('Reproducibility package saved (data, R and Python code, settings)'); }

  /* ---------- 38. audit log as a PDF ---------- */
  async function auditPdf() { const st = S(), items = [...(st.cleanLog || []).map(c => ({ time: c.time, kind: 'Data', what: c.what })), ...audit()];
    if (!items.length) { U.toast('Nothing recorded yet'); return; } items.sort((a, b) => new Date(a.time) - new Date(b.time));
    const W = 1240, H = 1754, M = 90, lines = [['h', `Audit log — ${st.cfg ? st.cfg.study.title || st.file || 'project' : 'project'}`], ['s', `Made ${new Date().toLocaleString()} · ${items.length} entries · data file: ${st.file || '—'}`], ['s', '']];
    items.forEach(it => lines.push(['r', `${it.time}  [${it.kind}]  ${it.what}`]));
    const pages = []; let c = null, x = null, y = 0; const page = () => { if (c) pages.push(c); c = document.createElement('canvas'); c.width = W; c.height = H; x = c.getContext('2d'); x.fillStyle = '#fff'; x.fillRect(0, 0, W, H); y = M; };
    const wrapLines = (t, w) => { const ws = t.split(' '), out = []; let l = ''; ws.forEach(wd => { const tt = l ? l + ' ' + wd : wd; if (x.measureText(tt).width > w && l) { out.push(l); l = wd; } else l = tt; }); if (l) out.push(l); return out; };
    page(); lines.forEach(([k, t]) => { x.font = k === 'h' ? '700 34px Arial' : k === 's' ? '400 22px Arial' : '400 21px Arial'; x.fillStyle = k === 's' ? '#555' : '#111'; const ls2 = wrapLines(t, W - 2 * M);
      ls2.forEach(l => { if (y > H - M) { page(); x.font = '400 21px Arial'; x.fillStyle = '#111'; } x.fillText(l, M, y); y += k === 'h' ? 50 : 30; }); y += k === 'r' ? 6 : 10; });
    pages.push(c); const bytes = await Promise.all(pages.map((pg, i) => new Promise(ok => pg.toBlob(b => b.arrayBuffer().then(ab => { const ctx2 = pg.getContext('2d'); ctx2.font = '400 18px Arial'; ok({ w: W, h: H, bytes: new Uint8Array(ab) }); }), 'image/jpeg', 0.9))));
    U.saveUrl(URL.createObjectURL(U.pdfFromJpegs(bytes, 'Audit log')), `${U.baseName()} - audit log.pdf`); U.toast(`Audit log saved (${items.length} entries, ${pages.length} page${pages.length > 1 ? 's' : ''})`); }

  /* ---------- report bar: explain mode, consistency check, reproducibility ---------- */
  function addReportTools() { const bar = $('#uxRepBar'); if (!bar || $('#tlExplain')) return;
    const mk = (id, l, t, fn) => { const b = document.createElement('button'); b.className = 'btn ghost small'; b.type = 'button'; b.id = id; b.title = t; b.innerHTML = l; b.onclick = fn; bar.appendChild(b); };
    mk('tlExplain', '❓ Explain mode', 'Click any number of a table to see what it is and how it was calculated', () => { document.documentElement.classList.toggle('tl-explain'); U.toast(document.documentElement.classList.contains('tl-explain') ? 'Explain mode: click a number in a table' : 'Explain mode off'); });
    mk('tlCons', '🔢 Consistency', 'Numbers that appear in several places (flowchart, tables, abstract, comments) checked against each other', consistency);
    mk('tlRepro', '📦 Reproducibility', 'Data, R and Python code and the settings in one zip', reproPackage); }
  addReportTools();

  /* ---------- 33. explain my result ---------- */
  document.addEventListener('click', e => { if (!document.documentElement.classList.contains('tl-explain')) return; const td = e.target.closest('#report table.rt td'); if (!td) return; e.preventDefault();
    const tr = td.parentNode, tbl = td.closest('table'), rc = td.getBoundingClientRect(), mid = (rc.left + rc.right) / 2;
    // the column heading over this cell (works with merged heading cells): the lowest heading cell spanning its centre
    const ths = [...tbl.querySelectorAll('thead th')].filter(h => { const b2 = h.getBoundingClientRect(); return b2.left <= mid && b2.right >= mid; }), head = ths.length ? ths[ths.length - 1].textContent.trim() : '';
    // the row label: the first cell of this row, or of the row above it that spans down
    const firstCellLeft = tbl.querySelector('tbody td') ? tbl.querySelector('tbody td').getBoundingClientRect().left : 0, rowCell = [...tbl.querySelectorAll('tbody td')].filter(c => { const b2 = c.getBoundingClientRect(); return Math.abs(b2.left - firstCellLeft) < 2 && b2.top <= rc.top + 1 && b2.bottom >= rc.bottom - 1; }).pop();
    const row = (rowCell || tr.children[0] || {}).textContent.trim(), v = td.textContent.trim();
    const sec = td.closest('.report-sec'), foot = sec ? (sec.querySelector('.foot, .rt-foot, .legend-note') || {}).textContent || '' : '', gm = /\(n\s*=\s*(\d+)\)/.exec(head);
    let what = '';
    if (/^[<≤=]?\s*0?\.\d+\*?$|^<\s?0\.0+1\*?$/.test(v) && /\bP\b|P value|p-value/i.test(head)) { const p = parseFloat(v.replace(/[^\d.]/g, '')); what = `<b>P value</b> of the comparison of ${esc(row)} between the groups. If there were truly no difference, data at least this different would occur ${p ? `about ${p < 0.001 ? 'less than 1 in 1000' : `${(p * 100).toFixed(p < 0.01 ? 1 : 0)}% of the time`}` : 'rarely'}. ${/\*/.test(v) ? 'The star marks P ≤ the significance level.' : ''}<br><span class="legend-note">The test used for this row is named in the table footnote${foot ? `: ${esc(foot.slice(0, 160))}…` : '.'}</span>`; }
    else if (/±/.test(v)) { const [m, s2] = v.split('±').map(t => parseFloat(t)); what = `<b>Mean ± standard deviation</b> of ${esc(row)} in ${esc(head.replace(/\s*\(n.*$/, '') || 'this column')}${gm ? ` (${gm[1]} patients)` : ''}: the average is ${m}; about two thirds of the patients lie between ${(m - s2).toFixed(2)} and ${(m + s2).toFixed(2)} if the data are roughly normal.`; }
    else if (/^-?[\d.]+\s*\(\s*-?[\d.]+\s*[–-]\s*-?[\d.]+\s*\)$/.test(v) || /IQR/i.test(foot) && /\(.*[–-].*\)/.test(v)) { const n = v.match(/-?[\d.]+/g); what = `<b>Median (interquartile range)</b> of ${esc(row)}: half of the patients are below ${n[0]}; the middle half lie between ${n[1]} and ${n[2]}. Used for skewed data.`; }
    else if (/^\d+\s*\(\s*[\d.]+\s*%?\)$/.test(v)) { const n = v.match(/[\d.]+/g); what = `<b>Number (percentage)</b>: ${n[0]} patients${gm ? ` of ${gm[1]} in ${esc(head.replace(/\s*\(n.*$/, ''))}` : ''} (${n[1]}%) have ${esc(row)}.`; }
    else if (/OR|RR|HR|MD|CI|B \(/.test(head) || /\(\s*-?[\d.]+\s*(to|–|-)\s*-?[\d.]+\s*\)/.test(v)) what = `<b>${esc(head || 'Effect')}</b>: the estimate with its 95% confidence interval — the range of effects compatible with the data. ${/OR|RR|HR/.test(head) ? 'A ratio: 1 means no difference; an interval excluding 1 is significant.' : 'A difference: 0 means no difference; an interval excluding 0 is significant.'}`;
    else what = `<b>${esc(head || 'Value')}</b> of ${esc(row)}: ${esc(v)}.`;
    const r = td.getBoundingClientRect(), tip = panel('tlExpP', 'What this number is', `<p><b>${esc(v)}</b> — ${esc(row)}${head ? ` · ${esc(head)}` : ''}</p><p>${what}</p>`); tip.style.top = Math.min(innerHeight - 260, r.bottom + 8) + 'px'; }, true);

  /* ---------- 40. consistency check ---------- */
  function consistency() { const st = S(), r = st.result; if (!r) return; U.syncEdits(); const out = [], ok = [], cfg = st.cfg;
    // 1. group sizes: flowchart analysed n against the n in the table headings
    const heads = r.sections.flatMap(s => s.head.map(h => typeof h === 'string' ? h : h.t || '')).join(' | ');
    if (cfg.consort && cfg.consort.enabled !== false && cfg.consort.groups) U.activeGroups().forEach((g, i) => { const G = cfg.consort.groups[i]; if (!G) return; const lab = cfg.groupLabels[g] || g, re = new RegExp(`${lab.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\(n\\s*=\\s*(\\d+)\\)`, 'g'), ns = [...heads.matchAll(re)].map(m => +m[1]);
      const an = +G.analysed || 0; if (ns.length && ns.some(n => n !== an)) out.push(`${lab}: the flowchart says ${an} analysed, the tables show n = ${[...new Set(ns)].join(', ')}`); else if (ns.length) ok.push(`${lab}: n = ${an} in the flowchart and the tables`); });
    // 2. numbers in each comment that do not appear in its table
    const num = t => (String(t).match(/(?<![\w.])-?\d+(?:\.\d+)?(?![\w.])/g) || []).filter(x => !/^\d$/.test(x) && !/^(19|20)\d\d$/.test(x)), tblNums = s => new Set(num([...s.rows.flatMap(row => row.map(cellText)), ...s.head.map(h => typeof h === 'string' ? h : h.t || ''), s.footnote].join(' ')));
    r.sections.forEach(s => { if (!s.comment) return; const tn = tblNums(s), miss = [...new Set(num(s.comment))].filter(n => !tn.has(n) && !tn.has(String(+n)) && !(+n >= 0.95 && +n <= 0.95)); if (miss.length) out.push(`“${s.title}”: the comment has ${miss.slice(0, 6).join(', ')}${miss.length > 6 ? ' …' : ''}, not found in its table`); });
    // 3. the summary, abstract, discussion and conclusion against every table
    const all = new Set(r.sections.flatMap(s => [...tblNums(s)]));
    [['Summary', r.summary], ['Abstract results', r.abstract], ['Results text', r.narrative], ['Discussion', r.discussion], ['Conclusion', r.conclusion]].forEach(([k, t]) => { if (!t) return; const miss = [...new Set(num(t))].filter(n => !all.has(n) && !all.has(String(+n))); if (miss.length) out.push(`${k}: ${miss.slice(0, 6).join(', ')} not found in any table`); else ok.push(`${k}: every number is in a table`); });
    panel('tlConsP', 'Consistency check', `${out.length ? `<h4>To check (${out.length})</h4><ul>${out.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : '<p>✅ No mismatch found.</p>'}${ok.length ? `<h4>Consistent</h4><ul>${ok.map(t => `<li>${esc(t)}</li>`).join('')}</ul>` : ''}<p class="legend-note">Numbers may differ legitimately (e.g. rounding, the significance level, a cut-off or a time point named in the text); look at each before changing it.</p>`, true); }
})();

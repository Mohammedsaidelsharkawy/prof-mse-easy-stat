/* Prof MSE Easy Stat — more data preparation: visit windows, reshape previews, age from the date of birth,
   reference-range checks and the coding assistant for free-text answers. Works through window.EasyUI. */
(() => {
  const U = window.EasyUI; if (!U) return;
  const S = () => U.state, $ = s => document.querySelector(s), esc = U.esc, miss = v => U.isMissing(v);
  const opts = (sel = '') => S().data.headers.map(h => `<option ${h === sel ? 'selected' : ''}>${esc(h)}</option>`).join('');
  const days = d => d ? Date.parse(d + 'T00:00:00Z') / 864e5 : NaN, num = v => typeof v === 'number' ? v : +String(v).replace(',', '.');
  const tbl = (head, rows) => `<div style="overflow:auto;max-height:260px"><table class="t"><thead><tr>${head.map(h => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${rows.map(r => `<tr>${r.map(c => `<td>${esc(c ?? '')}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

  // a card of its own in "Prepare the data"
  const home = document.querySelector('#p1 .prep-card.wide:last-of-type') || document.querySelector('#p1 .prep-card');
  if (!home) return;
  const card = document.createElement('div'); card.className = 'prep-card wide'; card.id = 'prepMore';
  card.innerHTML = `<h4>More data tools</h4>
    <details class="pm"><summary><b>Visit windows</b> — turn visit dates or days into named visits (e.g. Day 7 ± 2)</summary>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><div><label class="f">Patient ID</label><select id="vwId"></select></div><div><label class="f">Visit date or day number</label><select id="vwCol"></select></div>
        <div><label class="f">Day 0 is</label><select id="vwBase"><option value="first">Each patient's first visit</option></select></div><div><label class="f">Target days</label><input type="text" id="vwDays" value="0, 7, 14, 28" style="width:140px"></div>
        <div><label class="f">± days</label><input type="number" id="vwTol" value="2" min="0" style="width:70px"></div><button class="btn ghost small" type="button" id="vwPrev">Preview</button><button class="btn primary small" type="button" id="vwGo">Add “Visit” column</button></div><div id="vwOut"></div></details>
    <details class="pm"><summary><b>Reshape preview</b> — see the first rows before changing the sheet (wide ↔ long)</summary>
      <p class="legend-note">Open ⇄ Wide to long or ⇄ Long to wide under the sheet: the preview below follows their settings.</p><div class="row" style="gap:6px"><button class="btn ghost small" type="button" id="rpLong">Preview wide → long</button><button class="btn ghost small" type="button" id="rpWide">Preview long → wide</button></div><div id="rpOut"></div></details>
    <details class="pm"><summary><b>Age from the date of birth</b> — completed years at a visit date or today</summary>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><div><label class="f">Date of birth</label><select id="agDob"></select></div><div><label class="f">At</label><select id="agAt"><option value="__today">Today</option></select></div>
        <div><label class="f">Dates written as</label><select id="agOrder"><option value="dmy">day/month/year</option><option value="mdy">month/day/year</option><option value="ymd">year-month-day</option></select></div><button class="btn primary small" type="button" id="agGo">Add “Age_years”</button></div><p class="legend-note" id="agInfo">Days between any two dates: use Dates above.</p></details>
    <details class="pm"><summary><b>Reference ranges</b> — values outside adult limits or physically impossible</summary>
      <p class="legend-note">Columns are matched by name (age, SBP, DBP, heart rate, temperature, SpO2, BMI, weight, height, Hb, WBC, platelets, glucose, HbA1c, creatinine, urea, sodium, potassium, albumin, bilirubin, ALT, AST, CRP, INR). Impossible values are almost certainly errors; values outside the usual range are worth a look.</p>
      <button class="btn ghost small" type="button" id="rrGo">Check the columns</button><div id="rrOut"></div></details>
    <details class="pm"><summary><b>Coding assistant</b> — group free-text answers that mean the same (HTN, hypertension, high BP)</summary>
      <div class="row" style="gap:8px;flex-wrap:wrap;align-items:flex-end"><div><label class="f">Text column</label><select id="caCol"></select></div><label class="check" style="margin:0 0 6px"><input type="checkbox" id="caSplit"><span>Several answers per cell (split at , ; / +)</span></label><button class="btn ghost small" type="button" id="caGo">Suggest groups</button></div><div id="caOut"></div></details>`;
  home.parentNode.insertBefore(card, home.nextSibling);
  const fill = () => { if (!S().data) return; const c = S().cfg; $('#vwId').innerHTML = opts(c && c.idCols[0]); $('#vwCol').innerHTML = opts(); $('#vwBase').innerHTML = '<option value="first">Each patient\'s first visit</option>' + opts().replace(/<option /g, '<option data-col="1" ');
    $('#agDob').innerHTML = opts(S().data.headers.find(h => /dob|birth/i.test(h))); $('#agAt').innerHTML = '<option value="__today">Today</option>' + opts(); $('#caCol').innerHTML = S().data.headers.filter(h => S().data.rows.some(r => typeof r[h] === 'string' && isNaN(+r[h]))).map(h => `<option>${esc(h)}</option>`).join(''); };
  card.addEventListener('toggle', fill, true); const prev = $('#preview'); if (prev) new MutationObserver(() => { if (card.querySelector('details[open]')) return; fill(); }).observe(prev, { childList: true });

  /* ---------- 11. visit windows ---------- */
  function windows() {
    const id = $('#vwId').value, col = $('#vwCol').value, base = $('#vwBase').value, tol = +$('#vwTol').value || 0, targets = $('#vwDays').value.split(/[,;\s]+/).map(Number).filter(isFinite).sort((a, b) => a - b), rows = S().data.rows;
    const asDay = v => { const n = num(v); if (typeof v === 'number' && v < 60) return n; const d = U.parseDate(v, 'dmy'); return d ? days(d) : (isFinite(n) ? n : NaN); };
    const isDate = rows.some(r => typeof r[col] === 'string' && U.parseDate(r[col], 'dmy')) || rows.some(r => typeof r[col] === 'number' && r[col] > 20000);
    const first = new Map(); if (base === 'first') rows.forEach(r => { const k = String(r[id] ?? ''), d = asDay(r[col]); if (isFinite(d) && (!first.has(k) || d < first.get(k))) first.set(k, d); });
    const out = rows.map(r => { const d = asDay(r[col]); if (!isFinite(d)) return { day: NaN, v: null }; const b = base === 'first' ? (isDate ? first.get(String(r[id] ?? '')) : 0) : asDay(r[base]); const day = d - (isFinite(b) ? b : 0);
      const t = targets.reduce((best, x) => Math.abs(day - x) <= tol && (best === null || Math.abs(day - x) < Math.abs(day - best)) ? x : best, null); return { day, v: t === null ? null : `Day ${t}` }; });
    return { out, targets, tol };
  }
  $('#vwPrev').onclick = () => { const { out, targets, tol } = windows(), c = {}; out.forEach(o => { const k = o.v || (isFinite(o.day) ? 'outside every window' : 'no date'); c[k] = (c[k] || 0) + 1; });
    $('#vwOut').innerHTML = tbl(['Visit', 'Rows'], [...targets.map(t => [`Day ${t} (${t - tol} to ${t + tol})`, c[`Day ${t}`] || 0]), ['Outside every window', c['outside every window'] || 0], ['No date / day', c['no date'] || 0]]); };
  $('#vwGo').onclick = () => { const { out } = windows(); let nm; U.editSheet(() => { nm = U.addColumn('Visit_window', out.map(o => o.v), $('#vwCol').value); }, 'Visit windows'); U.renderPrep(); U.toast(`“${nm}” added: ${out.filter(o => o.v).length} rows in a window`); };

  /* ---------- 12. reshape previews ---------- */
  $('#rpLong').onclick = () => { if (!$('#lgId') || !$('#lgId').options.length) { U.toast('Open ⇄ Wide to long under the sheet first'); $('#gridLong') && $('#gridLong').click(); return; }
    try { const L = U.longSheet(); $('#rpOut').innerHTML = `<p class="legend-note">${S().data.rows.length} rows → ${L.rows.length} rows, ${L.headers.length} columns. First 8 rows:</p>` + tbl(L.headers, L.rows.slice(0, 8).map(r => L.headers.map(h => r[h]))); } catch (e) { $('#rpOut').textContent = 'Choose the repeated variables in ⇄ Wide to long first.'; } };
  $('#rpWide').onclick = () => { if (!$('#rsId') || !$('#rsId').options.length) { U.toast('Open ⇄ Long to wide under the sheet first'); $('#gridReshape') && $('#gridReshape').click(); return; }
    const id = $('#rsId').value, time = $('#rsTime').value, vals = [...document.querySelectorAll('[data-rsv]:checked')].map(e => e.dataset.rsv), rows = S().data.rows; if (!vals.length || id === time) { $('#rpOut').textContent = 'Choose the ID, the visit column and the values first.'; return; }
    const times = [...new Set(rows.map(r => r[time]).filter(v => !miss(v)).map(String))], other = S().data.headers.filter(h => h !== id && h !== time && !vals.includes(h)), by = new Map();
    rows.forEach(r => { const k = String(r[id] ?? ''); if (!by.has(k)) by.set(k, { [id]: r[id], ...Object.fromEntries(other.map(h => [h, r[h]])) }); const o = by.get(k); vals.forEach(v => { o[`${v}_${r[time]}`] = r[v]; }); });
    const head = [id, ...other, ...vals.flatMap(v => times.map(t => `${v}_${t}`))], W = [...by.values()];
    $('#rpOut').innerHTML = `<p class="legend-note">${rows.length} rows → ${W.length} patients, ${head.length} columns (${vals.length} values × ${times.length} visits). First 8 rows:</p>` + tbl(head, W.slice(0, 8).map(r => head.map(h => r[h]))); };

  /* ---------- 13. age from the date of birth ---------- */
  $('#agGo').onclick = () => { const dob = $('#agDob').value, at = $('#agAt').value, ord = $('#agOrder').value, today = new Date().toISOString().slice(0, 10);
    const age = (a, b) => { if (!a || !b) return null; const [y1, m1, d1] = a.split('-').map(Number), [y2, m2, d2] = b.split('-').map(Number); let y = y2 - y1; if (m2 < m1 || (m2 === m1 && d2 < d1)) y--; return y >= 0 && y < 130 ? y : null; };
    const vals = S().data.rows.map(r => age(U.parseDate(r[dob], ord), at === '__today' ? today : U.parseDate(r[at], ord))); let nm;
    U.editSheet(() => { nm = U.addColumn('Age_years', vals, dob); }, 'Age from the date of birth'); U.renderPrep(); const ok = vals.filter(v => v !== null).length;
    $('#agInfo').textContent = `${nm}: ${ok} of ${vals.length} rows${ok < vals.length ? ` — ${vals.length - ok} without a valid date (check the date order)` : ''}.`; };

  /* ---------- 14. reference ranges ---------- */
  // [name pattern, usual low, usual high, impossible below, impossible above, unit note]
  const REF = [[/^age|age_?y/i, 18, 90, 0, 120, 'years'], [/sbp|systolic/i, 90, 140, 40, 300, 'mmHg'], [/dbp|diastolic/i, 60, 90, 20, 200, 'mmHg'], [/\bhr\b|heart.?rate|pulse/i, 50, 100, 20, 250, '/min'],
    [/temp/i, 36, 37.5, 30, 45, '°C'], [/spo2|sat/i, 94, 100, 40, 100, '%'], [/bmi/i, 18.5, 30, 10, 80, 'kg/m²'], [/weight|wt\b/i, 40, 120, 2, 350, 'kg'], [/height|ht\b/i, 145, 200, 40, 250, 'cm'],
    [/\bhb\b|haemoglobin|hemoglobin/i, 12, 17.5, 2, 25, 'g/dL'], [/wbc|leuco|leuko/i, 4, 11, 0.1, 200, '×10⁹/L'], [/plt|platelet/i, 150, 400, 1, 2000, '×10⁹/L'], [/glucose|fbs|rbs|fbg/i, 70, 140, 10, 2000, 'mg/dL'],
    [/hba1c|a1c/i, 4, 6.5, 2, 20, '%'], [/creat/i, 0.6, 1.3, 0.1, 25, 'mg/dL'], [/urea|bun/i, 7, 25, 1, 300, 'mg/dL'], [/\bna\b|sodium/i, 135, 145, 100, 190, 'mmol/L'], [/\bk\b|potassium/i, 3.5, 5.1, 1, 10, 'mmol/L'],
    [/album/i, 3.5, 5, 0.5, 7, 'g/dL'], [/bilirubin|tbil/i, 0.2, 1.2, 0, 50, 'mg/dL'], [/\balt\b|sgpt/i, 7, 56, 0, 10000, 'U/L'], [/\bast\b|sgot/i, 10, 40, 0, 10000, 'U/L'], [/crp/i, 0, 10, 0, 600, 'mg/L'], [/\binr\b/i, 0.8, 1.2, 0.5, 15, '']];
  $('#rrGo').onclick = () => { const rows = S().data.rows, out = [], flagged = { imp: [], out: [] };
    S().data.headers.forEach(h => { const ref = REF.find(([re]) => re.test(h)); if (!ref) return; const v = rows.map(r => miss(r[h]) ? NaN : num(r[h])); if (!v.some(isFinite)) return;
      const imp = v.map((x, i) => isFinite(x) && (x < ref[3] || x > ref[4]) ? i : -1).filter(i => i >= 0), outR = v.map((x, i) => isFinite(x) && (x < ref[1] || x > ref[2]) && !imp.includes(i) ? i : -1).filter(i => i >= 0);
      out.push({ h, ref, imp, outR }); flagged.imp.push(...imp.map(i => [i, h])); });
    $('#rrOut').innerHTML = out.length ? `<table class="t"><thead><tr><th>Column</th><th>Usual range</th><th>Impossible</th><th>Outside the usual range</th><th></th></tr></thead><tbody>${out.map((o, k) => `<tr><td class="b">${esc(o.h)}</td><td>${o.ref[1]}–${o.ref[2]} ${esc(o.ref[5])}</td><td style="${o.imp.length ? 'color:var(--bad);font-weight:700' : ''}">${o.imp.length}</td><td>${o.outR.length}</td><td>${o.imp.length + o.outR.length ? `<button class="btn ghost small" type="button" data-rrs="${k}">Show rows</button>` : ''}${o.imp.length ? ` <button class="btn ghost small" type="button" data-rrm="${k}">Impossible → missing</button>` : ''}</td></tr>`).join('')}</tbody></table><p class="legend-note">Check the units first (e.g. glucose in mmol/L, creatinine in µmol/L would all look “outside”).</p>` : '<p class="legend-note">No column matched a known measurement.</p>';
    $('#rrOut').onclick = e => { const s2 = e.target.closest('[data-rrs]'), m = e.target.closest('[data-rrm]'); if (s2) { const o = out[+s2.dataset.rrs]; U.showRows([...o.imp, ...o.outR].sort((a, b) => a - b), `${o.h}: outside the reference range`); $('#preview').scrollIntoView({ block: 'start' }); }
      if (m) { const o = out[+m.dataset.rrm]; U.editSheet(() => { o.imp.forEach(i => { rows[i][o.h] = null; }); }, `Impossible ${o.h} values set to missing`); U.toast(`${o.imp.length} impossible value${o.imp.length > 1 ? 's' : ''} of ${o.h} set to missing (Undo restores them)`); $('#rrGo').click(); } }; };

  /* ---------- 16. coding assistant ---------- */
  // common medical abbreviations and synonyms → one canonical name
  const SYN = [['Hypertension', /^(htn|hypertension|hypertensive|high (blood )?pressure|high bp|hbp|raised bp|elevated bp|ht)$/], ['Diabetes mellitus', /^(dm|t2dm|t1dm|dm2|dm ?type ?[12]|diabetes|diabetic|diabetes mellitus|sugar|niddm|iddm)$/],
    ['Ischaemic heart disease', /^(ihd|cad|chd|coronary( artery)? disease|ischa?emic heart disease|angina)$/], ['Myocardial infarction', /^(mi|ami|stemi|nstemi|heart attack|myocardial infarction)$/], ['Heart failure', /^(hf|chf|ccf|heart failure|cardiac failure|hfref|hfpef)$/],
    ['Atrial fibrillation', /^(af|afib|a ?fib|atrial fibrillation)$/], ['Stroke', /^(cva|stroke|tia|cerebrovascular( accident)?)$/], ['Chronic kidney disease', /^(ckd|crf|chronic kidney disease|chronic renal (failure|disease)|renal (failure|impairment))$/],
    ['COPD', /^(copd|coad|chronic obstructive( pulmonary disease)?|emphysema|chronic bronchitis)$/], ['Asthma', /^(asthma|ba|bronchial asthma)$/], ['Smoker', /^(smoker|smoking|current smoker|cigarettes?|yes smoker)$/],
    ['Dyslipidaemia', /^(dyslipid(a)?emia|hyperlipid(a)?emia|high cholesterol|hld|hypercholesterol(a)?emia)$/], ['Hypothyroidism', /^(hypothyroid(ism)?|low thyroid)$/], ['Cancer', /^(cancer|malignancy|ca|tumou?r|neoplasm)$/],
    ['Tuberculosis', /^(tb|tuberculosis|ptb)$/], ['Hepatitis C', /^(hcv|hepatitis c|hep c)$/], ['Hepatitis B', /^(hbv|hepatitis b|hep b)$/], ['None', /^(none|nil|no|nad|-|n\/a|na|not known|nkda)$/]];
  const norm = t => String(t).toLowerCase().replace(/[._]/g, ' ').replace(/[^a-z0-9 /+]/g, '').replace(/\s+/g, ' ').trim();
  const lev = (a, b) => { if (Math.abs(a.length - b.length) > 3) return 9; const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...new Array(b.length).fill(0)]); for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)); return d[a.length][b.length]; };
  $('#caGo').onclick = () => { const col = $('#caCol').value, split = $('#caSplit').checked; if (!col) return; const cnt = new Map();
    S().data.rows.forEach(r => { if (miss(r[col])) return; (split ? String(r[col]).split(/[,;/+]| and /i) : [String(r[col])]).map(x => x.trim()).filter(Boolean).forEach(x => cnt.set(x, (cnt.get(x) || 0) + 1)); });
    // canonical groups from the synonym list, then spelling variants (edit distance ≤ 2 for longer words) of the most common spelling
    const groups = new Map(), placed = new Set(); [...cnt.keys()].forEach(v => { const s2 = SYN.find(([, re]) => re.test(norm(v))); if (s2) { if (!groups.has(s2[0])) groups.set(s2[0], []); groups.get(s2[0]).push(v); placed.add(v); } });
    // misspellings of an answer already in a synonym group join that group (edit distance ≤ 1, or ≤ 2 for long words)
    const near = (x, y) => { const a2 = norm(x), b2 = norm(y); return a2.length > 4 && lev(a2, b2) <= (a2.length > 8 ? 2 : 1); };
    [...cnt.keys()].filter(v => !placed.has(v)).forEach(v => { const g = [...groups.entries()].find(([, vs]) => vs.some(w => near(v, w))); if (g) { g[1].push(v); placed.add(v); } });
    const rest = [...cnt.keys()].filter(v => !placed.has(v)).sort((a, b) => cnt.get(b) - cnt.get(a));
    rest.forEach(v => { if (placed.has(v)) return; const n = norm(v), mates = rest.filter(w => !placed.has(w) && w !== v && (norm(w) === n || (n.length > 4 && lev(norm(w), n) <= (n.length > 8 ? 2 : 1)))); if (!mates.length) return; groups.set(v.trim(), [v, ...mates]); [v, ...mates].forEach(x => placed.add(x)); });
    const G = [...groups.entries()].filter(([k, vs]) => vs.length > 1 || vs[0] !== k);
    $('#caOut').innerHTML = G.length ? `<table class="t"><thead><tr><th></th><th>Written as (patients)</th><th>Code as</th></tr></thead><tbody>${G.map(([k, vs], i) => `<tr><td><input type="checkbox" data-cag="${i}" checked></td><td>${vs.map(v => `${esc(v)} (${cnt.get(v)})`).join(', ')}</td><td><input type="text" data-can="${i}" value="${esc(k)}"></td></tr>`).join('')}</tbody></table>
      <button class="btn primary small" type="button" id="caApply">Recode the ticked groups${split ? '' : ''}</button> <span class="legend-note">${cnt.size} different answers; ${split ? 'each answer in a cell is recoded, the cell keeps its other answers' : 'whole cells are recoded'}.</span>` : '<p class="legend-note">No answers that mean the same were found.</p>';
    const btn = $('#caApply'); if (btn) btn.onclick = () => { const map = new Map(); G.forEach(([, vs], i) => { if (!$(`[data-cag="${i}"]`).checked) return; const to = $(`[data-can="${i}"]`).value.trim(); vs.forEach(v => map.set(v, to)); }); let n = 0;
      U.editSheet(() => S().data.rows.forEach(r => { if (miss(r[col])) return; const s0 = String(r[col]); const nv = split ? [...new Set(s0.split(/\s*[,;/+]\s*|\s+and\s+/i).map(x => x.trim()).filter(Boolean).map(x => map.get(x) || x))].join(', ') : (map.get(s0.trim()) || s0);
        if (nv !== s0) { r[col] = nv; n++; } }), `Free-text answers of ${col} grouped`); U.toast(`${n} cell${n === 1 ? '' : 's'} recoded (Undo restores them)`); $('#caGo').click(); }; };
})();

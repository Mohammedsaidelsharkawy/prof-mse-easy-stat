/* Prof Easy Stat — round 20: options for ⬇ Blank template (design, timepoints, patients, guide and codes sheets, Excel or CSV). */
(function () {
  'use strict';
  const $ = s => document.querySelector(s), esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const LS = { get(k, d) { try { const v = localStorage.getItem('r20.' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem('r20.' + k, JSON.stringify(v)); } catch (e) { /* none */ } } };
  const DESIGNS = {
    rct2: { name: 'Two-group trial / comparison', groups: ['A', 'B'], base: ['Age', 'Sex', 'Weight', 'Height', 'BMI', 'Diabetes', 'Hypertension'], rep: 'VAS', tps: 'Baseline, W1, M3, M6', end: ['Complications', 'Satisfaction'] },
    rct3: { name: 'Three-group trial', groups: ['A', 'B', 'C'], base: ['Age', 'Sex', 'Weight', 'ASA'], rep: 'Pain', tps: 'Baseline, 6h, 12h, 24h', end: ['Rescue_analgesia', 'PONV'] },
    before: { name: 'One group, before and after', groups: [], base: ['Age', 'Sex', 'BMI'], rep: 'Score', tps: 'Before, After', end: ['Adverse_event'] },
    casecontrol: { name: 'Case-control study', groups: ['Case', 'Control'], base: ['Age', 'Sex', 'Residence', 'Smoking', 'Diabetes', 'Hypertension', 'BMI'], rep: '', tps: '', end: [] },
    cross: { name: 'Cross-sectional survey (one group)', groups: [], base: ['Age', 'Sex', 'Residence', 'Education', 'Occupation', 'Smoking', 'BMI', 'Diabetes', 'Hypertension'], rep: '', tps: '', end: [] },
    diag: { name: 'Diagnostic accuracy', groups: [], base: ['Age', 'Sex', 'Test_value', 'Test_result', 'Reference_standard'], rep: '', tps: '', end: [] },
    survival: { name: 'Survival / follow-up cohort', groups: ['Exposed', 'Not_exposed'], base: ['Age', 'Sex', 'Stage', 'Diabetes'], rep: '', tps: '', end: ['Follow_up_months', 'Death'] }
  };
  const CODES = { Sex: 'Male / Female', Diabetes: 'Yes / No', Hypertension: 'Yes / No', Smoking: 'Yes / No (or Never / Former / Current)', Residence: 'Urban / Rural', Education: 'e.g. Illiterate / Primary / Secondary / University', ASA: 'I / II / III', PONV: 'Yes / No',
    Complications: 'Yes / No', Satisfaction: 'e.g. 1–5', Adverse_event: 'Yes / No', Test_result: 'Positive / Negative', Reference_standard: 'Positive / Negative (the disease by the reference test)', Death: 'Yes / No (the event at the end of follow-up)', Follow_up_months: 'Months from the start to the event or the last visit',
    Stage: 'e.g. I / II / III / IV', Rescue_analgesia: 'Yes / No', Age: 'Years', Weight: 'kg', Height: 'cm', BMI: 'kg/m² (or leave empty: it can be calculated)' };
  const split = s => String(s || '').split(/[,;\n]/).map(x => x.trim().replace(/\s+/g, '_')).filter(Boolean);

  function dlg() {
    let d = $('#r20Tpl'); if (d) return d;
    d = document.createElement('dialog'); d.id = 'r20Tpl'; d.className = 'app-dlg'; document.body.append(d);
    d.addEventListener('change', e => { if (e.target.id === 'r20Des') fill(e.target.value); });
    d.addEventListener('click', e => { const b = e.target.closest('[data-r20]'); if (!b) return; if (b.dataset.r20 === 'go') make(); d.close(); });
    return d;
  }
  function fill(k) { const t = DESIGNS[k] || DESIGNS.rct2, d = $('#r20Tpl');
    d.querySelector('#r20Groups').value = t.groups.join(', '); d.querySelector('#r20Base').value = t.base.join(', '); d.querySelector('#r20Rep').value = t.rep; d.querySelector('#r20Tps').value = t.tps; d.querySelector('#r20End').value = t.end.join(', '); }
  function open() {
    const o = { design: 'rct2', n: 0, idPrefix: 'P', fillGroups: false, guide: true, codes: true, format: 'xlsx', ...LS.get('opts', {}) }, d = dlg();
    d.innerHTML = `<form method="dialog" onsubmit="return false"><h3>⬇ Blank template</h3><p class="legend-note" style="margin:0 0 8px">An empty Excel sheet laid out the way the app reads it. Change any of these; column names can be edited later in Excel.</p>
      <div class="grid g2" style="gap:8px">
        <div><label class="f">Study design</label><select id="r20Des">${Object.entries(DESIGNS).map(([k, t]) => `<option value="${k}" ${k === o.design ? 'selected' : ''}>${esc(t.name)}</option>`).join('')}</select></div>
        <div><label class="f">Groups (empty = one group)</label><input type="text" id="r20Groups"></div>
        <div style="grid-column:1/-1"><label class="f">Baseline columns (comma-separated)</label><input type="text" id="r20Base"></div>
        <div><label class="f">Repeated measure(s) (e.g. VAS, HbA1c)</label><input type="text" id="r20Rep"></div>
        <div><label class="f">Timepoints</label><input type="text" id="r20Tps" placeholder="e.g. Baseline, W1, M3"></div>
        <div style="grid-column:1/-1"><label class="f">Outcome columns at the end</label><input type="text" id="r20End"></div>
        <div><label class="f">Rows with IDs ready (0 = none)</label><input type="number" min="0" max="5000" id="r20N" value="${esc(o.n)}"></div>
        <div><label class="f">ID prefix</label><input type="text" id="r20Pre" value="${esc(o.idPrefix)}" style="max-width:90px"></div>
        <label class="chk" style="grid-column:1/-1"><input type="checkbox" id="r20Fill" ${o.fillGroups ? 'checked' : ''}> Fill the Group column in turn (A, B, A, B…)</label>
        <label class="chk"><input type="checkbox" id="r20Guide" ${o.guide ? 'checked' : ''}> Guide sheet (how to fill it)</label>
        <label class="chk"><input type="checkbox" id="r20Codes" ${o.codes ? 'checked' : ''}> Codes sheet (the values of each column)</label>
        <div><label class="f">File</label><select id="r20Fmt"><option value="xlsx" ${o.format === 'xlsx' ? 'selected' : ''}>Excel (.xlsx)</option><option value="csv" ${o.format === 'csv' ? 'selected' : ''}>CSV (.csv, the data sheet only)</option></select></div>
      </div>
      <div class="row" style="justify-content:flex-end;gap:6px;margin-top:12px"><button class="btn ghost" type="button" data-r20="x">Cancel</button><button class="btn primary" type="button" data-r20="go">⬇ Download</button></div></form>`;
    fill(o.design); const saved = LS.get('cols', null); if (saved && saved.design === o.design) ['Groups', 'Base', 'Rep', 'Tps', 'End'].forEach(k => { if (saved[k] !== undefined) d.querySelector('#r20' + k).value = saved[k]; });
    d.showModal();
  }
  function make() {
    const d = $('#r20Tpl'), v = id => d.querySelector('#r20' + id), design = v('Des').value, groups = split(v('Groups').value), base = split(v('Base').value), reps = split(v('Rep').value), tps = split(v('Tps').value), end = split(v('End').value);
    const n = Math.max(0, Math.min(5000, +v('N').value || 0)), pre = v('Pre').value.trim(), fillG = v('Fill').checked, guide = v('Guide').checked, codes = v('Codes').checked, fmt = v('Fmt').value;
    LS.set('opts', { design, n, idPrefix: pre, fillGroups: fillG, guide, codes, format: fmt }); LS.set('cols', { design, Groups: v('Groups').value, Base: v('Base').value, Rep: v('Rep').value, Tps: v('Tps').value, End: v('End').value });
    const head = ['ID', ...(groups.length ? ['Group'] : []), ...base, ...reps.flatMap(r => tps.length ? tps.map(t => `${r}_${t}`) : [r]), ...end];
    const width = String(Math.max(n, 1)).length < 3 ? 3 : String(n).length;
    const rows = Array.from({ length: n }, (_, i) => { const r = head.map(() => ''); r[0] = pre + String(i + 1).padStart(width, '0'); if (groups.length && fillG) r[1] = groups[i % groups.length]; return r; });
    const name = `Easy Stat template - ${DESIGNS[design] ? DESIGNS[design].name.replace(/[\\/:*?"<>|]/g, '-') : 'data'}`;
    if (fmt === 'csv') { const q = x => /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x; const blob = new Blob(['﻿' + [head, ...rows].map(r => r.map(q).join(',')).join('\r\n')], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); return; }
    const wb = XLSX.utils.book_new(), ws = XLSX.utils.aoa_to_sheet([head, ...rows]); ws['!cols'] = head.map(h => ({ wch: Math.max(8, h.length + 2) })); XLSX.utils.book_append_sheet(wb, ws, 'Data');
    if (guide) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['How to fill the Data sheet'], [],
      ['1', 'One row per patient, one column per variable. Keep the column names in the first row.'],
      ['2', groups.length ? `Group: the study group of each patient (${groups.join(' / ')}).` : 'One group: no Group column is needed (add one to compare groups).'],
      ['3', 'Numbers as numbers (54, not "54 years"); use a dot or a comma for decimals.'],
      ['4', 'Categories as words (Male / Female, Yes / No) or codes (1 / 2) — codes can be labelled in step 2 (1=Male, 2=Female).'],
      ['5', reps.length && tps.length ? `Repeated measures: one column per timepoint, e.g. ${reps[0]}_${tps[0]}, ${reps[0]}_${tps[1] || tps[0]}.` : 'Repeated measures: one column per timepoint with the timepoint in the name, e.g. VAS_Baseline, VAS_W1.'],
      ['6', 'Leave missing values empty (or use one code such as 999 and blank it in step 1 → Prepare the data).'],
      ['7', 'No merged cells, totals or notes below the data. Rename, add or delete columns as you need.']]), 'Guide');
    if (codes) XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['Column', 'Values / unit'], ...head.map(h => [h, h === 'ID' ? 'A unique code per patient' : h === 'Group' ? groups.join(' / ') : CODES[h] || CODES[h.replace(/_.*$/, '')] || (reps.some(r => h.startsWith(r + '_')) ? `The value of ${h.split('_')[0]} at ${h.split('_').slice(1).join(' ')}` : '')])]), 'Codes');
    XLSX.writeFile(wb, name + '.xlsx');
  }
  const b = $('#btnTemplate'); if (b) { b.onclick = open; b.textContent = '⬇ Blank template…'; b.title = 'An empty Excel sheet laid out the way the app reads it — choose the design, columns, timepoints and sheets'; }
  window.EasyR20 = { open, make, DESIGNS };
})();

/* Prof MSE Easy Stat — organisation: projects library and dashboard, tags, archive, dataset versions, analysis log, tasks,
   report profiles, templates, storage, hand-off checklist. The project's own items live in cfg.org, so they are saved with the project. */
(() => {
  const U = window.EasyUI, X = window.EasyUX2; if (!U || !X) return;
  const S = () => U.state, $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)], esc = U.esc, panel = X.panel, org = X.org, log = X.log;
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html !== undefined) e.innerHTML = html; return e; };
  const day = t => { const d = new Date(t); return isFinite(d) ? d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''; };
  const need = () => { if (!S().data) { U.toast('Open your data or a project first'); return false; } return true; };

  /* ---------- the library of projects in this browser (IndexedDB) ---------- */
  const DB = () => new Promise((res, rej) => { const r = indexedDB.open('mse-projects', 1); r.onupgradeneeded = () => r.result.createObjectStore('p', { keyPath: 'id' }); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  const tx = async (mode, fn) => { const db = await DB(); return new Promise((res, rej) => { const t = db.transaction('p', mode), st = t.objectStore('p'), out = fn(st); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); };
  const libAll = () => tx('readonly', st => st.getAll()), libPut = rec => tx('readwrite', st => st.put(rec)), libDel = id => tx('readwrite', st => st.delete(id)), libGet = id => tx('readonly', st => st.get(id));
  // a one-line summary of a project: phase, patients, the primary result, open tasks
  function summary() { const st = S(), cfg = st.cfg || {}, o = cfg.org || {}; let prim = '';
    try { if (st.result) { const t = U.abstractTable(), pv = cfg.variables.find(v => v.role === 'primary'), row = t.rows.find(r0 => pv && r0[0].startsWith(pv.label)) || t.rows[0]; if (row) prim = `${row[0]}: ${row.slice(-2).join(', P ')}`; } } catch (e) { /* none */ }
    const EB = window.EasyBuilder; return { phase: EB ? EB.phase : 'analyse', n: st.data ? st.data.rows.length : 0, prim, tasks: (o.tasks || []).filter(t => !t.done).length, ver: (o.dataVersion || {}).name || '', stage: X.checklistStage ? X.checklistStage() : '' }; }
  async function keepInLibrary(silent) { const j = U.projectObj(); if (!j) { U.toast('Nothing to keep yet'); return; } const id = S().libId || ('p' + Date.now().toString(36)); S().libId = id; const old = await libGet(id).catch(() => null);
    const name = (old && old.name) || (j.cfg && j.cfg.study && j.cfg.study.title) || String(j.file || 'Study').replace(/\.[^.]+$/, '');
    await libPut({ id, name, tags: old ? old.tags : [], archived: old ? old.archived : false, at: Date.now(), sum: summary(), json: j }); log('Kept in My projects'); if (!silent) U.toast(`“${name}” kept in My projects (this browser)`); }
  async function projects(showArch = false, tag = '') { let all = []; try { all = await libAll(); } catch (e) { U.toast('This browser does not allow keeping projects (private window?)'); return; }
    const tags = [...new Set(all.flatMap(p => p.tags || []))].sort(), list = all.filter(p => !!p.archived === showArch && (!tag || (p.tags || []).includes(tag))).sort((a, b) => b.at - a.at);
    const size = all.reduce((t, p) => t + JSON.stringify(p.json).length, 0);
    const card = p => `<div class="report-sec" style="margin:6px 0;padding:8px 10px"><div class="row" style="gap:6px;align-items:center"><b style="flex:1">${esc(p.name)}</b>${S().libId === p.id ? '<span class="chip ok">open now</span>' : ''}<span class="legend-note">${day(p.at)}</span></div>
      <div class="legend-note">${esc({ build: '🧱 Build', generate: '🎲 Generate', analyse: '📊 Analyse' }[p.sum.phase] || '📊 Analyse')} · ${p.sum.n} patients${p.sum.stage ? ` · ✅ ${esc(p.sum.stage)}` : ''}${p.sum.ver ? ` · data “${esc(p.sum.ver)}”` : ''}${p.sum.tasks ? ` · 📌 ${p.sum.tasks} open task${p.sum.tasks > 1 ? 's' : ''}` : ''}${p.sum.prim ? `<br>Primary: ${esc(p.sum.prim)}` : ''}</div>
      <div class="row" style="gap:6px;margin-top:4px;flex-wrap:wrap">${(p.tags || []).map(t => `<span class="chip">🏷 ${esc(t)}</span>`).join('')}<span class="spacer"></span><button class="btn primary small" type="button" data-lib="open" data-id="${p.id}">Open</button><button class="btn ghost small" type="button" data-lib="tag" data-id="${p.id}">🏷 Tags</button><button class="btn ghost small" type="button" data-lib="ren" data-id="${p.id}">✎</button><button class="btn ghost small" type="button" data-lib="arch" data-id="${p.id}">${p.archived ? '↩ Restore' : '🗄 Archive'}</button><button class="btn ghost small" type="button" data-lib="file" data-id="${p.id}" title="Download the project file">⬇</button><button class="btn ghost small" type="button" data-lib="del" data-id="${p.id}">🗑</button></div></div>`;
    const p = panel('orgProj', '📁 My projects', `<div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn primary small" type="button" data-lib="keep">💾 Keep the open project here</button><button class="btn ghost small" type="button" data-lib="arch0">${showArch ? '← Active projects' : '🗄 Archive'}</button>
        <select data-lib="tagf" style="width:auto"><option value="">All tags</option>${tags.map(t => `<option ${t === tag ? 'selected' : ''}>${esc(t)}</option>`).join('')}</select><span class="legend-note">${all.length} project${all.length === 1 ? '' : 's'} · ${(size / 1e6).toFixed(1)} MB in this browser</span></div>
      ${list.map(card).join('') || `<p class="legend-note">${showArch ? 'Nothing archived.' : 'No projects kept yet: open a study and press “Keep the open project here”.'}</p>`}
      <p class="legend-note">Projects are kept in this browser only; download the project file (⬇) to move one to another computer or to send it.</p>`);
    p.onclick = async e => { const b = e.target.closest('[data-lib]'); if (!b || b.tagName === 'SELECT') return; const k = b.dataset.lib, id = b.dataset.id, rec = id ? await libGet(id) : null;
      if (k === 'keep') { await keepInLibrary(); return projects(showArch, tag); } if (k === 'arch0') return projects(!showArch, tag);
      if (k === 'open' && rec) { if (S().data && !confirm(`Open “${rec.name}”? The open project is replaced (keep it here first if needed).`)) return; U.openAny(rec.json, rec.json.file); S().libId = rec.id; p.classList.remove('open'); return; }
      if (k === 'tag' && rec) { const t = prompt('Tags, separated by commas (e.g. Thesis, Paper 1, Conference):', (rec.tags || []).join(', ')); if (t === null) return; rec.tags = t.split(',').map(x => x.trim()).filter(Boolean); await libPut(rec); return projects(showArch, tag); }
      if (k === 'ren' && rec) { const t = prompt('Name of the project:', rec.name); if (!t) return; rec.name = t.trim(); await libPut(rec); return projects(showArch, tag); }
      if (k === 'arch' && rec) { rec.archived = !rec.archived; await libPut(rec); return projects(showArch, tag); }
      if (k === 'file' && rec) { U.saveUrl(URL.createObjectURL(new Blob([JSON.stringify(rec.json)], { type: 'application/json' })), `${rec.name} - project.easystat.json`); return; }
      if (k === 'del' && rec && confirm(`Delete “${rec.name}” from this browser? This cannot be undone.`)) { await libDel(id); if (S().libId === id) S().libId = null; return projects(showArch, tag); } };
    p.onchange = e => { if (e.target.dataset.lib === 'tagf') projects(showArch, e.target.value); }; }

  /* ---------- O2: dataset versions ---------- */
  function datasets() { if (!need()) return; const o = org(), L = o.datasets = o.datasets || [], cur = o.dataVersion;
    const p = panel('orgData', '🗂 Dataset versions', `<p class="legend-note">Keep the data as they are now (e.g. Raw, Cleaned, Interim, Final) and go back to any of them. The report states the version it used.</p>
      <div class="row" style="gap:6px"><input type="text" id="orgDvName" placeholder="Name, e.g. Cleaned" style="width:150px"><input type="text" id="orgDvNote" placeholder="What changed" style="flex:1"><button class="btn primary small" type="button" data-dv="keep">＋ Keep the current data</button></div>
      <table class="ux2-tbl" style="margin-top:8px"><thead><tr><th>Version</th><th>Date</th><th>Rows</th><th>Note</th><th></th></tr></thead><tbody>${L.map((d, i) => `<tr><td><b>${esc(d.name)}</b>${cur && cur.name === d.name ? ' <span class="chip ok">in use</span>' : ''}</td><td>${day(d.at)}</td><td>${d.data.rows.length}</td><td>${esc(d.note || '')}</td><td style="white-space:nowrap"><button class="btn ghost small" type="button" data-dv="use" data-i="${i}">Use</button><button class="btn ghost small" type="button" data-dv="del" data-i="${i}">🗑</button></td></tr>`).join('') || '<tr><td colspan="5" class="legend-note">No versions kept yet.</td></tr>'}</tbody></table>
      ${cur ? `<p class="legend-note">The report uses “${esc(cur.name)}” <button class="btn ghost small" type="button" data-dv="none">Do not name a version</button></p>` : ''}`);
    p.onclick = e => { const b = e.target.closest('[data-dv]'); if (!b) return; const k = b.dataset.dv, i = +b.dataset.i;
      if (k === 'keep') { const nm = $('#orgDvName').value.trim() || `Version ${L.length + 1}`; L.push({ name: nm, note: $('#orgDvNote').value.trim(), at: new Date().toISOString(), data: JSON.parse(JSON.stringify(S().data)) }); o.dataVersion = { name: nm, at: new Date().toISOString() }; log(`Dataset version “${nm}” kept (${S().data.rows.length} rows)`); U.toast(`Data kept as “${nm}”`); return datasets(); }
      if (k === 'use') { const d = L[i]; if (!confirm(`Use the data “${d.name}” (${d.data.rows.length} rows)? The data now on screen are replaced (keep them as a version first if needed).`)) return; S().data = JSON.parse(JSON.stringify(d.data)); o.dataVersion = { name: d.name, at: d.at }; S().result = null; U.renderGrid(); log(`Dataset version “${d.name}” in use`); U.toast(`Using “${d.name}”`); if (U.state.step === 12) U.runAnalysis(); return datasets(); }
      if (k === 'del' && confirm(`Delete the version “${L[i].name}”?`)) { L.splice(i, 1); return datasets(); }
      if (k === 'none') { delete o.dataVersion; return datasets(); } }; }

  /* ---------- O5: the analysis log, with your own notes ---------- */
  function analysisLog() { if (!need()) return; const o = org(), L = (o.log || []).slice().reverse(), clean = (S().cleanLog || []).map(c => ({ at: c.time, what: `Data: ${c.what}`, kind: 'data' }));
    const all = [...L, ...clean.reverse()];
    const p = panel('orgLog', '📝 Analysis log', `<div class="row" style="gap:6px"><input type="text" id="orgNote" placeholder="Your note, e.g. Decided to use Mann-Whitney for VAS (skewed)" style="flex:1"><button class="btn primary small" type="button" data-lg="add">＋ Note</button><button class="btn ghost small" type="button" data-lg="txt">⬇ Text</button><button class="btn ghost small" type="button" data-lg="doc">⬇ Appendix (.docx)</button></div>
      <table class="ux2-tbl" style="margin-top:8px"><tbody>${all.slice(0, 300).map(x => `<tr><td style="white-space:nowrap" class="legend-note">${esc(isFinite(Date.parse(x.at)) ? new Date(x.at).toLocaleString('en-GB') : x.at)}</td><td>${x.kind === 'note' ? '📝 ' : x.kind === 'data' ? '🧹 ' : ''}${esc(x.what)}</td></tr>`).join('') || '<tr><td class="legend-note">Nothing yet: runs of the report, settings changed in steps 2 and 12, versions and your notes appear here.</td></tr>'}</tbody></table>`);
    const lines = () => all.slice().reverse().map(x => `${isFinite(Date.parse(x.at)) ? new Date(x.at).toLocaleString('en-GB') : x.at}\t${x.what}`);
    p.onclick = async e => { const b = e.target.closest('[data-lg]'); if (!b) return; const k = b.dataset.lg;
      if (k === 'add') { const t = $('#orgNote').value.trim(); if (!t) return; log(t, 'note'); return analysisLog(); }
      if (k === 'txt') U.saveUrl(URL.createObjectURL(new Blob([lines().join('\r\n')], { type: 'text/plain' })), `${U.baseName()} - analysis log.txt`);
      if (k === 'doc') { const D = window.docx, P = (t, o2 = {}) => new D.Paragraph({ spacing: { after: 80 }, children: [new D.TextRun({ text: t, bold: o2.b, size: o2.s || 20, font: 'Calibri' })] });
        const blob = await D.Packer.toBlob(new D.Document({ sections: [{ children: [P('Appendix: analysis log', { b: true, s: 28 }), P(`${S().cfg.study.title || U.baseName()} — every run, change of setting, dataset version and note, oldest first.`, { s: 18 }), ...lines().map(l => P(l, { s: 18 }))] }] }));
        U.saveUrl(URL.createObjectURL(blob), `${U.baseName()} - analysis log.docx`); } }; }

  /* ---------- O6: tasks on tables and figures ---------- */
  function tasks() { if (!need()) return; const o = org(), L = o.tasks = o.tasks || [];
    const p = panel('orgTasks', '📌 Tasks', `<p class="legend-note">Add a task from the 📌 button of a table in step 12, or here.</p><div class="row" style="gap:6px;flex-wrap:wrap"><input type="text" id="orgTk" placeholder="e.g. Ask the supervisor about Table 4" style="flex:1;min-width:200px"><input type="text" id="orgTkWho" placeholder="Who" style="width:100px"><input type="date" id="orgTkDue" style="width:auto"><button class="btn primary small" type="button" data-tk="add">＋ Task</button></div>
      <table class="ux2-tbl" style="margin-top:8px"><thead><tr><th></th><th>Task</th><th>On</th><th>Who</th><th>Due</th><th></th></tr></thead><tbody>${L.map((t, i) => `<tr style="${t.done ? 'opacity:.55' : ''}"><td><input type="checkbox" data-tkdone="${i}" ${t.done ? 'checked' : ''}></td><td>${esc(t.text)}</td><td>${t.sec ? `<a href="#" data-tkgo="${i}">${esc(t.sec.slice(0, 40))}</a>` : '—'}</td><td>${esc(t.who || '')}</td><td class="${!t.done && t.due && t.due < new Date().toISOString().slice(0, 10) ? 'ux-over' : ''}">${esc(t.due || '')}</td><td><button class="btn ghost small" type="button" data-tk="del" data-i="${i}">🗑</button></td></tr>`).join('') || '<tr><td colspan="6" class="legend-note">No tasks.</td></tr>'}</tbody></table>
      <p class="legend-note">${L.filter(t => !t.done).length} open · ${L.filter(t => t.done).length} done</p>`);
    p.onclick = e => { const b = e.target.closest('[data-tk],[data-tkgo]'); if (!b) return; e.preventDefault();
      if (b.dataset.tkgo !== undefined) { const t = L[+b.dataset.tkgo]; U.go(12); setTimeout(() => { const sec = $$('#report .report-sec').find(s => { const i2 = s.querySelector('[data-ttl]'); return i2 && i2.value === t.sec; }); if (sec) sec.scrollIntoView({ block: 'center' }); }, 300); return; }
      if (b.dataset.tk === 'add') { const t = $('#orgTk').value.trim(); if (!t) return; L.push({ text: t, who: $('#orgTkWho').value.trim(), due: $('#orgTkDue').value, done: false, at: new Date().toISOString() }); log(`Task added: ${t}`); return tasks(); }
      if (b.dataset.tk === 'del') { L.splice(+b.dataset.i, 1); return tasks(); } };
    p.onchange = e => { const c = e.target.closest('[data-tkdone]'); if (!c) return; const t = L[+c.dataset.tkdone]; t.done = c.checked; log(`Task ${t.done ? 'done' : 'reopened'}: ${t.text}`); tasks(); X.onReport && X.onReport(); }; }
  X.tasks = tasks;
  // the 📌 button of each table
  function taskButtons() { $$('#report [data-copytbl]').forEach(b => { if (b.parentNode.querySelector('[data-orgtk]')) return; const t = el('button', 'btn ghost small', '📌 Task'); t.type = 'button'; t.dataset.orgtk = b.dataset.copytbl; t.title = 'A task on this table (e.g. a question for the supervisor)'; b.parentNode.append(' ', t); }); }
  document.addEventListener('click', e => { const b = e.target.closest('[data-orgtk]'); if (!b) return; const s = S().result.sections[+b.dataset.orgtk]; if (!s) return; const t = prompt(`Task on “${s.title}”:`, 'Ask the supervisor about '); if (!t) return;
    const who = prompt('Who? (optional)', '') || '', due = prompt('Due date (YYYY-MM-DD, optional)', '') || ''; (org().tasks = org().tasks || []).push({ text: t, who, due, sec: s.title, done: false, at: new Date().toISOString() }); log(`Task added on “${s.title}”: ${t}`); U.toast('Task added — 📌 in the report map'); X.onReport && X.onReport(); });
  const rep = $('#report'); if (rep) new MutationObserver(() => setTimeout(taskButtons, 250)).observe(rep, { childList: true });

  /* ---------- O7: several reports from one dataset (report profiles) ---------- */
  function profiles() { if (!need()) return; const o = org(), P0 = o.profiles = o.profiles || {}, cur = o.profile || '';
    const p = panel('orgProf', '🗃 Reports from these data', `<p class="legend-note">Each report keeps its own tables, settings and edited text (e.g. Thesis, Paper 1 — primary outcome, Conference abstract); the data are shared.</p>
      <div class="row" style="gap:6px"><input type="text" id="orgPfName" placeholder="Name, e.g. Paper 1" value="${esc(cur)}" style="width:180px"><button class="btn primary small" type="button" data-pf="save">💾 Save the current report as</button></div>
      <table class="ux2-tbl" style="margin-top:8px"><tbody>${Object.entries(P0).map(([n, pf]) => `<tr><td><b>${esc(n)}</b>${n === cur ? ' <span class="chip ok">open</span>' : ''}</td><td class="legend-note">${day(pf.at)} · ${pf.cfg.variables.filter(v => v.include).length} variables</td><td style="white-space:nowrap"><button class="btn ghost small" type="button" data-pf="open" data-n="${esc(n)}">Open</button><button class="btn ghost small" type="button" data-pf="del" data-n="${esc(n)}">🗑</button></td></tr>`).join('') || '<tr><td class="legend-note">No saved reports yet.</td></tr>'}</tbody></table>`);
    p.onclick = e => { const b = e.target.closest('[data-pf]'); if (!b) return; const k = b.dataset.pf, n = b.dataset.n;
      if (k === 'save') { const nm = $('#orgPfName').value.trim(); if (!nm) return; const j = U.projectObj(); const c = JSON.parse(JSON.stringify(j.cfg)); delete c.org; P0[nm] = { at: new Date().toISOString(), cfg: c, edits: j.edits }; o.profile = nm; log(`Report “${nm}” saved`); U.toast(`Report “${nm}” saved`); return profiles(); }
      if (k === 'open') { const pf = P0[n]; const keepOrg = JSON.parse(JSON.stringify(o)); keepOrg.profile = n; const j = U.projectObj(); U.openProject({ ...j, cfg: { ...JSON.parse(JSON.stringify(pf.cfg)), org: keepOrg }, edits: pf.edits, step: 12 }, S().file); log(`Report “${n}” opened`); U.toast(`Report “${n}” — running`); return; }
      if (k === 'del' && confirm(`Delete the report “${n}”?`)) { delete P0[n]; if (o.profile === n) delete o.profile; return profiles(); } }; }

  /* ---------- O8: templates: the variables' settings and the options, applied to another study by matching names ---------- */
  const norm = t => String(t || '').toLowerCase().replace(/\(.*?\)/g, '').replace(/[^a-z0-9]+/g, '');
  const VKEEP = ['label', 'table', 'role', 'test', 'chart', 'include', 'dec', 'decimals', 'mcid', 'better', 'unit', 'definition', 'caption', 'ylabel', 'group', 'order', 'cutoff', 'rowNote', 'noSecond', 'levelOrder', 'refLevel'];
  function templates() { if (!need()) return;
    const p = panel('orgTpl', '🧩 Templates', `<p class="legend-note">A template keeps the settings of the variables (label, table, role, test, figure, MCID …), the order of the tables and every option. Apply it to a new study with similar variables: they are matched by their column names, or by their labels.</p>
      <div class="row" style="gap:6px"><button class="btn primary small" type="button" data-tp="save">⬇ Save this study as a template</button><label class="btn ghost small" style="margin:0">⬆ Apply a template<input type="file" id="orgTplFile" accept=".json" hidden></label></div><div id="orgTplOut" class="legend-note" style="margin-top:6px"></div>`);
    p.onclick = e => { const b = e.target.closest('[data-tp]'); if (!b) return; U.readUiIntoCfg(); const c = S().cfg;
      const tpl = { app: 'ProfMSE-EasyStat-template', at: new Date().toISOString(), title: c.study.title || '', options: c.options, report: c.report, groupLabels: c.groupLabels, vars: c.variables.map((v, i) => ({ cols: v.cols.map(x => x.col), key: norm(v.label), pos: i, ...Object.fromEntries(VKEEP.filter(k => v[k] !== undefined).map(k => [k, v[k]])) })) };
      U.saveUrl(URL.createObjectURL(new Blob([JSON.stringify(tpl, null, 1)], { type: 'application/json' })), `${U.baseName()} - template.json`); log('Template saved'); };
    p.onchange = async e => { if (e.target.id !== 'orgTplFile') return; const f = e.target.files[0]; e.target.value = ''; if (!f) return; let t; try { t = JSON.parse(await f.text()); } catch (err) { U.toast('Not a template file'); return; } if (t.app !== 'ProfMSE-EasyStat-template') { U.toast('Not a template file'); return; }
      const c = S().cfg, used = new Set(); let n = 0; c.variables.forEach(v => { const cols = v.cols.map(x => norm(x.col)), m = t.vars.find((tv, i) => !used.has(i) && tv.cols.some(cc => cols.includes(norm(cc)))) || t.vars.find((tv, i) => !used.has(i) && tv.key && tv.key === norm(v.label));
        if (!m) return; used.add(t.vars.indexOf(m)); VKEEP.forEach(k => { if (m[k] !== undefined) v[k] = m[k]; }); v.__pos = m.pos; n++; });
      c.variables.sort((a, b) => (a.__pos ?? 1e6) - (b.__pos ?? 1e6)); c.variables.forEach(v => delete v.__pos); c.options = { ...c.options, ...t.options }; c.report = { ...c.report, ...(t.report || {}) };
      Object.entries(t.groupLabels || {}).forEach(([g, l]) => { if (c.groupLabels && g in c.groupLabels) c.groupLabels[g] = l; }); U.renderOptions(); U.renderVariables(); log(`Template applied: ${n} of ${c.variables.length} variables matched`);
      $('#orgTplOut').textContent = `${n} of ${c.variables.length} variables matched and set; the options and the Word settings applied.${n < c.variables.length ? ` Not matched: ${c.variables.filter(v => !t.vars.some(tv => tv.key === norm(v.label) || tv.cols.some(cc => v.cols.some(x => norm(x.col) === norm(cc))))).map(v => v.label).slice(0, 8).join(', ')}.` : ''}`; U.go(2); }; }

  /* ---------- O10: storage in this browser, and clean-up ---------- */
  async function storage() { const groups = {}; for (let i = 0; i < localStorage.length; i++) { const k = localStorage.key(i), v = localStorage.getItem(k) || '', g = /^gen\./.test(k) ? 'Generator settings and scenarios' : /^ux2?\./.test(k) ? 'Display, favourites and recent work' : /autosave/.test(k) ? 'Autosaved work' : /builder|^mb\.|design/i.test(k) ? 'Master sheet designs' : /preset/i.test(k) ? 'Presets' : 'Other settings'; (groups[g] = groups[g] || { n: 0, size: 0, keys: [] }); groups[g].n++; groups[g].size += k.length + v.length; groups[g].keys.push(k); }
    let lib = []; try { lib = await libAll(); } catch (e) { /* none */ } let est = null; try { est = navigator.storage && navigator.storage.estimate ? await navigator.storage.estimate() : null; } catch (e) { /* none */ }
    const p = panel('orgStore', '🧹 Storage and clean-up', `<table class="ux2-tbl"><thead><tr><th>What</th><th>Items</th><th>Size</th><th></th></tr></thead><tbody>${Object.entries(groups).map(([g, x]) => `<tr><td>${esc(g)}</td><td>${x.n}</td><td>${(2 * x.size / 1024).toFixed(0)} KB</td><td>${/Autosaved|Generator/.test(g) ? `<button class="btn ghost small" type="button" data-sg="${esc(g)}">Clear</button>` : ''}</td></tr>`).join('')}
      <tr><td>My projects (📁)</td><td>${lib.length} (${lib.filter(x => x.archived).length} archived)</td><td>${(lib.reduce((t, x) => t + JSON.stringify(x.json).length, 0) / 1024).toFixed(0)} KB</td><td><button class="btn ghost small" type="button" data-sg="arch">Delete the archived</button></td></tr></tbody></table>
      ${est ? `<p class="legend-note">This browser gives this page ${(est.quota / 1e9).toFixed(1)} GB; ${(est.usage / 1e6).toFixed(1)} MB used (with the report versions).</p>` : ''}<p class="legend-note">Old report versions are listed in 🕘 Report versions (step 12), where each can be deleted.</p>`);
    p.onclick = async e => { const b = e.target.closest('[data-sg]'); if (!b) return; const g = b.dataset.sg;
      if (g === 'arch') { const a = lib.filter(x => x.archived); if (!a.length || !confirm(`Delete the ${a.length} archived project(s) from this browser?`)) return; for (const x of a) await libDel(x.id); return storage(); }
      if (!confirm(`Clear “${g}”? This cannot be undone.`)) return; (groups[g].keys || []).filter(k => !/scenarios/.test(k) || /Generator/.test(g)).forEach(k => localStorage.removeItem(k)); U.toast('Cleared'); storage(); }; }

  /* ---------- O12: the hand-off checklist before sending to the supervisor ---------- */
  function handoff() { if (!S().result) { U.toast('Run the report first (step 12)'); return; } U.syncEdits(); const st = S(), cfg = st.cfg, o = cfg.org || {}, r = st.result, H = U.healthItems ? U.healthItems() : [];
    const rv = Object.values(o.review || {}), locked = Array.isArray(cfg.lockedSecs) ? cfg.lockedSecs.length : Object.keys(cfg.lockedSecs || {}).length, openT = (o.tasks || []).filter(t => !t.done).length;
    const items = [[!H.length, H.length ? `${H.length} point${H.length > 1 ? 's' : ''} in 🩺 Report health` : 'Report health: nothing to fix'], [cfg.variables.some(v => v.include && v.role === 'primary'), 'The primary outcome is marked (🎭 Roles)'],
      [!!(r.abstract || o.abstractDone), 'An abstract is written (Structured abstract, or the paper format)'], [locked > 0, `${locked} table${locked === 1 ? '' : 's'} locked (their comments kept when the data change)`],
      [!!(o.dataVersion && o.dataVersion.name), o.dataVersion ? `Dataset version named: “${o.dataVersion.name}”` : 'Name the dataset version (🗂 Dataset versions)'], [!openT, openT ? `${openT} open task${openT > 1 ? 's' : ''}` : 'No open tasks'],
      [!!(cfg.study.title || '').trim(), 'The study has a title'], [rv.length === 0 || rv.every(x => x.v === 'ok'), rv.length ? `Review: ${rv.filter(x => x.v === 'ok').length} approved, ${rv.filter(x => x.v === 'no').length} sent back` : 'No review marks yet']];
    const p = panel('orgHand', '🤝 Ready to hand over?', `${items.map(([ok, t]) => `<div>${ok ? '✅' : '⬜'} ${esc(t)}</div>`).join('')}<p class="legend-note">${items.filter(x => x[0]).length} of ${items.length} done.</p>
      <div class="row" style="gap:6px"><button class="btn primary small" type="button" data-ho="go">🎁 Save the project and the pack for the supervisor</button><button class="btn ghost small" type="button" data-ho="abs">Mark the abstract as written</button></div>`);
    p.onclick = e => { const b = e.target.closest('[data-ho]'); if (!b) return; if (b.dataset.ho === 'abs') { org().abstractDone = true; return handoff(); } log('Handed over to the supervisor'); $('#btnSaveProj').click(); const sp = $('#btnSharePack'); if (sp) setTimeout(() => sp.click(), 600); }; }

  /* ---------- the menu entries ---------- */
  (function menu() { const top = $('.top-actions'), more = $('.ux-menu'); if (!top) return;
    const pb = el('button', 'btn light small', '📁 <span class="tl">Projects</span>'); pb.type = 'button'; pb.id = 'orgProjects'; pb.title = 'My projects: a dashboard of every study kept in this browser, with tags and an archive'; pb.onclick = () => projects();
    const sv = $('#btnSaveProj'); if (sv) sv.after(pb); else top.prepend(pb);
    const add = (id, label, title, fn) => { const b = el('button', 'btn light small', label); b.type = 'button'; b.id = id; b.title = title; b.onclick = fn; (more || top).appendChild(b); };
    add('orgDatasets', '🗂 Dataset versions', 'Raw, cleaned, interim and final data, each with its date and a note', datasets);
    add('orgReports', '🗃 Reports from these data', 'Thesis, Paper 1, Conference: each with its own tables, settings and text', profiles);
    add('orgTasksB', '📌 Tasks', 'Tasks on tables and figures: who, when, done', tasks);
    add('orgLogB', '📝 Analysis log', 'Every run, change of setting, version and note; as an appendix', analysisLog);
    add('orgTplB', '🧩 Templates', 'The setup of a study, applied to the next one by matching the variable names', templates);
    add('orgStoreB', '🧹 Storage', 'What this browser keeps, and clean-up', storage);
    const ho = $('#btnHandoff'); if (ho) ho.onclick = handoff; })();
  // the report runs go into the log
  let lastRun = null; const rep2 = $('#report'); if (rep2) new MutationObserver(() => { const r = S().result; if (r && r !== lastRun) { lastRun = r; log(`Report run: ${r.sections.length} parts${(S().cfg.org || {}).dataVersion ? ` (data “${S().cfg.org.dataVersion.name}”)` : ''}`); } }).observe(rep2, { childList: true });
  X.projects = projects; X.keepInLibrary = keepInLibrary; X.libAll = libAll;
})();

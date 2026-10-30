/* Prof MSE Easy Stat — Word (.docx) export using docx.js */
const Report = (() => {
  const D = () => window.docx;
  const DEFAULT_FONT = 'Times New Roman';
  let BODY_FONT = DEFAULT_FONT; // set per build from the report options
  const PORTRAIT_W = 9026, LANDSCAPE_W = 13958; // A4 text width with 1" margins (DXA)
  let PAGE_W = PORTRAIT_W; // set per build from the page orientation
  let ITALIC_P = false; // APA / AMA / NEJM: the P of P values in italics
  let TEMPLATE = false; // a Word template gives the styles

  // text runs of a paragraph; with ITALIC_P the letter P of "P = 0.01", "p < .001" or a "P" heading is set in italics
  function runs(text, o = {}) {
    const { TextRun } = D();
    // with a Word template the body text takes the template's font and size (only explicit sizes, e.g. of tables, stay)
    const mk = (t, it) => new TextRun({ text: t, bold: o.bold, italics: o.italic || it, size: o.size || (TEMPLATE ? undefined : 24), font: o.font || (TEMPLATE ? undefined : BODY_FONT), color: o.color });
    if (!ITALIC_P || !text) return [mk(text || '')];
    if (/^[pP]( value| Value)?$/.test(text)) return [mk(text[0], true), ...(text.length > 1 ? [mk(text.slice(1))] : [])];
    const out = [], re = /(?<![A-Za-z])[pP](?=\s?(?:value\s?)?[=<>≤])/g;
    let last = 0, m;
    while ((m = re.exec(text))) { if (m.index > last) out.push(mk(text.slice(last, m.index))); out.push(mk(m[0], true)); last = m.index + 1; }
    if (last < text.length) out.push(mk(text.slice(last)));
    return out;
  }

  const dataUrlToBytes = url => {
    const b = atob(url.split(',')[1]), u = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i);
    return u;
  };

  let LINE = 360; // body text line spacing (240 = single, 360 = 1.5 lines), set per build
  function para(text, o = {}) {
    const { Paragraph, TextRun, AlignmentType } = D();
    return new Paragraph({
      alignment: o.align || AlignmentType.JUSTIFIED,
      spacing: TEMPLATE && o.line === undefined ? { after: o.after ?? 160, before: o.before ?? 0 } : { after: o.after ?? 160, line: o.line ?? LINE, before: o.before ?? 0 },
      keepNext: o.keepNext, pageBreakBefore: o.pageBreakBefore,
      children: [...runs(text, o), ...(o.note ? runs((/[.!?]$/.test(text.trim()) ? ' ' : '. ') + o.note, { ...o, bold: false, size: o.noteSize || o.size }) : [])]
    });
  }
  // a comment: sentences reporting a significant result in bold (optional), else one plain paragraph
  const SENT = /[^.!?]+(?:\.(?=\d)[^.!?]*)*[.!?]+(?:\s+|$)|[^.!?]+$/g;
  const isSigSentence = x => /\b(significant(ly)?|clear(ly)?)\b/.test(x) && !/\b(in|not |non-)significant|no significant|not clear|no clear|insignificant/.test(x);
  function commentPara(text, o = {}) {
    if (!o.boldSig) return para(text, o);
    const { Paragraph, AlignmentType } = D(), ss = String(text).match(SENT) || [text];
    return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 160, line: LINE }, keepNext: o.keepNext, pageBreakBefore: o.pageBreakBefore,
      children: ss.flatMap(x => runs(x, { bold: isSigSentence(x) })) });
  }
  // headings: Word's Heading 1 / 2; with WORD_STYLES the look comes from the document's styles only (so a university template can restyle them)
  let WORD_STYLES = false;
  function heading(text, brand) {
    const { Paragraph, TextRun, HeadingLevel } = D();
    if (WORD_STYLES) return new Paragraph({ heading: HeadingLevel.HEADING_1, children: [new TextRun(text)] });
    return new Paragraph({
      heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 160 },
      children: [new TextRun({ text, bold: true, size: 30, font: BODY_FONT, color: brand ? '1C1648' : '000000' })]
    });
  }
  function subheading(text, brand, pageBreakBefore) {
    const { Paragraph, TextRun, HeadingLevel } = D();
    if (WORD_STYLES) return new Paragraph({ heading: HeadingLevel.HEADING_2, keepNext: true, pageBreakBefore, children: [new TextRun(text)] });
    return new Paragraph({
      heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, keepNext: true, pageBreakBefore,
      children: [new TextRun({ text, bold: true, size: 26, font: BODY_FONT, color: brand ? '5E1F96' : '000000' })]
    });
  }
  // bilingual report: an Arabic paragraph, right to left, after its English one
  function arPara(text, o = {}) {
    const { Paragraph, TextRun, AlignmentType } = D(), sz = o.size || 24;
    return new Paragraph({ bidirectional: true, alignment: o.center ? AlignmentType.CENTER : AlignmentType.JUSTIFIED, keepNext: o.keepNext, spacing: { after: o.after ?? 160, line: o.line ?? LINE, before: o.before ?? 0 },
      children: [new TextRun({ text, rightToLeft: true, bold: o.bold, boldComplexScript: o.bold, size: sz, sizeComplexScript: sz, font: { ascii: BODY_FONT, hAnsi: BODY_FONT, cs: BODY_FONT }, color: o.color })] });
  }
  // abbreviations explained in Word footnotes at their first use in the statistical analysis
  const ABBR_FOOT = { SD: 'standard deviation', IQR: 'interquartile range', CI: 'confidence interval', ANOVA: 'analysis of variance', OR: 'odds ratio', RR: 'relative risk', HR: 'hazard ratio', AUC: 'area under the curve',
    ROC: 'receiver operating characteristic', SPSS: 'Statistical Package for the Social Sciences', ICC: 'intraclass correlation coefficient', SEM: 'standard error of the mean', LMM: 'linear mixed model', NRI: 'net reclassification improvement', IDI: 'integrated discrimination improvement' };
  function abbrPara(text, notes) {
    const { Paragraph, TextRun, FootnoteReferenceRun, AlignmentType } = D(), kids = [], seen = new Set(), re = new RegExp(`\\b(${Object.keys(ABBR_FOOT).join('|')})\\b`, 'g');
    let last = 0, m;
    while ((m = re.exec(text))) { if (seen.has(m[1])) continue; seen.add(m[1]); kids.push(...runs(text.slice(last, m.index + m[1].length)));
      const id = Object.keys(notes).length + 1; notes[id] = { children: [new Paragraph({ children: [new TextRun({ text: `${m[1]}: ${ABBR_FOOT[m[1]]}.`, size: 18, font: BODY_FONT })] })] };
      kids.push(new FootnoteReferenceRun(id)); last = m.index + m[1].length; }
    kids.push(...runs(text.slice(last)));
    return new Paragraph({ alignment: AlignmentType.JUSTIFIED, spacing: { after: 160, line: LINE }, children: kids });
  }
  function caption(text, o = {}) {
    const { AlignmentType } = D();
    return para(text, { bold: true, align: AlignmentType.CENTER, after: 120, line: 276, keepNext: true, ...o });
  }
  // APA: the number in bold on its own line, the title in italics below it, both left-aligned
  function apaCaption(label, title, o = {}) {
    const { AlignmentType } = D();
    return [para(label, { bold: true, align: AlignmentType.LEFT, after: 0, line: 276, keepNext: true, pageBreakBefore: o.pageBreakBefore }),
      para(title, { italic: true, align: AlignmentType.LEFT, after: 120, line: 276, keepNext: true })];
  }
  function image(dataUrl, srcW, srcH, widthPx = 600, keepNext = true) {
    const { Paragraph, ImageRun, AlignmentType } = D();
    return new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 80 }, keepNext,
      children: [new ImageRun({ type: 'png', data: dataUrlToBytes(dataUrl), transformation: { width: widthPx, height: Math.round(widthPx * srcH / srcW) } })]
    });
  }

  // Generic table model → docx Table. Cells: {t:[lines], b, rs (rowSpan), span (colSpan), small}
  // look: text size (pt), header colour, banded rows, left-aligned variable names and cell spacing
  const HEAD_FILL = { lavender: 'EBDDF6', blue: 'DCE6F2', green: 'E2EFDA', navy: '1F3864' };
  const PAD = { compact: [20, 35], roomy: [80, 70] };
  function table(head, rows, brand, style = 'grid', look = {}) {
    const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType, ShadingType, VerticalAlign, BorderStyle } = D();
    const headCells = head.map(h => typeof h === 'string' ? { t: h } : h);
    const nCols = headCells.reduce((s, h) => s + (h.span || 1), 0);
    // relative column weights: first label columns wider, effect column widest
    const weights = [];
    const isP = name => /^(p value|p|p-value)$/i.test(name);
    headCells.forEach((h, i) => {
      for (let s = 0; s < (h.span || 1); s++) {
        const name = (Array.isArray(h.t) ? h.t[0] : h.t) || '';
        // very wide tables (e.g. ROC) need roomier label and P value columns
        const wide = nCols > 7;
        weights.push(i === 0 ? (h.span === 2 ? (s === 0 ? 1.1 : 1.0) : wide ? 1.05 : 0.85) : /CI/.test(name) ? 1.6 : /Post hoc/.test(name) ? 0.95 : isP(name) ? (wide ? 0.95 : 0.7) : /^Test$/.test(name) ? 0.8 : 1.15);
      }
    });
    // widths fitted to the content: the longest text of each column (rows that fill every column)
    if (look.autoFit) { const len = new Array(nCols).fill(3);
      headCells.forEach((h, i) => { const t = String(Array.isArray(h.t) ? h.t.join(' ') : h.t || ''); if (!(h.span > 1)) len[i] = Math.max(len[i], Math.min(28, t.length * 0.8)); });
      rows.forEach(r => { if (r.reduce((a, c) => a + (c.span || 1), 0) !== nCols) return; let ci = 0; r.forEach(c => { const t = (c.t || []).map(String); if (!(c.span > 1)) len[ci] = Math.max(len[ci], Math.min(40, Math.max(0, ...t.map(x => x.length)))); ci += c.span || 1; }); });
      len.forEach((l, i) => { weights[i] = Math.max(0.5, Math.pow(l, 0.85)); }); }
    const tot = weights.reduce((a, b) => a + b, 0), TW = Math.round(PAGE_W * (+look.width || 100) / 100); // table width: the page or a share of it
    const widths = weights.map(w => Math.floor(TW * w / tot));
    widths[widths.length - 1] += TW - widths.reduce((a, b) => a + b, 0);

    const apa = style === 'apa';
    const border = { style: BorderStyle.SINGLE, size: 4, color: '8C8C8C' };
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const rule = size => ({ style: BorderStyle.SINGLE, size, color: '000000' });
    const gridBorders = { top: border, bottom: border, left: border, right: border };
    // three-line (academic) tables: heavy rule above and below the header, heavy rule closing the table
    const apaBorders = (isHead, isLast) => ({ top: isHead ? rule(12) : none, bottom: isHead ? rule(8) : isLast ? rule(12) : none, left: none, right: none });
    const sz = 2 * (+look.size || 10), [padV, padH] = PAD[look.pad] || [40, 50];
    const headFill = !look.head || look.head === 'auto' ? (brand ? 'EBDDF6' : 'D9D9D9') : HEAD_FILL[look.head];
    // significant P values in colour; numbers aligned on the decimal point (a decimal tab in the middle of the cell)
    const sigRe = look.sigSym ? new RegExp(`^<?\\.?\\d[\\d.]*${look.sigSym.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[a-z\u1d43-\u1dbf]*$`) : null;
    const PCOL = { red: 'C00000', green: '2E7D32', blue: '1F4E9A' }[look.pColor];
    const mkCell = (cell, colIdx, isHead, isLast, band) => {
      const lines = Array.isArray(cell.t) ? cell.t : [cell.t ?? ''];
      let w = 0;
      for (let s = 0; s < (cell.span || 1); s++) w += widths[colIdx + s] || 0;
      const dec = look.decAlign && !isHead && colIdx > 0 && !cell.ind && lines.length === 1 && /^[<>≤-]?\d/.test(String(lines[0])) && /\./.test(String(lines[0]));
      return new TableCell({
        width: { size: w, type: WidthType.DXA },
        columnSpan: cell.span, rowSpan: cell.rs,
        verticalAlign: VerticalAlign.CENTER, borders: apa ? apaBorders(isHead, isLast) : gridBorders,
        margins: { top: padV, bottom: padV, left: padH, right: padH },
        shading: isHead && !apa ? (headFill ? { type: ShadingType.CLEAR, color: 'auto', fill: headFill } : undefined) : cell.hl ? { type: ShadingType.CLEAR, color: 'auto', fill: 'FFF2CC' } : band ? { type: ShadingType.CLEAR, color: 'auto', fill: 'F2F2F2' } : undefined,
        children: lines.map(l => new Paragraph({
          alignment: dec ? AlignmentType.LEFT : (look.left && !isHead && colIdx === 0) || cell.ind || cell.left ? AlignmentType.LEFT : AlignmentType.CENTER, spacing: { after: 0, line: 240 },
          ...(dec ? { tabStops: [{ type: D().TabStopType.DECIMAL, position: Math.max(200, Math.round(w / 2 - padH)) }] } : {}),
          children: runs((dec ? '\t' : '') + String(l), { bold: isHead || cell.b, size: cell.small ? sz - 3 : sz, font: look.font,
            color: isHead && !apa && look.head === 'navy' ? 'FFFFFF' : PCOL && sigRe && !isHead && sigRe.test(String(l)) ? PCOL : undefined })
        }))
      });
    };
    // track occupied columns from row spans to compute each cell's column index
    const occupied = [];
    const trs = [];
    const headRow = new TableRow({ tableHeader: true, children: (() => { let c = 0; return headCells.map(h => { const cell = mkCell(h, c, true); c += h.span || 1; return cell; }); })() });
    trs.push(headRow);
    let bandNo = -1;
    rows.forEach((r, ri) => {
      let col = 0;
      const cells = [];
      // banded rows: a new band starts with each variable (a row whose first column is not covered by a row span)
      if (!(occupied[ri] && occupied[ri][0]) && !(r[0] && r[0].ind)) bandNo++;
      const band = !!look.bands && bandNo % 2 === 1;
      for (const cell of r) {
        while (occupied[ri] && occupied[ri][col]) col++;
        cells.push(mkCell(cell, col, false, ri + (cell.rs || 1) === rows.length, band));
        if (cell.rs > 1) for (let k = 1; k < cell.rs; k++) {
          occupied[ri + k] = occupied[ri + k] || [];
          for (let s = 0; s < (cell.span || 1); s++) occupied[ri + k][col + s] = true;
        }
        col += cell.span || 1;
      }
      trs.push(new TableRow({ cantSplit: true, children: cells }));
    });
    const tableBorders = apa ? { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none } : undefined;
    return new Table({ width: { size: TW, type: WidthType.DXA }, columnWidths: widths, rows: trs, borders: tableBorders, ...(TW < PAGE_W ? { alignment: AlignmentType.CENTER } : {}) });
  }

  // figure width in the Word file (px at 96 dpi): one per row, or each of two side by side
  const FIG_W = { small: [380, 200], medium: [470, 250], full: [560, 295] };

  // two figures per row: a borderless table, each cell holding the image and its caption
  function figureGrid(figs, w) {
    const { Table, TableRow, TableCell, Paragraph, WidthType, BorderStyle } = D();
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const borders = { top: none, bottom: none, left: none, right: none };
    const half = Math.floor(PAGE_W / 2), rows = [];
    for (let i = 0; i < figs.length; i += 2) {
      rows.push(new TableRow({ cantSplit: true, children: [figs[i], figs[i + 1]].map(f => new TableCell({
        width: { size: half, type: WidthType.DXA }, borders,
        children: f ? (f.apa
          ? [para(f.num, { bold: true, align: D().AlignmentType.LEFT, size: 20, line: 240, after: 0 }), para(f.caption, { italic: true, align: D().AlignmentType.LEFT, size: 20, line: 240, after: 60 }),
            image(f.url, f.w, f.h, w), ...(f.note ? [para('Note. ' + f.note, { align: D().AlignmentType.LEFT, size: 18, line: 240, after: 160 })] : [])]
          : [image(f.url, f.w, f.h, w), para(f.label, { bold: true, align: D().AlignmentType.CENTER, size: 20, line: 240, after: 160, note: f.note, noteSize: 18 })]) : [new Paragraph('')]
      })) }));
    }
    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: [half, PAGE_W - half], rows,
      borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none } });
  }

  // "Figure 1:" (default), "Figure 1." or "Fig. 1."
  const figLabel = (n, style) => style === 'period' ? `Figure ${n}.` : style === 'fig' ? `Fig. ${n}.` : style === 'apa' ? `Figure ${n}` : `Figure ${n}:`;
  // figures placed after their table (null), or all together at the end, optionally grouped by chart type
  const TYPE_ORDER = ['bar', 'line', 'box', 'dot', 'stacked', 'pie', 'scatter', 'roc', 'km', 'ba'];
  function arrangeFigures(sections, placement) {
    if (placement !== 'end' && placement !== 'endType') return null;
    const all = sections.flatMap(s => s.figures);
    if (placement === 'endType') {
      const rank = f => { const i = TYPE_ORDER.indexOf(f.spec.type); return i < 0 ? TYPE_ORDER.length : i; };
      return all.map((f, i) => ({ f, i })).sort((a, b) => rank(a.f) - rank(b.f) || a.i - b.i).map(x => x.f);
    }
    return all;
  }

  async function build(model, opts) {
    const { Document, Packer, Paragraph, TextRun, Header, Footer, ImageRun, AlignmentType, PageNumber, BorderStyle } = D();
    const brand = opts.branding;
    BODY_FONT = opts.font || DEFAULT_FONT;
    ITALIC_P = !!opts.italicP;
    const landscape = opts.orientation === 'landscape';
    // page: A4 or US Letter, normal / narrow / wide margins (the text width follows), body line spacing
    const pg = opts.page || {}, tp = opts.tplPage, [pw0, ph0] = tp ? [tp.w, tp.h] : { letter: [12240, 15840], b5: [9979, 14173], a5: [8391, 11906], legal: [12240, 20160] }[pg.size] || [11906, 16838], mg = tp ? Math.round((tp.l + tp.r) / 2) : { narrow: 720, wide: 1800 }[pg.margin] || 1440;
    PAGE_W = (landscape ? ph0 : pw0) - 2 * mg;
    if (opts.twoCol) PAGE_W = Math.floor((PAGE_W - 708) / 2); // tables and figures fit one column
    LINE = { '1': 240, '1.15': 276, '2': 480 }[pg.spacing] || 360;
    const children = [], footnotes = {};
    TEMPLATE = !!opts.template; WORD_STYLES = !!opts.wordStyles || TEMPLATE;
    // bilingual: AR gives the Arabic of a paragraph, heading, caption, footnote or column heading
    const AR = opts.ar || null, arAfter = (text, o) => { if (AR && text) { const t = AR.text(text); if (t) children.push(arPara(t, o)); } };
    const H1 = (t, b) => heading(AR && AR.heading(t) ? `${t} — ${AR.heading(t)}` : t, b);
    // thesis chapters number as "Table 4.1" / "Figure 4.1"; a journal paper uses sentence-case headings and one Results narrative
    const pre = opts.numberPrefix || '';
    // cover page: title, candidate, supervisor(s), department, date
    if (opts.cover) { const cv = opts.cover;
      children.push(para('', { after: 2400 }), para(opts.title || 'Statistical report', { bold: true, size: 40, align: AlignmentType.CENTER, after: 600, color: brand ? '7B2FBE' : undefined }));
      [[cv.candidate, 28, true], [cv.supervisor ? `Supervised by: ${cv.supervisor}` : '', 24], [cv.dept, 24], [cv.date, 24]].forEach(([t, sz, b]) => { if (t) children.push(para(t, { size: sz, bold: b, align: AlignmentType.CENTER, after: 240 })); });
      children.push(new Paragraph({ children: [new (D().PageBreak)()] })); }
    else if (opts.title) children.push(para(opts.title, { bold: true, size: 32, align: AlignmentType.CENTER, after: 240, color: brand ? '7B2FBE' : undefined }));
    // a table of contents, filled in by Word when the file is opened (it asks to update the fields)
    if (opts.toc) children.push(heading('Contents', brand), new (D().TableOfContents)('Contents', { hyperlink: true, headingStyleRange: '1-2' }), new Paragraph({ children: [new (D().PageBreak)()] }));
    // the list of tables and figures goes here once every number is known
    const listAt = children.length, listTabs = [], listFigs = [];
    if (model.abstract) {
      children.push(heading('Results for the abstract', brand));
      children.push(para(model.abstract));
    }
    if (model.methods) {
      children.push(H1(opts.paper ? 'Statistical analysis' : 'Statistical Analysis', brand));
      children.push(opts.abbrFoot ? abbrPara(model.methods, footnotes) : para(model.methods)); arAfter(model.methods);
    }
    if (!opts.bare && (model.consort || model.sections.length)) children.push(H1('Results', brand));
    let fig = opts.figStart || 1, tab = opts.tabStart || 1; // numbering may continue from an earlier chapter or paper
    if (model.consort) {
      if (model.intro) { children.push(para(model.intro)); arAfter(model.intro); }
      const fl = figLabel(pre + fig++, opts.captionStyle), ft = model.flowCaption || 'CONSORT flowchart of the enrolled patients';
      listFigs.push(`${fl} ${ft}`);
      if (opts.captionStyle === 'apa') children.push(...apaCaption(fl, ft), image(model.consort.url, model.consort.w, model.consort.h, opts.paper ? 470 : 600));
      else children.push(image(model.consort.url, model.consort.w, model.consort.h, opts.paper ? 470 : 600), caption(`${fl} ${ft}`));
      if (AR) children.push(arPara(`الشكل ${pre + (fig - 1)}: ${AR.caption(ft)}`, { bold: true, center: true, line: 276, after: 160 }));
    } else if (opts.paper && model.intro) children.push(para(model.intro));
    if (model.narrative) model.narrative.split(/\n\s*\n/).forEach(t => { if (t.trim()) { children.push(para(t.trim())); arAfter(t.trim()); } });
    // one combined results paragraph instead of a comment with each table
    const merged = opts.commentMerge === 'combined' && opts.commentPlace !== 'none';
    if (merged) { const all = model.sections.filter(s => s.tableOn !== false && s.comment).map(s => s.comment.trim()).join(' '); if (all) children.push(commentPara(all, { boldSig: opts.boldSigText })); }
    const [w1, w2] = opts.twoCol ? [270, 135] : FIG_W[opts.figWidth] || FIG_W.full;
    const placeFigures = list => {
      const apa = opts.captionStyle === 'apa';
      const figs = list.filter(f => f.url).map(f => { const num = figLabel(pre + fig++, opts.captionStyle); listFigs.push(`${num} ${f.caption}`); return { ...f, apa, num, label: `${num} ${f.caption}` }; });
      if (opts.figPerRow === 2 && figs.length > 1) children.push(figureGrid(figs, w2), para('', { after: 80 }));
      else for (const f of figs) {
        // APA places the number and title above the figure and the explanation below it as a note
        if (apa) {
          children.push(...apaCaption(f.num, f.caption), image(f.url, f.w, f.h, w1));
          if (f.note) children.push(para('Note. ' + f.note, { size: 20, line: 240, after: 200, align: AlignmentType.LEFT }));
        } else if (opts.capAbove) {
          children.push(caption(f.label, f.note ? { note: f.note, noteSize: 20 } : {}), image(f.url, f.w, f.h, w1, false));
          children.push(para('', { after: 120, line: 240 }));
        } else {
          children.push(image(f.url, f.w, f.h, w1));
          children.push(caption(f.label, f.note ? { note: f.note, noteSize: 20 } : {}));
        }
        if (AR) children.push(arPara(`الشكل ${String(f.num).replace(/^\D+/, '').replace(/[:.]$/, '')}: ${AR.caption(f.caption)}${f.note ? ' ' + AR.caption(f.note) : ''}`, { bold: true, center: true, size: 22, line: 276, after: 200 }));
      }
    };
    const atEnd = arrangeFigures(model.sections, opts.figPlacement); let headN = 0;
    // figure numbers of a section, for "(Figure 3)" at the end of its comment
    const endNum = new Map(); if (atEnd) atEnd.filter(f => f.url).forEach((f, i) => endNum.set(f, fig + i));
    const figRef = (s, text) => {
      if (!opts.figRef || !text) return text;
      const ns = s.figures.filter(f => f.url).map((f, i) => atEnd ? endNum.get(f) : fig + i).filter(n => n !== undefined); if (!ns.length) return text;
      const lab = ns.length === 1 ? `Figure ${pre}${ns[0]}` : ns.length === 2 ? `Figures ${pre}${ns[0]} and ${pre}${ns[1]}` : `Figures ${pre}${ns[0]}–${pre}${ns[ns.length - 1]}`;
      return text.replace(/\s*([.!?])?\s*$/, ` (${lab})$1`).replace(/\)$/, ').');
    };
    const findings = s => opts.keyFindings && s.findings && s.findings.length
      ? [para('Key findings:', { bold: true, after: 60, keepNext: true }), ...s.findings.map((x, i) => para(`${i + 1}. ${x}`, { after: 40, line: 276, align: AlignmentType.LEFT }))] : [];
    // orientation "auto": wide tables (more than 7 columns) on landscape pages of their own
    const turns = [], portraitW = PAGE_W, landW = ph0 - 2 * mg, nColsOf = h => h.reduce((t, c) => t + ((typeof c === 'string' ? 1 : c.span) || 1), 0);
    // long tables split into parts of at most N rows (never inside a variable), each part after the first captioned "(continued)"
    const chunks = rows => { const N = +opts.splitRows; if (!N || rows.length <= N) return [rows];
      const blocks = []; let cover = 0; // a block is one variable: a row and the rows its row spans cover
      rows.forEach(r => { if (cover === 0) blocks.push([]); blocks[blocks.length - 1].push(r); cover = Math.max(cover - 1, ...r.map(c => (c.rs || 1) - 1)); });
      const out = [[]]; blocks.forEach(bk => { const cur = out[out.length - 1]; if (cur.length && cur.length + bk.length > N) out.push([...bk]); else cur.push(...bk); }); return out; };
    for (const s of model.sections) {
      if (s.tableOn !== false) {
        // thesis: each table starts on a new page (from its subheading, comment or caption, whichever comes first)
        let brk = !!opts.tableNewPage;
        const first = () => { const b = brk; brk = false; return b; };
        const wideT = opts.orientation === 'auto' && nColsOf(s.head) > 7;
        if (wideT) { turns.push({ at: children.length, land: true }); PAGE_W = landW; brk = false; }
        // chapter-numbered subheadings: 4.1, 4.2 …
        if (opts.sectionHeads) children.push(subheading(opts.headNum ? `${(opts.numberPrefix || '').replace(/\.$/, '') || '1'}.${++headN} ${s.title}` : s.title, brand, first()));
        const cp = s.place && opts.commentPlace !== 'none' ? s.place : opts.commentPlace;
        if (s.comment && !merged && cp === 'before') { children.push(commentPara(figRef(s, s.comment), { pageBreakBefore: first(), boldSig: opts.boldSigText })); arAfter(s.comment); }
        const num = `Table ${pre}${tab++}`;
        listTabs.push(`${num}${opts.tableCaption === 'period' || opts.tableCaption === 'apa' ? '.' : ':'} ${s.title}`);
        if (opts.tableCaption === 'apa') children.push(...apaCaption(num, s.title, { pageBreakBefore: first() }));
        else children.push(caption(`${num}${opts.tableCaption === 'period' ? '.' : ':'} ${s.title}`, { pageBreakBefore: first(), align: { justify: D().AlignmentType.JUSTIFIED, left: D().AlignmentType.LEFT }[opts.tableCapAlign] || D().AlignmentType.CENTER }));
        if (AR) children.push(arPara(`الجدول ${pre}${tab - 1}: ${AR.caption(s.title)}`, { bold: true, keepNext: true, line: 276, after: 120 }));
        // bilingual column headings: the Arabic below the English
        const headAr = AR ? s.head.map(h => { const c = typeof h === 'string' ? { t: h } : { ...h }, a = AR.head(c.t); return a ? { ...c, t: [c.t, a] } : c; }) : s.head;
        chunks(s.rows).forEach((part, pi) => {
          if (pi > 0) { const cont = `${num} (continued)`; children.push(opts.tableCaption === 'apa' ? para(cont, { bold: true, align: D().AlignmentType.LEFT, after: 120, line: 276, keepNext: true, before: 200 }) : caption(cont, { before: 200, align: D().AlignmentType.LEFT })); }
          children.push(table(headAr, part, brand, opts.tableStyle, opts.tableLook));
        });
        children.push(para(s.footnote, { size: 18, line: 240, after: 160, before: 60 }));
        if (AR && s.footnote) children.push(arPara(AR.footnote(s.footnote), { size: 18, line: 240, after: 160 }));
        if (s.comment && !merged && (cp || 'after') === 'after') { children.push(commentPara(figRef(s, s.comment), { boldSig: opts.boldSigText })); arAfter(s.comment); }
        if (!merged && opts.commentPlace !== 'none') children.push(...findings(s));
        if (wideT) { turns.push({ at: children.length, land: false }); PAGE_W = portraitW; }
      }
      if (!atEnd) placeFigures(s.figures);
    }
    if (atEnd && atEnd.some(f => f.url)) {
      children.push(heading('Figures', brand));
      placeFigures(atEnd);
    }
    if (model.abbrev) { children.push(H1('Abbreviations', brand)); children.push(para(model.abbrev, { size: 20 })); }
    if (model.summary) {
      children.push(H1('Summary of key findings', brand));
      children.push(para(model.summary)); arAfter(model.summary);
    }

    // appendix: codebook, test plan, every result table (prepared by the app), the reporting checklist, and the references of the methods
    const plainTbl = t => table(t.head, t.rows.map(r => r.map(c => typeof c === 'object' && c !== null ? c : { t: [String(c ?? '')] })), brand, opts.tableStyle, { ...opts.tableLook, size: 9 });
    if (opts.appendix && opts.appendix.length) { children.push(new Paragraph({ children: [new (D().PageBreak)()] }), heading('Appendix', brand));
      opts.appendix.forEach(t => { children.push(subheading(t.title, brand)); children.push(plainTbl(t)); if (t.note) children.push(para(t.note, { size: 18, line: 240, after: 160, before: 60 })); }); }
    if (opts.refs && opts.refs.length) { children.push(heading('References', brand)); opts.refs.forEach((r, i) => children.push(para(`${i + 1}. ${r}`, { line: 276, after: 80, align: AlignmentType.LEFT }))); }
    if (opts.listTF && (listTabs.length || listFigs.length)) {
      const lst = [];
      if (listTabs.length) lst.push(heading('List of tables', brand), ...listTabs.map(t => para(t, { line: 276, after: 60, align: AlignmentType.LEFT })));
      if (listFigs.length) lst.push(heading('List of figures', brand), ...listFigs.map(t => para(t, { line: 276, after: 60, align: AlignmentType.LEFT })));
      lst.push(new Paragraph({ children: [new (D().PageBreak)()] }));
      children.splice(listAt, 0, ...lst);
      turns.forEach(t => { if (t.at >= listAt) t.at += lst.length; });
    }
    const headerKids = [];
    // a light "DRAFT" mark in the header of every page
    if (opts.watermark) headerKids.push(new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ text: String(opts.watermark).toUpperCase(), bold: true, size: 72, color: 'D9D9D9', font: BODY_FONT })] }));
    if (opts.headerText) headerKids.push(new Paragraph({ alignment: AlignmentType.RIGHT, children: [new TextRun({ text: opts.headerText, italics: true, size: 18, font: BODY_FONT, color: '555555' })] }));
    if (brand) {
      headerKids.push(new Paragraph({
        alignment: AlignmentType.RIGHT,
        border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: '7B2FBE', space: 4 } },
        children: [
          new ImageRun({ type: 'png', data: dataUrlToBytes(opts.logo), transformation: { width: 38, height: 38 } }),
          new TextRun({ text: '  Prof MSE Easy Stat', bold: true, color: '1C1648', size: 18, font: 'Segoe UI' })
        ]
      }));
    }
    // the document's sections: one, or portrait / landscape stretches when wide tables turn the page
    const parts = []; let from = 0, land = landscape;
    turns.forEach(t => { if (t.at > from) parts.push({ land, kids: children.slice(from, t.at) }); from = t.at; land = t.land; });
    parts.push({ land, kids: children.slice(from) });
    const hs = (id, name, size, before, after) => ({ id, name, basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { bold: true, size, font: BODY_FONT, color: brand ? '1C1648' : '000000' }, paragraph: { spacing: { before, after }, keepNext: true } });
    const doc = new Document({
      creator: 'Prof MSE Easy Stat',
      title: opts.title || 'Statistical report',
      ...(opts.toc ? { features: { updateFields: true } } : {}),
      ...(Object.keys(footnotes).length ? { footnotes } : {}),
      styles: { default: { document: { run: { font: BODY_FONT, size: 24 } } }, ...(WORD_STYLES ? { paragraphStyles: [hs('Heading1', 'Heading 1', 30, 240, 160), hs('Heading2', 'Heading 2', 26, 240, 120)] } : {}) },
      sections: parts.filter(pt => pt.kids.length).map(pt => ({
        properties: { page: { size: pt.land ? { width: pw0, height: ph0, orientation: D().PageOrientation.LANDSCAPE } : { width: pw0, height: ph0 }, margin: { top: mg, bottom: mg, left: mg, right: mg } },
          // line numbers for journal submission, and a two-column layout
          ...(opts.lineNumbers ? { lineNumbers: { countBy: 1, restart: D().LineNumberRestartFormat.CONTINUOUS } } : {}), ...(opts.twoCol ? { column: { count: 2, space: 708 } } : {}) },
        headers: { default: new Header({ children: headerKids.map(k => k) }) },
        footers: {
          // page numbers: centred (default), right, "Page 3 of 12" or none
          default: new Footer({
            children: pg.pageNum === 'none' ? [] : [new Paragraph({
              alignment: pg.pageNum === 'right' ? AlignmentType.RIGHT : AlignmentType.CENTER,
              children: pg.pageNum === 'of' ? [new TextRun({ children: ['Page ', PageNumber.CURRENT, ' of ', PageNumber.TOTAL_PAGES], size: 18, font: BODY_FONT })] : [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: BODY_FONT })]
            })]
          })
        },
        children: pt.kids
      }))
    });
    return Packer.toBlob(doc);
  }

  // results by variable: every table of each variable, with its figure, in a landscape document
  async function buildResults(model, opts) {
    const { Document, Packer, Paragraph, TextRun, Footer, AlignmentType, PageNumber, PageOrientation } = D();
    BODY_FONT = opts.font || DEFAULT_FONT; ITALIC_P = false;
    PAGE_W = LANDSCAPE_W; LINE = 360;
    const children = [para(opts.title || 'Results by variable', { bold: true, size: 32, align: AlignmentType.CENTER, after: 120 })];
    if (opts.subtitle) children.push(para(opts.subtitle, { align: AlignmentType.CENTER, size: 20, after: 240 }));
    // key results: one table of every variable (group values, test, P), then the figures; gallery: the figures two per row
    if (opts.layout === 'cards' || opts.layout === 'gallery') {
      const { Table, TableRow, TableCell, WidthType, BorderStyle } = D(), none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
      if (opts.layout === 'cards') {
        children.push(para('Key results', { bold: true, size: 26, after: 80, align: AlignmentType.LEFT, keepNext: true }));
        children.push(table(['Variable', 'Values', 'n', 'Test', 'P value'].map(t => ({ t })), model.items.map(it => [{ t: [it.label], b: true }, { t: it.key && it.key.length ? it.key : ['—'], small: true }, { t: [String(it.n ?? '—')] }, { t: [it.test || '—'], small: true }, { t: [it.p || '—'], b: !!it.sig }]), false, 'grid'));
        children.push(para('', { after: 200 }));
      }
      const figs = model.items.filter(it => it.url), half = Math.round((LANDSCAPE_W - 200) / 2), cell = kids => new TableCell({ width: { size: half, type: WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none }, children: kids });
      // inside the layout table nothing keeps with next, or the first row is pushed to the next page
      const fig = it => [image(it.url, it.w, it.h, 440, false), para(`${it.label} — ${it.test || 'no test'}${it.p ? `, P ${/^[<>=≤]/.test(it.p) ? it.p : '= ' + it.p}` : ''}`, { bold: true, size: 19, align: AlignmentType.CENTER, after: 200, line: 240 })];
      const rows = []; for (let i = 0; i < figs.length; i += 2) rows.push(new TableRow({ cantSplit: true, children: [cell(fig(figs[i])), cell(figs[i + 1] ? fig(figs[i + 1]) : [new Paragraph('')])] }));
      if (rows.length) children.push(new Table({ width: { size: LANDSCAPE_W, type: WidthType.DXA }, columnWidths: [half, LANDSCAPE_W - half], borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none }, rows }));
    } else model.items.forEach((it, i) => {
      children.push(new Paragraph({ heading: D().HeadingLevel.HEADING_1, pageBreakBefore: i > 0, spacing: { after: 120 },
        children: [new TextRun({ text: `${i + 1}. ${it.label}`, bold: true, size: 28, font: BODY_FONT })] }));
      if (it.summary) children.push(para(it.summary, { size: 20, line: 260, after: 120, italic: true }));
      // inside the side-by-side layout the titles must not "keep with next" (Word / LibreOffice would push the whole layout to the next page)
      const block = (t, small, inCell) => [para(t.title, { bold: true, size: small ? 19 : 22, line: 260, after: 60, before: 120, keepNext: !inCell, align: AlignmentType.LEFT }),
        table(t.head.map(h => ({ t: h })), t.rows.map(r => r.map(c => ({ t: [c], small }))), false, 'grid')];
      if ((opts.layout === 'side' || opts.layout === 'half') && it.data && it.data.length) {
        // the patients' data beside the results (a borderless two-column layout), the figure below
        const { Table, TableRow, TableCell, WidthType, BorderStyle } = D(), none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const gap = 200, leftW = Math.round((LANDSCAPE_W - gap) * (opts.layout === 'half' ? 0.5 : 0.3)), rightW = LANDSCAPE_W - gap - leftW;
        // long patient lists are cut into pieces of 14 rows, one layout row each, so no layout row is taller than a page
        const CH = 14, pieces = it.data.flatMap(t => Array.from({ length: Math.max(1, Math.ceil(t.rows.length / CH)) }, (_, q) => ({ ...t, title: q ? `${t.title} (continued)` : t.title, rows: t.rows.slice(q * CH, q * CH + CH) })));
        PAGE_W = leftW - 120; const lefts = pieces.map(t => block(t, true, true));
        // the result tables go one per layout row (summary beside the first data piece, effects beside the next), so no row outgrows the page
        PAGE_W = rightW - 120; const rights = opts.layout === 'half' ? it.tables.map(t => block(t, false, true)) : [it.tables.flatMap(t => block(t, false, true))];
        PAGE_W = LANDSCAPE_W;
        const cell = (w, kids) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none }, children: kids.length ? kids : [new Paragraph('')] });
        children.push(new Table({ width: { size: LANDSCAPE_W, type: WidthType.DXA }, columnWidths: [leftW, gap, rightW],
          borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
          rows: Array.from({ length: Math.max(lefts.length, rights.length) }, (_, q) => new TableRow({ cantSplit: true, children: [cell(leftW, lefts[q] || []), cell(gap, []), cell(rightW, rights[q] || [])] })) }));
        if (it.url) children.push(para('', { after: 60 }), image(it.url, it.w, it.h, 520, !!it.comment));
        if (it.comment) children.push(para(it.comment, { size: 22, line: 300, after: 120 }));
      } else {
        if (it.url && opts.layout !== 'compact') children.push(image(it.url, it.w, it.h, opts.layout === 'stacked' ? 640 : 430));
        if (it.comment) children.push(para(it.comment, { size: 22, line: 300, after: 120 }));
        it.tables.forEach(t => children.push(...block(t, false)));
        (it.data || []).forEach(t => children.push(...block(t, true)));
      }
      // your own note on the variable (step 10)
      if (it.note) children.push(para(`Note: ${it.note}`, { size: 22, line: 300, after: 120, italic: true }));
    });
    const doc = new Document({
      creator: 'Prof MSE Easy Stat', title: opts.title || 'Results by variable',
      styles: { default: { document: { run: { font: BODY_FONT, size: 20 } } } },
      sections: [{
        properties: { page: { size: { width: 11906, height: 16838, orientation: PageOrientation.LANDSCAPE }, margin: { top: 1134, bottom: 1134, left: 1440, right: 1440 } } },
        footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: BODY_FONT })] })] }) },
        children
      }]
    });
    return Packer.toBlob(doc);
  }

  return { build, buildResults, figLabel, arrangeFigures };
})();

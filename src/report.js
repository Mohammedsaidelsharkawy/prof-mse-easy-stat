/* Prof MSE Easy Stat — Word (.docx) export using docx.js */
const Report = (() => {
  const D = () => window.docx;
  const DEFAULT_FONT = 'Times New Roman';
  let BODY_FONT = DEFAULT_FONT; // set per build from the report options
  const PORTRAIT_W = 9026, LANDSCAPE_W = 13958; // A4 text width with 1" margins (DXA)
  let PAGE_W = PORTRAIT_W; // set per build from the page orientation
  let ITALIC_P = false; // APA / AMA / NEJM: the P of P values in italics

  // text runs of a paragraph; with ITALIC_P the letter P of "P = 0.01", "p < .001" or a "P" heading is set in italics
  function runs(text, o = {}) {
    const { TextRun } = D();
    const mk = (t, it) => new TextRun({ text: t, bold: o.bold, italics: o.italic || it, size: o.size || 24, font: BODY_FONT, color: o.color });
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

  function para(text, o = {}) {
    const { Paragraph, TextRun, AlignmentType } = D();
    return new Paragraph({
      alignment: o.align || AlignmentType.JUSTIFIED,
      spacing: { after: o.after ?? 160, line: o.line ?? 360, before: o.before ?? 0 },
      keepNext: o.keepNext, pageBreakBefore: o.pageBreakBefore,
      children: [...runs(text, o), ...(o.note ? runs((/[.!?]$/.test(text.trim()) ? ' ' : '. ') + o.note, { ...o, bold: false, size: o.noteSize || o.size }) : [])]
    });
  }
  function heading(text, brand) {
    const { Paragraph, TextRun, HeadingLevel } = D();
    return new Paragraph({
      heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 160 },
      children: [new TextRun({ text, bold: true, size: 30, font: BODY_FONT, color: brand ? '1C1648' : '000000' })]
    });
  }
  function subheading(text, brand, pageBreakBefore) {
    const { Paragraph, TextRun, HeadingLevel } = D();
    return new Paragraph({
      heading: HeadingLevel.HEADING_2, spacing: { before: 240, after: 120 }, keepNext: true, pageBreakBefore,
      children: [new TextRun({ text, bold: true, size: 26, font: BODY_FONT, color: brand ? '5E1F96' : '000000' })]
    });
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
  function image(dataUrl, srcW, srcH, widthPx = 600) {
    const { Paragraph, ImageRun, AlignmentType } = D();
    return new Paragraph({
      alignment: AlignmentType.CENTER, spacing: { after: 80 }, keepNext: true,
      children: [new ImageRun({ type: 'png', data: dataUrlToBytes(dataUrl), transformation: { width: widthPx, height: Math.round(widthPx * srcH / srcW) } })]
    });
  }

  // Generic table model → docx Table. Cells: {t:[lines], b, rs (rowSpan), span (colSpan), small}
  function table(head, rows, brand, style = 'grid') {
    const { Table, TableRow, TableCell, Paragraph, TextRun, WidthType, AlignmentType, ShadingType, VerticalAlign, BorderStyle } = D();
    const headCells = head.map(h => typeof h === 'string' ? { t: h } : h);
    const nCols = headCells.reduce((s, h) => s + (h.span || 1), 0);
    // relative column weights: first label columns wider, effect column widest
    const weights = [];
    const isP = name => /^(p value|p|p-value)$/i.test(name);
    headCells.forEach((h, i) => {
      for (let s = 0; s < (h.span || 1); s++) {
        const name = h.t || '';
        // very wide tables (e.g. ROC) need roomier label and P value columns
        const wide = nCols > 7;
        weights.push(i === 0 ? (h.span === 2 ? (s === 0 ? 1.1 : 1.0) : wide ? 1.05 : 0.85) : /CI/.test(name) ? 1.6 : /Post hoc/.test(name) ? 0.95 : isP(name) ? (wide ? 0.95 : 0.7) : /^Test$/.test(name) ? 0.8 : 1.15);
      }
    });
    const tot = weights.reduce((a, b) => a + b, 0);
    const widths = weights.map(w => Math.floor(PAGE_W * w / tot));
    widths[widths.length - 1] += PAGE_W - widths.reduce((a, b) => a + b, 0);

    const apa = style === 'apa';
    const border = { style: BorderStyle.SINGLE, size: 4, color: '8C8C8C' };
    const none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
    const rule = size => ({ style: BorderStyle.SINGLE, size, color: '000000' });
    const gridBorders = { top: border, bottom: border, left: border, right: border };
    // three-line (academic) tables: heavy rule above and below the header, heavy rule closing the table
    const apaBorders = (isHead, isLast) => ({ top: isHead ? rule(12) : none, bottom: isHead ? rule(8) : isLast ? rule(12) : none, left: none, right: none });
    const mkCell = (cell, colIdx, isHead, isLast) => {
      const lines = Array.isArray(cell.t) ? cell.t : [cell.t ?? ''];
      let w = 0;
      for (let s = 0; s < (cell.span || 1); s++) w += widths[colIdx + s] || 0;
      return new TableCell({
        width: { size: w, type: WidthType.DXA },
        columnSpan: cell.span, rowSpan: cell.rs,
        verticalAlign: VerticalAlign.CENTER, borders: apa ? apaBorders(isHead, isLast) : gridBorders,
        margins: { top: 40, bottom: 40, left: 50, right: 50 },
        shading: isHead && !apa ? { type: ShadingType.CLEAR, color: 'auto', fill: brand ? 'EBDDF6' : 'D9D9D9' } : undefined,
        children: lines.map(l => new Paragraph({
          alignment: AlignmentType.CENTER, spacing: { after: 0, line: 240 },
          children: runs(String(l), { bold: isHead || cell.b, size: cell.small ? 17 : 20 })
        }))
      });
    };
    // track occupied columns from row spans to compute each cell's column index
    const occupied = [];
    const trs = [];
    const headRow = new TableRow({ tableHeader: true, children: (() => { let c = 0; return headCells.map(h => { const cell = mkCell(h, c, true); c += h.span || 1; return cell; }); })() });
    trs.push(headRow);
    rows.forEach((r, ri) => {
      let col = 0;
      const cells = [];
      for (const cell of r) {
        while (occupied[ri] && occupied[ri][col]) col++;
        cells.push(mkCell(cell, col, false, ri + (cell.rs || 1) === rows.length));
        if (cell.rs > 1) for (let k = 1; k < cell.rs; k++) {
          occupied[ri + k] = occupied[ri + k] || [];
          for (let s = 0; s < (cell.span || 1); s++) occupied[ri + k][col + s] = true;
        }
        col += cell.span || 1;
      }
      trs.push(new TableRow({ cantSplit: true, children: cells }));
    });
    const tableBorders = apa ? { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none } : undefined;
    return new Table({ width: { size: PAGE_W, type: WidthType.DXA }, columnWidths: widths, rows: trs, borders: tableBorders });
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
    PAGE_W = landscape ? LANDSCAPE_W : PORTRAIT_W;
    const children = [];
    // thesis chapters number as "Table 4.1" / "Figure 4.1"; a journal paper uses sentence-case headings and one Results narrative
    const pre = opts.numberPrefix || '';
    if (opts.title) children.push(para(opts.title, { bold: true, size: 32, align: AlignmentType.CENTER, after: 240, color: brand ? '7B2FBE' : undefined }));
    if (model.abstract) {
      children.push(heading('Results for the abstract', brand));
      children.push(para(model.abstract));
    }
    if (model.methods) {
      children.push(heading(opts.paper ? 'Statistical analysis' : 'Statistical Analysis', brand));
      children.push(para(model.methods));
    }
    if (model.consort || model.sections.length) children.push(heading('Results', brand));
    let fig = opts.figStart || 1, tab = opts.tabStart || 1; // numbering may continue from an earlier chapter or paper
    if (model.consort) {
      if (model.intro) children.push(para(model.intro));
      const fl = figLabel(pre + fig++, opts.captionStyle), ft = model.flowCaption || 'CONSORT flowchart of the enrolled patients';
      if (opts.captionStyle === 'apa') children.push(...apaCaption(fl, ft), image(model.consort.url, model.consort.w, model.consort.h, opts.paper ? 470 : 600));
      else children.push(image(model.consort.url, model.consort.w, model.consort.h, opts.paper ? 470 : 600), caption(`${fl} ${ft}`));
    } else if (opts.paper && model.intro) children.push(para(model.intro));
    if (model.narrative) model.narrative.split(/\n\s*\n/).forEach(t => t.trim() && children.push(para(t.trim())));
    const [w1, w2] = FIG_W[opts.figWidth] || FIG_W.full;
    const placeFigures = list => {
      const apa = opts.captionStyle === 'apa';
      const figs = list.filter(f => f.url).map(f => { const num = figLabel(pre + fig++, opts.captionStyle); return { ...f, apa, num, label: `${num} ${f.caption}` }; });
      if (opts.figPerRow === 2 && figs.length > 1) children.push(figureGrid(figs, w2), para('', { after: 80 }));
      else for (const f of figs) {
        // APA places the number and title above the figure and the explanation below it as a note
        if (apa) {
          children.push(...apaCaption(f.num, f.caption), image(f.url, f.w, f.h, w1));
          if (f.note) children.push(para('Note. ' + f.note, { size: 20, line: 240, after: 200, align: AlignmentType.LEFT }));
        } else {
          children.push(image(f.url, f.w, f.h, w1));
          children.push(caption(f.label, f.note ? { note: f.note, noteSize: 20 } : {}));
        }
      }
    };
    const atEnd = arrangeFigures(model.sections, opts.figPlacement);
    for (const s of model.sections) {
      if (s.tableOn !== false) {
        // thesis: each table starts on a new page (from its subheading, comment or caption, whichever comes first)
        let brk = !!opts.tableNewPage;
        const first = () => { const b = brk; brk = false; return b; };
        if (opts.sectionHeads) children.push(subheading(s.title, brand, first()));
        if (s.comment && opts.commentPlace === 'before') children.push(para(s.comment, { pageBreakBefore: first() }));
        const num = `Table ${pre}${tab++}`;
        if (opts.tableCaption === 'apa') children.push(...apaCaption(num, s.title, { pageBreakBefore: first() }));
        else children.push(caption(`${num}${opts.tableCaption === 'period' ? '.' : ':'} ${s.title}`, { pageBreakBefore: first() }));
        children.push(table(s.head, s.rows, brand, opts.tableStyle));
        children.push(para(s.footnote, { size: 18, line: 240, after: 160, before: 60 }));
        if (s.comment && (opts.commentPlace || 'after') === 'after') children.push(para(s.comment));
      }
      if (!atEnd) placeFigures(s.figures);
    }
    if (atEnd && atEnd.some(f => f.url)) {
      children.push(heading('Figures', brand));
      placeFigures(atEnd);
    }
    if (model.summary) {
      children.push(heading('Summary of key findings', brand));
      children.push(para(model.summary));
    }

    const headerKids = [];
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
    const doc = new Document({
      creator: 'Prof MSE Easy Stat',
      title: opts.title || 'Statistical report',
      styles: { default: { document: { run: { font: BODY_FONT, size: 24 } } } },
      sections: [{
        properties: { page: { size: landscape ? { width: 11906, height: 16838, orientation: D().PageOrientation.LANDSCAPE } : { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
        headers: { default: new Header({ children: headerKids }) },
        footers: {
          default: new Footer({
            children: [new Paragraph({
              alignment: AlignmentType.CENTER,
              children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, font: BODY_FONT })]
            })]
          })
        },
        children
      }]
    });
    return Packer.toBlob(doc);
  }

  // results by variable: every table of each variable, with its figure, in a landscape document
  async function buildResults(model, opts) {
    const { Document, Packer, Paragraph, TextRun, Footer, AlignmentType, PageNumber, PageOrientation } = D();
    BODY_FONT = opts.font || DEFAULT_FONT; ITALIC_P = false;
    PAGE_W = LANDSCAPE_W;
    const children = [para(opts.title || 'Results by variable', { bold: true, size: 32, align: AlignmentType.CENTER, after: 120 })];
    if (opts.subtitle) children.push(para(opts.subtitle, { align: AlignmentType.CENTER, size: 20, after: 240 }));
    model.items.forEach((it, i) => {
      children.push(new Paragraph({ heading: D().HeadingLevel.HEADING_1, pageBreakBefore: i > 0, spacing: { after: 120 },
        children: [new TextRun({ text: `${i + 1}. ${it.label}`, bold: true, size: 28, font: BODY_FONT })] }));
      if (it.summary) children.push(para(it.summary, { size: 20, line: 260, after: 120, italic: true }));
      // inside the side-by-side layout the titles must not "keep with next" (Word / LibreOffice would push the whole layout to the next page)
      const block = (t, small, inCell) => [para(t.title, { bold: true, size: small ? 19 : 22, line: 260, after: 60, before: 120, keepNext: !inCell, align: AlignmentType.LEFT }),
        table(t.head.map(h => ({ t: h })), t.rows.map(r => r.map(c => ({ t: [c], small }))), false, 'grid')];
      if (opts.layout === 'side' && it.data && it.data.length) {
        // the patients' data beside the results (a borderless two-column layout), the figure below
        const { Table, TableRow, TableCell, WidthType, BorderStyle } = D(), none = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' };
        const gap = 200, leftW = Math.round((LANDSCAPE_W - gap) * 0.3), rightW = LANDSCAPE_W - gap - leftW;
        // long patient lists are cut into pieces of 14 rows, one layout row each, so no layout row is taller than a page
        const CH = 14, pieces = it.data.flatMap(t => Array.from({ length: Math.max(1, Math.ceil(t.rows.length / CH)) }, (_, q) => ({ ...t, title: q ? `${t.title} (continued)` : t.title, rows: t.rows.slice(q * CH, q * CH + CH) })));
        PAGE_W = leftW - 120; const lefts = pieces.map(t => block(t, true, true));
        PAGE_W = rightW - 120; const right = it.tables.flatMap(t => block(t, false, true));
        PAGE_W = LANDSCAPE_W;
        const cell = (w, kids) => new TableCell({ width: { size: w, type: WidthType.DXA }, borders: { top: none, bottom: none, left: none, right: none }, children: kids.length ? kids : [new Paragraph('')] });
        children.push(new Table({ width: { size: LANDSCAPE_W, type: WidthType.DXA }, columnWidths: [leftW, gap, rightW],
          borders: { top: none, bottom: none, left: none, right: none, insideHorizontal: none, insideVertical: none },
          rows: lefts.map((l, q) => new TableRow({ cantSplit: true, children: [cell(leftW, l), cell(gap, []), cell(rightW, q === 0 ? right : [])] })) }));
        if (it.url) children.push(para('', { after: 60 }), image(it.url, it.w, it.h, 520));
      } else {
        if (it.url && opts.layout !== 'compact') children.push(image(it.url, it.w, it.h, 430));
        it.tables.forEach(t => children.push(...block(t, false)));
        (it.data || []).forEach(t => children.push(...block(t, true)));
      }
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

/* Prof MSE Easy Stat — Word (.docx) export using docx.js */
const Report = (() => {
  const D = () => window.docx;
  const DEFAULT_FONT = 'Times New Roman';
  let BODY_FONT = DEFAULT_FONT; // set per build from the report options
  const PAGE_W = 9026; // A4 text width with 1" margins (DXA)

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
      keepNext: o.keepNext,
      children: [new TextRun({ text, bold: o.bold, italics: o.italic, size: o.size || 24, font: BODY_FONT, color: o.color })]
    });
  }
  function heading(text, brand) {
    const { Paragraph, TextRun, HeadingLevel } = D();
    return new Paragraph({
      heading: HeadingLevel.HEADING_1, spacing: { before: 240, after: 160 },
      children: [new TextRun({ text, bold: true, size: 30, font: BODY_FONT, color: brand ? '1C1648' : '000000' })]
    });
  }
  function caption(text) {
    const { AlignmentType } = D();
    return para(text, { bold: true, align: AlignmentType.CENTER, after: 120, line: 276, keepNext: true });
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
    headCells.forEach((h, i) => {
      for (let s = 0; s < (h.span || 1); s++) {
        const name = h.t || '';
        weights.push(i === 0 ? (h.span === 2 ? (s === 0 ? 1.1 : 1.0) : 0.85) : /CI/.test(name) ? 1.6 : /Post hoc/.test(name) ? 0.95 : /P value/.test(name) ? 0.7 : 1.15);
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
          children: [new TextRun({ text: String(l), bold: isHead || cell.b, size: cell.small ? 17 : 20, font: BODY_FONT })]
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

  async function build(model, opts) {
    const { Document, Packer, Paragraph, TextRun, Header, Footer, ImageRun, AlignmentType, PageNumber, BorderStyle } = D();
    const brand = opts.branding;
    BODY_FONT = opts.font || DEFAULT_FONT;
    const children = [];
    if (opts.title) children.push(para(opts.title, { bold: true, size: 32, align: AlignmentType.CENTER, after: 240, color: brand ? '7B2FBE' : undefined }));
    children.push(heading('Statistical Analysis', brand));
    children.push(para(model.methods));
    children.push(heading('Results', brand));
    let fig = 1, tab = 1;
    if (model.consort) {
      if (model.intro) children.push(para(model.intro));
      children.push(image(model.consort.url, model.consort.w, model.consort.h, 600));
      children.push(caption(`Figure ${fig++}: CONSORT flowchart of the enrolled patients`));
    }
    for (const s of model.sections) {
      children.push(caption(`Table ${tab++}: ${s.title}`));
      children.push(table(s.head, s.rows, brand, opts.tableStyle));
      children.push(para(s.footnote, { size: 18, line: 240, after: 160, before: 60 }));
      if (s.comment) children.push(para(s.comment));
      for (const f of s.figures) {
        if (!f.url) continue;
        children.push(image(f.url, f.w, f.h, 560));
        children.push(caption(`Figure ${fig++}: ${f.caption}`));
      }
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
        properties: { page: { size: { width: 11906, height: 16838 }, margin: { top: 1440, bottom: 1440, left: 1440, right: 1440 } } },
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

  return { build };
})();

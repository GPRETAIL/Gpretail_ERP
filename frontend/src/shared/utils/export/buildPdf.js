import { alignmentFor, inferColumnKind, parseDateTime } from "./cellTypes";
import { formatParsed } from "./exportHeader";
import registerPdfFonts, { PDF_FONT, pdfSafeText } from "./pdfFonts";

const TOTAL_ROW = /^\s*(grand\s+)?total\b/i;
const MARGIN = 28;

const formatNumber = (value, decimals) => value.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });

/**
 * Builds the PDF for an export: A4 (landscape for wide tables), title and detail lines, a table that wraps long text,
 * right-aligns numbers and repeats its header on every page, bold total rows, and "Page x of y" with the store and date
 * at the foot. Uses an embedded font so the rupee sign and accented letters print.
 */
export default async function buildPdf({ headerLines = [], headers, rawBody, footerLeft = "" }) {
  const [{ jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const columnCount = Math.max(headers.length, 1);
  const doc = new jsPDF({ orientation: columnCount > 6 ? "landscape" : "portrait", unit: "pt", format: "a4", compress: true });
  await registerPdfFonts(doc);
  doc.setFont(PDF_FONT, "normal");

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const LOOK = {
    store: { font: "bold", size: 15, color: [15, 23, 42], gap: 18 },
    title: { font: "bold", size: 12, color: [30, 41, 59], gap: 15 },
    text: { font: "normal", size: 9, color: [51, 65, 85], gap: 12 },
    muted: { font: "normal", size: 8, color: [100, 116, 139], gap: 12 },
  };

  let y = MARGIN + 8;
  headerLines.forEach((line) => {
    const look = LOOK[line.style] || LOOK.text;
    doc.setFont(PDF_FONT, look.font);
    doc.setFontSize(look.size);
    doc.setTextColor(...look.color);
    const wrapped = doc.splitTextToSize(pdfSafeText(line.text), pageWidth - MARGIN * 2);
    doc.text(wrapped, pageWidth / 2, y, { align: "center" });
    y += wrapped.length * look.gap;
  });

  const kinds = headers.map((header, col) => inferColumnKind(header, rawBody.map((row) => row?.[col])));
  const aligns = headers.map((_, col) => alignmentFor(kinds[col], rawBody.map((row) => row?.[col])));
  const body = rawBody.map((row) => headers.map((_, col) => {
    const value = row?.[col];
    const kind = kinds[col];
    if ((kind.kind === "date" || kind.kind === "datetime") && typeof value === "string" && parseDateTime(value)) return formatParsed(parseDateTime(value));
    if (typeof value === "number" && (kind.kind === "number" || kind.kind === "money")) return formatNumber(value, kind.decimals || 0);
    if (value === null || value === undefined) return "";
    return pdfSafeText(typeof value === "string" || typeof value === "number" || typeof value === "boolean" ? value : Array.isArray(value) ? value.join(", ") : JSON.stringify(value));
  }));

  const fontSize = columnCount > 14 ? 6 : columnCount > 9 ? 7 : 8;
  autoTable(doc, {
    startY: y + 6,
    head: [headers.map(pdfSafeText)],
    body: body.length ? body : [[{ content: "No records found.", colSpan: columnCount, styles: { halign: "center" } }]],
    theme: "grid",
    margin: { left: MARGIN, right: MARGIN, top: MARGIN, bottom: MARGIN + 14 },
    styles: { font: PDF_FONT, fontSize, cellPadding: { top: 3, bottom: 3, left: 3.5, right: 3.5 }, overflow: "linebreak", valign: "middle", lineColor: [203, 213, 225], lineWidth: 0.4, textColor: [30, 41, 59] },
    headStyles: { font: PDF_FONT, fontStyle: "bold", fillColor: [232, 238, 247], textColor: [15, 23, 42], valign: "middle", halign: "center" },
    alternateRowStyles: { fillColor: [248, 250, 252] },
    columnStyles: Object.fromEntries(headers.map((_, col) => [col, { halign: aligns[col] }])),
    showHead: "everyPage",
    rowPageBreak: "avoid",
    didParseCell: (data) => {
      const source = data.section === "body" ? rawBody[data.row.index] : null;
      if (source && (TOTAL_ROW.test(String(source[0] ?? "")) || TOTAL_ROW.test(String(source[1] ?? "")))) {
        data.cell.styles.fontStyle = "bold";
        data.cell.styles.fillColor = [241, 245, 249];
      }
    },
  });

  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    doc.setFont(PDF_FONT, "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const baseline = pageHeight - MARGIN + 6;
    if (footerLeft) doc.text(pdfSafeText(footerLeft), MARGIN, baseline);
    doc.text(`Page ${page} of ${pages}`, pageWidth - MARGIN, baseline, { align: "right" });
  }

  return doc.output("blob");
}

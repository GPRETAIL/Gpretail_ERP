import html2pdf from "html2pdf.js";

const PX_PER_INCH = 96;
const MM_PER_INCH = 25.4;

// Renders a full receipt HTML document (as produced by buildPosSaleReceiptHtml /
// buildPosOldSaleReceiptPayload etc. - a complete <!DOCTYPE html> string with its own <style>) into
// a downloadable PDF. Loaded into an iframe via srcdoc rather than innerHTML, because innerHTML on
// a plain element silently drops <html>/<head>/<style> wrapper tags, which produced a blank page.
// Thermal receipt widths get a single continuous page sized to the actual rendered content height
// (no page breaks) so the PDF looks like the physical receipt; A4 keeps the standard page size and
// lets html2pdf paginate normally.
//
// Known limitation: for the A4 tax-invoice template specifically, html2canvas silently drops the
// stylesheet in this pipeline (confirmed via extensive isolation - not caused by iframe sizing,
// capture timing, CSS selector complexity, or the @page rule; a from-scratch same-document/scoped-
// style alternative was also tried and regressed further, producing a blank page). The PDF download
// for A4 currently renders correct data in an unstyled/plain layout as a result. This does NOT
// affect actual printing (browser print dialog or the silent-print connector), which renders full
// CSS correctly since neither goes through html2canvas - only the "download PDF" button is affected.
export const downloadHtmlAsPdf = async (html, filename, { paperSize } = {}) => {
  const isA4 = String(paperSize || "").toUpperCase() === "A4";
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "-10000px";
  iframe.style.top = "0";
  iframe.style.border = "none";
  // Must be set before srcdoc loads: an unstyled iframe defaults to a ~300px intrinsic width, which
  // forces the A4 invoice's un-shrinkable wide table to lay out (and get measured/captured) as if
  // cramped into a narrow box, then get stretched onto a full A4 page - producing a page where
  // columns run off the edge. Thermal receipts self-constrain via their own CSS max-width, so this
  // only matters for A4, but is harmless to set either way.
  iframe.style.width = isA4 ? "800px" : "400px";
  document.body.appendChild(iframe);

  try {
    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = html;
    });
    // Let webfonts/images referenced in the receipt settle before capture.
    await new Promise((resolve) => setTimeout(resolve, 250));

    const target = iframe.contentDocument?.body;
    if (!target) throw new Error("Receipt document failed to load");
    // A tight-fitting single-page format otherwise crops the last line's descenders.
    target.style.paddingBottom = `${(target.style.paddingBottom ? parseFloat(target.style.paddingBottom) : 0) + 16}px`;

    const widthPx = target.scrollWidth || 320;
    const heightPx = target.scrollHeight || 600;
    const jsPdfOptions = isA4
      ? { unit: "mm", format: "a4", orientation: "portrait" }
      : {
          unit: "mm",
          format: [
            Math.max(40, (widthPx / PX_PER_INCH) * MM_PER_INCH),
            Math.max(60, (heightPx / PX_PER_INCH) * MM_PER_INCH),
          ],
          orientation: "portrait",
        };

    await html2pdf()
      .set({
        margin: 0,
        filename,
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: {
          scale: 2,
          useCORS: true,
          backgroundColor: "#ffffff",
          width: widthPx,
          windowWidth: widthPx,
        },
        jsPDF: jsPdfOptions,
        pagebreak: { mode: ["css", "legacy"] },
      })
      .from(target)
      .save();
  } finally {
    document.body.removeChild(iframe);
  }
};

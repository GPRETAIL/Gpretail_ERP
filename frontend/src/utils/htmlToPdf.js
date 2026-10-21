import html2canvas from "html2canvas";
import { jsPDF } from "jspdf";

const PX_PER_INCH = 96;
const MM_PER_INCH = 25.4;

// Renders a full receipt HTML document (as produced by buildPosSaleReceiptHtml /
// buildPosOldSaleReceiptPayload etc. - a complete <!DOCTYPE html> string with its own <style>) into
// a jsPDF instance using html2canvas + jsPDF directly (replacing the legacy html2pdf.js wrapper).
// Loaded into an iframe via srcdoc rather than innerHTML, because innerHTML on a plain element
// silently drops <html>/<head>/<style> wrapper tags, which produced a blank page.
// Thermal receipt widths get a single continuous page sized to the actual rendered content height
// (no page breaks) so the PDF looks like the physical receipt; A4 keeps the standard page size and
// slices tall content across A4 pages when needed.
const renderReceiptHtmlToPdf = async (html, { paperSize } = {}) => {
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
    const pageWidthMm = Math.max(40, (widthPx / PX_PER_INCH) * MM_PER_INCH);
    const pageHeightMm = Math.max(60, (heightPx / PX_PER_INCH) * MM_PER_INCH);

    const canvas = await html2canvas(target, {
      scale: 2,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: widthPx,
      windowWidth: widthPx,
      logging: false,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.98);
    const jsPdfOptions = isA4
      ? { unit: "mm", format: "a4", orientation: "portrait" }
      : {
          unit: "mm",
          format: [pageWidthMm, pageHeightMm],
          orientation: "portrait",
        };

    const pdf = new jsPDF(jsPdfOptions);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();

    const renderedHeightMm = (canvas.height * pdfWidth) / Math.max(1, canvas.width);
    if (!isA4) {
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, renderedHeightMm);
    } else {
      let heightLeft = renderedHeightMm;
      let position = 0;

      pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, renderedHeightMm);
      heightLeft -= pdfHeight;

      while (heightLeft > 0.5) {
        position -= pdfHeight;
        pdf.addPage();
        pdf.addImage(imgData, "JPEG", 0, position, pdfWidth, renderedHeightMm);
        heightLeft -= pdfHeight;
      }
    }

    return pdf;
  } finally {
    document.body.removeChild(iframe);
  }
};

export const downloadHtmlAsPdf = async (html, filename, options = {}) => {
  const pdf = await renderReceiptHtmlToPdf(html, options);
  pdf.save(filename);
};

// Same rendering pipeline as downloadHtmlAsPdf above, but resolves to a File
// instead of triggering a save-to-disk - for navigator.share() (Web Share
// API) rather than a plain download.
export const getHtmlAsPdfBlob = async (html, filename, options = {}) => {
  const pdf = await renderReceiptHtmlToPdf(html, options);
  const blob = pdf.output("blob");
  return new File([blob], filename, { type: "application/pdf" });
};

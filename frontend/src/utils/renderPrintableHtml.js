import html2pdf from "html2pdf.js";

const PX_PER_MM = 96 / 25.4;
const DEFAULT_RENDER_SCALE = 2;

export const renderPrintableHtmlToImageJob = async (
  html,
  { scale = DEFAULT_RENDER_SCALE } = {}
) => {
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.left = "0";
  iframe.style.top = "0";
  iframe.style.width = "300px";
  iframe.style.height = "1200px";
  iframe.style.border = "none";
  iframe.style.zIndex = "-9999";
  iframe.style.opacity = "0.01";
  iframe.style.pointerEvents = "none";
  document.body.appendChild(iframe);

  try {
    await new Promise((resolve) => {
      iframe.onload = resolve;
      iframe.srcdoc = String(html || "");
    });

    // Allow QR codes, barcodes, and styles to settle
    await new Promise((resolve) => setTimeout(resolve, 300));

    const target = iframe.contentDocument?.querySelector(".receipt") || iframe.contentDocument?.body;
    // A <body> with no children is still a truthy DOM node, not null - rasterizing it would
    // silently produce a blank page/print instead of surfacing the real problem (empty input).
    if (!target || target.children.length === 0) {
      throw new Error("Printable HTML body is empty.");
    }

    const widthPx = Math.max(1, target.scrollWidth || target.offsetWidth || 280);
    const heightPx = Math.max(1, target.scrollHeight || target.offsetHeight || 600);

    const worker = html2pdf()
      .from(target)
      .set({
        margin: 0,
        html2canvas: {
          scale,
          useCORS: true,
          backgroundColor: "#ffffff",
          width: widthPx,
          height: heightPx,
          windowWidth: widthPx,
          windowHeight: heightPx,
          scrollY: 0,
          scrollX: 0,
          logging: false,
        },
      });

    const canvas = await worker.toCanvas().get("canvas");
    if (!canvas || typeof canvas.toDataURL !== "function") {
      throw new Error("Canvas rendering failed.");
    }

    return {
      imageDataUrl: canvas.toDataURL("image/png"),
      pageWidthMm: widthPx / PX_PER_MM,
      pageHeightMm: heightPx / PX_PER_MM,
    };
  } finally {
    iframe.remove();
  }
};

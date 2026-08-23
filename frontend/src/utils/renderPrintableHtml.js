import html2canvas from "html2canvas";

const PX_PER_MM = 96 / 25.4;
// Thermal receipt printers are commonly 203 DPI natively. At scale 2 the rendered source is only
// 96*2=192 DPI - just under that - so the printer ends up softly upscaling a source that's already
// lower-resolution than its own output, which reads as blur regardless of print-time interpolation
// settings. 2.5 = 240 DPI, a comfortable ~18% margin above native so the connector always
// downsamples slightly instead of upsampling - same crisp result as a higher scale, since the
// printer caps at 203 DPI regardless of source resolution. Bumping this further (this used to be
// 4 = 384 DPI) only spends extra render/binarize time and payload size for zero visible benefit -
// confirmed via a real QR decode and visual inspection at both 4 and 2.5 before lowering this.
const DEFAULT_RENDER_SCALE = 2.5;

/** An image that neither loads nor errors would otherwise block a receipt print indefinitely. */
const IMAGE_WAIT_TIMEOUT_MS = 3000;

const waitForImages = async (root) => {
  const images = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    images.map((image) => {
      if (image.complete) return Promise.resolve();
      return new Promise((resolve) => {
        const timer = setTimeout(resolve, IMAGE_WAIT_TIMEOUT_MS);
        const finish = () => {
          clearTimeout(timer);
          resolve();
        };
        image.addEventListener("load", finish, { once: true });
        image.addEventListener("error", finish, { once: true });
      });
    })
  );
};

// html2canvas rasterizes text/lines with normal anti-aliasing (soft grey edge pixels) - fine for a
// photo-realistic screenshot, but a thermal printer's head is 1-bit (pure black or white per dot).
// The printer driver has to threshold those grey edges down to black/white itself, and depending on
// exactly where the cutoff falls, glyphs come out looking uneven or partially missing - the same
// characters that print crisply from a real text-mode source (a plain document, an OS print of
// actual text) rather than a screenshot-style bitmap. Thresholding here, at the source, guarantees
// every pixel is already pure black or white before it ever reaches the printer, matching what a
// native text print would look like instead of leaving that decision to the driver.
const BINARIZE_LUMINANCE_THRESHOLD = 200;

// QR/barcode images are already pure 1-bit bitmaps (QRCode.toDataURL, the Code39 SVG) - they never
// needed thresholding, unlike anti-aliased text. Applying the same global threshold to them anyway
// is what broke UPI QR scanning: real receipts scanned fine before this function existed, and
// stopped once binarization started touching the whole canvas indiscriminately, including the QR
// region it had no reason to touch in the first place. Skipping exactly those regions restores the
// original (working) QR pixels while keeping the threshold for the text it was actually meant to fix.
const isInsideAnyRegion = (x, y, regions) =>
  regions.some((r) => x >= r.x && x < r.x + r.width && y >= r.y && y < r.y + r.height);

const binarizeCanvas = (canvas, { threshold = BINARIZE_LUMINANCE_THRESHOLD, excludedRegions = [] } = {}) => {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const { width, height } = canvas;
  if (width <= 0 || height <= 0) return;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (excludedRegions.length && isInsideAnyRegion(x, y, excludedRegions)) continue;
      const i = (y * width + x) * 4;
      const alpha = data[i + 3];
      if (alpha === 0) continue;
      const luminance = (0.299 * data[i]) + (0.587 * data[i + 1]) + (0.114 * data[i + 2]);
      const value = luminance < threshold ? 0 : 255;
      data[i] = value;
      data[i + 1] = value;
      data[i + 2] = value;
    }
  }
  ctx.putImageData(imageData, 0, 0);
};

// Bounding boxes (in captured-canvas pixel space) of every QR/barcode image in the receipt, so
// binarizeCanvas can leave them untouched. Must run while renderTarget is still attached to the
// document (getBoundingClientRect needs real layout) - i.e. before the container is removed.
const getCodeImageRegions = (root, scale) => {
  const rootRect = root.getBoundingClientRect();
  return Array.from(root.querySelectorAll(".barcode-wrap img")).map((img) => {
    const rect = img.getBoundingClientRect();
    return {
      x: Math.floor((rect.left - rootRect.left) * scale),
      y: Math.floor((rect.top - rootRect.top) * scale),
      width: Math.ceil(rect.width * scale),
      height: Math.ceil(rect.height * scale),
    };
  });
};

// The receipt template's own <style> block styles the real <body> tag directly (font, background,
// margin). That's fine inside an iframe, which has its own body - but once the content is imported
// into the MAIN document (see why below), a bare `body { ... }` rule would leak straight onto the
// real page's body instead of the receipt's wrapper. Scoping it to the wrapper's own class keeps the
// same visual result without touching the live page.
const scopeBodySelector = (cssText, scopeClass) =>
  String(cssText || "").replace(/\bbody\b/g, `.${scopeClass}`);

let scopeCounter = 0;

export const renderPrintableHtmlToImageJob = async (
  html,
  { scale = DEFAULT_RENDER_SCALE } = {}
) => {
  const parsedDoc = new DOMParser().parseFromString(String(html || ""), "text/html");
  const sourceTarget = parsedDoc.querySelector(".receipt") || parsedDoc.body;
  // A <body> with no children is still a truthy DOM node, not null - rasterizing it would
  // silently produce a blank page/print instead of surfacing the real problem (empty input).
  if (!sourceTarget || sourceTarget.children.length === 0) {
    throw new Error("Printable HTML body is empty.");
  }

  // html2canvas resolves stylesheets and <img> content through the document/window the target
  // element actually belongs to. An element living inside a separate iframe document silently
  // loses both - no error, no throw, just a plain unstyled text dump with the QR/barcode images
  // missing entirely, which is exactly the "receipt prints as bare text" bug this replaces.
  // Importing the parsed nodes into the SAME document html2canvas runs in (instead of an iframe)
  // is the standard, robust way to drive it. Calling html2canvas directly (rather than through
  // html2pdf.js's `.toCanvas()`) also sidesteps html2pdf's own PDF-page-oriented layout step, which
  // was silently producing a cropped/shifted canvas even with `margin: 0` set.
  const scopeClass = `printable-render-scope-${Date.now()}-${scopeCounter++}`;
  const container = document.createElement("div");
  container.className = scopeClass;
  container.style.position = "fixed";
  container.style.left = "0";
  container.style.top = "0";
  container.style.zIndex = "-9999";
  container.style.background = "#ffffff";
  container.style.pointerEvents = "none";

  const styleEl = document.createElement("style");
  styleEl.textContent = Array.from(parsedDoc.querySelectorAll("style"))
    .map((tag) => scopeBodySelector(tag.textContent, scopeClass))
    .join("\n");
  container.appendChild(styleEl);
  const renderTarget = document.importNode(sourceTarget, true);
  container.appendChild(renderTarget);
  document.body.appendChild(container);

  try {
    await waitForImages(container);
    // Two rAFs: one to let images just marked complete actually paint, one to let layout settle.
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

    const widthPx = Math.max(1, renderTarget.scrollWidth || renderTarget.offsetWidth || 280);
    const heightPx = Math.max(1, renderTarget.scrollHeight || renderTarget.offsetHeight || 600);

    const canvas = await html2canvas(renderTarget, {
      scale,
      useCORS: true,
      backgroundColor: "#ffffff",
      width: widthPx,
      height: heightPx,
      logging: false,
    });
    if (!canvas || typeof canvas.toDataURL !== "function") {
      throw new Error("Canvas rendering failed.");
    }
    const codeImageRegions = getCodeImageRegions(renderTarget, scale);
    binarizeCanvas(canvas, { excludedRegions: codeImageRegions });

    return {
      imageDataUrl: canvas.toDataURL("image/png"),
      pageWidthMm: widthPx / PX_PER_MM,
      pageHeightMm: heightPx / PX_PER_MM,
    };
  } finally {
    container.remove();
  }
};

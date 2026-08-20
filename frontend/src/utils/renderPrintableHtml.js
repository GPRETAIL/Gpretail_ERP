const PX_PER_MM = 96 / 25.4;
const DEFAULT_RENDER_SCALE = 2;

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

const waitForLayout = async () => {
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
  await new Promise((resolve) => requestAnimationFrame(() => resolve()));
};

const normalizeRenderCss = (cssText = "") =>
  String(cssText || "")
    .replace(/@page\s*\{[^{}]*\}/gi, "")
    .replace(/\bbody\b/g, ".render-body");

/**
 * Serializes a live DOM node as well-formed XML.
 *
 * <p>This is the whole reason the payment QR never printed. The receipt markup used to be spliced
 * into the SVG below as `element.innerHTML`, which is an HTML serialization: void elements come back
 * unclosed (`<img src="...">`, not `<img ... />`). A foreignObject is parsed as XML, so a single
 * unclosed tag makes the entire SVG malformed, the Image load fails, and the caller falls back to a
 * plain ESC/POS receipt carrying no barcode or QR at all.
 *
 * <p>It went unnoticed because until the payment QR shipped, a default receipt had no `<img>` in it
 * -- the bill barcode renders as inline `<svg>`, which serializes closed either way. XMLSerializer
 * self-closes void elements and emits the XHTML namespace, which is exactly what foreignObject wants.
 */
const serializeAsXml = (node) => new XMLSerializer().serializeToString(node);

/** CSS is character data, so a `<` (rare but legal, e.g. in a content string) would break the XML. */
const cssForXml = (cssText = "") => String(cssText || "").replace(/</g, "\\3C ");

export const renderPrintableHtmlToImageJob = async (
  html,
  { scale = DEFAULT_RENDER_SCALE } = {}
) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(String(html || ""), "text/html");
  const styles = Array.from(doc.querySelectorAll("style"))
    .map((node) => node.textContent || "")
    .join("\n");
  const renderCss = normalizeRenderCss(styles);
  const bodyContent = String(doc.body?.innerHTML || "").trim();

  if (!bodyContent) {
    throw new Error("Printable HTML body is empty.");
  }

  const host = document.createElement("div");
  host.style.position = "fixed";
  host.style.left = "-100000px";
  host.style.top = "0";
  host.style.visibility = "hidden";
  host.style.pointerEvents = "none";
  host.style.background = "#ffffff";
  host.style.zIndex = "-1";
  host.innerHTML = `<style>${renderCss}</style><div class="render-body">${bodyContent}</div>`;
  document.body.appendChild(host);

  try {
    await waitForImages(host);
    await waitForLayout();

    const renderBody = host.querySelector(".render-body");
    if (!renderBody) {
      throw new Error("Printable HTML could not be prepared for rendering.");
    }

    const rect = renderBody.getBoundingClientRect();
    const widthPx = Math.max(
      1,
      Math.ceil(Math.max(rect.width, renderBody.scrollWidth, renderBody.offsetWidth))
    );
    const heightPx = Math.max(
      1,
      Math.ceil(Math.max(rect.height, renderBody.scrollHeight, renderBody.offsetHeight))
    );

    // Serialize the node we just measured rather than re-splicing the raw HTML string, so the markup
    // inside foreignObject is well-formed XML (see serializeAsXml).
    const renderBodyXml = serializeAsXml(renderBody);

    const svgMarkup = `
      <svg xmlns="http://www.w3.org/2000/svg" width="${widthPx}" height="${heightPx}" viewBox="0 0 ${widthPx} ${heightPx}">
        <foreignObject x="0" y="0" width="${widthPx}" height="${heightPx}">
          <div xmlns="http://www.w3.org/1999/xhtml" style="width:${widthPx}px;height:${heightPx}px;background:#ffffff;">
            <style>${cssForXml(renderCss)}</style>
            ${renderBodyXml}
          </div>
        </foreignObject>
      </svg>
    `.trim();

    const svgBlob = new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" });
    const objectUrl = URL.createObjectURL(svgBlob);

    try {
      const image = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error("Failed to render printable HTML."));
        img.src = objectUrl;
      });

      const canvas = document.createElement("canvas");
      canvas.width = widthPx * scale;
      canvas.height = heightPx * scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error("Canvas rendering is not available in this browser.");
      }
      ctx.scale(scale, scale);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, widthPx, heightPx);
      ctx.drawImage(image, 0, 0, widthPx, heightPx);

      return {
        imageDataUrl: canvas.toDataURL("image/png"),
        pageWidthMm: widthPx / PX_PER_MM,
        pageHeightMm: heightPx / PX_PER_MM,
      };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } finally {
    host.remove();
  }
};

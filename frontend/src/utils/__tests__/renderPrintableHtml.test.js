import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderPrintableHtmlToImageJob } from "../renderPrintableHtml";

/**
 * The receipt rasterizer splices markup into an SVG <foreignObject>, which the browser parses as
 * XML. It used to splice `element.innerHTML` -- an HTML serialization, where void elements come back
 * unclosed -- so the first receipt to contain an <img> produced malformed XML, the SVG failed to
 * load, and silent printing quietly fell back to a plain ESC/POS receipt with no QR on it.
 *
 * jsdom cannot rasterize an SVG, so these tests intercept the generated markup at the Blob boundary
 * and assert it is well-formed XML -- which is the actual invariant that broke.
 */
describe("renderPrintableHtmlToImageJob", () => {
  let capturedSvg;

  const QR_IMG =
    '<img src="data:image/png;base64,iVBORw0KGgo=" alt="" width="120" height="120" ' +
    'style="display:block;margin:0 auto;" />';

  const receiptHtml = (extra = "") => `
    <html>
      <head><style>body { font-family: monospace; } @page { margin: 0 }</style></head>
      <body>
        <div class="receipt">
          <div class="store">STORE1</div>
          <hr>
          <div class="total">250.00</div>
          ${extra}
          <div class="thanks">Thank you!</div>
        </div>
      </body>
    </html>`;

  beforeEach(() => {
    capturedSvg = null;

    // jsdom never fetches images, so `complete` stays false and neither load nor error ever fires.
    // Production has a timeout for exactly that case; forcing complete keeps these tests instant.
    if (globalThis.HTMLImageElement) {
      Object.defineProperty(globalThis.HTMLImageElement.prototype, "complete", {
        configurable: true,
        get: () => true,
      });
    }

    vi.stubGlobal("Blob", class {
      constructor(parts) {
        capturedSvg = String(parts?.[0] || "");
      }
    });
    vi.stubGlobal("URL", { createObjectURL: () => "blob:svg", revokeObjectURL: () => {} });
    vi.stubGlobal("requestAnimationFrame", (cb) => { cb(); return 0; });

    // Resolve the Image load so the pipeline proceeds to the canvas step.
    vi.stubGlobal("Image", class {
      set src(_value) {
        setTimeout(() => this.onload?.(), 0);
      }
    });

    const canvasProto = globalThis.HTMLCanvasElement?.prototype;
    if (canvasProto) {
      canvasProto.getContext = () => ({
        scale: () => {},
        fillRect: () => {},
        drawImage: () => {},
        set fillStyle(_v) {},
      });
      canvasProto.toDataURL = () => "data:image/png;base64,rendered";
    }
  });

  const parseXml = (markup) => {
    const parsed = new DOMParser().parseFromString(markup, "application/xml");
    return parsed.querySelector("parsererror");
  };

  it("produces well-formed XML for a receipt containing an <img> (the payment QR)", async () => {
    await renderPrintableHtmlToImageJob(receiptHtml(QR_IMG));

    expect(capturedSvg).toBeTruthy();
    expect(parseXml(capturedSvg)).toBeNull();
  });

  it("keeps the QR image in the serialized markup rather than dropping it", async () => {
    await renderPrintableHtmlToImageJob(receiptHtml(QR_IMG));

    expect(capturedSvg).toContain("data:image/png;base64,iVBORw0KGgo=");
    // Self-closed, which is what makes it parseable inside foreignObject.
    expect(capturedSvg).toMatch(/<img[^>]*\/>/);
  });

  it("produces well-formed XML for a receipt with only inline svg (the barcode case that always worked)", async () => {
    await renderPrintableHtmlToImageJob(
      receiptHtml('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')
    );

    expect(parseXml(capturedSvg)).toBeNull();
  });

  it("rejects empty printable html rather than rasterizing a blank sheet", async () => {
    await expect(renderPrintableHtmlToImageJob("<html><body></body></html>")).rejects.toThrow(
      /body is empty/i
    );
  });
});

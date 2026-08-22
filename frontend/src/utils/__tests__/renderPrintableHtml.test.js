import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderPrintableHtmlToImageJob } from "../renderPrintableHtml";

/**
 * renderPrintableHtmlToImageJob renders a receipt into an offscreen iframe and hands the live DOM
 * element to html2pdf.js (html2canvas under the hood) to rasterize - it no longer serializes markup
 * into an SVG <foreignObject> the way an earlier implementation did, so there's nothing left to
 * parse as XML. html2canvas can't actually render in jsdom (no real layout/painting), so it must be
 * mocked at the module boundary rather than relying on low-level Image/Canvas stubs - without this,
 * the real library hangs waiting on browser behavior jsdom doesn't provide, and every test times out
 * instead of failing fast.
 *
 * jsdom also never fires a real `load` event for an iframe's `srcdoc` (no actual sub-document
 * navigation happens), which the implementation awaits before doing anything else - every test hung
 * at that very first line regardless of the html2pdf mock above until this was stubbed too.
 */
const fromMock = vi.fn();
const toCanvasMock = vi.fn();
const getMock = vi.fn();
const fakeCanvas = { toDataURL: vi.fn(() => "data:image/png;base64,rendered") };

vi.mock("html2pdf.js", () => ({
  default: () => {
    const worker = {
      from: (...args) => { fromMock(...args); return worker; },
      set: () => worker,
      toCanvas: (...args) => { toCanvasMock(...args); return worker; },
      get: (...args) => getMock(...args),
    };
    return worker;
  },
}));

describe("renderPrintableHtmlToImageJob", () => {
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
    fromMock.mockClear();
    toCanvasMock.mockClear();
    getMock.mockReset();
    fakeCanvas.toDataURL.mockClear();
    getMock.mockResolvedValue(fakeCanvas);

    // jsdom never performs real sub-document navigation for an iframe's srcdoc, so `load` never
    // fires on its own - parse the markup ourselves and fire onload the same way a real load would.
    const iframeDocs = new WeakMap();
    Object.defineProperty(HTMLIFrameElement.prototype, "srcdoc", {
      configurable: true,
      set(value) {
        iframeDocs.set(this, new DOMParser().parseFromString(String(value || ""), "text/html"));
        setTimeout(() => this.onload?.(), 0);
      },
      get() {
        return "";
      },
    });
    Object.defineProperty(HTMLIFrameElement.prototype, "contentDocument", {
      configurable: true,
      get() {
        return iframeDocs.get(this) || null;
      },
    });
  });

  it("resolves with the rendered image and page dimensions for a receipt containing an <img> (the payment QR)", async () => {
    const result = await renderPrintableHtmlToImageJob(receiptHtml(QR_IMG));

    expect(result.imageDataUrl).toBe("data:image/png;base64,rendered");
    expect(result.pageWidthMm).toBeGreaterThan(0);
    expect(result.pageHeightMm).toBeGreaterThan(0);
  });

  it("keeps the QR image in the DOM element handed to the rasterizer rather than dropping it", async () => {
    await renderPrintableHtmlToImageJob(receiptHtml(QR_IMG));

    expect(fromMock).toHaveBeenCalledTimes(1);
    const target = fromMock.mock.calls[0][0];
    expect(target.querySelector("img")?.src).toContain("data:image/png;base64,iVBORw0KGgo=");
  });

  it("hands the receipt's own inline svg through untouched (the barcode case that always worked)", async () => {
    await renderPrintableHtmlToImageJob(
      receiptHtml('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')
    );

    const target = fromMock.mock.calls[0][0];
    expect(target.querySelector("svg")).not.toBeNull();
  });

  it("rejects empty printable html rather than rasterizing a blank sheet", async () => {
    await expect(renderPrintableHtmlToImageJob("<html><body></body></html>")).rejects.toThrow(
      /body is empty/i
    );
    expect(fromMock).not.toHaveBeenCalled();
  });
});

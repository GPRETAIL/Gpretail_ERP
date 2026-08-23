import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderPrintableHtmlToImageJob } from "../renderPrintableHtml";

/**
 * renderPrintableHtmlToImageJob parses the receipt markup and imports it into the MAIN document
 * (not an offscreen iframe, as an earlier version did) before handing it to html2canvas directly
 * (not through html2pdf.js's `.toCanvas()`, which was silently producing a cropped/shifted canvas
 * even with `margin: 0` set, because of its own PDF-page-oriented layout step). html2canvas
 * resolves stylesheets and <img> content through the document/window the target element belongs
 * to - an element left inside a separate iframe document silently lost both (no error, no throw),
 * producing a bare unstyled text dump with the QR/barcode image missing entirely. html2canvas can't
 * actually paint in jsdom (no real layout/painting), so it's mocked at the module boundary; jsdom
 * also never fires `load`/`error` for an <img>, so its `complete` flag is forced so the internal
 * image-wait resolves instantly instead of waiting out its safety timeout.
 */
const html2canvasMock = vi.fn();
// binarizeCanvas reads/writes pixels via a real 2D context - a minimal stand-in keeps the
// production code path (including the binarization step) exercised without real canvas painting,
// which jsdom can't do anyway.
const fakeImageData = { data: new Uint8ClampedArray(4) };
const fakeCanvas = {
  width: 1,
  height: 1,
  getContext: vi.fn(() => ({
    getImageData: vi.fn(() => fakeImageData),
    putImageData: vi.fn(),
  })),
  toDataURL: vi.fn(() => "data:image/png;base64,rendered"),
};

vi.mock("html2canvas", () => ({
  default: (...args) => html2canvasMock(...args),
}));

describe("renderPrintableHtmlToImageJob", () => {
  const QR_IMG =
    '<img src="data:image/png;base64,iVBORw0KGgo=" alt="" width="120" height="120" ' +
    'style="display:block;margin:0 auto;" />';

  const receiptHtml = (extra = "") => `
    <html>
      <head><style>body { font-family: monospace; background: #ffffff; } @page { margin: 0 }</style></head>
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
    html2canvasMock.mockReset();
    html2canvasMock.mockResolvedValue(fakeCanvas);
    fakeCanvas.toDataURL.mockClear();

    // jsdom never fetches images, so `complete` stays false and neither load nor error ever fires.
    // Production has a timeout for exactly that case; forcing complete keeps these tests instant.
    Object.defineProperty(HTMLImageElement.prototype, "complete", {
      configurable: true,
      get: () => true,
    });
  });

  afterEach(() => {
    // The function attaches its offscreen render container directly to the real document.body
    // (that's the whole point of the fix) - clean up anything a failed assertion left behind so it
    // can't bleed into another test.
    document.querySelectorAll('[class^="printable-render-scope-"]').forEach((el) => el.remove());
  });

  it("resolves with the rendered image and page dimensions for a receipt containing an <img> (the payment QR)", async () => {
    const result = await renderPrintableHtmlToImageJob(receiptHtml(QR_IMG));

    expect(result.imageDataUrl).toBe("data:image/png;base64,rendered");
    expect(result.pageWidthMm).toBeGreaterThan(0);
    expect(result.pageHeightMm).toBeGreaterThan(0);
  });

  it("keeps the QR image in the DOM element handed to the rasterizer rather than dropping it", async () => {
    await renderPrintableHtmlToImageJob(receiptHtml(QR_IMG));

    expect(html2canvasMock).toHaveBeenCalledTimes(1);
    const target = html2canvasMock.mock.calls[0][0];
    expect(target.querySelector("img")?.src).toContain("data:image/png;base64,iVBORw0KGgo=");
  });

  it("hands the receipt's own inline svg through untouched (the barcode case that always worked)", async () => {
    await renderPrintableHtmlToImageJob(
      receiptHtml('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>')
    );

    const target = html2canvasMock.mock.calls[0][0];
    expect(target.querySelector("svg")).not.toBeNull();
  });

  it("rejects empty printable html rather than rasterizing a blank sheet", async () => {
    await expect(renderPrintableHtmlToImageJob("<html><body></body></html>")).rejects.toThrow(
      /body is empty/i
    );
    expect(html2canvasMock).not.toHaveBeenCalled();
  });

  it("scopes the receipt's own `body { ... }` style rule instead of leaking it onto the real page body", async () => {
    // This is the actual regression: the receipt template styles the real <body> tag directly,
    // which is harmless inside an iframe (it has its own body) but corrupts the live app's real
    // body once the content is imported into the main document instead - unless that selector is
    // rewritten to target the render wrapper specifically.
    await renderPrintableHtmlToImageJob(receiptHtml(QR_IMG));

    expect(document.body.style.fontFamily).not.toBe("monospace");
  });

  it("renders the receipt content into the real document (not a separate iframe document)", async () => {
    await renderPrintableHtmlToImageJob(receiptHtml(QR_IMG));

    const target = html2canvasMock.mock.calls[0][0];
    expect(target.ownerDocument).toBe(document);
  });

  it("does not pass a windowWidth/windowHeight override that would reflow the whole page", async () => {
    // The real bug this guards: forcing html2canvas to simulate a resized browser window reflows
    // the ENTIRE live page (not just the render container) to that narrow width, which visually
    // buried the (still on-page) receipt under the app's own reflowed UI.
    await renderPrintableHtmlToImageJob(receiptHtml(QR_IMG));

    const options = html2canvasMock.mock.calls[0][1];
    expect(options).not.toHaveProperty("windowWidth");
    expect(options).not.toHaveProperty("windowHeight");
  });

  it("excludes QR/barcode image pixels from binarization (regression: this is what broke UPI QR scanning)", async () => {
    // QR/barcode images are already pure 1-bit bitmaps - they never needed thresholding, unlike the
    // anti-aliased text binarization was actually added for. Filling the fake canvas with uniform
    // mid-grey (luminance 128, which the default threshold of 200 would binarize to black) makes
    // "was this pixel touched" and "was it left alone" unambiguous to assert on.
    const size = 20;
    const data = new Uint8ClampedArray(size * size * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 128;
      data[i + 1] = 128;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
    const regionCanvas = {
      width: size,
      height: size,
      getContext: vi.fn(() => ({
        getImageData: vi.fn(() => ({ data })),
        putImageData: vi.fn(),
      })),
      toDataURL: vi.fn(() => "data:image/png;base64,regiontest"),
    };
    html2canvasMock.mockResolvedValueOnce(regionCanvas);

    const html = receiptHtml(
      '<div class="barcode-wrap"><img src="data:image/png;base64,aa" alt="" width="8" height="8" /></div>'
    );

    const rectSpy = vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function mockRect() {
      if (this.tagName === "IMG") {
        return { left: 5, top: 5, width: 8, height: 8, right: 13, bottom: 13 };
      }
      return { left: 0, top: 0, width: size, height: size, right: size, bottom: size };
    });

    try {
      await renderPrintableHtmlToImageJob(html, { scale: 1 });
    } finally {
      rectSpy.mockRestore();
    }

    const context = regionCanvas.getContext.mock.results[0].value;
    const written = context.putImageData.mock.calls[0][0].data;
    const idxAt = (x, y) => (y * size + x) * 4;

    expect(written[idxAt(8, 8)]).toBe(128); // inside the QR region - untouched
    expect(written[idxAt(0, 0)]).toBe(0); // outside the QR region - binarized (128 < threshold 200)
  });
});

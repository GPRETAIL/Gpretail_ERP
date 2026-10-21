import { beforeEach, describe, expect, it, vi } from "vitest";

const html2canvasMock = vi.fn();
const saveMock = vi.fn();
const addImageMock = vi.fn();
const addPageMock = vi.fn();
const outputMock = vi.fn(() => new Blob(["%PDF-1.4"], { type: "application/pdf" }));
const jsPdfCtorMock = vi.fn();

vi.mock("html2canvas", () => ({
  default: (...args) => html2canvasMock(...args),
}));

vi.mock("jspdf", () => ({
  jsPDF: function MockJsPDF(options) {
    jsPdfCtorMock(options);
    const isA4 = options?.format === "a4";
    const [w, h] = isA4 ? [210, 297] : options?.format || [80, 160];
    this.internal = {
      pageSize: {
        getWidth: () => w,
        getHeight: () => h,
      },
    };
    this.addImage = addImageMock;
    this.addPage = addPageMock;
    this.save = saveMock;
    this.output = outputMock;
  },
}));

import { downloadHtmlAsPdf, getHtmlAsPdfBlob } from "../htmlToPdf";

const patchIframeAutoLoad = () => {
  const origCreateElement = document.createElement.bind(document);
  return vi.spyOn(document, "createElement").mockImplementation((tag, opts) => {
    const el = origCreateElement(tag, opts);
    if (String(tag).toLowerCase() === "iframe") {
      Object.defineProperty(el, "srcdoc", {
        set(val) {
          this._srcdoc = val;
          setTimeout(() => {
            if (typeof el.onload === "function") el.onload();
          }, 0);
        },
        get() {
          return this._srcdoc;
        },
      });
    }
    return el;
  });
};

describe("htmlToPdf (direct html2canvas + jsPDF)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    html2canvasMock.mockResolvedValue({
      width: 640,
      height: 1200,
      toDataURL: () => "data:image/jpeg;base64,FAKE",
    });
  });

  it("renders thermal receipt HTML into a single continuous PDF page and saves it", async () => {
    const spy = patchIframeAutoLoad();
    try {
      await downloadHtmlAsPdf("<!DOCTYPE html><html><body><div>Receipt</div></body></html>", "receipt.pdf");
      expect(html2canvasMock).toHaveBeenCalledTimes(1);
      expect(jsPdfCtorMock).toHaveBeenCalledWith(
        expect.objectContaining({ unit: "mm", orientation: "portrait" })
      );
      expect(addImageMock).toHaveBeenCalledTimes(1);
      expect(saveMock).toHaveBeenCalledWith("receipt.pdf");
    } finally {
      spy.mockRestore();
    }
  });

  it("returns a PDF File instance from getHtmlAsPdfBlob for Web Share API", async () => {
    const spy = patchIframeAutoLoad();
    try {
      const file = await getHtmlAsPdfBlob(
        "<!DOCTYPE html><html><body><div>Invoice</div></body></html>",
        "invoice.pdf",
        { paperSize: "A4" }
      );
      expect(jsPdfCtorMock).toHaveBeenCalledWith(
        expect.objectContaining({ unit: "mm", format: "a4", orientation: "portrait" })
      );
      expect(outputMock).toHaveBeenCalledWith("blob");
      expect(file).toBeInstanceOf(File);
      expect(file.name).toBe("invoice.pdf");
      expect(file.type).toBe("application/pdf");
    } finally {
      spy.mockRestore();
    }
  });
  it("slices long A4 receipts without adding a trailing blank page", async () => {
    const spy = patchIframeAutoLoad();
    html2canvasMock.mockResolvedValue({ width: 2100, height: 5940, toDataURL: () => "data:image/jpeg;base64,FAKE" });
    try {
      await downloadHtmlAsPdf("<html><body>Two pages</body></html>", "a4.pdf", { paperSize: "A4" });
      expect(addImageMock).toHaveBeenCalledTimes(2);
      expect(addPageMock).toHaveBeenCalledTimes(1);
      expect(addImageMock.mock.calls.map(call => call[3])).toEqual([0, -297]);
      expect(document.querySelectorAll("iframe")).toHaveLength(0);
    } finally { spy.mockRestore(); }
  });

  it("adds all pages when content exceeds two A4 sheets", async () => {
    const spy = patchIframeAutoLoad();
    html2canvasMock.mockResolvedValue({ width: 2100, height: 6500, toDataURL: () => "data:image/jpeg;base64,FAKE" });
    try {
      await downloadHtmlAsPdf("<html><body>Three pages</body></html>", "a4.pdf", { paperSize: "A4" });
      expect(addImageMock).toHaveBeenCalledTimes(3);
      expect(addPageMock).toHaveBeenCalledTimes(2);
      expect(addImageMock.mock.calls.map(call => call[3])).toEqual([0, -297, -594]);
    } finally { spy.mockRestore(); }
  });

  it("preserves the image aspect ratio for short thermal receipts", async () => {
    const spy = patchIframeAutoLoad();
    html2canvasMock.mockResolvedValue({ width: 640, height: 120, toDataURL: () => "data:image/jpeg;base64,FAKE" });
    try {
      await downloadHtmlAsPdf("<html><body>Short</body></html>", "thermal.pdf");
      const format=jsPdfCtorMock.mock.calls[0][0].format;
      expect(addImageMock.mock.calls[0][5]).toBeCloseTo(120 * format[0] / 640);
      expect(addPageMock).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });

  it("removes the receipt iframe and propagates capture failure", async () => {
    const spy = patchIframeAutoLoad();
    html2canvasMock.mockRejectedValueOnce(new Error("Capture failed"));
    try {
      await expect(downloadHtmlAsPdf("<html><body>Receipt</body></html>", "failed.pdf")).rejects.toThrow("Capture failed");
      expect(document.querySelectorAll("iframe")).toHaveLength(0);
      expect(saveMock).not.toHaveBeenCalled();
    } finally { spy.mockRestore(); }
  });

});

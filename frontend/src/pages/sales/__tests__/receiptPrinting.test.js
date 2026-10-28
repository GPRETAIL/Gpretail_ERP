import { afterEach, describe, expect, it, vi } from "vitest";
import { browserPrintHtml } from "../posSalesUtils";
import { buildPosReturnReceiptHtml, buildPosSaleReceiptHtml } from "../../../utils/posReceiptHtml";
import { normalizeSalesReceiptCustomization } from "../../../utils/salesReceiptCustomization";

afterEach(() => {
  document.querySelectorAll('iframe[title="Receipt print"]').forEach(frame => frame.remove());
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("shared receipt printing", () => {
  it("prints through an iframe after an async operation without opening a popup", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestAnimationFrame", callback => setTimeout(callback, 0));
    const popup = vi.spyOn(window, "open").mockReturnValue(null);
    await Promise.resolve();
    expect(browserPrintHtml("<html><body>Saved receipt 281026-0001</body></html>", { copies: 2 })).toBe(true);
    const frame = document.querySelector('iframe[title="Receipt print"]');
    expect(frame.contentDocument.body.textContent).toContain("281026-0001");
    vi.spyOn(frame.contentWindow, "focus").mockImplementation(() => {});
    const print = vi.spyOn(frame.contentWindow, "print").mockImplementation(() => {});
    vi.runAllTimers();
    expect(print).toHaveBeenCalledTimes(2);
    expect(popup).not.toHaveBeenCalled();
    expect(document.querySelector('iframe[title="Receipt print"]')).toBeNull();
  });

  it.each([buildPosSaleReceiptHtml, buildPosReturnReceiptHtml])("retains store details and escaped receipt text in the shared layout", buildReceipt => {
    const config = normalizeSalesReceiptCustomization({ receiptWidthInches: "3.0" });
    const html = buildReceipt({ storeName: "Coffee & Co", storeAddress: "Branch address", storePhone: "1234567890",
      storeGstNo: "REAL-GST", billNo: "281026-0001", total: 100, items: [],
      customerName: '<img src=x onerror="alert(1)">', message: "Thanks <again>" }, config);
    expect(html).toContain("Coffee &amp; Co");
    expect(html).toContain("281026-0001");
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).toContain("Thanks &lt;again&gt;");
  });

  it.each([buildPosSaleReceiptHtml, buildPosReturnReceiptHtml])("does not invent another shop's address, GST or phone", buildReceipt => {
    const config = normalizeSalesReceiptCustomization({ receiptWidthInches: "3.0" });
    const html = buildReceipt({ storeName: "Actual shop", billNo: "281026-0001", total: 0, items: [] }, config);
    expect(html).toContain("Actual shop");
    for (const fake of ["SRI BALAJI", "Main Bazaar", "33AAAAA0000A1Z5", "9876543210"]) {
      expect(html).not.toContain(fake);
    }
  });
});

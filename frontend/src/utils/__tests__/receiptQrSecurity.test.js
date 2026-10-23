import { describe, expect, it } from "vitest";
import { buildReceiptQrCodeImgMarkup, normalizeSalesReceiptCustomization } from "../salesReceiptCustomization";

describe("receipt QR image safety", () => {
  it.each([
    'data:image/png;base64," onerror="alert(1)',
    "data:image/svg+xml;base64,PHN2Zz4=",
    "https://example.test/image.png",
    "javascript:alert(1)",
  ])("rejects unsafe image source %s", (source) => {
    expect(normalizeSalesReceiptCustomization({ paymentQrImageUrl: source }).paymentQrImageUrl).toBe("");
    expect(buildReceiptQrCodeImgMarkup(source)).toBe("");
  });
  it("retains supported inline images and escapes captions", () => {
    const source = "data:image/png;base64,aGVsbG8=";
    expect(normalizeSalesReceiptCustomization({ paymentQrImageUrl: source }).paymentQrImageUrl).toBe(source);
    const html = buildReceiptQrCodeImgMarkup(source, { label: '<img src=x onerror=alert(1)>' });
    expect(html).toContain(`src="${source}"`);
    expect(html).not.toContain("<img src=x");
    expect(html).toContain("&lt;img");
  });
});

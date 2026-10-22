import { beforeEach, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import { buildPaymentQrMarkup } from "../salesReceiptCustomization";

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,cHJldmlldw==") } }));
beforeEach(() => vi.clearAllMocks());

it("does not create a payment QR for a blank UPI ID or a disabled QR", async () => {
  expect(await buildPaymentQrMarkup({ paymentQrMode: "upi", paymentUpiId: "" })).toBe("");
  expect(await buildPaymentQrMarkup({ paymentQrMode: "none" })).toBe("");
  expect(QRCode.toDataURL).not.toHaveBeenCalled();
});

it("encodes the configured payee, store, bill amount and note for UPI printing", async () => {
  const html = await buildPaymentQrMarkup({ paymentQrMode: "upi", paymentUpiId: "test-store@example", paymentQrSize: 160 }, { billAmount: 123.45, billNo: "SB/29", storeName: "Coffee Branch" });
  const uri = new URL(QRCode.toDataURL.mock.calls[0][0]);
  expect(uri.searchParams.get("pa")).toBe("test-store@example");
  expect(uri.searchParams.get("pn")).toBe("Coffee Branch");
  expect(uri.searchParams.get("am")).toBe("123.45");
  expect(uri.searchParams.get("tn")).toBe("Bill SB/29");
  expect(html).toContain("width:160px");
  expect(html).toContain("Scan to Pay");
});

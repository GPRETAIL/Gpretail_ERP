import { describe, expect, it } from "vitest";
import {
  buildEscposReceiptBytes,
  buildEscposReceiptJob,
  isEscposReceiptEligible,
} from "../escposReceiptBuilder";
import { DEFAULT_SALES_RECEIPT_CUSTOMIZATION } from "../salesReceiptCustomization";

/**
 * The ESC/POS byte builder only implements ONE layout: the default arrangement of every
 * customization dimension (see graceful-leaping-comet.md's "Scope decision"). These tests assert
 * on raw byte sequences (not printed output, which needs real hardware) - the same
 * safe-verification approach used elsewhere in this codebase for print-path changes.
 *
 * Mirrors what loadSalesReceiptCustomization() actually returns for a company with no saved
 * settings yet (the common real-world "never touched this page" case) - it hands back
 * DEFAULT_SALES_RECEIPT_CUSTOMIZATION directly without routing through
 * normalizeSalesReceiptCustomization, which has its own pre-existing, unrelated quirk of
 * defaulting showBarcodeOnBill/showBarcodeOnReturnSlip to false rather than the documented
 * default of true when a key is simply absent from the input object.
 */
const defaultCustomization = () => ({ ...DEFAULT_SALES_RECEIPT_CUSTOMIZATION });

const baseReceiptData = () => ({
  storeName: "SRI BALAJI TEXTILE",
  storeAddress: "Main Bazaar, Retail Street",
  storeGstNo: "33AAAAA0000A1Z5",
  storePhone: "9876543210",
  billNo: "SB/56",
  billBarcode: "SB/56",
  dateTime: "2026-08-21T10:30:00.000Z",
  cashierName: "Admin",
  customerName: "Walking customer",
  items: [
    { name: "Cotton Shirt", qty: 2, rate: 500, amount: 1000, discountAmount: 0, taxPerc: 5, taxAmount: 50, baseAmount: 1000, taxName: "GST" },
  ],
  billAmount: 1000,
  discountAmount: 0,
  taxAmount: 50,
  total: 1050,
  message: "Thank you!",
});

describe("isEscposReceiptEligible", () => {
  it("accepts a fully-default customization", () => {
    expect(isEscposReceiptEligible(baseReceiptData(), defaultCustomization())).toBe(true);
  });

  it("rejects A4 paper (needs the tax-invoice layout, not a thermal receipt)", () => {
    expect(isEscposReceiptEligible({ ...baseReceiptData(), paperSize: "A4" }, defaultCustomization())).toBe(false);
    expect(
      isEscposReceiptEligible(baseReceiptData(), { ...defaultCustomization(), receiptWidthInches: "A4" })
    ).toBe(false);
  });

  it("rejects a non-standard receipt format", () => {
    expect(
      isEscposReceiptEligible(baseReceiptData(), { ...defaultCustomization(), receiptFormat: "elegant" })
    ).toBe(false);
  });

  it("rejects an uploaded (non-UPI) payment QR image", () => {
    expect(
      isEscposReceiptEligible(baseReceiptData(), { ...defaultCustomization(), paymentQrMode: "image" })
    ).toBe(false);
  });

  it("rejects column-mode discount display", () => {
    expect(
      isEscposReceiptEligible(baseReceiptData(), { ...defaultCustomization(), discountDisplayMode: "column" })
    ).toBe(false);
  });

  it("rejects a customized general-field layout (e.g. logo turned on)", () => {
    const customization = defaultCustomization();
    customization.generalFields = {
      ...customization.generalFields,
      logo: { ...customization.generalFields.logo, visible: true },
    };
    expect(isEscposReceiptEligible(baseReceiptData(), customization)).toBe(false);
  });
});

describe("buildEscposReceiptBytes", () => {
  it("starts with the ESC/POS init sequence and ends with a partial cut", () => {
    const bytes = buildEscposReceiptBytes(baseReceiptData(), defaultCustomization(), { kind: "sale" });
    expect(Array.from(bytes.slice(0, 2))).toEqual([0x1b, 0x40]); // ESC @
    expect(Array.from(bytes.slice(-3))).toEqual([0x1d, 0x56, 0x01]); // GS V 1 (partial cut)
  });

  it("includes the store name and bill number as plain text", () => {
    const bytes = buildEscposReceiptBytes(baseReceiptData(), defaultCustomization(), { kind: "sale" });
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("SRI BALAJI TEXTILE");
    expect(text).toContain("Sales No: SB/56");
    expect(text).toContain("Net Amount");
  });

  it("emits a QR raster block (GS v 0) for the default qr_code bill-code type", () => {
    const bytes = buildEscposReceiptBytes(baseReceiptData(), defaultCustomization(), { kind: "sale" });
    const bytesArray = Array.from(bytes);
    let found = false;
    for (let i = 0; i < bytesArray.length - 2; i++) {
      if (bytesArray[i] === 0x1d && bytesArray[i + 1] === 0x76 && bytesArray[i + 2] === 0x30) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("emits a CODE39 barcode command (GS k 4) when receiptCodeType is 'barcode'", () => {
    const customization = { ...defaultCustomization(), receiptCodeType: "barcode" };
    const bytes = buildEscposReceiptBytes(baseReceiptData(), customization, { kind: "sale" });
    const bytesArray = Array.from(bytes);
    let found = false;
    for (let i = 0; i < bytesArray.length - 2; i++) {
      if (bytesArray[i] === 0x1d && bytesArray[i + 1] === 0x6b && bytesArray[i + 2] === 0x04) {
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
  });

  it("omits the payment QR for return receipts", () => {
    const bytes = buildEscposReceiptBytes(baseReceiptData(), defaultCustomization(), { kind: "return" });
    const text = new TextDecoder().decode(bytes);
    expect(text).not.toContain("Scan to Pay");
  });

  it("includes the payment QR caption for sale receipts by default (paymentQrMode: upi)", () => {
    const bytes = buildEscposReceiptBytes(baseReceiptData(), defaultCustomization(), { kind: "sale" });
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("Scan to Pay");
  });

  it("prints the tax summary table matching the item's tax rate", () => {
    const bytes = buildEscposReceiptBytes(baseReceiptData(), defaultCustomization(), { kind: "sale" });
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("Tax Summary");
    expect(text).toContain("GST");
  });

  // Regression: the printer's real usable width turned out much wider than the original CPL
  // estimate, so "Sales No: X" + "Date: Y" summed to exactly that estimate with zero room to
  // spare and fell back to two separate lines instead of sharing one physical row.
  it("keeps Sales No + Date, and Cashier + Time, sharing one physical line each", () => {
    const bytes = buildEscposReceiptBytes(baseReceiptData(), defaultCustomization(), { kind: "sale" });
    const text = new TextDecoder().decode(bytes);
    const lines = text.split("\n");
    const salesLine = lines.find((l) => l.includes("Sales No:"));
    const cashierLine = lines.find((l) => l.includes("Cashier:"));
    expect(salesLine).toContain("Date:");
    expect(cashierLine).toContain("Time:");
  });

  // Regression: a single GS v 0 command for a large raster image can silently corrupt/drop data on
  // some clone ESC/POS controllers - a full UPI URI needs a meaningfully bigger QR than a short
  // bill number, which is consistent with the bill-code QR scanning fine while the payment QR
  // didn't. Banding into several shorter commands keeps every single command small.
  it("bands a large QR (the payment QR) into multiple GS v 0 commands", () => {
    const bytes = buildEscposReceiptBytes(baseReceiptData(), defaultCustomization(), { kind: "sale" });
    const bytesArray = Array.from(bytes);
    let count = 0;
    for (let i = 0; i < bytesArray.length - 2; i++) {
      if (bytesArray[i] === 0x1d && bytesArray[i + 1] === 0x76 && bytesArray[i + 2] === 0x30) count++;
    }
    expect(count).toBeGreaterThan(1);
  });
});

describe("buildEscposReceiptJob", () => {
  it("returns a label payload whose base64 round-trips to the same bytes", () => {
    const job = buildEscposReceiptJob(baseReceiptData(), defaultCustomization(), {
      kind: "sale",
      jobName: "Bill SB/56",
    });
    expect(job.kind).toBe("escpos_raw_v1");
    expect(job.jobName).toBe("Bill SB/56");
    expect(typeof job.dataBase64).toBe("string");

    const decoded = Uint8Array.from(atob(job.dataBase64), (c) => c.charCodeAt(0));
    expect(decoded.length).toBe(job.byteLength);
    expect(Array.from(decoded.slice(0, 2))).toEqual([0x1b, 0x40]);
  });
});

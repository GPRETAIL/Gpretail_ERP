import { beforeEach, describe, expect, it } from "vitest";
import {
  barcodeMatchesReturnScan,
  buildPosOldSaleReceiptPayload,
  isLikelySaleBillInput,
  parseBillNoFromInput,
} from "../legacyPosUtils";

describe("legacyPosUtils", () => {
  beforeEach(() => sessionStorage.clear());
  it("parses numeric and SB/ prefixed bill numbers", () => {
    expect(parseBillNoFromInput("SB/42")).toBe(42);
    expect(parseBillNoFromInput("108")).toBe(108);
    expect(parseBillNoFromInput("")).toBeNull();
    expect(isLikelySaleBillInput("SB/42")).toBe(true);
    expect(isLikelySaleBillInput("KURTA-XL")).toBe(false);
  });

  it("matches barcodes ignoring leading zeros and formatting punctuation", () => {
    expect(barcodeMatchesReturnScan("00012345", "12345")).toBe(true);
    expect(barcodeMatchesReturnScan("KRT-01", "krt01")).toBe(true);
    expect(barcodeMatchesReturnScan("KRT-01", "KRT-02")).toBe(false);
  });

  it("builds receipt payload from historical PosSale structure", () => {
    const payload = buildPosOldSaleReceiptPayload({
      sale: {
        bill_no: 77,
        grand_total: 1050,
        discount_amount: 50,
        paid_amount: 1050,
        items: [
          {
            quantity: 2,
            selling_price: 550,
            discount: 50,
            tax_rate: 5,
            subtotal: 1050,
            product: { name: "Cotton Saree" },
          },
        ],
      },
      authUser: { company_id: 1, company_name: "Test Store", name: "Cashier" },
      receiptCustomization: {},
      companyInfo: { storeName: "Test Store", storeAddress: "MG Road", storePhone: "9999999999", storeGstNo: "29ABCDE1234F1Z5" },
    });

    expect(payload.storeName).toBe("Test Store");
    expect(payload.total).toBe(1050);
    expect(payload.discountAmount).toBe(50);
    expect(payload.items).toHaveLength(1);
    expect(payload.items[0].name).toBe("Cotton Saree");
    expect(payload.items[0].qty).toBe(2);
  });

  it("uses the sale's store identity and fetched name instead of the cashier's store", () => {
    const payload = buildPosOldSaleReceiptPayload({
      sale: { store_id: 2, bill_no: "281026-0001", grand_total: 0, amount: 999, items: [] },
      authUser: { company_id: 1, company_name: "Wrong branch", name: "Cashier" },
      receiptCustomization: {}, companyInfo: { storeName: "Correct branch" },
    });
    expect(payload.companyId).toBe(2);
    expect(payload.storeName).toBe("Correct branch");
    expect(payload.billNo).toBe("281026-0001");
    expect(payload.total).toBe(0);
  });

  it("refuses to substitute a cashier name when the store name is unavailable", () => {
    expect(() => buildPosOldSaleReceiptPayload({
      sale: {}, authUser: { name: "Cashier" }, receiptCustomization: {}, companyInfo: {},
    })).toThrow("Store name is unavailable");
  });
});

import { expect, it } from "vitest";
import { getPosBillBarcodeValue } from "../salesReceiptCustomization";
import { formatSaleBillNo } from "../../pages/sales/posSalesUtils";
import { formatLatestPosDocumentNumber } from "../posLatestDocument";
it.each(["261024-0001", "261024-C0001", "INV-STR-ABC-20261024-C0001", "SB/29"])("retains the complete bill number for printing and reprinting: %s", value => {
  expect(getPosBillBarcodeValue(value)).toBe(value);
  expect(formatSaleBillNo(value)).toBe(value);
  expect(formatLatestPosDocumentNumber({ type: "sale", bill_no: value })).toBe(value);
});
it("retains the legacy numeric receipt prefix", () => expect(getPosBillBarcodeValue(29)).toBe("SB/29"));

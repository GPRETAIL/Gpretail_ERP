import { expect, it, vi } from "vitest";

vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ printHtml: vi.fn() }) }));
import { buildStickerLabels } from "@/features/warehouse/barcodes/BarcodeGeneration";

const item = { sourceItemId: "a", productName: "Latte Mug", qty: 2 };
const barcodeRows = [{ id: 1, barcode: "SC00001", code_type: "barcode" }, { id: 2, barcode: "SC00002", code_type: "code" }];

it("keeps each sticker's generated format unless a print format is chosen", () => {
  const types = (printAs) => buildStickerLabels({ item, barcodeRows, customization: { codeType: "code" }, printAs }).map((label) => label.codeType);
  expect(types(undefined)).toEqual(["barcode", "code"]);
  expect(types("code")).toEqual(["code", "code"]);
  expect(types("barcode")).toEqual(["barcode", "barcode"]);
});

it("prints the same number whichever format is chosen", () => {
  const values = (printAs) => buildStickerLabels({ item, barcodeRows, customization: {}, printAs }).map((label) => label.codeValue);
  expect(values("code")).toEqual(values("barcode"));
});

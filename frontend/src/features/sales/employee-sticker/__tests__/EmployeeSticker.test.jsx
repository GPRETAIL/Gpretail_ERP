import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), print: vi.fn(), printLabels: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, put: mocks.put } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { store_id: 1, company_id: 1, company_name: "Coffee 1" } } }) }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/features/printing/context/PrintContext", () => ({ usePrintContext: () => ({ printHtml: mocks.print }) }));
vi.mock("@/features/warehouse/barcodes/utils/barcodeCustomisation", () => ({
  DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION: { codeType: "code" },
  fetchWarehouseBarcodeCustomization: vi.fn().mockResolvedValue({ codeType: "code" }),
}));
vi.mock("@/features/warehouse/barcodes/BarcodeGeneration", () => ({
  buildLabelQrSources: vi.fn().mockResolvedValue({}),
  buildBarcodeSheetPreviewHtml: vi.fn(() => "<html></html>"),
  printWarehouseBarcodeLabels: mocks.printLabels,
}));
import EmployeeSticker from "@/features/sales/employee-sticker/EmployeeSticker";
import { employeeStickerLabels } from "@/features/sales/employee-sticker/utils/employeeStickerLabels";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";
import { applyEmployeeStickerSize, effectiveEmployeeStickerSize, employeeStickerPayload } from "@/features/sales/employee-sticker/utils/employeeStickerSize";

const PEOPLE = [
  { id: 5, code: "E1", name: "Ravi", section: "Sarees", designation: "Salesman", sticker: "EMP-5" },
  { id: 6, code: "E2", name: "Meena", section: null, designation: null, sticker: "EMP-6" },
];

const SAVED_SIZE = { labelWidthMm: 60, labelHeightMm: 40, labelsPerRow: 1, codeSizeMm: 20, nameFontSizePx: 12, detailFontSizePx: 9 };
// The page asks for the people and for the store's saved sticker size; `size` is what Sales Customisation holds.
const answer = (size) => mocks.get.mockImplementation((url) => Promise.resolve({ data: { data: url === "/sales-customization" ? { employeeSticker: size } : PEOPLE } }));
const renderPage = () => render(<MemoryRouter><TransferActivityProvider><EmployeeSticker /></TransferActivityProvider></MemoryRouter>);

beforeEach(() => {
  mocks.get.mockReset();
  mocks.put.mockReset();
  mocks.printLabels.mockReset().mockResolvedValue({ ok: true, message: null });
  mocks.get.mockResolvedValue({ data: { data: PEOPLE } });
});
afterEach(cleanup);

it("builds one label per copy carrying the salesperson's sticker value", () => {
  const labels = employeeStickerLabels(PEOPLE, { 5: 2, 6: 0 }, "barcode");
  expect(labels).toHaveLength(2);
  expect(labels[0]).toMatchObject({ codeValue: "EMP-5", codeType: "barcode", productName: "Ravi" });
  expect(labels[0].fields).toEqual([{ key: "emp_code", label: "ID", value: "E1" }, { key: "emp_section", label: "", value: "Sarees · Salesman" }]);
  expect(employeeStickerLabels([PEOPLE[1]], {}, "code")[0]).toMatchObject({ codeValue: "EMP-6", codeType: "code", fields: [{ key: "emp_code", label: "ID", value: "E2" }] });
});

it("prints the ticked salespeople's stickers with the product-sticker printer", async () => {
  render(<MemoryRouter><TransferActivityProvider><EmployeeSticker /></TransferActivityProvider></MemoryRouter>);
  expect(await screen.findByText("Ravi")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: /^Print/ })).toBeDisabled();

  fireEvent.click(screen.getByLabelText("Select Ravi"));
  fireEvent.change(screen.getByLabelText("Copies for Ravi"), { target: { value: "3" } });
  fireEvent.click(screen.getByRole("button", { name: "Barcode" }));
  fireEvent.click(screen.getByRole("button", { name: "Print (3)" }));

  await waitFor(() => expect(mocks.printLabels).toHaveBeenCalledTimes(1));
  const { labels, storeName, jobName } = mocks.printLabels.mock.calls[0][0];
  expect(labels.map((label) => [label.codeValue, label.codeType])).toEqual([["EMP-5", "barcode"], ["EMP-5", "barcode"], ["EMP-5", "barcode"]]);
  expect([storeName, jobName]).toEqual(["Coffee 1", "Employee sticker Ravi"]);
});

it("uses the product sticker size until an employee sticker size is saved, and a saved size overrides only the size settings", () => {
  const product = { codeType: "code", labelWidthMm: 50, labelHeightMm: 25, labelsPerRow: 2, qrCodeSizeMm: 14, productNameFontSizePx: 11, priceFontSizePx: 10, fontFamily: "tahoma" };
  expect(effectiveEmployeeStickerSize(null, product)).toEqual({ labelWidthMm: 50, labelHeightMm: 25, labelsPerRow: 2, codeSizeMm: 14, nameFontSizePx: 11, detailFontSizePx: 10 });
  expect(applyEmployeeStickerSize(product, null)).toBe(product);
  expect(applyEmployeeStickerSize(product, SAVED_SIZE)).toMatchObject({
    labelWidthMm: 60, labelHeightMm: 40, labelsPerRow: 1, qrCodeSizeMm: 20, barcodeSizeMm: 20, productNameFontSizePx: 12, priceFontSizePx: 9, fontFamily: "tahoma",
  });
  // Values outside the allowed range are pulled back inside it; a missing one falls back to the product size.
  expect(effectiveEmployeeStickerSize({ labelWidthMm: 9999, labelHeightMm: "" }, product)).toMatchObject({ labelWidthMm: 200, labelHeightMm: 25 });
});

it("sends only complete, in-range numbers to the server", () => {
  expect(employeeStickerPayload({ ...SAVED_SIZE, labelWidthMm: "75.255", labelsPerRow: "9" })).toMatchObject({ labelWidthMm: 75.26, labelsPerRow: 3 });
  expect(employeeStickerPayload({ ...SAVED_SIZE, labelHeightMm: "" })).toBeNull();
});

it("shows the saved size on the page and prints and previews with it", async () => {
  answer(SAVED_SIZE);
  renderPage();
  expect(await screen.findByRole("button", { name: "Sticker size, now 60 × 40 mm" })).toBeInTheDocument();
  // It must ask for this store's settings: without the store, the server can answer for another store than the one saved to.
  expect(mocks.get).toHaveBeenCalledWith("/sales-customization", { params: { company_id: 1 } });

  fireEvent.click(await screen.findByLabelText("Select Ravi"));
  fireEvent.click(screen.getByRole("button", { name: "Print (1)" }));
  await waitFor(() => expect(mocks.printLabels).toHaveBeenCalledTimes(1));
  expect(mocks.printLabels.mock.calls[0][0].customization).toMatchObject({ labelWidthMm: 60, labelHeightMm: 40, labelsPerRow: 1, qrCodeSizeMm: 20, productNameFontSizePx: 12 });
});

it("saves a new size from a common size and goes back to the product size on request", async () => {
  answer(null);
  mocks.put.mockResolvedValue({ data: { data: { employeeSticker: { labelWidthMm: 75, labelHeightMm: 50, labelsPerRow: 2, codeSizeMm: 13.5, nameFontSizePx: 10, detailFontSizePx: 10 } } } });
  renderPage();
  fireEvent.click(await screen.findByRole("button", { name: /^Sticker size, now 50 × 25 mm/ }));
  expect(screen.getByRole("button", { name: "Use product sticker size" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "75 × 50 mm" }));
  fireEvent.click(screen.getByRole("button", { name: "Save size" }));

  await waitFor(() => expect(mocks.put).toHaveBeenCalledTimes(1));
  expect(mocks.put).toHaveBeenCalledWith("/sales-customization", { companyId: 1, settingsSection: "sales", employeeSticker: { labelWidthMm: 75, labelHeightMm: 50, labelsPerRow: 2, codeSizeMm: 13.5, nameFontSizePx: 10, detailFontSizePx: 10 } });
  expect(await screen.findByRole("button", { name: "Sticker size, now 75 × 50 mm" })).toBeInTheDocument();

  mocks.put.mockResolvedValue({ data: { data: { employeeSticker: null } } });
  fireEvent.click(screen.getByRole("button", { name: "Sticker size, now 75 × 50 mm" }));
  fireEvent.click(screen.getByRole("button", { name: "Use product sticker size" }));
  await waitFor(() => expect(mocks.put).toHaveBeenLastCalledWith("/sales-customization", { companyId: 1, settingsSection: "sales", employeeSticker: null }));
  expect(await screen.findByRole("button", { name: "Sticker size, now 50 × 25 mm" })).toBeInTheDocument();
});

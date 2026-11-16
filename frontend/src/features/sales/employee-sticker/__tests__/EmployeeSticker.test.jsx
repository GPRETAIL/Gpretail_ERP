import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), print: vi.fn(), printLabels: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get } }));
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

const PEOPLE = [
  { id: 5, code: "E1", name: "Ravi", section: "Sarees", designation: "Salesman", sticker: "EMP-5" },
  { id: 6, code: "E2", name: "Meena", section: null, designation: null, sticker: "EMP-6" },
];

beforeEach(() => {
  mocks.get.mockReset();
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

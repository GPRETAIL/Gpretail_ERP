import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), navigate: vi.fn(), print: vi.fn(), printHtml: vi.fn() }));
vi.mock("react-router-dom", async original => ({ ...await original(), useNavigate: () => mocks.navigate }));
vi.mock("react-redux", () => ({ useSelector: selector => selector({ auth: { user: { company_id: 3, company_name: "Coffee 1" } } }) }));
vi.mock("../../../api/axios", () => ({ default: { get: mocks.get } }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("../../../context/PrintContext", () => ({ usePrintContext: () => ({ printHtml: mocks.printHtml }) }));
vi.mock("../../../utils/warehouseBarcodeCustomization", () => ({
  DEFAULT_WAREHOUSE_BARCODE_CUSTOMIZATION: { codeType: "barcode" },
  fetchWarehouseBarcodeCustomization: vi.fn().mockResolvedValue({ codeType: "barcode", printMode: "direct" }),
}));
vi.mock("../BarcodeGeneration", () => ({
  buildStickerLabels: ({ barcodeRows }) => barcodeRows.map(row => ({ key: row.id, codeValue: row.barcode, codeType: "barcode" })),
  buildLabelQrSources: vi.fn().mockResolvedValue({}),
  printWarehouseBarcodeLabels: (...args) => mocks.print(...args),
}));
import BarcodeSearchPage from "../BarcodeSearchPage";

const rows = [
  { id: 11, barcode: "SC00011", product: { name: "Latte Mug" }, mrp: 250, final_price: 225, direct_purchase: { invoice_no: "INV-9" } },
  { id: 12, barcode: "SC00012", product: { name: "Latte Mug" }, mrp: 250, final_price: 225, direct_purchase: { invoice_no: "INV-9" } },
];

beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  mocks.get.mockResolvedValue({ data: { data: rows, pagination: { mode: "offset", total: 2, total_pages: 1 } } });
  mocks.print.mockResolvedValue({ ok: true, message: "Barcode sticker sheet sent to the local printer connector." });
});

const renderAt = (url) => render(<MemoryRouter initialEntries={[url]}><BarcodeSearchPage /></MemoryRouter>);

it("filters to the entry it was opened for and reprints the selected existing barcodes", async () => {
  renderAt("/warehouse/barcode/search?direct_purchase_id=7&label=DP-7");
  await screen.findByText("SC00011");
  expect(mocks.get).toHaveBeenCalledWith("/barcodes", expect.objectContaining({ params: expect.objectContaining({ direct_purchase_id: "7" }) }));
  expect(screen.getByText("Entry: DP-7")).toBeTruthy();

  fireEvent.click(screen.getByRole("checkbox", { name: "Select barcode SC00012" }));
  fireEvent.click(screen.getByRole("button", { name: "Print selected (1)" }));

  await waitFor(() => expect(mocks.print).toHaveBeenCalledTimes(1));
  const call = mocks.print.mock.calls[0][0];
  expect(call.labels.map(label => label.codeValue)).toEqual(["SC00012"]);
  expect(call.storeName).toBe("Coffee 1");
  expect(call.jobName).toBe("Reprint SC00012");
  expect(mocks.navigate).not.toHaveBeenCalledWith(expect.stringContaining("/warehouse/barcode?"));
});

it("reprints a single row from its print button without going to barcode generation", async () => {
  renderAt("/warehouse/barcode/search");
  await screen.findByText("SC00011");
  fireEvent.click(screen.getByRole("button", { name: "Reprint SC00011" }));
  await waitFor(() => expect(mocks.print).toHaveBeenCalledTimes(1));
  expect(mocks.print.mock.calls[0][0].labels.map(label => label.codeValue)).toEqual(["SC00011"]);
  expect(mocks.navigate).not.toHaveBeenCalled();
});

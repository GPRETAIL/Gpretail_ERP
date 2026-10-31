import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import StoreTransfers from "../StoreTransfers";
import StockOutward from "../../warehouse/StockOutward";
import api from "../../../api/axios";

const user = vi.hoisted(() => ({ current: { id: 5, store_id: 2 } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: user.current } }) }));
vi.mock("../../../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("../../sales/posSalesUtils", () => ({ browserPrintHtml: vi.fn() }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
import { TransferActivityProvider } from "../../../context/TransferActivityContext";
import { toast } from "react-toastify";

const transfer = {
  id: 7, uuid: "0192e3f0-0000-7000-8000-000000000007", outward_no: "TRF-WH-20261031-0001", outward_date: "2026-10-31", status: "DISPATCHED",
  source_store_id: 1, target_store_id: 2, source_store: { name: "Warehouse" }, target_store: { name: "Branch" }, total_qty: 10, received_at: null,
  items: [{ id: 70, product_name: "Cotton Shirt", product_code: "SHIRT", size: "M", design_no: "D-1", quantity: "10.000" }],
};
beforeEach(() => {
  vi.clearAllMocks();
  user.current = { id: 5, store_id: 2 };
  api.get.mockImplementation(async (url) => ({ data: { data: url === "/stock-outwards" ? [transfer] : transfer } }));
  api.post.mockResolvedValue({ data: { data: { ...transfer, status: "RECEIVED" } } });
});

it("receives an incoming transfer with damage recorded and only good stock confirmed", async () => {
  render(<MemoryRouter><TransferActivityProvider><StoreTransfers mode="incoming" /></TransferActivityProvider></MemoryRouter>);
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/stock-outwards", { params: { all: true, direction: "incoming", status: "DISPATCHED" } }));
  fireEvent.click(await screen.findByRole("button", { name: "Receive" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText("Received Cotton Shirt"), { target: { value: "8" } });
  fireEvent.change(within(dialog).getByLabelText("Damaged Cotton Shirt"), { target: { value: "3" } });
  expect(within(dialog).getByText("More than sent")).toBeInTheDocument();
  expect(within(dialog).getByRole("button", { name: "Confirm receipt" })).toBeDisabled();
  fireEvent.change(within(dialog).getByLabelText("Damaged Cotton Shirt"), { target: { value: "1" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Confirm receipt" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith(`/stock-outwards/${transfer.uuid}/receive`, { notes: undefined, items: [{ id: 70, received_qty: 8, damaged_qty: 1, note: undefined }] }));
  // The sending store cannot cancel from the receiving side.
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(screen.queryByRole("button", { name: "Cancel" })).not.toBeInTheDocument();
});

it("dispatches scanned stock with a time-ordered transfer key, refusing more than is in stock", async () => {
  user.current = { id: 4, store_id: 1 };
  api.get.mockImplementation(async (url) => ({ data: { data: url === "/stock-outwards/destinations" ? [{ id: 2, name: "Branch" }]
    : { id: 9, variantId: 90, name: "Cotton Shirt", code: "SHIRT", barcode: "AC00001", stock_qty: 5, final_price: 399 } } }));
  api.post.mockResolvedValue({ data: { data: { outward_no: "TRF-1", target_store: { name: "Branch" }, total_qty: 2 } } });
  render(<MemoryRouter><StockOutward /></MemoryRouter>);
  fireEvent.mouseDown(screen.getByRole("combobox", { name: "Send to store" }));
  fireEvent.click(await screen.findByRole("option", { name: "Branch" }));
  const scan = screen.getByLabelText("Scan or type a barcode / product code");
  fireEvent.change(scan, { target: { value: "AC00001" } });
  fireEvent.submit(scan.closest("form"));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/pos-sales/barcode-lookup", { params: { barcode: "AC00001" } }));
  expect(toast.error).not.toHaveBeenCalled();
  const qty = await screen.findByLabelText("Quantity Cotton Shirt");
  fireEvent.change(qty, { target: { value: "6" } });
  expect(screen.getByText("Only 5 in stock")).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Dispatch transfer" })).toBeDisabled();
  fireEvent.change(qty, { target: { value: "2" } });
  fireEvent.click(screen.getByRole("button", { name: "Dispatch transfer" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/stock-outwards", expect.objectContaining({
    target_store_id: 2, items: [{ product_id: 9, variant_id: 90, quantity: 2, unit_price: 399 }],
    transfer_key: expect.stringMatching(/^[a-f0-9]{8}-[a-f0-9]{4}-7[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/),
  })));
  expect(await screen.findByText(/TRF-1 is in transit to Branch/)).toBeInTheDocument();
});

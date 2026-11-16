import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, post: mocks.post } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { role: "cashier", store_id: 1 } } }) }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/api/realtimeClient", () => ({ listen: vi.fn(() => () => {}), personalChannel: vi.fn(() => "user.1") }));
import Delivery from "@/features/sales/delivery/Delivery";
import { countScan, deliverySummary, emptyCounts, setLineCount } from "@/features/sales/delivery/utils/deliveryCount";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const SHIRT = { key: "10:100", product_id: 10, variant_id: 100, name: "Shirt", code: "SH1", size: "M", selling_mode: "PIECE", billed_qty: 2, returned_qty: 0, expected_qty: 2 };
const CAP = { key: "20:0", product_id: 20, variant_id: null, name: "Cap", code: "CP1", size: null, selling_mode: "PACK", billed_qty: 1, returned_qty: 0, expected_qty: 1 };
const BILL = { source_type: "pos_sale", source_id: 7, bill_no: "261116-0007", bill_type: "POS bill", customer: "Walk-in Customer", cancelled: false, lines: [SHIRT, CAP], delivery: null };
const SCANS = {
  "SC001": { product_id: 10, variant_id: 100, unique: true, name: "Shirt" },
  "SC002": { product_id: 10, variant_id: 100, unique: true, name: "Shirt" },
  "SC003": { product_id: 10, variant_id: 100, unique: true, name: "Shirt" },
  "CAP": { product_id: 20, variant_id: null, unique: false, name: "Cap" },
  "SOCK": { product_id: 30, variant_id: null, unique: false, name: "Socks" },
};

describe("delivery counting", () => {
  it("counts scans per line, ignores a repeated sticker and flags extras", () => {
    let counts = emptyCounts();
    counts = countScan([SHIRT, CAP], counts, "SC001", SCANS.SC001).counts;
    const again = countScan([SHIRT, CAP], counts, "SC001", SCANS.SC001);
    expect(again.duplicate).toBe(true);
    expect(again.counts).toBe(counts);
    counts = countScan([SHIRT, CAP], counts, "SC002", SCANS.SC002).counts;
    const third = countScan([SHIRT, CAP], counts, "SC003", SCANS.SC003);
    expect(third.ok).toBe(false);
    expect(third.counts.extras[0]).toMatchObject({ barcode: "SC003", reason: "More than billed" });
    expect(countScan([SHIRT, CAP], counts, "SOCK", SCANS.SOCK).counts.extras[0].reason).toBe("Not on this bill");
    expect(countScan([SHIRT, CAP], counts, "??", null).counts.extras[0].reason).toBe("Unknown barcode");
    expect(deliverySummary([SHIRT, CAP], counts)).toEqual({ expected: 3, counted: 2, missing: 1, extra: 0 });
    expect(setLineCount(counts, SHIRT.key, 1).lines[SHIRT.key]).toEqual({ qty: 1, barcodes: ["SC001"] });
  });
});

const renderPage = () => render(<MemoryRouter><TransferActivityProvider><Delivery /></TransferActivityProvider></MemoryRouter>);

const scanItem = async (code) => {
  const field = screen.getByLabelText("Scan item");
  fireEvent.change(field, { target: { value: code } });
  fireEvent.submit(field.closest("form"));
  await waitFor(() => expect(field).toHaveValue(""));
};

beforeEach(() => {
  mocks.get.mockReset();
  mocks.post.mockReset();
  mocks.get.mockImplementation(async (url, { params } = {}) => {
    if (url === "/deliveries") return { data: { data: [] } };
    if (url === "/deliveries/bill") return { data: { data: BILL } };
    if (url === "/deliveries/scan") {
      if (SCANS[params.barcode]) return { data: { data: { ...SCANS[params.barcode], barcode: params.barcode } } };
      throw { response: { status: 404 } };
    }
    throw new Error(`unexpected ${url}`);
  });
});
afterEach(cleanup);

const openBill = async () => {
  renderPage();
  fireEvent.change(screen.getByLabelText("Bill / invoice number"), { target: { value: "261116-0007" } });
  fireEvent.click(screen.getByRole("button", { name: "Open bill" }));
  expect(await screen.findByText("POS bill 261116-0007")).toBeInTheDocument();
};

it("opens on the entry form; Search shows the delivery register and Back returns", async () => {
  mocks.get.mockImplementation(async (url) => (url === "/deliveries"
    ? { data: { data: [{ id: 1, bill_no: "261116-0001", bill_type: "POS bill", customer: "Walk-in Customer", status: "short", status_label: "Short delivered",
      expected_qty: 3, delivered_qty: 2, short_qty: 1, short_reason: "Jeans missing", delivered_by: "Cashier", approved_by: "Sup", delivered_at: "2026-11-16T10:00:00Z" }] } }
    : { data: { data: BILL } }));
  renderPage();
  expect(screen.getByLabelText("Bill / invoice number")).toBeInTheDocument();
  expect(screen.queryByText("Delivery register")).not.toBeInTheDocument();
  expect(mocks.get).not.toHaveBeenCalledWith("/deliveries", expect.anything());

  fireEvent.click(screen.getByRole("button", { name: "Search" }));
  expect(await screen.findByText("261116-0001")).toBeInTheDocument();
  expect(screen.getByText(/Jeans missing/)).toBeInTheDocument();
  expect(screen.queryByLabelText("Bill / invoice number")).not.toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "Back", exact: true }));
  expect(await screen.findByLabelText("Bill / invoice number")).toBeInTheDocument();
});

it("hands over when every item is scanned, and blocks while an extra item is in the basket", async () => {
  mocks.post.mockResolvedValue({ data: { message: "Handed over.", data: { status: "delivered", bill_no: "261116-0007", delivered_qty: 3, expected_qty: 3 } } });
  await openBill();
  // A scanner fires codes back to back, before the server has answered the first.
  const field = screen.getByLabelText("Scan item");
  for (const code of ["SC001", "SC002"]) {
    fireEvent.change(field, { target: { value: code } });
    fireEvent.submit(field.closest("form"));
  }
  expect(await screen.findByText("Shirt (M): 2 of 2 ✓")).toBeInTheDocument();
  await scanItem("SOCK");
  expect(await screen.findByText(/Socks is not on this bill/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Remove extra items first" })).toBeDisabled();

  fireEvent.click(screen.getByRole("button", { name: "Removed" }));
  await scanItem("CAP");
  fireEvent.click(screen.getByRole("button", { name: "Hand over" }));

  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/deliveries", {
    source_type: "pos_sale", source_id: 7, short_reason: null,
    items: [{ product_id: 10, variant_id: 100, qty: 2, barcodes: ["SC001", "SC002"] }, { product_id: 20, variant_id: null, qty: 1, barcodes: ["CAP"] }],
  }));
  expect(await screen.findByText(/handed over: all 3 items/)).toBeInTheDocument();
});

it("a missing item asks for a reason, then a supervisor's approval, and sends the token", async () => {
  mocks.post.mockImplementation(async (url, body) => {
    if (url === "/approvals/pin-approve") return { data: { data: { token: "tok-1", status: "approved" } } };
    if (!body.approvalToken) {
      throw { response: { status: 428, data: { code: "APPROVAL_REQUIRED", action: "delivery_short", details: { short_units: 1, bill_no: "261116-0007", reason: body.short_reason, lines: [{ name: "Cap", expected: 1, delivered: 0 }] } } } };
    }
    return { data: { message: "Handed over short.", data: { status: "short", bill_no: "261116-0007", delivered_qty: 2, expected_qty: 3, approved_by: "Sup" } } };
  });
  await openBill();
  await scanItem("SC001");
  await scanItem("SC002");
  fireEvent.click(screen.getByRole("button", { name: "Hand over short" }));

  const reasonDialog = screen.getByRole("dialog", { name: "Hand over short?" });
  fireEvent.change(within(reasonDialog).getByLabelText("Why are items missing?"), { target: { value: "Cap out of stock" } });
  fireEvent.click(within(reasonDialog).getByRole("button", { name: "Hand over short" }));

  const approval = await screen.findByRole("dialog", { name: "Approval required" });
  expect(within(approval).getByText(/1 item\(s\) missing on bill 261116-0007/)).toBeInTheDocument();
  fireEvent.change(within(approval).getByLabelText("Approver username"), { target: { value: "sup" } });
  fireEvent.change(within(approval).getByLabelText("Approval PIN"), { target: { value: "4821" } });
  fireEvent.click(within(approval).getByRole("button", { name: "Approve" }));

  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/approvals/pin-approve", expect.objectContaining({
    action: "delivery_short", reason_code: "item_missing", payload: expect.objectContaining({ bill_no: "261116-0007", short_units: 1 }),
  })));
  await waitFor(() => expect(mocks.post).toHaveBeenLastCalledWith("/deliveries", expect.objectContaining({ short_reason: "Cap out of stock", approvalToken: "tok-1" })));
  expect(await screen.findByText(/handed over short: 2 of 3 items, approved by Sup/)).toBeInTheDocument();
});

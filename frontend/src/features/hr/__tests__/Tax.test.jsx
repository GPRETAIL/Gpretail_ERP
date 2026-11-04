import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import { IncomeTax, MyTax } from "@/features/hr/tax/Tax";
import TaxScreen from "@/mobile/screens/TaxScreen";
import api from "@/shared/api/apiClient";
import { browserPrintHtml } from "@/features/sales/pos/utils/posSalesUtils";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

const mockUser = vi.hoisted(() => ({ current: { id: 3, store_id: 2, role: "manager" } }));
vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: mockUser.current } }) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
vi.mock("@/features/sales/pos/utils/posSalesUtils", () => ({ browserPrintHtml: vi.fn() }));
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => vi.fn() }));

const est = (total, taxable) => ({ tax: { total }, taxable, tds_deducted: 0, tds_month: Math.round(total / 5), months_left: 5 });
const bundle = {
  employee: { id: 1, name: "Asha", pan: "ABCDE1234F" }, fy: "2026-27", declaration: { id: 9, regime: "NEW", status: "DRAFT", locked: false },
  items: [{ id: 41, section: "80C", declared_amount: 50000, description: "PPF", proof_status: "SUBMITTED", has_proof: true }],
  estimate: { new: est(150800, 1725000), old: est(120000, 1500000) },
  sections: ["HRA", "80C", "80D", "80CCD1B", "24B", "80E", "80G", "OTHER", "PREV_SALARY", "PREV_TDS", "PREV_PT"],
};
const form16 = { fy: "2026-27", assessment_year: "2027-28", employer: { name: "Main", address: "MG Road", tan: "BLRA12345B" }, employee: { name: "Asha", pan: "ABCDE1234F", from: "2026-04-01", to: "2027-03-31" },
  paid: 450000, tds: 37701, months: 3, complete: false, computation: { regime: "NEW", taxable: 1725000, tax: { slab_tax: 145000, rebate: 0, surcharge: 0, cess: 5800, total: 150800 }, deductions: { standard: 75000 }, exemptions: {} },
  quarters: [{ quarter: 1, paid: 450000, tds: 37701, challans: [{ bsr_code: "0510032", deposited_on: "2026-06-07", challan_no: "12345" }] }] };
const wrap = (node) => render(<MemoryRouter><TransferActivityProvider>{node}</TransferActivityProvider></MemoryRouter>);

beforeEach(() => {
  vi.clearAllMocks();
  mockUser.current = { id: 3, store_id: 2, role: "manager" };
  api.get.mockImplementation(async (url) => ({ data: {
    "/tax-declarations/mine": { data: bundle },
    "/tax-declarations": { data: [{ employee_id: 1, name: "Asha", code: "E1", pan: "ABCDE1234F", regime: "OLD", status: "SUBMITTED", locked: false, declared: 50000, to_verify: 1, verified: 0 }] },
    "/tax-declarations/employee/1": { data: bundle },
    "/tds/challans": { data: { fy: "2026-27", challans: [], months: [{ month: "2026-04", quarter: 1, deducted: 12567, deposited: 0 }] } },
    "/tds/form16": { data: form16 },
  }[url] || { data: [] } }));
  api.post.mockResolvedValue({ data: { message: "Done" } });
  api.put.mockResolvedValue({ data: { message: "Saved" } });
});

it("compares the regimes, declares an investment and uploads its proof", async () => {
  wrap(<MyTax />);
  expect((await screen.findAllByText("₹1,50,800.00")).length).toBeGreaterThan(0); // The new regime's card and the projection.
  expect(screen.getByText(/saves ₹30,800.00 this year/)).toBeInTheDocument();
  expect(screen.getByText("Lower tax")).toBeInTheDocument();
  fireEvent.click(screen.getByText("Old regime"));
  fireEvent.click(screen.getByRole("button", { name: "Add an item" }));
  fireEvent.change(screen.getAllByLabelText("Amount for the year ₹")[1], { target: { value: "25000" } });
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/tax-declarations/mine", expect.objectContaining({
    regime: "OLD", fy: "2026-27", items: [expect.objectContaining({ id: 41, section: "80C", declared_amount: 50000 }), expect.objectContaining({ section: "80C", declared_amount: 25000 })] })));

  const file = new File(["x"], "ppf.jpg", { type: "image/jpeg" });
  fireEvent.change(screen.getByLabelText("Proof for 80C investments"), { target: { files: [file] } });
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tax-declaration-items/41/proof", expect.any(FormData), { headers: { "Content-Type": "multipart/form-data" } }));
});

it("lets HR accept a proof for a smaller amount", async () => {
  wrap(<IncomeTax />);
  fireEvent.click(await screen.findByRole("button", { name: "Open" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(await within(dialog).findByRole("button", { name: "Accept" }));
  const confirm = (await screen.findAllByRole("dialog")).at(-1);
  fireEvent.change(within(confirm).getByLabelText("Amount proved ₹"), { target: { value: "45000" } });
  fireEvent.click(within(confirm).getByRole("button", { name: "Accept" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tax-declaration-items/41/verify", { action: "accept", amount: 45000, note: undefined }));
});

it("records a TDS deposit for the quarter's months", async () => {
  wrap(<IncomeTax />);
  fireEvent.click(await screen.findByRole("tab", { name: "Challans" }));
  fireEvent.click(await screen.findByRole("button", { name: "Record a deposit" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.click(within(dialog).getByLabelText("2026-04"));
  fireEvent.click(within(dialog).getByLabelText("2026-05"));
  fireEvent.change(within(dialog).getByLabelText("Tax ₹"), { target: { value: "25134" } });
  fireEvent.change(within(dialog).getByLabelText("BSR code"), { target: { value: "0510032" } });
  fireEvent.change(within(dialog).getByLabelText("Challan serial no."), { target: { value: "12345" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tds/challans", expect.objectContaining({ fy: "2026-27", quarter: 1, months: ["2026-04", "2026-05"], tax: 25134, bsr_code: "0510032", challan_no: "12345" })));
});

it("prints Form 16 Part B", async () => {
  wrap(<IncomeTax />);
  fireEvent.click(await screen.findByRole("tab", { name: "Form 16" }));
  fireEvent.mouseDown(await screen.findByLabelText("Employee"));
  fireEvent.click(await screen.findByRole("option", { name: "Asha (E1)" }));
  fireEvent.click(await screen.findByRole("button", { name: "Print Part B" }));
  expect(browserPrintHtml).toHaveBeenCalledWith(expect.stringContaining("BLRA12345B"));
  expect(browserPrintHtml.mock.calls[0][0]).toContain("ESTIMATE");
  expect(browserPrintHtml.mock.calls[0][0]).toContain("0510032 / 2026-06-07 / 12345");
});

it("switches regime and sends a proof photo from the phone", async () => {
  render(<TaxScreen />);
  expect(await screen.findByText(/80C investments ·/)).toBeInTheDocument(); // Loaded.
  fireEvent.click(screen.getByText(/^Old regime/));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/tax-declarations/mine", expect.objectContaining({ regime: "OLD" })));
  expect(await screen.findByText("Switched to the old regime.")).toBeInTheDocument(); // Done before the next action.
  fireEvent.change(screen.getByLabelText("Proof for 80C investments"), { target: { files: [new File(["x"], "p.jpg", { type: "image/jpeg" })] } });
  await waitFor(() => expect(api.post).toHaveBeenCalledWith("/tax-declaration-items/41/proof", expect.any(FormData), { headers: { "Content-Type": "multipart/form-data" } }));
  expect(await screen.findByText("Proof sent to HR.")).toBeInTheDocument();
});

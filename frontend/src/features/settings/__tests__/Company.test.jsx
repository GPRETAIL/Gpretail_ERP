import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import Company from "../Company";
import api from "@/shared/api/apiClient";

vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn() }));
vi.mock("@/features/auth/utils/checkAuth", () => ({ default: vi.fn() }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), warn: vi.fn() } }));

const store = (extra = {}) => ({
  id: 5, code: "STR-5", name: "Coffee 1", reg_name: "Coffee One Pvt Ltd", gstin: "33ABCDE1234F1Z5", gst_no: "33ABCDE1234F1Z5", address: "12 Main Road", location: "Erode Bazaar",
  city: "Erode", state: "Tamil Nadu", country: "India", pincode: "638001", phone: "9000011111", contact_person: "Ravi", einvoice_username: "einv", einvoice_password: "pw",
  printer_configurations: [{ location: "Counter 1", server: "PC1", ip: "192.168.1.9", port: "9100", type: "printer_only" }], vx_admin_managed: true, is_active: true, ...extra,
});
const OVERVIEW = { stores: [{ id: 5, code: "STR-5", name: "Coffee 1", location: "Erode Bazaar", status: "active" }, { id: 6, code: "STR-6", name: "Coffee 2", location: "", status: "active" }], warehouses: [] };

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockImplementation(async (url) => {
    if (url === "/companies/tenant-sync/overview") return { data: { data: OVERVIEW } };
    if (url === "/companies/default") return { data: { data: store() } };
    if (url === "/companies/6") return { data: { data: store({ id: 6, code: "STR-6", name: "Coffee 2", location: "", reg_name: "Coffee Two", printer_configurations: [] }) } };
    throw new Error(`unexpected ${url}`);
  });
  api.put.mockResolvedValue({ data: { data: store() } });
});
afterEach(cleanup);

const input = (label) => screen.getAllByText(label, { selector: "label" })[0].parentElement.querySelector("input, textarea");

it("shows each store with its location, and a store without one is flagged", async () => {
  render(<Company />);
  expect((await screen.findAllByRole("columnheader", { name: "Location" }))[0]).toBeVisible();
  expect(screen.getAllByText("Erode Bazaar").length).toBeGreaterThan(0);
  expect(screen.getByText("Not set")).toBeVisible();
});

it("opens on the current store's saved details and keeps the Vynerix Admin details read-only", async () => {
  render(<Company />);
  await waitFor(() => expect(input("Reg. Name")).toHaveValue("Coffee One Pvt Ltd"));
  for (const label of ["Name", "Reg. Name", "GST No", "Address", "Location", "Contact No", "City", "State", "Country", "PIN Code"]) expect(input(label)).toBeDisabled();
  expect(input("GST No")).toHaveValue("33ABCDE1234F1Z5");
  expect(input("Contact Person")).toBeEnabled();
  expect(input("EInvoice Password")).toBeEnabled();
  expect(input("EInvoice Username")).toHaveValue("einv");
  expect(screen.getByText("Counter 1")).toBeVisible();
});

it("clicking a store in the table loads its saved details, printers included", async () => {
  render(<Company />);
  await waitFor(() => expect(input("Reg. Name")).toHaveValue("Coffee One Pvt Ltd"));
  fireEvent.click(await screen.findByRole("row", { name: "Open store Coffee 2" }));
  await waitFor(() => expect(input("Reg. Name")).toHaveValue("Coffee Two"));
  expect(screen.queryByText("Counter 1")).not.toBeInTheDocument();
  expect(screen.getByText(/Location is not set yet/)).toBeVisible();
});

it("saves the editable details without needing the Vynerix Admin ones to be filled", async () => {
  render(<Company />);
  await waitFor(() => expect(input("Reg. Name")).toHaveValue("Coffee One Pvt Ltd"));
  fireEvent.change(input("EInvoice Username"), { target: { value: "new-user" } });
  fireEvent.click(screen.getByRole("button", { name: /Save/ }));
  await waitFor(() => expect(api.put).toHaveBeenCalledOnce());
  const [url, body] = api.put.mock.calls[0];
  expect(url).toBe("/companies/5");
  expect(body.get("einvoiceUsername")).toBe("new-user");
  expect(JSON.parse(body.get("printerConfigurations"))).toHaveLength(1);
});

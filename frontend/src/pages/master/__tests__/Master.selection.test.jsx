import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), delete: vi.fn(), get: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock("react-router-dom", async importOriginal => ({ ...await importOriginal(), useNavigate: () => mocks.navigate }));
vi.mock("../../../api/axios", () => ({ default: { get: mocks.get, delete: mocks.delete } }));
vi.mock("../../../components/SearchableSelect", () => ({ default: ({ label, name, value, options, onChange }) => <label>{label}<select name={name} value={value} onChange={onChange}><option value="" />{options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label> }));
vi.mock("../../../hooks/useStoreNameMap", () => ({ default: () => ({}) }));
vi.mock("../../../components/UploadImportButton", () => ({ default: () => null }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue({ visibleColumns: ["code", "name"] }), saveTablePreference: vi.fn() }));
import Configuration from "../Configuration";
import ProductAttributes from "../ProductAttributes";
vi.mock("react-toastify", () => ({ toast: { success: mocks.success, error: mocks.error } }));
beforeEach(() => {
  cleanup(); vi.clearAllMocks();
  mocks.get.mockResolvedValue({ data: { data: [{ id: 11, name: "First record", code: "ONE", is_active: true }, { id: 12, name: "Second record", code: "TWO", is_active: true }], pagination: { mode: "offset", total: 2, total_pages: 1 } } });
  mocks.delete.mockResolvedValue({ data: { success: true } });
});
it.each([["Configuration", Configuration, "Configuration Type", "LOCATION", "COUNTER"], ["Product Attributes", ProductAttributes, "Product Type", "STYLE", "COLOUR"]])("%s uses shared row checkboxes, select-all and clear with selection reset on type changes", async (_name, Page, label, firstType, secondType) => {
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(label), { target: { value: firstType } });
  await screen.findByText("First record");
  const selectAll = screen.getByRole("checkbox", { name: "Select all on this page" });
  const rowBoxes = screen.getAllByRole("checkbox").filter(box => box !== selectAll);
  expect(rowBoxes).toHaveLength(2);
  fireEvent.click(rowBoxes[0]);
  expect(screen.getByText("1 row selected")).toBeTruthy();
  expect(mocks.navigate).not.toHaveBeenCalled();
  fireEvent.click(selectAll);
  expect(screen.getByText("2 rows selected")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Clear Selection", exact: true }));
  expect(screen.queryByText("2 rows selected")).toBeNull();
  fireEvent.click(rowBoxes[0]);
  fireEvent.change(screen.getByLabelText(label), { target: { value: secondType } });
  await waitFor(() => expect(screen.queryByText("1 row selected")).toBeNull());
  await screen.findByText("First record");
  expect(screen.getAllByRole("checkbox").every(box => !box.checked)).toBe(true);
});

it.each([
  [Configuration, "Configuration Type", "COUNTER", "/configurations/counter"],
  [ProductAttributes, "Product Type", "STYLE", "/attributes/style"],
  [ProductAttributes, "Product Type", "SIZE", "/sizes"],
  [ProductAttributes, "Product Type", "SIZEGROUP", "/size-groups"],
])("requires confirmation and deletes selected rows using the active master endpoint", async (Page, label, type, endpoint) => {
  render(<MemoryRouter><Page /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText(label), { target: { value: type } });
  await screen.findByText("First record");
  fireEvent.click(screen.getByRole("checkbox", { name: "Select all on this page" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete Selected", exact: true }));
  let dialog = screen.getByRole("dialog");
  expect(within(dialog).getByText(/Delete 2 selected/)).toBeTruthy();
  expect(mocks.delete).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel", exact: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  expect(mocks.delete).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Delete Selected", exact: true }));
  dialog = screen.getByRole("dialog");
  const reads = mocks.get.mock.calls.length;
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete", exact: true }));
  await waitFor(() => expect(mocks.delete).toHaveBeenCalledTimes(2));
  expect(mocks.delete).toHaveBeenCalledWith(`${endpoint}/11`);
  expect(mocks.delete).toHaveBeenCalledWith(`${endpoint}/12`);
  await waitFor(() => expect(screen.queryByText("2 rows selected")).toBeNull());
  await waitFor(() => expect(mocks.get.mock.calls.length).toBeGreaterThan(reads));
});
it("keeps failed deletions selected while removing successful ones", async () => {
  mocks.delete.mockImplementation(path => path.endsWith("/11") ? Promise.resolve({}) : Promise.reject(new Error("In use")));
  render(<MemoryRouter><Configuration /></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Configuration Type"), { target: { value: "LOCATION" } });
  await screen.findByText("First record");
  fireEvent.click(screen.getByRole("checkbox", { name: "Select all on this page" }));
  fireEvent.click(screen.getByRole("button", { name: "Delete Selected", exact: true }));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Delete", exact: true }));
  await waitFor(() => expect(screen.getByText("1 row selected")).toBeTruthy());
  expect(mocks.success).toHaveBeenCalledWith("1 record deleted successfully.");
  expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("1 record could not be deleted"));
  await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
  const selectAll = screen.getByRole("checkbox", { name: "Select all on this page" });
  const rowBoxes = screen.getAllByRole("checkbox").filter(box => box !== selectAll);
  expect(rowBoxes.map(box => box.checked)).toEqual([false, true]);
});

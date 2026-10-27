import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import BackupCenter from "../BackupCenter";
const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../../api/axios", () => ({ default: { get } }));
vi.mock("react-redux", () => ({ useSelector: select => select({ auth: { user: { id: 1, role: "admin", can_switch_stores: true } } }) }));
vi.mock("../../../api/runtimeRouting", () => ({ getRuntimeRoutingSnapshot: () => ({ currentTarget: "local" }) }));
vi.mock("../../../components/FilterableDataTable", () => ({ default: () => <div /> }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue(null), saveTablePreference: vi.fn() }));
beforeEach(() => {
  sessionStorage.clear(); sessionStorage.setItem("activeStoreId", "2"); vi.clearAllMocks();
  get.mockResolvedValue({ data: { data: { companies: [{ id: 2, name: "Coffee" }, { id: 3, name: "Second" }], moduleOptions: [], setting: {}, stats: {}, backups: [], restores: [] } } });
});

it("lets an authorized tenant admin select backup scope without changing workspace store or node", async () => {
  render(<BackupCenter />);
  await screen.findByText("Backup Scope");
  expect(get).toHaveBeenCalledWith("/backups/overview", expect.objectContaining({ storeScopeId: "2", __backupTarget: "local" }));
  const selected = screen.getAllByRole("combobox").find(element => element.textContent.includes("Coffee"));
  expect(selected).toBeDefined();
  fireEvent.mouseDown(selected);
  fireEvent.click(await screen.findByRole("option", { name: "Second" }));
  await waitFor(() => expect(get).toHaveBeenCalledWith("/backups/overview", expect.objectContaining({ storeScopeId: "3", params: { companyId: "3" }, __backupTarget: "local" })));
  expect(sessionStorage.getItem("activeStoreId")).toBe("2");
});

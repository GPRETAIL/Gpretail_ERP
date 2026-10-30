import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { UsersCard, SettingsEmployeesCard, SettingsStoresCard, LastBackupCard } from "../components/dashboard/settings/SettingsKpiSummary";
import { StoresCard, ActiveStaffCard } from "../components/dashboard/store/StoreKpiSummary";
import { NetPositionCard } from "../components/dashboard/finance/FinanceKpiSummary";
import FinanceDashboardTabPane from "../components/FinanceDashboardTabPane";
import CrmDashboardTabPane from "../components/CrmDashboardTabPane";
import SettingsDashboardTabPane from "../components/SettingsDashboardTabPane";
import MastersDashboardTabPane from "../components/MastersDashboardTabPane";
import { isRegisteredProtectedPath } from "../routes/protectedLayoutRoutes";
import { canAccessPath } from "../utils/accessControl";

vi.mock("../hooks/useModuleDashboardSummary", () => ({ default: () => ({ data: {}, loading: false }) }));
vi.mock("../components/dashboard/DashboardGrid", () => ({ default: () => null }));

function Destination() {
  const location = useLocation();
  return <output data-testid="destination">{location.pathname}{location.search}</output>;
}

describe("Dashboard navigation destinations", () => {
  it("does not send Net Position to the unrelated Purchase Returns workflow", () => {
    render(<MemoryRouter><NetPositionCard summary={{ net_position: 150 }} /></MemoryRouter>);
    expect(screen.getByText("Net Position").closest("button")).toBeNull();
  });
  it.each([
    [SettingsStoresCard, /^Stores/, "/settings/company"],
    [StoresCard, /^Stores/, "/settings/company"],
    [UsersCard, /^Users/, "/settings/user-access"],
    [SettingsEmployeesCard, /^Employees/, "/hrms/employee"],
    [ActiveStaffCard, /^Active Staff/, "/hrms/employee"],
    [LastBackupCard, /^Last Backup/, "/settings/backup"],
    [FinanceDashboardTabPane, "Purchase Invoices", "/warehouse/invoice"],
    [CrmDashboardTabPane, "+ New Customer", "/crm/customer/new"],
    [SettingsDashboardTabPane, "Configure Local Server", "/settings/configure-local-server"],
    [MastersDashboardTabPane, "+ New Brand", "/masters/brand/new"],
    [MastersDashboardTabPane, "+ New Supplier", "/masters/supplier/new"],
  ])("opens the intended registered destination %s", (Component, label, destination) => {
    render(<MemoryRouter initialEntries={["/dashboard"]}><Component active /><Destination /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: label }));
    expect(screen.getByTestId("destination")).toHaveTextContent(destination);
    expect(isRegisteredProtectedPath(destination)).toBe(true);
  });
  it.each([{ role: "super_admin" }, { role: "admin", is_tenant_admin: true }])("keeps the store-list destination reachable for %j", user => {
    expect(canAccessPath("/settings/company", user)).toBe(true);
  });
});

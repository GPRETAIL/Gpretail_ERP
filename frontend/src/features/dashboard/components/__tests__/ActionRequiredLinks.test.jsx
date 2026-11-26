import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import CrmActionRequiredBanner from "@/features/dashboard/components/crm/CrmActionRequiredBanner";
import FinanceActionRequiredBanner from "@/features/dashboard/components/finance/FinanceActionRequiredBanner";
import MastersActionRequiredBanner from "@/features/dashboard/components/masters/MastersActionRequiredBanner";
import OverviewActionRequiredCard from "@/features/dashboard/components/overview/OverviewActionRequiredCard";
import SalesActionRequiredBanner from "@/features/dashboard/components/sales/SalesActionRequiredBanner";
import SettingsActionRequiredBanner from "@/features/dashboard/components/settings/SettingsActionRequiredBanner";
import StoreActionRequiredBanner from "@/features/dashboard/components/store/StoreActionRequiredBanner";
import WarehouseActionRequiredBanner from "@/features/dashboard/components/warehouse/WarehouseActionRequiredBanner";

const navigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => ({ ...(await importOriginal()), useNavigate: () => navigate }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }));

beforeEach(() => navigate.mockClear());
afterEach(cleanup);

const item = (key, route, label) => ({ key, route, filter_param: "filter=nothing_reads_this", label, count: 3, severity: "warning" });

const BANNERS = [
  ["sales", SalesActionRequiredBanner, item("overdue_credit", "/sales/pos-sales", "Overdue credit"), "/sales/reports?report=credit_customer_outstanding_report"],
  ["sales (register)", SalesActionRequiredBanner, item("open_registers", "/sales/cash-closing", "Open registers"), "/sales/cash-closing"],
  ["warehouse", WarehouseActionRequiredBanner, item("physical_variance", "/warehouse/physical-stock", "Stock variance"), "/warehouse/reports?report=stock_audit_report"],
  ["finance", FinanceActionRequiredBanner, item("overdue_payables", "/finance/supplier-payment", "Overdue payables"), "/warehouse/reports?report=supplier_pending_bills"],
  ["crm", CrmActionRequiredBanner, item("over_credit_limit", "/crm/customer", "Over credit limit"), "/sales/reports?report=credit_customer_outstanding_report"],
  ["store", StoreActionRequiredBanner, item("dormant_stores", "/sales/pos-sales", "Dormant stores"), "/sales/reports?report=sales_analysis_report"],
  ["masters (page, no filter)", MastersActionRequiredBanner, item("missing_hsn", "/masters/product", "No HSN"), "/masters/product"],
  ["settings (page, no filter)", SettingsActionRequiredBanner, item("inactive_users", "/settings/users", "Inactive users"), "/settings/users"],
];

describe("dashboard Action Required cards open the report they are about", () => {
  it.each(BANNERS)("%s", (_name, Banner, row, expected) => {
    render(<MemoryRouter><Banner actionRequired={[row]} loading={false} /></MemoryRouter>);
    fireEvent.click(screen.getByText(row.label));
    expect(navigate).toHaveBeenCalledWith(expected);
  });

  it("the Overview card maps a notification link that carried a filter nothing reads", () => {
    const note = { id: 1, title: "Credit overdue", message: "3 customers", link: "/sales/pos-sales?filter=overdue_credit", read_at: null, created_at: new Date().toISOString() };
    render(<MemoryRouter><OverviewActionRequiredCard items={[note]} loading={false} onItemHandled={() => {}} /></MemoryRouter>);
    fireEvent.click(screen.getByText("Credit overdue"));
    expect(navigate).toHaveBeenCalledWith("/sales/reports?report=credit_customer_outstanding_report");
  });
});

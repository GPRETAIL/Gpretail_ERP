import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readdirSync, statSync } from "node:fs";
import { actionTarget, KPI_TARGET_IDS, kpiTarget, overviewTarget } from "@/features/dashboard/utils/dashboardLinks";

const source = (file) => readFileSync(resolve("src/features", file), "utf8");
const filesUnder = (dir) => readdirSync(dir).flatMap((name) => {
  const full = resolve(dir, name);
  return statSync(full).isDirectory() ? (name === "__tests__" ? [] : filesUnder(full)) : /\.jsx?$/.test(name) ? [full] : [];
});
const reportKeys = (target) => [...target.matchAll(/[?&]report=([a-z_0-9]+)/g)].map((m) => m[1]);

describe("dashboard KPI card targets", () => {
  it("every KPI card opens a report that exists and shows data, or a page that exists", () => {
    const sales = source("sales/reports/SalesReports.jsx");
    const warehouse = source("warehouse/WarehouseReports.jsx");
    const routes = readFileSync(resolve("src/app/routes.jsx"), "utf8");
    for (const id of KPI_TARGET_IDS) {
      const target = kpiTarget(id);
      const [key] = reportKeys(target);
      if (key) {
        const file = target.startsWith("/sales") ? sales : warehouse;
        const block = new RegExp(`^\\s*${key}: \\{([\\s\\S]{0,400})`, "m").exec(file);
        expect(block, `${id}: ${key} has a data source`).not.toBeNull();
        expect(block[1], `${id}: ${key} is not marked unavailable`).not.toContain("unavailableReason");
      } else {
        expect(routes, `${id}: ${target} is a page`).toContain(`path: "${target.split("?")[0]}"`);
      }
    }
  });

  it("opens the report behind the number, by module", () => {
    expect(kpiTarget("sales.credit_pending")).toBe("/sales/reports?report=credit_customer_outstanding_report");
    expect(kpiTarget("sales.tile.returns")).toBe("/sales/reports?report=sales_return_report");
    expect(kpiTarget("warehouse.stock_outward")).toBe("/warehouse/reports?report=outward_report");
    expect(kpiTarget("crm.customers")).toBe("/sales/reports?report=my_customers_report");
    expect(kpiTarget("finance.payables")).toBe("/warehouse/reports?report=supplier_pending_bills");
    expect(kpiTarget("masters.products")).toBe("/warehouse/reports?report=product_master_report");
    expect(kpiTarget("hr.payroll")).toBe("/hrms/payroll-reports");
    expect(kpiTarget("not.a.card")).toBe("/dashboard");
  });

  it("every kpiTarget id used by a dashboard card is defined (no typos)", () => {
    const used = new Set();
    for (const file of filesUnder(resolve("src/features/dashboard/components"))) {
      const text = readFileSync(file, "utf8");
      for (const m of text.matchAll(/kpiTarget\("([^"]+)"\)/g)) used.add(m[1]);
      for (const m of text.matchAll(/kpiTarget\(`([^`$]*)\$\{[^}]+\}`\)/g)) {
        for (const id of KPI_TARGET_IDS.filter((x) => x.startsWith(m[1]))) used.add(id);
      }
    }
    expect(used.size).toBeGreaterThan(20);
    for (const id of used) expect(KPI_TARGET_IDS, `${id} is defined`).toContain(id);
  });
});

describe("dashboard card targets", () => {
  it("opens the report a card is about, not the module's main page", () => {
    expect(actionTarget("sales", { key: "overdue_credit", route: "/sales/pos-sales" })).toBe("/sales/reports?report=credit_customer_outstanding_report");
    expect(actionTarget("warehouse", { key: "physical_variance", route: "/warehouse/physical-stock" })).toBe("/warehouse/reports?report=stock_audit_report");
    expect(actionTarget("finance", { key: "pending_returns", route: "/warehouse/purchase-return" })).toBe("/warehouse/reports?report=purchase_return_report");
    expect(actionTarget("sales", { key: "pending_returns", route: "/sales/pos-sales-return" })).toBe("/sales/reports?report=sales_return_report");
  });

  it("keeps a page where the work is done there, and falls back to the backend route for an item it does not know", () => {
    expect(actionTarget("sales", { key: "open_registers", route: "/sales/cash-closing" })).toBe("/sales/cash-closing");
    expect(actionTarget("masters", { key: "missing_hsn", route: "/masters/product", filter_param: "filter=missing_hsn" })).toBe("/masters/product");
    expect(actionTarget("sales", { key: "something_new", route: "/sales/new-thing" })).toBe("/sales/new-thing");
    expect(actionTarget("sales", undefined)).toBe("/dashboard");
  });

  it("maps the Overview notifications that carried a filter nothing reads", () => {
    expect(overviewTarget("/sales/pos-sales?filter=overdue_credit")).toBe("/sales/reports?report=credit_customer_outstanding_report");
    expect(overviewTarget("/settings/backup?status=failed")).toBe("/settings/backup");
    expect(overviewTarget("/finance/supplier-payment?openInvoiceType=invoice&openInvoiceId=4")).toBe("/finance/supplier-payment?openInvoiceType=invoice&openInvoiceId=4");
    expect(overviewTarget("")).toBe("/notifications");
  });

  it("only points at reports that exist and show data (not the Coming soon ones)", () => {
    const sales = source("sales/reports/SalesReports.jsx");
    const warehouse = source("warehouse/WarehouseReports.jsx");
    const all = [
      "/sales/reports?report=credit_customer_outstanding_report", "/sales/reports?report=day_end_settlement_summary", "/sales/reports?report=sales_return_report",
      "/sales/reports?report=dealer_invoice_report", "/sales/reports?report=birthday_wishes", "/sales/reports?report=sales_analysis_report",
      "/warehouse/reports?report=supplier_pending_bills", "/warehouse/reports?report=purchase_return_report", "/warehouse/reports?report=stock_audit_report", "/warehouse/reports?report=pending_inward_report",
    ];
    for (const target of all) {
      const [key] = reportKeys(target);
      const file = target.startsWith("/sales") ? sales : warehouse;
      const block = new RegExp(`^\\s*${key}: \\{([\\s\\S]{0,400})`, "m").exec(file);
      expect(block, `${key} has a data source`).not.toBeNull();
      expect(block[1], `${key} is not marked unavailable`).not.toContain("unavailableReason");
    }
  });
});


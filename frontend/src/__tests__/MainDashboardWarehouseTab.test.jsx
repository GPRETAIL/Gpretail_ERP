import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import authReducer from "../features/authSlice";
import Dashboard from "../pages/Dashboard";
import api from "../api/axios";

vi.mock("../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const mockWarehouseData = {
  summary: {
    total_stock_qty: 15400,
    total_available_qty: 14200,
    total_allocated_qty: 1200,
    total_cost_value: 5200000,
    total_retail_value: 8400000,
    pending_purchases: 5,
    total_incoming: 12,
    outward_today: 3,
    pending_dispatch: 2,
    total_outward: 18,
    low_stock_count: 8,
  },
  action_required: [
    { key: "grn_pending", label: "GRNs Pending", count: 6, severity: "critical", route: "/warehouse/receive-goods", filter_param: "status=pending" },
    { key: "transport_issues", label: "Transport Issues", count: 2, severity: "critical", route: "/warehouse/transport-issue", filter_param: "status=open" },
    { key: "low_stock", label: "Low Stock Items", count: 8, severity: "warning", route: "/warehouse/item-locator", filter_param: "stock_filter=low_stock" },
  ],
  inventory: {
    selling_modes: {
      piece: { label: "Pieces", unit: "Pcs", total_qty: 11000, product_count: 250, cost_value: 3200000 },
      pack: { label: "Packs", unit: "Packs", total_qty: 3000, product_count: 90, cost_value: 1400000 },
      cut: { label: "Cut Stock (Fabric/Length)", unit: "Meters", total_qty: 1400, product_count: 60, cost_value: 600000 },
    },
  },
  incoming: [
    { id: 1, purchase_no: "PUR-201", invoice_no: "INV-701", total_qty: 150, total_amount: 32000, supplier_name: "Kiran Mills", status: "completed" },
  ],
  alerts: [
    { id: 1, product_name: "Linen Shirt", size: "M", color: "White", barcode: "LIN-M-WHT", current_stock: 3, reorder_level: 15, store_name: "Main Store" },
  ],
  performance: { stock_accuracy: "99.4%", on_time_dispatch_rate: "98.1%" },
  charts: {
    stock_movement: [
      { date: "Aug 20", raw_date: "2026-08-20", incoming: 150, outgoing: 110 },
    ],
  },
};

const createTestStore = (role = "super_admin") =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 1, name: "Super Admin", role, company_id: 1 },
        token: "fake-jwt-token",
        isAuthenticated: true,
      },
    },
  });

describe("Main Dashboard Warehouse Tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes("/warehouse/dashboard")) {
        return Promise.resolve({ data: { success: true, data: mockWarehouseData } });
      }
      if (url.includes("/dashboard")) {
        return Promise.resolve({
          data: {
            metrics: {
              totalBills: { amount: 1000, count: 5 },
              settlements: { amount: 900 },
              employees: { present: 4, total: 5 },
              stockValue: { amount: 50000 },
            },
            charts: {},
            tables: {},
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  const renderComponent = (store = createTestStore()) =>
    render(
      <Provider store={store}>
        <MemoryRouter>
          <Dashboard />
        </MemoryRouter>
      </Provider>
    );

  it("switches to Warehouse Tab on Main Dashboard and loads ERP Command Center data", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeDefined();
      expect(screen.getByText("Warehouse")).toBeDefined();
    });

    const warehouseTabBtn = screen.getByText("Warehouse");
    fireEvent.click(warehouseTabBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/warehouse/dashboard", expect.any(Object));
      expect(screen.getByText("Total Stock Units")).toBeDefined();
      expect(screen.getByText("15,400")).toBeDefined();
      expect(screen.getByText("Selling Mode Breakdown")).toBeDefined();
      expect(screen.getByText("GRNs Pending")).toBeDefined();
      expect(screen.getByText("Linen Shirt")).toBeDefined();
    });
  });
});

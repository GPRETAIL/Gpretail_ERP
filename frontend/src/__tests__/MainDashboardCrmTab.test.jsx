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

const mockCrmData = {
  summary: {
    total_customers: 2450,
    active_customers: 2100,
    new_customers: 48,
    total_orders: 180,
    total_order_value: 3600000,
    advance_received: 1200000,
    balance_receivable: 2400000,
    avg_order_value: 20000,
    total_receivables: 450000,
    customers_with_dues: 15,
    total_loyalty_points: 85000,
    loyalty_members_count: 320,
    total_points_redeemed: 12000,
  },
  action_required: [
    { key: "orders_due_today", label: "Orders Due for Delivery", count: 4, severity: "critical", route: "/crm/customer-orders", filter_param: "delivery_filter=due_today" },
    { key: "over_credit_limit", label: "Credit Limit Exceeded", count: 2, severity: "critical", route: "/crm/customer", filter_param: "filter=over_limit" },
    { key: "ready_pending_balance", label: "Balance Due (Ready Orders)", count: 6, severity: "warning", route: "/crm/customer-orders", filter_param: "status=ready&has_balance=true" },
    { key: "draft_orders", label: "Unconfirmed Orders", count: 3, severity: "warning", route: "/crm/customer-orders", filter_param: "status=pending" },
    { key: "celebrations_today", label: "Birthdays / Anniversaries", count: 5, severity: "info", route: "/crm/customer", filter_param: "event=today" },
    { key: "loyalty_club_members", label: "Loyalty Club Members", count: 42, severity: "info", route: "/crm/loyalty", filter_param: "min_points=500" },
  ],
  segmentation: {
    retail: { label: "Retail Shoppers", count: 2100, pct: 85.7 },
    wholesale: { label: "Wholesale / Corporate", count: 350, pct: 14.3 },
    vip: { label: "VIP Members (1000+ Pts)", count: 120, pct: 4.9 },
    with_orders: { label: "Custom Order Clients", count: 180, pct: 7.3 },
  },
  top_customers: [
    { id: 1, name: "Rajesh Kumar", phone: "9876543210", loyalty_points: 3500, orders_count: 8, total_spent: 120000, current_balance: 0 },
    { id: 2, name: "Ananya Sharma", phone: "9123456780", loyalty_points: 2800, orders_count: 5, total_spent: 85000, current_balance: 5000 },
  ],
  recent_orders: [
    { id: 1, order_no: "ORD-2026-001", customer_name: "Rajesh Kumar", customer_phone: "9876543210", order_date: "2026-08-20", delivery_date: "2026-08-25", net_amount: 45000, advance_paid: 15000, balance_due: 30000, status: "confirmed" },
  ],
  upcoming_events: [
    { id: 1, name: "Rajesh Kumar", phone: "9876543210", event_type: "Birthday", event_date: "Aug 22", points: 3500 },
  ],
  charts: {
    timeline: [
      { date: "Aug 20", raw_date: "2026-08-20", new_customers: 5, orders_count: 3, order_amount: 60000 },
    ],
  },
  performance: { on_time_delivery_rate: "98.5%", customer_retention_rate: "91.2%" },
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

describe("Main Dashboard CRM Tab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes("/crm/dashboard")) {
        return Promise.resolve({ data: { success: true, data: mockCrmData } });
      }
      if (url.includes("/warehouse/dashboard")) {
        return Promise.resolve({ data: { success: true, data: {} } });
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

  it("switches to CRM Tab on Main Dashboard and loads CRM Command Center data", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Overview")).toBeDefined();
      expect(screen.getByText("CRM")).toBeDefined();
    });

    const crmTabBtn = screen.getByText("CRM");
    fireEvent.click(crmTabBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/crm/dashboard", expect.any(Object));
      expect(screen.getByText("Total Customers")).toBeDefined();
      expect(screen.getByText("2,450")).toBeDefined();
      expect(screen.getByText("Customer Segmentation")).toBeDefined();
      expect(screen.getByText("Retail Shoppers")).toBeDefined();
      expect(screen.getAllByText("Rajesh Kumar").length).toBeGreaterThan(0);
    });
  });
});

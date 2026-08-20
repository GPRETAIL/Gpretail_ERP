import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import authReducer from "../features/authSlice";
import SalesReports from "../pages/sales/SalesReports";
import { TransferActivityProvider } from "../context/TransferActivityContext";
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

const mockSalesData = [
  {
    id: 1,
    invoice_no: "SB/101",
    sale_date: "2026-08-20T10:00:00Z",
    amount: 1500,
    gross_value: 1400,
    total_discount: 100,
    customer_name: "John Doe",
    customer_mobile: "9876543210",
    status: "completed",
    items: [
      {
        id: 1,
        product_name: "Cotton Shirt",
        barcode: "SHIRT001",
        qty: 2,
        price: 750,
        tax_perc: 5,
        total: 1500,
        discount: 0,
      },
    ],
  },
];

const createTestStore = (role = "admin") =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 1, name: "Admin User", role, company_id: 1, company_name: "Main Store" },
        token: "fake-jwt-token",
        isAuthenticated: true,
      },
    },
  });

describe("SalesReports Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes("/pos-sales/summary-report")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              rows: [
                {
                  id: "loc_1",
                  s_no: 1,
                  location_name: "Main Store",
                  sale_qty: 10,
                  discount: 50,
                  addnl_discount: 0,
                  taxable_amount: 1000,
                  sale_tax: 50,
                  rounding: 0,
                  net_amount: 1050,
                },
              ],
            },
          },
        });
      }
      if (url.includes("/pos-sales")) {
        return Promise.resolve({ data: { success: true, data: mockSalesData } });
      }
      if (url.includes("/companies")) {
        return Promise.resolve({ data: { success: true, data: [{ id: 1, name: "Main Store" }] } });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
  });

  const renderComponent = (store = createTestStore()) =>
    render(
      <Provider store={store}>
        <MemoryRouter>
          <TransferActivityProvider>
            <SalesReports />
          </TransferActivityProvider>
        </MemoryRouter>
      </Provider>
    );

  it("renders report categories properly", () => {
    renderComponent();

    expect(screen.getByText(/Sales Reports \(13\)/i)).toBeDefined();
    expect(screen.getByText(/Settlement Reports \(8\)/i)).toBeDefined();
    expect(screen.getByText(/Tax Reports \(5\)/i)).toBeDefined();
    expect(screen.getByText(/Customer Reports \(13\)/i)).toBeDefined();
  });

  it("loads and displays data when selecting Sales Report", async () => {
    renderComponent();

    // Expand accordion
    const groupHeader = screen.getByText(/Sales Reports \(13\)/i);
    fireEvent.click(groupHeader);

    // Click Sales Report
    const salesReportBtn = await screen.findByText("Sales Report");
    fireEvent.click(salesReportBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/pos-sales", expect.any(Object));
    });
  });

  it("opens Summary Layouts and applies location summary", async () => {
    renderComponent();

    // Expand accordion
    const groupHeader = screen.getByText(/Sales Reports \(13\)/i);
    fireEvent.click(groupHeader);

    // Click Sales Report
    const salesReportBtn = await screen.findByText("Sales Report");
    fireEvent.click(salesReportBtn);

    const summaryBtn = await screen.findByRole("button", { name: /Summary layouts/i });
    fireEvent.click(summaryBtn);

    const applyBtn = await screen.findByRole("button", { name: /Apply breakdown/i });
    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith("/pos-sales/summary-report", expect.any(Object));
    });
  });
});

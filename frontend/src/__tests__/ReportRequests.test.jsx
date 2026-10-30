import { configureStore } from "@reduxjs/toolkit";
import { fireEvent, render, screen } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../api/axios";
import authReducer from "../features/authSlice";
import { TransferActivityProvider } from "../context/TransferActivityContext";
import SalesReports from "../pages/sales/SalesReports";
import WarehouseReports from "../pages/warehouse/WarehouseReports";

vi.mock("../api/axios", () => ({ default: { get: vi.fn() } }));
// jsdom has no measured table viewport. Row virtualization is covered separately.
vi.mock("../hooks/useRowVirtualization", () => ({
  default: ({ count }) => ({
    virtualItems: Array.from({ length: count }, (_, index) => ({ index, key: index, start: index * 40, size: 40, end: (index + 1) * 40 })),
    totalSize: count * 40, scrollToOffset: vi.fn(), scrollToIndex: vi.fn(),
  }),
}));

const cases = [
  { name: "Sales", Component: SalesReports, group: /Sales Reports \(13\)/i, report: "Sales Report", endpoint: "/pos-sales", row: { id: 701, bill_no: "QA-SALES-001" }, label: "QA-SALES-001" },
  { name: "Warehouse", Component: WarehouseReports, group: /Transport Reports/i, report: "Transport Report", endpoint: "/transport-entries", row: { id: 701, lr_no: "QA-LR-001" }, label: "QA-LR-001" },
];

async function openReport({ Component, group, report }) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user: { id: 1, role: "admin", company_id: 1, company_name: "Main Store" }, token: "test-only", isAuthenticated: true } },
  });
  render(<Provider store={store}><MemoryRouter><TransferActivityProvider><Component /></TransferActivityProvider></MemoryRouter></Provider>);
  fireEvent.click(screen.getByText(group));
  fireEvent.click(await screen.findByText(report, { exact: true }));
}

beforeEach(() => {
  vi.clearAllMocks();
  api.get.mockResolvedValue({ data: { data: [] } });
});

for (const reportCase of cases) {
  describe(`${reportCase.name} report requests`, () => {
    it.each([403, 500, "canceled"])("surfaces %s without issuing a second default-page request", async status => {
      const error = new Error("Report request failed");
      if (status === "canceled") error.code = "ERR_CANCELED";
      else error.response = { status, data: { message: `Report service returned ${status}` } };
      api.get.mockRejectedValue(error);
      await openReport(reportCase);
      const message = status === "canceled" ? `Failed to load ${reportCase.report.toLowerCase()}.` : `Report service returned ${status}`;
      expect(await screen.findByText(message)).toBeVisible();
      expect(api.get.mock.calls.filter(([url]) => url === reportCase.endpoint)).toHaveLength(1);
      expect(api.get).toHaveBeenCalledWith(reportCase.endpoint, { params: { all: "true" } });
    });

    it("renders a successful all-rows response from one request", async () => {
      api.get.mockResolvedValue({ data: { data: [reportCase.row] } });
      await openReport(reportCase);
      expect(await screen.findByText(reportCase.label)).toBeVisible();
      expect(api.get.mock.calls.filter(([url]) => url === reportCase.endpoint)).toHaveLength(1);
      expect(api.get).toHaveBeenCalledWith(reportCase.endpoint, { params: { all: "true" } });
    });
  });
}

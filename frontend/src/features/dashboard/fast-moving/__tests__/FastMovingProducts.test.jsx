import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";
import { fastMovingPath, fastMovingSummary } from "@/features/dashboard/fast-moving/utils/fastMoving";
import { isFullMobileNumber, shouldAutoLookupCustomer } from "@/features/sales/pos/utils/posSalesUtils";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get } }));
import FastMovingProducts from "@/features/dashboard/fast-moving/FastMovingProducts";
import { TransferActivityProvider } from "@/features/store/context/TransferActivityContext";

afterEach(cleanup);

const ROW = { product_id: 4, name: "TEST-JEANS", code: "JN-01", brand: "Levis", category: "Jeans", bought: 20, sold: 7, returned: 1, net_sold: 6, balance: 94,
  first_received: "2026-10-01", last_received: "2026-11-05", first_sold: "2026-10-11", last_sold: "2026-11-09", per_day: 0.15, sell_through: 6, days_of_stock: 627,
  avg_days_to_sell: 10, movement: "Slow" };

it("opens for the dashboard's dates and shows purchase, sale, balance and pace per product", async () => {
  mocks.get.mockResolvedValue({ data: { data: { days: 41, rows: [ROW] } } });
  render(<TransferActivityProvider><MemoryRouter initialEntries={["/dashboard/fast-moving?from=2026-10-01&to=2026-11-10"]}><FastMovingProducts /></MemoryRouter></TransferActivityProvider>);

  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/dashboard/fast-moving", { params: { from: "2026-10-01", to: "2026-11-10", limit: 500 } }));
  expect(await screen.findByText("TEST-JEANS")).toBeInTheDocument();
  expect(screen.getByText("JN-01 · Levis · Jeans")).toBeInTheDocument();
  expect(screen.getByText("7 sold, 1 returned")).toBeInTheDocument();
  expect(screen.getByText("05 Nov 2026")).toBeInTheDocument(); // Last purchased.
  expect(screen.getByText("10 d")).toBeInTheDocument(); // Days to sell.
  expect(screen.getByText("Slow")).toBeInTheDocument();
});

it("dashboard link and summary helpers", () => {
  expect(fastMovingPath("2026-11-01", "2026-11-17")).toBe("/dashboard/fast-moving?from=2026-11-01&to=2026-11-17");
  expect(fastMovingPath("", "")).toBe("/dashboard/fast-moving");
  expect(fastMovingSummary([ROW, { ...ROW, net_sold: 30, movement: "Fast" }])).toEqual({ products: 2, sold: 36, fast: 1, slow: 1 });
});

it("POS: a full mobile number is looked up as soon as it is typed", () => {
  expect(isFullMobileNumber("9000011111")).toBe(true);
  expect(isFullMobileNumber("919000011111")).toBe(true);
  expect(isFullMobileNumber("900001111")).toBe(false); // Still typing.
  expect(isFullMobileNumber("1234567890")).toBe(false); // Not a mobile number.
  expect(shouldAutoLookupCustomer("044221")).toBe(true);
  expect(shouldAutoLookupCustomer("123")).toBe(false);
});

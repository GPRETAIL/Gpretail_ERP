import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import PayslipsScreen from "@/mobile/screens/PayslipsScreen";
import api from "@/shared/api/apiClient";

vi.mock("@/shared/api/apiClient", () => ({ default: { get: vi.fn() } }));
vi.mock("@/features/sales/pos/utils/posSalesUtils", () => ({ browserPrintHtml: vi.fn() }));

beforeEach(() => vi.clearAllMocks());

it("lists payslips by month and opens one", async () => {
  api.get.mockImplementation(async (url) => (url === "/my-payslips"
    ? { data: { data: { employee: { id: 1 }, payslips: [{ id: 5, month: "2026-10", net_pay: 15000, status: "PAID", held: false }] } } }
    : { data: { data: { id: 5, month: "2026-10", month_label: "October 2026", days_in_month: 31, payable_days: 31, net_pay: 15000, gross_earned: 15500, total_deductions: 500,
      earnings: [{ code: "BASIC", name: "Basic", amount: 15500 }], deductions: [{ code: "ESI", name: "ESI", amount: 500 }], snapshot: { name: "Asha" } } } }));
  render(<PayslipsScreen />);
  fireEvent.click(await screen.findByText("October 2026"));
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/my-payslips/5"));
  expect(await screen.findByText("Net pay · 31 of 31 days paid")).toBeInTheDocument();
  expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", expect.stringContaining("wa.me"));
});

it("explains a login that is not an employee", async () => {
  api.get.mockResolvedValue({ data: { data: { employee: null, payslips: [] } } });
  render(<PayslipsScreen />);
  expect(await screen.findByText(/not linked to an employee/)).toBeInTheDocument();
});

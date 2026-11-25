import { cleanup, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, expect, it, vi } from "vitest";

vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { id: 1, role: "admin", store_id: 2 } } }) }));
vi.mock("@/features/auth/utils/accessControl", () => ({
  getVisibleNavItems: () => [
    { name: "Sales", path: "/sales", subItems: [{ name: "POS Sale", path: "/sales/pos-sale" }] },
    { name: "Finance", path: "/finance", subItems: [
      { name: "Dashboard", path: "/finance/dashboard" },
      { name: "Voucher Entry", path: "/finance/voucher-entry" },
      { name: "Trial Balance", path: "/finance/trial-balance" },
    ] },
  ],
}));
import ModulePage from "@/shared/components/ModulePage";

afterEach(cleanup);

it("Finance is a module page like the others: the Finance button, then its pages, and no money cards", () => {
  render(<MemoryRouter initialEntries={["/finance"]}><Routes><Route path="/:moduleName" element={<ModulePage />} /></Routes></MemoryRouter>);

  expect(screen.getByRole("link", { name: "Finance" })).toHaveAttribute("href", "/modules");
  expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute("href", "/finance/dashboard");
  expect(screen.getByRole("link", { name: "Voucher Entry" })).toHaveAttribute("href", "/finance/voucher-entry");
  expect(screen.getByRole("link", { name: "Trial Balance" })).toHaveAttribute("href", "/finance/trial-balance");
  expect(screen.queryByRole("link", { name: "POS Sale" })).not.toBeInTheDocument();
  expect(screen.queryByText(/Cash in hand|Money today|Customers owe/)).not.toBeInTheDocument();
});

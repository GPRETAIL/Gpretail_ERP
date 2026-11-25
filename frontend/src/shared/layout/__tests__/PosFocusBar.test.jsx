import { cleanup, fireEvent, render, renderHook, screen, act } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

vi.mock("react-redux", () => ({ useSelector: (selector) => selector({ auth: { user: { name: "Kavya", store_id: 1, company_name: "Coffee 1", counter_name: "Till 2" } } }) }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), info: vi.fn() } }));
vi.mock("@/shared/hooks/useStoreNameMap", () => ({ default: () => ({}), resolveStoreName: () => "Coffee 1" }));
import PosFocusBar from "@/shared/layout/PosFocusBar";
import { POS_FOCUS_PATHS, usePosFocusPreference } from "@/shared/layout/posFocus";

beforeEach(() => localStorage.clear());
afterEach(cleanup);

it("covers the three billing screens, and no other page", () => {
  expect(POS_FOCUS_PATHS).toEqual(["/sales/pos-sales", "/sales/touch-sales", "/sales/pos-old"]);
});

it("shows where the cashier is, and leaves for the dashboard", () => {
  render(
    <MemoryRouter initialEntries={["/sales/pos-sales"]}>
      <Routes>
        <Route path="/sales/pos-sales" element={<PosFocusBar pathname="/sales/pos-sales" onShowMenu={vi.fn()} />} />
        <Route path="/dashboard" element={<div>Dashboard page</div>} />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByRole("heading", { name: "POS Sale" })).toBeInTheDocument();
  expect(screen.getByText(/Coffee 1\s+·\s+Counter Till 2\s+·\s+Kavya/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Exit" }));
  expect(screen.getByText("Dashboard page")).toBeInTheDocument();
});

it("Show menu hands control back to the layout", () => {
  const onShowMenu = vi.fn();
  render(<MemoryRouter><PosFocusBar pathname="/sales/pos-old" onShowMenu={onShowMenu} /></MemoryRouter>);
  expect(screen.getByRole("heading", { name: "POS Old" })).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Show menu" }));
  expect(onShowMenu).toHaveBeenCalled();
});

it("remembers the choice to keep the menus, and is on until then", () => {
  const first = renderHook(() => usePosFocusPreference());
  expect(first.result.current[0]).toBe(true);
  act(() => first.result.current[1](false));
  expect(first.result.current[0]).toBe(false);
  expect(renderHook(() => usePosFocusPreference()).result.current[0]).toBe(false);
  act(() => first.result.current[1](true));
  expect(renderHook(() => usePosFocusPreference()).result.current[0]).toBe(true);
});

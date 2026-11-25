import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { normalizeCashOpeningCheck } from "@/features/sales/customisation/utils/salesReceiptCustomisation";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get } }));
import CashNotOpenedBanner from "@/features/sales/pos/components/CashNotOpenedBanner";
import useBillingGate from "@/features/sales/pos/hooks/useBillingGate";

function Screen() {
  const gate = useBillingGate();
  return <><CashNotOpenedBanner warning={gate.warning} /><span>{gate.block ? "blocked" : "not blocked"}</span></>;
}

const renderScreen = () => render(
  <MemoryRouter initialEntries={["/sales/pos-sales"]}>
    <Routes><Route path="/sales/pos-sales" element={<Screen />} /><Route path="/sales/cash-opening" element={<h1>Cash Opening page</h1>} /></Routes>
  </MemoryRouter>,
);

beforeEach(() => mocks.get.mockReset());
afterEach(cleanup);

it("warn: a notice with Open cash, billing is not blocked, and it can be hidden", async () => {
  mocks.get.mockResolvedValue({ data: { data: { cash_check: "warn", block: null, warning: { code: "CASH_NOT_OPENED", message: "Cash is not opened for Till One." } } } });
  renderScreen();

  expect(await screen.findByText("Cash is not opened for Till One.")).toBeInTheDocument();
  expect(screen.getByText("not blocked")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByText("Cash is not opened for Till One.")).toBeNull();
});

it("warn: Open cash goes to Cash Opening", async () => {
  mocks.get.mockResolvedValue({ data: { data: { cash_check: "warn", block: null, warning: { code: "CASH_NOT_OPENED", message: "Cash is not opened." } } } });
  renderScreen();
  fireEvent.click(await screen.findByRole("button", { name: "Open cash" }));
  expect(await screen.findByText("Cash Opening page")).toBeInTheDocument();
});

it("block: the gate reports a block and shows no warning; opened cash shows nothing", async () => {
  mocks.get.mockResolvedValue({ data: { data: { cash_check: "block", block: { code: "CASH_NOT_OPENED", message: "Open the cash." }, warning: null } } });
  renderScreen();
  expect(await screen.findByText("blocked")).toBeInTheDocument();
  expect(screen.queryByRole("status", { name: "Cash not opened" })).toBeNull();

  cleanup();
  mocks.get.mockResolvedValue({ data: { data: { cash_check: "warn", block: null, warning: null } } });
  renderScreen();
  await waitFor(() => expect(mocks.get).toHaveBeenCalledTimes(2));
  expect(screen.queryByRole("status", { name: "Cash not opened" })).toBeNull();
});

it("the setting: warn by default, the old yes/no setting still counts", () => {
  expect(normalizeCashOpeningCheck({})).toBe("warn");
  expect(normalizeCashOpeningCheck({ cashOpeningCheck: "block" })).toBe("block");
  expect(normalizeCashOpeningCheck({ cashOpeningCheck: "off" })).toBe("off");
  expect(normalizeCashOpeningCheck({ cashOpeningCheck: "bogus", requireCashOpening: false })).toBe("off");
  expect(normalizeCashOpeningCheck({ requireCashOpening: true })).toBe("warn");
});

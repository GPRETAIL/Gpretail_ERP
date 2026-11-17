import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), del: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, put: mocks.put, post: mocks.post, delete: mocks.del } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
import LoyaltyTiers from "@/features/crm/loyalty/components/LoyaltyTiers";
import LoyaltyBonusRules from "@/features/crm/loyalty/components/LoyaltyBonusRules";
import { describeBonusRule, signedPoints } from "@/features/crm/loyalty/utils/loyaltyTypes";

beforeEach(() => Object.values(mocks).forEach((m) => m.mockReset()));
afterEach(cleanup);

it("describes rules and signs ledger points", () => {
  expect(describeBonusRule({ type: "birthday", multiplier: "2.00" })).toBe("Customer's birthday month: points ×2");
  expect(describeBonusRule({ type: "min_bill", points: 20, min_bill: "4000" })).toBe("Bill above an amount: +20 points (bills from ₹4,000)");
  expect(signedPoints({ type: "EARN", points: 10 })).toBe("+10");
  expect(signedPoints({ type: "EXPIRE", points: 40 })).toBe("−40");
});

it("Tiers: adds a tier and saves the whole list", async () => {
  mocks.get.mockResolvedValue({ data: { data: [{ name: "Silver", min_spend: "0.00", multiplier: "1.00" }] } });
  mocks.put.mockResolvedValue({ data: { data: [] } });
  render(<LoyaltyTiers />);
  expect(await screen.findByDisplayValue("Silver")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Add tier" }));
  const names = screen.getAllByLabelText("Tier name");
  fireEvent.change(names[1], { target: { value: "Gold" } });
  fireEvent.change(screen.getAllByLabelText("Spend from (₹, 12 months)")[1], { target: { value: "25000" } });
  fireEvent.change(screen.getAllByLabelText("Points ×")[1], { target: { value: "1.25" } });
  fireEvent.click(screen.getByRole("button", { name: "Save tiers" }));
  await waitFor(() => expect(mocks.put).toHaveBeenCalledWith("/loyalty/tiers", { tiers: [
    { name: "Silver", min_spend: 0, multiplier: 1 }, { name: "Gold", min_spend: 25000, multiplier: 1.25 }] }));
});

it("Bonuses: adds a fixed-points rule for big bills", async () => {
  mocks.get.mockResolvedValue({ data: { data: [] } });
  mocks.post.mockResolvedValue({ data: { data: { id: 1 } } });
  render(<LoyaltyBonusRules />);
  fireEvent.click(await screen.findByRole("button", { name: "Add bonus" }));
  const dialog = await screen.findByRole("dialog");
  fireEvent.change(within(dialog).getByLabelText(/Name/), { target: { value: "Big bill" } });
  fireEvent.mouseDown(within(dialog).getByLabelText("When"));
  fireEvent.click(await screen.findByRole("option", { name: "Bill above an amount" }));
  fireEvent.mouseDown(within(dialog).getByLabelText("Reward"));
  fireEvent.click(await screen.findByRole("option", { name: "Fixed extra points" }));
  fireEvent.change(within(dialog).getByLabelText("Extra points"), { target: { value: "20" } });
  fireEvent.change(within(dialog).getByLabelText(/Bill of at least/), { target: { value: "4000" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/loyalty/bonus-rules", {
    name: "Big bill", type: "min_bill", is_active: true, multiplier: null, points: 20, min_bill: 4000, starts_on: null, ends_on: null }));
});

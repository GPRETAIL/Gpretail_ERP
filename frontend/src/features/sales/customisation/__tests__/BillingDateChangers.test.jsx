import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get } }));
import BillingDateChangers from "@/features/sales/customisation/components/BillingDateChangers";

afterEach(cleanup);

it("tenant admin: ticks roles that may change the billing date", async () => {
  mocks.get.mockResolvedValue({ data: { data: { users: [{ id: 5, name: "Anu", role: "manager" }] } } });
  const onChange = vi.fn();
  render(<BillingDateChangers value={{ roles: [], users: [5] }} editable onChange={onChange} />);
  await waitFor(() => expect(mocks.get).toHaveBeenCalledWith("/user-access"));
  expect(await screen.findByText("Anu (manager)")).toBeInTheDocument(); // The chosen user shows as a chip.
  fireEvent.click(screen.getByLabelText("Managers"));
  expect(onChange).toHaveBeenCalledWith({ roles: ["manager"], users: [5] });
});

it("anyone else sees who may change it, read-only", () => {
  mocks.get.mockReset();
  render(<BillingDateChangers value={{ roles: ["manager"], users: [5, 6] }} editable={false} onChange={vi.fn()} />);
  expect(screen.getByLabelText("Managers")).toBeChecked();
  expect(screen.getByLabelText("Managers")).toBeDisabled();
  expect(screen.getByText("Also 2 named users.")).toBeInTheDocument();
  expect(screen.getByText(/only the tenant admin can change who else may/)).toBeInTheDocument();
  expect(mocks.get).not.toHaveBeenCalled();
});

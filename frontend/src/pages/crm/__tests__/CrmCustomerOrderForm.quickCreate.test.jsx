import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

/**
 * Regression coverage for the S2 fix in 62846bd: the "quick create customer" dialog on the Customer
 * Order form read `row.mobile_no` / `row.city_id` from the `/customer-orders/customer-quick-create`
 * response, but the API actually returns `mobile` / `cityId` — so a freshly quick-created customer's
 * mobile number was silently dropped and its city was never applied to the order form.
 * See CrmCustomerOrderForm.jsx createCustomerFromDialog -> applySelectedCustomer.
 */

const cityOptions = [{ id: 77, name: "Chennai" }];

const mockGet = vi.fn((url) => {
  if (url === "/configurations/city") {
    return Promise.resolve({ data: { data: cityOptions } });
  }
  if (url === "/customer-orders/next-order-no") {
    return Promise.resolve({ data: { data: { orderNo: 42 } } });
  }
  return Promise.resolve({ data: { data: [] } });
});

const mockPost = vi.fn((url) => {
  if (url === "/customer-orders/customer-quick-create") {
    // The real API's response shape: keys are `mobile` and `cityId` (NOT `mobile_no` / `city_id`).
    return Promise.resolve({
      data: {
        data: {
          id: 501,
          name: "Asha Rao",
          mobile: "9876543210",
          address: "12 MG Road",
          cityId: 77,
        },
      },
    });
  }
  return Promise.resolve({ data: { data: {} } });
});

vi.mock("../../../api/axios", () => ({
  default: {
    get: (...args) => mockGet(...args),
    post: (...args) => mockPost(...args),
    put: vi.fn(() => Promise.resolve({ data: { data: {} } })),
    delete: vi.fn(() => Promise.resolve({ data: {} })),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    warning: vi.fn(),
  },
}));

const mockPrintHtml = vi.fn();
vi.mock("../../../context/PrintContext", () => ({
  usePrintContext: () => ({ printHtml: mockPrintHtml }),
}));

import { toast } from "react-toastify";
import CrmCustomerOrderForm from "../CrmCustomerOrderForm";

const renderForm = () =>
  render(
    <MemoryRouter>
      <CrmCustomerOrderForm />
    </MemoryRouter>
  );

describe("CrmCustomerOrderForm quick-create customer", () => {
  it("maps row.mobile and row.cityId from the quick-create response onto the form", async () => {
    renderForm();

    // Wait for master data to finish loading.
    const mobileInput = await screen.findByPlaceholderText("Enter mobile no");

    fireEvent.click(screen.getByTitle("Search customer"));
    fireEvent.click(await screen.findByRole("button", { name: "Create" }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith(
        "/customer-orders/customer-quick-create",
        expect.any(Object)
      )
    );

    // Regression: pre-fix this read row.mobile_no (undefined) and stayed blank.
    await waitFor(() => expect(mobileInput).toHaveValue("9876543210"));

    // Regression: pre-fix this read row.city_id (undefined) and the City select stayed empty.
    expect(await screen.findByText("Chennai")).toBeInTheDocument();

    expect(toast.success).toHaveBeenCalledWith("Customer created and selected");

    // The dialog closes on a successful selection.
    expect(screen.queryByRole("button", { name: "Create" })).not.toBeInTheDocument();
  }, 30000); // heavy component + slow CI jsdom render; matches the sibling suites' effective window
});

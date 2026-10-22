import { configureStore } from "@reduxjs/toolkit";
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { Provider } from "react-redux";
import authReducer from "../../../features/authSlice";
import Customisation from "../Customisation";
import api from "../../../api/axios";

vi.mock("../../../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 1, name: "Admin", company_id: "1", company_name: "Test Store" },
        token: "fake-jwt",
        isAuthenticated: true,
      },
    },
  });

describe("Sales Customisation", () => {
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    store = createTestStore();

    api.get.mockResolvedValue({
      data: {
        success: true,
        data: {},
      },
    });

    api.put.mockResolvedValue({
      data: {
        success: true,
        message: "POS customization settings updated",
      },
    });
  });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <Customisation />
      </Provider>
    );

  it("keeps sales behaviour and links to the single receipt editor", async () => {
    renderComponent();
    await screen.findByText("Sales Customisation");
    expect(screen.getByText("Sales number reset")).toBeInTheDocument();
    expect(screen.getByText("POS checkout")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Edit Receipt Format" })).toHaveAttribute("href", "/sales/receipt-formats?section=thermal");
    expect(screen.queryByText("Receipt Size")).not.toBeInTheDocument();
    expect(screen.queryByText("Receipt Barcode")).not.toBeInTheDocument();
    expect(screen.queryByText(/Printing Mode/)).not.toBeInTheDocument();
  });

  it("sends only sales fields and preserves saved receipt settings", async () => {
    api.get.mockResolvedValue({ data: { data: { receiptWidthInches: "3.5", thankYouMessage: "Keep this" } } });
    renderComponent();
    await screen.findByRole("link", { name: "Edit Receipt Format" });
    fireEvent.click(screen.getByText("Save"));
    await waitFor(() => expect(api.put).toHaveBeenCalled());
    const payload = api.put.mock.calls[0][1];
    expect(payload.settingsSection).toBe("sales");
    expect(payload.companyId).toBe("1");
    expect(payload).not.toHaveProperty("receiptWidthInches");
    expect(payload).not.toHaveProperty("printMode");
  });
});
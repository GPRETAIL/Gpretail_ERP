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

  it("renders Sales Customisation controls and Printing Mode options", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Sales Customisation")).toBeDefined();
      expect(screen.getByText(/Printing Mode/i)).toBeDefined();
      expect(screen.getByText("Direct / Silent Printing")).toBeDefined();
      expect(screen.getByText("Browser Default Print (Preview)")).toBeDefined();
    });
  });

  it("switches printing mode from Direct to Browser default print preview", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Browser Default Print (Preview)")).toBeDefined();
    });

    const browserRadio = screen.getByLabelText(/Browser Default Print/i);
    expect(browserRadio).toBeDefined();

    fireEvent.click(browserRadio);
    expect(browserRadio.checked).toBe(true);
  });

  it("saves customization settings including printMode to backend", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Save")).toBeDefined();
    });

    const browserRadio = screen.getByLabelText(/Browser Default Print/i);
    fireEvent.click(browserRadio);

    const saveBtn = screen.getByText("Save");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/sales-customization",
        expect.objectContaining({
          companyId: "1",
          printMode: "browser",
        })
      );
    });
  });
});

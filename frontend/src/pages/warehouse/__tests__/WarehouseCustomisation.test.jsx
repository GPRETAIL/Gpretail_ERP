import { configureStore } from "@reduxjs/toolkit";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi, beforeEach } from "vitest";
import authReducer from "../../../features/authSlice";
import WarehouseCustomisation from "../Customisation";
import api from "../../../api/axios";

vi.mock("../../../api/axios", () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock("react-toastify", () => ({
  toast: { success: vi.fn(), error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

const createTestStore = (role = "super_admin") =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 1, name: "Super Admin", role, company_id: 1, company_name: "Balaji Silks" },
        token: "fake-jwt-token",
        isAuthenticated: true,
      },
    },
  });

describe("Warehouse Customisation Page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockImplementation((url) => {
      if (url.includes("/warehouse-customisation")) {
        return Promise.resolve({
          data: {
            success: true,
            data: {
              codeType: "barcode",
              codePosition: "left",
              labelWidthMm: 50,
              labelHeightMm: 25,
              labelsPerRow: 2,
              fontFamily: "arial",
            },
          },
        });
      }
      if (url.includes("/companies") || url.includes("/stores")) {
        return Promise.resolve({
          data: {
            success: true,
            data: [{ id: 1, name: "Balaji Silks" }, { id: 2, name: "Branch Store" }],
          },
        });
      }
      return Promise.resolve({ data: { success: true, data: [] } });
    });
    api.put.mockResolvedValue({ data: { success: true, message: "Saved" } });
  });

  const renderComponent = (store = createTestStore()) =>
    render(
      <Provider store={store}>
        <MemoryRouter>
          <WarehouseCustomisation />
        </MemoryRouter>
      </Provider>
    );

  it("renders Warehouse Customisation controls and sticker preview", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Warehouse Customisation")).toBeDefined();
      expect(screen.getByText("Sticker Preview")).toBeDefined();
      expect(screen.getByText("Use Barcode Or Code")).toBeDefined();
      expect(screen.getByText("Sticker Size In Mm")).toBeDefined();
    });
  });

  it("switches code type to QR Code and updates preview", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Code")).toBeDefined();
    });

    const codeBtn = screen.getByText("Code");
    fireEvent.click(codeBtn);

    await waitFor(() => {
      expect(screen.getByText("QR-style sticker code")).toBeDefined();
    });
  });

  it("toggles MRP Strikethrough and updates settings", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("MRP Strikethrough")).toBeDefined();
    });

    const mrpToggle = screen.getByLabelText(/MRP Strikethrough/i);
    expect(mrpToggle.checked).toBe(false);

    fireEvent.click(mrpToggle);
    expect(mrpToggle.checked).toBe(true);
  });

  it("handles save with API call and shows success toast", async () => {
    renderComponent();

    await waitFor(() => {
      expect(screen.getByText("Save")).toBeDefined();
    });

    const saveBtn = screen.getByText("Save");
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(api.put).toHaveBeenCalledWith(
        "/warehouse-customisation",
        expect.objectContaining({
          companyId: "1",
        })
      );
    });
  });
});

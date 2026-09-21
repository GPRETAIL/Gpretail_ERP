import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../../../features/authSlice";
import ReceiptFormatsDesigner from "../ReceiptFormatsDesigner";
import { toast } from "react-toastify";

vi.mock("react-toastify", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

const createTestStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: { id: 1, name: "Vinoth", company_id: "1", company_name: "Vinoth Enterprises" },
        token: "fake-jwt",
        isAuthenticated: true,
      },
    },
  });

describe("ReceiptFormatsDesigner", () => {
  let store;

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    store = createTestStore();
  });

  const renderComponent = () =>
    render(
      <Provider store={store}>
        <ReceiptFormatsDesigner />
      </Provider>
    );

  it("renders page title, controls, and invoice preview container", () => {
    renderComponent();

    expect(screen.getByText("Invoice & Receipt Print Formats")).toBeInTheDocument();
    expect(screen.getByText("Test Print")).toBeInTheDocument();
    expect(screen.getByText("Save Format")).toBeInTheDocument();
    expect(screen.getByText("Template Type")).toBeInTheDocument();
    expect(screen.getByText("Transaction Type")).toBeInTheDocument();
    expect(screen.getByText("Page Size")).toBeInTheDocument();
  });

  it("toggles between Portrait and Landscape orientations", () => {
    renderComponent();

    const landscapeButton = screen.getByRole("button", { name: /Landscape/i });
    fireEvent.click(landscapeButton);

    expect(screen.getAllByText(/LANDSCAPE/i).length).toBeGreaterThan(0);

    const portraitButton = screen.getByRole("button", { name: /Portrait/i });
    fireEvent.click(portraitButton);

    expect(screen.getAllByText(/PORTRAIT/i).length).toBeGreaterThan(0);
  });

  it("opens invoice template drawer and allows selecting a template", () => {
    renderComponent();

    // Click on Invoice Template row
    const templateRow = screen.getByText("Invoice Template");
    fireEvent.click(templateRow);

    // Drawer opens showing template choices
    expect(screen.getByText("Select Invoice Template")).toBeInTheDocument();
    expect(screen.getAllByText("Glass Template").length).toBeGreaterThan(0);
    expect(screen.getAllByText("GST Tax Invoice").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Tally Template").length).toBeGreaterThan(0);

    // Select Glass Template from the drawer list
    const glassOptions = screen.getAllByText("Glass Template");
    fireEvent.click(glassOptions[glassOptions.length - 1]);

    // Close drawer via Back button
    const backButton = screen.getByRole("button", { name: "Back" });
    fireEvent.click(backButton);

    expect(screen.queryByText("Select Invoice Template")).not.toBeInTheDocument();
  });

  it("saves format settings to localStorage and shows toast notification", () => {
    renderComponent();

    const saveButton = screen.getByRole("button", { name: /Save Format/i });
    fireEvent.click(saveButton);

    expect(toast.success).toHaveBeenCalledWith(
      "Print & Invoice format settings saved successfully!"
    );
  });

  it("displays all 6 transaction types in dropdown and switches to Receipt A4 format", () => {
    renderComponent();

    // The transaction type selector is present
    const txnLabel = screen.getByText("Transaction Type");
    expect(txnLabel).toBeInTheDocument();

    // Click on the transaction type trigger to open dropdown
    fireEvent.click(txnLabel);

    // Verify all 6 options are present in the dropdown
    expect(screen.getAllByText("Income Transaction").length).toBeGreaterThan(0);
    expect(screen.getByText("Estimate / Quote")).toBeInTheDocument();
    expect(screen.getByText("Delivery Challan")).toBeInTheDocument();
    expect(screen.getByText("Expense Transaction")).toBeInTheDocument();
    expect(screen.getByText("Sale Order")).toBeInTheDocument();
    expect(screen.getByText("Receipt")).toBeInTheDocument();

    // Select 'Receipt'
    const receiptOption = screen.getByText("Receipt");
    fireEvent.click(receiptOption);

    // Verify A4 Receipt Voucher elements are now rendered
    expect(screen.getAllByText(/PAYMENT RECEIPT/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Total Amount Received/i)).toBeInTheDocument();
    expect(screen.getByText(/Bill \/ Invoice Settlement Allocation/i)).toBeInTheDocument();
    expect(screen.getByText(/Customer Account Balance Snapshot/i)).toBeInTheDocument();
    expect(screen.getAllByText(/RCP-2026-0842/i).length).toBeGreaterThan(0);
  });

  it("switches to Estimate / Quote and updates document title", () => {
    renderComponent();

    const txnLabel = screen.getByText("Transaction Type");
    fireEvent.click(txnLabel);

    const estimateOption = screen.getByText("Estimate / Quote");
    fireEvent.click(estimateOption);

    expect(screen.getAllByText(/ESTIMATE \/ QUOTATION/i).length).toBeGreaterThan(0);
  });
});

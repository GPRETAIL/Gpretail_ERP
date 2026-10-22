import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import authReducer from "../../../features/authSlice";
import ReceiptFormatsDesigner from "../ReceiptFormatsDesigner";
import api from "../../../api/axios";
import { loadSalesReceiptCustomization } from "../../../utils/salesReceiptCustomization";

vi.mock("../../../api/axios", () => ({ default: { get: vi.fn(), put: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

const existing = { receiptWidthInches: "2.5", receiptFontFamily: "courier", thankYouMessage: "Existing shop message", billNumberReset: "monthly", paymentQrMode: "none", showBarcodeOnBill: false };
beforeEach(() => {
  cleanup(); vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear();
  window.history.replaceState({}, "", "/sales/receipt-formats?section=thermal");
  api.get.mockImplementation(url => Promise.resolve({ data: { data: url === "/sales-customization" ? existing : { name: "Coffee Branch" } } }));
  api.put.mockImplementation((_url, payload) => Promise.resolve({ data: { data: { ...existing, ...payload } } }));
});

const renderEditor = () => render(<Provider store={configureStore({ reducer: { auth: authReducer }, preloadedState: { auth: { user: { id: 1, company_id: "1" } } } })}><ReceiptFormatsDesigner /></Provider>);

it("loads existing POS settings in Print Formats and saves to the same store configuration", async () => {
  sessionStorage.setItem("activeStoreId", "7");
  renderEditor();
  await waitFor(() => expect(screen.getByPlaceholderText("Enter the closing message shown at the end of the receipt").value).toBe("Existing shop message"));
  expect(api.get).toHaveBeenCalledWith("/sales-customization", { params: { company_id: "7" } });
  expect(screen.queryByText("Sales number reset")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: /3\.5/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  await waitFor(() => expect(api.put).toHaveBeenCalled());
  const payload = api.put.mock.calls[0][1];
  expect(payload).toMatchObject({ companyId: "7", settingsSection: "receipt", receiptWidthInches: "3.5", thankYouMessage: "Existing shop message" });
  expect(payload).not.toHaveProperty("billNumberReset");
  await waitFor(() => expect(loadSalesReceiptCustomization("7").receiptWidthInches).toBe("3.5"));
});

it("preserves old document-designer thermal choices without replacing the actual POS width", async () => {
  window.history.replaceState({}, "", "/sales/receipt-formats");
  const legacy = { pdfFormat: "thermal", pageSize: "4inch", template: "standard_thermal" };
  localStorage.setItem("vynerix_print_format_settings_v1", JSON.stringify(legacy));
  renderEditor();
  await screen.findByText("Receipt Size");
  await waitFor(() => expect(loadSalesReceiptCustomization("1").receiptWidthInches).toBe("2.5"));
  expect(JSON.parse(localStorage.getItem("vynerix_print_format_settings_v1"))).toEqual(legacy);
  expect(api.put).not.toHaveBeenCalled();
});

it("keeps an unsaved receipt draft when switching editors is cancelled", async () => {
  renderEditor();
  await waitFor(() => expect(screen.getByPlaceholderText("Enter the closing message shown at the end of the receipt").value).toBe("Existing shop message"));
  fireEvent.click(screen.getByRole("button", { name: /3\.5/ }));
  const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
  fireEvent.click(screen.getByRole("button", { name: "Document Invoices", exact: true }));
  expect(confirm).toHaveBeenCalledWith("Discard unsaved print format changes?");
  expect(screen.getByText("Receipt Size")).toBeInTheDocument();
  expect(api.put).not.toHaveBeenCalled();
  confirm.mockRestore();
});

it("shows UPI setup, updates the payment QR at its selected size, and saves the store's choice", async () => {
  renderEditor();
  await waitFor(() => expect(screen.getByPlaceholderText("Enter the closing message shown at the end of the receipt").value).toBe("Existing shop message"));
  fireEvent.click(screen.getByRole("radio", { name: "UPI ID (auto-fills the bill amount)", exact: true }));
  const upi = screen.getByLabelText("UPI ID", { exact: true });
  expect(upi.value).toBe("");
  expect(screen.queryByRole("region", { name: "Payment QR preview" })).not.toBeInTheDocument();
  fireEvent.change(upi, { target: { value: "test-store@example" } });
  const qr = await screen.findByRole("region", { name: "Payment QR preview" });
  expect(qr.querySelector("img").getAttribute("src")).toMatch(/^data:image\/png;base64,/);
  expect(qr.querySelector("img").style.width).toBe("120px");
  fireEvent.click(screen.getByRole("button", { name: "Increase QR size" }));
  await waitFor(() => expect(qr.querySelector("img").style.width).toBe("130px"));
  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  await waitFor(() => expect(api.put).toHaveBeenCalledWith("/sales-customization", expect.objectContaining({ paymentQrMode: "upi", paymentUpiId: "test-store@example", paymentQrSize: 130 })));
});

it("opens an expanded, scrollable receipt preview without changing saved settings", async () => {
  renderEditor();
  await waitFor(() => expect(screen.getByPlaceholderText("Enter the closing message shown at the end of the receipt").value).toBe("Existing shop message"));
  fireEvent.click(screen.getByRole("button", { name: "Preview Receipt", exact: true }));
  const dialog = screen.getByRole("dialog");
  expect(within(dialog).getByRole("region", { name: "Receipt preview contents" })).toBeInTheDocument();
  expect(within(dialog).getByText("Existing shop message")).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Close receipt preview" }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  expect(api.put).not.toHaveBeenCalled();
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import api from "../../../api/axios";
import TaxForm from "../TaxForm";

vi.mock("../../../api/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn() } }));
vi.mock("../../../components/RangedTaxTable", () => ({ default: () => null }));

beforeEach(() => {
  api.get.mockReset();
  api.get.mockResolvedValue({ data: { data: {
    id: 2, tax_code: "GST-VIEW", name: "Existing tax", tax_type: "GST", tax_percentage: 18,
    is_sales_tax: false, is_purchase_tax: true, is_disabled: false,
    extra_fields: { cgst: 9, sgst: 9 }, company_id: 7,
  } } });
});

describe("Tax View", () => {
  it("fetches and populates the existing tax in read-only mode", async () => {
    render(<MemoryRouter initialEntries={["/masters/tax/GST-VIEW?company_id=7"]}>
      <Routes><Route path="/masters/tax/:taxCode" element={<TaxForm />} /></Routes>
    </MemoryRouter>);
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/taxes/GST-VIEW", { params: { company_id: "7" } }));
    expect(await screen.findByDisplayValue("Existing tax")).toBeDisabled();
    expect(screen.getByDisplayValue("GST-VIEW")).toBeDisabled();
  });

  it("shows loading instead of an empty form, then allows retry after a failed request", async () => {
    let rejectLoad;
    api.get.mockReturnValueOnce(new Promise((resolve, reject) => { rejectLoad = reject; }));
    render(<MemoryRouter initialEntries={["/masters/tax/GST-VIEW?company_id=7"]}>
      <Routes><Route path="/masters/tax/:taxCode" element={<TaxForm />} /></Routes>
    </MemoryRouter>);
    expect(screen.getByRole("status")).toHaveTextContent("Loading tax record");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
    rejectLoad({ response: { data: { message: "Tax lookup failed" } } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Tax lookup failed");
    expect(screen.queryByRole("textbox")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(await screen.findByDisplayValue("Existing tax")).toBeDisabled();
    expect(api.get).toHaveBeenCalledTimes(2);
  });

});

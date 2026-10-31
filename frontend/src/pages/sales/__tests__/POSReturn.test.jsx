import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, expect, it, vi } from "vitest";
import POSReturn from "../POSReturn";
import api from "../../../api/axios";
const mocks = vi.hoisted(() => ({ user: { id: 1, name: "Cashier", company_id: 1, store_id: 1, counter_id: 1, counter_name: "Till" } }));
vi.mock("react-redux", () => ({ useDispatch: () => vi.fn(), useSelector: selector => selector({ auth: { user: mocks.user } }) }));
vi.mock("../../../context/PrintContext", () => ({ usePrintContext: () => ({ connected: true, printHtml: vi.fn() }) }));
vi.mock("../../../api/axios", () => ({ default: { get: vi.fn(), post: vi.fn() } }));
vi.mock("../../../hooks/useStoreDisplayName", () => ({ default: () => "Coffee" }));
vi.mock("../../../components/UploadImportButton", () => ({ default: () => null }));
vi.mock("react-toastify", () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }));
beforeEach(() => {
  vi.clearAllMocks(); localStorage.clear(); sessionStorage.clear(); sessionStorage.setItem("activeStoreId", "1");
  api.get.mockImplementation(async url => ({ data: { data:
    url === "/pos-returns/next-return-no" ? { returnNo: "RR/1" } :
    url === "/pos-returns/source-bill" ? { id: 7, billNo: "261031-0001", items: [{ productId: 3, productName: "Coffee beans", barcode: "COFFEE", qty: 1, maxQty: 1, price: 900 }] } : []
  } }));
});

it("opens with no bill selected and loads a bill by the number printed on the receipt", async () => {
  render(<MemoryRouter><POSReturn /></MemoryRouter>);
  const lookup = await screen.findByPlaceholderText("Bill (SB/…) or product barcode");
  fireEvent.change(lookup, { target: { value: "261031-0001" } });
  fireEvent.keyDown(lookup, { key: "Enter" });
  await waitFor(() => expect(api.get).toHaveBeenCalledWith("/pos-returns/source-bill", { params: { billNo: "261031-0001" } }));
  expect(api.get).not.toHaveBeenCalledWith("/pos-returns/return-product-barcode", expect.anything());
  await screen.findByText("Coffee beans");
});

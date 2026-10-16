import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Product from "../Product";
import api from "../../../api/axios";

vi.mock("../../../api/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../../../components/UploadImportButton", () => ({ default: () => null }));
vi.mock("../../../components/ExportBottomSheet", () => ({ default: () => null }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue({ visibleColumns: ["code", "name"] }), saveTablePreference: vi.fn() }));

const item = (id) => ({ id, company_id: 1, code: `PRODUCT-${id}`, name: `Product ${id}` });
const cursorResponse = (ids, next, previous) => ({ data: {
  data: ids.map(item),
  pagination: { mode: "cursor", estimated_total: 1000000, next_cursor: next, previous_cursor: previous, has_next: Boolean(next), has_previous: Boolean(previous) },
} });
const renderProduct = () => render(<MemoryRouter><Product /></MemoryRouter>);

describe("Product adaptive pagination", () => {
  beforeEach(() => { api.get.mockReset(); localStorage.clear(); });

  it("replaces rows using next/previous cursors and resets cursors when page size changes", async () => {
    api.get.mockResolvedValueOnce(cursorResponse([1, 2], "forward-token", null))
      .mockResolvedValueOnce(cursorResponse([3, 4], null, "back-token"))
      .mockResolvedValueOnce(cursorResponse([1, 2], "forward-token", null))
      .mockResolvedValueOnce(cursorResponse([1, 2], null, null));
    renderProduct();
    expect(await screen.findByText("Continuous")).toBeDefined();
    expect(screen.queryByText("Page 1", { exact: true })).toBeNull();
    expect(screen.queryByRole("button", { name: "Load More" })).toBeNull();
    expect(screen.getByTitle("Previous").disabled).toBe(true);
    fireEvent.click(screen.getByTitle("Next"));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith("/products", { signal: expect.any(AbortSignal), params: expect.objectContaining({ cursor: "forward-token", limit: 20 }) }));
    await waitFor(() => expect(screen.getByTitle("Previous").disabled).toBe(false));
    expect(api.get.mock.calls[1][1].params).not.toHaveProperty("page");
    expect(screen.getByTitle("Next").disabled).toBe(true);
    expect(screen.queryByText("Product 1", { exact: true })).toBeNull();
    fireEvent.click(screen.getByTitle("Previous"));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith("/products", { signal: expect.any(AbortSignal), params: expect.objectContaining({ cursor: "back-token" }) }));
    await waitFor(() => expect(screen.getByTitle("Next").disabled).toBe(false));
    fireEvent.mouseDown(screen.getByText("20", { exact: true }));
    fireEvent.click(screen.getByRole("option", { name: "50", exact: true }));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith("/products", { signal: expect.any(AbortSignal), params: expect.objectContaining({ page: 1, limit: 50 }) }));
    expect(api.get.mock.calls.at(-1)[1].params).not.toHaveProperty("cursor");
  }, 35000);

  it("allows direct page jumps when the API returns offset pagination", async () => {
    api.get.mockImplementation((_path, { params }) => Promise.resolve({ data: {
      data: [item(params.page)], total: 60, totalPages: 3,
      pagination: { mode: "offset", page: params.page, total: 60, total_pages: 3 },
    } }));
    renderProduct();
    await screen.findByText("Page 1", { exact: true });
    fireEvent.mouseDown(screen.getByText("Page 1", { exact: true }));
    fireEvent.click(screen.getByRole("option", { name: "Page 3", exact: true }));
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith("/products", { signal: expect.any(AbortSignal), params: expect.objectContaining({ page: 3 }) }));
    await screen.findByText("Page 3", { exact: true });
    expect(api.get.mock.calls.at(-1)[1].params).not.toHaveProperty("cursor");
  });

  it("starts searches without a cursor and ignores an older cursor request finishing later", async () => {
    let finishOldPage;
    api.get.mockResolvedValueOnce(cursorResponse([1, 2], "forward-token", null))
      .mockImplementationOnce(() => new Promise(resolve => { finishOldPage = resolve; }))
      .mockResolvedValue(cursorResponse([9], null, null));
    renderProduct();
    await screen.findByText("Continuous");
    fireEvent.click(screen.getByTitle("Next"));
    await waitFor(() => expect(finishOldPage).toBeDefined());
    expect(screen.getByTitle("Next").disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Search in product fields..."), { target: { value: "Product 9" } });
    await waitFor(() => expect(api.get).toHaveBeenLastCalledWith("/products", { signal: expect.any(AbortSignal), params: expect.objectContaining({ page: 1, search: "Product 9" }) }));
    expect(api.get.mock.calls.at(-1)[1].params).not.toHaveProperty("cursor");
    await waitFor(() => expect(screen.getByTitle("Next").disabled).toBe(true));
    await act(async () => finishOldPage(cursorResponse([3, 4], "stale-next", "stale-back")));
    expect(screen.getByTitle("Next").disabled).toBe(true);
    expect(screen.getByTitle("Previous").disabled).toBe(true);
  });
});

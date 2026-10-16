import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import Brand from "../Brand";
import api from "../../../api/axios";

vi.mock("../../../api/axios", () => ({ default: { get: vi.fn() } }));
vi.mock("../../../components/UploadImportButton", () => ({ default: () => null }));
vi.mock("../../../components/ExportBottomSheet", () => ({ default: () => null }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue({ visibleColumns: ["code", "name"] }), saveTablePreference: vi.fn() }));

describe("Brand shared listing integration", () => {
  it("uses cursor navigation for a large list and keeps search requests paginated", async () => {
    api.get.mockImplementation((path, { params } = {}) => Promise.resolve({ data: path === "/brands" ? {
      data: [{ id: params.cursor ? 2 : 1, code: params.cursor ? "BR-2" : "BR-1", name: "Shared brand" }],
      pagination: { mode: "cursor", estimated_total: 1000000, next_cursor: params.cursor ? null : "forward", previous_cursor: params.cursor ? "back" : null, has_next: !params.cursor, has_previous: Boolean(params.cursor) },
    } : { data: [] } }));
    render(<MemoryRouter><Brand /></MemoryRouter>);
    await screen.findByText("Continuous");
    expect(screen.queryByRole("combobox", { name: "Page", exact: true })).toBeNull();
    await waitFor(() => expect(screen.getByTitle("Next").disabled).toBe(false));
    fireEvent.click(screen.getByTitle("Next"));
    await waitFor(() => expect(api.get.mock.calls.filter(([path]) => path === "/brands").at(-1)[1].params.cursor).toBe("forward"));
    await waitFor(() => expect(screen.getByTitle("Previous").disabled).toBe(false));
    expect(screen.getByTitle("Next").disabled).toBe(true);
    fireEvent.change(screen.getByPlaceholderText("Search in brand fields..."), { target: { value: "Shared" } });
    await waitFor(() => {
      const calls = api.get.mock.calls.filter(([path]) => path === "/brands");
      expect(calls.at(-1)[1].params).toMatchObject({ page: 1, limit: 20, search: "Shared" });
      expect(calls.at(-1)[1].params).not.toHaveProperty("cursor");
      expect(calls.every(([, config]) => !config.params.all)).toBe(true);
    });
  });
});

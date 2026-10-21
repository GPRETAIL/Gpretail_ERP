import { beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), put: vi.fn(), error: vi.fn(), success: vi.fn() }));
vi.mock("../../../api/axios", () => ({ default: mocks }));
vi.mock("react-toastify", () => ({ toast: { error: mocks.error, success: mocks.success, warn: vi.fn(), info: vi.fn() } }));
vi.mock("../../../components/UploadImportButton", () => ({ default: () => null }));
vi.mock("../../../components/ExportBottomSheet", () => ({ default: () => null }));
vi.mock("../../../utils/tablePreferences", () => ({ fetchTablePreference: vi.fn().mockResolvedValue({}), saveTablePreference: vi.fn() }));
import Brand from "../Brand";
beforeEach(() => { cleanup(); vi.clearAllMocks(); mocks.get.mockResolvedValue({ data: { data: [], pagination: { mode: "offset", total: 0, page: 1 } } }); });
function fillNewBrand() {
  const result = render(<MemoryRouter><Brand /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "New", exact: true }));
  const inputs = result.container.querySelectorAll('input[type="text"]');
  fireEvent.change(inputs[1], { target: { value: "New brand" } });
  fireEvent.change(inputs[2], { target: { value: "Receipt brand" } });
  return inputs;
}
it("keeps the generated code when saving an edit immediately after creation", async () => {
  mocks.post.mockResolvedValue({ data: { data: { id: 11, code: "BR-GENERATED" } } });
  mocks.put.mockResolvedValue({ data: { success: true } });
  const inputs = fillNewBrand();
  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  await waitFor(() => expect(inputs[0].value).toBe("BR-GENERATED"));
  fireEvent.change(inputs[1], { target: { value: "Changed brand" } });
  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  await waitFor(() => expect(mocks.put).toHaveBeenCalledWith("/brands/11", expect.objectContaining({ code: "BR-GENERATED", name: "Changed brand" })));
});
it("shows duplicate code validation instead of an unexplained save failure", async () => {
  mocks.post.mockRejectedValue({ response: { data: { errors: { code: ["The code has already been taken."] } } } });
  fillNewBrand();
  fireEvent.click(screen.getByRole("button", { name: "Save", exact: true }));
  await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("The code has already been taken."));
});

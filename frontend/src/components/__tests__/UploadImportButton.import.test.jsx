import { beforeEach, expect, it, vi } from "vitest";
import { fireEvent, render, waitFor, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import * as XLSX from "xlsx";
const mocks = vi.hoisted(() => ({ post: vi.fn(), error: vi.fn(), success: vi.fn(), finish: vi.fn(), done: vi.fn() }));
vi.mock("../../api/axios", () => ({ default: { post: mocks.post } }));
vi.mock("react-toastify", () => ({ toast: { error: mocks.error, success: mocks.success } }));
vi.mock("../../context/TransferActivityContext", () => ({ useTransferActivity: () => ({ startActivity: () => "upload", updateActivity: vi.fn(), finishActivity: mocks.finish, TYPE: { IMPORT: "import" }, STATUS: { FAILED: "failed", SUCCESS: "success" } }) }));
import UploadImportButton from "../UploadImportButton";
const config = { sampleHeaders: ["code", "name", "printing_name", "is_active"], aliases: { code: "code", name: "name", printingname: "printing_name", isactive: "is_active" }, required: ["name"], boolFields: ["is_active"] };
function upload(rows, options = {}) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Import");
  const bytes = XLSX.write(workbook, { type: "array", bookType: "xlsx" });
  const file = new File([bytes], "test-brands.xlsx");
  file.arrayBuffer = async () => bytes;
  const { container } = render(<MemoryRouter><UploadImportButton endpoint="/brands/bulk" fieldConfig={{ ...config, ...options }} onDone={mocks.done} /></MemoryRouter>);
  fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
}
beforeEach(() => { cleanup(); vi.clearAllMocks(); mocks.post.mockResolvedValue({ data: { created: 1 } }); });
it("parses a real XLSX workbook, preserves leading-zero codes and optional blank defaults, and refreshes", async () => {
  expect(XLSX.version).toBe("0.20.3");
  upload([{ code: "0001", name: "Imported brand", printing_name: "Receipt", is_active: "" }]);
  await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce());
  expect(mocks.post.mock.calls[0][1]).toEqual([{ code: "0001", name: "Imported brand", printing_name: "Receipt" }]);
  await waitFor(() => expect(mocks.done).toHaveBeenCalledOnce());
  expect(mocks.success).toHaveBeenCalledWith("Imported 1 record");
});
it("rejects incomplete rows without silently importing only the other rows", async () => {
  upload([{ name: "Valid" }, { name: "", code: "BAD" }]);
  await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("Excel row 3")));
  expect(mocks.post).not.toHaveBeenCalled();
});
it("shows the backend spreadsheet row validation error", async () => {
  mocks.post.mockRejectedValue({ response: { data: { message: "Validation failed", errors: { "rows.0.code": ["Excel row 2: The code has already been taken."] } } } });
  upload([{ code: "0001", name: "Duplicate" }]);
  await waitFor(() => expect(mocks.error).toHaveBeenCalledWith("Excel row 2: The code has already been taken."));
  expect(mocks.done).not.toHaveBeenCalled();
});

it("keeps configuration-specific fields and converts Excel date cells to ISO dates", async () => {
  upload([{ name: "Season", enabled: "no", date_from: new Date("2026-10-22T00:00:00Z"), floor: "First" }], { preserveUnknown: true, boolFields: ["enabled"] });
  await waitFor(() => expect(mocks.post).toHaveBeenCalledOnce());
  expect(mocks.post.mock.calls[0][1]).toEqual([{ name: "Season", enabled: false, date_from: "2026-10-22", floor: "First" }]);
});


it("rejects an actual workbook exceeding the row limit without partial insertion", async () => {
  upload(Array.from({ length: 5003 }, (_, i) => ({ name: `Brand ${i}` })));
  await waitFor(() => expect(mocks.error).toHaveBeenCalledWith(expect.stringContaining("5,000 rows")));
  expect(mocks.post).not.toHaveBeenCalled();
});

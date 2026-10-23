import { fireEvent, render, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const toastErrorMock = vi.fn();
const toastSuccessMock = vi.fn();
const xlsxReadMock = vi.fn();
const sheetToJsonMock = vi.fn();
const apiPostMock = vi.fn();

vi.mock("react-toastify", () => ({
  toast: {
    error: (...args) => toastErrorMock(...args),
    success: (...args) => toastSuccessMock(...args),
  },
}));

vi.mock("xlsx", () => ({
  read: (...args) => xlsxReadMock(...args),
  utils: {
    sheet_to_json: (...args) => sheetToJsonMock(...args),
    aoa_to_sheet: vi.fn(),
    book_new: vi.fn(),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

vi.mock("../../api/axios", () => ({
  default: {
    post: (...args) => apiPostMock(...args),
  },
}));

vi.mock("../../context/TransferActivityContext", () => ({
  useTransferActivity: () => ({
    startActivity: () => "act-1",
    updateActivity: vi.fn(),
    finishActivity: vi.fn(),
    TYPE: { IMPORT: "import" },
    STATUS: { SUCCESS: "success", FAILED: "failed" },
  }),
}));

import UploadImportButton from "../UploadImportButton";
import {
  ALLOWED_IMPORT_EXTENSIONS,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
} from "../../utils/importSafety";

describe("UploadImportButton security hardening (Phase 4)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unsupported file extensions before reading buffer", async () => {
    const { container } = render(
      <MemoryRouter>
        <UploadImportButton
          endpoint="/brands/bulk"
          fieldConfig={{ aliases: { name: "name" }, required: ["name"], preserveUnknown: true }}
        />
      </MemoryRouter>
    );

    const input = container.querySelector('input[type="file"]');
    const badFile = new File(["malicious"], "payload.html", { type: "text/html" });
    badFile.arrayBuffer = vi.fn();

    fireEvent.change(input, { target: { files: [badFile] } });

    expect(badFile.arrayBuffer).not.toHaveBeenCalled();
    expect(ALLOWED_IMPORT_EXTENSIONS.test("payload.html")).toBe(false);
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Only .xlsx and .csv files are supported for import."
    );
    expect(xlsxReadMock).not.toHaveBeenCalled();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("rejects files larger than MAX_IMPORT_FILE_BYTES (5 MB)", async () => {
    const { container } = render(
      <MemoryRouter>
        <UploadImportButton
          endpoint="/brands/bulk"
          fieldConfig={{ aliases: { name: "name" }, required: ["name"], preserveUnknown: true }}
        />
      </MemoryRouter>
    );

    const input = container.querySelector('input[type="file"]');
    const oversizedFile = new File(["x"], "huge.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    oversizedFile.arrayBuffer = vi.fn();
    Object.defineProperty(oversizedFile, "size", { value: MAX_IMPORT_FILE_BYTES + 1024 });

    fireEvent.change(input, { target: { files: [oversizedFile] } });

    expect(oversizedFile.arrayBuffer).not.toHaveBeenCalled();
    expect(toastErrorMock).toHaveBeenCalledWith(
      "Import file exceeds the 5 MB maximum size limit."
    );
    expect(xlsxReadMock).not.toHaveBeenCalled();
    expect(apiPostMock).not.toHaveBeenCalled();
  });

  it("passes safe parser flags (cellFormula: false, cellHTML: false, dense: true) and strips prototype keys", async () => {
    xlsxReadMock.mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: {} },
    });
    sheetToJsonMock.mockReturnValue([
      JSON.parse('{"Name":"Safe Brand","__proto__":{"polluted":true},"constructor":"bad","prototype":"bad","Print Name":"Receipt brand","Date":"2026-10-23"}'),
    ]);
    apiPostMock.mockResolvedValue({ data: { created: 1 } });

    const { container } = render(
      <MemoryRouter>
        <UploadImportButton
          endpoint="/brands/bulk"
          fieldConfig={{ aliases: { name: "name" }, required: ["name"], preserveUnknown: true }}
        />
      </MemoryRouter>
    );

    const input = container.querySelector('input[type="file"]');
    const validFile = new File(["dummy"], "brands.xlsx", {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    validFile.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));

    fireEvent.change(input, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(xlsxReadMock).toHaveBeenCalledWith(expect.any(ArrayBuffer), {
        type: "array",
        cellDates: true,
        sheetRows: 5002,
        cellFormula: false,
        cellHTML: false,
        dense: true,
      });
    });

    await waitFor(() => {
      expect(apiPostMock).toHaveBeenCalledWith(
        "/brands/bulk",
        [{ name: "Safe Brand", print_name: "Receipt brand", date: "2026-10-23" }],
        expect.any(Object)
      );
    });
    expect(Object.getPrototypeOf(apiPostMock.mock.calls[0][1][0])).toBeNull();
    expect({}.polluted).toBeUndefined();
    expect(MAX_IMPORT_ROWS).toBe(5000);
  });
  it.each(["too many rows", "truncated worksheet"])("rejects %s without sending a partial import", async (scenario) => {
    xlsxReadMock.mockReturnValue({
      SheetNames: ["Sheet1"],
      Sheets: { Sheet1: scenario === "truncated worksheet" ? { "!ref": "A1:A5002", "!fullref": "A1:A10000" } : {} },
    });
    sheetToJsonMock.mockReturnValue(Array.from({ length: MAX_IMPORT_ROWS + 1 }, () => ({ Name: "Brand" })));
    const { container } = render(<MemoryRouter><UploadImportButton endpoint="/brands/bulk" fieldConfig={{ aliases: { name: "name" }, required: ["name"] }} /></MemoryRouter>);
    const file = new File(["data"], "brands.csv");
    file.arrayBuffer = vi.fn().mockResolvedValue(new ArrayBuffer(8));
    fireEvent.change(container.querySelector('input[type="file"]'), { target: { files: [file] } });
    await waitFor(() => expect(toastErrorMock).toHaveBeenCalledWith(expect.stringContaining("5,000 rows")));
    expect(apiPostMock).not.toHaveBeenCalled();
  });

});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExportBottomSheet from "@/shared/components/ExportBottomSheet";

const tracker = vi.hoisted(() => ({
  finish: vi.fn(),
  start: vi.fn(() => "export-1"),
  update: vi.fn(),
}));

vi.mock("@/features/store/context/TransferActivityContext", () => ({
  useTransferActivity: () => ({
    startActivity: tracker.start,
    updateActivity: tracker.update,
    finishActivity: tracker.finish,
    TYPE: { EXPORT: "export" },
    STATUS: { SUCCESS: "success", FAILED: "failed" },
  }),
}));

const props = {
  columns: [{ key: "code", label: "Code" }, { key: "name", label: "Name" }],
  rows: [{ id: 1, code: "001", name: "தமிழ்" }, { id: 2, code: "002", name: "Other" }],
  selectedRowKeys: [1],
  fileName: "stores",
  title: "Store export",
  sheetName: "A long worksheet title exceeding thirty one characters",
};

const readBuffer = (blob) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsArrayBuffer(blob);
});

function mount(extra = {}) {
  render(<MemoryRouter><ExportBottomSheet {...props} {...extra} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Export" }));
}

describe("Export contract v1", () => {
  beforeEach(() => vi.clearAllMocks());

  it("builds a styled workbook with the selection, headings, Unicode and leading zeros, named Page_Store_Date", async () => {
    const createUrl = vi.fn(() => "blob:excel-test");
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const names = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { names.push(this.download); });
    mount();
    fireEvent.click(screen.getByText("EXCEL"));
    await waitFor(() => expect(createUrl).toHaveBeenCalledOnce(), { timeout: 20000 });
    expect(names[0]).toMatch(/^Stores_\d{4}-\d{2}-\d{2}\.xlsx$/);
    const { default: ExcelJS } = await import("exceljs");
    const book = new ExcelJS.Workbook();
    await book.xlsx.load(await readBuffer(createUrl.mock.calls[0][0]));
    const sheet = book.worksheets[0];
    expect(sheet.name).toHaveLength(31);
    expect(sheet.getCell("A1").value).toBe("Store export");
    const headerRow = sheet.getRow(sheet.rowCount - 1);
    expect(headerRow.getCell(1).value).toBe("Code");
    expect(headerRow.getCell(1).font.bold).toBe(true);
    expect(sheet.views[0]).toMatchObject({ state: "frozen", ySplit: headerRow.number });
    expect(sheet.autoFilter).toBeTruthy();
    const dataRow = sheet.getRow(sheet.rowCount);
    expect(dataRow.getCell(1).value).toBe("001");
    expect(dataRow.getCell(2).value).toBe("தமிழ்");
    expect(sheet.rowCount).toBe(headerRow.number + 1);
    expect(tracker.finish).toHaveBeenCalledWith("export-1", expect.objectContaining({ status: "success" }));
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it("exports CSV with the same selected rows and text formatting", async () => {
    const createUrl = vi.fn(() => "blob:export-test");
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const names = [];
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function () { names.push(this.download); });
    mount();
    fireEvent.click(screen.getByText("CSV"));
    await waitFor(() => expect(createUrl).toHaveBeenCalledOnce());
    const blob = createUrl.mock.calls[0][0];
    const content = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(blob);
    });
    expect(content).toContain("Store export");
    expect(content).toContain("001,தமிழ்");
    expect(names[0]).toMatch(/^Stores_\d{4}-\d{2}-\d{2}\.csv$/);
    expect(content).not.toContain("002");
    expect(tracker.finish).toHaveBeenCalledWith("export-1", expect.objectContaining({ status: "success" }));
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it("reports a failed row fetch and allows retry without downloading partial data", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const loadRows = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(props.rows);
    mount({ rows: [], onExportRows: loadRows });
    const createUrl = vi.fn(() => "blob:retry");
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    fireEvent.click(screen.getByText("EXCEL"));
    await waitFor(() => expect(tracker.finish).toHaveBeenCalledWith("export-1", expect.objectContaining({ status: "failed" })));
    expect(createUrl).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("EXCEL")).toBeEnabled());
    fireEvent.click(screen.getByText("EXCEL"));
    await waitFor(() => expect(createUrl).toHaveBeenCalledOnce(), { timeout: 20000 });
    click.mockRestore();
    vi.unstubAllGlobals();
    errorLog.mockRestore();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ExportBottomSheet from "../ExportBottomSheet";

const tracker = vi.hoisted(() => ({
  loads: 0,
  writeFile: vi.fn(),
  finish: vi.fn(),
  start: vi.fn(() => "export-1"),
  update: vi.fn(),
}));

vi.mock("xlsx", async () => {
  tracker.loads += 1;
  const actual = await vi.importActual("xlsx");
  return { ...actual, writeFile: tracker.writeFile };
});
vi.mock("../../context/TransferActivityContext", () => ({
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

function mount(extra = {}) {
  render(<MemoryRouter><ExportBottomSheet {...props} {...extra} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Export" }));
}

describe("Export contract v1", () => {
  beforeEach(() => vi.clearAllMocks());

  it("defers spreadsheet loading until export and preserves selection, headings, Unicode and leading zeros", async () => {
    mount();
    expect(tracker.loads).toBe(0);
    fireEvent.click(screen.getByText("EXCEL"));
    await waitFor(() => expect(tracker.writeFile).toHaveBeenCalledOnce());
    expect(tracker.loads).toBe(1);
    const [book, filename] = tracker.writeFile.mock.calls[0];
    expect(filename).toBe("stores.xlsx");
    expect(book.SheetNames[0]).toHaveLength(31);
    const sheet = book.Sheets[book.SheetNames[0]];
    expect(sheet.A1.v).toBe("Store export");
    expect(sheet.A3.v).toBe("Code");
    expect(sheet.A4).toMatchObject({ v: "001", t: "s" });
    expect(sheet.B4.v).toBe("தமிழ்");
    expect(sheet.A5).toBeUndefined();
    expect(tracker.finish).toHaveBeenCalledWith("export-1", expect.objectContaining({ status: "success" }));
  });

  it("exports CSV with the same selected rows and text formatting", async () => {
    const createUrl = vi.fn(() => "blob:export-test");
    vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
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
    expect(content).not.toContain("002");
    expect(tracker.finish).toHaveBeenCalledWith("export-1", expect.objectContaining({ status: "success" }));
    click.mockRestore();
    vi.unstubAllGlobals();
  });

  it("reports a failed row fetch and allows retry without downloading partial data", async () => {
    const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
    const loadRows = vi.fn().mockRejectedValueOnce(new Error("Offline")).mockResolvedValueOnce(props.rows);
    mount({ rows: [], onExportRows: loadRows });
    fireEvent.click(screen.getByText("EXCEL"));
    await waitFor(() => expect(tracker.finish).toHaveBeenCalledWith("export-1", expect.objectContaining({ status: "failed" })));
    expect(tracker.writeFile).not.toHaveBeenCalled();
    await waitFor(() => expect(screen.getByText("EXCEL")).toBeEnabled());
    fireEvent.click(screen.getByText("EXCEL"));
    await waitFor(() => expect(tracker.writeFile).toHaveBeenCalledOnce());
    errorLog.mockRestore();
  });
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, it, vi } from "vitest";
import ExportBottomSheet from "../ExportBottomSheet";

const state = vi.hoisted(() => ({ spreadsheetLoads: 0, finish: vi.fn() }));
vi.mock("xlsx", async () => {
  state.spreadsheetLoads++;
  return vi.importActual("xlsx");
});
vi.mock("../../context/TransferActivityContext", () => ({
  useTransferActivity: () => ({
    startActivity: () => "csv-1", updateActivity: vi.fn(), finishActivity: state.finish,
    TYPE: { EXPORT: "export" }, STATUS: { SUCCESS: "success", FAILED: "failed" },
  }),
}));
const readBlob = blob => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = reject;
  reader.readAsText(blob);
});

it("downloads normal CSV without loading SheetJS and retains SheetJS formatting for unusual non-text headers", async () => {
  const createUrl = vi.fn(() => "blob:csv-test");
  vi.stubGlobal("URL", { createObjectURL: createUrl, revokeObjectURL: vi.fn() });
  const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
  try {
    const props = { title: "Export", columns: [{ key: "name", label: "Name" }, { key: "amount", label: "Amount" }], rows: [{ id: 1, name: "தமிழ், \"Shop\"", amount: 12.5 }, { id: 2, name: true, amount: 0 }] };
    const view = render(<MemoryRouter><ExportBottomSheet {...props} /></MemoryRouter>);
    expect(state.spreadsheetLoads).toBe(0);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByText("CSV"));
    await waitFor(() => expect(createUrl).toHaveBeenCalledOnce());
    expect(await readBlob(createUrl.mock.calls[0][0])).toBe('Export,\n,\nName,Amount\n"தமிழ், ""Shop""",12.5\ntrue,0');
    expect(state.spreadsheetLoads).toBe(0);
    expect(state.finish).toHaveBeenCalledWith("csv-1", expect.objectContaining({ status: "success" }));

    view.unmount();
    createUrl.mockClear();
    render(<MemoryRouter><ExportBottomSheet {...props} columns={[{ key: "name", label: true }, { key: "amount", label: 12.34567890123456 }]} /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: "Export" }));
    fireEvent.click(screen.getByText("CSV"));
    await waitFor(() => expect(createUrl).toHaveBeenCalledOnce());
    expect(state.spreadsheetLoads).toBe(1);
    const XLSX = await vi.importActual("xlsx");
    const expected = XLSX.utils.sheet_to_csv(XLSX.utils.aoa_to_sheet([
      ["Export"], [], [true, 12.34567890123456], ['தமிழ், "Shop"', "12.5"], ["true", "0"],
    ]));
    expect(await readBlob(createUrl.mock.calls[0][0])).toBe(expected);
  } finally {
    click.mockRestore();
    vi.unstubAllGlobals();
  }
});

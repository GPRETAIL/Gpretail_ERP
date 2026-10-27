import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import { PrintProvider, usePrintContext } from "../PrintContext";

const mocks = vi.hoisted(() => ({ print: vi.fn(), eligible: vi.fn(), rasterize: vi.fn() }));
vi.mock("react-redux", () => ({ useSelector: () => ({ id: 1, name: "Cashier" }) }));
vi.mock("../../utils/localPrinterService", () => ({
  connectLocalPrinterService: vi.fn(async () => ({ name: "Printer" })),
  detectLocalPrinterService: vi.fn(async () => true), disconnectLocalPrinterService: vi.fn(),
  getServicePrinters: vi.fn(async () => ({})), isLocalPrinterServiceConnected: vi.fn(() => false),
  printWithLocalService: mocks.print,
}));
vi.mock("../../utils/escposReceiptBuilder", () => ({
  isEscposReceiptEligible: mocks.eligible, buildEscposReceiptJob: () => ({ kind: "escpos_raw_v1" }),
}));
vi.mock("../../utils/renderPrintableHtml", () => ({ renderPrintableHtmlToImageJob: mocks.rasterize }));
const Controls = () => {
  const { printReceipt, connected } = usePrintContext();
  return <button disabled={!connected} onClick={() => printReceipt({ total: 100 }, {
    html: "<p>Receipt</p>", docType: "receipt", companyId: 2,
  })}>Print receipt</button>;
};
beforeEach(() => {
  vi.clearAllMocks();
  mocks.print.mockResolvedValue(undefined);
});
it("keeps native ESC/POS jobs on the fast path without rasterizing", async () => {
  mocks.eligible.mockReturnValue(true);
  render(<PrintProvider><Controls /></PrintProvider>);
  await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(mocks.print).toHaveBeenCalledTimes(1));
  expect(mocks.rasterize).not.toHaveBeenCalled();
  expect(mocks.print.mock.calls[0][0]).toMatchObject({ html: "", label: { kind: "escpos_raw_v1" } });
});
it("awaits the on-demand image renderer before sending a formatted receipt", async () => {
  mocks.eligible.mockReturnValue(false);
  mocks.rasterize.mockResolvedValue({ imageDataUrl: "data:image/png;base64,AAAA", pageWidthMm: 80, pageHeightMm: 100 });
  render(<PrintProvider><Controls /></PrintProvider>);
  await waitFor(() => expect(screen.getByRole("button")).toBeEnabled());
  fireEvent.click(screen.getByRole("button"));
  await waitFor(() => expect(mocks.print).toHaveBeenCalledTimes(1));
  expect(mocks.rasterize).toHaveBeenCalledExactlyOnceWith("<p>Receipt</p>");
  expect(mocks.print.mock.calls[0][0]).toMatchObject({
    html: "", label: { kind: "rendered_sheet_v1", imageDataUrl: "data:image/png;base64,AAAA" },
  });
});

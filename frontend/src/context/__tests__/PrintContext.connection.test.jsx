import { act, render } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { PrintProvider } from "../PrintContext";
import { detectLocalPrinterService } from "../../utils/localPrinterService";
vi.mock("react-redux", () => ({ useSelector: () => ({ id: 1 }) }));
vi.mock("../../utils/localPrinterService", () => ({
  detectLocalPrinterService: vi.fn(async () => false), connectLocalPrinterService: vi.fn(),
  disconnectLocalPrinterService: vi.fn(), getServicePrinters: vi.fn(),
  isLocalPrinterServiceConnected: () => false, printWithLocalService: vi.fn(),
}));
afterEach(() => { vi.useRealTimers(); localStorage.clear(); vi.clearAllMocks(); });
it("stops after the initial discovery and three retries", async () => {
  vi.useFakeTimers();
  const view = render(<PrintProvider><div /></PrintProvider>);
  await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
  expect(detectLocalPrinterService).toHaveBeenCalledTimes(4);
  view.unmount();
  await act(async () => { await vi.advanceTimersByTimeAsync(120000); });
  expect(detectLocalPrinterService).toHaveBeenCalledTimes(4);
});
it("does not discover printers when local silent printing is disabled", async () => {
  localStorage.setItem("vynerix.localPrintingEnabled", "false");
  render(<PrintProvider><div /></PrintProvider>);
  await act(async () => {});
  expect(detectLocalPrinterService).not.toHaveBeenCalled();
});

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, it, vi } from "vitest";
import { PrintProvider, usePrintContext } from "../PrintContext";
const mocks = vi.hoisted(() => ({ print: vi.fn() }));
vi.mock("react-redux", () => ({ useSelector: () => ({ id: 1, name: "Cashier" }) }));
vi.mock("../../utils/localPrinterService", () => ({
  connectLocalPrinterService: vi.fn(async () => ({ name: "Printer" })), detectLocalPrinterService: vi.fn(async () => true), disconnectLocalPrinterService: vi.fn(), getServicePrinters: vi.fn(async () => ({})), isLocalPrinterServiceConnected: vi.fn(() => false), printWithLocalService: mocks.print,
}));
const Controls = () => {
  const { printHtml, connected } = usePrintContext();
  return <><button disabled={!connected} onClick={() => printHtml("first", { label: "First" })}>First</button><button onClick={() => printHtml("second", { label: "Second" })}>Second</button></>;
};
it("automatically prints a second invoice queued while the first is still processing", async () => {
  let finishFirst;
  mocks.print.mockImplementationOnce(() => new Promise(done => { finishFirst = done; })).mockResolvedValue(undefined);
  render(<PrintProvider><Controls /></PrintProvider>);
  await waitFor(() => expect(screen.getByRole("button", { name: "First" })).toBeEnabled());
  fireEvent.click(screen.getByRole("button", { name: "First" }));
  await waitFor(() => expect(mocks.print).toHaveBeenCalledTimes(1));
  fireEvent.click(screen.getByRole("button", { name: "Second" }));
  expect(mocks.print).toHaveBeenCalledTimes(1);
  await act(async () => finishFirst());
  await waitFor(() => expect(mocks.print).toHaveBeenCalledTimes(2));
  expect(mocks.print.mock.calls.map(([job]) => job.html)).toEqual(["first", "second"]);
});

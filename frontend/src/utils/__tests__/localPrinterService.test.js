import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Guards the silent-printing transport. A refactor once deleted this module's helper block
 * (pendingById / settleRequest / parseJsonSafe / the *_ACTIONS lists) while leaving every call
 * site in place, so each exported function threw ReferenceError at runtime. Nothing failed
 * loudly -- PrintContext swallowed the error -- and POS quietly fell back to the browser print
 * dialog for three days. These tests exercise the real request path so that regression cannot
 * come back silently.
 */

class FakeSocket {
  static instances = [];
  /** url -> "open" | "fail" */
  static route = () => "open";
  /** parsed outbound message -> reply object (or null to stay silent) */
  static reply = () => ({ Success: true });

  constructor(url) {
    this.url = url;
    this.readyState = FakeSocket.CONNECTING;
    this.sent = [];
    FakeSocket.instances.push(this);

    queueMicrotask(() => {
      if (FakeSocket.route(url) === "open") {
        this.readyState = FakeSocket.OPEN;
        this.onopen?.();
      } else {
        this.readyState = FakeSocket.CLOSED;
        this.onerror?.(new Error(`refused ${url}`));
      }
    });
  }

  send(raw) {
    this.sent.push(raw);
    const message = JSON.parse(raw);
    const reply = FakeSocket.reply(message);
    if (!reply) return;
    queueMicrotask(() => {
      this.onmessage?.({
        data: JSON.stringify({ ...reply, RequestId: message.RequestId }),
      });
    });
  }

  close() {
    this.readyState = FakeSocket.CLOSED;
  }
}
FakeSocket.CONNECTING = 0;
FakeSocket.OPEN = 1;
FakeSocket.CLOSING = 2;
FakeSocket.CLOSED = 3;

/** Fresh module state per test -- socket/pendingById live at module scope. */
const loadModule = async () => {
  vi.resetModules();
  return import("../localPrinterService");
};

beforeEach(() => {
  FakeSocket.instances = [];
  FakeSocket.route = () => "open";
  FakeSocket.reply = () => ({ Success: true });
  vi.stubGlobal("WebSocket", FakeSocket);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("detectLocalPrinterService", () => {
  it("falls through to a later candidate instead of giving up on the first", async () => {
    const { detectLocalPrinterService } = await loadModule();
    // Only the 127.0.0.1 form answers -- the localhost form is refused.
    FakeSocket.route = (url) => (url.includes("127.0.0.1") ? "open" : "fail");

    await expect(detectLocalPrinterService({ timeoutMs: 1800 })).resolves.toBe(true);
    expect(FakeSocket.instances.length).toBeGreaterThan(1);
  });

  it("reports false only when every candidate refuses", async () => {
    const { detectLocalPrinterService } = await loadModule();
    FakeSocket.route = () => "fail";

    await expect(detectLocalPrinterService({ timeoutMs: 1800 })).resolves.toBe(false);
  });
});

describe("request path", () => {
  it("getServicePrinters resolves a normalized printer list", async () => {
    const { connectLocalPrinterService, getServicePrinters } = await loadModule();
    FakeSocket.reply = () => ({
      Success: true,
      Printers: ["Front Counter", { name: "Kitchen TSPL" }],
      selectedPrinterName: "Front Counter",
    });

    await connectLocalPrinterService();
    const result = await getServicePrinters();

    expect(result.printers.map((p) => p.name)).toEqual(["Front Counter", "Kitchen TSPL"]);
    expect(result.selectedPrinterName).toBe("Front Counter");
    expect(result.printers[0].isSelected).toBe(true);
  });

  it("printWithLocalService sends a print action and resolves on success", async () => {
    const { connectLocalPrinterService, printWithLocalService } = await loadModule();

    await connectLocalPrinterService();
    await expect(
      printWithLocalService({
        html: "<div>Bill</div>",
        label: "POSSale-1",
        docType: "pos_sale_receipt",
        copies: 2,
        printerConfig: { printer_name: "Front Counter" },
        printerFunction: "receipt",
      })
    ).resolves.toBeTruthy();

    const [socket] = FakeSocket.instances;
    const payload = JSON.parse(socket.sent.at(-1));
    expect(payload.Action).toBe("Print");
    expect(payload.PrinterName).toBe("Front Counter");
    expect(payload.Copies).toBe(2);
    expect(payload.PrinterFunction).toBe("receipt");
  });

  it("surfaces a service-side rejection as a rejected promise, not a ReferenceError", async () => {
    const { connectLocalPrinterService, printWithLocalService } = await loadModule();
    FakeSocket.reply = () => ({ Success: false, Error: "Printer offline" });

    await connectLocalPrinterService();
    await expect(
      printWithLocalService({ html: "<div>Bill</div>", printerConfig: {} })
    ).rejects.toThrow(/Printer offline/);
  });

  it("routes label jobs through the label actions", async () => {
    const { connectLocalPrinterService, printWithLocalService } = await loadModule();

    await connectLocalPrinterService();
    await printWithLocalService({
      label: { kind: "rendered_sheet_v1", jobName: "Receipt", imageDataUrl: "data:," },
      printerConfig: { printer_name: "Front Counter" },
    });

    const payload = JSON.parse(FakeSocket.instances[0].sent.at(-1));
    expect(payload.Action).toBe("PrintLabel");
  });

  it("rejects an empty job rather than sending it", async () => {
    const { connectLocalPrinterService, printWithLocalService } = await loadModule();

    await connectLocalPrinterService();
    await expect(printWithLocalService({})).rejects.toThrow(/Nothing to print/i);
  });
});

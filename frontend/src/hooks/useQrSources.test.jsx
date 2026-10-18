import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import QRCode from "qrcode";
import useQrSources from "./useQrSources";

vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn() } }));
beforeEach(() => vi.clearAllMocks());

it("generates only QR labels and hides a disabled preview", async () => {
  QRCode.toDataURL.mockResolvedValue("data:image/png;base64,qr");
  const labels = [{ key: "qr", codeType: "code", codeValue: "123" }, { key: "bar", codeType: "barcode", codeValue: "456" }];
  const { result, rerender } = renderHook(enabled => useQrSources(labels, { enabled, width: 360 }), { initialProps: true });
  await waitFor(() => expect(result.current.sources.qr).toContain("data:image"));
  expect(QRCode.toDataURL).toHaveBeenCalledTimes(1);
  expect(QRCode.toDataURL).toHaveBeenCalledWith("123", { margin: 1, width: 360, errorCorrectionLevel: "M" });
  rerender(false);
  expect(result.current.sources).toEqual({});
});

it("ignores old QR generation when the label changes", async () => {
  let finishOld;
  QRCode.toDataURL.mockImplementationOnce(() => new Promise(resolve => { finishOld = resolve; })).mockResolvedValue("new QR");
  const { result, rerender } = renderHook(labels => useQrSources(labels), { initialProps: [{ key: "a", codeType: "code", codeValue: "old" }] });
  await waitFor(() => expect(QRCode.toDataURL).toHaveBeenCalledTimes(1));
  rerender([{ key: "b", codeType: "code", codeValue: "new" }]);
  await waitFor(() => expect(result.current.sources).toEqual({ b: "new QR" }));
  await act(async () => finishOld("old QR"));
  expect(result.current.sources).toEqual({ b: "new QR" });
});

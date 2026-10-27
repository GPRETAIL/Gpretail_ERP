import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ConfigureLocalServer from "../ConfigureLocalServer";
const { get, put, post, toast, initialize } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), toast: { error: vi.fn(), success: vi.fn() }, initialize: vi.fn().mockResolvedValue(null) }));
vi.mock("../../../api/axios", () => ({ default: { get, put, post } }));
vi.mock("../../../api/runtimeRouting", () => ({ fetchAndApplyRuntimeRoutingConfig: initialize }));
vi.mock("react-toastify", () => ({ toast }));
const saved = { local_server_url: "http://192.168.1.25:8000", cloud_server_url: "https://cloud.example", connector_status: "offline" };
beforeEach(() => { vi.clearAllMocks(); get.mockImplementation(async path => ({ data: { data: path === "/local-server-config" ? saved : { nodes: [] } } })); });
afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });

it("retains an edited URL during background status polling", async () => {
  vi.useFakeTimers(); render(<ConfigureLocalServer />); await act(async () => {});
  const field = screen.getByPlaceholderText("http://192.168.1.25:8000");
  fireEvent.change(field, { target: { value: "http://192.168.1.99:8130" } });
  await act(async () => vi.advanceTimersByTimeAsync(20000));
  expect(field).toHaveValue("http://192.168.1.99:8130");
  expect(get.mock.calls.filter(([path]) => path === "/local-server-config")).toHaveLength(2);
});

it("does not overlap slow polling requests", async () => {
  vi.useFakeTimers(); let resolve;
  get.mockImplementation(path => path === "/local-server-config" ? new Promise(done => { resolve = done; }) : Promise.resolve({ data: { data: { nodes: [] } } }));
  render(<ConfigureLocalServer />);
  await act(async () => vi.advanceTimersByTimeAsync(60000));
  expect(get.mock.calls.filter(([path]) => path === "/local-server-config")).toHaveLength(1);
  await act(async () => resolve({ data: { data: saved } }));
  expect(get.mock.calls.filter(([path]) => path === "/local-server-config")).toHaveLength(2);
});

it("reports an unhealthy HTTP 200 connection test as an error", async () => {
  post.mockResolvedValue({ data: { success: false, message: "Server did not report healthy." } });
  render(<ConfigureLocalServer />);
  fireEvent.click(await screen.findByRole("button", { name: "Test Local" }));
  await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Server did not report healthy."));
  expect(toast.success).not.toHaveBeenCalled();
});

it("preserves explicitly cleared URLs after save and refreshes runtime routing", async () => {
  put.mockResolvedValue({ data: { data: { local_server_url: null, cloud_server_url: null } } });
  render(<ConfigureLocalServer />);
  const field = await screen.findByPlaceholderText("http://192.168.1.25:8000");
  fireEvent.change(field, { target: { value: "" } });
  fireEvent.click(screen.getByRole("button", { name: "Save URLs" }));
  await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
  expect(field).toHaveValue("");
});

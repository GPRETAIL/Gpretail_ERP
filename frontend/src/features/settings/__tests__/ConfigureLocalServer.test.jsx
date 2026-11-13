import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import ConfigureLocalServer from "@/features/settings/ConfigureLocalServer";
const { get, put, post, toast, initialize } = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() }, initialize: vi.fn().mockResolvedValue(null) }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get, put, post } }));
vi.mock("@/shared/api/runtimeRouting", () => ({ fetchAndApplyRuntimeRoutingConfig: initialize }));
vi.mock("react-toastify", () => ({ toast }));
const saved = { tenant_key: "test-node", local_server_url: "http://192.168.1.25:8000", cloud_server_url: "https://cloud.example", connector_status: "offline" };
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

it("requires a local address for Save and uses an explicit disable action", async () => {
  put.mockResolvedValue({ data: { data: { local_server_url: null, cloud_server_url: null, enabled: false } } });
  render(<ConfigureLocalServer />);
  const field = await screen.findByPlaceholderText("http://192.168.1.25:8000");
  fireEvent.change(field, { target: { value: "" } });
  fireEvent.change(screen.getByLabelText("Cloud Server URL"), { target: { value: "" } });
  expect(screen.getByRole("button", { name: "Save URLs" })).toBeDisabled();
  fireEvent.click(screen.getByRole("button", { name: "Save URLs" }));
  expect(put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Disable local failover" }));
  expect(screen.getByRole("dialog", { name: "Disable local failover?" })).toBeInTheDocument();
  expect(put).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Cancel", exact: true }));
  await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  fireEvent.click(screen.getByRole("button", { name: "Disable local failover" }));
  fireEvent.click(screen.getByRole("button", { name: "Disable failover", exact: true }));
  await waitFor(() => expect(put).toHaveBeenCalledWith("/local-server-config", { local_server_url: "", cloud_server_url: "", disable_failover: true }));
  await waitFor(() => expect(initialize).toHaveBeenCalledTimes(1));
});

it("blocks page URLs and tests until valid addresses are saved", async () => {
  render(<ConfigureLocalServer />);
  const field = await screen.findByLabelText("Local Server URL");
  fireEvent.change(field, { target: { value: "http://192.168.1.25:8000/dashboard" } });
  expect(screen.getByText(/without \/login, \/dashboard/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save URLs" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Test Local" })).toBeDisabled();
  fireEvent.change(field, { target: { value: "http://192.168.1.99:8000" } });
  expect(screen.getByRole("button", { name: "Save URLs" })).toBeEnabled();
  expect(screen.getByRole("button", { name: "Test Local" })).toBeDisabled();
  expect(post).not.toHaveBeenCalled();
});

it("rejects Vite frontend ports even when no page path is present", async () => {
  render(<ConfigureLocalServer />);
  const field = await screen.findByLabelText("Local Server URL");
  fireEvent.change(field, { target: { value: "http://127.0.0.1:5173/" } });
  expect(screen.getByText(/This is a frontend preview port/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save URLs" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Test Local" })).toBeDisabled();
});

it("explains why loopback cannot serve other store devices", async () => {
  render(<ConfigureLocalServer />);
  const field = await screen.findByLabelText("Local Server URL");
  fireEvent.change(field, { target: { value: "http://127.0.0.1:8000" } });
  expect(screen.getByText(/Loopback addresses only reach this PC/)).toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Save URLs" })).toBeDisabled();
});

it("shows development connector setup as information rather than a failed connection", async () => {
  post.mockResolvedValue({ data: { success: false, message: "Local sync needs configuration", data: { status: "SETUP_REQUIRED" } } });
  render(<ConfigureLocalServer />);
  fireEvent.click(await screen.findByRole("button", { name: "Test Local" }));
  await waitFor(() => expect(toast.info).toHaveBeenCalledWith("Local sync needs configuration"));
  expect(toast.error).not.toHaveBeenCalled();
});

it("distinguishes never connected nodes from overdue heartbeats", async () => {
  get.mockImplementation(async path => ({ data: { data: path === "/local-server-config" ? saved : { nodes: [{ store_id: 1, store_name: "Heartbeat QA", enabled: true, is_stale: true, last_heartbeat_at: null }] } } }));
  render(<ConfigureLocalServer />);
  await screen.findByText("Heartbeat QA");
  expect(screen.queryByText("Stale", { exact: true })).not.toBeInTheDocument();
  expect(screen.getAllByText("Not connected", { exact: true }).length).toBeGreaterThan(1);
});

it("on the on-prem server, connects to the cloud with a cloud admin and never keeps the password in the form", async () => {
  const onPrem = { ...saved, node_role: "local", enabled: false, cloud_server_url: null, counter_url: null };
  get.mockImplementation(async path => ({ data: { data: path === "/local-server-config" ? onPrem : { nodes: [] } } }));
  post.mockResolvedValue({ data: { message: "Connected to the cloud. 4 user(s) copied.", data: { ...onPrem, enabled: true, cloud_server_url: "https://dev.gpsoftware.in", counter_url: "http://mainserver:5173", users_synced: 4 } } });
  render(<ConfigureLocalServer />);

  expect(await screen.findByText("This on-prem server and the cloud")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save URLs" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Connect to cloud" }));
  fireEvent.change(screen.getByLabelText(/Counter address/), { target: { value: "http://mainserver:5173" } });
  expect(screen.getByLabelText(/Cloud address/)).toHaveValue("https://dev.gpsoftware.in");
  fireEvent.change(screen.getByLabelText(/Cloud admin username/), { target: { value: "owner" } });
  fireEvent.change(screen.getByLabelText(/Cloud admin password/), { target: { value: "pass" } });
  fireEvent.click(screen.getByRole("button", { name: "Connect" }));

  await waitFor(() => expect(post).toHaveBeenCalledWith("/local-server-config/connect", {
    counter_url: "http://mainserver:5173", cloud_server_url: "https://dev.gpsoftware.in", username: "owner", password: "pass",
  }, expect.anything()));
  await waitFor(() => expect(toast.success).toHaveBeenCalledWith("Connected to the cloud. 4 user(s) copied."));
  // The counters on this page pick up the new cloud link at once.
  await waitFor(() => expect(initialize).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByLabelText(/Cloud admin password/)).not.toBeInTheDocument());
});

it("says failover is off for a store whose on-prem link was switched off, not that it is offline", async () => {
  get.mockImplementation(async path => ({ data: { data: path === "/local-server-config"
    ? { ...saved, enabled: false, local_server_url: null, cloud_server_url: null, connector_status: "offline", connector_last_seen_at: "2026-11-13T04:40:10+05:30" }
    : { nodes: [] } } }));
  render(<ConfigureLocalServer />);
  expect(await screen.findByText("Failover off for this store")).toBeInTheDocument();
  expect(screen.queryByText("Seen, currently offline")).not.toBeInTheDocument();
});

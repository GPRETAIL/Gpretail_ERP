import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router-dom";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/shared/api/apiClient", () => ({ default: api }));
vi.mock("qrcode", () => ({ default: { toDataURL: vi.fn(async (text) => `data:image/png;base64,${btoa(text)}`) } }));
import PhoneUploadDialog from "@/features/warehouse/purchase-invoice/components/PhoneUploadDialog";
import PhoneUpload from "@/features/warehouse/purchase-invoice/PhoneUpload";

beforeEach(() => vi.clearAllMocks());
afterEach(() => vi.unstubAllGlobals());

it("shows a QR code for the phone and hands over the invoice once it arrives", async () => {
  api.post.mockResolvedValue({ data: { data: { token: "abc123", expires_at: new Date(Date.now() + 600000).toISOString(), lan_ip: "192.168.1.6", phone_base: null } } });
  api.get.mockImplementation(async (url) => (url.endsWith("/file")
    ? { data: new Blob(["jpg"], { type: "image/jpeg" }) }
    : { data: { data: { status: "received", file_name: "bill.jpg", mime: "image/jpeg" } } }));
  const onFile = vi.fn();
  render(<PhoneUploadDialog open onClose={() => {}} onFile={onFile} />);

  const qr = await screen.findByAltText("QR code for Upload from phone");
  // jsdom serves the page from localhost, which a phone cannot open: the link uses the server's LAN address.
  const port = window.location.port ? `:${window.location.port}` : "";
  expect(atob(qr.getAttribute("src").split(",")[1])).toBe(`http://192.168.1.6${port}/phone-upload/abc123`);

  await waitFor(() => expect(onFile).toHaveBeenCalledTimes(1), { timeout: 5000 });
  const file = onFile.mock.calls[0][0];
  expect(file.name).toBe("bill.jpg");
  expect(api.get).toHaveBeenCalledWith("/v1/invoice-ai/phone-upload/abc123/file", expect.objectContaining({ responseType: "blob" }));
});

it("on the phone, sends the chosen invoice to the computer", async () => {
  const fetchMock = vi.fn(async (url, options = {}) => ({
    ok: true,
    json: async () => (options.method === "POST" ? { success: true } : { success: true, data: { user: "Owner", store: "Coffee 1", status: "waiting" } }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  const { container } = render(
    <MemoryRouter initialEntries={["/phone-upload/abc123"]}>
      <Routes><Route path="/phone-upload/:token" element={<PhoneUpload />} /></Routes>
    </MemoryRouter>
  );
  expect(await screen.findByText(/Coffee 1/)).toBeTruthy();

  const picker = container.querySelectorAll('input[type="file"]')[1];
  fireEvent.change(picker, { target: { files: [new File(["%PDF"], "bill.pdf", { type: "application/pdf" })] } });
  fireEvent.click(await screen.findByRole("button", { name: "Send to computer" }));

  await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/phone-upload/abc123", expect.objectContaining({ method: "POST" })));
  expect(await screen.findByText(/The invoice is on the computer now/)).toBeTruthy();
});

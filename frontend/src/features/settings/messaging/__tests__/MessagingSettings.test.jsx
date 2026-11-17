import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";

const mocks = vi.hoisted(() => ({ get: vi.fn(), put: vi.fn(), post: vi.fn(), toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/shared/api/apiClient", () => ({ default: { get: mocks.get, put: mocks.put, post: mocks.post } }));
vi.mock("react-toastify", () => ({ toast: mocks.toast }));
import MessagingSettings from "@/features/settings/messaging/MessagingSettings";

beforeEach(() => {
  Object.values(mocks).forEach((m) => typeof m === "function" && m.mockReset());
  mocks.get.mockResolvedValue({ data: { data: {
    sms: { enabled: true, auth_key: "ABCD************", otp_template_id: "TPL1", sender_id: "SHOPPY", country_code: "91", last_test: null },
    whatsapp: { enabled: false }, email: { enabled: false },
  } } });
});
afterEach(cleanup);

it("saves a channel with the masked key left as it is, and sends a test OTP", async () => {
  mocks.put.mockResolvedValue({ data: { message: "Sms settings saved.", data: { enabled: true, auth_key: "ABCD************", otp_template_id: "TPL2" } } });
  mocks.post.mockResolvedValue({ data: { success: true, message: "Sent by SMS." } });
  render(<MemoryRouter><MessagingSettings /></MemoryRouter>);

  const sms = (await screen.findByText("SMS (MSG91)")).closest("form");
  expect(within(sms).getByLabelText("MSG91 auth key")).toHaveValue("ABCD************");
  fireEvent.change(within(sms).getByLabelText("OTP template ID (Flow)"), { target: { value: "TPL2" } });
  fireEvent.click(within(sms).getByRole("button", { name: "Save" }));
  await waitFor(() => expect(mocks.put).toHaveBeenCalledWith("/messaging-settings/sms", expect.objectContaining({ auth_key: "ABCD************", otp_template_id: "TPL2", enabled: true })));

  fireEvent.change(within(sms).getByLabelText("Test mobile number"), { target: { value: "9876543210" } });
  fireEvent.click(within(sms).getByRole("button", { name: "Send test OTP" }));
  await waitFor(() => expect(mocks.post).toHaveBeenCalledWith("/messaging-settings/sms/test", { to: "9876543210" }));
  expect(await within(sms).findByText(/Sent by SMS\./)).toBeInTheDocument();
  expect(screen.getByText("WhatsApp (Meta Cloud API)")).toBeInTheDocument();
  expect(screen.getByText("Email")).toBeInTheDocument();
});

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import ActivationWizard from "./ActivationWizard";

afterEach(() => vi.unstubAllGlobals());

it("sends the setup token only to company activation and reports expired sessions", async () => {
  const fetch = vi.fn().mockResolvedValue({ ok: false, json: async () => ({ message: "Company setup session expired. Sign in again." }) });
  vi.stubGlobal("fetch", fetch);
  const onActivated = vi.fn();
  render(<ActivationWizard setup={{ setup_token: "setup-only", company_code: "CMP-FIRST", company_name: "First Company" }} onActivated={onActivated} />);
  expect(screen.getByText(/Company verified: First Company/)).toBeTruthy();
  expect(screen.queryByLabelText("License Key or Setup Code")).toBeNull();
  expect(screen.queryByLabelText("Client ID")).toBeNull();
  expect(screen.queryByLabelText("Activation Code (One-Time Password)")).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Activate deployment" }));
  await screen.findByText("Company setup session expired. Sign in again.");
  expect(fetch).toHaveBeenCalledWith("/api/activation/bootstrap-register", expect.objectContaining({
    method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer setup-only" },
    body: JSON.stringify({}),
  }));
  expect(onActivated).not.toHaveBeenCalled();
});

it("returns to login without granting access when setup is cancelled", async () => {
  const onCancel = vi.fn();
  render(<ActivationWizard setup={{ setup_token: "setup-only", company_code: "CMP-FIRST" }} onCancel={onCancel} />);
  fireEvent.click(screen.getByRole("button", { name: "Return to login" }));
  await waitFor(() => expect(onCancel).toHaveBeenCalledTimes(1));
});

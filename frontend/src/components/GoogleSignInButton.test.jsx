import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import GoogleSignInButton from "./GoogleSignInButton";
const { get, initialize, renderButton } = vi.hoisted(() => ({ get: vi.fn(), initialize: vi.fn(), renderButton: vi.fn() }));
vi.mock("../api/axios", () => ({ default: { get } }));
beforeEach(() => {
  vi.clearAllMocks();
  get.mockResolvedValue({ data: { data: { google_enabled: true, google_client_id: "public-client.apps.googleusercontent.com" } } });
  vi.stubGlobal("google", { accounts: { id: { initialize, renderButton } } });
});
afterEach(() => { vi.unstubAllGlobals(); document.getElementById("google-gsi")?.remove(); });
describe("shared Google sign-in", () => {
  it("renders the official button using the configured client and forwards the credential", async () => {
    const onCredential = vi.fn(); render(<GoogleSignInButton onCredential={onCredential} />);
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(initialize.mock.calls[0][0].client_id).toBe("public-client.apps.googleusercontent.com");
    act(() => initialize.mock.calls[0][0].callback({ credential: "signed-id-token" }));
    expect(onCredential).toHaveBeenCalledWith("signed-id-token");
    act(() => initialize.mock.calls[0][0].callback({}));
    expect(onCredential).toHaveBeenCalledTimes(1);
  });
  it("shows an unavailable button without loading Google when configuration is absent", async () => {
    get.mockResolvedValue({ data: { data: { google_enabled: false, google_client_id: "" } } });
    render(<GoogleSignInButton onCredential={vi.fn()} />);
    await screen.findByText("Google sign-in is unavailable. Use email and password.");
    expect(screen.getByRole("button", { name: "Sign in with Google" })).toBeDisabled();
    expect(initialize).not.toHaveBeenCalled();
  });
  it("allows retry after configuration cannot be loaded", async () => {
    get.mockRejectedValueOnce(new Error("Network unavailable"));
    render(<GoogleSignInButton onCredential={vi.fn()} />);
    fireEvent.click(await screen.findByRole("button", { name: "Retry Google sign-in" }));
    await waitFor(() => expect(renderButton).toHaveBeenCalled());
    expect(get).toHaveBeenCalledTimes(2);
  });
});

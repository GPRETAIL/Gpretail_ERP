import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import ThemeProvider from "@/shared/theme/ThemeProvider";

const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  login: vi.fn(),
  navigate: vi.fn(),
  state: { auth: { isAuthenticated: false, loading: false, error: null, user: null } },
}));
vi.mock("react-redux", () => ({ useDispatch: () => mocks.dispatch, useSelector: selector => selector(mocks.state) }));
vi.mock("react-router-dom", async original => ({ ...await original(), useNavigate: () => mocks.navigate }));
vi.mock("@/features/auth/authSlice", () => ({ loginUser: Object.assign(mocks.login, { fulfilled: { match: result => result.type === "fulfilled" } }) }));
vi.mock("@/features/auth/components/GoogleSignInButton", () => ({ default: () => <button type="button">Sign in with Google</button> }));
vi.mock("@/features/activation/ActivationWizard", () => ({ default: ({ setup }) => <div role="status">Activate {setup.company_code}</div> }));
import Login from "@/features/auth/Login";

function renderLogin() {
  return render(<ThemeProvider><MemoryRouter><Login /></MemoryRouter></ThemeProvider>);
}
beforeEach(() => {
  localStorage.clear();
  mocks.state.auth = { isAuthenticated: false, loading: false, error: null, user: null };
  mocks.login.mockImplementation(payload => ({ type: "login-request", payload }));
  mocks.dispatch.mockResolvedValue({ type: "rejected" });
});
describe("ERP login", () => {
  it("switches the saved appearance without losing entered credentials", async () => {
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/username or email/i), "cashier@example.test");
    await user.type(screen.getByLabelText(/^password/i), "example-password");
    await user.click(screen.getByRole("button", { name: "Switch to dark mode" }));
    expect(localStorage.getItem("theme")).toBe("dark");
    expect(screen.getByLabelText(/username or email/i)).toHaveValue("cashier@example.test");
    expect(screen.getByLabelText(/^password/i)).toHaveValue("example-password");
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute("type", "password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute("type", "text");
    await user.click(screen.getByRole("button", { name: "Hide password" }));
    expect(screen.getByLabelText(/^password/i)).toHaveAttribute("type", "password");
  });

  it("submits the existing credentials payload and preserves the first-entry activation flow", async () => {
    mocks.dispatch.mockResolvedValue({ type: "fulfilled", payload: { setup: { company_code: "CMP-TEST" } } });
    const user = userEvent.setup();
    renderLogin();
    await user.type(screen.getByLabelText(/username or email/i), "owner@example.test");
    await user.type(screen.getByLabelText(/^password/i), "example-password");
    await user.keyboard("{Enter}");
    expect(mocks.login).toHaveBeenCalledWith({ email: "owner@example.test", password: "example-password" });
    expect(await screen.findByRole("status")).toHaveTextContent("Activate CMP-TEST");
    expect(mocks.navigate).not.toHaveBeenCalled();
  });

  it("announces authentication errors and blocks a second submission while signing in", async () => {
    mocks.state.auth.error = "Invalid username or password.";
    mocks.state.auth.loading = true;
    renderLogin();
    expect(screen.getByRole("alert")).toHaveTextContent("Invalid username or password.");
    expect(screen.getByRole("button", { name: /signing in/i })).toBeDisabled();
    fireEvent.change(screen.getByLabelText(/username or email/i), { target: { value: "cashier" } });
    await waitFor(() => expect(screen.getByRole("link", { name: /forgot your password/i })).toHaveAttribute("href", "/set-password"));
  });
});

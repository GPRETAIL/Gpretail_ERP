import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

// ForceChangePassword posts to /auth/change-password via the axios instance; stub it so the module
// imports cleanly. The test only cares that the card BODY renders.
vi.mock("../../api/axios", () => ({
  default: { post: vi.fn(() => Promise.resolve({ data: {} })) },
}));

import ForceChangePassword from "../ForceChangePassword";

/**
 * Regression: the blocking first-login "Set a new password" screen used `Shell(<jsx/>)` — calling
 * its card component as a plain function, which drops `children` and renders an empty card with NO
 * password fields, leaving a must_change_password user permanently stuck. Same defect as
 * SetPassword. This asserts the fields actually render.
 */
describe("ForceChangePassword page", () => {
  it("renders the password fields inside the card, not just the header", () => {
    render(<ForceChangePassword />);

    expect(screen.getByRole("heading", { name: /set a new password/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("At least 8 characters")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Re-enter password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /set password & continue/i })).toBeInTheDocument();
  });
});

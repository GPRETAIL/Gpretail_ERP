import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import SetPassword from "../SetPassword";

/**
 * Regression: SetPassword's <Shell> card was invoked as a plain function — `Shell(<jsx/>)` — instead
 * of as a component (`<Shell>…</Shell>`). That makes the passed JSX the `props` argument, so
 * `{ children }` destructures `props.children` off a React *element* (undefined), and the card
 * renders its header but drops its entire body. Live symptom: the "Set your password" page shows
 * the heading but NO email/password fields. This asserts the body actually renders.
 */
describe("SetPassword page", () => {
  it("renders the card body (email field), not just the header", () => {
    render(<SetPassword />);

    // The header renders regardless of the bug — it lives directly in Shell's own markup.
    expect(screen.getByRole("heading", { name: /set your password/i })).toBeInTheDocument();

    // The body — email input + Continue button — is what the Shell bug dropped.
    expect(screen.getByPlaceholderText("you@company.com")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /continue/i })).toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ActivationWizard from "../ActivationWizard";

describe("ActivationWizard page", () => {
  it("renders activation fields and action button", () => {
    render(<ActivationWizard />);

    expect(screen.getByRole("heading", { name: /activate this deployment/i })).toBeInTheDocument();
    // Default mode: single License Key input
    expect(screen.getByPlaceholderText("e.g. GPR-TRIAL-WG48MX-9482")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /activate deployment/i })).toBeInTheDocument();

    // Toggle to manual 3-field mode
    fireEvent.click(screen.getByRole("button", { name: /switch to manual 3-field entry/i }));
    expect(screen.getByPlaceholderText("e.g. CMP-16")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("From your welcome email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("One-time password")).toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ActivationWizard from "../ActivationWizard";

describe("ActivationWizard page", () => {
  it("renders activation fields and action button", () => {
    render(<ActivationWizard />);

    expect(screen.getByRole("heading", { name: /activate this deployment/i })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("e.g. CMP-16")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("From your welcome email")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("One-time password")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /activate/i })).toBeInTheDocument();
  });
});

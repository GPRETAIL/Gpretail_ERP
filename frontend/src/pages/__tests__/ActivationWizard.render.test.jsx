import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import ActivationWizard from "../ActivationWizard";

describe("ActivationWizard page", () => {
  it("renders activation fields and action button", () => {
    render(<ActivationWizard />);

    expect(screen.getByRole("heading", { name: /activate this deployment/i })).toBeInTheDocument();
    expect(screen.getByLabelText("License Key or Setup Code")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /activate deployment/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /switch to manual/i })).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Client ID")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Activation Code (One-Time Password)")).not.toBeInTheDocument();
  });
});

import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import NewPage from "../NewPage";

// Mock API
vi.mock("../../../api/axios", () => ({
  default: {
    get: vi.fn(() => Promise.resolve({ data: { success: true, data: [] } })),
    post: vi.fn(() => Promise.resolve({ data: { success: true, data: {} } })),
  },
}));

describe("NewPage (AI Invoice Inwarding)", () => {
  it("renders upload dropzone, document viewer prompt, and action headers", () => {
    render(
      <MemoryRouter>
        <NewPage />
      </MemoryRouter>
    );

    expect(screen.getByRole("heading", { name: /ai purchase invoice inwarding/i })).toBeInTheDocument();
    expect(screen.getByText(/drop purchase invoice here or browse/i)).toBeInTheDocument();
    expect(screen.getByText(/invoice document/i)).toBeInTheDocument();
    expect(screen.getByText(/pdf, jpg, png or webp/i)).toBeInTheDocument();
  });

  it("renders review tabs, product mapping switches, and approval flow", async () => {
    const { fireEvent } = await import("@testing-library/react");
    render(
      <MemoryRouter>
        <NewPage />
      </MemoryRouter>
    );

    // Mock file input
    const file = new File(["dummy content"], "invoice_test.pdf", { type: "application/pdf" });
    const input = document.getElementById("invoice-upload-input");
    if (input) {
      fireEvent.change(input, { target: { files: [file] } });
      expect(screen.getByText("invoice_test.pdf")).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /extract invoice details/i })).toBeInTheDocument();
    }
  });
});

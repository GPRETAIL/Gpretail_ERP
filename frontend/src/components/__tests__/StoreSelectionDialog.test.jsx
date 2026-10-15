import React from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import StoreSelectionDialog from "../StoreSelectionDialog";

const { get } = vi.hoisted(() => ({ get: vi.fn() }));
vi.mock("../../api/axios", () => ({ default: { get } }));

beforeEach(() => get.mockReset());

describe("mandatory store chooser", () => {
  it("opens on the backend selection event and fetches authorised stores", async () => {
    get.mockResolvedValue({ data: { data: [{ id: 2, name: "Store A", active: true }, { id: 3, name: "Store B", active: true }] } });
    render(<StoreSelectionDialog />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    act(() => window.dispatchEvent(new CustomEvent("vx:store-selection-required")));
    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("combobox")).not.toBeDisabled());
    expect(screen.getByRole("button", { name: "Select and reopen" })).toBeDisabled();
    fireEvent.mouseDown(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "Store A" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Store B" })).toBeInTheDocument();
    expect(get).toHaveBeenCalledWith("/companies", { params: { limit: 500 } });
  });

  it("explains when no stores are assigned", async () => {
    get.mockResolvedValue({ data: { data: [] } });
    render(<StoreSelectionDialog />);
    act(() => window.dispatchEvent(new CustomEvent("vx:store-selection-required")));
    expect(await screen.findByText("Ask your administrator to assign and activate a store.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Select and reopen" })).toBeDisabled();
  });

  it("disables an inactive store", async () => {
    get.mockResolvedValue({ data: { data: [{ id: 2, name: "Closed", active: false }] } });
    render(<StoreSelectionDialog />);
    act(() => window.dispatchEvent(new CustomEvent("vx:store-selection-required")));
    await waitFor(() => expect(screen.getByRole("combobox")).not.toBeDisabled());
    fireEvent.mouseDown(screen.getByRole("combobox"));
    expect(await screen.findByRole("option", { name: "Closed" })).toHaveAttribute("aria-disabled", "true");
  });
});

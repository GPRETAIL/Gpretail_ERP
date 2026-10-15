import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleStoreSelectionError, initializeStoreSelection } from "../storeSelection";

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe("store selection", () => {
  it("automatically selects the only assigned store", () => {
    initializeStoreSelection({ store_ids: [42] });
    expect(sessionStorage.getItem("activeStoreId")).toBe("42");
  });

  it.each([[], [2, 3]])("clears a previous user's selection for %j", (ids) => {
    sessionStorage.setItem("activeStoreId", "99");
    initializeStoreSelection({ store_ids: ids });
    expect(sessionStorage.getItem("activeStoreId")).toBeNull();
  });

  it("opens the chooser on an unscoped write without retrying the request", () => {
    const show = vi.fn();
    window.addEventListener("vx:store-selection-required", show);
    const error = { response: { status: 422, data: { code: "STORE_SELECTION_REQUIRED", message: "Select a store first" } } };
    handleStoreSelectionError(error);
    expect(show).toHaveBeenCalledOnce();
    expect(error.response.data.message).toBe("Select a store before creating data.");
    window.removeEventListener("vx:store-selection-required", show);
  });

  it("preserves an authorised selection during profile refresh", () => {
    sessionStorage.setItem("activeStoreId", "3");
    initializeStoreSelection({ store_ids: [2, 3] }, { preserve: true });
    expect(sessionStorage.getItem("activeStoreId")).toBe("3");
  });

  it("removes a selection when its store assignment is revoked", () => {
    sessionStorage.setItem("activeStoreId", "3");
    initializeStoreSelection({ store_ids: [2, 4] }, { preserve: true });
    expect(sessionStorage.getItem("activeStoreId")).toBeNull();
  });

  it("does not suggest store selection when no store is assigned", () => {
    const show = vi.fn();
    window.addEventListener("vx:store-selection-required", show);
    handleStoreSelectionError({ response: { status: 422, data: { code: "NO_STORES_ASSIGNED" } } });
    expect(show).not.toHaveBeenCalled();
    window.removeEventListener("vx:store-selection-required", show);
  });
});

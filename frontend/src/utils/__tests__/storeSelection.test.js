import { beforeEach, describe, expect, it, vi } from "vitest";
import { handleStoreSelectionError, initializeStoreSelection, setActiveStoreSelection, refreshStoreSelection } from "../storeSelection";

beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

describe("store selection", () => {
  it("switches the shared request scope and clears it for All Stores", () => {
    localStorage.setItem("activeStoreId", "99");
    setActiveStoreSelection("3");
    expect(sessionStorage.getItem("activeStoreId")).toBe("3");
    expect(localStorage.getItem("activeStoreId")).toBeNull();
    setActiveStoreSelection("");
    expect(sessionStorage.getItem("activeStoreId")).toBeNull();
  });

  it.each(["all", "-1", "2,3", "0"])("rejects malformed store context %s", (id) => {
    expect(() => setActiveStoreSelection(id)).toThrow("Invalid store selection");
    expect(sessionStorage.getItem("activeStoreId")).toBeNull();
  });
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

it("refreshes the selected store identity before changing scope", async () => {
  setActiveStoreSelection("2");
  const user = { id: 1, store_ids: [2, 3], company_id: 3, counter_id: null };
  const api = { get: vi.fn().mockResolvedValue({ data: { data: user } }) };
  expect(await refreshStoreSelection(api, "3")).toEqual(user);
  expect(api.get).toHaveBeenCalledWith("/auth/me", { storeScopeId: "3" });
  expect(sessionStorage.getItem("activeStoreId")).toBe("3");
  await refreshStoreSelection(api, "");
  expect(sessionStorage.getItem("activeStoreId")).toBeNull();
});
it("preserves the workspace if switching fails or access is denied", async () => {
  setActiveStoreSelection("2");
  const api = { get: vi.fn().mockResolvedValue({ data: { data: { id: 1, store_ids: [2] } } }) };
  await expect(refreshStoreSelection(api, "3")).rejects.toThrow();
  expect(sessionStorage.getItem("activeStoreId")).toBe("2");
  api.get.mockRejectedValue(new Error("Network error"));
  await expect(refreshStoreSelection(api, "3")).rejects.toThrow();
  expect(sessionStorage.getItem("activeStoreId")).toBe("2");
});

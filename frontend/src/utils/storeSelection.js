// Shared by dashboard, navbar and the required-store dialog. The server validates ownership.
export function setActiveStoreSelection(storeId) {
  const selected = String(storeId ?? "");
  if (selected && !/^[1-9]\d*$/.test(selected)) throw new Error("Invalid store selection");
  localStorage.removeItem("activeStoreId");
  if (selected) sessionStorage.setItem("activeStoreId", selected);
  else sessionStorage.removeItem("activeStoreId");
}

export async function refreshStoreSelection(apiClient, storeId) {
  const selected = String(storeId ?? "");
  const response = await apiClient.get("/auth/me", { storeScopeId: selected });
  const user = response.data?.data;
  if (!user?.id || (selected && !user.store_ids?.some(id => String(id) === selected))) {
    throw new Error("Unable to verify access to the selected store");
  }
  setActiveStoreSelection(selected);
  return user;
}

// A new login must never inherit another user's store selection.
export function initializeStoreSelection(user, { preserve = false } = {}) {
  const selected = sessionStorage.getItem("activeStoreId");
  localStorage.removeItem("activeStoreId");
  sessionStorage.removeItem("activeStoreId");
  const ids = user?.store_ids;
  if (preserve && Array.isArray(ids) && ids.some((id) => String(id) === selected)) {
    sessionStorage.setItem("activeStoreId", selected);
  } else if (Array.isArray(ids) && ids.length === 1) {
    sessionStorage.setItem("activeStoreId", String(ids[0]));
  }
}

export function handleStoreSelectionError(error) {
  const body = error.response?.data;
  if (error.response?.status === 422 &&
      (body?.code === "STORE_SELECTION_REQUIRED" || body?.message === "Select a store first")) {
    window.dispatchEvent(new CustomEvent("vx:store-selection-required"));
    body.message = "Select a store before creating data.";
  }
}

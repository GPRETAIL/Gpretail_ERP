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

export function apiErrorMessage(error, fallback = "Save failed") {
  const data = error?.response?.data;
  const details = Object.values(data?.errors || {}).flat().filter(Boolean);
  return details.length ? details.join(" ") : data?.message || fallback;
}

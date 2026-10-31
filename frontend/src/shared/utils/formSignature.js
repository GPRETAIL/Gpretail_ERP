/**
 * Normalizes an object, array, or primitive value into a canonical JSON signature
 * for reliable and robust "No changes detected" change tracking across all Master forms.
 */
export const normalizeFormSignature = (value) => {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "number") return isNaN(value) ? "" : String(value);
  if (typeof value === "string") return value.trim();

  if (Array.isArray(value)) {
    return JSON.stringify(value.map(normalizeFormSignature));
  }

  if (typeof value === "object") {
    const keys = Object.keys(value).sort();
    const normalized = {};
    for (const k of keys) {
      // Omit internal dynamic transient properties if any
      if (k.startsWith("_")) continue;
      normalized[k] = normalizeFormSignature(value[k]);
    }
    return JSON.stringify(normalized);
  }

  return String(value).trim();
};

export const isFormUnchanged = (currentData, initialSignature) => {
  if (!initialSignature) return false;
  return normalizeFormSignature(currentData) === initialSignature;
};

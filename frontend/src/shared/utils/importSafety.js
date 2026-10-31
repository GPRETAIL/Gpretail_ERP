export const ALLOWED_IMPORT_EXTENSIONS = /\.(xlsx|csv)$/i;
export const MAX_IMPORT_FILE_BYTES = 5 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 5000;

const forbiddenKeys = new Set(["proto", "constructor", "prototype"]);

export function isSafeImportKey(key) {
  return !forbiddenKeys.has(String(key).toLowerCase().replace(/[\s_\-()./]+/g, ""));
}

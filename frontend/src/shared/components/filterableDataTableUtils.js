// Extracted FilterableDataTable constants and pure filter helpers

export const FILTER_OPERATORS = [
  { value: "contains", label: "Contain" },
  { value: "not_contains", label: "Does not contain" },
  { value: "equal", label: "Equal" },
  { value: "not_equal", label: "Does not equal" },
  { value: "begins_with", label: "Begins with" },
  { value: "ends_with", label: "Ends With" },
  { value: "blank", label: "Blank" },
  { value: "not_blank", label: "Not blank" },
];

export const FILTER_DEFAULT = { operator: "contains", value: "" };
export const INPUT_FREE_OPERATORS = new Set(["blank", "not_blank"]);

export const ROW_HEIGHT_PX = 33;
export const HEADER_HEIGHT_PX = 37;
export const FIXED_TABLE_HEIGHT = ROW_HEIGHT_PX * 12 + HEADER_HEIGHT_PX;

export const DEFAULT_MIN_COLUMN_WIDTH_PX = 64;
export const DEFAULT_MAX_COLUMN_WIDTH_PX = 640;

export const toText = (value, fallback = "--") => {
  if (value === null || value === undefined) return fallback;
  const text = String(value).trim();
  return text === "" ? fallback : text;
};

export const normalize = (value) => String(value ?? "").toLowerCase().trim();
export const isEffectivelyBlank = (value) => {
  if (value === null || value === undefined) return true;
  const text = String(value).trim();
  if (text === "") return true;
  return text === "--" || text === "-";
};

export const passesColumnFilter = (rawValue, filter) => {
  const value = normalize(rawValue);
  const query = normalize(filter.value);

  switch (filter.operator) {
    case "contains":
      return query === "" ? true : value.includes(query);
    case "not_contains":
      return query === "" ? true : !value.includes(query);
    case "equal":
      return query === "" ? true : value === query;
    case "not_equal":
      return query === "" ? true : value !== query;
    case "begins_with":
      return query === "" ? true : value.startsWith(query);
    case "ends_with":
      return query === "" ? true : value.endsWith(query);
    case "blank":
      return isEffectivelyBlank(rawValue);
    case "not_blank":
      return !isEffectivelyBlank(rawValue);
    default:
      return true;
  }
};

export const defaultCell = (value) => toText(value);

export const normalizeFilterMap = (source = {}, schemaColumns = []) => {
  const next = {};
  schemaColumns.forEach((column) => {
    const filter = source?.[column.key] || FILTER_DEFAULT;
    next[column.key] = {
      operator: filter?.operator || FILTER_DEFAULT.operator,
      value: String(filter?.value || ""),
    };
  });
  return next;
};

export const isFilterStateActive = (filter) => {
  if (!filter) return false;
  if (filter.operator === "blank" || filter.operator === "not_blank") return true;
  return String(filter.value || "").trim() !== "";
};

import { Box } from "@mui/material";
import api from "@/shared/api/apiClient";

const TOTAL_ID = "__total__";
const isTotal = (row) => row?.id === TOTAL_ID;

const formatValue = (value, type) => {
  if (value === null || value === undefined || value === "") return "-";
  if (type === "text") {
    const text = String(value);
    return /^\d{4}-\d{2}-\d{2}[ T]/.test(text) ? text.slice(0, 10) : text; // A date-time shows as its date.
  }
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return type === "money"
    ? number.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : number.toLocaleString("en-IN", { maximumFractionDigits: type === "count" ? 0 : 3 });
};

/** Table columns for a server summary: S.No, the group, its extra details, then the totals (right-aligned). */
export function buildSummaryColumns(summary) {
  const bold = (row, content) => (isTotal(row) ? <Box component="span" sx={{ fontWeight: 700 }}>{content}</Box> : content);
  return [
    { key: "s_no", label: "S.No", valueGetter: (row) => (isTotal(row) ? "" : row.s_no), render: (value) => <Box sx={{ textAlign: "center" }}>{value}</Box> },
    { key: "label", label: summary.group_header || summary.layout_label, valueGetter: (row) => (isTotal(row) ? "Total" : row.label), render: (value, row) => bold(row, value) },
    ...(summary.columns || []).map((column) => ({
      key: column.key,
      label: column.label,
      valueGetter: (row) => row[column.key] ?? "",
      render: (value, row) => (column.type === "text"
        ? (isTotal(row) ? "" : formatValue(value, "text"))
        : <Box sx={{ textAlign: "right" }}>{bold(row, formatValue(value, column.type))}</Box>),
    })),
  ];
}

/** Summary rows with a Total row at the end (the server totals, so it is right even when the list is capped). */
export function buildSummaryRows(summary) {
  const rows = (summary.rows || []).map((row) => ({ ...row, id: `g_${row.s_no}` }));
  if (!rows.length) return rows;
  return [...rows, { id: TOTAL_ID, s_no: "", label: "Total", ...(summary.totals || {}) }];
}

/**
 * Runs one summary on the server: endpoint is the page's summary base (e.g. "/warehouse-reports/summary"), dataset and
 * layout come from the report, params are from/to plus anything the page adds. Resolves to what the page shows.
 */
export async function fetchSummary(endpoint, dataset, params) {
  const res = await api.get(`${endpoint}/${dataset}`, { params });
  const summary = res.data?.data || {};
  return {
    columns: buildSummaryColumns(summary),
    rows: buildSummaryRows(summary),
    label: summary.layout_label || params.layout,
    from: summary.from || null,
    to: summary.to || null,
    capped: Boolean(summary.capped),
  };
}

/** The summary layouts a page's datasets offer: { [dataset]: { dated, layouts: [{ value, label }] } }. */
export async function fetchSummaryLayouts(url) {
  const res = await api.get(url);
  return res.data?.data || {};
}

export const todayKey = () => new Date().toLocaleDateString("en-CA");
export const daysAgoKey = (days) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toLocaleDateString("en-CA");
};

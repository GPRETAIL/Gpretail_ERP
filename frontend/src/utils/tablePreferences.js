import api from "../api/axios";

export const fetchTablePreference = async (tableKey) => {
  if (!tableKey) return null;
  const res = await api.get(`/user-table-preferences/${encodeURIComponent(tableKey)}`);
  const data = res.data?.data;
  return {
    visibleColumns: data?.visible_columns || null,
    columnOrder: data?.column_order || null,
    pinnedColumnKeys: data?.pinned_column_keys || [],
    pinnedRightColumnKeys: data?.pinned_right_column_keys || [],
    columnWidths: data?.column_widths || {},
  };
};

// `layout` carries the newer per-column settings ({ pinnedRightColumnKeys, columnWidths });
// the server keeps whatever a caller leaves out, so older call shapes cannot wipe them.
export const saveTablePreference = async (tableKey, visibleColumns, columnOrder = null, pinnedColumnKeys = null, layout = null) => {
  if (!tableKey) return null;
  const payload = { visibleColumns };
  if (columnOrder) payload.columnOrder = columnOrder;
  if (pinnedColumnKeys) payload.pinnedColumnKeys = pinnedColumnKeys;
  if (layout?.pinnedRightColumnKeys) payload.pinnedRightColumnKeys = layout.pinnedRightColumnKeys;
  if (layout?.columnWidths) payload.columnWidths = layout.columnWidths;
  const res = await api.put(`/user-table-preferences/${encodeURIComponent(tableKey)}`, payload);
  return res.data?.data || null;
};

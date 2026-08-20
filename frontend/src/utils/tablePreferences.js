import api from "../api/axios";

export const fetchTablePreference = async (tableKey) => {
  if (!tableKey) return null;
  const res = await api.get(`/user-table-preferences/${encodeURIComponent(tableKey)}`);
  const data = res.data?.data;
  return {
    visibleColumns: data?.visible_columns || null,
    columnOrder: data?.column_order || null,
    pinnedColumnKeys: data?.pinned_column_keys || [],
  };
};

export const saveTablePreference = async (tableKey, visibleColumns, columnOrder = null, pinnedColumnKeys = null) => {
  if (!tableKey) return null;
  const payload = { visibleColumns };
  if (columnOrder) payload.columnOrder = columnOrder;
  if (pinnedColumnKeys) payload.pinnedColumnKeys = pinnedColumnKeys;
  const res = await api.put(`/user-table-preferences/${encodeURIComponent(tableKey)}`, payload);
  return res.data?.data || null;
};

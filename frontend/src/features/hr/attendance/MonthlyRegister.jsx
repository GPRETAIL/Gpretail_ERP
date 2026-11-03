import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Box, Stack, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { days, errorMessage } from "../utils/hrStatus";

const CODE_COLORS = { P: "success.main", HD: "warning.main", A: "error.main", L: "secondary.main", H: "info.main", WO: "text.disabled" };

/** Employee In/Out > Monthly register: a status code per day for every employee, with totals and payable days. */
export default function MonthlyRegister({ month, onMonthChange }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/attendance/monthly", { params: { month } });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load the register"));
    } finally {
      setLoading(false);
    }
  }, [month]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const grid = useSearchGrid({ sourceRows: data?.rows || [], paginationMode: "client", scopeKey: month });
  const columns = useMemo(() => {
    const dayColumns = Array.from({ length: data?.days_in_month || 0 }, (_, i) => i + 1).map((day) => ({
      key: `d${day}`, label: String(day), width: 38, valueGetter: (row) => row.days?.[day] || "",
      render: (value) => <Box component="span" sx={{ fontWeight: 700, color: CODE_COLORS[value] || "text.primary" }}>{value}</Box>,
    }));
    return [
      { key: "code", label: "Code", valueGetter: (row) => row.code },
      { key: "name", label: "Employee", valueGetter: (row) => row.name },
      ...dayColumns,
      { key: "present", label: "P", valueGetter: (row) => row.present },
      { key: "half_day", label: "HD", valueGetter: (row) => row.half_day },
      { key: "absent", label: "A", valueGetter: (row) => row.absent },
      { key: "leave", label: "L", valueGetter: (row) => row.leave },
      { key: "off", label: "Off", valueGetter: (row) => row.off },
      { key: "late", label: "Late", valueGetter: (row) => row.late },
      { key: "payable_days", label: "Payable days", valueGetter: (row) => row.payable_days, render: (value) => <b>{days(value)}</b> },
    ];
  }, [data?.days_in_month]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <TextField type="month" size="small" label="Month" value={month} onChange={(e) => { if (e.target.value) { setLoading(true); onMonthChange(e.target.value); } }}
          slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 170 }} />
        <Typography variant="caption" color="text.secondary">
          P present · HD half day · A absent · L leave · H holiday · WO weekly off. Payable days = present + half days ÷ 2 + leave + holidays and offs.
        </Typography>
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          key={data?.days_in_month || 0}
          rows={grid.rows}
          columns={columns}
          loading={loading}
          loadingText="Loading register..."
          emptyText="No employees."
          searchPlaceholder="Search employees..."
          tablePreferenceKey="hr.attendance.monthly"
          exportFileName={`attendance_register_${month}`}
          exportSheetName="Attendance"
          exportSubtitle={`Attendance register ${month}`}
          rowKey="employee_id"
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          enableColumnResize
          compact
        />
      </SearchGridPanel>
    </Box>
  );
}

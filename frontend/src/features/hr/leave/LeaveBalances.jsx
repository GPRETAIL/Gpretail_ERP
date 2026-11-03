import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Stack, Typography } from "@mui/material";
import { CalendarPlus } from "lucide-react";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { days, errorMessage } from "../utils/hrStatus";

/** Every employee's leave balance for the year, per leave type ("left / given"), with Allocate now for HR. */
export default function LeaveBalances({ year, canManage }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allocating, setAllocating] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api.get("/leave/balances", { params: { year } });
      setData(res.data?.data || null);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load balances"));
    } finally {
      setLoading(false);
    }
  }, [year]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const allocate = async () => {
    setAllocating(true);
    try {
      const res = await api.post("/leave-policies/allocate", { year });
      toast.success(res.data?.message || "Allocated");
      setLoading(true);
      await load();
    } catch (err) {
      toast.error(errorMessage(err, "Could not allocate leave"));
    } finally {
      setAllocating(false);
    }
  };

  const grid = useSearchGrid({ sourceRows: data?.rows || [], paginationMode: "client", scopeKey: String(year) });
  const columns = useMemo(() => [
    { key: "code", label: "Code", valueGetter: (row) => row.code || "" },
    { key: "name", label: "Employee", valueGetter: (row) => row.name },
    ...(data?.types || []).filter((type) => type.is_paid).map((type) => ({
      key: type.code, label: `${type.code} left / given`, valueGetter: (row) => row[type.code]?.balance ?? 0,
      render: (value, row) => <span><b>{days(value)}</b> / {days(row[type.code]?.allocated ?? 0)}</span>,
    })),
  ], [data?.types]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        <Typography variant="caption" color="text.secondary" sx={{ flex: 1 }}>
          Leave is credited on 1 January from each employee's leave policy (pro-rata for new joiners), with earned leave carried forward. Allocate now adds any credits still missing for {year}.
        </Typography>
        {canManage && <Button size="small" variant="outlined" startIcon={<CalendarPlus size={14} />} disabled={allocating} onClick={allocate}>{allocating ? "Allocating…" : `Allocate ${year}`}</Button>}
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          key={(data?.types || []).length}
          rows={grid.rows}
          columns={columns}
          loading={loading}
          emptyText="No employees."
          searchPlaceholder="Search employees..."
          tablePreferenceKey="hr.leave.balances"
          exportFileName={`leave_balances_${year}`}
          rowKey="employee_id"
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
        />
      </SearchGridPanel>
    </Box>
  );
}

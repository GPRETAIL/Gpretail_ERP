import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Chip, Dialog, DialogContent, DialogTitle, Stack, TextField } from "@mui/material";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { clockTime, errorMessage } from "../utils/hrStatus";

const SOURCES = { SELF: "Phone", MANAGER: "Manager", IMPORT: "Import" };

/** Employee In/Out > Punch log: every check-in and check-out, who recorded it and how far from the store. */
export default function PunchLog({ from, to, onRangeChange }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [photo, setPhoto] = useState(null); // { url, name }: the selfie being looked at

  const load = useCallback(async () => {
    try {
      const res = await api.get("/attendance/punches", { params: { from, to } });
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load the punch log"));
    } finally {
      setLoading(false);
    }
  }, [from, to]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  // The photo is private: it is fetched with the sign-in, shown here, and not kept as a link.
  const viewPhoto = useCallback(async (row) => {
    try {
      const res = await api.get(`/attendance/punches/${row.id}/photo`, { responseType: "blob" });
      setPhoto({ url: URL.createObjectURL(res.data), name: `${row.employee || ""} ${row.date} ${clockTime(row.time)}`.trim() });
    } catch (err) {
      toast.error(errorMessage(err, "Could not load the photo"));
    }
  }, []);
  const closePhoto = () => {
    if (photo) URL.revokeObjectURL(photo.url);
    setPhoto(null);
  };

  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: `${from}:${to}` });
  const columns = useMemo(() => [
    { key: "date", label: "Date", valueGetter: (row) => row.date },
    { key: "time", label: "Time", valueGetter: (row) => row.time, render: (value) => clockTime(value) },
    { key: "code", label: "Code", valueGetter: (row) => row.code || "" },
    { key: "employee", label: "Employee", valueGetter: (row) => row.employee || "" },
    { key: "type", label: "Punch", valueGetter: (row) => (row.type === "IN" ? "In" : "Out"), render: (value, row) => <Chip size="small" color={row.type === "IN" ? "success" : "default"} label={value} /> },
    { key: "source", label: "From", valueGetter: (row) => SOURCES[row.source] || row.source },
    { key: "distance_m", label: "Distance from store", valueGetter: (row) => row.distance_m ?? "", render: (value) => (value === "" ? "" : `${value} m`) },
    { key: "has_photo", label: "Photo", valueGetter: (row) => (row.has_photo ? "Yes" : ""), render: (value, row) => (row.has_photo ? <Button size="small" onClick={() => void viewPhoto(row)}>View photo</Button> : "") },
  ], [viewPhoto]);
  const setRange = (key, value) => { if (!value) return; setLoading(true); onRangeChange({ from, to, [key]: value }); };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1}>
        <TextField type="date" size="small" label="From" value={from} onChange={(e) => setRange("from", e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
        <TextField type="date" size="small" label="To" value={to} onChange={(e) => setRange("to", e.target.value)} slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          loadingText="Loading punches..."
          emptyText="No check-ins in this period."
          searchPlaceholder="Search punches..."
          tablePreferenceKey="hr.attendance.punches"
          exportFileName={`punch_log_${from}_${to}`}
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
        />
      </SearchGridPanel>
      <Dialog open={Boolean(photo)} onClose={closePhoto} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15 }}>{photo?.name}</DialogTitle>
        <DialogContent>{photo && <Box component="img" src={photo.url} alt={`Check-in photo, ${photo.name}`} sx={{ width: "100%", borderRadius: 1 }} />}</DialogContent>
      </Dialog>
    </Box>
  );
}

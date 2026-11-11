import { useCallback, useEffect, useState } from "react";
import { Box, FormControlLabel, Switch, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import { TYPE } from "@/shared/theme/typeScale";
import { post, useHrManager } from "../utils/hrApi";
import PinDialog from "./PinDialog";

/**
 * On the employee form, next to Contact No: whether this employee can use the staff app (/hr).
 * Turning it on asks for a starting PIN; it saves straight away, separate from the form's Save.
 */
export default function StaffAppSwitch({ employeeId }) {
  const hr = useHrManager();
  const [row, setRow] = useState(null);
  const [asking, setAsking] = useState(false);
  const load = useCallback(async () => {
    try {
      const rows = (await api.get("/staff-app-setup", { params: { employee_id: employeeId } })).data?.data || [];
      setRow(rows[0] || null);
    } catch {
      setRow(null);
    }
  }, [employeeId]);
  useEffect(() => {
    if (!employeeId || !hr) return undefined;
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [employeeId, hr, load]);

  if (!employeeId || !hr || !row) return null;
  const help = !row.phone_ok ? "Save a 10-digit Contact No first." : row.app_access ? (row.must_change_pin ? "On. Waiting for their first sign-in." : "On.") : "Off. Turn on to set a starting PIN.";
  return (
    <Box sx={{ gridColumn: { md: "1 / -1" }, display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
      <FormControlLabel
        control={<Switch size="small" checked={row.app_access} disabled={!row.phone_ok && !row.app_access}
          onChange={(e) => (e.target.checked ? setAsking(true) : post(`/staff-app-setup/${row.id}/disable`, {}, load))} />}
        label={<Typography sx={{ fontSize: TYPE.label, fontWeight: 600 }}>Staff app</Typography>} />
      <Typography sx={{ fontSize: TYPE.small, color: "text.secondary" }}>{help}</Typography>
      {asking && <PinDialog employee={row} onClose={() => setAsking(false)} onSaved={load} />}
    </Box>
  );
}

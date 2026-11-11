import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { LocateFixed } from "lucide-react";
import api from "@/shared/api/apiClient";
import { errorMessage } from "../utils/hrStatus";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";

const listOf = (payload) => (Array.isArray(payload) ? payload : Array.isArray(payload?.data) ? payload.data : []);

/**
 * The store's attendance rules: the default working hour (shift) for employees who have none, and the store's
 * location and radius; staff phone check-in is allowed only within that radius.
 */
export default function AttendanceSettingsDialog({ onClose }) {
  const [form, setForm] = useState(null);
  const [workingHours, setWorkingHours] = useState([]);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.all([api.get("/attendance/settings"), api.get("/hr-working-hours", { params: { limit: 200 } }).catch(() => ({ data: {} }))])
      .then(([settings, hours]) => {
        if (!active) return;
        const s = settings.data?.data || {};
        setForm({
          default_working_hour_id: s.default_working_hour_id ? String(s.default_working_hour_id) : "",
          shift_start: s.shift_start || "09:30", late_cutoff: s.late_cutoff || "10:00",
          lat: s.lat ?? "", lng: s.lng ?? "", radius_m: s.radius_m ?? 100,
        });
        setWorkingHours(listOf(hours.data?.data ?? hours.data));
      })
      .catch((err) => toast.error(errorMessage(err, "Could not load attendance settings")));
    return () => { active = false; };
  }, []);

  const set = (key) => (e) => setForm((prev) => ({ ...prev, [key]: e.target.value }));
  const useHere = () => {
    if (!navigator.geolocation) {
      toast.error("This browser can't share its location.");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => { setForm((prev) => ({ ...prev, lat: pos.coords.latitude.toFixed(6), lng: pos.coords.longitude.toFixed(6) })); setLocating(false); },
      () => { toast.error("Location permission was refused or unavailable."); setLocating(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };
  const save = async () => {
    setSaving(true);
    try {
      const fenced = form.lat !== "" && form.lng !== "";
      await api.put("/attendance/settings", {
        default_working_hour_id: form.default_working_hour_id ? Number(form.default_working_hour_id) : null,
        shift_start: form.shift_start, late_cutoff: form.late_cutoff,
        lat: fenced ? Number(form.lat) : null, lng: fenced ? Number(form.lng) : null, radius_m: fenced ? Number(form.radius_m) || 100 : null,
      });
      toast.success("Attendance settings saved");
      onClose(true);
    } catch (err) {
      toast.error(errorMessage(err, "Could not save attendance settings"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onClose={() => onClose(false)} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>Attendance settings</DialogTitle>
      <DialogContent>
        {!form ? <LoadingSkeleton variant="list" rows={5} label="Loading attendance settings" /> : (
          <Stack spacing={2} sx={{ pt: 1 }}>
            <Typography variant="subtitle2">Shift</Typography>
            <TextField select size="small" label="Default working hour" value={form.default_working_hour_id} onChange={set("default_working_hour_id")}
              helperText="For employees with no Working Hour on their record. Add working hours in HR Configuration > Working Hour.">
              <MenuItem value="">Use the times below</MenuItem>
              {workingHours.map((row) => <MenuItem key={row.id} value={String(row.id)}>{row.name}{row.from_time ? ` (${row.from_time}–${row.to_time})` : ""}</MenuItem>)}
            </TextField>
            {!form.default_working_hour_id && (
              <Stack direction="row" spacing={1.5}>
                <TextField type="time" size="small" label="Shift starts" value={form.shift_start} onChange={set("shift_start")} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
                <TextField type="time" size="small" label="Late after" value={form.late_cutoff} onChange={set("late_cutoff")} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
              </Stack>
            )}
            <Typography variant="subtitle2">Phone check-in location</Typography>
            <Alert severity="info" sx={{ py: 0 }}>Staff can check in from their phone only within this distance of the store. Leave the location empty to allow check-in anywhere.</Alert>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: "center" }}>
              <TextField size="small" label="Latitude" value={form.lat} onChange={set("lat")} fullWidth />
              <TextField size="small" label="Longitude" value={form.lng} onChange={set("lng")} fullWidth />
              <TextField type="number" size="small" label="Radius (m)" value={form.radius_m} onChange={set("radius_m")} sx={{ width: 140 }} />
            </Stack>
            <Stack direction="row" spacing={1}>
              <Button size="small" startIcon={<LocateFixed size={14} />} disabled={locating} onClick={useHere}>{locating ? "Finding location…" : "Use my current location"}</Button>
              {form.lat !== "" && <Button size="small" color="inherit" onClick={() => setForm((prev) => ({ ...prev, lat: "", lng: "" }))}>Clear location</Button>}
            </Stack>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(false)}>Cancel</Button>
        <Button variant="contained" disabled={!form || saving} onClick={save}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

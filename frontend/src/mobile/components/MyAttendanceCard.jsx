import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { LogIn, LogOut, MapPin } from "lucide-react";
import api from "@/shared/api/apiClient";
import { clockTime, duration, errorMessage, statusLabel } from "@/features/hr/utils/hrStatus";

const position = () => new Promise((resolve, reject) => {
  if (!navigator.geolocation) {
    reject(new Error("This phone can't share its location."));
    return;
  }
  navigator.geolocation.getCurrentPosition(
    (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
    () => reject(new Error("Allow location access to check in.")),
    { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
  );
});

/**
 * The signed-in employee's own check-in and check-out for today. When the store has a location set, the
 * phone's location goes with the punch and the server allows it only within the store's radius.
 */
export default function MyAttendanceCard() {
  const [data, setData] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const res = await api.get("/attendance/me");
      setData(res.data?.data || { employee: null });
    } catch {
      setData({ employee: null });
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const punch = async () => {
    setBusy(true);
    setError("");
    try {
      let coords = {};
      try {
        coords = await position();
      } catch (geoError) {
        if (data?.geofence) throw geoError; // Only required when the store has a location set.
      }
      await api.post("/attendance/self-punch", { type: data.next, ...coords });
      await load();
    } catch (err) {
      setError(err?.response ? errorMessage(err, "Could not record your attendance.") : err.message);
    } finally {
      setBusy(false);
    }
  };

  if (!data?.employee) return null; // Not linked to an employee record: nothing personal to show.
  const row = data.attendance;
  const checkingIn = data.next === "IN";
  return (
    <Box sx={{ p: 2, mb: 1.5, borderRadius: "20px", color: "#fff", background: "linear-gradient(135deg, #0f766e 0%, #0d9488 60%, #14b8a6 100%)", boxShadow: "0 8px 20px -8px rgba(13,148,136,0.6)" }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <Box>
          <Typography sx={{ fontSize: 10.5, fontWeight: 700, opacity: 0.8, textTransform: "uppercase", letterSpacing: "0.05em" }}>My attendance · {data.date}</Typography>
          <Typography sx={{ fontSize: 16, fontWeight: 900, mt: 0.25 }}>{data.employee.name}</Typography>
          <Typography sx={{ fontSize: 11, opacity: 0.85 }}>{data.shift?.name}: {data.shift?.start}–{data.shift?.end}</Typography>
        </Box>
        {row?.status && <Box sx={{ fontSize: 10.5, fontWeight: 800, px: 1, py: 0.5, borderRadius: 999, bgcolor: "rgba(255,255,255,0.2)" }}>{statusLabel(row.status)}</Box>}
      </Box>
      <Box sx={{ display: "flex", gap: 2, mt: 1.5, fontSize: 12, fontWeight: 700 }}>
        <span>In {row?.check_in ? clockTime(row.check_in) : "—"}</span>
        <span>Out {row?.check_out ? clockTime(row.check_out) : "—"}</span>
        {row?.late_minutes > 0 && <span style={{ color: "#fde68a" }}>Late {duration(row.late_minutes)}</span>}
        {row?.worked_minutes > 0 && <span>Worked {duration(row.worked_minutes)}</span>}
      </Box>
      <Box component="button" type="button" disabled={busy} onClick={punch}
        sx={{ mt: 1.5, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 1.4, borderRadius: "14px", border: 0,
          fontSize: 14, fontWeight: 900, bgcolor: "#fff", color: checkingIn ? "#0f766e" : "#1e293b", "&:active": { transform: "scale(0.98)" }, "&:disabled": { opacity: 0.6 } }}>
        {checkingIn ? <LogIn size={18} /> : <LogOut size={18} />}
        {busy ? "Getting location…" : checkingIn ? "Check in" : "Check out"}
      </Box>
      {data.geofence && (
        <Typography sx={{ fontSize: 10.5, opacity: 0.85, mt: 1, display: "flex", alignItems: "center", gap: 0.5 }}>
          <MapPin size={12} /> Check-in works within {data.geofence.radius_m} m of the store.
        </Typography>
      )}
      {error && <Box sx={{ mt: 1, p: 1, borderRadius: "10px", bgcolor: "rgba(127,29,29,0.85)", fontSize: 11.5, fontWeight: 700 }}>{error}</Box>}
    </Box>
  );
}

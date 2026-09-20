import { useEffect, useState } from "react";
import { XMarkIcon } from "@heroicons/react/24/outline";
import { useDispatch, useSelector } from "react-redux";
import { toast } from "react-toastify";
import { Box, Button, IconButton, MenuItem, TextField, Typography } from "@mui/material";
import api from "../api/axios";
import { loginSuccess } from "../features/authSlice";

/**
 * Shared "Assign a Counter" dialog -- the same modal Navbar's profile menu opens, extracted so POS
 * pages (POS Sale, POS Old, Touch Sales) can also pop it automatically when a user without a
 * counter assigned opens them, instead of only failing later when they try to save a sale.
 */
export default function CounterAssignmentDialog({ open, onClose, onAssigned }) {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);
  const token = useSelector((state) => state.auth.token);
  const [counterOptions, setCounterOptions] = useState([]);
  const [selectedCounterId, setSelectedCounterId] = useState("");
  const [loadingCounters, setLoadingCounters] = useState(false);
  const [savingCounterAssignment, setSavingCounterAssignment] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedCounterId(user?.counter_id ? String(user.counter_id) : "");
    let cancelled = false;
    const loadCounters = async () => {
      setLoadingCounters(true);
      try {
        const role = String(user?.role || "").trim().toLowerCase();
        const isRestrictedRole = role === "admin" || role === "user";
        const companyId = user?.company_id || user?.companyId;
        const res = await api.get("/configurations/counter", {
          params: isRestrictedRole && companyId ? { company_id: companyId } : undefined,
        });
        if (cancelled) return;
        const rows = Array.isArray(res.data?.data) ? res.data.data : [];
        setCounterOptions(
          rows.map((row) => ({
            value: String(row.id),
            label: String(row.name || "").trim() || `Counter ${row.id}`,
          }))
        );
      } catch {
        if (!cancelled) toast.error("Failed to load counters");
      } finally {
        if (!cancelled) setLoadingCounters(false);
      }
    };
    loadCounters();
    return () => {
      cancelled = true;
    };
  }, [open, user?.counter_id, user?.role, user?.company_id, user?.companyId]);

  if (!open) return null;

  const handleSave = async () => {
    if (!selectedCounterId) {
      toast.error("Counter is required");
      return;
    }
    setSavingCounterAssignment(true);
    try {
      const res = await api.post("/auth/counter", { counterId: selectedCounterId });
      const payload = res.data?.data;
      const updatedUser = payload?.user || payload;
      const refreshedToken = payload?.token || token;
      if (!updatedUser) {
        throw new Error("Invalid counter assignment response");
      }
      dispatch(loginSuccess({ token: refreshedToken, user: updatedUser }));
      toast.success("Counter assigned");
      onAssigned?.(updatedUser);
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "Failed to assign counter");
    } finally {
      setSavingCounterAssignment(false);
    }
  };

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 120, bgcolor: "rgba(0,0,0,0.3)", display: "flex", alignItems: "center", justifyContent: "center", p: 2 }}>
      <Box sx={{ width: "100%", maxWidth: 512, borderRadius: 3, bgcolor: "background.paper", boxShadow: 8, border: "1px solid", borderColor: "divider", overflow: "hidden" }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 1.5, px: 2.5, py: 2, borderBottom: 1, borderColor: "divider" }}>
          <Box>
            <Typography component="h2" sx={{ fontSize: 16, fontWeight: 600, color: "text.primary" }}>
              Assign a Counter
            </Typography>
            <Typography sx={{ mt: 0.5, fontSize: 14, color: "text.secondary" }}>
              Select the counter you're working from before ringing up sales.
            </Typography>
          </Box>
          <IconButton onClick={onClose} aria-label="Close counter dialog" size="small" sx={{ color: "text.secondary" }}>
            <XMarkIcon style={{ width: 20, height: 20 }} />
          </IconButton>
        </Box>

        <Box sx={{ px: 2.5, py: 2 }}>
          {loadingCounters ? (
            <Box sx={{ borderRadius: 2, border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 2, py: 1.5, fontSize: 14, color: "text.secondary" }}>
              Loading counters...
            </Box>
          ) : (
            <TextField
              select
              label="Counter"
              value={selectedCounterId}
              onChange={(event) => setSelectedCounterId(event.target.value)}
              fullWidth
              size="small"
              slotProps={{ inputLabel: { shrink: true } }}
            >
              <MenuItem value="">Select counter</MenuItem>
              {counterOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>
          )}
        </Box>

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 1.5, px: 2.5, py: 2, borderTop: 1, borderColor: "divider", bgcolor: "action.hover" }}>
          <Button
            onClick={onClose}
            variant="outlined"
            sx={{ textTransform: "none", borderColor: "divider", color: "text.secondary" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={loadingCounters || savingCounterAssignment}
            variant="contained"
            sx={{ textTransform: "none" }}
          >
            {savingCounterAssignment ? "Saving..." : "Save"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}

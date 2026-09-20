import React, { useState } from "react";
import { ShieldCheck, Loader2, Lock } from "lucide-react";
import { Alert, Box, Button, Card, Stack, TextField, Typography, useTheme } from "@mui/material";
import api from "../api/axios";

// Shown (blocking, over the whole app) right after a company super-admin's FIRST login with the
// admin-set password: must_change_password=true. They set their own password before using the app.
// Authenticated by the session token (api adds it); on success we clear the flag and reload.
// NOTE: render as <Shell>…</Shell> — calling Shell(...) as a function passes the JSX as `props`, so
// `{ children }` reads undefined and the card body (all fields) vanishes.
const Shell = ({ children }) => {
  const theme = useTheme();
  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", px: 2 }}>
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 448, p: 4, borderRadius: 3, boxShadow: 3 }}>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1.5, mb: 3 }}>
          <ShieldCheck size={32} style={{ color: theme.palette.mode === "dark" ? "#6a9bd1" : "#3a6ea5" }} />
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.25em", color: "text.secondary", display: "block" }}>
              Vynerix
            </Typography>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: "text.primary" }}>
              Set a new password
            </Typography>
          </Box>
        </Stack>
        {children}
      </Card>
    </Box>
  );
};

const ForceChangePassword = () => {
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (pw.password.length < 8) return setError("Password must be at least 8 characters.");
    if (pw.password !== pw.confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      await api.post("/auth/change-password", { newPassword: pw.password });
      // Clear the flag locally and reload so /auth/me refreshes and the app proceeds.
      try {
        const u = JSON.parse(localStorage.getItem("user") || "{}");
        u.must_change_password = false;
        localStorage.setItem("user", JSON.stringify(u));
      } catch {
        /* ignore */
      }
      // A first-login reset leads into activation, not the dashboard: an unactivated deployment has
      // no data to show, so landing on "/" left the customer on an empty app with no hint that
      // Company ID / OTP / Client ID were still required.
      //
      // Falls back to "/" if the check itself fails -- being sent to the dashboard is recoverable,
      // being trapped on an activation page for an already-activated deployment is not.
      let next = "/";
      try {
        const res = await api.get("/activation/status");
        if (res.data?.data?.activated === false) next = "/activate";
      } catch {
        /* keep "/" */
      }
      window.location.href = next;
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data?.detail || "Could not set the password. Try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Shell>
      <Typography variant="body2" sx={{ mb: 2.5, color: "text.secondary" }}>
        For security, set your own password before continuing. You won't be asked again.
      </Typography>
      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}
      <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }} onSubmit={submit}>
        <TextField
          type="password"
          label="New password"
          value={pw.password}
          onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))}
          placeholder="At least 8 characters"
          size="small"
          autoFocus
        />
        <TextField
          type="password"
          label="Confirm password"
          value={pw.confirm}
          onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
          placeholder="Re-enter password"
          size="small"
        />
        <Button
          type="submit"
          disabled={busy}
          variant="contained"
          startIcon={busy ? <Loader2 size={16} style={{ animation: "app-spin 1s linear infinite" }} /> : <Lock size={16} />}
          sx={{
            py: 1.25,
            bgcolor: "#3a6ea5",
            fontWeight: 600,
            textTransform: "none",
            "&:hover": { bgcolor: "#345f8f" },
            borderRadius: 2,
          }}
        >
          {busy ? "Saving…" : "Set password & continue"}
        </Button>
      </Box>
    </Shell>
  );
};

export default ForceChangePassword;

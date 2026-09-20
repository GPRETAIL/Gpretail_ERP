import React, { useState } from "react";
import { ShieldCheck, Loader2, CheckCircle2, Lock, KeyRound } from "lucide-react";
import { Alert, Box, Button, Card, Stack, TextField, Typography, useTheme } from "@mui/material";

// PUBLIC self-service "Set / forgot your password?" page (/set-password), linked from the login page.
// For a company super-admin whose account was created WITHOUT a password (or provisioned by the
// activation handshake): enter the email, and if no password is set yet, set one here. Accounts that
// already have a password can't reset here — they need an admin-issued reset link. Uses fetch (not the
// axios instance) so it works with no session and never triggers the app's session-expired redirect.

// Hoisted to module scope so the form doesn't remount (and steal focus) on every keystroke. Rendered
// as a component (<Shell>…</Shell>) — NOT called as Shell(...), which would pass the JSX as `props`
// and drop `children`, leaving the card body (all the form fields) blank.
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
              Set your password
            </Typography>
          </Box>
        </Stack>
        {children}
      </Card>
    </Box>
  );
};

const SetPassword = () => {
  const theme = useTheme();
  const [phase, setPhase] = useState("email"); // email | password | done | nofix
  const [email, setEmail] = useState("");
  const [setupToken, setSetupToken] = useState("");
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checkEmail = async (event) => {
    event.preventDefault();
    setError("");
    if (!email.trim()) return setError("Enter your company email.");
    setBusy(true);
    try {
      const res = await fetch("/api/activation/password-setup-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      const body = await res.json().catch(() => ({}));
      const d = body?.data || {};
      if (res.ok && d.needsSetup && d.setupToken) {
        setSetupToken(d.setupToken);
        setPhase("password");
        return;
      }
      setPhase("nofix");
    } catch {
      setError("Cannot reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const submitPw = async (event) => {
    event.preventDefault();
    setError("");
    if (pw.password.length < 8) return setError("Password must be at least 8 characters.");
    if (pw.password !== pw.confirm) return setError("Passwords do not match.");
    setBusy(true);
    try {
      const res = await fetch("/api/activation/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken, password: pw.password }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.success) {
        setPhase("done");
        return;
      }
      setError(body?.message || "Could not set the password. The setup window may have expired — start again.");
    } catch {
      setError("Cannot reach the server. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  if (phase === "done") {
    return (
      <Shell>
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 1.5, textAlign: "center" }}>
          <CheckCircle2 size={48} style={{ marginBottom: 12, color: theme.palette.mode === "dark" ? "#34d399" : "#10b981" }} />
          <Typography variant="body2" sx={{ mb: 2, color: "text.secondary" }}>
            Your password is set. You can sign in now.
          </Typography>
          <Button
            component="a"
            href="/login"
            variant="contained"
            sx={{
              bgcolor: "#3a6ea5",
              fontWeight: 600,
              textTransform: "none",
              "&:hover": { bgcolor: "#345f8f" },
              borderRadius: 2,
              px: 2.5,
              py: 1,
            }}
          >
            Go to sign in
          </Button>
        </Box>
      </Shell>
    );
  }

  if (phase === "nofix") {
    return (
      <Shell>
        <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
          This account already has a password, or the email isn't recognized. If you've forgotten your
          password, ask your Vynerix administrator to send you a reset link.
        </Alert>
        <Box component="a" href="/login" sx={{ fontSize: "0.875rem", fontWeight: 600, color: "#3a6ea5", "&:hover": { textDecoration: "underline" } }}>← Back to sign in</Box>
      </Shell>
    );
  }

  if (phase === "password") {
    return (
      <Shell>
        <Typography variant="body2" sx={{ mb: 2.5, color: "text.secondary" }}>
          Set a password for <b>{email}</b> to finish and sign in.
        </Typography>
        {error ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {error}
          </Alert>
        ) : null}
        <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }} onSubmit={submitPw}>
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
  }

  return (
    <Shell>
      <Typography variant="body2" sx={{ mb: 2.5, color: "text.secondary" }}>
        Enter your company email. If your account hasn't been given a password yet, you can set one here.
      </Typography>
      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}
      <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }} onSubmit={checkEmail}>
        <TextField
          type="email"
          label="Company email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          size="small"
          autoFocus
        />
        <Button
          type="submit"
          disabled={busy}
          variant="contained"
          startIcon={busy ? <Loader2 size={16} style={{ animation: "app-spin 1s linear infinite" }} /> : <KeyRound size={16} />}
          sx={{
            py: 1.25,
            bgcolor: "#3a6ea5",
            fontWeight: 600,
            textTransform: "none",
            "&:hover": { bgcolor: "#345f8f" },
            borderRadius: 2,
          }}
        >
          {busy ? "Checking…" : "Continue"}
        </Button>
      </Box>
      <Typography variant="caption" sx={{ mt: 2, display: "block", textAlign: "center" }}>
        <Box component="a" href="/login" sx={{ fontSize: "0.75rem", color: "text.disabled", "&:hover": { color: "text.secondary" } }}>← Back to sign in</Box>
      </Typography>
    </Shell>
  );
};

export default SetPassword;

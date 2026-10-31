import React, { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Loader2, CheckCircle2, Circle, Lock } from "lucide-react";
import { Alert, Box, Card, Stack, Typography, Button, TextField, useTheme } from "@mui/material";
import { alpha } from "@mui/material/styles";

// First-login setup tokens stay in component memory and authorize only installation activation.
// They are never stored or used as ERP business sessions.

const STEPS = [
  { key: "connect", label: "Connecting to Vynerix control plane" },
  { key: "download", label: "Downloading your configuration" },
  { key: "apply", label: "Applying subscription, limits & settings" },
  { key: "done", label: "Activation complete" },
];

const ActivationWizard = ({ onActivated, setup, onCancel }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [form, setForm] = useState({ licenseKey: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [phase, setPhase] = useState("form"); // "form" | "success" | "password" | "done"
  const [stepIdx, setStepIdx] = useState(0);
  const [activation, setActivation] = useState(null); // { needsPassword, adminEmail, setupToken }

  // Password-setup step state.
  const [pw, setPw] = useState({ password: "", confirm: "" });
  const [pwBusy, setPwBusy] = useState(false);
  const [pwError, setPwError] = useState("");

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setPwField = (key) => (e) => setPw((p) => ({ ...p, [key]: e.target.value }));

  const submit = async (event) => {
    event.preventDefault();
    setError("");

    const payload = {};
    if (!setup) {
      if (!form.licenseKey.trim()) {
        setError("Please enter your setup key.");
        return;
      }
      payload.license_key = form.licenseKey.trim();
    }

    setBusy(true);
    try {
      const res = await fetch(setup ? "/api/activation/bootstrap-register" : "/api/activation/register", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(setup ? { Authorization: `Bearer ${setup.setup_token}` } : {}) },
        body: JSON.stringify(payload),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.success) {
        setActivation(body?.data || null); // needsPassword / adminEmail / setupToken
        setStepIdx(0);
        setPhase("success"); // hand off to the stepped success screen
        return;
      }
      setError(body?.message || "Activation failed. Check your details and try again.");
    } catch {
      setError("Cannot reach the activation service. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  // Advance the success steps one by one, then either collect the admin password or go to sign-in.
  useEffect(() => {
    if (phase !== "success") return undefined;
    if (stepIdx >= STEPS.length) {
      const needsPassword = activation?.needsPassword && activation?.setupToken;
      const t = setTimeout(() => (needsPassword ? setPhase("password") : onActivated?.()), 1100);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setStepIdx((i) => i + 1), 900);
    return () => clearTimeout(t);
  }, [phase, stepIdx, activation, onActivated]);

  const submitPassword = async (event) => {
    event.preventDefault();
    setPwError("");
    if (pw.password.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    if (pw.password !== pw.confirm) {
      setPwError("Passwords do not match.");
      return;
    }
    setPwBusy(true);
    try {
      const res = await fetch("/api/activation/set-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ setupToken: activation.setupToken, password: pw.password }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.ok && body?.success) {
        setPhase("done");
        setTimeout(() => onActivated?.(), 1400);
        return;
      }
      setPwError(body?.message || "Could not set your password. The setup link may have expired.");
    } catch {
      setPwError("Cannot reach the activation service. Check your connection and try again.");
    } finally {
      setPwBusy(false);
    }
  };

  const heading = {
    form: "Activate this deployment",
    success: "Activating your deployment",
    password: "Create your admin password",
    done: "You're all set",
  }[phase];

  const shell = (children) => (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", px: 2 }}>
      <Card
        variant="outlined"
        sx={{ borderColor: "divider", borderRadius: 2, width: "100%", maxWidth: 448, p: 4, boxShadow: 6 }}
      >
        <Stack direction="row" spacing={1.5} sx={{ mb: 3, alignItems: "center" }}>
          <ShieldCheck size={32} style={{ color: isDark ? "#6a9bd1" : "#3a6ea5" }} />
          <Box>
            <Typography variant="caption" component="p" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.25em", color: "text.secondary" }}>
              Vynerix
            </Typography>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: "text.primary" }}>
              {heading}
            </Typography>
          </Box>
        </Stack>
        {setup && phase === "form" && <Alert severity="info" sx={{ mb: 2 }}>Company verified: {setup.company_name}. Continue to download your company configuration. No Client ID, OTP or setup key is needed. Business access starts after activation and sign-in.</Alert>}
        {children}
        {onCancel && phase === "form" && <Button onClick={onCancel} disabled={busy} sx={{ mt: 2 }}>Return to login</Button>}
      </Card>
    </Box>
  );

  if (phase === "done") {
    return shell(
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 1.5, textAlign: "center" }}>
        <CheckCircle2 size={48} style={{ marginBottom: 12, color: isDark ? "#34d399" : "#10b981" }} />
        <Typography variant="body2" sx={{ color: "text.secondary" }}>
          Your administrator account is ready. Redirecting you to sign in…
        </Typography>
      </Box>,
    );
  }

  if (phase === "password") {
    return shell(
      <>
        <Typography variant="body2" sx={{ mb: 2.5, color: "text.secondary" }}>
          Activation succeeded. Set a password for your administrator account to finish and sign in.
        </Typography>
        {pwError ? (
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            {pwError}
          </Alert>
        ) : null}
        <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }} onSubmit={submitPassword}>
          <TextField
            label="Administrator email"
            value={activation?.adminEmail || ""}
            size="small"
            slotProps={{ input: { readOnly: true } }}
          />
          <TextField
            type="password"
            label="New password"
            value={pw.password}
            onChange={setPwField("password")}
            placeholder="At least 8 characters"
            size="small"
            autoFocus
          />
          <TextField
            type="password"
            label="Confirm password"
            value={pw.confirm}
            onChange={setPwField("confirm")}
            placeholder="Re-enter password"
            size="small"
          />
          <Button
            type="submit"
            disabled={pwBusy}
            variant="contained"
            disableElevation
            startIcon={pwBusy ? <Loader2 size={16} style={{ animation: "app-spin 1s linear infinite" }} /> : <Lock size={16} />}
            sx={{ py: 1.25, bgcolor: "#3a6ea5", fontWeight: 600, textTransform: "none", "&:hover": { bgcolor: "#345f8f" }, borderRadius: 2 }}
          >
            {pwBusy ? "Saving…" : "Set password & continue"}
          </Button>
        </Box>
      </>,
    );
  }

  if (phase === "success") {
    const allDone = stepIdx >= STEPS.length;
    const willSetPassword = activation?.needsPassword && activation?.setupToken;
    return shell(
      <>
        <Typography variant="body2" sx={{ mb: 3, color: "text.secondary" }}>
          Your credentials were accepted. Setting up your workspace…
        </Typography>
        <Stack component="ul" spacing={1.75} sx={{ listStyle: "none", p: 0, m: 0 }}>
          {STEPS.map((s, idx) => {
            const state = idx < stepIdx ? "done" : idx === stepIdx ? "active" : "pending";
            return (
              <Stack component="li" direction="row" key={s.key} spacing={1.5} sx={{ alignItems: "center" }}>
                {state === "done" ? (
                  <CheckCircle2 size={20} style={{ flexShrink: 0, color: isDark ? "#34d399" : "#10b981" }} />
                ) : state === "active" ? (
                  <Loader2 size={20} style={{ flexShrink: 0, animation: "app-spin 1s linear infinite", color: isDark ? "#6a9bd1" : "#3a6ea5" }} />
                ) : (
                  <Circle size={20} style={{ flexShrink: 0, color: isDark ? "#4b5563" : "#cbd5e1" }} />
                )}
                <Typography
                  variant="body2"
                  sx={{
                    color: state === "pending" ? "text.disabled" : "text.primary",
                    fontWeight: state === "active" ? 500 : 400,
                  }}
                >
                  {s.label}
                </Typography>
              </Stack>
            );
          })}
        </Stack>
        {allDone ? (
          <Stack direction="row" spacing={1} sx={{ mt: 3, alignItems: "center", borderRadius: 2, bgcolor: (theme) => alpha(theme.palette.success.main, theme.palette.mode === "dark" ? 0.16 : 0.08), px: 2, py: 1.5 }}>
            <CheckCircle2 size={16} style={{ flexShrink: 0, color: isDark ? "#34d399" : "#10b981" }} />
            <Typography variant="body2" sx={{ color: "success.dark" }}>{willSetPassword ? "Almost there — let's secure your admin account…" : "All set! Redirecting you to sign in…"}</Typography>
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ mt: 3, display: "block", textAlign: "center", color: "text.disabled" }}>Please keep this window open…</Typography>
        )}
      </>,
    );
  }

  return shell(
    <>
      <Typography variant="body2" sx={{ mb: 2.5, color: "text.secondary" }}>
        {setup ? "Your company credentials have been verified. Continue to set up this installation."
          : "Enter the company setup key supplied by your administrator, or return to login and use your welcome-email credentials."}
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }} onSubmit={submit}>
        {!setup && <TextField
          label="License Key or Setup Code"
          value={form.licenseKey}
          onChange={set("licenseKey")}
          size="small"
          autoFocus
          helperText="Alternatively, return to login and sign in with your company welcome-email credentials."
        />}

        <Button
          type="submit"
          disabled={busy}
          variant="contained"
          disableElevation
          startIcon={busy ? <Loader2 size={16} style={{ animation: "app-spin 1s linear infinite" }} /> : <KeyRound size={16} />}
          sx={{ py: 1.25, bgcolor: "#3a6ea5", fontWeight: 600, textTransform: "none", "&:hover": { bgcolor: "#345f8f" }, borderRadius: 2 }}
        >
          {busy ? "Activating…" : "Activate deployment"}
        </Button>

      </Box>
      <Typography variant="caption" sx={{ mt: 2, display: "block", textAlign: "center", color: "text.disabled" }}>
        Need a new license or trial extension? Contact your Gpretail administrator.
      </Typography>
    </>,
  );
};

export default ActivationWizard;

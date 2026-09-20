import React, { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, Loader2, CheckCircle2, Circle, Lock } from "lucide-react";
import { Alert, Box, Card, Stack, Typography, Button, TextField } from "@mui/material";
import { alpha } from "@mui/material/styles";

// Tenant activation wizard. Shown before anyone can log in, while this deployment is in
// "Activation Required" mode. Collects Company ID + Client ID + Activation Code (OTP) and calls the
// public /api/activation/register, which handshakes with VX-Admin and pulls the first snapshot
// (owner details, subscription status, expiry, entitlements) and provisions the tenant super-admin.
// Uses fetch (not the axios instance) so a 401 "invalid credentials" is shown inline instead of
// triggering the app's session-expired redirect.
//
// Flow: form → stepped success (connect → download → apply → done) → (if a fresh super-admin was
// provisioned) set-password → hand off to login. The register call did the sync work synchronously,
// so the steps reflect the real outcome; set-password uses the short-lived setup token it returned.

const STEPS = [
  { key: "connect", label: "Connecting to Vynerix control plane" },
  { key: "download", label: "Downloading your configuration" },
  { key: "apply", label: "Applying subscription, limits & settings" },
  { key: "done", label: "Activation complete" },
];

const ActivationWizard = ({ onActivated }) => {
  const [form, setForm] = useState({ companyId: "", clientId: "", activationCode: "" });
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
    if (!form.companyId.trim() || !form.clientId.trim() || !form.activationCode.trim()) {
      setError("Enter your Company ID, Client ID and Activation Code.");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/activation/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // ActivationController::register() validates snake_case and marks one_time_password
          // required -- sending camelCase here meant that field never arrived, so every real
          // activation attempt through this form failed validation regardless of credentials.
          company_code: form.companyId.trim(),
          client_id: form.clientId.trim(),
          one_time_password: form.activationCode.trim(),
        }),
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
          <ShieldCheck className="h-8 w-8 text-[#3a6ea5] dark:text-[#6a9bd1]" />
          <Box>
            <Typography variant="caption" component="p" sx={{ fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.25em", color: "text.secondary" }}>
              Vynerix
            </Typography>
            <Typography variant="h5" component="h1" sx={{ fontWeight: 700, color: "text.primary" }}>
              {heading}
            </Typography>
          </Box>
        </Stack>
        {children}
      </Card>
    </Box>
  );

  if (phase === "done") {
    return shell(
      <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", py: 1.5, textAlign: "center" }}>
        <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500 dark:text-emerald-400" />
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
            startIcon={pwBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
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
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                ) : state === "active" ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#3a6ea5] dark:text-[#6a9bd1]" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-slate-300 dark:text-gray-600" />
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
            <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500 dark:text-emerald-400" />
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
        This system needs activation before it can be used. Enter the details from your Vynerix
        welcome email. Your company's configuration will be downloaded automatically.
      </Typography>

      {error ? (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {error}
        </Alert>
      ) : null}

      <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: 2 }} onSubmit={submit}>
        <TextField label="Company ID" value={form.companyId} onChange={set("companyId")} placeholder="e.g. CMP-16" size="small" autoFocus />
        <TextField
          label="Client ID"
          value={form.clientId}
          onChange={set("clientId")}
          placeholder="From your welcome email"
          size="small"
          sx={{ "& .MuiInputBase-input": { fontFamily: "monospace", fontSize: "0.75rem" } }}
        />
        <TextField
          label="Activation Code (One-Time Password)"
          value={form.activationCode}
          onChange={set("activationCode")}
          placeholder="One-time password"
          size="small"
          sx={{ "& .MuiInputBase-input": { fontFamily: "monospace" } }}
        />
        <Button
          type="submit"
          disabled={busy}
          variant="contained"
          disableElevation
          startIcon={busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
          sx={{ py: 1.25, bgcolor: "#3a6ea5", fontWeight: 600, textTransform: "none", "&:hover": { bgcolor: "#345f8f" }, borderRadius: 2 }}
        >
          {busy ? "Activating…" : "Activate"}
        </Button>
      </Box>
      <Typography variant="caption" sx={{ mt: 2, display: "block", textAlign: "center", color: "text.disabled" }}>
        The activation code can be used once. If it fails, ask your Vynerix administrator to re-issue it.
      </Typography>
    </>,
  );
};

export default ActivationWizard;

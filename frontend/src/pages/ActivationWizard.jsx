import React, { useEffect, useState } from "react";
import { KeyRound, ShieldCheck, AlertTriangle, Loader2, CheckCircle2, Circle, Lock } from "lucide-react";

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
          companyCode: form.companyId.trim(),
          clientId: form.clientId.trim(),
          oneTimePassword: form.activationCode.trim(),
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

  const input =
    "w-full rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:border-[#3a6ea5] focus:ring-1 focus:ring-[#3a6ea5] focus:outline-none";

  const heading = {
    form: "Activate this deployment",
    success: "Activating your deployment",
    password: "Create your admin password",
    done: "You're all set",
  }[phase];

  const shell = (children) => (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-gray-900 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-xl">
        <div className="mb-6 flex items-center gap-3">
          <ShieldCheck className="h-8 w-8 text-[#3a6ea5] dark:text-[#6a9bd1]" />
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-gray-400">Vynerix</p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">{heading}</h1>
          </div>
        </div>
        {children}
      </div>
    </div>
  );

  if (phase === "done") {
    return shell(
      <div className="flex flex-col items-center py-4 text-center">
        <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500 dark:text-emerald-400" />
        <p className="text-sm text-slate-600 dark:text-gray-300">
          Your administrator account is ready. Redirecting you to sign in…
        </p>
      </div>,
    );
  }

  if (phase === "password") {
    return shell(
      <>
        <p className="mb-5 text-sm text-slate-500 dark:text-gray-400">
          Activation succeeded. Set a password for your administrator account to finish and sign in.
        </p>
        {pwError ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{pwError}</span>
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={submitPassword}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-gray-300">Administrator email</label>
            <input value={activation?.adminEmail || ""} readOnly className={`${input} bg-slate-50 dark:bg-gray-800 text-slate-500 dark:text-gray-400`} />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-gray-300">New password</label>
            <input
              type="password"
              value={pw.password}
              onChange={setPwField("password")}
              placeholder="At least 8 characters"
              className={input}
              autoFocus
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-gray-300">Confirm password</label>
            <input
              type="password"
              value={pw.confirm}
              onChange={setPwField("confirm")}
              placeholder="Re-enter password"
              className={input}
            />
          </div>
          <button
            type="submit"
            disabled={pwBusy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3a6ea5] py-2.5 text-sm font-semibold text-white hover:bg-[#345f8f] disabled:opacity-60"
          >
            {pwBusy ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Lock className="h-4 w-4" /> Set password & continue</>
            )}
          </button>
        </form>
      </>,
    );
  }

  if (phase === "success") {
    const allDone = stepIdx >= STEPS.length;
    const willSetPassword = activation?.needsPassword && activation?.setupToken;
    return shell(
      <>
        <p className="mb-6 text-sm text-slate-500 dark:text-gray-400">
          Your credentials were accepted. Setting up your workspace…
        </p>
        <ul className="space-y-3.5">
          {STEPS.map((s, idx) => {
            const state = idx < stepIdx ? "done" : idx === stepIdx ? "active" : "pending";
            return (
              <li key={s.key} className="flex items-center gap-3">
                {state === "done" ? (
                  <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500 dark:text-emerald-400" />
                ) : state === "active" ? (
                  <Loader2 className="h-5 w-5 shrink-0 animate-spin text-[#3a6ea5] dark:text-[#6a9bd1]" />
                ) : (
                  <Circle className="h-5 w-5 shrink-0 text-slate-300 dark:text-gray-600" />
                )}
                <span
                  className={`text-sm ${
                    state === "pending" ? "text-slate-400 dark:text-gray-500" : "text-slate-700 dark:text-gray-200"
                  } ${state === "active" ? "font-medium" : ""}`}
                >
                  {s.label}
                </span>
              </li>
            );
          })}
        </ul>
        {allDone ? (
          <div className="mt-6 flex items-center gap-2 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{willSetPassword ? "Almost there — let's secure your admin account…" : "All set! Redirecting you to sign in…"}</span>
          </div>
        ) : (
          <p className="mt-6 text-center text-xs text-slate-400 dark:text-gray-500">Please keep this window open…</p>
        )}
      </>,
    );
  }

  return shell(
    <>
      <p className="mb-5 text-sm text-slate-500 dark:text-gray-400">
        This system needs activation before it can be used. Enter the details from your Vynerix
        welcome email. Your company's configuration will be downloaded automatically.
      </p>

      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}

      <form className="space-y-4" onSubmit={submit}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-gray-300">Company ID</label>
          <input value={form.companyId} onChange={set("companyId")} placeholder="e.g. CMP-16" className={input} autoFocus />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-gray-300">Client ID</label>
          <input value={form.clientId} onChange={set("clientId")} placeholder="From your welcome email" className={`${input} font-mono text-xs`} />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-gray-300">Activation Code (One-Time Password)</label>
          <input value={form.activationCode} onChange={set("activationCode")} placeholder="One-time password" className={`${input} font-mono`} />
        </div>
        <button type="submit" disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3a6ea5] py-2.5 text-sm font-semibold text-white hover:bg-[#345f8f] disabled:opacity-60">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Activating…</> : <><KeyRound className="h-4 w-4" /> Activate</>}
        </button>
      </form>
      <p className="mt-4 text-center text-xs text-slate-400 dark:text-gray-500">
        The activation code can be used once. If it fails, ask your Vynerix administrator to re-issue it.
      </p>
    </>,
  );
};

export default ActivationWizard;

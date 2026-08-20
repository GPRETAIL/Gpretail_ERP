import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, Loader2, CheckCircle2, Lock, KeyRound } from "lucide-react";

// PUBLIC self-service "Set / forgot your password?" page (/set-password), linked from the login page.
// For a company super-admin whose account was created WITHOUT a password (or provisioned by the
// activation handshake): enter the email, and if no password is set yet, set one here. Accounts that
// already have a password can't reset here — they need an admin-issued reset link. Uses fetch (not the
// axios instance) so it works with no session and never triggers the app's session-expired redirect.

// Hoisted to module scope so the form doesn't remount (and steal focus) on every keystroke. Rendered
// as a component (<Shell>…</Shell>) — NOT called as Shell(...), which would pass the JSX as `props`
// and drop `children`, leaving the card body (all the form fields) blank.
const Shell = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-gray-900 px-4">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-xl">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-[#3a6ea5] dark:text-[#6a9bd1]" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-gray-400">Vynerix</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Set your password</h1>
        </div>
      </div>
      {children}
    </div>
  </div>
);

const input =
  "w-full rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:border-[#3a6ea5] focus:ring-1 focus:ring-[#3a6ea5] focus:outline-none";

const SetPassword = () => {
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
        <div className="flex flex-col items-center py-3 text-center">
          <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-500 dark:text-emerald-400" />
          <p className="mb-4 text-sm text-slate-600 dark:text-gray-300">Your password is set. You can sign in now.</p>
          <a href="/login" className="rounded-lg bg-[#3a6ea5] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#345f8f]">
            Go to sign in
          </a>
        </div>
      </Shell>
    );
  }

  if (phase === "nofix") {
    return (
      <Shell>
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/30 px-3 py-3 text-sm text-amber-800 dark:text-amber-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            This account already has a password, or the email isn't recognized. If you've forgotten your
            password, ask your Vynerix administrator to send you a reset link.
          </span>
        </div>
        <a href="/login" className="text-sm font-semibold text-[#3a6ea5] dark:text-[#6a9bd1] hover:underline">← Back to sign in</a>
      </Shell>
    );
  }

  if (phase === "password") {
    return (
      <Shell>
        <p className="mb-5 text-sm text-slate-500 dark:text-gray-400">
          Set a password for <b>{email}</b> to finish and sign in.
        </p>
        {error ? (
          <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}
        <form className="space-y-4" onSubmit={submitPw}>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-gray-300">New password</label>
            <input type="password" value={pw.password} onChange={(e) => setPw((p) => ({ ...p, password: e.target.value }))}
              placeholder="At least 8 characters" className={input} autoFocus />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-gray-300">Confirm password</label>
            <input type="password" value={pw.confirm} onChange={(e) => setPw((p) => ({ ...p, confirm: e.target.value }))}
              placeholder="Re-enter password" className={input} />
          </div>
          <button type="submit" disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3a6ea5] py-2.5 text-sm font-semibold text-white hover:bg-[#345f8f] disabled:opacity-60">
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</> : <><Lock className="h-4 w-4" /> Set password & continue</>}
          </button>
        </form>
      </Shell>
    );
  }

  return (
    <Shell>
      <p className="mb-5 text-sm text-slate-500 dark:text-gray-400">
        Enter your company email. If your account hasn't been given a password yet, you can set one here.
      </p>
      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 px-3 py-2.5 text-sm text-rose-700">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      <form className="space-y-4" onSubmit={checkEmail}>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-gray-300">Company email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="you@company.com" className={input} autoFocus />
        </div>
        <button type="submit" disabled={busy}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#3a6ea5] py-2.5 text-sm font-semibold text-white hover:bg-[#345f8f] disabled:opacity-60">
          {busy ? <><Loader2 className="h-4 w-4 animate-spin" /> Checking…</> : <><KeyRound className="h-4 w-4" /> Continue</>}
        </button>
      </form>
      <p className="mt-4 text-center">
        <a href="/login" className="text-xs text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300">← Back to sign in</a>
      </p>
    </Shell>
  );
};

export default SetPassword;

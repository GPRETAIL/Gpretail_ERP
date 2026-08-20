import React, { useState } from "react";
import { ShieldCheck, AlertTriangle, Loader2, Lock } from "lucide-react";
import api from "../api/axios";

// Shown (blocking, over the whole app) right after a company super-admin's FIRST login with the
// admin-set password: must_change_password=true. They set their own password before using the app.
// Authenticated by the session token (api adds it); on success we clear the flag and reload.
// NOTE: render as <Shell>…</Shell> — calling Shell(...) as a function passes the JSX as `props`, so
// `{ children }` reads undefined and the card body (all fields) vanishes.
const Shell = ({ children }) => (
  <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-gray-900 px-4">
    <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-8 shadow-xl">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck className="h-8 w-8 text-[#3a6ea5] dark:text-[#6a9bd1]" />
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500 dark:text-gray-400">Vynerix</p>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100">Set a new password</h1>
        </div>
      </div>
      {children}
    </div>
  </div>
);

const input =
  "w-full rounded-lg border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 px-3 py-2.5 text-sm focus:border-[#3a6ea5] focus:ring-1 focus:ring-[#3a6ea5] focus:outline-none";

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
      <p className="mb-5 text-sm text-slate-500 dark:text-gray-400">
        For security, set your own password before continuing. You won't be asked again.
      </p>
      {error ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg bg-rose-50 dark:bg-rose-900/30 px-3 py-2.5 text-sm text-rose-700 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{error}</span>
        </div>
      ) : null}
      <form className="space-y-4" onSubmit={submit}>
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
};

export default ForceChangePassword;

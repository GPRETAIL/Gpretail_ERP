import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, ServerCrash, RefreshCw } from "lucide-react";
import ActivationWizard from "../pages/ActivationWizard";

// Boot gate for the tenant deployment. On start it checks /api/activation/status:
//  - activated  → render the app (children)
//  - not yet    → render only the Activation Wizard
//  - unreachable → a retry screen (never leaks the app, never wrongly shows the wizard on a hiccup)
// The cached flag is an OPTIMISM, not an authority. It exists so a transient status blip cannot
// lock out a deployment we already know is activated -- but it used to do more than that: the gate
// seeded its phase from localStorage AND skipped the server check whenever that phase was
// "activated", so the flag never expired. Once set, the browser was through the gate permanently,
// even after the deployment was genuinely de-activated (its registration removed, its database
// emptied). A client-side value that can never be revoked is not a gate at all.
//
// Now: always ask the server, and let a definitive answer override the cache in BOTH directions.
// Only an unreachable server falls back to the cached yes, which is the case the cache was for.
const ActivationGate = ({ children }) => {
  const isMobileApp = typeof window !== "undefined" && window.location.pathname.startsWith("/app");
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const cachedActivated = localStorage.getItem("vx_activated") === "1";
  const [phase, setPhase] = useState(cachedActivated ? "activated" : "loading");
  const [licence, setLicence] = useState(null);

  if (isMobileApp) {
    return children;
  }

  const check = useCallback(async () => {
    try {
      const res = await fetch("/api/activation/status", { headers: { Accept: "application/json" } });
      const body = await res.json().catch(() => ({}));
      setLicence(body?.data?.licence ?? null);
      if (res.ok && body?.data?.activated) {
        localStorage.setItem("vx_activated", "1");
        setPhase("activated");
      } else if (res.ok) {
        // An authoritative "not activated" must revoke the cache, or the next reload trusts a flag
        // the server has already contradicted.
        localStorage.removeItem("vx_activated");
        setPhase("required");
      } else {
        setPhase(cachedActivated ? "activated" : "error");
      }
    } catch {
      // Unreachable is the one case the cache is for: keep a known-activated deployment usable.
      setPhase(cachedActivated ? "activated" : "error");
    }
  }, [cachedActivated]);

  useEffect(() => {
    check();
  }, [check]);

  // A licence in its grace period is a WARNING, never a block. The deployment is still fully usable
  // -- it has simply not been able to reach the licence server for a while and has a date on which
  // it stops. Saying so now is what turns "the system suddenly stopped" into a phone call someone
  // makes a week early. The enforcement itself lives at sign-in, where the browser cannot reach it,
  // so nothing here is load-bearing: hiding this banner buys an attacker nothing.
  const graceBanner = licence?.state === "GRACE" && licence?.reason ? (
    <div
      role="status"
      className="w-full bg-amber-50 border-b border-amber-300 px-4 py-2 text-center text-sm text-amber-900"
    >
      <span className="font-semibold">Licence needs attention.</span> {licence.reason}
    </div>
  ) : null;

  if (phase === "activated") {
    return graceBanner ? (
      <>
        {graceBanner}
        {children}
      </>
    ) : (
      children
    );
  }

  // NOT activated. Who is looking decides what they see.
  //
  // This used to render the wizard to everyone, so an unactivated deployment showed Company ID /
  // Client ID / OTP fields to an anonymous visitor and had no login page at all -- the reverse of
  // the intended order. The customer is meant to sign in with the password from their welcome
  // email, set their own, and only THEN be asked to activate.
  //
  // Signed out: hand back the app so /login renders. An unactivated deployment still cannot be
  // USED, because every authenticated route below falls into the branch underneath.
  if (phase === "required" && !isAuthenticated) {
    return children;
  }

  if (phase === "required") {
    return (
      <ActivationWizard
        onActivated={() => {
          localStorage.setItem("vx_activated", "1");
          setPhase("activated");
        }}
      />
    );
  }

  if (phase === "error") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white dark:bg-gray-800 p-8 text-center shadow-xl">
          <ServerCrash className="mx-auto h-10 w-10 text-slate-400" />
          <h1 className="mt-3 text-lg font-bold text-slate-900">Cannot verify activation</h1>
          <p className="mt-1 text-sm text-slate-500">The system could not be reached. Please try again.</p>
          <button
            type="button"
            onClick={() => { setPhase("loading"); check(); }}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#3a6ea5] px-4 py-2 text-sm font-semibold text-white hover:bg-[#345f8f]"
          >
            <RefreshCw className="h-4 w-4" /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <Loader2 className="h-8 w-8 animate-spin text-[#3a6ea5]" />
    </div>
  );
};

export default ActivationGate;

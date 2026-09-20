import React, { useCallback, useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { Loader2, ServerCrash, RefreshCw } from "lucide-react";
import { Box, Button, Typography } from "@mui/material";
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
    <Box
      role="status"
      sx={{ width: "100%", bgcolor: "#fffbeb", borderBottom: "1px solid #fcd34d", px: 2, py: 1, textAlign: "center", fontSize: 14, color: "#78350f" }}
    >
      <Box component="span" sx={{ fontWeight: 600 }}>Licence needs attention.</Box> {licence.reason}
    </Box>
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
      <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f1f5f9", px: 2 }}>
        <Box sx={{ width: "100%", maxWidth: 384, borderRadius: 3, border: "1px solid #e2e8f0", bgcolor: "background.paper", p: 4, textAlign: "center", boxShadow: 4 }}>
          <ServerCrash size={40} style={{ color: "#94a3b8" }} />
          <Typography component="h1" sx={{ mt: 1.5, fontSize: 18, fontWeight: 700, color: "#0f172a" }}>Cannot verify activation</Typography>
          <Typography sx={{ mt: 0.5, fontSize: 14, color: "#64748b" }}>The system could not be reached. Please try again.</Typography>
          <Button
            type="button"
            onClick={() => { setPhase("loading"); check(); }}
            startIcon={<RefreshCw size={16} />}
            sx={{ mt: 2.5, bgcolor: "#3a6ea5", fontWeight: 600, textTransform: "none", color: "#fff", "&:hover": { bgcolor: "#345f8f" }, borderRadius: 2 }}
          >
            Retry
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "#f1f5f9" }}>
      <Loader2 size={32} style={{ animation: "app-spin 1s linear infinite", color: "#3a6ea5" }} />
    </Box>
  );
};

export default ActivationGate;

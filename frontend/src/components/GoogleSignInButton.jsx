import { useEffect, useRef, useState } from "react";
import api from "../api/axios";
import { Box, Button, Typography } from "@mui/material";
import { FaGoogle } from "react-icons/fa";

const SCRIPT_ID = "google-gsi";
const SCRIPT_URL = "https://accounts.google.com/gsi/client";

export default function GoogleSignInButton({ onCredential, disabled = false, theme = "outline" }) {
  const host = useRef(null);
  const callback = useRef(onCredential);
  const [clientId, setClientId] = useState("");
  const [status, setStatus] = useState("loading");
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { callback.current = onCredential; }, [onCredential]);
  useEffect(() => {
    let active = true;
    api.get("/auth/config").then((response) => {
      if (!active) return;
      const data = response.data?.data || {};
      setClientId(data.google_client_id || "");
      if (!data.google_client_id) setStatus("unavailable");
    }).catch(() => { if (active) setStatus("failed"); });
    return () => { active = false; };
  }, [attempt]);

  useEffect(() => {
    if (!clientId) return undefined;
    let active = true;
    let timer;
    const failed = () => { if (active) setStatus("failed"); };
    const render = () => {
      if (!active || !host.current) return;
      if (!window.google?.accounts?.id) { failed(); return; }
      try {
        window.google.accounts.id.initialize({ client_id: clientId, callback: (response) => {
          if (active && response?.credential) callback.current(response.credential);
        }, auto_select: false });
        host.current.replaceChildren();
        window.google.accounts.id.renderButton(host.current, {
          // Medium keeps Google's standard label instead of the personalized account card.
          type: "standard", theme, size: "medium", text: "signin_with",
          shape: "rectangular", logo_alignment: "left",
          width: Math.max(200, Math.min(400, Math.floor(host.current.clientWidth || 336))),
        });
        setStatus("ready");
      } catch { failed(); }
    };
    let script = document.getElementById(SCRIPT_ID);
    if (window.google?.accounts?.id) render();
    else {
      if (!script) {
        script = document.createElement("script"); script.id = SCRIPT_ID; script.src = SCRIPT_URL;
        script.async = true; script.defer = true;
        document.head.appendChild(script);
      }
      script.addEventListener("load", render);
      script.addEventListener("error", failed);
    }
    const resize = () => { clearTimeout(timer); timer = setTimeout(render, 150); };
    window.addEventListener("resize", resize);
    const timeout = setTimeout(() => { if (active && !window.google?.accounts?.id) failed(); }, 12000);
    return () => {
      active = false; clearTimeout(timeout); clearTimeout(timer);
      script?.removeEventListener("load", render); script?.removeEventListener("error", failed);
      window.removeEventListener("resize", resize);
    };
  }, [clientId, theme, attempt]);

  const retry = () => {
    setStatus("loading");
    setClientId("");
    host.current?.replaceChildren();
    if (!window.google?.accounts?.id) document.getElementById(SCRIPT_ID)?.remove();
    setAttempt((value) => value + 1);
  };
  return <Box sx={{ width: "100%" }}>
    <Box ref={host} inert={disabled} aria-busy={disabled} sx={{ width: "100%", display: status === "ready" ? "flex" : "block", justifyContent: "center", opacity: disabled ? 0.5 : 1, pointerEvents: disabled ? "none" : "auto" }} />
    {status !== "ready" ? <Button type="button" fullWidth variant="outlined" disabled={disabled || status !== "failed"} onClick={retry} startIcon={<FaGoogle color="#DB4437" size={16} />} sx={{ minHeight: 32, textTransform: "none", fontWeight: 500, color: "text.primary", borderColor: "divider", bgcolor: "background.paper" }}>{status === "failed" ? "Retry Google sign-in" : "Sign in with Google"}</Button> : null}
    {status === "unavailable" ? <Typography sx={{ mt: 1, textAlign: "center", fontSize: 12, color: "text.secondary" }}>Google sign-in is unavailable. Use email and password.</Typography> : null}
    {status === "failed" ? <Typography role="status" sx={{ mt: 1, textAlign: "center", fontSize: 12, color: "text.secondary" }}>Google sign-in could not load. Retry or use email and password.</Typography> : null}
  </Box>;
}

import { useEffect, useRef, useState } from "react";
import api from "../api/axios";

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
          theme, size: "large", text: "signin_with",
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
  return <div className="w-full">
    <div ref={host} inert={disabled} aria-busy={disabled} className={disabled ? "pointer-events-none opacity-50" : ""} />
    {status !== "ready" ? <button type="button" disabled={disabled || status !== "failed"} onClick={retry} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-60">{status === "failed" ? "Retry Google sign-in" : "Sign in with Google"}</button> : null}
    {status === "unavailable" ? <p className="mt-2 text-center text-xs text-slate-500">Google sign-in is unavailable. Use email and password.</p> : null}
    {status === "failed" ? <p role="status" className="mt-2 text-center text-xs text-slate-500">Google sign-in could not load. Retry or use email and password.</p> : null}
  </div>;
}

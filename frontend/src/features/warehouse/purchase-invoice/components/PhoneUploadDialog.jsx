import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import { Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import { RefreshCw, Smartphone } from "lucide-react";
import api from "@/shared/api/apiClient";

const POLL_MS = 2000;

/**
 * The address a phone opens. Names a phone cannot resolve (localhost, a PC name like "mainserver") are replaced by
 * this server's LAN address; the server says which (phone_base on an on-prem server).
 */
const phoneLink = (token, { phone_base: phoneBase, lan_ip: lanIp }) => {
  const { protocol, hostname, port, origin } = window.location;
  const unreachable = hostname === "localhost" || hostname === "127.0.0.1" || !hostname.includes(".");
  const base = phoneBase || (unreachable && lanIp ? `${protocol}//${lanIp}${port ? `:${port}` : ""}` : origin);
  return `${base}/phone-upload/${token}`;
};

/** AI Purchase Invoice > From phone: a QR code the phone scans to send the invoice photo or PDF here. */
export default function PhoneUploadDialog({ open, onClose, onFile }) {
  const [session, setSession] = useState(null); // { token, link, qr, expiresAt }
  const [state, setState] = useState("starting"); // starting, waiting, receiving, expired, error
  const [message, setMessage] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const done = useRef(false);
  const checking = useRef(false);
  const onFileRef = useRef(onFile);
  useEffect(() => { onFileRef.current = onFile; }, [onFile]);

  const start = useCallback(async () => {
    done.current = false;
    setState("starting");
    setSession(null);
    try {
      const res = await api.post("/v1/invoice-ai/phone-upload");
      const data = res.data?.data || {};
      const link = phoneLink(data.token, data);
      const qr = await QRCode.toDataURL(link, { margin: 1, width: 260, errorCorrectionLevel: "M" });
      setSession({ token: data.token, link, qr, expiresAt: new Date(data.expires_at).getTime() });
      setState("waiting");
    } catch (err) {
      setState("error");
      setMessage(err.response?.data?.message || "Could not start Upload from phone.");
    }
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const timer = setTimeout(start, 0);
    return () => clearTimeout(timer);
  }, [open, start]);

  // Wait for the phone: when the file has arrived, take it and hand it to the page.
  useEffect(() => {
    if (!open || state !== "waiting" || !session) return undefined;
    const timer = setInterval(async () => {
      setNow(Date.now());
      // One check at a time: a slow answer must not let two checks both see "received" and take the file twice.
      if (done.current || checking.current) return;
      checking.current = true;
      try {
        const res = await api.get(`/v1/invoice-ai/phone-upload/${session.token}`);
        const status = res.data?.data || {};
        if (status.status === "expired") {
          setState("expired");
        } else if (status.status === "received") {
          done.current = true;
          setState("receiving");
          const fileRes = await api.get(`/v1/invoice-ai/phone-upload/${session.token}/file`, { responseType: "blob", timeout: 120000 });
          onFileRef.current(new File([fileRes.data], status.file_name || "invoice", { type: status.mime || fileRes.data.type }));
        }
      } catch {
        // A missed check is retried on the next tick.
      } finally {
        checking.current = false;
      }
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [open, state, session]);

  // Capped at the link's 10 minutes: this PC's clock may run a little behind the server's.
  const secondsLeft = session ? Math.min(600, Math.max(0, Math.round((session.expiresAt - now) / 1000))) : 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth aria-labelledby="phone-upload-title">
      <DialogTitle id="phone-upload-title">
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><Smartphone size={18} /><span>Upload from phone</span></Stack>
      </DialogTitle>
      <DialogContent>
        {state === "starting" && <Stack sx={{ alignItems: "center", py: 4 }}><CircularProgress size={28} /></Stack>}
        {state === "error" && <Typography sx={{ color: "error.main", fontSize: 13 }}>{message}</Typography>}
        {session && ["waiting", "receiving"].includes(state) && (
          <Stack spacing={1.5} sx={{ alignItems: "center", textAlign: "center" }}>
            <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
              Scan with the phone camera, then take a photo of the invoice (or choose a PDF) and send it.
            </Typography>
            <Box component="img" src={session.qr} alt="QR code for Upload from phone" sx={{ width: 220, height: 220, bgcolor: "#fff", p: 1, borderRadius: 2 }} />
            <Typography sx={{ fontSize: 11.5, color: "text.secondary", wordBreak: "break-all" }}>{session.link}</Typography>
            {state === "receiving" ? (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "success.main" }}>
                <CircularProgress size={16} color="inherit" /><Typography sx={{ fontSize: 13 }}>Invoice received. Reading it…</Typography>
              </Stack>
            ) : (
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", color: "text.secondary" }}>
                <CircularProgress size={14} color="inherit" />
                <Typography sx={{ fontSize: 12.5 }} role="status">
                  Waiting for the phone · expires in {Math.floor(secondsLeft / 60)}:{String(secondsLeft % 60).padStart(2, "0")}
                </Typography>
              </Stack>
            )}
            <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
              The phone must reach this server: on an in-store server, use the store Wi-Fi.
            </Typography>
          </Stack>
        )}
        {state === "expired" && (
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>This QR code has expired. Make a new one to try again.</Typography>
        )}
      </DialogContent>
      <DialogActions>
        {["expired", "error"].includes(state) && (
          <Button startIcon={<RefreshCw size={14} />} onClick={start}>New QR code</Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

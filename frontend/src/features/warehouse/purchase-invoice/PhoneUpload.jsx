import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { Camera, CheckCircle2, FileText, ImageUp, Send } from "lucide-react";

// Photos above this are scaled down before sending (faster on mobile data; still sharp enough for the AI).
const SHRINK_ABOVE_BYTES = 4 * 1024 * 1024;
const MAX_SIDE = 2600;

const shrinkPhoto = (file) => new Promise((resolve) => {
  if (!file.type.startsWith("image/") || file.size <= SHRINK_ABOVE_BYTES) return resolve(file);
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => {
    const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
    const canvas = Object.assign(document.createElement("canvas"), { width: Math.round(img.width * scale), height: Math.round(img.height * scale) });
    canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    canvas.toBlob((blob) => resolve(blob ? new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : file), "image/jpeg", 0.9);
  };
  img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
  img.src = url;
});

/**
 * AI Purchase Invoice > Upload from phone, the phone side. Opened from the QR code on the computer; no sign-in
 * (the one-time link is the permission). Sends one invoice photo or PDF to the computer's page.
 */
export default function PhoneUpload() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState("");
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const cameraRef = useRef(null);
  const pickerRef = useRef(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/phone-upload/${encodeURIComponent(token)}`, { headers: { Accept: "application/json" } })
      .then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (!alive) return;
        if (res.ok) setInfo(body.data || {});
        else setError(body.message || "This link is not valid any more.");
      })
      .catch(() => alive && setError("Cannot reach the server. Is this phone on the store's Wi-Fi?"));
    return () => { alive = false; };
  }, [token]);

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const choose = async (picked) => {
    if (!picked) return;
    setError("");
    setSent(false);
    const ready = await shrinkPhoto(picked);
    setFile(ready);
    setPreview(ready.type.startsWith("image/") ? URL.createObjectURL(ready) : "");
  };

  const send = async () => {
    if (!file || sending) return;
    setSending(true);
    setError("");
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch(`/api/phone-upload/${encodeURIComponent(token)}`, { method: "POST", body: form, headers: { Accept: "application/json" } });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.errors?.file?.[0] || body.message || "Could not send the invoice.");
      setSent(true);
    } catch (err) {
      setError(err.message || "Could not send the invoice.");
    } finally {
      setSending(false);
    }
  };

  return (
    <Box sx={{ minHeight: "100dvh", bgcolor: "background.default", color: "text.primary", p: 2, display: "flex", justifyContent: "center" }}>
      <Stack spacing={2} sx={{ width: "100%", maxWidth: 440, pt: 2 }}>
        <Box>
          <Typography component="h1" sx={{ fontSize: 20, fontWeight: 700 }}>Send invoice to the computer</Typography>
          {info && (
            <Typography sx={{ fontSize: 13, color: "text.secondary", mt: 0.5 }}>
              AI Purchase Invoice{info.store ? ` · ${info.store}` : ""}{info.user ? ` · ${info.user}` : ""}
            </Typography>
          )}
        </Box>

        {!info && !error && <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><CircularProgress size={18} /><span>Checking the link…</span></Stack>}
        {error && <Alert severity="error">{error}</Alert>}

        {info && sent && (
          <Alert icon={<CheckCircle2 size={20} />} severity="success">
            Sent. The invoice is on the computer now and is being read there. You can close this page.
          </Alert>
        )}

        {info && (
          <>
            <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
            <input ref={pickerRef} type="file" accept="image/*,application/pdf" hidden onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
            <Button size="large" variant="contained" startIcon={<Camera size={20} />} onClick={() => cameraRef.current?.click()} sx={{ py: 1.5 }}>
              Take photo of invoice
            </Button>
            <Button size="large" variant="outlined" startIcon={<ImageUp size={20} />} onClick={() => pickerRef.current?.click()} sx={{ py: 1.5 }}>
              Choose photo or PDF
            </Button>
            <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
              Lay the invoice flat in good light, with all four corners in the photo. A PDF from the supplier works too.
            </Typography>

            {file && (
              <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                {preview
                  ? <Box component="img" src={preview} alt="Invoice to send" sx={{ width: "100%", maxHeight: 360, objectFit: "contain", borderRadius: 1 }} />
                  : <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}><FileText size={20} /><span>{file.name}</span></Stack>}
                <Typography sx={{ fontSize: 12, color: "text.secondary", mt: 1 }}>{(file.size / 1024 / 1024).toFixed(1)} MB</Typography>
                <Button fullWidth size="large" variant="contained" color="success" disabled={sending} onClick={send} sx={{ mt: 1.5, py: 1.5 }}
                  startIcon={sending ? <CircularProgress size={18} color="inherit" /> : <Send size={20} />}>
                  {sending ? "Sending…" : sent ? "Send again (replace)" : "Send to computer"}
                </Button>
              </Box>
            )}
          </>
        )}
      </Stack>
    </Box>
  );
}

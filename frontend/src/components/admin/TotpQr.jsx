import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";
import { Box, Button, Stack, Typography } from "@mui/material";

// Renders the authenticator QR for a TOTP enrollment (from an otpauth:// URI) plus the Base32 secret
// as a copy-able manual-entry fallback. Shared by the login-time enrollment step and the Security
// Settings MFA card. The secret never leaves the browser except to our own backend.
const TotpQr = ({ otpauthUri, secret }) => {
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    if (!otpauthUri) {
      setDataUrl("");
      return undefined;
    }
    QRCode.toDataURL(otpauthUri, { margin: 1, width: 200, errorCorrectionLevel: "M" })
      .then((url) => {
        if (active) setDataUrl(url);
      })
      .catch(() => {
        if (active) setDataUrl("");
      });
    return () => {
      active = false;
    };
  }, [otpauthUri]);

  const copySecret = async () => {
    try {
      await navigator.clipboard.writeText(secret || "");
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard may be unavailable; the secret is shown for manual copy anyway.
    }
  };

  return (
    <Stack spacing={1.5} sx={{ alignItems: "center" }}>
      {dataUrl ? (
        <Box
          component="img"
          src={dataUrl}
          alt="Authenticator QR code"
          sx={{ height: 176, width: 176, borderRadius: 1.5, border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 0.5 }}
        />
      ) : (
        <Box
          sx={{
            height: 176, width: 176, display: "flex", alignItems: "center", justifyContent: "center",
            borderRadius: 1.5, border: "1px dashed", borderColor: "divider",
          }}
        >
          <Typography sx={{ fontSize: 12, color: "text.secondary" }}>Generating QR…</Typography>
        </Box>
      )}
      <Box sx={{ width: "100%" }}>
        <Typography sx={{ mb: 1, textAlign: "center", fontSize: 12, color: "text.secondary" }}>
          Scan with Google Authenticator, Authy, or 1Password — or enter this key manually:
        </Typography>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box
            component="code"
            sx={{
              flex: 1, minWidth: 0, borderRadius: 1, bgcolor: "action.hover", px: 1.5, py: 1,
              textAlign: "center", fontFamily: "monospace", fontSize: 12, letterSpacing: 1,
              color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            {secret}
          </Box>
          <Button
            size="small"
            variant="outlined"
            color="inherit"
            onClick={copySecret}
            startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
            sx={{ fontSize: 12, color: copied ? "success.main" : "text.secondary", borderColor: copied ? "success.main" : "divider" }}
          >
            {copied ? "Copied" : "Copy"}
          </Button>
        </Stack>
      </Box>
    </Stack>
  );
};

export default TotpQr;

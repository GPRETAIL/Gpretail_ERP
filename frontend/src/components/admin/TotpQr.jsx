import React, { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Copy, Check } from "lucide-react";

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
    <div className="flex flex-col items-center gap-3">
      {dataUrl ? (
        <img
          src={dataUrl}
          alt="Authenticator QR code"
          className="h-44 w-44 rounded-lg border border-slate-200 bg-white dark:bg-gray-800 p-1"
        />
      ) : (
        <div className="flex h-44 w-44 items-center justify-center rounded-lg border border-dashed border-slate-300 text-xs text-slate-400">
          Generating QR…
        </div>
      )}
      <div className="w-full">
        <p className="mb-1 text-center text-xs text-slate-500">
          Scan with Google Authenticator, Authy, or 1Password — or enter this key manually:
        </p>
        <div className="flex items-center gap-2">
          <code className="flex-1 truncate rounded-md bg-slate-100 px-2.5 py-1.5 text-center font-mono text-xs tracking-wider text-slate-700">
            {secret}
          </code>
          <button
            type="button"
            onClick={copySecret}
            className="inline-flex items-center gap-1 rounded-md border border-slate-300 px-2 py-1.5 text-xs text-slate-600 hover:bg-slate-50"
          >
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default TotpQr;

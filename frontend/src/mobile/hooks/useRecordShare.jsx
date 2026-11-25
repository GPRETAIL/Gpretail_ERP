import { useState } from "react";
import { Alert } from "@mui/material";
import useShareDocument from "@/mobile/hooks/useShareDocument";

/**
 * Share a record as a PDF with a message: the phone's share sheet, or WhatsApp with the PDF downloaded to attach.
 * run({ html, filename, text, phone }) → shows the one-line notice that goes with the result.
 */
export default function useRecordShare() {
  const { store, share } = useShareDocument();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);
  const run = async (args) => {
    setBusy(true);
    setNotice(null);
    try {
      const result = await share(args);
      if (result === "whatsapp") setNotice({ severity: "info", text: "WhatsApp opened. Attach the PDF that was downloaded." });
    } catch {
      setNotice({ severity: "error", text: "Could not make the PDF. Try again." });
    } finally {
      setBusy(false);
    }
  };
  const alert = notice ? <Alert severity={notice.severity} onClose={() => setNotice(null)}>{notice.text}</Alert> : null;
  return { store, busy, run, alert };
}

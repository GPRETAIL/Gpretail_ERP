import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Download, FileText } from "lucide-react";
import api from "@/shared/api/apiClient";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";
import { STAFF_COLOR, STAFF_TEXT, TOUCH, card } from "../staffUi";

const sizeText = (bytes) => (bytes >= 1048576 ? `${(bytes / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** The documents HR keeps for me. A file is fetched with my sign-in and saved to the phone; there is no public link. */
export default function DocumentsSection() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(null);
  useEffect(() => {
    let active = true;
    api.get("/staff-company/documents").then((res) => { if (active) setRows(res.data?.data || []); }).catch(() => { if (active) setError("Could not load your documents. Pull down to try again."); });
    return () => { active = false; };
  }, []);

  const download = async (doc) => {
    setBusy(doc.id);
    setError("");
    try {
      const res = await api.get(`/staff-company/documents/${doc.id}/download`, { responseType: "blob" });
      const url = URL.createObjectURL(res.data);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${doc.title}${doc.mime === "application/pdf" ? ".pdf" : ""}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10000);
    } catch {
      setError("Could not download this file. Try again, or ask HR.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {error && <Typography role="alert" sx={{ color: STAFF_COLOR.danger, fontSize: STAFF_TEXT.label, fontWeight: 600 }}>{error}</Typography>}
      {!rows && !error && <LoadingSkeleton variant="list" rows={3} label="Loading documents" />}
      {rows?.length === 0 && <Box sx={card}><Typography sx={{ fontSize: STAFF_TEXT.body, color: STAFF_COLOR.muted }}>HR has not added any documents for you yet.</Typography></Box>}
      {(rows || []).map((doc) => (
        <Box key={doc.id} sx={{ ...card, display: "flex", alignItems: "center", gap: 1.25 }}>
          <Box sx={{ color: STAFF_COLOR.primary }}><FileText size={22} /></Box>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography sx={{ fontSize: STAFF_TEXT.body, fontWeight: 700, color: STAFF_COLOR.text }} noWrap>{doc.title}</Typography>
            <Typography sx={{ fontSize: STAFF_TEXT.small, color: STAFF_COLOR.faint }}>{doc.type_label} · {sizeText(doc.size)} · {doc.added_on}</Typography>
          </Box>
          <Box component="button" type="button" onClick={() => void download(doc)} disabled={busy === doc.id} aria-label={`Download ${doc.title}`}
            sx={{ width: TOUCH, height: TOUCH, borderRadius: "12px", border: `1px solid ${STAFF_COLOR.line}`, bgcolor: STAFF_COLOR.surface, color: STAFF_COLOR.primaryDark, cursor: "pointer", "&:disabled": { opacity: 0.5 } }}>
            <Download size={18} />
          </Box>
        </Box>
      ))}
    </Box>
  );
}

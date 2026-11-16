import { useCallback, useEffect, useState } from "react";
import { Alert, Box, CircularProgress, Typography } from "@mui/material";
import { MessageCircle, Search } from "lucide-react";
import api from "@/shared/api/apiClient";
import useShareDocument from "@/mobile/hooks/useShareDocument";
import { invoiceHtml, invoiceMessage, rupees, shortDate } from "@/mobile/utils/dealerDocuments";
import { SkeletonTransList } from "../components/SkeletonCards";

const STATUS_COLORS = { Paid: "#15803d", "Part paid": "#b45309", Credit: "#be123c" };

/** Mobile > Dealer Invoices: recent dealer invoices with what is paid and due; tap Share to send one as a PDF on WhatsApp. */
export default function DealerInvoicesScreen() {
  const { store, share } = useShareDocument();
  const [rows, setRows] = useState(null);
  const [search, setSearch] = useState("");
  const [sharing, setSharing] = useState(null);
  const [notice, setNotice] = useState(null);

  const load = useCallback(async (text) => {
    try {
      const res = await api.get("/dealer-invoices", { params: { limit: 50, search: text || undefined } });
      setRows((res.data?.data || []).filter((r) => String(r.status).toUpperCase() !== "CANCELLED"));
    } catch {
      setRows([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(search.trim()), search ? 350 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const shareInvoice = async (row) => {
    setSharing(row.id);
    setNotice(null);
    try {
      const res = await api.get(`/dealer-invoices/${row.id}`);
      const invoice = res.data?.data || row;
      const result = await share({ html: invoiceHtml({ store, invoice }), filename: `Invoice-${invoice.bill_no}.pdf`,
        text: invoiceMessage({ store, invoice }), phone: invoice.customer?.phone });
      if (result === "whatsapp") setNotice({ severity: "info", text: "WhatsApp opened; attach the downloaded PDF." });
    } catch {
      setNotice({ severity: "error", text: "Could not make the invoice PDF." });
    } finally {
      setSharing(null);
    }
  };

  return (
    <Box>
      <Box className="vx-search-row">
        <Box className="vx-search-input-wrap">
          <Search size={16} color="#94a3b8" />
          <Box component="input" type="text" placeholder="Search invoice or dealer..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search dealer invoices" />
        </Box>
      </Box>
      {notice && <Alert severity={notice.severity} sx={{ mb: 1.5 }}>{notice.text}</Alert>}
      {rows === null ? <SkeletonTransList count={4} /> : rows.length === 0 ? (
        <Box className="vx-card" sx={{ textAlign: "center" }}><Typography sx={{ fontSize: 14, color: "#94a3b8" }}>No dealer invoices</Typography></Box>
      ) : rows.map((row) => (
        <Box key={row.id} className="vx-trans-card">
          <Box className="vx-trans-left">
            <Box component="span" className="vx-trans-id">{row.bill_no}</Box>
            <Box component="span" className="vx-trans-meta">{row.customer_name} · {shortDate(row.sale_at)}</Box>
            <Box component="span" className="vx-trans-meta" sx={{ color: STATUS_COLORS[row.payment_status] || "#475569", fontWeight: 700 }}>
              {row.payment_status}{Number(row.balance) > 0 ? ` · due ${rupees(row.balance)}` : ""}
            </Box>
          </Box>
          <Box className="vx-trans-right">
            <Box component="span" className="vx-trans-amount">{rupees(row.amount)}</Box>
            <Box component="button" type="button" onClick={() => void shareInvoice(row)} disabled={sharing === row.id} aria-label={`Share ${row.bill_no}`}
              sx={{ mt: 0.5, display: "inline-flex", alignItems: "center", gap: 0.5, border: 0, borderRadius: "8px", px: 1, py: 0.5, bgcolor: "#16a34a", color: "#fff", fontSize: 12, fontWeight: 700 }}>
              {sharing === row.id ? <CircularProgress size={12} color="inherit" /> : <MessageCircle size={14} />} Share
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

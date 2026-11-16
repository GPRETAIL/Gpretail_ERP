import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";
import { ArrowLeft, HandCoins, MessageCircle, Search } from "lucide-react";
import api from "@/shared/api/apiClient";
import useShareDocument from "@/mobile/hooks/useShareDocument";
import { daysSince, receiptHtml, reminderMessage, rupees, shortDate, statementHtml } from "@/mobile/utils/dealerDocuments";
import { PAYMENT_MODES } from "@/features/sales/dealer/utils/dealerPayments";
import { SkeletonTransList } from "../components/SkeletonCards";

const ageColors = (days) => (days > 60 ? { bg: "#fff1f2", text: "#be123c" } : days > 30 ? { bg: "#fffbeb", text: "#b45309" } : { bg: "#f1f5f9", text: "#475569" });

/**
 * Mobile > Dealer Dues: who owes what on dealer invoices. Open a dealer to send a WhatsApp reminder with a PDF
 * statement, or record a payment (a Dealer Receipt, allocated to the oldest invoices first) and share its receipt.
 */
export default function DealerDuesScreen() {
  const { store, share } = useShareDocument();
  const [dealers, setDealers] = useState(null);
  const [search, setSearch] = useState("");
  const [dealer, setDealer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [view, setView] = useState("list"); // list, dealer, remind, collect
  const [message, setMessage] = useState("");
  const [payment, setPayment] = useState({ amount: "", mode: "CASH", reference_no: "" });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null); // { severity, text }
  const [receipt, setReceipt] = useState(null);

  const loadDealers = useCallback(async () => {
    try {
      const res = await api.get("/dealer-receipts/dealers");
      setDealers(res.data?.data || []);
    } catch {
      setDealers([]);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(loadDealers, 0);
    return () => clearTimeout(timer);
  }, [loadDealers]);

  const openDealer = async (row) => {
    setDealer(row);
    setView("dealer");
    setNotice(null);
    setReceipt(null);
    setInvoices([]);
    try {
      const res = await api.get("/dealer-receipts/open-invoices", { params: { customer_id: row.customer_id } });
      setInvoices(res.data?.data || []);
    } catch {
      setNotice({ severity: "error", text: "Could not load the dealer's invoices." });
    }
  };

  const shown = useMemo(() => (dealers || []).filter((d) => !search.trim() || d.customer_name.toLowerCase().includes(search.trim().toLowerCase())), [dealers, search]);
  const total = (dealers || []).reduce((s, d) => s + Number(d.due || 0), 0);
  const due = invoices.reduce((s, i) => s + Number(i.balance || 0), 0);

  const sendReminder = async () => {
    setBusy(true);
    try {
      const result = await share({ html: statementHtml({ store, dealer, invoices }), filename: `Statement-${dealer.customer_name.replace(/[^\w]+/g, "-")}.pdf`, text: message, phone: dealer.phone });
      setNotice(result === "cancelled" ? null : { severity: "success", text: result === "whatsapp" ? "WhatsApp opened; attach the downloaded PDF." : "Reminder shared." });
      if (result !== "cancelled") setView("dealer");
    } catch {
      setNotice({ severity: "error", text: "Could not make the statement PDF." });
    } finally {
      setBusy(false);
    }
  };

  const collect = async () => {
    setBusy(true);
    try {
      const res = await api.post("/dealer-receipts", { customer_id: dealer.customer_id, amount: Number(payment.amount), mode: payment.mode, reference_no: payment.reference_no || null });
      setReceipt(res.data?.data);
      setNotice({ severity: "success", text: `Receipt ${res.data?.data?.bill_no} saved.` });
      setPayment({ amount: "", mode: "CASH", reference_no: "" });
      void loadDealers();
      const fresh = await api.get("/dealer-receipts/open-invoices", { params: { customer_id: dealer.customer_id } });
      setInvoices(fresh.data?.data || []);
      setView("dealer");
    } catch (err) {
      const body = err?.response?.data;
      setNotice({ severity: "error", text: body?.errors ? Object.values(body.errors).flat()[0] : body?.message || "Could not save the payment." });
    } finally {
      setBusy(false);
    }
  };

  const shareReceipt = async () => {
    setBusy(true);
    try {
      await share({ html: receiptHtml({ store, receipt }), filename: `Receipt-${receipt.bill_no}.pdf`, phone: dealer.phone,
        text: `Dear ${receipt.customer_name}, we received ${rupees(receipt.amount)} (receipt ${receipt.bill_no}). Thank you. – ${store.name}` });
    } finally {
      setBusy(false);
    }
  };

  if (view === "list") {
    return (
      <Box>
        <Box className="vx-search-row">
          <Box className="vx-search-input-wrap">
            <Search size={16} color="#94a3b8" />
            <Box component="input" type="text" placeholder="Search dealer..." value={search} onChange={(e) => setSearch(e.target.value)} aria-label="Search dealer" />
          </Box>
        </Box>
        {dealers && dealers.length > 0 && (
          <Box sx={{ p: 1.75, borderRadius: "16px", bgcolor: "#fffbeb", border: "1px solid rgba(253,230,138,0.7)", mb: 1.5, display: "flex", justifyContent: "space-between" }}>
            <Typography component="span" sx={{ fontSize: 11, fontWeight: 900, color: "#92400e", textTransform: "uppercase" }}>Dealers owe</Typography>
            <Typography component="span" sx={{ fontSize: 15, fontWeight: 900, color: "#92400e" }}>{rupees(total)}</Typography>
          </Box>
        )}
        {dealers === null ? <SkeletonTransList count={4} /> : shown.length === 0 ? (
          <Box className="vx-card" sx={{ textAlign: "center" }}><Typography sx={{ fontSize: 14, color: "#94a3b8" }}>No dealer owes anything</Typography></Box>
        ) : shown.map((row) => {
          const days = daysSince(row.oldest);
          const colors = ageColors(days);
          return (
            <Box key={row.customer_id} className="vx-trans-card" role="button" tabIndex={0} onClick={() => void openDealer(row)} sx={{ cursor: "pointer" }}
              onKeyDown={(e) => { if (e.key === "Enter") void openDealer(row); }}>
              <Box className="vx-trans-left">
                <Box component="span" className="vx-trans-id">{row.customer_name}</Box>
                <Box component="span" className="vx-trans-meta">{row.invoices} invoice{row.invoices === 1 ? "" : "s"} · oldest {shortDate(row.oldest)}</Box>
              </Box>
              <Box className="vx-trans-right">
                <Typography component="span" sx={{ fontSize: 9.5, fontWeight: 700, px: 0.75, py: 0.25, borderRadius: "6px", mb: 0.5, bgcolor: colors.bg, color: colors.text }}>{days}d</Typography>
                <Box component="span" className="vx-trans-amount">{rupees(row.due)}</Box>
              </Box>
            </Box>
          );
        })}
      </Box>
    );
  }

  return (
    <Box>
      <Button size="small" startIcon={<ArrowLeft size={16} />} onClick={() => setView(view === "dealer" ? "list" : "dealer")} sx={{ mb: 1 }}>
        {view === "dealer" ? "All dealers" : dealer.customer_name}
      </Button>
      <Box className="vx-card" sx={{ mb: 1.5 }}>
        <Typography sx={{ fontWeight: 800, fontSize: 16 }}>{dealer.customer_name}</Typography>
        <Typography sx={{ fontSize: 13, color: "#64748b" }}>{dealer.phone || "No phone number"}</Typography>
        <Typography sx={{ fontSize: 22, fontWeight: 900, color: "#b45309", mt: 0.5 }}>{rupees(due)}</Typography>
      </Box>
      {notice && <Alert severity={notice.severity} sx={{ mb: 1.5 }}>{notice.text}</Alert>}
      {receipt && view === "dealer" && (
        <Button fullWidth variant="outlined" startIcon={<MessageCircle size={16} />} disabled={busy} onClick={() => void shareReceipt()} sx={{ mb: 1.5 }}>Share receipt {receipt.bill_no}</Button>
      )}

      {view === "dealer" && (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <Button fullWidth variant="contained" color="success" startIcon={<MessageCircle size={16} />} disabled={!invoices.length}
              onClick={() => { setMessage(reminderMessage({ store, dealer, invoices })); setView("remind"); }}>Send reminder</Button>
            <Button fullWidth variant="contained" startIcon={<HandCoins size={16} />} disabled={!invoices.length}
              onClick={() => { setPayment({ amount: due.toFixed(2), mode: "CASH", reference_no: "" }); setView("collect"); }}>Collect payment</Button>
          </Stack>
          {invoices.map((inv) => (
            <Box key={inv.id} className="vx-trans-card">
              <Box className="vx-trans-left">
                <Box component="span" className="vx-trans-id">{inv.bill_no}</Box>
                <Box component="span" className="vx-trans-meta">{shortDate(inv.invoice_date)} · {daysSince(inv.invoice_date)} days</Box>
              </Box>
              <Box className="vx-trans-right">
                <Box component="span" className="vx-trans-amount">{rupees(inv.balance)}</Box>
                <Typography component="span" sx={{ fontSize: 9.5, color: "#94a3b8", fontWeight: 600 }}>of {rupees(inv.total)}</Typography>
              </Box>
            </Box>
          ))}
        </>
      )}

      {view === "remind" && (
        <Stack spacing={1.5}>
          <Typography sx={{ fontSize: 13, color: "#64748b" }}>The statement PDF goes with this message. Choose WhatsApp and the dealer's chat.</Typography>
          <TextField multiline minRows={4} label="Message" value={message} onChange={(e) => setMessage(e.target.value)} />
          <Button variant="contained" color="success" size="large" disabled={busy || !message.trim()} onClick={() => void sendReminder()}
            startIcon={busy ? <CircularProgress size={16} color="inherit" /> : <MessageCircle size={18} />}>Share on WhatsApp</Button>
        </Stack>
      )}

      {view === "collect" && (
        <Stack spacing={1.5}>
          <TextField type="number" label="Amount received" value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))}
            helperText={`Due ${rupees(due)}; paid to the oldest invoices first`} error={Number(payment.amount) > due + 0.005} slotProps={{ htmlInput: { min: 0, step: "0.01" } }} />
          <TextField select label="Mode" value={payment.mode} onChange={(e) => setPayment((p) => ({ ...p, mode: e.target.value }))}>
            {PAYMENT_MODES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </TextField>
          {payment.mode !== "CASH" && (
            <TextField label={payment.mode === "CHEQUE" ? "Cheque no." : "Reference / UTR"} value={payment.reference_no} onChange={(e) => setPayment((p) => ({ ...p, reference_no: e.target.value }))} />
          )}
          <Button variant="contained" size="large" onClick={() => void collect()}
            disabled={busy || !(Number(payment.amount) > 0) || Number(payment.amount) > due + 0.005 || (payment.mode === "CHEQUE" && !payment.reference_no.trim())}>
            {busy ? "Saving..." : "Save payment"}
          </Button>
        </Stack>
      )}
    </Box>
  );
}

import { useCallback } from "react";
import { Box, Button, Dialog, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";
import { X } from "lucide-react";
import api from "../../api/axios";
import useAsyncQuery from "../../hooks/useAsyncQuery";

const money = value => Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR" });
const SummaryRow = ({ label, value, strong = false }) => <Stack direction="row" justifyContent="space-between" sx={{ gap: 2, fontWeight: strong ? 700 : 400 }}><span>{label}</span><span>{money(value)}</span></Stack>;

export default function SaleInvoiceDetails({ saleId, onClose }) {
  const fetchInvoice = useCallback(async ({ signal }) => {
    const response = await api.get(`/pos-sales/${saleId}`, { signal });
    return response.data?.data;
  }, [saleId]);
  const { data: invoice, loading, error, reload } = useAsyncQuery(fetchInvoice, { enabled: Boolean(saleId) });
  return <Dialog open={Boolean(saleId)} onClose={onClose} fullWidth maxWidth="sm" scroll="paper" aria-labelledby="mobile-invoice-title">
    <DialogTitle id="mobile-invoice-title" sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1 }}>
      Invoice {invoice?.bill_no || invoice?.invoice_no || "details"}
      <IconButton aria-label="Close invoice details" onClick={onClose}><X size={20} /></IconButton>
    </DialogTitle>
    <DialogContent dividers>
      {loading ? <Typography role="status">Loading invoice…</Typography> : error ? <Stack spacing={2}><Typography role="alert">{error.response?.data?.message || "Unable to load this invoice."}</Typography><Button onClick={() => reload()}>Retry</Button></Stack> : invoice ? <Stack spacing={2}>
        <Box sx={{ fontSize: 13 }}>
          {invoice.store?.name && <Typography fontWeight={700}>{invoice.store.name}</Typography>}
          <Typography variant="body2">{invoice.customer?.name || invoice.customer_name || "Walk-in customer"}</Typography>
          <Typography variant="body2">{new Date(invoice.sale_date || invoice.created_at).toLocaleString("en-IN")}</Typography>
          <Typography variant="body2">{invoice.status} · {invoice.payment_mode}</Typography>
          {invoice.counter_name && <Typography variant="body2">Counter: {invoice.counter_name}</Typography>}
        </Box>
        <Stack component="section" aria-label="Products sold" spacing={1.5}>
          {(invoice.items || []).map((item, index) => <Box key={item.id || index} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
            <Typography fontWeight={600}>{item.product?.name || item.product_name || "Product"}</Typography>
            <SummaryRow label={`${Number(item.quantity || 0)} × ${money(item.selling_price)}`} value={item.subtotal} strong />
            {Number(item.discount) > 0 && <SummaryRow label="Line discount" value={item.discount} />}
            {Number(item.tax_amount) > 0 && <SummaryRow label={`Tax (${Number(item.tax_rate || 0)}%)`} value={item.tax_amount} />}
          </Box>)}
          {!invoice.items?.length && <Typography>No product lines available.</Typography>}
        </Stack>
        <Stack component="section" aria-label="Invoice totals" spacing={1} sx={{ borderTop: 1, borderColor: "divider", pt: 2, fontSize: 14 }}>
          <SummaryRow label="Subtotal" value={invoice.subtotal} />
          <SummaryRow label="Discount" value={invoice.discount_amount} />
          <SummaryRow label="Tax" value={invoice.tax_amount} />
          <SummaryRow label="Round off" value={invoice.round_off} />
          <SummaryRow label="Total" value={invoice.grand_total} strong />
          <SummaryRow label="Received" value={invoice.paid_amount} />
          {Number(invoice.change_amount) > 0 && <SummaryRow label="Change" value={invoice.change_amount} />}
          <SummaryRow label="Balance due" value={invoice.remaining_amount ?? Math.max(0, Number(invoice.grand_total || 0) - Number(invoice.paid_amount || 0))} strong />
        </Stack>
      </Stack> : <Typography>Invoice not found.</Typography>}
    </DialogContent>
  </Dialog>;
}

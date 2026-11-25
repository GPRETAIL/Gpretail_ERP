import { useCallback, useMemo } from "react";
import { Box, Typography } from "@mui/material";
import { MessageCircle, Phone, Store } from "lucide-react";
import api from "@/shared/api/apiClient";
import useAsyncQuery from "@/shared/hooks/useAsyncQuery";
import { whatsappLink } from "@/mobile/utils/dealerDocuments";
import { STATUS_TONES, normalizePurchase, rupees, shortDate, supplierMessage, supplierStatementHtml } from "@/mobile/utils/recordDocuments";
import { ActionBar, ActionBarSpace, ActionButton, InfoRows, RecordHero, RecordState, Section } from "@/mobile/components/RecordPage";
import useRecordShare from "@/mobile/hooks/useRecordShare";

const listOf = (res) => {
  if (res.status !== "fulfilled") return [];
  const data = res.value.data?.data;
  return Array.isArray(data) ? data : data?.data || [];
};

/** Mobile > Suppliers > one supplier: contact and GST details, what is owed to them, their recent bills (tap to open), call, WhatsApp and a statement to share. */
export default function SupplierDetailScreen({ supplierId, onOpenBill }) {
  const fetchSupplier = useCallback(async ({ signal }) => {
    const [supplier, direct, invoices] = await Promise.all([
      api.get(`/suppliers/${supplierId}`, { signal }),
      Promise.allSettled([api.get("/direct-purchases", { params: { supplier_id: supplierId, limit: 30 }, signal })]).then(([result]) => listOf(result)),
      Promise.allSettled([api.get("/invoices", { params: { supplier_id: supplierId, limit: 30 }, signal })]).then(([result]) => listOf(result)),
    ]);
    const bills = [
      ...direct.map((bill) => ({ ...normalizePurchase(bill, "direct"), id: bill.id })),
      ...invoices.map((bill) => ({ ...normalizePurchase(bill, "invoice"), id: bill.id })),
    ].sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    return { supplier: supplier.data?.data, bills };
  }, [supplierId]);
  const { data, loading, error, reload } = useAsyncQuery(fetchSupplier, { enabled: Boolean(supplierId) });
  const { store, busy, run, alert } = useRecordShare();
  const supplier = data?.supplier;
  const bills = useMemo(() => data?.bills || [], [data]);

  const state = <RecordState loading={loading} error={error} notFound={!loading && !error && !supplier} onRetry={reload} />;
  if (!supplier) return state;

  const owed = Number(supplier.current_balance || 0);
  const open = bills.filter((bill) => bill.totals.balance > 0);
  const message = supplierMessage({ store, supplier, bills: open });
  const share = () => run({ html: supplierStatementHtml({ store, supplier, bills: open }), filename: `Statement-${String(supplier.name).replace(/\s+/g, "-")}.pdf`, text: message, phone: supplier.phone });
  const address = [supplier.address, supplier.city, supplier.state, supplier.pincode].filter(Boolean).join(", ");

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <RecordHero label="Supplier" title={supplier.name} subtitle={supplier.company_name && supplier.company_name !== supplier.name ? supplier.company_name : supplier.code} amount={owed}
        amountLabel={owed > 0 ? "We owe this supplier" : "Nothing owed"} />
      {alert}
      <Section title="Details">
        <InfoRows rows={[["Phone", supplier.phone], ["Email", supplier.email], ["GSTIN", supplier.gstin], ["PAN", supplier.pan], ["Address", address]]} />
      </Section>
      <Section title={`Recent bills (${bills.length})`}>
        {bills.length === 0 ? <Typography sx={{ fontSize: 13, color: "var(--vx-muted, #64748b)" }}>No purchase bills from this supplier yet.</Typography> : (
          <Box component="ul" aria-label="Purchase bills" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {bills.map((bill, index) => (
              <Box component="li" key={`${bill.kind}-${bill.id}`} sx={{ borderTop: index ? "1px solid var(--vx-border, #e2e8f0)" : 0 }}>
                <Box component="button" type="button" aria-label={`Open bill ${bill.number}`} onClick={() => onOpenBill?.(bill.kind, bill.id)}
                  sx={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, py: 1, border: 0, bgcolor: "transparent", textAlign: "left", cursor: "pointer", color: "inherit" }}>
                  <Box sx={{ minWidth: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "var(--vx-text, #0f172a)" }}>{bill.number}</Typography>
                    <Typography sx={{ fontSize: 11.5, color: "var(--vx-muted, #64748b)" }}>{shortDate(bill.date)}</Typography>
                  </Box>
                  <Box sx={{ textAlign: "right", flexShrink: 0 }}>
                    <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: "var(--vx-text, #0f172a)" }}>{rupees(bill.totals.total)}</Typography>
                    <Typography sx={{ fontSize: 11, fontWeight: 700, color: STATUS_TONES[bill.status] || "#475569" }}>
                      {bill.totals.balance > 0 ? `${rupees(bill.totals.balance)} to pay` : "Paid"}
                    </Typography>
                  </Box>
                </Box>
              </Box>
            ))}
          </Box>
        )}
      </Section>
      <ActionBarSpace />
      <ActionBar>
        <ActionButton tone="share" icon={MessageCircle} label="Statement" busy={busy} disabled={open.length === 0} onClick={() => void share()} />
        {supplier.phone ? <ActionButton icon={Phone} label="Call" href={`tel:${supplier.phone}`} /> : null}
        {supplier.phone ? <ActionButton icon={Store} label="WhatsApp" href={whatsappLink(supplier.phone, message)} /> : null}
      </ActionBar>
    </Box>
  );
}

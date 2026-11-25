import { useCallback, useMemo } from "react";
import { Box } from "@mui/material";
import { MessageCircle, Phone, Store } from "lucide-react";
import api from "@/shared/api/apiClient";
import useAsyncQuery from "@/shared/hooks/useAsyncQuery";
import { whatsappLink } from "@/mobile/utils/dealerDocuments";
import { normalizePurchase, purchaseHtml, purchaseMessage, rupees, shortDate } from "@/mobile/utils/recordDocuments";
import { ActionBar, ActionBarSpace, ActionButton, InfoRows, LineItems, RecordHero, RecordState, Section, Totals } from "@/mobile/components/RecordPage";
import useRecordShare from "@/mobile/hooks/useRecordShare";

/**
 * Mobile > Purchase > one bill, as a full page: the supplier, every product with quantity, cost, discount and tax, the
 * totals, what is paid and what is still to pay, and Share. kind: "direct" (Direct Purchase) or "invoice" (Purchase Invoice).
 */
export default function PurchaseDetailScreen({ id, kind = "direct", onOpenSupplier }) {
  const path = kind === "invoice" ? "/invoices" : "/direct-purchases";
  const fetchBill = useCallback(async ({ signal }) => (await api.get(`${path}/${id}`, { signal })).data?.data, [path, id]);
  const { data: bill, loading, error, reload } = useAsyncQuery(fetchBill, { enabled: Boolean(id) });
  const { store, busy, run, alert } = useRecordShare();
  const doc = useMemo(() => (bill ? normalizePurchase(bill, kind) : null), [bill, kind]);

  const state = <RecordState loading={loading} error={error} notFound={!loading && !error && !doc} onRetry={reload} />;
  if (!doc) return state;

  const t = doc.totals;
  const share = () => run({ html: purchaseHtml({ store, doc }), filename: `Purchase-${doc.number}.pdf`, text: purchaseMessage({ store, doc }), phone: doc.supplier.phone });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <RecordHero label={kind === "invoice" ? "Purchase invoice" : "Purchase bill"} title={doc.number} subtitle={`${doc.supplier.name} · ${shortDate(doc.date)}`} amount={t.total}
        amountLabel={t.balance > 0 ? `${rupees(t.balance)} still to pay` : "Paid in full"} status={doc.status} />
      {alert}
      <Section title="Supplier" action={doc.supplier.id && onOpenSupplier ? (
        <Box component="button" type="button" onClick={() => onOpenSupplier(doc.supplier.id)} sx={{ border: 0, bgcolor: "transparent", color: "#4f46e5", fontSize: 12, fontWeight: 800, cursor: "pointer" }}>Open supplier</Box>
      ) : null}>
        <InfoRows rows={[["Name", doc.supplier.name], ["Phone", doc.supplier.phone], ["GSTIN", doc.supplier.gstin], ["Their bill no", doc.supplierBillNo]]} />
      </Section>
      <Section title={`Products (${doc.items.length})`}><LineItems items={doc.items} rateLabel="cost" /></Section>
      <Section title="Totals">
        <Totals rows={[
          { label: "Subtotal", value: t.subtotal, always: true }, { label: "Discount", value: t.discount }, { label: "Tax", value: t.tax }, { label: "Round off", value: t.roundOff },
          { label: "Total", value: t.total, strong: true, always: true }, { label: "Paid", value: t.paid, always: true },
          { label: "Balance to pay", value: t.balance, strong: true, always: true, tone: t.balance > 0 ? "#be123c" : undefined },
        ]} />
      </Section>
      <ActionBarSpace />
      <ActionBar>
        <ActionButton tone="share" icon={MessageCircle} label="Share" busy={busy} onClick={() => void share()} />
        {doc.supplier.phone ? <ActionButton icon={Phone} label="Call" href={`tel:${doc.supplier.phone}`} /> : null}
        {doc.supplier.phone ? <ActionButton icon={Store} label="WhatsApp" href={whatsappLink(doc.supplier.phone, purchaseMessage({ store, doc }))} /> : null}
      </ActionBar>
    </Box>
  );
}

import { useCallback, useMemo } from "react";
import { Box } from "@mui/material";
import { MessageCircle, Phone } from "lucide-react";
import api from "@/shared/api/apiClient";
import useAsyncQuery from "@/shared/hooks/useAsyncQuery";
import { whatsappLink } from "@/mobile/utils/dealerDocuments";
import { normalizeSale, rupees, saleHtml, saleMessage, when } from "@/mobile/utils/recordDocuments";
import { ActionBar, ActionBarSpace, ActionButton, InfoRows, LineItems, RecordHero, RecordState, Section, Totals } from "@/mobile/components/RecordPage";
import useRecordShare from "@/mobile/hooks/useRecordShare";

/** Mobile > Sales > one invoice, as a full page: the customer, every product with its price, discount and tax, the totals, and Share. */
export default function SaleDetailScreen({ saleId }) {
  const fetchSale = useCallback(async ({ signal }) => (await api.get(`/pos-sales/${saleId}`, { signal })).data?.data, [saleId]);
  const { data: sale, loading, error, reload } = useAsyncQuery(fetchSale, { enabled: Boolean(saleId) });
  const { store, busy, run, alert } = useRecordShare();
  const doc = useMemo(() => (sale ? normalizeSale(sale) : null), [sale]);

  const state = <RecordState loading={loading} error={error} notFound={!loading && !error && !doc} onRetry={reload} />;
  if (!doc) return state;

  const t = doc.totals;
  const shop = { ...store, name: doc.storeName || store.name };
  const share = () => run({ html: saleHtml({ store: shop, doc }), filename: `Invoice-${doc.number}.pdf`, text: saleMessage({ store: shop, doc }), phone: doc.customer.phone });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <RecordHero label="Sales invoice" title={doc.number} subtitle={when(doc.date)} amount={t.total}
        amountLabel={t.balance > 0 ? `Balance due ${rupees(t.balance)}` : "Paid in full"} status={doc.status} />
      {alert}
      <Section title="Customer">
        <InfoRows rows={[["Name", doc.customer.name], ["Phone", doc.customer.phone], ["Paid by", doc.paymentMode], ["Counter", doc.counter], ["Store", doc.storeName]]} />
      </Section>
      <Section title={`Products (${doc.items.length})`}><LineItems items={doc.items} empty="No product lines on this invoice." /></Section>
      <Section title="Totals">
        <Totals rows={[
          { label: "Subtotal", value: t.subtotal, always: true }, { label: "Discount", value: t.discount }, { label: "Tax", value: t.tax }, { label: "Round off", value: t.roundOff },
          { label: "Total", value: t.total, strong: true, always: true }, { label: "Received", value: t.paid, always: true }, { label: "Change", value: t.change },
          { label: "Balance due", value: t.balance, strong: true, always: true, tone: t.balance > 0 ? "#be123c" : undefined },
        ]} />
      </Section>
      <ActionBarSpace />
      <ActionBar>
        <ActionButton tone="share" icon={MessageCircle} label="Share" busy={busy} onClick={() => void share()} />
        {doc.customer.phone ? <ActionButton icon={Phone} label="Call" href={`tel:${doc.customer.phone}`} /> : null}
        {doc.customer.phone ? <ActionButton icon={MessageCircle} label="WhatsApp" href={whatsappLink(doc.customer.phone, saleMessage({ store: shop, doc }))} /> : null}
      </ActionBar>
    </Box>
  );
}

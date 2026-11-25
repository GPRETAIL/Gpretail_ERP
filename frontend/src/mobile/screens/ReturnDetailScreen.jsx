import { useCallback, useMemo } from "react";
import { Box } from "@mui/material";
import { MessageCircle } from "lucide-react";
import api from "@/shared/api/apiClient";
import useAsyncQuery from "@/shared/hooks/useAsyncQuery";
import { normalizeReturn, returnHtml, returnMessage, shortDate } from "@/mobile/utils/recordDocuments";
import { ActionBar, ActionBarSpace, ActionButton, InfoRows, LineItems, RecordHero, RecordState, Section } from "@/mobile/components/RecordPage";
import useRecordShare from "@/mobile/hooks/useRecordShare";

/** Mobile > Returns > one return: the customer, the invoice it is against, the items and what was refunded, and Share. */
export default function ReturnDetailScreen({ returnId }) {
  const fetchReturn = useCallback(async ({ signal }) => (await api.get(`/pos-returns/${returnId}`, { signal })).data?.data, [returnId]);
  const { data: ret, loading, error, reload } = useAsyncQuery(fetchReturn, { enabled: Boolean(returnId) });
  const { store, busy, run, alert } = useRecordShare();
  const doc = useMemo(() => (ret ? normalizeReturn(ret) : null), [ret]);

  const state = <RecordState loading={loading} error={error} notFound={!loading && !error && !doc} onRetry={reload} />;
  if (!doc) return state;

  const share = () => run({ html: returnHtml({ store, doc }), filename: `Return-${doc.number.replace(/\//g, "-")}.pdf`, text: returnMessage({ store, doc }), phone: doc.customer.phone });

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <RecordHero label="Sales return" title={doc.number} subtitle={shortDate(doc.date)} amount={doc.total} amountLabel="Total refund" status={doc.status} />
      {alert}
      <Section title="Customer"><InfoRows rows={[["Name", doc.customer.name], ["Phone", doc.customer.phone], ["Against invoice", doc.against], ["Refunded by", doc.refundMode]]} /></Section>
      <Section title={`Items (${doc.items.length})`}><LineItems items={doc.items} rateLabel="refund" empty="No items on this return." /></Section>
      <ActionBarSpace />
      <ActionBar><ActionButton tone="share" icon={MessageCircle} label="Share" busy={busy} onClick={() => void share()} /></ActionBar>
    </Box>
  );
}

import { useCallback } from "react";
import { Box, Typography } from "@mui/material";
import { MessageCircle, Phone } from "lucide-react";
import api from "@/shared/api/apiClient";
import useAsyncQuery from "@/shared/hooks/useAsyncQuery";
import { whatsappLink } from "@/mobile/utils/dealerDocuments";
import { STATUS_TONES, rupees, shortDate } from "@/mobile/utils/recordDocuments";
import { ActionBar, ActionBarSpace, ActionButton, InfoRows, RecordHero, RecordState, Section } from "@/mobile/components/RecordPage";

/** Mobile > Customers > one customer: contact, dues, credit limit, loyalty points, recent bills (tap to open), call and WhatsApp. */
export default function CustomerDetailScreen({ customerId, onOpenSale }) {
  const fetchCustomer = useCallback(async ({ signal }) => {
    const [customer, sales] = await Promise.all([
      api.get(`/customers/${customerId}`, { signal }),
      api.get("/pos-sales", { params: { customer_id: customerId, limit: 20 }, signal }).catch(() => ({ data: { data: [] } })),
    ]);
    const list = sales.data?.data;
    return { customer: customer.data?.data, sales: Array.isArray(list) ? list : list?.data || [] };
  }, [customerId]);
  const { data, loading, error, reload } = useAsyncQuery(fetchCustomer, { enabled: Boolean(customerId) });
  const customer = data?.customer;

  const state = <RecordState loading={loading} error={error} notFound={!loading && !error && !customer} onRetry={reload} />;
  if (!customer) return state;

  const owes = Number(customer.current_balance || 0);
  const address = [customer.address, customer.city, customer.state, customer.pincode].filter(Boolean).join(", ");
  const sales = data.sales;
  const reminder = `Dear ${customer.name}, ${owes > 0 ? `${rupees(owes)} is pending on your account. Please arrange the payment.` : "thank you for shopping with us."}`;

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <RecordHero label="Customer" title={customer.name} subtitle={customer.code} amount={owes} amountLabel={owes > 0 ? "Owes us" : "Nothing owed"} />
      <Section title="Details">
        <InfoRows rows={[["Phone", customer.phone], ["Email", customer.email], ["GSTIN", customer.gstin], ["Address", address],
          ["Credit limit", Number(customer.credit_limit) > 0 ? rupees(customer.credit_limit) : ""], ["Loyalty points", Number(customer.loyalty_points) > 0 ? Number(customer.loyalty_points) : ""]]} />
      </Section>
      <Section title={`Recent bills (${sales.length})`}>
        {sales.length === 0 ? <Typography sx={{ fontSize: 13, color: "var(--vx-muted, #64748b)" }}>No bills for this customer yet.</Typography> : (
          <Box component="ul" aria-label="Bills" sx={{ listStyle: "none", m: 0, p: 0 }}>
            {sales.map((sale, index) => {
              const status = String(sale.status || "").toLowerCase();
              return (
                <Box component="li" key={sale.id} sx={{ borderTop: index ? "1px solid var(--vx-border, #e2e8f0)" : 0 }}>
                  <Box component="button" type="button" aria-label={`Open invoice ${sale.bill_no || sale.invoice_no}`} onClick={() => onOpenSale?.(sale.id)}
                    sx={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 1, py: 1, border: 0, bgcolor: "transparent", textAlign: "left", cursor: "pointer", color: "inherit" }}>
                    <Box>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "var(--vx-text, #0f172a)" }}>{sale.bill_no || sale.invoice_no}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: "var(--vx-muted, #64748b)" }}>{shortDate(sale.sale_date || sale.created_at)}</Typography>
                    </Box>
                    <Box sx={{ textAlign: "right" }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 800, color: "var(--vx-text, #0f172a)" }}>{rupees(sale.grand_total)}</Typography>
                      <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "capitalize", color: STATUS_TONES[status] || "#475569" }}>{status}</Typography>
                    </Box>
                  </Box>
                </Box>
              );
            })}
          </Box>
        )}
      </Section>
      <ActionBarSpace />
      {customer.phone ? (
        <ActionBar>
          <ActionButton icon={Phone} label="Call" href={`tel:${customer.phone}`} />
          <ActionButton tone="share" icon={MessageCircle} label="WhatsApp" href={whatsappLink(customer.phone, reminder)} />
        </ActionBar>
      ) : null}
    </Box>
  );
}

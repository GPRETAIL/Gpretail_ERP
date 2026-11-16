import { TYPE } from "@/shared/theme/typeScale";
import React from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";
import { formatCurrency } from "@/features/dashboard/utils/dashboardFormatters";

const plural = (n, word) => `${n} ${word}${Number(n) === 1 ? "" : "s"}`;
const BAR_COLORS = ["success.main", "warning.main", "error.light", "error.dark"];

/** Finance dashboard: what dealers owe on dealer invoices, how old it is, and who owes most. */
export default function FinanceDealerOutstanding({ outstanding = {}, privacyMode = false }) {
  const navigate = useNavigate();
  const ageing = outstanding.ageing || [];
  const top = outstanding.top_dealers || [];
  const total = Number(outstanding.total_due || 0);
  const show = (value) => (privacyMode ? "••••" : formatCurrency(value));

  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1, overflow: "auto" }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
        <Box sx={{ color: "warning.main", display: "inline-flex" }}><Users size={16} /></Box>
        <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, flex: 1 }}>Dealer Outstanding</Typography>
        <Typography sx={{ fontSize: 15, fontWeight: 800, color: total > 0 ? "warning.main" : "text.secondary" }}>{show(total)}</Typography>
      </Stack>
      {total <= 0 ? (
        <Typography sx={{ py: 2, textAlign: "center", fontSize: 12, color: "text.disabled" }}>No dealer owes anything</Typography>
      ) : (
        <Box sx={{ display: "grid", gap: 2, gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" } }}>
          <Stack spacing={1} aria-label="Dealer dues by age">
            <Typography sx={{ fontSize: TYPE.small, fontWeight: 700, color: "text.secondary" }}>By age ({plural(outstanding.invoices, "invoice")})</Typography>
            {ageing.map((bucket, index) => (
              <Box key={bucket.label}>
                <Stack direction="row" sx={{ justifyContent: "space-between", fontSize: 12 }}>
                  <span>{bucket.label}</span><span>{show(bucket.amount)} · {bucket.invoices}</span>
                </Stack>
                <Box sx={{ height: 8, borderRadius: 4, bgcolor: "action.hover", overflow: "hidden" }}>
                  <Box sx={{ height: "100%", width: `${total > 0 ? Math.round((bucket.amount / total) * 100) : 0}%`, bgcolor: BAR_COLORS[index] }} />
                </Box>
              </Box>
            ))}
          </Stack>
          <Stack spacing={1}>
            <Typography sx={{ fontSize: TYPE.small, fontWeight: 700, color: "text.secondary" }}>Top dealers due</Typography>
            {top.map((row) => (
              <Stack key={row.customer_id} direction="row" onClick={() => navigate(`/sales/dealer-receipt?customer_id=${row.customer_id}`)} role="button" tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter") navigate(`/sales/dealer-receipt?customer_id=${row.customer_id}`); }}
                sx={{ cursor: "pointer", alignItems: "center", justifyContent: "space-between", fontSize: 12, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}>
                <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 500 }}>{row.customer_name}</Typography>
                <Box sx={{ textAlign: "right" }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 700, color: "warning.main" }}>{show(row.due)}</Typography>
                  <Typography sx={{ fontSize: TYPE.small, color: "text.secondary" }}>{plural(row.invoices, "invoice")} · oldest {plural(row.oldest_days, "day")}</Typography>
                </Box>
              </Stack>
            ))}
          </Stack>
        </Box>
      )}
    </Box>
  );
}

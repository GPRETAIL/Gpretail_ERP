import React from "react";
import { PieChart } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";
import { formatCurrency } from "../../../utils/dashboardFormatters";

// CASH/CARD/CREDIT happen to align with real success/primary/warning tokens; UPI (purple) doesn't
// map onto any semantic token so it's kept as a literal hex, same as other per-series chart colors.
const PAYMENT_MODE_COLOR = {
  CASH: "success.main",
  CARD: "primary.main",
  UPI: "#a855f7",
  CREDIT: "warning.main",
};

export default function SalesPaymentBreakdown({ paymentBreakdown = [], performance = {} }) {
  const maxPaymentAmount = Math.max(...paymentBreakdown.map((p) => p.amount || 0), 1);

  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack spacing={2}>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", pb: 1.5 }}>
          <Typography component="h3" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 700, color: "text.primary" }}>
            <Box sx={{ color: "primary.main", display: "inline-flex" }}>
              <PieChart className="h-4 w-4" />
            </Box>
            Payment Mode Breakdown
          </Typography>
        </Stack>

        <Stack spacing={1.5}>
          {paymentBreakdown.length > 0 ? (
            paymentBreakdown.map((row) => {
              const color = PAYMENT_MODE_COLOR[row.mode] || "text.disabled";
              return (
                <Box key={row.mode} sx={{ borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", p: 1.5 }}>
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                    <Stack direction="row" spacing={1} sx={{ alignItems: "center", fontWeight: 600, color: "text.secondary" }}>
                      <Box sx={{ width: 10, height: 10, borderRadius: "50%", bgcolor: color }} />
                      <Typography component="span" sx={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit" }}>{row.mode}</Typography>
                    </Stack>
                    <Typography component="span" sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}>{formatCurrency(row.amount)}</Typography>
                  </Stack>
                  <Box sx={{ mt: 0.75, height: 6, width: "100%", overflow: "hidden", borderRadius: "50px", bgcolor: "divider" }}>
                    <Box
                      sx={{
                        height: "100%", borderRadius: "50px", bgcolor: color,
                        width: `${Math.min(100, Math.round(((row.amount || 0) / maxPaymentAmount) * 100))}%`,
                      }}
                    />
                  </Box>
                  <Typography sx={{ mt: 0.5, fontSize: 11, color: "text.secondary" }}>{row.bills} bills</Typography>
                </Box>
              );
            })
          ) : (
            <Typography sx={{ py: 2, textAlign: "center", fontSize: 12, color: "text.disabled" }}>No sales in range</Typography>
          )}
        </Stack>

        <Stack sx={{ borderTop: 1, borderColor: "divider", pt: 1.5 }}>
          <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>
            <Typography component="span" sx={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit" }}>Avg Basket Value</Typography>
            <Typography component="span" sx={{ fontSize: "inherit", fontWeight: "inherit", color: "success.main" }}>
              {formatCurrency(performance.avg_basket_value)}
            </Typography>
          </Stack>
          <Stack direction="row" sx={{ mt: 0.5, alignItems: "center", justifyContent: "space-between", fontSize: 12, color: "text.secondary" }}>
            <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>Discount Rate</Typography>
            <Typography component="span" sx={{ fontSize: "inherit", color: "inherit" }}>{performance.discount_rate || "0%"}</Typography>
          </Stack>
        </Stack>
      </Stack>
    </Box>
  );
}

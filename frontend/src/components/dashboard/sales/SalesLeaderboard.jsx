import React from "react";
import { Trophy } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function SalesLeaderboard({ topSalesPersons = [] }) {
  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
        <Box sx={{ color: "warning.main", display: "inline-flex" }}>
          <Trophy className="h-4 w-4" />
        </Box>
        <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>Sales Person Leaderboard</Typography>
      </Stack>
      <Stack spacing={1}>
        {topSalesPersons.length > 0 ? (
          topSalesPersons.map((row, idx) => (
            <Stack
              key={row.sales_man_name}
              direction="row"
              sx={{
                alignItems: "center", justifyContent: "space-between", fontSize: 12,
                borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1,
              }}
            >
              <Stack direction="row" spacing={1} sx={{ alignItems: "center", fontWeight: 500, color: "text.secondary" }}>
                <Box
                  sx={{
                    display: "flex", height: 20, width: 20, alignItems: "center", justifyContent: "center",
                    borderRadius: "50%", fontSize: 10, fontWeight: 700, color: "warning.dark",
                    bgcolor: (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.24 : 0.15),
                  }}
                >
                  {idx + 1}
                </Box>
                <Typography component="span" sx={{ fontSize: "inherit", fontWeight: "inherit", color: "inherit" }}>{row.sales_man_name}</Typography>
              </Stack>
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "text.primary" }}>{formatCurrency(row.amount)}</Typography>
                <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{row.bills} bills</Typography>
              </Box>
            </Stack>
          ))
        ) : (
          <Typography sx={{ py: 2, textAlign: "center", fontSize: 12, color: "text.disabled" }}>No sales-person data in range</Typography>
        )}
      </Stack>
    </Box>
  );
}

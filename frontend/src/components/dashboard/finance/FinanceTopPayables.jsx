import React from "react";
import { Building2 } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";
import { formatCurrency } from "../../../utils/dashboardFormatters";

export default function FinanceTopPayables({ topPayables = [] }) {
  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
        <Box sx={{ color: "error.main", display: "inline-flex" }}>
          <Building2 className="h-4 w-4" />
        </Box>
        <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>Top Outstanding Suppliers</Typography>
      </Stack>
      <Stack spacing={1}>
        {topPayables.length > 0 ? (
          topPayables.map((row, idx) => (
            <Stack
              key={`${row.supplier_id}-${idx}`}
              direction="row"
              sx={{ alignItems: "center", justifyContent: "space-between", fontSize: 12, borderRadius: "7px", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", px: 1.5, py: 1 }}
            >
              <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 500, color: "text.secondary" }}>{row.supplier_name}</Typography>
              <Box sx={{ textAlign: "right" }}>
                <Typography sx={{ fontSize: 12, fontWeight: 700, color: "error.main" }}>{formatCurrency(row.outstanding)}</Typography>
                <Typography sx={{ fontSize: 10, color: "text.secondary" }}>{row.bills} bills</Typography>
              </Box>
            </Stack>
          ))
        ) : (
          <Typography sx={{ py: 2, textAlign: "center", fontSize: 12, color: "text.disabled" }}>No outstanding payables</Typography>
        )}
      </Stack>
    </Box>
  );
}

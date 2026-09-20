import React from "react";
import { BarChart3 } from "lucide-react";
import { Box, Stack, Typography } from "@mui/material";
import { wholeNumber } from "../../../utils/dashboardFormatters";

export default function MastersCategoryChart({ categoryChart = [] }) {
  const maxCategoryCount = Math.max(...categoryChart.map((c) => c.count || 0), 1);

  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: "center" }}>
        <Box sx={{ color: "primary.main", display: "inline-flex" }}>
          <BarChart3 size={16} />
        </Box>
        <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>Products by Category</Typography>
      </Stack>
      <Stack spacing={1}>
        {categoryChart.length > 0 ? (
          categoryChart.map((row) => (
            <Box key={row.category_name}>
              <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 500, color: "text.secondary" }}>{row.category_name}</Typography>
                <Typography component="span" sx={{ fontSize: "inherit", fontWeight: 700, color: "text.primary" }}>{wholeNumber(row.count)}</Typography>
              </Stack>
              <Box sx={{ mt: 0.5, height: 6, width: "100%", overflow: "hidden", borderRadius: "50px", bgcolor: "divider" }}>
                <Box
                  sx={{ height: "100%", borderRadius: "50px", bgcolor: "primary.main", width: `${Math.min(100, Math.round((row.count / maxCategoryCount) * 100))}%` }}
                />
              </Box>
            </Box>
          ))
        ) : (
          <Typography sx={{ py: 2, textAlign: "center", fontSize: 12, color: "text.disabled" }}>No category data</Typography>
        )}
      </Stack>
    </Box>
  );
}

import React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

const cardSx = { height: "100%", borderRadius: "5.25px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2 };

const formatWholeAmount = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const formatCurrency = (value) => `₹${formatWholeAmount(value)}`;

export const LeaderboardCard = ({ table, defaultTitle, loading, icon: Icon, emptyMessage, privacyMode, viewAllPath, viewAllLabel }) => {
  const navigate = useNavigate();
  const rows = table?.rows || [];
  const title = table?.title || defaultTitle || "Summary";
  const blurSx = privacyMode ? { filter: "blur(4px)", userSelect: "none" } : {};

  return (
    <Box sx={cardSx}>
      <Stack direction="row" sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Box sx={{ display: "inline-flex", height: 32, width: 32, alignItems: "center", justifyContent: "center", borderRadius: "50%", bgcolor: "action.hover", color: "text.secondary" }}>
            <Icon style={{ width: 16, height: 16 }} />
          </Box>
          <Typography component="h2" sx={{ fontSize: 14, fontWeight: 600, color: "text.primary" }}>{title}</Typography>
        </Stack>
        {viewAllPath && (
          <Button
            size="small"
            onClick={() => navigate(viewAllPath)}
            sx={{ fontSize: 12, fontWeight: 600, p: 0, minWidth: "auto", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
          >
            {viewAllLabel || "View All"}
          </Button>
        )}
      </Stack>
      {loading ? (
        <Box sx={{ height: 260, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: "text.secondary" }}>Loading...</Box>
      ) : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" sx={{ "& tbody tr:last-child td": { borderBottom: 0 } }}>
            <TableHead>
              <TableRow sx={{ bgcolor: "action.hover" }}>
                <TableCell sx={{ fontSize: 12, color: "text.secondary" }}>Name</TableCell>
                <TableCell align="center" sx={{ fontSize: 12, color: "text.secondary" }}>Sale Qty</TableCell>
                <TableCell align="right" sx={{ fontSize: 12, color: "text.secondary" }}>Value</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.length ? (
                rows.map((row) => (
                  <TableRow key={row.name}>
                    <TableCell sx={{ color: "text.primary" }}>{row.name}</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 500, color: "success.main", ...blurSx }}>
                      {formatWholeAmount(row.saleQty)}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500, color: "info.main", ...blurSx }}>{formatCurrency(row.value)}</TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={3} align="center" sx={{ py: 4, fontSize: 14, color: "text.secondary" }}>
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
};


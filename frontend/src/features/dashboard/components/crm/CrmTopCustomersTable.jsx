import React from "react";
import { useNavigate } from "react-router-dom";
import { UserCheck } from "lucide-react";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";

export default function CrmTopCustomersTable({ topCustomers = [] }) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider",
        bgcolor: "background.paper", p: 2.5, boxShadow: 1,
      }}
    >
      <Stack direction="row" sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" sx={{ alignItems: "center", gap: 1 }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>
            <UserCheck size={20} />
          </Box>
          <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>
            Top Valuable Customers
          </Typography>
        </Stack>
        <Button
          size="small"
          onClick={() => navigate("/crm/customer")}
          sx={{ fontSize: 12, fontWeight: 600, p: 0, minWidth: "auto", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
        >
          View Directory
        </Button>
      </Stack>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& td, & th": { border: 0, fontSize: 12 } }}>
          <TableHead>
            <TableRow sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Name
              </TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Phone
              </TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Points
              </TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Orders
              </TableCell>
              <TableCell align="center" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                360 View
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {topCustomers.length > 0 ? (
              topCustomers.map((cust) => (
                <TableRow
                  key={cust.id}
                  onClick={() => navigate(`/crm/customer/${cust.id}/profile`)}
                  sx={{ cursor: "pointer", borderBottom: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 } }}
                >
                  <TableCell sx={{ py: 1.25, fontWeight: 500, color: "primary.main" }}>{cust.name}</TableCell>
                  <TableCell sx={{ py: 1.25, fontFamily: "monospace", color: "text.secondary" }}>{cust.phone}</TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace", fontWeight: 700, color: "#9333ea" }}>
                    {Number(cust.loyalty_points || 0).toLocaleString()}
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace" }}>{cust.orders_count || 0}</TableCell>
                  <TableCell align="center" sx={{ py: 1.25 }}>
                    <Typography sx={{ fontSize: 12, fontWeight: 600, color: "primary.main", "&:hover": { textDecoration: "underline" } }}>
                      View →
                    </Typography>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.disabled" }}>
                  No customer records found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}

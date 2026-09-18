import React from "react";
import { useNavigate } from "react-router-dom";
import { Cake } from "lucide-react";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

export default function CrmCelebrationsTable({ upcomingEvents = [] }) {
  const navigate = useNavigate();

  return (
    <Box
      sx={{
        height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider",
        bgcolor: "background.paper", p: 2.5, boxShadow: 1,
      }}
    >
      <Stack direction="row" sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
        <Typography component="h3" sx={{ display: "flex", alignItems: "center", gap: 1, fontSize: 13, fontWeight: 700, color: "text.primary" }}>
          <Box sx={{ color: "#f43f5e", display: "inline-flex" }}>
            <Cake className="h-4 w-4" />
          </Box>
          Celebrations & Loyalty Engagement
        </Typography>
        <Button
          size="small"
          onClick={() => navigate("/crm/customer")}
          sx={{ fontSize: 12, fontWeight: 600, p: 0, minWidth: "auto", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
        >
          View all customers
        </Button>
      </Stack>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& td, & th": { border: 0, fontSize: 12 } }}>
          <TableHead>
            <TableRow sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Customer
              </TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Contact
              </TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Occasion
              </TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Points
              </TableCell>
              <TableCell align="center" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>
                Action
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {upcomingEvents.length > 0 ? (
              upcomingEvents.map((row) => (
                <TableRow
                  key={row.id}
                  sx={{ borderBottom: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 } }}
                >
                  <TableCell sx={{ py: 1.25, fontWeight: 500, color: "text.primary" }}>{row.name}</TableCell>
                  <TableCell sx={{ py: 1.25, fontFamily: "monospace", color: "text.secondary" }}>{row.phone}</TableCell>
                  <TableCell sx={{ py: 1.25 }}>
                    <Box
                      component="span"
                      sx={{
                        display: "inline-flex", borderRadius: 1, px: 0.75, py: 0.25, fontSize: 10, fontWeight: 700,
                        bgcolor: (theme) => alpha("#e11d48", theme.palette.mode === "dark" ? 0.24 : 0.15),
                        color: "#e11d48",
                      }}
                    >
                      {row.event_type} ({row.event_date})
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace", fontWeight: 600, color: "#9333ea" }}>
                    {Number(row.points || 0).toLocaleString()}
                  </TableCell>
                  <TableCell align="center" sx={{ py: 1.25 }}>
                    <Button
                      size="small"
                      onClick={() => navigate(`/crm/customer/${row.id}/profile`)}
                      sx={{ fontSize: 12, fontWeight: 600, p: 0, minWidth: "auto", "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
                    >
                      360 Profile →
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.disabled" }}>
                  No upcoming birthdays or anniversaries this week.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}

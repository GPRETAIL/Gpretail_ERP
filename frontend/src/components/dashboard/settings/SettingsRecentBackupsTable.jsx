import React from "react";
import { useNavigate } from "react-router-dom";
import { History } from "lucide-react";
import { Box, Button, Stack, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";

const STATUS_TOKEN = { success: "success", failed: "error", running: "primary" };

export default function SettingsRecentBackupsTable({ recentBackups = [] }) {
  const navigate = useNavigate();

  return (
    <Box sx={{ height: "100%", borderRadius: "10.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", p: 2.5, boxShadow: 1 }}>
      <Stack direction="row" sx={{ mb: 1.5, alignItems: "center", justifyContent: "space-between" }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <Box sx={{ color: "primary.main", display: "inline-flex" }}>
            <History className="h-4 w-4" />
          </Box>
          <Typography component="h3" sx={{ fontSize: 13, fontWeight: 700, color: "text.primary" }}>Recent Backups</Typography>
        </Stack>
        <Button
          size="small"
          onClick={() => navigate("/settings/backup")}
          sx={{ p: 0, minWidth: "auto", fontSize: 12, fontWeight: 600, "&:hover": { bgcolor: "transparent", textDecoration: "underline" } }}
        >
          Open Backup Center
        </Button>
      </Stack>
      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" sx={{ "& td, & th": { border: 0, fontSize: 12 } }}>
          <TableHead>
            <TableRow sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>File</TableCell>
              <TableCell sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Type</TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Size</TableCell>
              <TableCell align="center" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Status</TableCell>
              <TableCell align="right" sx={{ pb: 1, fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Completed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {recentBackups.length > 0 ? (
              recentBackups.map((row) => (
                <TableRow key={row.id} sx={{ borderBottom: "1px solid", borderColor: "divider", "&:hover": { bgcolor: "action.hover" }, "&:last-of-type": { borderBottom: 0 } }}>
                  <TableCell
                    sx={{ py: 1.25, fontWeight: 500, color: "text.primary", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                    title={row.file_name}
                  >
                    {row.file_name}
                  </TableCell>
                  <TableCell sx={{ py: 1.25, color: "text.secondary", textTransform: "uppercase" }}>{row.backup_type}</TableCell>
                  <TableCell align="right" sx={{ py: 1.25, fontFamily: "monospace" }}>{row.file_size_label || "-"}</TableCell>
                  <TableCell align="center" sx={{ py: 1.25 }}>
                    <Box
                      component="span"
                      sx={(theme) => {
                        const token = STATUS_TOKEN[row.status];
                        return {
                          display: "inline-flex", borderRadius: 1, px: 0.75, py: 0.25,
                          fontSize: 10, fontWeight: 700, textTransform: "uppercase",
                          ...(token
                            ? { bgcolor: alpha(theme.palette[token].main, theme.palette.mode === "dark" ? 0.24 : 0.15), color: `${token}.main` }
                            : { bgcolor: "action.selected", color: "text.secondary" }),
                        };
                      }}
                    >
                      {row.status}
                    </Box>
                  </TableCell>
                  <TableCell align="right" sx={{ py: 1.25, color: "text.secondary" }}>
                    {row.completed_at ? new Date(row.completed_at).toLocaleDateString("en-IN") : "-"}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 3, color: "text.disabled" }}>
                  No backups recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
    </Box>
  );
}

import { useEffect, useState } from "react";
import { Box, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";

/** CRM > Loyalty > Expiring: customers whose points expire soon, to call or message before they lapse. */
export default function LoyaltyExpiring() {
  const [days, setDays] = useState(30);
  const [rows, setRows] = useState(null);

  useEffect(() => {
    let alive = true;
    api.get("/loyalty/expiring", { params: { days } }).then((res) => alive && setRows(res.data?.data || [])).catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, [days]);

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", mb: 1 }}>
        <TextField select size="small" label="Expiring within" value={days} onChange={(e) => setDays(Number(e.target.value))} sx={{ width: 180 }}>
          {[7, 15, 30, 60, 90].map((d) => <MenuItem key={d} value={d}>{d} days</MenuItem>)}
        </TextField>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>
          Points expire at night after their date. Customers are reminded 7 days before when a channel is on in Settings &gt; Messaging.
        </Typography>
      </Stack>
      <Table size="small" aria-label="Points expiring soon">
        <TableHead><TableRow><TableCell>Customer</TableCell><TableCell>Phone</TableCell><TableCell>First expiry</TableCell><TableCell align="right">Points expiring</TableCell></TableRow></TableHead>
        <TableBody>
          {rows && rows.length === 0 && <TableRow><TableCell colSpan={4} sx={{ color: "text.secondary" }}>No points expire in this period.</TableCell></TableRow>}
          {(rows || []).map((r) => (
            <TableRow key={r.customer_id}>
              <TableCell>{r.name}</TableCell>
              <TableCell>{r.phone || "--"}</TableCell>
              <TableCell>{new Date(`${r.expires_at}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600 }}>{r.points}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Box>
  );
}

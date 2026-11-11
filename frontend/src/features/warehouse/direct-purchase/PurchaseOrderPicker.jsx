import { TYPE } from "@/shared/theme/typeScale";
import { useEffect, useState } from "react";
import { Box, Button, MenuItem, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import { muiFieldSx } from "@/shared/theme/formControlSizes";
import { lineLabel, qty } from "@/features/store/utils/purchaseOrderPrint";

const pendingOf = (line) => Math.max(0, Number(line.quantity) - Number(line.received_qty || 0));

/**
 * "Against PO" on Direct Purchase: the supplier's approved purchase orders. Choosing one links this purchase to it
 * (what it brings in counts as received there) and lists ordered / received / pending; "Use" puts a pending line
 * into the item row to complete and add as usual.
 */
export default function PurchaseOrderPicker({ supplierId, value, onChange, onUseLine }) {
  const [orders, setOrders] = useState([]);
  const [order, setOrder] = useState(null);

  useEffect(() => {
    let active = true;
    const load = supplierId
      ? api.get("/purchase-orders", { params: { status: "approved", supplier_id: supplierId } }).then((res) => res.data?.data || [])
      : Promise.resolve([]);
    load.then((rows) => { if (active) setOrders(rows); }).catch(() => { if (active) setOrders([]); });
    return () => { active = false; };
  }, [supplierId]);

  useEffect(() => {
    let active = true;
    const load = value ? api.get(`/purchase-orders/${value}`).then((res) => res.data?.data || null) : Promise.resolve(null);
    load.then((data) => { if (active) setOrder(data); }).catch(() => { if (active) setOrder(null); });
    return () => { active = false; };
  }, [value]);

  // An order this purchase already completed is closed, so it is no longer in the approved list; keep it selectable.
  const options = order && !orders.some((row) => row.id === order.id) ? [order, ...orders] : orders;
  if (!supplierId || (options.length === 0 && !value)) return null;

  return (
    <Box sx={{ mb: 1 }}>
      <Typography component="label" sx={{ mb: 0.5, display: "block", fontSize: TYPE.label, fontWeight: 700, color: "error.dark" }}>Against PO</Typography>
      <TextField select size="small" fullWidth sx={muiFieldSx} value={value || ""}
        onChange={(e) => onChange(options.find((row) => String(row.id) === String(e.target.value)) || null)}
        slotProps={{ htmlInput: { "aria-label": "Against PO" } }}>
        <MenuItem value="">Not against a purchase order</MenuItem>
        {options.map((row) => (
          <MenuItem key={row.id} value={String(row.id)}>
            {row.po_no} · {qty(row.total_qty)} ordered{Number(row.received_qty) > 0 ? ` · ${qty(row.received_qty)} received` : ""}
          </MenuItem>
        ))}
      </TextField>
      {order && String(order.id) === String(value) && (
        <Table size="small" sx={{ mt: 0.5, "& td, & th": { fontSize: TYPE.small, py: 0.25, px: 0.75 } }}>
          <TableHead><TableRow><TableCell>Item</TableCell><TableCell align="right">Ordered</TableCell><TableCell align="right">Received</TableCell><TableCell align="right">Pending</TableCell><TableCell /></TableRow></TableHead>
          <TableBody>
            {(order.items || []).map((line) => (
              <TableRow key={line.id}>
                <TableCell>{lineLabel(line)}</TableCell>
                <TableCell align="right">{qty(line.quantity)}</TableCell>
                <TableCell align="right">{qty(line.received_qty || 0)}</TableCell>
                <TableCell align="right">{qty(pendingOf(line))}</TableCell>
                <TableCell align="right">
                  <Button size="small" sx={{ minWidth: 0, py: 0, fontSize: TYPE.small }} disabled={pendingOf(line) <= 0} onClick={() => onUseLine(line, pendingOf(line))}>Use</Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </Box>
  );
}

import { useEffect, useState } from "react";
import { Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Table, TableBody, TableCell, TableHead, TableRow, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import { storeApi } from "../utils/reprintDocuments";

const when = (value) => (value ? new Date(value).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-");

/** Who reprinted or shared one document, when, which copy and why. */
export default function ReprintHistoryDialog({ row, onClose }) {
  const [entries, setEntries] = useState(null);

  useEffect(() => {
    let alive = true;
    storeApi(api, row.store_id).get(`/bill-reprints/${row.type}/${row.id}/history`)
      .then((res) => alive && setEntries(res.data?.data || []))
      .catch(() => alive && setEntries([]));
    return () => { alive = false; };
  }, [row.id, row.store_id, row.type]);

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth aria-labelledby="reprint-history-title">
      <DialogTitle id="reprint-history-title">Reprints of {row.type_label} {row.number}</DialogTitle>
      <DialogContent>
        {entries === null ? <CircularProgress size={22} /> : entries.length === 0 ? (
          <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Not reprinted yet.</Typography>
        ) : (
          <Table size="small" aria-label="Reprint history">
            <TableHead><TableRow><TableCell>#</TableCell><TableCell>When</TableCell><TableCell>By</TableCell><TableCell>How</TableCell><TableCell>Copy</TableCell><TableCell>Reason</TableCell></TableRow></TableHead>
            <TableBody>
              {entries.map((e, i) => (
                <TableRow key={e.id}>
                  <TableCell>{entries.length - i}</TableCell>
                  <TableCell>{when(e.printed_at)}</TableCell>
                  <TableCell>{e.user_name || "-"}</TableCell>
                  <TableCell>{e.channel === "share" ? "WhatsApp PDF" : "Print"}</TableCell>
                  <TableCell>{e.copy_label || "-"}</TableCell>
                  <TableCell>{e.reason || "-"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Close</Button></DialogActions>
    </Dialog>
  );
}

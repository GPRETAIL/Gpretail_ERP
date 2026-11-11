import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableRow, Typography } from "@mui/material";
import { MessageCircle, Printer } from "lucide-react";
import api from "@/shared/api/apiClient";
import { browserPrintHtml } from "@/features/sales/pos/utils/posSalesUtils";
import { errorMessage } from "../utils/hrStatus";
import { payslipHtml, payslipWhatsAppUrl, rupees } from "./payslipPrint";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";

const days = (value) => { const n = Number(value) || 0; return Number.isInteger(n) ? String(n) : n.toFixed(1); };

/** One payslip: summary, earnings and deductions, with Print/PDF and WhatsApp. `mine` loads it from my-payslips. */
export default function PayslipDialog({ id, mine = false, onClose }) {
  const [slip, setSlip] = useState(null);
  useEffect(() => {
    let active = true;
    api.get(mine ? `/my-payslips/${id}` : `/payslips/${id}`)
      .then((res) => { if (active) setSlip(res.data?.data || null); })
      .catch((err) => { toast.error(errorMessage(err, "Could not open the payslip")); onClose(); });
    return () => { active = false; };
  }, [id, mine, onClose]);

  const cell = { py: 0.5, fontSize: 12.5, borderBottom: "1px solid", borderColor: "divider" };
  const lines = (title, list, total) => (
    <Box sx={{ flex: 1, minWidth: 220 }}>
      <Typography variant="subtitle2" sx={{ mb: 0.5 }}>{title}</Typography>
      <Table size="small"><TableBody>
        {list.map((line) => <TableRow key={line.code}><TableCell sx={cell}>{line.name}</TableCell><TableCell sx={cell} align="right">{rupees(line.amount)}</TableCell></TableRow>)}
        <TableRow><TableCell sx={{ ...cell, fontWeight: 700 }}>Total</TableCell><TableCell sx={{ ...cell, fontWeight: 700 }} align="right">{rupees(total)}</TableCell></TableRow>
      </TableBody></Table>
    </Box>
  );

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>
        {slip ? `Payslip · ${slip.snapshot?.name || ""} · ${slip.month_label}` : "Payslip"}
      </DialogTitle>
      <DialogContent>
        {!slip ? <LoadingSkeleton variant="table" rows={8} label="Loading payslip" /> : (
          <Stack spacing={1.5}>
            <Typography variant="body2" color="text.secondary">
              Payable {days(slip.payable_days)} of {days(slip.days_in_month)} days · Loss of pay {days(slip.lop_days)} · Gross salary ₹{rupees(slip.gross_fixed)}
              {slip.held ? " · Salary on hold" : ""}
            </Typography>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              {lines("Earnings", slip.earnings || [], slip.gross_earned)}
              {lines("Deductions", slip.deductions || [], slip.total_deductions)}
            </Stack>
            <Box sx={{ display: "flex", justifyContent: "space-between", border: 2, borderColor: "text.primary", borderRadius: 1, px: 1.5, py: 1, fontWeight: 700, fontSize: 16 }}>
              <span>Net pay</span><span>₹ {rupees(slip.net_pay)}</span>
            </Box>
            <Typography variant="caption" color="text.secondary">Employer PF ₹{rupees(slip.employer_pf)} · Employer ESI ₹{rupees(slip.employer_esi)} (not deducted from pay)</Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button startIcon={<MessageCircle size={14} />} disabled={!slip} component="a" href={slip ? payslipWhatsAppUrl(slip) : undefined} target="_blank" rel="noopener noreferrer">WhatsApp</Button>
        <Button startIcon={<Printer size={14} />} disabled={!slip} onClick={() => browserPrintHtml(payslipHtml(slip))}>Print / PDF</Button>
        <Button variant="contained" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

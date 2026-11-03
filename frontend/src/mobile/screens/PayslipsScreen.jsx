import { useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { ChevronLeft, MessageCircle, Printer } from "lucide-react";
import api from "@/shared/api/apiClient";
import { browserPrintHtml } from "@/features/sales/pos/utils/posSalesUtils";
import { errorMessage } from "@/features/hr/utils/hrStatus";
import { monthLabel, payslipHtml, payslipWhatsAppUrl, rupees } from "@/features/hr/payroll/payslipPrint";

const card = { p: 1.5, borderRadius: "16px", bgcolor: "#fff", border: "1px solid rgba(226,232,240,0.8)" };
const days = (value) => { const n = Number(value) || 0; return Number.isInteger(n) ? String(n) : n.toFixed(1); };

function SlipDetail({ id, onBack }) {
  const [slip, setSlip] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    api.get(`/my-payslips/${id}`).then((res) => { if (active) setSlip(res.data?.data || null); })
      .catch((err) => { if (active) setError(errorMessage(err, "Could not open the payslip.")); });
    return () => { active = false; };
  }, [id]);
  const row = (label, amount, strong = false) => (
    <Box key={label} sx={{ display: "flex", justifyContent: "space-between", py: 0.5, fontSize: 12.5, fontWeight: strong ? 800 : 500, color: "#0f172a" }}>
      <span>{label}</span><span>₹{rupees(amount)}</span>
    </Box>
  );
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box component="button" type="button" onClick={onBack} sx={{ alignSelf: "flex-start", display: "flex", alignItems: "center", gap: 0.5, border: 0, bgcolor: "transparent", fontWeight: 800, color: "#4f46e5", fontSize: 12.5 }}>
        <ChevronLeft size={16} /> All payslips
      </Box>
      {error && <Box sx={{ ...card, color: "#be123c", fontSize: 12.5 }}>{error}</Box>}
      {slip && (
        <>
          <Box sx={{ p: 2, borderRadius: "20px", color: "#fff", background: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)" }}>
            <Typography sx={{ fontSize: 11, fontWeight: 700, opacity: 0.85, textTransform: "uppercase" }}>{slip.month_label}</Typography>
            <Typography sx={{ fontSize: 26, fontWeight: 900 }}>₹{rupees(slip.net_pay)}</Typography>
            <Typography sx={{ fontSize: 11.5, opacity: 0.9 }}>Net pay · {days(slip.payable_days)} of {days(slip.days_in_month)} days paid{slip.held ? " · on hold" : ""}</Typography>
          </Box>
          <Box sx={card}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#059669", textTransform: "uppercase", mb: 0.5 }}>Earnings</Typography>
            {(slip.earnings || []).map((line) => row(line.name, line.amount))}
            {row("Gross", slip.gross_earned, true)}
          </Box>
          <Box sx={card}>
            <Typography sx={{ fontSize: 11, fontWeight: 900, color: "#be123c", textTransform: "uppercase", mb: 0.5 }}>Deductions</Typography>
            {(slip.deductions || []).length === 0 && <Typography sx={{ fontSize: 12.5, color: "#94a3b8" }}>None</Typography>}
            {(slip.deductions || []).map((line) => row(line.name, line.amount))}
            {row("Total deductions", slip.total_deductions, true)}
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Box component="a" href={payslipWhatsAppUrl(slip)} target="_blank" rel="noopener noreferrer"
              sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 1.2, borderRadius: "12px", bgcolor: "#16a34a", color: "#fff", fontWeight: 800, fontSize: 13, textDecoration: "none" }}>
              <MessageCircle size={16} /> WhatsApp
            </Box>
            <Box component="button" type="button" onClick={() => browserPrintHtml(payslipHtml(slip))}
              sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, py: 1.2, borderRadius: "12px", border: "1px solid #cbd5e1", bgcolor: "#fff", fontWeight: 800, fontSize: 13 }}>
              <Printer size={16} /> Print / PDF
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

/** Mobile Payslips: the employee's payslips by month, and each one's earnings, deductions and net pay. */
export default function PayslipsScreen() {
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);
  useEffect(() => {
    let active = true;
    api.get("/my-payslips").then((res) => { if (active) setData(res.data?.data || { employee: null, payslips: [] }); })
      .catch(() => { if (active) setData({ employee: null, payslips: [] }); });
    return () => { active = false; };
  }, []);

  if (open) return <SlipDetail id={open} onBack={() => setOpen(null)} />;
  if (!data) return <Box sx={card}><Typography sx={{ fontSize: 12.5, color: "#94a3b8" }}>Loading…</Typography></Box>;
  if (!data.employee) return <Box sx={card}><Typography sx={{ fontSize: 12.5, color: "#64748b" }}>Your login is not linked to an employee yet. Ask HR to link it on your employee record.</Typography></Box>;
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {data.payslips.length === 0 && <Box sx={card}><Typography sx={{ fontSize: 12.5, color: "#94a3b8" }}>No payslips yet.</Typography></Box>}
      {data.payslips.map((slip) => (
        <Box key={slip.id} component="button" type="button" onClick={() => setOpen(slip.id)}
          sx={{ ...card, display: "flex", alignItems: "center", justifyContent: "space-between", textAlign: "left", width: "100%", "&:active": { transform: "scale(0.99)" } }}>
          <Box>
            <Typography sx={{ fontSize: 13, fontWeight: 900, color: "#0f172a" }}>{monthLabel(slip.month)}</Typography>
            <Typography sx={{ fontSize: 11, color: "#64748b" }}>{slip.held ? "On hold" : slip.status === "PAID" ? "Paid" : "Payable"}</Typography>
          </Box>
          <Typography sx={{ fontSize: 15, fontWeight: 900, color: "#4338ca" }}>₹{rupees(slip.net_pay)}</Typography>
        </Box>
      ))}
    </Box>
  );
}

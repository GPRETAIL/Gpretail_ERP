import { Box, Typography } from "@mui/material";
import PayslipsScreen from "@/mobile/screens/PayslipsScreen";
import TaxScreen from "@/mobile/screens/TaxScreen";
import { STAFF_COLOR, STAFF_TEXT, card, rupee } from "../staffUi";
import RevealToggle from "../RevealToggle";
import useReveal, { MASKED_AMOUNT } from "../useReveal";

/** Salary: this financial year's pay so far, the payslips (view, print, WhatsApp) and my income tax. Amounts stay hidden until revealed. */
export default function SalaryTab({ home, view, setView }) {
  const pay = home?.pay;
  const reveal = useReveal();
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      <Box role="tablist" sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0.5, p: 0.5, borderRadius: "14px", bgcolor: STAFF_COLOR.surfaceAlt }}>
        {[["slips", "Payslips"], ["tax", "Income tax"]].map(([key, label]) => (
          <Box key={key} role="tab" aria-selected={view === key} component="button" type="button" onClick={() => setView(key)}
            sx={{ minHeight: 40, borderRadius: "10px", border: 0, bgcolor: view === key ? STAFF_COLOR.surface : "transparent", color: STAFF_COLOR.text, fontSize: STAFF_TEXT.label, fontWeight: 800, fontFamily: "inherit", cursor: "pointer",
              boxShadow: view === key ? "0 1px 2px rgba(0,0,0,0.12)" : "none" }}>
            {label}
          </Box>
        ))}
      </Box>
      {view === "tax" ? <TaxScreen /> : (
        <>
          {pay && (
            <Box sx={{ ...card, background: "linear-gradient(135deg, #0f766e, #0d9488)", border: 0, color: "#fff" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
                <Typography sx={{ fontSize: STAFF_TEXT.small, fontWeight: 700, opacity: 0.9 }}>Take-home in FY {pay.financial_year}</Typography>
                <RevealToggle reveal={reveal} light />
              </Box>
              <Typography aria-live="polite" sx={{ fontSize: STAFF_TEXT.big, fontWeight: 800, fontVariantNumeric: "tabular-nums" }}>{reveal.shown ? rupee(pay.year_net) : MASKED_AMOUNT}</Typography>
              <Typography sx={{ fontSize: STAFF_TEXT.small, opacity: 0.9 }}>Gross earned {reveal.shown ? rupee(pay.year_gross) : MASKED_AMOUNT}</Typography>
            </Box>
          )}
          <PayslipsScreen masked={!reveal.shown} />
        </>
      )}
    </Box>
  );
}

import { useCallback, useEffect, useState } from "react";
import { Box, Typography } from "@mui/material";
import { Camera } from "lucide-react";
import api from "@/shared/api/apiClient";
import { errorMessage } from "@/features/hr/utils/hrStatus";
import { PROOF_STATUS, REGIME_LABEL, SECTION } from "@/features/hr/tax/taxShared";

const card = { p: 1.5, borderRadius: "16px", bgcolor: "var(--hr-surface, #fff)", border: "1px solid var(--hr-border, rgba(226,232,240,0.8))" };
const heading = { fontSize: 11, fontWeight: 900, color: "var(--hr-text, #0f172a)", textTransform: "uppercase", letterSpacing: "0.05em", mb: 1, px: 0.5 };
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
const COLORS = { NONE: "var(--hr-muted, #64748b)", SUBMITTED: "var(--hr-amber-text, #b45309)", VERIFIED: "var(--hr-green-text, #047857)", REJECTED: "var(--hr-danger, #be123c)" };

/** Mobile My Tax: the year's estimate under both regimes, switch regime, photograph proofs. Declaring items is on the web. */
export default function TaxScreen() {
  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const load = useCallback(async () => {
    try {
      setData((await api.get("/tax-declarations/mine")).data?.data || {});
    } catch (err) {
      setMessage(errorMessage(err, "Could not load your tax."));
      setData({});
    }
  }, []);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  if (data && !data.employee) {
    return <Box sx={card}><Typography sx={{ fontSize: 12.5, color: "var(--hr-muted, #64748b)" }}>Your login is not linked to an employee yet. Ask HR to link it on your employee record.</Typography></Box>;
  }
  const regime = data?.declaration?.regime || "NEW";
  const locked = Boolean(data?.declaration?.locked);
  const mine = data?.estimate?.[regime === "OLD" ? "old" : "new"];
  const switchTo = async (next) => {
    setMessage("");
    try {
      await api.put("/tax-declarations/mine", { regime: next, items: (data.items || []).map((i) => ({ id: i.id, section: i.section, description: i.description, declared_amount: i.declared_amount, details: i.details })) });
      setMessage(`Switched to the ${REGIME_LABEL[next].toLowerCase()}.`);
      await load();
    } catch (err) {
      setMessage(errorMessage(err, "Could not change the regime."));
    }
  };
  const upload = async (item, file) => {
    const body = new FormData();
    body.append("proof", file);
    try {
      await api.post(`/tax-declaration-items/${item.id}/proof`, body, { headers: { "Content-Type": "multipart/form-data" } });
      setMessage("Proof sent to HR.");
      await load();
    } catch (err) {
      setMessage(errorMessage(err, "Could not upload the proof."));
    }
  };
  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
      {message && <Box sx={{ p: 1.25, borderRadius: "12px", bgcolor: "var(--hr-info-bg, #eef2ff)", color: "var(--hr-info-text, #3730a3)", fontSize: 12, fontWeight: 700 }}>{message}</Box>}
      <Box sx={{ display: "flex", gap: 1 }}>
        {["NEW", "OLD"].map((key) => {
          const e = data?.estimate?.[key === "OLD" ? "old" : "new"];
          return (
            <Box key={key} component="button" type="button" disabled={!data || locked || regime === key} onClick={() => switchTo(key)}
              sx={{ ...card, flex: 1, textAlign: "left", borderWidth: regime === key ? 2 : 1, borderColor: regime === key ? "#0d9488" : "var(--hr-border, rgba(226,232,240,0.8))" }}>
              <Typography sx={{ fontSize: 11, fontWeight: 800, color: "var(--hr-muted, #64748b)" }}>{REGIME_LABEL[key]}{regime === key ? " · chosen" : ""}</Typography>
              <Typography sx={{ fontSize: 20, fontWeight: 900, color: "var(--hr-text, #0f172a)" }}>{money(e?.tax?.total)}</Typography>
              <Typography sx={{ fontSize: 10.5, color: "var(--hr-faint, #94a3b8)" }}>tax for the year</Typography>
            </Box>
          );
        })}
      </Box>
      {mine && (
        <Box sx={card}>
          <Typography sx={{ fontSize: 12.5, color: "var(--hr-text, #0f172a)" }}>Taxable {money(mine.taxable)} · deducted so far {money(mine.tds_deducted)}</Typography>
          <Typography sx={{ fontSize: 15, fontWeight: 900, color: "var(--hr-teal-text, #0f766e)", mt: 0.5 }}>{money(mine.tds_month)} a month from now</Typography>
          {mine.no_pan && <Typography sx={{ fontSize: 11.5, color: "var(--hr-danger, #be123c)", mt: 0.5 }}>No PAN on your record: tax is deducted at a higher rate.</Typography>}
        </Box>
      )}
      <Box>
        <Typography sx={heading}>Declared ({data?.fy})</Typography>
        {(data?.items || []).length === 0 && <Box sx={card}><Typography sx={{ fontSize: 12.5, color: "var(--hr-faint, #94a3b8)" }}>Nothing declared yet. Add rent, investments and insurance on My Tax on the web.</Typography></Box>}
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {(data?.items || []).map((item) => (
            <Box key={item.id} sx={{ ...card, display: "flex", alignItems: "center", gap: 1 }}>
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography sx={{ fontSize: 12.5, fontWeight: 800, color: "var(--hr-text, #0f172a)" }}>{SECTION[item.section]?.label} · {money(item.declared_amount)}</Typography>
                <Typography sx={{ fontSize: 11, fontWeight: 800, color: COLORS[item.proof_status] }}>{PROOF_STATUS[item.proof_status]?.label}{item.note ? ` · ${item.note}` : ""}</Typography>
              </Box>
              {!locked && item.proof_status !== "VERIFIED" && (
                <Box component="label" sx={{ display: "flex", alignItems: "center", gap: 0.5, px: 1, py: 0.75, borderRadius: "10px", border: "1px dashed var(--hr-faint, #94a3b8)", fontSize: 11.5, fontWeight: 800, color: "var(--hr-muted-strong, #334155)" }}>
                  <Camera size={14} /> Proof
                  <input hidden type="file" accept="image/*,application/pdf" capture="environment" aria-label={`Proof for ${SECTION[item.section]?.label}`} onChange={(e) => e.target.files?.[0] && upload(item, e.target.files[0])} />
                </Box>
              )}
            </Box>
          ))}
        </Box>
      </Box>
    </Box>
  );
}

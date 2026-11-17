import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Box, Button, IconButton, Stack, TextField, Typography } from "@mui/material";
import { Plus, Save, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import { loyaltyApiError } from "../utils/loyaltyTypes";

const blank = () => ({ name: "", min_spend: "", multiplier: "1" });

/** CRM > Loyalty > Tiers: a customer's tier comes from their spend in the last 12 months and multiplies points earned. */
export default function LoyaltyTiers() {
  const [rows, setRows] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    api.get("/loyalty/tiers").then((res) => alive && setRows((res.data?.data || []).map((t) => ({ name: t.name, min_spend: String(Number(t.min_spend)), multiplier: String(Number(t.multiplier)) }))))
      .catch(() => alive && setRows([]));
    return () => { alive = false; };
  }, []);

  if (!rows) return null;
  const set = (i, key, value) => setRows((list) => list.map((r, n) => (n === i ? { ...r, [key]: value } : r)));

  const save = async () => {
    setSaving(true);
    try {
      const tiers = rows.filter((r) => r.name.trim()).map((r) => ({ name: r.name.trim(), min_spend: Number(r.min_spend || 0), multiplier: Number(r.multiplier || 1) }));
      await api.put("/loyalty/tiers", { tiers });
      toast.success("Tiers saved.");
    } catch (err) {
      toast.error(loyaltyApiError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box component="form" data-enter-ignore="true" onSubmit={(e) => { e.preventDefault(); void save(); }} sx={{ p: 2, maxWidth: 760 }}>
      <Typography sx={{ fontSize: 13, color: "text.secondary", mb: 1.5 }}>
        A customer is in the highest tier whose minimum they spent in the last 12 months. Points earned are multiplied by the tier&apos;s multiplier
        (for example Silver from ₹0 ×1, Gold from ₹25,000 ×1.25, Platinum from ₹75,000 ×1.5). No tiers: everyone earns ×1.
      </Typography>
      <Stack spacing={1}>
        {rows.map((row, i) => (
          <Stack key={i} direction="row" spacing={1} sx={{ alignItems: "center" }}>
            <TextField size="small" label="Tier name" value={row.name} onChange={(e) => set(i, "name", e.target.value)} sx={{ flex: 1 }} />
            <TextField size="small" type="number" label="Spend from (₹, 12 months)" value={row.min_spend} onChange={(e) => set(i, "min_spend", e.target.value)} sx={{ width: 210 }} />
            <TextField size="small" type="number" label="Points ×" value={row.multiplier} onChange={(e) => set(i, "multiplier", e.target.value)}
              slotProps={{ htmlInput: { min: 1, step: 0.05 } }} sx={{ width: 110 }} />
            <IconButton aria-label={`Remove tier ${row.name || i + 1}`} onClick={() => setRows((list) => list.filter((_, n) => n !== i))}><Trash2 size={16} /></IconButton>
          </Stack>
        ))}
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1.5 }}>
        <Button startIcon={<Plus size={15} />} onClick={() => setRows((list) => [...list, blank()])} disabled={rows.length >= 10}>Add tier</Button>
        <Button type="submit" variant="contained" startIcon={<Save size={15} />} disabled={saving}>{saving ? "Saving..." : "Save tiers"}</Button>
      </Stack>
    </Box>
  );
}

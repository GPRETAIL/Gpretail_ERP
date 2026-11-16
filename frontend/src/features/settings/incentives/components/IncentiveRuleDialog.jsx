import { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Stack, Switch, TextField, Typography } from "@mui/material";
import { Plus, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import { RULE_TYPES } from "@/features/settings/incentives/utils/incentiveRules";


const SCOPE_LABELS = { all: "All items", section: "Sections", category: "Categories", brand: "Brands", product: "Products" };

const blank = (type) => ({
  type, name: "", basis: "percent", value: "", scope_type: "all", scope_ids: [], employee_ids: [], department_ids: [],
  min_age_days: type === "ageing" ? 90 : "", target_type: "amount", valid_from: "", valid_to: "", is_active: true,
  slabs: type === "target" ? [{ from: 80, to: 100, type: "percent", value: 1 }, { from: 100, to: "", type: "percent", value: 1.5 }] : [],
});

/** Create or edit one incentive rule. `rule` is the saved rule (edit) or null (new); `options` from /incentives/options. */
export default function IncentiveRuleDialog({ open, type, rule, options, onClose, onSaved }) {
  const [form, setForm] = useState(() => blank(type));
  const [products, setProducts] = useState([]); // chosen products [{ id, name }]
  const [productOptions, setProductOptions] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      setError("");
      setForm(rule ? {
        ...blank(rule.type), ...rule, value: rule.value ?? "", scope_ids: (rule.scope_ids || []).map(String),
        employee_ids: rule.employee_ids || [], department_ids: rule.department_ids || [], slabs: rule.slabs || [],
        valid_from: rule.valid_from || "", valid_to: rule.valid_to || "", min_age_days: rule.min_age_days ?? "",
      } : blank(type));
      setProducts(rule?.scope_type === "product" ? (rule.scope_ids || []).map((id, i) => ({ id: String(id), name: rule.scope_labels?.[i] || `#${id}` })) : []);
    }, 0);
    return () => clearTimeout(timer);
  }, [open, rule, type]);

  const set = (patch) => setForm((current) => ({ ...current, ...patch }));
  const isTarget = form.type === "target";

  const searchProducts = async (text) => {
    if (!text || text.length < 2) return;
    try {
      const res = await api.get("/products", { params: { dropdown: true, search: text, limit: 30 } });
      const rows = res.data?.data || [];
      setProductOptions(rows.map((p) => ({ id: String(p.id), name: `${p.name}${p.code ? ` (${p.code})` : ""}` })));
    } catch {
      setProductOptions([]);
    }
  };

  const scopeChoices = useMemo(() => {
    if (form.scope_type === "category") return (options.categories || []).map((c) => ({ id: String(c.id), name: c.name }));
    if (form.scope_type === "brand") return (options.brands || []).map((b) => ({ id: String(b.id), name: b.name }));
    if (form.scope_type === "section") return (options.sections || []).map((s) => ({ id: s, name: s }));
    return [];
  }, [form.scope_type, options]);

  const save = async () => {
    setSaving(true);
    setError("");
    const body = {
      ...form,
      value: isTarget ? null : Number(form.value || 0),
      scope_ids: form.scope_type === "product" ? products.map((p) => p.id) : form.scope_ids,
      min_age_days: form.type === "ageing" ? Number(form.min_age_days || 0) : null,
      valid_from: form.valid_from || null,
      valid_to: form.valid_to || null,
      slabs: isTarget ? form.slabs.map((s) => ({ from: Number(s.from || 0), to: s.to === "" || s.to === null ? null : Number(s.to), type: s.type, value: Number(s.value || 0) })) : null,
    };
    try {
      if (rule?.id) await api.put(`/incentives/rules/${rule.id}`, body);
      else await api.post("/incentives/rules", body);
      onSaved();
    } catch (err) {
      const data = err?.response?.data;
      setError(data?.errors ? Object.values(data.errors).flat()[0] : data?.message || "Could not save the rule.");
    } finally {
      setSaving(false);
    }
  };

  const multi = (label, choices, value, onChange, extra = {}) => (
    <Autocomplete multiple size="small" options={choices} value={choices.filter((c) => value.includes(c.id))}
      getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, b) => a.id === b.id}
      onChange={(_e, picked) => onChange(picked.map((p) => p.id))} renderInput={(params) => <TextField {...params} label={label} {...extra} />} />
  );

  return (
    <Dialog open={open} onClose={saving ? undefined : onClose} maxWidth="sm" fullWidth aria-labelledby="incentive-rule-title">
      <DialogTitle id="incentive-rule-title">{rule ? "Edit" : "New"} {RULE_TYPES[form.type]?.title.toLowerCase()}</DialogTitle>
      <DialogContent>
        <Typography sx={{ fontSize: 12.5, color: "text.secondary", mb: 2 }}>{RULE_TYPES[form.type]?.help}</Typography>
        <Stack spacing={2}>
          <TextField size="small" label="Name" value={form.name} onChange={(e) => set({ name: e.target.value })} required autoFocus slotProps={{ htmlInput: { maxLength: 150 } }} />

          {!isTarget && (
            <Stack direction="row" spacing={1.5}>
              <TextField select size="small" label="Pay" value={form.basis} onChange={(e) => set({ basis: e.target.value })} sx={{ minWidth: 190 }}>
                <MenuItem value="percent">% of sale value</MenuItem>
                <MenuItem value="per_piece">₹ per piece</MenuItem>
              </TextField>
              <TextField size="small" type="number" label={form.basis === "percent" ? "Percent" : "Amount (₹)"} value={form.value}
                onChange={(e) => set({ value: e.target.value })} slotProps={{ htmlInput: { min: 0, step: "0.01" } }} fullWidth required />
            </Stack>
          )}
          {form.type === "ageing" && (
            <TextField size="small" type="number" label="In stock at least (days)" value={form.min_age_days}
              onChange={(e) => set({ min_age_days: e.target.value })} slotProps={{ htmlInput: { min: 1 } }} required />
          )}

          {!isTarget && (
            <>
              <TextField select size="small" label="Applies to" value={form.scope_type} onChange={(e) => set({ scope_type: e.target.value, scope_ids: [] })}>
                {Object.entries(SCOPE_LABELS).filter(([key]) => key !== "section" || (options.sections || []).length > 0)
                  .map(([key, label]) => <MenuItem key={key} value={key}>{label}</MenuItem>)}
              </TextField>
              {form.scope_type === "product" && (
                <Autocomplete multiple size="small" options={productOptions} value={products} filterOptions={(x) => x}
                  getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, b) => a.id === b.id}
                  onInputChange={(_e, text) => { void searchProducts(text); }} onChange={(_e, picked) => setProducts(picked)}
                  renderInput={(params) => <TextField {...params} label="Products" placeholder="Type a name, code or barcode" />} />
              )}
              {["category", "brand", "section"].includes(form.scope_type) && multi(SCOPE_LABELS[form.scope_type], scopeChoices, form.scope_ids, (ids) => set({ scope_ids: ids }))}
            </>
          )}

          {isTarget && (
            <>
              <TextField select size="small" label="Target is" value={form.target_type} onChange={(e) => set({ target_type: e.target.value })}>
                <MenuItem value="amount">Sales value (₹)</MenuItem>
                <MenuItem value="qty">Quantity sold</MenuItem>
              </TextField>
              <Box>
                <Typography sx={{ fontSize: 13, fontWeight: 600, mb: 1 }}>Slabs (achievement % of target)</Typography>
                {form.slabs.map((slab, index) => (
                  <Stack key={index} direction="row" spacing={1} sx={{ mb: 1, alignItems: "center" }}>
                    <TextField size="small" type="number" label="From %" value={slab.from} sx={{ width: 90 }}
                      onChange={(e) => set({ slabs: form.slabs.map((s, i) => (i === index ? { ...s, from: e.target.value } : s)) })} />
                    <TextField size="small" type="number" label="Below %" value={slab.to ?? ""} placeholder="no limit" sx={{ width: 100 }}
                      onChange={(e) => set({ slabs: form.slabs.map((s, i) => (i === index ? { ...s, to: e.target.value } : s)) })} />
                    <TextField select size="small" label="Pays" value={slab.type} sx={{ width: 150 }}
                      onChange={(e) => set({ slabs: form.slabs.map((s, i) => (i === index ? { ...s, type: e.target.value } : s)) })}>
                      <MenuItem value="percent">% of sales</MenuItem>
                      <MenuItem value="amount">Fixed ₹</MenuItem>
                    </TextField>
                    <TextField size="small" type="number" label="Value" value={slab.value} sx={{ width: 100 }}
                      onChange={(e) => set({ slabs: form.slabs.map((s, i) => (i === index ? { ...s, value: e.target.value } : s)) })} />
                    <IconButton size="small" aria-label={`Remove slab ${index + 1}`} onClick={() => set({ slabs: form.slabs.filter((_s, i) => i !== index) })}><Trash2 size={15} /></IconButton>
                  </Stack>
                ))}
                <Button size="small" startIcon={<Plus size={14} />} onClick={() => set({ slabs: [...form.slabs, { from: "", to: "", type: "percent", value: "" }] })}>Add slab</Button>
              </Box>
            </>
          )}

          {multi("Only these salespeople (blank = everyone)", (options.employees || []).map((e) => ({ id: e.id, name: `${e.name}${e.code ? ` (${e.code})` : ""}` })),
            form.employee_ids, (ids) => set({ employee_ids: ids }))}
          {multi("Only these HR sections (blank = all)", (options.departments || []).map((d) => ({ id: d.id, name: d.name })),
            form.department_ids, (ids) => set({ department_ids: ids }))}

          <Stack direction="row" spacing={1.5}>
            <TextField size="small" type="date" label={form.type === "scheme" ? "From" : "Valid from (optional)"} value={form.valid_from}
              onChange={(e) => set({ valid_from: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth required={form.type === "scheme"} />
            <TextField size="small" type="date" label={form.type === "scheme" ? "To" : "Valid to (optional)"} value={form.valid_to}
              onChange={(e) => set({ valid_to: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth required={form.type === "scheme"} />
          </Stack>
          <FormControlLabel control={<Switch checked={Boolean(form.is_active)} onChange={(e) => set({ is_active: e.target.checked })} />} label="Active" />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={() => void save()} disabled={saving || !form.name.trim()}>{saving ? "Saving..." : "Save"}</Button>
      </DialogActions>
    </Dialog>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Autocomplete, Box, Button, Chip, IconButton, Stack, Tab, Table, TableBody, TableCell, TableHead, TableRow, Tabs, TextField, Typography } from "@mui/material";
import { FlaskConical, Pencil, Plus, Save, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import IncentiveRuleDialog from "@/features/settings/incentives/components/IncentiveRuleDialog";
import { RULE_TYPES, ruleValueText } from "@/features/settings/incentives/utils/incentiveRules";

const TABS = [
  { key: "item", label: "Item rules" },
  { key: "scheme", label: "Schemes" },
  { key: "ageing", label: "Old stock" },
  { key: "target", label: "Targets" },
];
const thisMonth = () => new Date().toISOString().slice(0, 7);


const scopeText = (rule) => (rule.scope_type === "all" || !rule.scope_type ? "All items"
  : `${rule.scope_type[0].toUpperCase()}${rule.scope_type.slice(1)}: ${(rule.scope_labels || []).join(", ")}`);
const whoText = (rule) => [...(rule.employee_labels || []), ...(rule.department_labels || []).map((d) => `${d} (section)`)].join(", ") || "Everyone";
const datesText = (rule) => (rule.valid_from || rule.valid_to ? `${rule.valid_from || "…"} to ${rule.valid_to || "…"}` : "Always");

/**
 * Settings > Incentive Configuration: how salespeople earn incentive on what they sell (item rules, schemes, old-stock
 * bonus, monthly targets). Finance > Incentive Report works the month out from these and a manager approves it for payroll.
 */
export default function IncentiveConfiguration() {
  const navigate = useNavigate();
  const storeId = useSelector((state) => state.auth.user?.store_id);
  const [tab, setTab] = useState("item");
  const [rules, setRules] = useState([]);
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(true);
  const [dialog, setDialog] = useState(null); // { type, rule }
  const tabRules = useMemo(() => rules.filter((r) => r.type === tab), [rules, tab]);
  const grid = useSearchGrid({ sourceRows: tabRules, paginationMode: "client", scopeKey: `${storeId || ""}:${tab}` });
  const { page, limit, setPage, setLimit } = grid;

  const load = useCallback(async () => {
    try {
      const [ruleRes, optionRes] = await Promise.all([api.get("/incentives/rules"), api.get("/incentives/options")]);
      setRules(ruleRes.data?.data || []);
      setOptions(optionRes.data?.data || {});
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load incentive rules");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const remove = async (rule) => {
    if (!window.confirm(`Delete the rule "${rule.name}"? Months not yet approved will be worked out without it.`)) return;
    try {
      await api.delete(`/incentives/rules/${rule.id}`);
      toast.success("Rule deleted.");
      void load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not delete the rule.");
    }
  };

  const columns = useMemo(() => [
    { key: "name", label: "Name", valueGetter: (r) => r.name },
    { key: "value", label: tab === "target" ? "Slabs" : "Pays", valueGetter: (r) => ruleValueText(r) },
    ...(tab === "target" ? [{ key: "target_type", label: "Target is", valueGetter: (r) => (r.target_type === "qty" ? "Quantity" : "Sales value") }]
      : [{ key: "scope", label: "Applies to", valueGetter: (r) => scopeText(r) }]),
    ...(tab === "ageing" ? [{ key: "min_age_days", label: "In stock at least", valueGetter: (r) => `${r.min_age_days} days` }] : []),
    { key: "who", label: "Who", valueGetter: (r) => whoText(r) },
    { key: "dates", label: "Dates", valueGetter: (r) => datesText(r) },
    { key: "is_active", label: "Status", valueGetter: (r) => (r.is_active ? "Active" : "Off"),
      render: (_v, r) => <Chip size="small" color={r.is_active ? "success" : "default"} label={r.is_active ? "Active" : "Off"} /> },
  ], [tab]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary", overflow: "auto" }}>
      <PageHeader
        onBack={() => navigate("/settings")}
        title={<Breadcrumbs items={[{ label: "Settings", onClick: () => navigate("/settings") }, { label: "Incentive Configuration" }]} />}
        actions={(
          <Button variant="contained" size="small" startIcon={<Plus size={15} />} onClick={() => setDialog({ type: tab, rule: null })}>
            New {RULE_TYPES[tab].title.toLowerCase()}
          </Button>
        )}
      />
      <Box sx={{ px: 1, display: "flex", flexDirection: "column", gap: 1.5, pb: 2 }}>
        <Tabs value={tab} onChange={(_e, value) => setTab(value)} variant="scrollable" allowScrollButtonsMobile>
          {TABS.map((t) => <Tab key={t.key} value={t.key} label={`${t.label} (${rules.filter((r) => r.type === t.key).length})`} />)}
        </Tabs>
        <Alert severity="info" sx={{ py: 0 }}>{RULE_TYPES[tab].help}</Alert>
        <SearchGridPanel>
          <FilterableDataTable
            rows={grid.rows}
            columns={columns}
            loading={loading}
            loadingText="Loading rules..."
            emptyText={`No ${TABS.find((t) => t.key === tab).label.toLowerCase()} yet.`}
            searchPlaceholder="Search rules..."
            tablePreferenceKey={`settings.incentives.${tab}`}
            showExport={false}
            paginationMode="client"
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(value) => { setLimit(value); setPage(1); }}
            renderActions={(row) => (
              <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center" }}>
                <IconButton size="small" aria-label={`Edit ${row.name}`} onClick={() => setDialog({ type: row.type, rule: row })}><Pencil size={15} /></IconButton>
                <IconButton size="small" aria-label={`Delete ${row.name}`} onClick={() => void remove(row)}><Trash2 size={15} /></IconButton>
              </Stack>
            )}
          />
        </SearchGridPanel>
        {tab === "target" && <MonthlyTargets options={options} />}
        {tab !== "target" && <RuleTester options={options} />}
      </Box>

      <IncentiveRuleDialog
        open={Boolean(dialog)}
        type={dialog?.type || tab}
        rule={dialog?.rule || null}
        options={options}
        onClose={() => setDialog(null)}
        onSaved={() => { setDialog(null); toast.success("Rule saved."); void load(); }}
      />
    </Box>
  );
}

/** Month by month: each salesperson's target, and each HR section's (used for people without their own). */
function MonthlyTargets({ options }) {
  const [month, setMonth] = useState(thisMonth);
  const [values, setValues] = useState({}); // "e:<id>" / "d:<id>" → { target_amount, target_qty }
  const [saving, setSaving] = useState(false);
  // Locked until the chosen month's targets have loaded, so what is typed is never replaced by the load.
  const [loadedMonth, setLoadedMonth] = useState(null);
  const ready = loadedMonth === month;

  useEffect(() => {
    let alive = true;
    api.get("/incentives/targets", { params: { month } }).then((res) => {
      if (!alive) return;
      const next = {};
      (res.data?.data || []).forEach((t) => { next[t.employee_id ? `e:${t.employee_id}` : `d:${t.department_id}`] = { target_amount: t.target_amount ?? "", target_qty: t.target_qty ?? "" }; });
      setValues(next);
      setLoadedMonth(month);
    }).catch(() => { if (alive) { setValues({}); setLoadedMonth(month); } });
    return () => { alive = false; };
  }, [month]);

  const set = (key, field, value) => setValues((current) => ({ ...current, [key]: { ...current[key], [field]: value } }));
  const save = async () => {
    setSaving(true);
    try {
      const targets = Object.entries(values).map(([key, v]) => ({
        ...(key.startsWith("e:") ? { employee_id: Number(key.slice(2)) } : { department_id: Number(key.slice(2)) }),
        target_amount: v.target_amount === "" ? null : Number(v.target_amount), target_qty: v.target_qty === "" ? null : Number(v.target_qty),
      }));
      await api.put("/incentives/targets", { month, targets });
      toast.success("Targets saved.");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not save the targets.");
    } finally {
      setSaving(false);
    }
  };

  const rows = [
    ...(options.employees || []).map((e) => ({ key: `e:${e.id}`, name: `${e.name}${e.code ? ` (${e.code})` : ""}`, kind: "Salesperson" })),
    ...(options.departments || []).map((d) => ({ key: `d:${d.id}`, name: d.name, kind: "Section" })),
  ];

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, bgcolor: "background.paper" }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ alignItems: { sm: "center" }, mb: 1.5 }}>
        <Typography sx={{ fontWeight: 700, flex: 1 }}>Targets for the month</Typography>
        <TextField size="small" type="month" label="Month" value={month} onChange={(e) => setMonth(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} />
        <Button variant="contained" size="small" startIcon={<Save size={15} />} disabled={saving || !ready} onClick={() => void save()}>{saving ? "Saving..." : "Save targets"}</Button>
      </Stack>
      {rows.length === 0 ? <Typography sx={{ fontSize: 13, color: "text.secondary" }}>No active employees or HR sections in this store.</Typography> : (
        <Box sx={{ overflowX: "auto" }}>
          <Table size="small" aria-label="Monthly targets">
            <TableHead><TableRow><TableCell>Who</TableCell><TableCell>Type</TableCell><TableCell>Sales target (₹)</TableCell><TableCell>Quantity target</TableCell></TableRow></TableHead>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.key}>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.kind}</TableCell>
                  <TableCell><TextField size="small" type="number" disabled={!ready} value={values[row.key]?.target_amount ?? ""} onChange={(e) => set(row.key, "target_amount", e.target.value)}
                    slotProps={{ htmlInput: { min: 0, "aria-label": `Sales target for ${row.name}`, style: { width: 120 } } }} /></TableCell>
                  <TableCell><TextField size="small" type="number" disabled={!ready} value={values[row.key]?.target_qty ?? ""} onChange={(e) => set(row.key, "target_qty", e.target.value)}
                    slotProps={{ htmlInput: { min: 0, "aria-label": `Quantity target for ${row.name}`, style: { width: 100 } } }} /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Box>
      )}
    </Box>
  );
}

/** "Which rules does this item get?": a product and salesperson, and what they would earn on a given day. */
function RuleTester({ options }) {
  const [productOptions, setProductOptions] = useState([]);
  const [product, setProduct] = useState(null);
  const [employee, setEmployee] = useState(null);
  const [result, setResult] = useState(null);

  const search = async (text) => {
    if (!text || text.length < 2) return;
    try {
      const res = await api.get("/products", { params: { dropdown: true, search: text, limit: 30 } });
      setProductOptions((res.data?.data || []).map((p) => ({ id: p.id, name: `${p.name}${p.code ? ` (${p.code})` : ""}` })));
    } catch {
      setProductOptions([]);
    }
  };
  const test = async () => {
    try {
      const res = await api.get("/incentives/explain", { params: { product_id: product.id, employee_id: employee?.id } });
      setResult(res.data?.data);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not check the rules.");
    }
  };

  return (
    <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 2, bgcolor: "background.paper" }}>
      <Typography sx={{ fontWeight: 700, mb: 1.5 }}>Test: which rules does an item get?</Typography>
      <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
        <Autocomplete size="small" options={productOptions} value={product} filterOptions={(x) => x} sx={{ flex: 1 }}
          getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, b) => a.id === b.id}
          onInputChange={(_e, text) => { void search(text); }} onChange={(_e, v) => { setProduct(v); setResult(null); }}
          renderInput={(params) => <TextField {...params} label="Product" />} />
        <Autocomplete size="small" options={options.employees || []} value={employee} sx={{ flex: 1 }}
          getOptionLabel={(o) => o.name} isOptionEqualToValue={(a, b) => a.id === b.id} onChange={(_e, v) => { setEmployee(v); setResult(null); }}
          renderInput={(params) => <TextField {...params} label="Salesperson (optional)" />} />
        <Button variant="outlined" startIcon={<FlaskConical size={15} />} disabled={!product} onClick={() => void test()}>Check</Button>
      </Stack>
      {result && (
        <Alert severity="info" sx={{ mt: 1.5 }} role="status">
          {result.item_rule
            ? <>Item rule: <b>{result.item_rule.name}</b> ({ruleValueText({ ...result.item_rule, type: "item" })}).</>
            : <>No item rule: {result.employee_default_pct !== null && result.employee_default_pct !== undefined ? `the salesperson's own ${result.employee_default_pct}%` : "the salesperson's own Incentive %"} applies.</>}
          {result.schemes?.length > 0 && <> Schemes on top: {result.schemes.map((s) => `${s.name} (${ruleValueText({ ...s, type: "scheme" })})`).join(", ")}.</>}
          {result.ageing?.length > 0 && <> Old-stock bonus if in stock: {result.ageing.map((a) => `${a.name} (${a.min_age_days}+ days)`).join(", ")}.</>}
        </Alert>
      )}
    </Box>
  );
}

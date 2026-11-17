import { useEffect, useMemo, useState } from "react";
import { Alert, Autocomplete, Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Paper, Stack, Tab, Table, TableBody, TableCell,
  TableHead, TableRow, Tabs, TextField, Tooltip, Typography } from "@mui/material";
import { Pencil, Plus, Save, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import api from "@/shared/api/apiClient";
import UploadImportButton from "@/shared/components/UploadImportButton";
import { FinanceReportLayout } from "@/features/finance/accounting/components/FinanceReportLayout";
import { errorText, money, useFinanceReport } from "@/features/finance/accounting/utils/financeUtils";
import { changedRows, draftTotals, OPENING_BILL_IMPORT, toDrCr } from "./utils/openingBalance";

const EMPTY_BILL = { party: null, bill_no: "", bill_date: "", due_date: "", amount: "", notes: "" };

/** Every ledger's opening in one grid; party ledgers that have opening bills are set from their bills. */
function LedgerOpenings() {
  const report = useFinanceReport("/opening-balances/ledgers", null);
  const [drafts, setDrafts] = useState({});
  const [filter, setFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const rows = useMemo(() => report.data?.rows || [], [report.data]);
  const shown = rows.filter((row) => !filter || `${row.name} ${row.group_name}`.toLowerCase().includes(filter.toLowerCase()));
  const totals = draftTotals(rows, drafts);
  const changes = changedRows(rows, drafts);

  const edit = (row, side, value) => setDrafts((current) => {
    const base = current[row.id] || toDrCr(row.opening_balance);
    return { ...current, [row.id]: side === "debit" ? { debit: value, credit: value ? "" : base.credit } : { credit: value, debit: value ? "" : base.debit } };
  });

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.put("/opening-balances/ledgers", { rows: changes });
      toast.success(res.data?.message || "Opening balances saved.");
      setDrafts({});
      report.reload();
    } catch (err) {
      toast.error(errorText(err, "Could not save the opening balances."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
      {report.error ? <Alert severity="warning">{report.error}</Alert> : null}
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
        <TextField size="small" placeholder="Find a ledger..." value={filter} onChange={(e) => setFilter(e.target.value)} slotProps={{ htmlInput: { "aria-label": "Find a ledger" } }} sx={{ width: { sm: 260 } }} />
        <Box sx={{ flex: 1 }} />
        <Typography variant="body2" sx={{ fontWeight: 600 }}>Debit {money(totals.debit)} · Credit {money(totals.credit)}</Typography>
        <Button variant="contained" size="small" startIcon={<Save size={14} />} disabled={!changes.length || saving} onClick={save}>
          {saving ? "Saving..." : `Save${changes.length ? ` (${changes.length})` : ""}`}
        </Button>
      </Stack>
      {Math.abs(totals.difference) >= 0.01 ? (
        <Alert severity="warning">
          Openings differ by {money(Math.abs(totals.difference))} ({totals.difference > 0 ? "more debit" : "more credit"}). Usually the difference belongs in Capital Account.
        </Alert>
      ) : rows.length ? <Alert severity="success">Openings are balanced.</Alert> : null}
      <Paper variant="outlined" sx={{ overflow: "auto", flex: 1, minHeight: 240 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Ledger</TableCell>
              <TableCell>Group</TableCell>
              <TableCell align="right" sx={{ width: 160 }}>Debit</TableCell>
              <TableCell align="right" sx={{ width: 160 }}>Credit</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {shown.map((row) => {
              const value = drafts[row.id] || toDrCr(row.opening_balance);
              const fromBills = row.bills > 0;
              return (
                <TableRow key={row.id} hover>
                  <TableCell>
                    {row.name}
                    {fromBills ? <Typography component="span" variant="caption" color="text.secondary"> · from {row.bills} opening bill{row.bills > 1 ? "s" : ""}</Typography> : null}
                  </TableCell>
                  <TableCell sx={{ color: "text.secondary" }}>{row.group_name}</TableCell>
                  {["debit", "credit"].map((side) => (
                    <TableCell key={side} align="right">
                      {fromBills ? (value[side] ? money(value[side]) : "") : (
                        <TextField size="small" type="number" value={value[side]} onChange={(e) => edit(row, side, e.target.value)}
                          slotProps={{ htmlInput: { min: 0, step: "0.01", "aria-label": `${row.name} ${side}`, style: { textAlign: "right" } } }} sx={{ width: 140 }} />
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </Paper>
    </Stack>
  );
}

/** Customer or supplier search for the bill form (store-scoped lists). */
function PartyPicker({ partyType, value, onChange }) {
  const [text, setText] = useState("");
  const [options, setOptions] = useState([]);
  useEffect(() => {
    let live = true;
    const timer = setTimeout(async () => {
      try {
        const res = await api.get(partyType === "supplier" ? "/suppliers" : "/customers", { params: { search: text || undefined, limit: 20 } });
        if (live) setOptions((res.data?.data || []).map((p) => ({ id: p.id, name: p.name, phone: p.phone })));
      } catch {
        if (live) setOptions([]);
      }
    }, text ? 300 : 0);
    return () => { live = false; clearTimeout(timer); };
  }, [partyType, text]);
  return (
    <Autocomplete options={options} value={value} onChange={(_, next) => onChange(next)} onInputChange={(_, next) => setText(next)}
      getOptionLabel={(o) => (o ? `${o.name}${o.phone ? ` · ${o.phone}` : ""}` : "")} isOptionEqualToValue={(a, b) => a.id === b.id} filterOptions={(x) => x}
      renderInput={(params) => <TextField {...params} size="small" label={partyType === "supplier" ? "Supplier" : "Customer"} required />} />
  );
}

/** Bills customers (or suppliers) owed when the books started; collected (or paid) later like any other bill. */
function OpeningBills({ partyType }) {
  const report = useFinanceReport("/opening-balances/bills", { party_type: partyType });
  const [form, setForm] = useState(null); // { id?, ...bill }
  const [saving, setSaving] = useState(false);
  const bills = report.data || [];
  const total = bills.reduce((sum, b) => sum + b.balance, 0);

  const save = async () => {
    setSaving(true);
    const body = { party_type: partyType, party_id: form.party?.id, bill_no: form.bill_no, bill_date: form.bill_date, due_date: form.due_date || null,
      amount: Number(form.amount), notes: form.notes || null };
    try {
      const res = form.id ? await api.put(`/opening-balances/bills/${form.id}`, body) : await api.post("/opening-balances/bills", body);
      toast.success(res.data?.message || "Saved.");
      setForm(null);
      report.reload();
    } catch (err) {
      toast.error(errorText(err, "Could not save the bill."));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (bill) => {
    if (!window.confirm(`Delete opening bill ${bill.bill_no}?`)) return;
    try {
      await api.delete(`/opening-balances/bills/${bill.id}`);
      report.reload();
    } catch (err) {
      toast.error(errorText(err, "Could not delete the bill."));
    }
  };

  const who = partyType === "supplier" ? "Supplier" : "Customer";
  return (
    <Stack spacing={1.5} sx={{ flex: 1, minHeight: 0 }}>
      {report.error ? <Alert severity="warning">{report.error}</Alert> : null}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <Typography variant="body2" sx={{ flex: 1, color: "text.secondary" }}>
          {partyType === "supplier"
            ? "Bills you owed suppliers on the day the books started. They show in Supplier Payment to be paid."
            : "Bills customers owed you on the day the books started. They count in Receivable and can be collected."}
        </Typography>
        <Typography variant="body2" sx={{ fontWeight: 700 }}>Due {money(total)}</Typography>
        <UploadImportButton endpoint="/opening-balances/bills/import" fieldConfig={OPENING_BILL_IMPORT}
          transform={(row) => ({ ...row, party_type: row.party_type || partyType })} onDone={report.reload} />
        <Button variant="contained" size="small" startIcon={<Plus size={14} />} onClick={() => setForm({ ...EMPTY_BILL })}>Add bill</Button>
      </Stack>
      <Paper variant="outlined" sx={{ overflow: "auto", flex: 1, minHeight: 200 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>{who}</TableCell><TableCell>Bill No</TableCell><TableCell>Bill Date</TableCell><TableCell>Due Date</TableCell>
              <TableCell align="right">Amount</TableCell><TableCell align="right">Paid</TableCell><TableCell align="right">Balance</TableCell><TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {bills.map((bill) => (
              <TableRow key={bill.id} hover>
                <TableCell>{bill.party_name}</TableCell><TableCell>{bill.bill_no}</TableCell><TableCell>{bill.bill_date}</TableCell><TableCell>{bill.due_date || ""}</TableCell>
                <TableCell align="right">{money(bill.amount)}</TableCell><TableCell align="right">{bill.paid_amount ? money(bill.paid_amount) : ""}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 600 }}>{money(bill.balance)}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <Tooltip title="Edit"><IconButton size="small" aria-label={`Edit ${bill.bill_no}`} onClick={() => setForm({ ...bill, party: { id: bill.party_id, name: bill.party_name, phone: bill.party_phone }, due_date: bill.due_date || "", notes: bill.notes || "" })}><Pencil size={14} /></IconButton></Tooltip>
                  <Tooltip title={bill.paid_amount ? "Payments are recorded against it" : "Delete"}>
                    <span><IconButton size="small" aria-label={`Delete ${bill.bill_no}`} disabled={bill.paid_amount > 0} onClick={() => remove(bill)}><Trash2 size={14} /></IconButton></span>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {report.data && bills.length === 0 ? <Box sx={{ p: 2 }}><Typography variant="body2">No opening bills yet.</Typography></Box> : null}
      </Paper>
      {form ? (
        <Dialog open onClose={() => setForm(null)} maxWidth="xs" fullWidth>
          <DialogTitle>{form.id ? "Edit opening bill" : "Add opening bill"}</DialogTitle>
          <DialogContent>
            <Stack spacing={1.5} sx={{ pt: 1 }}>
              <PartyPicker partyType={partyType} value={form.party} onChange={(party) => setForm((f) => ({ ...f, party }))} />
              <TextField size="small" label="Bill No" required value={form.bill_no} onChange={(e) => setForm((f) => ({ ...f, bill_no: e.target.value }))} />
              <Stack direction="row" spacing={1}>
                <TextField size="small" type="date" label="Bill Date" required fullWidth value={form.bill_date} onChange={(e) => setForm((f) => ({ ...f, bill_date: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
                <TextField size="small" type="date" label="Due Date" fullWidth value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
              </Stack>
              <TextField size="small" type="number" label="Amount due" required value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} slotProps={{ htmlInput: { min: 0, step: "0.01" } }} />
              <TextField size="small" label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setForm(null)}>Cancel</Button>
            <Button variant="contained" disabled={saving || !form.party || !form.bill_no || !form.bill_date || !(Number(form.amount) > 0)} onClick={save}>
              {saving ? "Saving..." : "Save"}
            </Button>
          </DialogActions>
        </Dialog>
      ) : null}
    </Stack>
  );
}

/** Finance > Opening Balance: ledger openings, and the bills customers and suppliers owed when the books started. */
export default function OpeningBalance() {
  const [tab, setTab] = useState("ledgers");
  return (
    <FinanceReportLayout title="Opening Balance">
      <Tabs value={tab} onChange={(_, next) => setTab(next)} variant="scrollable" sx={{ minHeight: 36, "& .MuiTab-root": { minHeight: 36 } }}>
        <Tab value="ledgers" label="Ledgers" />
        <Tab value="customer" label="Customer bills" />
        <Tab value="supplier" label="Supplier bills" />
      </Tabs>
      {tab === "ledgers" ? <LedgerOpenings /> : <OpeningBills key={tab} partyType={tab} />}
    </FinanceReportLayout>
  );
}


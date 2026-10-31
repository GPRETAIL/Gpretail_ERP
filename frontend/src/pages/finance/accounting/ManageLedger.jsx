import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel, IconButton, MenuItem, Paper, Stack, Switch,
  Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import { Pencil, Plus, RotateCw } from "lucide-react";
import api from "../../../api/axios";
import { DateFilters, FinancePage } from "./FinancePage";
import LedgerStatementDialog from "./LedgerStatementDialog";
import { drCr, errorText, money, today, useFinanceReport } from "./financeUtils";

const PARTY_LABEL = { supplier: "Supplier", customer: "Customer", store: "Store" };

function AccountDialog({ account, groups, onClose, onSaved }) {
  const locked = Boolean(account?.system_key || account?.party_type);
  const [form, setForm] = useState({
    name: account?.name || "", group_code: account?.group_code || "indirect_expenses",
    opening_balance: account ? Math.abs(account.opening_balance) : 0, opening_type: account?.opening_balance < 0 ? "cr" : "dr",
    notes: account?.notes || "", is_active: account?.is_active ?? true,
  });
  const [saving, setSaving] = useState(false);
  const set = change => setForm(current => ({ ...current, ...change }));

  const save = async () => {
    setSaving(true);
    try {
      const payload = { ...form, opening_balance: Number(form.opening_balance) || 0 };
      if (account) {
        if (locked) delete payload.group_code;
        await api.put(`/accounting/accounts/${account.id}`, payload);
      } else {
        delete payload.is_active;
        await api.post("/accounting/accounts", payload);
      }
      toast.success(account ? "Ledger updated" : "Ledger created");
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "Could not save the ledger"));
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    try {
      await api.delete(`/accounting/accounts/${account.id}`);
      toast.success("Ledger deleted");
      onSaved();
    } catch (err) {
      toast.error(errorText(err, "Could not delete the ledger"));
    }
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{account ? `Edit ${account.name}` : "New ledger"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Ledger name" value={form.name} onChange={event => set({ name: event.target.value })} required slotProps={{ htmlInput: { maxLength: 150 } }} />
          <TextField select label="Group" value={form.group_code} onChange={event => set({ group_code: event.target.value })} disabled={locked}
            helperText={locked ? "Automatic postings use this ledger, so its group is fixed." : "Where it reports: Balance Sheet, Trading or Profit & Loss."}>
            {groups.map(group => <MenuItem key={group.code} value={group.code}>{group.name}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={1}>
            <TextField label="Opening balance" type="number" value={form.opening_balance} onChange={event => set({ opening_balance: event.target.value })}
              slotProps={{ htmlInput: { min: 0, step: "0.01" } }} sx={{ flex: 1 }} />
            <TextField select label="Dr / Cr" value={form.opening_type} onChange={event => set({ opening_type: event.target.value })} sx={{ width: 120 }}>
              <MenuItem value="dr">Dr</MenuItem>
              <MenuItem value="cr">Cr</MenuItem>
            </TextField>
          </Stack>
          <TextField label="Notes" value={form.notes} onChange={event => set({ notes: event.target.value })} multiline minRows={2} slotProps={{ htmlInput: { maxLength: 500 } }} />
          {account ? <FormControlLabel control={<Switch checked={form.is_active} onChange={event => set({ is_active: event.target.checked })} />} label="Active (can be used on new vouchers)" /> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        {account && !locked ? <Button color="error" onClick={() => void remove()} sx={{ mr: "auto" }}>Delete</Button> : null}
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" disabled={saving || !form.name.trim()} onClick={() => void save()}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

/** Finance > Manage Ledger: the store's chart of accounts with balances; click a ledger for its entries. */
export default function ManageLedger() {
  const [to, setTo] = useState(today());
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState("");
  const [editing, setEditing] = useState(null);
  const [open, setOpen] = useState(null);
  const [posting, setPosting] = useState(false);
  const report = useFinanceReport("/accounting/accounts", { to });
  const groups = report.meta.groups || [];
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return (report.data || []).filter(row => (!group || row.group_code === group) && (!needle || row.name.toLowerCase().includes(needle)))
      .sort((a, b) => a.group_name.localeCompare(b.group_name) || a.name.localeCompare(b.name));
  }, [report.data, search, group]);

  const repost = async () => {
    setPosting(true);
    try {
      const res = await api.post("/accounting/repost");
      toast.success(res.data?.message || "The books are up to date.");
      void report.reload();
    } catch (err) {
      toast.error(errorText(err, "Could not bring the books up to date"));
    } finally {
      setPosting(false);
    }
  };

  return (
    <FinancePage title="Manage Ledger" error={report.error} onRefresh={report.reload}
      filters={<>
        <TextField size="small" label="Search ledgers" value={search} onChange={event => setSearch(event.target.value)} sx={{ width: 180 }} />
        <TextField select size="small" label="Group" value={group} onChange={event => setGroup(event.target.value)} sx={{ width: 190 }}>
          <MenuItem value="">All groups</MenuItem>
          {groups.map(item => <MenuItem key={item.code} value={item.code}>{item.name}</MenuItem>)}
        </TextField>
        <DateFilters single to={to} onChange={change => setTo(change.to)} />
      </>}
      actions={<>
        <Tooltip title="Posts any bill, purchase or payment that has no voucher yet (this also runs every night)">
          <span><Button size="small" startIcon={<RotateCw size={14} />} disabled={posting} onClick={() => void repost()}>Post pending</Button></span>
        </Tooltip>
        <Button size="small" variant="contained" startIcon={<Plus size={14} />} onClick={() => setEditing("new")}>New ledger</Button>
      </>}>
      <Typography variant="body2" color="text.secondary">
        Bills, returns, purchases, supplier payments and transfers post here automatically. Supplier, customer and store ledgers are created on first use.
      </Typography>
      <Paper variant="outlined" sx={{ overflow: "auto", flex: 1, minHeight: 0 }}>
        <Table size="small" stickyHeader>
          <TableHead>
            <TableRow>
              <TableCell>Ledger</TableCell><TableCell>Group</TableCell><TableCell align="right">Opening</TableCell>
              <TableCell align="right">Balance on {to}</TableCell><TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map(row => (
              <TableRow key={row.id} hover sx={{ cursor: "pointer", opacity: row.is_active ? 1 : 0.55 }} onClick={() => setOpen(row)}>
                <TableCell>
                  {row.name}
                  {row.system_key ? <Chip size="small" variant="outlined" label="Automatic" sx={{ ml: 1 }} /> : null}
                  {row.party_type ? <Chip size="small" variant="outlined" label={PARTY_LABEL[row.party_type]} sx={{ ml: 1 }} /> : null}
                  {row.is_active ? null : <Chip size="small" label="Inactive" sx={{ ml: 1 }} />}
                </TableCell>
                <TableCell>{row.group_name}</TableCell>
                <TableCell align="right">{row.opening_balance ? drCr(row.opening_balance) : ""}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>{drCr(row.closing)}</TableCell>
                <TableCell align="right">
                  <IconButton size="small" aria-label={`Edit ${row.name}`} onClick={event => { event.stopPropagation(); setEditing(row); }}><Pencil size={14} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!report.loading && rows.length === 0 ? <Typography variant="body2" sx={{ p: 2 }}>No ledgers match.</Typography> : null}
      </Paper>
      <Typography variant="caption" color="text.secondary">{rows.length} ledgers · debit balances {money(rows.reduce((s, r) => s + Math.max(r.closing, 0), 0))} · credit balances {money(rows.reduce((s, r) => s + Math.max(-r.closing, 0), 0))}</Typography>
      {editing ? <AccountDialog account={editing === "new" ? null : editing} groups={groups} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); void report.reload(); }} /> : null}
      {open ? <LedgerStatementDialog account={open} to={to} onClose={() => setOpen(null)} /> : null}
    </FinancePage>
  );
}

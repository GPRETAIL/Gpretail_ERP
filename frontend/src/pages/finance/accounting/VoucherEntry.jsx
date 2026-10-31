import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
  Alert, Box, Button, Chip, IconButton, Paper, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, ToggleButton, ToggleButtonGroup, Typography,
} from "@mui/material";
import { Pencil, Plus, Trash2 } from "lucide-react";
import api from "../../../api/axios";
import SearchableSelect from "../../../components/SearchableSelect";
import ConfirmDialog from "../../../components/ConfirmDialog";
import { DateFilters, FinancePage } from "./FinancePage";
import { VOUCHER_TYPES, errorText, money, today, useFinanceReport, voucherTotals } from "./financeUtils";

const TYPES = {
  payment: "Money paid out: debit the expense or party, credit Cash or Bank.",
  receipt: "Money received: debit Cash or Bank, credit the income or party.",
  journal: "Adjustments between any ledgers (no cash or bank needed).",
  contra: "Moving money between Cash, Bank, Card and UPI ledgers (e.g. card settlement reaching the bank).",
};
const blankLine = () => ({ key: Math.random().toString(36).slice(2), ledger_account_id: "", debit: "", credit: "" });
const blankVoucher = () => ({ id: null, voucher_type: "payment", voucher_date: today(), reference_no: "", narration: "", lines: [blankLine(), blankLine()] });

/** Finance > Voucher Entry: payments, receipts, journals and contras entered by hand, and the list of them. */
export default function VoucherEntry() {
  const [voucher, setVoucher] = useState(blankVoucher);
  const [saving, setSaving] = useState(false);
  const [range, setRange] = useState({ from: today(), to: today() });
  const [deleting, setDeleting] = useState(null);
  const accounts = useFinanceReport("/accounting/accounts", {});
  const daybook = useFinanceReport("/accounting/daybook", range);
  const options = useMemo(() => (accounts.data || []).filter(row => row.is_active)
    .map(row => ({ value: String(row.id), label: `${row.name} (${row.group_name})` })), [accounts.data]);
  const manual = (daybook.data || []).filter(row => !row.automatic);
  const totals = voucherTotals(voucher.lines);

  const set = change => setVoucher(current => ({ ...current, ...change }));
  const setLine = (key, change) => set({ lines: voucher.lines.map(line => {
    if (line.key !== key) return line;
    const next = { ...line, ...change };
    // A line is either a debit or a credit.
    if (change.debit) next.credit = "";
    if (change.credit) next.debit = "";
    return next;
  }) });

  const save = async () => {
    setSaving(true);
    const payload = {
      voucher_type: voucher.voucher_type, voucher_date: voucher.voucher_date, reference_no: voucher.reference_no || null, narration: voucher.narration || null,
      lines: voucher.lines.filter(line => line.ledger_account_id)
        .map(line => ({ ledger_account_id: Number(line.ledger_account_id), debit: Number(line.debit) || 0, credit: Number(line.credit) || 0 })),
    };
    try {
      const res = voucher.id ? await api.put(`/accounting/vouchers/${voucher.id}`, payload) : await api.post("/accounting/vouchers", payload);
      toast.success(res.data?.message || "Voucher saved");
      setVoucher(blankVoucher());
      void daybook.reload();
    } catch (err) {
      toast.error(errorText(err, "Could not save the voucher"));
    } finally {
      setSaving(false);
    }
  };

  const edit = row => setVoucher({
    id: row.id, voucher_type: row.voucher_type, voucher_date: row.voucher_date, reference_no: row.reference_no || "", narration: row.narration || "",
    lines: row.lines.map(line => ({ ...blankLine(), ledger_account_id: String(line.ledger_account_id), debit: line.debit || "", credit: line.credit || "" })),
  });

  const remove = async () => {
    try {
      const res = await api.delete(`/accounting/vouchers/${deleting.id}`);
      toast.success(res.data?.message || "Voucher deleted");
      if (voucher.id === deleting.id) setVoucher(blankVoucher());
      void daybook.reload();
    } catch (err) {
      toast.error(errorText(err, "Could not delete the voucher"));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <FinancePage title="Voucher Entry" error={accounts.error}>
      <Paper variant="outlined" sx={{ p: 1.5 }}>
        <Stack spacing={1.5}>
          <Stack direction={{ xs: "column", md: "row" }} spacing={1.5} sx={{ alignItems: { md: "center" } }}>
            <ToggleButtonGroup size="small" exclusive value={voucher.voucher_type} onChange={(_event, value) => value && set({ voucher_type: value })}>
              {Object.keys(TYPES).map(type => <ToggleButton key={type} value={type}>{VOUCHER_TYPES[type]}</ToggleButton>)}
            </ToggleButtonGroup>
            <TextField size="small" type="date" label="Date" value={voucher.voucher_date} onChange={event => set({ voucher_date: event.target.value })}
              slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 160 }} />
            <TextField size="small" label="Reference (bill / cheque no.)" value={voucher.reference_no} onChange={event => set({ reference_no: event.target.value })}
              slotProps={{ htmlInput: { maxLength: 100 } }} sx={{ minWidth: 200 }} />
            {voucher.id ? <Chip color="info" label="Editing a saved voucher" onDelete={() => setVoucher(blankVoucher())} /> : null}
          </Stack>
          <Typography variant="body2" color="text.secondary">{TYPES[voucher.voucher_type]}</Typography>
          <Box sx={{ overflowX: "auto" }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ minWidth: 260 }}>Ledger</TableCell>
                  <TableCell align="right" sx={{ width: 150 }}>Debit</TableCell>
                  <TableCell align="right" sx={{ width: 150 }}>Credit</TableCell>
                  <TableCell sx={{ width: 48 }} />
                </TableRow>
              </TableHead>
              <TableBody>
                {voucher.lines.map(line => (
                  <TableRow key={line.key}>
                    <TableCell>
                      <SearchableSelect name="ledger" options={options} value={line.ledger_account_id} placeholder="Choose ledger"
                        onChange={event => setLine(line.key, { ledger_account_id: event.target.value })} />
                    </TableCell>
                    <TableCell><TextField size="small" type="number" value={line.debit} onChange={event => setLine(line.key, { debit: event.target.value })}
                      slotProps={{ htmlInput: { min: 0, step: "0.01", "aria-label": "Debit", style: { textAlign: "right" } } }} fullWidth /></TableCell>
                    <TableCell><TextField size="small" type="number" value={line.credit} onChange={event => setLine(line.key, { credit: event.target.value })}
                      slotProps={{ htmlInput: { min: 0, step: "0.01", "aria-label": "Credit", style: { textAlign: "right" } } }} fullWidth /></TableCell>
                    <TableCell>
                      <IconButton size="small" aria-label="Remove line" disabled={voucher.lines.length <= 2}
                        onClick={() => set({ lines: voucher.lines.filter(item => item.key !== line.key) })}><Trash2 size={14} /></IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell><Button size="small" startIcon={<Plus size={14} />} onClick={() => set({ lines: [...voucher.lines, blankLine()] })}>Add line</Button></TableCell>
                  <TableCell align="right"><b>{money(totals.debit)}</b></TableCell>
                  <TableCell align="right"><b>{money(totals.credit)}</b></TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </Box>
          {totals.difference ? <Alert severity="warning">Debits and credits differ by {money(Math.abs(totals.difference))}.</Alert> : null}
          <TextField size="small" label="Narration" value={voucher.narration} onChange={event => set({ narration: event.target.value })} multiline minRows={2}
            slotProps={{ htmlInput: { maxLength: 500 } }} />
          <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end" }}>
            <Button onClick={() => setVoucher(blankVoucher())}>Clear</Button>
            <Button variant="contained" disabled={saving || !totals.ready} onClick={() => void save()}>{voucher.id ? "Update voucher" : "Save voucher"}</Button>
          </Stack>
        </Stack>
      </Paper>

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <Typography variant="subtitle2" sx={{ mr: 1 }}>Vouchers entered by hand</Typography>
        <DateFilters from={range.from} to={range.to} onChange={change => setRange(current => ({ ...current, ...change }))} />
      </Stack>
      <Paper variant="outlined" sx={{ overflow: "auto" }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Date</TableCell><TableCell>Voucher</TableCell><TableCell>Ledgers</TableCell>
              <TableCell align="right">Amount</TableCell><TableCell align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {manual.map(row => (
              <TableRow key={row.id}>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{row.voucher_date}</TableCell>
                <TableCell sx={{ whiteSpace: "nowrap" }}>{row.voucher_no}<Typography variant="caption" display="block" color="text.secondary">{VOUCHER_TYPES[row.voucher_type]}</Typography></TableCell>
                <TableCell>
                  {row.lines.map(line => `${line.debit ? "Dr" : "Cr"} ${line.account}`).join(" · ")}
                  {row.narration ? <Typography variant="caption" display="block" color="text.secondary">{row.narration}</Typography> : null}
                </TableCell>
                <TableCell align="right">{money(row.amount)}</TableCell>
                <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                  <IconButton size="small" aria-label={`Edit ${row.voucher_no}`} onClick={() => edit(row)}><Pencil size={14} /></IconButton>
                  <IconButton size="small" aria-label={`Delete ${row.voucher_no}`} onClick={() => setDeleting(row)}><Trash2 size={14} /></IconButton>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {!daybook.loading && manual.length === 0 ? <Typography variant="body2" sx={{ p: 2 }}>No hand-entered vouchers in this period.</Typography> : null}
      </Paper>
      <ConfirmDialog open={Boolean(deleting)} title={`Delete voucher ${deleting?.voucher_no || ""}?`} message="Its entries leave the books. This cannot be undone."
        confirmLabel="Delete" onConfirm={() => void remove()} onCancel={() => setDeleting(null)} />
    </FinancePage>
  );
}

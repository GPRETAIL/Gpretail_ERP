import { useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";

const today = () => new Date().toLocaleDateString("en-CA");

/** Pill filters above an HR list. */
export function FilterChips({ value, options, onChange }) {
  return (
    <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap", rowGap: 1 }}>
      {options.map(([v, label]) => (
        <Button key={label} size="small" variant={value === v ? "contained" : "outlined"} color={value === v ? "primary" : "inherit"}
          onClick={() => onChange(v)} sx={{ borderRadius: 999, minWidth: 0, px: 1.5 }}>{label}</Button>
      ))}
    </Stack>
  );
}

/** An HR list: the shared search grid, client-side paging. */
export function HrTable({ rows, columns, empty, prefKey, file, actions, scope }) {
  const grid = useSearchGrid({ sourceRows: rows || [], paginationMode: "client", scopeKey: scope });
  return (
    <SearchGridPanel>
      <FilterableDataTable rows={grid.rows} columns={columns} loading={!rows} emptyText={empty} searchPlaceholder="Search..."
        tablePreferenceKey={prefKey} exportFileName={file} paginationMode="client" page={grid.page} limit={grid.limit}
        onPageChange={grid.setPage} onLimitChange={(v) => { grid.setLimit(v); grid.setPage(1); }}
        actionsLabel={actions ? "Actions" : undefined} renderActions={actions} />
    </SearchGridPanel>
  );
}

/** Record money going out or coming in: a date, cash or bank, and (optionally) an amount or month. */
export function PaymentDialog({ title, help, amount, month, onSubmit, onClose }) {
  const [form, setForm] = useState({ paid_on: today(), pay_mode: "CASH", amount: amount ?? "", first_month: month ?? "" });
  return (
    <Dialog open onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ fontSize: 15 }}>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ pt: 1 }}>
          {help && <Typography sx={{ fontSize: 12, color: "text.secondary" }}>{help}</Typography>}
          {amount !== undefined && <TextField type="number" size="small" label="Amount (₹)" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />}
          <Stack direction="row" spacing={1.5}>
            <TextField type="date" size="small" label="Date" value={form.paid_on} onChange={(e) => setForm({ ...form, paid_on: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} fullWidth />
            <TextField select size="small" label="Paid by" value={form.pay_mode} onChange={(e) => setForm({ ...form, pay_mode: e.target.value })} fullWidth>
              <MenuItem value="CASH">Cash</MenuItem>
              <MenuItem value="BANK">Bank</MenuItem>
            </TextField>
          </Stack>
          {month !== undefined && <TextField type="month" size="small" label="Recover from salary of" value={form.first_month} onChange={(e) => setForm({ ...form, first_month: e.target.value })} slotProps={{ inputLabel: { shrink: true } }} />}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={() => onSubmit({ paid_on: form.paid_on, pay_mode: form.pay_mode, ...(amount !== undefined ? { amount: Number(form.amount) } : {}), ...(month !== undefined && form.first_month ? { first_month: form.first_month } : {}) })}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Autocomplete, Box, Button, Chip, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { Printer, Save, Search, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { masterSearchAreaSx } from "@/shared/theme/erpUi";
import { PAYMENT_MODES, allocateOldestFirst, modeLabel } from "@/features/sales/dealer/utils/dealerPayments";

const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Date().toLocaleDateString("en-CA");
const escapeHtml = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));


const printReceipt = (receipt, storeName) => {
  const win = window.open("", "_blank", "width=480,height=640");
  if (!win) { toast.error("Allow pop-ups to print the receipt."); return; }
  const rows = (receipt.allocations || []).map((a) => `<tr><td>${escapeHtml(a.bill_no)}</td><td style="text-align:right">${money(a.amount)}</td></tr>`).join("");
  win.document.write(`<!doctype html><html><head><title>Receipt ${escapeHtml(receipt.bill_no)}</title><style>body{font-family:Arial,sans-serif;font-size:13px;padding:16px}h2{margin:0 0 4px}table{width:100%;border-collapse:collapse;margin-top:8px}td,th{border-bottom:1px solid #ddd;padding:4px}</style></head><body>
<h2>${escapeHtml(storeName)}</h2><div>Receipt <b>${escapeHtml(receipt.bill_no)}</b> · ${escapeHtml(receipt.receipt_date)}</div>
<p>Received from <b>${escapeHtml(receipt.customer_name)}</b><br/>Amount <b>₹${money(receipt.amount)}</b> by ${escapeHtml(modeLabel(receipt.mode))}${receipt.reference_no ? ` (${escapeHtml(receipt.reference_no)})` : ""}</p>
<table><thead><tr><th style="text-align:left">Invoice</th><th style="text-align:right">Paid</th></tr></thead><tbody>${rows}</tbody></table>
${receipt.notes ? `<p>${escapeHtml(receipt.notes)}</p>` : ""}</body></html>`);
  win.document.close();
  win.addEventListener("load", () => { win.focus(); win.print(); }, { once: true });
};

/**
 * Sales > Dealer Receipt: collect what a dealer owes on their dealer invoices. The amount is split across their open
 * invoices oldest first (editable); Search shows the receipts, which can be printed or cancelled.
 */
export default function DealerReceipt() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const authUser = useSelector((state) => state.auth.user);
  const [showSearch, setShowSearch] = useState(false);
  const [dealers, setDealers] = useState([]);
  const [dealer, setDealer] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [form, setForm] = useState({ amount: "", mode: "CASH", reference_no: "", cheque_date: "", receipt_date: today(), notes: "" });
  const [split, setSplit] = useState({});
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: String(authUser?.store_id || "") });
  const { page, limit, setPage, setLimit } = grid;
  const storeName = String(authUser?.company_name || "").trim() || "Store";

  const loadDealers = useCallback(async () => {
    try {
      const res = await api.get("/dealer-receipts/dealers");
      const list = res.data?.data || [];
      setDealers(list);
      const wanted = Number(params.get("customer_id") || 0);
      if (wanted) setDealer((current) => current || list.find((d) => d.customer_id === wanted) || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load dealers with dues");
    }
  }, [params]);

  useEffect(() => {
    const timer = setTimeout(loadDealers, 0);
    return () => clearTimeout(timer);
  }, [loadDealers]);

  useEffect(() => {
    if (!dealer) return undefined;
    let alive = true;
    api.get("/dealer-receipts/open-invoices", { params: { customer_id: dealer.customer_id } })
      .then((res) => { if (alive) { setInvoices(res.data?.data || []); setSplit({}); } })
      .catch(() => alive && setInvoices([]));
    return () => { alive = false; };
  }, [dealer]);

  const loadList = useCallback(async () => {
    try {
      const res = await api.get("/dealer-receipts");
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load receipts");
    } finally {
      setListLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!showSearch) return undefined;
    const timer = setTimeout(loadList, 0);
    return () => clearTimeout(timer);
  }, [showSearch, loadList]);

  const due = useMemo(() => invoices.reduce((s, i) => s + i.balance, 0), [invoices]);
  const splitTotal = useMemo(() => Object.values(split).reduce((s, v) => s + (Number(v) || 0), 0), [split]);
  const amount = Number(form.amount || 0);
  const splitOk = Math.abs(splitTotal - amount) < 0.005;

  const setAmount = (value) => {
    setForm((f) => ({ ...f, amount: value }));
    setSplit(allocateOldestFirst(invoices, value));
  };

  const save = async () => {
    setSaving(true);
    try {
      const res = await api.post("/dealer-receipts", {
        customer_id: dealer.customer_id, amount, mode: form.mode, reference_no: form.reference_no || null,
        cheque_date: form.cheque_date || null, receipt_date: form.receipt_date || null, notes: form.notes || null,
        allocations: Object.entries(split).filter(([, v]) => Number(v) > 0).map(([id, v]) => ({ dealer_invoice_id: Number(id), amount: Number(v) })),
      });
      const receipt = res.data?.data;
      toast.success(`Receipt ${receipt?.bill_no} saved.`);
      printReceipt(receipt, storeName);
      setForm({ amount: "", mode: "CASH", reference_no: "", cheque_date: "", receipt_date: today(), notes: "" });
      setDealer(null);
      setInvoices([]);
      setSplit({});
      void loadDealers();
    } catch (err) {
      const body = err?.response?.data;
      toast.error(body?.errors ? Object.values(body.errors).flat()[0] : body?.message || "Could not save the receipt.");
    } finally {
      setSaving(false);
    }
  };

  const cancel = async (row) => {
    if (!window.confirm(`Cancel receipt ${row.bill_no}? The invoices get their balance back.`)) return;
    try {
      await api.delete(`/dealer-receipts/${row.id}`);
      toast.success("Receipt cancelled.");
      void loadList();
      void loadDealers();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not cancel the receipt.");
    }
  };

  const reprint = async (row) => {
    try {
      const res = await api.get(`/dealer-receipts/${row.id}`);
      printReceipt(res.data?.data, storeName);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not load the receipt.");
    }
  };

  const columns = useMemo(() => [
    { key: "bill_no", label: "Receipt", valueGetter: (r) => r.bill_no },
    { key: "receipt_date", label: "Date", valueGetter: (r) => r.receipt_date },
    { key: "customer_name", label: "Dealer", valueGetter: (r) => r.customer_name || "-" },
    { key: "mode", label: "Mode", valueGetter: (r) => `${modeLabel(r.mode)}${r.reference_no ? ` · ${r.reference_no}` : ""}` },
    { key: "amount", label: "Amount", valueGetter: (r) => r.amount, render: (v) => <Box sx={{ textAlign: "right" }}>{money(v)}</Box> },
    { key: "invoices", label: "Invoices", valueGetter: (r) => r.invoices },
    { key: "status", label: "Status", valueGetter: (r) => r.status,
      render: (v) => <Chip size="small" color={v === "CANCELLED" ? "default" : "success"} label={v === "CANCELLED" ? "Cancelled" : "Received"} /> },
  ], []);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary", overflow: "auto" }}>
      <PageHeader
        onBack={showSearch ? () => setShowSearch(false) : () => navigate("/sales")}
        backLabel={showSearch ? "Back to receipt entry" : "Back to sales"}
        title={<Breadcrumbs items={[{ label: "Sales", onClick: () => navigate("/sales") }, { label: "Dealer Receipt", ...(showSearch ? { onClick: () => setShowSearch(false) } : {}) }, ...(showSearch ? [{ label: "Receipts" }] : [])]} />}
        actions={(
          <Stack direction="row" spacing={1}>
            {!showSearch && (
              <Button onClick={() => void save()} disabled={saving || !dealer || amount <= 0 || amount > due + 0.005 || !splitOk || (form.mode === "CHEQUE" && !form.reference_no.trim())}
                className="glass-btn glass-btn-success" sx={{ display: "inline-flex", alignItems: "center" }}>
                <Save size={16} style={{ marginRight: 4 }} />{saving ? "Saving..." : "Save"}
              </Button>
            )}
            <Button onClick={() => { if (!showSearch) setListLoading(true); setShowSearch((s) => !s); }} className="glass-btn glass-btn-primary" sx={{ display: "inline-flex", alignItems: "center" }}>
              <Search size={16} style={{ marginRight: 4 }} />{showSearch ? "Back" : "Search"}
            </Button>
          </Stack>
        )}
      />

      {!showSearch && (
        <Box sx={{ p: { xs: 1, md: 2 }, display: "flex", flexDirection: "column", gap: 2 }}>
          <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr" } }}>
            <Autocomplete size="small" options={dealers} value={dealer} onChange={(_e, value) => { setDealer(value); setForm((f) => ({ ...f, amount: "" })); }}
              getOptionLabel={(d) => `${d.customer_name} — due ₹${money(d.due)} (${d.invoices} invoice${d.invoices === 1 ? "" : "s"})`}
              isOptionEqualToValue={(a, b) => a.customer_id === b.customer_id}
              renderInput={(p) => <TextField {...p} label="Dealer" placeholder={dealers.length ? "Choose a dealer with dues" : "No dealer owes anything"} />} />
            <TextField size="small" type="date" label="Receipt date" value={form.receipt_date} onChange={(e) => setForm((f) => ({ ...f, receipt_date: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            <TextField size="small" type="number" label="Amount received" value={form.amount} onChange={(e) => setAmount(e.target.value)} disabled={!dealer}
              slotProps={{ htmlInput: { min: 0, step: "0.01" } }} helperText={dealer ? `Due ₹${money(due)}` : " "} error={amount > due + 0.005} />
            <TextField select size="small" label="Mode" value={form.mode} onChange={(e) => setForm((f) => ({ ...f, mode: e.target.value }))}>
              {PAYMENT_MODES.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
            </TextField>
            {form.mode !== "CASH" && (
              <TextField size="small" label={form.mode === "CHEQUE" ? "Cheque no." : "Reference / UTR"} value={form.reference_no} required={form.mode === "CHEQUE"}
                onChange={(e) => setForm((f) => ({ ...f, reference_no: e.target.value }))} />
            )}
            {form.mode === "CHEQUE" && (
              <TextField size="small" type="date" label="Cheque date" value={form.cheque_date} onChange={(e) => setForm((f) => ({ ...f, cheque_date: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
            )}
            <TextField size="small" label="Notes" value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ gridColumn: { md: "1 / -1" } }} />
          </Box>

          {dealer && (
            <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflowX: "auto", bgcolor: "background.paper" }}>
              <Table size="small" aria-label="Open invoices">
                <TableHead>
                  <TableRow><TableCell>Invoice</TableCell><TableCell>Date</TableCell><TableCell align="right">Total</TableCell><TableCell align="right">Paid</TableCell><TableCell align="right">Returned</TableCell><TableCell align="right">Balance</TableCell><TableCell align="right">Pay now</TableCell></TableRow>
                </TableHead>
                <TableBody>
                  {invoices.map((inv) => (
                    <TableRow key={inv.id}>
                      <TableCell>{inv.bill_no}</TableCell>
                      <TableCell>{inv.invoice_date}</TableCell>
                      <TableCell align="right">{money(inv.total)}</TableCell>
                      <TableCell align="right">{money(inv.paid_now + inv.received)}</TableCell>
                      <TableCell align="right">{money(inv.returned)}</TableCell>
                      <TableCell align="right"><b>{money(inv.balance)}</b></TableCell>
                      <TableCell align="right">
                        <TextField size="small" type="number" value={split[inv.id] ?? ""} onChange={(e) => setSplit((s) => ({ ...s, [inv.id]: e.target.value }))}
                          error={Number(split[inv.id] || 0) > inv.balance + 0.005}
                          slotProps={{ htmlInput: { min: 0, step: "0.01", "aria-label": `Pay now on ${inv.bill_no}`, style: { width: 100, textAlign: "right" } } }} />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}
          {dealer && amount > 0 && !splitOk && (
            <Alert severity="warning">The amounts given to invoices add up to ₹{money(splitTotal)}; they must add up to ₹{money(amount)}.</Alert>
          )}
          {!dealer && <Typography sx={{ fontSize: 13, color: "text.secondary" }}>Choose a dealer to see their open invoices. The amount is split across them oldest first; change the split if needed.</Typography>}
        </Box>
      )}

      {showSearch && (
        <Box sx={{ ...masterSearchAreaSx, display: "flex", flexDirection: "column" }}>
          <SearchGridPanel>
            <FilterableDataTable
              rows={grid.rows}
              columns={columns}
              loading={listLoading}
              loadingText="Loading receipts..."
              emptyText="No dealer receipts yet."
              searchPlaceholder="Search receipts..."
              tablePreferenceKey="sales.dealer-receipts"
              exportFileName="dealer_receipts"
              paginationMode="client"
              page={page}
              limit={limit}
              onPageChange={setPage}
              onLimitChange={(value) => { setLimit(value); setPage(1); }}
              renderActions={(row) => (
                <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center" }}>
                  <Button size="small" startIcon={<Printer size={13} />} onClick={() => void reprint(row)}>Print</Button>
                  {row.status !== "CANCELLED" && <Button size="small" color="error" startIcon={<Trash2 size={13} />} onClick={() => void cancel(row)}>Cancel</Button>}
                </Stack>
              )}
            />
          </SearchGridPanel>
        </Box>
      )}
    </Box>
  );
}

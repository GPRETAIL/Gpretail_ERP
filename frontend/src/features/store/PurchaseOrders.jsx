import { TYPE } from "@/shared/theme/typeScale";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { MessageCircle, Plus, Printer, RefreshCw, Sparkles, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { browserPrintHtml } from "@/features/sales/pos/utils/posSalesUtils";
import { PO_FILTERS, day, lineLabel, money, purchaseOrderHtml, purchaseOrderWhatsAppUrl, qty, statusColor, statusLabel } from "./utils/purchaseOrderPrint";
import LoadingSkeleton from "@/shared/components/LoadingSkeleton";

const blankOrder = { supplier_id: "", expected_date: "", notes: "", items: [], receipts: [], status: "DRAFT" };

/** Create or review one purchase order; only a draft can be changed. */
function OrderEditor({ uuid, suppliers, storeName, onClose, onChanged }) {
  const [order, setOrder] = useState(uuid ? null : blankOrder);
  const [lines, setLines] = useState([]);
  const [scan, setScan] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const draft = order?.status === "DRAFT";
  // Once approved, Direct Purchases received against the order fill in what has arrived.
  const receiving = Boolean(order) && !draft && order.status !== "CANCELLED";

  useEffect(() => {
    if (!uuid) return undefined;
    let active = true;
    api.get(`/purchase-orders/${uuid}`).then((res) => {
      if (!active) return;
      const data = res.data?.data;
      setOrder({ ...data, supplier_id: data.supplier_id ? String(data.supplier_id) : "", expected_date: data.expected_date?.slice(0, 10) || "", notes: data.notes || "" });
      setLines((data.items || []).map((line) => ({ ...line, key: `${line.product_id}:${line.variant_id || ""}`, quantity: String(Number(line.quantity)), unit_cost: String(Number(line.unit_cost)) })));
    }).catch(() => { if (active) setError("Could not open this purchase order."); });
    return () => { active = false; };
  }, [uuid]);

  const addScan = async (event) => {
    event.preventDefault();
    const code = scan.trim();
    if (!code) return;
    setScan("");
    try {
      const found = (await api.get("/pos-sales/barcode-lookup", { params: { barcode: code } })).data?.data;
      if (!found?.id) throw new Error("not found");
      const key = `${found.id}:${found.variantId || ""}`;
      setLines((prev) => (prev.some((line) => line.key === key)
        ? prev.map((line) => (line.key === key ? { ...line, quantity: String(Number(line.quantity) + 1) } : line))
        : [...prev, { key, product_id: found.id, variant_id: found.variantId || null, product: { name: found.name, code: found.code }, quantity: "1", unit_cost: "0" }]));
    } catch {
      toast.error(`No product in this store for "${code}".`);
    }
  };
  const setLine = (key, field, value) => setLines((prev) => prev.map((line) => (line.key === key ? { ...line, [field]: value } : line)));
  const invalid = lines.length === 0 || lines.some((line) => !(Number(line.quantity) > 0) || Number(line.unit_cost) < 0);
  const total = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0) * (Number(line.unit_cost) || 0), 0);

  const run = async (action, success) => {
    setBusy(true); setError("");
    try {
      const res = await action();
      toast.success(res?.data?.message || success);
      onChanged();
      onClose();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save the purchase order.");
    } finally {
      setBusy(false);
    }
  };
  const body = () => ({
    supplier_id: order.supplier_id ? Number(order.supplier_id) : null, expected_date: order.expected_date || null, notes: order.notes.trim() || null,
    items: lines.map((line) => ({ product_id: line.product_id, variant_id: line.variant_id || null, quantity: Number(line.quantity), unit_cost: Number(line.unit_cost) || 0 })),
  });
  const save = () => run(() => (uuid ? api.put(`/purchase-orders/${uuid}`, body()) : api.post("/purchase-orders", body())), "Draft saved.");
  const approve = () => run(async () => { await api.put(`/purchase-orders/${uuid}`, body()); return api.post(`/purchase-orders/${uuid}/approve`); }, "Approved.");

  return (
    <Dialog open onClose={() => { if (!busy) onClose(); }} maxWidth="md" fullWidth>
      <DialogTitle>{order?.po_no ? `${order.po_no} · ${statusLabel({ ...order, items: lines })}` : "New purchase order"}</DialogTitle>
      <DialogContent>
        {!order ? <LoadingSkeleton variant="table" rows={6} label="Loading purchase order" /> : (
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            {order.status === "APPROVED" && <Alert severity="info">Receive the goods in Warehouse &gt; Direct Purchase: choose this supplier, then this order under "Against PO". The order closes itself when everything has arrived.</Alert>}
            {order.source === "AUTO" && draft && <Alert severity="info">Drafted by the reorder engine for items at or below their reorder level. Check the quantities and supplier, then approve.</Alert>}
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
              <TextField select size="small" label="Supplier" value={order.supplier_id} disabled={!draft} onChange={(e) => setOrder((prev) => ({ ...prev, supplier_id: e.target.value }))} sx={{ minWidth: 240 }}>
                <MenuItem value="">Not chosen yet</MenuItem>
                {suppliers.map((supplier) => <MenuItem key={supplier.id} value={String(supplier.id)}>{supplier.name}</MenuItem>)}
              </TextField>
              <TextField size="small" type="date" label="Expected by" value={order.expected_date} disabled={!draft} onChange={(e) => setOrder((prev) => ({ ...prev, expected_date: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField size="small" label="Notes" value={order.notes} disabled={!draft} onChange={(e) => setOrder((prev) => ({ ...prev, notes: e.target.value }))} sx={{ flex: 1 }} slotProps={{ htmlInput: { maxLength: 1000 } }} />
            </Stack>
            {draft && (
              <Box component="form" onSubmit={addScan}>
                <TextField fullWidth size="small" label="Scan or type a barcode / product code to add" value={scan} onChange={(e) => setScan(e.target.value)} />
              </Box>
            )}
            <Table size="small">
              <TableHead><TableRow><TableCell>Item</TableCell><TableCell align="right">Stock then</TableCell><TableCell>Quantity</TableCell>{receiving && <TableCell align="right">Received</TableCell>}{receiving && <TableCell align="right">Pending</TableCell>}<TableCell>Rate</TableCell><TableCell align="right">Amount</TableCell><TableCell /></TableRow></TableHead>
              <TableBody>
                {lines.length === 0 && <TableRow><TableCell colSpan={receiving ? 8 : 6} sx={{ color: "text.secondary" }}>No items yet.</TableCell></TableRow>}
                {lines.map((line) => (
                  <TableRow key={line.key}>
                    <TableCell><Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{lineLabel(line)}</Typography><Typography sx={{ fontSize: TYPE.small, color: "text.secondary" }}>{line.product?.code}</Typography></TableCell>
                    <TableCell align="right">{line.stock_at_order == null ? "-" : qty(line.stock_at_order)}</TableCell>
                    <TableCell><TextField size="small" type="number" value={line.quantity} disabled={!draft} error={!(Number(line.quantity) > 0)} onChange={(e) => setLine(line.key, "quantity", e.target.value)} slotProps={{ htmlInput: { min: 0, step: "any", "aria-label": `Quantity ${lineLabel(line)}` } }} sx={{ width: 100 }} /></TableCell>
                    {receiving && <TableCell align="right" sx={{ fontWeight: 600, color: Number(line.received_qty) >= Number(line.quantity) ? "success.main" : "text.primary" }}>{qty(line.received_qty || 0)}</TableCell>}
                    {receiving && <TableCell align="right">{qty(Math.max(0, Number(line.quantity) - Number(line.received_qty || 0)))}</TableCell>}
                    <TableCell><TextField size="small" type="number" value={line.unit_cost} disabled={!draft} onChange={(e) => setLine(line.key, "unit_cost", e.target.value)} slotProps={{ htmlInput: { min: 0, step: "any", "aria-label": `Rate ${lineLabel(line)}` } }} sx={{ width: 100 }} /></TableCell>
                    <TableCell align="right">{money((Number(line.quantity) || 0) * (Number(line.unit_cost) || 0))}</TableCell>
                    <TableCell>{draft && <IconButton size="small" aria-label={`Remove ${lineLabel(line)}`} onClick={() => setLines((prev) => prev.filter((item) => item.key !== line.key))}><Trash2 size={15} /></IconButton>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Typography sx={{ textAlign: "right", fontWeight: 700 }}>Total ₹{money(total)}</Typography>
            {receiving && (order.receipts || []).length > 0 && (
              <Typography sx={{ fontSize: 12, color: "text.secondary" }}>
                Received in: {order.receipts.map((receipt) => `${receipt.purchase_no}${receipt.invoice_no ? ` (bill ${receipt.invoice_no})` : ""}${receipt.invoice_workflow_status === "temporary" ? " - temporary, not counted" : ""}`).join(", ")}
              </Typography>
            )}
            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}
      </DialogContent>
      <DialogActions sx={{ flexWrap: "wrap", gap: 1 }}>
        {uuid && order && <Button color="inherit" startIcon={<Printer size={14} />} onClick={() => browserPrintHtml(purchaseOrderHtml({ ...order, items: lines }, storeName))}>Print</Button>}
        {uuid && order?.status === "APPROVED" && (
          <Button color="success" startIcon={<MessageCircle size={14} />} component="a" target="_blank" rel="noopener noreferrer"
            href={purchaseOrderWhatsAppUrl({ ...order, items: lines }, storeName)}>
            {order.supplier?.phone ? "WhatsApp supplier" : "Share on WhatsApp"}
          </Button>
        )}
        {uuid && draft && <Button color="error" disabled={busy} onClick={() => window.confirm("Delete this draft?") && run(() => api.delete(`/purchase-orders/${uuid}`), "Draft deleted.")}>Delete draft</Button>}
        {uuid && ["DRAFT", "APPROVED"].includes(order?.status) && <Button color="error" disabled={busy} onClick={() => window.confirm("Cancel this purchase order?") && run(() => api.post(`/purchase-orders/${uuid}/cancel`), "Cancelled.")}>Cancel order</Button>}
        {order?.status === "APPROVED" && <Button disabled={busy} onClick={() => run(() => api.post(`/purchase-orders/${uuid}/close`), "Closed.")}>Mark closed</Button>}
        <Box sx={{ flex: 1 }} />
        <Button color="inherit" disabled={busy} onClick={onClose}>Back</Button>
        {draft && <Button variant="outlined" disabled={busy || invalid} onClick={save}>Save draft</Button>}
        {draft && uuid && <Button variant="contained" disabled={busy || invalid || !order.supplier_id} onClick={approve}>Approve</Button>}
      </DialogActions>
    </Dialog>
  );
}

/**
 * Store > Purchase Order. Buyers review drafts (the reorder engine prepares them nightly, or on
 * Generate now) and approve them; approving places the order with the supplier.
 */
export default function PurchaseOrders() {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const [status, setStatus] = useState("DRAFT");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [suppliers, setSuppliers] = useState([]);
  const [editing, setEditing] = useState(null); // { uuid } or { uuid: null } for a new order
  const [generating, setGenerating] = useState(false);
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: status });
  const { page, limit, setPage, setLimit } = grid;

  const load = useCallback(async () => {
    try {
      const res = await api.get("/purchase-orders", { params: { status: status || undefined } });
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load purchase orders");
    } finally {
      setLoading(false);
    }
  }, [status]);
  useEffect(() => {
    // Deferred a tick: a synchronous setState in an effect body cascades a render (set-state-in-effect).
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    let active = true;
    api.get("/suppliers", { params: { limit: 300 } }).then((res) => { if (active) setSuppliers(res.data?.data || []); }).catch(() => {});
    return () => { active = false; };
  }, [authUser?.store_id]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.post("/purchase-orders/generate");
      toast.success(res.data?.message || "Done");
      setStatus("DRAFT"); setLoading(true); void load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not prepare purchase orders");
    } finally {
      setGenerating(false);
    }
  };

  const columns = useMemo(() => [
    { key: "po_no", label: "PO no", valueGetter: (row) => row.po_no },
    { key: "po_date", label: "Date", valueGetter: (row) => row.po_date || "", render: (value) => day(value), searchValue: (row) => day(row.po_date) },
    { key: "supplier", label: "Supplier", valueGetter: (row) => row.supplier?.name || "Not chosen yet" },
    { key: "items_count", label: "Lines", valueGetter: (row) => row.items_count },
    { key: "total_qty", label: "Qty", valueGetter: (row) => Number(row.total_qty), render: (value) => qty(value) },
    { key: "received_qty", label: "Received", valueGetter: (row) => Number(row.received_qty || 0), render: (value, row) => (row.status === "DRAFT" ? "-" : qty(value)) },
    { key: "total_amount", label: "Amount", valueGetter: (row) => Number(row.total_amount), render: (value) => `₹${money(value)}` },
    { key: "source", label: "Source", valueGetter: (row) => (row.source === "AUTO" ? "Reorder" : "Manual") },
    { key: "status", label: "Status", valueGetter: (row) => statusLabel(row), render: (value, row) => <Chip size="small" color={statusColor(row)} label={value} /> },
  ], []);

  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <PageHeader onBack={() => navigate("/store")} title={<Breadcrumbs items={[{ label: "Store", onClick: () => navigate("/store") }, { label: "Purchase Order" }]} />}
        actions={<Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<Sparkles size={14} />} disabled={generating || !authUser?.store_id} onClick={generate}>{generating ? "Checking stock…" : "Generate now"}</Button>
          <Button size="small" variant="contained" startIcon={<Plus size={14} />} disabled={!authUser?.store_id} onClick={() => setEditing({ uuid: null })}>New purchase order</Button>
        </Stack>} />
      {!authUser?.store_id && <Alert severity="info">Select a store at the top to create or generate purchase orders. Orders of all your stores are listed below.</Alert>}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        {PO_FILTERS.map(([value, label]) => (
          <Button key={label} size="small" variant={status === value ? "contained" : "outlined"} color={status === value ? "primary" : "inherit"}
            onClick={() => { if (value !== status) setLoading(true); setStatus(value); setPage(1); }} sx={{ borderRadius: 999, minWidth: 0, px: 1.5 }}>{label}</Button>
        ))}
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<RefreshCw size={14} />} onClick={() => { setLoading(true); void load(); }}>Refresh</Button>
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          loadingText="Loading purchase orders..."
          emptyText={status === "DRAFT" ? "No drafts. Generate now checks stock against reorder levels." : "No purchase orders."}
          searchPlaceholder="Search purchase orders..."
          tablePreferenceKey="store.purchase-orders"
          exportFileName="purchase_orders"
          paginationMode="client"
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(value) => { setLimit(value); setPage(1); }}
          actionsLabel="Actions"
          renderActions={(row) => <Button size="small" onClick={() => setEditing({ uuid: row.uuid })}>{row.status === "DRAFT" ? "Review" : "Open"}</Button>}
        />
      </SearchGridPanel>
      {editing && <OrderEditor uuid={editing.uuid} suppliers={suppliers} storeName={authUser?.company_name} onClose={() => setEditing(null)} onChanged={() => { setLoading(true); void load(); }} />}
    </Box>
  );
}

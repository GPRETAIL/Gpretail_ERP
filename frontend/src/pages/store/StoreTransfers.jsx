import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { PackageCheck, Printer, RefreshCw, Tag, Truck, X } from "lucide-react";
import api from "../../api/axios";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
import FilterableDataTable from "../../components/FilterableDataTable";
import SearchGridPanel from "../../components/SearchGridPanel";
import useSearchGrid from "../../hooks/useSearchGrid";
import { browserPrintHtml } from "../sales/posSalesUtils";
import { FILTERS, STATUS, day, describeLine, qty, transferNoteHtml } from "./transferNote";

/**
 * Store-to-store transfers. "incoming" (Store > Stock Inward) opens on transfers in transit to this
 * store, to receive them; "all" (Store > Transfer Goods) is the register of both directions.
 */
export default function StoreTransfers({ mode = "all" }) {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const currentStore = Number(authUser?.store_id) || null;
  const incoming = mode === "incoming";
  const [status, setStatus] = useState(incoming ? "DISPATCHED" : "");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [receiving, setReceiving] = useState(null); // { transfer, lines, notes }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: `${mode}:${status}` });
  const { page, limit, setPage, setLimit } = grid;

  const load = useCallback(async () => {
    try {
      const res = await api.get("/stock-outwards", { params: { all: true, direction: incoming ? "incoming" : undefined, status: status || undefined } });
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load transfers");
    } finally {
      setLoading(false);
    }
  }, [incoming, status]);
  useEffect(() => {
    // Deferred a tick: a synchronous setState in an effect body cascades a render (set-state-in-effect).
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const columns = useMemo(() => [
    { key: "outward_no", label: "Transfer no", valueGetter: (row) => row.outward_no },
    { key: "outward_date", label: "Date", valueGetter: (row) => row.outward_date || "", render: (value) => day(value), searchValue: (row) => day(row.outward_date) },
    { key: "from", label: "From", valueGetter: (row) => row.source_store?.name || "-" },
    { key: "to", label: "To", valueGetter: (row) => row.target_store?.name || "-" },
    {
      key: "items", label: "Items", valueGetter: (row) => (row.items || []).map(describeLine).join(", "),
      render: (value, row) => <Typography sx={{ fontSize: 12 }}>{(row.items || []).length} line(s){row.items?.[0] ? ` · ${describeLine(row.items[0])}${row.items.length > 1 ? " …" : ""}` : ""}</Typography>,
    },
    { key: "total_qty", label: "Sent", valueGetter: (row) => row.total_qty, render: (value) => qty(value) },
    { key: "received_total", label: "Received", valueGetter: (row) => row.received_total, render: (value) => qty(value) },
    {
      key: "shortage", label: "Short / Damaged", valueGetter: (row) => (row.received_at ? `${qty(row.shortage_qty)} / ${qty(row.damaged_total)}` : "-"),
      render: (value, row) => <Typography sx={{ fontSize: 12, color: row.shortage_qty > 0 || row.damaged_total > 0 ? "error.main" : "text.primary" }}>{value}</Typography>,
    },
    { key: "status", label: "Status", valueGetter: (row) => STATUS[row.status]?.label || row.status, render: (value, row) => <Chip size="small" color={STATUS[row.status]?.color || "default"} label={value} /> },
  ], []);

  const openReceive = async (row) => {
    setError("");
    try {
      const res = await api.get(`/stock-outwards/${row.uuid}`);
      const transfer = res.data?.data;
      setReceiving({ transfer, notes: "", lines: (transfer.items || []).map((line) => ({ ...line, received: String(Number(line.quantity)), damaged: "0", note: "" })) });
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not open this transfer");
    }
  };
  const updateLine = (id, field, value) => setReceiving((prev) => ({ ...prev, lines: prev.lines.map((line) => (line.id === id ? { ...line, [field]: value } : line)) }));
  const lineError = (line) => {
    const received = Number(line.received), damaged = Number(line.damaged || 0);
    if (line.received === "" || received < 0 || damaged < 0 || Number.isNaN(received) || Number.isNaN(damaged)) return "Enter a quantity";
    return received + damaged > Number(line.quantity) + 0.0005 ? "More than sent" : "";
  };
  const submitReceive = async () => {
    const { transfer, lines, notes } = receiving;
    setBusy(true); setError("");
    try {
      await api.post(`/stock-outwards/${transfer.uuid}/receive`, {
        notes: notes.trim() || undefined,
        items: lines.map((line) => ({ id: line.id, received_qty: Number(line.received), damaged_qty: Number(line.damaged || 0), note: line.note.trim() || undefined })),
      });
      toast.success(`${transfer.outward_no} received.`);
      setReceiving(null);
      void load();
    } catch (err) {
      setError(err?.response?.data?.message || "Could not receive this transfer.");
    } finally {
      setBusy(false);
    }
  };
  const cancel = async (row) => {
    if (!window.confirm(`Cancel ${row.outward_no}? The stock goes back to ${row.source_store?.name}.`)) return;
    try {
      await api.post(`/stock-outwards/${row.uuid}/cancel`);
      toast.success(`${row.outward_no} cancelled; stock returned.`);
      void load();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not cancel this transfer");
    }
  };
  const printNote = async (row) => {
    try {
      const res = await api.get(`/stock-outwards/${row.uuid}`);
      browserPrintHtml(transferNoteHtml(res.data?.data || row));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not print the transfer note");
    }
  };
  // The receiving store labels what arrived with its own barcodes, then prints them from Barcode Search.
  const printLabels = async (row) => {
    const lines = (row.items || []).filter((line) => Number(line.received_qty) > 0 && line.received_product_id);
    try {
      await api.post("/barcodes/generate", {
        items: lines.map((line) => ({
          stockOutwardItemId: line.id, productId: line.received_product_id, productName: line.product_name, size: line.size, designNo: line.design_no,
          qty: Number(line.received_qty), mrp: Number(line.mrp || 0), sellingPrice: Number(line.selling_price || 0), finalPrice: Number(line.selling_price || 0),
        })),
      });
      navigate(`/warehouse/barcode/search?stock_outward_id=${row.id}&label=${encodeURIComponent(row.outward_no)}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not create the labels");
    }
  };

  const title = incoming ? "Stock Inward" : "Transfer Goods";
  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <PageHeader onBack={() => navigate("/store")} title={<Breadcrumbs items={[{ label: "Store", onClick: () => navigate("/store") }, { label: title }]} />}
        actions={<Button size="small" variant="contained" startIcon={<Truck size={14} />} onClick={() => navigate("/warehouse/stock-outward")}>New transfer</Button>} />
      {!currentStore && <Alert severity="info">Select a store at the top to receive or cancel its transfers. Transfers of all your stores are listed below.</Alert>}
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap" }}>
        {FILTERS.map(([value, label]) => (
          <Button key={label} size="small" variant={status === value ? "contained" : "outlined"} color={status === value ? "primary" : "inherit"}
            onClick={() => { if (value !== status) setLoading(true); setStatus(value); setPage(1); }} sx={{ borderRadius: 999, minWidth: 0, px: 1.5 }}>
            {label}
          </Button>
        ))}
        <Box sx={{ flex: 1 }} />
        <Button size="small" startIcon={<RefreshCw size={14} />} onClick={() => { setLoading(true); void load(); }}>Refresh</Button>
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          loadingText="Loading transfers..."
          emptyText={incoming && status === "DISPATCHED" ? "Nothing is on its way to this store." : "No transfers."}
          searchPlaceholder="Search transfers..."
          tablePreferenceKey={`store.transfers.${mode}`}
          exportFileName="stock_transfers"
          paginationMode="client"
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(value) => { setLimit(value); setPage(1); }}
          actionsLabel="Actions"
          renderActions={(row) => {
            const mine = (id) => currentStore && Number(id) === currentStore;
            return (
              <Stack direction="row" spacing={0.5}>
                {row.status === "DISPATCHED" && mine(row.target_store_id) && <Button size="small" color="success" startIcon={<PackageCheck size={14} />} onClick={() => openReceive(row)}>Receive</Button>}
                {row.status === "RECEIVED" && mine(row.target_store_id) && (row.items || []).some((line) => line.received_product_id) && <Button size="small" startIcon={<Tag size={14} />} onClick={() => printLabels(row)}>Labels</Button>}
                <Button size="small" color="inherit" aria-label={`Print transfer note ${row.outward_no}`} startIcon={<Printer size={14} />} onClick={() => printNote(row)}>Note</Button>
                {row.status === "DISPATCHED" && mine(row.source_store_id) && <Button size="small" color="error" startIcon={<X size={14} />} onClick={() => cancel(row)}>Cancel</Button>}
              </Stack>
            );
          }}
        />
      </SearchGridPanel>

      <Dialog open={Boolean(receiving)} onClose={() => { if (!busy) setReceiving(null); }} maxWidth="md" fullWidth>
        <DialogTitle>Receive {receiving?.transfer.outward_no} from {receiving?.transfer.source_store?.name}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: "text.secondary", mb: 1 }}>
            Count what arrived. Only good stock is added to this store; damaged and missing quantities are recorded against the transfer.
          </Typography>
          <Table size="small">
            <TableHead><TableRow><TableCell>Item</TableCell><TableCell align="right">Sent</TableCell><TableCell>Received</TableCell><TableCell>Damaged</TableCell><TableCell>Short</TableCell><TableCell>Note</TableCell></TableRow></TableHead>
            <TableBody>
              {(receiving?.lines || []).map((line) => {
                const problem = lineError(line);
                const short = problem ? "-" : qty(Math.max(0, Number(line.quantity) - Number(line.received) - Number(line.damaged || 0)));
                return (
                  <TableRow key={line.id}>
                    <TableCell><Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{describeLine(line)}</Typography><Typography sx={{ fontSize: 11, color: "text.secondary" }}>{line.product_code}</Typography></TableCell>
                    <TableCell align="right">{qty(line.quantity)}</TableCell>
                    <TableCell><TextField size="small" type="number" value={line.received} error={Boolean(problem)} helperText={problem || " "} onChange={(e) => updateLine(line.id, "received", e.target.value)} slotProps={{ htmlInput: { min: 0, step: "any", "aria-label": `Received ${line.product_name}` } }} sx={{ width: 100 }} /></TableCell>
                    <TableCell><TextField size="small" type="number" value={line.damaged} onChange={(e) => updateLine(line.id, "damaged", e.target.value)} slotProps={{ htmlInput: { min: 0, step: "any", "aria-label": `Damaged ${line.product_name}` } }} sx={{ width: 90 }} helperText=" " /></TableCell>
                    <TableCell>{short}</TableCell>
                    <TableCell><TextField size="small" value={line.note} onChange={(e) => updateLine(line.id, "note", e.target.value)} slotProps={{ htmlInput: { maxLength: 255, "aria-label": `Note ${line.product_name}` } }} helperText=" " /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <TextField fullWidth size="small" label="Receiving notes (optional)" value={receiving?.notes || ""} onChange={(e) => setReceiving((prev) => ({ ...prev, notes: e.target.value }))} sx={{ mt: 1 }} slotProps={{ htmlInput: { maxLength: 1000 } }} />
          {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button color="inherit" disabled={busy} onClick={() => setReceiving(null)}>Cancel</Button>
          <Button variant="contained" color="success" disabled={busy || (receiving?.lines || []).some(lineError)} onClick={submitReceive}>{busy ? "Receiving…" : "Confirm receipt"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

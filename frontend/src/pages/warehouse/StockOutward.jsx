import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Card, IconButton, MenuItem, Stack, Table, TableBody, TableCell, TableHead, TableRow, TextField, Typography } from "@mui/material";
import { ListChecks, Printer, Trash2, Truck } from "lucide-react";
import api from "../../api/axios";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
import { createCheckoutKey } from "../sales/posCheckoutAttempt";
import { browserPrintHtml } from "../sales/posSalesUtils";
import { transferNoteHtml } from "../store/transferNote";

const today = () => new Date().toISOString().slice(0, 10);

/**
 * Dispatch a store-to-store transfer: scan what is being sent, pick the receiving store, dispatch.
 * Stock leaves this store at once and stays in transit until the receiving store confirms it
 * (Store > Stock Inward). The transfer key makes a retried or double-clicked dispatch one transfer.
 */
export default function StockOutward() {
  const navigate = useNavigate();
  const authUser = useSelector((state) => state.auth.user);
  const scanRef = useRef(null);
  const [destinations, setDestinations] = useState([]);
  const [targetStoreId, setTargetStoreId] = useState("");
  const [date, setDate] = useState(today);
  const [notes, setNotes] = useState("");
  const [scan, setScan] = useState("");
  const [lines, setLines] = useState([]);
  const [busy, setBusy] = useState(false);
  const [dispatched, setDispatched] = useState(null);
  const [transferKey, setTransferKey] = useState(createCheckoutKey);

  useEffect(() => {
    let active = true;
    api.get("/stock-outwards/destinations").then((res) => { if (active) setDestinations(res.data?.data || []); })
      .catch(() => { if (active) toast.error("Could not load the stores you can send to."); });
    return () => { active = false; };
  }, [authUser?.store_id]);

  const addScan = async (event) => {
    event.preventDefault();
    const code = scan.trim();
    if (!code) return;
    setScan("");
    try {
      const res = await api.get("/pos-sales/barcode-lookup", { params: { barcode: code } });
      const found = res.data?.data;
      if (!found?.id) throw new Error("not found");
      setLines((prev) => {
        const key = `${found.id}:${found.variantId || ""}`;
        const existing = prev.find((line) => line.key === key);
        // A pack/cut label is shared by every unit of its variant, so a repeat scan adds one more.
        if (existing) return prev.map((line) => (line.key === key ? { ...line, quantity: String(Number(line.quantity) + 1) } : line));
        return [...prev, { key, productId: found.id, variantId: found.variantId || null, name: found.name, code: found.code, barcode: found.barcode,
          stock: Number(found.stock_qty ?? 0), unitPrice: Number(found.final_price || found.selling_price || 0), quantity: "1" }];
      });
    } catch {
      toast.error(`No product in this store for "${code}".`);
    } finally {
      scanRef.current?.focus();
    }
  };
  const setQty = (key, value) => setLines((prev) => prev.map((line) => (line.key === key ? { ...line, quantity: value } : line)));
  const lineProblem = (line) => {
    const value = Number(line.quantity);
    if (!(value > 0)) return "Enter a quantity";
    return value > line.stock + 0.0005 ? `Only ${line.stock} in stock` : "";
  };
  const totalQty = lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);
  const canDispatch = targetStoreId && lines.length > 0 && !lines.some(lineProblem) && !busy;

  const dispatch = async () => {
    setBusy(true);
    try {
      const res = await api.post("/stock-outwards", {
        transfer_key: transferKey, target_store_id: Number(targetStoreId), outward_date: date, notes: notes.trim() || undefined,
        items: lines.map((line) => ({ product_id: line.productId, variant_id: line.variantId, quantity: Number(line.quantity), unit_price: line.unitPrice })),
      });
      const transfer = res.data?.data;
      toast.success(`${transfer?.outward_no} dispatched to ${transfer?.target_store?.name}. It is in transit until they receive it.`);
      setDispatched(transfer);
      setLines([]); setNotes(""); setTargetStoreId(""); setDate(today()); setTransferKey(createCheckoutKey());
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not dispatch this transfer");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <PageHeader onBack={() => navigate("/warehouse")} title={<Breadcrumbs items={[{ label: "Warehouse", onClick: () => navigate("/warehouse") }, { label: "Stock Outward" }]} />}
        actions={<Button size="small" startIcon={<ListChecks size={14} />} onClick={() => navigate("/store/transfer-goods")}>All transfers</Button>} />
      {!authUser?.store_id && <Alert severity="info">Select the store you are sending from at the top before dispatching.</Alert>}
      {dispatched && (
        <Alert severity="success" action={<Button size="small" startIcon={<Printer size={14} />} onClick={() => browserPrintHtml(transferNoteHtml(dispatched))}>Print note</Button>}>
          {dispatched.outward_no} is in transit to {dispatched.target_store?.name} ({dispatched.total_qty} pcs).
        </Alert>
      )}
      <Card variant="outlined" sx={{ p: 1.5 }}>
        <Stack direction={{ xs: "column", md: "row" }} spacing={1.5}>
          <TextField select size="small" label="Send to store" value={targetStoreId} onChange={(e) => setTargetStoreId(e.target.value)} sx={{ minWidth: 240 }}
            helperText={destinations.length ? " " : "No other active store in your company."}>
            {destinations.map((store) => <MenuItem key={store.id} value={String(store.id)}>{store.name}</MenuItem>)}
          </TextField>
          <TextField size="small" type="date" label="Date" value={date} onChange={(e) => setDate(e.target.value)} slotProps={{ inputLabel: { shrink: true } }} helperText=" " />
          <TextField size="small" label="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} slotProps={{ htmlInput: { maxLength: 1000 } }} sx={{ flex: 1 }} helperText=" " />
        </Stack>
        <Box component="form" onSubmit={addScan} sx={{ mt: 1 }}>
          <TextField inputRef={scanRef} autoFocus fullWidth size="small" label="Scan or type a barcode / product code" value={scan} onChange={(e) => setScan(e.target.value)} />
        </Box>
      </Card>
      <Card variant="outlined" sx={{ p: 1.5 }}>
        <Typography component="h2" sx={{ fontSize: 13, fontWeight: 700, mb: 1 }}>Items to send ({lines.length} line{lines.length === 1 ? "" : "s"}, {totalQty} pcs)</Typography>
        {lines.length === 0 ? <Typography sx={{ fontSize: 12.5, color: "text.secondary" }}>Scan items to add them.</Typography> : (
          <Table size="small">
            <TableHead><TableRow><TableCell>Item</TableCell><TableCell>Barcode</TableCell><TableCell align="right">In stock</TableCell><TableCell>Quantity</TableCell><TableCell /></TableRow></TableHead>
            <TableBody>
              {lines.map((line) => {
                const problem = lineProblem(line);
                return (
                  <TableRow key={line.key}>
                    <TableCell><Typography sx={{ fontSize: 12.5, fontWeight: 600 }}>{line.name}</Typography><Typography sx={{ fontSize: 11, color: "text.secondary" }}>{line.code}</Typography></TableCell>
                    <TableCell>{line.barcode || "-"}</TableCell>
                    <TableCell align="right">{line.stock}</TableCell>
                    <TableCell><TextField size="small" type="number" value={line.quantity} error={Boolean(problem)} helperText={problem || " "} onChange={(e) => setQty(line.key, e.target.value)}
                      slotProps={{ htmlInput: { min: 0, step: "any", "aria-label": `Quantity ${line.name}` } }} sx={{ width: 110 }} /></TableCell>
                    <TableCell><IconButton size="small" aria-label={`Remove ${line.name}`} onClick={() => setLines((prev) => prev.filter((item) => item.key !== line.key))}><Trash2 size={15} /></IconButton></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
        <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 1.5 }}>
          <Button variant="contained" startIcon={<Truck size={15} />} disabled={!canDispatch} onClick={dispatch}>{busy ? "Dispatching…" : "Dispatch transfer"}</Button>
        </Stack>
      </Card>
    </Box>
  );
}

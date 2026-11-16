import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, TextField, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";
import { Minus, PackageCheck, Plus, RefreshCw, ScanLine, Search, Trash2 } from "lucide-react";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { masterSearchAreaSx } from "@/shared/theme/erpUi";
import ApprovalDialog from "@/features/sales/approvals/components/ApprovalDialog";
import { approvalRequirementFrom, isApprovalRequired } from "@/features/sales/approvals/utils/approvals";
import { countScan, deliverySummary, emptyCounts, setLineCount } from "@/features/sales/delivery/utils/deliveryCount";

const qtyText = (value) => Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 3 });
const items = (value) => `${qtyText(value)} ${Number(value) === 1 ? "item" : "items"}`;
const when = (value) => (value ? new Date(value).toLocaleString(undefined, { day: "2-digit", month: "short", hour: "numeric", minute: "2-digit" }) : "-");
const today = () => new Date().toLocaleDateString("en-CA");

/** A short tone per scan, so the person can keep their eyes on the goods. */
const beep = (ok) => {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const tone = ctx.createOscillator();
    const gain = ctx.createGain();
    tone.frequency.value = ok ? 1200 : 300;
    gain.gain.value = 0.08;
    tone.connect(gain).connect(ctx.destination);
    tone.start();
    tone.stop(ctx.currentTime + (ok ? 0.08 : 0.35));
    tone.onended = () => ctx.close();
  } catch {
    // No sound on this device: the coloured message still shows.
  }
};

const STATUS = {
  ok: { label: "OK", color: "success" },
  missing: { label: "Missing", color: "warning" },
  extra: { label: "Extra", color: "error" },
};

/**
 * Sales > Delivery: before a bill's goods go to the customer, each item is scanned against the bill. Extra items
 * must be taken out; missing items can only be handed over short with a reason and a supervisor's approval.
 */
export default function Delivery() {
  const navigate = useNavigate();
  const storeId = useSelector((state) => state.auth.user?.store_id);
  const [billNo, setBillNo] = useState("");
  const [bill, setBill] = useState(null);
  const [loadingBill, setLoadingBill] = useState(false);
  const [counts, setCountsState] = useState(emptyCounts);
  const [scan, setScan] = useState("");
  const [feedback, setFeedback] = useState(null); // { severity, text }
  const [shortOpen, setShortOpen] = useState(false);
  const [shortReason, setShortReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [approvalRequirement, setApprovalRequirement] = useState(null);
  const [done, setDone] = useState(null); // the last handover, shown until the next bill
  const billRef = useRef(null);
  const scanRef = useRef(null);
  const scanCache = useRef(new Map());
  // A scanner sends codes faster than the server answers: scans run one after another, each on the latest count.
  const countsRef = useRef(counts);
  const scanQueue = useRef(Promise.resolve());
  const setCounts = (next) => {
    countsRef.current = typeof next === "function" ? next(countsRef.current) : next;
    setCountsState(countsRef.current);
  };

  // Register: behind the Search button, as on the other entry screens; loaded when it is opened.
  const [showSearch, setShowSearch] = useState(false);
  const [rows, setRows] = useState([]);
  const [registerLoading, setRegisterLoading] = useState(true);
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState("all");
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: `${storeId || ""}:${from}:${to}:${status}` });
  const { page, limit, setPage, setLimit } = grid;

  const loadRegister = useCallback(async () => {
    try {
      const res = await api.get("/deliveries", { params: { from, to, ...(status === "all" ? {} : { status }) } });
      setRows(res.data?.data || []);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load deliveries");
    } finally {
      setRegisterLoading(false);
    }
  }, [from, to, status]);

  useEffect(() => {
    if (!showSearch) return undefined;
    const timer = setTimeout(loadRegister, 0);
    return () => clearTimeout(timer);
  }, [loadRegister, showSearch]);

  const openSearch = () => { setRegisterLoading(true); setShowSearch(true); };
  const closeSearch = () => {
    setShowSearch(false);
    setTimeout(() => (bill ? scanRef.current : billRef.current)?.focus(), 0);
  };

  const lines = useMemo(() => bill?.lines || [], [bill]);
  const summary = useMemo(() => deliverySummary(lines, counts), [lines, counts]);
  const checking = Boolean(bill && !bill.delivery && !bill.cancelled && summary.expected > 0);

  const openBill = async (event) => {
    event?.preventDefault();
    const number = billNo.trim();
    if (!number || loadingBill) return;
    setLoadingBill(true);
    setFeedback(null);
    setDone(null);
    try {
      const res = await api.get("/deliveries/bill", { params: { no: number } });
      setBill(res.data?.data || null);
      setCounts(emptyCounts());
      setScan("");
      setTimeout(() => scanRef.current?.focus(), 0);
    } catch (err) {
      setBill(null);
      setFeedback({ severity: "error", text: err?.response?.data?.message || "Bill not found." });
      beep(false);
    } finally {
      setLoadingBill(false);
    }
  };

  const resolve = async (barcode) => {
    if (scanCache.current.has(barcode)) return scanCache.current.get(barcode);
    try {
      const res = await api.get("/deliveries/scan", { params: { barcode } });
      const found = res.data?.data || null;
      scanCache.current.set(barcode, found);
      return found;
    } catch (err) {
      if (err?.response?.status === 404) {
        scanCache.current.set(barcode, null);
        return null;
      }
      throw err;
    }
  };

  const onScan = (event) => {
    event.preventDefault();
    const barcode = scan.trim();
    setScan("");
    if (!barcode || !checking) return;
    scanQueue.current = scanQueue.current.then(() => countOne(barcode));
  };

  const countOne = async (barcode) => {
    let found;
    try {
      found = await resolve(barcode);
    } catch {
      setFeedback({ severity: "error", text: "Could not check the barcode. Scan again." });
      beep(false);
      return;
    }
    const result = countScan(lines, countsRef.current, barcode, found);
    setCounts(result.counts);
    setFeedback({ severity: result.ok ? "success" : result.duplicate ? "warning" : "error", text: result.message });
    beep(result.ok);
  };

  const changeLine = (line, qty) => setCounts((current) => setLineCount(current, line.key, qty));
  const removeExtra = (id) => setCounts((current) => ({ ...current, extras: current.extras.filter((extra) => extra.id !== id) }));

  const handOver = async (token) => {
    setSaving(true);
    try {
      const res = await api.post("/deliveries", {
        source_type: bill.source_type,
        source_id: bill.source_id,
        items: lines.map((line) => ({ product_id: line.product_id, variant_id: line.variant_id, qty: counts.lines[line.key]?.qty || 0, barcodes: counts.lines[line.key]?.barcodes || [] }))
          .filter((item) => item.qty > 0),
        short_reason: summary.missing > 0 ? shortReason.trim() : null,
        ...(token ? { approvalToken: token } : {}),
      });
      const delivery = res.data?.data;
      toast.success(res.data?.message || "Handed over.");
      setDone({ ...delivery, customer: bill.customer });
      setShortOpen(false);
      setShortReason("");
      setBill(null);
      setBillNo("");
      setCounts(emptyCounts());
      setFeedback(null);
      setTimeout(() => billRef.current?.focus(), 0);
    } catch (err) {
      if (isApprovalRequired(err)) {
        setApprovalRequirement(approvalRequirementFrom(err));
        return;
      }
      toast.error(err?.response?.data?.errors ? Object.values(err.response.data.errors).flat()[0] : err?.response?.data?.message || "Could not save the handover.");
    } finally {
      setSaving(false);
    }
  };

  const onHandOverClick = () => (summary.missing > 0 ? setShortOpen(true) : void handOver());

  const columns = useMemo(() => [
    { key: "delivered_at", label: "Time", valueGetter: (row) => when(row.delivered_at) },
    { key: "bill_no", label: "Bill", valueGetter: (row) => row.bill_no },
    { key: "bill_type", label: "Type", valueGetter: (row) => row.bill_type },
    { key: "customer", label: "Customer", valueGetter: (row) => row.customer },
    { key: "delivered_qty", label: "Items", valueGetter: (row) => `${qtyText(row.delivered_qty)} of ${qtyText(row.expected_qty)}` },
    {
      key: "status_label", label: "Status", valueGetter: (row) => row.status_label,
      render: (_value, row) => (
        <Box>
          <Chip size="small" color={row.status === "short" ? "warning" : "success"} label={row.status_label} />
          {row.short_reason && <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>{qtyText(row.short_qty)} short · {row.short_reason}</Typography>}
        </Box>
      ),
    },
    { key: "delivered_by", label: "Delivered by", valueGetter: (row) => row.delivered_by || "-" },
    { key: "approved_by", label: "Approved by", valueGetter: (row) => row.approved_by || "-" },
  ], []);

  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, minHeight: 0 }}>
      <PageHeader
        onBack={showSearch ? closeSearch : () => navigate("/sales")}
        backLabel={showSearch ? "Back to delivery entry" : "Back to sales"}
        title={<Breadcrumbs items={[{ label: "Sales", onClick: () => navigate("/sales") }, { label: "Delivery", ...(showSearch ? { onClick: closeSearch } : {}) }, ...(showSearch ? [{ label: "Delivery register" }] : [])]} />}
        actions={
          <Button onClick={showSearch ? closeSearch : openSearch} className="glass-btn glass-btn-primary" sx={{ display: "inline-flex", alignItems: "center" }}>
            <Search size={16} style={{ marginRight: 4 }} />
            {showSearch ? "Back" : "Search"}
          </Button>
        }
      />

      {!showSearch && <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: { xs: 1.5, md: 2 }, bgcolor: "background.paper" }}>
        {/* data-enter-ignore: Enter (a scanner's last key) submits here instead of moving to the next field. */}
        <Stack component="form" onSubmit={openBill} data-enter-ignore="true" direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
          <TextField inputRef={billRef} size="small" label="Bill / invoice number" value={billNo} onChange={(e) => setBillNo(e.target.value)} autoFocus
            placeholder="Scan the bill's barcode or type its number" sx={{ flex: 1, maxWidth: { sm: 420 } }} autoComplete="off" />
          <Button type="submit" variant="contained" disabled={!billNo.trim() || loadingBill} startIcon={loadingBill ? <CircularProgress size={14} color="inherit" /> : null}>
            Open bill
          </Button>
        </Stack>

        {done && !bill && (
          <Alert severity={done.status === "short" ? "warning" : "success"} sx={{ mt: 1.5 }}>
            Bill {done.bill_no} ({done.customer}) {done.status === "short"
              ? `handed over short: ${qtyText(done.delivered_qty)} of ${items(done.expected_qty)}${done.approved_by ? `, approved by ${done.approved_by}` : ""}.`
              : `handed over: ${Number(done.delivered_qty) === 1 ? "1 item" : `all ${items(done.delivered_qty)}`}.`} Scan the next bill.
          </Alert>
        )}
        {feedback && !checking && <Alert severity={feedback.severity} sx={{ mt: 1.5 }}>{feedback.text}</Alert>}

        {bill && (
          <Box sx={{ mt: 2 }}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={{ xs: 0.25, sm: 2 }} sx={{ mb: 1.5, alignItems: { sm: "baseline" } }}>
              <Typography sx={{ fontWeight: 700, fontSize: 16 }}>{bill.bill_type} {bill.bill_no}</Typography>
              <Typography sx={{ fontSize: 13, color: "text.secondary" }}>
                {bill.customer}{bill.customer_phone ? ` · ${bill.customer_phone}` : ""}{bill.date ? ` · ${bill.date}` : ""}
              </Typography>
            </Stack>

            {bill.cancelled && <Alert severity="error">This bill is cancelled. Nothing is handed over against it.</Alert>}
            {!bill.cancelled && !bill.delivery && summary.expected <= 0 && <Alert severity="info">Every item on this bill was returned. Nothing is left to hand over.</Alert>}
            {bill.delivery && (
              <Alert severity={bill.delivery.status === "short" ? "warning" : "success"} sx={{ mb: 1.5 }}>
                {bill.delivery.status === "short" ? "Short delivered" : "Delivered"} on {when(bill.delivery.delivered_at)}
                {bill.delivery.delivered_by ? ` by ${bill.delivery.delivered_by}` : ""}: {qtyText(bill.delivery.delivered_qty)} of {qtyText(bill.delivery.expected_qty)} items.
                {bill.delivery.short_reason ? ` Reason: ${bill.delivery.short_reason}.` : ""}
                {bill.delivery.approved_by && bill.delivery.status === "short" ? ` Approved by ${bill.delivery.approved_by}.` : ""}
              </Alert>
            )}

            {checking && (
              <Stack component="form" onSubmit={onScan} data-enter-ignore="true" direction="row" spacing={1} sx={{ mb: 1.5, alignItems: "center" }}>
                <TextField inputRef={scanRef} size="small" label="Scan item" value={scan} onChange={(e) => setScan(e.target.value)} autoComplete="off"
                  sx={{ flex: 1, maxWidth: 420 }} slotProps={{ input: { startAdornment: <ScanLine size={16} style={{ marginRight: 8, opacity: 0.6 }} /> } }} />
                <Button type="submit" variant="outlined" disabled={!scan.trim()}>Add</Button>
              </Stack>
            )}
            {checking && feedback && <Alert severity={feedback.severity} sx={{ mb: 1.5 }} role="status">{feedback.text}</Alert>}

            <Box role="table" aria-label="Bill items" sx={{ border: 1, borderColor: "divider", borderRadius: 1.5, overflow: "hidden" }}>
              <Box role="row" sx={{ display: { xs: "none", md: "grid" }, gridTemplateColumns: "minmax(0,2fr) 90px 90px 170px 110px", gap: 1, px: 1.5, py: 1, bgcolor: "action.hover", fontSize: 12, fontWeight: 600, color: "text.secondary" }}>
                <span role="columnheader">Item</span><span role="columnheader">Billed</span><span role="columnheader">To deliver</span><span role="columnheader">Counted</span><span role="columnheader">Status</span>
              </Box>
              {lines.map((line) => {
                const delivered = bill.delivery?.items?.find((item) => item.product_id === line.product_id && (item.variant_id || null) === (line.variant_id || null));
                const counted = bill.delivery ? Number(delivered?.delivered_qty || 0) : Number(counts.lines[line.key]?.qty || 0);
                const state = counted > line.expected_qty + 0.0005 ? "extra" : counted < line.expected_qty - 0.0005 ? "missing" : "ok";
                return (
                  <Box role="row" key={line.key} sx={{ display: "grid", gridTemplateColumns: { xs: "minmax(0,1fr) auto", md: "minmax(0,2fr) 90px 90px 170px 110px" }, gap: 1, px: 1.5, py: 1, borderTop: 1, borderColor: "divider", alignItems: "center" }}>
                    <Box role="cell" sx={{ minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600 }} noWrap title={line.name}>{line.name}</Typography>
                      <Typography sx={{ fontSize: 11.5, color: "text.secondary" }}>
                        {[line.code, line.size && `Size ${line.size}`].filter(Boolean).join(" · ")}
                        <Box component="span" sx={{ display: { md: "none" } }}> · deliver {qtyText(line.expected_qty)}</Box>
                      </Typography>
                    </Box>
                    <Box role="cell" sx={{ display: { xs: "none", md: "block" }, fontSize: 13 }}>
                      {qtyText(line.billed_qty)}{line.returned_qty > 0 && <Typography component="span" sx={{ fontSize: 11, color: "text.secondary" }}> ({qtyText(line.returned_qty)} returned)</Typography>}
                    </Box>
                    <Box role="cell" sx={{ display: { xs: "none", md: "block" }, fontSize: 13, fontWeight: 600 }}>{qtyText(line.expected_qty)}</Box>
                    <Box role="cell" sx={{ gridColumn: { xs: "1 / -1", md: "auto" }, gridRow: { xs: 2, md: "auto" } }}>
                      {checking ? (
                        <Stack direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
                          <IconButton size="small" aria-label={`One less ${line.name}`} onClick={() => changeLine(line, Math.max(0, counted - 1))} disabled={counted <= 0}><Minus size={15} /></IconButton>
                          <TextField size="small" value={counted} onChange={(e) => changeLine(line, Math.max(0, Number(e.target.value) || 0))}
                            slotProps={{ htmlInput: { inputMode: "decimal", "aria-label": `Counted ${line.name}`, style: { textAlign: "center", width: 56, padding: "4px 6px" } } }} />
                          <IconButton size="small" aria-label={`One more ${line.name}`} onClick={() => changeLine(line, counted + 1)}><Plus size={15} /></IconButton>
                        </Stack>
                      ) : (
                        <Typography sx={{ fontSize: 13 }}>{qtyText(counted)}</Typography>
                      )}
                    </Box>
                    <Box role="cell">
                      {(checking || bill.delivery) && (
                        <Chip size="small" color={STATUS[state].color} variant={state === "ok" ? "filled" : "outlined"}
                          label={state === "ok" ? STATUS.ok.label : `${STATUS[state].label} ${qtyText(Math.abs(counted - line.expected_qty))}`} />
                      )}
                    </Box>
                  </Box>
                );
              })}
            </Box>

            {checking && counts.extras.length > 0 && (
              <Alert severity="error" sx={{ mt: 1.5 }} icon={false}>
                <Typography sx={{ fontWeight: 600, fontSize: 13, mb: 0.5 }}>Take these out: they are not on the bill</Typography>
                {counts.extras.map((extra) => (
                  <Stack key={extra.id} direction="row" spacing={1} sx={{ alignItems: "center", fontSize: 13 }}>
                    <span style={{ flex: 1 }}>{extra.name || "Unknown item"} · {extra.barcode} · {extra.reason}</span>
                    <Button size="small" color="inherit" startIcon={<Trash2 size={14} />} onClick={() => removeExtra(extra.id)}>Removed</Button>
                  </Stack>
                ))}
              </Alert>
            )}

            {checking && (
              <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mt: 1.5, alignItems: { sm: "center" }, justifyContent: "space-between" }}>
                <Typography sx={{ fontSize: 13, color: "text.secondary" }} role="status" aria-label="Delivery summary">
                  To deliver {qtyText(summary.expected)} · Counted {qtyText(summary.counted)}
                  {summary.missing > 0 && <Box component="span" sx={{ color: "warning.main", fontWeight: 600 }}> · Missing {qtyText(summary.missing)}</Box>}
                  {summary.extra > 0 && <Box component="span" sx={{ color: "error.main", fontWeight: 600 }}> · Extra {qtyText(summary.extra)}</Box>}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button onClick={() => { setBill(null); setCounts(emptyCounts()); setFeedback(null); setTimeout(() => billRef.current?.focus(), 0); }}>Cancel</Button>
                  <Button variant="contained" color={summary.missing > 0 ? "warning" : "success"} startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <PackageCheck size={16} />}
                    disabled={saving || summary.extra > 0 || summary.counted <= 0} onClick={onHandOverClick}>
                    {summary.extra > 0 ? "Remove extra items first" : summary.missing > 0 ? "Hand over short" : "Hand over"}
                  </Button>
                </Stack>
              </Stack>
            )}
          </Box>
        )}
      </Box>}

      {showSearch && <Box sx={{ ...masterSearchAreaSx, display: "flex", flexDirection: "column", gap: 1 }}>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ alignItems: { sm: "center" } }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, flex: 1 }}>Delivery register</Typography>
        <TextField size="small" type="date" label="From" value={from} onChange={(e) => { setFrom(e.target.value); setRegisterLoading(true); }} slotProps={{ inputLabel: { shrink: true } }} />
        <TextField size="small" type="date" label="To" value={to} onChange={(e) => { setTo(e.target.value); setRegisterLoading(true); }} slotProps={{ inputLabel: { shrink: true } }} />
        <ToggleButtonGroup size="small" exclusive value={status} onChange={(_e, value) => { if (value) { setStatus(value); setRegisterLoading(true); } }}>
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="delivered">Delivered</ToggleButton>
          <ToggleButton value="short">Short</ToggleButton>
        </ToggleButtonGroup>
        <Button size="small" startIcon={<RefreshCw size={14} />} onClick={() => { setRegisterLoading(true); void loadRegister(); }}>Refresh</Button>
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={registerLoading}
          loadingText="Loading deliveries..."
          emptyText="No bills handed over in this period."
          searchPlaceholder="Search deliveries..."
          tablePreferenceKey="sales.delivery-register"
          exportFileName="delivery_register"
          paginationMode="client"
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(value) => { setLimit(value); setPage(1); }}
        />
      </SearchGridPanel>
      </Box>}

      <Dialog open={shortOpen} onClose={() => !saving && setShortOpen(false)} maxWidth="xs" fullWidth aria-labelledby="short-title">
        <DialogTitle id="short-title">Hand over short?</DialogTitle>
        <DialogContent>
          <Typography sx={{ fontSize: 13, mb: 1.5 }}>
            {qtyText(summary.missing)} item(s) on bill {bill?.bill_no} are missing. The bill will be marked Short delivered; a supervisor must approve.
          </Typography>
          <TextField fullWidth autoFocus multiline minRows={2} label="Why are items missing?" value={shortReason} onChange={(e) => setShortReason(e.target.value)}
            slotProps={{ htmlInput: { maxLength: 500 } }} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShortOpen(false)} disabled={saving}>Back</Button>
          <Button variant="contained" color="warning" disabled={saving || !shortReason.trim()} onClick={() => void handOver()}>Hand over short</Button>
        </DialogActions>
      </Dialog>

      {approvalRequirement && (
        <ApprovalDialog
          requirement={approvalRequirement}
          onClose={() => setApprovalRequirement(null)}
          onApproved={(token) => { setApprovalRequirement(null); void handOver(token); }}
        />
      )}
    </Box>
  );
}

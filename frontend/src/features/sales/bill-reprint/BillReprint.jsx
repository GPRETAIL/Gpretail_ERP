import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { Box, Button, Chip, Stack, TextField } from "@mui/material";
import { History, MessageCircle, Printer, Search } from "lucide-react";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { masterSearchAreaSx } from "@/shared/theme/erpUi";
import ApprovalDialog from "@/features/sales/approvals/components/ApprovalDialog";
import ReprintDialog from "./components/ReprintDialog";
import ReprintHistoryDialog from "./components/ReprintHistoryDialog";
import useBillReprint from "./hooks/useBillReprint";
import { REPRINT_TYPES, storeApi } from "./utils/reprintDocuments";
import { reprintApprovalRequirement, reprintErrorMessage } from "./utils/reprintRules";

const money = (v) => Number(v || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const dayText = (offset = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offset);
  return d.toLocaleDateString("en-CA");
};
const rowKey = (row) => `${row.type}:${row.id}`;

/**
 * Sales > Bill Reprint: find any sales document (POS bills and returns, dealer invoices, returns and receipts,
 * customer orders) by number, phone or customer and reprint it in the store's own format, marked DUPLICATE, or share
 * it as a PDF on WhatsApp. Every reprint is logged; repeat reprints need a reason and a cashier needs a supervisor's
 * approval for an earlier day's bill (Sales Customisation > Bill reprint).
 */
export default function BillReprint() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const initialTypes = (params.get("types") || "").split(",").filter((t) => REPRINT_TYPES.some((x) => x.value === t));
  const [filters, setFilters] = useState({ q: params.get("q") || "", from: dayText(-6), to: dayText(0), types: initialTypes });
  const [applied, setApplied] = useState(filters);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState([]);
  const [dialog, setDialog] = useState(null); // { rows, mode }
  const [approval, setApproval] = useState(null); // { row, options }
  const [history, setHistory] = useState(null);
  const [busy, setBusy] = useState(false);
  const { print, share } = useBillReprint();
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: JSON.stringify(applied) });
  const { page, limit, setPage, setLimit } = grid;

  useEffect(() => {
    let alive = true;
    const f = applied;
    const q = f.q.trim();
    api.get("/bill-reprints", { params: { q: q || undefined, from: q ? undefined : f.from || undefined, to: q ? undefined : f.to || undefined,
      types: f.types.length ? f.types : undefined } })
      .then((res) => alive && setRows(res.data?.data || []))
      .catch((err) => {
        if (!alive) return;
        toast.error(err?.response?.data?.message || "Could not load documents.");
        setRows([]);
      })
      .finally(() => {
        if (!alive) return;
        setSelected([]);
        setLoading(false);
      });
    return () => { alive = false; };
  }, [applied]);

  const reload = (next) => { setLoading(true); setPage(1); setApplied({ ...next }); };
  const search = () => reload(filters);
  // A type button filters straight away (with the search text and dates as they are).
  const setTypes = (types) => {
    const next = { ...filters, types };
    setFilters(next);
    reload(next);
  };
  const toggleType = (value) => setTypes(filters.types.includes(value) ? filters.types.filter((t) => t !== value) : [...filters.types, value]);
  const multiStore = useMemo(() => new Set(rows.map((r) => r.store_id)).size > 1, [rows]);

  // The row's count and what its next reprint needs (reason, approval) come back from the server.
  const afterLog = async (row, entry) => {
    let next = { ...row, print_count: entry?.count ?? row.print_count + 1 };
    try {
      next = (await storeApi(api, row.store_id).get(`/bill-reprints/${row.type}/${row.id}`)).data?.data || next;
    } catch { /* keep the local count */ }
    setRows((list) => list.map((r) => (rowKey(r) === rowKey(row) ? { ...r, ...next } : r)));
  };

  /** Prints / shares one row; asks for the supervisor's approval first when the row needs it. */
  const runOne = async (row, mode, options) => {
    if (row.approval_required && !options.approvalToken) {
      setApproval({ row, mode, options });
      return false;
    }
    const entry = mode === "share" ? await share(row, options) : await print(row, options);
    await afterLog(row, entry);
    return true;
  };

  const confirm = async (options) => {
    const { rows: targets, mode } = dialog;
    setBusy(true);
    try {
      if (targets.length === 1) {
        const done = await runOne(targets[0], mode, options);
        if (done) toast.success(mode === "share" ? "Shared." : `Reprinted ${targets[0].number}.`);
        setDialog(null);
        return;
      }
      let printed = 0;
      const skipped = [];
      for (const row of targets) {
        if (row.approval_required) { skipped.push(row.number); continue; }
        try {
          await print(row, options);
          printed += 1;
        } catch (err) {
          skipped.push(`${row.number} (${reprintErrorMessage(err)})`);
        }
      }
      toast[skipped.length ? "warning" : "success"](`Reprinted ${printed} of ${targets.length}.${skipped.length ? ` Not printed: ${skipped.join(", ")}.` : ""}`);
      setDialog(null);
      reload(applied);
    } catch (err) {
      toast.error(reprintErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const approved = async (token) => {
    const { row, mode, options } = approval;
    setApproval(null);
    setBusy(true);
    try {
      await runOne(row, mode, { ...options, approvalToken: token });
      toast.success(mode === "share" ? "Shared." : `Reprinted ${row.number}.`);
      setDialog(null);
    } catch (err) {
      toast.error(reprintErrorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const selectedRows = rows.filter((r) => selected.includes(rowKey(r)));

  const columns = useMemo(() => [
    { key: "type_label", label: "Type", valueGetter: (r) => r.type_label },
    { key: "number", label: "Number", valueGetter: (r) => r.number },
    { key: "date", label: "Date", valueGetter: (r) => r.date },
    ...(multiStore ? [{ key: "store_name", label: "Store", valueGetter: (r) => r.store_name || "-" }] : []),
    { key: "customer_name", label: "Customer", valueGetter: (r) => r.customer_name || "-" },
    { key: "customer_phone", label: "Phone", valueGetter: (r) => r.customer_phone || "-" },
    { key: "amount", label: "Amount", valueGetter: (r) => r.amount, render: (v) => <Box sx={{ textAlign: "right" }}>{money(v)}</Box> },
    { key: "status", label: "Status", valueGetter: (r) => r.status || "-" },
    { key: "print_count", label: "Reprints", valueGetter: (r) => r.print_count,
      render: (v) => (v ? <Chip size="small" color={v > 1 ? "warning" : "default"} label={v} /> : "0") },
  ], [multiStore]);

  return (
    <Box sx={{ height: "100%", display: "flex", flexDirection: "column", bgcolor: "background.default", color: "text.primary", overflow: "auto" }}>
      <PageHeader
        onBack={() => navigate("/sales")}
        backLabel="Back to sales"
        title={<Breadcrumbs items={[{ label: "Sales", onClick: () => navigate("/sales") }, { label: "Bill Reprint" }]} />}
        actions={selectedRows.length > 0 ? (
          <Button onClick={() => setDialog({ rows: selectedRows, mode: "print" })} className="glass-btn glass-btn-primary" sx={{ display: "inline-flex", alignItems: "center" }}>
            <Printer size={16} style={{ marginRight: 4 }} />Print selected ({selectedRows.length})
          </Button>
        ) : null}
      />

      <Box component="form" onSubmit={(e) => { e.preventDefault(); search(); }} data-enter-ignore="true"
        sx={{ px: { xs: 1, md: 2 }, pt: 1.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
        <Box sx={{ display: "grid", gap: 1.25, gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 1fr auto" }, alignItems: "start" }}>
          <TextField size="small" label="Bill number, phone or customer" value={filters.q} autoFocus
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} helperText={filters.q.trim() ? "Searching all dates" : undefined} />
          <TextField size="small" type="date" label="From" value={filters.from} disabled={Boolean(filters.q.trim())}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          <TextField size="small" type="date" label="To" value={filters.to} disabled={Boolean(filters.q.trim())}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
          <Button type="submit" variant="contained" startIcon={<Search size={15} />} sx={{ height: 40 }}>Search</Button>
        </Box>
        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: "wrap" }} role="group" aria-label="Document types">
          <Chip label="All types" clickable size="small" aria-pressed={filters.types.length === 0}
            color={filters.types.length === 0 ? "primary" : "default"} variant={filters.types.length === 0 ? "filled" : "outlined"}
            onClick={() => setTypes([])} />
          {REPRINT_TYPES.map((t) => (
            <Chip key={t.value} label={t.label} clickable size="small" aria-pressed={filters.types.includes(t.value)}
              color={filters.types.includes(t.value) ? "primary" : "default"} variant={filters.types.includes(t.value) ? "filled" : "outlined"}
              onClick={() => toggleType(t.value)} />
          ))}
        </Stack>
      </Box>

      <Box sx={{ ...masterSearchAreaSx, display: "flex", flexDirection: "column" }}>
        <SearchGridPanel>
          <FilterableDataTable
            rows={grid.rows}
            columns={columns}
            rowKey={rowKey}
            loading={loading}
            loadingText="Finding documents..."
            emptyText="No documents match. Try another number, phone or date range."
            searchPlaceholder="Filter these results..."
            tablePreferenceKey="sales.bill-reprint"
            exportFileName="bill_reprints"
            paginationMode="client"
            page={page}
            limit={limit}
            onPageChange={setPage}
            onLimitChange={(value) => { setLimit(value); setPage(1); }}
            enableSelection
            selectedRows={selected}
            onSelectionChange={setSelected}
            getRowSelectionLabel={(row) => `Select ${row.type_label} ${row.number}`}
            renderActions={(row) => (
              <Stack direction="row" spacing={0.5} sx={{ justifyContent: "center" }}>
                <Button size="small" startIcon={<Printer size={13} />} onClick={() => setDialog({ rows: [row], mode: "print" })} aria-label={`Reprint ${row.number}`}>Print</Button>
                <Button size="small" color="success" startIcon={<MessageCircle size={13} />} onClick={() => setDialog({ rows: [row], mode: "share" })} aria-label={`Share ${row.number}`}>Share</Button>
                <Button size="small" color="inherit" startIcon={<History size={13} />} onClick={() => setHistory(row)} aria-label={`Reprint history of ${row.number}`}>Log</Button>
              </Stack>
            )}
          />
        </SearchGridPanel>
      </Box>

      {dialog && !approval && <ReprintDialog rows={dialog.rows} mode={dialog.mode} busy={busy} onConfirm={(o) => void confirm(o)} onClose={() => setDialog(null)} />}
      {approval && (
        <ApprovalDialog requirement={reprintApprovalRequirement(approval.row, approval.options.reason)} onApproved={(token) => void approved(token)}
          onClose={() => setApproval(null)} />
      )}
      {history && <ReprintHistoryDialog row={history} onClose={() => setHistory(null)} />}
    </Box>
  );
}

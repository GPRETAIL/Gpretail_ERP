import { useCallback, useEffect, useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Stack, Typography } from "@mui/material";
import { RefreshCw, Sparkles } from "lucide-react";
import api from "../../api/axios";
import PageHeader from "../../components/PageHeader";
import Breadcrumbs from "../../components/Breadcrumbs";
import FilterableDataTable from "../../components/FilterableDataTable";
import SearchGridPanel from "../../components/SearchGridPanel";
import useSearchGrid from "../../hooks/useSearchGrid";
import { qty } from "../store/purchaseOrderPrint";

/**
 * Analytical > Reorder Status: items at or below their reorder level in the selected store, what is
 * already on order, and what the reorder engine would order. Levels are set on the item master
 * (Auto PO Min/Max, else Re-Order Min/Max).
 */
export default function ReorderStatus() {
  const navigate = useNavigate();
  const storeId = useSelector((state) => state.auth.user?.store_id);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: String(storeId || "") });
  const { page, limit, setPage, setLimit } = grid;

  const load = useCallback(async () => {
    if (!storeId) { setLoading(false); return; }
    try {
      const res = await api.get("/purchase-orders/suggestions");
      setRows((res.data?.data || []).map((row) => ({ ...row, id: `${row.product_id}:${row.variant_id || ""}` })));
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load reorder status");
    } finally {
      setLoading(false);
    }
  }, [storeId]);
  useEffect(() => {
    // Deferred a tick: a synchronous setState in an effect body cascades a render (set-state-in-effect).
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const generate = async () => {
    setGenerating(true);
    try {
      const res = await api.post("/purchase-orders/generate");
      toast.success(res.data?.message || "Done");
      if ((res.data?.data || []).length > 0) navigate("/store/purchase-order");
      else { setLoading(true); void load(); }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not prepare purchase orders");
    } finally {
      setGenerating(false);
    }
  };

  const columns = useMemo(() => [
    { key: "item", label: "Item", valueGetter: (row) => [row.product_name, row.size && `Size ${row.size}`, row.design_no && `Design ${row.design_no}`].filter(Boolean).join(" · ") },
    { key: "product_code", label: "Code", valueGetter: (row) => row.product_code || "-" },
    { key: "available", label: "In stock", valueGetter: (row) => row.available, render: (value) => <Typography sx={{ fontSize: 12, color: "error.main", fontWeight: 600 }}>{qty(value)}</Typography> },
    { key: "reorder_min", label: "Reorder at", valueGetter: (row) => row.reorder_min, render: (value) => qty(value) },
    { key: "reorder_max", label: "Fill to", valueGetter: (row) => row.reorder_max, render: (value) => qty(value) },
    { key: "on_order", label: "On order", valueGetter: (row) => row.on_order, render: (value) => qty(value) },
    { key: "suggested", label: "To order", valueGetter: (row) => row.suggested, render: (value) => <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{qty(value)}</Typography> },
    { key: "supplier_name", label: "Supplier", valueGetter: (row) => row.supplier_name || "Unassigned" },
  ], []);

  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <PageHeader onBack={() => navigate("/analytical")} title={<Breadcrumbs items={[{ label: "Analytical", onClick: () => navigate("/analytical") }, { label: "Reorder Status" }]} />}
        actions={<Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<RefreshCw size={14} />} onClick={() => { setLoading(true); void load(); }}>Refresh</Button>
          <Button size="small" variant="contained" startIcon={<Sparkles size={14} />} disabled={generating || rows.length === 0} onClick={generate}>{generating ? "Preparing…" : "Generate draft POs"}</Button>
        </Stack>} />
      {!storeId ? <Alert severity="info">Select a store at the top; reorder levels are checked one store at a time.</Alert> : (
        <Alert severity="info">Items whose stock is at or below their <b>Auto PO Min</b> (else Re-Order Min) on the item master. Quantities on draft or approved purchase orders are already counted, so nothing is ordered twice.</Alert>
      )}
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={loading}
          loadingText="Checking stock against reorder levels..."
          emptyText="Nothing is at or below its reorder level."
          searchPlaceholder="Search items..."
          tablePreferenceKey="analytical.reorder-status"
          exportFileName="reorder_status"
          paginationMode="client"
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(value) => { setLimit(value); setPage(1); }}
        />
      </SearchGridPanel>
    </Box>
  );
}

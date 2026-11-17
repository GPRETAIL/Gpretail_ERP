import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from "@mui/material";
import { RefreshCw } from "lucide-react";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { StatusChip } from "@/shared/theme/StatusChip";
import { defaultRange, fastMovingSummary, MOVEMENT_TONES, qty, shortDate } from "./utils/fastMoving";

function Stat({ label, value }) {
  return (
    <Paper variant="outlined" sx={{ px: 2, py: 1.25, minWidth: 140 }}>
      <Typography variant="caption" color="text.secondary">{label}</Typography>
      <Typography sx={{ fontSize: 20, fontWeight: 700 }}>{value}</Typography>
    </Paper>
  );
}

/**
 * Dashboard > Fast Moving Products > View all: every product sold in the period, with how much came in and when,
 * how much was sold and when, what is left, and how quickly it sells (from the stock movement log).
 */
export default function FastMovingProducts() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [range, setRange] = useState(() => ({ ...defaultRange(), ...Object.fromEntries(["from", "to"].filter((k) => params.get(k)).map((k) => [k, params.get(k)])) }));
  const [state, setState] = useState({ rows: [], days: 0, loading: true, error: "" });
  const grid = useSearchGrid({ sourceRows: state.rows, paginationMode: "client", scopeKey: `${range.from}:${range.to}` });
  const { page, limit, setPage, setLimit } = grid;

  const load = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: "" }));
    try {
      const res = await api.get("/dashboard/fast-moving", { params: { from: range.from, to: range.to, limit: 500 } });
      const data = res.data?.data || {};
      setState({ rows: (data.rows || []).map((row) => ({ ...row, id: row.product_id })), days: data.days || 0, loading: false, error: "" });
    } catch (err) {
      setState({ rows: [], days: 0, loading: false, error: err?.response?.data?.message || "Could not load fast moving products." });
    }
  }, [range.from, range.to]);
  useEffect(() => {
    // Deferred a tick: a synchronous setState in an effect body cascades a render (set-state-in-effect).
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const summary = fastMovingSummary(state.rows);
  const columns = useMemo(() => [
    { key: "name", label: "Product", valueGetter: (row) => row.name, render: (value, row) => (
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 600 }}>{value}</Typography>
        <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{[row.code, row.brand, row.category].filter(Boolean).join(" · ")}</Typography>
      </Box>
    ) },
    { key: "last_received", label: "Last purchased", valueGetter: (row) => row.last_received || "", render: (value) => shortDate(value) },
    { key: "bought", label: "Purchased", valueGetter: (row) => row.bought, render: (value) => qty(value) },
    { key: "net_sold", label: "Sold", valueGetter: (row) => row.net_sold, render: (value, row) => (
      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 700 }}>{qty(value)}</Typography>
        {row.returned > 0 ? <Typography sx={{ fontSize: 11, color: "text.secondary" }}>{qty(row.sold)} sold, {qty(row.returned)} returned</Typography> : null}
      </Box>
    ) },
    { key: "first_sold", label: "First sold", valueGetter: (row) => row.first_sold || "", render: (value) => shortDate(value) },
    { key: "last_sold", label: "Last sold", valueGetter: (row) => row.last_sold || "", render: (value) => shortDate(value) },
    { key: "balance", label: "Balance", valueGetter: (row) => row.balance, render: (value) => qty(value) },
    { key: "per_day", label: "Sold / day", valueGetter: (row) => row.per_day, render: (value) => qty(value) },
    { key: "avg_days_to_sell", label: "Days to sell", valueGetter: (row) => row.avg_days_to_sell ?? "", render: (value) => (value === "" ? "-" : `${qty(value)} d`) },
    { key: "sell_through", label: "Sell-through", valueGetter: (row) => row.sell_through, render: (value) => `${qty(value)}%` },
    { key: "days_of_stock", label: "Stock lasts", valueGetter: (row) => row.days_of_stock, render: (value) => (value > 0 ? `${qty(value)} d` : "Sold out") },
    { key: "movement", label: "Movement", valueGetter: (row) => row.movement, render: (value) => <StatusChip label={value} tone={MOVEMENT_TONES[value] || "slate"} /> },
  ], []);

  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <PageHeader onBack={() => navigate("/dashboard")}
        title={<Breadcrumbs items={[{ label: "Dashboard", onClick: () => navigate("/dashboard") }, { label: "Fast Moving Products" }]} />}
        actions={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
            {["from", "to"].map((key) => (
              <TextField key={key} size="small" type="date" label={key === "from" ? "From" : "To"} value={range[key]}
                onChange={(e) => e.target.value && setRange((current) => ({ ...current, [key]: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
            ))}
            <Button size="small" startIcon={<RefreshCw size={14} />} onClick={() => void load()}>Refresh</Button>
          </Stack>
        } />
      {state.error ? <Alert severity="warning">{state.error}</Alert> : null}
      <Stack direction="row" spacing={1.5} sx={{ flexWrap: "wrap", rowGap: 1.5 }}>
        <Stat label="Products sold" value={summary.products} />
        <Stat label="Units sold" value={qty(summary.sold)} />
        <Stat label="Fast moving" value={summary.fast} />
        <Stat label="Slow moving" value={summary.slow} />
      </Stack>
      <Typography variant="caption" color="text.secondary">
        Sold = POS and dealer sales less returns in the {state.days || "selected"} days. Purchased = stock received in the period (purchases, inventory entries, transfers).
        Days to sell = average days from a unit arriving to its sale. Stock lasts = balance at the current pace. Fast: a unit a day or under a month of stock; slow: over three months.
      </Typography>
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={state.loading}
          loadingText="Working out what sells fastest..."
          emptyText="No product sales in this period."
          searchPlaceholder="Search products..."
          tablePreferenceKey="dashboard.fast-moving"
          exportFileName="fast_moving_products"
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

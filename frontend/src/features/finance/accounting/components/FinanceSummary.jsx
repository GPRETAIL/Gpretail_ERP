import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { Typography } from "@mui/material";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import SummaryLayoutsDrawer, { SummaryLayoutsButtons } from "@/shared/components/SummaryLayoutsDrawer";
import useResetOnChange from "@/shared/hooks/useResetOnChange";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { fetchSummary, fetchSummaryLayouts } from "@/shared/utils/reportSummary";

/**
 * Summary layouts on a Finance report: the breakdowns of `dataset` (worked out on the server for the selected
 * store), for the period already chosen on the page (`params`). Changing the period goes back to the standard view.
 * Returns the header buttons, the panel, and the summary table while one is applied.
 */
const NO_ROWS = [];

export function useFinanceSummary(dataset, params, title) {
  const [layouts, setLayouts] = useState({});
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState("");
  const [applied, setApplied] = useState(null);
  const [loading, setLoading] = useState(false);
  const paramsKey = JSON.stringify(params);

  useEffect(() => {
    let active = true;
    fetchSummaryLayouts("/accounting/summary-layouts").then((data) => { if (active) setLayouts(data); }).catch(() => {});
    return () => { active = false; };
  }, []);
  useResetOnChange([paramsKey], () => setApplied(null));
  const grid = useSearchGrid({ sourceRows: applied?.rows || NO_ROWS, paginationMode: "client", scopeKey: applied?.label || "" });
  const { page, limit, setPage, setLimit } = grid;

  const options = layouts[dataset]?.layouts || [];
  const apply = async () => {
    setLoading(true);
    try {
      const summary = await fetchSummary("/accounting/summary", dataset, { layout: mode, ...params });
      setApplied(summary);
      setOpen(false);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to load summary.");
    } finally {
      setLoading(false);
    }
  };

  return {
    applied,
    buttons: options.length ? (
      <SummaryLayoutsButtons
        onOpen={() => { setMode((current) => (options.some((opt) => opt.value === current) ? current : options[0].value)); setOpen(true); }}
        applied={Boolean(applied)}
        onReset={() => setApplied(null)}
      />
    ) : null,
    drawer: options.length ? (
      <SummaryLayoutsDrawer open={open} onClose={() => setOpen(false)} options={options} mode={mode} onModeChange={setMode} dated={false}
        description="Pick one breakdown. It uses the period chosen at the top of the page." loading={loading} onApply={apply} name={`${dataset}_summary_mode`} />
    ) : null,
    table: applied ? (
      <>
        <Typography variant="body2" color="text.secondary">Showing <b>{applied.label}</b>{applied.capped ? " (largest shown)" : ""}.</Typography>
        <SearchGridPanel>
        <FilterableDataTable
          key={applied.label}
          rows={grid.rows}
          columns={applied.columns}
          paginationMode="client"
          page={page}
          limit={limit}
          onPageChange={setPage}
          onLimitChange={(value) => { setLimit(value); setPage(1); }}
          enableColumnResize
          fillHeight
          searchPlaceholder={`Search ${applied.label.toLowerCase()}...`}
          exportFileName={`${title.toLowerCase().replace(/\W+/g, "_")}_${applied.label.replace(/\W+/g, "_")}`}
          exportSheetName={title}
          exportSubtitle={`${title} — ${applied.label}`}
          tablePreferenceKey={`finance.${dataset}.summary.${applied.label.replace(/\s+/g, "_")}`}
        />
        </SearchGridPanel>
      </>
    ) : null,
  };
}

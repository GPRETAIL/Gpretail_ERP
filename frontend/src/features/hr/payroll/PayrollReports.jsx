import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import { Box, MenuItem, Stack, TextField, Typography } from "@mui/material";
import api from "@/shared/api/apiClient";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { errorMessage } from "../utils/hrStatus";
import { monthLabel, rupees } from "./payslipPrint";

const money = (key, label) => ({ key, label, valueGetter: (row) => Number(row[key] || 0), render: (value) => rupees(value) });
const text = (key, label) => ({ key, label, valueGetter: (row) => row[key] ?? "" });
const REPORTS = {
  register: { label: "Salary register", columns: null },
  bank: { label: "Bank sheet", columns: [text("code", "Code"), text("name", "Employee"), text("account_name", "Account name"), text("account_no", "Account no"), text("ifsc", "IFSC"), money("net_pay", "Amount")] },
  pf: { label: "PF statement", columns: [text("code", "Code"), text("name", "Employee"), text("uan", "UAN"), text("pf_no", "PF no"), money("basic", "PF wages (Basic)"), money("employee_pf", "Employee PF"), money("employer_pf", "Employer PF"), text("lop_days", "LOP days")] },
  esi: { label: "ESI statement", columns: [text("code", "Code"), text("name", "Employee"), text("esi_no", "ESI no"), text("payable_days", "Days"), money("gross_earned", "ESI wages"), money("employee_esi", "Employee ESI"), money("employer_esi", "Employer ESI")] },
  pt: { label: "Professional tax", columns: [text("code", "Code"), text("name", "Employee"), money("gross_earned", "Gross earned"), money("pt", "Professional tax")] },
  tds: { label: "Income tax (TDS)", columns: [text("code", "Code"), text("name", "Employee"), text("pan", "PAN"), text("regime", "Regime"), money("taxable_year", "Taxable (year)"), money("tax_year", "Tax (year)"), money("deducted_before", "Deducted before"), money("tds", "TDS this month")] },
};

/** Salary Management > Reports: register, bank sheet and PF/ESI/PT statements of a submitted month. */
export default function PayrollReports() {
  const [runs, setRuns] = useState([]);
  const [runId, setRunId] = useState("");
  const [report, setReport] = useState("register");
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    api.get("/payroll-runs").then((res) => {
      if (!active) return;
      const list = res.data?.data || [];
      setRuns(list);
      setRunId(list[0] ? String(list[0].id) : "");
    }).catch((err) => toast.error(errorMessage(err, "Could not load payroll months")));
    return () => { active = false; };
  }, []);
  const load = useCallback(async () => {
    if (!runId) return;
    setLoading(true);
    try {
      setRows((await api.get(`/payroll-runs/${runId}/report/${report}`)).data?.data?.rows || []);
    } catch (err) {
      toast.error(errorMessage(err, "Could not load the report"));
    } finally {
      setLoading(false);
    }
  }, [runId, report]);
  useEffect(() => {
    const timer = setTimeout(load, 0);
    return () => clearTimeout(timer);
  }, [load]);

  const columns = useMemo(() => {
    if (REPORTS[report].columns) return REPORTS[report].columns;
    // The register: one column per pay head that appears in the month.
    const heads = (prefix) => [...new Set(rows.flatMap((row) => Object.keys(row).filter((k) => k.startsWith(prefix))))];
    return [text("code", "Code"), text("name", "Employee"), text("designation", "Designation"), text("payable_days", "Paid days"), text("lop_days", "LOP"),
      money("gross_fixed", "Salary"), ...heads("e_").map((k) => money(k, k.slice(2))), money("gross_earned", "Earned"),
      ...heads("d_").map((k) => money(k, k.slice(2))), money("total_deductions", "Deductions"), money("net_pay", "Net pay"),
      money("employer_pf", "Employer PF"), money("employer_esi", "Employer ESI")];
  }, [report, rows]);
  const grid = useSearchGrid({ sourceRows: rows, paginationMode: "client", scopeKey: `${runId}:${report}` });
  const run = runs.find((r) => String(r.id) === runId);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, minHeight: 0 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
        <TextField select size="small" label="Month" value={runId} onChange={(e) => setRunId(e.target.value)} sx={{ minWidth: 200 }}>
          {runs.map((r) => <MenuItem key={r.id} value={String(r.id)}>{monthLabel(r.month)} ({r.status.toLowerCase()})</MenuItem>)}
        </TextField>
        <TextField select size="small" label="Report" value={report} onChange={(e) => setReport(e.target.value)} sx={{ minWidth: 200 }}>
          {Object.entries(REPORTS).map(([key, r]) => <MenuItem key={key} value={key}>{r.label}</MenuItem>)}
        </TextField>
        {run?.status === "DRAFT" && <Typography variant="caption" color="warning.main">Draft: figures can still change.</Typography>}
      </Stack>
      <SearchGridPanel>
        <FilterableDataTable
          key={`${report}:${columns.length}`}
          rows={grid.rows}
          columns={columns}
          loading={loading}
          emptyText={runs.length ? "Nothing to show for this month." : "No payroll yet."}
          searchPlaceholder="Search..."
          tablePreferenceKey={`hr.payroll.report.${report}`}
          exportFileName={`${report}_${run?.month || ""}`}
          exportSheetName={REPORTS[report].label}
          exportSubtitle={`${REPORTS[report].label} — ${monthLabel(run?.month)}`}
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          enableColumnResize
        />
      </SearchGridPanel>
    </Box>
  );
}

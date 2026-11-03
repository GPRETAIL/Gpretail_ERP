import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Alert, Box, Button, Chip } from "@mui/material";
import api from "@/shared/api/apiClient";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FilterableDataTable from "@/shared/components/FilterableDataTable";
import SearchGridPanel from "@/shared/components/SearchGridPanel";
import useSearchGrid from "@/shared/hooks/useSearchGrid";
import { errorMessage } from "../utils/hrStatus";
import PayslipDialog from "./PayslipDialog";
import { monthLabel, rupees } from "./payslipPrint";

/** HRMS > My payslips: the signed-in employee's payslips once their month's payroll is submitted. */
export default function MyPayslips() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [slipId, setSlipId] = useState(null);

  useEffect(() => {
    let active = true;
    api.get("/my-payslips").then((res) => { if (active) setData(res.data?.data || { employee: null, payslips: [] }); })
      .catch((err) => { toast.error(errorMessage(err, "Could not load your payslips")); if (active) setData({ employee: null, payslips: [] }); });
    return () => { active = false; };
  }, []);

  const grid = useSearchGrid({ sourceRows: data?.payslips || [], paginationMode: "client", scopeKey: "mine" });
  const columns = useMemo(() => [
    { key: "month", label: "Month", valueGetter: (row) => monthLabel(row.month) },
    { key: "gross_earned", label: "Gross", valueGetter: (row) => Number(row.gross_earned), render: (value) => rupees(value) },
    { key: "net_pay", label: "Net pay", valueGetter: (row) => Number(row.net_pay), render: (value) => <b>{rupees(value)}</b> },
    { key: "status", label: "Status", valueGetter: (row) => (row.held ? "On hold" : row.status === "PAID" ? "Paid" : "Payable"),
      render: (value) => <Chip size="small" color={value === "Paid" ? "success" : value === "On hold" ? "warning" : "primary"} label={value} /> },
  ], []);

  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <PageHeader onBack={() => navigate(-1)} title={<Breadcrumbs items={[{ label: "HRMS" }, { label: "My payslips" }]} />} />
      {data && !data.employee && <Alert severity="info">Your login is not linked to an employee yet. Ask HR to tick "Allow System" with your username on your employee record.</Alert>}
      <SearchGridPanel>
        <FilterableDataTable
          rows={grid.rows}
          columns={columns}
          loading={!data}
          emptyText="No payslips yet."
          searchPlaceholder="Search payslips..."
          tablePreferenceKey="hr.payslips.mine"
          exportFileName="my_payslips"
          paginationMode="client"
          page={grid.page}
          limit={grid.limit}
          onPageChange={grid.setPage}
          onLimitChange={(value) => { grid.setLimit(value); grid.setPage(1); }}
          actionsLabel="Payslip"
          renderActions={(row) => <Button size="small" onClick={() => setSlipId(row.id)}>View</Button>}
        />
      </SearchGridPanel>
      {slipId && <PayslipDialog id={slipId} mine onClose={() => setSlipId(null)} />}
    </Box>
  );
}

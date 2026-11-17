import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { Box, Stack, TextField } from "@mui/material";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";
import FinanceDashboardTabPane from "@/features/dashboard/components/FinanceDashboardTabPane";
import { DashboardLayoutProvider } from "@/features/dashboard/context/DashboardLayoutContext";
import { isoDate } from "@/features/finance/accounting/utils/financeUtils";

/**
 * Finance > Dashboard: the Finance tab of the main Dashboard as a page of its own in the Finance menu (like
 * Warehouse > Dashboard and HR > Dashboard): payables, receivables, purchases, payments and dealer dues.
 */
export default function FinanceDashboard() {
  const navigate = useNavigate();
  const user = useSelector((state) => state.auth.user);
  const [range, setRange] = useState(() => {
    const now = new Date();
    return { from: isoDate(new Date(now.getFullYear(), now.getMonth(), 1)), to: isoDate(now) };
  });
  const storeId = sessionStorage.getItem("activeStoreId") || String(user?.store_id || "");

  return (
    <Box component="section" sx={{ height: "100%", overflowY: "auto", p: { xs: 1.5, sm: 2 }, display: "flex", flexDirection: "column", gap: 1.5 }}>
      <PageHeader onBack={() => navigate("/finance")}
        title={<Breadcrumbs items={[{ label: "Finance", onClick: () => navigate("/finance") }, { label: "Dashboard" }]} />}
        actions={
          <Stack direction="row" spacing={1}>
            {["from", "to"].map((key) => (
              <TextField key={key} size="small" type="date" label={key === "from" ? "From" : "To"} value={range[key]}
                onChange={(e) => e.target.value && setRange((current) => ({ ...current, [key]: e.target.value }))}
                slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
            ))}
          </Stack>
        } />
      <DashboardLayoutProvider>
        <FinanceDashboardTabPane active fromDate={range.from} toDate={range.to} companyId={storeId} />
      </DashboardLayoutProvider>
    </Box>
  );
}

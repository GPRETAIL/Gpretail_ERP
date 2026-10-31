import { useNavigate } from "react-router-dom";
import { Alert, Box, Button, Stack, TextField } from "@mui/material";
import { Printer, RefreshCw } from "lucide-react";
import PageHeader from "../../../components/PageHeader";
import Breadcrumbs from "../../../components/Breadcrumbs";

/** Finance page frame: breadcrumbs, filters, Refresh and Print. */
export function FinancePage({ title, filters, actions, onRefresh, error, children }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <PageHeader
        onBack={() => navigate("/finance")}
        title={<Breadcrumbs items={[{ label: "Finance", onClick: () => navigate("/finance") }, { label: title }]} />}
        actions={
          <Stack direction="row" spacing={1} sx={{ alignItems: "center", flexWrap: "wrap", rowGap: 1 }}>
            {filters}
            {actions}
            {onRefresh ? <Button size="small" startIcon={<RefreshCw size={14} />} onClick={onRefresh}>Refresh</Button> : null}
            <Button size="small" startIcon={<Printer size={14} />} onClick={() => window.print()} sx={{ display: { xs: "none", sm: "inline-flex" } }}>Print</Button>
          </Stack>
        }
      />
      {error ? <Alert severity="warning">{error}</Alert> : null}
      {children}
    </Box>
  );
}

export function DateFilters({ from, to, onChange, single = false }) {
  const field = (label, name, value) => (
    <TextField size="small" type="date" label={label} value={value || ""} onChange={event => onChange({ [name]: event.target.value })}
      slotProps={{ inputLabel: { shrink: true } }} sx={{ width: 150 }} />
  );
  return single ? field("As on", "to", to) : <>{field("From", "from", from)}{field("To", "to", to)}</>;
}

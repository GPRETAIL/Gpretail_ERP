import { useNavigate } from "react-router-dom";
import { Box } from "@mui/material";
import PageHeader from "@/shared/components/PageHeader";
import Breadcrumbs from "@/shared/components/Breadcrumbs";

/** The frame every HRMS page shares: HRMS / <title> breadcrumb, header actions, and the page body filling the height. */
export default function HrPage({ title, actions = null, children }) {
  const navigate = useNavigate();
  return (
    <Box sx={{ p: 1, display: "flex", flexDirection: "column", gap: 1.5, height: "100%", minHeight: 0 }}>
      <PageHeader onBack={() => navigate("/hrms")} title={<Breadcrumbs items={[{ label: "HRMS", onClick: () => navigate("/hrms") }, { label: title }]} />} actions={actions} />
      <Box sx={{ display: "flex", flexDirection: "column", flex: 1, minHeight: 0 }}>{children}</Box>
    </Box>
  );
}

import { Card } from "@mui/material";
import { erpControlSx } from "../theme/erpUi";

// Product's search panel is the shared layout for Master lists.
export default function MasterSearchPanel({ children }) {
  return (
    <Card className="erp-master-search-panel" variant="outlined" sx={{
      height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0,
      p: 1, pb: 0.5, ...erpControlSx,
      "& > h2": { fontWeight: 700, mb: 1, fontSize: "1rem" },
    }}>
      {children}
    </Card>
  );
}

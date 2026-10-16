import { Card } from "@mui/material";
import { erpControlSx } from "../theme/erpUi";

// Standard listing surface; editable transaction lines keep their own layout.
export default function SearchGridPanel({ children, sx, ...props }) {
  return (
    <Card {...props} className={`erp-search-grid-panel erp-master-search-panel ${props.className || ""}`} variant="outlined" sx={{
      height: "100%", width: "100%", display: "flex", flexDirection: "column", minHeight: 0, minWidth: 0,
      p: 1, pb: 0.5, ...erpControlSx,
      "& > h2": { fontWeight: 700, mb: 1, fontSize: "1rem" }, ...sx,
    }}>{children}</Card>
  );
}

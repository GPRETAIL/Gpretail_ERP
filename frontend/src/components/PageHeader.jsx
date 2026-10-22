import { ArrowLeft } from "lucide-react";
import { IconButton, Stack, Typography } from "@mui/material";
import { erpActionSx } from "../theme/erpUi";

// Shared page-header shell: back button + title on the left, arbitrary actions on the right.
// Matches the header-bar convention hand-copied across most list/detail pages (e.g.
// CrmCustomer.jsx, InvoiceSearchPage.jsx) -- one place to fix instead of ~90 near-identical Stacks.
// `title` can be a plain string or a composed node (e.g. a breadcrumb) -- this component only owns
// the shell, not breadcrumb structure, so callers keep full control of what the title contains.
const PageHeader = ({ title, onBack, actions }) => (
  <Stack
    direction="row"
    sx={{
      ...erpActionSx,
      alignItems: "center",
      justifyContent: "space-between",
      flexWrap: "wrap",
      gap: 1,
      minWidth: 0,
      px: 2,
      py: 0.75,
      borderBottom: 1,
      borderColor: "divider",
      boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", // matches Tailwind's shadow-sm exactly
      flexShrink: 0,
    }}
  >
    <Stack direction="row" spacing={1} sx={{ alignItems: "center", minWidth: 0 }}>
      {onBack && (
        <IconButton size="small" onClick={onBack} aria-label="Back" sx={{ color: "text.secondary" }}>
          <ArrowLeft size={16} />
        </IconButton>
      )}
      <Typography component="h1" sx={{ fontSize: 13, fontWeight: 600, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 0.5 }}>
        {title}
      </Typography>
    </Stack>
    {actions && (
      <Stack direction="row" useFlexGap spacing={1.5} sx={{
        alignItems: "center", flexWrap: "wrap", minWidth: 0, maxWidth: "100%",
        fontSize: 12, fontWeight: 500, color: "text.secondary",
        "& > .MuiStack-root": { flexWrap: "wrap", rowGap: 1, maxWidth: "100%" },
      }}>
        {actions}
      </Stack>
    )}
  </Stack>
);

export default PageHeader;

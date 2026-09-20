import { ArrowLeft } from "lucide-react";
import { IconButton, Stack, Typography } from "@mui/material";

// Shared page-header shell: back button + title on the left, arbitrary actions on the right.
// Matches the header-bar convention hand-copied across most list/detail pages (e.g.
// CrmCustomer.jsx, InvoiceSearchPage.jsx) -- one place to fix instead of ~90 near-identical Stacks.
// `title` can be a plain string or a composed node (e.g. a breadcrumb) -- this component only owns
// the shell, not breadcrumb structure, so callers keep full control of what the title contains.
const PageHeader = ({ title, onBack, actions }) => (
  <Stack
    direction="row"
    sx={{
      alignItems: "center",
      justifyContent: "space-between",
      px: 2,
      py: 1,
      borderBottom: 1,
      borderColor: "divider",
      boxShadow: "0 1px 2px 0 rgba(0,0,0,0.05)", // matches Tailwind's shadow-sm exactly
      flexShrink: 0,
    }}
  >
    <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
      {onBack && (
        <IconButton size="small" onClick={onBack} aria-label="Back" sx={{ color: "text.secondary" }}>
          <ArrowLeft size={16} />
        </IconButton>
      )}
      <Typography component="h1" sx={{ fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 0.5 }}>
        {title}
      </Typography>
    </Stack>
    {actions && (
      <Stack direction="row" spacing={1.5} sx={{ alignItems: "center", fontSize: 12, fontWeight: 500, color: "text.secondary" }}>
        {actions}
      </Stack>
    )}
  </Stack>
);

export default PageHeader;

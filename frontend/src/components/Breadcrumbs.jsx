import { Box, Stack } from "@mui/material";

// Shared breadcrumb trail: every page was hand-rolling this "A / B / C" pattern with its own
// per-crumb hover treatment, and most of them never got the blue-on-hover + underline styling
// Master module pages use -- one place to fix instead of ~40 near-identical Stacks.
//
// items: Array<{ label: string, onClick?: () => void }>. A crumb with onClick renders as a
// clickable link with the shared hover state; a crumb without one (typically the last, current
// page) renders as plain secondary text. Doesn't set its own fontSize/fontWeight so it inherits
// cleanly when nested inside PageHeader's title (already sized there) -- pass `sx` to size it
// directly on pages that build their own header bar instead of using PageHeader.
const Breadcrumbs = ({ items = [], sx }) => (
  <Stack direction="row" spacing={0.5} sx={{ alignItems: "center", ...sx }}>
    {items.map((item, index) => (
      <Stack key={index} direction="row" spacing={0.5} sx={{ alignItems: "center" }}>
        {index > 0 && <Box component="span" sx={{ color: "text.secondary" }}>/</Box>}
        {item.onClick ? (
          <Box
            component="button"
            type="button"
            onClick={item.onClick}
            sx={{
              color: "primary.main", font: "inherit",
              "&:hover": { color: "primary.dark", textDecoration: "underline" },
            }}
          >
            {item.label}
          </Box>
        ) : (
          <Box component="span" sx={{ color: "text.secondary" }}>{item.label}</Box>
        )}
      </Stack>
    ))}
  </Stack>
);

export default Breadcrumbs;

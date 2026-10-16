import { Button, IconButton, MenuItem, Select, Stack, Typography } from "@mui/material";
import { Loader2 } from "lucide-react";
import { ERP_UI } from "../theme/erpUi";

// Product's pagination layout, shared by every ERP FilterableDataTable.
export default function TablePaginationFooter({
  limit, page, totalPages, totalLabel, pageOptions,
  canJump = true, cursor = false, append = false, hasPrev, hasNext,
  busy, loading, onPrevious, onNext, onPageChange, onLimitChange,
}) {
  const textSx = { fontSize: 8, color: "text.secondary" };
  const controlSx = { height: 26, fontSize: 7, borderRadius: ERP_UI.controlRadius };
  const buttonSx = { height: 26, minWidth: 32, fontSize: 9, border: "1px solid", borderColor: "divider", borderRadius: "1.75px" };
  const menuProps = {
    anchorOrigin: { vertical: "top", horizontal: "left" },
    transformOrigin: { vertical: "bottom", horizontal: "left" },
    slotProps: { paper: { sx: { maxHeight: 220, "& .MuiMenuItem-root": { minHeight: "auto", fontSize: 10, py: 0.5, px: 1.5 } } } },
  };
  return (
    <Stack component="nav" aria-label="Table pagination" className="erp-table-pagination" direction="row" spacing={1}
      sx={{ width: "100%", flexShrink: 0, alignItems: "center", justifyContent: "space-between", borderTop: 1, borderColor: "divider", py: 0.75, flexWrap: "wrap", rowGap: 0.5 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center", ...textSx }}>
        <Typography component="span" sx={textSx}>Rows showing</Typography>
        <Select value={limit} onChange={(e) => onLimitChange(Number(e.target.value))}
          inputProps={{ "aria-label": "Rows per page" }} className="compact-pagination-select" sx={controlSx} MenuProps={menuProps}>
          {[20, 50, 60, 100, 150].map((size) => <MenuItem key={size} value={size}>{size}</MenuItem>)}
        </Select>
        <Typography component="span" sx={textSx}>{totalLabel}</Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
        {append ? (
          <Button variant="outlined" color="inherit" onClick={onNext} disabled={!hasNext || loading}
            startIcon={loading ? <Loader2 size={14} style={{ animation: "app-spin 1s linear infinite" }} /> : null}
            sx={{ fontSize: 9, px: 2, py: 0.5 }}>
            {hasNext ? "Load More" : "No more results"}
          </Button>
        ) : (<>
          <IconButton size="small" onClick={onPrevious} disabled={!hasPrev || busy} title="Previous"
            className="compact-pagination-button" sx={buttonSx}>{"<"}</IconButton>
          {cursor ? (
            <Typography component="span" sx={{ px: 0.75, fontSize: 9, color: "text.secondary", fontWeight: 500, userSelect: "none" }}>Continuous</Typography>
          ) : !canJump ? (
            <Typography component="span" sx={textSx}>Page {page} of {totalPages}</Typography>
          ) : (
            <Select value={page} onChange={(e) => onPageChange(Number(e.target.value))}
              inputProps={{ "aria-label": "Page" }} className="compact-pagination-select" sx={controlSx} MenuProps={menuProps}>
              {pageOptions.map((p) => <MenuItem key={p} value={p}>Page {p}</MenuItem>)}
            </Select>
          )}
          <IconButton size="small" onClick={onNext} disabled={!hasNext || busy} title="Next"
            className="compact-pagination-button" sx={buttonSx}>{">"}</IconButton>
        </>)}
      </Stack>
    </Stack>
  );
}

import { Pin, PinOff, X } from "lucide-react";
import { Box, Button, IconButton, MenuItem, Select, Stack, TextField, Tooltip, Typography } from "@mui/material";
import { alpha } from "@mui/material/styles";
import { TYPE } from "@/shared/theme/typeScale";
import { FILTER_DEFAULT, FILTER_OPERATORS, INPUT_FREE_OPERATORS, isFilterStateActive } from "./filterableDataTableUtils";

/**
 * FilterableDataTable's Filter Panel: one card per column (operator + value) on a draft of the filters,
 * applied together with Apply. The table shows it in a right-hand Drawer, or docked beside the table when
 * pinned, and owns the draft; this only draws it. `fieldRefs` lets the table scroll a column's card into view.
 */
export default function TableFilterPanel({
  columns, draftFilters, focusKey, fieldRefs, pinned,
  onTogglePinned, onClose, onSetDraftFilter, onClearDraftFilter, onClearAll, onApply,
}) {
  return (
    <Box data-testid="filter-panel-root" sx={{ display: "flex", height: "100%", flexDirection: "column" }}>
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2, py: 1.5 }}>
        <Box>
          <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Filter Panel</Typography>
          <Typography sx={{ fontSize: TYPE.small, color: "text.secondary" }}>Apply filters on multiple columns</Typography>
        </Box>
        <Stack direction="row" spacing={0.5}>
          <Tooltip title={pinned ? "Unpin panel" : "Pin panel beside the table"}>
            <IconButton
              size="small"
              aria-label={pinned ? "Unpin panel" : "Pin panel"}
              aria-pressed={pinned}
              onClick={onTogglePinned}
              sx={pinned ? { color: "primary.main", bgcolor: (theme) => alpha(theme.palette.primary.main, 0.12) } : undefined}
            >
              {pinned ? <PinOff size={16} /> : <Pin size={16} />}
            </IconButton>
          </Tooltip>
          <IconButton size="small" aria-label="Close filter panel" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </Stack>
      </Stack>

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", borderBottom: 1, borderColor: "divider", px: 2, py: 1 }}>
        <Button size="small" onClick={onClearAll}>
          Clear All
        </Button>
        <Typography component="span" sx={{ fontSize: TYPE.small, color: "text.disabled" }}>|</Typography>
        <Typography component="span" sx={{ fontSize: TYPE.small, color: "text.secondary" }}>
          Active: {Object.values(draftFilters).filter((filter) => isFilterStateActive(filter)).length}
        </Typography>
      </Stack>

      <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1.5 }}>
        <Stack spacing={1.5}>
          {columns.map((column) => {
            const draftFilter = draftFilters[column.key] || FILTER_DEFAULT;
            const isActive = isFilterStateActive(draftFilter);
            const focused = focusKey === column.key;

            return (
              <Box
                key={column.key}
                data-testid={`filter-card-${column.key}`}
                ref={(node) => {
                  fieldRefs.current[column.key] = node;
                }}
                sx={{
                  borderRadius: "5.25px", border: "1px solid", px: 1.5, py: 1.5,
                  borderColor: focused ? "primary.main" : isActive ? "warning.main" : "divider",
                  bgcolor: focused
                    ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.06)
                    : isActive
                      ? (theme) => alpha(theme.palette.warning.main, theme.palette.mode === "dark" ? 0.16 : 0.06)
                      : "background.paper",
                }}
              >
                <Stack direction="row" spacing={1} sx={{ mb: 1, alignItems: "center", justifyContent: "space-between" }}>
                  <Typography sx={{ fontSize: 12, fontWeight: 500 }}>{column.label}</Typography>
                  {isActive && (
                    <Button size="small" color="inherit" onClick={() => onClearDraftFilter(column.key)} sx={{ fontSize: TYPE.small, minWidth: 0, p: 0 }}>
                      Clear
                    </Button>
                  )}
                </Stack>
                <Stack spacing={1}>
                  <Select
                    size="small"
                    fullWidth
                    value={draftFilter.operator}
                    onChange={(event) => onSetDraftFilter(column.key, { operator: event.target.value })}
                    sx={{ fontSize: 12 }}
                  >
                    {FILTER_OPERATORS.map((op) => (
                      <MenuItem key={op.value} value={op.value}>
                        {op.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {!INPUT_FREE_OPERATORS.has(draftFilter.operator) && (
                    <TextField
                      size="small"
                      fullWidth
                      value={draftFilter.value}
                      onChange={(event) => onSetDraftFilter(column.key, { value: event.target.value })}
                      placeholder={`Filter ${column.label}`}
                      sx={{ "& .MuiInputBase-input": { fontSize: 12 } }}
                    />
                  )}
                </Stack>
              </Box>
            );
          })}
        </Stack>
      </Box>

      <Stack direction="row" spacing={1} sx={{ alignItems: "center", justifyContent: "flex-end", borderTop: 1, borderColor: "divider", px: 2, py: 1.5 }}>
        <Button size="small" variant="outlined" onClick={onClose}>
          {pinned ? "Close" : "Cancel"}
        </Button>
        <Button size="small" variant="contained" onClick={onApply}>
          Apply
        </Button>
      </Stack>
    </Box>
  );
}

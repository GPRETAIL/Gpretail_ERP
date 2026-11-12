import { useCallback, useMemo, useRef, useState } from "react";
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, ChevronUp, GripVertical, X } from "lucide-react";
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, Stack, Typography } from "@mui/material";

const transferButtonSx = { border: "1px solid", borderColor: "divider", borderRadius: "1.75px" };
const listSx = { flex: 1, border: "1px solid", borderColor: "divider", borderRadius: "1.75px", overflow: "auto", bgcolor: "background.paper", maxHeight: 280 };
const itemSx = (highlighted) => ({
  display: "flex", alignItems: "center", gap: 0.75, px: 1, py: 0.75, fontSize: 12,
  cursor: "grab", userSelect: "none", borderBottom: 1, borderColor: "divider",
  "&:last-of-type": { borderBottom: 0 },
  ...(highlighted
    ? { bgcolor: "primary.main", color: "primary.contrastText" }
    : { color: "text.secondary", "&:hover": { bgcolor: "action.hover" } }),
});
const gripStyle = (highlighted) => ({ flexShrink: 0, color: highlighted ? "inherit" : undefined, opacity: highlighted ? 0.7 : undefined });

/**
 * "Personalize List Columns": a dual list (Available / Selected) to choose and order a table's columns.
 * The draft lives here and starts from `initialSelected` each time the dialog is opened (the parent remounts
 * it with a new `key`); nothing changes on the table until OK. At least one column always stays selected.
 */
export default function ColumnPersonalizerDialog({ open, columns, initialSelected, saving, onClose, onApply, onReset }) {
  const [draftVisibleColumns, setDraftVisibleColumns] = useState(initialSelected);
  const [draftSelectedOrder, setDraftSelectedOrder] = useState(initialSelected);
  const [availableHighlight, setAvailableHighlight] = useState(null);
  const [selectedHighlight, setSelectedHighlight] = useState(null);
  // Drag state lives in refs, and the drag-over indicator is a direct class change, so a drag doesn't
  // re-render the dialog on every dragover frame (same pattern as the table header).
  const dragListItemRef = useRef(null);
  const dragOverListItemRef = useRef(null);

  const moveKeyToSelected = useCallback((key, beforeKey) => {
    setDraftVisibleColumns((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setDraftSelectedOrder((prev) => {
      const withoutKey = prev.filter((k) => k !== key);
      const idx = beforeKey ? withoutKey.indexOf(beforeKey) : -1;
      return idx === -1 ? [...withoutKey, key] : [...withoutKey.slice(0, idx), key, ...withoutKey.slice(idx)];
    });
    setSelectedHighlight(key);
    setAvailableHighlight(null);
  }, []);

  const moveKeyToAvailable = useCallback((key) => {
    setDraftVisibleColumns((prev) => (prev.length <= 1 ? prev : prev.filter((k) => k !== key)));
    setDraftSelectedOrder((prev) => (prev.length <= 1 ? prev : prev.filter((k) => k !== key)));
    setAvailableHighlight(key);
    setSelectedHighlight(null);
  }, []);

  const reorderSelected = useCallback((key, beforeKey) => {
    if (key === beforeKey) return;
    setDraftSelectedOrder((prev) => {
      const withoutKey = prev.filter((k) => k !== key);
      const idx = beforeKey ? withoutKey.indexOf(beforeKey) : -1;
      return idx === -1 ? [...withoutKey, key] : [...withoutKey.slice(0, idx), key, ...withoutKey.slice(idx)];
    });
  }, []);

  const handleMoveToSelected = () => {
    if (!availableHighlight) return;
    moveKeyToSelected(availableHighlight, null);
  };

  const handleMoveAllToSelected = () => {
    const allKeys = columns.map((c) => c.key);
    setDraftVisibleColumns(allKeys);
    setDraftSelectedOrder(allKeys);
    setAvailableHighlight(null);
  };

  const handleMoveToAvailable = () => {
    if (!selectedHighlight) return;
    // Don't allow removing the last column
    if (draftVisibleColumns.length <= 1) return;
    moveKeyToAvailable(selectedHighlight);
  };

  const handleMoveAllToAvailable = () => {
    // Keep at least the first column
    const first = draftSelectedOrder[0];
    setDraftVisibleColumns([first]);
    setDraftSelectedOrder([first]);
    setSelectedHighlight(null);
  };

  const moveSelected = (step) => {
    if (!selectedHighlight) return;
    setDraftSelectedOrder((prev) => {
      const idx = prev.indexOf(selectedHighlight);
      const target = idx + step;
      if (idx === -1 || target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  const onListItemDragStart = useCallback((e, key, from) => {
    dragListItemRef.current = { key, from };
    e.dataTransfer.effectAllowed = "move";
    e.currentTarget.style.opacity = "0.5";
  }, []);

  const onListItemDragEnd = useCallback((e) => {
    e.currentTarget.style.opacity = "";
    dragListItemRef.current = null;
    dragOverListItemRef.current = null;
  }, []);

  const onListItemDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onListItemDragEnter = useCallback((e, key) => {
    dragOverListItemRef.current = key;
    e.currentTarget.classList.add("border-t-2", "border-t-blue-400");
  }, []);

  const onListItemDragLeave = useCallback((e) => {
    e.currentTarget.classList.remove("border-t-2", "border-t-blue-400");
  }, []);

  const onAvailableListDrop = useCallback((e) => {
    e.preventDefault();
    const dragged = dragListItemRef.current;
    if (dragged?.from === "selected") moveKeyToAvailable(dragged.key);
    dragListItemRef.current = null;
    dragOverListItemRef.current = null;
  }, [moveKeyToAvailable]);

  const onSelectedListItemDrop = useCallback((e, targetKey) => {
    e.preventDefault();
    e.stopPropagation();
    e.currentTarget.classList.remove("border-t-2", "border-t-blue-400");
    const dragged = dragListItemRef.current;
    if (dragged) {
      if (dragged.from === "available") moveKeyToSelected(dragged.key, targetKey);
      else reorderSelected(dragged.key, targetKey);
    }
    dragListItemRef.current = null;
    dragOverListItemRef.current = null;
  }, [moveKeyToSelected, reorderSelected]);

  const onSelectedListDrop = useCallback((e) => {
    e.preventDefault();
    const dragged = dragListItemRef.current;
    if (dragged) {
      if (dragged.from === "available") moveKeyToSelected(dragged.key, null);
      else reorderSelected(dragged.key, null);
    }
    dragListItemRef.current = null;
    dragOverListItemRef.current = null;
  }, [moveKeyToSelected, reorderSelected]);

  const draftAvailableColumns = useMemo(
    () => columns.filter((c) => !draftVisibleColumns.includes(c.key)),
    [columns, draftVisibleColumns]
  );
  const draftSelectedColumns = useMemo(
    () => draftSelectedOrder.map((key) => columns.find((c) => c.key === key)).filter(Boolean),
    [columns, draftSelectedOrder]
  );

  const handleApply = () => {
    const valid = draftSelectedOrder.filter((key) => columns.some((column) => column.key === key));
    if (valid.length === 0) return;
    onApply(valid);
  };

  const selectedIndex = selectedHighlight ? draftSelectedOrder.indexOf(selectedHighlight) : -1;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      slotProps={{ paper: { sx: { width: "100%", maxWidth: 768, bgcolor: "background.paper", border: "1px solid", borderColor: "divider" } } }}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: 1, borderColor: "divider", px: 2.5, py: 1.5 }}>
        <Typography sx={{ fontSize: 14, fontWeight: 600 }}>Personalize List Columns</Typography>
        <IconButton size="small" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", alignItems: "stretch", gap: 1.5, px: 2.5, py: 2, minHeight: 320 }}>
        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>Available</Typography>
          <Box sx={listSx} onDragOver={onListItemDragOver} onDrop={onAvailableListDrop}>
            {draftAvailableColumns.length === 0 ? (
              <Typography sx={{ fontSize: 12, color: "text.disabled", p: 1.5, textAlign: "center" }}>All columns selected</Typography>
            ) : (
              draftAvailableColumns.map((col) => (
                <Box
                  key={col.key}
                  draggable
                  onDragStart={(e) => onListItemDragStart(e, col.key, "available")}
                  onDragEnd={onListItemDragEnd}
                  onClick={() => {
                    setAvailableHighlight(col.key);
                    setSelectedHighlight(null);
                  }}
                  onDoubleClick={() => {
                    setDraftVisibleColumns((prev) => [...prev, col.key]);
                    setDraftSelectedOrder((prev) => [...prev, col.key]);
                    setAvailableHighlight(null);
                  }}
                  sx={itemSx(availableHighlight === col.key)}
                >
                  <GripVertical size={12} style={gripStyle(availableHighlight === col.key)} />
                  {col.label}
                </Box>
              ))
            )}
          </Box>
        </Box>

        <Stack sx={{ alignItems: "center", justifyContent: "center" }} spacing={1}>
          <IconButton size="small" title="Move to selected" onClick={handleMoveToSelected} disabled={!availableHighlight} sx={transferButtonSx}>
            <ChevronRight size={16} />
          </IconButton>
          <IconButton size="small" title="Move all to selected" onClick={handleMoveAllToSelected} disabled={draftAvailableColumns.length === 0} sx={transferButtonSx}>
            <ChevronsRight size={16} />
          </IconButton>
          <IconButton size="small" title="Move to available" onClick={handleMoveToAvailable} disabled={!selectedHighlight || draftVisibleColumns.length <= 1} sx={transferButtonSx}>
            <ChevronLeft size={16} />
          </IconButton>
          <IconButton size="small" title="Move all to available" onClick={handleMoveAllToAvailable} disabled={draftVisibleColumns.length <= 1} sx={transferButtonSx}>
            <ChevronsLeft size={16} />
          </IconButton>
        </Stack>

        <Box sx={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <Typography sx={{ fontSize: 12, fontWeight: 600, mb: 0.75 }}>Selected</Typography>
          <Box sx={listSx} onDragOver={onListItemDragOver} onDrop={onSelectedListDrop}>
            {draftSelectedColumns.map((col) => (
              <Box
                key={col.key}
                draggable
                onDragStart={(e) => onListItemDragStart(e, col.key, "selected")}
                onDragEnd={onListItemDragEnd}
                onDragOver={onListItemDragOver}
                onDragEnter={(e) => onListItemDragEnter(e, col.key)}
                onDragLeave={onListItemDragLeave}
                onDrop={(e) => onSelectedListItemDrop(e, col.key)}
                onClick={() => {
                  setSelectedHighlight(col.key);
                  setAvailableHighlight(null);
                }}
                onDoubleClick={() => {
                  if (draftVisibleColumns.length <= 1) return;
                  setDraftVisibleColumns((prev) => prev.filter((k) => k !== col.key));
                  setDraftSelectedOrder((prev) => prev.filter((k) => k !== col.key));
                  setSelectedHighlight(null);
                }}
                sx={itemSx(selectedHighlight === col.key)}
              >
                <GripVertical size={12} style={gripStyle(selectedHighlight === col.key)} />
                {col.label}
              </Box>
            ))}
          </Box>
        </Box>

        <Stack sx={{ alignItems: "center", justifyContent: "center" }} spacing={1}>
          <IconButton size="small" title="Move up" onClick={() => moveSelected(-1)} disabled={!selectedHighlight || selectedIndex <= 0} sx={transferButtonSx}>
            <ChevronUp size={16} />
          </IconButton>
          <IconButton size="small" title="Move down" onClick={() => moveSelected(1)} disabled={!selectedHighlight || selectedIndex >= draftSelectedOrder.length - 1} sx={transferButtonSx}>
            <ChevronDown size={16} />
          </IconButton>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderTop: 1, borderColor: "divider", px: 2.5, py: 1.5 }}>
        <Button size="small" variant="outlined" onClick={onReset} disabled={saving}>
          Reset to column defaults
        </Button>
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button size="small" variant="contained" onClick={handleApply} disabled={saving}>
            {saving ? "Applying..." : "OK"}
          </Button>
        </Stack>
      </DialogActions>
    </Dialog>
  );
}

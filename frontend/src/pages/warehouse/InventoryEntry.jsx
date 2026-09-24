import { useState, useEffect, useCallback, useRef } from "react";
import { Save, Search, Plus, X, ArrowLeft, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import PageSkeleton from "../../components/PageSkeleton";
import Breadcrumbs from "../../components/Breadcrumbs";
import AsyncSearchSelect from "../../components/AsyncSearchSelect";
import { buildSizeSelectOptions } from "../../utils/sizeSelectOptions";
import { Box, Stack, Typography, TextField, MenuItem, IconButton, Button, Checkbox, Table, TableHead, TableBody, TableRow, TableCell, alpha } from "@mui/material";
import { muiFieldSx, SEARCHABLE_TRIGGER_SX } from "../../theme/formControlSizes";

// ─── Reusable sub-components (defined OUTSIDE to prevent focus loss) ────────

const AttrSelect = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  stacked = false,
  searchable = false,
  searchPlaceholder = "Search...",
}) => {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  const filteredOptions = searchable && normalizedSearch
    ? options.filter((opt) =>
        `${opt?.name || ""} ${opt?.code || ""}`.toLowerCase().includes(normalizedSearch)
      )
    : options;
  const visibleOptions = searchable ? filteredOptions : options;

  // All selectable items: "Select..." placeholder (index 0) + visibleOptions
  const totalItems = visibleOptions.length + 1;

  const getOptionLabel = (opt) => {
    const optName = String(opt?.name || "");
    const optCode = String(opt?.code || "");
    if (optName && optCode && optName !== optCode) return `${optName} (${optCode})`;
    return optName || optCode;
  };

  const selectedLabel = (() => {
    const selected = options.find((opt) => String(opt.id) === String(value));
    return selected ? getOptionLabel(selected) : "";
  })();

  useEffect(() => {
    if (!searchable || !open) return undefined;
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [searchable, open]);

  // Reset highlight when search changes
  useEffect(() => {
    setHighlightedIndex(-1);
  }, [searchTerm]);

  // Scroll highlighted item into view
  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("li");
    if (items[highlightedIndex]) {
      items[highlightedIndex].scrollIntoView({ block: "nearest" });
    }
  }, [highlightedIndex]);

  const focusNextField = () => {
    // Find the trigger button and move focus to the next focusable element after it
    const trigger = triggerRef.current;
    if (!trigger) return;
    const scope = trigger.closest("[data-enter-scope='true']");
    if (!scope) return;
    const focusables = Array.from(
      scope.querySelectorAll(
        "input:not([type='hidden']):not([disabled]):not([readonly]):not([tabindex='-1']),select:not([disabled]):not([tabindex='-1']),textarea:not([disabled]):not([readonly]):not([tabindex='-1']),button:not([disabled]):not([tabindex='-1']),[tabindex]:not([tabindex='-1'])"
      )
    ).filter((el) => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const idx = focusables.indexOf(trigger);
    if (idx >= 0 && idx < focusables.length - 1) {
      const next = focusables[idx + 1];
      next.focus();
      // Auto-open if the next field is a native select
      if (next instanceof HTMLSelectElement) {
        try { if (typeof next.showPicker === "function") next.showPicker(); } catch { /* ignore */ }
      }
      // Auto-open if the next field is a searchable select trigger
      if (next instanceof HTMLElement && next.dataset.searchableSelectTrigger === "true") {
        next.click();
      }
      if (next instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit"].includes(next.type)) {
        next.select();
      }
    }
  };

  const selectValue = (nextValue) => {
    onChange({ target: { name, value: String(nextValue) } });
    setOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
    // Auto-focus next field after selection
    setTimeout(() => focusNextField(), 50);
  };

  const closeAndFocusNextField = () => {
    setOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
    setTimeout(() => focusNextField(), 50);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
      // Return focus to trigger
      setTimeout(() => triggerRef.current?.focus(), 0);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (highlightedIndex < 0) {
        closeAndFocusNextField();
      } else if (highlightedIndex === 0) {
        selectValue("");
      } else if (highlightedIndex > 0 && highlightedIndex <= visibleOptions.length) {
        selectValue(visibleOptions[highlightedIndex - 1].id);
      }
      return;
    }
  };

  if (!searchable) {
    return (
      <Box sx={stacked ? { mb: 1.5 } : { display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
        <Typography
          component="label"
          sx={stacked
            ? { display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }
            : { width: 112, fontSize: 12.25, fontWeight: 500, color: "text.secondary", flexShrink: 0 }}
        >
          {required && <Box component="span" sx={{ color: "error.main" }}>* </Box>}
          {label}
        </Typography>
        <TextField
          select
          name={name}
          value={value}
          onChange={onChange}
          size="small"
          sx={[muiFieldSx, { ...(stacked ? { width: "100%" } : { flex: 1 }) }]}
        >
          <MenuItem value="">Select...</MenuItem>
          {options.map((opt) => (
            <MenuItem key={opt.id} value={opt.id}>
              {getOptionLabel(opt)}
            </MenuItem>
          ))}
        </TextField>
      </Box>
    );
  }

  return (
    <Box
      ref={containerRef}
      data-enter-ignore="true"
      sx={stacked ? { mb: 1.5 } : { display: "flex", alignItems: "center", gap: 1, mb: 2 }}
    >
      <Typography
        component="label"
        sx={stacked
          ? { display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }
          : { width: 112, fontSize: 12.25, fontWeight: 500, color: "text.secondary", flexShrink: 0 }}
      >
        {required && <Box component="span" sx={{ color: "error.main" }}>* </Box>}
        {label}
      </Typography>

      <Box sx={stacked ? { width: "100%", position: "relative" } : { flex: 1, position: "relative" }}>
        <Box
          component="button"
          ref={triggerRef}
          type="button"
          data-searchable-select-trigger="true"
          onClick={() => { setOpen((prev) => !prev); setHighlightedIndex(-1); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              setOpen(true);
              setHighlightedIndex(-1);
            }
          }}
          sx={{ width: "100%", border: "1px solid", borderColor: "divider", borderRadius: "2px", bgcolor: "background.paper", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", ...SEARCHABLE_TRIGGER_SX }}
        >
          <Box component="span" sx={{ color: selectedLabel ? "text.primary" : "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedLabel || "Select..."}
          </Box>
          <ChevronDown size={14} style={{ color: "#9ca3af", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : undefined }} />
        </Box>

        {open && (
          <Box sx={{ position: "absolute", zIndex: 50, left: 0, top: "100%", mt: 0.25, width: "100%", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "3.5px", boxShadow: 4 }}>
            <Stack direction="row" spacing={0.5} sx={{ p: 0.5, borderBottom: 1, borderColor: "divider", alignItems: "center" }}>
              <Search size={12} style={{ flexShrink: 0, color: "#9ca3af" }} />
              <Box
                component="input"
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                sx={{ width: "100%", fontSize: 12.25, outline: "none", bgcolor: "transparent", color: "text.secondary", border: 0 }}
              />
            </Stack>

            <Box component="ul" ref={listRef} sx={{ maxHeight: 208, overflowY: "auto", m: 0, p: 0, listStyle: "none" }}>
              <Box
                component="li"
                onClick={() => selectValue("")}
                sx={{ px: 1, py: 0.5, fontSize: 12.25, color: "text.secondary", cursor: "pointer", bgcolor: highlightedIndex === 0 ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "transparent", "&:hover": { bgcolor: highlightedIndex === 0 ? undefined : "action.hover" } }}
              >
                Select...
              </Box>
              {visibleOptions.map((opt, idx) => (
                <Box
                  component="li"
                  key={opt.id}
                  onClick={() => selectValue(opt.id)}
                  sx={(theme) => ({
                    px: 1,
                    py: 0.5,
                    fontSize: 12.25,
                    cursor: "pointer",
                    ...(highlightedIndex === idx + 1
                      ? { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), color: "primary.main", fontWeight: 500 }
                      : String(opt.id) === String(value)
                      ? { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06), color: "primary.main", fontWeight: 500 }
                      : { color: "text.secondary", "&:hover": { bgcolor: "action.hover" } }),
                  })}
                >
                  {getOptionLabel(opt)}
                </Box>
              ))}
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
};

const AttrText = ({
  label,
  name,
  value,
  onChange,
  placeholder = "",
  required = false,
  stacked = false,
}) => (
  <Box sx={stacked ? { mb: 1.5 } : { display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
    <Typography
      component="label"
      sx={stacked
        ? { display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }
        : { width: 112, fontSize: 12.25, fontWeight: 500, color: "text.secondary", flexShrink: 0 }}
    >
      {required && <Box component="span" sx={{ color: "error.main" }}>* </Box>}
      {label}
    </Typography>
    <TextField
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      size="small"
      sx={[muiFieldSx, { ...(stacked ? { width: "100%" } : { flex: 1 }) }]}
    />
  </Box>
);

// ─── Searchable Size Select (for item entry row) ────────────────────────────

const SearchableSizeSelect = ({ value, onChange, sizes, sizeGroups, onJump }) => {
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);

  const normalizedSearch = searchTerm.trim().toLowerCase();

  // Build flat options list: sizes + size groups + Jump
  const allOptions = buildSizeSelectOptions({ sizes, sizeGroups, includeJump: true });

  const filteredOptions = normalizedSearch
    ? allOptions.filter((opt) => opt.value !== "__jump__" && opt.searchText.includes(normalizedSearch))
    : allOptions;

  // +1 for the "Size..." placeholder
  const totalItems = filteredOptions.length + 1;

  const selectedLabel = value || "";

  useEffect(() => {
    if (!open) return undefined;
    const onClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setOpen(false);
        setSearchTerm("");
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, [open]);

  useEffect(() => { setHighlightedIndex(-1); }, [searchTerm]);

  useEffect(() => {
    if (highlightedIndex < 0 || !listRef.current) return;
    const items = listRef.current.querySelectorAll("li");
    if (items[highlightedIndex]) items[highlightedIndex].scrollIntoView({ block: "nearest" });
  }, [highlightedIndex]);

  const focusNextField = () => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const scope = trigger.closest("[data-enter-scope='true']");
    if (!scope) return;
    const focusables = Array.from(
      scope.querySelectorAll(
        "input:not([type='hidden']):not([disabled]):not([readonly]):not([tabindex='-1']),select:not([disabled]):not([tabindex='-1']),textarea:not([disabled]):not([readonly]):not([tabindex='-1']),button:not([disabled]):not([tabindex='-1']),[tabindex]:not([tabindex='-1'])"
      )
    ).filter((el) => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const idx = focusables.indexOf(trigger);
    if (idx >= 0 && idx < focusables.length - 1) {
      const next = focusables[idx + 1];
      next.focus();
      if (next instanceof HTMLInputElement && !["checkbox", "radio", "button", "submit"].includes(next.type)) {
        next.select();
      }
    }
  };

  const selectOption = (val) => {
    if (val === "__jump__") {
      setOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
      onJump();
      return;
    }
    onChange({ target: { value: val } });
    setOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
    setTimeout(() => focusNextField(), 50);
  };

  const closeAndFocusNextField = () => {
    setOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
    setTimeout(() => focusNextField(), 50);
  };

  const handleSearchKeyDown = (e) => {
    if (e.key === "Escape") {
      setOpen(false);
      setSearchTerm("");
      setHighlightedIndex(-1);
      setTimeout(() => triggerRef.current?.focus(), 0);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev < totalItems - 1 ? prev + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : totalItems - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (highlightedIndex < 0) {
        closeAndFocusNextField();
      } else if (highlightedIndex === 0) {
        selectOption("");
      } else if (highlightedIndex > 0 && highlightedIndex <= filteredOptions.length) {
        selectOption(filteredOptions[highlightedIndex - 1].value);
      }
      return;
    }
  };

  // Group options for display
  const groupedDisplay = (() => {
    const groups = [];
    let currentGroup = null;
    filteredOptions.forEach((opt) => {
      if (opt.group !== currentGroup) {
        currentGroup = opt.group;
        groups.push({ type: "header", label: opt.group });
      }
      groups.push({ type: "option", ...opt });
    });
    return groups;
  })();

  // Map flat index (for highlighting) — only count options, not headers
  let optionIndex = 0;

  return (
    <Box ref={containerRef} data-enter-ignore="true" sx={{ position: "relative", zIndex: 140, width: "100%" }}>
      <Box
        component="button"
        ref={triggerRef}
        type="button"
        data-searchable-select-trigger="true"
        onClick={() => { setOpen((prev) => !prev); setHighlightedIndex(-1); }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            e.stopPropagation();
            setOpen(true);
            setHighlightedIndex(-1);
          }
        }}
        sx={{ width: "100%", border: "1px solid", borderColor: "divider", borderRadius: "2px", bgcolor: "background.paper", textAlign: "left", display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer", ...SEARCHABLE_TRIGGER_SX }}
      >
        <Box component="span" sx={{ color: selectedLabel ? "text.primary" : "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedLabel || "Size..."}
        </Box>
        <ChevronDown size={12} style={{ color: "#9ca3af", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : undefined }} />
      </Box>

      {open && (
        <Box sx={{ position: "absolute", zIndex: 160, left: 0, top: "100%", mt: 0.25, width: "100%", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "3.5px", boxShadow: 4, minWidth: 160 }}>
          <Stack direction="row" spacing={0.5} sx={{ p: 0.5, borderBottom: 1, borderColor: "divider", alignItems: "center" }}>
            <Search size={12} style={{ flexShrink: 0, color: "#9ca3af" }} />
            <Box
              component="input"
              autoFocus
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search size..."
              sx={{ width: "100%", fontSize: 12.25, outline: "none", bgcolor: "transparent", color: "text.secondary", border: 0 }}
            />
          </Stack>

          <Box component="ul" ref={listRef} sx={{ maxHeight: 208, overflowY: "auto", m: 0, p: 0, listStyle: "none" }}>
            <Box
              component="li"
              onClick={() => selectOption("")}
              sx={{ px: 1, py: 0.5, fontSize: 12.25, color: "text.secondary", cursor: "pointer", bgcolor: highlightedIndex === 0 ? (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) : "transparent", "&:hover": { bgcolor: highlightedIndex === 0 ? undefined : "action.hover" } }}
            >
              Size...
            </Box>
            {groupedDisplay.map((item) => {
              if (item.type === "header") {
                return (
                  <Box component="li" key={`hdr-${item.label}`} sx={{ px: 1, py: 0.25, fontSize: 9, fontWeight: 600, color: "text.disabled", textTransform: "uppercase", bgcolor: "action.hover", userSelect: "none" }}>
                    {item.label}
                  </Box>
                );
              }
              const thisIndex = ++optionIndex;
              return (
                <Box
                  component="li"
                  key={item.key}
                  onClick={() => selectOption(item.value)}
                  sx={(theme) => ({
                    px: 1,
                    py: 0.5,
                    fontSize: 12.25,
                    cursor: "pointer",
                    ...(highlightedIndex === thisIndex
                      ? { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), color: "primary.main", fontWeight: 500 }
                      : item.value === value
                      ? { bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.12 : 0.06), color: "primary.main", fontWeight: 500 }
                      : item.value === "__jump__"
                      ? { color: "primary.main", fontWeight: 500, "&:hover": { bgcolor: "action.hover" } }
                      : { color: "text.secondary", "&:hover": { bgcolor: "action.hover" } }),
                  })}
                >
                  {item.label}
                </Box>
              );
            })}
          </Box>
        </Box>
      )}
    </Box>
  );
};

// ─── Jump Size Dialog ───────────────────────────────────────────────────────

const JumpSizeDialog = ({ open, onClose, onApply, defaultQty }) => {
  const [start, setStart] = useState("");
  const [increment, setIncrement] = useState("");
  const [end, setEnd] = useState("");
  const [qty, setQty] = useState(defaultQty || "1");
  const [generatedSizes, setGeneratedSizes] = useState([]);

  const handleGenerate = () => {
    const s = parseFloat(start);
    const inc = parseFloat(increment);
    const e = parseFloat(end);
    if (isNaN(s) || isNaN(inc) || isNaN(e) || inc <= 0 || s > e) return;

    const sizes = [];
    for (let v = s; v <= e; v = parseFloat((v + inc).toFixed(4))) {
      sizes.push({ size: String(v % 1 === 0 ? Math.round(v) : v), qty: parseInt(qty) || 1 });
    }
    setGeneratedSizes(sizes);
  };

  const handleQtyChange = (index, newQty) => {
    setGeneratedSizes((prev) =>
      prev.map((item, i) => (i === index ? { ...item, qty: parseInt(newQty) || 0 } : item))
    );
  };

  const handleRemove = (index) => {
    setGeneratedSizes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleApply = () => {
    if (generatedSizes.length === 0) return;
    onApply(generatedSizes);
    // Reset
    setStart("");
    setIncrement("");
    setEnd("");
    setQty("1");
    setGeneratedSizes([]);
  };

  const handleClose = () => {
    setStart("");
    setIncrement("");
    setEnd("");
    setQty("1");
    setGeneratedSizes([]);
    onClose();
  };

  if (!open) return null;

  return (
    <Box sx={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "rgba(0,0,0,0.4)" }} onClick={handleClose}>
      <Box
        sx={{ bgcolor: "background.paper", borderRadius: "7px", boxShadow: 8, border: "1px solid", borderColor: "divider", width: "100%", maxWidth: 448, mx: 2 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, borderBottom: 1, borderColor: "divider" }}>
          <Typography sx={{ fontSize: 12.25, fontWeight: 600, color: "text.primary" }}>Size Detail (Jump)</Typography>
          <Button onClick={handleClose} className="glass-btn glass-btn-secondary">
            <X size={16} />
          </Button>
        </Stack>

        <Stack spacing={1.5} sx={{ px: 2, py: 1.5 }}>
          {/* Input Row: Start - Increment - End */}
          <Stack direction="row" spacing={1}>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Start</Typography>
              <TextField
                type="number"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                size="small"
                fullWidth
                placeholder="e.g. 10"
                sx={muiFieldSx}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-end", pb: 0.5, color: "text.disabled", fontWeight: 700 }}>-</Box>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Increment</Typography>
              <TextField
                type="number"
                value={increment}
                onChange={(e) => setIncrement(e.target.value)}
                size="small"
                fullWidth
                placeholder="e.g. 2"
                sx={muiFieldSx}
              />
            </Box>
            <Box sx={{ display: "flex", alignItems: "flex-end", pb: 0.5, color: "text.disabled", fontWeight: 700 }}>-</Box>
            <Box sx={{ flex: 1 }}>
              <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>End</Typography>
              <TextField
                type="number"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                size="small"
                fullWidth
                placeholder="e.g. 26"
                sx={muiFieldSx}
              />
            </Box>
          </Stack>

          {/* Quantity */}
          <Stack direction="row" spacing={1} sx={{ alignItems: "flex-end" }}>
            <Box sx={{ width: 96 }}>
              <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary" }}>Quantity</Typography>
              <TextField
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                size="small"
                fullWidth
                placeholder="1"
                sx={muiFieldSx}
              />
            </Box>
            <Button
              onClick={handleGenerate}
              className="glass-btn glass-btn-primary"
            >
              Generate
            </Button>
          </Stack>

          {/* Generated Sizes Table */}
          {generatedSizes.length > 0 && (
            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: "3.5px", maxHeight: 208, overflowY: "auto" }}>
              <Stack direction="row" sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), fontSize: 10.5, fontWeight: 600, color: "text.secondary", borderBottom: 1, borderColor: "divider", position: "sticky", top: 0 }}>
                <Box sx={{ p: 1, width: 64, borderRight: 1, borderColor: "divider", textAlign: "center" }}>S.No</Box>
                <Box sx={{ p: 1, flex: 1, borderRight: 1, borderColor: "divider" }}>Size</Box>
                <Box sx={{ p: 1, width: 80, borderRight: 1, borderColor: "divider", textAlign: "center" }}>Qty</Box>
                <Box sx={{ p: 1, width: 64, textAlign: "center" }}>Action</Box>
              </Stack>
              {generatedSizes.map((item, idx) => (
                <Stack key={idx} direction="row" sx={{ fontSize: 12.25, borderBottom: 1, borderColor: "divider", "&:hover": { bgcolor: "action.hover" } }}>
                  <Box sx={{ p: 1, width: 64, borderRight: 1, borderColor: "divider", textAlign: "center", fontSize: 10.5, color: "text.primary" }}>{idx + 1}</Box>
                  <Box sx={{ p: 1, flex: 1, borderRight: 1, borderColor: "divider", fontWeight: 500, color: "text.primary" }}>{item.size}</Box>
                  <Box sx={{ p: 1, width: 80, borderRight: 1, borderColor: "divider", textAlign: "center" }}>
                    <TextField
                      type="number"
                      value={item.qty}
                      onChange={(e) => handleQtyChange(idx, e.target.value)}
                      size="small"
                      fullWidth
                      sx={{ "& .MuiInputBase-input": { textAlign: "center", fontSize: 10.5, py: 0.25 } }}
                    />
                  </Box>
                  <Box sx={{ p: 1, width: 64, textAlign: "center" }}>
                    <Button onClick={() => handleRemove(idx)} className="glass-btn glass-btn-danger">
                      <X size={14} style={{ display: "inline" }} />
                    </Button>
                  </Box>
                </Stack>
              ))}
            </Box>
          )}
        </Stack>

        <Stack direction="row" spacing={1} sx={{ justifyContent: "flex-end", px: 2, py: 1.5, borderTop: 1, borderColor: "divider", bgcolor: "action.hover", borderBottomLeftRadius: "7px", borderBottomRightRadius: "7px" }}>
          <Button
            onClick={handleClose}
            className="glass-btn glass-btn-secondary"
          >
            Cancel
          </Button>
          <Button
            onClick={handleApply}
            disabled={generatedSizes.length === 0}
            className="glass-btn glass-btn-primary"
          >
            Apply Sizes
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

// ─── Attribute name → form field mapping ─────────────────────────────────────
const ATTR_FIELD_MAP = {
  BRAND: { field: "brandId", label: "Brand", location: "attrs" },
  MATERIAL: { field: "materialId", label: "Material", location: "attrs" },
  PATTERN: { field: "patternId", label: "Pattern", location: "attrs" },
  STYLE: { field: "styleId", label: "Style", location: "attrs" },
  TYPE: { field: "typeId", label: "Type", location: "attrs" },
  COLOUR: { field: "colorId", label: "Color", location: "attrs" },
  FIT: { field: "fitId", label: "Fit", location: "attrs" },
  SLEEVE: { field: "sleeveId", label: "Sleeve", location: "attrs" },
  SIZE: { field: "size", label: "Size", location: "item" },
  DESIGN: { field: "designNo", label: "Design No", location: "item" },
  "PURCHASE ORDER": { field: "purchaseOrder", label: "Purchase Order", location: "attrs", dynamic: true },
  "SERIAL NO": { field: "serialNo", label: "Serial No", location: "attrs", dynamic: true },
  "BATCH AND EXPIRY": { field: "batchExpiry", label: "Batch & Expiry", location: "attrs", dynamic: true },
  ITEM: { field: "itemName", label: "Item", location: "attrs", dynamic: true },
  "COLOUR/OPTION": { field: "colourOption", label: "Colour/Option", location: "attrs", dynamic: true },
  "MULTIPLE PRICE": { field: "multiplePrice", label: "Multiple Price", location: "attrs", dynamic: true },
  "UPLOAD BARCODE": { field: "uploadBarcode", label: "Upload Barcode", location: "attrs", dynamic: true },
  WEIGHT: { field: "weight", label: "Weight", location: "attrs", dynamic: true },
  WASTAGE: { field: "wastage", label: "Wastage", location: "attrs", dynamic: true },
  "WORKING CHARGE": { field: "workingCharge", label: "Working Charge", location: "attrs", dynamic: true },
};

const createDefaultCurrentItem = (sNo = 1) => ({
  sNo,
  size: "",
  jumpSizes: [],
  designNo: "",
  qty: "",
  cost: "",
  marginPerc: "",
  sellingPrice: "",
  mrp: "",
  discountPerc: "",
  finalPrice: "",
});

const createDefaultItemFilters = () => ({
  size: "",
  designNo: "",
  hsnCode: "",
  qty: "",
  cost: "",
  pDis: "",
  marginPerc: "",
  sellingPrice: "",
  mrp: "",
  discountPerc: "",
  finalPrice: "",
  amount: "",
});

const WORKFLOW_STATUS_OPTIONS = [
  { value: "invoice_completed", label: "Invoice Completed" },
  { value: "invoice_progress", label: "Invoice Progress" },
  { value: "temporary", label: "Temporary" },
];

const formatDisplayDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-GB").replace(/\//g, "-");
};

const formatMoney = (value) => (Number(value) || 0).toFixed(2);

const getOptionNameById = (rows, id) =>
  rows.find((row) => String(row?.id) === String(id))?.name || "";

const matchesItemFilter = (value, filterValue) => {
  if (!filterValue) return true;
  return String(value ?? "").toLowerCase().includes(String(filterValue).trim().toLowerCase());
};

// ─── Main Component ─────────────────────────────────────────────────────────

const InventoryEntry = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const transportEntryId = searchParams.get("transport_entry_id");
  const modeParam = String(searchParams.get("mode") || "").trim().toLowerCase();
  const editParam = searchParams.get("edit");
  const parsedEditId = editParam ? parseInt(editParam, 10) : null;
  const queryEditEntryId = Number.isFinite(parsedEditId) ? parsedEditId : null;
  const [resolvedEditEntryId, setResolvedEditEntryId] = useState(queryEditEntryId);
  const editEntryId = queryEditEntryId || resolvedEditEntryId;
  const isEditMode = !!editEntryId;
  const isViewMode = modeParam === "view";

  const [toast, setToast] = useState({ open: false, type: "info", message: "" });
  const showToast = (type, message) => setToast({ open: true, type, message });

  // Confirm dialog state
  const [confirm, setConfirm] = useState({ open: false, title: "", message: "", onConfirm: null });

  // Dropdown data from DB
  const [products, setProducts] = useState([]);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taxes, setTaxes] = useState([]);
  const [patterns, setPatterns] = useState([]);
  const [styles, setStyles] = useState([]);
  const [fits, setFits] = useState([]);
  const [sleeves, setSleeves] = useState([]);
  const [types, setTypes] = useState([]);
  const [materials, setMaterials] = useState([]);
  const [colors, setColors] = useState([]);
  const [sizes, setSizes] = useState([]);
  const [sizeGroups, setSizeGroups] = useState([]);

  // Selected product's margin range
  const [marginMin, setMarginMin] = useState(null);
  const [marginMax, setMarginMax] = useState(null);

  // The initial preload (?all=true for products, plain /brands for brands) is capped well below
  // the real row count on both tables in this deployment -- these hit each resource's own
  // ?search= endpoint so the dropdown can find anything beyond that initial batch.
  const handleAsyncProductSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/products", { params: { search: query, mode: "dropdown", limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setProducts((prev) => {
          const existingIds = new Set((prev || []).map((p) => String(p.id)));
          const newItems = results.filter((p) => !existingIds.has(String(p.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results;
    } catch {
      return [];
    }
  }, []);

  const handleAsyncBrandSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/brands", { params: { search: query, limit: 50 } });
      const results = Array.isArray(res.data?.data) ? res.data.data : [];
      if (results.length) {
        setBrands((prev) => {
          const existingIds = new Set((prev || []).map((b) => String(b.id)));
          const newItems = results.filter((b) => !existingIds.has(String(b.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return results;
    } catch {
      return [];
    }
  }, []);

  // The Tax field below used the plain AttrSelect component (pure client-side filtering, no async
  // concept at all -- unlike Product/Brand above) against a ~1,000,000-row table, so it could never
  // find a tax beyond whatever /taxes' default ~50-row fetch happened to return. `taxes` state is
  // kept raw (not pre-formatted) here since the render below derives "Name X%" labels from
  // .name/.tax_percentage itself -- merging pre-formatted objects would double up or blank the label.
  const handleAsyncTaxSearch = useCallback(async (query) => {
    try {
      const res = await api.get("/taxes", { params: { search: query, limit: 50 } });
      const rawResults = Array.isArray(res.data?.data) ? res.data.data : [];
      if (rawResults.length) {
        setTaxes((prev) => {
          const existingIds = new Set((prev || []).map((t) => String(t.id)));
          const newItems = rawResults.filter((t) => !existingIds.has(String(t.id)));
          return newItems.length ? [...prev, ...newItems] : prev;
        });
      }
      return rawResults.map((t) => ({ id: t.id, name: `${t.name} ${t.tax_percentage ?? t.rate ?? 0}%` }));
    } catch {
      return [];
    }
  }, []);

  // Mandatory fields derived from product's purchase_entry_attributes
  // Set of field names (e.g. "brandId", "size") that are mandatory
  const [mandatoryFields, setMandatoryFields] = useState(new Set());
  // Visible dynamic fields (fields that should appear because man or show is checked)
  const [visibleDynamicFields, setVisibleDynamicFields] = useState(new Set());

  // Auto-filled from invoice/transport entry
  const [supplierName, setSupplierName] = useState("");
  const [supplierId, setSupplierId] = useState(null);
  const [invoiceId, setInvoiceId] = useState(null);
  const [itemValue, setItemValue] = useState(0);
  const [totalValue, setTotalValue] = useState(0);
  const [hasTransportEntry, setHasTransportEntry] = useState(false);
  const [linkedTransportEntryId, setLinkedTransportEntryId] = useState(
    transportEntryId || null
  );
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const [transportSummary, setTransportSummary] = useState(null);
  const [invoiceSummary, setInvoiceSummary] = useState(null);

  // Jump dialog
  const [jumpOpen, setJumpOpen] = useState(false);

  // Left side attributes form
  const [attrs, setAttrs] = useState({
    productId: "",
    brandId: "",
    hsnCode: "",
    patternId: "",
    styleId: "",
    fitId: "",
    sleeveId: "",
    typeId: "",
    materialId: "",
    colorId: "",
    taxId: "",
    buyingPrice: "",
    expMargin: "",
    pTax: "",
    sTax: "",
    discount: "",
    purchaseOrder: "",
    serialNo: "",
    batchExpiry: "",
    invoiceWorkflowStatus: "invoice_completed",
    itemName: "",
    colourOption: "",
    multiplePrice: "",
    uploadBarcode: "",
    weight: "",
    wastage: "",
    workingCharge: "",
  });

  // Item entry row
  const [currentItem, setCurrentItem] = useState(createDefaultCurrentItem(1));

  // Added items table
  const [items, setItems] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [itemFilters, setItemFilters] = useState(createDefaultItemFilters);

  useEffect(() => {
    setResolvedEditEntryId(queryEditEntryId);
  }, [queryEditEntryId]);

  // Load all dropdown data on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [prodRes, brandRes, taxRes, patternRes, styleRes, fitRes, sleeveRes, typeRes, materialRes, colorRes, sizeRes, sgRes] =
          await Promise.all([
            // Was ?all=true (up to 25,000 rows, unbounded relative to the ~1,000,000-row real table)
            // -- now that Product has real async search (handleAsyncProductSearch below), this only
            // needs to seed a small initial/browsable batch; a full-table fetch on every page load
            // was both wasted bandwidth and, on a busy DB connection, enough to visibly delay the
            // page and starve the search request behind it.
            api.get("/products?mode=dropdown&limit=100"),
            api.get("/brands"),
            api.get("/taxes"),
            api.get("/attributes/pattern"),
            api.get("/attributes/style"),
            api.get("/attributes/fit"),
            api.get("/attributes/sleeve"),
            api.get("/attributes/type"),
            api.get("/attributes/material"),
            api.get("/attributes/colour"),
            api.get("/sizes"),
            api.get("/size-groups"),
          ]);
        setProducts(prodRes.data.data || []);
        setBrands(brandRes.data.data || []);
        setTaxes(taxRes.data.data || taxRes.data || []);
        setPatterns(patternRes.data.data || []);
        setStyles(styleRes.data.data || []);
        setFits(fitRes.data.data || []);
        setSleeves(sleeveRes.data.data || []);
        setTypes(typeRes.data.data || []);
        setMaterials(materialRes.data.data || []);
        setColors(colorRes.data.data || []);
        setSizes(sizeRes.data.data || []);
        setSizeGroups(sgRes.data.data || []);
      } catch (err) {
        console.error("Failed to load dropdown data:", err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // If transport_entry_id is provided, fetch invoice data for auto-fill
  useEffect(() => {
    if (!transportEntryId) return;
    setHasTransportEntry(true);
    setLinkedTransportEntryId(transportEntryId);
  }, [transportEntryId]);

  useEffect(() => {
    if (!linkedTransportEntryId && !invoiceId) {
      setTransportSummary(null);
      setInvoiceSummary(null);
      return;
    }

    const fetchLinkedSummary = async () => {
      try {
        let te = null;
        if (linkedTransportEntryId) {
          const teRes = await api.get(`/transport-entries/${linkedTransportEntryId}`);
          te = teRes.data?.data || null;
          setTransportSummary(te);
          if (te) {
            setSupplierName(te.supplier?.name || "");
            setSupplierId(te.supplier_id || null);
          }
        } else {
          setTransportSummary(null);
        }

        let inv = null;
        if (invoiceId) {
          const invRes = await api.get(`/invoices/${invoiceId}`);
          inv = invRes.data?.data || null;
        } else if (linkedTransportEntryId) {
          const invListRes = await api.get(`/invoices?transport_entry_id=${linkedTransportEntryId}`);
          const invoiceList = invListRes.data?.data || [];
          if (invoiceList.length > 0) {
            const nextInvoiceId = invoiceList[0].id;
            setInvoiceId(nextInvoiceId);
            const invRes = await api.get(`/invoices/${nextInvoiceId}`);
            inv = invRes.data?.data || null;
          }
        }

        setInvoiceSummary(inv);
        if (inv) {
          setItemValue(parseFloat(inv.base_amount) || 0);
          setTotalValue(parseFloat(inv.net_amount) || 0);
        }
      } catch (err) {
        console.error("Failed to fetch linked inventory entry summary:", err);
      }
    };

    fetchLinkedSummary();
  }, [linkedTransportEntryId, invoiceId]);

  // If edit id is provided, or the page is opened from dashboard with transport_entry_id + mode,
  // resolve the existing inventory entry and prefill the form/items.
  useEffect(() => {
    const fetchEntryForEdit = async () => {
      try {
        let targetEntryId = editEntryId;

        if (!targetEntryId && transportEntryId) {
          const listRes = await api.get(`/inventory-entries?transport_entry_id=${transportEntryId}`);
          const matchingEntries = Array.isArray(listRes.data?.data) ? listRes.data.data : [];
          const resolvedEntry =
            matchingEntries
              .slice()
              .sort((a, b) => {
                const left = Number(a?.id || 0);
                const right = Number(b?.id || 0);
                return right - left;
              })[0] || null;

          if (!resolvedEntry?.id) {
            if (modeParam === "edit" || modeParam === "view") {
              showToast("error", "Saved inventory entry not found for this transport entry");
            }
            return;
          }

          targetEntryId = Number(resolvedEntry.id);
          setResolvedEditEntryId(targetEntryId);
        }

        if (!targetEntryId) return;

        const res = await api.get(`/inventory-entries/${targetEntryId}`);
        const entry = res.data?.data;
        if (!entry) {
          showToast("error", "Inventory entry not found");
          return;
        }

        setHasTransportEntry(true);
        setLinkedTransportEntryId(entry.transport_entry_id || null);
        setSupplierName(entry.supplier?.name || entry.supplier_name || "");
        setSupplierId(entry.supplier_id || null);
        setInvoiceId(entry.invoice_id || null);
        setItemValue(parseFloat(entry.item_value) || 0);
        setTotalValue(parseFloat(entry.total) || 0);

        setAttrs((prev) => ({
          ...prev,
          productId: entry.product_id ? String(entry.product_id) : "",
          brandId: entry.brand_id ? String(entry.brand_id) : "",
          hsnCode: entry.hsn_code || "",
          patternId: entry.pattern_id ? String(entry.pattern_id) : "",
          styleId: entry.style_id ? String(entry.style_id) : "",
          fitId: entry.fit_id ? String(entry.fit_id) : "",
          sleeveId: entry.sleeve_id ? String(entry.sleeve_id) : "",
          typeId: entry.type_id ? String(entry.type_id) : "",
          materialId: entry.material_id ? String(entry.material_id) : "",
          colorId: entry.color_id ? String(entry.color_id) : "",
          taxId: entry.tax_id ? String(entry.tax_id) : "",
          buyingPrice: entry.buying_price != null ? String(entry.buying_price) : "",
          pTax: entry.p_tax != null ? String(entry.p_tax) : "",
          discount: entry.discount != null ? String(entry.discount) : "",
          purchaseOrder: entry.purchase_order || "",
          serialNo: entry.serial_no || "",
          batchExpiry: entry.batch_expiry || "",
          invoiceWorkflowStatus: entry.invoice_workflow_status || "invoice_completed",
          itemName: entry.item_name || "",
          colourOption: entry.colour_option || "",
          multiplePrice: entry.multiple_price || "",
          uploadBarcode: entry.upload_barcode || "",
          weight: entry.weight || "",
          wastage: entry.wastage || "",
          workingCharge: entry.working_charge || "",
        }));

        const mappedItems = (entry.items || []).map((item, index) => {
          const qty = parseInt(item.qty, 10) || 0;
          const cost = parseFloat(item.cost) || 0;
          return {
            id: item.id || Date.now() + index,
            sNo: item.s_no || index + 1,
            size: item.size || "",
            designNo: item.design_no || "",
            hsnCode: entry.hsn_code || "",
            qty,
            cost,
            pDis: parseFloat(item.p_dis) || 0,
            marginPerc: parseFloat(item.margin_perc) || 0,
            margin: parseFloat(item.margin) || 0,
            mrp: parseFloat(item.mrp) || 0,
            price: parseFloat(item.price) || 0,
            amount: parseFloat(item.amount) || Math.round(cost * qty * 100) / 100,
            sellingPrice: parseFloat(item.selling_price) || parseFloat(item.price) || 0,
            discountPerc: parseFloat(item.discount_perc) || 0,
            finalPrice: parseFloat(item.final_price) || 0,
          };
        });

        setItems(mappedItems);
        setCurrentItem((prev) => ({ ...prev, sNo: mappedItems.length + 1 }));
      } catch (err) {
        console.error("Failed to load inventory entry for edit:", err);
        showToast("error", "Failed to load inventory entry for editing");
      }
    };

    if (!editEntryId && !transportEntryId) {
      return;
    }

    fetchEntryForEdit();
  }, [editEntryId, modeParam, transportEntryId]);

  // When product changes, load its margin_min/margin_max and mandatory attributes
  useEffect(() => {
    if (!attrs.productId) {
      setMarginMin(null);
      setMarginMax(null);
      setMandatoryFields(new Set());
      setVisibleDynamicFields(new Set());
      return;
    }
    const product = products.find((p) => p.id === parseInt(attrs.productId));
    if (product) {
      setMarginMin(product.margin_min != null ? parseFloat(product.margin_min) : null);
      setMarginMax(product.margin_max != null ? parseFloat(product.margin_max) : null);

      // Compute mandatory and visible fields from purchase_entry_attributes
      const pea = Array.isArray(product.purchase_entry_attributes)
        ? product.purchase_entry_attributes
        : [];
      const mf = new Set();
      const vf = new Set();
      pea.forEach((attr) => {
        const mapping = ATTR_FIELD_MAP[attr.name];
        if (!mapping) return;
        if (attr.man) mf.add(mapping.field);
        // For dynamic fields, show them if man or show is checked
        if (mapping.dynamic && (attr.man || attr.show)) {
          vf.add(mapping.field);
        }
      });
      setMandatoryFields(mf);
      setVisibleDynamicFields(vf);
    }
  }, [attrs.productId, products]);

  const handleAttrChange = (e) => {
    const { name, value } = e.target;
    setAttrs((prev) => ({ ...prev, [name]: value }));
  };

  // Get current tax percentage
  const getTaxPerc = useCallback(() => {
    if (attrs.taxId) {
      const t = taxes.find((tx) => tx.id === parseInt(attrs.taxId));
      return t ? parseFloat(t.tax_percentage) || 0 : 0;
    }
    return 0;
  }, [attrs.taxId, taxes]);

  // Auto-calculate Sale and MRP from cost + tax + margin
  const calcSaleAndMrp = (cost, marginPerc) => {
    const c = parseFloat(cost) || 0;
    const m = parseFloat(marginPerc) || 0;
    const taxP = getTaxPerc();

    const margin = c * (m / 100);
    const sale = c + margin;
    const mrp = sale + sale * (taxP / 100);
    return { sale: Math.round(sale * 100) / 100, mrp: Math.round(mrp * 100) / 100 };
  };

  const calcFinalFromMrp = (mrp, discountPerc) => {
    const d = parseFloat(discountPerc) || 0;
    const finalP = mrp - mrp * (d / 100);
    return Math.round(finalP * 100) / 100;
  };

  const handleItemChange = (e) => {
    const { name, value } = e.target;
    setCurrentItem((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "qty" && prev.jumpSizes?.length) {
        updated.jumpSizes = [];
        updated.size = "";
      }

      const cost = parseFloat(updated.cost) || 0;
      const marginPerc = parseFloat(updated.marginPerc) || 0;
      const { sale, mrp } = calcSaleAndMrp(cost, marginPerc);
      const discPerc = parseFloat(updated.discountPerc) || 0;
      const finalP = calcFinalFromMrp(mrp, discPerc);

      if (name === "cost" || name === "marginPerc") {
        updated.sellingPrice = sale.toFixed(2);
        updated.mrp = mrp.toFixed(2);
      }
      if (name === "cost" || name === "marginPerc" || name === "discountPerc") {
        updated.finalPrice = finalP.toFixed(2);
      }

      return updated;
    });
  };

  const handleSizeChange = (e) => {
    const val = e.target.value;
    if (val === "__jump__") {
      setJumpOpen(true);
      return;
    }
    setCurrentItem((prev) => ({ ...prev, size: val, jumpSizes: [] }));
  };

  // Apply jump sizes to the entry row. Actual add happens on the main + button.
  const handleJumpApply = (jumpSizes) => {
    const normalizedJumpSizes = jumpSizes
      .map((row) => ({
        size: String(row.size || "").trim(),
        qty: parseInt(row.qty, 10) || 0,
      }))
      .filter((row) => row.size && row.qty > 0);

    if (normalizedJumpSizes.length === 0) {
      showToast("warning", "Add at least one jump size");
      return;
    }

    const totalQty = normalizedJumpSizes.reduce((sum, row) => sum + row.qty, 0);
    setCurrentItem((prev) => ({
      ...prev,
      size: "Jump",
      qty: String(totalQty),
      jumpSizes: normalizedJumpSizes,
    }));
    setJumpOpen(false);
  };

  const validateMargin = (marginPerc) => {
    const m = parseFloat(marginPerc);
    if (isNaN(m)) return true;
    if (marginMin !== null && m < marginMin) {
      showToast("error", `Margin ${m}% is below product minimum (${marginMin}%)`);
      return false;
    }
    if (marginMax !== null && m > marginMax) {
      showToast("error", `Margin ${m}% exceeds product maximum (${marginMax}%)`);
      return false;
    }
    return true;
  };

  // Validate mandatory attribute fields before adding/saving
  const validateMandatoryAttrs = () => {
    for (const fieldName of mandatoryFields) {
      const mapping = Object.values(ATTR_FIELD_MAP).find((m) => m.field === fieldName);
      if (!mapping) continue;
      if (mapping.location === "attrs") {
        if (!attrs[fieldName]) {
          showToast("error", `${mapping.label} is mandatory for this product`);
          return false;
        }
      }
      // item-level fields (size, designNo) are validated per-item in handleAddItem
    }
    return true;
  };

  const handleAddItem = () => {
    // Check mandatory item-level fields
    for (const fieldName of mandatoryFields) {
      const mapping = Object.values(ATTR_FIELD_MAP).find((m) => m.field === fieldName);
      if (!mapping || mapping.location !== "item") continue;
      if (!currentItem[fieldName]) {
        showToast("error", `${mapping.label} is mandatory for this product`);
        return;
      }
    }

    const marginPerc = parseFloat(currentItem.marginPerc) || 0;
    if (marginPerc > 0 && !validateMargin(marginPerc)) return;

    const cost = parseFloat(currentItem.cost) || 0;
    const { sale, mrp } = calcSaleAndMrp(cost, marginPerc);
    const margin = cost * (marginPerc / 100);
    const discPerc = parseFloat(currentItem.discountPerc) || 0;
    const finalP = calcFinalFromMrp(mrp, discPerc);
    const jumpRows = (Array.isArray(currentItem.jumpSizes) ? currentItem.jumpSizes : [])
      .map((row) => ({
        size: String(row.size || "").trim(),
        qty: parseInt(row.qty, 10) || 0,
      }))
      .filter((row) => row.size && row.qty > 0);

    if (jumpRows.length > 0) {
      if (editIndex !== null) {
        showToast("warning", "Finish or cancel row edit before adding jump sizes");
        return;
      }

      const newItems = jumpRows.map((row, idx) => ({
        id: Date.now() + idx,
        sNo: items.length + idx + 1,
        size: row.size,
        designNo: currentItem.designNo,
        qty: row.qty,
        cost,
        pDis: 0,
        marginPerc,
        margin: Math.round((cost * (marginPerc / 100)) * 100) / 100,
        mrp: Math.round(mrp * 100) / 100,
        price: Math.round(sale * 100) / 100,
        amount: Math.round(cost * row.qty * 100) / 100,
        sellingPrice: Math.round(sale * 100) / 100,
        discountPerc: discPerc,
        finalPrice: Math.round(finalP * 100) / 100,
      }));

      setItems((prev) => [...prev, ...newItems]);
      setCurrentItem(createDefaultCurrentItem(items.length + newItems.length + 1));
      return;
    }

    const qty = parseInt(currentItem.qty, 10) || 0;
    if (qty <= 0) {
      showToast("warning", "Qty must be greater than 0");
      return;
    }
    const amount = cost * qty;

    const newItem = {
      id: Date.now(),
      sNo: items.length + 1,
      size: currentItem.size,
      designNo: currentItem.designNo,
      hsnCode: attrs.hsnCode || "",
      qty,
      cost,
      pDis: 0,
      marginPerc,
      margin: Math.round(margin * 100) / 100,
      mrp: Math.round(mrp * 100) / 100,
      price: Math.round(sale * 100) / 100,
      amount: Math.round(amount * 100) / 100,
      sellingPrice: Math.round(sale * 100) / 100,
      discountPerc: discPerc,
      finalPrice: Math.round(finalP * 100) / 100,
    };

    if (editIndex !== null) {
      setItems((prev) =>
        prev.map((item, i) => (i === editIndex ? { ...newItem, id: item.id, sNo: i + 1 } : item))
      );
      setEditIndex(null);
    } else {
      setItems((prev) => [...prev, newItem]);
    }
    setCurrentItem(createDefaultCurrentItem(editIndex !== null ? items.length + 1 : items.length + 2));
  };

  const handleRemoveItem = (index) => {
    if (editIndex === index) {
      setEditIndex(null);
      setCurrentItem(createDefaultCurrentItem(items.length));
    } else if (editIndex !== null && editIndex > index) {
      setEditIndex(editIndex - 1);
    }
    setItems((prev) =>
      prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, sNo: i + 1 }))
    );
  };

  const handleEditItem = (index) => {
    const item = items[index];
    setEditIndex(index);
    setAttrs((prev) => ({
      ...prev,
      hsnCode: item.hsnCode || prev.hsnCode,
    }));
    setCurrentItem({
      sNo: item.sNo,
      size: item.size || "",
      jumpSizes: [],
      designNo: item.designNo || "",
      qty: String(item.qty),
      cost: String(item.cost),
      marginPerc: String(item.marginPerc),
      sellingPrice: String(item.sellingPrice),
      mrp: String(item.mrp),
      discountPerc: String(item.discountPerc),
      finalPrice: String(item.finalPrice),
    });
  };

  // Computed totals
  const computedTotals = items.reduce(
    (acc, item) => ({
      qty: acc.qty + (item.qty || 0),
      taxable: acc.taxable + (item.amount || 0),
      discount: acc.discount + (item.amount || 0) * ((item.pDis || 0) / 100),
    }),
    { qty: 0, taxable: 0, discount: 0 }
  );

  const handleItemFilterChange = (field, value) => {
    setItemFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const filteredItems = items
    .map((item, index) => ({ item, index }))
    .filter(({ item }) => {
      const rowHsnCode = item.hsnCode || attrs.hsnCode || "";
      return (
        matchesItemFilter(item.size, itemFilters.size) &&
        matchesItemFilter(item.designNo, itemFilters.designNo) &&
        matchesItemFilter(rowHsnCode, itemFilters.hsnCode) &&
        matchesItemFilter(item.qty, itemFilters.qty) &&
        matchesItemFilter(formatMoney(item.cost), itemFilters.cost) &&
        matchesItemFilter(formatMoney(item.pDis), itemFilters.pDis) &&
        matchesItemFilter(item.marginPerc, itemFilters.marginPerc) &&
        matchesItemFilter(formatMoney(item.sellingPrice), itemFilters.sellingPrice) &&
        matchesItemFilter(formatMoney(item.mrp), itemFilters.mrp) &&
        matchesItemFilter(item.discountPerc, itemFilters.discountPerc) &&
        matchesItemFilter(formatMoney(item.finalPrice), itemFilters.finalPrice) &&
        matchesItemFilter(formatMoney(item.amount), itemFilters.amount)
      );
    });

  const taxPerc = getTaxPerc();
  const taxAmount = computedTotals.taxable * (taxPerc / 100);
  const rowsTotal = computedTotals.taxable + taxAmount;

  const doSave = async () => {
    try {
      const payload = {
        transportEntryId: linkedTransportEntryId,
        companyId: transportSummary?.company_id || transportSummary?.company?.id || invoiceSummary?.company_id || invoiceSummary?.company?.id || null,
        companyName:
          transportSummary?.company?.name
          || transportSummary?.company_name
          || invoiceSummary?.company?.name
          || invoiceSummary?.company_name
          || "",
        invoiceId,
        supplierId,
        supplierName:
          supplierName
          || transportSummary?.supplier?.name
          || transportSummary?.supplier_name
          || invoiceSummary?.supplier?.name
          || invoiceSummary?.supplier_name
          || "",
        productId: attrs.productId,
        productName: getOptionNameById(products, attrs.productId) || "",
        brandId: attrs.brandId || null,
        brandName: getOptionNameById(brands, attrs.brandId) || "",
        hsnCode: attrs.hsnCode || null,
        patternId: attrs.patternId || null,
        styleId: attrs.styleId || null,
        fitId: attrs.fitId || null,
        sleeveId: attrs.sleeveId || null,
        typeId: attrs.typeId || null,
        materialId: attrs.materialId || null,
        colorId: attrs.colorId || null,
        taxId: attrs.taxId || null,
        buyingPrice: attrs.buyingPrice || 0,
        pTax: attrs.pTax || 0,
        discount: attrs.discount || 0,
        itemValue: computedTotals.taxable,
        total: rowsTotal,
        purchaseOrder: attrs.purchaseOrder || null,
        serialNo: attrs.serialNo || null,
        batchExpiry: attrs.batchExpiry || null,
        invoiceWorkflowStatus: attrs.invoiceWorkflowStatus || "invoice_completed",
        itemName: attrs.itemName || null,
        colourOption: attrs.colourOption || null,
        multiplePrice: attrs.multiplePrice || null,
        uploadBarcode: attrs.uploadBarcode || null,
        weight: attrs.weight || null,
        wastage: attrs.wastage || null,
        workingCharge: attrs.workingCharge || null,
        items: items.map((item) => ({
          sNo: item.sNo,
          size: item.size,
          designNo: item.designNo,
          qty: item.qty,
          cost: item.cost,
          pDis: item.pDis,
          marginPerc: item.marginPerc,
          margin: item.margin,
          mrp: item.mrp,
          price: item.price,
          amount: item.amount,
          sellingPrice: item.sellingPrice,
          discountPerc: item.discountPerc,
          finalPrice: item.finalPrice,
        })),
      };

      let savedEntry = null;
      if (isEditMode && editEntryId) {
        const res = await api.put(`/inventory-entries/${editEntryId}`, payload);
        savedEntry = res.data?.data || null;
      } else {
        const res = await api.post("/inventory-entries", payload);
        savedEntry = res.data?.data || null;
        if (savedEntry?.id) {
          setResolvedEditEntryId(Number(savedEntry.id));
        }
      }

      showToast("success", isEditMode ? "Inventory entry updated successfully!" : "Inventory entry saved successfully!");
      return true;
    } catch (err) {
      console.error("Save failed:", err);
      showToast("error", err.response?.data?.message || "Failed to save inventory entry");
      return false;
    }
  };

  const handleSave = async () => {
    if (!hasTransportEntry && !isEditMode) {
      showToast("error", "Cannot save without a transport entry. Open this page from the workflow.");
      return false;
    }
    if (!attrs.productId) {
      showToast("error", "Product is required");
      return false;
    }
    if (items.length === 0) {
      showToast("error", "Add at least one item before saving");
      return false;
    }

    // Validate mandatory attribute fields
    if (!validateMandatoryAttrs()) return false;

    // Check if total of all rows > invoice Total
    if (totalValue > 0 && rowsTotal > totalValue) {
      setConfirm({
        open: true,
        title: "Total Exceeds Invoice",
        message: `The total of added rows (${rowsTotal.toFixed(2)}) exceeds the invoice total (${totalValue.toFixed(2)}). Do you want to continue saving?`,
        onConfirm: async () => {
          setConfirm((prev) => ({ ...prev, open: false }));
          await doSave();
        },
      });
      return false;
    }

    return await doSave();
  };

  const handleSaveAndNext = async () => {
    if (!hasTransportEntry && !isEditMode) {
      showToast("error", "Cannot save without a transport entry. Open this page from the workflow.");
      return;
    }
    if (!attrs.productId) {
      showToast("error", "Product is required");
      return;
    }
    if (items.length === 0) {
      showToast("error", "Add at least one item before saving");
      return;
    }

    // Validate mandatory attribute fields
    if (!validateMandatoryAttrs()) return;

    const saveAndNavigate = async () => {
      const ok = await doSave();
      if (ok) {
        if (linkedTransportEntryId) {
          navigate(`/warehouse/barcode?transport_entry_id=${linkedTransportEntryId}`);
        } else {
          navigate("/warehouse/inventory-entry/search");
        }
      }
    };

    if (totalValue > 0 && rowsTotal > totalValue) {
      setConfirm({
        open: true,
        title: "Total Exceeds Invoice",
        message: `The total of added rows (${rowsTotal.toFixed(2)}) exceeds the invoice total (${totalValue.toFixed(2)}). Do you want to continue saving?`,
        onConfirm: async () => {
          setConfirm((prev) => ({ ...prev, open: false }));
          await saveAndNavigate();
        },
      });
      return;
    }

    await saveAndNavigate();
  };

  if (loading) {
    return <PageSkeleton variant="form" rows={10} />;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", px: 2, py: 1.25, bgcolor: "background.paper", borderBottom: 1, borderColor: "divider", boxShadow: 1 }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center" }}>
          <IconButton
            onClick={() => navigate(-1)}
            sx={{ color: "text.secondary" }}
            type="button"
            aria-label="Back to previous page"
          >
            <ArrowLeft size={16} />
          </IconButton>
          <Breadcrumbs
            sx={{ fontSize: 12.25, fontWeight: 600 }}
            items={[
              { label: "Warehouse", onClick: () => navigate("/warehouse") },
              { label: isViewMode ? "View Inventory Entry" : "Inventory Entry" },
            ]}
          />
        </Stack>
        <Stack direction="row" spacing={1} sx={{ alignItems: "center", fontSize: 12.25 }}>
          {!isViewMode && (
            <>
              <Button
                onClick={handleSave}
                className="glass-btn glass-btn-success"
                sx={{ display: "flex", alignItems: "center" }}
              >
                <Save size={16} style={{marginRight: 4}} /> Save
              </Button>
              <Button
                onClick={handleSaveAndNext}
                className="glass-btn glass-btn-primary"
                sx={{ display: "flex", alignItems: "center" }}
              >
                Save & Next
              </Button>
            </>
          )}
          <Button
            onClick={() => navigate("/warehouse/inventory-entry/search")}
            className="glass-btn glass-btn-primary"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <Search size={16} style={{marginRight: 4}} /> Search
          </Button>
          <Button
            onClick={() => navigate("/warehouse")}
            className="glass-btn glass-btn-secondary"
            sx={{ display: "flex", alignItems: "center" }}
          >
            <ArrowLeft size={16} style={{marginRight: 4}} /> Back
          </Button>
        </Stack>
      </Stack>

      {/* Main Content */}
      <Box sx={{ flex: 1, p: 2, overflowY: "auto" }}>
        <Stack direction="row" sx={{ bgcolor: "background.paper", borderRadius: "7px", border: "1px solid", borderColor: "divider", boxShadow: 1, minHeight: "calc(100vh - 120px)" }}>
          {/* LEFT SECTION: Product Attributes */}
          <Box sx={{ width: 420, flexShrink: 0, p: 1.5, borderRight: 1, borderColor: "divider", overflowY: "auto" }}>
            <Typography component="h2" sx={{ fontSize: 12.25, fontWeight: 700, color: "text.primary", borderBottom: 1, borderColor: "divider", pb: 1, mb: 1.5, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Product Attributes
            </Typography>

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1.5, rowGap: 0.5 }}>
              <Box sx={{ mb: 0.75 }}>
                <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
                  <Box component="span" sx={{ color: "error.main" }}>* </Box>Product
                </Typography>
                <AsyncSearchSelect
                  name="productId"
                  value={attrs.productId}
                  onChange={handleAttrChange}
                  options={products}
                  onAsyncSearch={handleAsyncProductSearch}
                  searchPlaceholder="Search product..."
                />
              </Box>
              <Box sx={{ mb: 0.75 }}>
                <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>
                  {mandatoryFields.has("brandId") && <Box component="span" sx={{ color: "error.main" }}>* </Box>}Brand
                </Typography>
                <AsyncSearchSelect
                  name="brandId"
                  value={attrs.brandId}
                  onChange={handleAttrChange}
                  options={brands}
                  onAsyncSearch={handleAsyncBrandSearch}
                  searchPlaceholder="Search brand..."
                />
              </Box>
              {marginMin !== null || marginMax !== null ? (
                <Box sx={{ gridColumn: "span 2", fontSize: 11, color: "text.secondary", mt: -0.5, mb: 0.5 }}>
                  Margin: {marginMin ?? "—"}% - {marginMax ?? "—"}%
                </Box>
              ) : null}
              <AttrText label="HSN Code" name="hsnCode" value={attrs.hsnCode} onChange={handleAttrChange} placeholder="Enter HSN" stacked />
              <AttrSelect label="Pattern" name="patternId" value={attrs.patternId} onChange={handleAttrChange} options={patterns} required={mandatoryFields.has("patternId")} stacked searchable searchPlaceholder="Search pattern..." />
              <AttrSelect label="Style" name="styleId" value={attrs.styleId} onChange={handleAttrChange} options={styles} required={mandatoryFields.has("styleId")} stacked searchable searchPlaceholder="Search style..." />
              <AttrSelect label="Fit" name="fitId" value={attrs.fitId} onChange={handleAttrChange} options={fits} required={mandatoryFields.has("fitId")} stacked searchable searchPlaceholder="Search fit..." />
              <AttrSelect label="Sleeve" name="sleeveId" value={attrs.sleeveId} onChange={handleAttrChange} options={sleeves} required={mandatoryFields.has("sleeveId")} stacked searchable searchPlaceholder="Search sleeve..." />
              <AttrSelect label="Type" name="typeId" value={attrs.typeId} onChange={handleAttrChange} options={types} required={mandatoryFields.has("typeId")} stacked searchable searchPlaceholder="Search type..." />
              <AttrSelect label="Material" name="materialId" value={attrs.materialId} onChange={handleAttrChange} options={materials} required={mandatoryFields.has("materialId")} stacked searchable searchPlaceholder="Search material..." />
              <AttrSelect label="Color" name="colorId" value={attrs.colorId} onChange={handleAttrChange} options={colors} required={mandatoryFields.has("colorId")} stacked searchable searchPlaceholder="Search color..." />
              <Box sx={{ mb: 0.75 }}>
                <Typography component="label" sx={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "text.secondary", mb: 0.5 }}>Tax</Typography>
                <AsyncSearchSelect
                  name="taxId"
                  value={attrs.taxId}
                  onChange={handleAttrChange}
                  options={taxes.map((t) => ({ id: t.id, name: `${t.name} ${t.tax_percentage}%` }))}
                  onAsyncSearch={handleAsyncTaxSearch}
                  searchPlaceholder="Search tax..."
                />
              </Box>
            </Box>

            {/* Dynamic mandatory/visible fields from product configuration */}
            {visibleDynamicFields.size > 0 && (
              <>
                <Box component="hr" sx={{ my: 1, border: 0, borderTop: 1, borderColor: "divider" }} />
                <Typography component="h3" sx={{ fontSize: 11, fontWeight: 600, color: "text.secondary", textTransform: "uppercase", letterSpacing: 0.5, mb: 0.5 }}>
                  Configured Attributes
                </Typography>
                <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1.5, rowGap: 0.5 }}>
                  {Object.entries(ATTR_FIELD_MAP)
                    .filter(([, m]) => m.dynamic && visibleDynamicFields.has(m.field))
                    .map(([, m]) => (
                      <AttrText
                        key={m.field}
                        label={m.label}
                        name={m.field}
                        value={attrs[m.field] || ""}
                        onChange={handleAttrChange}
                        placeholder={m.label}
                        required={mandatoryFields.has(m.field)}
                        stacked
                      />
                    ))}
                </Box>
              </>
            )}

            <Box component="hr" sx={{ my: 1, border: 0, borderTop: 1, borderColor: "divider" }} />

            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 1.5, rowGap: 0.5 }}>
              <AttrText label="Buying Price" name="buyingPrice" value={attrs.buyingPrice} onChange={handleAttrChange} placeholder="0.00" stacked />
              <AttrText label="Exp.Margin" name="expMargin" value={attrs.expMargin} onChange={handleAttrChange} placeholder="0.00" stacked />
              <AttrText label="P.Tax" name="pTax" value={attrs.pTax} onChange={handleAttrChange} placeholder="0.00" stacked />
              <AttrText label="S.Tax" name="sTax" value={attrs.sTax} onChange={handleAttrChange} placeholder="0.00" stacked />
              <AttrText label="Discount %" name="discount" value={attrs.discount} onChange={handleAttrChange} placeholder="0" stacked />
            </Box>
          </Box>

          {/* RIGHT SECTION: Item Entry Grid */}
          <Box sx={{ flex: 1, p: 1, minWidth: 0 }}>
            {/* Supplier / Item Value / Total Bar */}
            <Box sx={{ mb: 1, overflow: "hidden", borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) }}>
              <Stack direction="row" sx={{ alignItems: "stretch" }}>
                <Box sx={{ flex: 1, display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" }, gap: "1px", bgcolor: "divider" }}>
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), px: 1.25, py: 0.75 }}>
                    <Typography sx={{ fontSize: 12.25, fontWeight: 600, textTransform: "uppercase", color: "text.secondary" }}>Supplier</Typography>
                    <Typography sx={{ fontSize: 12.25, fontWeight: 700, color: "text.primary", textAlign: "right" }}>
                      {hasTransportEntry ? (
                        supplierName || "-"
                      ) : (
                        <Box component="span" sx={{ color: "error.main", fontWeight: 400 }}>No transport entry linked</Box>
                      )}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), px: 1.25, py: 0.75 }}>
                    <Typography sx={{ fontSize: 12.25, fontWeight: 600, textTransform: "uppercase", color: "text.secondary" }}>Item Value</Typography>
                    <Typography sx={{ fontSize: 12.25, fontWeight: 700, color: "primary.main" }}>
                      {formatMoney(itemValue || computedTotals.taxable)}
                    </Typography>
                  </Stack>
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between", gap: 1, bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), px: 1.25, py: 0.75 }}>
                    <Typography sx={{ fontSize: 12.25, fontWeight: 600, textTransform: "uppercase", color: "text.secondary" }}>Total</Typography>
                    <Typography sx={{ fontSize: 12.25, fontWeight: 700, color: "primary.main" }}>
                      {formatMoney(totalValue || rowsTotal)}
                    </Typography>
                  </Stack>
                </Box>
                <Box
                  component="button"
                  type="button"
                  onClick={() => setSummaryExpanded((prev) => !prev)}
                  sx={{ display: "flex", width: 40, flexShrink: 0, alignItems: "center", justifyContent: "center", borderLeft: 1, borderColor: "divider", bgcolor: "background.paper", color: "text.secondary", transition: "background-color 0.15s", cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                  aria-expanded={summaryExpanded}
                  aria-label={summaryExpanded ? "Collapse inventory linked details" : "Expand inventory linked details"}
                  title={summaryExpanded ? "Collapse details" : "Expand details"}
                >
                  <ChevronDown size={16} style={{ transition: "transform 0.15s", transform: summaryExpanded ? "rotate(180deg)" : undefined }} />
                </Box>
              </Stack>

              {summaryExpanded && (
                <Box sx={{ borderTop: 1, borderColor: "divider", bgcolor: "background.paper", p: 1.25 }}>
                  <Box sx={{ display: "grid", gap: 1.5, gridTemplateColumns: { xl: "330px minmax(0,1fr)" } }}>
                    <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", columnGap: 2, rowGap: 0.75 }}>
                      <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>INV.NO</Typography>
                        <Typography sx={{ fontSize: 12.25, color: "text.primary" }}>{invoiceSummary?.invoice_no || "-"}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Date</Typography>
                        <Typography sx={{ fontSize: 12.25, color: "text.primary" }}>{formatDisplayDate(invoiceSummary?.invoice_date)}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>LR NO</Typography>
                        <Typography sx={{ fontSize: 12.25, color: "text.primary" }}>{transportSummary?.lr_no || "-"}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Entry No</Typography>
                        <Typography sx={{ fontSize: 12.25, color: "text.primary" }}>{transportSummary?.lr_entry_no || "-"}</Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Bundles</Typography>
                        <Typography sx={{ fontSize: 12.25, color: "text.primary" }}>
                          {invoiceSummary?.bundles ?? transportSummary?.no_of_bundles ?? "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Pieces</Typography>
                        <Typography sx={{ fontSize: 12.25, color: "text.primary" }}>
                          {invoiceSummary?.pieces ?? transportSummary?.no_of_pieces ?? "-"}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Freight</Typography>
                        <Typography sx={{ fontSize: 12.25, color: "text.primary" }}>
                          {formatMoney(invoiceSummary?.lr_expense ?? transportSummary?.freight_charge_amount ?? 0)}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "text.secondary" }}>Loading</Typography>
                        <Typography sx={{ fontSize: 12.25, color: "text.primary" }}>
                          {formatMoney(transportSummary?.loading_charge_amount ?? 0)}
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ overflowX: "auto", borderRadius: "3.5px", border: "1px solid", borderColor: "divider" }}>
                      <Table size="small" sx={{ minWidth: "100%", fontSize: 12.25 }}>
                        <TableHead sx={{ bgcolor: "action.hover" }}>
                          <TableRow>
                            <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "left", fontWeight: 700, fontSize: 12.25 }}>Type</TableCell>
                            <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "left", fontWeight: 700, fontSize: 12.25 }}>Tax %</TableCell>
                            <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "right", fontWeight: 700, fontSize: 12.25 }}>Amount</TableCell>
                            <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "right", fontWeight: 700, fontSize: 12.25 }}>Discnt</TableCell>
                            <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "right", fontWeight: 700, fontSize: 12.25 }}>Tax</TableCell>
                            <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "right", fontWeight: 700, fontSize: 12.25 }}>Total</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {invoiceSummary?.items?.length ? (
                            invoiceSummary.items.map((row) => {
                              const amountOn = Number(row.amount_on) || 0;
                              const discountAmount = Number(row.discount) || 0;
                              const discountPerc = Number(row.dis_perc) || 0;
                              const taxPerc = Number(row.tax_perc) || 0;
                              const taxAmount = ((amountOn - discountAmount) * taxPerc) / 100;
                              const totalAmount = Number(row.net_amount) || amountOn - discountAmount + taxAmount;

                              return (
                                <TableRow key={row.id} sx={{ color: "text.primary" }}>
                                  <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, fontSize: 12.25 }}>{row.type || "-"}</TableCell>
                                  <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, fontSize: 12.25 }}>{taxPerc.toFixed(2)}%</TableCell>
                                  <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "right", fontSize: 12.25 }}>{formatMoney(amountOn)}</TableCell>
                                  <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "right", fontSize: 12.25 }}>
                                    {`${formatMoney(discountAmount)}@${discountPerc.toFixed(2)}%`}
                                  </TableCell>
                                  <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "right", fontSize: 12.25 }}>{formatMoney(taxAmount)}</TableCell>
                                  <TableCell sx={{ borderBottom: 1, borderColor: "divider", px: 1, py: 0.75, textAlign: "right", fontSize: 12.25 }}>{formatMoney(totalAmount)}</TableCell>
                                </TableRow>
                              );
                            })
                          ) : (
                            <TableRow>
                              <TableCell colSpan={6} sx={{ px: 1.5, py: 2, textAlign: "center", fontSize: 12.25, color: "text.disabled" }}>
                                No invoice detail found.
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </Box>
                  </Box>
                </Box>
              )}
            </Box>

            <Box sx={{ overflow: "visible", mb: 1, position: "relative", zIndex: 40 }}>
              <Box sx={{ minWidth: 0 }}>
                {/* Entry Row Header Labels — widths match table columns */}
                <Stack direction="row" sx={{ fontSize: 11, fontWeight: 600, color: "error.main", alignItems: "center", mb: 0.25 }}>
                  <Box sx={{ px: 0.5, py: 0.25, width: 40, flexShrink: 0, textAlign: "center" }}>S.No</Box>
                  <Box sx={{ px: 0.5, py: 0.25, width: 80, flexShrink: 0 }}>Size</Box>
                  <Box sx={{ px: 0.5, py: 0.25, width: 80, flexShrink: 0 }}>Design No</Box>
                  <Box sx={{ px: 0.5, py: 0.25, width: 64, flexShrink: 0 }} />
                  <Box sx={{ px: 0.5, py: 0.25, width: 48, flexShrink: 0, textAlign: "right" }}>Qty</Box>
                  <Box sx={{ px: 0.5, py: 0.25, width: 80, flexShrink: 0, textAlign: "right" }}>Cost</Box>
                  <Box sx={{ px: 0.5, py: 0.25, width: 56, flexShrink: 0 }} />
                  <Box sx={{ px: 0.5, py: 0.25, width: 64, flexShrink: 0, textAlign: "right" }}>Mrgn%</Box>
                  <Box sx={{ px: 0.5, py: 0.25, width: 64, flexShrink: 0, textAlign: "right" }}>Sale</Box>
                  <Box sx={{ px: 0.5, py: 0.25, width: 64, flexShrink: 0, textAlign: "right" }}>MRP</Box>
                  <Box sx={{ px: 0.5, py: 0.25, width: 56, flexShrink: 0, textAlign: "right" }}>Dis%</Box>
                  <Box sx={{ px: 0.5, py: 0.25, width: 64, flexShrink: 0, textAlign: "right" }}>Final</Box>
                  <Box sx={{ px: 0.5, py: 0.25, width: 80, flexShrink: 0 }} />
                  <Box sx={{ px: 0.5, py: 0.25, width: 64, flexShrink: 0 }} />
                </Stack>

                {/* Entry Row — widths match table columns */}
                <Stack direction="row" sx={{ alignItems: "center", bgcolor: "action.hover", border: "1px solid", borderColor: "divider", borderRadius: "3.5px", px: 0.5, py: 0.25 }}>
                  <Box sx={{ p: 0.25, width: 40, flexShrink: 0 }}>
                    <TextField
                      type="text"
                      value={currentItem.sNo}
                      slotProps={{ input: { readOnly: true } }}
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "center" } }]}
                    />
                  </Box>
                  <Box sx={{ p: 0.25, width: 80, flexShrink: 0 }}>
                    <SearchableSizeSelect
                      value={currentItem.size}
                      onChange={handleSizeChange}
                      sizes={sizes}
                      sizeGroups={sizeGroups}
                      onJump={() => setJumpOpen(true)}
                    />
                  </Box>
                  <Box sx={{ p: 0.25, width: 80, flexShrink: 0 }}>
                    <TextField
                      type="text"
                      name="designNo"
                      value={currentItem.designNo}
                      onChange={handleItemChange}
                      placeholder="Design No"
                      size="small"
                      fullWidth
                      sx={muiFieldSx}
                    />
                  </Box>
                  <Box sx={{ p: 0.25, width: 64, flexShrink: 0 }} />
                  <Box sx={{ p: 0.25, width: 48, flexShrink: 0 }}>
                    <TextField
                      type="number"
                      name="qty"
                      value={currentItem.qty}
                      onChange={handleItemChange}
                      placeholder="0"
                      slotProps={{ input: { readOnly: Boolean(currentItem.jumpSizes?.length) } }}
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" }, ...(currentItem.jumpSizes?.length ? { "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { textAlign: "right", color: "text.disabled" } } : {}) }]}
                    />
                  </Box>
                  <Box sx={{ p: 0.25, width: 80, flexShrink: 0 }}>
                    <TextField
                      type="number"
                      name="cost"
                      value={currentItem.cost}
                      onChange={handleItemChange}
                      placeholder="0.00"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ p: 0.25, width: 56, flexShrink: 0 }} />
                  <Box sx={{ p: 0.25, width: 64, flexShrink: 0 }}>
                    <TextField
                      type="number"
                      name="marginPerc"
                      value={currentItem.marginPerc}
                      onChange={handleItemChange}
                      placeholder="0"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ p: 0.25, width: 64, flexShrink: 0 }}>
                    <TextField
                      type="text"
                      value={currentItem.sellingPrice || ""}
                      slotProps={{ input: { readOnly: true } }}
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { textAlign: "right", color: "text.disabled" } }]}
                    />
                  </Box>
                  <Box sx={{ p: 0.25, width: 64, flexShrink: 0 }}>
                    <TextField
                      type="text"
                      value={currentItem.mrp || ""}
                      slotProps={{ input: { readOnly: true } }}
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { textAlign: "right", color: "text.disabled" } }]}
                    />
                  </Box>
                  <Box sx={{ p: 0.25, width: 56, flexShrink: 0 }}>
                    <TextField
                      type="number"
                      name="discountPerc"
                      value={currentItem.discountPerc}
                      onChange={handleItemChange}
                      placeholder="0"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ p: 0.25, width: 64, flexShrink: 0 }}>
                    <TextField
                      type="text"
                      value={currentItem.finalPrice || ""}
                      slotProps={{ input: { readOnly: true } }}
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-root": { bgcolor: "action.hover" }, "& .MuiInputBase-input": { textAlign: "right", color: "text.disabled" } }]}
                    />
                  </Box>
                  <Box sx={{ p: 0.25, width: 80, flexShrink: 0 }} />
                  <Box sx={{ p: 0.25, width: 64, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Button
                      onClick={handleAddItem}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddItem();
                        }
                      }}
                      className="glass-btn"
                      sx={{ width: 28, height: 28, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                      title={editIndex !== null ? "Update Item" : "Add Item"}
                    >
                      <Plus size={16} />
                    </Button>
                  </Box>
                </Stack>
              </Box>
            </Box>

            {/* Items Table */}
            <Box sx={{ position: "relative", zIndex: 0 }}>
              <Box sx={{ overflow: "hidden", borderRadius: "3.5px 3.5px 0 0", border: "1px solid", borderBottom: 0, borderColor: "divider" }}>
                <Stack direction="row" sx={{ bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08), fontSize: 11, fontWeight: 600, color: "text.secondary", borderBottom: 1, borderColor: "divider" }}>
                  <Box sx={{ px: 1, py: 0.75, width: 40, borderRight: 1, borderColor: "divider", textAlign: "center" }}>S.No</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 80, borderRight: 1, borderColor: "divider" }}>Size</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 80, borderRight: 1, borderColor: "divider" }}>Design</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 64, borderRight: 1, borderColor: "divider" }}>HSN</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 48, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Qty</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 80, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Cost</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 56, borderRight: 1, borderColor: "divider", textAlign: "right" }}>P.Dis</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 64, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Mrgn%</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 64, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Sale</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 64, borderRight: 1, borderColor: "divider", textAlign: "right" }}>MRP</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 56, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Dis%</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 64, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Final</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 80, borderRight: 1, borderColor: "divider", textAlign: "right" }}>Amount</Box>
                  <Box sx={{ px: 1, py: 0.75, width: 64, textAlign: "center" }}>Actions</Box>
                </Stack>

                <Stack direction="row" sx={{ bgcolor: (theme) => alpha(theme.palette.info.main, theme.palette.mode === "dark" ? 0.12 : 0.06), borderBottom: 1, borderColor: "divider" }}>
                  <Box sx={{ px: 1, py: 0.5, width: 40, borderRight: 1, borderColor: "divider" }} />
                  <Box sx={{ px: 1, py: 0.5, width: 80, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.size}
                      onChange={(event) => handleItemFilterChange("size", event.target.value)}
                      placeholder="Search size"
                      size="small"
                      fullWidth
                      sx={muiFieldSx}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 80, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.designNo}
                      onChange={(event) => handleItemFilterChange("designNo", event.target.value)}
                      placeholder="Search design"
                      size="small"
                      fullWidth
                      sx={muiFieldSx}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 64, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.hsnCode}
                      onChange={(event) => handleItemFilterChange("hsnCode", event.target.value)}
                      placeholder="HSN"
                      size="small"
                      fullWidth
                      sx={muiFieldSx}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 48, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.qty}
                      onChange={(event) => handleItemFilterChange("qty", event.target.value)}
                      placeholder="Qty"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 80, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.cost}
                      onChange={(event) => handleItemFilterChange("cost", event.target.value)}
                      placeholder="Cost"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 56, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.pDis}
                      onChange={(event) => handleItemFilterChange("pDis", event.target.value)}
                      placeholder="P.Dis"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 64, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.marginPerc}
                      onChange={(event) => handleItemFilterChange("marginPerc", event.target.value)}
                      placeholder="Margin"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 64, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.sellingPrice}
                      onChange={(event) => handleItemFilterChange("sellingPrice", event.target.value)}
                      placeholder="Sale"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 64, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.mrp}
                      onChange={(event) => handleItemFilterChange("mrp", event.target.value)}
                      placeholder="MRP"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 56, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.discountPerc}
                      onChange={(event) => handleItemFilterChange("discountPerc", event.target.value)}
                      placeholder="Dis%"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 64, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.finalPrice}
                      onChange={(event) => handleItemFilterChange("finalPrice", event.target.value)}
                      placeholder="Final"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 80, borderRight: 1, borderColor: "divider" }}>
                    <TextField
                      type="text"
                      value={itemFilters.amount}
                      onChange={(event) => handleItemFilterChange("amount", event.target.value)}
                      placeholder="Amount"
                      size="small"
                      fullWidth
                      sx={[muiFieldSx, { "& .MuiInputBase-input": { textAlign: "right" } }]}
                    />
                  </Box>
                  <Box sx={{ px: 1, py: 0.5, width: 64, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "text.secondary" }}>
                    Search
                  </Box>
                </Stack>
              </Box>

              <Box sx={{ height: 340, overflowY: "auto", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", scrollbarGutter: "stable" }}>
                {filteredItems.length === 0 ? (
                  <Box sx={{ display: "flex", height: "100%", alignItems: "center", justifyContent: "center", px: 2, textAlign: "center", fontSize: 12.25, color: "text.disabled" }}>
                    {items.length === 0
                      ? hasTransportEntry
                        ? "No items added yet. Use the entry row above to add items."
                        : "Open this page from the warehouse workflow to add inventory items."
                      : "No items match the current search."}
                  </Box>
                ) : (
                  filteredItems.map(({ item, index }) => (
                    <Stack
                      key={item.id}
                      direction="row"
                      sx={{
                        fontSize: 12.25,
                        color: "text.primary",
                        borderBottom: 1,
                        borderColor: "divider",
                        "&:hover": { bgcolor: "action.hover" },
                        ...(editIndex === index ? { bgcolor: (theme) => alpha(theme.palette.primary.main, theme.palette.mode === "dark" ? 0.16 : 0.08) } : {}),
                      }}
                    >
                      <Box sx={{ px: 1, py: 0.75, width: 40, borderRight: 1, borderColor: "divider", textAlign: "center" }}>{item.sNo}</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 80, borderRight: 1, borderColor: "divider", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.size || "-"}</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 80, borderRight: 1, borderColor: "divider", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.designNo || "-"}</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 64, borderRight: 1, borderColor: "divider", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.hsnCode || attrs.hsnCode || "-"}</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 48, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.qty}</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 80, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{formatMoney(item.cost)}</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 56, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{formatMoney(item.pDis)}</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 64, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.marginPerc || 0}%</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 64, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{formatMoney(item.sellingPrice)}</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 64, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{formatMoney(item.mrp)}</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 56, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{item.discountPerc || 0}%</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 64, borderRight: 1, borderColor: "divider", textAlign: "right" }}>{formatMoney(item.finalPrice)}</Box>
                      <Box sx={{ px: 1, py: 0.75, width: 80, borderRight: 1, borderColor: "divider", textAlign: "right", fontWeight: 500 }}>{formatMoney(item.amount)}</Box>
                      <Stack direction="row" spacing={0.5} sx={{ px: 1, py: 0.75, width: 64, alignItems: "center", justifyContent: "center" }}>
                        <IconButton
                          onClick={() => handleEditItem(index)}
                          size="small"
                          sx={{ color: "primary.main", p: 0.25 }}
                          title="Edit"
                        >
                          <Pencil size={12} />
                        </IconButton>
                        <IconButton
                          onClick={() => handleRemoveItem(index)}
                          size="small"
                          sx={{ color: "error.main", p: 0.25 }}
                          title="Delete"
                        >
                          <Trash2 size={12} />
                        </IconButton>
                      </Stack>
                    </Stack>
                  ))
                )}
              </Box>

            </Box>

            <Stack direction="row" sx={{ mt: 1, alignItems: "center", justifyContent: "space-between", gap: 1.5, borderRadius: "3.5px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper", px: 1.5, py: 1, fontSize: 12.25, fontWeight: 700 }}>
              <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", alignItems: "center" }}>
                <Box component="span" sx={{ color: "error.dark" }}>TOTAL <Box component="span" sx={{ ml: 0.5, color: "success.main" }}>{formatMoney(rowsTotal)}</Box></Box>
                <Box component="span" sx={{ color: "error.dark" }}>Taxable <Box component="span" sx={{ ml: 0.5, color: "warning.main" }}>{formatMoney(computedTotals.taxable)}</Box></Box>
                <Box component="span" sx={{ color: "error.dark" }}>Tax <Box component="span" sx={{ ml: 0.5, color: "error.light" }}>{formatMoney(taxAmount)}</Box></Box>
                <Box component="span" sx={{ color: "error.dark" }}>Discount <Box component="span" sx={{ ml: 0.5, color: "error.light" }}>{formatMoney(computedTotals.discount)}</Box></Box>
                <Box component="span" sx={{ color: "error.dark" }}>Qty <Box component="span" sx={{ ml: 0.5, color: "error.main" }}>{formatMoney(computedTotals.qty)}</Box></Box>
              </Stack>

              <TextField
                select
                name="invoiceWorkflowStatus"
                value={attrs.invoiceWorkflowStatus}
                onChange={handleAttrChange}
                size="small"
                sx={[muiFieldSx, { minWidth: 210, "& .MuiInputBase-input": { fontWeight: 500 } }]}
              >
                {WORKFLOW_STATUS_OPTIONS.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            </Stack>
          </Box>
        </Stack>
      </Box>

      {/* Jump Size Dialog */}
      <JumpSizeDialog
        open={jumpOpen}
        onClose={() => setJumpOpen(false)}
        onApply={handleJumpApply}
        defaultQty={currentItem.qty || "1"}
      />

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={confirm.open}
        title={confirm.title}
        message={confirm.message}
        confirmLabel="Continue"
        danger={false}
        onConfirm={confirm.onConfirm}
        onCancel={() => setConfirm((prev) => ({ ...prev, open: false }))}
      />

      <Toast
        open={toast.open}
        type={toast.type}
        message={toast.message}
        onClose={() => setToast((prev) => ({ ...prev, open: false }))}
      />
    </Box>
  );
};

export default InventoryEntry;

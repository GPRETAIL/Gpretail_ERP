import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Box } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";

/**
 * Dropdown select with a search box that debounce-fetches from the server via `onAsyncSearch`,
 * for fields backed by large tables where a fixed client-preloaded option list can't cover every
 * real match (suppliers, transports, products, etc. at 100k+ row scale). Falls back to pure
 * client-side filtering of `options` when `onAsyncSearch` isn't given (small/fixed lists).
 *
 * Server results from onAsyncSearch are trusted as-is, never re-filtered client-side: the backend
 * typically searches more columns (barcode/sku, phone/gstin/company_name, vehicle_no, ...) than a
 * cheap client-side check can reproduce, so re-narrowing them here would silently drop correct
 * matches. Only the locally-cached `options` -- never server-filtered for this specific query --
 * get a client-side (best-effort, broadened) match.
 *
 * triggerSx / searchInputSx {object} -- sx overrides merged onto the trigger button / search input's
 * base sx, same convention as SearchableSelect's own triggerSx/searchInputSx, so a page can size
 * both components identically when they sit side by side.
 */
const AsyncSearchSelect = ({ name, value, onChange, options, onAsyncSearch, placeholder = "Select...", searchPlaceholder = "Search...", disabled = false, triggerSx = {}, searchInputSx = {} }) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const containerRef = useRef(null);
  const triggerRef = useRef(null);
  const listRef = useRef(null);
  const keyboardSelectionArmedRef = useRef(false);
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [asyncResults, setAsyncResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  const safeOptions = useMemo(() => (Array.isArray(options) ? options : []), [options]);

  const combinedOptions = useMemo(() => {
    if (!asyncResults.length) return safeOptions;
    const existingIds = new Set(safeOptions.map((o) => String(o?.id || o?.value || "")));
    const uniqueAsync = asyncResults.filter((o) => !existingIds.has(String(o?.id || o?.value || "")));
    return [...uniqueAsync, ...safeOptions];
  }, [safeOptions, asyncResults]);

  const normalizedSearch = searchTerm.trim().toLowerCase();
  // Broadened beyond name/code to every column any caller's backend resource commonly searches
  // (barcode/sku for products, phone/email/gstin/company_name for suppliers, vehicle_no for
  // transports, printing_name, contact_person, ...) so a cached item isn't missed just because
  // this check is narrower than the server's.
  const matchesLocally = (opt) => {
    const haystack = [
      opt?.name, opt?.label, opt?.code, opt?.barcode, opt?.sku,
      opt?.phone, opt?.email, opt?.gstin, opt?.company_name, opt?.contact_person,
      opt?.vehicle_no, opt?.printing_name,
    ].filter(Boolean).join(" ").toLowerCase();
    return haystack.includes(normalizedSearch);
  };
  const filtered = useMemo(() => {
    if (!normalizedSearch) return safeOptions;
    const localMatches = safeOptions.filter(matchesLocally);
    if (!onAsyncSearch) return localMatches;
    const asyncIds = new Set(asyncResults.map((o) => String(o?.id || o?.value || "")));
    const localOnly = localMatches.filter((opt) => !asyncIds.has(String(opt?.id || opt?.value || "")));
    return [...asyncResults, ...localOnly];
  }, [safeOptions, asyncResults, normalizedSearch, onAsyncSearch]);

  const finalOptions = useMemo(() => filtered.slice(0, 100), [filtered]);
  const totalItems = finalOptions.length + 1;

  const getLabel = (opt) => opt?.name || opt?.label || "";
  const getId = (opt) => String(opt?.id || opt?.value || "");
  const selectedLabel = useMemo(() => {
    const sel = combinedOptions.find((o) => String(o?.id || o?.value) === String(value));
    return sel ? getLabel(sel) : "";
  }, [combinedOptions, value]);

  useEffect(() => {
    if (!onAsyncSearch || !open || normalizedSearch.length < 1) {
      setAsyncResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    const timer = setTimeout(async () => {
      try {
        const results = await onAsyncSearch(normalizedSearch);
        if (Array.isArray(results)) {
          setAsyncResults(results);
        }
      } catch (err) {
        console.error("Async search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [onAsyncSearch, open, normalizedSearch]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (containerRef.current && !containerRef.current.contains(e.target)) { setOpen(false); setSearchTerm(""); setHighlightedIndex(-1); } };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
  }, [searchTerm]);
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
    const focusables = Array.from(scope.querySelectorAll(
      "input:not([type='hidden']):not([disabled]):not([readonly]):not([tabindex='-1']),select:not([disabled]):not([tabindex='-1']),textarea:not([disabled]):not([readonly]):not([tabindex='-1']),button:not([disabled]):not([tabindex='-1']),[tabindex]:not([tabindex='-1'])"
    )).filter((el) => el.offsetWidth || el.offsetHeight || el.getClientRects().length);
    const idx = focusables.indexOf(trigger);
    if (idx >= 0 && idx < focusables.length - 1) {
      const next = focusables[idx + 1];
      next.focus();
      if (next instanceof HTMLElement && next.dataset.searchableSelectTrigger === "true") next.click();
      if (next instanceof HTMLInputElement) {
        if (["date", "datetime-local", "month", "time", "week"].includes(next.type)) {
          try {
            if (typeof next.showPicker === "function") next.showPicker();
            else next.click();
          } catch {
            // ignore browser-level picker restrictions
          }
          return;
        }
        if (!["checkbox", "radio", "button", "submit"].includes(next.type)) next.select();
      }
    }
  };

  const selectVal = (v) => {
    onChange({ target: { name, value: String(v) } });
    setOpen(false); setSearchTerm(""); setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
    setTimeout(() => focusNextField(), 50);
  };

  const closeDropdown = () => {
    setOpen(false);
    setSearchTerm("");
    setHighlightedIndex(-1);
    keyboardSelectionArmedRef.current = false;
  };

  const moveToNextField = () => {
    closeDropdown();
    setTimeout(() => focusNextField(), 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Escape") { closeDropdown(); setTimeout(() => triggerRef.current?.focus(), 0); return; }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      keyboardSelectionArmedRef.current = true;
      setHighlightedIndex((p) => (p < totalItems - 1 ? p + 1 : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      keyboardSelectionArmedRef.current = true;
      setHighlightedIndex((p) => (p > 0 ? p - 1 : totalItems - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault(); e.stopPropagation();
      if (keyboardSelectionArmedRef.current) {
        if (highlightedIndex === 0) { selectVal(""); return; }
        if (highlightedIndex > 0 && highlightedIndex <= finalOptions.length) { selectVal(getId(finalOptions[highlightedIndex - 1])); return; }
      }
      moveToNextField();
    }
  };

  const handleTriggerKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      if (open) {
        if (keyboardSelectionArmedRef.current) {
          if (highlightedIndex === 0) { selectVal(""); return; }
          if (highlightedIndex > 0 && highlightedIndex <= finalOptions.length) { selectVal(getId(finalOptions[highlightedIndex - 1])); return; }
        }
        moveToNextField();
        return;
      }
      focusNextField();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = true;
      setOpen(true);
      setHighlightedIndex((prev) => (prev >= 0 ? prev : 0));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = true;
      setOpen(true);
      setHighlightedIndex((prev) => (prev >= 0 ? prev : Math.max(totalItems - 1, 0)));
      return;
    }
    if (e.key === " ") {
      e.preventDefault();
      e.stopPropagation();
      keyboardSelectionArmedRef.current = false;
      setOpen(true);
      setHighlightedIndex(-1);
    }
  };

  const highlightBg = alpha(theme.palette.primary.main, isDark ? 0.16 : 0.08);
  const selectedText = isDark ? "#60a5fa" : "#1d4ed8";

  return (
    <Box ref={containerRef} data-enter-ignore="true" sx={{ position: "relative", width: "100%" }}>
      <Box
        component="button"
        ref={triggerRef}
        type="button"
        data-searchable-select-trigger="true"
        disabled={disabled}
        onClick={() => { if (disabled) return; keyboardSelectionArmedRef.current = false; setOpen((p) => !p); setHighlightedIndex(-1); }}
        onKeyDown={(e) => { if (disabled) return; handleTriggerKeyDown(e); }}
        sx={{
          width: "100%", border: "1px solid", borderColor: "divider", borderRadius: "2px", px: 0.5, py: 0.5,
          fontSize: 10.5, bgcolor: "background.paper", textAlign: "left", display: "flex", alignItems: "center",
          justifyContent: "space-between", opacity: disabled ? 0.6 : 1, cursor: disabled ? "not-allowed" : "pointer",
          "&:focus": { outline: "none", borderColor: "#3b82f6", boxShadow: "0 0 0 1px #3b82f6" },
          ...triggerSx,
        }}
      >
        <Box component="span" sx={{ color: selectedLabel ? "text.primary" : "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 10.5 }}>{selectedLabel || placeholder}</Box>
        <ChevronDown size={12} style={{ color: isDark ? "#64748b" : "#9ca3af", flexShrink: 0, transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
      </Box>
      {open && !disabled && (
        <Box sx={{ position: "absolute", zIndex: 50, left: 0, top: "100%", mt: 0.25, width: "100%", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "4px", boxShadow: 4, minWidth: 160 }}>
          <Box sx={{ p: 0.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 0.5 }}>
            <Search size={12} style={{ color: isDark ? "#64748b" : "#9ca3af", flexShrink: 0 }} />
            <Box
              component="input"
              autoFocus
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder}
              sx={{
                width: "100%", fontSize: 10.5, outline: "none", bgcolor: "transparent", color: "text.secondary",
                "&::placeholder": { color: "text.disabled" },
                ...searchInputSx,
              }}
            />
            {isSearching && (
              <Box component="span" sx={{ fontSize: 10, color: "#3b82f6", fontWeight: 500, flexShrink: 0, px: 0.5, animation: "app-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite" }}>Searching...</Box>
            )}
          </Box>
          <Box component="ul" ref={listRef} sx={{ maxHeight: 208, overflowY: "auto" }}>
            <Box
              component="li"
              onClick={() => selectVal("")}
              sx={{
                px: 1, py: 0.5, fontSize: 10.5, color: "text.secondary", cursor: "pointer",
                bgcolor: highlightedIndex === 0 ? highlightBg : "transparent",
                "&:hover": highlightedIndex === 0 ? {} : { bgcolor: alpha(theme.palette.primary.main, 0.04) },
              }}
            >{placeholder}</Box>
            {finalOptions.map((opt, idx) => {
              const isHighlighted = highlightedIndex === idx + 1;
              const isSelected = getId(opt) === String(value);
              return (
                <Box
                  component="li"
                  key={getId(opt)}
                  onClick={() => selectVal(getId(opt))}
                  sx={{
                    px: 1, py: 0.5, fontSize: 10.5, cursor: "pointer",
                    bgcolor: isHighlighted || isSelected ? highlightBg : "transparent",
                    color: isHighlighted || isSelected ? selectedText : "text.secondary",
                    fontWeight: isHighlighted || isSelected ? 500 : 400,
                    "&:hover": isHighlighted || isSelected ? {} : { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                  }}
                >{getLabel(opt)}</Box>
              );
            })}
          </Box>
          {filtered.length > 100 && (
            <Box sx={{ px: 1, py: 0.25, fontSize: 10, color: "text.disabled", bgcolor: alpha(theme.palette.text.primary, 0.02), textAlign: "center", borderTop: "1px solid", borderColor: "divider" }}>
              Showing top 100 of {filtered.length} (type to narrow)
            </Box>
          )}
        </Box>
      )}
    </Box>
  );
};

export default AsyncSearchSelect;

import { ChevronDown, Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Box } from "@mui/material";
import { useTheme, alpha } from "@mui/material/styles";
import { SEARCHABLE_TRIGGER_SX, SEARCHABLE_INPUT_SX } from "../theme/formControlSizes";

/**
 * SearchableSelect — drop-in replacement for a plain <select>.
 * Renders a styled dropdown with a search box at the top.
 *
 * Props:
 *   label            {string}
 *   name             {string}
 *   options          {Array<{label, value}>}
 *   value            {string}
 *   onChange         {function(e)}  — fires a synthetic event {target:{name,value}}
 *   required         {boolean}
 *   placeholder      {string}
 *   portalDropdown   {boolean} — render menu in document.body with fixed position (use inside overflow-hidden modals)
 *   triggerSx        {object} — sx overrides merged onto the trigger button's base sx. Defaults to
 *                     the app's shared common size (theme/formControlSizes.js) -- only pass this
 *                     when a page genuinely needs to differ (e.g. larger touch targets), not to
 *                     restate the common size.
 *   searchInputSx    {object} — sx overrides merged onto the search input's base sx. Same default.
 */
const SearchableSelect = ({
  label,
  name,
  options = [],
  value,
  onChange,
  required = false,
  placeholder,
  showEmptyOption = true,
  creatable = false,
  triggerSx = SEARCHABLE_TRIGGER_SX,
  searchInputSx = SEARCHABLE_INPUT_SX,
  portalDropdown = false,
  openOnFocus = false,
}) => {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [dropdownPlacement, setDropdownPlacement] = useState(null);
  const containerRef = useRef(null);
  const dropdownPortalRef = useRef(null);
  const keyboardSelectionArmedRef = useRef(false);

  const normalizedOptions = options.map((o) =>
    typeof o === "string" ? { label: o, value: o } : o
  );

  const selectedLabel =
    normalizedOptions.find((o) => !o.disabled && !o.divider && o.value === value)?.label || (creatable && value ? value : "");

  const hasSearch = search.trim().length > 0;
  const filtered = hasSearch
    ? normalizedOptions.filter(
      (o) =>
        !o.disabled &&
        !o.divider &&
        (o.label || "").toLowerCase().includes(search.toLowerCase())
    )
    : normalizedOptions;
  const selectableOptions = filtered.filter((o) => !o.disabled && !o.divider);
  const hasAnySelectableOptions = normalizedOptions.some((o) => !o.disabled && !o.divider);

  const triggerRef = useRef(null);

  const measurePortalPlacement = () => {
    const el = triggerRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom - 8;
    return {
      top: r.bottom + 4,
      left: r.left,
      width: Math.max(r.width, 220),
      maxHeight: Math.min(320, Math.max(160, spaceBelow)),
    };
  };

  const closeDropdownCompletely = () => {
    setOpen(false);
    setSearch("");
    setHighlightIndex(-1);
    setDropdownPlacement(null);
    keyboardSelectionArmedRef.current = false;
  };

  useLayoutEffect(() => {
    if (!open || !portalDropdown) return undefined;
    const place = () => {
      const next = measurePortalPlacement();
      if (next) setDropdownPlacement(next);
    };
    place();
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, portalDropdown]);

  // Close when clicking outside (including portal menu)
  useEffect(() => {
    if (!open) return undefined;
    const handler = (e) => {
      const target = e.target;
      if (containerRef.current?.contains(target)) return;
      if (portalDropdown && dropdownPortalRef.current?.contains(target)) return;
      closeDropdownCompletely();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, portalDropdown]);

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

  const select = (optValue) => {
    onChange({ target: { name, value: optValue } });
    closeDropdownCompletely();
    setTimeout(() => focusNextField(), 50);
  };

  const clear = (e) => {
    e.stopPropagation();
    onChange({ target: { name, value: "" } });
    setSearch("");
  };

  const closeDropdown = () => {
    closeDropdownCompletely();
  };

  const moveToNextField = () => {
    closeDropdown();
    setTimeout(() => focusNextField(), 0);
  };

  useEffect(() => {
    if (!open) return;
    if (selectableOptions.length === 0) {
      setHighlightIndex(-1);
      return;
    }
    setHighlightIndex((prev) => {
      if (prev >= 0 && prev < selectableOptions.length) return prev;
      const selectedIdx = selectableOptions.findIndex((o) => o.value === value);
      return selectedIdx >= 0 ? selectedIdx : 0;
    });
  }, [open, selectableOptions, value]);

  const handleKeyboardNavigation = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!open) {
        if (portalDropdown) {
          const p = measurePortalPlacement();
          if (p) setDropdownPlacement(p);
        }
        setOpen(true);
        keyboardSelectionArmedRef.current = true;
        return;
      }
      if (selectableOptions.length === 0) return;
      keyboardSelectionArmedRef.current = true;
      setHighlightIndex((prev) => (prev < 0 ? 0 : (prev + 1) % selectableOptions.length));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!open) {
        if (portalDropdown) {
          const p = measurePortalPlacement();
          if (p) setDropdownPlacement(p);
        }
        setOpen(true);
        keyboardSelectionArmedRef.current = true;
        return;
      }
      if (selectableOptions.length === 0) return;
      keyboardSelectionArmedRef.current = true;
      setHighlightIndex((prev) => (prev < 0 ? selectableOptions.length - 1 : (prev - 1 + selectableOptions.length) % selectableOptions.length));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      if (!open) {
        focusNextField();
        return;
      }
      if (
        keyboardSelectionArmedRef.current &&
        highlightIndex >= 0 &&
        highlightIndex < selectableOptions.length
      ) {
        e.preventDefault();
        select(selectableOptions[highlightIndex].value);
        return;
      }
      if (!hasAnySelectableOptions) {
        moveToNextField();
        return;
      }
      moveToNextField();
      return;
    }

    if (e.key === "Escape" && open) {
      e.preventDefault();
      closeDropdown();
    }
  };

  const toggleOpen = () => {
    keyboardSelectionArmedRef.current = false;
    if (open) {
      closeDropdownCompletely();
      return;
    }
    if (portalDropdown) {
      const p = measurePortalPlacement();
      if (p) setDropdownPlacement(p);
    }
    setOpen(true);
  };

  const listMaxStyle =
    portalDropdown && dropdownPlacement?.maxHeight != null
      ? { maxHeight: dropdownPlacement.maxHeight }
      : { maxHeight: 208 };

  const highlightBg = alpha(theme.palette.primary.main, isDark ? 0.16 : 0.08);
  const hoverBg = alpha(theme.palette.primary.main, 0.04);
  const activeText = isDark ? "#818cf8" : "#4f46e5";
  const createText = isDark ? "#4ade80" : "#16a34a";
  const createHoverBg = alpha(theme.palette.success.main, isDark ? 0.16 : 0.06);

  const dropdownPanel = (
    <>
      <Box sx={{ p: 0.5, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", gap: 0.5 }}>
        <Search size={12} style={{ color: isDark ? "#64748b" : "#9ca3af", flexShrink: 0 }} />
        <Box
          component="input"
          autoFocus
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyboardNavigation}
          placeholder="Search..."
          sx={{
            flex: 1, fontSize: 10.5, outline: "none", bgcolor: "transparent", color: "text.secondary",
            "&::placeholder": { color: "text.disabled" },
            ...searchInputSx,
          }}
        />
      </Box>

      <Box component="ul" sx={{ overflowY: "auto", ...listMaxStyle }}>
        {showEmptyOption && (
          <Box
            component="li"
            onClick={() => select("")}
            sx={{ px: 1, py: 0.5, fontSize: 10.5, color: "text.disabled", cursor: "pointer", "&:hover": { bgcolor: hoverBg, color: activeText } }}
          >
            — None —
          </Box>
        )}
        {creatable && search.trim() && !normalizedOptions.some((o) => (o.label || "").toLowerCase() === search.trim().toLowerCase()) && (
          <Box
            component="li"
            onClick={() => select(search.trim())}
            sx={{ px: 1, py: 0.5, fontSize: 10.5, cursor: "pointer", color: createText, fontWeight: 500, borderBottom: "1px solid", borderColor: "divider", "&:hover": { bgcolor: createHoverBg } }}
          >
            + Create "{search.trim()}"
          </Box>
        )}
        {filtered.length === 0 && !creatable ? (
          <Box component="li" sx={{ px: 1, py: 0.5, fontSize: 10.5, color: "text.disabled", fontStyle: "italic" }}>No results</Box>
        ) : filtered.length === 0 ? null : (
          filtered.map((o, idx) => {
            if (!hasSearch && o.divider) {
              return <Box component="li" key={`divider-${idx}`} sx={{ my: 0.25, borderTop: "1px solid", borderColor: "divider" }} />;
            }
            if (!hasSearch && o.disabled) {
              return (
                <Box
                  component="li"
                  key={`group-${idx}-${o.label}`}
                  sx={{ px: 1, py: 0.5, fontSize: 10, fontWeight: 700, letterSpacing: "0.03em", color: "text.secondary", bgcolor: "action.hover", textTransform: "uppercase" }}
                >
                  {o.label}
                </Box>
              );
            }
            const optionIndex = selectableOptions.findIndex((opt) => opt.value === o.value);
            const isSelected = o.value === value;
            const isHighlighted = optionIndex === highlightIndex;
            return (
              <Box
                component="li"
                key={o.value}
                onClick={() => select(o.value)}
                onMouseEnter={() => {
                  keyboardSelectionArmedRef.current = true;
                  setHighlightIndex(optionIndex);
                }}
                sx={{
                  px: 1, py: 0.5, fontSize: 10.5, cursor: "pointer",
                  bgcolor: isSelected || isHighlighted ? highlightBg : "transparent",
                  color: isSelected || isHighlighted ? activeText : "text.secondary",
                  fontWeight: isSelected ? 500 : 400,
                  "&:hover": { bgcolor: highlightBg, color: activeText },
                }}
              >
                {o.label}
              </Box>
            );
          })
        )}
      </Box>
    </>
  );

  const portalReady = portalDropdown && open && dropdownPlacement;

  return (
    <Box sx={{ display: "flex", alignItems: "center", width: "100%" }} ref={containerRef} data-enter-ignore="true">
      {label && (
        <Box component="label" sx={{ width: "40%", fontSize: 10.5, fontWeight: 500, color: "text.secondary", textAlign: "right", pr: 1.5, flexShrink: 0 }}>
          {required && <Box component="span" sx={{ color: "error.main", mr: 0.5 }}>*</Box>}
          {label}
        </Box>
      )}

      <Box sx={{ flex: 1, position: "relative" }}>
        <Box
          component="button"
          ref={triggerRef}
          type="button"
          data-searchable-select-trigger="true"
          onClick={toggleOpen}
          onFocus={() => {
            if (!openOnFocus || open) return;
            keyboardSelectionArmedRef.current = false;
            if (portalDropdown) {
              const p = measurePortalPlacement();
              if (p) setDropdownPlacement(p);
            }
            setOpen(true);
          }}
          onKeyDown={handleKeyboardNavigation}
          sx={{
            width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
            border: "1px solid", borderColor: "divider", borderRadius: "2px", px: 0.75, py: 0.5,
            fontSize: 10.5, bgcolor: "background.paper", textAlign: "left",
            "&:focus": { outline: "none", borderColor: "#3b82f6", boxShadow: "0 0 0 1px #3b82f6" },
            ...triggerSx,
          }}
        >
          <Box component="span" sx={{ color: selectedLabel ? "text.primary" : "text.disabled", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {selectedLabel || placeholder || `Select ${label || ""}`}
          </Box>
          <Box component="span" sx={{ display: "flex", alignItems: "center", flexShrink: 0, ml: 0.5, gap: 0.25 }}>
            {value && (
              <X
                size={10}
                style={{ color: isDark ? "#64748b" : "#9ca3af" }}
                onClick={clear}
              />
            )}
            <ChevronDown size={12} style={{ color: isDark ? "#64748b" : "#9ca3af", transition: "transform 0.15s", transform: open ? "rotate(180deg)" : "none" }} />
          </Box>
        </Box>

        {open && !portalDropdown && (
          <Box sx={{ position: "absolute", zIndex: 50, left: 0, top: "100%", mt: 0.25, width: "100%", bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "2px", boxShadow: 4 }}>
            {dropdownPanel}
          </Box>
        )}

        {portalReady &&
          createPortal(
            <Box
              ref={dropdownPortalRef}
              sx={{ bgcolor: "background.paper", border: "1px solid", borderColor: "divider", borderRadius: "2px", boxShadow: 8, overflow: "hidden" }}
              style={{
                position: "fixed",
                top: dropdownPlacement.top,
                left: dropdownPlacement.left,
                width: dropdownPlacement.width,
                zIndex: 10060,
              }}
            >
              {dropdownPanel}
            </Box>,
            document.body
          )}
      </Box>
    </Box>
  );
};

export default SearchableSelect;

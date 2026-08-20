import { ChevronDown, Search, X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect, useLayoutEffect, useRef, useState } from "react";

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
  triggerClassName = "",
  searchInputClassName = "",
  portalDropdown = false,
  openOnFocus = false,
}) => {
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
      : undefined;
  const listClass = portalDropdown ? "overflow-y-auto" : "max-h-52 overflow-y-auto";

  const dropdownPanel = (
    <>
      <div className="p-1 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1">
        <Search className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
        <input
          autoFocus
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyboardNavigation}
          placeholder="Search..."
          className={`flex-1 text-xs outline-none bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500 ${searchInputClassName}`}
        />
      </div>

      <ul className={listClass} style={listMaxStyle}>
        {showEmptyOption && (
          <li
            onClick={() => select("")}
            className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500 hover:bg-blue-50 dark:hover:bg-indigo-900/30 hover:text-blue-600 dark:hover:text-indigo-400 cursor-pointer"
          >
            — None —
          </li>
        )}
        {creatable && search.trim() && !normalizedOptions.some((o) => (o.label || "").toLowerCase() === search.trim().toLowerCase()) && (
          <li
            onClick={() => select(search.trim())}
            className="px-2 py-1 text-xs cursor-pointer hover:bg-green-50 dark:hover:bg-green-900/30 hover:text-green-700 dark:hover:text-green-400 text-green-600 dark:text-green-400 font-medium border-b border-gray-100 dark:border-gray-700"
          >
            + Create "{search.trim()}"
          </li>
        )}
        {filtered.length === 0 && !creatable ? (
          <li className="px-2 py-1 text-xs text-gray-400 dark:text-gray-500 italic">No results</li>
        ) : filtered.length === 0 ? null : (
          filtered.map((o, idx) => {
            if (!hasSearch && o.divider) {
              return <li key={`divider-${idx}`} className="my-0.5 border-t border-gray-200 dark:border-gray-700" />;
            }
            if (!hasSearch && o.disabled) {
              return (
                <li
                  key={`group-${idx}-${o.label}`}
                  className="px-2 py-1 text-[10px] font-bold tracking-wide text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 uppercase"
                >
                  {o.label}
                </li>
              );
            }
            const optionIndex = selectableOptions.findIndex((opt) => opt.value === o.value);
            return (
              <li
                key={o.value}
                onClick={() => select(o.value)}
                onMouseEnter={() => {
                  keyboardSelectionArmedRef.current = true;
                  setHighlightIndex(optionIndex);
                }}
                className={`px-2 py-1 text-xs cursor-pointer hover:bg-blue-50 dark:hover:bg-indigo-900/30 hover:text-blue-600 dark:hover:text-indigo-400 ${
                  o.value === value
                    ? "bg-blue-100 dark:bg-indigo-900/30 text-blue-700 dark:text-indigo-400 font-medium"
                    : optionIndex === highlightIndex
                      ? "bg-blue-50 dark:bg-indigo-900/30 text-blue-700 dark:text-indigo-400"
                      : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {o.label}
              </li>
            );
          })
        )}
      </ul>
    </>
  );

  const portalReady = portalDropdown && open && dropdownPlacement;

  return (
    <div className="flex items-center w-full" ref={containerRef} data-enter-ignore="true">
      {label && (
        <label className="w-2/5 text-xs font-medium text-gray-700 dark:text-gray-300 text-right pr-3 shrink-0">
          {required && <span className="text-red-500 dark:text-red-400 mr-1">*</span>}
          {label}
        </label>
      )}

      <div className="flex-1 relative">
        <button
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
          className={`w-full flex items-center justify-between border border-gray-300 dark:border-gray-600 rounded-sm px-1.5 py-1 text-xs bg-white dark:bg-gray-800 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-left ${triggerClassName}`}
        >
          <span className={selectedLabel ? "text-gray-800 dark:text-gray-100 truncate" : "text-gray-400 dark:text-gray-500 truncate"}>
            {selectedLabel || placeholder || `Select ${label || ""}`}
          </span>
          <span className="flex items-center shrink-0 ml-1 gap-0.5">
            {value && (
              <X
                className="w-2.5 h-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
                onClick={clear}
              />
            )}
            <ChevronDown
              className={`w-3 h-3 text-gray-400 dark:text-gray-500 transition-transform ${open ? "rotate-180" : ""}`}
            />
          </span>
        </button>

        {open && !portalDropdown && (
          <div className="absolute z-50 left-0 top-full mt-0.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm shadow-lg">
            {dropdownPanel}
          </div>
        )}

        {portalReady &&
          createPortal(
            <div
              ref={dropdownPortalRef}
              className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm shadow-xl overflow-hidden"
              style={{
                position: "fixed",
                top: dropdownPlacement.top,
                left: dropdownPlacement.left,
                width: dropdownPlacement.width,
                zIndex: 10060,
              }}
            >
              {dropdownPanel}
            </div>,
            document.body
          )}
      </div>
    </div>
  );
};

export default SearchableSelect;

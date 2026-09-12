import { ChevronDown, Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

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
 */
const AsyncSearchSelect = ({ name, value, onChange, options, onAsyncSearch, placeholder = "Select...", searchPlaceholder = "Search...", disabled = false }) => {
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

  return (
    <div ref={containerRef} data-enter-ignore="true" className="relative w-full">
      <button ref={triggerRef} type="button" data-searchable-select-trigger="true"
        disabled={disabled}
        onClick={() => { if (disabled) return; keyboardSelectionArmedRef.current = false; setOpen((p) => !p); setHighlightedIndex(-1); }}
        onKeyDown={(e) => { if (disabled) return; handleTriggerKeyDown(e); }}
        className={`w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-sm bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
      >
        <span className={selectedLabel ? "text-gray-800 dark:text-gray-100 truncate text-xs" : "text-gray-400 dark:text-gray-500 truncate text-xs"}>{selectedLabel || placeholder}</span>
        <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && !disabled && (
        <div className="absolute z-50 left-0 top-full mt-0.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[160px]">
          <div className="p-1 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1">
            <Search className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
            <input autoFocus type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder} className="w-full text-xs outline-none bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500" />
            {isSearching && (
              <span className="text-[10px] text-blue-500 font-medium shrink-0 animate-pulse px-1">Searching...</span>
            )}
          </div>
          <ul ref={listRef} className="max-h-52 overflow-y-auto">
            <li onClick={() => selectVal("")} className={`px-2 py-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer ${highlightedIndex === 0 ? "bg-blue-100 dark:bg-blue-900/30" : "hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}>{placeholder}</li>
            {finalOptions.map((opt, idx) => (
              <li key={getId(opt)} onClick={() => selectVal(getId(opt))}
                className={`px-2 py-1 text-xs cursor-pointer ${highlightedIndex === idx + 1 ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium" : getId(opt) === String(value) ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium" : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"}`}
              >{getLabel(opt)}</li>
            ))}
          </ul>
          {filtered.length > 100 && (
            <div className="px-2 py-0.5 text-[10px] text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-gray-700/50 text-center border-t border-gray-100 dark:border-gray-700">
              Showing top 100 of {filtered.length} (type to narrow)
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AsyncSearchSelect;

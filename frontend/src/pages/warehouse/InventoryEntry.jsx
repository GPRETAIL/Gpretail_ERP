import { useState, useEffect, useCallback, useRef } from "react";
import { Save, Search, Plus, X, ArrowLeft, ChevronDown, Pencil, Trash2 } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../api/axios";
import Toast from "../../components/Toast";
import ConfirmDialog from "../../components/ConfirmDialog";
import PageSkeleton from "../../components/PageSkeleton";
import { buildSizeSelectOptions } from "../../utils/sizeSelectOptions";

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
      <div className={stacked ? "mb-1.5" : "flex items-center gap-2 mb-2"}>
        <label
          className={
            stacked
              ? "block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1"
              : "w-28 text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0"
          }
        >
          {required && <span className="text-red-500 dark:text-red-400">* </span>}
          {label}
        </label>
        <select
          name={name}
          value={value}
          onChange={onChange}
          className={`border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
            stacked ? "w-full" : "flex-1"
          }`}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt.id} value={opt.id}>
              {getOptionLabel(opt)}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      data-enter-ignore="true"
      className={stacked ? "mb-1.5" : "flex items-center gap-2 mb-2"}
    >
      <label
        className={
          stacked
            ? "block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1"
            : "w-28 text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0"
        }
      >
        {required && <span className="text-red-500 dark:text-red-400">* </span>}
        {label}
      </label>

      <div className={stacked ? "w-full relative" : "flex-1 relative"}>
        <button
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
          className="w-full border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-xs bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between"
        >
          <span className={selectedLabel ? "text-gray-800 dark:text-gray-100 truncate" : "text-gray-400 dark:text-gray-500 truncate"}>
            {selectedLabel || "Select..."}
          </span>
          <ChevronDown className={`w-3.5 h-3.5 text-gray-400 dark:text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>

        {open && (
          <div className="absolute z-50 left-0 top-full mt-0.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg">
            <div className="p-1 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1">
              <Search className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
              <input
                autoFocus
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full text-xs outline-none bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
              />
            </div>

            <ul ref={listRef} className="max-h-52 overflow-y-auto">
              <li
                onClick={() => selectValue("")}
                className={`px-2 py-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer ${
                  highlightedIndex === 0 ? "bg-blue-100 dark:bg-blue-900/30" : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                }`}
              >
                Select...
              </li>
              {visibleOptions.map((opt, idx) => (
                <li
                  key={opt.id}
                  onClick={() => selectValue(opt.id)}
                  className={`px-2 py-1 text-xs cursor-pointer ${
                    highlightedIndex === idx + 1
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                      : String(opt.id) === String(value)
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium"
                      : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  }`}
                >
                  {getOptionLabel(opt)}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
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
  <div className={stacked ? "mb-1.5" : "flex items-center gap-2 mb-2"}>
    <label
      className={
        stacked
          ? "block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1"
          : "w-28 text-xs font-medium text-gray-700 dark:text-gray-300 flex-shrink-0"
      }
    >
      {required && <span className="text-red-500 dark:text-red-400">* </span>}
      {label}
    </label>
    <input
      type="text"
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={`border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-blue-500 focus:border-blue-500 ${
        stacked ? "w-full" : "flex-1"
      }`}
    />
  </div>
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
    <div ref={containerRef} data-enter-ignore="true" className="relative z-[140] w-full">
      <button
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
        className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-1 text-xs bg-white dark:bg-gray-700 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 text-left flex items-center justify-between"
      >
        <span className={selectedLabel ? "text-gray-800 dark:text-gray-100 truncate" : "text-gray-400 dark:text-gray-500 truncate"}>
          {selectedLabel || "Size..."}
        </span>
        <ChevronDown className={`w-3 h-3 text-gray-400 dark:text-gray-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-[160] left-0 top-full mt-0.5 w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded shadow-lg min-w-[160px]">
          <div className="p-1 border-b border-gray-200 dark:border-gray-700 flex items-center gap-1">
            <Search className="w-3 h-3 text-gray-400 dark:text-gray-500 shrink-0" />
            <input
              autoFocus
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search size..."
              className="w-full text-xs outline-none bg-transparent text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-500"
            />
          </div>

          <ul ref={listRef} className="max-h-52 overflow-y-auto">
            <li
              onClick={() => selectOption("")}
              className={`px-2 py-1 text-xs text-gray-500 dark:text-gray-400 cursor-pointer ${
                highlightedIndex === 0 ? "bg-blue-100 dark:bg-blue-900/30" : "hover:bg-blue-50 dark:hover:bg-blue-900/20"
              }`}
            >
              Size...
            </li>
            {groupedDisplay.map((item) => {
              if (item.type === "header") {
                return (
                  <li key={`hdr-${item.label}`} className="px-2 py-0.5 text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase bg-gray-50 dark:bg-gray-700 select-none">
                    {item.label}
                  </li>
                );
              }
              const thisIndex = ++optionIndex;
              return (
                <li
                  key={item.key}
                  onClick={() => selectOption(item.value)}
                  className={`px-2 py-1 text-xs cursor-pointer ${
                    highlightedIndex === thisIndex
                      ? "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 font-medium"
                      : item.value === value
                      ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium"
                      : item.value === "__jump__"
                      ? "text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      : "text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  }`}
                >
                  {item.label}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={handleClose}>
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md mx-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-800 dark:text-gray-100">Size Detail (Jump)</h2>
          <button onClick={handleClose} className="glass-btn glass-btn-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          {/* Input Row: Start - Increment - End */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Start</label>
              <input
                type="number"
                value={start}
                onChange={(e) => setStart(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. 10"
              />
            </div>
            <div className="flex items-end pb-1 text-gray-400 dark:text-gray-500 font-bold">-</div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Increment</label>
              <input
                type="number"
                value={increment}
                onChange={(e) => setIncrement(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. 2"
              />
            </div>
            <div className="flex items-end pb-1 text-gray-400 dark:text-gray-500 font-bold">-</div>
            <div className="flex-1">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">End</label>
              <input
                type="number"
                value={end}
                onChange={(e) => setEnd(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                placeholder="e.g. 26"
              />
            </div>
          </div>

          {/* Quantity */}
          <div className="flex gap-2 items-end">
            <div className="w-24">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Quantity</label>
              <input
                type="number"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
                placeholder="1"
              />
            </div>
            <button
              onClick={handleGenerate}
              className="glass-btn glass-btn-primary"
            >
              Generate
            </button>
          </div>

          {/* Generated Sizes Table */}
          {generatedSizes.length > 0 && (
            <div className="border border-gray-300 dark:border-gray-600 rounded max-h-52 overflow-y-auto">
              <div className="flex bg-blue-50 dark:bg-blue-900/30 text-xs font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700 sticky top-0">
                <div className="p-2 w-16 border-r dark:border-gray-700 text-center">S.No</div>
                <div className="p-2 flex-1 border-r dark:border-gray-700">Size</div>
                <div className="p-2 w-20 border-r dark:border-gray-700 text-center">Qty</div>
                <div className="p-2 w-16 text-center">Action</div>
              </div>
              {generatedSizes.map((item, idx) => (
                <div key={idx} className="flex text-sm border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <div className="p-2 w-16 border-r dark:border-gray-700 text-center text-xs text-gray-800 dark:text-gray-100">{idx + 1}</div>
                  <div className="p-2 flex-1 border-r dark:border-gray-700 font-medium text-gray-800 dark:text-gray-100">{item.size}</div>
                  <div className="p-2 w-20 border-r dark:border-gray-700 text-center">
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => handleQtyChange(idx, e.target.value)}
                      className="w-full text-center border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded px-1 py-0.5 text-xs"
                    />
                  </div>
                  <div className="p-2 w-16 text-center">
                    <button onClick={() => handleRemove(idx)} className="glass-btn glass-btn-danger">
                      <X className="w-3.5 h-3.5 inline" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 rounded-b-lg">
          <button
            onClick={handleClose}
            className="glass-btn glass-btn-secondary"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={generatedSizes.length === 0}
            className="glass-btn glass-btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Apply Sizes
          </button>
        </div>
      </div>
    </div>
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
            api.get("/products?all=true"),
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
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="flex items-center space-x-2">
          <button
            onClick={() => navigate(-1)}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
            type="button"
            aria-label="Back to previous page"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <h1 className="text-sm font-semibold flex items-center gap-1">
            <button
              type="button"
              onClick={() => navigate("/warehouse")}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline"
            >
              Warehouse
            </button>
            <span className="text-gray-400 dark:text-gray-500">/</span>
            <span className="text-gray-800 dark:text-gray-100">{isViewMode ? "View Inventory Entry" : "Inventory Entry"}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {!isViewMode && (
            <>
              <button
                onClick={handleSave}
                className="glass-btn glass-btn-success flex items-center"
              >
                <Save className="w-4 h-4 mr-1" /> Save
              </button>
              <button
                onClick={handleSaveAndNext}
                className="glass-btn glass-btn-primary flex items-center"
              >
                Save & Next
              </button>
            </>
          )}
          <button
            onClick={() => navigate("/warehouse/inventory-entry/search")}
            className="glass-btn glass-btn-primary flex items-center"
          >
            <Search className="w-4 h-4 mr-1" /> Search
          </button>
          <button
            onClick={() => navigate("/warehouse")}
            className="glass-btn glass-btn-secondary flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm flex min-h-[calc(100vh-120px)]">
          {/* LEFT SECTION: Product Attributes */}
          <div className="w-[420px] flex-shrink-0 p-3 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
            <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 border-b border-gray-200 dark:border-gray-700 pb-2 mb-3 uppercase tracking-wide">
              Product Attributes
            </h2>

            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <AttrSelect
                label="Product"
                name="productId"
                value={attrs.productId}
                onChange={handleAttrChange}
                options={products}
                required
                stacked
                searchable
                searchPlaceholder="Search product..."
              />
              <AttrSelect label="Brand" name="brandId" value={attrs.brandId} onChange={handleAttrChange} options={brands} required={mandatoryFields.has("brandId")} stacked searchable searchPlaceholder="Search brand..." />
              {marginMin !== null || marginMax !== null ? (
                <div className="col-span-2 text-[11px] text-gray-500 dark:text-gray-400 -mt-1 mb-1">
                  Margin: {marginMin ?? "—"}% - {marginMax ?? "—"}%
                </div>
              ) : null}
              <AttrText label="HSN Code" name="hsnCode" value={attrs.hsnCode} onChange={handleAttrChange} placeholder="Enter HSN" stacked />
              <AttrSelect label="Pattern" name="patternId" value={attrs.patternId} onChange={handleAttrChange} options={patterns} required={mandatoryFields.has("patternId")} stacked searchable searchPlaceholder="Search pattern..." />
              <AttrSelect label="Style" name="styleId" value={attrs.styleId} onChange={handleAttrChange} options={styles} required={mandatoryFields.has("styleId")} stacked searchable searchPlaceholder="Search style..." />
              <AttrSelect label="Fit" name="fitId" value={attrs.fitId} onChange={handleAttrChange} options={fits} required={mandatoryFields.has("fitId")} stacked searchable searchPlaceholder="Search fit..." />
              <AttrSelect label="Sleeve" name="sleeveId" value={attrs.sleeveId} onChange={handleAttrChange} options={sleeves} required={mandatoryFields.has("sleeveId")} stacked searchable searchPlaceholder="Search sleeve..." />
              <AttrSelect label="Type" name="typeId" value={attrs.typeId} onChange={handleAttrChange} options={types} required={mandatoryFields.has("typeId")} stacked searchable searchPlaceholder="Search type..." />
              <AttrSelect label="Material" name="materialId" value={attrs.materialId} onChange={handleAttrChange} options={materials} required={mandatoryFields.has("materialId")} stacked searchable searchPlaceholder="Search material..." />
              <AttrSelect label="Color" name="colorId" value={attrs.colorId} onChange={handleAttrChange} options={colors} required={mandatoryFields.has("colorId")} stacked searchable searchPlaceholder="Search color..." />
              <AttrSelect
                label="Tax"
                name="taxId"
                value={attrs.taxId}
                onChange={handleAttrChange}
                options={taxes.map((t) => ({ id: t.id, name: `${t.name} ${t.tax_percentage}%` }))}
                stacked
                searchable
                searchPlaceholder="Search tax..."
              />
            </div>

            {/* Dynamic mandatory/visible fields from product configuration */}
            {visibleDynamicFields.size > 0 && (
              <>
                <hr className="my-2 border-gray-200 dark:border-gray-700" />
                <h3 className="text-[11px] font-semibold text-gray-600 dark:text-gray-300 uppercase tracking-wide mb-1">
                  Configured Attributes
                </h3>
                <div className="grid grid-cols-2 gap-x-3 gap-y-1">
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
                </div>
              </>
            )}

            <hr className="my-2 border-gray-200 dark:border-gray-700" />

            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              <AttrText label="Buying Price" name="buyingPrice" value={attrs.buyingPrice} onChange={handleAttrChange} placeholder="0.00" stacked />
              <AttrText label="Exp.Margin" name="expMargin" value={attrs.expMargin} onChange={handleAttrChange} placeholder="0.00" stacked />
              <AttrText label="P.Tax" name="pTax" value={attrs.pTax} onChange={handleAttrChange} placeholder="0.00" stacked />
              <AttrText label="S.Tax" name="sTax" value={attrs.sTax} onChange={handleAttrChange} placeholder="0.00" stacked />
              <AttrText label="Discount %" name="discount" value={attrs.discount} onChange={handleAttrChange} placeholder="0" stacked />
            </div>
          </div>

          {/* RIGHT SECTION: Item Entry Grid */}
          <div className="flex-1 p-2 min-w-0">
            {/* Supplier / Item Value / Total Bar */}
            <div className="mb-2 overflow-hidden rounded border border-gray-300 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30">
              <div className="flex items-stretch">
                <div className="flex-1 grid grid-cols-1 gap-px bg-gray-300 dark:bg-gray-700 md:grid-cols-3">
                  <div className="flex items-center justify-between gap-2 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5">
                    <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Supplier</span>
                    <span className="text-xs font-bold text-gray-800 dark:text-gray-100 text-right">
                      {hasTransportEntry ? (
                        supplierName || "-"
                      ) : (
                        <span className="text-red-500 dark:text-red-400 font-normal">No transport entry linked</span>
                      )}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5">
                    <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Item Value</span>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                      {formatMoney(itemValue || computedTotals.taxable)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-1.5">
                    <span className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Total</span>
                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400">
                      {formatMoney(totalValue || rowsTotal)}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSummaryExpanded((prev) => !prev)}
                  className="flex w-10 shrink-0 items-center justify-center border-l border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 transition hover:bg-gray-50 dark:hover:bg-gray-700"
                  aria-expanded={summaryExpanded}
                  aria-label={summaryExpanded ? "Collapse inventory linked details" : "Expand inventory linked details"}
                  title={summaryExpanded ? "Collapse details" : "Expand details"}
                >
                  <ChevronDown className={`h-4 w-4 transition-transform ${summaryExpanded ? "rotate-180" : ""}`} />
                </button>
              </div>

              {summaryExpanded && (
                <div className="border-t border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 p-2.5">
                  <div className="grid gap-3 xl:grid-cols-[330px_minmax(0,1fr)]">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1.5">
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300">INV.NO</div>
                        <div className="text-xs text-gray-800 dark:text-gray-100">{invoiceSummary?.invoice_no || "-"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300">Date</div>
                        <div className="text-xs text-gray-800 dark:text-gray-100">{formatDisplayDate(invoiceSummary?.invoice_date)}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300">LR NO</div>
                        <div className="text-xs text-gray-800 dark:text-gray-100">{transportSummary?.lr_no || "-"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300">Entry No</div>
                        <div className="text-xs text-gray-800 dark:text-gray-100">{transportSummary?.lr_entry_no || "-"}</div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300">Bundles</div>
                        <div className="text-xs text-gray-800 dark:text-gray-100">
                          {invoiceSummary?.bundles ?? transportSummary?.no_of_bundles ?? "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300">Pieces</div>
                        <div className="text-xs text-gray-800 dark:text-gray-100">
                          {invoiceSummary?.pieces ?? transportSummary?.no_of_pieces ?? "-"}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300">Freight</div>
                        <div className="text-xs text-gray-800 dark:text-gray-100">
                          {formatMoney(invoiceSummary?.lr_expense ?? transportSummary?.freight_charge_amount ?? 0)}
                        </div>
                      </div>
                      <div>
                        <div className="text-[11px] font-bold uppercase text-gray-700 dark:text-gray-300">Loading</div>
                        <div className="text-xs text-gray-800 dark:text-gray-100">
                          {formatMoney(transportSummary?.loading_charge_amount ?? 0)}
                        </div>
                      </div>
                    </div>

                    <div className="overflow-x-auto rounded border border-gray-300 dark:border-gray-700">
                      <table className="min-w-full text-xs">
                        <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                          <tr>
                            <th className="border-b border-gray-300 dark:border-gray-700 px-2 py-1.5 text-left font-bold">Type</th>
                            <th className="border-b border-gray-300 dark:border-gray-700 px-2 py-1.5 text-left font-bold">Tax %</th>
                            <th className="border-b border-gray-300 dark:border-gray-700 px-2 py-1.5 text-right font-bold">Amount</th>
                            <th className="border-b border-gray-300 dark:border-gray-700 px-2 py-1.5 text-right font-bold">Discnt</th>
                            <th className="border-b border-gray-300 dark:border-gray-700 px-2 py-1.5 text-right font-bold">Tax</th>
                            <th className="border-b border-gray-300 dark:border-gray-700 px-2 py-1.5 text-right font-bold">Total</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoiceSummary?.items?.length ? (
                            invoiceSummary.items.map((row) => {
                              const amountOn = Number(row.amount_on) || 0;
                              const discountAmount = Number(row.discount) || 0;
                              const discountPerc = Number(row.dis_perc) || 0;
                              const taxPerc = Number(row.tax_perc) || 0;
                              const taxAmount = ((amountOn - discountAmount) * taxPerc) / 100;
                              const totalAmount = Number(row.net_amount) || amountOn - discountAmount + taxAmount;

                              return (
                                <tr key={row.id} className="text-gray-800 dark:text-gray-100">
                                  <td className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5">{row.type || "-"}</td>
                                  <td className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5">{taxPerc.toFixed(2)}%</td>
                                  <td className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right">{formatMoney(amountOn)}</td>
                                  <td className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right">
                                    {`${formatMoney(discountAmount)}@${discountPerc.toFixed(2)}%`}
                                  </td>
                                  <td className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right">{formatMoney(taxAmount)}</td>
                                  <td className="border-b border-gray-200 dark:border-gray-700 px-2 py-1.5 text-right">{formatMoney(totalAmount)}</td>
                                </tr>
                              );
                            })
                          ) : (
                            <tr>
                              <td colSpan={6} className="px-3 py-4 text-center text-xs text-gray-400 dark:text-gray-500">
                                No invoice detail found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="overflow-visible mb-2 relative z-40">
              <div className="min-w-0">
                {/* Entry Row Header Labels — widths match table columns */}
                <div className="text-[11px] font-semibold text-red-700 dark:text-red-400 flex items-center mb-0.5">
                  <div className="px-1 py-0.5 w-10 shrink-0 text-center">S.No</div>
                  <div className="px-1 py-0.5 w-20 shrink-0">Size</div>
                  <div className="px-1 py-0.5 w-20 shrink-0">Design No</div>
                  <div className="px-1 py-0.5 w-16 shrink-0"></div>
                  <div className="px-1 py-0.5 w-12 shrink-0 text-right">Qty</div>
                  <div className="px-1 py-0.5 w-20 shrink-0 text-right">Cost</div>
                  <div className="px-1 py-0.5 w-14 shrink-0"></div>
                  <div className="px-1 py-0.5 w-16 shrink-0 text-right">Mrgn%</div>
                  <div className="px-1 py-0.5 w-16 shrink-0 text-right">Sale</div>
                  <div className="px-1 py-0.5 w-16 shrink-0 text-right">MRP</div>
                  <div className="px-1 py-0.5 w-14 shrink-0 text-right">Dis%</div>
                  <div className="px-1 py-0.5 w-16 shrink-0 text-right">Final</div>
                  <div className="px-1 py-0.5 w-20 shrink-0"></div>
                  <div className="px-1 py-0.5 w-16 shrink-0"></div>
                </div>

                {/* Entry Row — widths match table columns */}
                <div className="flex items-center bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5">
                  <div className="p-0.5 w-10 shrink-0">
                    <input
                      type="text"
                      value={currentItem.sNo}
                      readOnly
                      className="w-full text-center border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="p-0.5 w-20 shrink-0">
                    <SearchableSizeSelect
                      value={currentItem.size}
                      onChange={handleSizeChange}
                      sizes={sizes}
                      sizeGroups={sizeGroups}
                      onJump={() => setJumpOpen(true)}
                    />
                  </div>
                  <div className="p-0.5 w-20 shrink-0">
                    <input
                      type="text"
                      name="designNo"
                      value={currentItem.designNo}
                      onChange={handleItemChange}
                      placeholder="Design No"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="p-0.5 w-16 shrink-0"></div>
                  <div className="p-0.5 w-12 shrink-0">
                    <input
                      type="number"
                      name="qty"
                      value={currentItem.qty}
                      onChange={handleItemChange}
                      placeholder="0"
                      readOnly={Boolean(currentItem.jumpSizes?.length)}
                      className={`w-full text-right border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs ${currentItem.jumpSizes?.length ? "bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400" : "bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"}`}
                    />
                  </div>
                  <div className="p-0.5 w-20 shrink-0">
                    <input
                      type="number"
                      name="cost"
                      value={currentItem.cost}
                      onChange={handleItemChange}
                      placeholder="0.00"
                      className="w-full text-right border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="p-0.5 w-14 shrink-0"></div>
                  <div className="p-0.5 w-16 shrink-0">
                    <input
                      type="number"
                      name="marginPerc"
                      value={currentItem.marginPerc}
                      onChange={handleItemChange}
                      placeholder="0"
                      className="w-full text-right border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="p-0.5 w-16 shrink-0">
                    <input
                      type="text"
                      value={currentItem.sellingPrice || ""}
                      readOnly
                      className="w-full text-right border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                    />
                  </div>
                  <div className="p-0.5 w-16 shrink-0">
                    <input
                      type="text"
                      value={currentItem.mrp || ""}
                      readOnly
                      className="w-full text-right border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                    />
                  </div>
                  <div className="p-0.5 w-14 shrink-0">
                    <input
                      type="number"
                      name="discountPerc"
                      value={currentItem.discountPerc}
                      onChange={handleItemChange}
                      placeholder="0"
                      className="w-full text-right border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="p-0.5 w-16 shrink-0">
                    <input
                      type="text"
                      value={currentItem.finalPrice || ""}
                      readOnly
                      className="w-full text-right border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400"
                    />
                  </div>
                  <div className="p-0.5 w-20 shrink-0"></div>
                  <div className="p-0.5 w-16 shrink-0 flex items-center justify-center">
                    <button
                      onClick={handleAddItem}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.stopPropagation();
                          handleAddItem();
                        }
                      }}
                      className="glass-btn w-7 h-7 flex items-center justify-center"
                      title={editIndex !== null ? "Update Item" : "Add Item"}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Items Table */}
            <div className="relative z-0">
              <div className="overflow-hidden rounded-t border border-b-0 border-gray-300 dark:border-gray-700">
                <div className="flex bg-blue-100 dark:bg-blue-900/30 text-[11px] font-semibold text-gray-700 dark:text-gray-300 border-b dark:border-gray-700">
                  <div className="px-2 py-1.5 w-10 border-r dark:border-gray-700 text-center">S.No</div>
                  <div className="px-2 py-1.5 w-20 border-r dark:border-gray-700">Size</div>
                  <div className="px-2 py-1.5 w-20 border-r dark:border-gray-700">Design</div>
                  <div className="px-2 py-1.5 w-16 border-r dark:border-gray-700">HSN</div>
                  <div className="px-2 py-1.5 w-12 border-r dark:border-gray-700 text-right">Qty</div>
                  <div className="px-2 py-1.5 w-20 border-r dark:border-gray-700 text-right">Cost</div>
                  <div className="px-2 py-1.5 w-14 border-r dark:border-gray-700 text-right">P.Dis</div>
                  <div className="px-2 py-1.5 w-16 border-r dark:border-gray-700 text-right">Mrgn%</div>
                  <div className="px-2 py-1.5 w-16 border-r dark:border-gray-700 text-right">Sale</div>
                  <div className="px-2 py-1.5 w-16 border-r dark:border-gray-700 text-right">MRP</div>
                  <div className="px-2 py-1.5 w-14 border-r dark:border-gray-700 text-right">Dis%</div>
                  <div className="px-2 py-1.5 w-16 border-r dark:border-gray-700 text-right">Final</div>
                  <div className="px-2 py-1.5 w-20 border-r dark:border-gray-700 text-right">Amount</div>
                  <div className="px-2 py-1.5 w-16 text-center">Actions</div>
                </div>

                <div className="flex bg-sky-50 dark:bg-sky-900/20 border-b dark:border-gray-700">
                  <div className="px-2 py-1 w-10 border-r dark:border-gray-700"></div>
                  <div className="px-2 py-1 w-20 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.size}
                      onChange={(event) => handleItemFilterChange("size", event.target.value)}
                      placeholder="Search size"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-20 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.designNo}
                      onChange={(event) => handleItemFilterChange("designNo", event.target.value)}
                      placeholder="Search design"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-16 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.hsnCode}
                      onChange={(event) => handleItemFilterChange("hsnCode", event.target.value)}
                      placeholder="HSN"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-12 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.qty}
                      onChange={(event) => handleItemFilterChange("qty", event.target.value)}
                      placeholder="Qty"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-20 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.cost}
                      onChange={(event) => handleItemFilterChange("cost", event.target.value)}
                      placeholder="Cost"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-14 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.pDis}
                      onChange={(event) => handleItemFilterChange("pDis", event.target.value)}
                      placeholder="P.Dis"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-16 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.marginPerc}
                      onChange={(event) => handleItemFilterChange("marginPerc", event.target.value)}
                      placeholder="Margin"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-16 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.sellingPrice}
                      onChange={(event) => handleItemFilterChange("sellingPrice", event.target.value)}
                      placeholder="Sale"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-16 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.mrp}
                      onChange={(event) => handleItemFilterChange("mrp", event.target.value)}
                      placeholder="MRP"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-14 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.discountPerc}
                      onChange={(event) => handleItemFilterChange("discountPerc", event.target.value)}
                      placeholder="Dis%"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-16 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.finalPrice}
                      onChange={(event) => handleItemFilterChange("finalPrice", event.target.value)}
                      placeholder="Final"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-20 border-r dark:border-gray-700">
                    <input
                      type="text"
                      value={itemFilters.amount}
                      onChange={(event) => handleItemFilterChange("amount", event.target.value)}
                      placeholder="Amount"
                      className="w-full border border-gray-300 dark:border-gray-600 rounded px-1 py-0.5 text-xs text-right bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="px-2 py-1 w-16 flex items-center justify-center text-[10px] text-gray-500 dark:text-gray-400">
                    Search
                  </div>
                </div>
              </div>

              <div className="h-[340px] overflow-y-auto border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800" style={{ scrollbarGutter: "stable" }}>
                {filteredItems.length === 0 ? (
                  <div className="flex h-full items-center justify-center px-4 text-center text-xs text-gray-400 dark:text-gray-500">
                    {items.length === 0
                      ? hasTransportEntry
                        ? "No items added yet. Use the entry row above to add items."
                        : "Open this page from the warehouse workflow to add inventory items."
                      : "No items match the current search."}
                  </div>
                ) : (
                  filteredItems.map(({ item, index }) => (
                    <div
                      key={item.id}
                      className={`flex text-xs text-gray-800 dark:text-gray-100 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 ${editIndex === index ? "bg-blue-50 dark:bg-blue-900/20" : ""}`}
                    >
                      <div className="px-2 py-1.5 w-10 border-r dark:border-gray-700 text-center">{item.sNo}</div>
                      <div className="px-2 py-1.5 w-20 border-r dark:border-gray-700 truncate">{item.size || "-"}</div>
                      <div className="px-2 py-1.5 w-20 border-r dark:border-gray-700 truncate">{item.designNo || "-"}</div>
                      <div className="px-2 py-1.5 w-16 border-r dark:border-gray-700 truncate">{item.hsnCode || attrs.hsnCode || "-"}</div>
                      <div className="px-2 py-1.5 w-12 border-r dark:border-gray-700 text-right">{item.qty}</div>
                      <div className="px-2 py-1.5 w-20 border-r dark:border-gray-700 text-right">{formatMoney(item.cost)}</div>
                      <div className="px-2 py-1.5 w-14 border-r dark:border-gray-700 text-right">{formatMoney(item.pDis)}</div>
                      <div className="px-2 py-1.5 w-16 border-r dark:border-gray-700 text-right">{item.marginPerc || 0}%</div>
                      <div className="px-2 py-1.5 w-16 border-r dark:border-gray-700 text-right">{formatMoney(item.sellingPrice)}</div>
                      <div className="px-2 py-1.5 w-16 border-r dark:border-gray-700 text-right">{formatMoney(item.mrp)}</div>
                      <div className="px-2 py-1.5 w-14 border-r dark:border-gray-700 text-right">{item.discountPerc || 0}%</div>
                      <div className="px-2 py-1.5 w-16 border-r dark:border-gray-700 text-right">{formatMoney(item.finalPrice)}</div>
                      <div className="px-2 py-1.5 w-20 border-r dark:border-gray-700 text-right font-medium">{formatMoney(item.amount)}</div>
                      <div className="px-2 py-1.5 w-16 flex items-center justify-center gap-1">
                        <button
                          onClick={() => handleEditItem(index)}
                          className="text-blue-500 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition"
                          title="Edit"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleRemoveItem(index)}
                          className="text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </div>

            <div className="mt-2 flex items-center justify-between gap-3 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-xs font-bold">
              <div className="flex flex-wrap items-center gap-4">
                <span className="text-red-800 dark:text-red-300">TOTAL <span className="ml-1 text-green-700 dark:text-green-400">{formatMoney(rowsTotal)}</span></span>
                <span className="text-red-800 dark:text-red-300">Taxable <span className="ml-1 text-orange-600 dark:text-orange-400">{formatMoney(computedTotals.taxable)}</span></span>
                <span className="text-red-800 dark:text-red-300">Tax <span className="ml-1 text-rose-500 dark:text-rose-400">{formatMoney(taxAmount)}</span></span>
                <span className="text-red-800 dark:text-red-300">Discount <span className="ml-1 text-rose-500 dark:text-rose-400">{formatMoney(computedTotals.discount)}</span></span>
                <span className="text-red-800 dark:text-red-300">Qty <span className="ml-1 text-red-600 dark:text-red-400">{formatMoney(computedTotals.qty)}</span></span>
              </div>

              <select
                name="invoiceWorkflowStatus"
                value={attrs.invoiceWorkflowStatus}
                onChange={handleAttrChange}
                className="min-w-[210px] rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2.5 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300"
              >
                {WORKFLOW_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

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
    </div>
  );
};

export default InventoryEntry;

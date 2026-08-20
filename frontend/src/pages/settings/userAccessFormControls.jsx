import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";

// Small presentational form primitives shared by the User Access page (UserAccess.jsx)
// and the Store Groups management drawer (StoreGroupsDrawer.jsx). Extracted from
// UserAccess.jsx so both can render the same look/behavior without duplicating markup.

export const TextInput = ({ label, value, onChange, type = "text", required = false }) => (
  <div className="flex items-center">
    <label className="w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300">
      {required ? <span className="mr-1 text-red-500">*</span> : null}
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      className="ml-3 min-w-0 flex-1 rounded-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-100 p-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  </div>
);

export const SelectInput = ({ label, value, onChange, options = [], required = false }) => (
  <div className="flex items-center">
    <label className="w-1/3 text-sm font-medium text-gray-700 dark:text-gray-300">
      {required ? <span className="mr-1 text-red-500">*</span> : null}
      {label}
    </label>
    <select
      value={value}
      onChange={onChange}
      className="ml-3 min-w-0 flex-1 rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 dark:text-gray-100 p-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value} disabled={!!option.disabled}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

export const MultiSelectInput = ({
  label,
  value = [],
  onChange,
  options = [],
  required = false,
  helperText = "",
  placeholder = "Select companies",
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedSet = new Set(value.map(String));
  const selectedLabels = options.filter((option) => selectedSet.has(String(option.value))).map((option) => option.label);

  const toggleOption = (optionValue) => {
    const normalizedValue = String(optionValue);
    const nextValues = selectedSet.has(normalizedValue)
      ? value.filter((entry) => String(entry) !== normalizedValue)
      : [...value, normalizedValue];
    onChange(nextValues);
  };

  return (
    <div className="flex items-start">
      <label className="w-1/3 pt-2 text-sm font-medium text-gray-700 dark:text-gray-300">
        {required ? <span className="mr-1 text-red-500">*</span> : null}
        {label}
      </label>
      <div className="relative ml-3 flex-1" ref={wrapperRef}>
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          className="flex min-h-[40px] w-full items-center justify-between rounded-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 py-2 text-left text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        >
          <span className={selectedLabels.length ? "text-gray-800 dark:text-gray-100" : "text-gray-500 dark:text-gray-400"}>
            {selectedLabels.length ? selectedLabels.join(", ") : placeholder}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-500 dark:text-gray-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
        </button>

        {isOpen ? (
          <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-sm border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-lg">
            {options.map((option) => {
              const checked = selectedSet.has(String(option.value));
              return (
                <label
                  key={option.value}
                  className="flex cursor-pointer items-center gap-2 border-b border-gray-100 dark:border-gray-700 px-3 py-2 text-sm text-gray-700 dark:text-gray-300 last:border-b-0 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleOption(option.value)}
                    className="h-4 w-4"
                  />
                  <span>{option.label}</span>
                </label>
              );
            })}
          </div>
        ) : null}

        {selectedLabels.length ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {selectedLabels.map((selectedLabel) => (
              <span key={selectedLabel} className="rounded-full bg-blue-50 dark:bg-blue-900/30 px-2 py-1 text-xs font-medium text-blue-700 dark:text-blue-400">
                {selectedLabel}
              </span>
            ))}
          </div>
        ) : null}

        {helperText ? <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{helperText}</p> : null}
      </div>
    </div>
  );
};

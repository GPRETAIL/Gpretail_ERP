import React, { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useCompanyOptions from "../../utils/useCompanyOptions";

// Reusable SelectInput helper component (simplified)
const SelectInput = ({
  label,
  options,
  value,
  onChange,
  name,
  className = "",
  isRequired = false,
}) => (
  <div className={`flex-1 min-w-0 ${className}`}>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
      {isRequired && <span className="text-red-500 dark:text-red-400 mr-0.5">*</span>}
      {label}
    </label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="">ALL</option>
      {options.map((option, index) => (
        <option key={index} value={option.value || option.label}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

// Input Field helper
const InputField = ({
  label,
  type = "text",
  value,
  onChange,
  name,
  isDate = false,
  isRadio = false,
}) => (
  <div>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
      {label}
    </label>
    {isRadio ? (
      <div className="flex space-x-4">
        <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
          <input
            type="radio"
            name={name}
            value="Warehouse"
            checked={value === "Warehouse"}
            onChange={onChange}
            className="rounded-full border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 mr-1"
          />
          From Warehouse
        </label>
        <label className="flex items-center text-sm text-gray-700 dark:text-gray-300">
          <input
            type="radio"
            name={name}
            value="Retail"
            checked={value === "Retail"}
            onChange={onChange}
            className="rounded-full border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-blue-500 mr-1"
          />
          From Retail
        </label>
      </div>
    ) : (
      <input
        type={isDate ? "date" : type}
        name={name}
        value={value}
        onChange={onChange}
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500"
      />
    )}
  </div>
);

const StockOutwardSearchPage = () => {
  const navigate = useNavigate();
  const companyOptions = useCompanyOptions({ includeAll: true });
  const [filters, setFilters] = useState({
    fromCompany: "",
    toCompany: "",
    fromLocation: "",
    toLocation: "",
    status: "",
    outwardDate: "",
    code: "",
    sourceType: "Warehouse", // Default radio selection
  });

  const [results, setResults] = useState([]); // Mock search results state

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    console.log("Searching Stock Outward with filters:", filters);
    // Mock results for demonstration
    setResults([
      {
        code: "SO/2025/001",
        from: "Comp A",
        to: "Comp B",
        date: "05-11-2025",
        status: "Closed",
      },
      {
        code: "SO/2025/002",
        from: "Comp B",
        to: "Comp C",
        date: "06-11-2025",
        status: "Pending",
      },
    ]);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  // Mock options
  const locationOptions = [{ label: "Location 1" }, { label: "Location 2" }];
  const statusOptions = [
    { label: "Pending" },
    { label: "Closed" },
    { label: "In Transit" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      {/* --- Header Section (Back/Search) --- */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <button
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Back"
            onClick={handleBackClick}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold">
            Warehouse / Stock Outward Search
          </h1>
        </div>
        <button
          onClick={handleSearch}
          className="glass-btn glass-btn-primary flex items-center justify-center"
        >
          <Search className="w-4 h-4 mr-1" /> Search
        </button>
      </div>

      {/* --- Filters Section --- */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-5 gap-6">
          {/* Column 1 */}
          <div className="space-y-4">
            <SelectInput
              label="From Company"
              name="fromCompany"
              options={companyOptions}
              value={filters.fromCompany}
              onChange={handleFilterChange}
            />
            <SelectInput
              label="To Company"
              name="toCompany"
              options={companyOptions}
              value={filters.toCompany}
              onChange={handleFilterChange}
            />
            <SelectInput
              label="From Location"
              name="fromLocation"
              options={locationOptions}
              value={filters.fromLocation}
              onChange={handleFilterChange}
            />
          </div>

          {/* Column 2 */}
          <div className="space-y-4">
            <SelectInput
              label="To Location"
              name="toLocation"
              options={locationOptions}
              value={filters.toLocation}
              onChange={handleFilterChange}
            />
            <SelectInput
              label="Status"
              name="status"
              options={statusOptions}
              value={filters.status}
              onChange={handleFilterChange}
            />
            <InputField
              label="Outward Date"
              name="outwardDate"
              isDate
              value={filters.outwardDate}
              onChange={handleFilterChange}
            />
          </div>

          {/* Column 3 */}
          <div className="space-y-4">
            <InputField
              label="Code"
              name="code"
              value={filters.code}
              onChange={handleFilterChange}
            />
            <InputField
              label=""
              name="sourceType"
              isRadio
              value={filters.sourceType}
              onChange={handleFilterChange}
            />
          </div>

          {/* Columns 4 & 5 (Empty for spacing) */}
          <div></div>
          <div></div>
        </div>
      </div>

      {/* --- Results Table --- */}
      <div className="p-4 overflow-x-auto">
        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-100 mb-3">
          Search Results ({results.length})
        </h2>
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm">
          {/* Table Header Row */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30 text-xs font-semibold text-gray-700 dark:text-gray-300">
            <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[120px]">Code</div>
            <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[100px]">Date</div>
            <div className="p-2 border-r border-gray-200 dark:border-gray-700 flex-grow">From Company</div>
            <div className="p-2 border-r border-gray-200 dark:border-gray-700 flex-grow">To Company</div>
            <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[150px]">Status</div>
            <div className="p-2 w-[80px] text-center">Action</div>
          </div>

          {/* Table Data */}
          <div className="min-h-[30vh] overflow-y-auto">
            {results.length === 0 ? (
              <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                No stock outward records found.
              </div>
            ) : (
              results.map((entry, index) => (
                <div
                  key={index}
                  className="flex border-b border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => console.log(`Viewing Outward ${entry.code}`)}
                >
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[120px] font-medium text-blue-700 dark:text-blue-400">
                    {entry.code}
                  </div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[100px]">{entry.date}</div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 flex-grow">{entry.from}</div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 flex-grow">{entry.to}</div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[150px]">{entry.status}</div>
                  <div className="p-2 w-[80px] text-center text-blue-600 dark:text-blue-400 hover:underline">
                    View
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Bar of the Table */}
          <div className="flex justify-start items-center p-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <span>Showing all {results.length} rows</span>
          </div>
        </div>
      </div>

      {/* --- Footer License/Contact Bar (Placeholder) --- */}
      <div className="fixed bottom-0 w-full flex justify-between items-center px-4 py-1 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-800">
        <span className="font-mono">
          License: ... @ STORE SOFT SOLUTION PVT LTD
        </span>
        <span>Customer Care **+91 93840 30115 / 6 / 7**</span>
      </div>
    </div>
  );
};

export default StockOutwardSearchPage;

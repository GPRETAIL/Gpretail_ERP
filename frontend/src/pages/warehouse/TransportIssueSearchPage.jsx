import React, { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";

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

const TransportIssueSearchPage = () => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    bookingOffice: "",
    supplier: "",
    issueNo: "",
    issueDate: "",
    fromCity: "",
    fromLocation: "",
  });

  const [results, setResults] = useState([]); // Mock search results state

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    console.log("Searching Transport Issues with filters:", filters);
    // In a real app, this would fetch data from an API based on filters
    setResults([
      // Mock results for demonstration
      {
        issueNo: "TI/2025/001",
        office: "Office A",
        supplier: "Supp A",
        date: "05-11-2025",
        city: "City A",
      },
    ]);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  // Mock options
  const officeOptions = [
    { label: "Booking Office A" },
    { label: "Booking Office B" },
  ];
  const supplierOptions = [{ label: "Supplier X" }, { label: "Supplier Y" }];
  const cityOptions = [{ label: "City A" }, { label: "City B" }];
  const locationOptions = [{ label: "Location 1" }, { label: "Location 2" }];

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
            Warehouse / Transport Issue Search
          </h1>
        </div>
        <button
          onClick={handleSearch}
          className="glass-btn glass-btn-primary flex items-center justify-center"
        >
          <Search className="w-4 h-4 mr-1" /> Search
        </button>
      </div>

      {/* --- Filters Section (Vertical Layout) --- */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-4 gap-4">
          {/* Column 1: Main Filter Fields */}
          <div className="space-y-3 w-full max-w-xs">
            <SelectInput
              label="Booking Office"
              name="bookingOffice"
              options={officeOptions}
              value={filters.bookingOffice}
              onChange={handleFilterChange}
            />

            <SelectInput
              label="Supplier"
              name="supplier"
              options={supplierOptions}
              value={filters.supplier}
              onChange={handleFilterChange}
            />

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Issue No
              </label>
              <input
                type="text"
                name="issueNo"
                value={filters.issueNo}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                Issue Date
              </label>
              <input
                type="date"
                name="issueDate"
                value={filters.issueDate}
                onChange={handleFilterChange}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <SelectInput
              label="From City"
              name="fromCity"
              options={cityOptions}
              value={filters.fromCity}
              onChange={handleFilterChange}
            />

            <SelectInput
              label="Location"
              name="fromLocation"
              options={locationOptions}
              value={filters.fromLocation}
              onChange={handleFilterChange}
            />
          </div>

          {/* Columns 2, 3, 4 (Empty for spacing) */}
          <div></div>
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
            <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[120px]">Issue No</div>
            <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[100px]">Date</div>
            <div className="p-2 border-r border-gray-200 dark:border-gray-700 flex-grow">Booking Office</div>
            <div className="p-2 border-r border-gray-200 dark:border-gray-700 flex-grow">Supplier</div>
            <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[150px]">From City</div>
            <div className="p-2 w-[80px] text-center">Action</div>
          </div>

          {/* Table Data */}
          <div className="min-h-[30vh] overflow-y-auto">
            {results.length === 0 ? (
              <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                No transport issue records found.
              </div>
            ) : (
              results.map((entry, index) => (
                <div
                  key={index}
                  className="flex border-b border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() => console.log(`Viewing Issue ${entry.issueNo}`)}
                >
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[120px] font-medium text-blue-700 dark:text-blue-400">
                    {entry.issueNo}
                  </div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[100px]">{entry.date}</div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 flex-grow">{entry.office}</div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 flex-grow">{entry.supplier}</div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-[150px]">{entry.city}</div>
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

      {/* --- Footer License/Contact Bar --- */}
      <div className="fixed bottom-0 w-full flex justify-between items-center px-4 py-1 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-800">
        <span className="font-mono">
          License: ... @ STORE SOFT SOLUTION PVT LTD
        </span>
        <span>Customer Care **+91 93840 30115 / 6 / 7**</span>
      </div>
    </div>
  );
};

export default TransportIssueSearchPage;

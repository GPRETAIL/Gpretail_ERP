import React, { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useCompanyOptions from "../../utils/useCompanyOptions";

// Mock Data for Intray results
const mockIntrayResults = [
  {
    date: "05-11-2025",
    type: "Transport Entry",
    description: "LRT/2025/001 - Supplier Alpha",
    createdBy: "User A",
    actionBy: "User A",
    status: "Open",
  },
  {
    date: "04-11-2025",
    type: "Invoice",
    description: "INV/2025/002 - Supplier Beta",
    createdBy: "User B",
    actionBy: "User C",
    status: "Pending",
  },
  {
    date: "03-11-2025",
    type: "Inventory Entry",
    description: "INV-E/003 - Buying Company",
    createdBy: "User C",
    actionBy: "User C",
    status: "Open",
  },
];

// Reusable SelectInput helper component (simplified)
const SelectInput = ({
  label,
  options,
  value,
  onChange,
  name,
  className = "",
}) => (
  <div className={`flex-1 min-w-0 ${className}`}>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      className="w-full border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
    >
      <option value="ALL">ALL</option>
      {options.map((option, index) => (
        <option key={index} value={option.value || option.label}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

const BarcodeGenerationSearch = () => {
  const navigate = useNavigate();
  const companyOptions = useCompanyOptions({ includeAll: true });
  const [filters, setFilters] = useState({
    type: "ALL",
    company: "ALL",
    status: "Open", // Default status as seen in the image
    date: "",
    // Filters for in-column search:
    descriptionSearch: "",
    createdBySearch: "",
  });

  const [results, setResults] = useState(mockIntrayResults);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  const handleSearch = () => {
    // In a real application, this would fetch data from an API based on filters
    console.log("Searching Intray with filters:", filters);

    // Filter mock data for demonstration
    const filteredResults = mockIntrayResults.filter((entry) => {
      const typeMatch = filters.type === "ALL" || entry.type === filters.type;
      const statusMatch =
        filters.status === "ALL" || entry.status === filters.status;
      const descMatch =
        filters.descriptionSearch === "" ||
        entry.description
          .toLowerCase()
          .includes(filters.descriptionSearch.toLowerCase());
      const createdByMatch =
        filters.createdBySearch === "" ||
        entry.createdBy
          .toLowerCase()
          .includes(filters.createdBySearch.toLowerCase());

      return typeMatch && statusMatch && descMatch && createdByMatch;
    });
    setResults(filteredResults);
  };

  const handleEntryClick = (type, entryId) => {
    // In a real application, this would navigate to the specific entry form (Transport/Invoice/Inventory)
    console.log(`Navigating to ${type} entry for ID: ${entryId}`);
    // Example navigation logic:
    if (type === "Transport Entry")
      navigate("/warehouse/transport-entry/edit/" + entryId);
    // ... other navigations
  };

  // Mock options
  const typeOptions = [
    { label: "Transport Entry" },
    { label: "Invoice" },
    { label: "Inventory Entry" },
    { label: "Barcode Generation" },
  ];
  const statusOptions = [
    { label: "Open" },
    { label: "Pending" },
    { label: "Closed" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* --- Header Section --- */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <button
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Back"
            onClick={() => navigate(-1)} // Navigate back from Intray
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Intray
            <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
              | {results.length} Entries
            </span>
          </h1>
        </div>
      </div>

      {/* --- Main Filter Row --- */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap items-end gap-3">
          {/* Type Filter */}
          <SelectInput
            label="Type"
            name="type"
            options={typeOptions}
            value={filters.type}
            onChange={handleFilterChange}
            className="max-w-[150px]"
          />

          {/* Company Filter */}
          <SelectInput
            label="Company"
            name="company"
            options={companyOptions}
            value={filters.company}
            onChange={handleFilterChange}
            className="max-w-[150px]"
          />

          {/* Status Filter */}
          <SelectInput
            label="Status"
            name="status"
            options={statusOptions}
            value={filters.status}
            onChange={handleFilterChange}
            className="max-w-[150px]"
          />

          {/* Date Filter */}
          <div className="flex-1 max-w-[150px]">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
              Date
            </label>
            <input
              type="date"
              name="date"
              value={filters.date}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1.5 text-sm focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {/* Search Button */}
          <button
            onClick={handleSearch}
            className="glass-btn glass-btn-primary flex items-center justify-center h-[34px]"
          >
            <Search className="w-4 h-4 mr-1" /> Search
          </button>
        </div>

        {/* --- In-Column Search/Header Row --- */}
        <div className="mt-4 flex space-x-2 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
          <div className="w-[100px]">Date</div>
          <div className="w-[150px]">Type</div>
          <div className="flex-grow">Description</div>
          <div className="w-[120px]">Created By</div>
          <div className="w-[120px]">Action By</div>
          <div className="w-[100px]">Status</div>
          <div className="w-[80px]">Action</div>
        </div>
        <div className="flex space-x-2 text-sm mt-0.5">
          <input
            type="text"
            placeholder=""
            className="w-[100px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1 focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder=""
            className="w-[150px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1 focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder=""
            name="descriptionSearch"
            value={filters.descriptionSearch}
            onChange={handleFilterChange}
            className="flex-grow border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1 focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder=""
            name="createdBySearch"
            value={filters.createdBySearch}
            onChange={handleFilterChange}
            className="w-[120px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1 focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder=""
            className="w-[120px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1 focus:ring-1 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder=""
            className="w-[100px] border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm p-1 focus:ring-1 focus:ring-blue-500"
          />
          <div className="w-[80px] bg-blue-200 dark:bg-blue-900/50 border border-blue-300 dark:border-blue-700 rounded-sm h-8"></div>
        </div>
      </div>

      {/* --- Results Table --- */}
      <div className="p-4 overflow-x-auto">
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm">
          {/* Table Data (Main Content) */}
          <div className="min-h-[50vh] overflow-y-auto">
            {results.length === 0 ? (
              <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                No entries found matching your criteria.
              </div>
            ) : (
              results.map((entry, index) => (
                <div
                  key={index}
                  className="flex border-b border-gray-200 dark:border-gray-700 text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                  onClick={() =>
                    handleEntryClick(
                      entry.type,
                      entry.description.split(" - ")[0]
                    )
                  }
                >
                  <div className="p-2 w-[100px]">{entry.date}</div>
                  <div className="p-2 w-[150px] font-medium text-blue-700 dark:text-blue-400">
                    {entry.type}
                  </div>
                  <div className="p-2 flex-grow">{entry.description}</div>
                  <div className="p-2 w-[120px]">{entry.createdBy}</div>
                  <div className="p-2 w-[120px]">{entry.actionBy}</div>
                  <div className="p-2 w-[100px]">{entry.status}</div>
                  <div className="p-2 w-[80px] text-center text-blue-600 dark:text-blue-400 hover:underline">
                    View
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Bar of the Table (Showing row count) */}
          <div className="flex justify-between items-center p-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
              />
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
              />
              <input
                type="checkbox"
                className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
              />
            </div>
            <span>Showing all {results.length} rows</span>
          </div>
        </div>
      </div>

      {/* --- Footer License/Contact Bar (Matching image_ffcc42.png) --- */}
      <div className="fixed bottom-0 w-full flex justify-between items-center px-4 py-1 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-800">
        <span className="font-mono">
          License: 432A3G-SGND8T-L6ATEM-9GHI6V @ STORE SOFT SOLUTION PVT LTD.
        </span>
        <span>Customer Care **+91 93840 30115 / 6 / 7**</span>
      </div>
    </div>
  );
};

export default BarcodeGenerationSearch;

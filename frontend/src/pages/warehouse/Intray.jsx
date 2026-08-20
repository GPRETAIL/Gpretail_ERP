import React, { useState } from "react";
import { ArrowLeft, Search } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useCompanyOptions from "../../utils/useCompanyOptions";

// Mock data structure for the list
const mockEntries = [
  {
    date: "01-11-2025",
    type: "Invoice",
    description: "Inv-2025/1001",
    createdBy: "Admin",
    actionBy: "Manager",
    status: "Pending",
  },
  {
    date: "02-11-2025",
    type: "PO",
    description: "PO-2025/505",
    createdBy: "User1",
    actionBy: "Director",
    status: "Open",
  },
  {
    date: "03-11-2025",
    type: "Delivery Note",
    description: "DN-0045",
    createdBy: "Store",
    actionBy: "Manager",
    status: "Approved",
  },
];

const Intray = () => {
  const companyOptions = useCompanyOptions({ includeAll: true });
  const [entries, setEntries] = useState(mockEntries);
  const [filters, setFilters] = useState({
    type: "ALL",
    company: "",
    status: "Open",
    date: "",
  });

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };
  const navigate = useNavigate();
  const handleBackClick = () => {
    navigate(-1);
  };

  const handleSearch = () => {
    // In a real application, this would fetch data from an API based on filters
    console.log("Searching with filters:", filters);
    // For demonstration, we'll just filter the mock data
    const results = mockEntries.filter((entry) => {
      const typeMatch = filters.type === "ALL" || entry.type === filters.type;
      const statusMatch =
        filters.status === "" || entry.status === filters.status;
      // Add more complex filtering logic here for date, company, etc.
      return typeMatch && statusMatch;
    });
    setEntries(results);
  };

  // Mock options for select fields
  const typeOptions = [
    { value: "ALL", label: "ALL" },
    { value: "Invoice", label: "Invoice" },
    { value: "PO", label: "Purchase Order" },
    { value: "Delivery Note", label: "Delivery Note" },
  ];

  const statusOptions = [
    { value: "Open", label: "Open" },
    { value: "Pending", label: "Pending" },
    { value: "Approved", label: "Approved" },
    { value: "Rejected", label: "Rejected" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-100">
      {/* --- Header Section --- */}
      <div className="flex items-center px-4 py-2 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm">
        <button
          className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3"
          aria-label="Back"
          onClick={handleBackClick}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-sm font-semibold">
          Intray
          <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
            | {entries.length} Entries
          </span>
        </h1>
      </div>

      {/* --- Filters Section --- */}
      <div className="p-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-end space-x-4">
          {/* Type Filter */}
          <div className="flex-1 max-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Type
            </label>
            <select
              name="type"
              value={filters.type}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              {typeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Company Filter */}
          <div className="flex-1 max-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Company
            </label>
            <select
              name="company"
              value={filters.company}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              {companyOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex-1 max-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              Status
            </label>
            <select
              name="status"
              value={filters.status}
              onChange={handleFilterChange}
              className="w-full border border-gray-300 dark:border-gray-600 rounded-sm p-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Filter (as date range or single date) */}
          <div className="flex-1 max-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
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
            className="glass-btn glass-btn-primary flex items-center justify-center"
          >
            <Search className="w-4 h-4 mr-1" /> Search
          </button>
        </div>
      </div>

      {/* --- Results Table --- */}
      <div className="p-4 overflow-x-auto">
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-sm">
          {/* Table Header Row (Blue background) */}
          <div className="flex border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30 text-xs font-semibold text-gray-700 dark:text-gray-300">
            {/* These input-style placeholders in the image suggest inline column filtering */}
            <input
              type="text"
              placeholder="Date"
              className="p-2 border-r border-gray-300 dark:border-gray-600 w-1/12 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Type"
              className="p-2 border-r border-gray-300 dark:border-gray-600 w-1/12 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Description"
              className="p-2 border-r border-gray-300 dark:border-gray-600 flex-grow bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Created By"
              className="p-2 border-r border-gray-300 dark:border-gray-600 w-2/12 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Action By"
              className="p-2 border-r border-gray-300 dark:border-gray-600 w-2/12 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
            <input
              type="text"
              placeholder="Status"
              className="p-2 border-r border-gray-300 dark:border-gray-600 w-1/12 bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none"
            />
            <div className="p-2 w-1/12 bg-blue-100 dark:bg-blue-900/50 text-center">Action</div>
          </div>

          {/* Table Data (Main Content) */}
          <div className="min-h-[50vh] overflow-y-auto">
            {entries.length === 0 ? (
              <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                Showing all 0 rows
              </div>
            ) : (
              entries.map((entry, index) => (
                <div
                  key={index}
                  className="flex border-b border-gray-200 dark:border-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer"
                >
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-1/12">{entry.date}</div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-1/12">{entry.type}</div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 flex-grow">
                    {entry.description}
                  </div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-2/12">{entry.createdBy}</div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-2/12">{entry.actionBy}</div>
                  <div className="p-2 border-r border-gray-200 dark:border-gray-700 w-1/12">{entry.status}</div>
                  <div className="p-2 w-1/12 text-center text-blue-600 dark:text-blue-400 hover:underline">
                    View
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer Bar of the Table */}
          <div className="flex justify-between items-center p-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
            <div className="flex items-center space-x-2">
              <input type="checkbox" className="w-3 h-3" />
              <input type="checkbox" className="w-3 h-3" />
              <input type="checkbox" className="w-3 h-3" />
              <span>Showing all {entries.length} rows</span>
            </div>
            <div className="flex items-center space-x-2">
              {/* Pagination controls would go here */}
              <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                {"<"}
              </button>
              <span className="font-semibold">1</span>
              <button className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                {">"}
              </button>
              <div className="border-l border-gray-200 dark:border-gray-700 pl-2 ml-2 text-gray-400 dark:text-gray-500">
                <div className="w-4 h-4 border border-gray-400 dark:border-gray-600"></div>{" "}
                {/* Scrollbar Placeholder */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Footer License/Contact Bar --- */}
      <div className="fixed bottom-0 w-full flex justify-between items-center px-4 py-1 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-300 dark:border-gray-700 bg-gray-200 dark:bg-gray-800">
        <span className="font-mono">
          License : 4J2A3G-SGND8T-L6A7EM-9CH16V @ **STORE SOFT SOLUTION PVT
          LTD.**
        </span>
        <span>Customer Care **+91 93840 30115 / 6 / 7**</span>
      </div>
    </div>
  );
};

export default Intray;

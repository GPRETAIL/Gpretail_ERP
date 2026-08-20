import React, { useState } from "react";
import { ArrowLeft, Search, User } from "lucide-react";

const ReceiveGoods = () => {
  const [packageCode, setPackageCode] = useState("");
  const [statusMessage, setStatusMessage] = useState({
    type: "info",
    message: "Scan or enter the package code to receive goods.",
  });

  const handleCodeChange = (e) => {
    setPackageCode(e.target.value);
  };

  const handleSearch = () => {
    if (!packageCode.trim()) {
      setStatusMessage({
        type: "error",
        message: "Please enter a package code.",
      });
      return;
    }

    // Simulate API call to check/receive the package
    console.log("Processing Package Code:", packageCode);

    // Mock response based on the code
    if (packageCode.toLowerCase().includes("fail")) {
      setStatusMessage({
        type: "error",
        message: `Package ${packageCode} not found or already received.`,
      });
    } else {
      setStatusMessage({
        type: "success",
        message: `Package ${packageCode} successfully received and processed.`,
      });
    }
    setPackageCode(""); // Clear input for next scan
  };

  const handleBackClick = () => {
    // navigate(-1); // Use for actual routing
    console.log("Navigating back...");
  };

  // Determine message styling
  const statusClasses = {
    info: "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400",
    success: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400",
    error: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400",
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* --- Header --- */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 shadow-sm sticky top-0 z-10">
        <div className="flex items-center">
          <button
            onClick={handleBackClick}
            className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 mr-3 p-1 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700"
            aria-label="Back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="text-sm font-semibold text-gray-800 dark:text-gray-100">
            Warehouse / Receive Goods
          </h1>
        </div>
        <div className="flex items-center space-x-2 text-sm text-gray-700 dark:text-gray-300">
          <User className="w-5 h-5" />
          <span className="font-medium">User: Admin</span>
        </div>
      </div>

      {/* --- Main Content Area (Input/Search) --- */}
      <div className="flex-1 p-8">
        <div className="w-full max-w-2xl mx-auto bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl border border-gray-300 dark:border-gray-600">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
            Package code
          </label>
          <div className="flex">
            <input
              type="text"
              value={packageCode}
              onChange={handleCodeChange}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              placeholder="Scan or enter package code..."
              className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-l-md px-4 py-2 text-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <button
              onClick={handleSearch}
              className="glass-btn glass-btn-primary flex items-center justify-center rounded-r-md"
              aria-label="Search Package Code"
            >
              <Search className="w-5 h-5" />
            </button>
          </div>

          {/* Status Message Area */}
          <div
            className={`mt-6 p-4 rounded-md font-medium ${
              statusClasses[statusMessage.type]
            }`}
          >
            {statusMessage.message}
          </div>

          {/* Placeholder for scanned item details to appear below */}
          <div className="mt-8 pt-4 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-md font-semibold text-gray-800 dark:text-gray-100">
              Scanned Item Details:
            </h3>
            <ul className="text-sm text-gray-600 dark:text-gray-400 mt-2 space-y-1">
              <li>**Invoice No:** (Appears after successful scan)</li>
              <li>**Supplier:** (Appears after successful scan)</li>
              <li>**Total Pieces:** (Appears after successful scan)</li>
            </ul>
          </div>
        </div>
      </div>

      {/* --- Global Footer Bar --- */}
      <div className="fixed bottom-0 w-full flex justify-end space-x-3 p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 z-10">
        <span className="text-xs text-gray-600 dark:text-gray-400 self-center">
          Customer Care **+91 93840 30115 / 6 / 7**
        </span>
      </div>
    </div>
  );
};

export default ReceiveGoods;

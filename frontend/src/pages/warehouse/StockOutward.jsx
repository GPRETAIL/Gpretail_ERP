import React, { useState } from "react";
import { ArrowLeft, Search, Save, Plus, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import useCompanyOptions from "../../utils/useCompanyOptions";

// --- Custom Components for Reusability ---

const FormField = ({
  label,
  type = "text",
  isDate = false,
  isSelect = false,
  isRequired = false,
  options = [],
  className = "",
}) => (
  <div className={`text-sm ${className}`}>
    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
      {isRequired && <span className="text-red-500 dark:text-red-400 mr-0.5">*</span>}
      {label}
    </label>
    {isSelect ? (
      <select className="w-full border border-gray-300 dark:border-gray-600 rounded-sm px-2 py-1.5 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-1 focus:ring-blue-500">
        <option value="">Select...</option>
        {options.map((opt, index) => (
          <option key={index} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    ) : (
      <input
        type={isDate ? "date" : type}
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-2 py-1.5 text-sm focus:ring-1 focus:ring-blue-500"
      />
    )}
  </div>
);

// --- Main Component ---

const StockOutward = () => {
  const navigate = useNavigate();
  const companyOptions = useCompanyOptions();
  const [sourceItems, setSourceItems] = useState([]); // Items from the source
  const [acceptedItems, setAcceptedItems] = useState([]); // Items accepted for outward dispatch

  const handleSearch = () => {
    navigate("/warehouse/stock-outward/search");
  };

  const handleAddItemToAccepted = (item) => {
    setSourceItems((prev) => prev.filter((i) => i.barcode !== item.barcode));
    setAcceptedItems((prev) => [...prev, item]);
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  const handleSaveClick = () => {
    console.log("Saving Stock Outward:", acceptedItems);
    alert("Stock Outward saved!");
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex flex-col">
      {/* --- Header & Action Bar --- */}
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
            Warehouse / Stock Outward
          </h1>
        </div>
        <div className="flex space-x-2 text-sm">
          <span className="text-sm font-medium text-green-600 dark:text-green-400 self-center">
            Last Saved
          </span>
          <button
            onClick={handleSaveClick}
            className="glass-btn glass-btn-success flex items-center"
          >
            <Save className="w-4 h-4 mr-1" /> New
          </button>
          <button
            onClick={handleSaveClick}
            className="glass-btn glass-btn-success flex items-center"
          >
            <Save className="w-4 h-4 mr-1" /> Save
          </button>
          <button
            className="glass-btn glass-btn-primary flex items-center"
            onClick={handleSearch}
          >
            <Search className="w-4 h-4 mr-1" /> Search
          </button>
        </div>
      </div>

      {/* --- Main Content Area (Form & Grids) --- */}
      <div className="flex-1 p-4 overflow-y-auto">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md border border-gray-300 dark:border-gray-600 mb-4">
          {/* Top Header Row - Two Columns */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {/* Left Column Fields */}
            <div className="grid grid-cols-4 gap-3">
              <div className="col-span-1">
                <FormField label="* Date" isDate isRequired />
              </div>
              <div className="col-span-3 flex space-x-2">
                <div className="flex-1">
                  <FormField label="Code" />
                </div>
                <button className="glass-btn glass-btn-primary self-end">
                  <Search className="w-4 h-4" />
                </button>
              </div>

              <div className="col-span-4">
                <FormField
                  label="* From Company"
                  isSelect
                  isRequired
                  options={companyOptions.map((row) => row.label)}
                />
              </div>

              <div className="col-span-4">
                <FormField label="Date" isDate />
              </div>

              <div className="col-span-4">
                <FormField
                  label="Source"
                  isSelect
                  isRequired
                  options={["Pending", "Approved"]}
                />
              </div>

              <div className="col-span-4">
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">
                      supplier
                    </label>
                    <input
                      type="text"
                      placeholder="supplier"
                      className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-sm px-2 py-1.5 text-sm"
                    />
                  </div>
                  <button
                    onClick={handleSearch}
                    className="glass-btn glass-btn-primary self-end"
                  >
                    <Search className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleSearch}
                    className="glass-btn glass-btn-danger self-end"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Right Column Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <FormField
                  label="* Packed By"
                  isSelect
                  isRequired
                  options={["Employee 1", "Employee 2"]}
                />
              </div>
              <div className="col-span-2">
                <FormField
                  label="* From Location"
                  isSelect
                  isRequired
                  options={["Location A", "Location B"]}
                />
              </div>
              <div className="col-span-2">
                <FormField
                  label="* To Location"
                  isSelect
                  isRequired
                  options={["Location X", "Location Y"]}
                />
              </div>
              <div className="col-span-2 flex items-center space-x-3">
                <input
                  type="checkbox"
                  className="rounded border-gray-300 dark:border-gray-600 text-blue-600"
                />
                <div className="flex-1">
                  <FormField label="Barcode" />
                </div>
                <button className="glass-btn glass-btn-primary self-end">
                  <Plus className="w-4 h-4" />
                </button>
                <button className="glass-btn glass-btn-danger self-end">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* --- Dual Grids Section --- */}
        <div className="grid grid-cols-2 gap-4">
          {/* LEFT GRID: Source/Pending Items */}
          <div className="w-full">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Source Items ({sourceItems.length})
            </h3>
            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
              {/* Grid Header Row */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <div className="p-2 w-[80px]">Barcode</div>
                <div className="p-2 w-[120px]">Name</div>
                <div className="p-2 w-[50px] text-center">Size</div>
                <div className="p-2 flex-1">Supplier</div>
                <div className="p-2 w-[60px]">LR.Ref</div>
                <div className="p-2 w-[50px] text-right">Cost</div>
                <div className="p-2 w-[50px] text-center">Qty</div>
                <div className="p-2 w-[50px] text-center">Action</div>
              </div>

              {/* Input/Filter Row */}
              <div className="flex items-center text-sm bg-gray-100 dark:bg-gray-700 p-0.5 border-b border-gray-200 dark:border-gray-700">
                <div className="w-[80px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[120px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[50px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="flex-1 p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[60px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[50px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[50px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[50px] p-0.5"></div>
              </div>

              {/* Data Rows */}
              <div className="min-h-[40vh] overflow-y-auto">
                {sourceItems.length === 0 ? (
                  <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                    No items pending for outward processing.
                  </div>
                ) : (
                  sourceItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700"
                    >
                      <div className="p-2 w-[80px] font-mono text-xs">
                        {item.barcode}
                      </div>
                      <div className="p-2 w-[120px]">{item.name}</div>
                      <div className="p-2 w-[50px] text-center">
                        {item.size}
                      </div>
                      <div className="p-2 flex-1 text-xs">{item.supplier}</div>
                      <div className="p-2 w-[60px] text-xs">{item.lrRef}</div>
                      <div className="p-2 w-[50px] text-right">
                        {item.cost.toFixed(2)}
                      </div>
                      <div className="p-2 w-[50px] text-center">{item.qty}</div>
                      <div className="p-2 w-[50px] text-center">
                        <button
                          onClick={() => handleAddItemToAccepted(item)}
                          className="text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 p-1"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                Showing all {sourceItems.length} rows
              </div>
            </div>
          </div>

          {/* RIGHT GRID: Accepted/Stock Outward Items */}
          <div className="w-full">
            <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Accepted Items ({acceptedItems.length})
            </h3>
            <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-sm overflow-hidden">
              {/* Grid Header Row */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 bg-blue-50 dark:bg-blue-900/30 text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                <div className="p-2 w-[80px]">Barcode</div>
                <div className="p-2 w-[120px]">Name</div>
                <div className="p-2 w-[50px] text-center">Size</div>
                <div className="p-2 flex-1">Supplier</div>
                <div className="p-2 w-[60px]">LR.Ref</div>
                <div className="p-2 w-[50px] text-right">Cost</div>
                <div className="p-2 w-[50px] text-center">Qty</div>
                <div className="p-2 w-[50px] text-center font-bold">
                  Accepted
                </div>
              </div>

              {/* Input/Filter Row */}
              <div className="flex items-center text-sm bg-gray-100 dark:bg-gray-700 p-0.5 border-b border-gray-200 dark:border-gray-700">
                {/* Identical input row to the left grid, except for the last column */}
                <div className="w-[80px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[120px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[50px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="flex-1 p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[60px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[50px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[50px] p-0.5">
                  <input
                    type="text"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-sm p-1 text-xs focus:ring-1"
                  />
                </div>
                <div className="w-[50px] p-0.5"></div>
              </div>

              {/* Data Rows */}
              <div className="min-h-[40vh] overflow-y-auto">
                {acceptedItems.length === 0 ? (
                  <div className="text-center p-8 text-gray-500 dark:text-gray-400">
                    Items accepted for dispatch will appear here.
                  </div>
                ) : (
                  acceptedItems.map((item, index) => (
                    <div
                      key={index}
                      className="flex items-center text-sm text-gray-800 dark:text-gray-100 hover:bg-gray-50 dark:hover:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700"
                    >
                      <div className="p-2 w-[80px] font-mono text-xs">
                        {item.barcode}
                      </div>
                      <div className="p-2 w-[120px]">{item.name}</div>
                      <div className="p-2 w-[50px] text-center">
                        {item.size}
                      </div>
                      <div className="p-2 flex-1 text-xs">{item.supplier}</div>
                      <div className="p-2 w-[60px] text-xs">{item.lrRef}</div>
                      <div className="p-2 w-[50px] text-right">
                        {item.cost.toFixed(2)}
                      </div>
                      <div className="p-2 w-[50px] text-center">{item.qty}</div>
                      <div className="p-2 w-[50px] text-center text-green-600 dark:text-green-400 font-bold">
                        Yes
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="p-2 text-xs text-gray-600 dark:text-gray-400 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700">
                Showing all {acceptedItems.length} rows
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- Global Footer Bar --- */}
      <div className="flex justify-end space-x-3 p-3 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 sticky bottom-0 z-10">
        <button
          onClick={handleSaveClick}
          className="glass-btn glass-btn-success flex items-center"
        >
          Save & Exit
        </button>
        <button className="glass-btn glass-btn-secondary flex items-center">
          Clear
        </button>
      </div>
    </div>
  );
};

export default StockOutward;

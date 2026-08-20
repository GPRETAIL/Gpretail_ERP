import React from "react";
import { Plus, X } from "lucide-react";
import { useTabs } from "../context/TabContext";

const TabBar = () => {
  const { tabs, activeTabId, addTab, closeTab, switchTab, moveTab } = useTabs();
  const [draggedTabId, setDraggedTabId] = React.useState(null);

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-1 md:px-2 h-7 md:h-8 overflow-x-auto overflow-y-hidden shrink-0">
      <div className="flex items-center gap-0.5 min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isDashboard = tab.id === "dashboard";

          return (
            <div
              key={tab.id}
              onClick={() => switchTab(tab.id)}
              draggable
              onDragStart={(event) => {
                setDraggedTabId(tab.id);
                event.dataTransfer.effectAllowed = "move";
                event.dataTransfer.setData("text/plain", tab.id);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                event.dataTransfer.dropEffect = "move";
              }}
              onDrop={(event) => {
                event.preventDefault();
                const sourceTabId = draggedTabId || event.dataTransfer.getData("text/plain");
                moveTab(sourceTabId, tab.id);
                setDraggedTabId(null);
              }}
              onDragEnd={() => setDraggedTabId(null)}
              className={`flex items-center gap-1 px-1.5 md:px-2.5 py-0.5 md:py-1 rounded-t-md text-[10px] md:text-xs cursor-pointer select-none w-[100px] md:w-[160px] min-w-0 overflow-hidden transition-colors ${
                isActive
                  ? "bg-white dark:bg-gray-900 text-blue-600 dark:text-blue-400 border-t-2 border-t-blue-500 shadow-sm"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
              } ${draggedTabId === tab.id ? "opacity-60" : ""}`}
              title={tab.name}
            >
              <span className="truncate text-[11px] font-medium flex-1 min-w-0">{tab.name}</span>
              {!isDashboard && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  className="ml-0.5 p-0.5 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  title="Close tab"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {tabs.length < 8 && (
        <button
          type="button"
          onClick={addTab}
          className="ml-1 p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors shrink-0"
          title="New tab"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
};

export default TabBar;

import React from "react";
import { Link, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { navItems } from "../utils/navItems";
import { getVisibleNavItems } from "../utils/accessControl";

const ModulePage = () => {
  const { moduleName } = useParams();
  const user = useSelector((state) => state.auth.user);
  const normalizedModuleName = String(moduleName || "").toLowerCase();
  const visibleNavItems = getVisibleNavItems(navItems, user);
  const menuCardClass =
    "flex items-center gap-3 p-4 bg-white dark:bg-gray-800 shadow-md rounded-xl hover:shadow-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 group min-h-[72px]";
  const subCardClass =
    "flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-800 shadow-sm rounded-lg hover:shadow-md hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all duration-200 group min-h-[48px]";
  const topLevelModuleOrder = [
    "Warehouse",
    "CRM",
    "Sales",
    "Finance",
    "Store",
    "Analytical",
    "Masters",
    "User Access",
    "Settings",
  ];
  const moduleHubItems = topLevelModuleOrder
    .map((name) =>
      visibleNavItems.find((item) => item.name.toLowerCase() === name.toLowerCase())
    )
    .filter(Boolean);

  // Global modules hub page (all sidebar top-level menus as cards)
  if (normalizedModuleName === "modules") {
    return (
      <section className="p-6">
        <h1 className="text-2xl font-semibold text-gray-800 dark:text-gray-100 mb-6">All Modules</h1>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 content-start auto-rows-max">
          {moduleHubItems.map((module) => (
            <Link
              key={module.name}
              to={module.path || `/${module.name.toLowerCase()}`}
              className={menuCardClass}
            >
              {module.icon && (
                <module.icon className="w-6 h-6 text-indigo-500 group-hover:text-indigo-600 transition" />
              )}
              <span className="font-medium text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                {module.name}
              </span>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  // Find the corresponding module (case-insensitive)
  const moduleData = visibleNavItems.find(
    (item) => item.name.toLowerCase() === normalizedModuleName
  );

  if (!moduleData) {
    return (
      <section className="p-6 text-center text-gray-600 dark:text-gray-400">
        <h2 className="text-xl font-semibold mb-2">Module Not Found</h2>
        <p>Please check the module name in your URL.</p>
      </section>
    );
  }

  const isWarehouse = normalizedModuleName === "warehouse";

  return (
    <section className="p-6">
      {/* Module Header Card: clickable to all-modules hub */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mb-6 content-start auto-rows-max">
        <Link to="/modules" className={menuCardClass}>
          {moduleData.icon && (
            <moduleData.icon className="w-6 h-6 text-indigo-500 group-hover:text-indigo-600 transition" />
          )}
          <span className="font-medium text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
            {moduleData.name}
          </span>
        </Link>

        {isWarehouse && (
          <Link
            to="/warehouse/new-page"
            className="flex items-center gap-3 p-4 bg-indigo-600 shadow-md rounded-xl hover:bg-indigo-700 hover:shadow-lg transition-all duration-200 group min-h-[72px]"
          >
            <div className="w-10 h-10 rounded-lg bg-white/15 flex items-center justify-center text-white text-xl font-semibold">
              +
            </div>
            <div>
              <span className="block font-semibold text-white">New Page</span>
              <span className="block text-xs text-indigo-100 mt-0.5">Invoice AI intake</span>
            </div>
          </Link>
        )}
      </div>

      {/* Submenu Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 content-start auto-rows-max">
        {(moduleData.subItems || []).map((sub) => (
          <Link
            key={sub.name}
            to={sub.path}
            className={subCardClass}
          >
            {/* Icon */}
            {sub.icon && (
              <sub.icon className="w-4 h-4 text-indigo-500 group-hover:text-indigo-600 transition shrink-0" />
            )}

            {/* Name */}
            <span className="text-sm font-medium text-gray-800 dark:text-gray-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
              {sub.name}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default ModulePage;

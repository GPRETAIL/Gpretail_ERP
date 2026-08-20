/* eslint-disable no-unused-vars */
import { Bars3Icon, XMarkIcon } from "@heroicons/react/24/outline";
import NavItem from "./NavItem";
import { navItems, ownerNavItems } from "../utils/navItems";
import { useMemo, useState } from "react";
import { useSelector } from "react-redux";
import { getVisibleNavItems } from "../utils/accessControl";

const Sidebar = ({ isExpanded, toggleSidebar, isMobile = false, onNavigate }) => {
  const [activeMenu, setActiveMenu] = useState(null);
  const [hoveredMenu, setHoveredMenu] = useState(null);
  const user = useSelector((state) => state.auth.user);
  const sourceNavItems = String(user?.role || "").toLowerCase() === "owner" ? ownerNavItems : navItems;
  const visibleNavItems = useMemo(() => getVisibleNavItems(sourceNavItems, user), [sourceNavItems, user]);

  const handleSetActiveMenu = (menu) => {
    setActiveMenu(menu);
  };

  return (
    <div
      className={`
        h-full
        bg-white dark:bg-gray-900
        shadow-xl
        border-r border-gray-200 dark:border-gray-700
        flex flex-col
        transition-all duration-300 ease-in-out
        relative overflow-visible
        ${isExpanded ? "w-56" : "w-20"}
      `}
    >
      {/* HEADER */}
      <div
        className={`
          flex items-center h-14 md:h-16 px-4
          border-b border-gray-200 dark:border-gray-700
          ${isExpanded ? "justify-between" : "justify-center"}
        `}
      >
        {/* LOGO TEXT */}
        <div
          className={`
            text-lg md:text-xl font-bold
            text-indigo-600 dark:text-indigo-400
            transition-all duration-300 whitespace-nowrap
            ${
              isExpanded
                ? "opacity-100 max-w-xs"
                : "opacity-0 max-w-0 overflow-hidden"
            }
          `}
        >
          App Logo
        </div>

        {/* TOGGLE / CLOSE BUTTON */}
        <button
          onClick={toggleSidebar}
          className="
            p-2
            text-gray-600 dark:text-gray-300
            hover:bg-gray-100 dark:hover:bg-gray-800
            hover:text-gray-900 dark:hover:text-white
            rounded-full
            transition
          "
          aria-label={isMobile ? "Close Sidebar" : "Toggle Sidebar"}
        >
          {isMobile ? (
            <XMarkIcon className="w-6 h-6" />
          ) : (
            <Bars3Icon className="w-6 h-6" />
          )}
        </button>
      </div>

      {/* NAVIGATION */}
      <nav className="flex-1 overflow-y-auto overflow-x-visible p-3 md:p-4">
        <ul className="space-y-1">
          {visibleNavItems.map((item) => (
            <NavItem
              key={item.name}
              {...item}
              isExpanded={isExpanded}
              activeMenu={activeMenu}
              setActiveMenu={handleSetActiveMenu}
              setHoveredMenu={setHoveredMenu}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </nav>
    </div>
  );
};

export default Sidebar;

/* eslint-disable no-unused-vars */
import { ChevronRightIcon } from "@heroicons/react/24/outline";
import { useEffect, useRef, useState } from "react";
import { useTabs } from "../context/TabContext";

const NavItem = ({
  icon: Icon,
  name,
  path,
  isExpanded,
  subItems,
  activeMenu,
  setActiveMenu,
  onNavigate,
}) => {
  const itemRef = useRef(null);
  const submenuRef = useRef(null);
  const [submenuStyle, setSubmenuStyle] = useState({});
  const { activeTabPath, navigateActiveTab } = useTabs();

  const isDirectLink = !subItems && !!path;
  const currentPath = String(activeTabPath || "").split(/[?#]/, 1)[0].toLowerCase();
  const itemPath = String(path || "").toLowerCase();
  const isCurrentPath = isDirectLink && currentPath.startsWith(itemPath);
  const isActive = activeMenu === name;
  const isOpen = isDirectLink ? isCurrentPath : isActive;

  // --- Submenu positioning (Logic remains the same) ---
  useEffect(() => {
    if (subItems && isOpen && itemRef.current) {
      const itemRect = itemRef.current.getBoundingClientRect();
      const screenHeight = window.innerHeight;
      const submenuHeight = submenuRef.current
        ? submenuRef.current.offsetHeight
        : (subItems.length + 1) * 40 + 20;

      let top = itemRect.top;
      let maxHeight = "auto";

      if (top + submenuHeight > screenHeight - 10) {
        top = Math.max(screenHeight - submenuHeight - 10, 10);
      }

      if (submenuHeight > screenHeight - 20) {
        top = 10;
        maxHeight = `${screenHeight - 20}px`;
      }

      setSubmenuStyle({
        top: `${top}px`,
        left: `${itemRect.right + 8}px`,
        maxHeight,
        overflowY: maxHeight !== "auto" ? "auto" : "visible",
      });
    }
  }, [isOpen, subItems]);
  // --------------------------------------------------------

  // --- Click handler ---
  const handleClick = () => {
    if (isDirectLink) return;
    setActiveMenu(isActive ? null : name);
  };

  // --- Close submenu when clicking outside ---
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        submenuRef.current &&
        !submenuRef.current.contains(event.target) &&
        itemRef.current &&
        !itemRef.current.contains(event.target)
      ) {
        setActiveMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [setActiveMenu]);
  // --------------------------------------------------------

  return (
    <li className="relative" ref={itemRef}>
      {/* Main menu item */}
      {isDirectLink ? (
        <button
          type="button"
          onClick={() => {
            setActiveMenu(null);
            navigateActiveTab(path);
            onNavigate?.();
          }}
          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-15
            ${
              isOpen
                ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                : "text-gray-700 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-gray-800 dark:hover:text-indigo-400"
            }
          `}
        >
          <div className="flex items-center">
            <Icon className="w-6 h-6" />
            <span
              className={`font-medium whitespace-nowrap transition-all duration-30 ${
                isExpanded ? "opacity-100 ml-3" : "opacity-0 w-0 overflow-hidden"
              }`}
            >
              {name}
            </span>
          </div>
        </button>
      ) : (
        <div
          onClick={handleClick}
          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all duration-15
            ${
              isOpen
                ? // Active/Open State
                  // Light: bg-indigo-50 text-indigo-600
                  // Dark: bg-indigo-900/40 text-indigo-400
                  "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                : // Default State
                  // Light: text-gray-700 hover:bg-indigo-50 hover:text-indigo-600
                  // Dark: text-gray-300 hover:bg-gray-800 hover:text-indigo-400
                  "text-gray-700 dark:text-gray-300 hover:bg-indigo-50 hover:text-indigo-600 dark:hover:bg-gray-800 dark:hover:text-indigo-400"
            }
          `}
        >
          <div className="flex items-center">
            <Icon className="w-6 h-6" />
            <span
              className={`font-medium whitespace-nowrap transition-all duration-30 ${
                isExpanded ? "opacity-100 ml-3" : "opacity-0 w-0 overflow-hidden"
              }`}
            >
              {name}
            </span>
          </div>

          {subItems && isExpanded && (
            <ChevronRightIcon
              className={`w-4 h-4 transition-transform ${
                // Chevron icon colors
                // Light: text-gray-400
                // Dark: dark:text-gray-500
                isOpen
                  ? "rotate-90 text-indigo-600 dark:text-indigo-400" // Active state
                  : "text-gray-400 dark:text-gray-500" // Default state
              }`}
            />
          )}
        </div>
      )}

      {/* Submenu (Floating Menu when collapsed) */}
      {subItems && isOpen && (
        <ul
          ref={submenuRef}
          style={submenuStyle}
          className={`
            fixed 
              bg-white dark:bg-gray-800
         
           shadow-lg border border-gray-100 dark:border-gray-700
            
            rounded-lg 
            p-2 space-y-1 z-50 w-52 
            transform transition-all duration-20
            ${
              isOpen
                ? "opacity-100 translate-x-0"
                : "opacity-0 -translate-x-2 pointer-events-none"
            }
          `}
        >
          {/* 🔹 Parent element (included at the top) */}
          {path && (
            <li key={`${name}-parent`}>
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  navigateActiveTab(path);
                  onNavigate?.();
                }}
                className="block px-3 py-1.5 text-sm font-medium
                    text-indigo-600 bg-indigo-50 hover:bg-indigo-100
                   dark:text-indigo-400

                   dark:bg-indigo-900/40 dark:hover:bg-indigo-900/60
                  rounded-md w-full text-left"
              >
                {name}
              </button>
            </li>
          )}

          {/* 🔹 Submenu items */}
          {subItems.map((sub) => (
            <li key={sub.name}>
              <button
                type="button"
                onClick={() => {
                  setActiveMenu(null);
                  navigateActiveTab(sub.path);
                  onNavigate?.();
                }}
                className="block px-3 py-1.5 text-sm
                  dark:hover:bg-gray-700 dark:hover:text-indigo-400
                  text-gray-700 dark:text-gray-300
                  hover:bg-indigo-50 hover:text-indigo-600
                  rounded-md w-full text-left"
              >
                {sub.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

export default NavItem;

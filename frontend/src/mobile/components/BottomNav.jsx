import React from "react";
import {
  Home,
  ShoppingCart,
  ClipboardList,
  Package,
  Menu,
} from "lucide-react";
import { isRestrictedRole } from "../utils/rolePermissions";

const TABS = [
  { key: "dashboard", label: "Dashboard", icon: Home },
  { key: "sales", label: "Sales", icon: ShoppingCart },
  { key: "purchase", label: "Purchase", icon: ClipboardList },
  { key: "inventory", label: "Inventory", icon: Package },
  { key: "modules", label: "More", icon: Menu },
];

/**
 * Fixed 5-tab bottom navigation bar matching the Vynerix reference design.
 */
export default function BottomNav({ activePage, onNavigate, authUser }) {
  const tabs = isRestrictedRole(authUser?.role)
    ? TABS.filter((t) => t.key !== "purchase")
    : TABS;

  // Map sub-screens to their parent tab
  const activeTab = (() => {
    if (activePage === "create_invoice") return "sales";
    if (activePage === "product_details") return "inventory";
    if (["reports", "settings", "customers", "suppliers", "expenses"].includes(activePage)) return "modules";
    return activePage;
  })();

  return (
    <nav className="vx-bottom">
      {tabs.map(({ key, label, icon: Icon }) => (
        <button
          key={key}
          type="button"
          className={activeTab === key ? "active" : ""}
          onClick={() => onNavigate(key)}
        >
          <Icon size={20} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}

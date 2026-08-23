import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  ClipboardList,
  Box,
  Package,
  Users,
  Store,
  Wallet,
  BarChart3,
  Settings,
} from "lucide-react";
import api from "../../api/axios";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const MODULE_TILES = [
  { key: "sales", name: "Sales", icon: ShoppingCart, bg: "bg-indigo-600" },
  { key: "purchase", name: "Purchase", icon: ClipboardList, bg: "bg-sky-500" },
  { key: "inventory", name: "Inventory", icon: Box, bg: "bg-amber-500" },
  { key: "inventory", name: "Products", icon: Package, bg: "bg-emerald-500" },
  { key: "customers", name: "Customers", icon: Users, bg: "bg-blue-500" },
  { key: "suppliers", name: "Suppliers", icon: Store, bg: "bg-cyan-600" },
  { key: "dashboard", name: "Expenses", icon: Wallet, bg: "bg-orange-500" },
  { key: "reports", name: "Reports", icon: BarChart3, bg: "bg-slate-600" },
  { key: "settings", name: "Settings", icon: Settings, bg: "bg-slate-500" },
];

/**
 * Modules Grid screen with recent activities from real API.
 */
export default function ModulesScreen({ onNavigate }) {
  const [activities, setActivities] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/notifications", { params: { limit: 5 } });
        const data = res.data?.data;
        const list = Array.isArray(data)
          ? data
          : data?.data || data?.items || [];
        setActivities(list);
      } catch {
        // Silently handle
      }
    })();
  }, []);

  return (
    <div className="space-y-4">
      {/* 3x3 Grid */}
      <div className="vx-modules-grid">
        {MODULE_TILES.map((tile, i) => {
          const Icon = tile.icon;
          return (
            <button
              key={i}
              type="button"
              className="vx-module-tile"
              onClick={() => onNavigate(tile.key)}
            >
              <div className={`vx-module-icon-box ${tile.bg}`}>
                <Icon size={22} />
              </div>
              <span className="vx-module-name">{tile.name}</span>
            </button>
          );
        })}
      </div>

      {/* Recent Activities */}
      <div className="vx-card">
        <h3 className="vx-card-title mb-3">Recent Activities</h3>
        <div className="divide-y divide-slate-100">
          {activities.length > 0 ? (
            activities.map((item, i) => (
              <div key={i} className="flex items-center justify-between py-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-800 m-0">
                    {item.title || item.message || item.data?.message || `Activity ${i + 1}`}
                  </h4>
                  <p className="text-[11px] text-slate-400 m-0">
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : ""}
                  </p>
                </div>
                {item.data?.amount && (
                  <strong className="text-xs font-extrabold text-slate-900">
                    {money(item.data.amount)}
                  </strong>
                )}
              </div>
            ))
          ) : (
            <p className="text-xs text-slate-400 py-4 text-center">
              No recent activities
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

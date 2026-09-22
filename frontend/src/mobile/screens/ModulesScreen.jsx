import React, { useState, useEffect } from "react";
import {
  ShoppingCart,
  ClipboardList,
  Box as BoxIcon,
  Package,
  Users,
  Store,
  Wallet,
  BarChart3,
  Settings,
  UserCheck,
} from "lucide-react";
import { Box, Typography } from "@mui/material";
import api from "../../api/axios";
import { isRestrictedRole } from "../utils/rolePermissions";

const money = (n) =>
  "₹ " +
  Number(n || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });

const MODULE_TILES = [
  { key: "sales", name: "Sales", icon: ShoppingCart, bg: "#4f46e5" },
  { key: "purchase", name: "Purchase", icon: ClipboardList, bg: "#0ea5e9" },
  { key: "inventory", name: "Inventory", icon: BoxIcon, bg: "#f59e0b" },
  { key: "inventory", name: "Products", icon: Package, bg: "#10b981" },
  { key: "customers", name: "Customers", icon: Users, bg: "#3b82f6" },
  { key: "suppliers", name: "Suppliers", icon: Store, bg: "#0891b2" },
  { key: "attendance", name: "Attendance", icon: UserCheck, bg: "#0d9488" },
  { key: "dashboard", name: "Expenses", icon: Wallet, bg: "#f97316" },
  { key: "reports", name: "Reports", icon: BarChart3, bg: "#475569" },
  { key: "settings", name: "Settings", icon: Settings, bg: "#64748b" },
];

/**
 * Modules Grid screen with recent activities from real API.
 */
const RESTRICTED_TILE_KEYS = new Set(["purchase", "suppliers", "reports"]);

export default function ModulesScreen({ onNavigate, authUser }) {
  const [activities, setActivities] = useState([]);
  const tiles = isRestrictedRole(authUser?.role)
    ? MODULE_TILES.filter((t) => !RESTRICTED_TILE_KEYS.has(t.key))
    : MODULE_TILES;

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
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* 3x3 Grid */}
      <Box className="vx-modules-grid">
        {tiles.map((tile, i) => {
          const Icon = tile.icon;
          return (
            <Box
              component="button"
              key={i}
              type="button"
              className="vx-module-tile"
              onClick={() => onNavigate(tile.key)}
            >
              <Box className="vx-module-icon-box" sx={{ bgcolor: tile.bg }}>
                <Icon size={22} />
              </Box>
              <Box component="span" className="vx-module-name">{tile.name}</Box>
            </Box>
          );
        })}
      </Box>

      {/* Recent Activities */}
      <Box className="vx-card">
        <Typography component="h3" className="vx-card-title" sx={{ mb: 1.5 }}>Recent Activities</Typography>
        <Box sx={{ "& > *:not(:first-of-type)": { borderTop: "1px solid #f1f5f9" } }}>
          {activities.length > 0 ? (
            activities.map((item, i) => (
              <Box key={i} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 1.25 }}>
                <Box>
                  <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", m: 0 }}>
                    {item.title || item.message || item.data?.message || `Activity ${i + 1}`}
                  </Typography>
                  <Typography component="p" sx={{ fontSize: 11, color: "#94a3b8", m: 0 }}>
                    {item.created_at
                      ? new Date(item.created_at).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : ""}
                  </Typography>
                </Box>
                {item.data?.amount && (
                  <Box component="strong" sx={{ fontSize: 12, fontWeight: 800, color: "#0f172a" }}>
                    {money(item.data.amount)}
                  </Box>
                )}
              </Box>
            ))
          ) : (
            <Typography component="p" sx={{ fontSize: 12, color: "#94a3b8", py: 2, textAlign: "center" }}>
              No recent activities
            </Typography>
          )}
        </Box>
      </Box>
    </Box>
  );
}

import React, { useState, useEffect } from "react";
import { X, Check, Store } from "lucide-react";
import { Box, Typography } from "@mui/material";
import api from "../../api/axios";

/**
 * Store switcher for users assigned to (or able to see) more than one
 * store - mirrors desktop's Navbar "Switch Store" dialog, minus its
 * "All Stores" unrestricted-view option: mobile screens aren't built to
 * handle a real cross-store "no scope" mode the way desktop's reporting
 * pages are (each mobile screen scopes to one active store), so this only
 * offers picking a single specific store to make active, matching what
 * PosSaleController/DashboardController etc. already expect.
 *
 * Saves to the same `activeStoreId` localStorage key desktop's Navbar
 * already writes and every mobile request already reads (see
 * api/axios.js's request interceptor), then reloads so every screen picks
 * up the new scope at once rather than trying to live-refresh each one.
 */
export default function BranchSelectorModal({ isOpen, onClose }) {
  const [stores, setStores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(() => localStorage.getItem("activeStoreId") || "");

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setSelectedId(localStorage.getItem("activeStoreId") || "");
    api
      .get("/companies", { params: { limit: 500 } })
      .then((res) => {
        const list = (res.data?.data || []).map((c) => ({
          id: String(c.id),
          name: c.name || c.code || `Store ${c.id}`,
        }));
        setStores(list);
      })
      .catch(() => setStores([]))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (selectedId) {
      localStorage.setItem("activeStoreId", selectedId);
    } else {
      localStorage.removeItem("activeStoreId");
    }
    window.location.reload();
  };

  return (
    <Box
      className="animate-in fade-in duration-150"
      sx={{ position: "fixed", inset: 0, zIndex: 86, display: "flex", flexDirection: "column", justifyContent: "flex-end", bgcolor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
    >
      <Box
        className="animate-in slide-in-from-bottom duration-200"
        sx={{ width: "100%", maxWidth: 480, mx: "auto", bgcolor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", boxShadow: 24, display: "flex", flexDirection: "column", maxHeight: "75vh", overflow: "hidden" }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
          <Typography component="h3" sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>Switch Store</Typography>
          <Box component="button" type="button" onClick={onClose} sx={{ p: 0.75, color: "#64748b" }} aria-label="Close">
            <X size={20} />
          </Box>
        </Box>

        <Box sx={{ p: 1.5, overflowY: "auto", flex: 1, display: "flex", flexDirection: "column", gap: 0.75 }}>
          {loading ? (
            <Typography component="p" sx={{ textAlign: "center", fontSize: 12, color: "#94a3b8", py: 4 }}>Loading stores...</Typography>
          ) : stores.length === 0 ? (
            <Typography component="p" sx={{ textAlign: "center", fontSize: 12, color: "#94a3b8", py: 4 }}>No stores found</Typography>
          ) : (
            stores.map((s) => (
              <Box
                component="button"
                key={s.id}
                type="button"
                onClick={() => setSelectedId(s.id)}
                sx={{
                  width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5,
                  borderRadius: "16px", border: "1px solid", transition: "all 0.15s",
                  bgcolor: selectedId === s.id ? "#eef2ff" : "#f8fafc",
                  borderColor: selectedId === s.id ? "#c7d2fe" : "rgba(226,232,240,0.8)",
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center", gap: 1, minWidth: 0 }}>
                  <Store size={14} style={{ color: "#94a3b8", flexShrink: 0 }} />
                  <Typography component="span" sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</Typography>
                </Box>
                {selectedId === s.id && <Check size={16} style={{ color: "#4f46e5", flexShrink: 0 }} />}
              </Box>
            ))
          )}
        </Box>

        <Box sx={{ p: 2, borderTop: "1px solid #f1f5f9", flexShrink: 0 }}>
          <Box
            component="button"
            type="button"
            onClick={handleSave}
            disabled={loading || !selectedId}
            sx={{ width: "100%", py: 1.5, borderRadius: "12px", bgcolor: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 700, "&:disabled": { opacity: 0.5 } }}
          >
            Switch Store
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

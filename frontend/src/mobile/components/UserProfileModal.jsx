import React, { useState, useEffect } from "react";
import {
  X,
  User,
  Shield,
  Building,
  Settings,
  RefreshCw,
  Download,
  LogOut,
  ChevronRight,
  Database,
  CheckCircle2,
  Moon,
  Sun,
} from "lucide-react";
import { Box, Typography } from "@mui/material";
import { getSyncQueue, getDrafts } from "../offline/db";
import { processSyncQueue } from "../offline/syncManager";
import { useTheme } from "../../features/theme-context";

/**
 * Mobile User Profile Drawer & Quick Action Sheet
 *
 * Opened by tapping the User Avatar button next to Notification Bell in the header.
 */
export default function UserProfileModal({
  isOpen,
  onClose,
  user,
  onNavigate,
  onLogout,
  onTriggerPwa,
}) {
  const [syncCount, setSyncCount] = useState(0);
  const [draftsCount, setDraftsCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [syncSuccess, setSyncSuccess] = useState(false);
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  const loadStorageStats = async () => {
    try {
      const [queue, drafts] = await Promise.all([getSyncQueue(), getDrafts()]);
      setSyncCount(queue.length);
      setDraftsCount(drafts.length);
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadStorageStats();
      setSyncSuccess(false);
    }
    const handleUpdate = () => loadStorageStats();
    window.addEventListener("vx-sync-queue-updated", handleUpdate);
    window.addEventListener("vx-sync-completed", handleUpdate);
    return () => {
      window.removeEventListener("vx-sync-queue-updated", handleUpdate);
      window.removeEventListener("vx-sync-completed", handleUpdate);
    };
  }, [isOpen]);

  const handleManualSync = async () => {
    setSyncing(true);
    setSyncSuccess(false);
    const res = await processSyncQueue();
    setSyncing(false);
    if (res?.success) {
      setSyncSuccess(true);
      await loadStorageStats();
      setTimeout(() => setSyncSuccess(false), 3000);
    }
  };

  if (!isOpen) return null;

  const displayName = user?.name || user?.username || "Super Admin";
  const displayRole = user?.role || "Administrator";
  const displayEmail = user?.email || "admin@vynerix.com";
  const displayBranch = user?.company_name || "My Store";
  const displayCounter = user?.counter_name;
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <Box
      sx={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", flexDirection: "column", justifyContent: "flex-end", bgcolor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", animation: "app-fade-in 0.2s ease-out" }}
    >
      {/* Drawer Card */}
      <Box
        sx={{ width: "100%", maxWidth: 480, mx: "auto", bgcolor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", boxShadow: 24, display: "flex", flexDirection: "column", maxHeight: "90vh", overflow: "hidden", animation: "app-slide-in-from-bottom 0.3s ease-out" }}
      >
        {/* Header with Profile Hero */}
        <Box sx={{ position: "relative", backgroundImage: "linear-gradient(to bottom right, #4f46e5, #4338ca, #1e40af)", p: 2.5, color: "#fff" }}>
          <Box
            component="button"
            type="button"
            onClick={onClose}
            sx={{ position: "absolute", top: 16, right: 16, width: 32, height: 32, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.2)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.15s", "&:hover": { bgcolor: "rgba(255,255,255,0.3)" } }}
            aria-label="Close user menu"
          >
            <X size={18} />
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.75, mt: 0.5 }}>
            <Box sx={{ width: 56, height: 56, borderRadius: "16px", bgcolor: "#fff", color: "#4338ca", fontWeight: 900, fontSize: 24, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: 8, outline: "4px solid rgba(255,255,255,0.2)", flexShrink: 0 }}>
              {initial}
            </Box>

            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Typography component="h3" sx={{ fontSize: 18, fontWeight: 900, color: "#fff", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", lineHeight: 1.25 }}>
                  {displayName}
                </Typography>
                <Typography component="span" sx={{ bgcolor: "rgba(99,102,241,0.5)", border: "1px solid rgba(255,255,255,0.2)", fontSize: 10, fontWeight: 700, px: 1, py: 0.25, borderRadius: "999px", color: "#e0e7ff", textTransform: "uppercase", letterSpacing: "0.02em", flexShrink: 0 }}>
                  {displayRole}
                </Typography>
              </Box>
              <Typography component="p" sx={{ fontSize: 12, color: "#c7d2fe", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", mt: 0.25 }}>
                {displayEmail}
              </Typography>
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 0.5, fontSize: 11, color: "#c7d2fe", fontWeight: 500 }}>
                <Building size={12} style={{ flexShrink: 0 }} />
                <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {displayBranch}
                  {displayCounter ? ` — ${displayCounter}` : ""}
                </Box>
              </Box>
            </Box>
          </Box>
        </Box>

        {/* Sync & Offline Status Pill */}
        <Box sx={{ mx: 2, mt: 1.5, p: 1.5, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{ width: 32, height: 32, borderRadius: "12px", bgcolor: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <Database size={16} />
            </Box>
            <Box>
              <Typography component="p" sx={{ fontSize: 12, fontWeight: 700, color: "#1e293b", lineHeight: 1.25 }}>
                Offline Database
              </Typography>
              <Typography component="p" sx={{ fontSize: 11, color: "#64748b" }}>
                {draftsCount} local drafts • {syncCount} pending sync
              </Typography>
            </Box>
          </Box>

          <Box
            component="button"
            type="button"
            onClick={handleManualSync}
            disabled={syncing || !navigator.onLine}
            sx={{
              display: "flex", alignItems: "center", gap: 0.75, bgcolor: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 700,
              px: 1.5, py: 0.75, borderRadius: "12px", boxShadow: 1, transition: "all 0.15s", flexShrink: 0,
              "&:hover": { bgcolor: "#4338ca" }, "&:disabled": { opacity: 0.5 }, "&:active": { transform: "scale(0.95)" },
            }}
          >
            {syncing ? (
              <>
                <RefreshCw size={12} style={{ animation: "app-spin 1s linear infinite" }} />
                <Box component="span">Syncing...</Box>
              </>
            ) : syncSuccess ? (
              <>
                <CheckCircle2 size={12} style={{ color: "#6ee7b7" }} />
                <Box component="span">Synced</Box>
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                <Box component="span">Sync Now</Box>
              </>
            )}
          </Box>
        </Box>

        {/* Action Menu List */}
        <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1.5, display: "flex", flexDirection: "column", gap: 0.75 }}>
          {/* Theme Toggle -- moved out of the top header bar so the header's
              icon cluster is small enough to leave room for a truly
              centered page title without truncating it. */}
          <Box
            component="button"
            type="button"
            onClick={() => setTheme(isDark ? "light" : "dark")}
            sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: "16px", border: "1px solid transparent", textAlign: "left", transition: "all 0.15s", "&:hover": { bgcolor: "#f8fafc", borderColor: "#e2e8f0" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: "#fffbeb", color: "#d97706", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </Box>
              <Box>
                <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>
                  {isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
                </Typography>
                <Typography component="p" sx={{ fontSize: 11, color: "#64748b" }}>
                  Toggle the app's color theme
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                width: 40, height: 24, borderRadius: "999px", display: "flex", alignItems: "center", px: 0.25, transition: "background-color 0.15s", flexShrink: 0,
                bgcolor: isDark ? "#4f46e5" : "#e2e8f0",
                justifyContent: isDark ? "flex-end" : "flex-start",
              }}
            >
              <Box sx={{ width: 20, height: 20, borderRadius: "50%", bgcolor: "#fff", boxShadow: 1 }} />
            </Box>
          </Box>

          {/* Business / Branch Settings */}
          <Box
            component="button"
            type="button"
            onClick={() => {
              onClose();
              onNavigate("settings");
            }}
            sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: "16px", border: "1px solid transparent", textAlign: "left", transition: "all 0.15s", "&:hover": { bgcolor: "#f8fafc", borderColor: "#e2e8f0" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: "#eff6ff", color: "#2563eb", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Settings size={18} />
              </Box>
              <Box>
                <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>
                  Business & POS Settings
                </Typography>
                <Typography component="p" sx={{ fontSize: 11, color: "#64748b" }}>
                  Printers, tax rules & store profile
                </Typography>
              </Box>
            </Box>
            <ChevronRight size={16} style={{ color: "#94a3b8" }} />
          </Box>

          {/* Quick Reports */}
          <Box
            component="button"
            type="button"
            onClick={() => {
              onClose();
              onNavigate("reports");
            }}
            sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: "16px", border: "1px solid transparent", textAlign: "left", transition: "all 0.15s", "&:hover": { bgcolor: "#f8fafc", borderColor: "#e2e8f0" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: "#faf5ff", color: "#9333ea", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Shield size={18} />
              </Box>
              <Box>
                <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>
                  Security & Access Permissions
                </Typography>
                <Typography component="p" sx={{ fontSize: 11, color: "#64748b" }}>
                  Role-based POS terminal privileges
                </Typography>
              </Box>
            </Box>
            <ChevronRight size={16} style={{ color: "#94a3b8" }} />
          </Box>

          {/* Install PWA App */}
          <Box
            component="button"
            type="button"
            onClick={() => {
              onClose();
              if (onTriggerPwa) onTriggerPwa();
            }}
            sx={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: "16px", border: "1px solid transparent", textAlign: "left", transition: "all 0.15s", "&:hover": { bgcolor: "#f8fafc", borderColor: "#e2e8f0" } }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
              <Box sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: "#ecfdf5", color: "#059669", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Download size={18} />
              </Box>
              <Box>
                <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", lineHeight: 1.25 }}>
                  Install Vynerix App
                </Typography>
                <Typography component="p" sx={{ fontSize: 11, color: "#64748b" }}>
                  Add to home screen for fullscreen mode
                </Typography>
              </Box>
            </Box>
            <ChevronRight size={16} style={{ color: "#94a3b8" }} />
          </Box>
        </Box>

        {/* Footer with Logout */}
        <Box sx={{ p: 2, borderTop: "1px solid #f1f5f9", bgcolor: "#f8fafc" }}>
          <Box
            component="button"
            type="button"
            onClick={() => {
              onClose();
              if (onLogout) onLogout();
            }}
            sx={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 1, py: 1.5, borderRadius: "12px",
              bgcolor: "#fef2f2", color: "#dc2626", fontSize: 12, fontWeight: 800, border: "1px solid #fecaca", boxShadow: 1,
              transition: "all 0.15s", "&:hover": { bgcolor: "#fee2e2" }, "&:active": { transform: "scale(0.98)" },
            }}
          >
            <LogOut size={16} />
            <Box component="span">Sign Out from Mobile</Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

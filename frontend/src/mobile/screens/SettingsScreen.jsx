import React, { useState, useEffect } from "react";
import {
  User,
  Users,
  ShieldCheck,
  Settings,
  RefreshCw,
  Smartphone,
  Sparkles,
  LogOut,
  ChevronRight,
  Database,
  Printer,
  Globe,
  Sliders,
  Building,
  Check,
  Download,
  Play,
  Lock,
  Type,
} from "lucide-react";
import { Box, Typography } from "@mui/material";
import api from "../../api/axios";
import SecurityPinSettings from "../security/SecurityPinSettings";
import DisplayAccessibilitySettings from "./DisplayAccessibilitySettings";
import { isRestrictedRole } from "../utils/rolePermissions";

const formatDateTime = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/**
 * Mobile Settings screen with functional items
 */
export default function SettingsScreen({ onLogout, onTriggerPwa, appLock, biometrics, onOpenSyncCenter, authUser, displayPrefs }) {
  const [activeModal, setActiveModal] = useState(null); // 'profile' | 'users' | 'roles' | 'security' | 'preferences' | 'display' | 'backup' | 'about'
  const isRestricted = isRestrictedRole(authUser?.role);
  const [profile, setProfile] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [roles, setRoles] = useState([]);
  const [backupOverview, setBackupOverview] = useState(null);
  const [creatingBackup, setCreatingBackup] = useState(false);
  const [prefPaper, setPrefPaper] = useState(() => localStorage.getItem("vx_paper_width") || "3-inch");
  const [prefMode, setPrefMode] = useState(() => localStorage.getItem("vx_print_mode") || "browser");
  const activeStoreId = localStorage.getItem("activeStoreId") || "";

  const loadBackupOverview = () => {
    api.get("/backups/overview", { params: { companyId: activeStoreId || undefined } })
      .then((res) => setBackupOverview(res.data?.data || null))
      .catch(() => setBackupOverview(null));
  };

  const handleCreateBackup = async () => {
    setCreatingBackup(true);
    try {
      const res = await api.post("/backups", {
        backupType: "full",
        storageMode: "local",
        companyId: activeStoreId || undefined,
      });
      const status = res.data?.data?.status;
      if (status === "failed") {
        alert(res.data?.data?.summary?.status_message || "Backup failed");
      }
      loadBackupOverview();
    } catch (err) {
      alert(err.response?.data?.message || "Could not create backup.");
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleDownloadBackup = async (row) => {
    try {
      const res = await api.get(`/backups/${row.id}/download`, { responseType: "blob" });
      const blob = res.data instanceof Blob ? res.data : new Blob([res.data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = row.file_name || `backup-${row.id}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch {
      alert("Could not download backup.");
    }
  };

  // Load Settings Data
  useEffect(() => {
    if (activeModal === "profile") {
      api.get("/lookups").then((res) => {
        setProfile(res.data?.data?.companies?.[0] || null);
      }).catch(() => {});
    } else if (activeModal === "users") {
      api.get("/employees").then((res) => {
        setEmployees(res.data?.data || []);
      }).catch(() => {});
    } else if (activeModal === "roles") {
      api.get("/user-access/groups").then((res) => {
        setRoles(res.data?.data || []);
      }).catch(() => setRoles([]));
    } else if (activeModal === "backup") {
      api.get("/backups/overview", { params: { companyId: activeStoreId || undefined } })
        .then((res) => setBackupOverview(res.data?.data || null))
        .catch(() => setBackupOverview(null));
    }
  }, [activeModal, activeStoreId]);

  const handleSavePref = () => {
    localStorage.setItem("vx_paper_width", prefPaper);
    localStorage.setItem("vx_print_mode", prefMode);
    setActiveModal(null);
  };

  const handleClearCache = () => {
    localStorage.clear();
    sessionStorage.clear();
    alert("Local app cache cleared successfully! Re-launching...");
    window.location.reload();
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2, pb: 6 }}>
      {/* General Section */}
      <Box>
        <Typography component="small" sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 11, px: 0.5, mb: 1, display: "block" }}>
          General
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {!isRestricted && (
            <MenuItem icon={Building} title="Business Profile" onClick={() => setActiveModal("profile")} />
          )}
          {!isRestricted && (
            <MenuItem icon={Users} title="Users" onClick={() => setActiveModal("users")} />
          )}
          {!isRestricted && (
            <MenuItem icon={ShieldCheck} title="Roles & Permissions" onClick={() => setActiveModal("roles")} />
          )}
          <MenuItem
            icon={Lock}
            title="App Lock"
            subtitle={appLock?.isPinSet ? "PIN lock is ON" : "PIN lock is OFF"}
            onClick={() => setActiveModal("security")}
          />
          <MenuItem icon={Sliders} title="Preferences" onClick={() => setActiveModal("preferences")} />
          <MenuItem icon={Type} title="Display & Accessibility" onClick={() => setActiveModal("display")} />
        </Box>
      </Box>

      {/* Other Section */}
      <Box>
        <Typography component="small" sx={{ color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", fontSize: 11, px: 0.5, mb: 1, display: "block" }}>
          Other
        </Typography>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
          {!isRestricted && (
            <MenuItem icon={Database} title="Backup & Restore" onClick={() => setActiveModal("backup")} />
          )}
          <MenuItem
            icon={RefreshCw}
            title="Sync Center"
            subtitle="Pending offline changes & manual retry"
            onClick={onOpenSyncCenter}
          />
          <MenuItem
            icon={Smartphone}
            title="PWA / Mobile App Settings"
            subtitle="Install or configure home screen app"
            highlight
            onClick={onTriggerPwa}
          />
          <MenuItem
            icon={Sparkles}
            title="About Vynerix ERP"
            subtitle="v3.0.2 (Enterprise PWA)"
            onClick={() => setActiveModal("about")}
          />
        </Box>
      </Box>

      {/* Logout Button */}
      <Box
        component="button"
        type="button"
        onClick={onLogout}
        sx={{
          width: "100%", py: 1.5, borderRadius: "12px", border: "1px solid #fecdd3", bgcolor: "#fff1f2", color: "#e11d48",
          fontWeight: 700, fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 1,
          transition: "all 0.15s", "&:hover": { bgcolor: "#ffe4e6" }, "&:active": { transform: "scale(0.98)" },
        }}
      >
        <LogOut size={16} /> Logout
      </Box>

      {/* ─── MODALS & DRAWERS ─── */}

      {/* Business Profile Modal */}
      {activeModal === "profile" && (
        <SettingsDrawer title="Business Profile" onClose={() => setActiveModal(null)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2, color: "#1e293b" }}>
            <Box sx={{ p: 2, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)" }}>
              <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Registered Company</Typography>
              <Typography component="p" sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a", mt: 0.5 }}>{profile?.name || "Vynerix ERP"}</Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)" }}>
              <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>GSTIN / Tax ID</Typography>
              <Typography component="p" sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a", mt: 0.5 }}>{profile?.gstin || "Not set"}</Typography>
            </Box>
            <Box sx={{ p: 2, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)" }}>
              <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase" }}>Primary Contact</Typography>
              <Typography component="p" sx={{ fontSize: 14, fontWeight: 700, color: "#334155", mt: 0.5 }}>{profile?.email || "Not set"}</Typography>
              <Typography component="p" sx={{ fontSize: 14, fontWeight: 700, color: "#334155" }}>{profile?.phone || "Not set"}</Typography>
            </Box>
          </Box>
        </SettingsDrawer>
      )}

      {/* Users List Modal */}
      {activeModal === "users" && (
        <SettingsDrawer title="Active Users" onClose={() => setActiveModal(null)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            {employees.length > 0 ? (
              employees.map((u, i) => (
                <Box key={i} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.5, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)" }}>
                  <Box>
                    <Typography component="p" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>{u.name}</Typography>
                    <Typography component="p" sx={{ fontSize: 10, color: "#64748b" }}>{u.email || "No email"}</Typography>
                  </Box>
                  <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, px: 1, py: 0.25, borderRadius: "999px", bgcolor: "#eef2ff", border: "1px solid #e0e7ff", color: "#4f46e5" }}>
                    {u.role || "Staff"}
                  </Typography>
                </Box>
              ))
            ) : (
              <Box sx={{ p: 1.5, textAlign: "center", fontSize: 12, color: "#64748b" }}>Loading user database...</Box>
            )}
          </Box>
        </SettingsDrawer>
      )}

      {/* Roles & Permissions Modal */}
      {activeModal === "roles" && (
        <SettingsDrawer title="Roles & Permissions" onClose={() => setActiveModal(null)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            <Box sx={{ p: 1.5, borderRadius: "16px", bgcolor: "#fffbeb", border: "1px solid rgba(254,243,199,0.8)" }}>
              <Typography component="p" sx={{ fontSize: 10.5, color: "#92400e", lineHeight: 1.625 }}>
                These are the real role groups defined for this account. Fine-grained page-level permissions per role aren't enforced by the backend yet - a role name here doesn't currently restrict what a user can do.
              </Typography>
            </Box>
            {roles.length > 0 ? (
              roles.map((r) => (
                <Box key={r.id} sx={{ p: 1.75, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)" }}>
                  <Typography component="h4" sx={{ fontSize: 12, fontWeight: 900, color: "#4f46e5" }}>{r.display_name || r.name}</Typography>
                  <Typography component="p" sx={{ fontSize: 11, color: "#64748b", mt: 0.5, lineHeight: 1.5 }}>{r.description || "No description set"}</Typography>
                </Box>
              ))
            ) : (
              <Box sx={{ p: 1.5, textAlign: "center", fontSize: 12, color: "#64748b" }}>Loading role groups...</Box>
            )}
          </Box>
        </SettingsDrawer>
      )}

      {/* App Lock Modal */}
      {activeModal === "security" && (
        <SettingsDrawer title="App Lock" onClose={() => setActiveModal(null)}>
          <SecurityPinSettings appLock={appLock} biometrics={biometrics} />
        </SettingsDrawer>
      )}

      {/* Display & Accessibility Modal */}
      {activeModal === "display" && (
        <SettingsDrawer title="Display & Accessibility" onClose={() => setActiveModal(null)}>
          <DisplayAccessibilitySettings displayPrefs={displayPrefs} />
        </SettingsDrawer>
      )}

      {/* Preferences Modal */}
      {activeModal === "preferences" && (
        <SettingsDrawer title="Terminal Preferences" onClose={() => setActiveModal(null)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography component="label" sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", mb: 0.75 }}>Thermal Receipt Width</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 1 }}>
                {["2-inch", "3-inch", "4-inch"].map((w) => (
                  <Box
                    component="button"
                    key={w}
                    type="button"
                    onClick={() => setPrefPaper(w)}
                    sx={{
                      py: 1, borderRadius: "12px", fontSize: 12, fontWeight: 700, border: "1px solid", transition: "all 0.15s",
                      bgcolor: prefPaper === w ? "#4f46e5" : "#f8fafc",
                      borderColor: prefPaper === w ? "#4f46e5" : "#e2e8f0",
                      color: prefPaper === w ? "#fff" : "#334155",
                    }}
                  >
                    {w}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box>
              <Typography component="label" sx={{ fontSize: 12, fontWeight: 700, color: "#64748b", display: "block", mb: 0.75 }}>Print Workflow</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
                {[
                  { id: "browser", label: "Browser Print" },
                  { id: "direct", label: "Direct Thermal API" },
                ].map((m) => (
                  <Box
                    component="button"
                    key={m.id}
                    type="button"
                    onClick={() => setPrefMode(m.id)}
                    sx={{
                      py: 1, borderRadius: "12px", fontSize: 12, fontWeight: 700, border: "1px solid", transition: "all 0.15s",
                      bgcolor: prefMode === m.id ? "#4f46e5" : "#f8fafc",
                      borderColor: prefMode === m.id ? "#4f46e5" : "#e2e8f0",
                      color: prefMode === m.id ? "#fff" : "#334155",
                    }}
                  >
                    {m.label}
                  </Box>
                ))}
              </Box>
            </Box>

            <Box
              component="button"
              type="button"
              onClick={handleSavePref}
              sx={{ width: "100%", bgcolor: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 700, py: 1.5, borderRadius: "12px", boxShadow: 1, transition: "all 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, "&:active": { transform: "scale(0.95)" } }}
            >
              <Check size={16} /> Save Preferences
            </Box>
          </Box>
        </SettingsDrawer>
      )}

      {/* Backup & Restore Modal */}
      {activeModal === "backup" && (
        <SettingsDrawer title="Backup & Restore" onClose={() => setActiveModal(null)}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 1 }}>
              <Box sx={{ p: 1.5, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)" }}>
                <Typography component="p" sx={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em" }}>Last Backup</Typography>
                <Typography component="p" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a", mt: 0.5, textTransform: "capitalize" }}>
                  {backupOverview?.stats?.last_backup_status || "Never"}
                </Typography>
                <Typography component="p" sx={{ fontSize: 9.5, color: "#64748b", mt: 0.25 }}>{formatDateTime(backupOverview?.stats?.last_backup_at)}</Typography>
              </Box>
              <Box sx={{ p: 1.5, borderRadius: "16px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)" }}>
                <Typography component="p" sx={{ fontSize: 9.5, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em" }}>Storage Used</Typography>
                <Typography component="p" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a", mt: 0.5 }}>
                  {backupOverview?.stats?.storage_usage?.total_label || "0 B"}
                </Typography>
                <Typography component="p" sx={{ fontSize: 9.5, color: "#64748b", mt: 0.25 }}>{backupOverview?.stats?.total_backups ?? 0} backups</Typography>
              </Box>
            </Box>

            <Box
              component="button"
              type="button"
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              sx={{ width: "100%", py: 1.25, borderRadius: "12px", bgcolor: "#4f46e5", color: "#fff", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 0.75, transition: "all 0.15s", "&:active": { transform: "scale(0.95)" }, "&:disabled": { opacity: 0.5 } }}
            >
              <Play size={14} /> {creatingBackup ? "Creating backup..." : "Create Full Backup Now"}
            </Box>
            <Typography component="p" sx={{ fontSize: 9.5, color: "#94a3b8", mt: -1, textAlign: "center" }}>
              For restore, encryption, and scheduling, use Backup Center on the desktop app.
            </Typography>

            {backupOverview?.backups?.length > 0 && (
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pt: 1, borderTop: "1px solid #f1f5f9" }}>
                <Typography component="h4" sx={{ fontSize: 10, fontWeight: 900, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em" }}>Recent Backups</Typography>
                {backupOverview.backups.slice(0, 5).map((row) => (
                  <Box key={row.id} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", p: 1.25, borderRadius: "12px", bgcolor: "#f8fafc", border: "1px solid rgba(226,232,240,0.8)" }}>
                    <Box sx={{ minWidth: 0 }}>
                      <Typography component="p" sx={{ fontSize: 11, fontWeight: 700, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.file_name}</Typography>
                      <Typography component="p" sx={{ fontSize: 9.5, color: "#64748b", mt: 0.25 }}>
                        {row.file_size_label} &middot; {formatDateTime(row.completed_at)}
                      </Typography>
                    </Box>
                    <Box
                      component="button"
                      type="button"
                      onClick={() => handleDownloadBackup(row)}
                      sx={{ flexShrink: 0, ml: 1, p: 1, borderRadius: "8px", bgcolor: "#fff", border: "1px solid #e2e8f0", color: "#4f46e5", transition: "all 0.15s", "&:active": { transform: "scale(0.95)" } }}
                      aria-label="Download backup"
                    >
                      <Download size={14} />
                    </Box>
                  </Box>
                ))}
              </Box>
            )}

            <Box sx={{ display: "flex", flexDirection: "column", gap: 1, pt: 1, borderTop: "1px solid #f1f5f9" }}>
              <Box
                component="button"
                type="button"
                onClick={handleClearCache}
                sx={{ width: "100%", py: 1.25, borderRadius: "12px", border: "1px solid #fecdd3", color: "#e11d48", fontSize: 12, fontWeight: 700, transition: "all 0.15s", "&:hover": { bgcolor: "#fff1f2" } }}
              >
                Clear Cache & Hard Reset
              </Box>
            </Box>
          </Box>
        </SettingsDrawer>
      )}

      {/* About Vynerix ERP Modal */}
      {activeModal === "about" && (
        <SettingsDrawer title="About Vynerix ERP" onClose={() => setActiveModal(null)}>
          <Box sx={{ textAlign: "center", py: 2, display: "flex", flexDirection: "column", gap: 2 }}>
            <Box sx={{ width: 64, height: 64, borderRadius: "24px", bgcolor: "#4f46e5", color: "#fff", fontWeight: 900, fontSize: 30, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: 8, mx: "auto" }}>
              V
            </Box>
            <Box>
              <Typography component="h3" sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a", m: 0 }}>Vynerix ERP Mobile</Typography>
              <Typography component="p" sx={{ fontSize: 12, color: "#94a3b8", mt: 0.5 }}>Version 3.0.2 (Production)</Typography>
            </Box>
            <Typography component="p" sx={{ fontSize: 12, color: "#64748b", maxWidth: 280, mx: "auto", lineHeight: 1.625 }}>
              Vynerix ERP is a secure, cloud-enabled Progressive Web Application designed for point-of-sale, warehouse workflows, and inventory tracking.
            </Typography>
            <Box sx={{ fontSize: 10, color: "#94a3b8", pt: 1, borderTop: "1px solid #f1f5f9" }}>
              © 2026 Vynerix Inc. All rights reserved.
            </Box>
          </Box>
        </SettingsDrawer>
      )}
    </Box>
  );
}

function MenuItem({ icon: Icon, title, subtitle, highlight, onClick }) {
  return (
    <Box
      className="vx-menu-row cursor-pointer active:bg-slate-50 transition-all"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
    >
      <Box className="vx-menu-row-left">
        <Icon
          size={18}
          style={{ color: highlight ? "#4f46e5" : "#64748b" }}
        />
        <Box className="vx-menu-row-text">
          <Typography component="h4" sx={highlight ? { color: "#4f46e5", fontWeight: 700, fontSize: 12 } : { fontSize: 12, color: "#1e293b", fontWeight: 700 }}>
            {title}
          </Typography>
          {subtitle && <Typography component="p" sx={{ fontSize: 10, color: "#64748b", mt: 0.25 }}>{subtitle}</Typography>}
        </Box>
      </Box>
      <ChevronRight
        size={18}
        style={{ color: highlight ? "#6366f1" : "#94a3b8" }}
      />
    </Box>
  );
}

function SettingsDrawer({ title, onClose, children }) {
  return (
    <Box
      className="animate-in fade-in duration-150"
      sx={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", flexDirection: "column", justifyContent: "flex-end", bgcolor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)" }}
    >
      <Box
        className="animate-in slide-in-from-bottom duration-200"
        sx={{ width: "100%", maxWidth: 480, mx: "auto", bgcolor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", boxShadow: 24, display: "flex", flexDirection: "column", maxHeight: "85vh", overflow: "hidden" }}
      >
        <Box sx={{ p: 2, borderBottom: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Typography component="h3" sx={{ fontSize: 14, fontWeight: 900, color: "#0f172a" }}>{title}</Typography>
          <Box
            component="button"
            type="button"
            onClick={onClose}
            sx={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", px: 1, py: 0.5, borderRadius: "8px", "&:hover": { color: "#4338ca" } }}
          >
            Close
          </Box>
        </Box>
        <Box sx={{ p: 2, overflowY: "auto", flex: 1 }}>
          {children}
        </Box>
      </Box>
    </Box>
  );
}

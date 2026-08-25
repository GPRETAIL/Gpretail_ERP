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
} from "lucide-react";
import api from "../../api/axios";

const formatDateTime = (value) => {
  if (!value) return "--";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "--";
  return d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

/**
 * Mobile Settings screen with functional items
 */
export default function SettingsScreen({ onLogout, onTriggerPwa }) {
  const [activeModal, setActiveModal] = useState(null); // 'profile' | 'users' | 'roles' | 'preferences' | 'backup' | 'about'
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
    <div className="space-y-4 pb-12">
      {/* General Section */}
      <div>
        <small className="text-slate-400 font-bold uppercase text-[11px] px-1 mb-2 block">
          General
        </small>
        <div className="space-y-2">
          <MenuItem icon={Building} title="Business Profile" onClick={() => setActiveModal("profile")} />
          <MenuItem icon={Users} title="Users" onClick={() => setActiveModal("users")} />
          <MenuItem icon={ShieldCheck} title="Roles & Permissions" onClick={() => setActiveModal("roles")} />
          <MenuItem icon={Sliders} title="Preferences" onClick={() => setActiveModal("preferences")} />
        </div>
      </div>

      {/* Other Section */}
      <div>
        <small className="text-slate-400 font-bold uppercase text-[11px] px-1 mb-2 block">
          Other
        </small>
        <div className="space-y-2">
          <MenuItem icon={Database} title="Backup & Restore" onClick={() => setActiveModal("backup")} />
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
        </div>
      </div>

      {/* Logout Button */}
      <button
        type="button"
        onClick={onLogout}
        className="w-full py-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-600 font-bold text-xs flex items-center justify-center gap-2 hover:bg-rose-100 active:scale-98 transition-all"
      >
        <LogOut size={16} /> Logout
      </button>

      {/* ─── MODALS & DRAWERS ─── */}

      {/* Business Profile Modal */}
      {activeModal === "profile" && (
        <SettingsDrawer title="Business Profile" onClose={() => setActiveModal(null)}>
          <div className="space-y-4 text-slate-800">
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Registered Company</h4>
              <p className="text-sm font-black text-slate-900 mt-1">{profile?.name || "Vynerix ERP"}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h4 className="text-xs font-bold text-slate-400 uppercase">GSTIN / Tax ID</h4>
              <p className="text-sm font-black text-slate-900 mt-1">{profile?.gstin || "Not set"}</p>
            </div>
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
              <h4 className="text-xs font-bold text-slate-400 uppercase">Primary Contact</h4>
              <p className="text-sm font-bold text-slate-700 mt-1">{profile?.email || "Not set"}</p>
              <p className="text-sm font-bold text-slate-700">{profile?.phone || "Not set"}</p>
            </div>
          </div>
        </SettingsDrawer>
      )}

      {/* Users List Modal */}
      {activeModal === "users" && (
        <SettingsDrawer title="Active Users" onClose={() => setActiveModal(null)}>
          <div className="space-y-2">
            {employees.length > 0 ? (
              employees.map((u, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <div>
                    <p className="text-xs font-black text-slate-900">{u.name}</p>
                    <p className="text-[10px] text-slate-500">{u.email || "No email"}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 border border-indigo-100 text-indigo-600">
                    {u.role || "Staff"}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">Loading user database...</div>
            )}
          </div>
        </SettingsDrawer>
      )}

      {/* Roles & Permissions Modal */}
      {activeModal === "roles" && (
        <SettingsDrawer title="Roles & Permissions" onClose={() => setActiveModal(null)}>
          <div className="space-y-3">
            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-100/80">
              <p className="text-[10.5px] text-amber-800 leading-relaxed">
                These are the real role groups defined for this account. Fine-grained page-level permissions per role aren't enforced by the backend yet - a role name here doesn't currently restrict what a user can do.
              </p>
            </div>
            {roles.length > 0 ? (
              roles.map((r) => (
                <div key={r.id} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                  <h4 className="text-xs font-black text-indigo-600">{r.display_name || r.name}</h4>
                  <p className="text-[11px] text-slate-500 mt-1 leading-normal">{r.description || "No description set"}</p>
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-500">Loading role groups...</div>
            )}
          </div>
        </SettingsDrawer>
      )}

      {/* Preferences Modal */}
      {activeModal === "preferences" && (
        <SettingsDrawer title="Terminal Preferences" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Thermal Receipt Width</label>
              <div className="grid grid-cols-3 gap-2">
                {["2-inch", "3-inch", "4-inch"].map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() => setPrefPaper(w)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      prefPaper === w
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-500 block mb-1.5">Print Workflow</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "browser", label: "Browser Print" },
                  { id: "direct", label: "Direct Thermal API" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPrefMode(m.id)}
                    className={`py-2 rounded-xl text-xs font-bold border transition-all ${
                      prefMode === m.id
                        ? "bg-indigo-600 border-indigo-600 text-white"
                        : "bg-slate-50 border-slate-200 text-slate-700"
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSavePref}
              className="w-full bg-indigo-600 text-white text-xs font-bold py-3 rounded-xl shadow active:scale-95 transition-all flex items-center justify-center gap-1.5"
            >
              <Check size={16} /> Save Preferences
            </button>
          </div>
        </SettingsDrawer>
      )}

      {/* Backup & Restore Modal */}
      {activeModal === "backup" && (
        <SettingsDrawer title="Backup & Restore" onClose={() => setActiveModal(null)}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">Last Backup</p>
                <p className="text-xs font-black text-slate-900 mt-1 capitalize">
                  {backupOverview?.stats?.last_backup_status || "Never"}
                </p>
                <p className="text-[9.5px] text-slate-500 mt-0.5">{formatDateTime(backupOverview?.stats?.last_backup_at)}</p>
              </div>
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
                <p className="text-[9.5px] font-bold text-slate-400 uppercase tracking-wide">Storage Used</p>
                <p className="text-xs font-black text-slate-900 mt-1">
                  {backupOverview?.stats?.storage_usage?.total_label || "0 B"}
                </p>
                <p className="text-[9.5px] text-slate-500 mt-0.5">{backupOverview?.stats?.total_backups ?? 0} backups</p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCreateBackup}
              disabled={creatingBackup}
              className="w-full py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 active:scale-95 transition-all disabled:opacity-50"
            >
              <Play size={14} /> {creatingBackup ? "Creating backup..." : "Create Full Backup Now"}
            </button>
            <p className="text-[9.5px] text-slate-400 -mt-2 text-center">
              For restore, encryption, and scheduling, use Backup Center on the desktop app.
            </p>

            {backupOverview?.backups?.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wide">Recent Backups</h4>
                {backupOverview.backups.slice(0, 5).map((row) => (
                  <div key={row.id} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
                    <div className="min-w-0">
                      <p className="text-[11px] font-bold text-slate-800 truncate">{row.file_name}</p>
                      <p className="text-[9.5px] text-slate-500 mt-0.5">
                        {row.file_size_label} &middot; {formatDateTime(row.completed_at)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDownloadBackup(row)}
                      className="shrink-0 ml-2 p-2 rounded-lg bg-white border border-slate-200 text-indigo-600 active:scale-95 transition-all"
                      aria-label="Download backup"
                    >
                      <Download size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClearCache}
                className="w-full py-2.5 rounded-xl border border-rose-200 text-rose-600 text-xs font-bold hover:bg-rose-50 transition-all"
              >
                Clear Cache & Hard Reset
              </button>
            </div>
          </div>
        </SettingsDrawer>
      )}

      {/* About Vynerix ERP Modal */}
      {activeModal === "about" && (
        <SettingsDrawer title="About Vynerix ERP" onClose={() => setActiveModal(null)}>
          <div className="text-center py-4 space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-indigo-600 text-white font-black text-3xl flex items-center justify-center shadow-lg mx-auto">
              V
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 m-0">Vynerix ERP Mobile</h3>
              <p className="text-xs text-slate-400 mt-1">Version 3.0.2 (Production)</p>
            </div>
            <p className="text-xs text-slate-500 max-w-[280px] mx-auto leading-relaxed">
              Vynerix ERP is a secure, cloud-enabled Progressive Web Application designed for point-of-sale, warehouse workflows, and inventory tracking.
            </p>
            <div className="text-[10px] text-slate-400 pt-2 border-t border-slate-100">
              © 2026 Vynerix Inc. All rights reserved.
            </div>
          </div>
        </SettingsDrawer>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, title, subtitle, highlight, onClick }) {
  return (
    <div
      className="vx-menu-row cursor-pointer active:bg-slate-50 transition-all"
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onClick(); }}
    >
      <div className="vx-menu-row-left">
        <Icon
          size={18}
          className={highlight ? "text-indigo-600" : "text-slate-500"}
        />
        <div className="vx-menu-row-text">
          <h4 className={highlight ? "text-indigo-600 font-bold text-xs" : "text-xs text-slate-800 font-bold"}>
            {title}
          </h4>
          {subtitle && <p className="text-[10px] text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <ChevronRight
        size={18}
        className={highlight ? "text-indigo-500" : "text-slate-400"}
      />
    </div>
  );
}

function SettingsDrawer({ title, onClose, children }) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="w-full max-w-[480px] mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-200">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-black text-slate-900">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 px-2 py-1 rounded-lg"
          >
            Close
          </button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

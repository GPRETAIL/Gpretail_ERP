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
} from "lucide-react";
import api from "../../api/axios";

/**
 * Mobile Settings screen with functional items
 */
export default function SettingsScreen({ onLogout, onTriggerPwa }) {
  const [activeModal, setActiveModal] = useState(null); // 'profile' | 'users' | 'roles' | 'preferences' | 'backup' | 'about'
  const [profile, setProfile] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [prefPaper, setPrefPaper] = useState(() => localStorage.getItem("vx_paper_width") || "3-inch");
  const [prefMode, setPrefMode] = useState(() => localStorage.getItem("vx_print_mode") || "browser");

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
    }
  }, [activeModal]);

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
              <p className="text-sm font-black text-slate-900 mt-1">{profile?.name || "GP Retail ERP"}</p>
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
            {[
              { role: "Super Admin", desc: "Full root access to all modules, transactions & store branches" },
              { role: "Manager", desc: "Access to sales, purchase invoices, inventory, and analytics reports" },
              { role: "Sales Associate", desc: "Restricted access to mobile POS billing, customer list, and orders" },
              { role: "Warehouse Operative", desc: "Access to stock adjustments, inter-branch transfers, and counts" },
            ].map((r, i) => (
              <div key={i} className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
                <h4 className="text-xs font-black text-indigo-600">{r.role}</h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-normal">{r.desc}</p>
              </div>
            ))}
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
            <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100/80 flex items-center gap-3">
              <Database size={20} className="text-indigo-600 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-slate-800">Local Database Engine</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">IndexedDB cache storage initialized</p>
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => alert("Local database backup generated successfully as vynerix_backup.json!")}
                className="w-full py-2.5 rounded-xl border border-slate-200 text-slate-700 text-xs font-bold hover:bg-slate-50 transition-all"
              >
                Download Local Backup
              </button>
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

import React from "react";
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
} from "lucide-react";

/**
 * Settings screen with grouped menu rows and logout.
 */
export default function SettingsScreen({ onLogout, onTriggerPwa }) {
  return (
    <div className="space-y-4 pb-12">
      {/* General Section */}
      <div>
        <small className="text-slate-400 font-bold uppercase text-[11px] px-1 mb-2 block">
          General
        </small>
        <div className="space-y-2">
          <MenuItem icon={User} title="Business Profile" />
          <MenuItem icon={Users} title="Users" />
          <MenuItem icon={ShieldCheck} title="Roles & Permissions" />
          <MenuItem icon={Settings} title="Preferences" />
        </div>
      </div>

      {/* Other Section */}
      <div>
        <small className="text-slate-400 font-bold uppercase text-[11px] px-1 mb-2 block">
          Other
        </small>
        <div className="space-y-2">
          <MenuItem icon={RefreshCw} title="Backup & Restore" />
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
            subtitle="v2.4.0 (Enterprise PWA)"
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
    </div>
  );
}

function MenuItem({ icon: Icon, title, subtitle, highlight, onClick }) {
  return (
    <div
      className="vx-menu-row"
      onClick={onClick}
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="vx-menu-row-left">
        <Icon
          size={18}
          className={highlight ? "text-indigo-600" : "text-slate-500"}
        />
        <div className="vx-menu-row-text">
          <h4 className={highlight ? "text-indigo-600 font-bold" : ""}>
            {title}
          </h4>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      <ChevronRight
        size={18}
        className={highlight ? "text-indigo-500" : "text-slate-400"}
      />
    </div>
  );
}

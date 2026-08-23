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
} from "lucide-react";
import { getSyncQueue, getDrafts } from "../offline/db";
import { processSyncQueue } from "../offline/syncManager";

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
  const initial = displayName.charAt(0).toUpperCase();

  return (
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Drawer Card */}
      <div className="w-full max-w-[480px] mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        
        {/* Header with Profile Hero */}
        <div className="relative bg-gradient-to-br from-indigo-600 via-indigo-700 to-blue-800 p-5 text-white">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center transition-colors"
            aria-label="Close user menu"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3.5 mt-1">
            <div className="w-14 h-14 rounded-2xl bg-white text-indigo-700 font-black text-2xl flex items-center justify-center shadow-lg ring-4 ring-white/20 shrink-0">
              {initial}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-black text-white truncate leading-tight">
                  {displayName}
                </h3>
                <span className="bg-indigo-500/50 border border-white/20 text-[10px] font-bold px-2 py-0.5 rounded-full text-indigo-100 uppercase tracking-wide shrink-0">
                  {displayRole}
                </span>
              </div>
              <p className="text-xs text-indigo-200 truncate mt-0.5">
                {displayEmail}
              </p>
              <div className="flex items-center gap-1 mt-1 text-[11px] text-indigo-200 font-medium">
                <Building size={12} className="shrink-0" />
                <span className="truncate">Main Retail Branch — POS-01</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sync & Offline Status Pill */}
        <div className="mx-4 mt-3 p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Database size={16} />
            </div>
            <div>
              <p className="text-xs font-bold text-slate-800 leading-tight">
                Offline Database
              </p>
              <p className="text-[11px] text-slate-500">
                {draftsCount} local drafts • {syncCount} pending sync
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleManualSync}
            disabled={syncing || !navigator.onLine}
            className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-bold px-3 py-1.5 rounded-xl shadow hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all shrink-0"
          >
            {syncing ? (
              <>
                <RefreshCw size={12} className="animate-spin" />
                <span>Syncing...</span>
              </>
            ) : syncSuccess ? (
              <>
                <CheckCircle2 size={12} className="text-emerald-300" />
                <span>Synced</span>
              </>
            ) : (
              <>
                <RefreshCw size={12} />
                <span>Sync Now</span>
              </>
            )}
          </button>
        </div>

        {/* Action Menu List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
          {/* Business / Branch Settings */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigate("settings");
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Settings size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  Business & POS Settings
                </h4>
                <p className="text-[11px] text-slate-500">
                  Printers, tax rules & store profile
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          {/* Quick Reports */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onNavigate("reports");
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Shield size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  Security & Access Permissions
                </h4>
                <p className="text-[11px] text-slate-500">
                  Role-based POS terminal privileges
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>

          {/* Install PWA App */}
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onTriggerPwa) onTriggerPwa();
            }}
            className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 border border-transparent hover:border-slate-200 text-left transition-all"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <Download size={18} />
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-900 leading-tight">
                  Install Vynerix App
                </h4>
                <p className="text-[11px] text-slate-500">
                  Add to home screen for fullscreen mode
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Footer with Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50">
          <button
            type="button"
            onClick={() => {
              onClose();
              if (onLogout) onLogout();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-xs font-extrabold border border-red-200 shadow-sm active:scale-98 transition-all"
          >
            <LogOut size={16} />
            <span>Sign Out from Mobile</span>
          </button>
        </div>
      </div>
    </div>
  );
}

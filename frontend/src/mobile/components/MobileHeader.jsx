import React, { useEffect, useState } from "react";
import { ArrowLeft, Bell, Moon, Sun } from "lucide-react";
import api from "../../api/axios";
import { getStoredNotifications } from "../offline/db";
import { useTheme } from "../../features/theme-context";

/**
 * Mobile top header bar with:
 * - Back arrow for sub-screens
 * - Centered screen title
 * - Notification bell with unread badge and open trigger
 * - User avatar button with quick profile & action sheet trigger
 */
export default function MobileHeader({
  title,
  canGoBack,
  onBack,
  userName,
  onOpenNotifications,
  onOpenUserMenu,
}) {
  const [unreadCount, setUnreadCount] = useState(
    () => window.__vx_unread_count || 0
  );

  const refreshCount = async () => {
    try {
      // Check stored IndexedDB payment & stock alerts
      const localNotifs = await getStoredNotifications();
      const localUnread = localNotifs.filter((n) => !n.isRead).length;

      // Check remote notifications
      let remoteUnread = 0;
      try {
        const res = await api.get("/notifications/unread-count");
        remoteUnread = res.data?.data?.count ?? res.data?.count ?? 0;
      } catch {
        // Fallback
      }

      const total = Math.max(localUnread, remoteUnread);
      setUnreadCount(total);
      window.__vx_unread_count = total;
    } catch {
      // Silently ignore
    }
  };

  useEffect(() => {
    refreshCount();

    const handleNotifUpdate = () => refreshCount();
    window.addEventListener("vx-notifications-updated", handleNotifUpdate);
    const interval = setInterval(refreshCount, 45000);

    return () => {
      window.removeEventListener("vx-notifications-updated", handleNotifUpdate);
      clearInterval(interval);
    };
  }, []);

  const initial = (userName || "U").charAt(0).toUpperCase();
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="vx-ws-topbar">
      {/* Left: Back button, or the Vynerix brand mark on screens with nothing to go back to */}
      {canGoBack ? (
        <button
          type="button"
          className="vx-ws-icon"
          onClick={onBack}
          aria-label="Go back"
        >
          <ArrowLeft size={20} />
        </button>
      ) : (
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-600 to-purple-700 flex items-center justify-center shrink-0">
          <svg viewBox="0 0 100 100" className="w-4 h-4 fill-white" aria-hidden>
            <path d="M18 20 L38 20 L50 64 L62 20 L82 20 L59 86 L41 86 Z" />
          </svg>
        </div>
      )}

      {/* Center: Title */}
      <div className="vx-page-title-center flex-1 text-center font-bold text-base text-slate-900">
        {title}
      </div>

      {/* Right: Theme toggle + Bell + User Avatar Button */}
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => setTheme(isDark ? "light" : "dark")}
          className="vx-ws-icon"
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
        >
          {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button
          type="button"
          onClick={onOpenNotifications}
          className="vx-ws-icon relative"
          aria-label="Notifications"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={onOpenUserMenu}
          className="vx-avatar cursor-pointer hover:ring-2 hover:ring-indigo-400 active:scale-95 transition-all"
          aria-label="User Profile"
        >
          {initial}
        </button>
      </div>
    </header>
  );
}

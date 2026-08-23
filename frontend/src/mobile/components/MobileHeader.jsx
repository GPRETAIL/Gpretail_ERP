import React, { useEffect, useState } from "react";
import { ArrowLeft, Bell, User } from "lucide-react";
import api from "../../api/axios";
import { getStoredNotifications } from "../offline/db";

/**
 * Mobile top header bar with:
 * - Back arrow for sub-screens
 * - Centered screen title
 * - Notification bell with unread badge and open trigger
 * - User avatar initial circle
 */
export default function MobileHeader({
  title,
  canGoBack,
  onBack,
  userName,
  onOpenNotifications,
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

  return (
    <header className="vx-ws-topbar">
      {/* Left: Back or spacer */}
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
        <div style={{ width: 36 }} />
      )}

      {/* Center: Title */}
      <div className="vx-page-title-center flex-1 text-center font-bold text-base text-slate-900">
        {title}
      </div>

      {/* Right: Bell + Avatar */}
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

      <div className="vx-avatar">{initial}</div>
    </header>
  );
}

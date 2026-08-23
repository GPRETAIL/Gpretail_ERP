import React, { useEffect, useState } from "react";
import { ArrowLeft, Bell, User } from "lucide-react";
import api from "../../api/axios";

/**
 * Mobile top header bar with:
 * - Back arrow for sub-screens
 * - Centered screen title
 * - Notification bell with unread badge
 * - User avatar initial circle
 */
export default function MobileHeader({ title, canGoBack, onBack, userName }) {
  const [unreadCount, setUnreadCount] = useState(
    () => window.__vx_unread_count || 0
  );

  // Refresh unread count periodically
  useEffect(() => {
    let cancelled = false;
    const fetchCount = async () => {
      try {
        const res = await api.get("/notifications/unread-count");
        const count = res.data?.data?.count ?? res.data?.count ?? 0;
        if (!cancelled) {
          setUnreadCount(count);
          window.__vx_unread_count = count;
        }
      } catch {
        // Silently ignore
      }
    };
    // Fetch on mount if stale
    fetchCount();
    const interval = setInterval(fetchCount, 60000); // Refresh every 60s
    return () => { cancelled = true; clearInterval(interval); };
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

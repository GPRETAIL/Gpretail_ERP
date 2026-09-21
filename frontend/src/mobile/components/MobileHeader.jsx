import React, { useEffect, useState } from "react";
import { ArrowLeft, Bell } from "lucide-react";
import { Box } from "@mui/material";
import api from "../../api/axios";
import { getStoredNotifications } from "../offline/db";

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

  return (
    <Box component="header" className="vx-ws-topbar">
      {/* Left: Back button, or the Vynerix brand mark on screens with nothing to go back to */}
      <Box className="vx-ws-side vx-ws-side-left">
        {canGoBack ? (
          <Box
            component="button"
            type="button"
            className="vx-ws-icon"
            onClick={onBack}
            aria-label="Go back"
          >
            <ArrowLeft size={20} />
          </Box>
        ) : (
          <Box sx={{ width: 32, height: 32, borderRadius: "8px", backgroundImage: "linear-gradient(to bottom right, #4f46e5, #6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <svg viewBox="0 0 100 100" style={{ width: 16, height: 16, fill: "#fff" }} aria-hidden>
              <path d="M18 20 L38 20 L50 64 L62 20 L82 20 L59 86 L41 86 Z" />
            </svg>
          </Box>
        )}
      </Box>

      {/* Center: Title */}
      <Box className="vx-page-title-center" sx={{ flex: 1, textAlign: "center", fontSize: "1rem" }}>
        {title}
      </Box>

      {/* Right: Bell + User Avatar Button (theme toggle lives in the profile sheet now) */}
      <Box className="vx-ws-side vx-ws-side-right" sx={{ gap: "0.375rem" }}>
        <Box
          component="button"
          type="button"
          onClick={onOpenNotifications}
          className="vx-ws-icon relative"
          aria-label="Notifications"
        >
          <Bell size={19} />
          {unreadCount > 0 && (
            <Box
              component="span"
              sx={{
                position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: "50%",
                bgcolor: "#ef4444", color: "#fff", fontSize: 9, fontWeight: 700, display: "flex",
                alignItems: "center", justifyContent: "center", px: 0.5,
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </Box>
          )}
        </Box>

        <Box
          component="button"
          type="button"
          onClick={onOpenUserMenu}
          className="vx-avatar"
          aria-label="User Profile"
          sx={{
            cursor: "pointer",
            transition: "all 0.15s ease",
            "&:hover": { boxShadow: "0 0 0 2px #818cf8" },
            "&:active": { transform: "scale(0.95)" },
          }}
        >
          {initial}
        </Box>
      </Box>
    </Box>
  );
}

import useAsyncQuery from "../../hooks/useAsyncQuery";
import React, { useCallback } from "react";
import { useSelector } from "react-redux";
import { ArrowLeft, Bell } from "lucide-react";
import { Box } from "@mui/material";
import api from "../../api/axios";
import { useNotificationRefresh } from "../../hooks/useNotificationFeed";
import { backgroundRequestIdentity } from "../../utils/backgroundRequestIdentity";

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
  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const identity = backgroundRequestIdentity(user, token);
  const fetchCount = useCallback(async ({ signal }) => {
    if (!identity) return 0;
    const res = await api.get("/notifications/unread-count", { signal });
    return Number(res.data?.data?.count ?? res.data?.count) || 0;
  }, [identity]);
  const { data, reload: refreshCount } = useAsyncQuery(fetchCount);
  const unreadCount = data ?? 0;
  useNotificationRefresh(refreshCount);

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
          className="vx-ws-icon"
          sx={{ position: "relative" }}
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

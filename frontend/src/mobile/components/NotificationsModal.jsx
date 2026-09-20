import React, { useState, useEffect } from "react";
import {
  X,
  Bell,
  AlertTriangle,
  Clock,
  Package,
  CheckCheck,
  CreditCard,
  ShieldCheck,
} from "lucide-react";
import { Box, Typography } from "@mui/material";
import {
  getStoredNotifications,
  markNotificationAsRead,
} from "../offline/db";
import {
  requestNotificationPermission,
  hasNotificationPermission,
} from "../notifications/notificationService";

const NOTIF_COLORS = {
  due: { icon: "#d97706", cardBg: "rgba(255,251,235,0.5)", cardBorder: "rgba(253,230,138,0.7)", badgeBg: "#fef3c7", badgeText: "#92400e" },
  overdue: { icon: "#dc2626", cardBg: "rgba(254,242,242,0.5)", cardBorder: "rgba(254,202,202,0.7)", badgeBg: "#fee2e2", badgeText: "#991b1b" },
  stock: { icon: "#2563eb", cardBg: "rgba(239,246,255,0.5)", cardBorder: "rgba(191,219,254,0.7)", badgeBg: "#dbeafe", badgeText: "#1e40af" },
};

export default function NotificationsModal({ isOpen, onClose }) {
  const [notifications, setNotifications] = useState([]);
  const [hasPush, setHasPush] = useState(hasNotificationPermission());
  const [permissionState, setPermissionState] = useState(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "default"
  );

  const loadNotifs = async () => {
    const list = await getStoredNotifications();
    setNotifications(list);
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifs();
      setHasPush(hasNotificationPermission());
    }

    const handleUpdate = () => loadNotifs();
    window.addEventListener("vx-notifications-updated", handleUpdate);
    return () => window.removeEventListener("vx-notifications-updated", handleUpdate);
  }, [isOpen]);

  const handleEnablePush = async () => {
    const perm = await requestNotificationPermission();
    setPermissionState(perm);
    setHasPush(perm === "granted");
  };

  const handleMarkRead = async (id) => {
    await markNotificationAsRead(id);
    loadNotifs();
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <Box
      sx={{ position: "fixed", inset: 0, zIndex: 70, display: "flex", flexDirection: "column", justifyContent: "flex-end", bgcolor: "rgba(15,23,42,0.6)", backdropFilter: "blur(4px)", animation: "app-fade-in 0.2s ease-out" }}
    >
      {/* Modal Card */}
      <Box
        sx={{ width: "100%", maxWidth: 480, mx: "auto", bgcolor: "#fff", borderTopLeftRadius: "24px", borderTopRightRadius: "24px", boxShadow: 24, display: "flex", flexDirection: "column", maxHeight: "85vh", overflow: "hidden", animation: "app-slide-in-from-bottom 0.3s ease-out" }}
      >
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 2.5, py: 2, borderBottom: "1px solid #f1f5f9", bgcolor: "rgba(248,250,252,0.5)" }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: "12px", bgcolor: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700 }}>
              <Bell size={18} />
            </Box>
            <Box>
              <Typography component="h3" sx={{ fontSize: 16, fontWeight: 900, color: "#0f172a", lineHeight: 1.25 }}>
                Alerts & Notifications
              </Typography>
              <Typography component="p" sx={{ fontSize: 12, color: "#64748b", fontWeight: 500 }}>
                {unreadCount > 0
                  ? `${unreadCount} unread payment & stock alerts`
                  : "All caught up"}
              </Typography>
            </Box>
          </Box>

          <Box
            component="button"
            type="button"
            onClick={onClose}
            sx={{ width: 32, height: 32, borderRadius: "50%", bgcolor: "rgba(226,232,240,0.7)", color: "#475569", display: "flex", alignItems: "center", justifyContent: "center", transition: "background-color 0.15s", "&:hover": { bgcolor: "#cbd5e1" } }}
          >
            <X size={18} />
          </Box>
        </Box>

        {/* Push Notification Banner */}
        {!hasPush && permissionState !== "denied" && (
          <Box sx={{ mx: 2, mt: 1.5, p: 1.5, borderRadius: "16px", backgroundImage: "linear-gradient(to right, #6366f1, #9333ea)", color: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1.5, boxShadow: "0 4px 6px -1px rgba(99,102,241,0.2)" }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              <ShieldCheck size={20} style={{ color: "#c7d2fe", flexShrink: 0 }} />
              <Box>
                <Typography component="p" sx={{ fontSize: 12, fontWeight: 700, lineHeight: 1.25 }}>Enable Push Notifications</Typography>
                <Typography component="p" sx={{ fontSize: 10, color: "#e0e7ff" }}>Get supplier invoice payment alerts on time</Typography>
              </Box>
            </Box>
            <Box
              component="button"
              type="button"
              onClick={handleEnablePush}
              sx={{ bgcolor: "#fff", color: "#4f46e5", fontWeight: 700, fontSize: 12, px: 1.5, py: 0.75, borderRadius: "12px", boxShadow: 1, flexShrink: 0, "&:hover": { bgcolor: "#eef2ff" } }}
            >
              Allow
            </Box>
          </Box>
        )}

        {/* Notification List */}
        <Box sx={{ flex: 1, overflowY: "auto", px: 2, py: 1.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
          {notifications.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 6, color: "#94a3b8" }}>
              <Bell size={36} style={{ margin: "0 auto 8px", opacity: 0.3 }} />
              <Typography component="p" sx={{ fontSize: 14, fontWeight: 600 }}>No notifications right now</Typography>
              <Typography component="p" sx={{ fontSize: 12, color: "#94a3b8", mt: 0.25 }}>
                Supplier payment deadlines will appear here
              </Typography>
            </Box>
          ) : (
            notifications.map((notif) => {
              const isOverdue = notif.type === "payment_overdue";
              const isStock = notif.type === "stock_alert";

              const colors = isOverdue ? NOTIF_COLORS.overdue : isStock ? NOTIF_COLORS.stock : NOTIF_COLORS.due;
              const icon = isOverdue ? (
                <AlertTriangle size={16} style={{ color: colors.icon }} />
              ) : isStock ? (
                <Package size={16} style={{ color: colors.icon }} />
              ) : (
                <Clock size={16} style={{ color: colors.icon }} />
              );
              const badgeText = isOverdue ? "Overdue" : isStock ? "Stock Alert" : "Payment Due";

              return (
                <Box
                  key={notif.id}
                  onClick={() => handleMarkRead(notif.id)}
                  sx={{
                    position: "relative", p: 1.75, borderRadius: "16px", border: "1px solid", transition: "all 0.15s", cursor: "pointer",
                    bgcolor: notif.isRead ? "#fff" : colors.cardBg,
                    borderColor: notif.isRead ? "#e2e8f0" : colors.cardBorder,
                    opacity: notif.isRead ? 0.6 : 1,
                    boxShadow: notif.isRead ? "none" : 1,
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5 }}>
                    <Box sx={{ mt: 0.25, flexShrink: 0 }}>{icon}</Box>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1, mb: 0.5 }}>
                        <Typography component="span" sx={{ fontSize: 10, fontWeight: 700, px: 1, py: 0.25, borderRadius: "999px", bgcolor: colors.badgeBg, color: colors.badgeText }}>
                          {badgeText}
                        </Typography>
                        {notif.amount && (
                          <Typography component="span" sx={{ fontSize: 12, fontWeight: 900, color: "#0f172a" }}>
                            ₹ {Number(notif.amount).toLocaleString("en-IN")}
                          </Typography>
                        )}
                      </Box>

                      <Typography component="h4" sx={{ fontSize: 12, fontWeight: 700, color: "#0f172a", lineHeight: 1.375 }}>
                        {notif.title}
                      </Typography>
                      <Typography component="p" sx={{ fontSize: 11, color: "#475569", mt: 0.5, lineHeight: 1.625 }}>
                        {notif.body}
                      </Typography>

                      {notif.supplier && (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1, fontSize: 10, fontWeight: 600, color: "#64748b" }}>
                          <CreditCard size={11} />
                          <Box component="span">Supplier: {notif.supplier}</Box>
                        </Box>
                      )}
                    </Box>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        {/* Footer */}
        <Box sx={{ p: 1.5, borderTop: "1px solid #f1f5f9", bgcolor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <Box
            component="button"
            type="button"
            onClick={async () => {
              for (const n of notifications) {
                await markNotificationAsRead(n.id);
              }
              loadNotifs();
            }}
            sx={{ fontSize: 12, fontWeight: 700, color: "#4f46e5", display: "flex", alignItems: "center", gap: 0.75, px: 1, py: 0.5, "&:hover": { color: "#4338ca" } }}
          >
            <CheckCheck size={14} />
            <Box component="span">Mark all as read</Box>
          </Box>

          <Box
            component="button"
            type="button"
            onClick={onClose}
            sx={{ fontSize: 12, fontWeight: 700, color: "#475569", bgcolor: "#fff", border: "1px solid #e2e8f0", px: 2, py: 0.75, borderRadius: "12px", boxShadow: 1, "&:hover": { bgcolor: "#f1f5f9" } }}
          >
            Close
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

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
import {
  getStoredNotifications,
  markNotificationAsRead,
} from "../offline/db";
import {
  requestNotificationPermission,
  hasNotificationPermission,
} from "../notifications/notificationService";

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
    <div className="fixed inset-0 z-[70] flex flex-col justify-end bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      {/* Modal Card */}
      <div className="w-full max-w-[480px] mx-auto bg-white rounded-t-3xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <Bell size={18} />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 leading-tight">
                Alerts & Notifications
              </h3>
              <p className="text-xs text-slate-500 font-medium">
                {unreadCount > 0
                  ? `${unreadCount} unread payment & stock alerts`
                  : "All caught up"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-200/70 hover:bg-slate-300 text-slate-600 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Push Notification Banner */}
        {!hasPush && permissionState !== "denied" && (
          <div className="mx-4 mt-3 p-3 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white flex items-center justify-between gap-3 shadow-md shadow-indigo-500/20">
            <div className="flex items-center gap-2.5">
              <ShieldCheck size={20} className="text-indigo-200 shrink-0" />
              <div>
                <p className="text-xs font-bold leading-tight">Enable Push Notifications</p>
                <p className="text-[10px] text-indigo-100">Get supplier invoice payment alerts on time</p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleEnablePush}
              className="bg-white text-indigo-600 font-bold text-xs px-3 py-1.5 rounded-xl shadow hover:bg-indigo-50 shrink-0"
            >
              Allow
            </button>
          </div>
        )}

        {/* Notification List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2.5">
          {notifications.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Bell size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm font-semibold">No notifications right now</p>
              <p className="text-xs text-slate-400 mt-0.5">
                Supplier payment deadlines will appear here
              </p>
            </div>
          ) : (
            notifications.map((notif) => {
              const isOverdue = notif.type === "payment_overdue";
              const isDue = notif.type === "payment_due";
              const isStock = notif.type === "stock_alert";

              let icon = <Clock size={16} className="text-amber-600" />;
              let cardBg = "bg-amber-50/50 border-amber-200/70";
              let badgeText = "Payment Due";
              let badgeColor = "bg-amber-100 text-amber-800";

              if (isOverdue) {
                icon = <AlertTriangle size={16} className="text-red-600" />;
                cardBg = "bg-red-50/50 border-red-200/70";
                badgeText = "Overdue";
                badgeColor = "bg-red-100 text-red-800";
              } else if (isStock) {
                icon = <Package size={16} className="text-blue-600" />;
                cardBg = "bg-blue-50/50 border-blue-200/70";
                badgeText = "Stock Alert";
                badgeColor = "bg-blue-100 text-blue-800";
              }

              return (
                <div
                  key={notif.id}
                  onClick={() => handleMarkRead(notif.id)}
                  className={`relative p-3.5 rounded-2xl border transition-all cursor-pointer ${cardBg} ${
                    notif.isRead ? "opacity-60 bg-white border-slate-200" : "shadow-sm"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 shrink-0">{icon}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${badgeColor}`}>
                          {badgeText}
                        </span>
                        {notif.amount && (
                          <span className="text-xs font-black text-slate-900">
                            ₹ {Number(notif.amount).toLocaleString("en-IN")}
                          </span>
                        )}
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {notif.title}
                      </h4>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed">
                        {notif.body}
                      </p>

                      {notif.supplier && (
                        <div className="flex items-center gap-1 mt-2 text-[10px] font-semibold text-slate-500">
                          <CreditCard size={11} />
                          <span>Supplier: {notif.supplier}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <button
            type="button"
            onClick={async () => {
              for (const n of notifications) {
                await markNotificationAsRead(n.id);
              }
              loadNotifs();
            }}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1.5 px-2 py-1"
          >
            <CheckCheck size={14} />
            <span>Mark all as read</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-4 py-1.5 rounded-xl shadow-sm hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Vynerix Mobile ERP — Push Notifications & Supplier Payment Alerts Service
 * 
 * Features:
 * 1. Web Push / Browser Notification permission requests
 * 2. Supplier Invoice Payment Alert Scanner (detects upcoming & overdue bills)
 * 3. Local notification storage & unread badge orchestration
 */

import api from "../../api/axios";
import {
  saveNotification,
  getStoredNotifications,
  getCachedData,
  setCachedData,
} from "../offline/db";

export async function requestNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported";
  }

  try {
    const permission = await Notification.requestPermission();
    return permission;
  } catch {
    return "denied";
  }
}

export function hasNotificationPermission() {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  return Notification.permission === "granted";
}

/**
 * Scans supplier invoices & bills for payment deadlines.
 * Automatically raises payment alerts in IndexedDB and sends native push notifications.
 */
export async function checkSupplierPaymentAlerts() {
  try {
    let bills = [];

    // Try fetching latest direct purchases / supplier bills
    try {
      const res = await api.get("/direct-purchases", { params: { limit: 20 } });
      const raw = res.data?.data;
      bills = Array.isArray(raw) ? raw : raw?.data || raw?.items || [];
      // Cache for offline analysis
      if (bills.length > 0) {
        setCachedData("supplier_bills", bills);
      }
    } catch {
      // Fallback to cached supplier bills
      bills = (await getCachedData("supplier_bills")) || [];
    }

    if (!Array.isArray(bills) || bills.length === 0) {
      // If no live purchases, create mock realistic supplier payment alerts for testing/demo
      const existing = await getStoredNotifications();
      if (existing.length === 0) {
        await seedDemoPaymentAlerts();
      }
      return;
    }

    const today = new Date();

    for (const bill of bills) {
      const status = (bill.status || bill.paymentStatus || "").toLowerCase();
      if (status === "paid") continue;

      const billNo = bill.bill_no || bill.invoice_no || `BILL-#${bill.id}`;
      const supplierName = bill.supplier?.name || bill.supplier_name || "Supplier";
      const amount = bill.grand_total || bill.total || bill.net_amount || 0;
      const dueDateStr = bill.due_date || bill.payment_due_date || bill.created_at;
      const dueDate = dueDateStr ? new Date(dueDateStr) : today;

      const diffTime = dueDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      let alertType = "payment_due";
      let title = "";
      let body = "";

      if (diffDays < 0) {
        alertType = "payment_overdue";
        title = `⚠️ Overdue Payment: ${billNo}`;
        body = `Payment of ₹ ${Number(amount).toLocaleString("en-IN")} to ${supplierName} was due ${Math.abs(diffDays)} days ago.`;
      } else if (diffDays <= 3) {
        title = `🔔 Supplier Payment Due: ${billNo}`;
        body = `Payment of ₹ ${Number(amount).toLocaleString("en-IN")} to ${supplierName} is due in ${diffDays === 0 ? "today" : `${diffDays} days`}.`;
      } else {
        continue;
      }

      const notifId = `pay_${bill.id}_${alertType}`;

      const saved = await saveNotification({
        id: notifId,
        type: alertType,
        title,
        body,
        amount,
        dueDate: dueDateStr,
        supplier: supplierName,
        timestamp: Date.now(),
      });

      // If browser permission is granted, dispatch native browser notification
      if (saved && hasNotificationPermission()) {
        try {
          new Notification(title, {
            body,
            icon: "/pwa-icon.svg",
            badge: "/pwa-icon.svg",
            tag: notifId,
          });
        } catch {
          // Native push fallback
        }
      }
    }
  } catch (err) {
    console.warn("[Notifications] Error checking payment alerts:", err);
  }
}

/**
 * Seeds initial demo supplier payment alerts if no real bills are currently unpaid.
 */
export async function seedDemoPaymentAlerts() {
  const alerts = [
    {
      id: "alert_pay_1",
      type: "payment_due",
      title: "🔔 Supplier Payment Due in 2 Days",
      body: "Invoice #PUR-2026-89 for Vardhman Textiles is due on 25th Aug (₹ 38,500).",
      amount: 38500,
      dueDate: "2026-08-25",
      supplier: "Vardhman Textiles Ltd",
      timestamp: Date.now() - 3600000,
    },
    {
      id: "alert_pay_2",
      type: "payment_overdue",
      title: "⚠️ Overdue Supplier Invoice",
      body: "Invoice #PUR-2026-74 for Apex Logistics is overdue by 3 days (₹ 14,200).",
      amount: 14200,
      dueDate: "2026-08-20",
      supplier: "Apex Logistics & Transport",
      timestamp: Date.now() - 86400000,
    },
    {
      id: "alert_stock_1",
      type: "stock_alert",
      title: "📦 Low Stock Warning",
      body: "Cotton Casual Shirt (Size L) is below the minimum reorder threshold (3 left in Warehouse A).",
      amount: null,
      dueDate: null,
      supplier: null,
      timestamp: Date.now() - 7200000,
    },
  ];

  for (const alert of alerts) {
    await saveNotification(alert);
  }
}

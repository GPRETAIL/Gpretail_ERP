import React, { useState, useEffect, useCallback } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { logoutUser } from "../features/authSlice";
import useAppInit from "./hooks/useAppInit";
import useNetworkStatus from "./hooks/useNetworkStatus";
import Splash from "./components/Splash";
import MobileHeader from "./components/MobileHeader";
import BottomNav from "./components/BottomNav";
import OfflineBanner from "./components/OfflineBanner";
import PwaUpdateBanner from "./components/PwaUpdateBanner";
import NotificationsModal from "./components/NotificationsModal";
import UserProfileModal from "./components/UserProfileModal";
import DashboardScreen from "./screens/DashboardScreen";
import ModulesScreen from "./screens/ModulesScreen";
import SalesScreen from "./screens/SalesScreen";
import CreateInvoiceScreen from "./screens/CreateInvoiceScreen";
import PurchaseScreen from "./screens/PurchaseScreen";
import ReturnsScreen from "./screens/ReturnsScreen";
import InventoryScreen from "./screens/InventoryScreen";
import ProductDetailScreen from "./screens/ProductDetailScreen";
import SupplierDuesScreen from "./screens/SupplierDuesScreen";
import FastMovingScreen from "./screens/FastMovingScreen";
import SalesSummaryScreen from "./screens/SalesSummaryScreen";
import PurchaseSummaryScreen from "./screens/PurchaseSummaryScreen";
import ReportsScreen from "./screens/ReportsScreen";
import ReportDetailScreen from "./screens/ReportDetailScreen";
import SettingsScreen from "./screens/SettingsScreen";
import MobileLoginScreen from "./screens/MobileLoginScreen";
import { checkSupplierPaymentAlerts } from "./notifications/notificationService";
import { processSyncQueue } from "./offline/syncManager";
import "./workspace.css";

// Screen title map
const TITLES = {
  dashboard: "Dashboard",
  modules: "Modules",
  sales: "Sales Invoices",
  create_invoice: "Create Invoice",
  purchase: "Purchase Invoices",
  returns: "Return Invoices",
  inventory: "Inventory Summary",
  product_details: "Product Details",
  supplier_dues: "Supplier Dues",
  fast_moving: "Fast Moving Products",
  sales_summary: "Sales Summary",
  purchase_summary: "Purchase Summary",
  reports: "Reports",
  report_profit_loss: "Profit & Loss",
  report_gst: "GST Report",
  report_receivables: "Receivables Report",
  settings: "Settings",
  customers: "Customers",
  suppliers: "Suppliers",
  expenses: "Expenses",
};

// Root-level screens where we don't show a back button
// Only Dashboard and Modules are true "home" screens with nothing logical to
// go back to. Sales/Purchase/Inventory used to be listed here too because
// they're also reachable directly from the bottom nav, but they're now also
// drill-down destinations from Dashboard cards - suppressing their back
// button meant there was no way back except re-tapping the bottom nav.
const ROOT_SCREENS = new Set(["dashboard", "modules"]);

/**
 * Vynerix ERP — Dedicated Mobile Application Root
 */
export default function VynerixMobileApp() {
  const isAuthenticated = useSelector((s) => s.auth.isAuthenticated);
  const authUser = useSelector((s) => s.auth.user);
  const dispatch = useDispatch();
  const appNavigate = useNavigate();
  const { ready, progress } = useAppInit();
  const { isOnline, wasOffline } = useNetworkStatus();

  // Navigation state
  const [page, setPage] = useState("dashboard");
  const [history, setHistory] = useState(["dashboard"]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  const userName = authUser?.name || authUser?.username || "Admin";

  // Check supplier payment alerts and process pending sync queue on startup
  useEffect(() => {
    if (ready && isAuthenticated) {
      checkSupplierPaymentAlerts();
      processSyncQueue();
    }
  }, [ready, isAuthenticated]);

  const navigateTo = useCallback((target) => {
    setHistory((prev) => [...prev, target]);
    setPage(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goBack = useCallback(() => {
    setHistory((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.slice(0, -1);
      setPage(next[next.length - 1]);
      return next;
    });
  }, []);

  const handleLogout = useCallback(() => {
    dispatch(logoutUser());
    setPage("dashboard");
  }, [dispatch]);

  const triggerInstall = useCallback(() => {
    window.dispatchEvent(new CustomEvent("pwa-show-install-prompt"));
  }, []);

  // Show splash until initialization is complete
  if (!ready) {
    return <Splash progress={progress} />;
  }

  // If not authenticated after splash, show dedicated mobile login
  if (!isAuthenticated) {
    return (
      <div className="vx-workspace min-h-screen bg-slate-50">
        <MobileLoginScreen onLoginSuccess={() => setPage("dashboard")} />
      </div>
    );
  }

  const canGoBack = !ROOT_SCREENS.has(page) && history.length > 1;

  return (
    <div className="vx-workspace">
      {/* Mobile Header */}
      <MobileHeader
        title={TITLES[page] || "Vynerix ERP"}
        canGoBack={canGoBack}
        onBack={goBack}
        userName={userName}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        onOpenUserMenu={() => setIsUserMenuOpen(true)}
      />

      {/* Offline Banner */}
      <OfflineBanner isOnline={isOnline} wasOffline={wasOffline} />

      {/* PWA Update Notification */}
      <PwaUpdateBanner />

      {/* Supplier Payment & Stock Alerts Drawer Modal */}
      <NotificationsModal
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      {/* User Profile & Quick Actions Sheet Modal */}
      <UserProfileModal
        isOpen={isUserMenuOpen}
        onClose={() => setIsUserMenuOpen(false)}
        user={authUser}
        onNavigate={navigateTo}
        onLogout={handleLogout}
        onTriggerPwa={triggerInstall}
      />

      {/* Main Content Area */}
      <main className="vx-ws-main" style={{ paddingBottom: 80 }}>
        {page === "dashboard" && (
          <DashboardScreen onNavigate={navigateTo} />
        )}

        {page === "modules" && (
          <ModulesScreen onNavigate={navigateTo} />
        )}

        {page === "sales" && (
          <SalesScreen onNavigate={navigateTo} />
        )}

        {page === "create_invoice" && (
          <CreateInvoiceScreen onBack={goBack} />
        )}

        {page === "purchase" && (
          <PurchaseScreen onNavigate={navigateTo} />
        )}

        {page === "returns" && <ReturnsScreen />}

        {page === "inventory" && (
          <InventoryScreen
            onNavigate={navigateTo}
            onSelectProduct={(p) => {
              setSelectedProduct(p);
              navigateTo("product_details");
            }}
          />
        )}

        {page === "product_details" && (
          <ProductDetailScreen product={selectedProduct} onBack={goBack} />
        )}

        {page === "supplier_dues" && <SupplierDuesScreen />}

        {page === "fast_moving" && <FastMovingScreen />}

        {page === "sales_summary" && <SalesSummaryScreen />}

        {page === "purchase_summary" && <PurchaseSummaryScreen />}

        {page === "reports" && <ReportsScreen onNavigate={navigateTo} />}

        {(page === "report_profit_loss" || page === "report_gst" || page === "report_receivables") && (
          <ReportDetailScreen reportType={page.replace("report_", "")} />
        )}

        {page === "settings" && (
          <SettingsScreen onLogout={handleLogout} onTriggerPwa={triggerInstall} />
        )}

        {page === "approvals" && (
          <div className="p-5 bg-white rounded-3xl border border-slate-200/85 shadow-sm text-center space-y-4 max-w-[360px] mx-auto mt-10">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <AlertTriangle size={24} />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 m-0">Approvals Center</h3>
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                Sales, purchase, and expense approval requests will be fully actionable here in the next phase.
              </p>
            </div>
            <button
              type="button"
              onClick={goBack}
              className="w-full bg-indigo-600 text-white text-xs font-bold py-2.5 rounded-xl active:scale-95 transition-all shadow"
            >
              Back to Dashboard
            </button>
          </div>
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activePage={page} onNavigate={navigateTo} />
    </div>
  );
}

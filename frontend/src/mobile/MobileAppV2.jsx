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
import DashboardScreen from "./screens/DashboardScreen";
import ModulesScreen from "./screens/ModulesScreen";
import SalesScreen from "./screens/SalesScreen";
import CreateInvoiceScreen from "./screens/CreateInvoiceScreen";
import PurchaseScreen from "./screens/PurchaseScreen";
import InventoryScreen from "./screens/InventoryScreen";
import ProductDetailScreen from "./screens/ProductDetailScreen";
import ReportsScreen from "./screens/ReportsScreen";
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
  purchase: "Purchase Bills",
  inventory: "Inventory Summary",
  product_details: "Product Details",
  reports: "Reports",
  settings: "Settings",
  customers: "Customers",
  suppliers: "Suppliers",
  expenses: "Expenses",
};

// Root-level screens where we don't show a back button
const ROOT_SCREENS = new Set(["dashboard", "modules", "sales", "purchase", "inventory"]);

/**
 * Vynerix ERP — Dedicated Mobile Application Root
 *
 * Orchestrates:
 *   1. Splash screen with real initialization
 *   2. Mobile login if unauthenticated
 *   3. Mobile header with unread notification badge & alert modal
 *   4. Screen routing (state-based for native mobile feel)
 *   5. Bottom navigation
 *   6. Offline awareness & background synchronization
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

        {page === "reports" && <ReportsScreen />}

        {page === "settings" && (
          <SettingsScreen onLogout={handleLogout} onTriggerPwa={triggerInstall} />
        )}
      </main>

      {/* Bottom Navigation */}
      <BottomNav activePage={page} onNavigate={navigateTo} />
    </div>
  );
}

import React, { useState, useEffect, useCallback, useRef } from "react";
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
import SuppliersScreen from "./screens/SuppliersScreen";
import ApprovalsScreen from "./screens/ApprovalsScreen";
import FastMovingScreen from "./screens/FastMovingScreen";
import SalesSummaryScreen from "./screens/SalesSummaryScreen";
import PurchaseSummaryScreen from "./screens/PurchaseSummaryScreen";
import AttendanceScreen from "./screens/AttendanceScreen";
import ReportsScreen from "./screens/ReportsScreen";
import ReportDetailScreen from "./screens/ReportDetailScreen";
import SettingsScreen from "./screens/SettingsScreen";
import MobileLoginScreen from "./screens/MobileLoginScreen";
import { checkSupplierPaymentAlerts } from "./notifications/notificationService";
import { processSyncQueue } from "./offline/syncManager";
import useAppLock from "./security/useAppLock";
import AppLockScreen from "./security/AppLockScreen";
import PrivacyScreen from "./security/PrivacyScreen";
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
  attendance: "Attendance",
  reports: "Reports",
  report_profit_loss: "Profit & Loss",
  report_gst: "GST Report",
  report_receivables: "Receivables Report",
  settings: "Settings",
  customers: "Customers",
  suppliers: "Suppliers",
  expenses: "Expenses",
  approvals: "Pending Approvals",
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
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [showExitToast, setShowExitToast] = useState(false);

  const userName = authUser?.name || authUser?.username || "Admin";

  // Tracks how many in-app screens deep we are (0 = a root screen with
  // nothing to go back to). A plain ref, not state -- read from event
  // handlers that must always see the latest value, not whatever it was
  // when the effect below first ran.
  const depthRef = useRef(0);

  // Check supplier payment alerts and process pending sync queue on startup
  useEffect(() => {
    if (ready && isAuthenticated) {
      checkSupplierPaymentAlerts();
      processSyncQueue();
    }
  }, [ready, isAuthenticated]);

  // Android hardware/gesture back button support.
  //
  // First attempt (shipped separately) pushed a guard history entry on
  // mount and re-pushed one from inside the popstate handler on every back
  // press. That worked for the hardware back button but a real edge-swipe
  // on a physical device blew straight through it and exited the whole
  // app. Root cause: Chrome's "History Manipulation Intervention" marks
  // any history entry added *without active user activation* (a mount
  // effect, or code running inside a popstate handler, both count as no
  // activation) as skippable -- back navigation jumps straight past all
  // such entries instead of stopping on them. Entries pushed synchronously
  // inside a real onClick handler DO carry activation and are never
  // skipped, which is why simulating back presses via history.back() in
  // testing looked fine (that JS API is explicitly exempt) while a real
  // swipe wasn't.
  //
  // Fix: push a real, depth-tagged history entry for every in-app
  // navigation *inside the click handler that causes it* (navigateTo/
  // goBack below), so the entries between "here" and "outside the app"
  // are never skippable and back navigation reliably lands one screen at
  // a time. A best-effort floor entry is also seeded on mount and on the
  // very first tap/touch anywhere (the latter does carry activation) so
  // there's something non-skippable to land on even before the user has
  // navigated anywhere. The double-back-to-exit toast still re-pushes a
  // guard from inside the handler for the *first* press at the root
  // screen -- if a subsequent swipe skips straight past that too, the
  // net effect is just exiting one press sooner, never worse than before.
  useEffect(() => {
    if (!ready || !isAuthenticated) return;

    const pushFloor = () => window.history.pushState({ vxPage: "dashboard", vxDepth: 0 }, "");
    pushFloor();

    const seedOnFirstTouch = () => {
      pushFloor();
      window.removeEventListener("pointerdown", seedOnFirstTouch, true);
    };
    window.addEventListener("pointerdown", seedOnFirstTouch, true);

    let exitArmed = false;
    let exitTimer = null;

    const handlePopState = (event) => {
      const state = event.state;

      // A real, depth-tagged in-app entry - restore exactly what it says.
      if (state && typeof state.vxDepth === "number" && state.vxDepth > 0) {
        depthRef.current = state.vxDepth;
        setPage(state.vxPage);
        return;
      }

      // Landed at (or below) the floor - nothing left to go back to in-app.
      depthRef.current = 0;
      if (state?.vxPage) setPage(state.vxPage);

      if (!exitArmed) {
        exitArmed = true;
        setShowExitToast(true);
        pushFloor();
        exitTimer = setTimeout(() => {
          exitArmed = false;
          setShowExitToast(false);
        }, 2000);
        return;
      }

      // Second press while armed: let this back navigation actually go
      // through instead of re-arming - the browser/PWA shell then exits.
      clearTimeout(exitTimer);
      setShowExitToast(false);
    };

    window.addEventListener("popstate", handlePopState);
    return () => {
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("pointerdown", seedOnFirstTouch, true);
      clearTimeout(exitTimer);
    };
  }, [ready, isAuthenticated]);

  const navigateTo = useCallback((target) => {
    const nextDepth = depthRef.current + 1;
    depthRef.current = nextDepth;
    window.history.pushState({ vxPage: target, vxDepth: nextDepth }, "");
    setPage(target);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const goBack = useCallback(() => {
    if (depthRef.current > 0) window.history.back();
  }, []);

  const handleLogout = useCallback(() => {
    depthRef.current = 0;
    window.history.pushState({ vxPage: "dashboard", vxDepth: 0 }, "");
    dispatch(logoutUser());
    setPage("dashboard");
  }, [dispatch]);

  const triggerInstall = useCallback(() => {
    window.dispatchEvent(new CustomEvent("pwa-show-install-prompt"));
  }, []);

  const appLock = useAppLock();

  // Forgot-PIN recovery falls back to real server re-auth: there's no way
  // to verify a PIN the user has forgotten, so this clears the local lock
  // unconditionally and forces a fresh login instead.
  const handleForgotPin = useCallback(() => {
    appLock.resetPinUnconditionally();
    handleLogout();
  }, [appLock, handleLogout]);

  // Show splash until initialization is complete
  // Wrapped in .vx-workspace (matching the login/main branches below) so the
  // global desktop CSS guard `body:not(:has(.vx-workspace)) h1 {...}` doesn't
  // match and shrink the splash wordmark before the real app shell mounts.
  if (!ready) {
    return (
      <div className="vx-workspace">
        <Splash progress={progress} />
        <PrivacyScreen visible={appLock.isHidden} />
      </div>
    );
  }

  // If not authenticated after splash, show dedicated mobile login
  if (!isAuthenticated) {
    return (
      <div className="vx-workspace min-h-screen bg-slate-50">
        <MobileLoginScreen onLoginSuccess={() => setPage("dashboard")} />
        <PrivacyScreen visible={appLock.isHidden} />
      </div>
    );
  }

  // Device PIN lock (if the user has set one up) gates the rest of the app
  // shell on every fresh page load, and again after being backgrounded past
  // the configured auto-lock duration. Skipped entirely if no PIN is set.
  if (appLock.isPinSet && appLock.isLocked) {
    return (
      <div className="vx-workspace">
        <AppLockScreen appLock={appLock} onForgotPin={handleForgotPin} />
        <PrivacyScreen visible={appLock.isHidden} />
      </div>
    );
  }

  // navigateTo always increments depthRef before setting a non-root page, so
  // being on a non-root screen implies there's always something to go back
  // to -- no separate depth check needed here.
  const canGoBack = !ROOT_SCREENS.has(page);

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

        {page === "suppliers" && <SuppliersScreen onNavigate={navigateTo} />}

        {page === "supplier_dues" && <SupplierDuesScreen />}

        {page === "fast_moving" && <FastMovingScreen />}

        {page === "sales_summary" && <SalesSummaryScreen />}

        {page === "purchase_summary" && <PurchaseSummaryScreen />}

        {page === "attendance" && <AttendanceScreen />}

        {page === "reports" && <ReportsScreen onNavigate={navigateTo} />}

        {(page === "report_profit_loss" || page === "report_gst" || page === "report_receivables") && (
          <ReportDetailScreen reportType={page.replace("report_", "")} />
        )}

        {page === "settings" && (
          <SettingsScreen onLogout={handleLogout} onTriggerPwa={triggerInstall} appLock={appLock} />
        )}

        {page === "approvals" && <ApprovalsScreen />}
      </main>

      {/* "Press back again to exit" -- shown for 2s after a back press at
          the root screen with nothing left to go back to in-app. */}
      {showExitToast && (
        <div className="fixed bottom-[80px] left-1/2 -translate-x-1/2 z-[60] px-4 py-2.5 rounded-full bg-slate-900/90 text-white text-xs font-semibold shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-bottom-3 duration-200 whitespace-nowrap">
          Press back again to exit
        </div>
      )}

      {/* Bottom Navigation */}
      <BottomNav activePage={page} onNavigate={navigateTo} />

      <PrivacyScreen visible={appLock.isHidden} />
    </div>
  );
}

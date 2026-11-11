import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import Login from "@/features/auth/Login";
import ProtectedRoute from "@/features/auth/components/ProtectedRoute";
import AuthInitializer from "@/features/auth/components/AuthInitializer";
import ActivationGate from "@/features/activation/components/ActivationGate";
import ActivationWizard from "@/features/activation/ActivationWizard";
import ChunkErrorBoundary from "@/shared/components/ChunkErrorBoundary";
import PageSkeleton from "@/shared/components/PageSkeleton";
import PwaInstallPrompt from "@/shared/layout/PwaInstallPrompt";
import StoreSelectionDialog from "@/shared/layout/StoreSelectionDialog";
import PlatformNotificationBanner from "@/features/notifications/components/PlatformNotificationBanner";
import { isStaffAppPath } from "@/shared/api/staffSession";

// A desktop login must not download the mobile workspace (and vice versa).
const MainLayout = lazy(() => import("@/shared/layout/MainLayout"));
const VynerixMobileApp = lazy(() => import("@/mobile/MobileAppV2"));
const SetPassword = lazy(() => import("@/features/auth/SetPassword"));
const ForceChangePassword = lazy(() => import("@/features/auth/ForceChangePassword"));
const StaffApp = lazy(() => import("@/staff/StaffApp"));

function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const authUser = useSelector((state) => state.auth.user);
  const { pathname } = useLocation();
  const isMobileRoute = pathname.toLowerCase().startsWith("/app");

  // Normalize capital /App path to lowercase /app for case-insensitive mobile routing
  if (window.location.pathname.toLowerCase() === "/app" || window.location.pathname.toLowerCase().startsWith("/app/")) {
    if (!window.location.pathname.startsWith("/app")) {
      window.location.replace("/app" + window.location.pathname.substring(4));
      return null;
    }
  }

  // The staff app (/hr) is a separate employee app with its own sign-in: none of the ERP session,
  // activation, store picker or install prompt applies there.
  if (isStaffAppPath(pathname)) {
    return (
      <ChunkErrorBoundary>
        <Suspense fallback={<PageSkeleton rows={6} />}>
          <StaffApp />
        </Suspense>
      </ChunkErrorBoundary>
    );
  }

  const homePath = "/dashboard";

  return (
    <AuthInitializer>
      <ChunkErrorBoundary>
        <Suspense fallback={<PageSkeleton rows={6} />}>
          <ActivationGate>
            {isAuthenticated && authUser?.must_change_password ? (
              <ForceChangePassword />
            ) : (
              <>
                <Routes>
                  <Route
                    path="/activate"
                    element={<ActivationWizard onActivated={() => { localStorage.setItem("vx_activated", "1"); window.location.href = "/login"; }} />}
                  />
                  <Route path="/login" element={isAuthenticated && authUser?.auth_client !== "mobile" ? <Navigate to={homePath} replace /> : <Login />} />
                  <Route path="/set-password" element={<SetPassword />} />
                  <Route path="/app/*" element={<VynerixMobileApp />} />
                  {isAuthenticated && authUser?.web_access === false && <Route path="/notifications" element={<Navigate to="/app?notifications=1" replace />} />}
                  <Route element={<ProtectedRoute />}>
                    <Route path="*" element={<MainLayout />} />
                  </Route>
                  <Route path="/" element={isAuthenticated ? <Navigate to={homePath} replace /> : <Navigate to="/login" replace />} />
                </Routes>
                {isAuthenticated && !isMobileRoute && <PlatformNotificationBanner />}
                {isAuthenticated && <PwaInstallPrompt />}
                {isAuthenticated && <StoreSelectionDialog />}
              </>
            )}
          </ActivationGate>
        </Suspense>
      </ChunkErrorBoundary>
    </AuthInitializer>
  );
}

export default App;

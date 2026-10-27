import React, { lazy, Suspense } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthInitializer from "./components/AuthInitializer";
import ActivationGate from "./components/ActivationGate";
import ActivationWizard from "./pages/ActivationWizard";
import ChunkErrorBoundary from "./components/ChunkErrorBoundary";
import PageSkeleton from "./components/PageSkeleton";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import StoreSelectionDialog from "./components/StoreSelectionDialog";
import PlatformNotificationBanner from "./components/PlatformNotificationBanner";

// A desktop login must not download the mobile workspace (and vice versa).
const MainLayout = lazy(() => import("./components/MainLayout"));
const VynerixMobileApp = lazy(() => import("./mobile/MobileAppV2"));
const SetPassword = lazy(() => import("./pages/SetPassword"));
const ForceChangePassword = lazy(() => import("./pages/ForceChangePassword"));

function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const authUser = useSelector((state) => state.auth.user);
  const isMobileRoute = useLocation().pathname.toLowerCase().startsWith("/app");

  // Normalize capital /App path to lowercase /app for case-insensitive mobile routing
  if (window.location.pathname.toLowerCase() === "/app" || window.location.pathname.toLowerCase().startsWith("/app/")) {
    if (!window.location.pathname.startsWith("/app")) {
      window.location.replace("/app" + window.location.pathname.substring(4));
      return null;
    }
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
                  <Route path="/login" element={isAuthenticated ? <Navigate to={homePath} replace /> : <Login />} />
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

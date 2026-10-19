import React from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import Login from "./pages/Login";
import ProtectedRoute from "./components/ProtectedRoute";
import AuthInitializer from "./components/AuthInitializer";
import MainLayout from "./components/MainLayout";
import Register from "./pages/Register";
import ActivationGate from "./components/ActivationGate";
import ActivationWizard from "./pages/ActivationWizard";
import SetPassword from "./pages/SetPassword";
import ForceChangePassword from "./pages/ForceChangePassword";
import VynerixMobileApp from "./mobile/MobileAppV2";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import StoreSelectionDialog from "./components/StoreSelectionDialog";
import NotificationInboxPanel from "./components/NotificationInboxPanel";
import StoreActivation from "./pages/StoreActivation";
import PlatformNotificationBanner from "./components/PlatformNotificationBanner";

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
              <Route path="/notifications" element={isAuthenticated ? <NotificationInboxPanel standalone /> : <Navigate to="/login" replace />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/store-activation" element={<StoreActivation />} />
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
    </AuthInitializer>
  );
}

export default App;

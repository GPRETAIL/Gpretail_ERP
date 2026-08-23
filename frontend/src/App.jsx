import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";
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

function App() {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const authUser = useSelector((state) => state.auth.user);
  const homePath = "/dashboard";

  return (
    <ActivationGate>
      <AuthInitializer>
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
              <Route path="/register" element={isAuthenticated ? <Navigate to={homePath} replace /> : <Register />} />
              <Route element={<ProtectedRoute />}>
                <Route path="/app/*" element={<VynerixMobileApp />} />
                <Route path="*" element={<MainLayout />} />
              </Route>
              <Route path="/" element={isAuthenticated ? <Navigate to={homePath} replace /> : <Navigate to="/login" replace />} />
            </Routes>
            <PwaInstallPrompt />
          </>
        )}
      </AuthInitializer>
    </ActivationGate>
  );
}

export default App;

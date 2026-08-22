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
import MobileApp from "./mobile/MobileApp";

// The owner/admin portal is not part of the tenant app. It is the control plane, and it lives in the
// standalone vx-admin deployment (admin.gpretail.uk) — including its own copy of the company
// activation page, which is where the activation emails point (APP_PUBLIC_BASE_URL).

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
          <Routes>
            <Route
              path="/activate"
              element={<ActivationWizard onActivated={() => { localStorage.setItem("vx_activated", "1"); window.location.href = "/login"; }} />}
            />
            <Route path="/login" element={isAuthenticated ? <Navigate to={homePath} replace /> : <Login />} />
            <Route path="/set-password" element={<SetPassword />} />
            <Route path="/register" element={isAuthenticated ? <Navigate to={homePath} replace /> : <Register />} />

            {/* Standalone responsive PWA shell. It uses the same auth/session as the ERP,
                but keeps its mobile/tablet/desktop UI code separate from the existing desktop shell. */}
            <Route element={<ProtectedRoute />}>
              <Route path="/app/*" element={<MobileApp />} />
              <Route path="*" element={<MainLayout />} />
            </Route>

            <Route path="/" element={isAuthenticated ? <Navigate to={homePath} replace /> : <Navigate to="/login" replace />} />
          </Routes>
        )}
      </AuthInitializer>
    </ActivationGate>
  );
}

export default App;

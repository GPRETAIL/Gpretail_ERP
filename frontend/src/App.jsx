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
        {/* Explicit activation URL (the gate also shows this automatically until activated). */}
        <Route
          path="/activate"
          element={<ActivationWizard onActivated={() => { localStorage.setItem("vx_activated", "1"); window.location.href = "/login"; }} />}
        />
        <Route
          path="/login"
          element={isAuthenticated ? <Navigate to={homePath} replace /> : <Login />}
        />
        {/* Public self-service: a super-admin created without a password sets one here. */}
        <Route path="/set-password" element={<SetPassword />} />
        <Route
          path="/register"
          element={isAuthenticated ? <Navigate to={homePath} replace /> : <Register />}
        />
        {/* One splat mounts the guarded layout for EVERY in-app path.
            MainLayout renders its own inner <Routes> (ProtectedLayoutRouteRenderer), and React
            Router keeps a parent matched as the URL goes deeper only when that parent's path ends
            in "*" — otherwise it warns on every page load ("You rendered descendant <Routes> ...
            but the parent route path has no trailing '*'"). Per-path anchors used to sit here too,
            but they were never rendered (MainLayout has no <Outlet/>) and the access guard keys off
            location.pathname via isRegisteredProtectedPath, not off which anchor won — so the splat
            alone is enough, and it is what silences the warning. The public routes above still
            outrank "*" (a static/params match always beats a splat), and an unbuilt or mistyped
            path keeps landing inside the layout so its ComingSoon catch-all can render. */}
        <Route element={<ProtectedRoute />}>
          <Route path="*" element={<MainLayout />} />
        </Route>
        <Route
          path="/"
          element={
            isAuthenticated ? (
              <Navigate to={homePath} replace />
            ) : (
              <Navigate to="/login" replace />
            )
          }
        />
      </Routes>
      )}
    </AuthInitializer>
    </ActivationGate>
  );
}

export default App;

// src/components/ProtectedRoute.jsx
import React from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { canAccessPath, getHomePathForUser } from "../utils/accessControl";
import { isRegisteredProtectedPath } from "../routes/protectedLayoutRoutes";

const ProtectedRoute = () => {
  const isAuthenticated = useSelector((state) => state.auth.isAuthenticated);
  const user = useSelector((state) => state.auth.user);
  const location = useLocation();

  if (!isAuthenticated) return <Navigate to="/login" replace />;

  // Bounce only when the user is denied a path that IS a real, registered route. An unbuilt or
  // mistyped path matches no route, so it is not a page the user is "barred" from — it simply does
  // not exist. Let it fall through to <Outlet/> so the ComingSoon catch-all inside the layout can
  // render, instead of redirecting home (which read as the page being broken).
  //
  // Security: the access decision stays entirely in canAccessPath. This only relaxes the bounce for
  // paths with no registered route (which resolve to ComingSoon — no real page or data). A denied
  // registered page still bounces, so no user can reach a real page they are not entitled to.
  if (!canAccessPath(location.pathname, user) && isRegisteredProtectedPath(location.pathname)) {
    return <Navigate to={getHomePathForUser(user)} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;

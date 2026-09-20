// src/components/AuthInitializer.jsx
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import { Box } from "@mui/material";
import checkAuth from "../utils/checkAuth";
import { logout } from "../features/authSlice";

const AuthInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const isMobileApp = typeof window !== "undefined" && window.location.pathname.startsWith("/app");
  const [loading, setLoading] = useState(!isMobileApp);

  useEffect(() => {
    const init = async () => {
      await checkAuth(dispatch);
      setLoading(false);
    };
    init();
  }, [dispatch]);

  // checkAuth above only catches a token that's already bad at page load.
  // This catches one going bad mid-session (exactly what enabling real
  // auth:sanctum enforcement does to any tab that was open before it landed)
  // - the axios response interceptor already cleared storage and fired this
  // event, so flipping isAuthenticated here is what sends the user back to
  // the login screen instead of leaving them on a dead session.
  useEffect(() => {
    const handleAuthExpired = () => dispatch(logout());
    window.addEventListener("vx-auth-expired", handleAuthExpired);
    return () => window.removeEventListener("vx-auth-expired", handleAuthExpired);
  }, [dispatch]);

  // Mobile App (/app/*) bypasses desktop loading screen entirely
  // It handles its own branded Splash -> Mobile Login -> Dashboard flow
  if (isMobileApp) {
    return children;
  }

  if (loading) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", bgcolor: "#0f172a" }}>
        <Box
          className="animate-spin"
          sx={{ width: 32, height: 32, border: "2px solid #818cf8", borderTopColor: "transparent", borderRadius: "50%" }}
        />
      </Box>
    );
  }

  return children;
};

export default AuthInitializer;

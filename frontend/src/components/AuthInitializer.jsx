// src/components/AuthInitializer.jsx
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import checkAuth from "../utils/checkAuth";

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

  // Mobile App (/app/*) bypasses desktop loading screen entirely
  // It handles its own branded Splash -> Mobile Login -> Dashboard flow
  if (isMobileApp) {
    return children;
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-900 text-indigo-400">
        <div className="w-8 h-8 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return children;
};

export default AuthInitializer;

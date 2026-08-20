// src/components/AuthInitializer.jsx
import React, { useEffect, useState } from "react";
import { useDispatch } from "react-redux";
import checkAuth from "../utils/checkAuth";

const AuthInitializer = ({ children }) => {
  const dispatch = useDispatch();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const init = async () => {
      await checkAuth(dispatch);
      setLoading(false);
    };
    init();
  }, [dispatch]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-blue-500 text-xl">
        Checking authentication...
      </div>
    );
  }

  return children;
};

export default AuthInitializer;

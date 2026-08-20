import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { loginUser } from "../features/authSlice";
import { FaGoogle, FaEye, FaEyeSlash } from "react-icons/fa";
import { getHomePathForUser } from "../utils/accessControl";
import { useTheme } from "../features/theme-context";
const Login = () => {
  const { theme } = useTheme() || {};
  const isDark = theme === "dark";
  const [showPassword, setShowPassword] = useState(false);
  const [hoverGoogle, setHoverGoogle] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // ✅ Use Redux auth state
  const { isAuthenticated, loading, error } = useSelector(
    (state) => state.auth
  );
  const authUser = useSelector((state) => state.auth.user);

  const togglePassword = () => setShowPassword((prev) => !prev);

  const handleLocalLogin = async (e) => {
    e.preventDefault();

    const result = await dispatch(loginUser({ email: username, password }));

    if (loginUser.fulfilled.match(result)) {
      navigate(getHomePathForUser(result.payload?.user), { replace: true });
    }
  };

  const handleGoogleLogin = () => {
    alert("Google login requires backend - not available in frontend-only mode.");
  };

  if (isAuthenticated) {
    return <Navigate to={getHomePathForUser(authUser)} replace />;
  }

  return (
    <div className="login-page min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-200 to-blue-400 dark:from-gray-900 dark:to-gray-800 px-4 py-6 sm:p-5">
      <div className="w-full max-w-md rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800 p-5 shadow-2xl transition-all duration-300 sm:rounded-2xl sm:p-10">
        <h2 className="mb-6 text-center text-2xl font-extrabold text-gray-800 dark:text-gray-100 sm:mb-8 sm:text-3xl">
          GPRetail Login
        </h2>
        <form className="flex flex-col space-y-4 sm:space-y-5" onSubmit={handleLocalLogin}>
          {/* Username */}
          <div className="relative">
            <input
              type="text"
              autoComplete="username"
              autoCapitalize="none"
              autoCorrect="off"
              placeholder=" "
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="peer w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 pb-2 pt-5 text-base text-gray-900 dark:text-gray-100 caret-gray-900 dark:caret-gray-100
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
              placeholder-transparent transition-all duration-200 sm:text-sm"
            />
            <label
              className="absolute left-3 top-1 text-gray-500 dark:text-gray-400 text-xs
              pointer-events-none transition-all duration-200
              peer-placeholder-shown:top-1/2 peer-focus:top-1
              peer-placeholder-shown:text-sm
              peer-placeholder-shown:-translate-y-1/2 peer-focus:text-xs
              peer-focus:-translate-y-0 peer-focus:text-blue-600 dark:peer-focus:text-blue-400 bg-white dark:bg-gray-700 px-1"
            >
              Username
            </label>
          </div>

          {/* Password */}
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder=" "
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="peer w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-3 pb-2 pt-5 text-base text-gray-900 dark:text-gray-100 caret-gray-900 dark:caret-gray-100
              focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none
              placeholder-transparent transition-all duration-200 sm:text-sm"
            />
            <label
              className="absolute left-3 top-1 text-gray-500 dark:text-gray-400 text-xs
              pointer-events-none transition-all duration-200
              peer-placeholder-shown:top-1/2 peer-focus:top-1
              peer-placeholder-shown:text-sm
              peer-placeholder-shown:-translate-y-1/2 peer-focus:text-xs
              peer-focus:-translate-y-0 peer-focus:text-blue-600 dark:peer-focus:text-blue-400 bg-white dark:bg-gray-700 px-1"
            >
              Password
            </label>
            <span
              onClick={togglePassword}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer
              text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition"
            >
              {showPassword ? (
                <FaEyeSlash className="w-5 h-5" />
              ) : (
                <FaEye className="w-5 h-5" />
              )}
            </span>
          </div>

          {/* Error message */}
          {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}

          {/* Login Button */}
          <button
            type="submit"
            disabled={loading}
            className="glass-btn glass-btn-primary mt-3 w-full rounded-lg py-3 text-base font-semibold shadow-md hover:shadow-lg focus:outline-none focus:ring-4 focus:ring-blue-300 disabled:opacity-70 sm:text-lg"
          >
            {loading ? "Logging in..." : "Login"}
          </button>

          {/* Divider */}
          <div className="flex items-center my-4 space-x-3">
            <span className="grow h-px bg-gray-300 dark:bg-gray-600"></span>
            <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">or</span>
            <span className="grow h-px bg-gray-300 dark:bg-gray-600"></span>
          </div>

          {/* Google Login */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            onMouseEnter={() => setHoverGoogle(true)}
            onMouseLeave={() => setHoverGoogle(false)}
            className="w-full py-3 flex items-center justify-center border
            rounded-lg font-medium text-sm transition-all duration-300 ease-in-out
            focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            style={{
              backgroundColor: hoverGoogle ? "#4285F4" : isDark ? "#374151" : "#fff",
              color: hoverGoogle ? "#fff" : isDark ? "#f3f4f6" : "#000",
              transform: hoverGoogle ? "scale(1.01)" : "scale(1)",
              boxShadow: hoverGoogle
                ? "0 4px 10px rgba(66, 133, 244, 0.4)"
                : "0 1px 3px rgba(0,0,0,0.1)",
              borderColor: hoverGoogle ? "#4285F4" : isDark ? "#4b5563" : "#ccc",
            }}
          >
            <FaGoogle
              className="mr-2 w-4 h-4"
              style={{ color: hoverGoogle ? "#fff" : "#DB4437" }}
            />
            Login with Google
          </button>
        </form>
        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            <a
              href="/set-password"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition"
            >
              Set up / forgot your password?
            </a>
          </p>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Don't have an account?{" "}
            <a
              href="/register"
              className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition"
            >
              Create one
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

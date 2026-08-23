import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Lock, User, LogIn, AlertCircle } from "lucide-react";
import { loginUser } from "../../features/authSlice";

/**
 * Branded Mobile Login Screen for Vynerix ERP.
 * Renders inside the mobile shell when session is not active.
 */
export default function MobileLoginScreen({ onLoginSuccess }) {
  const dispatch = useDispatch();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter both username and password");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const resultAction = await dispatch(
        loginUser({ username: username.trim(), password })
      );

      if (loginUser.fulfilled.match(resultAction)) {
        if (typeof onLoginSuccess === "function") {
          onLoginSuccess();
        }
      } else {
        setError(
          resultAction.payload ||
            resultAction.error?.message ||
            "Invalid username or password"
        );
      }
    } catch (err) {
      setError(err.message || "Login failed. Please check network connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center px-4 py-8">
      {/* Brand Header */}
      <div className="text-center mb-8">
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 to-purple-600 shadow-xl shadow-indigo-500/30 mb-3">
          <svg viewBox="0 0 100 100" className="w-10 h-10 fill-white" aria-hidden>
            <path d="M20 20 L40 20 L50 65 L60 20 L80 20 L58 85 L42 85 Z" />
          </svg>
        </div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 m-0">
          Vynerix <span className="text-indigo-600">ERP</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1 font-medium">
          Smart. Secure. Simplified.
        </p>
      </div>

      {/* Login Card */}
      <div className="vx-card shadow-xl border-slate-200/80">
        <h2 className="text-base font-bold text-slate-900 mb-1">
          Mobile Sign In
        </h2>
        <p className="text-xs text-slate-500 mb-5">
          Enter your credentials to access your ERP workspace.
        </p>

        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
            <AlertCircle size={16} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Username
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <User size={16} />
              </div>
              <input
                type="text"
                autoCapitalize="none"
                autoCorrect="off"
                placeholder="Enter username (e.g. admin)"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 block mb-1.5">
              Password
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock size={16} />
              </div>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-9 pr-3 text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-500 focus:bg-white transition-all"
                required
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 hover:from-indigo-700 hover:to-purple-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Signing In...</span>
            ) : (
              <>
                <LogIn size={16} />
                <span>Sign In to Mobile ERP</span>
              </>
            )}
          </button>
        </form>
      </div>

      <div className="text-center mt-6">
        <a
          href="/login"
          className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
        >
          Desktop Web Login →
        </a>
      </div>
    </div>
  );
}

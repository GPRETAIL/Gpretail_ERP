import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Lock, User, LogIn, AlertCircle, Sparkles, ShieldCheck } from "lucide-react";
import { loginUser } from "../../features/authSlice";

/**
 * Premium Native Mobile Login Screen for Vynerix ERP.
 * Built with full mobile viewport layout, royal blue brand header,
 * touch-optimized inputs, and 1-tap sign-in.
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
      setError(err.message || "Login failed. Please check your network connection.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (user, pass) => {
    setUsername(user);
    setPassword(pass);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      {/* Top Royal Blue Header */}
      <div className="bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-800 pt-12 pb-16 px-6 rounded-b-[36px] text-white text-center shadow-xl shadow-indigo-950/20 relative overflow-hidden">
        {/* Decorative background glow circles */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-purple-500/20 blur-2xl" />

        {/* Centered Layered Logo Box */}
        <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-md border border-white/40 shadow-xl mb-3">
          <svg viewBox="0 0 100 100" className="w-10 h-10 fill-white drop-shadow" aria-hidden>
            <path d="M18 20 L38 20 L50 64 L62 20 L82 20 L59 86 L41 86 Z" />
          </svg>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-white m-0">
          Vynerix <span className="text-indigo-200">ERP</span>
        </h1>
        <p className="text-xs text-indigo-100/80 mt-1 font-medium tracking-wide">
          Smart. Secure. Simplified.
        </p>
      </div>

      {/* Floating Login Card */}
      <div className="-mt-10 px-5 flex-1 flex flex-col justify-start max-w-[440px] mx-auto w-full">
        <div className="bg-white rounded-3xl p-6 shadow-xl shadow-slate-900/5 border border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 m-0">Sign In</h2>
              <p className="text-xs text-slate-500 mt-0.5 font-medium">
                Enter your credentials to continue
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-bold text-rose-700">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User size={17} />
                </div>
                <input
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 pl-10 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={17} />
                </div>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50/80 border border-slate-200 rounded-xl py-3 pl-10 pr-3 text-xs font-semibold text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:bg-white transition-all shadow-sm"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3.5 rounded-xl bg-gradient-to-r from-indigo-600 via-indigo-600 to-purple-600 text-xs font-bold text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/45 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

          {/* Quick Demo Fill Buttons for instant testing */}
          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-center gap-2">
            <span className="text-[11px] text-slate-400 font-medium">Quick Fill:</span>
            <button
              type="button"
              onClick={() => handleQuickDemo("admin", "password")}
              className="px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-600 text-[11px] font-bold hover:bg-indigo-100 transition-colors"
            >
              admin / password
            </button>
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="py-6 text-center text-xs">
        <a
          href="/dashboard"
          className="font-bold text-indigo-600 hover:text-indigo-700"
        >
          Switch to Desktop Web View →
        </a>
      </div>
    </div>
  );
}

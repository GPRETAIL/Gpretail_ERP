import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Lock, User, LogIn, AlertCircle, ShieldCheck } from "lucide-react";
import { Box, Typography } from "@mui/material";
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
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      {/* Top Royal Blue Header */}
      <Box sx={{
        backgroundImage: "linear-gradient(to bottom right, #4f46e5, #4338ca, #6b21a8)",
        pt: 6, pb: 8, px: 3, borderBottomLeftRadius: "36px", borderBottomRightRadius: "36px",
        color: "#fff", textAlign: "center", boxShadow: "0 20px 25px -5px rgba(30,20,60,0.2)", position: "relative", overflow: "hidden",
      }}>
        {/* Decorative background glow circles */}
        <Box sx={{ pointerEvents: "none", position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", bgcolor: "rgba(255,255,255,0.1)", filter: "blur(40px)" }} />
        <Box sx={{ pointerEvents: "none", position: "absolute", bottom: -40, left: -40, width: 160, height: 160, borderRadius: "50%", bgcolor: "rgba(168,85,247,0.2)", filter: "blur(40px)" }} />

        {/* Centered Layered Logo Box */}
        <Box sx={{
          display: "inline-flex", height: 64, width: 64, alignItems: "center", justifyContent: "center", borderRadius: "16px",
          bgcolor: "rgba(255,255,255,0.2)", backdropFilter: "blur(12px)", border: "1px solid rgba(255,255,255,0.4)",
          boxShadow: 8, mb: 1.5,
        }}>
          <Box component="svg" viewBox="0 0 100 100" sx={{ width: 40, height: 40, fill: "#fff", filter: "drop-shadow(0 4px 3px rgba(0,0,0,0.15))" }} aria-hidden>
            <path d="M18 20 L38 20 L50 64 L62 20 L82 20 L59 86 L41 86 Z" />
          </Box>
        </Box>

        <Typography component="h1" sx={{ fontSize: 24, fontWeight: 900, letterSpacing: "-0.02em", color: "#fff", m: 0 }}>
          Vynerix <Box component="span" sx={{ color: "#c7d2fe" }}>ERP</Box>
        </Typography>
        <Typography component="p" sx={{ fontSize: 12, color: "rgba(224,231,255,0.8)", mt: 0.5, fontWeight: 500, letterSpacing: "0.02em" }}>
          Smart. Secure. Simplified.
        </Typography>
      </Box>

      {/* Floating Login Card */}
      <Box sx={{ position: "relative", mt: -5, px: 2.5, flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", maxWidth: 440, mx: "auto", width: "100%" }}>
        <Box sx={{ bgcolor: "#fff", borderRadius: "24px", p: 3, boxShadow: "0 20px 25px -5px rgba(15,23,41,0.05)", border: "1px solid #f1f5f9" }}>
          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
            <Box>
              <Typography component="h2" sx={{ fontSize: 18, fontWeight: 900, color: "#0f172a", m: 0 }}>Sign In</Typography>
              <Typography component="p" sx={{ fontSize: 12, color: "#64748b", mt: 0.25, fontWeight: 500 }}>
                Enter your credentials to continue
              </Typography>
            </Box>
            <Box sx={{ height: 32, width: 32, borderRadius: "50%", bgcolor: "#eef2ff", color: "#4f46e5", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <ShieldCheck size={18} />
            </Box>
          </Box>

          {error && (
            <Box sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1, borderRadius: "12px", bgcolor: "#fff1f2", border: "1px solid #fecdd3", p: 1.5, fontSize: 12, fontWeight: 700, color: "#be123c" }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <Box component="span">{error}</Box>
            </Box>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Box>
              <Typography component="label" sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", display: "block", mb: 0.5 }}>
                Username
              </Typography>
              <Box sx={{ position: "relative" }}>
                <Box sx={{ position: "absolute", inset: "0 auto 0 0", pl: 1.75, display: "flex", alignItems: "center", pointerEvents: "none", color: "#94a3b8", height: "100%" }}>
                  <User size={17} />
                </Box>
                <Box
                  component="input"
                  type="text"
                  autoCapitalize="none"
                  autoCorrect="off"
                  placeholder="admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  required
                  sx={{
                    width: "100%", bgcolor: "rgba(248,250,252,0.8)", border: "1px solid #e2e8f0", borderRadius: "12px",
                    py: 1.5, pl: 5, pr: 1.5, fontSize: 12, fontWeight: 600, color: "#0f172a", outline: "none",
                    boxShadow: 1, transition: "all 0.15s",
                    "&::placeholder": { color: "#94a3b8" },
                    "&:focus": { borderColor: "#4f46e5", bgcolor: "#fff" },
                  }}
                />
              </Box>
            </Box>

            <Box>
              <Typography component="label" sx={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "#64748b", display: "block", mb: 0.5 }}>
                Password
              </Typography>
              <Box sx={{ position: "relative" }}>
                <Box sx={{ position: "absolute", inset: "0 auto 0 0", pl: 1.75, display: "flex", alignItems: "center", pointerEvents: "none", color: "#94a3b8", height: "100%" }}>
                  <Lock size={17} />
                </Box>
                <Box
                  component="input"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  sx={{
                    width: "100%", bgcolor: "rgba(248,250,252,0.8)", border: "1px solid #e2e8f0", borderRadius: "12px",
                    py: 1.5, pl: 5, pr: 1.5, fontSize: 12, fontWeight: 600, color: "#0f172a", outline: "none",
                    boxShadow: 1, transition: "all 0.15s",
                    "&::placeholder": { color: "#94a3b8" },
                    "&:focus": { borderColor: "#4f46e5", bgcolor: "#fff" },
                  }}
                />
              </Box>
            </Box>

            <Box
              component="button"
              type="submit"
              disabled={loading}
              sx={{
                width: "100%", mt: 1, py: 1.75, borderRadius: "12px",
                backgroundImage: "linear-gradient(to right, #4f46e5, #4f46e5, #9333ea)",
                fontSize: 12, fontWeight: 700, color: "#fff",
                boxShadow: "0 10px 15px -3px rgba(99,102,241,0.3)", transition: "all 0.15s",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 1,
                "&:hover": { boxShadow: "0 10px 15px -3px rgba(99,102,241,0.45)" },
                "&:active": { transform: "scale(0.98)" },
                "&:disabled": { opacity: 0.5 },
              }}
            >
              {loading ? (
                <Box component="span">Signing In...</Box>
              ) : (
                <>
                  <LogIn size={16} />
                  <Box component="span">Sign In to Mobile ERP</Box>
                </>
              )}
            </Box>
          </Box>

          {/* Quick Demo Fill Buttons for instant testing */}
          <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #f1f5f9", display: "flex", alignItems: "center", justifyContent: "center", gap: 1 }}>
            <Typography component="span" sx={{ fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>Quick Fill:</Typography>
            <Box
              component="button"
              type="button"
              onClick={() => handleQuickDemo("admin", "password")}
              sx={{
                px: 1.25, py: 0.5, borderRadius: "8px", bgcolor: "#eef2ff", color: "#4f46e5", fontSize: 11, fontWeight: 700,
                transition: "background-color 0.15s", "&:hover": { bgcolor: "#e0e7ff" },
              }}
            >
              admin / password
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Bottom Footer */}
      <Box sx={{ py: 3, textAlign: "center", fontSize: 12 }}>
        <Box
          component="a"
          href="/dashboard"
          sx={{ fontWeight: 700, color: "#4f46e5", "&:hover": { color: "#4338ca" } }}
        >
          Switch to Desktop Web View →
        </Box>
      </Box>
    </Box>
  );
}

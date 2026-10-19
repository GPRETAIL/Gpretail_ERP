import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { Lock, User, LogIn, AlertCircle } from "lucide-react";
import { Box, Typography } from "@mui/material";
import { loginUser } from "../../features/authSlice";
import ActivationWizard from "../../pages/ActivationWizard";
import GoogleSignInButton from "../../components/GoogleSignInButton";
import VynerixLoginBrand from "../../components/auth/VynerixLoginBrand";

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
  const [setup, setSetup] = useState(null);

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
        loginUser({ username: username.trim(), password, client: "mobile" })
      );

      if (loginUser.fulfilled.match(resultAction)) {
        if (resultAction.payload.setup) {
          setPassword("");
          setSetup(resultAction.payload.setup);
          return;
        }
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

  const handleGoogleLogin = async (idToken) => {
    setLoading(true);
    setError(null);
    try {
      const result = await dispatch(loginUser({ id_token: idToken, client: "mobile" }));
      if (loginUser.fulfilled.match(result)) {
        onLoginSuccess?.();
      } else {
        setError(result.payload || result.error?.message || "Google sign-in failed");
      }
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (setup) {
    return <ActivationWizard setup={setup} onCancel={() => setSetup(null)} onActivated={() => window.location.reload()} />;
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f8fafc", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
      <Box sx={{ width: "100%", maxWidth: 440, mx: "auto", px: 2.5, py: 4, my: "auto" }}>
        <Box sx={{ bgcolor: "#fff", borderRadius: "16px", p: 3, boxShadow: "0 8px 32px rgba(39,66,95,0.08)", border: "1px solid #e2e8f0" }}>
          <Box sx={{ mb: 3 }}><VynerixLoginBrand onLight /></Box>
          <Typography component="h2" sx={{ fontSize: 23, fontWeight: 700, color: "#0f172a" }}>Welcome back</Typography>
          <Typography sx={{ fontSize: 14, color: "#64748b", mt: 1, mb: 3 }}>Use your company account to continue.</Typography>

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
                backgroundImage: "linear-gradient(to right, #3a6ea5, #3a6ea5)",
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
                  <Box component="span">Sign in</Box>
                </>
              )}
            </Box>
          </Box>

          <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid #f1f5f9" }}>
            <GoogleSignInButton onCredential={handleGoogleLogin} disabled={loading} />
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

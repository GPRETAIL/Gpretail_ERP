import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { loginUser } from "../features/authSlice";
import { FaGoogle, FaEye, FaEyeSlash } from "react-icons/fa";
import { Box, Button, Card, Divider, IconButton, InputAdornment, TextField, Typography } from "@mui/material";
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
    <Box className="login-page" sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", px: 2, py: { xs: 3, sm: 5 } }}>
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 448, p: { xs: 3, sm: 5 }, borderRadius: { xs: 2, sm: 4 }, boxShadow: 4, transition: "all 0.3s" }}>
        <Typography variant="h4" component="h2" sx={{ mb: { xs: 3, sm: 4 }, textAlign: "center", fontWeight: 800, color: "text.primary", fontSize: { xs: "1.5rem", sm: "1.875rem" } }}>
          GPRetail Login
        </Typography>
        <Box component="form" sx={{ display: "flex", flexDirection: "column", gap: { xs: 2, sm: 2.5 } }} onSubmit={handleLocalLogin}>
          {/* Username */}
          <TextField
            type="text"
            label="Username"
            autoComplete="username"
            autoCapitalize="none"
            autoCorrect="off"
            required
            fullWidth
            size="small"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />

          {/* Password */}
          <TextField
            type={showPassword ? "text" : "password"}
            label="Password"
            autoComplete="current-password"
            required
            fullWidth
            size="small"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={togglePassword} edge="end" size="small">
                      {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          {/* Error message */}
          {error && <Typography variant="body2" sx={{ color: "error.main", textAlign: "center" }}>{error}</Typography>}

          {/* Login Button */}
          <Button
            type="submit"
            disabled={loading}
            className="glass-btn glass-btn-primary"
            sx={{ mt: 1, width: "100%", py: 1.5, fontSize: { xs: "1rem", sm: "1.125rem" }, fontWeight: 600, textTransform: "none" }}
          >
            {loading ? "Logging in..." : "Login"}
          </Button>

          {/* Divider */}
          <Divider sx={{ my: 1.5 }}>
            <Typography variant="body2" sx={{ color: "text.secondary", fontWeight: 500 }}>
              or
            </Typography>
          </Divider>

          {/* Google Login */}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            onMouseEnter={() => setHoverGoogle(true)}
            onMouseLeave={() => setHoverGoogle(false)}
            fullWidth
            variant="outlined"
            startIcon={<FaGoogle style={{ color: hoverGoogle ? "#fff" : "#DB4437" }} size={16} />}
            sx={{ py: 1.5, textTransform: "none", fontWeight: 500, fontSize: "0.875rem" }}
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
            Login with Google
          </Button>
        </Box>
        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "text.secondary" }}>
            <Box
              component="a"
              href="/set-password"
              sx={{ color: "primary.main", fontWeight: 500, "&:hover": { color: "primary.dark" } }}
            >
              Set up / forgot your password?
            </Box>
          </Typography>
          <Typography variant="body2" sx={{ mt: 1, color: "text.secondary" }}>
            Don't have an account?{" "}
            <Box
              component="a"
              href="/register"
              sx={{ color: "primary.main", fontWeight: 500, "&:hover": { color: "primary.dark" } }}
            >
              Create one
            </Box>
          </Typography>
        </Box>
      </Card>
    </Box>
  );
};

export default Login;

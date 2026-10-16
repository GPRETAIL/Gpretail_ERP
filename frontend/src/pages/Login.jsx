import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { loginUser } from "../features/authSlice";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Box, Button, Card, Divider, IconButton, InputAdornment, TextField, Typography } from "@mui/material";
import { getHomePathForUser } from "../utils/accessControl";
import GoogleSignInButton from "../components/GoogleSignInButton";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
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

  const handleGoogleLogin = async (idToken) => {
    const result = await dispatch(loginUser({ id_token: idToken }));
    if (loginUser.fulfilled.match(result)) {
      navigate(getHomePathForUser(result.payload?.user), { replace: true });
    }
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

          <GoogleSignInButton onCredential={handleGoogleLogin} disabled={loading} />
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

        </Box>
      </Card>
    </Box>
  );
};

export default Login;

import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { loginUser } from "../features/authSlice";
import { FaEye, FaEyeSlash } from "react-icons/fa";
import { Box, Button, Card, Divider, IconButton, InputAdornment, TextField, Typography } from "@mui/material";
import { getHomePathForUser } from "../utils/accessControl";
import GoogleSignInButton from "../components/GoogleSignInButton";
import ActivationWizard from "./ActivationWizard";
import VynerixLoginBrand from "../components/auth/VynerixLoginBrand";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState(null);

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
      if (result.payload.setup) {
        setPassword("");
        setSetup(result.payload.setup);
        return;
      }
      navigate(getHomePathForUser(result.payload?.user), { replace: true });
    }
  };

  const handleGoogleLogin = async (idToken) => {
    const result = await dispatch(loginUser({ id_token: idToken }));
    if (loginUser.fulfilled.match(result)) {
      navigate(getHomePathForUser(result.payload?.user), { replace: true });
    }
  };

  if (setup) {
    return <ActivationWizard setup={setup} onCancel={() => setSetup(null)} onActivated={() => window.location.reload()} />;
  }

  if (isAuthenticated) {
    return <Navigate to={getHomePathForUser(authUser)} replace />;
  }

  return (
    <Box className="login-page" sx={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", bgcolor: "background.default", px: 2, py: { xs: 3, sm: 5 } }}>
      <Card variant="outlined" sx={{ width: "100%", maxWidth: 440, p: { xs: 3, sm: 4 }, borderRadius: 3, boxShadow: "0 8px 32px rgba(39,66,95,0.08)" }}>
        <Box sx={{ mb: 3 }}><VynerixLoginBrand /></Box>
        <Typography variant="h5" component="h2" sx={{ fontWeight: 700 }}>
          Welcome back
        </Typography>
        <Typography sx={{ mt: 1, mb: 3, fontSize: 14, color: "text.secondary" }}>Use your company account to continue.</Typography>
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
            variant="contained"
            disableElevation
            sx={{ mt: 1, width: "100%", minHeight: 42, borderRadius: 2, bgcolor: "#3a6ea5", "&:hover": { bgcolor: "#345f8f" }, fontSize: 14, fontWeight: 600, textTransform: "none" }}
          >
            {loading ? "Signing in..." : "Sign in"}
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

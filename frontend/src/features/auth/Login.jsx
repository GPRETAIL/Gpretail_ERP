import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { loginUser } from "./authSlice";
import { Alert, Box, Button, CircularProgress, Divider, IconButton, InputAdornment, TextField, Tooltip, Typography } from "@mui/material";
import { ArrowRight, Check, Eye, EyeOff, LockKeyhole, Moon, Package, ShieldCheck, ShoppingBag, Sun, UserRound, ChartNoAxesCombined } from "lucide-react";
import { getHomePathForUser } from "./utils/accessControl";
import GoogleSignInButton from "./components/GoogleSignInButton";
import ActivationWizard from "@/features/activation/ActivationWizard";
import VynerixLoginBrand from "@/shared/brand/VynerixLoginBrand";
import VynerixLogo from "@/shared/brand/VynerixLogo";
import { useTheme } from "@/shared/theme/themeContext";
import "./Login.css";

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState(null);
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";

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
    <Box className="vy-login" data-color-mode={dark ? "dark" : "light"}>
      <Box component="header" className="vy-login-header">
        <VynerixLoginBrand titleComponent="span" />
        <Tooltip title={dark ? "Switch to light mode" : "Switch to dark mode"}>
          <Button className="vy-login-appearance" variant="outlined" type="button" onClick={() => setTheme(dark ? "light" : "dark")} startIcon={dark ? <Sun size={16} /> : <Moon size={16} />} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
            {dark ? "Light mode" : "Dark mode"}
          </Button>
        </Tooltip>
      </Box>
      <Box component="main" className="vy-login-main">
        <Box component="section" className="vy-login-story" aria-labelledby="login-story-title">
          <Box className="vy-login-story-top"><span className="vy-login-eyebrow"><span /> YOUR RETAIL WORKSPACE</span><Typography component="h2" id="login-story-title">Every day.<br />More connected.</Typography><Typography component="p">Your counter, your stock, your people.<br />One place to bring it all together.</Typography></Box>
          <Box className="vy-login-illustration" aria-hidden="true">
            <div className="vy-login-orbit orbit-outer" /><div className="vy-login-orbit orbit-inner" />
            <svg className="vy-login-connections" viewBox="0 0 440 300" fill="none"><path d="M220 145 94 74M220 145 351 89M220 145 293 244" stroke="currentColor" strokeWidth="1.5" strokeDasharray="4 6" /><circle cx="220" cy="145" r="75" stroke="currentColor" strokeOpacity="0.4" /></svg>
            <div className="vy-login-hub"><VynerixLogo sx={{ width: 63, height: 52 }} /></div>
            <div className="vy-login-node node-sales"><span className="vy-login-node-icon"><ShoppingBag size={21} /></span><div><b>Sales</b><span>A smoother counter</span></div><Check size={14} className="node-check" /></div>
            <div className="vy-login-node node-stock"><span className="vy-login-node-icon"><Package size={21} /></span><div><b>Inventory</b><span>Everything in its place</span></div></div>
            <div className="vy-login-node node-insights"><span className="vy-login-node-icon"><ChartNoAxesCombined size={21} /></span><div><b>Insights</b><span>A clearer view</span></div><span className="vy-login-mini-chart"><i /><i /><i /><i /></span></div>
            <span className="vy-login-orbit-dot dot-one" /><span className="vy-login-orbit-dot dot-two" />
          </Box>
          <Box className="vy-login-story-footer"><span><span /> Built around your working day.</span><span>VYNERIX ERP</span></Box>
        </Box>
        <Box component="section" className="vy-login-form-panel" aria-labelledby="login-title">
          <Box className="vy-login-form-content">
            <span className="vy-login-form-kicker">WELCOME TO VYNERIX</span>
            <Typography component="h1" id="login-title">A fresh start.<br />A familiar workspace.</Typography>
            <Typography className="vy-login-form-description">Sign in with your company account to continue.</Typography>
            <Box component="form" className="vy-login-form" onSubmit={handleLocalLogin} aria-busy={loading}>
              <TextField id="login-username" type="text" label="Username or email" autoComplete="username" autoCapitalize="none" autoCorrect="off" required fullWidth value={username} onChange={(e) => setUsername(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><UserRound size={18} /></InputAdornment> } }} />
              <TextField id="login-password" type={showPassword ? "text" : "password"} label="Password" autoComplete="current-password" required fullWidth value={password} onChange={(e) => setPassword(e.target.value)} slotProps={{ input: { startAdornment: <InputAdornment position="start"><LockKeyhole size={18} /></InputAdornment>, endAdornment: <InputAdornment position="end"><IconButton type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={togglePassword} onMouseDown={(e) => e.preventDefault()} edge="end" size="small">{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</IconButton></InputAdornment> } }} />
              <Box className="vy-login-password-link"><Box component="a" href="/set-password">Set up / forgot your password?</Box></Box>
              {error && <Alert severity="error" className="vy-login-error">{error}</Alert>}
              <Button className="vy-login-submit" type="submit" disabled={loading} variant="contained" disableElevation endIcon={loading ? <CircularProgress size={17} color="inherit" /> : <ArrowRight size={18} />}>{loading ? "Signing in..." : "Sign in to your workspace"}</Button>
              <Divider className="vy-login-divider"><span>or continue with</span></Divider>
              <Box className="vy-login-google"><GoogleSignInButton onCredential={handleGoogleLogin} disabled={loading} theme={dark ? "filled_black" : "outline"} /></Box>
            </Box>
            <Box className="vy-login-access-note"><ShieldCheck size={17} /><Typography>Your company account connects you to your assigned stores and workspace.</Typography></Box>
          </Box>
        </Box>
      </Box>
      <Box component="footer" className="vy-login-footer"><span>© {new Date().getFullYear()} Vynerix. All rights reserved.</span><span>Retail, thoughtfully connected.</span></Box>
    </Box>
  );
};

export default Login;

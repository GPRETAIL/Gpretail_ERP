import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Navigate, useNavigate } from "react-router-dom";
import { loginUser } from "./authSlice";
import { Alert, Box, Button, CircularProgress, Divider, IconButton, InputAdornment, TextField, Tooltip, Typography } from "@mui/material";
import { ArrowRight, Boxes, CircleAlert, Eye, EyeOff, IdCard, Landmark, LockKeyhole, Moon, ShoppingCart, Sun, UserRound, UsersRound, Wifi, WifiOff } from "lucide-react";
import { getHomePathForUser } from "./utils/accessControl";
import GoogleSignInButton from "./components/GoogleSignInButton";
import ActivationWizard from "@/features/activation/ActivationWizard";
import VynerixLogo from "@/shared/brand/VynerixLogo";
import { useTheme } from "@/shared/theme/themeContext";
import "./Login.css";

// What Vynerix ERP covers, for the panel beside the form (facts, not slogans).
const MODULES = [
  { icon: ShoppingCart, title: "POS & billing", text: "Counter sales, returns, approvals and cash closing" },
  { icon: Boxes, title: "Inventory & warehouse", text: "Purchases, stock, barcodes and transfers" },
  { icon: UsersRound, title: "CRM & loyalty", text: "Customers, orders, credit and points" },
  { icon: Landmark, title: "Finance & accounts", text: "Supplier payments, vouchers and reports" },
  { icon: IdCard, title: "HRMS & payroll", text: "Attendance, leave, payroll and the employee app" },
];

const buildLabel = (() => {
  try {
    // eslint-disable-next-line no-undef
    const built = typeof __APP_BUILD__ === "string" ? new Date(__APP_BUILD__) : null;
    return built && !Number.isNaN(built.getTime()) ? `Build ${built.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}` : "";
  } catch {
    return "";
  }
})();

const useOnline = () => {
  const [online, setOnline] = useState(() => (typeof navigator === "undefined" ? true : navigator.onLine !== false));
  useEffect(() => {
    const update = () => setOnline(navigator.onLine !== false);
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  return online;
};

/** ERP sign-in: company account (username/email and password, or Google), with the product panel beside it. */
const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [capsLock, setCapsLock] = useState(false);
  const [setup, setSetup] = useState(null);
  const { theme, setTheme } = useTheme();
  const dark = theme === "dark";
  const online = useOnline();

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { isAuthenticated, loading, error } = useSelector((state) => state.auth);
  const authUser = useSelector((state) => state.auth.user);

  const checkCapsLock = (event) => setCapsLock(Boolean(event.getModifierState?.("CapsLock")));

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
  // A phone-app (/app) session is not a website session: show the form instead of bouncing (see ProtectedRoute).
  if (isAuthenticated && authUser?.auth_client !== "mobile") {
    return <Navigate to={getHomePathForUser(authUser)} replace />;
  }

  return (
    <Box className="vy-login" data-color-mode={dark ? "dark" : "light"}>
      <Box component="main" className="vy-login-main">
        <Box component="section" className="vy-login-form-panel" aria-labelledby="login-title">
          <Box className="vy-login-topbar">
            <Box className="vy-login-brand">
              <VynerixLogo sx={{ width: 38, height: 31 }} />
              <Box>
                <span className="vy-login-brand-name">Vynerix</span>
                <span className="vy-login-brand-product">ERP</span>
              </Box>
            </Box>
            <Tooltip title={dark ? "Switch to light mode" : "Switch to dark mode"}>
              <IconButton className="vy-login-appearance" type="button" onClick={() => setTheme(dark ? "light" : "dark")} aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}>
                {dark ? <Sun size={18} /> : <Moon size={18} />}
              </IconButton>
            </Tooltip>
          </Box>

          <Box className="vy-login-form-content">
            <Typography component="h1" id="login-title" className="vy-login-title">Sign in</Typography>
            <Typography className="vy-login-subtitle">Use your company account.</Typography>

            <Box component="form" className="vy-login-form" onSubmit={handleLocalLogin} aria-busy={loading} noValidate={false}>
              <TextField id="login-username" type="text" label="Username or email" autoComplete="username" autoCapitalize="none" autoCorrect="off" autoFocus required fullWidth
                value={username} onChange={(e) => setUsername(e.target.value)}
                slotProps={{ input: { startAdornment: <InputAdornment position="start"><UserRound size={18} /></InputAdornment> } }} />
              <TextField id="login-password" type={showPassword ? "text" : "password"} label="Password" autoComplete="current-password" required fullWidth
                value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={checkCapsLock} onKeyUp={checkCapsLock} onBlur={() => setCapsLock(false)}
                slotProps={{ input: {
                  startAdornment: <InputAdornment position="start"><LockKeyhole size={18} /></InputAdornment>,
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton type="button" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword((prev) => !prev)} onMouseDown={(e) => e.preventDefault()} edge="end" size="small">
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </IconButton>
                    </InputAdornment>
                  ),
                } }} />
              <Box className="vy-login-row">
                {capsLock ? <span className="vy-login-caps" role="status"><CircleAlert size={14} /> Caps Lock is on</span> : <span />}
                <Box component="a" href="/set-password" className="vy-login-link">Forgot your password?</Box>
              </Box>

              {error && <Alert severity="error" className="vy-login-error">{error}</Alert>}
              {!online && <Alert severity="warning" className="vy-login-error">You are offline. Connect to the internet to sign in.</Alert>}

              <Button className="vy-login-submit" type="submit" disabled={loading || !online} variant="contained" disableElevation fullWidth
                endIcon={loading ? <CircularProgress size={17} color="inherit" /> : <ArrowRight size={18} />}>
                {loading ? "Signing in..." : "Sign in"}
              </Button>

              <Divider className="vy-login-divider"><span>or</span></Divider>
              <Box className="vy-login-google"><GoogleSignInButton onCredential={handleGoogleLogin} disabled={loading || !online} theme={dark ? "filled_black" : "outline"} /></Box>
            </Box>

            <Box className="vy-login-help">
              <Box component="a" href="/hr" className="vy-login-link">Employee? Sign in to Vynerix HRMS <ArrowRight size={14} /></Box>
              <Typography className="vy-login-muted">Trouble signing in? Ask your company administrator.</Typography>
            </Box>
          </Box>

          <Box className="vy-login-status">
            <span className={online ? "vy-login-online" : "vy-login-offline"}>{online ? <Wifi size={13} /> : <WifiOff size={13} />} {online ? "Cloud online" : "Offline"}</span>
            {buildLabel && <span>{buildLabel}</span>}
            <span>© {new Date().getFullYear()} Vynerix</span>
          </Box>
        </Box>

        <Box component="aside" className="vy-login-product" aria-label="About Vynerix ERP">
          <Box className="vy-login-product-inner">
            <Typography component="p" className="vy-login-product-title">Vynerix ERP</Typography>
            <Typography className="vy-login-product-summary">Retail operations in one place, for every store you run.</Typography>
            <Box component="ul" className="vy-login-modules">
              {MODULES.map(({ icon: Icon, title, text }) => (
                <li key={title}>
                  <span className="vy-login-module-icon"><Icon size={18} /></span>
                  <span><b>{title}</b><span>{text}</span></span>
                </li>
              ))}
            </Box>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default Login;

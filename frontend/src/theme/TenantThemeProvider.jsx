import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { useTheme as useAppTheme } from "../features/theme-context";
import api from "../api/axios";
import { loginSuccess } from "../features/authSlice";
import { createTenantTheme, DEFAULT_THEME_STYLE, THEME_STYLES, getFontOption, ensureGoogleFontLoaded } from "./themeRegistry";

// Wraps the whole app in a dynamic MUI theme fed by the logged-in tenant's brand payload
// (state.auth.user.brand, from /auth/me) -- so any MUI component anywhere, existing or future,
// picks up the tenant's colors with zero per-page wiring. Deliberately does NOT render
// <CssBaseline/>: that would reset global body/typography defaults and bleed onto the still-
// Tailwind shell (Navbar/MainLayout), which this phase intentionally leaves untouched.
//
// The theme_style dimension (classic/apple/glass) needs to reach that same Tailwind shell too,
// which MUI's ThemeProvider can't touch -- so it's mirrored onto <html data-theme-style="..">,
// exactly how ThemeProvider.jsx (dark mode) mirrors onto <html class="dark">. src/theme/
// themeStyles.css then styles the app's shared "rounded-xl/rounded-md border" card convention
// off that attribute, the same way Tailwind's own dark: variant reads the dark class -- any
// component using that convention, existing or future, picks up the style with no per-component
// change.
export default function TenantThemeProvider({ children }) {
  const { theme: mode } = useAppTheme();
  const dispatch = useDispatch();
  const user = useSelector(state => state.auth.user);
  const token = useSelector(state => state.auth.token);
  const brand = user?.brand;
  const refreshState = useRef({ key: "", pending: false, attemptedAt: 0 });
  const refresh = useEffectEvent(async (signal) => {
    if (!user?.id || !token || document.visibilityState === "hidden") return;
    const key = `${user.id}:${user.company_id || ""}:${token}`;
    if (refreshState.current.key !== key) refreshState.current = { key, pending: false, attemptedAt: 0 };
    const attempt = refreshState.current;
    if (attempt.pending || Date.now() - attempt.attemptedAt < 60000) return;
    attempt.pending = true;
    attempt.attemptedAt = Date.now();
    try {
      const response = await api.get("/auth/me", { signal });
      if (!signal.aborted && response.data?.data && JSON.stringify([response.data.data.brand, response.data.data.theme_source, response.data.data.theme_override_allowed]) !== JSON.stringify([brand, user.theme_source, user.theme_override_allowed])) dispatch(loginSuccess({ token, user: response.data.data }));
    } catch { /* Offline and transient failures retain the last saved appearance. */ }
    finally { attempt.pending = false; }
  });
  useEffect(() => {
    const controller = new AbortController();
    const update = () => refresh(controller.signal);
    window.addEventListener("focus", update);
    window.addEventListener("online", update);
    return () => { controller.abort(); window.removeEventListener("focus", update); window.removeEventListener("online", update); };
  }, []);
  const muiTheme = useMemo(() => createTenantTheme(brand, mode), [brand, mode]);

  useEffect(() => {
    const style = THEME_STYLES.includes(brand?.theme_style) ? brand.theme_style : DEFAULT_THEME_STYLE;
    document.documentElement.dataset.themeStyle = style;
  }, [brand?.theme_style]);

  // Same reach as theme_style above -- set once, on the root element, so every Tailwind-styled
  // element without its own font utility inherits it naturally, and MUI picks it up for free via
  // typography.fontFamily: "inherit" (baseThemeOptions in themeRegistry.js). An inline style here
  // beats any stylesheet rule (including Tailwind's own preflight default) regardless of import
  // order, so no themeStyles.css counterpart is needed the way theme_style needed one.
  useEffect(() => {
    const font = getFontOption(brand?.font_family);
    ensureGoogleFontLoaded(font.google);
    document.documentElement.style.fontFamily = font.stack;
  }, [brand?.font_family]);

  return <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>;
}

import { useMemo } from "react";
import { useSelector } from "react-redux";
import { ThemeProvider as MuiThemeProvider } from "@mui/material/styles";
import { useTheme as useAppTheme } from "../features/theme-context";
import { createTenantTheme } from "./themeRegistry";

// Wraps the whole app in a dynamic MUI theme fed by the logged-in tenant's brand payload
// (state.auth.user.brand, from /auth/me) -- so any MUI component anywhere, existing or future,
// picks up the tenant's colors with zero per-page wiring. Deliberately does NOT render
// <CssBaseline/>: that would reset global body/typography defaults and bleed onto the still-
// Tailwind shell (Navbar/MainLayout), which this phase intentionally leaves untouched.
export default function TenantThemeProvider({ children }) {
  const { theme: mode } = useAppTheme();
  const brand = useSelector((state) => state.auth.user?.brand);
  const muiTheme = useMemo(() => createTenantTheme(brand, mode), [brand, mode]);

  return <MuiThemeProvider theme={muiTheme}>{children}</MuiThemeProvider>;
}

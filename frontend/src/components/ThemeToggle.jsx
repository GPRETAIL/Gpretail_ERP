import { Button } from "@mui/material";
import { useTheme } from "../features/theme-context";

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      variant="outlined"
      sx={{ textTransform: "none", borderRadius: 2, color: "text.primary", borderColor: "divider" }}
    >
      {theme === "dark" ? "☀️ Light Mode" : "🌙 Dark Mode"}
    </Button>
  );
}

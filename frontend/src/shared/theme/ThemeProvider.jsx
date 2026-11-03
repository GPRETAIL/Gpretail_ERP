import { useLayoutEffect, useState } from "react";
import { ThemeContext } from "./themeContext.js";

const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(localStorage.getItem("theme") || "light");

  // Layout effect so the dark class is on <html> within the same commit (the theme reveal captures it right after).
  useLayoutEffect(() => {
    const root = document.documentElement; // <html>

    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }

    localStorage.setItem("theme", theme);
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};
export default ThemeProvider;

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import "./theme/themeStyles.css";
import App from "./App.jsx";

import store from "./store.js";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import ThemeProvider from "./features/ThemeProvider.jsx";
import TenantThemeProvider from "./theme/TenantThemeProvider.jsx";
import { PrintProvider } from "./context/PrintContext.jsx";
import { SyncStatusProvider } from "./context/SyncStatusContext.jsx";

// Only register in production builds -- in dev (vite dev), the SW's own caching is exactly what
// was causing edited JS/CSS to silently keep serving old content after a normal reload, since a
// service worker intercepts requests independently of the browser's own cache and Vite's HMR has
// no way to know about or invalidate it. Production is unaffected: import.meta.env.PROD is true
// there, so the actual PWA offline behavior this exists for still registers normally.
if (import.meta.env.PROD && "serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[PWA] ServiceWorker registered with scope:", reg.scope);
      })
      .catch((error) => {
        console.warn("[PWA] ServiceWorker registration failed:", error);
      });
  });
}

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ThemeProvider>
      <TenantThemeProvider>
        <BrowserRouter>
          <PrintProvider>
            <SyncStatusProvider>
              <StrictMode>
                <ToastContainer position="top-right" autoClose={3000} />
                <App />
              </StrictMode>
            </SyncStatusProvider>
          </PrintProvider>
        </BrowserRouter>
      </TenantThemeProvider>
    </ThemeProvider>
  </Provider>
);

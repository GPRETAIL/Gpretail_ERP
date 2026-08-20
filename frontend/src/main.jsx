import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

import store from "./store.js";
import { BrowserRouter } from "react-router-dom";
import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";
import ThemeProvider from "./features/ThemeProvider.jsx";
import TenantThemeProvider from "./theme/TenantThemeProvider.jsx";
import { PrintProvider } from "./context/PrintContext.jsx";

createRoot(document.getElementById("root")).render(
  <Provider store={store}>
    <ThemeProvider>
      <TenantThemeProvider>
        <BrowserRouter>
          <PrintProvider>
            <StrictMode>
              <ToastContainer position="top-right" autoClose={3000} />
              <App />
            </StrictMode>
          </PrintProvider>
        </BrowserRouter>
      </TenantThemeProvider>
    </ThemeProvider>
  </Provider>
);

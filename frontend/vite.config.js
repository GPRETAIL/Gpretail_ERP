// vite.config.js

import { defineConfig } from "vite";
import { loadEnv } from "vite";
import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";

// Serve dev over HTTPS when an mkcert-generated cert pair is present
// (./certs/localhost-{cert,key}.pem). Browsers that force secure
// connections (e.g. Edge strict mode) can then load https://localhost.
function loadHttpsConfig(env = {}) {
  if (env.VITE_HTTPS === "true" || process.env.VITE_HTTPS === "true") {
    const certPath = path.resolve(process.cwd(), "certs/localhost-cert.pem");
    const keyPath = path.resolve(process.cwd(), "certs/localhost-key.pem");
    if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
      return {
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
      };
    }
  }
  return undefined;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8001";
  // On-prem counters open this server by its machine name, e.g. http://mainserver:5173 (comma list).
  const extraHosts = String(env.VITE_ALLOWED_HOSTS || "").split(",").map(host => host.trim()).filter(Boolean);
  const https = loadHttpsConfig(env);
  const devServer = serverOptions({ extraHosts, https, proxyTarget });

  return {
    // The build date shown on the sign-in page's status line.
    define: { __APP_BUILD__: JSON.stringify(new Date().toISOString()) },
    plugins: [
      react(),
    ],
    test: {
      // Each jsdom worker loads the ERP's component graph; bound memory on POS/developer PCs.
      maxWorkers: 2,
      testTimeout: 20000,
      hookTimeout: 20000,
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.js"],
      include: ["src/**/*.{test,spec}.{js,jsx}"],
    },
    resolve: {
      alias: { "@": path.resolve(import.meta.dirname, "src") },
      dedupe: ["react", "react-dom", "@emotion/react", "@emotion/styled"],
    },
    optimizeDeps: {
      include: [
        "react",
        "react-dom",
        "@emotion/react",
        "@emotion/styled",
        "@mui/material",
      ],
    },
    server: devServer,
    // The on-prem main server runs the production build ("npm run build" then "npm run preview -- --host --port 5173"):
    // the same proxy and hosts as above, without the dev server. Counters may also run the counter client.
    preview: devServer,
  };
});

function serverOptions({ extraHosts, https, proxyTarget }) {
  return {
      allowedHosts: ["home.gpretail.uk", "admin.gpretail.uk", "admin.home.gpretail.uk", ...extraHosts],
      ...(https ? { https } : {}),
      proxy: {
        // Reading an invoice with the AI service can take a minute or more: its own longer limit. Listed before
        // "/api" so it matches first; everything else keeps 30 s, which lets counters notice a hung server.
        "/api/v1/invoice-ai": {
          target: proxyTarget,
          changeOrigin: true,
          xfwd: true,
          configure: (proxy) => {
            proxy.on("error", (err, _req, res) => {
              if (res && typeof res.setHeader === "function" && !res.headersSent) res.setHeader("X-Proxy-Error", err?.code || "PROXY_ERROR");
            });
          },
          timeout: 180_000,
          proxyTimeout: 180_000,
        },
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
          // Each counter's own address reaches the backend (it trusts this local proxy), so sign-in limits are per counter.
          xfwd: true,
          // When the backend can't be reached, Vite answers 502. Saying why lets the counter send a bill that never
          // arrived to the cloud instead (runtimeRouting.shouldRetryOnCloud).
          configure: (proxy) => {
            proxy.on("error", (err, _req, res) => {
              if (res && typeof res.setHeader === "function" && !res.headersSent) res.setHeader("X-Proxy-Error", err?.code || "PROXY_ERROR");
            });
          },
          // Connector ZIP build can take minutes during dev
          timeout: 30_000,
          proxyTimeout: 30_000,
        },
        "/files": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
  };
}

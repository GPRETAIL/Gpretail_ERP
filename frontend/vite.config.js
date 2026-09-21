// vite.config.js

import { defineConfig } from "vite";
import { loadEnv } from "vite";
import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";

// Serve dev over HTTPS when an mkcert-generated cert pair is present
// (./certs/localhost-{cert,key}.pem). Browsers that force secure
// connections (e.g. Edge strict mode) can then load https://localhost.
function loadHttpsConfig() {
  const certPath = path.resolve(process.cwd(), "certs/localhost-cert.pem");
  const keyPath = path.resolve(process.cwd(), "certs/localhost-key.pem");
  if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
    return {
      cert: fs.readFileSync(certPath),
      key: fs.readFileSync(keyPath),
    };
  }
  return undefined;
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const proxyTarget = env.VITE_API_PROXY_TARGET || "http://localhost:8080";
  const https = loadHttpsConfig();

  return {
    plugins: [
      react(),
    ],
    test: {
      testTimeout: 20000,
      hookTimeout: 20000,
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.js"],
      include: ["src/**/*.{test,spec}.{js,jsx}"],
    },
    resolve: {
      dedupe: ["react", "react-dom"],
    },
    optimizeDeps: {
      // Vite's dependency crawler can miss react-grid-layout's /legacy subpath (a conditional
      // export, not a static top-level import) and pre-bundle it separately from the app's own
      // react-dom, which manifests as "Invalid hook call" in dev only (the production Rollup
      // build is unaffected). Listing it explicitly forces a single, correctly-deduped bundle.
      include: ["react-grid-layout/legacy"],
    },
    server: {
      allowedHosts: ["home.gpretail.uk", "admin.gpretail.uk", "admin.home.gpretail.uk"],
      ...(https ? { https } : {}),
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          ws: true,
          // Connector ZIP build can take minutes during dev
          timeout: 30_000,
          proxyTimeout: 30_000,
        },
        "/files": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});

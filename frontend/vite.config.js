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
  const https = loadHttpsConfig(env);

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

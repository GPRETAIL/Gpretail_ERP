// vite.config.js

import { defineConfig } from "vite";
import { loadEnv } from "vite";
import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

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
      tailwindcss({
        darkMode: "class",
      }),
    ],
    test: {
      // The self-hosted ARC runner is memory-starved (collect ~7 min, ~660x slower than host);
      // give heavy component tests headroom so they don't false-timeout under that load.
      testTimeout: 60000,
      hookTimeout: 60000,
      environment: "jsdom",
      globals: true,
      setupFiles: ["./src/test/setup.js"],
      include: ["src/**/*.{test,spec}.{js,jsx}"],
      // Run test files one at a time. In parallel, every file forks a worker that loads jsdom and a
      // full React tree at once, and on a memory-capped runner most of those workers never finish
      // starting: "[vitest-pool]: Failed to start forks worker ... Timeout waiting for worker to
      // respond". Observed locally swinging between 11, 9 and 1 failed workers on identical input.
      //
      // The dangerous part was not the failure but the summary. A run where 9 of 11 workers died
      // still printed "Test Files 2 passed (2)" -- green-looking output describing two files out of
      // eleven. Anyone comparing that line against a remembered total would see nothing wrong.
      // Bounded rather than fully sequential. `fileParallelism: false` did make the count reliable,
      // but it pushed the CI run from ~31 to ~49 minutes, and two workers get almost all of that
      // reliability back: the failure was eleven jsdom workers starting at once on a capped node,
      // not concurrency as such.
      poolOptions: {
        forks: { minForks: 1, maxForks: 2 },
      },
      // Surface a worker that dies mid-run instead of letting the file vanish from the totals.
      dangerouslyIgnoreUnhandledErrors: false,
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

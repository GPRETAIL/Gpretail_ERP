import React from "react";
import { Link, useLocation } from "react-router-dom";

/**
 * Placeholder for nav items whose feature isn't built yet. The catch-all route renders this so an
 * unbuilt (or mistyped) path shows a friendly panel instead of silently bouncing to the dashboard
 * with no feedback (which read as "the page is broken").
 */
export default function ComingSoon() {
  const location = useLocation();
  return (
    <section className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
      <div className="mb-4 text-6xl">🚧</div>
      <h1 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-gray-100">Coming soon</h1>
      <p className="mb-1 max-w-md text-gray-500 dark:text-gray-400">
        This feature isn’t available yet — we’re still building it.
      </p>
      <p className="mb-6 font-mono text-xs text-gray-400 dark:text-gray-500">{location.pathname}</p>
      <Link
        to="/dashboard"
        className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700"
      >
        Back to Dashboard
      </Link>
    </section>
  );
}

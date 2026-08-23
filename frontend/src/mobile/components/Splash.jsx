import React from "react";
import "../../mobile/workspace.css";

/**
 * Branded Vynerix ERP splash/loading screen.
 * Shown during app initialization; progress drives the bar width.
 */
export default function Splash({ progress = 0 }) {
  return (
    <div className="vx-splash">
      {/* Glowing V Logo Card */}
      <div className="vx-splash-logo-box">
        <svg viewBox="0 0 100 100" className="w-12 h-12 fill-white" aria-hidden>
          <path d="M20 20 L40 20 L50 65 L60 20 L80 20 L58 85 L42 85 Z" />
        </svg>
      </div>

      {/* Brand Title */}
      <h1 className="vx-splash-title">Vynerix</h1>
      <h2 className="vx-splash-title" style={{ marginTop: -6 }}>ERP</h2>
      <p className="vx-splash-sub">Smart. Secure. Simplified.</p>

      {/* Real Progress Bar */}
      <div className="vx-splash-bar-wrap">
        <div
          className="vx-splash-bar vx-splash-bar--real"
          style={{ width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}

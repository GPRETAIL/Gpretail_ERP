import React from "react";
import "../../mobile/workspace.css";

/**
 * Branded Vynerix ERP splash / loading screen.
 * Matches user's exact reference design with royal blue background,
 * glowing layered logo, clean bold typography, and smooth progress indicator.
 */
export default function Splash({ progress = 0 }) {
  return (
    <div className="vx-splash-screen">
      {/* Centered Brand Content */}
      <div className="vx-splash-content">
        {/* Layered Glowing V Logo Box */}
        <div className="vx-splash-logo-card">
          <svg
            viewBox="0 0 100 100"
            className="w-14 h-14 fill-white drop-shadow-md"
            aria-hidden
          >
            <path d="M18 20 L38 20 L50 64 L62 20 L82 20 L59 86 L41 86 Z" />
          </svg>
        </div>

        {/* Title */}
        <h1 className="vx-splash-brand-name">Vynerix</h1>

        {/* Tagline */}
        <p className="vx-splash-tagline">Smart. Secure. Simplified.</p>

        {/* Loading Progress Bar Container */}
        <div className="vx-splash-progress-track">
          <div
            className="vx-splash-progress-fill"
            style={{ width: `${Math.max(8, Math.min(progress, 100))}%` }}
          />
        </div>
      </div>
    </div>
  );
}

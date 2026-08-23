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
            className="w-14 h-14 drop-shadow-md"
            aria-hidden
          >
            <defs>
              <linearGradient id="vynerixVGrad" x1="20" y1="20" x2="80" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#c7d2fe" />
              </linearGradient>
              <clipPath id="vynerixVClip">
                <path d="M18 20 L38 20 L50 64 L62 20 L82 20 L59 86 L41 86 Z" />
              </clipPath>
            </defs>
            <path d="M18 20 L38 20 L50 64 L62 20 L82 20 L59 86 L41 86 Z" fill="url(#vynerixVGrad)" />
            <g clipPath="url(#vynerixVClip)">
              <path d="M50 55 L72 80 L50 100 L28 80 Z" fill="#ffffff" fillOpacity="0.32" />
            </g>
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

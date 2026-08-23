import React from "react";
import VynerixVLogo from "./VynerixVLogo";
import "../../mobile/workspace.css";

/**
 * Branded Vynerix ERP splash / loading screen.
 */
export default function Splash({ progress = 0 }) {
  return (
    <div className="vx-splash-screen">
      {/* Centered Brand Content */}
      <div className="vx-splash-content">
        <div className="vx-splash-logo-card">
          <VynerixVLogo variant="splash" size={110} animated />
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

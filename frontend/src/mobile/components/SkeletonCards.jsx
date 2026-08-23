import React from "react";

/**
 * Skeleton loading placeholders for mobile screens.
 * Provides pulse-animated card and line shapes.
 */

export function SkeletonKpiGrid() {
  return (
    <div className="vx-kpis-grid">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="vx-kpi-card">
          <div className="vx-skel vx-skel-line" style={{ width: "60%" }} />
          <div className="vx-skel vx-skel-line vx-skel-lg" style={{ width: "80%" }} />
          <div className="vx-skel vx-skel-line" style={{ width: "40%" }} />
        </div>
      ))}
    </div>
  );
}

export function SkeletonChart() {
  return (
    <div className="vx-card">
      <div className="vx-card-header">
        <div className="vx-skel vx-skel-line" style={{ width: 120 }} />
        <div className="vx-skel vx-skel-line" style={{ width: 80 }} />
      </div>
      <div className="vx-skel vx-skel-block" style={{ height: 140 }} />
    </div>
  );
}

export function SkeletonTransList({ count = 4 }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="vx-trans-card">
          <div className="vx-trans-left" style={{ gap: 6 }}>
            <div className="vx-skel vx-skel-line" style={{ width: 100 }} />
            <div className="vx-skel vx-skel-line" style={{ width: 80 }} />
            <div className="vx-skel vx-skel-line" style={{ width: 60 }} />
          </div>
          <div className="vx-trans-right" style={{ gap: 6 }}>
            <div className="vx-skel vx-skel-line" style={{ width: 70 }} />
            <div className="vx-skel vx-skel-line" style={{ width: 50 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function SkeletonModuleGrid() {
  return (
    <div className="vx-modules-grid">
      {Array.from({ length: 9 }).map((_, i) => (
        <div key={i} className="vx-module-tile">
          <div className="vx-skel" style={{ width: 46, height: 46, borderRadius: 14 }} />
          <div className="vx-skel vx-skel-line" style={{ width: 50 }} />
        </div>
      ))}
    </div>
  );
}

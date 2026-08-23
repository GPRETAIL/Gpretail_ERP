import React from "react";

// Approximate default sizes per variant (px). Callers can override via `size`.
const VARIANT_SIZES = {
  "app-icon": 48,
  header: 32,
  login: 90,
  splash: 110,
  loader: 64,
};

const ASPECT = 329 / 353;

/**
 * Vynerix brand mark - two folded translucent ribbon arms forming a "V",
 * with a semi-transparent overlap layer and a rounded lower body for depth.
 */
export default function VynerixVLogo({ size, animated = false, variant = "splash", className = "" }) {
  const width = size ?? VARIANT_SIZES[variant] ?? 110;
  const height = width * ASPECT;

  return (
    <svg
      viewBox="0 0 353 329"
      width={width}
      height={height}
      className={`vx-v-logo ${animated ? "vx-v-logo-animated" : ""} ${className}`}
      style={{ filter: "drop-shadow(0 0 20px rgba(130,128,255,0.20))" }}
      aria-hidden
    >
      <defs>
        <linearGradient id="vynerixLeftArmGrad" x1="0%" y1="0%" x2="75%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#EDEDF5" />
          <stop offset="75%" stopColor="#C9CAF2" />
          <stop offset="100%" stopColor="#8D8BEA" />
        </linearGradient>
        <linearGradient id="vynerixRightArmGrad" x1="100%" y1="0%" x2="25%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="45%" stopColor="#ECECF4" />
          <stop offset="75%" stopColor="#C7C8F1" />
          <stop offset="100%" stopColor="#9997EA" />
        </linearGradient>
        <linearGradient id="vynerixBottomGrad" x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#B4B4FF" />
          <stop offset="50%" stopColor="#9493F0" />
          <stop offset="100%" stopColor="#8583E3" />
        </linearGradient>
        <linearGradient id="vynerixOverlapGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#B7B7FF" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#6866E6" stopOpacity="0.35" />
        </linearGradient>
      </defs>

      {/* Notch fill - the gap between the two arms should read as soft light-blue,
          not raw background color. Sits behind the arms so only the visible gap shows. */}
      <path d="M40 40 L313 40 L176.5 275 Z" fill="url(#vynerixBottomGrad)" opacity="0.55" />

      {/* Left ribbon arm */}
      <path
        d="M40 40 L176 275"
        fill="none"
        stroke="url(#vynerixLeftArmGrad)"
        strokeWidth="64"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Right ribbon arm (drawn on top, slightly overlapping the left) */}
      <path
        d="M313 40 L177 275"
        fill="none"
        stroke="url(#vynerixRightArmGrad)"
        strokeWidth="64"
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity="0.96"
      />
      {/* Bottom translucent V body - rounded, not a sharp triangle */}
      <ellipse cx="176.5" cy="272" rx="30" ry="34" fill="url(#vynerixBottomGrad)" opacity="0.85" />
      {/* Center overlap layer - where the two ribbons fold across each other */}
      <path
        d="M176.5 190 L222 232 L176.5 278 L131 232 Z"
        fill="url(#vynerixOverlapGrad)"
      />
    </svg>
  );
}

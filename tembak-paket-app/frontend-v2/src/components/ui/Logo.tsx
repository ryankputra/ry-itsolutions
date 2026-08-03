import React from "react";

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  size?: number;
}

export function Logo({ className = "", iconOnly = false, size = 32 }: LogoProps) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="shrink-0"
      >
        {/* Hexagon Background */}
        <polygon
          points="50,5 90,28 90,72 50,95 10,72 10,28"
          fill="url(#hex-grad)"
          className="drop-shadow-lg"
        />
        {/* Tech grid lines */}
        <path
          d="M50 5V30 M10 28H35 M90 28H65 M10 72H35 M90 72H65 M50 95V70"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Lightning Bolt */}
        <path
          d="M55 20L30 55H50L45 80L70 45H50L55 20Z"
          fill="url(#bolt-grad)"
          filter="url(#glow)"
        />
        <defs>
          <linearGradient id="hex-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#2563eb" /> {/* blue-600 */}
            <stop offset="100%" stopColor="#0891b2" /> {/* cyan-600 */}
          </linearGradient>
          <linearGradient id="bolt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#facc15" /> {/* yellow-400 */}
            <stop offset="100%" stopColor="#f97316" /> {/* orange-500 */}
          </linearGradient>
          <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
      </svg>
      {!iconOnly && (
        <span className="font-bold tracking-tight text-ink font-sans">
          Ry-<span className="text-primary">ITSolutions</span>
        </span>
      )}
    </div>
  );
}

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
        className="shrink-0 drop-shadow-md"
      >
        <defs>
          <linearGradient id="logo-bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#0b0f19" />
            <stop offset="100%" stopColor="#020617" />
          </linearGradient>
          <linearGradient id="logo-border-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f2fe" />
            <stop offset="50%" stopColor="#3b82f6" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
          <linearGradient id="logo-bolt-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#facc15" />
            <stop offset="100%" stopColor="#fb923c" />
          </linearGradient>
          <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Shield Outer Shape */}
        <path
          d="M50 6 L88 22 V64 L50 94 L12 64 V22 Z"
          fill="url(#logo-bg-grad)"
          stroke="url(#logo-border-grad)"
          strokeWidth="3"
          strokeLinejoin="round"
        />

        {/* Cyber Circuits */}
        <path
          d="M50 12 V28 M22 28 H35 L41 34 M78 28 H65 L59 34 M22 60 H35 L41 54 M78 60 H65 L59 54 M50 88 V74"
          stroke="#00f2fe"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.5"
        />
        <circle cx="50" cy="28" r="1.5" fill="#00f2fe" />
        <circle cx="41" cy="34" r="1.2" fill="#38bdf8" />
        <circle cx="59" cy="34" r="1.2" fill="#38bdf8" />
        <circle cx="41" cy="54" r="1.2" fill="#8b5cf6" />
        <circle cx="59" cy="54" r="1.2" fill="#8b5cf6" />
        <circle cx="50" cy="74" r="1.5" fill="#8b5cf6" />

        {/* Inner Shield */}
        <path
          d="M50 20 L76 32 V58 L50 80 L24 58 V32 Z"
          fill="#1e293b"
          fillOpacity="0.8"
          stroke="rgba(255, 255, 255, 0.2)"
          strokeWidth="1"
          strokeLinejoin="round"
        />

        {/* Stylized 'R' + Lightning */}
        <path
          d="M38 32 H54 C60 32 64 35 64 41 C64 46 61 49 56 50 L66 65 H56 L47 51 H46 V65 H38 V32 Z M46 39 V45 H52 C55 45 57 43 57 42 C57 40 55 39 52 39 H46 Z"
          fill="url(#logo-border-grad)"
          opacity="0.85"
        />

        {/* Quantum Lightning Bolt */}
        <path
          d="M54 28 L40 52 H51 L46 70 L63 46 H52 L54 28 Z"
          fill="url(#logo-bolt-grad)"
          filter="url(#logo-glow)"
        />
      </svg>
      {!iconOnly && (
        <span className="font-bold tracking-tight text-ink font-sans">
          Ry-<span className="text-primary font-extrabold">ITSolutions</span>
        </span>
      )}
    </div>
  );
}

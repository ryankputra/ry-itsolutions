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
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="55%" stopColor="#0ea5e9" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="logo-sheen" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Rounded-square gradient tile */}
        <rect x="4" y="4" width="92" height="92" rx="23" fill="url(#logo-bg-grad)" />
        <rect x="4" y="4" width="92" height="92" rx="23" fill="url(#logo-sheen)" />

        {/* Stylized 'R' monogram */}
        <path
          d="M36 22 H53 C64 22 71 28 71 38 C71 47 66 53 58 55 L75 76 H62 L48 56 H50 V76 H36 Z M50 30 V46 H59 C64 46 67 43 67 39 C67 35 64 30 59 30 H50 Z"
          fill="#ffffff"
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

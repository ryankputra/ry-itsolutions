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
        className="shrink-0 drop-shadow-md select-none transition-transform hover:scale-105 duration-200"
      >
        <defs>
          <linearGradient id="ry-brand-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#1d4ed8" />
            <stop offset="50%" stopColor="#0284c7" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
          <linearGradient id="ry-sheen-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.28" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Rounded-square squircle background tile */}
        <rect
          x="6"
          y="6"
          width="88"
          height="88"
          rx="22"
          fill="url(#ry-brand-grad)"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="1.5"
        />
        <rect
          x="6"
          y="6"
          width="88"
          height="88"
          rx="22"
          fill="url(#ry-sheen-grad)"
        />

        {/* Monogram R: Vertical Stem */}
        <rect x="25" y="24" width="10" height="52" rx="5" fill="#ffffff" />

        {/* Monogram R: Upper Loop */}
        <path
          d="M 28 24 H 56 C 67.5 24 74 31 74 40 C 74 49 67.5 56 56 56 H 28"
          fill="none"
          stroke="#ffffff"
          strokeWidth="10"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Monogram R: Dynamic Diagonal Leg */}
        <path
          d="M 46 52 L 67 76"
          fill="none"
          stroke="#ffffff"
          strokeWidth="10"
          strokeLinecap="round"
        />

        {/* IT Solutions Signal Node Accent */}
        <circle cx="74" cy="24" r="7.5" fill="#38bdf8" opacity="0.35" />
        <circle cx="74" cy="24" r="4.5" fill="#ffffff" />
      </svg>
      {!iconOnly && (
        <span className="font-extrabold tracking-tight text-ink font-sans flex items-center select-none text-[1.05rem]">
          <span>Ry</span>
          <span className="text-primary font-black ml-0.5">ITSolutions</span>
        </span>
      )}
    </div>
  );
}

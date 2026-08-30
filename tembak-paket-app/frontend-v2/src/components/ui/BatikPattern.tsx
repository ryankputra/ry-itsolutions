"use client";
import React, { useId } from "react";

interface BatikPatternProps {
  className?: string;
  opacity?: number;
}

export function BatikPatternOverlay({ className = "", opacity = 0.45 }: BatikPatternProps) {
  const patternId = useId().replace(/:/g, "_");

  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}>
      <svg
        className="w-full h-full text-white"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        style={{ opacity }}
      >
        <defs>
          {/* Authentic Indonesian Batik Kawung & Parang Motif */}
          <pattern
            id={patternId}
            width="64"
            height="64"
            patternUnits="userSpaceOnUse"
          >
            {/* Background Diamond Lattice */}
            <path
              d="M32 0 L64 32 L32 64 L0 32 Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.2"
              opacity="0.3"
            />
            <path
              d="M32 8 L56 32 L32 56 L8 32 Z"
              fill="currentColor"
              fillOpacity="0.1"
              stroke="currentColor"
              strokeWidth="0.8"
              opacity="0.25"
            />

            {/* Shopee Style Batik Kawung 4-Petal Flower (Filled Shape) */}
            <g transform="translate(32,32)">
              {/* Petal Top */}
              <path
                d="M 0,0 C -12,-18 -10,-28 0,-28 C 10,-28 12,-18 0,0 Z"
                fill="currentColor"
                fillOpacity="0.25"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              {/* Petal Bottom */}
              <path
                d="M 0,0 C -12,18 -10,28 0,28 C 10,28 12,18 0,0 Z"
                fill="currentColor"
                fillOpacity="0.25"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              {/* Petal Left */}
              <path
                d="M 0,0 C -18,-12 -28,-10 -28,0 C -28,10 -18,12 0,0 Z"
                fill="currentColor"
                fillOpacity="0.25"
                stroke="currentColor"
                strokeWidth="1.2"
              />
              {/* Petal Right */}
              <path
                d="M 0,0 C 18,-12 28,-10 28,0 C 28,10 18,12 0,0 Z"
                fill="currentColor"
                fillOpacity="0.25"
                stroke="currentColor"
                strokeWidth="1.2"
              />

              {/* Inner Petal Decorative Dots */}
              <circle cx="0" cy="-15" r="3.5" fill="currentColor" fillOpacity="0.4" />
              <circle cx="0" cy="15" r="3.5" fill="currentColor" fillOpacity="0.4" />
              <circle cx="-15" cy="0" r="3.5" fill="currentColor" fillOpacity="0.4" />
              <circle cx="15" cy="0" r="3.5" fill="currentColor" fillOpacity="0.4" />

              {/* Center Gold Batik Rhombus & White Eye */}
              <polygon points="0,-7 7,0 0,7 -7,0" fill="#f59e0b" opacity="0.95" />
              <circle cx="0" cy="0" r="2.5" fill="#ffffff" opacity="1" />
            </g>

            {/* Corner Kawung Interlocking Ornaments */}
            <g transform="translate(0,0)">
              <circle cx="0" cy="0" r="10" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" opacity="0.4" />
              <polygon points="0,-4 4,0 0,4 -4,0" fill="#f59e0b" opacity="0.85" />
            </g>
            <g transform="translate(64,0)">
              <circle cx="0" cy="0" r="10" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" opacity="0.4" />
              <polygon points="0,-4 4,0 0,4 -4,0" fill="#f59e0b" opacity="0.85" />
            </g>
            <g transform="translate(0,64)">
              <circle cx="0" cy="0" r="10" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" opacity="0.4" />
              <polygon points="0,-4 4,0 0,4 -4,0" fill="#f59e0b" opacity="0.85" />
            </g>
            <g transform="translate(64,64)">
              <circle cx="0" cy="0" r="10" fill="currentColor" fillOpacity="0.15" stroke="currentColor" strokeWidth="1" opacity="0.4" />
              <polygon points="0,-4 4,0 0,4 -4,0" fill="#f59e0b" opacity="0.85" />
            </g>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill={`url(#${patternId})`} />
      </svg>
    </div>
  );
}

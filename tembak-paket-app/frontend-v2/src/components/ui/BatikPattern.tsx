"use client";
import React from "react";

interface BatikPatternProps {
  className?: string;
  opacity?: number;
}

export function BatikPatternOverlay({ className = "", opacity = 0.2 }: BatikPatternProps) {
  return (
    <div className={`absolute inset-0 pointer-events-none overflow-hidden select-none z-0 ${className}`}>
      <svg
        className="w-full h-full text-white/40"
        xmlns="http://www.w3.org/2000/svg"
        width="100%"
        height="100%"
        style={{ opacity }}
      >
        <defs>
          {/* Authentic Indonesian Batik Kawung & Parang Motif */}
          <pattern
            id="shopee-batik-motif"
            width="70"
            height="70"
            patternUnits="userSpaceOnUse"
          >
            {/* Background Fine Grid Lines */}
            <path
              d="M0 35 L70 35 M35 0 L35 70"
              stroke="currentColor"
              strokeWidth="0.4"
              strokeDasharray="2 2"
              opacity="0.3"
            />

            {/* Diagonal Parang Waves */}
            <path
              d="M-20 17.5 Q 0 0, 17.5 17.5 T 52.5 17.5 T 87.5 17.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.35"
            />
            <path
              d="M-20 52.5 Q 0 35, 17.5 52.5 T 52.5 52.5 T 87.5 52.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              opacity="0.35"
            />

            {/* Kawung Petals (Four-leaf clover geometry) */}
            <g transform="translate(35,35)">
              {/* Petal 1 - Top */}
              <ellipse cx="0" cy="-12" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.6" />
              <ellipse cx="0" cy="-12" rx="3.5" ry="7" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
              
              {/* Petal 2 - Bottom */}
              <ellipse cx="0" cy="12" rx="8" ry="12" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.6" />
              <ellipse cx="0" cy="12" rx="3.5" ry="7" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
              
              {/* Petal 3 - Left */}
              <ellipse cx="-12" cy="0" rx="12" ry="8" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.6" />
              <ellipse cx="-12" cy="0" rx="7" ry="3.5" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />
              
              {/* Petal 4 - Right */}
              <ellipse cx="12" cy="0" rx="12" ry="8" fill="none" stroke="currentColor" strokeWidth="0.9" opacity="0.6" />
              <ellipse cx="12" cy="0" rx="7" ry="3.5" fill="none" stroke="currentColor" strokeWidth="0.6" opacity="0.4" />

              {/* Center Diamond & Gold Accent Dot */}
              <polygon points="0,-4 4,0 0,4 -4,0" fill="currentColor" opacity="0.5" />
              <circle cx="0" cy="0" r="1.5" fill="#fbbf24" opacity="0.9" />
            </g>

            {/* Corner Decorative Ornaments */}
            <g transform="translate(0,0)">
              <circle cx="0" cy="0" r="7" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.5" />
              <circle cx="0" cy="0" r="2.5" fill="currentColor" opacity="0.4" />
            </g>
            <g transform="translate(70,0)">
              <circle cx="0" cy="0" r="7" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.5" />
              <circle cx="0" cy="0" r="2.5" fill="currentColor" opacity="0.4" />
            </g>
            <g transform="translate(0,70)">
              <circle cx="0" cy="0" r="7" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.5" />
              <circle cx="0" cy="0" r="2.5" fill="currentColor" opacity="0.4" />
            </g>
            <g transform="translate(70,70)">
              <circle cx="0" cy="0" r="7" fill="none" stroke="currentColor" strokeWidth="0.7" opacity="0.5" />
              <circle cx="0" cy="0" r="2.5" fill="currentColor" opacity="0.4" />
            </g>
          </pattern>
        </defs>

        <rect width="100%" height="100%" fill="url(#shopee-batik-motif)" />
      </svg>
    </div>
  );
}

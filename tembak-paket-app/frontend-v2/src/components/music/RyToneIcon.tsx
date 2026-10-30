import React from "react";

export function RyToneIcon({ className = "w-5 h-5", ...props }: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      {...props}
    >
      {/* Outer Glow Halo & Disc */}
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.75" />
      {/* Dynamic Sound Frequency Bars in Ry Tone Monogram style */}
      <path
        d="M6.5 12.5V11.5M9 15.5V8.5M12 18V6M15 15.5V8.5M17.5 12.5V11.5"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

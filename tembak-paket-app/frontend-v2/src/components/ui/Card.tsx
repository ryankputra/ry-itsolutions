import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
  hoverable?: boolean;
}

export function Card({ children, className = "", glass, hoverable = true, ...props }: CardProps) {
  const baseStyles = "rounded-2xl border border-gray-200/80 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative z-10";
  const glassStyles = "rounded-2xl border border-gray-200/60 dark:border-zinc-800/80 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative z-10";
  const hoverStyles = hoverable ? "card-hover cursor-pointer" : "";
  
  return (
    <div className={`${glass ? glassStyles : baseStyles} ${hoverStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}

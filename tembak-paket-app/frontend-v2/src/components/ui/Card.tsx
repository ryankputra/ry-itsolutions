import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ children, className = "", glass, ...props }: CardProps) {
  const baseStyles = "rounded-xl border border-gray-200/80 bg-white dark:bg-zinc-900 p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative z-10";
  const glassStyles = "rounded-xl border border-gray-200/60 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)] relative z-10";
  
  return (
    <div className={`${glass ? glassStyles : baseStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}

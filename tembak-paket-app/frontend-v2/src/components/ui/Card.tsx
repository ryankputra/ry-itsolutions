import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ children, className = "", glass, ...props }: CardProps) {
  const baseStyles = "rounded-xl border border-gray-200/80 bg-white p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]";
  const glassStyles = "rounded-xl border border-gray-200/60 bg-white/80 backdrop-blur-md p-5 shadow-[0_1px_3px_rgba(0,0,0,0.03)]";
  
  return (
    <div className={`${glass ? glassStyles : baseStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}

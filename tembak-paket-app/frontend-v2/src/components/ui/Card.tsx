import React from "react";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  glass?: boolean;
}

export function Card({ children, className = "", glass, ...props }: CardProps) {
  // Apple store-utility-card: rounded 18px (lg), 1px solid hairline, bg white, no shadow by default
  const baseStyles = "rounded-[18px] border border-hairline bg-canvas p-6";
  const glassStyles = "rounded-[18px] border border-hairline bg-parchment/80 backdrop-blur-md p-6";
  
  return (
    <div className={`${glass ? glassStyles : baseStyles} ${className}`} {...props}>
      {children}
    </div>
  );
}

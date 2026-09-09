import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger" | "pearl";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({ 
  children, 
  variant = "primary", 
  size = "md", 
  isLoading, 
  className = "", 
  disabled,
  ...props 
}: ButtonProps) {
  const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 active:scale-[0.98]";
  
  const variants = {
    primary: "bg-gray-900 text-white hover:bg-gray-800 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.05)] border border-transparent",
    secondary: "bg-white text-gray-800 border border-gray-200 rounded-lg hover:bg-gray-50 hover:border-gray-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
    outline: "border border-gray-200 bg-white hover:bg-gray-50 text-gray-800 rounded-lg shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
    ghost: "hover:bg-gray-100/70 text-gray-600 hover:text-gray-900 rounded-lg",
    danger: "bg-red-50 text-red-600 hover:bg-red-100/80 border border-red-200/60 rounded-lg",
    pearl: "bg-gray-50 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-100"
  };

  const sizes = {
    sm: "h-8 px-3 text-xs tracking-tight",
    md: "h-10 px-4 text-sm tracking-tight",
    lg: "h-12 px-6 text-sm tracking-tight"
  };

  return (
    <button 
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={isLoading || disabled}
      {...props}
    >
      {isLoading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
      ) : null}
      {children}
    </button>
  );
}

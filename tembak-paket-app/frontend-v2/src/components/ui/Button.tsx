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
  const baseStyles = "inline-flex items-center justify-center font-medium btn-press cursor-pointer transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 disabled:pointer-events-none disabled:opacity-50 select-none";
  
  const variants = {
    primary: "bg-[#0071e3] text-white hover:bg-[#0077ed] rounded-xl shadow-[0_2px_8px_rgba(0,113,227,0.25)] hover:shadow-[0_4px_16px_rgba(0,113,227,0.38)] border border-transparent btn-glow",
    secondary: "bg-white dark:bg-zinc-800 text-gray-800 dark:text-zinc-100 border border-gray-200 dark:border-zinc-700 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-700/60 shadow-[0_1px_2px_rgba(0,0,0,0.02)]",
    outline: "border border-gray-200 dark:border-zinc-700 bg-transparent hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-800 dark:text-zinc-100 rounded-xl",
    ghost: "hover:bg-gray-100/70 dark:hover:bg-zinc-800/60 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white rounded-xl",
    danger: "bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 hover:bg-red-100/80 dark:hover:bg-red-900/60 border border-red-200/60 dark:border-red-800/40 rounded-xl",
    pearl: "bg-gray-50 dark:bg-zinc-900 text-gray-700 dark:text-zinc-200 border border-gray-200 dark:border-zinc-800 rounded-xl hover:bg-gray-100 dark:hover:bg-zinc-800"
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

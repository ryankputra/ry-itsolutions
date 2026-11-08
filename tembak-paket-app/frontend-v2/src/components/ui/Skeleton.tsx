import React from "react";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
  variant?: "rectangular" | "circular" | "rounded" | "pill";
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className = "",
  variant = "rounded",
  width,
  height,
  style,
  ...props
}: SkeletonProps) {
  const variantStyles = {
    rectangular: "rounded-none",
    rounded: "rounded-xl",
    circular: "rounded-full aspect-square",
    pill: "rounded-full",
  };

  const inlineStyles: React.CSSProperties = {
    ...style,
    ...(width !== undefined ? { width: typeof width === "number" ? `${width}px` : width } : {}),
    ...(height !== undefined ? { height: typeof height === "number" ? `${height}px` : height } : {}),
  };

  return (
    <div
      role="status"
      aria-label="Memuat konten..."
      className={`skeleton-shimmer bg-slate-200/80 dark:bg-zinc-800/80 ${variantStyles[variant]} ${className}`}
      style={inlineStyles}
      {...props}
    >
      <span className="sr-only">Memuat...</span>
    </div>
  );
}

export function SkeletonCard({ className = "" }: { className?: string }) {
  return (
    <div className={`p-5 rounded-2xl bg-parchment border border-hairline space-y-4 ${className}`}>
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" width={40} height={40} />
        <div className="space-y-1.5 flex-1">
          <Skeleton variant="rounded" height={14} className="w-1/2" />
          <Skeleton variant="rounded" height={10} className="w-1/3" />
        </div>
      </div>
      <Skeleton variant="rounded" height={48} className="w-full" />
      <div className="flex gap-2 pt-1">
        <Skeleton variant="pill" height={28} className="w-20" />
        <Skeleton variant="pill" height={28} className="w-24" />
      </div>
    </div>
  );
}

export function SkeletonText({ lines = 3, className = "" }: { lines?: number; className?: string }) {
  return (
    <div className={`space-y-2 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="rounded"
          height={12}
          className={i === lines - 1 ? "w-2/3" : "w-full"}
        />
      ))}
    </div>
  );
}

export default Skeleton;

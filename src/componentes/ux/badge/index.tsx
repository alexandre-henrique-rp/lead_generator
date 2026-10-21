import type { HTMLAttributes, ReactNode } from "react";

export type BadgeVariant = "zinc" | "blue" | "emerald" | "amber" | "rose" | "indigo";
export type BadgeSize = "sm" | "md";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  size?: BadgeSize;
  children: ReactNode;
}

export default function Badge({
  variant = "zinc",
  size = "sm",
  children,
  className = "",
  ...props
}: BadgeProps) {
  const baseClasses = "inline-flex items-center font-medium rounded-md whitespace-nowrap select-none";

  const sizeClasses: Record<BadgeSize, string> = {
    sm: "px-2 py-0.5 text-xs gap-1",
    md: "px-2.5 py-1 text-xs gap-1.5",
  };

  const variantClasses: Record<BadgeVariant, string> = {
    zinc: "bg-slate-800 text-slate-300 border border-slate-700",
    blue: "bg-indigo-950/80 text-indigo-300 border border-indigo-800",
    emerald: "bg-emerald-950/80 text-emerald-400 border border-emerald-800",
    amber: "bg-amber-950/80 text-amber-300 border border-amber-800",
    rose: "bg-rose-950/80 text-rose-300 border border-rose-800",
    indigo: "bg-indigo-950/80 text-indigo-300 border border-indigo-800",
  };

  return (
    <span
      {...props}
      className={`${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}

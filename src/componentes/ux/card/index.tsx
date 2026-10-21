import type { HTMLAttributes, ReactNode } from "react";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  header?: ReactNode;
  footer?: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}

export default function Card({
  children,
  header,
  footer,
  padding = "md",
  className = "",
  ...props
}: CardProps) {
  const paddingClasses = {
    none: "p-0",
    sm: "p-3",
    md: "p-5",
    lg: "p-6 sm:p-8",
  };

  return (
    <div
      {...props}
      className={`rounded-xl border border-slate-800 bg-slate-900/90 text-slate-200 shadow-xs transition-shadow hover:shadow-sm ${className}`}
    >
      {header && (
        <div className="border-b border-slate-800/80 px-5 py-4 flex items-center justify-between">
          {header}
        </div>
      )}
      <div className={paddingClasses[padding]}>{children}</div>
      {footer && (
        <div className="border-t border-slate-800/80 bg-slate-950/60 px-5 py-3 rounded-b-xl flex items-center justify-between">
          {footer}
        </div>
      )}
    </div>
  );
}

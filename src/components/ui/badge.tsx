import type { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type BadgeVariant = "primary" | "neutral" | "verified" | "warning" | "error" | "success";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
}

export function Badge({ className, variant = "neutral", ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold",
        variant === "primary" && "bg-primary/10 text-primary",
        variant === "neutral" && "bg-black/5 text-ink-muted dark:bg-white/10 dark:text-ink-muted",
        variant === "verified" && "bg-secondary/10 text-secondary",
        variant === "warning" && "bg-warning/10 text-warning",
        variant === "error" && "bg-error/10 text-error",
        variant === "success" && "bg-success/10 text-success",
        className
      )}
      {...props}
    />
  );
}

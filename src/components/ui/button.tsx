import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "destructive";
export type ButtonSize = "sm" | "md";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", fullWidth = true, type = "button", ...props },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "btn-press inline-flex items-center justify-center gap-2 rounded-control font-heading font-semibold transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "h-12 px-4 text-sm" : "h-9 px-3 text-xs",
        variant === "primary" && "bg-primary text-white hover:bg-primary/90",
        variant === "outline" && "border border-primary text-primary hover:bg-primary/5",
        variant === "destructive" && "bg-error text-white hover:bg-error/90",
        fullWidth ? "w-full" : "w-auto",
        className
      )}
      {...props}
    />
  );
});

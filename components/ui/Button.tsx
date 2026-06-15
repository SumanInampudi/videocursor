import { ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "outline";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-brand-gradient text-charcoal font-semibold shadow-btn border border-brand-600/25 hover:brightness-[1.03] active:brightness-95 focus:ring-brand-500",
  secondary:
    "bg-surface-card text-charcoal font-medium border-2 border-brand-200 shadow-sm hover:bg-brand-50 hover:border-brand-300 focus:ring-brand-400 dark:border-brand-700/35 dark:hover:bg-brand-900/30 dark:hover:border-brand-600/50",
  outline:
    "bg-transparent text-brand-800 font-semibold border-2 border-brand-400 hover:bg-brand-50 focus:ring-brand-400 dark:text-brand-300 dark:hover:bg-brand-900/25",
  danger:
    "bg-danger text-white font-semibold shadow-sm hover:bg-red-700 border border-red-800/20 focus:ring-danger",
  ghost:
    "bg-transparent text-charcoal font-medium hover:bg-brand-100/80 hover:text-brand-900 focus:ring-brand-300 dark:hover:bg-brand-900/25 dark:hover:text-brand-100",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-[36px] rounded-lg px-3 py-1.5 text-xs",
  md: "min-h-[44px] rounded-lg px-4 py-2.5 text-sm",
  lg: "min-h-[48px] rounded-xl px-6 py-3 text-base",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", size = "md", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={cn(
          "inline-flex touch-target items-center justify-center gap-2 transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-background",
          "disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none",
          variants[variant],
          sizes[size],
          className
        )}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

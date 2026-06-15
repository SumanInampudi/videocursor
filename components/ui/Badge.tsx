import { cn } from "@/lib/cn";

type BadgeVariant =
  | "default"
  | "primary"
  | "warning"
  | "danger"
  | "success"
  | "info"
  | "outline";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-charcoal ring-1 ring-gray-200/80 dark:bg-brand-900/30 dark:ring-brand-700/40",
  primary: "bg-brand-100 text-brand-900 ring-1 ring-brand-300/60 dark:bg-brand-900/40 dark:text-brand-200 dark:ring-brand-700/50",
  warning: "bg-brand-50 text-brand-800 ring-1 ring-brand-400/50 dark:bg-brand-900/25 dark:text-brand-200",
  danger: "bg-danger-soft text-danger ring-1 ring-red-200 dark:ring-red-800/40",
  success: "bg-success-soft text-success ring-1 ring-green-200 dark:ring-green-800/40",
  info: "bg-sky-50 text-sky-800 ring-1 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-200 dark:ring-sky-800/40",
  outline: "bg-surface-card text-brand-800 ring-2 ring-brand-400 dark:text-brand-300",
};

export function Badge({ children, variant = "default", className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

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
  default: "bg-gray-100 text-charcoal ring-1 ring-gray-200/80",
  primary: "bg-brand-100 text-brand-900 ring-1 ring-brand-300/60",
  warning: "bg-brand-50 text-brand-800 ring-1 ring-brand-400/50",
  danger: "bg-danger-soft text-danger ring-1 ring-red-200",
  success: "bg-success-soft text-success ring-1 ring-green-200",
  info: "bg-sky-50 text-sky-800 ring-1 ring-sky-200",
  outline: "bg-white text-brand-800 ring-2 ring-brand-400",
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

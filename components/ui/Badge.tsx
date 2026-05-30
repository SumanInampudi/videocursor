type BadgeVariant = "default" | "warning" | "danger" | "success";

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
}

const variants: Record<BadgeVariant, string> = {
  default: "bg-gray-100 text-servora-charcoal",
  warning: "bg-yellow-50 text-yellow-800 border border-servora-yellow",
  danger: "bg-red-50 text-servora-red border border-servora-red",
  success: "bg-green-50 text-green-800 border border-green-300",
};

export function Badge({ children, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${variants[variant]}`}
    >
      {children}
    </span>
  );
}

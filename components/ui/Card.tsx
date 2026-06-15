import { cn } from "@/lib/cn";

type CardProps = {
  children: React.ReactNode;
  className?: string;
  padded?: boolean;
};

export function Card({ children, className, padded = true }: CardProps) {
  return <div className={cn(padded ? "card-padded" : "card", className)}>{children}</div>;
}

type CardHeaderProps = {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  className?: string;
};

export function CardHeader({ title, subtitle, action, className }: CardHeaderProps) {
  return (
    <div className={cn("card-header", className)}>
      <div>
        <h3 className="card-header-title">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-charcoal-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

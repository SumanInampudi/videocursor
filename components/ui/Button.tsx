import { ButtonHTMLAttributes, forwardRef } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variants: Record<ButtonVariant, string> = {
  primary:
    "bg-servora-yellow text-white hover:bg-[#e09515] focus:ring-servora-yellow",
  secondary:
    "bg-white text-servora-charcoal border border-gray-300 hover:bg-gray-50 focus:ring-gray-300",
  danger:
    "bg-servora-red text-white hover:bg-red-700 focus:ring-servora-red",
  ghost:
    "bg-transparent text-servora-charcoal hover:bg-gray-100 focus:ring-gray-300",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = "", variant = "primary", type = "button", ...props }, ref) => {
    return (
      <button
        ref={ref}
        type={type}
        className={`inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Button.displayName = "Button";

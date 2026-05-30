import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium text-servora-charcoal">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`rounded-md border border-gray-300 px-3 py-2 text-sm text-servora-charcoal placeholder:text-gray-400 focus:border-servora-yellow focus:outline-none focus:ring-1 focus:ring-servora-yellow disabled:bg-gray-50 ${error ? "border-servora-red" : ""} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-servora-red">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";

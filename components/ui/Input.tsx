import { InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className = "", label, hint, error, id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={cn("input-field", error && "input-field-error", className)}
          {...props}
        />
        {hint && !error && <span className="form-hint">{hint}</span>}
        {error && <span className="form-error">{error}</span>}
      </div>
    );
  }
);

Input.displayName = "Input";

import { TextareaHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/cn";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  hint?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", label, hint, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={textareaId} className="form-label">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={cn(
            "input-field min-h-[100px] resize-y",
            error && "input-field-error",
            className
          )}
          {...props}
        />
        {hint && !error && <span className="form-hint">{hint}</span>}
        {error && <span className="form-error">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

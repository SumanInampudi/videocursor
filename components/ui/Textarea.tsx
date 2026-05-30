import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = "", label, error, id, ...props }, ref) => {
    const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

    return (
      <div className="flex flex-col gap-1">
        {label && (
          <label htmlFor={textareaId} className="text-sm font-medium text-servora-charcoal">
            {label}
          </label>
        )}
        <textarea
          ref={ref}
          id={textareaId}
          className={`rounded-md border border-gray-300 px-3 py-2 text-sm text-servora-charcoal placeholder:text-gray-400 focus:border-servora-yellow focus:outline-none focus:ring-1 focus:ring-servora-yellow disabled:bg-gray-50 ${error ? "border-servora-red" : ""} ${className}`}
          {...props}
        />
        {error && <span className="text-xs text-servora-red">{error}</span>}
      </div>
    );
  }
);

Textarea.displayName = "Textarea";

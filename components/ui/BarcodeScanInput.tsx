"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type BarcodeScanInputProps = {
  onScan: (barcode: string) => void;
  placeholder?: string;
  disabled?: boolean;
};

/** Captures USB barcode scanner input (keyboard wedge ending with Enter). */
export function BarcodeScanInput({
  onScan,
  placeholder = "Scan barcode or type and press Enter…",
  disabled = false,
}: BarcodeScanInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");

  const submit = useCallback(() => {
    const code = value.trim().replace(/\D/g, "");
    if (code.length >= 8) {
      onScan(code);
      setValue("");
    }
  }, [onScan, value]);

  useEffect(() => {
    if (!disabled) {
      inputRef.current?.focus();
    }
  }, [disabled]);

  return (
    <div className="rounded-lg border-2 border-dashed border-servora-yellow/60 bg-yellow-50/50 p-4">
      <label className="mb-1 block text-sm font-medium text-servora-charcoal">
        Barcode scanner
      </label>
      <input
        ref={inputRef}
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        className="w-full rounded-md border border-gray-300 px-3 py-2 font-mono text-sm focus:border-servora-yellow focus:outline-none focus:ring-1 focus:ring-servora-yellow disabled:bg-gray-100"
        autoComplete="off"
      />
      <p className="mt-1 text-xs text-gray-500">
        Click here, then scan. Recipe codes start with 2; ingredients with 3.
      </p>
    </div>
  );
}

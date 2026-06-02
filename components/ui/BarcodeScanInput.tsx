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
    <div className="rounded-xl border-2 border-dashed border-brand-400 bg-brand-50/60 p-4 shadow-inset">
      <label className="form-label mb-2 block">Barcode scanner</label>
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
        className="input-field font-mono"
        autoComplete="off"
      />
      <p className="form-hint mt-2">
        Click here, then scan. Recipe codes start with 2; ingredients with 3.
      </p>
    </div>
  );
}

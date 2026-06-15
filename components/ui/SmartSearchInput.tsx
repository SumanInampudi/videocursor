"use client";

import { InputHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type SmartSearchInputProps = InputHTMLAttributes<HTMLInputElement> & {
  className?: string;
};

export function SmartSearchInput({ className, ...props }: SmartSearchInputProps) {
  return (
    <input
      type="search"
      autoComplete="off"
      spellCheck={false}
      className={cn("input-field", className)}
      {...props}
    />
  );
}


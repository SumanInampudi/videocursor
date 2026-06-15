"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";
import {
  categoryKeysEqual,
  findSimilarCategories,
  formatCategoryLabel,
  mergeUniqueCategories,
  rankCategoriesForQuery,
} from "@/lib/category-resolve";

type CategoryComboboxProps = {
  name: string;
  label?: string;
  categories: string[];
  defaultValue?: string;
  value?: string;
  onChange?: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  hint?: string;
};

export function CategoryCombobox({
  name,
  label,
  categories,
  defaultValue = "",
  value: controlledValue,
  onChange,
  error,
  required,
  disabled,
  readOnly,
  placeholder = "Choose or type a category",
  hint = "Pick existing or type a new one — duplicates are merged automatically.",
}: CategoryComboboxProps) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const isControlled = controlledValue !== undefined;
  const [internalValue, setInternalValue] = useState(defaultValue);
  const [query, setQuery] = useState(defaultValue);
  const [open, setOpen] = useState(false);

  const value = isControlled ? controlledValue : internalValue;
  const options = useMemo(() => mergeUniqueCategories(categories), [categories]);

  const matches = useMemo(() => {
    const ranked = rankCategoriesForQuery(query, options);
    return ranked.slice(0, 12);
  }, [query, options]);

  const formattedNew = formatCategoryLabel(query);
  const hasExact = options.some((c) => categoryKeysEqual(c, query));
  const fuzzyHints = useMemo(
    () => (hasExact || !query.trim() ? [] : findSimilarCategories(query, options).slice(0, 3)),
    [hasExact, query, options]
  );
  const showCreate =
    !readOnly &&
    !disabled &&
    formattedNew.length > 0 &&
    !hasExact &&
    fuzzyHints.length === 0;

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  function commit(next: string) {
    if (isControlled) {
      onChange?.(next);
    } else {
      setInternalValue(next);
    }
    setQuery(next);
    setOpen(false);
  }

  const inputId = label?.toLowerCase().replace(/\s+/g, "-") ?? name;

  if (readOnly) {
    return (
      <div className="flex flex-col gap-1.5">
        {label && <span className="form-label">{label}</span>}
        <input
          type="text"
          readOnly
          value={value}
          className="input-field bg-gray-50"
          aria-readonly
        />
        <input type="hidden" name={name} value={value} />
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative flex flex-col gap-1.5">
      {label && (
        <label htmlFor={inputId} className="form-label">
          {label}
          {required ? " *" : ""}
        </label>
      )}
      <input type="hidden" name={name} value={value} />
      <input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        value={query}
        onChange={(event) => {
          const next = event.target.value;
          setQuery(next);
          if (isControlled) onChange?.(next);
          else setInternalValue(next);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
          if (event.key === "Enter" && matches[0] && !showCreate) {
            event.preventDefault();
            commit(matches[0]!);
          }
        }}
        className={cn("input-field", error && "input-field-error")}
      />

      {open && !disabled && (matches.length > 0 || showCreate || fuzzyHints.length > 0) && (
        <ul
          id={listId}
          role="listbox"
          className="absolute left-0 right-0 top-full z-20 mt-1 max-h-48 overflow-y-auto rounded-md border border-gray-200 bg-white py-1 shadow-lg"
        >
          {matches.map((category) => (
            <li key={category}>
              <button
                type="button"
                role="option"
                className="w-full px-3 py-2 text-left text-sm hover:bg-brand-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(category)}
              >
                {category}
              </button>
            </li>
          ))}
          {fuzzyHints.map((category) => (
            <li key={`fuzzy-${category}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm text-amber-900 hover:bg-amber-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(category)}
              >
                Did you mean <span className="font-semibold">{category}</span>?
              </button>
            </li>
          ))}
          {showCreate && (
            <li>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm font-medium text-brand-800 hover:bg-brand-50"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => commit(formattedNew)}
              >
                Create &ldquo;{formattedNew}&rdquo;
              </button>
            </li>
          )}
        </ul>
      )}

      {hint && !error && <span className="form-hint">{hint}</span>}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}

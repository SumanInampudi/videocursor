"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastType = "success" | "error" | "info";

type ToastItem = {
  id: number;
  message: string;
  type: ToastType;
};

type ToastContextValue = {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

let nextId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: number) => {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const add = useCallback((message: string, type: ToastType = "info") => {
    const id = ++nextId;
    setItems((prev) => [...prev, { id, message, type }]);
    setTimeout(() => dismiss(id), 4500);
  }, [dismiss]);

  const value = useMemo(
    () => ({
      toast: add,
      success: (m: string) => add(m, "success"),
      error: (m: string) => add(m, "error"),
    }),
    [add]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2"
        aria-live="polite"
      >
        {items.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto rounded-xl border-2 px-4 py-3 text-sm font-medium shadow-card ${
              t.type === "success"
                ? "border-green-300 bg-success-soft text-success dark:border-green-700/50"
                : t.type === "error"
                  ? "border-red-300 bg-danger-soft text-danger dark:border-red-700/50"
                  : "border-brand-300 bg-brand-50 text-brand-900 dark:border-brand-700/50 dark:bg-brand-900/30 dark:text-brand-200"
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

/** Browser confirm wrapped for destructive actions. */
export function confirmAction(message: string): boolean {
  return typeof window !== "undefined" && window.confirm(message);
}

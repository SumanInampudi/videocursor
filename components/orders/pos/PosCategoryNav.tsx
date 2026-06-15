"use client";

type PosCategoryNavProps = {
  categories: string[];
  selected: string;
  onSelect: (key: string) => void;
  variant?: "sidebar" | "pills";
};

const SPECIAL = [
  { key: "frequent", label: "★ Frequent" },
  { key: "all", label: "All items" },
];

export function PosCategoryNav({
  categories,
  selected,
  onSelect,
  variant = "sidebar",
}: PosCategoryNavProps) {
  const items = [...SPECIAL, ...categories.map((c) => ({ key: c, label: c }))];

  if (variant === "pills") {
    return (
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {items.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => onSelect(item.key)}
            className={`touch-target shrink-0 rounded-full px-4 py-2 text-sm font-medium transition ${
              selected === item.key
                ? "bg-servora-yellow text-white"
                : "bg-surface-card text-gray-700 border border-gray-200"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    );
  }

  return (
    <nav className="flex h-full flex-col gap-1 overflow-y-auto p-2">
      {items.map((item) => (
        <button
          key={item.key}
          type="button"
          onClick={() => onSelect(item.key)}
          className={`touch-target rounded-lg px-3 py-3 text-left text-sm font-medium transition ${
            selected === item.key
              ? "bg-servora-yellow text-white"
              : "text-gray-700 hover:bg-surface-card"
          }`}
        >
          {item.label}
        </button>
      ))}
    </nav>
  );
}

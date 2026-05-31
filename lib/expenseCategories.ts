export const EXPENSE_CATEGORIES = [
  { value: "RENT", label: "Rent" },
  { value: "SALARIES", label: "Salaries & wages" },
  { value: "UTILITIES", label: "Utilities" },
  { value: "SUPPLIES", label: "Supplies" },
  { value: "MARKETING", label: "Marketing" },
  { value: "EQUIPMENT", label: "Equipment" },
  { value: "INSURANCE", label: "Insurance" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "OTHER", label: "Other" },
] as const;

export type ExpenseCategoryValue = (typeof EXPENSE_CATEGORIES)[number]["value"];

export function expenseCategoryLabel(value: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

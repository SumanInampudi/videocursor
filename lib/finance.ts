export type ProfitLossSummary = {
  from: Date;
  to: Date;
  periodMonths?: string[];
  orderCount: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number | null;
  operatingExpenses: number;
  /** COGS + operating expenses — total spending against revenue in this view */
  totalCosts: number;
  netProfit: number;
  netMarginPercent: number | null;
  expensesByCategory: { category: string; total: number }[];
};

export function aggregateProfitLoss(input: {
  from: Date;
  to: Date;
  lineItems: {
    revenue: { toString(): string } | null;
    ingredientCost: { toString(): string } | null;
    profit: { toString(): string } | null;
  }[];
  expenses: { category: string; amount: { toString(): string } }[];
  orderCount: number;
}): ProfitLossSummary {
  let revenue = 0;
  let cogs = 0;
  let grossProfit = 0;

  for (const line of input.lineItems) {
    const lineRevenue = line.revenue != null ? Number(line.revenue) : 0;
    revenue += lineRevenue;
    if (line.ingredientCost != null) {
      cogs += Number(line.ingredientCost);
    }
    if (line.profit != null) {
      grossProfit += Number(line.profit);
    } else if (line.revenue != null && line.ingredientCost != null) {
      grossProfit += lineRevenue - Number(line.ingredientCost);
    }
  }

  const expensesByCategoryMap = new Map<string, number>();
  let operatingExpenses = 0;

  for (const expense of input.expenses) {
    const amount = Number(expense.amount);
    operatingExpenses += amount;
    expensesByCategoryMap.set(
      expense.category,
      (expensesByCategoryMap.get(expense.category) ?? 0) + amount
    );
  }

  const totalCosts = cogs + operatingExpenses;
  const netProfit = grossProfit - operatingExpenses;

  return {
    from: input.from,
    to: input.to,
    orderCount: input.orderCount,
    revenue,
    cogs,
    grossProfit,
    grossMarginPercent: revenue > 0 ? (grossProfit / revenue) * 100 : null,
    operatingExpenses,
    totalCosts,
    netProfit,
    netMarginPercent: revenue > 0 ? (netProfit / revenue) * 100 : null,
    expensesByCategory: Array.from(expensesByCategoryMap.entries())
      .map(([category, total]) => ({ category, total }))
      .sort((a, b) => b.total - a.total),
  };
}

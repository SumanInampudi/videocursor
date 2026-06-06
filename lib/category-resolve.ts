/**
 * Category normalization and duplicate detection (exact + fuzzy).
 * Used by forms (client suggestions) and server actions (canonical storage).
 */

function normalizeKey(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0]!;
    dp[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j]!;
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j]! + 1, dp[j - 1]! + 1, prev + cost);
      prev = temp;
    }
  }
  return dp[b.length]!;
}

/** Title-case each word for new categories. */
export function formatCategoryLabel(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  return trimmed
    .split(" ")
    .map((word) => {
      if (!word) return word;
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    })
    .join(" ");
}

export function mergeUniqueCategories(...lists: string[][]): string[] {
  const seen = new Map<string, string>();
  for (const list of lists) {
    for (const raw of list) {
      const trimmed = raw.trim();
      if (!trimmed) continue;
      const key = normalizeKey(trimmed);
      if (!seen.has(key)) seen.set(key, trimmed);
    }
  }
  return [...seen.values()].sort((a, b) => a.localeCompare(b));
}

export function categoryKeysEqual(a: string, b: string): boolean {
  return normalizeKey(a) === normalizeKey(b);
}

/** Existing categories similar to input (typo tolerance). */
export function findSimilarCategories(input: string, existing: string[]): string[] {
  const key = normalizeKey(input);
  if (!key) return [];

  const maxDist = key.length >= 8 ? 2 : 1;
  return existing.filter((candidate) => {
    const candidateKey = normalizeKey(candidate);
    if (candidateKey === key) return true;
    return levenshteinDistance(key, candidateKey) <= maxDist;
  });
}

export type CategoryResolveResult =
  | { ok: true; category: string }
  | { ok: false; message: string; suggestions: string[] };

/** Pick canonical category string to store (server authority). */
export function resolveCategory(input: string, existing: string[]): CategoryResolveResult {
  const trimmed = input.trim();
  if (!trimmed) {
    return { ok: false, message: "Category is required", suggestions: [] };
  }

  const exact = existing.find((c) => categoryKeysEqual(c, trimmed));
  if (exact) return { ok: true, category: exact };

  const similar = findSimilarCategories(trimmed, existing);
  if (similar.length === 1) {
    return { ok: true, category: similar[0]! };
  }
  if (similar.length > 1) {
    return {
      ok: false,
      message: `Similar categories already exist: ${similar.join(", ")}`,
      suggestions: similar,
    };
  }

  return { ok: true, category: formatCategoryLabel(trimmed) };
}

/** Rank categories for combobox: exact/prefix first, then fuzzy. */
export function rankCategoriesForQuery(query: string, categories: string[]): string[] {
  const q = normalizeKey(query);
  if (!q) return categories;

  const scored = categories.map((category) => {
    const key = normalizeKey(category);
    let score = 0;
    if (key === q) score = 100;
    else if (key.startsWith(q)) score = 80;
    else if (key.includes(q)) score = 60;
    else if (findSimilarCategories(query, [category]).length > 0) score = 40;
    else score = 0;
    return { category, score };
  });

  return scored
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.category.localeCompare(b.category))
    .map((row) => row.category);
}

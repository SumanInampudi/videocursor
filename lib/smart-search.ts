function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(text: string): string[] {
  return normalize(text)
    .split(" ")
    .filter(Boolean);
}

function levenshteinAtMost(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  const dp = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = dp[0];
    dp[0] = i;
    let rowMin = dp[0];
    for (let j = 1; j <= b.length; j++) {
      const temp = dp[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[j] = Math.min(dp[j] + 1, dp[j - 1] + 1, prev + cost);
      prev = temp;
      if (dp[j] < rowMin) rowMin = dp[j];
    }
    if (rowMin > max) return false;
  }
  return dp[b.length] <= max;
}

function termMatches(term: string, indexedText: string, indexedWords: string[]): boolean {
  if (!term) return true;
  if (indexedText.includes(term)) return true;

  // Fuzzy tolerance for short typos (e.g. "sprte" => "sprite")
  const maxDistance = term.length >= 8 ? 2 : 1;
  return indexedWords.some((w) => levenshteinAtMost(term, w, maxDistance));
}

function maxEditDistance(term: string) {
  return term.length >= 8 ? 2 : 1;
}

function termScore(
  term: string,
  primaryText: string,
  indexedText: string,
  indexedWords: string[]
): number {
  if (!term) return 0;

  const primary = normalize(primaryText);
  if (primary === term) return 200;
  if (primary.startsWith(term)) return 90;
  if (primary.includes(term)) return 60;
  if (indexedText.includes(term)) return 35;

  const fuzzyWord = indexedWords.find((w) =>
    levenshteinAtMost(term, w, maxEditDistance(term))
  );
  if (fuzzyWord) return 18;

  return -1;
}

/**
 * Reusable smart search with multi-term AND semantics and typo tolerance.
 */
export function smartMatches(haystackFields: Array<string | null | undefined>, query: string): boolean {
  return smartSearchScore(haystackFields, query) > 0 || !normalize(query);
}

/**
 * Score a row for ranking search results (higher = better match).
 * Multi-word queries use AND semantics across all terms.
 */
export function smartSearchScore(
  haystackFields: Array<string | null | undefined>,
  query: string
): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return 0;

  const primary = haystackFields[0] ?? "";
  const indexedText = normalize(haystackFields.filter(Boolean).join(" "));
  const indexedWords = words(indexedText);
  const terms = words(normalizedQuery);

  let total = 0;
  for (const term of terms) {
    const score = termScore(term, primary, indexedText, indexedWords);
    if (score < 0) return 0;
    total += score;
  }
  return total;
}

export function filterAndRankSmartSearch<T>(
  items: T[],
  query: string,
  getFields: (item: T) => Array<string | null | undefined>
): T[] {
  const q = query.trim();
  if (!q) return items;

  return items
    .map((item) => ({
      item,
      score: smartSearchScore(getFields(item), q),
      name: normalize(getFields(item)[0] ?? ""),
    }))
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
    .map((row) => row.item);
}


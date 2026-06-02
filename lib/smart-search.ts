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

/**
 * Reusable smart search with multi-term AND semantics and typo tolerance.
 */
export function smartMatches(haystackFields: Array<string | null | undefined>, query: string): boolean {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) return true;

  const indexedText = normalize(haystackFields.filter(Boolean).join(" "));
  const indexedWords = words(indexedText);
  const terms = words(normalizedQuery);

  return terms.every((term) => termMatches(term, indexedText, indexedWords));
}


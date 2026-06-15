/** Parse POS quick-add phrases like "1 qty 5" (code 1, quantity 5). */

export type PosQuickAddCommand = {
  posCode: number;
  quantity: number;
};

const NUMBER_WORDS: Record<string, number> = {
  zero: 0,
  oh: 0,
  one: 1,
  two: 2,
  three: 3,
  four: 4,
  five: 5,
  six: 6,
  seven: 7,
  eight: 8,
  nine: 9,
  ten: 10,
  eleven: 11,
  twelve: 12,
  thirteen: 13,
  fourteen: 14,
  fifteen: 15,
  sixteen: 16,
  seventeen: 17,
  eighteen: 18,
  nineteen: 19,
  twenty: 20,
};

/** Normalize spoken text: "one qty five" → "1 qty 5". */
export function normalizePosQuickAddInput(raw: string): string {
  const tokens = raw
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  return tokens
    .map((token) => {
      if (/^\d+$/.test(token)) return token;
      const word = NUMBER_WORDS[token];
      return word != null ? String(word) : token;
    })
    .join(" ")
    .trim();
}

export function parsePosQuickAdd(raw: string): PosQuickAddCommand | null {
  const text = normalizePosQuickAddInput(raw);
  if (!text) return null;

  const qtyPattern = text.match(/^(\d+)\s*(?:qty|quantity)\s*(\d+)$/i);
  if (qtyPattern) {
    const posCode = Number(qtyPattern[1]);
    const quantity = Number(qtyPattern[2]);
    if (posCode >= 1 && quantity >= 1) return { posCode, quantity };
  }

  const xPattern = text.match(/^(\d+)\s*[x×]\s*(\d+)$/i);
  if (xPattern) {
    const posCode = Number(xPattern[1]);
    const quantity = Number(xPattern[2]);
    if (posCode >= 1 && quantity >= 1) return { posCode, quantity };
  }

  const single = text.match(/^(\d+)$/);
  if (single) {
    const posCode = Number(single[1]);
    if (posCode >= 1) return { posCode, quantity: 1 };
  }

  return null;
}

export function findProductByPosCode<
  T extends { posCode?: number | null },
>(products: T[], posCode: number): T | undefined {
  return products.find((product) => product.posCode === posCode);
}

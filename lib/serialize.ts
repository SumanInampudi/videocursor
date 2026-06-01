/** Serialize Prisma results (Decimal, Date) for Server → Client components. */
export function serializeForClient<T>(value: T): T {
  return JSON.parse(
    JSON.stringify(value, (_key, v) => {
      if (typeof v === "object" && v !== null && "toNumber" in v) {
        const n = (v as { toNumber: () => number }).toNumber();
        if (!Number.isNaN(n)) return n;
      }
      if (v instanceof Date) return v.toISOString();
      return v;
    })
  ) as T;
}

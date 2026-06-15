/**
 * Canonical order sequence for Servora: FIFO by when the order was received (`createdAt` asc).
 * Use for orders list, kitchen columns, customer queue, and status boards.
 */
export function compareByReceivedAt(
  a: { createdAt: Date | string },
  b: { createdAt: Date | string }
): number {
  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export function sortOrdersByReceived<T extends { createdAt: Date | string }>(
  orders: T[]
): T[] {
  return [...orders].sort(compareByReceivedAt);
}

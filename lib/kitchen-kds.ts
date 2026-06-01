/** Kitchen display helpers (client + server safe). */

export type KitchenLineView = {
  id: string;
  quantity: number;
  recipeName: string;
  addedAt: Date | string;
  kitchenDoneAt?: Date | string | null;
  kitchenDoneQty?: number;
};

export type KitchenOrderView = {
  kitchenAcknowledgedAt?: Date | string | null;
  kitchenBumpedAt?: Date | string | null;
  lineItems: KitchenLineView[];
};

function toMs(d: Date | string | null | undefined): number | null {
  if (d == null) return null;
  const t = new Date(d).getTime();
  return Number.isNaN(t) ? null : t;
}

export function kitchenPendingQty(line: KitchenLineView): number {
  const done = Math.min(line.quantity, Math.max(0, line.kitchenDoneQty ?? 0));
  return Math.max(0, line.quantity - done);
}

export function isKitchenLineDone(line: KitchenLineView): boolean {
  return kitchenPendingQty(line) <= 0;
}

/**
 * NEW badge: only lines with pending work that are part of the latest bump
 * (not every line when ack was cleared).
 */
export function isKitchenLineNew(
  line: KitchenLineView,
  order: Pick<KitchenOrderView, "kitchenAcknowledgedAt" | "kitchenBumpedAt">
): boolean {
  const pending = kitchenPendingQty(line);
  if (pending <= 0) return false;

  const ack = toMs(order.kitchenAcknowledgedAt);
  const bumped = toMs(order.kitchenBumpedAt);
  const added = toMs(line.addedAt);

  if (bumped != null && ack != null && bumped > ack) {
    if (added != null && added >= bumped - 500) return true;
    if (added != null && added < bumped) return true;
    return false;
  }

  if (ack != null && added != null && added > ack) return true;

  if (ack == null && bumped != null && added != null && added >= bumped - 500) {
    return true;
  }

  return false;
}

export function kitchenLineProgress(lineItems: KitchenLineView[]): {
  done: number;
  total: number;
} {
  const total = lineItems.reduce((s, l) => s + l.quantity, 0);
  const done = lineItems.reduce(
    (s, l) => s + Math.min(l.quantity, Math.max(0, l.kitchenDoneQty ?? 0)),
    0
  );
  return { done, total };
}

/** Order has unacknowledged bump or any new pending line. */
export function orderNeedsKitchenAttention(order: KitchenOrderView): boolean {
  const bumped = toMs(order.kitchenBumpedAt);
  const ack = toMs(order.kitchenAcknowledgedAt);
  if (bumped != null && (ack == null || bumped > ack)) return true;
  return order.lineItems.some((l) => isKitchenLineNew(l, order));
}

export function countNewKitchenLines(order: KitchenOrderView): number {
  return order.lineItems.reduce((sum, l) => {
    if (!isKitchenLineNew(l, order)) return sum;
    return sum + kitchenPendingQty(l);
  }, 0);
}

/** Kitchen column sort: bumped & unacknowledged first, then FIFO. */
export function compareKitchenBoardOrder(
  a: KitchenOrderView & { createdAt: Date | string },
  b: KitchenOrderView & { createdAt: Date | string }
): number {
  const aAttention = orderNeedsKitchenAttention(a) ? 1 : 0;
  const bAttention = orderNeedsKitchenAttention(b) ? 1 : 0;
  if (aAttention !== bAttention) return bAttention - aAttention;

  const aBump = toMs(a.kitchenBumpedAt) ?? 0;
  const bBump = toMs(b.kitchenBumpedAt) ?? 0;
  if (aBump !== bBump) return bBump - aBump;

  return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
}

export function sortKitchenBoardOrders<
  T extends KitchenOrderView & { createdAt: Date | string },
>(orders: T[]): T[] {
  return [...orders].sort(compareKitchenBoardOrder);
}

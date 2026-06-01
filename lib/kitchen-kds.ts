/** Kitchen display helpers (client + server safe). */

export type KitchenLineView = {
  id: string;
  quantity: number;
  recipeName: string;
  addedAt: Date | string;
  kitchenDoneAt?: Date | string | null;
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

/** Line still needs cook attention (new since last ack or not marked done). */
export function isKitchenLineNew(
  line: KitchenLineView,
  order: Pick<KitchenOrderView, "kitchenAcknowledgedAt">
): boolean {
  if (line.kitchenDoneAt) return false;
  const ack = toMs(order.kitchenAcknowledgedAt);
  const added = toMs(line.addedAt);
  if (added == null) return true;
  if (ack == null) return true;
  return added > ack;
}

export function isKitchenLineDone(line: KitchenLineView): boolean {
  return line.kitchenDoneAt != null;
}

export function kitchenLineProgress(lineItems: KitchenLineView[]): {
  done: number;
  total: number;
} {
  const total = lineItems.length;
  const done = lineItems.filter((l) => isKitchenLineDone(l)).length;
  return { done, total };
}

/** Order has unacknowledged bump or any new/undone line. */
export function orderNeedsKitchenAttention(order: KitchenOrderView): boolean {
  const bumped = toMs(order.kitchenBumpedAt);
  const ack = toMs(order.kitchenAcknowledgedAt);
  if (bumped != null && (ack == null || bumped > ack)) return true;
  return order.lineItems.some((l) => isKitchenLineNew(l, order));
}

export function countNewKitchenLines(order: KitchenOrderView): number {
  return order.lineItems.filter((l) => isKitchenLineNew(l, order)).length;
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

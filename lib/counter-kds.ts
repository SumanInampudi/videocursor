/** Counter / retail pickup display helpers (client + server safe). */

import type { OrderStatus } from "@prisma/client";
import {
  compareKitchenBoardOrder,
  countNewKitchenLines,
  kitchenLineProgress,
  kitchenPendingQty,
  isKitchenLineDone,
  isKitchenLineNew,
  orderNeedsKitchenAttention,
  sortKitchenBoardOrders,
  type KitchenLineView,
  type KitchenOrderView,
  type KitchenPrepAggregateInputOrder,
  type KitchenPrepAggregateRow,
  type KitchenPrepAggregateTicket,
  buildKitchenPrepAggregate,
} from "@/lib/kitchen-kds";

export type CounterLineView = KitchenLineView;
export type CounterOrderView = KitchenOrderView;

export const counterPendingQty = kitchenPendingQty;
export const isCounterLineDone = isKitchenLineDone;
export const isCounterLineNew = isKitchenLineNew;
export const counterLineProgress = kitchenLineProgress;
export const orderNeedsCounterAttention = orderNeedsKitchenAttention;
export const countNewCounterLines = countNewKitchenLines;
export const compareCounterBoardOrder = compareKitchenBoardOrder;
export const sortCounterBoardOrders = sortKitchenBoardOrders;

export type CounterPrepAggregateInputOrder = KitchenPrepAggregateInputOrder;
export type CounterPrepAggregateRow = KitchenPrepAggregateRow;
export type CounterPrepAggregateTicket = KitchenPrepAggregateTicket;

/** Roll up pending retail qty across New + Picking tickets. */
export function buildCounterPrepAggregate(
  orders: CounterPrepAggregateInputOrder[]
): CounterPrepAggregateRow[] {
  return buildKitchenPrepAggregate(orders);
}

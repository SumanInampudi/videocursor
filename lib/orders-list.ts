import type { OrderPaymentMethod, OrderStatus } from "@prisma/client";

export const ORDERS_PAGE_SIZE = 100;

export type OrdersListQuery = {
  search?: string;
  status?: OrderStatus;
  payment?: OrderPaymentMethod | "unpaid";
  todayOnly?: boolean;
  page?: number;
};

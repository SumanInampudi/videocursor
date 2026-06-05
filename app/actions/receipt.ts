"use server";

import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { orderChannelLabel } from "@/lib/order-channel";
import { resolveOrderGrandTotal } from "@/lib/order-tax";
import { PAYMENT_METHOD_LABELS } from "@/lib/pos-payment";
import { serializeForClient } from "@/lib/serialize";
import type { OrderPaymentMethod } from "@prisma/client";

export type OrderReceiptLine = {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
};

export type OrderReceiptData = {
  businessName: string;
  orderId: string;
  orderNumber: string;
  createdAt: string;
  paidAt: string | null;
  channelLabel: string;
  tableLabel: string | null;
  customerName: string | null;
  paymentMethodLabel: string | null;
  notes: string | null;
  lines: OrderReceiptLine[];
  subtotal: number;
  discountTotal: number;
  pricesIncludeTax: boolean;
  gstRatePercent: number;
  taxSupplyType: string | null;
  taxableAmount: number;
  cgstPercent: number;
  sgstPercent: number;
  igstPercent: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  taxTotal: number;
  tipAmount: number;
  grandTotal: number;
  taxGstin: string | null;
  taxLegalName: string | null;
};

export async function getOrderReceipt(
  orderId: string
): Promise<{ receipt: OrderReceiptData } | { error: string }> {
  const { businessId } = await requireBusinessContext();

  const [business, order] = await Promise.all([
    db.business.findUnique({
      where: { id: businessId },
      select: { name: true },
    }),
    db.order.findFirst({
      where: { id: orderId, businessId },
      include: {
        lineItems: {
          orderBy: { id: "asc" },
          include: { product: { select: { name: true } } },
        },
      },
    }),
  ]);

  if (!order || !business) {
    return { error: "Order not found" };
  }

  const lines: OrderReceiptLine[] = order.lineItems.map((line) => {
    const unitPrice = Number(line.unitSalePrice);
    const lineTotal =
      line.revenue != null ? Number(line.revenue) : unitPrice * line.quantity;
    return {
      name: line.product?.name ?? line.productName,
      quantity: line.quantity,
      unitPrice,
      lineTotal,
    };
  });

  const receipt: OrderReceiptData = {
    businessName: business.name,
    orderId: order.id,
    orderNumber: order.orderNumber,
    createdAt: order.createdAt.toISOString(),
    paidAt: order.paidAt?.toISOString() ?? null,
    channelLabel: orderChannelLabel(order.channel),
    tableLabel: order.tableLabel,
    customerName: order.customerName,
    paymentMethodLabel: order.paymentMethod
      ? PAYMENT_METHOD_LABELS[order.paymentMethod as OrderPaymentMethod]
      : null,
    notes: order.notes,
    lines,
    subtotal: Number(order.subtotal ?? 0),
    discountTotal: Number(order.discountTotal ?? 0),
    pricesIncludeTax: order.pricesIncludeTax,
    gstRatePercent: Number(order.gstRatePercent ?? 0),
    taxSupplyType: order.taxSupplyType,
    taxableAmount: Number(order.taxableAmount ?? 0),
    cgstPercent: Number(order.cgstPercent ?? 0),
    sgstPercent: Number(order.sgstPercent ?? 0),
    igstPercent: Number(order.igstPercent ?? 0),
    cgstAmount: Number(order.cgstAmount ?? 0),
    sgstAmount: Number(order.sgstAmount ?? 0),
    igstAmount: Number(order.igstAmount ?? 0),
    taxTotal: Number(order.taxTotal ?? 0),
    tipAmount: Number(order.tipAmount ?? 0),
    grandTotal: resolveOrderGrandTotal(order),
    taxGstin: order.taxGstin,
    taxLegalName: order.taxLegalName,
  };

  return { receipt: serializeForClient(receipt) as OrderReceiptData };
}

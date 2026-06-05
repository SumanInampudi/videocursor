export type OrderCartLine = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string | null;
};

export type PricedProduct = {
  id: string;
  name: string;
  category?: string;
  salePrice: { toString(): string } | number | null;
  prepTimeMinutes?: number | null;
  barcode?: string;
  imageUrl?: string | null;
};

export function addToOrderCart(
  cart: OrderCartLine[],
  product: PricedProduct,
  qty = 1
): { cart: OrderCartLine[]; error?: string } {
  if (product.salePrice == null) {
    return {
      cart,
      error: `"${product.name}" has no sale price — set it on Product pricing first.`,
    };
  }
  const unitPrice = Number(product.salePrice);
  const existing = cart.find((l) => l.productId === product.id);
  if (existing) {
    return {
      cart: cart.map((l) =>
        l.productId === product.id ? { ...l, quantity: l.quantity + qty } : l
      ),
    };
  }
  return {
    cart: [
      ...cart,
      {
        productId: product.id,
        name: product.name,
        quantity: qty,
        unitPrice,
        imageUrl: product.imageUrl ?? null,
      },
    ],
  };
}

export function updateCartLineQty(
  cart: OrderCartLine[],
  productId: string,
  quantity: number
): OrderCartLine[] {
  if (quantity < 1) return cart.filter((l) => l.productId !== productId);
  return cart.map((l) => (l.productId === productId ? { ...l, quantity } : l));
}

export function cartSubtotal(cart: OrderCartLine[]) {
  return cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
}

export function buildOrderFormData(
  cart: OrderCartLine[],
  fields: {
    customerId?: string;
    customerName?: string;
    discountCode?: string;
    notes?: string;
    paymentMethod?: string;
    channel?: string;
    diningTableId?: string;
    externalRef?: string;
    sendToKitchen?: boolean;
    existingOrderId?: string;
    posFlow?: boolean;
    covers?: number;
    tipAmount?: number;
  }
): FormData {
  const formData = new FormData();
  if (fields.customerId) formData.set("customerId", fields.customerId);
  if (fields.customerName) formData.set("customerName", fields.customerName);
  if (fields.discountCode) formData.set("discountCode", fields.discountCode);
  if (fields.notes) formData.set("notes", fields.notes);
  if (fields.paymentMethod) formData.set("paymentMethod", fields.paymentMethod);
  if (fields.channel) formData.set("channel", fields.channel);
  if (fields.diningTableId) formData.set("diningTableId", fields.diningTableId);
  if (fields.externalRef) formData.set("externalRef", fields.externalRef);
  if (fields.sendToKitchen) formData.set("sendToKitchen", "true");
  if (fields.existingOrderId) formData.set("existingOrderId", fields.existingOrderId);
  if (fields.posFlow) formData.set("posFlow", "true");
  if (fields.covers != null) formData.set("covers", String(fields.covers));
  if (fields.tipAmount != null && fields.tipAmount > 0) {
    formData.set("tipAmount", String(fields.tipAmount));
  }
  formData.set("lineCount", String(cart.length));
  cart.forEach((line, i) => {
    formData.set(`line_${i}_productId`, line.productId);
    formData.set(`line_${i}_quantity`, String(line.quantity));
  });
  return formData;
}

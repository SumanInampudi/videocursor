"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { createOrder, previewCartStock } from "@/app/actions/orders";
import { OrderCustomerSection } from "@/components/orders/OrderCustomerSection";
import { OrderPromotionsPanel } from "@/components/orders/OrderPromotionsPanel";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { ProductMenuTile } from "@/components/products/ProductMenuTile";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import {
  addToOrderCart,
  cartSubtotal,
  updateCartLineQty,
  type OrderCartLine,
} from "@/lib/order-cart";
import { StockShortageAlert } from "@/components/orders/StockShortageAlert";
import { formatCurrency } from "@/lib/units";

type ProductOption = {
  id: string;
  name: string;
  salePrice: { toString(): string } | null;
  yieldUnit: string;
  imageUrl?: string | null;
};

type CustomerOption = { id: string; name: string };

type OrderFormProps = {
  products: ProductOption[];
  customers?: CustomerOption[];
};

export function OrderForm({ products, customers = [] }: OrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [cart, setCart] = useState<OrderCartLine[]>([]);
  const [discountAmount, setDiscountAmount] = useState(0);
  const [customerId, setCustomerId] = useState("");

  const pricedProducts = useMemo(
    () => products.filter((r) => r.salePrice != null),
    [products]
  );

  const addProductToCart = useCallback((product: ProductOption, qty = 1) => {
    setCart((prev) => {
      const { cart: next, error } = addToOrderCart(prev, product, qty);
      if (error) {
        setErrors({ lines: [error] });
        return prev;
      }
      setErrors((current) => {
        if (!current.lines) return current;
        const nextErrors = { ...current };
        delete nextErrors.lines;
        return nextErrors;
      });
      return next;
    });
  }, []);

  const subtotal = cartSubtotal(cart);
  const estimatedTotal = Math.max(0, subtotal - discountAmount);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (cart.length === 0) {
      setErrors({ lines: ["Add at least one item to the order"] });
      return;
    }

    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("lineCount", String(cart.length));
    cart.forEach((line, i) => {
      formData.set(`line_${i}_productId`, line.productId);
      formData.set(`line_${i}_quantity`, String(line.quantity));
    });

    startTransition(async () => {
      const stock = await previewCartStock(
        cart.map((l) => ({ productId: l.productId, quantity: l.quantity }))
      );
      if (!stock.ok) {
        setErrors({ stock: stock.issues });
        return;
      }
      const result = await createOrder(formData);
      if (result.error) {
        setErrors(result.error as Record<string, string[]>);
        return;
      }
      router.push(`/orders/${result.orderId}`);
      router.refresh();
    });
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-3xl space-y-6">
      <div>
        <h2 className="mb-2 text-sm font-semibold text-servora-charcoal">
          Quick add menu items
        </h2>
        {pricedProducts.length === 0 ? (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Set sale prices on{" "}
            <a href="/products/pricing" className="font-medium underline">
              product pricing
            </a>{" "}
            before placing orders.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pricedProducts.map((product) => (
              <ProductMenuTile
                key={product.id}
                name={product.name}
                price={Number(product.salePrice)}
                imageUrl={product.imageUrl}
                disabled={isPending}
                onClick={() => addProductToCart(product)}
                variant="order"
              />
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          <a href="/products/pricing" className="link-brand">
            Add menu photos on product pricing →
          </a>
        </p>
      </div>

      <OrderCustomerSection
        customers={customers}
        customerId={customerId}
        onCustomerIdChange={setCustomerId}
      />
      <Textarea name="notes" label="Order notes (optional)" rows={2} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-servora-charcoal">Order cart</h2>
        {cart.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            Tap an item above to add it to cart.
          </p>
        ) : (
          <ul className="space-y-2">
            {cart.map((line) => (
              <li
                key={line.productId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <ProductThumbnail name={line.name} imageUrl={line.imageUrl} size="sm" />
                  <div className="min-w-0">
                    <p className="font-medium text-servora-charcoal">{line.name}</p>
                    <p className="text-xs text-gray-500">
                      {formatCurrency(line.unitPrice)} each
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() =>
                      setCart((prev) => updateCartLineQty(prev, line.productId, line.quantity - 1))
                    }
                  >
                    −
                  </Button>
                  <span className="min-w-[2rem] text-center font-medium">{line.quantity}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() =>
                      setCart((prev) => updateCartLineQty(prev, line.productId, line.quantity + 1))
                    }
                  >
                    +
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    onClick={() =>
                      setCart((prev) => updateCartLineQty(prev, line.productId, 0))
                    }
                  >
                    Remove
                  </Button>
                  <span className="ml-2 font-semibold">
                    {formatCurrency(line.unitPrice * line.quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
        {errors.lines && (
          <p className="mt-2 text-sm text-servora-red">{errors.lines.join(", ")}</p>
        )}
      </div>

      <OrderPromotionsPanel
        subtotal={subtotal}
        channel="DINE_IN"
        customerId={customerId || undefined}
        cartLines={cart.map((line) => ({
          productId: line.productId,
          quantity: line.quantity,
        }))}
        onApplied={(payload) => setDiscountAmount(payload?.discountAmount ?? 0)}
      />

      <div className="rounded-lg bg-gray-50 p-4 space-y-1">
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-gray-600">
            <span>Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
        )}
        {discountAmount > 0 && (
          <div className="flex justify-between text-sm text-green-700">
            <span>Discount</span>
            <span>−{formatCurrency(discountAmount)}</span>
          </div>
        )}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Total</span>
          <span className="text-lg font-bold text-servora-charcoal">
            {formatCurrency(estimatedTotal)}
          </span>
        </div>
      </div>

      {errors.stock && errors.stock.length > 0 && (
        <StockShortageAlert issues={errors.stock} />
      )}

      <Button type="submit" disabled={isPending || cart.length === 0}>
        {isPending ? "Placing…" : "Place order"}
      </Button>
    </form>
  );
}

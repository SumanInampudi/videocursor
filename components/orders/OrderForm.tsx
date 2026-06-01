"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { createOrder, previewCartStock } from "@/app/actions/orders";
import { getRecipeByBarcode } from "@/app/actions/recipes";
import { OrderCustomerSection } from "@/components/orders/OrderCustomerSection";
import { OrderDiscountSection } from "@/components/orders/OrderDiscountSection";
import { BarcodeScanInput } from "@/components/ui/BarcodeScanInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { RecipeMenuTile } from "@/components/recipes/RecipeMenuTile";
import { RecipeThumbnail } from "@/components/recipes/RecipeThumbnail";
import { formatBarcodeDisplay } from "@/lib/barcode";
import {
  addToOrderCart,
  cartSubtotal,
  updateCartLineQty,
  type OrderCartLine,
} from "@/lib/order-cart";
import { StockShortageAlert } from "@/components/orders/StockShortageAlert";
import { formatCurrency } from "@/lib/units";

type RecipeOption = {
  id: string;
  name: string;
  salePrice: { toString(): string } | null;
  barcode: string;
  yieldUnit: string;
  imageUrl?: string | null;
};

type CustomerOption = { id: string; name: string };

type OrderFormProps = {
  recipes: RecipeOption[];
  customers?: CustomerOption[];
};

export function OrderForm({ recipes, customers = [] }: OrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [cart, setCart] = useState<OrderCartLine[]>([]);
  const [scanMessage, setScanMessage] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);

  const pricedRecipes = useMemo(
    () => recipes.filter((r) => r.salePrice != null),
    [recipes]
  );

  const addRecipeToCart = useCallback((recipe: RecipeOption, qty = 1) => {
    setCart((prev) => {
      const { cart: next, error } = addToOrderCart(prev, recipe, qty);
      if (error) {
        setScanMessage(error);
        return prev;
      }
      setScanMessage(`Added ${recipe.name}`);
      return next;
    });
  }, []);

  async function handleScan(barcode: string) {
    const recipe = await getRecipeByBarcode(barcode);
    if (!recipe) {
      setScanMessage("No recipe found for that barcode.");
      return;
    }
    addRecipeToCart(recipe as RecipeOption);
  }

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
      formData.set(`line_${i}_recipeId`, line.recipeId);
      formData.set(`line_${i}_quantity`, String(line.quantity));
    });

    startTransition(async () => {
      const stock = await previewCartStock(
        cart.map((l) => ({ recipeId: l.recipeId, quantity: l.quantity }))
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
      <BarcodeScanInput onScan={handleScan} disabled={isPending} />
      {scanMessage && (
        <p className="text-sm text-gray-600" role="status">
          {scanMessage}
        </p>
      )}

      <div>
        <h2 className="mb-2 text-sm font-semibold text-servora-charcoal">
          Quick add (tap or scan recipe barcode)
        </h2>
        {pricedRecipes.length === 0 ? (
          <p className="rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            Set sale prices on{" "}
            <a href="/recipes/pricing" className="font-medium underline">
              recipe pricing
            </a>{" "}
            before placing orders.
          </p>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {pricedRecipes.map((recipe) => (
              <RecipeMenuTile
                key={recipe.id}
                name={recipe.name}
                price={Number(recipe.salePrice)}
                imageUrl={recipe.imageUrl}
                disabled={isPending}
                onClick={() => addRecipeToCart(recipe)}
                variant="order"
                subtitle={
                  <span className="font-mono text-xs text-gray-400">
                    {formatBarcodeDisplay(recipe.barcode)}
                  </span>
                }
              />
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          <a href="/recipes/pricing" className="text-servora-yellow hover:underline">
            Add menu photos on recipe pricing →
          </a>
          {" · "}
          <a href="/recipes/barcodes" className="text-servora-yellow hover:underline">
            Printable barcodes
          </a>
        </p>
      </div>

      <OrderCustomerSection customers={customers} />
      <Textarea name="notes" label="Order notes (optional)" rows={2} />

      <div>
        <h2 className="mb-3 text-sm font-semibold text-servora-charcoal">Order cart</h2>
        {cart.length === 0 ? (
          <p className="rounded-lg border border-dashed border-gray-200 p-6 text-center text-sm text-gray-500">
            Scan a recipe barcode or tap a item above.
          </p>
        ) : (
          <ul className="space-y-2">
            {cart.map((line) => (
              <li
                key={line.recipeId}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 p-3"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <RecipeThumbnail name={line.name} imageUrl={line.imageUrl} size="sm" />
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
                      setCart((prev) => updateCartLineQty(prev, line.recipeId, line.quantity - 1))
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
                      setCart((prev) => updateCartLineQty(prev, line.recipeId, line.quantity + 1))
                    }
                  >
                    +
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    onClick={() =>
                      setCart((prev) => updateCartLineQty(prev, line.recipeId, 0))
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

      <OrderDiscountSection
        subtotal={subtotal}
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

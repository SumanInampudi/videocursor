"use client";

import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { createOrder } from "@/app/actions/orders";
import { getRecipeByBarcode } from "@/app/actions/recipes";
import { BarcodeScanInput } from "@/components/ui/BarcodeScanInput";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { formatBarcodeDisplay } from "@/lib/barcode";
import { formatCurrency } from "@/lib/units";

type RecipeOption = {
  id: string;
  name: string;
  salePrice: { toString(): string } | null;
  barcode: string;
  yieldUnit: string;
};

type CartLine = {
  recipeId: string;
  name: string;
  quantity: number;
  unitPrice: number;
};

type OrderFormProps = {
  recipes: RecipeOption[];
};

export function OrderForm({ recipes }: OrderFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [scanMessage, setScanMessage] = useState("");

  const pricedRecipes = useMemo(
    () => recipes.filter((r) => r.salePrice != null),
    [recipes]
  );

  const addRecipeToCart = useCallback(
    (recipe: RecipeOption, qty = 1) => {
      if (recipe.salePrice == null) {
        setScanMessage(`"${recipe.name}" has no sale price — set it on Recipe pricing first.`);
        return;
      }
      const unitPrice = Number(recipe.salePrice);
      setCart((prev) => {
        const existing = prev.find((l) => l.recipeId === recipe.id);
        if (existing) {
          return prev.map((l) =>
            l.recipeId === recipe.id ? { ...l, quantity: l.quantity + qty } : l
          );
        }
        return [
          ...prev,
          {
            recipeId: recipe.id,
            name: recipe.name,
            quantity: qty,
            unitPrice,
          },
        ];
      });
      setScanMessage(`Added ${recipe.name}`);
    },
    []
  );

  async function handleScan(barcode: string) {
    const recipe = await getRecipeByBarcode(barcode);
    if (!recipe) {
      setScanMessage("No recipe found for that barcode.");
      return;
    }
    addRecipeToCart(recipe as RecipeOption);
  }

  function updateQty(recipeId: string, quantity: number) {
    if (quantity < 1) {
      setCart((prev) => prev.filter((l) => l.recipeId !== recipeId));
      return;
    }
    setCart((prev) =>
      prev.map((l) => (l.recipeId === recipeId ? { ...l, quantity } : l))
    );
  }

  const estimatedTotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);

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
              <button
                key={recipe.id}
                type="button"
                disabled={isPending}
                onClick={() => addRecipeToCart(recipe)}
                className="rounded-lg border border-gray-200 bg-white p-3 text-left transition hover:border-servora-yellow hover:bg-yellow-50/40 disabled:opacity-50"
              >
                <div className="font-medium text-servora-charcoal">{recipe.name}</div>
                <div className="text-sm text-gray-600">
                  {formatCurrency(Number(recipe.salePrice))}
                </div>
                <div className="mt-1 font-mono text-xs text-gray-400">
                  {formatBarcodeDisplay(recipe.barcode)}
                </div>
              </button>
            ))}
          </div>
        )}
        <p className="mt-2 text-xs text-gray-500">
          <a href="/recipes/barcodes" className="text-servora-yellow hover:underline">
            View printable recipe barcodes →
          </a>
        </p>
      </div>

      <Input
        name="customerName"
        label="Customer name (optional)"
        placeholder="Walk-in, table 4, etc."
      />
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
                <div>
                  <p className="font-medium text-servora-charcoal">{line.name}</p>
                  <p className="text-xs text-gray-500">
                    {formatCurrency(line.unitPrice)} each
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() => updateQty(line.recipeId, line.quantity - 1)}
                  >
                    −
                  </Button>
                  <span className="min-w-[2rem] text-center font-medium">{line.quantity}</span>
                  <Button
                    type="button"
                    variant="secondary"
                    className="px-2 py-1 text-xs"
                    onClick={() => updateQty(line.recipeId, line.quantity + 1)}
                  >
                    +
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    className="px-2 py-1 text-xs"
                    onClick={() => updateQty(line.recipeId, 0)}
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

      <div className="flex items-center justify-between rounded-lg bg-gray-50 p-4">
        <span className="text-sm text-gray-600">Total</span>
        <span className="text-lg font-bold text-servora-charcoal">
          {formatCurrency(estimatedTotal)}
        </span>
      </div>

      <Button type="submit" disabled={isPending || cart.length === 0}>
        {isPending ? "Placing…" : "Place order"}
      </Button>
    </form>
  );
}

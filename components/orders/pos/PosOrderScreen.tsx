"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { createPosOrder } from "@/app/actions/orders";
import { getRecipeByBarcode } from "@/app/actions/recipes";
import { PosExitLink } from "@/components/layout/PosShell";
import { PosCartPanel } from "@/components/orders/pos/PosCartPanel";
import { PosCategoryNav } from "@/components/orders/pos/PosCategoryNav";
import { PosCheckoutModal } from "@/components/orders/pos/PosCheckoutModal";
import { PosItemGrid } from "@/components/orders/pos/PosItemGrid";
import { BarcodeScanInput } from "@/components/ui/BarcodeScanInput";
import { useToast } from "@/components/ui/Toast";
import {
  addToOrderCart,
  buildOrderFormData,
  cartSubtotal,
  updateCartLineQty,
  type OrderCartLine,
  type PricedRecipe,
} from "@/lib/order-cart";
import { getStayOnPosAfterCheckout } from "@/lib/pos-preferences";
import { PAYMENT_METHOD_LABELS, type PosPaymentMethod } from "@/lib/pos-payment";

type Recipe = PricedRecipe & { category: string; imageUrl?: string | null };

type CheckoutFields = {
  customerId: string;
  customerName: string;
  discountCode: string;
  notes: string;
};

type PosOrderScreenProps = {
  recipes: Recipe[];
  categories: string[];
  frequentIds: string[];
  customers: { id: string; name: string }[];
  showExitLink?: boolean;
};

export function PosOrderScreen({
  recipes,
  categories,
  frequentIds,
  customers,
  showExitLink = true,
}: PosOrderScreenProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<OrderCartLine[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("frequent");
  const [search, setSearch] = useState("");
  const [scanHint, setScanHint] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [checkoutFields, setCheckoutFields] = useState<CheckoutFields>({
    customerId: "",
    customerName: "",
    discountCode: "",
    notes: "",
  });
  const [lastPlaced, setLastPlaced] = useState<{
    orderId: string;
    orderNumber: string;
    paymentMethod: PosPaymentMethod;
  } | null>(null);

  const subtotal = cartSubtotal(cart);
  const total = Math.max(0, subtotal - discountAmount);

  const addRecipe = useCallback((recipe: Recipe) => {
    setCart((prev) => {
      const { cart: next, error } = addToOrderCart(prev, recipe);
      if (error) {
        setScanHint(error);
        return prev;
      }
      setScanHint(`${recipe.name} added — open cart to checkout`);
      return next;
    });
  }, []);

  async function handleScan(barcode: string) {
    const recipe = await getRecipeByBarcode(barcode);
    if (!recipe) {
      setScanHint("No recipe for that barcode.");
      return;
    }
    addRecipe(recipe as Recipe);
  }

  function openCheckout(fields: CheckoutFields) {
    if (cart.length === 0) {
      setErrors({ lines: ["Add at least one item"] });
      return;
    }
    setCheckoutFields(fields);
    setErrors({});
    setCheckoutOpen(true);
  }

  function completeCheckout(paymentMethod: PosPaymentMethod, fields: CheckoutFields) {
    const formData = buildOrderFormData(cart, { ...fields, paymentMethod });
    const stayOnPos = getStayOnPosAfterCheckout();

    startTransition(async () => {
      const result = await createPosOrder(formData);
      if (result.error) {
        setErrors(result.error as Record<string, string[]>);
        toastError("Payment could not be completed");
        return;
      }

      setCheckoutOpen(false);
      const label = PAYMENT_METHOD_LABELS[paymentMethod];

      if (stayOnPos) {
        setCart([]);
        setDiscountAmount(0);
        setErrors({});
        setCheckoutKey((k) => k + 1);
        setLastPlaced({
          orderId: result.orderId!,
          orderNumber: result.orderNumber ?? "",
          paymentMethod,
        });
        success(`Order ${result.orderNumber} · paid ${label}`);
        router.refresh();
      } else {
        success(`Paid ${label} · order ${result.orderNumber}`);
        router.push(`/orders/${result.orderId}`);
        router.refresh();
      }
    });
  }

  const pricedCount = useMemo(
    () => recipes.filter((r) => r.salePrice != null).length,
    [recipes]
  );

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 safe-area-top md:px-4 md:py-3">
        {showExitLink && <PosExitLink />}
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-servora-charcoal md:text-xl">Register</h1>
          <p className="text-xs text-gray-500">
            1. Tap items · 2. Checkout · 3. Pay (Cash / Card / PhonePe)
          </p>
        </div>
        <Link
          href="/orders/pos/settings"
          className="touch-target rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"
        >
          Settings
        </Link>
        <div className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[240px]">
          <input
            type="search"
            placeholder="Search menu…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>
      </header>

      {lastPlaced && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900">
          <span>
            {lastPlaced.orderNumber} · paid {PAYMENT_METHOD_LABELS[lastPlaced.paymentMethod]}
          </span>
          <Link
            href={`/orders/${lastPlaced.orderId}`}
            className="font-medium underline"
            onClick={() => setLastPlaced(null)}
          >
            View order →
          </Link>
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="hidden w-44 shrink-0 border-r border-gray-200 bg-gray-50 lg:w-52 md:flex">
          <PosCategoryNav
            categories={categories}
            selected={selectedCategory}
            onSelect={setSelectedCategory}
            variant="sidebar"
          />
        </aside>

        <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-[5.5rem] md:pb-0">
          <div className="shrink-0 space-y-2 border-b border-gray-100 bg-white px-3 py-2 md:px-4">
            <div className="md:hidden">
              <PosCategoryNav
                categories={categories}
                selected={selectedCategory}
                onSelect={setSelectedCategory}
                variant="pills"
              />
            </div>
            <BarcodeScanInput onScan={handleScan} disabled={isPending} />
            {scanHint && (
              <p className="text-xs text-gray-600" role="status">
                {scanHint}
              </p>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-3 md:p-4">
            <PosItemGrid
              recipes={recipes}
              frequentIds={frequentIds}
              selectedCategory={selectedCategory}
              search={search}
              onAdd={addRecipe}
              disabled={isPending}
            />
          </div>
        </main>

        <aside className="w-full shrink-0 md:flex md:w-80 md:flex-col lg:w-96">
          <PosCartPanel
            key={checkoutKey}
            cart={cart}
            subtotal={subtotal}
            discountAmount={discountAmount}
            total={total}
            customers={customers}
            isPending={isPending}
            errors={errors}
            resetKey={checkoutKey}
            onUpdateQty={(id, qty) => setCart((prev) => updateCartLineQty(prev, id, qty))}
            onClear={() => {
              setCart([]);
              setDiscountAmount(0);
            }}
            onDiscountApplied={(p) => setDiscountAmount(p?.discountAmount ?? 0)}
            onCheckout={openCheckout}
            mobileCollapsed
          />
        </aside>
      </div>

      <PosCheckoutModal
        open={checkoutOpen}
        cart={cart}
        subtotal={subtotal}
        discountAmount={discountAmount}
        total={total}
        isPending={isPending}
        errors={errors}
        fields={checkoutFields}
        onClose={() => {
          if (!isPending) setCheckoutOpen(false);
        }}
        onConfirm={completeCheckout}
      />
    </div>
  );
}

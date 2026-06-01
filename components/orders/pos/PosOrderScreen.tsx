"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { createPosOrder } from "@/app/actions/orders";
import { getOrderForPosResume } from "@/app/actions/table-service";
import { getRecipeByBarcode } from "@/app/actions/recipes";
import { PosExitLink } from "@/components/layout/PosShell";
import { PosCartPanel } from "@/components/orders/pos/PosCartPanel";
import { PosCategoryNav } from "@/components/orders/pos/PosCategoryNav";
import { PosCheckoutModal } from "@/components/orders/pos/PosCheckoutModal";
import { PosItemGrid } from "@/components/orders/pos/PosItemGrid";
import { PosSettleModal } from "@/components/orders/pos/PosSettleModal";
import { PosTableFloor } from "@/components/orders/pos/PosTableFloor";
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
import { formatFieldErrors } from "@/lib/format-field-errors";
import { validatePosCheckout } from "@/lib/pos-checkout-validation";
import { PAYMENT_METHOD_LABELS, type PosPaymentMethod } from "@/lib/pos-payment";
import { isPayAtClose } from "@/lib/venue-settings";
import type { VenuePosSettings } from "@/lib/venue-settings";
import type { DiningTableOption } from "@/components/orders/pos/PosChannelTablePicker";
import type { OrderChannel } from "@prisma/client";

type Recipe = PricedRecipe & { category: string; imageUrl?: string | null };

type CheckoutFields = {
  customerId: string;
  customerName: string;
  discountCode: string;
  notes: string;
  channel: OrderChannel;
  diningTableId: string;
  externalRef: string;
  tableLabel?: string;
};

type PosView = "menu" | "tables";

type PosOrderScreenProps = {
  recipes: Recipe[];
  categories: string[];
  frequentIds: string[];
  customers: { id: string; name: string }[];
  venue: VenuePosSettings;
  tables: DiningTableOption[];
  showExitLink?: boolean;
};

export function PosOrderScreen({
  recipes,
  categories,
  frequentIds,
  customers,
  venue,
  tables,
  showExitLink = true,
}: PosOrderScreenProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [view, setView] = useState<PosView>("menu");
  const [cart, setCart] = useState<OrderCartLine[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("frequent");
  const [search, setSearch] = useState("");
  const [scanHint, setScanHint] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [checkoutKey, setCheckoutKey] = useState(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [channel, setChannel] = useState<OrderChannel>(venue.defaultChannel);
  const [diningTableId, setDiningTableId] = useState("");
  const [externalRef, setExternalRef] = useState("");
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [activeOrderNumber, setActiveOrderNumber] = useState<string | null>(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const [settleTarget, setSettleTarget] = useState<{
    orderId: string;
    orderNumber: string;
    total: number;
  } | null>(null);
  const [checkoutFields, setCheckoutFields] = useState<CheckoutFields>({
    customerId: "",
    customerName: "",
    discountCode: "",
    notes: "",
    channel: venue.defaultChannel,
    diningTableId: "",
    externalRef: "",
  });
  const [lastPlaced, setLastPlaced] = useState<{
    orderId: string;
    orderNumber: string;
    paymentMethod?: PosPaymentMethod;
    sent?: boolean;
  } | null>(null);

  const subtotal = cartSubtotal(cart);
  const total = Math.max(0, subtotal - discountAmount);
  const sendToKitchen =
    channel === "DINE_IN" && isPayAtClose(venue, "DINE_IN");

  const addRecipe = useCallback((recipe: Recipe) => {
    setCart((prev) => {
      const { cart: next, error } = addToOrderCart(prev, recipe);
      if (error) {
        setScanHint(error);
        return prev;
      }
      setScanHint(`${recipe.name} added`);
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

  function resetTabState() {
    setActiveOrderId(null);
    setActiveOrderNumber(null);
    setCart([]);
    setDiscountAmount(0);
    setDiningTableId("");
    setChannel(venue.defaultChannel);
    setCheckoutKey((k) => k + 1);
  }

  async function resumeOrder(orderId: string, tableId: string, orderNumber: string) {
    const data = await getOrderForPosResume(orderId);
    if ("error" in data) {
      toastError(data.error);
      return;
    }
    setActiveOrderId(data.order.id);
    setActiveOrderNumber(orderNumber);
    setChannel("DINE_IN");
    setDiningTableId(tableId);
    setCart(data.cart as OrderCartLine[]);
    setView("menu");
    setScanHint(`Adding items to ${orderNumber}`);
  }

  function openCheckout(fields: CheckoutFields) {
    const preflight = validatePosCheckout({
      cartLength: cart.length,
      channel: fields.channel,
      diningTableId: fields.diningTableId,
      venue,
      tables,
    });
    if (preflight) {
      setErrors(preflight);
      toastError(formatFieldErrors(preflight));
      return;
    }
    const tableLabel =
      fields.channel === "DINE_IN" && fields.diningTableId
        ? tables.find((t) => t.id === fields.diningTableId)?.label
        : undefined;
    setCheckoutFields({ ...fields, tableLabel });
    setErrors({});
    setCheckoutOpen(true);
  }

  function afterOrderSuccess(orderId: string, orderNumber: string, paid?: PosPaymentMethod) {
    setCheckoutOpen(false);
    const stayOnPos = getStayOnPosAfterCheckout();

    if (stayOnPos) {
      resetTabState();
      setLastPlaced({
        orderId,
        orderNumber,
        paymentMethod: paid,
        sent: !paid,
      });
      if (paid) {
        success(`Order ${orderNumber} · paid ${PAYMENT_METHOD_LABELS[paid]}`);
      } else {
        success(`Sent to kitchen · ${orderNumber} · bill open`);
      }
      router.refresh();
    } else if (paid) {
      success(`Paid ${PAYMENT_METHOD_LABELS[paid]} · ${orderNumber}`);
      router.push(`/orders/${orderId}`);
      router.refresh();
    } else {
      success(`Bill opened · ${orderNumber}`);
      router.push(`/orders/${orderId}`);
      router.refresh();
    }
  }

  function completeSendToKitchen(fields: CheckoutFields) {
    const preflight = validatePosCheckout({
      cartLength: cart.length,
      channel: fields.channel,
      diningTableId: fields.diningTableId,
      venue,
      tables,
    });
    if (preflight) {
      setErrors(preflight);
      toastError(formatFieldErrors(preflight));
      return;
    }

    const formData = buildOrderFormData(cart, {
      ...fields,
      sendToKitchen: true,
      existingOrderId: activeOrderId ?? undefined,
      posFlow: true,
    });

    startTransition(async () => {
      const result = await createPosOrder(formData);
      if (result.error) {
        setErrors(result.error as Record<string, string[]>);
        toastError(formatFieldErrors(result.error as Record<string, string[]>));
        return;
      }
      afterOrderSuccess(result.orderId!, result.orderNumber ?? "");
    });
  }

  function completeCheckout(paymentMethod: PosPaymentMethod, fields: CheckoutFields) {
    const preflight = validatePosCheckout({
      cartLength: cart.length,
      channel: fields.channel,
      diningTableId: fields.diningTableId,
      venue,
      tables,
    });
    if (preflight) {
      setErrors(preflight);
      toastError(formatFieldErrors(preflight));
      return;
    }

    const formData = buildOrderFormData(cart, {
      ...fields,
      paymentMethod,
      existingOrderId: activeOrderId ?? undefined,
      posFlow: true,
    });

    startTransition(async () => {
      const result = await createPosOrder(formData);
      if (result.error) {
        setErrors(result.error as Record<string, string[]>);
        toastError(formatFieldErrors(result.error as Record<string, string[]>));
        return;
      }
      afterOrderSuccess(result.orderId!, result.orderNumber ?? "", paymentMethod);
    });
  }

  function openSettle(orderId: string, orderNumber: string, orderTotal: number) {
    setSettleTarget({ orderId, orderNumber, total: orderTotal });
    setSettleOpen(true);
  }

  const cartPanelProps = {
    cart,
    subtotal,
    discountAmount,
    total,
    customers,
    isPending,
    errors,
    resetKey: checkoutKey,
    onUpdateQty: (id: string, qty: number) =>
      setCart((prev) => updateCartLineQty(prev, id, qty)),
    onClear: () => {
      setCart([]);
      setDiscountAmount(0);
    },
    onDiscountApplied: (p: { code: string; discountAmount: number } | null) =>
      setDiscountAmount(p?.discountAmount ?? 0),
    venue,
    tables,
    channel,
    diningTableId,
    externalRef,
    onChannelChange: setChannel,
    onTableChange: setDiningTableId,
    onExternalRefChange: setExternalRef,
    onCheckout: openCheckout,
    recipes,
    activeOrderNumber,
    onSettleTab:
      activeOrderId && activeOrderNumber
        ? () => openSettle(activeOrderId, activeOrderNumber, total)
        : undefined,
  };

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
            {venue.dineInPaymentTiming === "at_close"
              ? "Dine-in: pay at close · Tables for open bills"
              : "Tap items · Checkout · Pay"}
          </p>
        </div>
        <div className="flex rounded-lg border border-gray-200 p-0.5">
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "menu" ? "bg-servora-yellow text-white" : "text-gray-600"
            }`}
            onClick={() => setView("menu")}
          >
            Menu
          </button>
          <button
            type="button"
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${
              view === "tables" ? "bg-servora-yellow text-white" : "text-gray-600"
            }`}
            onClick={() => setView("tables")}
          >
            Tables
          </button>
        </div>
        <Link
          href="/orders/pos/settings"
          className="touch-target rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"
        >
          Settings
        </Link>
        {view === "menu" && (
          <div className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[240px]">
            <input
              type="search"
              placeholder="Search menu…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
            />
          </div>
        )}
      </header>

      {lastPlaced && (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-green-200 bg-green-50 px-4 py-2 text-sm text-green-900">
          <span>
            {lastPlaced.orderNumber}
            {lastPlaced.sent
              ? " · sent to kitchen"
              : lastPlaced.paymentMethod
                ? ` · paid ${PAYMENT_METHOD_LABELS[lastPlaced.paymentMethod]}`
                : ""}
          </span>
          <Link
            href={`/orders/${lastPlaced.orderId}`}
            className="font-medium underline"
            onClick={() => setLastPlaced(null)}
          >
            View →
          </Link>
        </div>
      )}

      {pricedCount === 0 && view === "menu" && (
        <p className="shrink-0 bg-amber-50 px-4 py-2 text-sm text-amber-900">
          No menu prices — set sale prices on{" "}
          <Link href="/recipes/pricing" className="font-medium underline">
            Recipe pricing
          </Link>
          .
        </p>
      )}

      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        {view === "tables" ? (
          <main className="min-h-0 flex-1">
            <PosTableFloor
              onSelectFreeTable={(tableId) => {
                resetTabState();
                setDiningTableId(tableId);
                setChannel("DINE_IN");
                setView("menu");
              }}
              onResumeOrder={resumeOrder}
              onSettleOrder={openSettle}
            />
          </main>
        ) : (
          <>
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

            <aside className="hidden h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white lg:w-96 md:flex">
              <PosCartPanel key={checkoutKey} {...cartPanelProps} />
            </aside>
          </>
        )}
      </div>

      {view === "menu" && (
        <div className="md:hidden">
          <PosCartPanel key={`${checkoutKey}-mobile`} {...cartPanelProps} mobileCollapsed />
        </div>
      )}

      <PosCheckoutModal
        open={checkoutOpen}
        cart={cart}
        subtotal={subtotal}
        discountAmount={discountAmount}
        total={total}
        isPending={isPending}
        errors={errors}
        fields={checkoutFields}
        sendToKitchen={sendToKitchen}
        addingToOrder={activeOrderNumber}
        onConfirm={completeCheckout}
        onConfirmSend={completeSendToKitchen}
        onClose={() => {
          if (!isPending) setCheckoutOpen(false);
        }}
        recipes={recipes}
      />

      {settleTarget && (
        <PosSettleModal
          open={settleOpen}
          orderId={settleTarget.orderId}
          orderNumber={settleTarget.orderNumber}
          subtotal={settleTarget.total}
          total={settleTarget.total}
          onClose={() => setSettleOpen(false)}
          onSettled={() => {
            resetTabState();
            setSettleTarget(null);
            setView("tables");
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

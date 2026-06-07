"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { createPosOrder, previewCartStock } from "@/app/actions/orders";
import { getOrderForPosResume } from "@/app/actions/table-service";
import { PosExitLink } from "@/components/layout/PosShell";
import { PosCartPanel } from "@/components/orders/pos/PosCartPanel";
import { PosCategoryNav } from "@/components/orders/pos/PosCategoryNav";
import { PosCheckoutModal } from "@/components/orders/pos/PosCheckoutModal";
import { PosItemGrid } from "@/components/orders/pos/PosItemGrid";
import { PosVariantPickerModal } from "@/components/orders/pos/PosVariantPickerModal";
import { PosQuickAddBar } from "@/components/orders/pos/PosQuickAddBar";
import { OrderReceiptModal } from "@/components/orders/OrderReceiptModal";
import { PosSettleModal } from "@/components/orders/pos/PosSettleModal";
import { PosTableFloor } from "@/components/orders/pos/PosTableFloor";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";
import { useToast } from "@/components/ui/Toast";
import {
  addToOrderCart,
  buildOrderFormData,
  cartSubtotal,
  updateCartLineQty,
  type OrderCartLine,
  type PricedProduct,
} from "@/lib/order-cart";
import {
  buildDisplayCartLines,
  inclusionsMapFromPosProducts,
  type ProductInclusionRef,
} from "@/lib/product-inclusions";
import { findProductByPosCode } from "@/lib/pos-quick-add";
import {
  cartExceedsAvailability,
  type PosProductAvailability,
} from "@/lib/pos-stock-status";
import { getStayOnPosAfterCheckout } from "@/lib/pos-preferences";
import { formatFieldErrors } from "@/lib/format-field-errors";
import { validatePosCheckout } from "@/lib/pos-checkout-validation";
import { PAYMENT_METHOD_LABELS, type PosPaymentMethod } from "@/lib/pos-payment";
import { isPayAtClose } from "@/lib/venue-settings";
import type { VenuePosSettings } from "@/lib/venue-settings";
import type { TaxSettings } from "@/lib/tax-settings";
import type { DiningTableOption } from "@/components/orders/pos/PosChannelTablePicker";
import type { PosVariantGroup } from "@/lib/pos-variant-groups";
import type { OrderChannel } from "@prisma/client";

function cartToStockLines(cart: OrderCartLine[]) {
  return cart.map((l) => ({ productId: l.productId, quantity: l.quantity }));
}

type Product = PricedProduct & {
  category: string;
  imageUrl?: string | null;
  posCode?: number | null;
  parentPrepId?: string | null;
  inclusions?: ProductInclusionRef[];
};

type CheckoutFields = {
  customerId: string;
  customerName: string;
  discountCode: string;
  notes: string;
  channel: OrderChannel;
  diningTableId: string;
  externalRef: string;
  tableLabel?: string;
  managerDiscountMode?: string;
  managerDiscountValue?: string;
  managerDiscountReason?: string;
  compLinesJson?: string;
};

type PosView = "menu" | "tables";

type PosOrderScreenProps = {
  products: Product[];
  variantGroups?: PosVariantGroup[];
  categories: string[];
  frequentIds: string[];
  availability?: Record<string, PosProductAvailability>;
  customers: { id: string; name: string }[];
  venue: VenuePosSettings;
  tables: DiningTableOption[];
  taxSettings: TaxSettings;
  showExitLink?: boolean;
  canManageDiscounts?: boolean;
};

export function PosOrderScreen({
  products,
  variantGroups = [],
  categories,
  frequentIds,
  availability = {},
  customers,
  venue,
  tables,
  taxSettings,
  showExitLink = true,
  canManageDiscounts = false,
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
  const [promoDiscount, setPromoDiscount] = useState(0);
  const [managerDiscount, setManagerDiscount] = useState(0);
  const [appliedPromotions, setAppliedPromotions] = useState<
    { name: string; code?: string | null; discountAmount: number }[]
  >([]);
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
  const [tipAmount, setTipAmount] = useState(0);
  const [receiptOrderId, setReceiptOrderId] = useState<string | null>(null);
  const [lastPlaced, setLastPlaced] = useState<{
    orderId: string;
    orderNumber: string;
    paymentMethod?: PosPaymentMethod;
    sent?: boolean;
  } | null>(null);
  const [variantGroupOpen, setVariantGroupOpen] = useState<PosVariantGroup | null>(null);

  const inclusionsMap = useMemo(() => inclusionsMapFromPosProducts(products), [products]);
  const displayCart = useMemo(
    () => buildDisplayCartLines(cart, inclusionsMap),
    [cart, inclusionsMap]
  );
  const subtotal = cartSubtotal(cart);
  const total = Math.max(0, subtotal - discountAmount);
  const sendToKitchen =
    channel === "DINE_IN" && isPayAtClose(venue, "DINE_IN");

  const addProduct = useCallback(
    (product: Product, qty = 1) => {
      const avail = availability[product.id];
      if (avail?.status === "out" || avail?.status === "unavailable") {
        setScanHint(`${product.name} is out of stock`);
        return;
      }
      setCart((prev) => {
        const currentQty = prev.find((l) => l.productId === product.id)?.quantity ?? 0;
        if (avail && cartExceedsAvailability(currentQty, avail.maxServings, qty)) {
          setScanHint(
            avail.maxServings <= 0
              ? `${product.name} is out of stock`
              : `Only ${avail.maxServings} ${product.name} available`
          );
          return prev;
        }
        const { cart: next, error } = addToOrderCart(prev, product, qty);
        if (error) {
          setScanHint(error);
          return prev;
        }
        setScanHint(
          qty > 1 ? `${qty}× ${product.name} added` : `${product.name} added`
        );
        return next;
      });
    },
    [availability]
  );

  const handleQuickAdd = useCallback(
    (posCode: number, quantity: number) => {
      const product = findProductByPosCode(products, posCode);
      if (!product) {
        setScanHint(`No menu item with POS code ${posCode}`);
        return;
      }
      if (product.salePrice == null) {
        setScanHint(`"${product.name}" has no sale price`);
        return;
      }
      addProduct(product, quantity);
    },
    [addProduct, products]
  );

  function resetTabState() {
    setActiveOrderId(null);
    setActiveOrderNumber(null);
    setCart([]);
    setDiscountAmount(0);
    setPromoDiscount(0);
    setManagerDiscount(0);
    setAppliedPromotions([]);
    setTipAmount(0);
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

    if (paid) {
      setReceiptOrderId(orderId);
    }

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
      tipAmount: 0,
    });

    startTransition(async () => {
      const stock = await previewCartStock(
        cartToStockLines(cart),
        activeOrderId ?? undefined
      );
      if (!stock.ok) {
        setErrors({ stock: stock.issues });
        toastError("Not enough inventory to add these items");
        return;
      }
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
      tipAmount,
    });

    startTransition(async () => {
      const stock = await previewCartStock(
        cartToStockLines(cart),
        activeOrderId ?? undefined
      );
      if (!stock.ok) {
        setErrors({ stock: stock.issues });
        toastError("Not enough inventory for this order");
        return;
      }
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
    displayLines: displayCart,
    subtotal,
    discountAmount,
    total,
    customers,
    isPending,
    errors,
    resetKey: checkoutKey,
    onUpdateQty: (id: string, qty: number) => {
      const avail = availability[id];
      if (avail && qty > 0 && avail.maxServings > 0 && qty > avail.maxServings) {
        setScanHint(`Only ${avail.maxServings} available for this item`);
        return;
      }
      setCart((prev) => updateCartLineQty(prev, id, qty));
    },
    availability,
    onClear: () => {
      setCart([]);
      setDiscountAmount(0);
      setPromoDiscount(0);
      setManagerDiscount(0);
      setAppliedPromotions([]);
    },
    onDiscountApplied: (p) => {
      setPromoDiscount(p?.promoDiscount ?? 0);
      setManagerDiscount(p?.managerDiscount ?? 0);
      setDiscountAmount(p?.discountAmount ?? 0);
      setAppliedPromotions(p?.appliedPromotions ?? []);
    },
    canManageDiscounts,
    venue,
    tables,
    channel,
    diningTableId,
    externalRef,
    onChannelChange: setChannel,
    onTableChange: setDiningTableId,
    onExternalRefChange: setExternalRef,
    onCheckout: openCheckout,
    products,
    activeOrderNumber,
    onSettleTab:
      activeOrderId && activeOrderNumber
        ? () => openSettle(activeOrderId, activeOrderNumber, total)
        : undefined,
  };

  const pricedCount = useMemo(() => {
    const standalone = products.filter((r) => r.salePrice != null && !r.parentPrepId).length;
    const grouped = variantGroups.filter((g) =>
      g.variants.some((v) => v.salePrice != null && v.salePrice >= 0)
    ).length;
    return standalone + grouped;
  }, [products, variantGroups]);

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
          <Link href="/products" className="font-medium underline">
            Products
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
                <PosQuickAddBar
                  disabled={isPending}
                  onQuickAdd={handleQuickAdd}
                  onHint={setScanHint}
                />
                <SmartSearchInput
                  placeholder="Search menu by name or category..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {scanHint && (
                  <p className="text-xs text-gray-600" role="status">
                    {scanHint}
                  </p>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 md:p-4">
                <PosItemGrid
                  products={products}
                  variantGroups={variantGroups}
                  frequentIds={frequentIds}
                  selectedCategory={selectedCategory}
                  search={search}
                  onAdd={addProduct}
                  onOpenVariantGroup={setVariantGroupOpen}
                  disabled={isPending}
                  availability={availability}
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
        promoDiscount={promoDiscount}
        managerDiscount={managerDiscount}
        appliedPromotions={appliedPromotions}
        channel={channel}
        taxSettings={taxSettings}
        tipAmount={tipAmount}
        onTipChange={setTipAmount}
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
        products={products}
      />

      <OrderReceiptModal
        orderId={receiptOrderId}
        open={receiptOrderId != null}
        onClose={() => setReceiptOrderId(null)}
        title="Payment receipt"
      />

      <PosVariantPickerModal
        group={variantGroupOpen}
        availability={availability}
        disabled={isPending}
        onClose={() => setVariantGroupOpen(null)}
        onSelect={(variant) => {
          const product = products.find((p) => p.id === variant.id);
          if (product) addProduct(product);
          setVariantGroupOpen(null);
        }}
      />

      {settleTarget && (
        <PosSettleModal
          open={settleOpen}
          orderId={settleTarget.orderId}
          orderNumber={settleTarget.orderNumber}
          subtotal={settleTarget.total}
          taxSettings={taxSettings}
          canManageDiscounts={canManageDiscounts}
          onClose={() => setSettleOpen(false)}
          onSettled={(orderId) => {
            resetTabState();
            setSettleTarget(null);
            setView("tables");
            if (orderId) setReceiptOrderId(orderId);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

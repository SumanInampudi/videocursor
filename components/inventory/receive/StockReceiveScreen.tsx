"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { postStockReceive } from "@/app/actions/stock-receive";
import { getIngredientByBarcode } from "@/app/actions/ingredients";
import { PosCategoryNav } from "@/components/orders/pos/PosCategoryNav";
import { ReceiveCartPanel } from "@/components/inventory/receive/ReceiveCartPanel";
import { ReceiveItemGrid } from "@/components/inventory/receive/ReceiveItemGrid";
import { BarcodeScanInput } from "@/components/ui/BarcodeScanInput";
import { useToast } from "@/components/ui/Toast";
import { formatCurrency } from "@/lib/units";
import {
  addToReceiveCart,
  buildReceiveFormData,
  receiveCartTotal,
  updateReceiveLineQty,
  updateReceiveLineUnitCost,
  type ReceiveCartLine,
  type ReceiveCatalogItem,
} from "@/lib/stock-receive-cart";

type StockReceiveScreenProps = {
  catalog: ReceiveCatalogItem[];
  categories: string[];
  frequentIds: string[];
  suppliers: { id: string; name: string }[];
};

export function StockReceiveScreen({
  catalog,
  categories,
  frequentIds,
  suppliers,
}: StockReceiveScreenProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [cart, setCart] = useState<ReceiveCartLine[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("frequent");
  const [search, setSearch] = useState("");
  const [scanHint, setScanHint] = useState("");
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const catalogMap = useMemo(
    () => new Map(catalog.map((i) => [i.id, i])),
    [catalog]
  );

  const total = receiveCartTotal(cart);

  const addItem = useCallback((item: ReceiveCatalogItem) => {
    setCart((prev) => addToReceiveCart(prev, item));
    setScanHint(`${item.name} added — set qty & cost in cart`);
    setErrors({});
  }, []);

  async function handleScan(barcode: string) {
    const ingredient = await getIngredientByBarcode(barcode);
    if (!ingredient) {
      setScanHint("No ingredient for that barcode.");
      return;
    }
    const item = catalogMap.get(ingredient.id);
    if (!item) {
      setScanHint("Ingredient is inactive or not in catalog.");
      return;
    }
    addItem(item);
  }

  function handlePost(fields: {
    supplierId: string;
    paymentStatus: string;
    amountPaid?: number;
    purchaseDate: string;
    dueDate?: string;
    notes: string;
    invoiceRef: string;
  }) {
    if (cart.length === 0) {
      setErrors({ lines: ["Add at least one item"] });
      return;
    }

    const formData = buildReceiveFormData(cart, fields);

    startTransition(async () => {
      const result = await postStockReceive(formData);
      if (result.error) {
        setErrors(result.error as Record<string, string[]>);
        toastError("Could not post receive");
        return;
      }
      setCart([]);
      setErrors({});
      const parts = [
        `Received ${result.lineCount} line(s)`,
        result.expenseRecorded ? "expense recorded for cash paid" : null,
        result.creditOwed && result.creditOwed > 0
          ? `${formatCurrency(result.creditOwed)} on supplier credit`
          : null,
      ].filter(Boolean);
      success(parts.join(" · "));
      router.refresh();
    });
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b border-gray-200 bg-white px-3 py-2 safe-area-top md:px-4 md:py-3">
        <Link
          href="/inventory"
          className="touch-target inline-flex items-center rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          ← Inventory
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-bold text-servora-charcoal md:text-xl">Stock receive</h1>
          <p className="text-xs text-gray-500">
            Tap items · enter qty & unit cost · post (updates on-hand + purchase record)
          </p>
        </div>
        <Link
          href="/inventory/purchases/new"
          className="touch-target rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"
        >
          Simple purchase
        </Link>
        <div className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[240px]">
          <input
            type="search"
            placeholder="Search ingredients…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm"
          />
        </div>
      </header>

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
            <ReceiveItemGrid
              items={catalog}
              frequentIds={frequentIds}
              selectedCategory={selectedCategory}
              search={search}
              onAdd={addItem}
              disabled={isPending}
            />
          </div>
        </main>

        <aside className="hidden h-full min-h-0 w-80 shrink-0 flex-col overflow-hidden border-l border-gray-200 bg-white lg:w-96 md:flex">
          <ReceiveCartPanel
            cart={cart}
            total={total}
            suppliers={suppliers}
            isPending={isPending}
            errors={errors}
            onUpdateQty={(id, qty) =>
              setCart((prev) => updateReceiveLineQty(prev, id, qty))
            }
            onUpdateUnitCost={(id, cost) =>
              setCart((prev) => updateReceiveLineUnitCost(prev, id, cost))
            }
            onClear={() => {
              setCart([]);
              setErrors({});
            }}
            onPost={handlePost}
          />
        </aside>
      </div>

      <div className="md:hidden">
        <ReceiveCartPanel
          cart={cart}
          total={total}
          suppliers={suppliers}
          isPending={isPending}
          errors={errors}
          onUpdateQty={(id, qty) =>
            setCart((prev) => updateReceiveLineQty(prev, id, qty))
          }
          onUpdateUnitCost={(id, cost) =>
            setCart((prev) => updateReceiveLineUnitCost(prev, id, cost))
          }
          onClear={() => {
            setCart([]);
            setErrors({});
          }}
          onPost={handlePost}
          mobileCollapsed
        />
      </div>
    </div>
  );
}

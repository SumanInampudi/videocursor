"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useMemo, useState, useTransition } from "react";
import { postStockReceive } from "@/app/actions/stock-receive";
import { PosCategoryNav } from "@/components/orders/pos/PosCategoryNav";
import { ReceiveCartPanel } from "@/components/inventory/receive/ReceiveCartPanel";
import { ReceiveItemGrid } from "@/components/inventory/receive/ReceiveItemGrid";
import {
  ReceiveReviewModal,
  type ReceivePostFields,
} from "@/components/inventory/receive/ReceiveReviewModal";
import { ReceiveNewItemModal } from "@/components/inventory/receive/ReceiveNewItemModal";
import { ReceiveReceiptModal } from "@/components/inventory/receive/ReceiveReceiptModal";
import { Button } from "@/components/ui/Button";
import { SmartSearchInput } from "@/components/ui/SmartSearchInput";
import { useToast } from "@/components/ui/Toast";
import type { StockReceiveReceipt } from "@/lib/stock-receive-summary";
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
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewFields, setReviewFields] = useState<ReceivePostFields | null>(null);
  const [receipt, setReceipt] = useState<StockReceiveReceipt | null>(null);
  const [receiptOpen, setReceiptOpen] = useState(false);
  const [newItemOpen, setNewItemOpen] = useState(false);

  const total = receiveCartTotal(cart);

  const addItem = useCallback((item: ReceiveCatalogItem) => {
    setCart((prev) => addToReceiveCart(prev, item));
    setScanHint(`${item.name} added — set qty & cost in cart`);
    setErrors({});
  }, []);

  const supplierNameForReview = useMemo(() => {
    if (!reviewFields?.supplierId) return null;
    return suppliers.find((s) => s.id === reviewFields.supplierId)?.name ?? null;
  }, [reviewFields, suppliers]);

  function handleRequestPost(fields: ReceivePostFields) {
    if (cart.length === 0) {
      setErrors({ lines: ["Add at least one item"] });
      return;
    }
    const hasZeroCost = cart.some((l) => l.unitCost <= 0);
    if (hasZeroCost) {
      setErrors({ lines: ["Enter unit cost for each line"] });
      return;
    }
    setReviewFields(fields);
    setReviewOpen(true);
    setErrors({});
  }

  function handleConfirmPost() {
    if (!reviewFields || cart.length === 0) return;

    const formData = buildReceiveFormData(cart, reviewFields);

    startTransition(async () => {
      const result = await postStockReceive(formData);
      if ("error" in result) {
        setErrors(result.error as Record<string, string[]>);
        setReviewOpen(false);
        toastError("Could not post receive");
        return;
      }
      setCart([]);
      setErrors({});
      setReviewOpen(false);
      setReviewFields(null);
      if (result.receipt) {
        setReceipt(result.receipt as StockReceiveReceipt);
        setReceiptOpen(true);
      }
      success(`Received ${result.lineCount} line(s) — see summary`);
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
            Tap items or + New item · enter qty & cost · post (updates stock + purchase)
          </p>
        </div>
        <Button
          type="button"
          variant="secondary"
          className="touch-target"
          onClick={() => setNewItemOpen(true)}
        >
          + New item
        </Button>
        <Link
          href="/inventory/receive/history"
          className="touch-target rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700"
        >
          History
        </Link>
        <div className="w-full sm:w-auto sm:min-w-[200px] md:min-w-[240px]">
          <SmartSearchInput
            placeholder="Search by name, SKU, or alias…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full"
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
            onPost={handleRequestPost}
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
          onPost={handleRequestPost}
          mobileCollapsed
        />
      </div>

      <ReceiveReviewModal
        open={reviewOpen}
        cart={cart}
        fields={reviewFields ?? {
          supplierId: "",
          paymentStatus: "PAID",
          purchaseDate: "",
          notes: "",
          invoiceRef: "",
        }}
        supplierName={supplierNameForReview}
        total={total}
        isPending={isPending}
        onClose={() => setReviewOpen(false)}
        onConfirm={handleConfirmPost}
      />

      <ReceiveReceiptModal
        receipt={receipt}
        open={receiptOpen}
        onClose={() => {
          setReceiptOpen(false);
          setReceipt(null);
        }}
      />

      <ReceiveNewItemModal
        open={newItemOpen}
        categories={categories}
        onClose={() => setNewItemOpen(false)}
        onCreated={({ catalogItem, quantity, unitCost, productCreated }) => {
          setCart((prev) => {
            const withItem = addToReceiveCart(prev, catalogItem, quantity);
            return updateReceiveLineUnitCost(withItem, catalogItem.id, unitCost);
          });
          setScanHint(
            productCreated
              ? `${catalogItem.name} created (stock + POS) — review cart and post`
              : `${catalogItem.name} added to catalog — review cart and post`
          );
          router.refresh();
        }}
      />
    </div>
  );
}

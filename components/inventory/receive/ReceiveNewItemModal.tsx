"use client";

import { useEffect, useState, useTransition } from "react";
import { provisionNewReceiveItem } from "@/app/actions/stock-receive";
import { Button } from "@/components/ui/Button";
import { CategoryCombobox } from "@/components/ui/CategoryCombobox";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DEFAULT_UNIT, UNITS } from "@/lib/units";
import type { ReceiveCatalogItem } from "@/lib/stock-receive-cart";

type ReceiveNewItemModalProps = {
  open: boolean;
  categories: string[];
  onClose: () => void;
  onCreated: (payload: {
    catalogItem: ReceiveCatalogItem;
    quantity: number;
    unitCost: number;
    productCreated: boolean;
  }) => void;
};

export function ReceiveNewItemModal({
  open,
  categories,
  onClose,
  onCreated,
}: ReceiveNewItemModalProps) {
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Retail");
  const [unit, setUnit] = useState(DEFAULT_UNIT);
  const [quantity, setQuantity] = useState("1");
  const [unitCost, setUnitCost] = useState("");
  const [salePrice, setSalePrice] = useState("");
  const [quantityPerSale, setQuantityPerSale] = useState("1");
  const [addToMenu, setAddToMenu] = useState(true);

  useEffect(() => {
    if (!open) return;
    setErrors({});
  }, [open]);

  if (!open) return null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const hasSalePrice = salePrice.trim() !== "";
      const result = await provisionNewReceiveItem({
        name,
        category,
        unit,
        quantity: Number(quantity),
        unitCost: Number(unitCost),
        salePrice: hasSalePrice ? Number(salePrice) : null,
        quantityPerSale: Number(quantityPerSale) || 1,
        addToMenu: addToMenu && hasSalePrice,
      });

      if ("error" in result && result.error) {
        setErrors(result.error as Record<string, string[]>);
        return;
      }

      if (!("success" in result) || !result.success) return;

      onCreated({
        catalogItem: result.catalogItem as ReceiveCatalogItem,
        quantity: Number(result.quantity),
        unitCost: Number(result.unitCost),
        productCreated: Boolean(result.productCreated),
      });

      setName("");
      setQuantity("1");
      setUnitCost("");
      setSalePrice("");
      setQuantityPerSale("1");
      setErrors({});
      onClose();
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
      role="dialog"
      aria-modal
      aria-labelledby="receive-new-item-title"
    >
      <form
        onSubmit={handleSubmit}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 id="receive-new-item-title" className="text-lg font-bold text-servora-charcoal">
          New item
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          Creates raw material, stock SKU, and optional POS menu item — then adds to your receive
          cart.
        </p>

        <div className="mt-4 space-y-3">
          <Input
            label="Name *"
            value={name}
            onChange={(e) => setName(e.target.value)}
            error={errors.name?.[0]}
            placeholder="e.g. Coke 300ml"
            required
          />
          <CategoryCombobox
            label="Category *"
            name="new_item_category"
            categories={categories}
            value={category}
            onChange={setCategory}
            error={errors.category?.[0]}
            placeholder="Retail"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Unit *"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              options={UNITS.map((u) => ({ value: u, label: u }))}
              error={errors.unit?.[0]}
            />
            <Input
              label="Qty per sale (POS)"
              type="number"
              step="0.01"
              min="0.01"
              value={quantityPerSale}
              onChange={(e) => setQuantityPerSale(e.target.value)}
              hint="Usually 1 for a bottle/can"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Quantity receiving *"
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              error={errors.quantity?.[0]}
            />
            <Input
              label="Unit cost *"
              type="number"
              step="0.01"
              min="0.01"
              value={unitCost}
              onChange={(e) => setUnitCost(e.target.value)}
              error={errors.unitCost?.[0]}
            />
          </div>
          <Input
            label="Sale price (POS)"
            type="number"
            step="0.01"
            min="0"
            value={salePrice}
            onChange={(e) => setSalePrice(e.target.value)}
            error={errors.salePrice?.[0]}
            placeholder="Leave empty if kitchen stock only"
          />
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={addToMenu}
              onChange={(e) => setAddToMenu(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300"
            />
            Add to POS menu (retail product)
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creating…" : "Create & add to cart"}
          </Button>
        </div>
      </form>
    </div>
  );
}

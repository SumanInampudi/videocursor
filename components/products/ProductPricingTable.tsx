"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { updateProductPricing } from "@/app/actions/pricing";
import { ProductImageUploadCompact } from "@/components/products/ProductImageUploadCompact";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ProductCostEstimate } from "@/lib/costing";
import { formatCurrency } from "@/lib/units";

type ProductPricingRow = {
  id: string;
  name: string;
  category: string;
  imageUrl: string | null;
  salePrice: { toString(): string } | null;
  prepTimeMinutes: number | null;
  costEstimate: ProductCostEstimate;
};

export function ProductPricingTable({ products }: { products: ProductPricingRow[] }) {
  if (products.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        No products yet.{" "}
        <Link href="/products/new" className="link-brand">
          Create a product
        </Link>
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {products.map((product) => (
        <ProductPricingCard key={product.id} product={product} />
      ))}
    </div>
  );
}

function ProductPricingCard({ product }: { product: ProductPricingRow }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [salePrice, setSalePrice] = useState(
    product.salePrice != null ? String(product.salePrice) : ""
  );
  const [prepTimeMinutes, setPrepTimeMinutes] = useState(
    product.prepTimeMinutes != null ? String(product.prepTimeMinutes) : ""
  );
  const [message, setMessage] = useState("");

  const { costEstimate } = product;
  const marginLow =
    costEstimate.marginPercent != null && costEstimate.marginPercent < 20;

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    const formData = new FormData();
    formData.set("salePrice", salePrice);
    formData.set("prepTimeMinutes", prepTimeMinutes);

    startTransition(async () => {
      const result = await updateProductPricing(product.id, formData);
      if (result.error) {
        setMessage("Could not save price");
        return;
      }
      setMessage("Saved");
      router.refresh();
    });
  }

  return (
    <div className="card-padded">
      <div className="grid gap-6 lg:grid-cols-[auto_1fr]">
        <ProductImageUploadCompact
          productId={product.id}
          productName={product.name}
          imageUrl={product.imageUrl}
        />
        <div>
          <h3 className="section-title">{product.name}</h3>
          <p className="text-sm text-gray-500">
            {product.category}
            {marginLow && (
              <span className="ml-2 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                Low margin (&lt;20%)
              </span>
            )}
          </p>

          <form onSubmit={handleSave} className="mt-4 flex flex-wrap items-end gap-3">
            <div className="w-40">
              <Input
                label="Sale price (per batch)"
                type="number"
                step="0.01"
                min={0}
                value={salePrice}
                onChange={(e) => setSalePrice(e.target.value)}
              />
            </div>
            <div className="w-36">
              <Input
                label="Prep time (min)"
                type="number"
                step="1"
                min={1}
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(e.target.value)}
                placeholder="e.g. 15"
              />
            </div>
            <Button type="submit" disabled={isPending} className="text-sm">
              Save
            </Button>
            {message && <span className="text-xs text-gray-500">{message}</span>}
          </form>

          <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-gray-500">Est. raw material cost</dt>
              <dd className="font-medium">
                {formatCurrency(costEstimate.unitIngredientCost)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Est. profit / batch</dt>
              <dd
                className={`font-medium ${
                  costEstimate.unitProfit != null && costEstimate.unitProfit < 0
                    ? "text-servora-red"
                    : "text-green-700"
                }`}
              >
                {costEstimate.unitProfit != null
                  ? formatCurrency(costEstimate.unitProfit)
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500">Margin</dt>
              <dd className="font-medium">
                {costEstimate.marginPercent != null
                  ? `${costEstimate.marginPercent.toFixed(1)}%`
                  : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}

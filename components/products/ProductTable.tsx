"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteProduct } from "@/app/actions/products";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { YieldResult } from "@/lib/yield";

type ProductWithYield = {
  id: string;
  name: string;
  imageUrl?: string | null;
  posCode?: number | null;
  category: string;
  yieldUnit: string;
  productType?: "PREPARED" | "RETAIL";
  ingredients?: { id: string }[];
  yieldResult: YieldResult;
};

type ProductTableProps = {
  products: ProductWithYield[];
};

function yieldLabel(product: ProductWithYield): string {
  const y = product.yieldResult;
  if (y.canSell) {
    return `${y.availableYield ?? y.maxYield} ${product.yieldUnit}`;
  }
  if (y.canMake && (y.committedQty ?? 0) > 0) return "Committed";
  if (y.canMake) return `${y.maxYield} ${product.yieldUnit}`;
  return "Cannot make";
}

export function ProductTable({ products }: ProductTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete product "${name}"?`)) return;

    startTransition(async () => {
      const result = await deleteProduct(id);
      if (result.error) {
        alert(result.error);
        return;
      }
      router.refresh();
    });
  }

  if (products.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-text">No products found.</p>
        <Link href="/products/new" className="mt-4 inline-block">
          <Button>Create your first product</Button>
        </Link>
      </div>
    );
  }

  return (
    <DataTable scroll>
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>POS</th>
            <th>Category</th>
            <th>Inputs</th>
            <th>Yield</th>
            <th>Bottleneck</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <div className="font-medium">{product.name}</div>
                {product.productType === "RETAIL" && (
                  <div className="text-xs text-gray-400">Retail</div>
                )}
              </td>
              <td className="tabular-nums text-muted">{product.posCode ?? "—"}</td>
              <td className="text-muted">{product.category}</td>
              <td className="text-muted">
                {product.productType === "RETAIL"
                  ? "Retail item"
                  : `${product.ingredients?.length ?? 0} items`}
              </td>
              <td className={product.yieldResult.canMake || product.yieldResult.canSell ? "" : "text-red-700"}>
                {yieldLabel(product)}
              </td>
              <td className="text-muted">
                {product.yieldResult.bottleneckIngredient ? (
                  <>
                    {product.yieldResult.bottleneckIngredient}
                    {product.yieldResult.bottleneckNote && (
                      <span className="mt-0.5 block text-xs text-gray-400">
                        {product.yieldResult.bottleneckNote}
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="text-right">
                <div className="flex justify-end gap-0.5">
                  <Link href={`/products/${product.id}/edit#menu-image`}>
                    <Button variant="ghost" className="px-2 py-1 text-xs">
                      Photo
                    </Button>
                  </Link>
                  <Link href={`/products/${product.id}/edit`}>
                    <Button variant="ghost" className="px-2 py-1 text-xs">
                      Edit
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
                    disabled={isPending}
                    onClick={() => handleDelete(product.id, product.name)}
                  >
                    Delete
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}

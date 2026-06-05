"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteProduct } from "@/app/actions/products";
import { ProductThumbnail } from "@/components/products/ProductThumbnail";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { YieldResult } from "@/lib/yield";

type ProductWithYield = {
  id: string;
  name: string;
  imageUrl?: string | null;
  category: string;
  yieldUnit: string;
  productType?: "PREPARED" | "RETAIL";
  ingredients?: { id: string }[];
  yieldResult: YieldResult;
};

type ProductTableProps = {
  products: ProductWithYield[];
};

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
    <div className="table-panel">
      <table>
        <thead>
          <tr>
            <th>Product</th>
            <th>Category</th>
            <th>Raw Materials</th>
            <th>Max Yield</th>
            <th>Bottleneck</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id}>
              <td>
                <div className="flex items-center gap-3">
                  <ProductThumbnail name={product.name} imageUrl={product.imageUrl} size="sm" />
                  <span className="font-semibold text-charcoal">{product.name}</span>
                  {product.productType === "RETAIL" && (
                    <Badge variant="primary" className="ml-1 normal-case">
                      Retail
                    </Badge>
                  )}
                </div>
              </td>
              <td className="text-charcoal-muted">{product.category}</td>
              <td className="text-charcoal-muted">
                {product.productType === "RETAIL"
                  ? "Retail item"
                  : `${product.ingredients?.length ?? 0} items`}
              </td>
              <td>
                {product.yieldResult.canMake ? (
                  <Badge variant="success">
                    {product.yieldResult.maxYield} {product.yieldUnit}
                  </Badge>
                ) : (
                  <Badge variant="danger">Cannot make</Badge>
                )}
              </td>
              <td className="text-charcoal-muted">
                {product.yieldResult.bottleneckIngredient ? (
                  <>
                    {product.yieldResult.bottleneckIngredient}
                    {product.yieldResult.bottleneckNote && (
                      <span className="mt-0.5 block text-xs text-gray-500">
                        {product.yieldResult.bottleneckNote}
                      </span>
                    )}
                  </>
                ) : (
                  "—"
                )}
              </td>
              <td className="text-right">
                <div className="flex justify-end gap-2">
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
                    variant="danger"
                    className="px-2 py-1 text-xs"
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
    </div>
  );
}

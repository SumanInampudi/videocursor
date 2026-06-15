"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Fragment, useMemo, useTransition } from "react";
import { deleteProduct } from "@/app/actions/products";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { buildPosVariantGroups } from "@/lib/pos-variant-groups";
import { formatCurrency } from "@/lib/units";
import { YieldResult } from "@/lib/yield";

type ProductWithYield = {
  id: string;
  name: string;
  imageUrl?: string | null;
  posCode?: number | null;
  category: string;
  yieldUnit: string;
  salePrice?: number | string | null;
  productType?: "PREPARED" | "RETAIL";
  parentPrepId?: string | null;
  variantLabel?: string | null;
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

function ProductRow({
  product,
  isPending,
  onDelete,
  indent = false,
}: {
  product: ProductWithYield;
  isPending: boolean;
  onDelete: (id: string, name: string) => void;
  indent?: boolean;
}) {
  const price =
    product.salePrice != null && product.salePrice !== ""
      ? Number(product.salePrice)
      : null;

  return (
    <tr>
      <td>
        <div className={`font-medium ${indent ? "pl-4" : ""}`}>
          {indent && <span className="mr-1 text-gray-300">↳</span>}
          {indent ? product.variantLabel ?? product.name : product.name}
        </div>
        {product.productType === "RETAIL" && (
          <div className={`text-xs text-gray-400 ${indent ? "pl-4" : ""}`}>Retail</div>
        )}
        {indent && (
          <div className="pl-4 text-xs text-gray-400">Sell variant</div>
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
        {indent && price != null && (
          <span className="mt-0.5 block text-xs text-gray-500">{formatCurrency(price)}</span>
        )}
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
            onClick={() => onDelete(product.id, product.name)}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function ProductTable({ products }: ProductTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const { standalone, groups } = useMemo(() => {
    const { groups, standalone } = buildPosVariantGroups(
      products.map((p) => ({
        ...p,
        salePrice:
          p.salePrice != null && p.salePrice !== "" ? Number(p.salePrice) : null,
      })),
      { pricedOnly: false }
    );
    const byId = new Map(products.map((p) => [p.id, p]));
    return {
      standalone: standalone.map((p) => byId.get(p.id)!),
      groups: groups.map((g) => ({
        ...g,
        variants: g.variants.map((v) => byId.get(v.id)!).filter(Boolean),
      })),
    };
  }, [products]);

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
          {groups.map((group) => (
            <Fragment key={group.prepId}>
              <tr className="bg-teal-50/60">
                <td colSpan={7}>
                  <div className="flex flex-wrap items-center justify-between gap-2 py-0.5">
                    <div>
                      <span className="font-semibold text-teal-900">{group.name}</span>
                      <span className="ml-2 text-xs text-teal-700">
                        {group.variants.length} sell pack{group.variants.length === 1 ? "" : "s"}
                      </span>
                    </div>
                    <Link
                      href={`/prep/${group.prepId}/edit`}
                      className="text-xs font-medium text-teal-800 underline"
                    >
                      Edit prep & variants
                    </Link>
                  </div>
                </td>
              </tr>
              {group.variants.map((variant) => (
                <ProductRow
                  key={variant.id}
                  product={variant}
                  isPending={isPending}
                  onDelete={handleDelete}
                  indent
                />
              ))}
            </Fragment>
          ))}
          {standalone.map((product) => (
            <ProductRow
              key={product.id}
              product={product}
              isPending={isPending}
              onDelete={handleDelete}
            />
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}

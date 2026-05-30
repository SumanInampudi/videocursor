"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteInventoryItem } from "@/app/actions/inventory";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency, formatQuantity } from "@/lib/units";
import { isLowStock } from "@/lib/yield";
import { InventoryItem } from "@prisma/client";

type InventoryTableProps = {
  items: InventoryItem[];
};

export function InventoryTable({ items }: InventoryTableProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function handleDelete(id: string, name: string) {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;

    startTransition(async () => {
      const result = await deleteInventoryItem(id);
      if (result.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  }

  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
        <p className="text-sm text-gray-500">No inventory items found.</p>
        <Link href="/inventory/new" className="mt-4 inline-block">
          <Button>Add your first item</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Item
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              SKU
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Category
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Quantity
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Location
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Cost/Unit
            </th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
              Status
            </th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
              Actions
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {items.map((item) => {
            const lowStock = isLowStock(item.quantity, item.reorderLevel);

            return (
              <tr key={item.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-medium text-servora-charcoal">{item.name}</div>
                  {item.supplier && (
                    <div className="text-xs text-gray-500">{item.supplier}</div>
                  )}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.sku}</td>
                <td className="px-4 py-3 text-sm text-gray-600">{item.category}</td>
                <td className="px-4 py-3 text-sm">
                  <span className={lowStock ? "font-medium text-servora-red" : "text-servora-charcoal"}>
                    {formatQuantity(Number(item.quantity), item.unit)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {item.storageLocation || "—"}
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">
                  {formatCurrency(Number(item.costPerUnit))}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {lowStock && <Badge variant="danger">Low Stock</Badge>}
                    {!item.isActive && <Badge variant="default">Inactive</Badge>}
                    {!lowStock && item.isActive && <Badge variant="success">In Stock</Badge>}
                  </div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-2">
                    <Link href={`/inventory/${item.id}/edit`}>
                      <Button variant="ghost" className="px-2 py-1 text-xs">
                        Edit
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      className="px-2 py-1 text-xs"
                      disabled={isPending}
                      onClick={() => handleDelete(item.id, item.name)}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteInventoryItem } from "@/app/actions/inventory";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { usableQuantity } from "@/lib/ingredient-wastage";
import { formatCurrency, formatQuantity } from "@/lib/units";
import { isLowStock } from "@/lib/yield";
import { InventoryItem } from "@prisma/client";

type InventoryRow = InventoryItem & {
  ingredient?: { wastagePercent: number } | null;
};

type InventoryTableProps = {
  items: InventoryRow[];
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
      <div className="empty-state">
        <p className="empty-state-text">No inventory items found.</p>
        <Link href="/inventory/receive" className="mt-4 inline-block">
          <Button>Receive your first stock</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="table-panel">
      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>SKU</th>
            <th>Category</th>
            <th>Quantity</th>
            <th>Location</th>
            <th>Cost/Unit</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const physical = Number(item.quantity);
            const waste = Number(item.ingredient?.wastagePercent ?? 0);
            const usable = usableQuantity(physical, waste);
            const lowStock = isLowStock(usable, item.reorderLevel);

            return (
              <tr key={item.id}>
                <td>
                  <div className="font-semibold text-charcoal">{item.name}</div>
                  {item.supplier && (
                    <div className="text-xs text-gray-500">{item.supplier}</div>
                  )}
                </td>
                <td className="text-charcoal-muted">{item.sku}</td>
                <td className="text-charcoal-muted">{item.category}</td>
                <td>
                  <span className={lowStock ? "font-bold text-danger" : "font-medium text-charcoal"}>
                    {formatQuantity(physical, item.unit)}
                  </span>
                  {waste > 0 && (
                    <div className="text-xs text-gray-500">
                      {formatQuantity(usable, item.unit)} usable for recipes ({waste}% waste)
                    </div>
                  )}
                </td>
                <td className="text-charcoal-muted">{item.storageLocation || "—"}</td>
                <td className="font-medium tabular-nums">{formatCurrency(Number(item.costPerUnit))}</td>
                <td>
                  <div className="badge-row">
                    {lowStock && <Badge variant="danger">Low Stock</Badge>}
                    {!item.isActive && <Badge variant="default">Inactive</Badge>}
                    {!lowStock && item.isActive && <Badge variant="success">In Stock</Badge>}
                  </div>
                </td>
                <td className="text-right">
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

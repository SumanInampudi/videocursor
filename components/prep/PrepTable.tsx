"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";
import { formatQuantity } from "@/lib/units";

type PrepRow = {
  id: string;
  name: string;
  category: string;
  yieldQuantity: number | string;
  yieldUnit: string;
  ingredients: { id: string }[];
  prepOutputInventoryItem?: {
    quantity: number | string;
    unit: string;
  } | null;
  _count?: { prepBatches: number };
};

export function PrepTable({ items }: { items: PrepRow[] }) {
  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-text">No prep items yet. Create garam masala, bases, etc.</p>
        <Link href="/prep/new" className="mt-4 inline-block">
          <Button>Create prep item</Button>
        </Link>
      </div>
    );
  }

  return (
    <DataTable>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Category</th>
            <th>Batch recipe</th>
            <th>On hand</th>
            <th>Batches</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td className="font-medium">{item.name}</td>
              <td className="text-muted">{item.category}</td>
              <td className="text-muted">
                {Number(item.yieldQuantity)} {item.yieldUnit} · {item.ingredients.length} inputs
              </td>
              <td>
                {item.prepOutputInventoryItem ? (
                  formatQuantity(
                    Number(item.prepOutputInventoryItem.quantity),
                    item.prepOutputInventoryItem.unit
                  )
                ) : (
                  <span className="text-subtle">—</span>
                )}
              </td>
              <td className="text-muted tabular-nums">{item._count?.prepBatches ?? 0}</td>
              <td className="text-right">
                <Link href={`/prep/${item.id}/edit`}>
                  <Button variant="ghost" className="px-2 py-1 text-xs">
                    Edit
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}

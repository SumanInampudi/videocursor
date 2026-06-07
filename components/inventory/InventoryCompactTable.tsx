"use client";

import Link from "next/link";
import { Fragment } from "react";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { deleteInventoryItem } from "@/app/actions/inventory";
import { Button } from "@/components/ui/Button";
import { DataTable, DataTableGroupHeader } from "@/components/ui/DataTable";
import { usableQuantity } from "@/lib/ingredient-wastage";
import {
  getInventoryStockStatus,
  inventoryStatusClass,
  inventoryStatusLabel,
} from "@/lib/inventory-stock";
import { formatCurrency, formatQuantity } from "@/lib/units";
import { InventoryItem } from "@prisma/client";

export type InventoryRow = InventoryItem & {
  ingredient?: { wastagePercent: number } | null;
};

type TableGroup = {
  category: string;
  items: InventoryRow[];
};

type InventoryCompactTableProps = {
  groups: TableGroup[];
  flatItems?: InventoryRow[];
  resultLabel?: string;
  highlightLowStock?: boolean;
};

function InventoryTableRow({
  item,
  highlightLowStock,
}: {
  item: InventoryRow;
  highlightLowStock?: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const physical = Number(item.quantity);
  const waste = Number(item.ingredient?.wastagePercent ?? 0);
  const usable = usableQuantity(physical, waste);
  const status = getInventoryStockStatus(item);
  const isLow = highlightLowStock && (status.kind === "low" || status.kind === "out");

  function handleDelete() {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    startTransition(async () => {
      const result = await deleteInventoryItem(item.id);
      if (result.error) alert(result.error);
      else router.refresh();
    });
  }

  return (
    <tr className={isLow ? "row-highlight" : undefined}>
      <td>
        <div className="font-medium">{item.name}</div>
        {item.supplier && (
          <div className="truncate text-xs text-gray-400">{item.supplier}</div>
        )}
      </td>
      <td className="hidden font-mono sm:table-cell">{item.sku}</td>
      <td className="hidden text-muted lg:table-cell">{item.category}</td>
      <td className="tabular-nums">
        <span className={status.kind === "low" || status.kind === "out" ? "font-medium" : ""}>
          {formatQuantity(physical, item.unit)}
        </span>
        {waste > 0 && (
          <div className="text-xs text-gray-400">
            {formatQuantity(usable, item.unit)} usable
          </div>
        )}
      </td>
      <td className="hidden text-subtle md:table-cell">{item.storageLocation || "—"}</td>
      <td className="hidden text-muted tabular-nums xl:table-cell">
        {formatCurrency(Number(item.costPerUnit))}
      </td>
      <td className={inventoryStatusClass(status)}>{inventoryStatusLabel(status)}</td>
      <td className="text-right">
        <div className="flex items-center justify-end gap-0.5">
          <Link href={`/inventory/${item.id}/edit`}>
            <Button variant="ghost" className="px-2 py-1 text-xs">
              Edit
            </Button>
          </Link>
          <Button
            variant="ghost"
            className="px-2 py-1 text-xs text-red-600 hover:text-red-700"
            disabled={isPending}
            onClick={handleDelete}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function InventoryCompactTable({
  groups,
  flatItems,
  resultLabel,
  highlightLowStock,
}: InventoryCompactTableProps) {
  const useFlat = flatItems != null;

  return (
    <DataTable resultLabel={resultLabel} scroll>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th className="hidden sm:table-cell">SKU</th>
            <th className="hidden lg:table-cell">Category</th>
            <th>Quantity</th>
            <th className="hidden md:table-cell">Location</th>
            <th className="hidden xl:table-cell">Cost/unit</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {useFlat
            ? flatItems.map((item) => (
                <InventoryTableRow
                  key={item.id}
                  item={item}
                  highlightLowStock={highlightLowStock}
                />
              ))
            : groups.map(({ category, items }) => (
                <Fragment key={category}>
                  <DataTableGroupHeader
                    label={category}
                    count={items.length}
                    colSpan={8}
                  />
                  {items.map((item) => (
                    <InventoryTableRow
                      key={item.id}
                      item={item}
                      highlightLowStock={highlightLowStock}
                    />
                  ))}
                </Fragment>
              ))}
        </tbody>
      </table>
    </DataTable>
  );
}

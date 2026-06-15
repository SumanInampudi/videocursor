"use client";

import { Fragment } from "react";
import { CreateStockButton } from "@/components/ingredients/CreateStockButton";
import { Button } from "@/components/ui/Button";
import { DataTable, DataTableGroupHeader } from "@/components/ui/DataTable";
import {
  getRawMaterialStockStatus,
  type RawMaterialStockStatus,
} from "@/lib/raw-material-stock";
import { formatQuantity } from "@/lib/units";
import { Ingredient, InventoryItem } from "@prisma/client";

export type RawMaterialWithInventory = Ingredient & {
  inventoryItems?: InventoryItem[];
};

type TableGroup = {
  category: string;
  items: RawMaterialWithInventory[];
};

type RawMaterialCompactTableProps = {
  groups: TableGroup[];
  flatItems?: RawMaterialWithInventory[];
  onEdit: (item: RawMaterialWithInventory) => void;
  resultLabel?: string;
  highlightLowStock?: boolean;
};

function stockLabel(status: RawMaterialStockStatus): string {
  if (status.kind === "no_stock") return "No stock SKU";
  if (status.kind === "out") return `Out · ${formatQuantity(status.totalQty, status.unit)}`;
  if (status.kind === "low") return `Low · ${formatQuantity(status.totalQty, status.unit)}`;
  return formatQuantity(status.totalQty, status.unit);
}

function stockClass(status: RawMaterialStockStatus): string {
  if (status.kind === "no_stock") return "text-subtle";
  if (status.kind === "out") return "font-medium text-red-700";
  if (status.kind === "low") return "font-medium text-amber-700";
  return "text-muted";
}

function RawMaterialRow({
  item,
  onEdit,
  highlightLowStock,
}: {
  item: RawMaterialWithInventory;
  onEdit: () => void;
  highlightLowStock?: boolean;
}) {
  const stockCount = item.inventoryItems?.length ?? 0;
  const stockStatus = getRawMaterialStockStatus(item.wastagePercent, item.inventoryItems);
  const isLow =
    highlightLowStock &&
    (stockStatus.kind === "low" || stockStatus.kind === "out");
  const waste = Number(item.wastagePercent ?? 0);

  return (
    <tr className={isLow ? "row-highlight" : undefined}>
      <td>
        <div className="font-medium">{item.name}</div>
        {item.aliases && (
          <div className="truncate text-xs text-gray-400">{item.aliases}</div>
        )}
      </td>
      <td className="hidden font-mono sm:table-cell">{item.sku}</td>
      <td className="hidden text-muted lg:table-cell">{item.category}</td>
      <td className="text-muted">{item.defaultUnit}</td>
      <td className="hidden text-subtle tabular-nums md:table-cell">
        {waste > 0 ? `${waste}%` : "—"}
      </td>
      <td className={`hidden xl:table-cell ${stockClass(stockStatus)}`}>
        {stockLabel(stockStatus)}
        {stockCount > 1 && (
          <span className="block text-xs text-gray-400">{stockCount} SKUs</span>
        )}
      </td>
      <td className="text-subtle">{item.isActive ? "Active" : "Inactive"}</td>
      <td className="text-right">
        <div className="flex items-center justify-end gap-0.5">
          <CreateStockButton rawMaterialId={item.id} hasStock={stockCount > 0} />
          <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={onEdit}>
            Edit
          </Button>
        </div>
      </td>
    </tr>
  );
}

export function RawMaterialCompactTable({
  groups,
  flatItems,
  onEdit,
  resultLabel,
  highlightLowStock,
}: RawMaterialCompactTableProps) {
  const useFlat = flatItems != null;

  return (
    <DataTable resultLabel={resultLabel} scroll>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th className="hidden sm:table-cell">SKU</th>
            <th className="hidden lg:table-cell">Category</th>
            <th>Unit</th>
            <th className="hidden md:table-cell">Waste</th>
            <th className="hidden xl:table-cell">Stock</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {useFlat
            ? flatItems.map((item) => (
                <RawMaterialRow
                  key={item.id}
                  item={item}
                  onEdit={() => onEdit(item)}
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
                    <RawMaterialRow
                      key={item.id}
                      item={item}
                      onEdit={() => onEdit(item)}
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

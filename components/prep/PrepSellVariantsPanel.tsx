"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import {
  applyPrepVariantTemplateSet,
  deletePrepSellVariant,
  savePrepSellVariant,
} from "@/app/actions/prep-variants";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { PREP_VARIANT_TEMPLATE_SET } from "@/lib/prep-variant-templates";
import { formatCurrency, formatQuantity } from "@/lib/units";

type VariantRow = {
  id?: string;
  variantLabel: string;
  variantOutputQuantity: number | null;
  salePrice: number | null;
  posCode: number | null;
  variantSortOrder: number;
};

type PrepSellVariantsPanelProps = {
  prepId: string;
  prepName: string;
  yieldUnit: string;
  onHandQty: number;
  variants: VariantRow[];
};

type DraftRow = {
  key: string;
  id?: string;
  variantLabel: string;
  variantOutputQuantity: string;
  salePrice: string;
  posCode: string;
  variantSortOrder: string;
};

function toDraft(row: VariantRow, key: string): DraftRow {
  return {
    key,
    id: row.id,
    variantLabel: row.variantLabel,
    variantOutputQuantity:
      row.variantOutputQuantity != null ? String(row.variantOutputQuantity) : "",
    salePrice: row.salePrice != null ? String(row.salePrice) : "",
    posCode: row.posCode != null ? String(row.posCode) : "",
    variantSortOrder: String(row.variantSortOrder ?? 0),
  };
}

function emptyDraft(key: string): DraftRow {
  return {
    key,
    variantLabel: "",
    variantOutputQuantity: "",
    salePrice: "",
    posCode: "",
    variantSortOrder: "50",
  };
}

export function PrepSellVariantsPanel({
  prepId,
  prepName,
  yieldUnit,
  onHandQty,
  variants: initialVariants,
}: PrepSellVariantsPanelProps) {
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [isPending, startTransition] = useTransition();
  const [rows, setRows] = useState<DraftRow[]>(() =>
    initialVariants.length > 0
      ? initialVariants.map((v, i) => toDraft(v, `existing-${i}`))
      : []
  );

  useEffect(() => {
    setRows(
      initialVariants.length > 0
        ? initialVariants.map((v, i) => toDraft(v, `existing-${i}`))
        : []
    );
  }, [initialVariants]);

  const portionsPreview = useMemo(() => {
    if (onHandQty <= 0) return null;
    return rows
      .filter((r) => r.variantLabel && Number(r.variantOutputQuantity) > 0)
      .map((r) => {
        const qty = Number(r.variantOutputQuantity);
        const max = Math.floor(onHandQty / qty);
        return { label: r.variantLabel, max };
      });
  }, [rows, onHandQty]);

  function addRow() {
    setRows((prev) => [...prev, emptyDraft(`new-${Date.now()}`)]);
  }

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function saveRow(row: DraftRow) {
    startTransition(async () => {
      const result = await savePrepSellVariant(prepId, {
        id: row.id,
        variantLabel: row.variantLabel,
        variantOutputQuantity: Number(row.variantOutputQuantity),
        salePrice: Number(row.salePrice),
        posCode: row.posCode.trim() ? Number(row.posCode) : null,
        variantSortOrder: Number(row.variantSortOrder) || 0,
      });
      if (result.error) {
        toastError(result.error);
        return;
      }
      success(`Saved ${row.variantLabel || "variant"}`);
      router.refresh();
    });
  }

  function deleteRow(row: DraftRow) {
    if (!row.id) {
      removeRow(row.key);
      return;
    }
    if (!confirm(`Delete variant "${row.variantLabel}"?`)) return;
    startTransition(async () => {
      const result = await deletePrepSellVariant(row.id!);
      if (result.error) {
        toastError(result.error);
        return;
      }
      removeRow(row.key);
      success("Variant removed");
      router.refresh();
    });
  }

  function applyTemplates() {
    startTransition(async () => {
      const result = await applyPrepVariantTemplateSet(prepId);
      if (result.error) {
        toastError(result.error);
        return;
      }
      success(
        `Added ${result.created ?? 0} variant(s)${(result.skipped ?? 0) > 0 ? ` · ${result.skipped} already existed` : ""}. Set prices and save each row.`
      );
      router.refresh();
    });
  }

  return (
    <section className="card-padded mt-8 space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="section-title">Sell variants</h2>
          <p className="form-hint mt-1">
            POS packs for <strong>{prepName}</strong> — each variant consumes prep output per sale.
            On hand: {formatQuantity(onHandQty, yieldUnit)}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="secondary" size="sm" disabled={isPending} onClick={applyTemplates}>
            Add Plate / Mini / Family
          </Button>
          <Button type="button" size="sm" disabled={isPending} onClick={addRow}>
            Add variant
          </Button>
        </div>
      </div>

      <p className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2 text-xs text-gray-600">
        Template sizes:{" "}
        {PREP_VARIANT_TEMPLATE_SET.map((t) => `${t.label} (${t.outputQuantity} ${yieldUnit})`).join(" · ")}
      </p>

      {portionsPreview && portionsPreview.length > 0 && (
        <p className="text-sm text-teal-800">
          Can sell now:{" "}
          {portionsPreview.map((p) => `${p.max}× ${p.label}`).join(" · ")}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="text-sm text-gray-500">
          No sell variants yet. Use &quot;Add Plate / Mini / Family&quot; or add custom packs.
        </p>
      ) : (
        <div className="space-y-3">
          {rows.map((row) => (
            <div
              key={row.key}
              className="grid gap-3 rounded-lg border border-gray-200 bg-gray-50/80 p-3 sm:grid-cols-2 lg:grid-cols-6"
            >
              <Input
                label="Pack name *"
                value={row.variantLabel}
                onChange={(e) => updateRow(row.key, { variantLabel: e.target.value })}
                placeholder="Single Plate"
              />
              <Input
                label={`Uses (${yieldUnit}) *`}
                type="number"
                step="0.01"
                min="0.01"
                value={row.variantOutputQuantity}
                onChange={(e) => updateRow(row.key, { variantOutputQuantity: e.target.value })}
              />
              <Input
                label="Sale price (₹) *"
                type="number"
                step="0.01"
                min="0"
                value={row.salePrice}
                onChange={(e) => updateRow(row.key, { salePrice: e.target.value })}
              />
              <Input
                label="POS code"
                type="number"
                min="1"
                step="1"
                value={row.posCode}
                onChange={(e) => updateRow(row.key, { posCode: e.target.value })}
                hint="Auto-assigned if empty on first save"
              />
              <Input
                label="Sort"
                type="number"
                value={row.variantSortOrder}
                onChange={(e) => updateRow(row.key, { variantSortOrder: e.target.value })}
              />
              <div className="flex items-end gap-2 sm:col-span-2 lg:col-span-1">
                <Button
                  type="button"
                  disabled={isPending || !row.variantLabel.trim()}
                  onClick={() => saveRow(row)}
                >
                  Save
                </Button>
                <Button type="button" variant="danger" disabled={isPending} onClick={() => deleteRow(row)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

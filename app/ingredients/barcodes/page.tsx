import Link from "next/link";
import { getIngredients } from "@/app/actions/ingredients";
import { IngredientBarcodeGrid } from "@/components/ingredients/IngredientBarcodeGrid";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function IngredientBarcodesPage() {
  const ingredients = await getIngredients();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/ingredients" className="text-sm text-servora-yellow hover:underline">
            ← Back to ingredients
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">Ingredient barcodes</h1>
          <p className="text-sm text-gray-500">
            Each ingredient has a unique EAN-13-style code (prefix 3). Print or scan these
            labels to select ingredients quickly in future workflows.
          </p>
        </div>
        <Link href="/ingredients">
          <Button variant="secondary">Manage ingredients</Button>
        </Link>
      </div>

      <IngredientBarcodeGrid
        ingredients={ingredients.map((i) => ({
          id: i.id,
          name: i.name,
          sku: i.sku,
          barcode: i.barcode,
          category: i.category,
          defaultUnit: i.defaultUnit,
          isActive: i.isActive,
        }))}
      />
    </div>
  );
}

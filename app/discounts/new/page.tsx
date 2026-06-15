import Link from "next/link";
import { createDiscount, getDiscountFormOptions } from "@/app/actions/discounts";
import { DiscountForm } from "@/components/discounts/DiscountForm";

export const dynamic = "force-dynamic";

export default async function NewDiscountPage() {
  const options = await getDiscountFormOptions();

  return (
    <div>
      <Link href="/discounts" className="link-brand text-sm">
        ← Discounts
      </Link>
      <h1 className="mt-2 page-title">Create promotion</h1>
      <p className="mb-2 text-sm text-gray-500">
        Bill-wide or item-level discounts. Auto promotions apply at checkout when rules match.
      </p>
      <ol className="mb-6 list-decimal space-y-1 pl-5 text-sm text-gray-600">
        <li>
          For <strong>Beverages</strong> (or any category): choose{" "}
          <strong>Percent off matching items</strong>
        </li>
        <li>
          In <strong>Item targeting</strong>, set Applies to →{" "}
          <strong>Specific categories</strong> and pick or type the category name
        </li>
        <li>Optional: enable schedule + Auto-apply for happy hour</li>
      </ol>
      <DiscountForm
        action={createDiscount}
        productOptions={options.products}
        categoryOptions={options.categories}
        submitLabel="Create promotion"
      />
    </div>
  );
}

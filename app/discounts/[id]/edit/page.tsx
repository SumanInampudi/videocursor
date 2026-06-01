import Link from "next/link";
import { notFound } from "next/navigation";
import { getDiscount, updateDiscount } from "@/app/actions/discounts";
import { DiscountForm } from "@/components/discounts/DiscountForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditDiscountPage({ params }: Props) {
  const { id } = await params;
  const discount = await getDiscount(id);
  if (!discount) notFound();

  const action = updateDiscount.bind(null, id);

  return (
    <div>
      <Link href="/discounts" className="text-sm text-servora-yellow hover:underline">
        ← Discounts
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">Edit discount</h1>
      <p className="mb-6 text-sm text-gray-500">{discount.code}</p>
      <DiscountForm
        action={action}
        initialData={{
          ...discount,
          value: Number(discount.value),
          minOrderAmount:
            discount.minOrderAmount != null ? Number(discount.minOrderAmount) : null,
          validFrom: discount.validFrom ? String(discount.validFrom) : null,
          validTo: discount.validTo ? String(discount.validTo) : null,
        }}
        submitLabel="Update discount"
      />
    </div>
  );
}

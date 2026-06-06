import Link from "next/link";
import { notFound } from "next/navigation";
import { getDiscount, getDiscountFormOptions, updateDiscount } from "@/app/actions/discounts";
import { DiscountForm } from "@/components/discounts/DiscountForm";
import { DiscountImpactPanel } from "@/components/discounts/DiscountImpactPanel";

type Props = { params: Promise<{ id: string }> };

export default async function EditDiscountPage({ params }: Props) {
  const { id } = await params;
  const [discount, options] = await Promise.all([getDiscount(id), getDiscountFormOptions()]);
  if (!discount) notFound();

  const action = updateDiscount.bind(null, id);

  return (
    <div>
      <Link href="/discounts" className="link-brand text-sm">
        ← Discounts
      </Link>
      <h1 className="mt-2 page-title">Edit discount</h1>
      <p className="mb-6 text-sm text-gray-500">{discount.code}</p>
      <DiscountForm
        action={action}
        productOptions={options.products}
        categoryOptions={options.categories}
        initialData={{
          code: discount.code,
          name: discount.name,
          kind: discount.kind,
          application:
            discount.application === "AUTO" || discount.application === "CODE"
              ? discount.application
              : "CODE",
          value: Number(discount.value),
          minOrderAmount:
            discount.minOrderAmount != null ? Number(discount.minOrderAmount) : null,
          maxDiscountAmount:
            discount.maxDiscountAmount != null ? Number(discount.maxDiscountAmount) : null,
          isActive: discount.isActive,
          validFrom: discount.validFrom ? String(discount.validFrom) : null,
          validTo: discount.validTo ? String(discount.validTo) : null,
          channelsJson: Array.isArray(discount.channelsJson)
            ? discount.channelsJson.filter(
                (value): value is "DINE_IN" | "ONLINE" =>
                  value === "DINE_IN" || value === "ONLINE"
              )
            : [],
          scheduleJson:
            discount.scheduleJson && typeof discount.scheduleJson === "object"
              ? (discount.scheduleJson as { windows?: { daysOfWeek: number[]; start: string; end: string }[] })
              : undefined,
          configJson:
            discount.configJson && typeof discount.configJson === "object"
              ? (discount.configJson as {
                  bogo?: { buyQuantity?: number; getQuantity?: number; applyToCheapest?: boolean };
                  tiers?: {
                    thresholdAmount?: number | null;
                    thresholdQty?: number | null;
                    valueType?: "PERCENT" | "FIXED";
                    value?: number;
                  }[];
                  segment?: "FIRST_ORDER" | "BIRTHDAY_MONTH" | "RETURNING";
                  valueType?: "PERCENT" | "FIXED";
                  minVisitCount?: number;
                })
              : undefined,
          paymentMethodsJson: Array.isArray(discount.paymentMethodsJson)
            ? discount.paymentMethodsJson.filter(
                (value): value is "CASH" | "CARD" | "PHONEPE" =>
                  value === "CASH" || value === "CARD" || value === "PHONEPE"
              )
            : [],
          targets: discount.targets,
        }}
        submitLabel="Update promotion"
      />
      <DiscountImpactPanel discountId={id} />
    </div>
  );
}

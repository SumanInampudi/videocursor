import Link from "next/link";
import { createDiscount } from "@/app/actions/discounts";
import { DiscountForm } from "@/components/discounts/DiscountForm";

export default function NewDiscountPage() {
  return (
    <div>
      <Link href="/discounts" className="text-sm text-servora-yellow hover:underline">
        ← Discounts
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">Create discount</h1>
      <p className="mb-6 text-sm text-gray-500">Codes are case-insensitive at checkout.</p>
      <DiscountForm action={createDiscount} submitLabel="Create discount" />
    </div>
  );
}

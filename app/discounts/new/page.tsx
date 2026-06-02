import Link from "next/link";
import { createDiscount } from "@/app/actions/discounts";
import { DiscountForm } from "@/components/discounts/DiscountForm";

export default function NewDiscountPage() {
  return (
    <div>
      <Link href="/discounts" className="link-brand text-sm">
        ← Discounts
      </Link>
      <h1 className="mt-2 page-title">Create discount</h1>
      <p className="mb-6 text-sm text-gray-500">Codes are case-insensitive at checkout.</p>
      <DiscountForm action={createDiscount} submitLabel="Create discount" />
    </div>
  );
}

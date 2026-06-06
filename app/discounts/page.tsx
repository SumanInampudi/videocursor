import Link from "next/link";
import { getDiscounts } from "@/app/actions/discounts";
import { DiscountTable } from "@/components/discounts/DiscountTable";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function DiscountsPage() {
  const discounts = await getDiscounts();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Discounts</h1>
          <p className="text-sm text-gray-500">
            Promo codes for checkout. Phase 1 supports percent or fixed amount off the bill, with
            per-order audit trail and impact estimates.
          </p>
        </div>
        <Link href="/discounts/new">
          <Button>Create discount</Button>
        </Link>
      </div>
      <DiscountTable discounts={discounts} />
    </div>
  );
}

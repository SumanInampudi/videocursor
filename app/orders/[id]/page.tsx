import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/app/actions/orders";
import { getTaxSettingsSerialized } from "@/app/actions/tax-settings";
import { OrderDetail } from "@/components/orders/OrderDetail";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params;
  const [order, taxSettings] = await Promise.all([getOrder(id), getTaxSettingsSerialized()]);
  if (!order) notFound();

  return (
    <div>
      <Link href="/orders" className="text-sm text-servora-yellow hover:underline">
        ← Back to orders
      </Link>
      <div className="mt-4">
        <OrderDetail order={order} taxSettings={taxSettings} />
      </div>
    </div>
  );
}

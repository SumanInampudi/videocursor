import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/app/actions/orders";
import { OrderDetail } from "@/components/orders/OrderDetail";

export const dynamic = "force-dynamic";

type Props = {
  params: { id: string };
};

export default async function OrderDetailPage({ params }: Props) {
  const order = await getOrder(params.id);
  if (!order) notFound();

  return (
    <div>
      <Link href="/orders" className="text-sm text-servora-yellow hover:underline">
        ← Back to orders
      </Link>
      <div className="mt-4">
        <OrderDetail order={order} />
      </div>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomerInsights } from "@/app/actions/customers";
import { CustomerInsightsPanel } from "@/components/customers/CustomerInsightsPanel";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params;
  const data = await getCustomerInsights(id);
  if (!data) notFound();

  return (
    <div>
      <Link href="/customers" className="link-brand text-sm">
        ← Customers
      </Link>
      <div className="mt-4">
        <CustomerInsightsPanel data={data} />
      </div>
    </div>
  );
}

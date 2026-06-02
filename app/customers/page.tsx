import Link from "next/link";
import { getCustomers } from "@/app/actions/customers";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { Button } from "@/components/ui/Button";
import { LiveSearchBar } from "@/components/ui/LiveSearchBar";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const customers = await getCustomers(params.q);

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Customers</h1>
          <p className="text-sm text-gray-500">
            Profiles for repeat buyers. Open a customer for revenue and marketing signals.
          </p>
        </div>
        <Link href="/customers/new">
          <Button>Add customer</Button>
        </Link>
      </div>

      <div className="mb-4 max-w-md">
        <LiveSearchBar placeholder="Search name, phone, email…" />
      </div>

      <CustomerTable customers={customers} />
    </div>
  );
}

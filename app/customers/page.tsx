import Link from "next/link";
import { getCustomers } from "@/app/actions/customers";
import { CustomerTable } from "@/components/customers/CustomerTable";
import { Button } from "@/components/ui/Button";

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
          <h1 className="text-2xl font-bold text-servora-charcoal">Customers</h1>
          <p className="text-sm text-gray-500">
            Profiles for repeat buyers. Open a customer for revenue and marketing signals.
          </p>
        </div>
        <Link href="/customers/new">
          <Button>Add customer</Button>
        </Link>
      </div>

      <form method="get" className="mb-4 flex gap-2">
        <input
          name="q"
          type="search"
          defaultValue={params.q ?? ""}
          placeholder="Search name, phone, email…"
          className="flex-1 max-w-md rounded-md border border-gray-300 px-3 py-2 text-sm"
        />
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <CustomerTable customers={customers} />
    </div>
  );
}

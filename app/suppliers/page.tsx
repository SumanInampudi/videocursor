import Link from "next/link";
import { getSuppliers } from "@/app/actions/suppliers";
import { SupplierTable } from "@/components/suppliers/SupplierTable";
import { Button } from "@/components/ui/Button";

export const dynamic = "force-dynamic";

export default async function SuppliersPage() {
  const suppliers = await getSuppliers();

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Suppliers</h1>
          <p className="text-sm text-gray-500">
            Vendors you buy stock from. Link suppliers on purchases for payables tracking.
          </p>
        </div>
        <Link href="/suppliers/new">
          <Button>Add supplier</Button>
        </Link>
      </div>
      <SupplierTable suppliers={suppliers} />
    </div>
  );
}

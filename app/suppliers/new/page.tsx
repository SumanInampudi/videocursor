import Link from "next/link";
import { createSupplier } from "@/app/actions/suppliers";
import { SupplierForm } from "@/components/suppliers/SupplierForm";

export default function NewSupplierPage() {
  return (
    <div>
      <Link href="/suppliers" className="link-brand text-sm">
        ← Suppliers
      </Link>
      <h1 className="mt-2 page-title">Add supplier</h1>
      <p className="mb-6 text-sm text-gray-500">Contact details for purchase and payables records.</p>
      <SupplierForm action={createSupplier} submitLabel="Create supplier" />
    </div>
  );
}

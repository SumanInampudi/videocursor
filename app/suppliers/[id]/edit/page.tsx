import Link from "next/link";
import { notFound } from "next/navigation";
import { getSupplier, updateSupplier } from "@/app/actions/suppliers";
import { SupplierForm } from "@/components/suppliers/SupplierForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditSupplierPage({ params }: Props) {
  const { id } = await params;
  const supplier = await getSupplier(id);
  if (!supplier) notFound();

  const action = updateSupplier.bind(null, id);

  return (
    <div>
      <Link href="/suppliers" className="link-brand text-sm">
        ← Suppliers
      </Link>
      <h1 className="mt-2 page-title">Edit supplier</h1>
      <p className="mb-6 text-sm text-gray-500">{supplier.name}</p>
      <SupplierForm action={action} initialData={supplier} submitLabel="Update supplier" />
    </div>
  );
}

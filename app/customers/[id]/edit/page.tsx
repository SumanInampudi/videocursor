import Link from "next/link";
import { notFound } from "next/navigation";
import { getCustomer, updateCustomer } from "@/app/actions/customers";
import { CustomerForm } from "@/components/customers/CustomerForm";

type Props = { params: Promise<{ id: string }> };

export default async function EditCustomerPage({ params }: Props) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  const action = updateCustomer.bind(null, id);

  return (
    <div>
      <Link href={`/customers/${id}`} className="text-sm text-servora-yellow hover:underline">
        ← Customer insights
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">Edit customer</h1>
      <p className="mb-6 text-sm text-gray-500">{customer.name}</p>
      <CustomerForm action={action} initialData={customer} submitLabel="Update customer" />
    </div>
  );
}

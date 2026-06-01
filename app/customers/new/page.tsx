import Link from "next/link";
import { createCustomer } from "@/app/actions/customers";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div>
      <Link href="/customers" className="text-sm text-servora-yellow hover:underline">
        ← Customers
      </Link>
      <h1 className="mt-2 text-2xl font-bold text-servora-charcoal">Add customer</h1>
      <p className="mb-6 text-sm text-gray-500">Save contact info to link orders and view insights.</p>
      <CustomerForm action={createCustomer} redirectToDetail submitLabel="Create customer" />
    </div>
  );
}

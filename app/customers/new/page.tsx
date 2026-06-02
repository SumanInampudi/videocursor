import Link from "next/link";
import { createCustomer } from "@/app/actions/customers";
import { CustomerForm } from "@/components/customers/CustomerForm";

export default function NewCustomerPage() {
  return (
    <div>
      <Link href="/customers" className="link-brand text-sm">
        ← Customers
      </Link>
      <h1 className="mt-2 page-title">Add customer</h1>
      <p className="mb-6 text-sm text-gray-500">Save contact info to link orders and view insights.</p>
      <CustomerForm action={createCustomer} redirectToDetail submitLabel="Create customer" />
    </div>
  );
}

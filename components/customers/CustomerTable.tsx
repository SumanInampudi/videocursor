import Link from "next/link";
import { Button } from "@/components/ui/Button";

type CustomerRow = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
};

export function CustomerTable({ customers }: { customers: CustomerRow[] }) {
  if (customers.length === 0) {
    return <p className="text-sm text-gray-500">No customers yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Phone</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Email</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {customers.map((c) => (
            <tr key={c.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{c.name}</td>
              <td className="px-4 py-3 text-gray-600">{c.phone || "—"}</td>
              <td className="px-4 py-3 text-gray-600">{c.email || "—"}</td>
              <td className="px-4 py-3 text-right">
                <Link href={`/customers/${c.id}`}>
                  <Button variant="ghost" className="text-xs">
                    Insights →
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

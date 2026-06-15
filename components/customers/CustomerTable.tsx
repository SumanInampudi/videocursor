import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";

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
    <DataTable>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Phone</th>
            <th>Email</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {customers.map((c) => (
            <tr key={c.id}>
              <td className="font-medium">{c.name}</td>
              <td className="text-muted">{c.phone || "—"}</td>
              <td className="text-muted">{c.email || "—"}</td>
              <td className="text-right">
                <Link href={`/customers/${c.id}`}>
                  <Button variant="ghost" className="px-2 py-1 text-xs">
                    Insights
                  </Button>
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </DataTable>
  );
}

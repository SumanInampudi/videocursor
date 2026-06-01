"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

type SupplierRow = {
  id: string;
  name: string;
  contactPhone: string | null;
  email: string | null;
  isActive: boolean;
};

export function SupplierTable({ suppliers }: { suppliers: SupplierRow[] }) {
  if (suppliers.length === 0) {
    return <p className="text-sm text-gray-500">No suppliers yet.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Name</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Contact</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Status</th>
            <th className="px-4 py-3 text-right text-xs font-medium uppercase text-gray-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {suppliers.map((s) => (
            <tr key={s.id} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium">{s.name}</td>
              <td className="px-4 py-3 text-gray-600">
                {s.contactPhone || s.email || "—"}
              </td>
              <td className="px-4 py-3">
                <Badge variant={s.isActive ? "success" : "default"}>
                  {s.isActive ? "Active" : "Inactive"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-right">
                <Link href={`/suppliers/${s.id}/edit`}>
                  <Button variant="ghost" className="text-xs">
                    Edit
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

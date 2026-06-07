"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { DataTable } from "@/components/ui/DataTable";

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
    <DataTable>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Contact</th>
            <th>Status</th>
            <th className="text-right">Actions</th>
          </tr>
        </thead>
        <tbody>
          {suppliers.map((s) => (
            <tr key={s.id}>
              <td className="font-medium">{s.name}</td>
              <td className="text-muted">{s.contactPhone || s.email || "—"}</td>
              <td className="text-subtle">{s.isActive ? "Active" : "Inactive"}</td>
              <td className="text-right">
                <Link href={`/suppliers/${s.id}/edit`}>
                  <Button variant="ghost" className="px-2 py-1 text-xs">
                    Edit
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

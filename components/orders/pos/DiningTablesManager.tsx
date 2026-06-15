"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteDiningTable, upsertDiningTable } from "@/app/actions/venue";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

type TableRow = {
  id: string;
  code: string;
  label: string;
  section: string | null;
  capacity: number | null;
  sortOrder: number;
  isActive: boolean;
};

export function DiningTablesManager({ tables }: { tables: TableRow[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [section, setSection] = useState("Main");

  function addTable() {
    const formData = new FormData();
    formData.set("code", code);
    formData.set("label", label || `Table ${code}`);
    formData.set("section", section);
    formData.set("sortOrder", String(tables.length + 1));
    startTransition(async () => {
      await upsertDiningTable(formData);
      setCode("");
      setLabel("");
      router.refresh();
    });
  }

  function remove(id: string) {
    if (!confirm("Deactivate this table?")) return;
    startTransition(async () => {
      await deleteDiningTable(id);
      router.refresh();
    });
  }

  return (
    <div className="card-padded">
      <h2 className="font-semibold text-servora-charcoal">Dining tables</h2>
      <p className="mt-1 text-sm text-gray-500">
        Shown as tap targets on the POS when staff choose dine-in.
      </p>

      <ul className="mt-4 max-h-48 space-y-1 overflow-y-auto text-sm">
        {tables
          .filter((t) => t.isActive)
          .map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between rounded bg-gray-50 px-2 py-1.5"
            >
              <span>
                <strong>{t.code}</strong> — {t.label}
                {t.section && <span className="text-gray-500"> ({t.section})</span>}
              </span>
              <button
                type="button"
                className="text-xs text-servora-red hover:underline"
                onClick={() => remove(t.id)}
              >
                Remove
              </button>
            </li>
          ))}
      </ul>

      <div className="mt-4 grid gap-2 sm:grid-cols-3">
        <Input label="Code" value={code} onChange={(e) => setCode(e.target.value)} placeholder="12" />
        <Input
          label="Label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Table 12"
        />
        <Input
          label="Section"
          value={section}
          onChange={(e) => setSection(e.target.value)}
          placeholder="Main"
        />
      </div>
      <Button
        type="button"
        variant="secondary"
        className="mt-3"
        disabled={isPending || !code.trim()}
        onClick={addTable}
      >
        Add table
      </Button>
    </div>
  );
}

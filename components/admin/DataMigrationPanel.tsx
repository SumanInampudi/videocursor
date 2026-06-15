"use client";

import { useState, useTransition } from "react";
import { importDataCsv } from "@/app/actions/data-migration";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import {
  DATA_EXPORT_TYPES,
  DATA_TYPE_LABELS,
  type DataExportType,
} from "@/lib/data-migration/types";

const TYPE_OPTIONS = DATA_EXPORT_TYPES.map((t) => ({
  value: t,
  label: DATA_TYPE_LABELS[t],
}));

export function DataMigrationPanel() {
  const [type, setType] = useState<DataExportType>("raw_materials");
  const [result, setResult] = useState<{
    imported: number;
    errors: string[];
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      startTransition(async () => {
        const res = await importDataCsv(type, text);
        setResult({ imported: res.imported, errors: res.errors });
      });
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  return (
    <div className="space-y-8">
      <section className="card-padded">
        <h2 className="section-title">Choose data type</h2>
        <p className="mt-1 text-sm text-gray-500">
          Import in this order for a new restaurant: raw materials → inventory → products →
          product BOM → customers → suppliers → discounts.
        </p>
        <div className="mt-4 max-w-md">
          <Select
            label="Dataset"
            value={type}
            onChange={(e) => setType(e.target.value as DataExportType)}
            options={TYPE_OPTIONS}
          />
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <h3 className="font-semibold text-amber-900">1. Download template</h3>
          <p className="mt-1 text-sm text-amber-800/90">
            Empty CSV with column headers and one example row.
          </p>
          <a href={`/api/data/template/${type}`} className="mt-3 inline-block">
            <Button type="button" variant="secondary">
              Download {DATA_TYPE_LABELS[type]} template
            </Button>
          </a>
        </div>

        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <h3 className="font-semibold text-blue-900">2. Export current data</h3>
          <p className="mt-1 text-sm text-blue-800/90">Download what is already in Servora.</p>
          <a href={`/api/data/export/${type}`} className="mt-3 inline-block">
            <Button type="button" variant="secondary">
              Export {DATA_TYPE_LABELS[type]}
            </Button>
          </a>
        </div>

        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h3 className="font-semibold text-green-900">3. Import CSV</h3>
          <p className="mt-1 text-sm text-green-800/90">
            Upserts rows (matches SKU, email, or code where applicable).
          </p>
          <label className="mt-3 inline-flex cursor-pointer">
            <span className="inline-flex items-center rounded-md bg-servora-yellow px-4 py-2 text-sm font-medium text-white hover:bg-[#e09515]">
              {isPending ? "Importing…" : "Upload CSV"}
            </span>
            <input
              type="file"
              accept=".csv,text/csv"
              className="sr-only"
              disabled={isPending}
              onChange={handleImport}
            />
          </label>
        </div>
      </section>

      <section className="card-padded">
        <h3 className="font-semibold text-servora-charcoal">Full backup (JSON)</h3>
        <p className="mt-1 text-sm text-gray-500">
          All datasets in one file — useful for backups or moving between environments.
        </p>
        <a href="/api/data/export-all" className="mt-3 inline-block">
          <Button type="button" variant="secondary">
            Download full export
          </Button>
        </a>
      </section>

      {result && (
        <div className="filter-bar text-sm">
          <p className="font-medium text-servora-charcoal">
            Imported {result.imported} row(s)
            {result.errors.length > 0 && ` · ${result.errors.length} issue(s)`}
          </p>
          {result.errors.length > 0 && (
            <ul className="mt-2 max-h-40 list-inside list-disc overflow-y-auto text-servora-red">
              {result.errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

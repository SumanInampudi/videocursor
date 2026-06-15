import { exportDataCsv } from "@/app/actions/data-migration";
import { normalizeDataExportType } from "@/lib/data-migration/types";

type Params = { params: Promise<{ type: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { type } = await params;
  const normalized = normalizeDataExportType(type);
  if (!normalized) {
    return new Response("Not found", { status: 404 });
  }

  try {
    const csv = await exportDataCsv(normalized);
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${normalized}-export-${stamp}.csv"`,
      },
    });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
}

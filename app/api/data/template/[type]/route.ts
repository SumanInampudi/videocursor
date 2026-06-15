import { getTemplateCsv } from "@/app/actions/data-migration";
import { normalizeDataExportType, type DataExportType } from "@/lib/data-migration/types";

type Params = { params: Promise<{ type: string }> };

export async function GET(_req: Request, { params }: Params) {
  const { type } = await params;
  const normalized = normalizeDataExportType(type);
  if (!normalized) {
    return new Response("Not found", { status: 404 });
  }

  const csv = await getTemplateCsv(normalized);
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${normalized}-template.csv"`,
    },
  });
}

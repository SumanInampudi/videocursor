import { exportAllDataBundle } from "@/app/actions/data-migration";
import { DATA_EXPORT_TYPES } from "@/lib/data-migration/types";

export async function GET() {
  try {
    const bundle = await exportAllDataBundle();
    const payload = {
      exportedAt: new Date().toISOString(),
      files: Object.fromEntries(
        DATA_EXPORT_TYPES.map((type) => [type, bundle[type]])
      ),
    };
    const stamp = new Date().toISOString().slice(0, 10);
    return new Response(JSON.stringify(payload, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="servora-export-${stamp}.json"`,
      },
    });
  } catch {
    return new Response("Unauthorized", { status: 401 });
  }
}

import Link from "next/link";
import { getAuditLogs } from "@/app/actions/audit";
import { DataTable } from "@/components/ui/DataTable";
import { formatDateTimeIST } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function AuditLogPage() {
  const logs = await getAuditLogs(150);

  return (
    <div>
      <Link href="/" className="link-brand text-sm">
        ← Dashboard
      </Link>
      <h1 className="mt-2 page-title">Audit log</h1>
      <p className="mb-6 text-sm text-gray-500">
        Recent changes to orders and other tracked actions (IST).
      </p>

      {logs.length === 0 ? (
        <p className="text-sm text-gray-500">No audit entries yet.</p>
      ) : (
        <DataTable scroll resultLabel={`${logs.length} recent entries`}>
          <table>
            <thead>
              <tr>
                <th>When (IST)</th>
                <th>Action</th>
                <th>Entity</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="whitespace-nowrap text-muted">
                    {formatDateTimeIST(log.createdAt)}
                  </td>
                  <td className="font-medium">{log.action}</td>
                  <td>
                    {log.entity}
                    {log.entityId && (
                      <span className="ml-1 text-xs text-gray-400">
                        {log.entityId.slice(0, 8)}…
                      </span>
                    )}
                  </td>
                  <td className="max-w-md truncate text-xs text-subtle">
                    {log.details ?? "—"}
                    {log.actorRole && (
                      <span className="ml-2 text-gray-400">({log.actorRole})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </DataTable>
      )}
    </div>
  );
}

import Link from "next/link";
import { getAuditLogs } from "@/app/actions/audit";
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
        <div className="table-panel">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  When (IST)
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Action
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Entity
                </th>
                <th className="px-4 py-2 text-left text-xs font-medium uppercase text-gray-500">
                  Details
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {logs.map((log) => (
                <tr key={log.id}>
                  <td className="px-4 py-2 whitespace-nowrap text-gray-600">
                    {formatDateTimeIST(log.createdAt)}
                  </td>
                  <td className="px-4 py-2 font-medium">{log.action}</td>
                  <td className="px-4 py-2">
                    {log.entity}
                    {log.entityId && (
                      <span className="ml-1 text-xs text-gray-400">{log.entityId.slice(0, 8)}…</span>
                    )}
                  </td>
                  <td className="px-4 py-2 max-w-md truncate text-xs text-gray-500">
                    {log.details ?? "—"}
                    {log.actorRole && (
                      <span className="ml-2 text-gray-400">({log.actorRole})</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

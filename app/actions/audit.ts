"use server";

import { db } from "@/lib/db";

export async function getAuditLogs(limit = 100) {
  return db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

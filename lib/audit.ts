"use server";

import { db } from "@/lib/db";

export async function logAudit(
  action: string,
  entity: string,
  entityId?: string,
  details?: Record<string, unknown>
) {
  try {
    await db.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId ?? null,
        details: details ? JSON.stringify(details) : null,
        actorRole: process.env.APP_ROLE ?? null,
      },
    });
  } catch (e) {
    console.error("Audit log failed:", e);
  }
}

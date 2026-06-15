"use server";

import { revalidatePath } from "next/cache";
import { findOpenOrderForTable } from "@/app/actions/table-service";
import { requireAdminSession } from "@/app/actions/auth";
import { requireBusinessContext } from "@/lib/business-context";
import { db } from "@/lib/db";
import { serializeForClient } from "@/lib/serialize";
import { reservationSchema } from "@/lib/validations";
import { OrderChannel, ReservationStatus } from "@prisma/client";

function revalidateReservations() {
  revalidatePath("/orders/pos/settings");
  revalidatePath("/orders/pos");
}

export async function getUpcomingReservations() {
  const { businessId } = await requireBusinessContext();
  const since = new Date();
  since.setHours(since.getHours() - 2);

  const rows = await db.tableReservation.findMany({
    where: {
      businessId,
      status: { in: [ReservationStatus.PENDING, ReservationStatus.SEATED] },
      reservedAt: { gte: since },
    },
    include: {
      diningTable: { select: { id: true, code: true, label: true } },
      order: { select: { id: true, orderNumber: true } },
    },
    orderBy: { reservedAt: "asc" },
    take: 50,
  });

  return serializeForClient(rows);
}

export async function upsertReservation(formData: FormData) {
  await requireAdminSession();
  const { businessId } = await requireBusinessContext();

  const parsed = reservationSchema.safeParse({
    id: formData.get("id") || undefined,
    diningTableId: formData.get("diningTableId") || undefined,
    guestName: formData.get("guestName"),
    phone: formData.get("phone") || undefined,
    partySize: formData.get("partySize"),
    reservedAt: formData.get("reservedAt"),
    durationMinutes: formData.get("durationMinutes"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.flatten().fieldErrors };
  }

  const reservedAt = new Date(parsed.data.reservedAt);
  if (Number.isNaN(reservedAt.getTime())) {
    return { error: { reservedAt: ["Invalid date and time"] } };
  }

  const data = {
    businessId,
    diningTableId: parsed.data.diningTableId || null,
    guestName: parsed.data.guestName.trim(),
    phone: parsed.data.phone?.trim() || null,
    partySize: parsed.data.partySize,
    reservedAt,
    durationMinutes: parsed.data.durationMinutes,
    notes: parsed.data.notes?.trim() || null,
  };

  if (parsed.data.id) {
    await db.tableReservation.update({
      where: { id: parsed.data.id },
      data,
    });
  } else {
    await db.tableReservation.create({ data });
  }

  revalidateReservations();
  return { success: true };
}

export async function cancelReservation(id: string) {
  await requireAdminSession();
  const { businessId } = await requireBusinessContext();
  await db.tableReservation.updateMany({
    where: { id, businessId },
    data: { status: ReservationStatus.CANCELLED },
  });
  revalidateReservations();
  return { success: true };
}

/** Seat guest: optional open tab on assigned table. */
export async function checkInReservation(reservationId: string) {
  await requireAdminSession();
  const { businessId } = await requireBusinessContext();

  const reservation = await db.tableReservation.findFirst({
    where: { id: reservationId, businessId },
  });

  if (!reservation || reservation.status !== ReservationStatus.PENDING) {
    return { error: "Reservation not found or already handled" };
  }

  let orderId = reservation.orderId;
  let orderNumber: string | null = null;

  if (reservation.diningTableId) {
    const existing = await findOpenOrderForTable(businessId, reservation.diningTableId);
    if (existing) {
      orderId = existing.id;
      orderNumber = existing.orderNumber;
    } else {
      const table = await db.diningTable.findUnique({
        where: { id: reservation.diningTableId },
        select: { label: true },
      });
      const placeholder = await db.order.create({
        data: {
          businessId,
          orderNumber: `D-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Date.now().toString().slice(-6)}`,
          channel: OrderChannel.DINE_IN,
          diningTableId: reservation.diningTableId,
          tableLabel: table?.label ?? null,
          customerName: reservation.guestName,
          covers: reservation.partySize,
          status: "NEW",
          subtotal: 0,
          discountTotal: 0,
        },
      });
      orderId = placeholder.id;
      orderNumber = placeholder.orderNumber;
    }
  }

  await db.tableReservation.update({
    where: { id: reservation.id },
    data: {
      status: ReservationStatus.SEATED,
      orderId,
    },
  });

  revalidateReservations();
  return serializeForClient({
    success: true,
    orderId,
    orderNumber,
    diningTableId: reservation.diningTableId,
  });
}

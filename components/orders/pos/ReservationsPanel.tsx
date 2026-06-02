"use client";

import { useEffect, useState, useTransition } from "react";
import {
  cancelReservation,
  checkInReservation,
  getUpcomingReservations,
  upsertReservation,
} from "@/app/actions/reservations";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useToast } from "@/components/ui/Toast";
import { formatDateTimeIST } from "@/lib/format";
import type { DiningTableOption } from "@/components/orders/pos/PosChannelTablePicker";

type ReservationRow = {
  id: string;
  guestName: string;
  phone: string | null;
  partySize: number;
  reservedAt: string;
  durationMinutes: number;
  status: string;
  notes: string | null;
  diningTable: { id: string; code: string; label: string } | null;
  order: { id: string; orderNumber: string } | null;
};

export function ReservationsPanel({ tables }: { tables: DiningTableOption[] }) {
  const { success, error: toastError } = useToast();
  const [rows, setRows] = useState<ReservationRow[]>([]);
  const [isPending, startTransition] = useTransition();
  const [guestName, setGuestName] = useState("");
  const [phone, setPhone] = useState("");
  const [partySize, setPartySize] = useState("2");
  const [reservedAt, setReservedAt] = useState("");
  const [tableId, setTableId] = useState("");
  const [notes, setNotes] = useState("");

  function load() {
    startTransition(async () => {
      const data = await getUpcomingReservations();
      setRows(data as unknown as ReservationRow[]);
    });
  }

  useEffect(() => {
    load();
  }, []);

  function createReservation() {
    const fd = new FormData();
    fd.set("guestName", guestName);
    fd.set("phone", phone);
    fd.set("partySize", partySize);
    fd.set("reservedAt", reservedAt);
    fd.set("durationMinutes", "90");
    if (tableId) fd.set("diningTableId", tableId);
    if (notes) fd.set("notes", notes);

    startTransition(async () => {
      const result = await upsertReservation(fd);
      if (result.error) {
        toastError("Could not save reservation");
        return;
      }
      success("Reservation saved");
      setGuestName("");
      setPhone("");
      setNotes("");
      load();
    });
  }

  function seat(id: string) {
    startTransition(async () => {
      const result = await checkInReservation(id);
      if ("error" in result) {
        toastError(result.error);
        return;
      }
      success(
        result.orderNumber
          ? `Seated · bill ${result.orderNumber}`
          : "Guest marked seated"
      );
      load();
    });
  }

  function cancel(id: string) {
    startTransition(async () => {
      await cancelReservation(id);
      load();
    });
  }

  return (
    <div className="card-padded">
      <h2 className="font-semibold text-servora-charcoal">Reservations</h2>
      <p className="mt-1 text-sm text-gray-500">
        Book tables ahead · Check in opens a tab on the assigned table (pay at close).
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Input label="Guest name" value={guestName} onChange={(e) => setGuestName(e.target.value)} />
        <Input label="Phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <Input
          label="Party size"
          type="number"
          min={1}
          value={partySize}
          onChange={(e) => setPartySize(e.target.value)}
        />
        <Input
          label="Date & time"
          type="datetime-local"
          value={reservedAt}
          onChange={(e) => setReservedAt(e.target.value)}
        />
        <div className="sm:col-span-2">
          <label className="text-sm font-medium text-gray-700">Table (optional)</label>
          <select
            className="mt-1 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
            value={tableId}
            onChange={(e) => setTableId(e.target.value)}
          >
            <option value="">Assign later</option>
            {tables.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label} ({t.code})
              </option>
            ))}
          </select>
        </div>
        <Input label="Notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>
      <Button type="button" className="mt-3" disabled={isPending} onClick={createReservation}>
        Add reservation
      </Button>

      <ul className="mt-6 divide-y divide-gray-100">
        {rows.length === 0 ? (
          <li className="py-4 text-sm text-gray-400">No upcoming reservations</li>
        ) : (
          rows.map((r) => (
            <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
              <div>
                <p className="font-semibold text-servora-charcoal">
                  {r.guestName} · party of {r.partySize}
                </p>
                <p className="text-gray-500">
                  {formatDateTimeIST(r.reservedAt)}
                  {r.diningTable ? ` · ${r.diningTable.label}` : ""}
                  {r.order ? ` · ${r.order.orderNumber}` : ""}
                </p>
                <p className="text-xs uppercase text-gray-400">{r.status}</p>
              </div>
              <div className="flex gap-2">
                {r.status === "PENDING" && (
                  <>
                    <Button type="button" variant="secondary" disabled={isPending} onClick={() => seat(r.id)}>
                      Check in
                    </Button>
                    <Button type="button" variant="ghost" disabled={isPending} onClick={() => cancel(r.id)}>
                      Cancel
                    </Button>
                  </>
                )}
              </div>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

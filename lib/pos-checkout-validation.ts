import type { OrderChannel } from "@prisma/client";
import type { DiningTableOption } from "@/components/orders/pos/PosChannelTablePicker";
import type { VenuePosSettings } from "@/lib/venue-settings";

export type PosCheckoutFieldErrors = Record<string, string[]>;

export function validatePosCheckout(input: {
  cartLength: number;
  channel: OrderChannel;
  diningTableId: string;
  venue: VenuePosSettings;
  tables: DiningTableOption[];
}): PosCheckoutFieldErrors | null {
  const errors: PosCheckoutFieldErrors = {};

  if (input.cartLength < 1) {
    errors.lines = ["Add at least one item"];
  }

  if (input.channel === "DINE_IN" && !input.venue.enableDineIn) {
    errors.channel = ["Dine-in is disabled for this venue"];
  }
  if (input.channel === "ONLINE" && !input.venue.enableOnline) {
    errors.channel = ["Online orders are disabled for this venue"];
  }

  if (input.channel === "DINE_IN" && input.venue.requireTableDineIn) {
    if (input.tables.length === 0) {
      errors.diningTableId = [
        "No tables configured. Add tables under Register → Settings, or turn off “Require table for dine-in”.",
      ];
    } else if (!input.diningTableId) {
      errors.diningTableId = ["Select a table for dine-in"];
    }
  }

  return Object.keys(errors).length > 0 ? errors : null;
}

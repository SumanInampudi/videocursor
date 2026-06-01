"use client";

import { useEffect, useRef } from "react";
import { orderNeedsKitchenAttention, type KitchenOrderView } from "@/lib/kitchen-kds";

/** Soft chime when any active ticket needs kitchen attention (new items / unacked bump). */
export function useKitchenChime(orders: KitchenOrderView[]) {
  const prevKeyRef = useRef<string | null>(null);
  const initializedRef = useRef(false);

  useEffect(() => {
    const attentionIds = orders
      .filter((o) => orderNeedsKitchenAttention(o))
      .map((o) => ("id" in o ? String((o as { id: string }).id) : ""))
      .filter(Boolean)
      .sort()
      .join(",");

    if (!initializedRef.current) {
      initializedRef.current = true;
      prevKeyRef.current = attentionIds;
      return;
    }

    if (attentionIds && attentionIds !== prevKeyRef.current) {
      playKitchenChime();
    }
    prevKeyRef.current = attentionIds;
  }, [orders]);
}

function playKitchenChime() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(660, ctx.currentTime + 0.08);
    gain.gain.setValueAtTime(0.0001, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.12, ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
    osc.onended = () => void ctx.close();
  } catch {
    /* ignore — autoplay policies */
  }
}

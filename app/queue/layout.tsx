import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Order queue — Servora",
  description: "Live dine-in and online order queue for customer displays",
};

/** Public display — no app chrome. */
export default function QueueLayout({ children }: { children: React.ReactNode }) {
  return children;
}

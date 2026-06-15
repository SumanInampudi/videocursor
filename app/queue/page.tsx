import { redirect } from "next/navigation";
import { DEFAULT_BUSINESS_ID } from "@/lib/business-context";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Redirect to the default venue queue (slug from DB). */
export default async function QueueIndexPage() {
  const envSlug = process.env.PUBLIC_QUEUE_SLUG?.trim();
  if (envSlug) {
    redirect(`/queue/${envSlug}`);
  }

  const business = await db.business.findFirst({
    where: { id: DEFAULT_BUSINESS_ID, isActive: true },
    select: { slug: true },
  });

  if (business?.slug) {
    redirect(`/queue/${business.slug}`);
  }

  const fallback = await db.business.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
    select: { slug: true },
  });

  if (fallback?.slug) {
    redirect(`/queue/${fallback.slug}`);
  }

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-gray-900 p-8 text-center text-white">
      <p>No active business configured for the public queue display.</p>
    </div>
  );
}

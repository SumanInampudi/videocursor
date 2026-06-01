import { notFound } from "next/navigation";
import { getPublicOrderQueue } from "@/app/actions/public-queue";
import { PublicQueueBoard } from "@/components/queue/PublicQueueBoard";
import type { PublicQueueTicket } from "@/lib/public-order-queue";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ slug: string }>;
};

export default async function PublicQueuePage({ params }: Props) {
  const { slug } = await params;
  const data = await getPublicOrderQueue(slug);

  if ("error" in data) {
    notFound();
  }

  return (
    <PublicQueueBoard
      businessName={data.businessName}
      tickets={data.tickets as PublicQueueTicket[]}
      initialUpdatedAt={data.updatedAt}
    />
  );
}

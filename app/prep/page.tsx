import Link from "next/link";
import { getPrepItems } from "@/app/actions/prep";
import { PrepTable } from "@/components/prep/PrepTable";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function PrepPage() {
  const items = await getPrepItems();

  return (
    <div>
      <PageHeader
        title="Prep items"
        subtitle="House-made batches (garam masala, bases). Output stock is used in dish BOMs — not sold on POS."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/prep/produce">
              <Button variant="secondary">Produce batch</Button>
            </Link>
            <Link href="/prep/new">
              <Button>New prep item</Button>
            </Link>
          </div>
        }
      />
      <PrepTable items={items as never[]} />
    </div>
  );
}

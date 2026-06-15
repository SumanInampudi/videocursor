import { getPrepItemsForProduce, getRecentPrepBatches } from "@/app/actions/prep";
import { ProduceBatchPanel } from "@/components/prep/ProduceBatchPanel";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

export default async function ProducePrepPage() {
  const [prepItems, recentBatches] = await Promise.all([
    getPrepItemsForProduce(),
    getRecentPrepBatches(),
  ]);

  return (
    <div>
      <PageHeader
        title="Produce batch"
        subtitle="Run a prep recipe — inputs are deducted, finished qty is added to inventory."
      />
      <ProduceBatchPanel
        prepItems={prepItems as never[]}
        recentBatches={recentBatches as never[]}
      />
    </div>
  );
}

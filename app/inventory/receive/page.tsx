import { getReceiveCatalog } from "@/app/actions/stock-receive";
import { getSupplierOptions } from "@/app/actions/suppliers";
import { StockReceiveScreen } from "@/components/inventory/receive/StockReceiveScreen";
import type { ReceiveCatalogItem } from "@/lib/stock-receive-cart";

export const dynamic = "force-dynamic";

export default async function StockReceivePage() {
  const [catalogData, suppliers] = await Promise.all([
    getReceiveCatalog(),
    getSupplierOptions(),
  ]);

  const catalog = catalogData.catalog as ReceiveCatalogItem[];
  const categories = catalogData.categories as string[];
  const frequentIds = catalogData.frequentIds as string[];

  return (
    <StockReceiveScreen
      catalog={catalog}
      categories={categories}
      frequentIds={frequentIds}
      suppliers={suppliers}
    />
  );
}

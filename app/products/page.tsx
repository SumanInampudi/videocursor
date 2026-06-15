import Link from "next/link";
import { getProducts } from "@/app/actions/products";
import { ProductTable } from "@/components/products/ProductTable";
import { Button } from "@/components/ui/Button";
import { LiveSearchBar } from "@/components/ui/LiveSearchBar";
import { PageHeader } from "@/components/ui/PageHeader";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ q?: string }>;

export default async function ProductsPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const products = await getProducts(params.q);

  return (
    <div>
      <PageHeader
        title="Products"
        subtitle={
          <>
            Prepared dishes use a BOM. Retail items (Coke, packaged snacks) resell inventory
            directly — no kitchen prep. Set pricing and margin directly inside create/edit menu
            item, and upload POS menu photos in edit.
          </>
        }
        actions={
          <>
            <Link href="/products/new">
              <Button>Add Product</Button>
            </Link>
          </>
        }
      />
      <div className="mb-4 max-w-md">
        <LiveSearchBar placeholder="Search product name or category..." />
      </div>

      <ProductTable products={products} />
    </div>
  );
}

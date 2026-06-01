import Link from "next/link";
import { Button } from "@/components/ui/Button";

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  pathname: string;
  query: Record<string, string | undefined>;
};

function buildHref(
  pathname: string,
  query: Record<string, string | undefined>,
  page: number
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (key === "page" || !value) continue;
    params.set(key, value);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const qs = params.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  pathname,
  query,
}: PaginationProps) {
  if (total === 0) {
    return null;
  }

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 pt-4">
      <p className="text-sm text-gray-500">
        Showing {start}–{end} of {total}
        {totalPages > 1 && (
          <span className="text-gray-400">
            {" "}
            · page {page} of {totalPages}
          </span>
        )}
      </p>
      {totalPages > 1 && (
        <div className="flex gap-2">
          {page > 1 ? (
            <Link href={buildHref(pathname, query, page - 1)}>
              <Button variant="secondary" className="text-sm">
                Previous
              </Button>
            </Link>
          ) : (
            <Button variant="secondary" className="text-sm" disabled>
              Previous
            </Button>
          )}
          {page < totalPages ? (
            <Link href={buildHref(pathname, query, page + 1)}>
              <Button variant="secondary" className="text-sm">
                Next
              </Button>
            </Link>
          ) : (
            <Button variant="secondary" className="text-sm" disabled>
              Next
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

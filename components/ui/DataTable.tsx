import { ReactNode } from "react";
import { cn } from "@/lib/cn";

type DataTableProps = {
  children: ReactNode;
  resultLabel?: string;
  scroll?: boolean;
  className?: string;
};

export function DataTable({ children, resultLabel, scroll, className }: DataTableProps) {
  return (
    <div className={cn("table-panel", className)}>
      {resultLabel ? <p className="table-panel-caption">{resultLabel}</p> : null}
      {scroll ? <div className="table-panel-scroll">{children}</div> : children}
    </div>
  );
}

type DataTableGroupHeaderProps = {
  label: string;
  count?: number;
  colSpan: number;
};

export function DataTableGroupHeader({ label, count, colSpan }: DataTableGroupHeaderProps) {
  return (
    <tr className="table-panel-group-header">
      <td colSpan={colSpan}>
        {label}
        {count != null ? (
          <span className="ml-2 font-normal text-gray-400">{count}</span>
        ) : null}
      </td>
    </tr>
  );
}

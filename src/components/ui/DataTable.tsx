import { cn } from "@/lib/utils/cn";
import { Skeleton } from "./Skeleton";

export interface DataTableColumn<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: "start" | "end" | "center";
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  onRowClick,
  isLoading,
  getRowClassName,
  dense = false,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
  getRowClassName?: (row: T) => string | undefined;
  dense?: boolean;
}) {
  return (
    <div className="scrollbar-thin table-scroll-rtl overflow-x-auto">
      <table className="w-full min-w-max text-start text-sm">
        <thead className="sticky top-0 z-10">
          <tr className="border-b border-border-soft bg-cream/90 backdrop-blur">
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "whitespace-nowrap px-4 py-3 text-xs font-semibold tracking-wide text-charcoal-soft",
                  dense && "py-2.5",
                  col.align === "end" && "text-end",
                  col.align === "center" && "text-center",
                  col.headerClassName,
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={cn(isLoading && "opacity-60")}>
          {isLoading && rows.length === 0
            ? Array.from({ length: 6 }).map((_, i) => (
                <tr key={`sk-${i}`} className="border-b border-border-soft/70">
                  {columns.map((col) => (
                    <td key={col.key} className="px-4 py-3.5">
                      <Skeleton className="h-3 w-24" />
                    </td>
                  ))}
                </tr>
              ))
            : rows.map((row) => (
                <tr
                  key={rowKey(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    "border-b border-border-soft/70 last:border-0",
                    onRowClick && "cursor-pointer transition-colors duration-[var(--duration-fast)] hover:bg-amber-50/70",
                    getRowClassName?.(row),
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        "px-4 align-middle text-charcoal",
                        dense ? "py-2.5" : "py-3.5",
                        col.align === "end" && "text-end",
                        col.align === "center" && "text-center",
                        col.className,
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
        </tbody>
      </table>
    </div>
  );
}

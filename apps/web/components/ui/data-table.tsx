import { cn } from "@/lib/utils";

interface Column<T> {
  key: string;
  header: string;
  render: (item: T) => React.ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  selectedKey?: string;
  emptyMessage?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  selectedKey,
  emptyMessage = "No data found",
}: DataTableProps<T>) {
  return (
    <div className="overflow-x-auto rounded-xl border" style={{ borderColor: "var(--border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr style={{ backgroundColor: "var(--surface-secondary)" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "px-4 py-3 text-left text-xs font-medium uppercase tracking-wider",
                  col.className
                )}
                style={{ color: "var(--text-muted)" }}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody style={{ backgroundColor: "var(--surface)" }}>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="px-4 py-12 text-center"
                style={{ color: "var(--text-muted)" }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((item) => {
              const key = keyExtractor(item);
              const isSelected = key === selectedKey;
              return (
                <tr
                  key={key}
                  onClick={() => onRowClick?.(item)}
                  className={cn(
                    "border-t transition-colors",
                    onRowClick && "cursor-pointer",
                    isSelected && "bg-spa-accent/5"
                  )}
                  style={{
                    borderColor: "var(--border)",
                    ...(isSelected ? {} : {}),
                  }}
                  onMouseEnter={(e) => {
                    if (onRowClick && !isSelected) {
                      e.currentTarget.style.backgroundColor = "var(--surface-secondary)";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = "";
                    }
                  }}
                >
                  {columns.map((col) => (
                    <td key={col.key} className={cn("px-4 py-3", col.className)}>
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}

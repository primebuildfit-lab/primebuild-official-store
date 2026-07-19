import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { Card } from "./card";
import { NoData } from "./empty-state";

export interface Column<Row> {
  key: string;
  header: string;
  align?: "left" | "right";
  /** Optional fixed width utility class, e.g. "w-40". */
  className?: string;
  render: (row: Row) => ReactNode;
}

/**
 * A compact, high-density table with a sticky header, calm row hover and an
 * honest empty state. Kept deliberately quiet so tables never dominate the
 * commercial dashboards — they sit inside the same Card surface as everything
 * else. An optional `caption` renders a slim footer with the row count.
 */
export function DataTable<Row>({
  columns,
  rows,
  emptyMessage,
  getKey,
  caption,
}: {
  columns: Column<Row>[];
  rows: Row[];
  emptyMessage?: string;
  getKey: (row: Row, index: number) => string;
  caption?: ReactNode;
}) {
  if (rows.length === 0) return <NoData message={emptyMessage} />;
  return (
    <Card className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/40 text-left text-[0.68rem] uppercase tracking-wider text-faint">
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={cn(
                    "px-4 py-2.5 font-semibold",
                    c.align === "right" && "text-right",
                    c.className,
                  )}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr
                key={getKey(row, i)}
                className="border-b border-border/50 transition-colors last:border-0 hover:bg-surface-muted/40"
              >
                {columns.map((c) => (
                  <td
                    key={c.key}
                    className={cn(
                      "px-4 py-2.5 align-middle",
                      c.align === "right" && "text-right tabular-nums",
                      c.className,
                    )}
                  >
                    {c.render(row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? (
        <div className="flex items-center justify-between border-t border-border/70 px-4 py-2 text-[0.7rem] text-faint">
          {caption}
        </div>
      ) : null}
    </Card>
  );
}

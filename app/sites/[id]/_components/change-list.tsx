import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/datetime";

export type ChangeListItem = {
  id: string;
  type: string;
  detail: string | null;
  occurredAt: Date | string | number | null;
  source: string | null;
};

export function ChangeList({ items }: { items: ChangeListItem[] }) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
        </svg>
        <p>暂无变更记录</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      {items.map((item) => (
        <div key={item.id} className="rounded-lg border p-4 space-y-3 bg-background/50 hover:bg-background/80 transition-colors">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {formatDateTime(item.occurredAt, { includeSeconds: true })}
            </span>
            <Badge variant={badgeVariant(item.type)} className="font-medium">
              {typeLabel(item.type)}
            </Badge>
          </div>
          <div className="break-words text-sm text-foreground p-3 rounded bg-muted/50 border">
            {item.detail ?? "—"}
          </div>
          {item.source && (
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>来源：{item.source}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function badgeVariant(type: string | null | undefined): "added" | "removed" | "updated" {
  if (!type) return "updated";
  const value = type.toLowerCase();
  if (value === "added") return "added";
  if (value === "removed") return "removed";
  return "updated";
}

function typeLabel(type: string | null | undefined) {
  const value = (type ?? "未知").toLowerCase();
  if (value === "added") return "新增";
  if (value === "removed") return "删除";
  if (value === "updated") return "更新";
  return type ?? "unknown";
}

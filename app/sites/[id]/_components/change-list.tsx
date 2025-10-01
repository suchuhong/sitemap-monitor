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
    return <div className="text-slate-500">暂无变更</div>;
  }

  return (
    <div className="space-y-3 text-sm">
      {items.map((item) => (
        <div key={item.id} className="rounded-xl border p-3 space-y-2">
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{formatDateTime(item.occurredAt, { includeSeconds: true })}</span>
            <Badge variant={badgeVariant(item.type)}>{typeLabel(item.type)}</Badge>
          </div>
          <div className="break-words text-sm text-foreground">
            {item.detail ?? "—"}
          </div>
          {item.source && (
            <div className="text-xs text-muted-foreground">来源：{item.source}</div>
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

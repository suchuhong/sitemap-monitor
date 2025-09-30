'use client';

import { useTransition } from "react";
import { updateChangeAssignmentAction } from "../actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDateTime } from "@/lib/datetime";
import { toast } from "@/components/ui/sonner";

const STATUS_OPTIONS = [
  { value: "open", label: "未处理" },
  { value: "in_progress", label: "处理中" },
  { value: "resolved", label: "已解决" },
];

type ChangeItem = {
  id: string;
  type: string;
  detail: string | null;
  occurredAt: Date | string | number | null;
  source: string | null;
  assignee: string | null;
  status: string | null;
};

export function ChangeAssignmentList({ siteId, items }: { siteId: string; items: ChangeItem[] }) {
  const [isPending, startTransition] = useTransition();

  if (items.length === 0) {
    return <div className="text-slate-500">暂无变更</div>;
  }

  return (
    <div className="space-y-3 text-sm">
      {items.map((item) => (
        <form
          key={item.id}
          className="rounded-xl border p-3 space-y-3"
          action={(formData) => {
            startTransition(async () => {
              await updateChangeAssignmentAction(formData);
              toast.success("变更信息已更新");
            });
          }}
        >
          <input type="hidden" name="siteId" value={siteId} />
          <input type="hidden" name="changeId" value={item.id} />
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <span>{formatDateTime(item.occurredAt, { includeSeconds: true })}</span>
            <Badge variant={badgeVariant(item.type)}>{item.type}</Badge>
            <Badge variant={statusBadgeVariant(item.status)}>{statusLabel(item.status)}</Badge>
          </div>
          <div className="break-words text-sm">{item.detail ?? "—"}</div>
          <div className="grid gap-3 md:grid-cols-3">
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">来源</label>
              <Input name="source" defaultValue={item.source ?? ""} placeholder="如：监控、人工、外部" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">处理人</label>
              <Input name="assignee" defaultValue={item.assignee ?? ""} placeholder="如：Alice" />
            </div>
            <div className="space-y-1">
              <label className="block text-xs text-muted-foreground">状态</label>
              <select
                name="status"
                defaultValue={item.status ?? "open"}
                className="h-9 w-full rounded-md border border-slate-200 bg-background px-2 text-sm"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex gap-2">
            <Button type="submit" size="sm" disabled={isPending}>
              {isPending ? "保存中..." : "保存"}
            </Button>
            <Button
              type="submit"
              name="status"
              value="resolved"
              size="sm"
              variant="outline"
              disabled={isPending}
            >
              标记为已解决
            </Button>
          </div>
        </form>
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

function statusBadgeVariant(status: string | null | undefined): "added" | "updated" | "removed" {
  const value = (status ?? "open").toLowerCase();
  if (value === "resolved") return "added";
  if (value === "in_progress") return "updated";
  return "removed";
}

function statusLabel(status: string | null | undefined) {
  const value = (status ?? "open").toLowerCase();
  if (value === "resolved") return "已解决";
  if (value === "in_progress") return "处理中";
  return "未处理";
}

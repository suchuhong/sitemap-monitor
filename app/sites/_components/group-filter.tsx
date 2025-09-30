'use client';

import { useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Group = {
  id: string;
  name: string;
  color?: string | null;
};

export function GroupFilter({
  availableGroups,
  activeGroup,
}: {
  availableGroups: Group[];
  activeGroup: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const current = useMemo(() => activeGroup, [activeGroup]);

  if (!availableGroups.length) return null;

  const applyGroup = (groupId: string) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (!groupId) params.delete("group");
    else params.set("group", groupId);
    router.push(`/sites?${params.toString()}`);
  };

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">分组过滤</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => applyGroup("")}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          清除
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => applyGroup("")}
          className={cn(
            "rounded-full border px-3 py-1 text-xs",
            current
              ? "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              : "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-100",
          )}
        >
          全部
        </button>
        {availableGroups.map((group) => (
          <button
            key={group.id}
            type="button"
            onClick={() => applyGroup(group.id)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              current === group.id
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-100"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            )}
            style={group.color ? { borderColor: group.color, color: group.color } : undefined}
          >
            {group.name}
          </button>
        ))}
      </div>
    </div>
  );
}

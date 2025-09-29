"use client";
import { useState, useMemo, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function TagFilter({ availableTags }: { availableTags: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const selected = useMemo(() => {
    const param = searchParams?.get("tags");
    if (!param) return [] as string[];
    return param
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
  }, [searchParams]);
  const [activeTags, setActiveTags] = useState<string[]>(selected);

  useEffect(() => {
    setActiveTags(selected);
  }, [selected]);

  const toggleTag = (tag: string) => {
    setActiveTags((prev) => (
      prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]
    ));
  };

  const applyFilter = () => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (activeTags.length) params.set("tags", activeTags.join(","));
    else params.delete("tags");
    router.push(`/sites?${params.toString()}`);
  };

  if (!availableTags.length) return null;

  return (
    <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">标签过滤</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setActiveTags([])}
          className="text-xs text-slate-500 hover:text-slate-700"
        >
          清除
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {availableTags.map((tag) => (
          <button
            key={tag}
            type="button"
            onClick={() => toggleTag(tag)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs",
              activeTags.includes(tag)
                ? "border-blue-500 bg-blue-50 text-blue-700 dark:border-blue-400 dark:bg-blue-900/30 dark:text-blue-100"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            )}
          >
            {tag}
          </button>
        ))}
      </div>
      <Button onClick={applyFilter} size="sm" className="mt-2">应用筛选</Button>
    </div>
  );
}

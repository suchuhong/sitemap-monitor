"use client";
import { useMemo } from "react";

export type ScanPoint = {
  startedAt: number;
  totalUrls: number;
  added: number;
  removed: number;
  updated: number;
};

export function ScanTrendChart({ points }: { points: ScanPoint[] }) {
  const { pathTotal, pathAdded, pathRemoved, pathUpdated, area, maxY, labels } = useMemo(() => {
    if (!points.length)
      return {
        pathTotal: "",
        pathAdded: "",
        pathRemoved: "",
        pathUpdated: "",
        area: "",
        maxY: 0,
        labels: [] as string[],
      };

    const sorted = [...points].sort((a, b) => a.startedAt - b.startedAt);
    const totals = sorted.map((p) => Math.max(0, p.totalUrls));
    const addedValues = sorted.map((p) => Math.max(0, p.added));
    const removedValues = sorted.map((p) => Math.max(0, p.removed));
    const updatedValues = sorted.map((p) => Math.max(0, p.updated));
    const maxVal = Math.max(...totals, ...addedValues, ...removedValues, ...updatedValues, 1);

    const width = 640;
    const height = 180;
    const padding = 32;
    const chartWidth = width - padding * 2;
    const chartHeight = height - padding * 2;

    const projectX = (index: number) =>
      sorted.length === 1 ? padding + chartWidth / 2 : padding + (chartWidth * index) / (sorted.length - 1);
    const projectY = (value: number) => padding + chartHeight - (chartHeight * value) / maxVal;

    const buildPath = (values: number[]) =>
      values
        .map((value, idx) => `${idx === 0 ? "M" : "L"}${projectX(idx)},${projectY(value)}`)
        .join(" ");

    const pathTotal = buildPath(totals);
    const pathAdded = buildPath(addedValues);
    const pathRemoved = buildPath(removedValues);
    const pathUpdated = buildPath(updatedValues);

    const areaD = sorted.length > 1
      ? `${totals
          .map((value, idx) => `${idx === 0 ? "M" : "L"}${projectX(idx)},${projectY(value)}`)
          .join(" ")} L${projectX(sorted.length - 1)},${height - padding} L${projectX(0)},${height - padding} Z`
      : "";

    // Use consistent date formatting to avoid hydration mismatch
    const labelList = sorted.map((p) => {
      const date = new Date(p.startedAt);
      const month = date.getMonth() + 1;
      const day = date.getDate();
      const hour = date.getHours().toString().padStart(2, '0');
      const minute = date.getMinutes().toString().padStart(2, '0');
      return `${month}月${day}日 ${hour}:${minute}`;
    });

    return {
      pathTotal,
      pathAdded,
      pathRemoved,
      pathUpdated,
      area: areaD,
      maxY: maxVal,
      labels: labelList,
    };
  }, [points]);

  if (!points.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        暂无扫描数据，执行一次手动扫描后即可查看趋势。
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">扫描数量趋势</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            最近 {points.length} 次扫描的 URL 总量变化
          </p>
        </div>
        <div className="text-xs text-slate-500 dark:text-slate-400">
          最大 URL：{maxY}
        </div>
      </div>

      <svg viewBox="0 0 640 200" className="w-full">
        <defs>
          <linearGradient id="scanArea" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="rgba(37, 99, 235, 0.25)" />
            <stop offset="100%" stopColor="rgba(37, 99, 235, 0)" />
          </linearGradient>
          <linearGradient id="scanStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#0ea5e9" />
          </linearGradient>
          <linearGradient id="addedStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#16a34a" />
            <stop offset="100%" stopColor="#22d3ee" />
          </linearGradient>
          <linearGradient id="removedStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#fb7185" />
          </linearGradient>
          <linearGradient id="updatedStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#facc15" />
          </linearGradient>
          <pattern id="gridPattern" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 32H0V0" fill="none" stroke="rgba(148, 163, 184, 0.15)" strokeWidth="1" />
          </pattern>
        </defs>
        <g>
          <rect x="32" y="32" width="576" height="136" fill="url(#gridPattern)" />
          {area && <path d={area} fill="url(#scanArea)" />}
          {pathTotal && (
            <path
              d={pathTotal}
              fill="none"
              stroke="url(#scanStroke)"
              strokeWidth="3"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {pathAdded && (
            <path
              d={pathAdded}
              fill="none"
              stroke="url(#addedStroke)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {pathRemoved && (
            <path
              d={pathRemoved}
              fill="none"
              stroke="url(#removedStroke)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
          {pathUpdated && (
            <path
              d={pathUpdated}
              fill="none"
              stroke="url(#updatedStroke)"
              strokeWidth="2"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          )}
        </g>
      </svg>

      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
        <LegendDot className="bg-gradient-to-r from-blue-600 to-sky-500" label="总数" />
        <LegendDot className="bg-gradient-to-r from-emerald-600 to-cyan-300" label="新增" />
        <LegendDot className="bg-gradient-to-r from-rose-600 to-rose-400" label="删除" />
        <LegendDot className="bg-gradient-to-r from-orange-500 to-yellow-400" label="更新" />
      </div>

      <div className="grid gap-2 text-xs text-slate-500 dark:text-slate-400 sm:grid-cols-2 md:grid-cols-3">
        {points.map((point, idx) => (
          <div key={point.startedAt} className="rounded-lg border border-slate-100 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="font-medium text-slate-700 dark:text-slate-200">{labels[idx]}</div>
            <div className="mt-1 flex gap-3 text-xs">
              <span>URL：{point.totalUrls}</span>
              <span className="text-emerald-600">+{point.added}</span>
              <span className="text-rose-500">-{point.removed}</span>
              <span className="text-amber-500">Δ{point.updated}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function LegendDot({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className={`h-3 w-3 rounded-full ${className}`} aria-hidden />
      <span>{label}</span>
    </span>
  );
}

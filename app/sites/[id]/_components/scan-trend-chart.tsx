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
  const { pathTotal, pathAdded, pathRemoved, pathUpdated, area, maxY, labels, sortedPoints } = useMemo(() => {
    if (!points.length)
      return {
        pathTotal: "",
        pathAdded: "",
        pathRemoved: "",
        pathUpdated: "",
        area: "",
        maxY: 0,
        labels: [] as string[],
        sortedPoints: [] as ScanPoint[],
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
      sortedPoints: sorted,
    };
  }, [points]);

  if (!points.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="font-medium">暂无扫描数据</p>
        <p className="mt-1 text-xs">执行一次手动扫描后即可查看趋势图表</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/40 hover-lift chart-animate">
      <div className="flex items-baseline justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </div>
            扫描数量趋势
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            最近 {points.length} 次扫描的 URL 总量变化
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-500 dark:text-slate-400">峰值</div>
          <div className="text-lg font-semibold text-primary">{maxY}</div>
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

      <div className="flex flex-wrap justify-center gap-6 text-sm">
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 dark:bg-blue-950/30">
          <LegendDot className="bg-gradient-to-r from-blue-600 to-sky-500" label="" />
          <span className="font-medium text-blue-700 dark:text-blue-300">总数</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30">
          <LegendDot className="bg-gradient-to-r from-emerald-600 to-cyan-300" label="" />
          <span className="font-medium text-emerald-700 dark:text-emerald-300">新增</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-rose-50 dark:bg-rose-950/30">
          <LegendDot className="bg-gradient-to-r from-rose-600 to-rose-400" label="" />
          <span className="font-medium text-rose-700 dark:text-rose-300">删除</span>
        </div>
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-50 dark:bg-orange-950/30">
          <LegendDot className="bg-gradient-to-r from-orange-500 to-yellow-400" label="" />
          <span className="font-medium text-orange-700 dark:text-orange-300">更新</span>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-sm font-medium text-muted-foreground">扫描记录</h4>
          <span className="text-xs text-muted-foreground">{points.length} 条记录</span>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-thin scrollbar-thumb-muted scrollbar-track-transparent">
          {points.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <svg className="mx-auto h-12 w-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <p>暂无扫描记录</p>
            </div>
          ) : (
            [...(sortedPoints || points)].reverse().map((point, idx) => {
              // 找到这个点在原始sorted数组中的索引，用于获取正确的label
              const originalIdx = (sortedPoints || points).findIndex(p => p.startedAt === point.startedAt);
              return (
            <div key={point.startedAt} className="group relative rounded-xl border bg-background/50 p-4 hover:bg-background/80 hover:shadow-md transition-all duration-200">
              {/* 时间标题 */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-primary pulse-dot"></div>
                  <span className="font-medium text-foreground">{labels[originalIdx] || `扫描记录 ${idx + 1}`}</span>
                </div>
                <div className="text-xs text-muted-foreground">
                  #{idx + 1}
                  {idx === 0 && <span className="ml-1 text-xs text-primary font-medium">最新</span>}
                </div>
              </div>
              
              {/* 主要指标 */}
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1">
                  <svg className="h-3 w-3 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span className="text-xs text-muted-foreground">总URL数量</span>
                </div>
                <div className="text-xl font-bold text-primary ml-5">{point.totalUrls}</div>
              </div>
              
              {/* 变更统计 */}
              <div className="grid grid-cols-3 gap-3">
                <div className="text-center p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <svg className="h-3 w-3 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    <span className="text-xs text-emerald-600/70">新增</span>
                  </div>
                  <div className="text-sm font-bold text-emerald-600">+{point.added}</div>
                </div>
                
                <div className="text-center p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <svg className="h-3 w-3 text-rose-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                    </svg>
                    <span className="text-xs text-rose-600/70">删除</span>
                  </div>
                  <div className="text-sm font-bold text-rose-600">-{point.removed}</div>
                </div>
                
                <div className="text-center p-2 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
                  <div className="flex items-center justify-center gap-1 mb-1">
                    <svg className="h-3 w-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    <span className="text-xs text-amber-600/70">更新</span>
                  </div>
                  <div className="text-sm font-bold text-amber-600">~{point.updated}</div>
                </div>
              </div>
              
              {/* 进度条 */}
              <div className="mt-3 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">活动比例</span>
                  <span className="text-muted-foreground">
                    {Math.round(((point.added + point.removed + point.updated) / Math.max(point.totalUrls, 1)) * 100)}%
                  </span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full flex">
                    <div 
                      className="bg-emerald-500 transition-all duration-500"
                      style={{ 
                        width: `${Math.max((point.added / Math.max(point.totalUrls, 1)) * 100, 0)}%` 
                      }}
                    ></div>
                    <div 
                      className="bg-rose-500 transition-all duration-500"
                      style={{ 
                        width: `${Math.max((point.removed / Math.max(point.totalUrls, 1)) * 100, 0)}%` 
                      }}
                    ></div>
                    <div 
                      className="bg-amber-500 transition-all duration-500"
                      style={{ 
                        width: `${Math.max((point.updated / Math.max(point.totalUrls, 1)) * 100, 0)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
            );
          }))}
        </div>
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

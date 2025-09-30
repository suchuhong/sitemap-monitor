'use client';

export type ChangeTrendPoint = {
  date: string;
  added: number;
  removed: number;
  updated: number;
};

export function ChangeTrendChart({ data }: { data: ChangeTrendPoint[] }) {
  if (!data.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
        最近 30 天暂无变更。
      </div>
    );
  }

  const width = 640;
  const height = 200;
  const padding = 32;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;
  const maxValue = Math.max(
    ...data.map((point) => Math.max(point.added, point.removed, point.updated)),
    1,
  );

  const projectX = (index: number) =>
    data.length === 1 ? padding + chartWidth / 2 : padding + (chartWidth * index) / (data.length - 1);
  const projectY = (value: number) => padding + chartHeight - (chartHeight * value) / maxValue;

  const addedPath = buildPath(data.map((point) => point.added), projectX, projectY);
  const removedPath = buildPath(data.map((point) => point.removed), projectX, projectY);
  const updatedPath = buildPath(data.map((point) => point.updated), projectX, projectY);

  return (
    <div className="space-y-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="addedStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>
          <linearGradient id="removedStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="100%" stopColor="#b91c1c" />
          </linearGradient>
          <linearGradient id="updatedStroke" x1="0" x2="1" y1="0" y2="0">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="100%" stopColor="#d97706" />
          </linearGradient>
          <pattern id="trendGrid" width="32" height="32" patternUnits="userSpaceOnUse">
            <path d="M32 32H0V0" fill="none" stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
          </pattern>
        </defs>

        <g>
          <rect x={padding} y={padding} width={chartWidth} height={chartHeight} fill="url(#trendGrid)" />
          {removedPath && (
            <path
              d={removedPath}
              fill="none"
              stroke="url(#removedStroke)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {updatedPath && (
            <path
              d={updatedPath}
              fill="none"
              stroke="url(#updatedStroke)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
          {addedPath && (
            <path
              d={addedPath}
              fill="none"
              stroke="url(#addedStroke)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}
        </g>
      </svg>

      <div className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 md:grid-cols-3">
        {data.map((point) => (
          <div key={point.date} className="rounded-md border border-slate-100 bg-slate-50 p-2 dark:border-slate-800 dark:bg-slate-900/40">
            <div className="font-medium text-slate-700 dark:text-slate-200">{point.date}</div>
            <div className="mt-1 flex gap-2 text-xs">
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

function buildPath(values: number[], projectX: (i: number) => number, projectY: (v: number) => number) {
  return values
    .map((value, index) => `${index === 0 ? "M" : "L"}${projectX(index)},${projectY(Math.max(0, value))}`)
    .join(" ");
}

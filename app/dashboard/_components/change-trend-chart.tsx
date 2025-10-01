'use client';

import { useState } from 'react';

export type ChangeTrendPoint = {
  date: string;
  added: number;
  removed: number;
  updated: number;
};

export function ChangeTrendChart({ data }: { data: ChangeTrendPoint[] }) {
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null);
  const [activeLines, setActiveLines] = useState({
    added: true,
    removed: true,
    updated: true,
  });

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/60">
        <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
          <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </div>
        <p className="font-medium">最近 30 天暂无变更</p>
        <p className="mt-1 text-xs">当有站点地图变化时，这里将显示趋势图表</p>
      </div>
    );
  }

  const width = 720;
  const height = 280;
  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  const maxValue = Math.max(
    ...data.map((point) => Math.max(point.added, point.removed, point.updated)),
    5, // 最小值确保图表有合理的比例
  );

  const projectX = (index: number) =>
    data.length === 1
      ? padding.left + chartWidth / 2
      : padding.left + (chartWidth * index) / (data.length - 1);

  const projectY = (value: number) =>
    padding.top + chartHeight - (chartHeight * value) / maxValue;

  // 生成网格线
  const gridLines = [];
  const ySteps = 5;
  for (let i = 0; i <= ySteps; i++) {
    const y = padding.top + (chartHeight * i) / ySteps;
    const value = Math.round(maxValue * (ySteps - i) / ySteps);
    gridLines.push({ y, value });
  }

  const addedPath = buildSmoothPath(data.map((point) => point.added), projectX, projectY);
  const removedPath = buildSmoothPath(data.map((point) => point.removed), projectX, projectY);
  const updatedPath = buildSmoothPath(data.map((point) => point.updated), projectX, projectY);

  const addedArea = buildAreaPath(data.map((point) => point.added), projectX, projectY, padding.top + chartHeight);
  const removedArea = buildAreaPath(data.map((point) => point.removed), projectX, projectY, padding.top + chartHeight);
  const updatedArea = buildAreaPath(data.map((point) => point.updated), projectX, projectY, padding.top + chartHeight);

  const toggleLine = (line: keyof typeof activeLines) => {
    setActiveLines(prev => ({ ...prev, [line]: !prev[line] }));
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    return `${month}月${day}日`;
  };

  return (
    <div className="space-y-6">
      {/* 图例 */}
      <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
        <button
          onClick={() => toggleLine('added')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-muted/50 ${activeLines.added ? 'opacity-100' : 'opacity-50'
            }`}
        >
          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-emerald-500 to-emerald-600"></div>
          <span className="font-medium">新增页面</span>
        </button>
        <button
          onClick={() => toggleLine('removed')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-muted/50 ${activeLines.removed ? 'opacity-100' : 'opacity-50'
            }`}
        >
          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-rose-500 to-rose-600"></div>
          <span className="font-medium">删除页面</span>
        </button>
        <button
          onClick={() => toggleLine('updated')}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:bg-muted/50 ${activeLines.updated ? 'opacity-100' : 'opacity-50'
            }`}
        >
          <div className="h-3 w-3 rounded-full bg-gradient-to-r from-amber-500 to-amber-600"></div>
          <span className="font-medium">更新页面</span>
        </button>
      </div>

      {/* 图表 */}
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full overflow-visible"
          style={{ background: 'transparent' }}
        >
          <defs>
            {/* 渐变定义 */}
            <linearGradient id="addedGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="removedGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="updatedGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.05" />
            </linearGradient>

            {/* 阴影滤镜 */}
            <filter id="dropShadow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodOpacity="0.1" />
            </filter>
          </defs>

          {/* 网格线 */}
          <g className="opacity-30">
            {gridLines.map((line, i) => (
              <g key={i}>
                <line
                  x1={padding.left}
                  y1={line.y}
                  x2={padding.left + chartWidth}
                  y2={line.y}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="2,4"
                  className="text-muted-foreground"
                />
                <text
                  x={padding.left - 8}
                  y={line.y + 4}
                  textAnchor="end"
                  className="text-xs fill-muted-foreground"
                >
                  {line.value}
                </text>
              </g>
            ))}
          </g>

          {/* 面积图 */}
          {activeLines.added && addedArea && (
            <path
              d={addedArea}
              fill="url(#addedGradient)"
              className="transition-opacity duration-300"
            />
          )}
          {activeLines.removed && removedArea && (
            <path
              d={removedArea}
              fill="url(#removedGradient)"
              className="transition-opacity duration-300"
            />
          )}
          {activeLines.updated && updatedArea && (
            <path
              d={updatedArea}
              fill="url(#updatedGradient)"
              className="transition-opacity duration-300"
            />
          )}

          {/* 线条 */}
          {activeLines.removed && removedPath && (
            <path
              d={removedPath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#dropShadow)"
              className="transition-opacity duration-300"
            />
          )}
          {activeLines.updated && updatedPath && (
            <path
              d={updatedPath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#dropShadow)"
              className="transition-opacity duration-300"
            />
          )}
          {activeLines.added && addedPath && (
            <path
              d={addedPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter="url(#dropShadow)"
              className="transition-opacity duration-300"
            />
          )}

          {/* 数据点 */}
          {data.map((point, index) => {
            const x = projectX(index);
            const isHovered = hoveredPoint === index;

            return (
              <g key={index}>
                {/* 悬停区域 */}
                <rect
                  x={x - 15}
                  y={padding.top}
                  width="30"
                  height={chartHeight}
                  fill="transparent"
                  onMouseEnter={() => setHoveredPoint(index)}
                  onMouseLeave={() => setHoveredPoint(null)}
                  className="cursor-pointer"
                />

                {/* 悬停线 */}
                {isHovered && (
                  <line
                    x1={x}
                    y1={padding.top}
                    x2={x}
                    y2={padding.top + chartHeight}
                    stroke="currentColor"
                    strokeWidth="1"
                    strokeDasharray="4,4"
                    className="text-muted-foreground opacity-50"
                  />
                )}

                {/* 数据点 */}
                {activeLines.added && (
                  <circle
                    cx={x}
                    cy={projectY(point.added)}
                    r={isHovered ? "6" : "4"}
                    fill="#10b981"
                    stroke="white"
                    strokeWidth="2"
                    className="transition-all duration-200"
                    filter="url(#dropShadow)"
                  />
                )}
                {activeLines.removed && (
                  <circle
                    cx={x}
                    cy={projectY(point.removed)}
                    r={isHovered ? "6" : "4"}
                    fill="#ef4444"
                    stroke="white"
                    strokeWidth="2"
                    className="transition-all duration-200"
                    filter="url(#dropShadow)"
                  />
                )}
                {activeLines.updated && (
                  <circle
                    cx={x}
                    cy={projectY(point.updated)}
                    r={isHovered ? "6" : "4"}
                    fill="#f59e0b"
                    stroke="white"
                    strokeWidth="2"
                    className="transition-all duration-200"
                    filter="url(#dropShadow)"
                  />
                )}
              </g>
            );
          })}

          {/* X轴标签 */}
          <g>
            {data.map((point, index) => {
              const x = projectX(index);
              const showLabel = data.length <= 10 || index % Math.ceil(data.length / 8) === 0;

              if (!showLabel) return null;

              return (
                <text
                  key={index}
                  x={x}
                  y={height - 10}
                  textAnchor="middle"
                  className="text-xs fill-muted-foreground"
                >
                  {formatDate(point.date)}
                </text>
              );
            })}
          </g>
        </svg>

        {/* 悬停提示 */}
        {hoveredPoint !== null && (
          <div
            className="absolute z-10 rounded-lg border bg-background/95 p-3 shadow-lg backdrop-blur-sm"
            style={{
              left: `${(projectX(hoveredPoint) / width) * 100}%`,
              top: '10px',
              transform: 'translateX(-50%)',
            }}
          >
            <div className="text-sm font-medium mb-2">{data[hoveredPoint].date}</div>
            <div className="space-y-1 text-xs">
              {activeLines.added && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
                  <span>新增: {data[hoveredPoint].added}</span>
                </div>
              )}
              {activeLines.removed && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-rose-500"></div>
                  <span>删除: {data[hoveredPoint].removed}</span>
                </div>
              )}
              {activeLines.updated && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500"></div>
                  <span>更新: {data[hoveredPoint].updated}</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 统计摘要 */}
      <div className="grid gap-4 text-xs sm:grid-cols-3">
        <div className="rounded-lg border bg-gradient-to-br from-emerald-50 to-emerald-100 p-4 dark:from-emerald-950/50 dark:to-emerald-900/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-3 rounded-full bg-emerald-500"></div>
            <span className="font-medium text-emerald-700 dark:text-emerald-300">总新增</span>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.reduce((sum, point) => sum + point.added, 0)}
          </div>
          <div className="text-emerald-600/70 dark:text-emerald-400/70">
            平均 {Math.round(data.reduce((sum, point) => sum + point.added, 0) / data.length)} / 天
          </div>
        </div>

        <div className="rounded-lg border bg-gradient-to-br from-rose-50 to-rose-100 p-4 dark:from-rose-950/50 dark:to-rose-900/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-3 rounded-full bg-rose-500"></div>
            <span className="font-medium text-rose-700 dark:text-rose-300">总删除</span>
          </div>
          <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
            {data.reduce((sum, point) => sum + point.removed, 0)}
          </div>
          <div className="text-rose-600/70 dark:text-rose-400/70">
            平均 {Math.round(data.reduce((sum, point) => sum + point.removed, 0) / data.length)} / 天
          </div>
        </div>

        <div className="rounded-lg border bg-gradient-to-br from-amber-50 to-amber-100 p-4 dark:from-amber-950/50 dark:to-amber-900/30">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-3 w-3 rounded-full bg-amber-500"></div>
            <span className="font-medium text-amber-700 dark:text-amber-300">总更新</span>
          </div>
          <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
            {data.reduce((sum, point) => sum + point.updated, 0)}
          </div>
          <div className="text-amber-600/70 dark:text-amber-400/70">
            平均 {Math.round(data.reduce((sum, point) => sum + point.updated, 0) / data.length)} / 天
          </div>
        </div>
      </div>
    </div>
  );
}

// 构建平滑曲线路径
function buildSmoothPath(values: number[], projectX: (i: number) => number, projectY: (v: number) => number) {
  if (values.length === 0) return '';
  if (values.length === 1) {
    const x = projectX(0);
    const y = projectY(Math.max(0, values[0]));
    return `M${x},${y}`;
  }

  const points = values.map((value, index) => ({
    x: projectX(index),
    y: projectY(Math.max(0, value))
  }));

  let path = `M${points[0].x},${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];

    if (i === 1) {
      // 第一段使用二次贝塞尔曲线
      const cp1x = prev.x + (curr.x - prev.x) * 0.5;
      const cp1y = prev.y;
      path += ` Q${cp1x},${cp1y} ${curr.x},${curr.y}`;
    } else {
      // 后续使用平滑的三次贝塞尔曲线
      const prevPrev = points[i - 2];
      const next = points[i + 1] || curr;

      const cp1x = prev.x + (curr.x - prevPrev.x) * 0.15;
      const cp1y = prev.y + (curr.y - prevPrev.y) * 0.15;
      const cp2x = curr.x - (next.x - prev.x) * 0.15;
      const cp2y = curr.y - (next.y - prev.y) * 0.15;

      path += ` C${cp1x},${cp1y} ${cp2x},${cp2y} ${curr.x},${curr.y}`;
    }
  }

  return path;
}

// 构建面积图路径
function buildAreaPath(values: number[], projectX: (i: number) => number, projectY: (v: number) => number, baseY: number) {
  if (values.length === 0) return '';

  const smoothPath = buildSmoothPath(values, projectX, projectY);
  if (!smoothPath) return '';

  const firstX = projectX(0);
  const lastX = projectX(values.length - 1);

  return `${smoothPath} L${lastX},${baseY} L${firstX},${baseY} Z`;
}

// 保留原函数以防其他地方使用
function buildPath(values: number[], projectX: (i: number) => number, projectY: (v: number) => number) {
  return values
    .map((value, index) => `${index === 0 ? "M" : "L"}${projectX(index)},${projectY(Math.max(0, value))}`)
    .join(" ");
}

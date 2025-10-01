'use client';

import { ChangeTrendChart, type ChangeTrendPoint } from './change-trend-chart';

// 生成示例数据
function pseudoRandom(seed: number) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function generateSampleData(): ChangeTrendPoint[] {
  const data: ChangeTrendPoint[] = [];
  const today = new Date();
  
  for (let i = 29; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    
    // 使用确定性的伪随机函数，避免 SSR 与客户端渲染不一致
    const baseActivity = Math.sin((i / 30) * Math.PI * 2) * 5 + 10;
    const noise1 = pseudoRandom(i * 12.9898 + 78.233) - 0.5;
    const noise2 = pseudoRandom(i * 93.9898 + 41.233) - 0.5;
    const noise3 = pseudoRandom(i * 57.5432 + 11.618) - 0.5;

    const added = Math.max(0, Math.floor(baseActivity + noise1 * 6));
    const removed = Math.max(0, Math.floor(baseActivity * 0.3 + noise2 * 3));
    const updated = Math.max(0, Math.floor(baseActivity * 0.6 + noise3 * 5));
    
    data.push({
      date: date.toISOString().split('T')[0],
      added,
      removed,
      updated,
    });
  }
  
  return data;
}

export function ChartPreview() {
  const sampleData = generateSampleData();
  
  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-2xl font-bold gradient-text mb-2">
          优化后的指标曲线展示
        </h2>
        <p className="text-muted-foreground">
          交互式图表，支持悬停查看详情、图例切换等功能
        </p>
      </div>
      
      <div className="chart-animate">
        <ChangeTrendChart data={sampleData} />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">优化亮点</h3>
          <ul className="text-sm space-y-1">
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              平滑的贝塞尔曲线，视觉更流畅
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              渐变面积图，层次更丰富
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              交互式悬停提示
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-rose-500"></div>
              可切换的图例控制
            </li>
          </ul>
        </div>
        
        <div className="rounded-lg border p-4 space-y-2">
          <h3 className="font-semibold text-sm text-muted-foreground">技术特性</h3>
          <ul className="text-sm space-y-1">
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              响应式设计，适配各种屏幕
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              暗色模式完美支持
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              SVG 矢量图形，高清显示
            </li>
            <li className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-primary"></div>
              无外部依赖，性能优异
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

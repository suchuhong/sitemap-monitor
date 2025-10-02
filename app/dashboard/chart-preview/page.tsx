import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ChartPreview } from "../_components/chart-preview";



export default function ChartPreviewPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">图表预览</h1>
          <p className="text-muted-foreground">查看优化后的指标曲线显示效果</p>
        </div>
        <Link href="/dashboard">
          <Button variant="outline" className="hover-lift">
            <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            返回面板
          </Button>
        </Link>
      </div>

      {/* Chart Preview */}
      <ChartPreview />
    </div>
  );
}
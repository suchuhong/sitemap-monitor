import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Home() {
  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <section className="text-center space-y-6">
        <div className="space-y-4">
          <h1 className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent">
            智能 Sitemap 监控
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            实时监控网站地图变化，智能分析站点结构，为您的 SEO 优化提供数据支持
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg" className="hover-lift">
            <Link href="/dashboard">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              进入控制台
            </Link>
          </Button>
          <Button variant="outline" size="lg" asChild className="hover-lift">
            <Link href="/sites/new">
              <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              添加站点
            </Link>
          </Button>
        </div>
      </section>

      {/* Features Section */}
      <section className="grid gap-6 md:grid-cols-3">
        <Card className="hover-lift">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <CardTitle className="text-lg">实时监控</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              24/7 自动监控网站地图变化，及时发现新增、删除或修改的页面
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 text-info">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <CardTitle className="text-lg">数据分析</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              深度分析站点结构变化趋势，提供详细的统计报告和可视化图表
            </p>
          </CardContent>
        </Card>

        <Card className="hover-lift">
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 15h8v-2H4v2zM4 11h10V9H4v2z" />
                </svg>
              </div>
              <CardTitle className="text-lg">智能提醒</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              智能识别重要变化，通过多种方式及时通知，确保您不错过任何关键信息
            </p>
          </CardContent>
        </Card>
      </section>

      {/* Stats Section */}
      <section className="text-center space-y-6">
        <h2 className="text-2xl font-bold">为什么选择我们？</h2>
        <div className="grid gap-6 md:grid-cols-4">
          <div className="space-y-2">
            <div className="text-3xl font-bold text-primary">99.9%</div>
            <div className="text-sm text-muted-foreground">服务可用性</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-success">{"< 1s"}</div>
            <div className="text-sm text-muted-foreground">响应时间</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-info">24/7</div>
            <div className="text-sm text-muted-foreground">实时监控</div>
          </div>
          <div className="space-y-2">
            <div className="text-3xl font-bold text-warning">智能</div>
            <div className="text-sm text-muted-foreground">AI 分析</div>
          </div>
        </div>
      </section>
    </div>
  );
}

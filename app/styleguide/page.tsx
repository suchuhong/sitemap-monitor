import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusIndicator } from "@/components/ui/status-indicator";
import { Loading, LoadingCard, LoadingTable } from "@/components/ui/loading";
import { Input } from "@/components/ui/input";
import { EmptyStateDemo } from "./empty-state-demo";

export default function StyleGuidePage() {
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-4xl font-bold tracking-tight">样式指南</h1>
        <p className="text-muted-foreground mt-2">展示优化后的 UI 组件</p>
      </div>

      {/* Colors */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">色彩系统</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <div className="h-16 w-full rounded-lg bg-primary"></div>
              <CardTitle className="text-lg">Primary</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">主要品牌色</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <div className="h-16 w-full rounded-lg bg-success"></div>
              <CardTitle className="text-lg">Success</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">成功状态</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-16 w-full rounded-lg bg-warning"></div>
              <CardTitle className="text-lg">Warning</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">警告状态</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="h-16 w-full rounded-lg bg-destructive"></div>
              <CardTitle className="text-lg">Destructive</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">危险状态</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">按钮组件</h2>
        <div className="flex flex-wrap gap-4">
          <Button>默认按钮</Button>
          <Button variant="secondary">次要按钮</Button>
          <Button variant="outline">边框按钮</Button>
          <Button variant="ghost">幽灵按钮</Button>
          <Button variant="destructive">危险按钮</Button>
          <Button variant="link">链接按钮</Button>
        </div>
        <div className="flex flex-wrap gap-4">
          <Button size="sm">小按钮</Button>
          <Button size="default">默认大小</Button>
          <Button size="lg">大按钮</Button>
          <Button size="icon">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </Button>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">卡片组件</h2>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card className="hover-lift">
            <CardHeader>
              <CardTitle>基础卡片</CardTitle>
              <CardDescription>这是一个基础的卡片组件</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                卡片内容区域，可以包含任何内容
              </p>
            </CardContent>
          </Card>

          <Card className="hover-lift">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">统计卡片</CardTitle>
              <svg className="h-4 w-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">1,234</div>
              <p className="text-xs text-muted-foreground">
                +20.1% 相比上月
              </p>
            </CardContent>
          </Card>

          <LoadingCard />
        </div>
      </section>

      {/* Badges */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">徽章组件</h2>
        <div className="flex flex-wrap gap-4">
          <Badge>默认</Badge>
          <Badge variant="secondary">次要</Badge>
          <Badge variant="outline">边框</Badge>
          <Badge variant="destructive">危险</Badge>
          <Badge variant="success">成功</Badge>
          <Badge variant="warning">警告</Badge>
          <Badge variant="info">信息</Badge>
        </div>
        <div className="flex flex-wrap gap-4">
          <Badge variant="added">新增</Badge>
          <Badge variant="removed">删除</Badge>
          <Badge variant="updated">更新</Badge>
        </div>
      </section>

      {/* Status Indicators */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">状态指示器</h2>
        <div className="flex flex-wrap gap-4">
          <StatusIndicator status="success">运行中</StatusIndicator>
          <StatusIndicator status="error">错误</StatusIndicator>
          <StatusIndicator status="warning">警告</StatusIndicator>
          <StatusIndicator status="info">信息</StatusIndicator>
          <StatusIndicator status="pending">等待中</StatusIndicator>
        </div>
      </section>

      {/* Loading States */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">加载状态</h2>
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Loading size="sm" />
            <Loading size="md" />
            <Loading size="lg" />
          </div>
          <LoadingTable />
        </div>
      </section>

      {/* Form Elements */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">表单元素</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">输入框</label>
            <Input placeholder="请输入内容..." />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">搜索框</label>
            <Input type="search" placeholder="搜索..." />
          </div>
        </div>
      </section>

      {/* Empty States */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">空状态</h2>
        <Card>
          <CardContent className="p-0">
            <EmptyStateDemo />
          </CardContent>
        </Card>
      </section>

      {/* Typography */}
      <section className="space-y-6">
        <h2 className="text-2xl font-semibold">排版系统</h2>
        <div className="space-y-4">
          <h1 className="text-4xl font-bold">标题 1 - 4xl</h1>
          <h2 className="text-3xl font-bold">标题 2 - 3xl</h2>
          <h3 className="text-2xl font-bold">标题 3 - 2xl</h3>
          <h4 className="text-xl font-bold">标题 4 - xl</h4>
          <h5 className="text-lg font-bold">标题 5 - lg</h5>
          <h6 className="text-base font-bold">标题 6 - base</h6>
          <p className="text-base">正文文本 - base</p>
          <p className="text-sm text-muted-foreground">小号文本 - sm</p>
          <p className="text-xs text-muted-foreground">极小文本 - xs</p>
        </div>
      </section>
    </div>
  );
}

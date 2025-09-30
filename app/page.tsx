import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "专业的网站地图监控与SEO优化平台 - Sitemap Monitor",
  description: "Sitemap Monitor是专业的网站地图监控平台，提供实时sitemap监控、SEO数据分析、网站结构优化建议。支持多站点管理，自动化监控，助力提升网站搜索引擎排名。免费试用，立即开始优化您的网站SEO。",
  keywords: ["sitemap监控", "网站地图监控", "SEO优化工具", "网站监控", "搜索引擎优化", "站点地图分析", "网站结构监控", "SEO数据分析"],
  openGraph: {
    title: "专业的网站地图监控与SEO优化平台 - Sitemap Monitor",
    description: "实时监控网站地图变化，智能分析站点结构，为您的SEO优化提供专业数据支持。",
    url: "https://sitemap-monitor.com",
    type: "website",
  },
};

// 结构化数据
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Sitemap Monitor",
  "description": "专业的网站地图监控与SEO优化平台，提供实时sitemap监控、SEO数据分析、网站结构优化建议。",
  "url": "https://sitemap-monitor.com",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "CNY",
    "description": "免费试用版本"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "156",
    "bestRating": "5",
    "worstRating": "1"
  },
  "featureList": [
    "实时网站地图监控",
    "SEO数据分析",
    "多站点管理",
    "自动化监控",
    "智能提醒通知",
    "详细统计报告"
  ]
};

export default function Home() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="space-y-16">
        {/* Hero Section */}
        <section className="text-center space-y-8" aria-labelledby="hero-title">
          <div className="space-y-6">
            <h1
              id="hero-title"
              className="text-4xl font-bold tracking-tight sm:text-6xl bg-gradient-to-r from-primary via-blue-600 to-purple-600 bg-clip-text text-transparent"
            >
              专业的网站地图监控与SEO优化平台
            </h1>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Sitemap Monitor 提供<strong>实时网站地图监控</strong>、<strong>智能SEO分析</strong>和<strong>站点结构优化</strong>服务。
              帮助您及时发现网站变化，优化搜索引擎排名，提升网站流量和用户体验。
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-4 justify-center" role="group" aria-label="主要操作按钮">
            <Button asChild size="lg" className="hover-lift">
              <Link href="/dashboard" aria-label="进入Sitemap Monitor控制台">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                免费试用控制台
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="hover-lift">
              <Link href="/sites/new" aria-label="添加您的第一个监控站点">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                立即添加站点
              </Link>
            </Button>
          </div>
        </section>

        {/* Features Section */}
        <section className="space-y-8" aria-labelledby="features-title">
          <div className="text-center space-y-4">
            <h2 id="features-title" className="text-3xl font-bold">
              为什么选择 Sitemap Monitor？
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              我们提供全面的网站地图监控解决方案，帮助您优化SEO策略，提升网站在搜索引擎中的表现
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card className="hover-lift" itemScope itemType="https://schema.org/Service">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10 text-success" aria-hidden="true">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <CardTitle className="text-xl" itemProp="name">实时网站地图监控</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed" itemProp="description">
                  <strong>24/7 全天候自动监控</strong>您的网站地图变化。及时发现新增、删除或修改的页面，
                  确保搜索引擎能够快速索引您的最新内容，提升网站收录效率。
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift" itemScope itemType="https://schema.org/Service">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-info/10 text-info" aria-hidden="true">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-xl" itemProp="name">智能SEO数据分析</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed" itemProp="description">
                  <strong>深度分析网站结构变化趋势</strong>，提供详细的SEO统计报告和可视化图表。
                  帮助您了解网站优化效果，制定更有效的SEO策略。
                </p>
              </CardContent>
            </Card>

            <Card className="hover-lift" itemScope itemType="https://schema.org/Service">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-warning/10 text-warning" aria-hidden="true">
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5zM4 19h6v-2H4v2zM4 15h8v-2H4v2zM4 11h10V9H4v2z" />
                    </svg>
                  </div>
                  <CardTitle className="text-xl" itemProp="name">智能提醒通知</CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground leading-relaxed" itemProp="description">
                  <strong>AI智能识别重要变化</strong>，通过邮件、短信等多种方式及时通知。
                  确保您不错过任何影响SEO的关键信息，第一时间响应网站变化。
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="space-y-8" aria-labelledby="benefits-title">
          <div className="text-center space-y-4">
            <h2 id="benefits-title" className="text-3xl font-bold">
              使用 Sitemap Monitor 的核心优势
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              专业的技术团队，可靠的服务保障，助力您的网站SEO优化取得更好效果
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center space-y-3" itemScope itemType="https://schema.org/Offer">
              <div className="text-4xl font-bold text-primary" itemProp="price">99.9%</div>
              <div className="text-sm text-muted-foreground font-medium" itemProp="description">服务可用性保障</div>
              <p className="text-xs text-muted-foreground">企业级稳定性</p>
            </div>
            <div className="text-center space-y-3">
              <div className="text-4xl font-bold text-success">{"< 1s"}</div>
              <div className="text-sm text-muted-foreground font-medium">平均响应时间</div>
              <p className="text-xs text-muted-foreground">极速数据处理</p>
            </div>
            <div className="text-center space-y-3">
              <div className="text-4xl font-bold text-info">24/7</div>
              <div className="text-sm text-muted-foreground font-medium">全天候监控</div>
              <p className="text-xs text-muted-foreground">不间断服务</p>
            </div>
            <div className="text-center space-y-3">
              <div className="text-4xl font-bold text-warning">AI</div>
              <div className="text-sm text-muted-foreground font-medium">智能分析引擎</div>
              <p className="text-xs text-muted-foreground">机器学习驱动</p>
            </div>
          </div>
        </section>

        {/* How it Works Section */}
        <section className="space-y-8" aria-labelledby="how-it-works-title">
          <div className="text-center space-y-4">
            <h2 id="how-it-works-title" className="text-3xl font-bold">
              如何开始使用 Sitemap Monitor？
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              简单三步，即可开始专业的网站地图监控和SEO优化
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold text-xl">
                1
              </div>
              <h3 className="text-xl font-semibold">添加您的网站</h3>
              <p className="text-muted-foreground">
                输入您的网站URL，我们会自动检测和分析您的网站地图结构
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-success/10 rounded-full flex items-center justify-center text-success font-bold text-xl">
                2
              </div>
              <h3 className="text-xl font-semibold">配置监控规则</h3>
              <p className="text-muted-foreground">
                设置监控频率、通知方式和关注的页面类型，个性化您的监控策略
              </p>
            </div>
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-info/10 rounded-full flex items-center justify-center text-info font-bold text-xl">
                3
              </div>
              <h3 className="text-xl font-semibold">获取分析报告</h3>
              <p className="text-muted-foreground">
                查看详细的监控报告和SEO建议，持续优化您的网站表现
              </p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="bg-gradient-to-r from-primary/10 via-blue-50 to-purple-50 dark:from-primary/5 dark:via-blue-950/20 dark:to-purple-950/20 rounded-2xl p-8 md:p-12 text-center space-y-6">
          <h2 className="text-3xl font-bold">
            立即开始优化您的网站SEO
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            加入数千家企业的选择，使用 Sitemap Monitor 提升您的网站搜索引擎表现。
            <strong>免费试用</strong>，无需信用卡，立即体验专业的网站监控服务。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg" className="hover-lift">
              <Link href="/sites/new">
                开始免费试用
              </Link>
            </Button>
            <Button variant="outline" size="lg" asChild className="hover-lift">
              <Link href="/dashboard">
                查看演示
              </Link>
            </Button>
          </div>
        </section>
      </article>
    </>
  );
}

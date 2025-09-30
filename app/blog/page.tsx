import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SEO优化博客 - Sitemap Monitor专业见解",
  description: "Sitemap Monitor官方博客，分享网站地图监控、SEO优化技巧、搜索引擎优化最佳实践。专业的SEO知识分享，助力您的网站获得更好的搜索引擎排名。",
  keywords: ["SEO博客", "网站优化", "sitemap优化", "搜索引擎优化", "SEO技巧", "网站监控"],
};

const blogPosts = [
  {
    id: 1,
    title: "2024年网站地图优化完整指南：提升SEO效果的关键策略",
    excerpt: "深入解析如何优化网站地图以提升搜索引擎排名。包含最新的SEO最佳实践、技术实现方法和常见问题解决方案。",
    category: "SEO优化",
    readTime: "8分钟阅读",
    publishDate: "2024-01-15",
    tags: ["sitemap", "SEO", "网站优化"],
    featured: true
  },
  {
    id: 2,
    title: "如何监控大型电商网站的Sitemap变化：实战经验分享",
    excerpt: "分享监控大型电商网站sitemap的实战经验，包括技术挑战、解决方案和效果评估。适合电商运营和技术团队。",
    category: "技术实践",
    readTime: "12分钟阅读", 
    publishDate: "2024-01-10",
    tags: ["电商SEO", "大型网站", "监控策略"]
  },
  {
    id: 3,
    title: "搜索引擎如何处理Sitemap：Google、百度、必应的差异分析",
    excerpt: "详细分析主流搜索引擎对sitemap的处理机制，帮助您制定更有针对性的SEO策略。",
    category: "搜索引擎",
    readTime: "10分钟阅读",
    publishDate: "2024-01-05", 
    tags: ["Google", "百度", "搜索引擎"]
  },
  {
    id: 4,
    title: "WordPress网站Sitemap自动化监控设置教程",
    excerpt: "详细的WordPress网站sitemap监控设置教程，包括插件推荐、配置方法和常见问题解决。",
    category: "WordPress",
    readTime: "6分钟阅读",
    publishDate: "2024-01-01",
    tags: ["WordPress", "自动化", "教程"]
  },
  {
    id: 5,
    title: "移动优先索引时代的Sitemap优化策略",
    excerpt: "随着移动优先索引的普及，如何调整sitemap策略以适应新的搜索引擎算法。",
    category: "移动SEO",
    readTime: "7分钟阅读",
    publishDate: "2023-12-28",
    tags: ["移动SEO", "索引优化", "算法更新"]
  },
  {
    id: 6,
    title: "网站改版时的Sitemap迁移最佳实践",
    excerpt: "网站改版过程中如何正确处理sitemap迁移，避免SEO损失，确保搜索引擎顺利过渡。",
    category: "网站改版",
    readTime: "9分钟阅读",
    publishDate: "2023-12-25",
    tags: ["网站改版", "SEO迁移", "最佳实践"]
  }
];

const categories = ["全部", "SEO优化", "技术实践", "搜索引擎", "WordPress", "移动SEO", "网站改版"];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "Sitemap Monitor SEO博客",
  "description": "专业的SEO优化和网站地图监控知识分享",
  "url": "https://sitemap-monitor.com/blog",
  "publisher": {
    "@type": "Organization",
    "name": "Sitemap Monitor",
    "url": "https://sitemap-monitor.com"
  },
  "blogPost": blogPosts.map(post => ({
    "@type": "BlogPosting",
    "headline": post.title,
    "description": post.excerpt,
    "datePublished": post.publishDate,
    "author": {
      "@type": "Organization",
      "name": "Sitemap Monitor"
    },
    "publisher": {
      "@type": "Organization", 
      "name": "Sitemap Monitor"
    }
  }))
};

export default function BlogPage() {
  const featuredPost = blogPosts.find(post => post.featured);
  const regularPosts = blogPosts.filter(post => !post.featured);

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <article className="space-y-12">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            SEO优化博客
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            分享专业的网站地图监控和SEO优化知识，助力您的网站获得更好的搜索引擎排名
          </p>
        </div>

        {/* Categories Filter */}
        <div className="flex flex-wrap gap-2 justify-center">
          {categories.map((category) => (
            <Badge 
              key={category} 
              variant={category === "全部" ? "default" : "outline"}
              className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              {category}
            </Badge>
          ))}
        </div>

        {/* Featured Post */}
        {featuredPost && (
          <section className="space-y-4">
            <h2 className="text-2xl font-semibold">精选文章</h2>
            <Card className="hover-lift overflow-hidden">
              <div className="md:flex">
                <div className="md:w-1/3 bg-gradient-to-br from-primary/10 to-blue-50 dark:from-primary/5 dark:to-blue-950/20 p-8 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <div className="text-4xl font-bold text-primary">SEO</div>
                    <div className="text-sm text-muted-foreground">精选推荐</div>
                  </div>
                </div>
                <div className="md:w-2/3 p-6">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="default">{featuredPost.category}</Badge>
                      <span>•</span>
                      <span>{featuredPost.publishDate}</span>
                      <span>•</span>
                      <span>{featuredPost.readTime}</span>
                    </div>
                    <h3 className="text-2xl font-bold leading-tight">
                      <Link href={`/blog/${featuredPost.id}`} className="hover:text-primary transition-colors">
                        {featuredPost.title}
                      </Link>
                    </h3>
                    <p className="text-muted-foreground leading-relaxed">
                      {featuredPost.excerpt}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {featuredPost.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </section>
        )}

        {/* Regular Posts */}
        <section className="space-y-6">
          <h2 className="text-2xl font-semibold">最新文章</h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {regularPosts.map((post) => (
              <Card key={post.id} className="hover-lift h-full flex flex-col">
                <CardHeader className="flex-1">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Badge variant="secondary">{post.category}</Badge>
                      <span>{post.readTime}</span>
                    </div>
                    <CardTitle className="text-lg leading-tight">
                      <Link href={`/blog/${post.id}`} className="hover:text-primary transition-colors">
                        {post.title}
                      </Link>
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {post.excerpt}
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {post.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{post.publishDate}</span>
                      <Link 
                        href={`/blog/${post.id}`}
                        className="text-primary hover:underline"
                      >
                        阅读更多 →
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Newsletter Signup */}
        <section className="bg-gradient-to-r from-primary/10 to-blue-50 dark:from-primary/5 dark:to-blue-950/20 rounded-2xl p-8 text-center space-y-6">
          <h2 className="text-2xl font-bold">
            订阅我们的SEO优化资讯
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            获取最新的SEO优化技巧、网站监控策略和行业动态。每周精选内容，助力您的网站持续优化。
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center max-w-md mx-auto">
            <input 
              type="email" 
              placeholder="输入您的邮箱地址"
              className="flex-1 px-4 py-2 rounded-md border border-input bg-background text-sm"
            />
            <button className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
              订阅
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            我们承诺不会发送垃圾邮件，您可以随时取消订阅
          </p>
        </section>
      </article>
    </>
  );
}
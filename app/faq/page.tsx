import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Metadata } from "next";


export const metadata: Metadata = {
  title: "常见问题 - Sitemap Monitor网站地图监控平台",
  description: "Sitemap Monitor常见问题解答：如何监控网站地图、SEO优化技巧、网站监控设置、故障排除等。专业的技术支持，帮助您更好地使用网站地图监控服务。",
  keywords: ["sitemap监控FAQ", "网站地图监控问题", "SEO优化问答", "网站监控帮助", "技术支持"],
};

const faqData = [
  {
    category: "基础功能",
    questions: [
      {
        q: "什么是网站地图（Sitemap）监控？",
        a: "网站地图监控是指实时跟踪和分析您网站sitemap.xml文件的变化。当您的网站添加、删除或修改页面时，我们会及时检测这些变化，帮助您了解网站结构的动态变化，确保搜索引擎能够及时发现和索引您的新内容。"
      },
      {
        q: "为什么需要监控网站地图？",
        a: "监控网站地图对SEO至关重要。它可以帮助您：1）及时发现网站内容更新；2）确保搜索引擎快速索引新页面；3）发现可能的技术问题；4）优化网站结构；5）提升搜索引擎排名。定期监控可以让您的SEO策略更加有效。"
      },
      {
        q: "Sitemap Monitor支持哪些类型的网站？",
        a: "我们支持所有标准的网站类型，包括：WordPress、Shopify、Magento、自定义CMS、静态网站、单页应用(SPA)等。只要您的网站有sitemap.xml文件，我们就可以进行监控。支持HTTP和HTTPS协议。"
      }
    ]
  },
  {
    category: "技术相关",
    questions: [
      {
        q: "监控频率是多少？可以自定义吗？",
        a: "我们提供灵活的监控频率设置：免费版每24小时检查一次，专业版支持每小时、每6小时、每12小时等多种频率。企业版可以设置最高每15分钟检查一次。您可以根据网站更新频率选择合适的监控间隔。"
      },
      {
        q: "如何处理大型网站的sitemap？",
        a: "我们专门优化了大型网站的处理能力：1）支持sitemap索引文件；2）可处理包含数万个URL的大型sitemap；3）智能分片处理，避免超时；4）增量检测，只分析变化部分；5）提供详细的处理日志和统计信息。"
      },
      {
        q: "数据安全性如何保障？",
        a: "我们采用企业级安全措施：1）所有数据传输使用SSL加密；2）服务器部署在安全的云环境；3）定期安全审计和漏洞扫描；4）数据备份和灾难恢复机制；5）严格的访问控制和权限管理。您的数据安全是我们的首要任务。"
      }
    ]
  },
  {
    category: "SEO优化",
    questions: [
      {
        q: "如何利用监控数据优化SEO？",
        a: "通过我们的监控数据，您可以：1）识别新增页面的索引速度；2）发现被删除页面可能造成的404错误；3）分析页面更新频率对排名的影响；4）优化sitemap结构和优先级设置；5）制定更有效的内容发布策略。我们提供详细的SEO建议报告。"
      },
      {
        q: "监控能发现哪些SEO问题？",
        a: "我们的智能分析可以发现：1）sitemap格式错误；2）无效或重复的URL；3）页面响应状态异常；4）robots.txt冲突；5）sitemap更新不及时；6）页面优先级设置不当；7）缺失的重要页面等。每个问题都会提供具体的解决建议。"
      },
      {
        q: "如何设置有效的监控提醒？",
        a: "建议设置多层次的提醒机制：1）重要变化立即通知（新增/删除大量页面）；2）定期摘要报告（每周/每月）；3）异常情况警报（sitemap无法访问）；4）SEO机会提醒（发现优化建议）。可通过邮件、短信、Webhook等方式接收通知。"
      }
    ]
  },
  {
    category: "账户和定价",
    questions: [
      {
        q: "有免费试用吗？",
        a: "是的！我们提供14天免费试用，包含所有核心功能：监控1个网站、每日检查、基础报告、邮件通知等。无需信用卡，注册即可开始使用。试用期结束后可以选择继续使用免费版或升级到付费版本。"
      },
      {
        q: "付费版本有什么额外功能？",
        a: "付费版本包含：1）监控更多网站；2）更高的检查频率；3）高级分析报告；4）API访问；5）优先技术支持；6）自定义通知规则；7）数据导出功能；8）白标定制等。详细功能对比请查看我们的定价页面。"
      },
      {
        q: "如何升级或取消订阅？",
        a: "您可以随时在账户设置中升级或降级您的订阅计划。升级立即生效，降级在当前计费周期结束后生效。取消订阅后，您仍可以使用免费版本的基础功能。我们提供灵活的月付和年付选项。"
      }
    ]
  }
];

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": faqData.flatMap(category => 
    category.questions.map(item => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": item.a
      }
    }))
  )
};

export default function FAQPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      
      <article className="space-y-8">
        <div className="text-center space-y-4">
          <h1 className="text-4xl font-bold tracking-tight">
            常见问题解答
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            关于 Sitemap Monitor 网站地图监控平台的常见问题和解答
          </p>
        </div>

        <div className="space-y-8">
          {faqData.map((category, categoryIndex) => (
            <section key={categoryIndex} className="space-y-4">
              <h2 className="text-2xl font-semibold text-primary border-b pb-2">
                {category.category}
              </h2>
              <div className="grid gap-4">
                {category.questions.map((item, index) => (
                  <Card key={index} className="hover-lift">
                    <CardHeader>
                      <CardTitle className="text-lg text-left">
                        {item.q}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground leading-relaxed">
                        {item.a}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Contact CTA */}
        <section className="bg-gradient-to-r from-primary/10 to-blue-50 dark:from-primary/5 dark:to-blue-950/20 rounded-2xl p-8 text-center space-y-4">
          <h2 className="text-2xl font-bold">
            还有其他问题？
          </h2>
          <p className="text-muted-foreground">
            我们的技术支持团队随时为您提供帮助
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="mailto:support@sitemap-monitor.com"
              className="inline-flex items-center justify-center h-10 px-6 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              联系技术支持
            </a>
            <a 
              href="/dashboard"
              className="inline-flex items-center justify-center h-10 px-6 rounded-md border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors"
            >
              开始免费试用
            </a>
          </div>
        </section>
      </article>
    </>
  );
}
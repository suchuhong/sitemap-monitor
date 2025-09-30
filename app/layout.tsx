import "./globals.css";
import Link from "next/link";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";
import { getCurrentUser } from "@/lib/auth/session";
import { SignOutButton } from "@/components/auth/sign-out-button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: {
    default: "Sitemap Monitor - 智能网站地图监控平台",
    template: "%s | Sitemap Monitor"
  },
  description: "专业的网站地图监控与SEO优化平台。实时监控sitemap变化，智能分析网站结构，提供详细的SEO数据报告。支持多站点管理，自动化监控，助力网站SEO优化。",
  keywords: ["sitemap监控", "网站地图", "SEO优化", "网站监控", "搜索引擎优化", "站点地图分析", "网站结构监控"],
  authors: [{ name: "Sitemap Monitor Team" }],
  creator: "Sitemap Monitor",
  publisher: "Sitemap Monitor",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://sitemap-monitor.com"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: "https://sitemap-monitor.com",
    title: "Sitemap Monitor - 智能网站地图监控平台",
    description: "专业的网站地图监控与SEO优化平台。实时监控sitemap变化，智能分析网站结构，提供详细的SEO数据报告。",
    siteName: "Sitemap Monitor",
    images: [
      {
        url: "/og-image.jpg",
        width: 1200,
        height: 630,
        alt: "Sitemap Monitor - 智能网站地图监控平台",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Sitemap Monitor - 智能网站地图监控平台",
    description: "专业的网站地图监控与SEO优化平台。实时监控sitemap变化，智能分析网站结构。",
    images: ["/og-image.jpg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60" role="banner">
              <div className="container flex h-16 items-center justify-between">
                <Link href={user ? "/dashboard" : "/"} className="flex items-center space-x-2" aria-label="返回首页">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground" aria-hidden="true">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      Sitemap Monitor
                    </div>
                    <p className="text-xs text-muted-foreground">智能监控平台</p>
                  </div>
                </Link>
                <nav className="flex items-center space-x-6" role="navigation" aria-label="主导航">
                  {user ? (
                    <>
                      <Link
                        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-4"
                        href="/sites"
                        aria-label="站点管理页面"
                      >
                        站点管理
                      </Link>
                      <Link
                        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-4"
                        href="/dashboard"
                        aria-label="数据面板页面"
                      >
                        数据面板
                      </Link>
                      <Link
                        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-4"
                        href="/blog"
                        aria-label="SEO优化博客"
                      >
                        博客
                      </Link>
                      <Link
                        className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-4"
                        href="/faq"
                        aria-label="常见问题页面"
                      >
                        FAQ
                      </Link>
                    </>
                  ) : (
                    <Link
                      className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-4"
                      href="/login"
                      aria-label="登录到控制台"
                    >
                      登录
                    </Link>
                  )}
                  <ThemeToggle />
                  {user ? (
                    <div className="flex items-center gap-3">
                      <span className="hidden text-xs text-muted-foreground sm:inline">
                        {user.email}
                      </span>
                      <SignOutButton />
                    </div>
                  ) : null}
                </nav>
              </div>
            </header>
            <main className="flex-1" role="main">
              <div className="container py-8 animate-fade-in">
                {children}
              </div>
            </main>
            <footer className="border-t bg-muted/50" role="contentinfo">
              <div className="container flex h-14 items-center justify-between text-sm text-muted-foreground">
                <p>© 2024 Sitemap Monitor. 智能化网站监控解决方案</p>
                <p>Powered by Next.js & Tailwind CSS</p>
              </div>
            </footer>
          </div>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}

import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Sitemap 识别与监控",
  description: "智能化网站地图监控与分析平台",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <div className="flex min-h-screen flex-col">
            <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md supports-[backdrop-filter]:bg-background/60">
              <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <h1 className="text-lg font-bold bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
                      Sitemap Monitor
                    </h1>
                    <p className="text-xs text-muted-foreground">智能监控平台</p>
                  </div>
                </div>
                <nav className="flex items-center space-x-6">
                  <a 
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-4" 
                    href="/sites"
                  >
                    站点管理
                  </a>
                  <a 
                    className="text-sm font-medium text-muted-foreground transition-colors hover:text-primary hover:underline underline-offset-4" 
                    href="/dashboard"
                  >
                    数据面板
                  </a>
                  <ThemeToggle />
                </nav>
              </div>
            </header>
            <main className="flex-1">
              <div className="container py-8 animate-fade-in">
                {children}
              </div>
            </main>
            <footer className="border-t bg-muted/50">
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

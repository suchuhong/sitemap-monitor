import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";

export const metadata = {
  title: "Sitemap 识别与监控",
  description: "Next.js + Hono + Drizzle + Tailwind + shadcn/ui",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <header className="border-b">
            <div className="container flex items-center justify-between py-3">
              <div className="text-lg font-semibold">Sitemap Monitor</div>
              <nav className="text-sm">
                <a className="underline" href="/dashboard">
                  Dashboard
                </a>
              </nav>
            </div>
          </header>
          <main className="container py-6">{children}</main>
          <Toaster richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}

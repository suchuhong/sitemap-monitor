import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const runtime = 'edge';

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <Card className="max-w-md w-full text-center">
        <CardHeader className="space-y-4">
          <div className="mx-auto w-20 h-20 bg-muted rounded-full flex items-center justify-center">
            <svg className="w-10 h-10 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-4xl font-bold text-primary">404</h1>
            <CardTitle className="text-xl mt-2">页面未找到</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-muted-foreground">
            抱歉，您访问的页面不存在或已被移动。请检查URL是否正确，或返回首页继续浏览。
          </p>
          
          <div className="space-y-3">
            <Button asChild className="w-full">
              <Link href="/">
                <svg className="mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                返回首页
              </Link>
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild className="flex-1">
                <Link href="/dashboard">控制台</Link>
              </Button>
              <Button variant="outline" size="sm" asChild className="flex-1">
                <Link href="/sites">站点管理</Link>
              </Button>
            </div>
          </div>

          <div className="pt-4 border-t">
            <h3 className="font-medium mb-3">您可能在寻找：</h3>
            <div className="space-y-2 text-sm">
              <Link href="/blog" className="block text-primary hover:underline">
                📝 SEO优化博客
              </Link>
              <Link href="/faq" className="block text-primary hover:underline">
                ❓ 常见问题解答
              </Link>
              <Link href="/sites/new" className="block text-primary hover:underline">
                ➕ 添加新站点
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
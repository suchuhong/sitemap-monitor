import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { LoginForm } from "./sign-in-form";


export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[]>>;
}) {
  const params = (searchParams ? await searchParams : {}) ?? {};
  const rawRedirect = Array.isArray(params.redirect) ? params.redirect[0] : params.redirect;
  const redirectTo = sanitizeRedirect(rawRedirect) ?? "/dashboard";

  const user = await getCurrentUser();
  if (user) redirect(redirectTo);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md space-y-6 rounded-2xl border border-slate-200 bg-white p-8 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">登录 Sitemap Monitor</h1>
          <p className="text-sm text-muted-foreground">
            输入企业邮箱即可开始使用，系统会自动为您创建私有空间。
          </p>
        </div>
        <LoginForm redirectTo={redirectTo} />
      </div>
    </div>
  );
}

function sanitizeRedirect(value?: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

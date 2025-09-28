export default function Home() {
  return (
    <div className="container py-10">
      <h1 className="text-2xl font-semibold">Sitemap Monitor</h1>
      <p className="mt-2 text-slate-600">前往 Dashboard 开始管理站点。</p>
      <div className="mt-6">
        <a href="/dashboard" className="underline">
          进入 Dashboard →
        </a>
      </div>
    </div>
  );
}

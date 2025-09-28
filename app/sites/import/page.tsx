export const dynamic = "force-dynamic"

export default function ImportSitesPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">批量导入站点</h1>
      <p className="text-sm text-slate-600">支持 CSV 文本（每行一个 rootUrl），或上传 .csv 文件。提交后将尝试自动识别 robots/sitemap。</p>
      <form action="/api/sites/import" method="post" encType="multipart/form-data" className="space-y-3">
        <div>
          <label className="block text-sm font-medium">CSV 文本</label>
          <textarea name="csv" rows={8} className="mt-1 w-full rounded-md border p-2 text-sm" placeholder="https://example.com
https://foo.bar" />
        </div>
        <div>
          <label className="block text-sm font-medium">或上传 CSV 文件</label>
          <input type="file" name="file" accept=".csv,text/csv" className="mt-1 block" />
        </div>
        <button className="inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-medium text-white">开始导入</button>
      </form>
    </div>
  )
}

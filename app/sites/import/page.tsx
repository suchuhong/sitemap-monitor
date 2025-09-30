import { SiteImportForm } from "./import-form";

export const dynamic = "force-dynamic";

export default function ImportSitesPage() {
  return (
    <div className="max-w-2xl space-y-4">
      <h1 className="text-xl font-semibold">批量导入站点</h1>
      <p className="text-sm text-slate-600">
        支持 CSV 文本（每行一个 rootUrl），或上传 .csv
        文件。提交后将尝试自动识别 robots/sitemap。
      </p>
      <SiteImportForm />
    </div>
  );
}

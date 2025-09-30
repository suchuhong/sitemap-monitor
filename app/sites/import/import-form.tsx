'use client';

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type ImportRow = {
  rootUrl: string;
  status: "success" | "skipped" | "error";
  siteId?: string;
  message?: string;
};

type ImportResult = {
  ok?: boolean;
  imported?: number;
  error?: string;
  results?: ImportRow[];
};

export function SiteImportForm() {
  const [csvText, setCsvText] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);

    const file = fileInputRef.current?.files?.[0] ?? null;
    const trimmedCsv = csvText.trim();
    if (!trimmedCsv && !file) {
      setResult({ error: "请粘贴 CSV 文本或选择文件" });
      return;
    }

    const formData = new FormData();
    if (trimmedCsv) formData.set("csv", trimmedCsv);
    if (file) formData.set("file", file);

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/sites/import", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as ImportResult;
      if (!response.ok) {
        setResult({ error: payload.error ?? "导入失败" });
        return;
      }

      setResult({ ok: true, imported: payload.imported ?? 0, results: payload.results ?? [] });
      // 清空输入，保留文件输入的值需要手动重置
      setCsvText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (error) {
      console.error("import error", error);
      setResult({ error: "无法连接到导入服务，请稍后重试" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-slate-700">CSV 文本</label>
        <textarea
          value={csvText}
          onChange={(event) => setCsvText(event.target.value)}
          rows={8}
          className="mt-1 w-full rounded-md border border-slate-200 bg-white p-2 text-sm shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          placeholder={`https://example.com\nhttps://foo.bar`}
        />
        <p className="mt-1 text-xs text-slate-500">每行一个站点地址，支持混合粘贴 HTTP/HTTPS。</p>
      </div>

      <div className="space-y-2">
        <label className="block text-sm font-medium text-slate-700">或上传 CSV 文件</label>
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept=".csv,text/csv"
          className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1 file:text-sm file:font-medium file:text-primary hover:file:bg-primary/20"
        />
        <p className="text-xs text-slate-500">文件第一列将视为 rootUrl，忽略空行和非法地址。</p>
      </div>

      {result?.error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-sm text-rose-600">
          {result.error}
        </div>
      )}

      {result?.ok && (
        <div className="space-y-3 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-600">
          <p>成功导入 {result.imported ?? 0} 个站点。</p>
          {Boolean(result.results?.length) && (
            <ImportResultsTable rows={result.results!} />
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={isSubmitting} className="hover-lift">
          {isSubmitting ? "导入中..." : "开始导入"}
        </Button>
        <span className="text-xs text-slate-500">提交后若站点较多，可能需要等待几秒。</span>
      </div>
    </form>
  );
}

function ImportResultsTable({ rows }: { rows: ImportRow[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-emerald-200 bg-white text-slate-700">
      <table className="min-w-full text-sm">
        <thead className="bg-emerald-600/10 text-xs uppercase tracking-wide text-emerald-700">
          <tr>
            <th className="px-3 py-2 text-left">站点</th>
            <th className="px-3 py-2 text-left">状态</th>
            <th className="px-3 py-2 text-left">说明</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-emerald-100">
          {rows.map((row) => (
            <tr key={`${row.rootUrl}-${row.status}`} className="bg-white">
              <td className="px-3 py-2 font-medium text-slate-800">{row.rootUrl}</td>
              <td className="px-3 py-2">
                <StatusBadge status={row.status} />
              </td>
              <td className="px-3 py-2 text-slate-600">
                {row.status === "success" && row.siteId ? `已创建/更新站点 ${row.siteId}` : row.message ?? "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ status }: { status: ImportRow["status"] }) {
  const map: Record<ImportRow["status"], string> = {
    success: "inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700",
    skipped: "inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700",
    error: "inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-700",
  };

  const label: Record<ImportRow["status"], string> = {
    success: "成功",
    skipped: "跳过",
    error: "失败",
  };

  return <span className={map[status]}>{label[status]}</span>;
}

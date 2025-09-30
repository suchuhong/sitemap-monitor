'use client';

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";

type ImportResult = {
  ok?: boolean;
  imported?: number;
  error?: string;
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

      setResult({ ok: true, imported: payload.imported ?? 0 });
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
        <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-600">
          成功导入 {result.imported ?? 0} 个站点。
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

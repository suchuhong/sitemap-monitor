"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";

export function SitesApiPanel() {
  const [listLoading, setListLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [siteId, setSiteId] = useState("");
  const [listResult, setListResult] = useState<string>("");
  const [detailResult, setDetailResult] = useState<string>("");

  const prettify = (data: unknown) => JSON.stringify(data, null, 2);

  const fetchAllSites = async () => {
    try {
      setListLoading(true);
      const res = await fetch("/api/sites");
      if (!res.ok) {
        toast.error("查询失败");
        setListResult("");
        return;
      }
      const payload = await res.json();
      setListResult(prettify(payload));
      toast.success("获取站点列表成功");
    } catch (err) {
      console.error("fetch sites failed", err);
      toast.error("网络异常");
    } finally {
      setListLoading(false);
    }
  };

  const fetchSiteDetail = async () => {
    if (!siteId.trim()) {
      toast.error("请输入站点 ID");
      return;
    }
    try {
      setDetailLoading(true);
      const res = await fetch(`/api/sites/${siteId.trim()}`);
      if (!res.ok) {
        const payload = await safeParseJson(res);
        const message =
          typeof (payload as { error?: unknown })?.error === "string"
            ? (payload as { error?: string }).error
            : "查询失败";
        toast.error(message);
        setDetailResult("");
        return;
      }
      const payload = await res.json();
      setDetailResult(prettify(payload));
      toast.success("获取站点详情成功");
    } catch (err) {
      console.error("fetch site detail failed", err);
      toast.error("网络异常");
    } finally {
      setDetailLoading(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>查询所有站点</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={fetchAllSites} disabled={listLoading}>
            {listLoading ? "查询中..." : "获取站点列表"}
          </Button>
          {listResult && (
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-50">
              {listResult}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>查看站点详情</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="输入站点 ID"
              value={siteId}
              onChange={(e) => setSiteId(e.target.value)}
            />
            <Button onClick={fetchSiteDetail} disabled={detailLoading}>
              {detailLoading ? "查询中..." : "获取详情"}
            </Button>
          </div>
          {detailResult && (
            <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950 p-3 text-xs text-slate-50">
              {detailResult}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

async function safeParseJson(res: Response) {
  try {
    return (await res.json()) as unknown;
  } catch {
    return null;
  }
}

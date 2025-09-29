"use client";
import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { TagInput } from "../../_components/tag-input";

type SiteDetailResponse = {
  site?: {
    rootUrl?: string;
    enabled?: boolean;
  };
};

export function SiteActionsPanel({
  siteId,
  initialRootUrl,
  initialEnabled,
  initialTags,
}: {
  siteId: string;
  initialRootUrl: string;
  initialEnabled: boolean;
  initialTags: string[];
}) {
  const router = useRouter();
  const initialNormalized = normalizeTagsList(initialTags);
  const [baselineRoot, setBaselineRoot] = useState(initialRootUrl);
  const [baselineEnabled, setBaselineEnabled] = useState(initialEnabled);
  const [baselineTags, setBaselineTags] = useState(initialNormalized);
  const [rootUrl, setRootUrl] = useState(initialRootUrl);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [tags, setTags] = useState(initialNormalized);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = useMemo(() => {
    const normalizedTags = normalizeTagsList(tags);
    const normalizedBaseline = baselineTags;
    const tagsChanged =
      normalizedTags.length !== normalizedBaseline.length ||
      normalizedTags.some((tag, idx) => tag !== normalizedBaseline[idx]);
    return rootUrl.trim() !== baselineRoot || enabled !== baselineEnabled || tagsChanged;
  }, [rootUrl, baselineRoot, enabled, baselineEnabled, tags, baselineTags]);

  const handleSave = async () => {
    const payload: Record<string, unknown> = {};
    const trimmed = rootUrl.trim();
    if (trimmed && trimmed !== baselineRoot) payload.rootUrl = trimmed;
    if (enabled !== baselineEnabled) payload.enabled = enabled;
    const normalizedTags = normalizeTagsList(tags);
    const normalizedBaseline = baselineTags;
    if (
      normalizedTags.length !== normalizedBaseline.length ||
      normalizedTags.some((tag, idx) => tag !== normalizedBaseline[idx])
    )
      payload.tags = normalizedTags;
    if (Object.keys(payload).length === 0) {
      toast.info("没有需要保存的变化");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const message = await parseError(res);
        toast.error(message ?? "保存失败");
        return;
      }
      const detail = (await res.json()) as SiteDetailResponse;
      if (detail?.site?.rootUrl) {
        setRootUrl(detail.site.rootUrl);
        setBaselineRoot(detail.site.rootUrl);
      }
      if (typeof detail?.site?.enabled === "boolean") {
        setEnabled(detail.site.enabled);
        setBaselineEnabled(detail.site.enabled);
      }
      if (Array.isArray(detail?.site?.tags)) {
        const normalized = normalizeTagsList(detail.site.tags);
        setTags(normalized);
        setBaselineTags(normalized);
      }
      toast.success("保存成功");
      router.refresh();
    } catch (err) {
      console.error("update site failed", err);
      toast.error("请求异常，请稍后重试");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("确认删除该站点及其所有相关数据？")) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/sites/${siteId}`, { method: "DELETE" });
      if (!res.ok) {
        const message = await parseError(res);
        toast.error(message ?? "删除失败");
        return;
      }
      toast.success("站点已删除");
      router.replace("/sites");
      router.refresh();
    } catch (err) {
      console.error("delete site failed", err);
      toast.error("请求异常，请稍后重试");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-semibold">站点设置</h3>
        <div className="space-y-2 text-sm">
          <label className="block text-slate-500">根地址</label>
          <Input value={rootUrl} onChange={(e) => setRootUrl(e.target.value)} />
        </div>
        <div className="space-y-2 text-sm">
          <label className="block text-slate-500">站点标签</label>
          <TagInput value={tags} onChange={setTags} placeholder="输入标签后回车添加" />
          <p className="text-xs text-slate-400">可用于列表过滤与分类管理</p>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
          />
          <span>启用监控</span>
        </label>
        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving ? "保存中..." : "保存"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              setRootUrl(baselineRoot);
              setEnabled(baselineEnabled);
              setTags(baselineTags);
            }}
            disabled={saving || (!dirty && !saving)}
          >
            重置
          </Button>
        </div>
      </div>

      <div className="space-y-3 rounded-2xl border border-rose-200 bg-rose-50/80 p-4 text-sm shadow-sm dark:border-rose-900/60 dark:bg-rose-950/40">
        <h3 className="text-base font-semibold text-rose-600 dark:text-rose-200">
          危险操作
        </h3>
        <p className="text-rose-600/90 dark:text-rose-200/90">
          删除站点会同时移除其关联的 sitemap、URL、扫描记录与变更历史，操作不可恢复。
        </p>
        <Button
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
        >
          {deleting ? "删除中..." : "删除站点"}
        </Button>
      </div>
    </div>
  );
}

async function parseError(res: Response) {
  try {
    const payload = (await res.json()) as unknown;
    if (payload && typeof payload === "object" && "error" in payload) {
      const { error } = payload as { error?: unknown };
      if (typeof error === "string") return error;
    }
  } catch {}
  return null;
}

function normalizeTagsList(tags: string[]) {
  return Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean))).sort((a, b) =>
    a.localeCompare(b),
  );
}

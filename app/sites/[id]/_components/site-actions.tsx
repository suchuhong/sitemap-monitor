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
    scanPriority?: number;
    scanIntervalMinutes?: number;
    tags?: string[];
    groupId?: string | null;
  };
};

export function SiteActionsPanel({
  siteId,
  initialRootUrl,
  initialEnabled,
  initialTags,
  initialPriority,
  initialInterval,
  initialGroupId,
  groups,
}: {
  siteId: string;
  initialRootUrl: string;
  initialEnabled: boolean;
  initialTags: string[];
  initialPriority: number;
  initialInterval: number;
  initialGroupId: string;
  groups: Array<{ id: string; name: string; description?: string | null; color?: string | null }>;
}) {
  const router = useRouter();
  const initialNormalized = normalizeTagsList(initialTags);
  const [baselineRoot, setBaselineRoot] = useState(initialRootUrl);
  const [baselineEnabled, setBaselineEnabled] = useState(initialEnabled);
  const [baselineTags, setBaselineTags] = useState(initialNormalized);
  const [baselinePriority, setBaselinePriority] = useState(initialPriority);
  const [baselineInterval, setBaselineInterval] = useState(initialInterval);
  const [baselineGroupId, setBaselineGroupId] = useState(initialGroupId);
  const [rootUrl, setRootUrl] = useState(initialRootUrl);
  const [enabled, setEnabled] = useState(initialEnabled);
  const [tags, setTags] = useState(initialNormalized);
  const [scanPriority, setScanPriority] = useState(initialPriority);
  const [scanInterval, setScanInterval] = useState(initialInterval);
  const [scanIntervalInput, setScanIntervalInput] = useState(String(initialInterval));
  const [groupId, setGroupId] = useState(initialGroupId);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const dirty = useMemo(() => {
    const normalizedTags = normalizeTagsList(tags);
    const normalizedBaseline = baselineTags;
    const tagsChanged =
      normalizedTags.length !== normalizedBaseline.length ||
      normalizedTags.some((tag, idx) => tag !== normalizedBaseline[idx]);
    return (
      rootUrl.trim() !== baselineRoot ||
      enabled !== baselineEnabled ||
      tagsChanged ||
      scanPriority !== baselinePriority ||
      scanInterval !== baselineInterval ||
      groupId !== baselineGroupId
    );
  }, [
    rootUrl,
    baselineRoot,
    enabled,
    baselineEnabled,
    tags,
    baselineTags,
    scanPriority,
    baselinePriority,
    scanInterval,
    baselineInterval,
    groupId,
    baselineGroupId,
  ]);

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
    if (scanPriority !== baselinePriority) payload.scanPriority = scanPriority;
    if (scanInterval !== baselineInterval) payload.scanIntervalMinutes = scanInterval;
    if (groupId !== baselineGroupId) payload.groupId = groupId || null;
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
      if (typeof detail?.site?.scanPriority === "number") {
        setScanPriority(detail.site.scanPriority);
        setBaselinePriority(detail.site.scanPriority);
      }
      if (typeof detail?.site?.scanIntervalMinutes === "number") {
        setScanInterval(detail.site.scanIntervalMinutes);
        setBaselineInterval(detail.site.scanIntervalMinutes);
        setScanIntervalInput(String(detail.site.scanIntervalMinutes));
      }
      if (detail?.site?.groupId !== undefined) {
        const value = detail.site.groupId ?? "";
        setGroupId(value);
        setBaselineGroupId(value);
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
    <div className="space-y-4">
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
          <div className="grid gap-3 md:grid-cols-2">
            <div className="space-y-2 text-sm">
              <label className="block text-slate-500">扫描优先级 (1-5)</label>
              <Input
                type="number"
                min={1}
                max={5}
                value={scanPriority}
                onChange={(event) => setScanPriority(clamp(parseInt(event.target.value, 10), 1, 5))}
              />
              <p className="text-xs text-slate-400">数值越高越优先扫描。</p>
            </div>
            <div className="space-y-2 text-sm">
              <label className="block text-slate-500">扫描间隔（分钟）</label>
              <Input
                type="number"
                min={5}
                value={scanIntervalInput}
                inputMode="numeric"
                pattern="[0-9]*"
                onChange={(event) => {
                  const { value } = event.target;
                  if (!/^[0-9]*$/.test(value)) return;
                  setScanIntervalInput(value);
                  if (value === "") return;
                  const parsed = parseInt(value, 10);
                  if (!Number.isNaN(parsed)) {
                    setScanInterval(clamp(parsed, 5, 10080));
                  }
                }}
                onBlur={() => {
                  if (scanIntervalInput === "") {
                    setScanIntervalInput(String(scanInterval));
                    return;
                  }
                  const parsed = parseInt(scanIntervalInput, 10);
                  const clamped = clamp(parsed, 5, 10080);
                  setScanInterval(clamped);
                  setScanIntervalInput(String(clamped));
                }}
              />
              <p className="text-xs text-slate-400">推荐 15 ~ 1440 分钟，可按站点重要性调整。</p>
            </div>
          </div>
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
              setScanPriority(baselinePriority);
              setScanInterval(baselineInterval);
              setScanIntervalInput(String(baselineInterval));
              setGroupId(baselineGroupId);
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

      <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <h3 className="text-base font-semibold">分组设置</h3>
        <div className="space-y-2 text-sm">
          <label className="block text-slate-500">选择分组</label>
          <select
            className="h-9 w-full rounded-md border border-slate-200 bg-background px-2 text-sm"
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
          >
            <option value="">未分组</option>
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-400">分组用于批量管理与统计，可在分组管理中新增。</p>
        </div>
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

function clamp(value: number, min: number, max: number) {
  if (Number.isNaN(value)) return min;
  return Math.max(min, Math.min(max, value));
}

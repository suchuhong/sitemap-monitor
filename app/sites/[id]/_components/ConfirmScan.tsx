"use client";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";

export function ConfirmScan({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        onClick={async () => {
          try {
            setLoading(true);
            const r = await fetch(`/api/sites/${siteId}/scan`, {
              method: "POST",
            });
            if (!r.ok) {
              const message = await parseError(r);
              toast.error(message ?? "触发失败");
              return;
            }
            const payload = (await r.json()) as { ok?: boolean; scanId?: string };
            toast.success(
              payload.scanId ? `已加入扫描队列（ID: ${payload.scanId.substring(0, 8)}…）` : "扫描任务已排队",
            );
          } catch (err) {
            console.error("trigger scan failed", err);
            toast.error("请求异常，请稍后重试");
          } finally {
            setLoading(false);
          }
        }}
        disabled={loading}
      >
        {loading ? "处理中..." : "手动扫描"}
      </Button>
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

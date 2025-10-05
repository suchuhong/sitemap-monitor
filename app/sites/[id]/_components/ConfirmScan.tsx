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
            const payload = (await r.json()) as { ok?: boolean; scanId?: string; status?: string; message?: string };

            // 触发自定义事件，通知监控组件
            if (payload.scanId) {
              window.dispatchEvent(
                new CustomEvent("scan-triggered", {
                  detail: { scanId: payload.scanId },
                })
              );
            }

            // 如果已有扫描在运行，显示警告提示
            if (payload.status === "already_running") {
              toast.warning("扫描任务已在运行中", {
                description: payload.message || "该站点已有扫描任务在执行中，请等待当前扫描完成后再试",
                duration: 5000,
              });
            } else {
              // 新扫描成功创建
              const message = payload.scanId
                ? `扫描已启动（ID: ${payload.scanId.substring(0, 8)}…）`
                : "扫描任务已排队";

              toast.success(message, {
                description: "扫描完成后将自动通知",
              });
            }
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
  } catch { }
  return null;
}

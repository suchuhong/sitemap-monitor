'use client';

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import { formatDateTime } from "@/lib/datetime";

type NotificationChannel = {
  id: string;
  type: "webhook" | "email" | "slack";
  target: string;
  createdAt: number | Date | null;
};

const typeLabels: Record<NotificationChannel["type"], string> = {
  webhook: "Webhook",
  email: "Email",
  slack: "Slack",
};

export function SiteNotificationsPanel({
  siteId,
  initialChannels,
}: {
  siteId: string;
  initialChannels: NotificationChannel[];
}) {
  const [channels, setChannels] = useState(initialChannels);
  const [type, setType] = useState<NotificationChannel["type"]>("webhook");
  const [target, setTarget] = useState("");
  const [secret, setSecret] = useState("");
  const [isSubmitting, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setChannels(initialChannels);
  }, [initialChannels]);

  const handleAdd = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    startTransition(async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}/notifications`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ type, target, secret: secret || undefined }),
        });
        if (!res.ok) {
          const message = await parseError(res);
          toast.error(message ?? "添加失败");
          return;
        }
        const payload = (await res.json()) as { id: string };
        toast.success("通知渠道已添加");
        setChannels((prev) => [
          ...prev,
          {
            id: payload.id,
            type,
            target,
            createdAt: Date.now(),
          },
        ]);
        setTarget("");
        setSecret("");
        router.refresh();
      } catch (error) {
        console.error("create notification failed", error);
        toast.error("请求异常，请稍后重试");
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/sites/${siteId}/notifications/${id}`, {
          method: "DELETE",
        });
        if (!res.ok) {
          const message = await parseError(res);
          toast.error(message ?? "删除失败");
          return;
        }
        toast.success("通知渠道已删除");
        setChannels((prev) => prev.filter((channel) => channel.id !== id));
        router.refresh();
      } catch (error) {
        console.error("delete notification failed", error);
        toast.error("请求异常，请稍后重试");
      }
    });
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div>
        <h3 className="text-base font-semibold">通知渠道</h3>
        <p className="text-xs text-muted-foreground">配置 Webhook、Email 或 Slack，便于变更实时通知。</p>
      </div>

      <form className="grid gap-3 md:grid-cols-2" onSubmit={handleAdd}>
        <div className="space-y-2 text-sm">
          <label className="block text-slate-500">类型</label>
          <select
            className="h-9 w-full rounded-md border border-slate-200 bg-background px-2 text-sm"
            value={type}
            onChange={(event) => setType(event.target.value as NotificationChannel["type"])}
          >
            <option value="webhook">Webhook</option>
            <option value="email">Email</option>
            <option value="slack">Slack webhook</option>
          </select>
        </div>
        <div className="space-y-2 text-sm md:col-span-2">
          <label className="block text-slate-500">目标地址 / 账号</label>
          <Input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder={type === "email" ? "ops@example.com" : "https://hooks.slack.com/..."}
            required
          />
        </div>
        {type === "webhook" && (
          <div className="space-y-2 text-sm md:col-span-2">
            <label className="block text-slate-500">签名密钥（可选）</label>
            <Input
              value={secret}
              onChange={(event) => setSecret(event.target.value)}
              placeholder="用于生成 HMAC 签名"
            />
          </div>
        )}
        <div className="md:col-span-2">
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "保存中..." : "添加渠道"}
          </Button>
        </div>
      </form>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-500">已配置</h4>
        {channels.length === 0 ? (
          <p className="text-xs text-muted-foreground">暂无通知渠道，可先在上方添加。</p>
        ) : (
          <ul className="space-y-2 text-sm">
            {channels.map((channel) => (
              <li
                key={channel.id}
                className="flex items-center justify-between rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40"
              >
                <div>
                  <p className="font-medium">
                    {typeLabels[channel.type]} · {channel.target}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    创建于 {formatDateTime(channel.createdAt ?? null)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDelete(channel.id)}
                  disabled={isSubmitting}
                >
                  删除
                </Button>
              </li>
            ))}
          </ul>
        )}
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

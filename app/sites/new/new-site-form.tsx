'use client';

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/sonner";
import { TagInput } from "../_components/tag-input";

const schema = z.object({ rootUrl: z.string().url("请输入合法 URL") });

export function NewSiteForm() {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { rootUrl: "" },
  });
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [tags, setTags] = useState<string[]>([]);

  return (
    <div className="max-w-xl">
      <h1 className="mb-4 text-lg font-semibold">新增站点</h1>
      <Form {...form}>
        <form
          className="space-y-4"
          onSubmit={form.handleSubmit(async (values) => {
            try {
              setLoading(true);
              const res = await fetch("/api/sites", {
                method: "POST",
                headers: { "content-type": "application/json" },
                body: JSON.stringify({
                  ...values,
                  tags: tags.map((tag) => tag.trim()).filter(Boolean),
                }),
              });
              if (!res.ok) {
                const payload = await safeParseJson(res);
                const message = extractErrorMessage(payload) ?? "接入失败";
                toast.error(message);
                return;
              }
              const data = (await res.json()) as { id: string };
              toast.success("已接入并开始识别");
              router.replace(`/sites/${data.id}`);
            } catch (err) {
              console.error("site create failed", err);
              toast.error("请求异常，请稍后重试");
            } finally {
              setLoading(false);
            }
          })}
        >
          <FormField
            name="rootUrl"
            render={({ field }) => (
              <FormItem>
                <FormLabel>根地址</FormLabel>
                <FormControl>
                  <Input placeholder="https://example.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <div className="space-y-2">
            <FormLabel>站点标签</FormLabel>
            <TagInput value={tags} onChange={setTags} placeholder="输入标签后回车添加" />
            <p className="text-xs text-slate-400">标签用于分类与筛选，可选择性添加</p>
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading ? "处理中..." : "识别并接入"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              取消
            </Button>
          </div>
        </form>
      </Form>
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

function extractErrorMessage(value: unknown): string | null {
  if (value && typeof value === "object" && "error" in value) {
    const { error } = value as { error?: unknown };
    if (typeof error === "string") return error;
  }
  return null;
}

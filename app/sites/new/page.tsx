"use client"
import { useForm } from "react-hook-form"
import { z } from "zod"
import { zodResolver } from "@hookform/resolvers/zod"
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/sonner"

const schema = z.object({ rootUrl: z.string().url("请输入合法 URL") })

export default function NewSitePage() {
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { rootUrl: "" } })
  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold mb-4">新增站点</h1>
      <Form {...form}>
        <form className="space-y-4" onSubmit={form.handleSubmit(async (v) => {
          const r = await fetch("/api/sites", { method: "POST", body: JSON.stringify(v) })
          if (r.ok) { toast.success("已接入并开始识别"); location.href="/dashboard" } else { toast.error("接入失败") }
        })}>
          <FormField name="rootUrl" render={({ field }) => (
            <FormItem>
              <FormLabel>根地址</FormLabel>
              <FormControl><Input placeholder="https://example.com" {...field} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
          <div className="flex gap-2">
            <Button type="submit">识别并接入</Button>
            <Button type="button" variant="outline" onClick={() => history.back()}>取消</Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

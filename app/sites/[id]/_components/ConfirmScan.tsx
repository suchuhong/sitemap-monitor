"use client"
import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Toaster, toast } from "@/components/ui/sonner"

export function ConfirmScan({ siteId }: { siteId: string }) {
  const [loading, setLoading] = useState(false)
  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={async () => {
        try {
          setLoading(true)
          const r = await fetch(`/api/sites/${siteId}/scan`, { method: "POST" })
          if (r.ok) toast.success("已触发扫描"); else toast.error("触发失败")
        } finally { setLoading(false) }
      }} disabled={loading}>
        {loading ? "处理中..." : "手动扫描"}
      </Button>
    </div>
  )
}

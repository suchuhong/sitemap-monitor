import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function Page() {
  // Note: For demo, using static numbers. Replace with DB queries in RSC.
  const sitesCount = 1, added24h = 0, removed24h = 0, failRate = 0
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-500">站点数量</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{sitesCount}</CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-500">最近变更（24h）</CardTitle>
        </CardHeader>
        <CardContent className="flex items-baseline gap-4">
          <span className="text-2xl font-semibold text-emerald-600">+{added24h}</span>
          <span className="text-2xl font-semibold text-rose-600">-{removed24h}</span>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm text-slate-500">失败率</CardTitle>
        </CardHeader>
        <CardContent className="text-3xl font-semibold">{failRate}%</CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">快速开始</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">前往 <a className="underline" href="/sites/new">新增站点</a>，输入根地址进行识别。</p>
        </CardContent>
      </Card>
    </div>
  )
}

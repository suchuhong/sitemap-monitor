"use client"
import * as React from "react"
import { cn } from "@/lib/utils"

type TabsCtx = { value: string; setValue: (v: string) => void }
const Ctx = React.createContext<TabsCtx | null>(null)

export function Tabs({ defaultValue, value, onValueChange, className, children }:
  { defaultValue?: string; value?: string; onValueChange?: (v:string)=>void; className?: string; children: React.ReactNode }) {
  const controlled = value !== undefined
  const [inner, setInner] = React.useState(defaultValue ?? "")
  const current = controlled ? value! : inner
  const set = (v:string) => { if (!controlled) setInner(v); onValueChange?.(v) }
  return <div className={cn("w-full", className)}><Ctx.Provider value={{ value: current, setValue: set }}>{children}</Ctx.Provider></div>
}

export function TabsList({ className, children }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("inline-flex items-center gap-1 rounded-lg border p-1 bg-white dark:bg-slate-900", className)}>{children}</div>
}

export function TabsTrigger({ value, children }: { value: string; children: React.ReactNode }) {
  const ctx = React.useContext(Ctx)!
  const active = ctx.value === value
  return (
    <button
      onClick={() => ctx.setValue(value)}
      className={cn("px-3 h-9 rounded-md text-sm transition border",
        active ? "bg-brand text-white border-brand" : "border-transparent hover:bg-slate-100 dark:hover:bg-slate-800")}
    >
      {children}
    </button>
  )
}

export function TabsContent({ value, children, className }: { value: string; children: React.ReactNode; className?: string }) {
  const ctx = React.useContext(Ctx)!
  if (ctx.value !== value) return null
  return <div className={cn("mt-4", className)}>{children}</div>
}

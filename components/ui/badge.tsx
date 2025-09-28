import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
        outline: "text-foreground",
        added:   "border-emerald-200 bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:border-emerald-800",
        removed: "border-rose-200 bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:border-rose-800",
        updated: "border-amber-200 bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:border-amber-800"
      }
    },
    defaultVariants: { variant: "default" }
  }
)

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

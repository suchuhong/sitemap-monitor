import { cn } from "@/lib/utils";

interface StatusIndicatorProps {
  status: "success" | "error" | "warning" | "info" | "pending";
  children: React.ReactNode;
  className?: string;
}

export function StatusIndicator({ status, children, className }: StatusIndicatorProps) {
  const statusStyles = {
    success: "bg-success/10 text-success border-success/20",
    error: "bg-destructive/10 text-destructive border-destructive/20", 
    warning: "bg-warning/10 text-warning border-warning/20",
    info: "bg-info/10 text-info border-info/20",
    pending: "bg-muted text-muted-foreground border-muted"
  };

  const dotStyles = {
    success: "bg-success",
    error: "bg-destructive",
    warning: "bg-warning", 
    info: "bg-info",
    pending: "bg-muted-foreground"
  };

  return (
    <div className={cn(
      "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium",
      statusStyles[status],
      className
    )}>
      <div className={cn("h-1.5 w-1.5 rounded-full", dotStyles[status])} />
      {children}
    </div>
  );
}
"use client";

import { useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RunningScanAlertProps {
  siteId: string;
  initialScans: Array<{ id: string; status: string }>;
}

export function RunningScanAlert({ siteId, initialScans }: RunningScanAlertProps) {
  const [hasRunningScans, setHasRunningScans] = useState(() => {
    return initialScans.some(scan => scan.status === "running" || scan.status === "queued");
  });

  useEffect(() => {
    // 监听扫描触发事件
    const handleScanTriggered = () => {
      setHasRunningScans(true);
    };

    // 监听扫描完成事件
    const handleScanComplete = () => {
      // 延迟一下再隐藏，让用户看到完成提示
      setTimeout(() => {
        setHasRunningScans(false);
      }, 2000);
    };

    window.addEventListener("scan-triggered" as any, handleScanTriggered);
    window.addEventListener("scan-complete" as any, handleScanComplete);

    return () => {
      window.removeEventListener("scan-triggered" as any, handleScanTriggered);
      window.removeEventListener("scan-complete" as any, handleScanComplete);
    };
  }, []);

  if (!hasRunningScans) {
    return null;
  }

  return (
    <Alert className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="h-5 w-5 text-amber-600 dark:text-amber-500 animate-spin"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
            />
          </svg>
        </div>
        <div className="flex-1">
          <AlertTitle className="text-amber-900 dark:text-amber-100 font-semibold">
            扫描任务进行中
          </AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200 mt-1">
            该站点当前有扫描任务正在执行，请等待当前扫描完成后再触发新的扫描。
            扫描完成后会自动通知。
          </AlertDescription>
        </div>
      </div>
    </Alert>
  );
}

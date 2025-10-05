"use client";
import { useEffect, useRef } from "react";
import { toast } from "@/components/ui/sonner";

type ScanMonitorProps = {
  siteId: string;
  initialScans: Array<{ id: string; status: string }>;
};

export function ScanMonitor({ siteId, initialScans }: ScanMonitorProps) {
  const monitoredScansRef = useRef<Set<string>>(new Set<string>());
  const intervalRef = useRef<NodeJS.Timeout | undefined>(undefined);

  useEffect(() => {
    // 初始化已监控的扫描
    initialScans.forEach((scan) => {
      if (scan.status === "running" || scan.status === "queued") {
        monitoredScansRef.current.add(scan.id);
      }
    });

    // 如果有需要监控的扫描，启动轮询
    if (monitoredScansRef.current.size > 0) {
      startPolling();
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startPolling = () => {
    if (intervalRef.current) return;

    intervalRef.current = setInterval(async () => {
      await checkScans();
    }, 5000); // 每 5 秒检查一次
  };

  const stopPolling = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = undefined;
    }
  };

  const checkScans = async () => {
    if (monitoredScansRef.current.size === 0) {
      stopPolling();
      return;
    }

    try {
      const response = await fetch(`/api/sites/${siteId}`);
      if (!response.ok) return;

      const data = await response.json();
      const scans = data.recentScans || [];

      const completedScans: string[] = [];

      scans.forEach((scan: any) => {
        if (monitoredScansRef.current.has(scan.id)) {
          if (scan.status === "success" || scan.status === "failed") {
            completedScans.push(scan.id);
            showScanCompleteNotification(scan);
          }
        }
      });

      // 移除已完成的扫描
      completedScans.forEach((scanId) => {
        monitoredScansRef.current.delete(scanId);
      });

      // 如果没有需要监控的扫描了，停止轮询
      if (monitoredScansRef.current.size === 0) {
        stopPolling();
      }
    } catch (error) {
      console.error("Failed to check scan status:", error);
    }
  };

  const showScanCompleteNotification = (scan: any) => {
    const duration = scan.finishedAt && scan.startedAt
      ? ((new Date(scan.finishedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000).toFixed(1)
      : null;

    if (scan.status === "success") {
      const hasChanges = (scan.added || 0) + (scan.removed || 0) + (scan.updated || 0) > 0;
      
      toast.success("扫描完成", {
        description: hasChanges
          ? `新增 ${scan.added || 0} / 删除 ${scan.removed || 0} / 更新 ${scan.updated || 0}${duration ? ` · 耗时 ${duration}s` : ""}`
          : `无变更${duration ? ` · 耗时 ${duration}s` : ""}`,
        duration: 5000,
      });

      // 刷新页面数据
      window.location.reload();
    } else if (scan.status === "failed") {
      toast.error("扫描失败", {
        description: scan.error || "未知错误",
        duration: 8000,
      });

      // 刷新页面数据
      setTimeout(() => window.location.reload(), 2000);
    }
  };

  // 监听新扫描的触发
  useEffect(() => {
    const handleScanTriggered = (event: CustomEvent) => {
      const { scanId } = event.detail;
      if (scanId) {
        monitoredScansRef.current.add(scanId);
        startPolling();
      }
    };

    window.addEventListener("scan-triggered" as any, handleScanTriggered as any);

    return () => {
      window.removeEventListener("scan-triggered" as any, handleScanTriggered as any);
    };
  }, []);

  return null; // 这是一个无 UI 的监控组件
}

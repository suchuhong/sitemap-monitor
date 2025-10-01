"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface SchedulerStatus {
  type: "advanced";
  isRunning: boolean;
  taskCount: number;
  tasks: Array<{
    name: string;
    running: boolean;
  }>;
}

export function SchedulerControl() {
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStatus = async () => {
    try {
      const response = await fetch("/api/scheduler/status", {
        credentials: "include",
      });
      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      }
    } catch (error) {
      console.error("Failed to fetch scheduler status:", error);
    }
  };

  const handleStart = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/scheduler/start", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        toast.success("调度器已启动");
        await fetchStatus();
      } else {
        toast.error("启动调度器失败");
      }
    } catch (error) {
      toast.error("启动调度器失败");
    } finally {
      setLoading(false);
    }
  };

  const handleStop = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/scheduler/stop", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        toast.success("调度器已停止");
        await fetchStatus();
      } else {
        toast.error("停止调度器失败");
      }
    } catch (error) {
      toast.error("停止调度器失败");
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/scheduler/scan", {
        method: "POST",
        credentials: "include",
      });
      if (response.ok) {
        const result = await response.json();
        toast.success(`手动扫描完成，队列中有 ${result.queued} 个站点`);
        await fetchStatus();
      } else {
        toast.error("手动扫描失败");
      }
    } catch (error) {
      toast.error("手动扫描失败");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 10000); // 每10秒刷新状态
    return () => clearInterval(interval);
  }, []);

  if (!status) {
    return (
      <Card>
        <CardHeader>
        <CardTitle>调度器控制</CardTitle>
        <CardDescription>加载中...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>调度器控制</CardTitle>
        <CardDescription>管理内置定时任务调度器 (高级模式)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span>状态:</span>
            <Badge variant={status.isRunning ? "default" : "secondary"}>
              {status.isRunning ? "运行中" : "已停止"}
            </Badge>
          </div>
          
          <div className="flex items-center gap-2">
            <span>任务数量:</span>
            <Badge variant="outline">{status.taskCount}</Badge>
          </div>
        </div>

        {status.tasks && status.tasks.length > 0 && (
          <div>
            <h4 className="text-sm font-medium mb-2">活跃任务:</h4>
            <div className="flex flex-wrap gap-2">
              {status.tasks.map((task) => (
                <Badge 
                  key={task.name} 
                  variant={task.running ? "default" : "secondary"}
                >
                  {task.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={status.isRunning ? handleStop : handleStart}
            disabled={loading}
            variant={status.isRunning ? "destructive" : "default"}
          >
            {loading ? "处理中..." : status.isRunning ? "停止调度器" : "启动调度器"}
          </Button>
          
          <Button
            onClick={handleManualScan}
            disabled={loading}
            variant="outline"
          >
            {loading ? "扫描中..." : "手动扫描"}
          </Button>
          
          <Button
            onClick={fetchStatus}
            disabled={loading}
            variant="ghost"
          >
            刷新状态
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

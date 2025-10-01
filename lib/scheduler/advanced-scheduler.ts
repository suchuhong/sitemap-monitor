import * as cron from "node-cron";
import { cronScan } from "@/lib/logic/scan";
import { logEvent } from "@/lib/observability/logger";

class AdvancedScheduler {
    private tasks: Map<string, cron.ScheduledTask> = new Map();
    private isRunning = false;

    start() {
        if (this.isRunning) {
            console.log("Advanced scheduler already running");
            return;
        }

        this.isRunning = true;
        console.log("Starting advanced cron scheduler...");

        // 默认每5分钟检查一次
        const defaultSchedule = process.env.SCAN_CRON_SCHEDULE || "*/5 * * * *";

        const mainTask = cron.schedule(defaultSchedule, async () => {
            try {
                await this.runScheduledScans();
            } catch (error) {
                console.error("Scheduled scan failed:", error);
                logEvent({
                    type: "scheduler_error",
                    scope: "advanced_scheduler",
                    message: "Scheduled scan failed",
                    payload: {
                        error: error instanceof Error ? error.message : String(error)
                    },
                    level: "error"
                });
            }
        }, {
            timezone: process.env.SCHEDULER_TIMEZONE || "Asia/Shanghai"
        });

        this.tasks.set("main", mainTask);
        // 任务会自动启动

        // 可选：添加每日汇总任务
        if (process.env.ENABLE_DAILY_SUMMARY === "true") {
            const summaryTask = cron.schedule("0 9 * * *", async () => {
                await this.generateDailySummary();
            }, {
                timezone: process.env.SCHEDULER_TIMEZONE || "Asia/Shanghai"
            });

            this.tasks.set("daily-summary", summaryTask);
            // 任务会自动启动
        }

        logEvent({
            type: "advanced_scheduler_started",
            scope: "scheduler",
            message: "Advanced scheduler started successfully",
            payload: { schedule: defaultSchedule }
        });
    }

    stop() {
        if (!this.isRunning) return;

        this.tasks.forEach((task, name) => {
            task.stop();
            task.destroy();
            console.log(`Stopped task: ${name}`);
        });

        this.tasks.clear();
        this.isRunning = false;
        console.log("Advanced cron scheduler stopped");
        logEvent({
            type: "advanced_scheduler_stopped",
            scope: "scheduler",
            message: "Advanced scheduler stopped"
        });
    }

    private async runScheduledScans() {
        console.log("Running scheduled scans...");
        const result = await cronScan();

        if (result.queued > 0) {
            console.log(`Queued ${result.queued} sites for scanning`);
            logEvent({
                type: "scheduled_scan_executed",
                scope: "scheduler",
                message: `Queued ${result.queued} sites for scanning`,
                payload: {
                    sitesChecked: result.sitesChecked,
                    queued: result.queued,
                }
            });
        }
    }

    private async generateDailySummary() {
        // todo 这里可以实现每日汇总逻辑
        console.log("Generating daily summary...");
        logEvent({
            type: "daily_summary_generated",
            scope: "scheduler",
            message: "Daily summary generated",
            payload: { timestamp: new Date().toISOString() }
        });
    }

    addCustomTask(name: string, schedule: string, callback: () => Promise<void>) {
        if (this.tasks.has(name)) {
            throw new Error(`Task ${name} already exists`);
        }

        const task = cron.schedule(schedule, callback, {
            timezone: process.env.SCHEDULER_TIMEZONE || "Asia/Shanghai"
        });

        this.tasks.set(name, task);
        // 任务会自动启动

        console.log(`Added custom task: ${name} with schedule: ${schedule}`);
    }

    removeTask(name: string) {
        const task = this.tasks.get(name);
        if (task) {
            task.stop();
            task.destroy();
            this.tasks.delete(name);
            console.log(`Removed task: ${name}`);
        }
    }

    getStatus() {
        return {
            isRunning: this.isRunning,
            activeTasks: Array.from(this.tasks.keys()),
            taskCount: this.tasks.size,
        };
    }

    listTasks() {
        return Array.from(this.tasks.entries()).map(([name, task]) => ({
            name,
            running: task.getStatus() === "scheduled"
        }));
    }
}

export const advancedScheduler = new AdvancedScheduler();
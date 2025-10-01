import { advancedScheduler } from "@/lib/scheduler/advanced-scheduler";

let initialized = false;

export function initializeScheduler() {
  if (initialized) return;
  
  const requestedType = process.env.SCHEDULER_TYPE || "advanced";
  const explicitlyDisabled =
    requestedType === "disabled" || process.env.DISABLE_INTERNAL_SCHEDULER === "true";
  const enableScheduler =
    process.env.ENABLE_INTERNAL_SCHEDULER === "true" ||
    (process.env.NODE_ENV === "production" && !explicitlyDisabled);

  if (enableScheduler && !explicitlyDisabled) {
    console.log("Initializing advanced scheduler...");

    advancedScheduler.start();

    // 优雅关闭
    const gracefulShutdown = () => {
      console.log("Stopping advanced scheduler...");
      advancedScheduler.stop();
      process.exit(0);
    };

    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);

    // 未捕获异常处理
    process.on("uncaughtException", (error) => {
      console.error("Uncaught Exception:", error);
      advancedScheduler.stop();
      process.exit(1);
    });

    process.on("unhandledRejection", (reason, promise) => {
      console.error("Unhandled Rejection at:", promise, "reason:", reason);
      advancedScheduler.stop();
      process.exit(1);
    });
  } else {
    console.log("Internal scheduler disabled. Use external cron or set ENABLE_INTERNAL_SCHEDULER=true");
  }
  
  initialized = true;
}

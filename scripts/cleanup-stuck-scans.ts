#!/usr/bin/env tsx
/**
 * 清理卡住的扫描任务
 * 
 * 使用方法:
 * pnpm tsx scripts/cleanup-stuck-scans.ts
 */

import { resolveDb } from "../lib/db";
import { scans } from "../lib/drizzle/schema";
import { eq } from "drizzle-orm";

async function cleanupStuckScans() {
  const db = resolveDb() as any;
  const now = Date.now();
  const timeoutThreshold = new Date(now - 15 * 60 * 1000); // 15 分钟前

  console.log("🔍 查找卡住的扫描任务...");

  const runningScans = await db
    .select()
    .from(scans)
    .where(eq(scans.status, "running"));

  console.log(`找到 ${runningScans.length} 个正在运行的扫描`);

  let cleanedCount = 0;

  for (const scan of runningScans) {
    if (scan.startedAt && new Date(scan.startedAt) < timeoutThreshold) {
      const duration = Math.floor((now - new Date(scan.startedAt).getTime()) / 1000 / 60);
      console.log(`⚠️  清理卡住的扫描: ${scan.id} (已运行 ${duration} 分钟)`);

      await db
        .update(scans)
        .set({
          status: "failed",
          finishedAt: new Date(),
          error: `Scan timeout - exceeded 15 minutes (cleaned up after ${duration} minutes)`,
        })
        .where(eq(scans.id, scan.id));

      cleanedCount++;
    }
  }

  console.log(`✅ 清理完成! 共清理了 ${cleanedCount} 个卡住的扫描`);
}

cleanupStuckScans()
  .then(() => {
    console.log("✨ 完成");
    process.exit(0);
  })
  .catch((err) => {
    console.error("❌ 错误:", err);
    process.exit(1);
  });

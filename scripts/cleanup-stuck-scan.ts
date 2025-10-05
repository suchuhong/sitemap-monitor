#!/usr/bin/env tsx
/**
 * 清理卡住的扫描
 * 
 * 使用方法:
 * DATABASE_URL="your-db-url" pnpm tsx scripts/cleanup-stuck-scan.ts [timeout-minutes]
 */

import { resolveDb } from "@/lib/db";
import { scans } from "@/lib/drizzle/schema";
import { eq, and, lt } from "drizzle-orm";

async function cleanupStuckScans(timeoutMinutes: number = 5) {
  const db = resolveDb() as any;

  console.log(`🧹 清理卡住的扫描（超时: ${timeoutMinutes} 分钟）\n`);

  // 计算超时阈值
  const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  // 查找卡住的扫描
  const stuckScans = await db
    .select()
    .from(scans)
    .where(eq(scans.status, "running"));

  console.log(`📊 找到 ${stuckScans.length} 个运行中的扫描\n`);

  if (stuckScans.length === 0) {
    console.log("✅ 没有需要清理的扫描");
    return { cleaned: 0 };
  }

  let cleanedCount = 0;

  for (const scan of stuckScans) {
    const startedAt = new Date(scan.startedAt);
    const elapsedMinutes = (Date.now() - startedAt.getTime()) / 1000 / 60;

    console.log(`\n扫描 ID: ${scan.id}`);
    console.log(`  站点: ${scan.siteId}`);
    console.log(`  状态: ${scan.status}`);
    console.log(`  开始时间: ${startedAt.toISOString()}`);
    console.log(`  运行时长: ${elapsedMinutes.toFixed(2)} 分钟`);

    if (startedAt < timeoutThreshold) {
      console.log(`  ⚠️  超时，将清理`);

      try {
        await db
          .update(scans)
          .set({
            status: "failed",
            finishedAt: new Date(),
            error: `Scan timeout - exceeded ${timeoutMinutes} minutes (manual cleanup)`,
          })
          .where(eq(scans.id, scan.id));

        console.log(`  ✅ 已清理`);
        cleanedCount++;
      } catch (err) {
        console.error(`  ❌ 清理失败:`, err);
      }
    } else {
      console.log(`  ℹ️  仍在正常运行时间内，跳过`);
    }
  }

  console.log(`\n${"=".repeat(60)}`);
  console.log(`✨ 清理完成: ${cleanedCount} 个扫描已清理`);

  return { cleaned: cleanedCount };
}

// 运行清理
const timeoutMinutes = parseInt(process.argv[2] || "5", 10);

cleanupStuckScans(timeoutMinutes)
  .then(result => {
    console.log(`\n✅ 成功清理 ${result.cleaned} 个卡住的扫描`);
    process.exit(0);
  })
  .catch(err => {
    console.error("\n❌ 清理失败:", err);
    process.exit(1);
  });

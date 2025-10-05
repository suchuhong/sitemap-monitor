#!/usr/bin/env tsx
/**
 * 强制清理所有卡住的扫描（包括 running 和 queued）
 * 
 * 使用方法:
 * DATABASE_URL="your-db-url" pnpm tsx scripts/force-cleanup-all-stuck.ts [timeout-minutes]
 * 
 * 示例:
 * DATABASE_URL="..." pnpm tsx scripts/force-cleanup-all-stuck.ts 2
 */

import { resolveDb } from "@/lib/db";
import { scans } from "@/lib/drizzle/schema";
import { eq, or, lt } from "drizzle-orm";

async function forceCleanupAllStuck(timeoutMinutes: number = 2) {
  const db = resolveDb() as any;

  console.log(`🧹 强制清理所有卡住的扫描\n`);
  console.log(`⏱️  超时阈值: ${timeoutMinutes} 分钟`);
  console.log("=".repeat(80));

  const timeoutThreshold = new Date(Date.now() - timeoutMinutes * 60 * 1000);

  // 查找所有运行中和排队中的扫描
  const stuckScans = await db
    .select()
    .from(scans)
    .where(
      or(
        eq(scans.status, "running"),
        eq(scans.status, "queued")
      )
    );

  console.log(`\n📊 找到 ${stuckScans.length} 个活动扫描\n`);

  if (stuckScans.length === 0) {
    console.log("✅ 没有需要清理的扫描");
    return { cleaned: 0, skipped: 0 };
  }

  let cleanedCount = 0;
  let skippedCount = 0;

  for (const scan of stuckScans) {
    const startedAt = new Date(scan.startedAt);
    const elapsedMinutes = (Date.now() - startedAt.getTime()) / 1000 / 60;

    console.log(`扫描 ID: ${scan.id.substring(0, 12)}...`);
    console.log(`  状态: ${scan.status}`);
    console.log(`  开始时间: ${startedAt.toISOString()}`);
    console.log(`  运行时长: ${elapsedMinutes.toFixed(2)} 分钟`);

    if (startedAt < timeoutThreshold) {
      console.log(`  ⚠️  超时，正在清理...`);

      try {
        await db
          .update(scans)
          .set({
            status: "failed",
            finishedAt: new Date(),
            error: `Scan timeout - exceeded ${timeoutMinutes} minutes (force cleanup)`,
          })
          .where(eq(scans.id, scan.id));

        console.log(`  ✅ 已清理`);
        cleanedCount++;
      } catch (err) {
        console.error(`  ❌ 清理失败:`, err);
      }
    } else {
      console.log(`  ℹ️  仍在正常运行时间内，跳过`);
      skippedCount++;
    }
    console.log();
  }

  console.log("=".repeat(80));
  console.log(`\n📊 清理结果:`);
  console.log(`   已清理: ${cleanedCount}`);
  console.log(`   已跳过: ${skippedCount}`);
  console.log(`   总计: ${stuckScans.length}`);

  return { cleaned: cleanedCount, skipped: skippedCount };
}

// 运行清理
const timeoutMinutes = parseInt(process.argv[2] || "2", 10);

console.log(`\n⚠️  警告: 此操作将清理所有超过 ${timeoutMinutes} 分钟的扫描任务`);
console.log(`如果有正在正常运行的扫描，请增加超时时间\n`);

forceCleanupAllStuck(timeoutMinutes)
  .then(result => {
    console.log(`\n✅ 清理完成: ${result.cleaned} 个扫描已清理，${result.skipped} 个已跳过\n`);
    process.exit(0);
  })
  .catch(err => {
    console.error("\n❌ 清理失败:", err);
    process.exit(1);
  });

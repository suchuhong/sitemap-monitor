#!/usr/bin/env tsx
/**
 * 检查运行中的扫描
 * 
 * 使用方法:
 * DATABASE_URL="your-db-url" pnpm tsx scripts/check-running-scans.ts
 */

import { resolveDb } from "@/lib/db";
import { scans, sites } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";

async function checkRunningScans() {
  const db = resolveDb() as any;

  console.log("🔍 检查运行中的扫描任务\n");
  console.log("=".repeat(80));

  // 查找所有运行中和排队中的扫描
  const runningScans = await db
    .select()
    .from(scans)
    .where(eq(scans.status, "running"));

  const queuedScans = await db
    .select()
    .from(scans)
    .where(eq(scans.status, "queued"));

  console.log(`\n📊 统计:`);
  console.log(`   运行中: ${runningScans.length}`);
  console.log(`   排队中: ${queuedScans.length}`);
  console.log(`   总计: ${runningScans.length + queuedScans.length}`);

  if (runningScans.length === 0 && queuedScans.length === 0) {
    console.log("\n✅ 没有运行中或排队中的扫描");
    return;
  }

  // 显示运行中的扫描详情
  if (runningScans.length > 0) {
    console.log(`\n🔄 运行中的扫描 (${runningScans.length}):\n`);

    for (const scan of runningScans) {
      const startedAt = new Date(scan.startedAt);
      const elapsedMinutes = (Date.now() - startedAt.getTime()) / 1000 / 60;

      // 获取站点信息
      const siteRows = await db
        .select()
        .from(sites)
        .where(eq(sites.id, scan.siteId))
        .limit(1);
      
      const site = siteRows[0];

      console.log(`扫描 ID: ${scan.id}`);
      console.log(`  站点: ${site?.rootUrl || scan.siteId}`);
      console.log(`  开始时间: ${startedAt.toISOString()}`);
      console.log(`  运行时长: ${elapsedMinutes.toFixed(2)} 分钟`);
      
      if (elapsedMinutes > 5) {
        console.log(`  ⚠️  状态: 可能已卡住 (超过 5 分钟)`);
      } else if (elapsedMinutes > 2) {
        console.log(`  ⚠️  状态: 运行时间较长 (超过 2 分钟)`);
      } else {
        console.log(`  ✅ 状态: 正常运行中`);
      }
      console.log();
    }
  }

  // 显示排队中的扫描详情
  if (queuedScans.length > 0) {
    console.log(`\n⏳ 排队中的扫描 (${queuedScans.length}):\n`);

    for (const scan of queuedScans) {
      const startedAt = new Date(scan.startedAt);
      const elapsedMinutes = (Date.now() - startedAt.getTime()) / 1000 / 60;

      // 获取站点信息
      const siteRows = await db
        .select()
        .from(sites)
        .where(eq(sites.id, scan.siteId))
        .limit(1);
      
      const site = siteRows[0];

      console.log(`扫描 ID: ${scan.id}`);
      console.log(`  站点: ${site?.rootUrl || scan.siteId}`);
      console.log(`  创建时间: ${startedAt.toISOString()}`);
      console.log(`  等待时长: ${elapsedMinutes.toFixed(2)} 分钟`);
      
      if (elapsedMinutes > 5) {
        console.log(`  ⚠️  状态: 可能已卡住 (超过 5 分钟)`);
      } else {
        console.log(`  ✅ 状态: 正常排队中`);
      }
      console.log();
    }
  }

  console.log("=".repeat(80));
  console.log("\n💡 建议操作:\n");

  const stuckScans = [...runningScans, ...queuedScans].filter(scan => {
    const elapsedMinutes = (Date.now() - new Date(scan.startedAt).getTime()) / 1000 / 60;
    return elapsedMinutes > 5;
  });

  if (stuckScans.length > 0) {
    console.log(`发现 ${stuckScans.length} 个可能卡住的扫描，建议清理:\n`);
    console.log(`1. 使用清理脚本:`);
    console.log(`   DATABASE_URL="..." pnpm tsx scripts/cleanup-stuck-scan.ts 5\n`);
    console.log(`2. 使用 API:`);
    console.log(`   curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=5" -H "x-cron-token: YOUR_TOKEN"\n`);
    console.log(`3. 直接 SQL:`);
    console.log(`   UPDATE sitemap_monitor_scans`);
    console.log(`   SET status = 'failed', finished_at = NOW(), error = 'Manual cleanup'`);
    console.log(`   WHERE status IN ('running', 'queued')`);
    console.log(`     AND started_at < NOW() - INTERVAL '5 minutes';\n`);
  } else {
    console.log(`所有扫描都在正常运行中，无需清理。\n`);
  }
}

checkRunningScans()
  .then(() => {
    console.log("✨ 检查完成\n");
    process.exit(0);
  })
  .catch(err => {
    console.error("\n❌ 检查失败:", err);
    process.exit(1);
  });

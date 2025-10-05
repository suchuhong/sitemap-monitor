#!/usr/bin/env tsx
/**
 * 测试手动扫描功能
 * 
 * 使用方法:
 * DATABASE_URL="your-db-url" pnpm tsx scripts/test-manual-scan.ts <site-id>
 */

import { resolveDb } from "@/lib/db";
import { sites, scans } from "@/lib/drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { enqueueScan } from "@/lib/logic/scan";

async function testManualScan(inputSiteId?: string) {
  const db = resolveDb() as any;

  let siteId: string;

  // 如果没有提供 siteId，获取第一个站点
  if (!inputSiteId) {
    const allSites = await db
      .select()
      .from(sites)
      .limit(1);
    
    if (allSites.length === 0) {
      console.error("❌ 没有找到任何站点");
      process.exit(1);
    }
    
    siteId = allSites[0].id;
    console.log(`📍 使用站点: ${allSites[0].rootUrl} (${siteId})`);
  } else {
    siteId = inputSiteId;
  }

  // 检查站点是否存在
  const siteRows = await db
    .select()
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);

  if (siteRows.length === 0) {
    console.error(`❌ 站点不存在: ${siteId}`);
    process.exit(1);
  }

  const site = siteRows[0];
  console.log(`\n🌐 站点信息:`);
  console.log(`   URL: ${site.rootUrl}`);
  console.log(`   ID: ${site.id}`);
  console.log(`   启用: ${site.enabled ? '是' : '否'}`);

  // 查看现有的扫描记录
  console.log(`\n📊 最近的扫描记录:`);
  const recentScans = await db
    .select()
    .from(scans)
    .where(eq(scans.siteId, siteId))
    .orderBy(desc(scans.startedAt))
    .limit(5);

  if (recentScans.length === 0) {
    console.log(`   (无扫描记录)`);
  } else {
    for (const scan of recentScans) {
      const duration = scan.finishedAt && scan.startedAt
        ? ((new Date(scan.finishedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000).toFixed(2)
        : 'N/A';
      console.log(`   - ${scan.id}: ${scan.status} (${duration}s) - ${scan.startedAt}`);
    }
  }

  // 触发扫描
  console.log(`\n🚀 触发手动扫描...`);
  try {
    const result = await enqueueScan(siteId);
    console.log(`✅ 扫描已入队:`);
    console.log(`   Scan ID: ${result.scanId}`);
    console.log(`   状态: ${result.status}`);
    if (result.message) {
      console.log(`   消息: ${result.message}`);
    }

    // 等待一段时间后检查状态
    console.log(`\n⏳ 等待 5 秒后检查状态...`);
    await new Promise(resolve => setTimeout(resolve, 5000));

    const updatedScan = await db
      .select()
      .from(scans)
      .where(eq(scans.id, result.scanId))
      .limit(1);

    if (updatedScan.length > 0) {
      const scan = updatedScan[0];
      console.log(`\n📋 扫描状态更新:`);
      console.log(`   ID: ${scan.id}`);
      console.log(`   状态: ${scan.status}`);
      console.log(`   开始时间: ${scan.startedAt}`);
      console.log(`   结束时间: ${scan.finishedAt || '(未完成)'}`);
      console.log(`   总 URL: ${scan.totalUrls || 0}`);
      console.log(`   新增: ${scan.added || 0}`);
      console.log(`   删除: ${scan.removed || 0}`);
      console.log(`   更新: ${scan.updated || 0}`);
      if (scan.error) {
        console.log(`   错误: ${scan.error}`);
      }

      if (scan.status === 'queued') {
        console.log(`\n⚠️  扫描仍在队列中，可能需要更长时间`);
        console.log(`   建议: 检查服务器日志查看详细信息`);
      } else if (scan.status === 'running') {
        console.log(`\n⏳ 扫描正在运行中...`);
      } else if (scan.status === 'success') {
        console.log(`\n✅ 扫描成功完成！`);
      } else if (scan.status === 'failed') {
        console.log(`\n❌ 扫描失败`);
      }
    } else {
      console.log(`\n❌ 无法找到扫描记录: ${result.scanId}`);
    }

  } catch (error) {
    console.error(`\n❌ 扫描失败:`, error);
    process.exit(1);
  }

  console.log(`\n✨ 测试完成`);
}

// 运行测试
const siteId = process.argv[2];
testManualScan(siteId)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });

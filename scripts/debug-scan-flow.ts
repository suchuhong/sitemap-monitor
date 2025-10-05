#!/usr/bin/env tsx
/**
 * 调试扫描流程
 * 
 * 使用方法:
 * DATABASE_URL="your-db-url" pnpm tsx scripts/debug-scan-flow.ts <site-id>
 */

import { resolveDb } from "@/lib/db";
import { sites, scans, sitemaps } from "@/lib/drizzle/schema";
import { eq, desc } from "drizzle-orm";

async function debugScanFlow(siteId: string) {
  const db = resolveDb() as any;

  console.log("🔍 调试扫描流程\n");
  console.log("=" .repeat(60));

  // 1. 检查站点
  console.log("\n📍 步骤 1: 检查站点");
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
  console.log(`✅ 站点存在`);
  console.log(`   ID: ${site.id}`);
  console.log(`   URL: ${site.rootUrl}`);
  console.log(`   启用: ${site.enabled ? '是' : '否'}`);
  console.log(`   所有者: ${site.ownerId}`);

  // 2. 检查 Sitemaps
  console.log("\n📄 步骤 2: 检查 Sitemaps");
  const sitemapRows = await db
    .select()
    .from(sitemaps)
    .where(eq(sitemaps.siteId, siteId));

  console.log(`   找到 ${sitemapRows.length} 个 sitemap`);
  if (sitemapRows.length === 0) {
    console.warn(`⚠️  警告: 站点没有 sitemap，扫描可能无法正常工作`);
  } else {
    for (const sm of sitemapRows) {
      console.log(`   - ${sm.url} (状态: ${sm.lastStatus || 'N/A'})`);
    }
  }

  // 3. 检查现有扫描
  console.log("\n📊 步骤 3: 检查现有扫描");
  const existingScans = await db
    .select()
    .from(scans)
    .where(eq(scans.siteId, siteId))
    .orderBy(desc(scans.startedAt))
    .limit(10);

  console.log(`   找到 ${existingScans.length} 条扫描记录`);
  
  if (existingScans.length > 0) {
    console.log("\n   最近的扫描:");
    for (const scan of existingScans.slice(0, 5)) {
      const duration = scan.finishedAt && scan.startedAt
        ? ((new Date(scan.finishedAt).getTime() - new Date(scan.startedAt).getTime()) / 1000).toFixed(2)
        : 'N/A';
      const status = scan.status.padEnd(10);
      console.log(`   - ${scan.id.substring(0, 12)}... | ${status} | ${duration}s | ${scan.startedAt}`);
      if (scan.error) {
        console.log(`     错误: ${scan.error}`);
      }
    }
  }

  // 4. 检查是否有运行中的扫描
  console.log("\n🔄 步骤 4: 检查运行中的扫描");
  const activeScans = existingScans.filter((s: any) => s.status === "running" || s.status === "queued");
  
  if (activeScans.length > 0) {
    console.log(`⚠️  发现 ${activeScans.length} 个活动扫描:`);
    for (const scan of activeScans) {
      const elapsed = scan.startedAt
        ? ((Date.now() - new Date(scan.startedAt).getTime()) / 1000 / 60).toFixed(2)
        : 'N/A';
      console.log(`   - ${scan.id}: ${scan.status} (运行了 ${elapsed} 分钟)`);
    }
    console.log(`\n   ℹ️  如果这些扫描已经卡住，运行清理命令:`);
    console.log(`   curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=5" -H "x-cron-token: YOUR_TOKEN"`);
  } else {
    console.log(`✅ 没有运行中的扫描`);
  }

  // 5. 模拟 API 调用
  console.log("\n🧪 步骤 5: 模拟 API 调用");
  console.log("   模拟调用: POST /api/sites/:id/scan");
  
  // 检查是否会被阻止
  const hasActiveScans = existingScans.some((scan: any) =>
    scan.status === "running" || scan.status === "queued"
  );

  if (hasActiveScans) {
    console.log(`   ⚠️  预期结果: 被阻止（已有活动扫描）`);
    const activeScan = existingScans.find((s: any) => s.status === "running" || s.status === "queued");
    console.log(`   返回的 scanId: ${activeScan?.id}`);
    console.log(`   状态: already_running`);
  } else {
    console.log(`   ✅ 预期结果: 创建新扫描`);
    console.log(`   将创建新的扫描记录`);
    console.log(`   状态: queued`);
  }

  // 6. 数据库写入测试
  console.log("\n💾 步骤 6: 测试数据库写入");
  try {
    const testId = `test-${Date.now()}`;
    await db
      .insert(scans)
      .values({
        id: testId,
        siteId: siteId,
        status: "queued",
        startedAt: new Date(),
      });
    console.log(`   ✅ 数据库写入成功`);
    
    // 立即删除测试记录
    await db
      .delete(scans)
      .where(eq(scans.id, testId));
    console.log(`   ✅ 测试记录已清理`);
  } catch (err) {
    console.error(`   ❌ 数据库写入失败:`, err);
  }

  // 7. 总结
  console.log("\n" + "=".repeat(60));
  console.log("📋 诊断总结\n");

  const issues: string[] = [];
  const warnings: string[] = [];

  if (!site.enabled) {
    issues.push("站点未启用");
  }

  if (sitemapRows.length === 0) {
    warnings.push("站点没有 sitemap");
  }

  if (activeScans.length > 0) {
    warnings.push(`有 ${activeScans.length} 个活动扫描可能阻止新扫描`);
  }

  if (issues.length > 0) {
    console.log("❌ 发现问题:");
    for (const issue of issues) {
      console.log(`   - ${issue}`);
    }
  }

  if (warnings.length > 0) {
    console.log("\n⚠️  警告:");
    for (const warning of warnings) {
      console.log(`   - ${warning}`);
    }
  }

  if (issues.length === 0 && warnings.length === 0) {
    console.log("✅ 未发现明显问题");
    console.log("\n建议:");
    console.log("1. 在浏览器中打开开发者工具（F12）");
    console.log("2. 切换到 Network 标签");
    console.log("3. 点击手动扫描按钮");
    console.log("4. 查看 /api/sites/:id/scan 请求的响应");
    console.log("5. 查看服务器控制台日志");
  }

  console.log("\n" + "=".repeat(60));
}

// 运行调试
const siteId = process.argv[2];

if (!siteId) {
  console.error("❌ 请提供站点 ID");
  console.log("\n使用方法:");
  console.log("  DATABASE_URL='...' pnpm tsx scripts/debug-scan-flow.ts <site-id>");
  process.exit(1);
}

debugScanFlow(siteId)
  .then(() => {
    console.log("\n✨ 调试完成");
    process.exit(0);
  })
  .catch(err => {
    console.error("\n❌ 调试失败:", err);
    process.exit(1);
  });

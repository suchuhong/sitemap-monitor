#!/usr/bin/env tsx
/**
 * 诊断扫描卡住的根本原因
 * 
 * 使用方法:
 * DATABASE_URL="your-db-url" pnpm tsx scripts/diagnose-scan-issue.ts <site-id>
 */

import { resolveDb } from "@/lib/db";
import { sites, scans, sitemaps } from "@/lib/drizzle/schema";
import { eq, desc } from "drizzle-orm";

async function diagnoseScanIssue(siteId: string) {
  const db = resolveDb() as any;

  console.log("🔍 诊断扫描卡住问题\n");
  console.log("=".repeat(80));

  // 1. 检查站点
  console.log("\n📍 步骤 1: 检查站点配置");
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
  console.log(`✅ 站点: ${site.rootUrl}`);
  console.log(`   启用: ${site.enabled ? '是' : '否'}`);

  // 2. 检查 Sitemaps
  console.log("\n📄 步骤 2: 检查 Sitemaps");
  const sitemapRows = await db
    .select()
    .from(sitemaps)
    .where(eq(sitemaps.siteId, siteId));

  console.log(`   找到 ${sitemapRows.length} 个 sitemap`);
  
  if (sitemapRows.length === 0) {
    console.error(`❌ 站点没有 sitemap，无法扫描`);
    console.log(`\n💡 解决方案:`);
    console.log(`   1. 重新发现站点: 访问站点设置页面`);
    console.log(`   2. 或手动添加 sitemap`);
    process.exit(1);
  }

  // 测试每个 sitemap 的可访问性
  console.log("\n🌐 步骤 3: 测试 Sitemap 可访问性");
  let hasInaccessibleSitemaps = false;

  for (const sm of sitemapRows) {
    console.log(`\n   测试: ${sm.url}`);
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(sm.url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SitemapMonitor/1.0)',
        },
      });

      clearTimeout(timeoutId);

      console.log(`   状态: ${response.status}`);
      console.log(`   大小: ${response.headers.get('content-length') || 'unknown'}`);
      console.log(`   类型: ${response.headers.get('content-type') || 'unknown'}`);

      if (!response.ok) {
        console.log(`   ⚠️  HTTP 错误: ${response.status}`);
        hasInaccessibleSitemaps = true;
      } else {
        console.log(`   ✅ 可访问`);
      }
    } catch (err) {
      console.error(`   ❌ 无法访问: ${err instanceof Error ? err.message : String(err)}`);
      hasInaccessibleSitemaps = true;
    }
  }

  // 3. 检查最近的扫描
  console.log("\n📊 步骤 4: 分析最近的扫描");
  const recentScans = await db
    .select()
    .from(scans)
    .where(eq(scans.siteId, siteId))
    .orderBy(desc(scans.startedAt))
    .limit(10);

  console.log(`   找到 ${recentScans.length} 条扫描记录\n`);

  // 统计扫描状态
  const statusCounts: Record<string, number> = {};
  const runningScans = [];
  const failedScans = [];

  for (const scan of recentScans) {
    statusCounts[scan.status] = (statusCounts[scan.status] || 0) + 1;

    if (scan.status === 'running' || scan.status === 'queued') {
      runningScans.push(scan);
    } else if (scan.status === 'failed') {
      failedScans.push(scan);
    }
  }

  console.log(`   状态统计:`);
  for (const [status, count] of Object.entries(statusCounts)) {
    console.log(`     ${status}: ${count}`);
  }

  // 4. 分析运行中的扫描
  if (runningScans.length > 0) {
    console.log(`\n⚠️  步骤 5: 分析运行中的扫描 (${runningScans.length})`);

    for (const scan of runningScans) {
      const startedAt = new Date(scan.startedAt);
      const elapsedMinutes = (Date.now() - startedAt.getTime()) / 1000 / 60;

      console.log(`\n   扫描 ID: ${scan.id}`);
      console.log(`   状态: ${scan.status}`);
      console.log(`   开始时间: ${startedAt.toISOString()}`);
      console.log(`   运行时长: ${elapsedMinutes.toFixed(2)} 分钟`);

      if (elapsedMinutes > 10) {
        console.log(`   🚨 严重: 运行超过 10 分钟，肯定已卡住`);
      } else if (elapsedMinutes > 5) {
        console.log(`   ⚠️  警告: 运行超过 5 分钟，可能已卡住`);
      } else if (elapsedMinutes > 2) {
        console.log(`   ⚠️  注意: 运行超过 2 分钟，需要关注`);
      } else {
        console.log(`   ✅ 正常: 运行时间在合理范围内`);
      }
    }
  }

  // 5. 分析失败的扫描
  if (failedScans.length > 0) {
    console.log(`\n❌ 步骤 6: 分析失败的扫描 (最近 ${Math.min(failedScans.length, 3)} 条)`);

    for (const scan of failedScans.slice(0, 3)) {
      console.log(`\n   扫描 ID: ${scan.id}`);
      console.log(`   开始时间: ${new Date(scan.startedAt).toISOString()}`);
      console.log(`   错误信息: ${scan.error || '(无)'}`);
    }
  }

  // 6. 诊断结论
  console.log("\n" + "=".repeat(80));
  console.log("📋 诊断结论\n");

  const issues: string[] = [];
  const recommendations: string[] = [];

  if (sitemapRows.length === 0) {
    issues.push("站点没有 sitemap");
    recommendations.push("重新发现站点或手动添加 sitemap");
  }

  if (hasInaccessibleSitemaps) {
    issues.push("部分 sitemap 无法访问");
    recommendations.push("检查 sitemap URL 是否正确，网络是否可达");
  }

  if (runningScans.length > 0) {
    const oldestRunning = runningScans[runningScans.length - 1];
    const elapsedMinutes = (Date.now() - new Date(oldestRunning.startedAt).getTime()) / 1000 / 60;
    
    if (elapsedMinutes > 5) {
      issues.push(`有 ${runningScans.length} 个扫描卡在 running 状态`);
      recommendations.push("运行清理脚本: pnpm tsx scripts/force-cleanup-all-stuck.ts 2");
    }
  }

  if (failedScans.length > recentScans.length * 0.5) {
    issues.push("失败率过高 (超过 50%)");
    recommendations.push("检查 sitemap 配置和网络连接");
  }

  if (issues.length === 0) {
    console.log("✅ 未发现明显问题");
    console.log("\n可能的原因:");
    console.log("1. 扫描正在正常执行中");
    console.log("2. 网络延迟导致扫描时间较长");
    console.log("3. Sitemap 包含大量 URL");
  } else {
    console.log("❌ 发现以下问题:\n");
    for (let i = 0; i < issues.length; i++) {
      console.log(`${i + 1}. ${issues[i]}`);
    }

    console.log("\n💡 建议操作:\n");
    for (let i = 0; i < recommendations.length; i++) {
      console.log(`${i + 1}. ${recommendations[i]}`);
    }
  }

  // 7. 根本原因分析
  console.log("\n🔬 根本原因分析\n");

  if (runningScans.length > 0) {
    console.log("扫描卡在 running 状态的可能原因:");
    console.log("1. ❌ 网络超时: Sitemap 下载时间过长 (超过 30 秒)");
    console.log("2. ❌ 服务器重启: 进程被终止，状态未更新");
    console.log("3. ❌ 数据库错误: 状态更新失败");
    console.log("4. ❌ 代码异常: 未捕获的错误导致 finally 块未执行");
    console.log("5. ❌ 内存不足: 处理大型 sitemap 时内存溢出");
  }

  console.log("\n" + "=".repeat(80));
}

// 运行诊断
const siteId = process.argv[2];

if (!siteId) {
  console.error("❌ 请提供站点 ID");
  console.log("\n使用方法:");
  console.log("  DATABASE_URL='...' pnpm tsx scripts/diagnose-scan-issue.ts <site-id>");
  process.exit(1);
}

diagnoseScanIssue(siteId)
  .then(() => {
    console.log("\n✨ 诊断完成\n");
    process.exit(0);
  })
  .catch(err => {
    console.error("\n❌ 诊断失败:", err);
    process.exit(1);
  });

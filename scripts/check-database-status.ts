#!/usr/bin/env tsx
/**
 * 检查数据库状态和迁移情况
 * 
 * 使用方法:
 * DATABASE_URL="your-db-url" pnpm tsx scripts/check-database-status.ts
 */

import { resolveDb } from "@/lib/db";
import { sql } from "drizzle-orm";

async function checkDatabaseStatus() {
  const db = resolveDb() as any;

  console.log("🔍 检查数据库状态\n");
  console.log("=".repeat(80));

  try {
    // 1. 检查数据库连接
    console.log("\n📡 步骤 1: 测试数据库连接");
    await db.execute(sql`SELECT 1`);
    console.log("   ✅ 数据库连接正常");

    // 2. 检查所有表是否存在
    console.log("\n📊 步骤 2: 检查数据库表");
    const tables = await db.execute(sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name LIKE 'sitemap_monitor_%'
      ORDER BY table_name;
    `);

    const expectedTables = [
      'sitemap_monitor_changes',
      'sitemap_monitor_notification_channels',
      'sitemap_monitor_scans',
      'sitemap_monitor_site_groups',
      'sitemap_monitor_sites',
      'sitemap_monitor_sitemaps',
      'sitemap_monitor_urls',
      'sitemap_monitor_users',
      'sitemap_monitor_webhooks',
    ];

    console.log(`   找到 ${tables.rows.length} 个表:\n`);
    
    const foundTables = tables.rows.map((row: any) => row.table_name);
    
    for (const table of expectedTables) {
      if (foundTables.includes(table)) {
        console.log(`   ✅ ${table}`);
      } else {
        console.log(`   ❌ ${table} (缺失)`);
      }
    }

    // 3. 检查 sitemaps 表的 last_hash 字段
    console.log("\n🔍 步骤 3: 检查关键字段");
    const columns = await db.execute(sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sitemap_monitor_sitemaps'
      ORDER BY ordinal_position;
    `);

    console.log(`   sitemap_monitor_sitemaps 表字段:\n`);
    
    let hasLastHash = false;
    for (const col of columns.rows) {
      const nullable = (col as any).is_nullable === 'YES' ? '(nullable)' : '(not null)';
      console.log(`   - ${(col as any).column_name}: ${(col as any).data_type} ${nullable}`);
      
      if ((col as any).column_name === 'last_hash') {
        hasLastHash = true;
      }
    }

    if (hasLastHash) {
      console.log(`\n   ✅ last_hash 字段存在 (迁移 0003 已应用)`);
    } else {
      console.log(`\n   ⚠️  last_hash 字段不存在 (需要应用迁移 0003)`);
    }

    // 4. 检查索引
    console.log("\n📑 步骤 4: 检查性能索引");
    const indexes = await db.execute(sql`
      SELECT 
        schemaname,
        tablename,
        indexname
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename LIKE 'sitemap_monitor_%'
      ORDER BY tablename, indexname;
    `);

    console.log(`   找到 ${indexes.rows.length} 个索引\n`);
    
    const indexesByTable: Record<string, string[]> = {};
    for (const idx of indexes.rows) {
      const table = (idx as any).tablename;
      const index = (idx as any).indexname;
      if (!indexesByTable[table]) {
        indexesByTable[table] = [];
      }
      indexesByTable[table].push(index);
    }

    for (const [table, idxList] of Object.entries(indexesByTable)) {
      console.log(`   ${table}:`);
      for (const idx of idxList) {
        console.log(`     - ${idx}`);
      }
    }

    // 5. 检查数据统计
    console.log("\n📈 步骤 5: 数据统计");
    
    const stats = await Promise.all([
      db.execute(sql`SELECT COUNT(*) as count FROM sitemap_monitor_users`),
      db.execute(sql`SELECT COUNT(*) as count FROM sitemap_monitor_sites`),
      db.execute(sql`SELECT COUNT(*) as count FROM sitemap_monitor_sitemaps`),
      db.execute(sql`SELECT COUNT(*) as count FROM sitemap_monitor_urls`),
      db.execute(sql`SELECT COUNT(*) as count FROM sitemap_monitor_scans`),
      db.execute(sql`SELECT COUNT(*) as count FROM sitemap_monitor_changes`),
    ]);

    console.log(`   用户: ${stats[0].rows[0].count}`);
    console.log(`   站点: ${stats[1].rows[0].count}`);
    console.log(`   Sitemaps: ${stats[2].rows[0].count}`);
    console.log(`   URLs: ${stats[3].rows[0].count}`);
    console.log(`   扫描记录: ${stats[4].rows[0].count}`);
    console.log(`   变更记录: ${stats[5].rows[0].count}`);

    // 6. 检查运行中的扫描
    console.log("\n🔄 步骤 6: 检查运行中的扫描");
    const runningScans = await db.execute(sql`
      SELECT COUNT(*) as count 
      FROM sitemap_monitor_scans 
      WHERE status IN ('running', 'queued')
    `);

    const runningCount = runningScans.rows[0].count;
    if (runningCount > 0) {
      console.log(`   ⚠️  有 ${runningCount} 个扫描正在运行或排队中`);
      console.log(`   建议: 运行 check-running-scans.ts 查看详情`);
    } else {
      console.log(`   ✅ 没有运行中的扫描`);
    }

    // 7. 总结
    console.log("\n" + "=".repeat(80));
    console.log("📋 检查总结\n");

    const issues: string[] = [];
    const recommendations: string[] = [];

    if (foundTables.length < expectedTables.length) {
      issues.push("部分数据库表缺失");
      recommendations.push("运行: pnpm db:migrate");
    }

    if (!hasLastHash) {
      issues.push("last_hash 字段不存在");
      recommendations.push("应用迁移: psql $DATABASE_URL -f drizzle/0003_add_sitemap_last_hash.sql");
    }

    if (runningCount > 0) {
      issues.push(`有 ${runningCount} 个扫描可能卡住`);
      recommendations.push("运行: pnpm tsx scripts/force-cleanup-all-stuck.ts 2");
    }

    if (issues.length === 0) {
      console.log("✅ 数据库状态正常，无需迁移");
      console.log("\n所有表和字段都已就绪，可以正常使用。");
    } else {
      console.log("⚠️  发现以下问题:\n");
      for (let i = 0; i < issues.length; i++) {
        console.log(`${i + 1}. ${issues[i]}`);
      }

      console.log("\n💡 建议操作:\n");
      for (let i = 0; i < recommendations.length; i++) {
        console.log(`${i + 1}. ${recommendations[i]}`);
      }
    }

    console.log("\n" + "=".repeat(80));

  } catch (err) {
    console.error("\n❌ 检查失败:", err);
    console.log("\n可能的原因:");
    console.log("1. 数据库连接失败");
    console.log("2. 数据库权限不足");
    console.log("3. 数据库未初始化");
    console.log("\n建议:");
    console.log("1. 检查 DATABASE_URL 环境变量");
    console.log("2. 运行: pnpm db:migrate");
    process.exit(1);
  }
}

checkDatabaseStatus()
  .then(() => {
    console.log("\n✨ 检查完成\n");
    process.exit(0);
  })
  .catch(err => {
    console.error("\n❌ 检查失败:", err);
    process.exit(1);
  });

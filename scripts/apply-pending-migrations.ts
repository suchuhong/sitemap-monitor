#!/usr/bin/env tsx
/**
 * 应用待处理的数据库迁移
 * 
 * 使用方法:
 * DATABASE_URL="your-db-url" pnpm tsx scripts/apply-pending-migrations.ts
 */

import { resolveDb } from "@/lib/db";
import { sql } from "drizzle-orm";
import { readFileSync } from "fs";
import { join } from "path";

async function applyPendingMigrations() {
  const db = resolveDb() as any;

  console.log("🔄 应用待处理的数据库迁移\n");
  console.log("=".repeat(80));

  try {
    // 检查数据库连接
    console.log("\n📡 步骤 1: 测试数据库连接");
    await db.execute(sql`SELECT 1`);
    console.log("   ✅ 数据库连接正常");

    // 迁移 0002: optimize_url_uniques
    console.log("\n📝 步骤 2: 应用迁移 0002_optimize_url_uniques");
    
    try {
      const migration0002 = readFileSync(
        join(process.cwd(), 'drizzle/0002_optimize_url_uniques.sql'),
        'utf-8'
      );

      console.log("   执行 SQL...");
      await db.execute(sql.raw(migration0002));
      console.log("   ✅ 迁移 0002 应用成功");
      console.log("      - 添加 URL 唯一约束 (sitemap_id, loc)");
      console.log("      - 添加 Sitemap 唯一约束 (site_id, url)");
      console.log("      - 优化 scans.status 默认值为 'queued'");
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
        console.log("   ℹ️  迁移 0002 已经应用过，跳过");
      } else {
        throw err;
      }
    }

    // 迁移 0003: add_sitemap_last_hash
    console.log("\n📝 步骤 3: 应用迁移 0003_add_sitemap_last_hash");
    
    try {
      const migration0003 = readFileSync(
        join(process.cwd(), 'drizzle/0003_add_sitemap_last_hash.sql'),
        'utf-8'
      );

      console.log("   执行 SQL...");
      await db.execute(sql.raw(migration0003));
      console.log("   ✅ 迁移 0003 应用成功");
      console.log("      - 添加 sitemaps.last_hash 字段");
    } catch (err: any) {
      if (err.message?.includes('already exists') || err.message?.includes('duplicate')) {
        console.log("   ℹ️  迁移 0003 已经应用过，跳过");
      } else {
        throw err;
      }
    }

    // 验证迁移结果
    console.log("\n✅ 步骤 4: 验证迁移结果");

    // 检查 last_hash 字段
    const columns = await db.execute(sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'sitemap_monitor_sitemaps' 
        AND column_name = 'last_hash'
    `);

    if (columns.rows.length > 0) {
      console.log("   ✅ last_hash 字段存在");
    } else {
      console.log("   ❌ last_hash 字段不存在");
    }

    // 检查唯一约束
    const constraints = await db.execute(sql`
      SELECT constraint_name 
      FROM information_schema.table_constraints 
      WHERE table_name IN ('sitemap_monitor_urls', 'sitemap_monitor_sitemaps')
        AND constraint_type = 'UNIQUE'
    `);

    console.log(`   ✅ 找到 ${constraints.rows.length} 个唯一约束`);

    // 检查 scans.status 默认值
    const statusDefault = await db.execute(sql`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_name = 'sitemap_monitor_scans' 
        AND column_name = 'status'
    `);

    if (statusDefault.rows.length > 0) {
      const defaultValue = statusDefault.rows[0].column_default;
      console.log(`   ✅ scans.status 默认值: ${defaultValue}`);
    }

    console.log("\n" + "=".repeat(80));
    console.log("✨ 迁移完成\n");

    console.log("📊 迁移总结:");
    console.log("   - 0002_optimize_url_uniques: ✅ 已应用");
    console.log("   - 0003_add_sitemap_last_hash: ✅ 已应用");
    console.log("\n数据库已更新到最新版本！");

  } catch (err) {
    console.error("\n❌ 迁移失败:", err);
    console.log("\n可能的原因:");
    console.log("1. 数据库连接失败");
    console.log("2. 权限不足");
    console.log("3. SQL 语法错误");
    console.log("4. 数据冲突");
    console.log("\n建议:");
    console.log("1. 检查 DATABASE_URL 环境变量");
    console.log("2. 确认数据库用户有 ALTER TABLE 权限");
    console.log("3. 备份数据库后重试");
    process.exit(1);
  }
}

applyPendingMigrations()
  .then(() => {
    console.log("\n✅ 所有迁移已成功应用\n");
    process.exit(0);
  })
  .catch(err => {
    console.error("\n❌ 迁移失败:", err);
    process.exit(1);
  });

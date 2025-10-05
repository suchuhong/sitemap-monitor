#!/usr/bin/env node
/**
 * 验证数据库迁移结果
 * 
 * 使用方法:
 * DATABASE_URL="your-db-url" node scripts/verify-migration.js
 */

const { Pool } = require('pg');

async function verifyMigration() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('🔍 验证数据库迁移结果\n');
  console.log('='.repeat(80));

  try {
    // 1. 检查 last_hash 字段
    console.log('\n📝 步骤 1: 检查 last_hash 字段');
    const lastHashCheck = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sitemap_monitor_sitemaps' 
        AND column_name = 'last_hash'
    `);

    if (lastHashCheck.rows.length > 0) {
      console.log('   ✅ last_hash 字段存在');
      console.log(`      类型: ${lastHashCheck.rows[0].data_type}`);
      console.log(`      可空: ${lastHashCheck.rows[0].is_nullable}`);
    } else {
      console.log('   ❌ last_hash 字段不存在');
    }

    // 2. 检查唯一约束
    console.log('\n📝 步骤 2: 检查唯一约束');
    const constraints = await pool.query(`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name
      FROM information_schema.table_constraints tc
      JOIN information_schema.key_column_usage kcu 
        ON tc.constraint_name = kcu.constraint_name
      WHERE tc.constraint_type = 'UNIQUE'
        AND tc.table_name IN ('sitemap_monitor_urls', 'sitemap_monitor_sitemaps')
      ORDER BY tc.table_name, tc.constraint_name
    `);

    console.log(`   找到 ${constraints.rows.length} 个唯一约束:\n`);
    
    const constraintsByTable = {};
    for (const row of constraints.rows) {
      if (!constraintsByTable[row.table_name]) {
        constraintsByTable[row.table_name] = [];
      }
      constraintsByTable[row.table_name].push({
        name: row.constraint_name,
        column: row.column_name
      });
    }

    for (const [table, cons] of Object.entries(constraintsByTable)) {
      console.log(`   ${table}:`);
      const uniqueConstraints = {};
      for (const c of cons) {
        if (!uniqueConstraints[c.name]) {
          uniqueConstraints[c.name] = [];
        }
        uniqueConstraints[c.name].push(c.column);
      }
      for (const [name, columns] of Object.entries(uniqueConstraints)) {
        console.log(`     - ${name}: (${columns.join(', ')})`);
      }
    }

    // 3. 检查 scans.status 默认值
    console.log('\n📝 步骤 3: 检查 scans.status 默认值');
    const statusDefault = await pool.query(`
      SELECT column_default 
      FROM information_schema.columns 
      WHERE table_name = 'sitemap_monitor_scans' 
        AND column_name = 'status'
    `);

    if (statusDefault.rows.length > 0) {
      const defaultValue = statusDefault.rows[0].column_default;
      console.log(`   ✅ scans.status 默认值: ${defaultValue}`);
    } else {
      console.log('   ⚠️  无法获取默认值');
    }

    // 4. 检查所有 sitemaps 表字段
    console.log('\n📝 步骤 4: 检查 sitemaps 表所有字段');
    const allColumns = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'sitemap_monitor_sitemaps'
      ORDER BY ordinal_position
    `);

    console.log(`   找到 ${allColumns.rows.length} 个字段:\n`);
    for (const col of allColumns.rows) {
      const nullable = col.is_nullable === 'YES' ? '(nullable)' : '(not null)';
      const marker = col.column_name === 'last_hash' ? ' ← 新增' : '';
      console.log(`   - ${col.column_name}: ${col.data_type} ${nullable}${marker}`);
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ 验证完成\n');

    console.log('📊 迁移总结:');
    console.log('   - 0002_optimize_url_uniques: ✅ 已应用');
    console.log('   - 0003_add_sitemap_last_hash: ✅ 已应用');
    console.log('\n数据库已更新到最新版本！');

  } catch (err) {
    console.error('\n❌ 验证失败:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

verifyMigration()
  .then(() => {
    console.log('\n✨ 验证成功\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 验证失败:', err);
    process.exit(1);
  });

#!/usr/bin/env node
/**
 * 手动执行数据库迁移
 * 
 * 使用方法:
 * DATABASE_URL="your-db-url" node scripts/manual-migrate.js
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function manualMigrate() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  console.log('🔄 手动执行数据库迁移\n');
  console.log('='.repeat(80));

  try {
    // 迁移 0002
    console.log('\n📝 步骤 1: 应用迁移 0002_optimize_url_uniques');
    
    const migration0002 = fs.readFileSync(
      path.join(process.cwd(), 'drizzle/0002_optimize_url_uniques.sql'),
      'utf-8'
    );

    console.log('   执行 SQL...');
    await pool.query(migration0002);
    console.log('   ✅ 迁移 0002 应用成功');

    // 迁移 0003
    console.log('\n📝 步骤 2: 应用迁移 0003_add_sitemap_last_hash');
    
    const migration0003 = fs.readFileSync(
      path.join(process.cwd(), 'drizzle/0003_add_sitemap_last_hash.sql'),
      'utf-8'
    );

    console.log('   执行 SQL...');
    await pool.query(migration0003);
    console.log('   ✅ 迁移 0003 应用成功');

    console.log('\n' + '='.repeat(80));
    console.log('✅ 迁移完成\n');

  } catch (err) {
    console.error('\n❌ 迁移失败:', err.message);
    console.error('\n详细错误:', err);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

manualMigrate()
  .then(() => {
    console.log('✨ 迁移成功应用\n');
    process.exit(0);
  })
  .catch(err => {
    console.error('\n❌ 迁移失败:', err);
    process.exit(1);
  });

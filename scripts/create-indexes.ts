// 创建数据库索引以优化查询性能
import { Pool } from "pg";

const indexes = [
  // Changes 表索引
  {
    name: "idx_changes_site_occurred",
    sql: "CREATE INDEX IF NOT EXISTS idx_changes_site_occurred ON sitemap_monitor_changes(site_id, occurred_at DESC)",
    description: "优化按站点和时间查询变更",
  },
  {
    name: "idx_changes_type_occurred",
    sql: "CREATE INDEX IF NOT EXISTS idx_changes_type_occurred ON sitemap_monitor_changes(type, occurred_at DESC)",
    description: "优化按类型和时间查询变更",
  },
  {
    name: "idx_changes_site_type_occurred",
    sql: "CREATE INDEX IF NOT EXISTS idx_changes_site_type_occurred ON sitemap_monitor_changes(site_id, type, occurred_at DESC)",
    description: "优化 Dashboard 变更统计查询",
  },
  
  // Scans 表索引
  {
    name: "idx_scans_site_started",
    sql: "CREATE INDEX IF NOT EXISTS idx_scans_site_started ON sitemap_monitor_scans(site_id, started_at DESC)",
    description: "优化按站点和时间查询扫描",
  },
  {
    name: "idx_scans_status",
    sql: "CREATE INDEX IF NOT EXISTS idx_scans_status ON sitemap_monitor_scans(status)",
    description: "优化按状态查询扫描",
  },
  {
    name: "idx_scans_site_started_finished",
    sql: "CREATE INDEX IF NOT EXISTS idx_scans_site_started_finished ON sitemap_monitor_scans(site_id, started_at DESC, finished_at)",
    description: "优化扫描统计查询",
  },
  
  // Sites 表索引
  {
    name: "idx_sites_owner",
    sql: "CREATE INDEX IF NOT EXISTS idx_sites_owner ON sitemap_monitor_sites(owner_id)",
    description: "优化按所有者查询站点",
  },
  {
    name: "idx_sites_enabled",
    sql: "CREATE INDEX IF NOT EXISTS idx_sites_enabled ON sitemap_monitor_sites(enabled) WHERE enabled = true",
    description: "优化查询启用的站点",
  },
  
  // URLs 表索引
  {
    name: "idx_urls_site",
    sql: "CREATE INDEX IF NOT EXISTS idx_urls_site ON sitemap_monitor_urls(site_id)",
    description: "优化按站点查询 URLs",
  },
  {
    name: "idx_urls_sitemap",
    sql: "CREATE INDEX IF NOT EXISTS idx_urls_sitemap ON sitemap_monitor_urls(sitemap_id)",
    description: "优化按 sitemap 查询 URLs",
  },
  {
    name: "idx_urls_status",
    sql: "CREATE INDEX IF NOT EXISTS idx_urls_status ON sitemap_monitor_urls(status)",
    description: "优化按状态查询 URLs",
  },
  
  // Sitemaps 表索引
  {
    name: "idx_sitemaps_site",
    sql: "CREATE INDEX IF NOT EXISTS idx_sitemaps_site ON sitemap_monitor_sitemaps(site_id)",
    description: "优化按站点查询 sitemaps",
  },
  
  // Notification Channels 表索引
  {
    name: "idx_notification_channels_site",
    sql: "CREATE INDEX IF NOT EXISTS idx_notification_channels_site ON sitemap_monitor_notification_channels(site_id)",
    description: "优化按站点查询通知渠道",
  },
  
  // Webhooks 表索引
  {
    name: "idx_webhooks_site",
    sql: "CREATE INDEX IF NOT EXISTS idx_webhooks_site ON sitemap_monitor_webhooks(site_id)",
    description: "优化按站点查询 webhooks",
  },
];

async function createIndexes() {
  console.log("🔧 开始创建数据库索引...\n");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL 环境变量未设置");
  }

  const pool = new Pool({ connectionString });

  try {
    let created = 0;
    let skipped = 0;

    for (const index of indexes) {
      try {
        console.log(`📝 创建索引: ${index.name}`);
        console.log(`   说明: ${index.description}`);
        
        const start = Date.now();
        await pool.query(index.sql);
        const time = Date.now() - start;
        
        console.log(`   ✅ 完成 (${time}ms)\n`);
        created++;
      } catch (error: any) {
        if (error.code === '42P07') {
          console.log(`   ⏭️  已存在，跳过\n`);
          skipped++;
        } else {
          console.error(`   ❌ 失败: ${error.message}\n`);
        }
      }
    }

    console.log("📊 索引创建总结:");
    console.log(`   - 新创建: ${created}`);
    console.log(`   - 已存在: ${skipped}`);
    console.log(`   - 总计: ${indexes.length}`);
    console.log();

    // 验证索引
    console.log("🔍 验证索引...");
    const result = await pool.query(`
      SELECT 
        schemaname,
        tablename,
        indexname,
        indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
        AND tablename LIKE 'sitemap_monitor_%'
      ORDER BY tablename, indexname
    `);

    console.log(`   找到 ${result.rows.length} 个索引\n`);

    // 按表分组显示
    const indexesByTable = result.rows.reduce((acc: any, row: any) => {
      if (!acc[row.tablename]) {
        acc[row.tablename] = [];
      }
      acc[row.tablename].push(row.indexname);
      return acc;
    }, {});

    for (const [table, tableIndexes] of Object.entries(indexesByTable)) {
      console.log(`   ${table}:`);
      (tableIndexes as string[]).forEach((idx: string) => {
        console.log(`     - ${idx}`);
      });
    }

    console.log("\n✅ 索引创建完成！");
    console.log("\n💡 提示: 运行性能测试验证优化效果");
    console.log("   DATABASE_URL=\"...\" npx tsx scripts/test-dashboard-performance.ts");

  } catch (error) {
    console.error("\n❌ 索引创建失败:");
    console.error(error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

createIndexes();

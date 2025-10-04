// 数据迁移脚本：从 SQLite 迁移到 PostgreSQL
import Database from "better-sqlite3";
import { drizzle as sqliteDrizzle } from "drizzle-orm/better-sqlite3";
import { drizzle as pgDrizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

// SQLite Schema (旧表名)
import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// 定义 SQLite 旧表结构
const oldUsers = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

const oldSiteGroups = sqliteTable("site_groups", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

const oldSites = sqliteTable("sites", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  rootUrl: text("root_url").notNull(),
  robotsUrl: text("robots_url"),
  enabled: integer("enabled", { mode: "boolean" }),
  tags: text("tags"),
  groupId: text("group_id"),
  scanPriority: integer("scan_priority"),
  scanIntervalMinutes: integer("scan_interval_minutes"),
  lastScanAt: integer("last_scan_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

const oldSitemaps = sqliteTable("sitemaps", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  url: text("url").notNull(),
  isIndex: integer("is_index", { mode: "boolean" }),
  lastEtag: text("last_etag"),
  lastModified: text("last_modified"),
  lastStatus: integer("last_status"),
  discoveredAt: integer("discovered_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" }),
});

const oldUrls = sqliteTable("urls", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  sitemapId: text("sitemap_id").notNull(),
  loc: text("loc").notNull(),
  lastmod: text("lastmod"),
  changefreq: text("changefreq"),
  priority: text("priority"),
  firstSeenAt: integer("first_seen_at", { mode: "timestamp" }),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
  status: text("status"),
});

const oldScans = sqliteTable("scans", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  totalSitemaps: integer("total_sitemaps"),
  totalUrls: integer("total_urls"),
  added: integer("added"),
  removed: integer("removed"),
  updated: integer("updated"),
  status: text("status"),
  error: text("error"),
});

const oldChanges = sqliteTable("changes", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  scanId: text("scan_id"),
  urlId: text("url_id"),
  type: text("type").notNull(),
  detail: text("detail"),
  source: text("source"),
  assignee: text("assignee"),
  status: text("status"),
  occurredAt: integer("occurred_at", { mode: "timestamp" }),
});

const oldWebhooks = sqliteTable("webhooks", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  targetUrl: text("target_url").notNull(),
  secret: text("secret"),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

const oldNotificationChannels = sqliteTable("notification_channels", {
  id: text("id").primaryKey(),
  siteId: text("site_id").notNull(),
  type: text("type").notNull(),
  target: text("target").notNull(),
  secret: text("secret"),
  createdAt: integer("created_at", { mode: "timestamp" }),
});

// PostgreSQL Schema (新表名)
import * as newSchema from "../lib/drizzle/schema";

async function migrateData() {
  console.log("🚀 开始数据迁移...\n");

  // 连接 SQLite
  const sqlitePath = "drizzle/local.sqlite";
  console.log(`📂 连接 SQLite: ${sqlitePath}`);
  const sqlite = new Database(sqlitePath);
  const sourceDb = sqliteDrizzle(sqlite);

  // 连接 PostgreSQL
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL 环境变量未设置");
  }
  console.log(`🐘 连接 PostgreSQL: ${connectionString.replace(/:[^:@]+@/, ':****@')}\n`);
  
  const pool = new Pool({ connectionString });
  const targetDb = pgDrizzle(pool);

  try {
    // 1. 迁移 Users
    console.log("👤 迁移 users...");
    const users = await sourceDb.select().from(oldUsers);
    console.log(`   找到 ${users.length} 条记录`);
    if (users.length > 0) {
      await targetDb.insert(newSchema.users).values(users).onConflictDoNothing();
      console.log(`   ✅ 已迁移 ${users.length} 条记录\n`);
    }

    // 2. 迁移 Site Groups
    console.log("📁 迁移 site_groups...");
    const siteGroups = await sourceDb.select().from(oldSiteGroups);
    console.log(`   找到 ${siteGroups.length} 条记录`);
    if (siteGroups.length > 0) {
      await targetDb.insert(newSchema.siteGroups).values(siteGroups).onConflictDoNothing();
      console.log(`   ✅ 已迁移 ${siteGroups.length} 条记录\n`);
    }

    // 3. 迁移 Sites
    console.log("🌐 迁移 sites...");
    const sites = await sourceDb.select().from(oldSites);
    console.log(`   找到 ${sites.length} 条记录`);
    if (sites.length > 0) {
      await targetDb.insert(newSchema.sites).values(sites).onConflictDoNothing();
      console.log(`   ✅ 已迁移 ${sites.length} 条记录\n`);
    }

    // 4. 迁移 Sitemaps
    console.log("🗺️  迁移 sitemaps...");
    const sitemaps = await sourceDb.select().from(oldSitemaps);
    console.log(`   找到 ${sitemaps.length} 条记录`);
    if (sitemaps.length > 0) {
      // 分批插入，避免一次性插入太多数据
      const batchSize = 1000;
      for (let i = 0; i < sitemaps.length; i += batchSize) {
        const batch = sitemaps.slice(i, i + batchSize);
        await targetDb.insert(newSchema.sitemaps).values(batch).onConflictDoNothing();
        console.log(`   进度: ${Math.min(i + batchSize, sitemaps.length)}/${sitemaps.length}`);
      }
      console.log(`   ✅ 已迁移 ${sitemaps.length} 条记录\n`);
    }

    // 5. 迁移 URLs
    console.log("🔗 迁移 urls...");
    const urls = await sourceDb.select().from(oldUrls);
    console.log(`   找到 ${urls.length} 条记录`);
    if (urls.length > 0) {
      // 分批插入
      const batchSize = 1000;
      for (let i = 0; i < urls.length; i += batchSize) {
        const batch = urls.slice(i, i + batchSize);
        await targetDb.insert(newSchema.urls).values(batch).onConflictDoNothing();
        console.log(`   进度: ${Math.min(i + batchSize, urls.length)}/${urls.length}`);
      }
      console.log(`   ✅ 已迁移 ${urls.length} 条记录\n`);
    }

    // 6. 迁移 Scans
    console.log("📊 迁移 scans...");
    const scans = await sourceDb.select().from(oldScans);
    console.log(`   找到 ${scans.length} 条记录`);
    if (scans.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < scans.length; i += batchSize) {
        const batch = scans.slice(i, i + batchSize);
        await targetDb.insert(newSchema.scans).values(batch).onConflictDoNothing();
        console.log(`   进度: ${Math.min(i + batchSize, scans.length)}/${scans.length}`);
      }
      console.log(`   ✅ 已迁移 ${scans.length} 条记录\n`);
    }

    // 7. 迁移 Changes
    console.log("📝 迁移 changes...");
    const changes = await sourceDb.select().from(oldChanges);
    console.log(`   找到 ${changes.length} 条记录`);
    if (changes.length > 0) {
      const batchSize = 1000;
      for (let i = 0; i < changes.length; i += batchSize) {
        const batch = changes.slice(i, i + batchSize);
        await targetDb.insert(newSchema.changes).values(batch).onConflictDoNothing();
        console.log(`   进度: ${Math.min(i + batchSize, changes.length)}/${changes.length}`);
      }
      console.log(`   ✅ 已迁移 ${changes.length} 条记录\n`);
    }

    // 8. 迁移 Webhooks
    console.log("🪝 迁移 webhooks...");
    const webhooks = await sourceDb.select().from(oldWebhooks);
    console.log(`   找到 ${webhooks.length} 条记录`);
    if (webhooks.length > 0) {
      await targetDb.insert(newSchema.webhooks).values(webhooks).onConflictDoNothing();
      console.log(`   ✅ 已迁移 ${webhooks.length} 条记录\n`);
    }

    // 9. 迁移 Notification Channels
    console.log("📢 迁移 notification_channels...");
    const notificationChannels = await sourceDb.select().from(oldNotificationChannels);
    console.log(`   找到 ${notificationChannels.length} 条记录`);
    if (notificationChannels.length > 0) {
      await targetDb.insert(newSchema.notificationChannels).values(notificationChannels).onConflictDoNothing();
      console.log(`   ✅ 已迁移 ${notificationChannels.length} 条记录\n`);
    }

    console.log("🎉 数据迁移完成！\n");
    console.log("📊 迁移统计:");
    console.log(`   - Users: ${users.length}`);
    console.log(`   - Site Groups: ${siteGroups.length}`);
    console.log(`   - Sites: ${sites.length}`);
    console.log(`   - Sitemaps: ${sitemaps.length}`);
    console.log(`   - URLs: ${urls.length}`);
    console.log(`   - Scans: ${scans.length}`);
    console.log(`   - Changes: ${changes.length}`);
    console.log(`   - Webhooks: ${webhooks.length}`);
    console.log(`   - Notification Channels: ${notificationChannels.length}`);
    console.log(`   总计: ${users.length + siteGroups.length + sites.length + sitemaps.length + urls.length + scans.length + changes.length + webhooks.length + notificationChannels.length} 条记录`);

  } catch (error) {
    console.error("\n❌ 迁移失败:");
    console.error(error);
    process.exit(1);
  } finally {
    sqlite.close();
    await pool.end();
  }
}

migrateData();

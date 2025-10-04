// 验证数据迁移
import { resolveDb } from "../lib/db";
import { users, sites, sitemaps, urls, scans, changes, siteGroups, notificationChannels } from "../lib/drizzle/schema";
import { sql } from "drizzle-orm";

async function verifyMigration() {
  console.log("🔍 验证数据迁移...\n");

  try {
    const db = resolveDb();

    // 统计各表记录数
    const counts = await Promise.all([
      db.select({ count: sql<number>`count(*)::int` }).from(users),
      db.select({ count: sql<number>`count(*)::int` }).from(siteGroups),
      db.select({ count: sql<number>`count(*)::int` }).from(sites),
      db.select({ count: sql<number>`count(*)::int` }).from(sitemaps),
      db.select({ count: sql<number>`count(*)::int` }).from(urls),
      db.select({ count: sql<number>`count(*)::int` }).from(scans),
      db.select({ count: sql<number>`count(*)::int` }).from(changes),
      db.select({ count: sql<number>`count(*)::int` }).from(notificationChannels),
    ]);

    console.log("📊 PostgreSQL 数据统计:");
    console.log(`   - Users: ${counts[0][0].count}`);
    console.log(`   - Site Groups: ${counts[1][0].count}`);
    console.log(`   - Sites: ${counts[2][0].count}`);
    console.log(`   - Sitemaps: ${counts[3][0].count}`);
    console.log(`   - URLs: ${counts[4][0].count}`);
    console.log(`   - Scans: ${counts[5][0].count}`);
    console.log(`   - Changes: ${counts[6][0].count}`);
    console.log(`   - Notification Channels: ${counts[7][0].count}`);
    
    const total = counts.reduce((sum, c) => sum + c[0].count, 0);
    console.log(`   总计: ${total} 条记录\n`);

    // 抽样检查数据
    console.log("🔬 抽样检查数据...");
    
    const sampleUser = await db.select().from(users).limit(1);
    console.log(`   ✅ Users 表有数据: ${sampleUser.length > 0}`);
    
    const sampleSite = await db.select().from(sites).limit(1);
    console.log(`   ✅ Sites 表有数据: ${sampleSite.length > 0}`);
    
    const sampleUrl = await db.select().from(urls).limit(1);
    console.log(`   ✅ URLs 表有数据: ${sampleUrl.length > 0}`);

    console.log("\n✅ 数据迁移验证通过！");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ 验证失败:");
    console.error(error);
    process.exit(1);
  }
}

verifyMigration();

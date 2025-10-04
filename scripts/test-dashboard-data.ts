// 测试 Dashboard 数据是否正确
import { resolveDb } from "../lib/db";
import { sites, changes, scans } from "../lib/drizzle/schema";
import { gte, eq, and, sql } from "drizzle-orm";

async function testDashboardData() {
  console.log("🧪 测试 Dashboard 数据...\n");

  const db = resolveDb() as any;
  
  // 获取第一个用户 ID 用于测试
  const firstUser = await db.select({ id: sql<string>`id` }).from(sql`sitemap_monitor_users`).limit(1);
  
  if (firstUser.length === 0) {
    console.log("❌ 没有找到用户数据");
    process.exit(1);
  }

  const userId = firstUser[0].id;
  console.log(`👤 测试用户 ID: ${userId}\n`);

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  try {
    // 1. 站点总数
    console.log("1️⃣ 站点总数");
    const siteRows = await db.select().from(sites).where(eq(sites.ownerId, userId));
    console.log(`   ✅ ${siteRows.length} 个站点\n`);

    // 2. 24小时变更统计
    console.log("2️⃣ 24小时变更统计");
    const changeStats = await db
      .select({
        type: changes.type,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(changes)
      .innerJoin(sites, eq(changes.siteId, sites.id))
      .where(and(eq(sites.ownerId, userId), gte(changes.occurredAt, since)))
      .groupBy(changes.type);
    
    console.log(`   结果:`, changeStats);
    const added = changeStats.find((s: any) => s.type === 'added')?.count || 0;
    const removed = changeStats.find((s: any) => s.type === 'removed')?.count || 0;
    console.log(`   ✅ 新增: ${added}, 删除: ${removed}\n`);

    // 3. 扫描统计
    console.log("3️⃣ 扫描统计");
    const scanStats = await db
      .select({
        total: sql<number>`COUNT(*)::int`,
        failed: sql<number>`COUNT(CASE WHEN ${scans.status} != 'success' THEN 1 END)::int`,
        avgDuration: sql<number>`AVG(EXTRACT(EPOCH FROM (${scans.finishedAt} - ${scans.startedAt})))`,
      })
      .from(scans)
      .innerJoin(sites, eq(scans.siteId, sites.id))
      .where(and(
        eq(sites.ownerId, userId), 
        gte(scans.startedAt, since),
        sql`${scans.finishedAt} IS NOT NULL`
      ));
    
    console.log(`   结果:`, scanStats[0]);
    const total = scanStats[0]?.total || 0;
    const failed = scanStats[0]?.failed || 0;
    const avgDuration = scanStats[0]?.avgDuration || 0;
    const failRate = total ? Math.round((failed / total) * 100) : 0;
    console.log(`   ✅ 总扫描: ${total}, 失败: ${failed}, 失败率: ${failRate}%, 平均时长: ${Math.round(avgDuration / 60)}分钟\n`);

    // 4. 活跃站点排行
    console.log("4️⃣ 活跃站点排行");
    const topSites = await db
      .select({
        siteId: sites.id,
        rootUrl: sites.rootUrl,
        scanCount: sql<number>`COUNT(${scans.id})::int`,
      })
      .from(sites)
      .leftJoin(
        scans,
        and(eq(scans.siteId, sites.id), gte(scans.startedAt, since)),
      )
      .where(eq(sites.ownerId, userId))
      .groupBy(sites.id, sites.rootUrl)
      .orderBy(sql`COUNT(${scans.id}) DESC`)
      .limit(5);
    
    console.log(`   ✅ 找到 ${topSites.length} 个站点:`);
    topSites.forEach((site: any, index: number) => {
      console.log(`   ${index + 1}. ${site.rootUrl} - ${site.scanCount} 次扫描`);
    });
    console.log();

    // 5. 30天趋势
    console.log("5️⃣ 30天变更趋势");
    const trendWindowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const trendChangeRows = await db
      .select({
        day: sql<string>`DATE(${changes.occurredAt})`,
        type: changes.type,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(changes)
      .innerJoin(sites, eq(changes.siteId, sites.id))
      .where(and(eq(sites.ownerId, userId), gte(changes.occurredAt, trendWindowStart)))
      .groupBy(sql`DATE(${changes.occurredAt})`, changes.type)
      .orderBy(sql`DATE(${changes.occurredAt})`);
    
    console.log(`   ✅ ${trendChangeRows.length} 个数据点`);
    if (trendChangeRows.length > 0) {
      console.log(`   最早: ${trendChangeRows[0].day}`);
      console.log(`   最晚: ${trendChangeRows[trendChangeRows.length - 1].day}`);
    }
    console.log();

    console.log("✅ 所有数据测试通过！");
    console.log("\n💡 提示: 如果数据显示正常，说明 Dashboard 应该可以正常工作了。");
    
    process.exit(0);
  } catch (error) {
    console.error("\n❌ 测试失败:");
    console.error(error);
    process.exit(1);
  }
}

testDashboardData();

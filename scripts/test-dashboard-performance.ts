// 测试 Dashboard 页面查询性能
import { resolveDb } from "../lib/db";
import { sites, changes, scans } from "../lib/drizzle/schema";
import { gte, eq, and, sql } from "drizzle-orm";

async function testPerformance() {
  console.log("🚀 测试 Dashboard 查询性能...\n");

  const db = resolveDb() as any;
  const userId = "test-user-id"; // 替换为实际用户 ID
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const trendWindowStart = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  try {
    // 测试 1: 站点查询
    console.log("📊 测试 1: 站点查询");
    const start1 = Date.now();
    const siteRows = await db.select().from(sites).where(eq(sites.ownerId, userId));
    const time1 = Date.now() - start1;
    console.log(`   ✅ 完成: ${siteRows.length} 条记录, 耗时: ${time1}ms\n`);

    // 测试 2: 24小时变更统计（优化后）
    console.log("📊 测试 2: 24小时变更统计（聚合查询）");
    const start2 = Date.now();
    const changeStats = await db
      .select({
        type: changes.type,
        count: sql<number>`COUNT(*)::int`,
      })
      .from(changes)
      .innerJoin(sites, eq(changes.siteId, sites.id))
      .where(and(eq(sites.ownerId, userId), gte(changes.occurredAt, since)))
      .groupBy(changes.type);
    const time2 = Date.now() - start2;
    console.log(`   ✅ 完成: ${changeStats.length} 个类型, 耗时: ${time2}ms`);
    console.log(`   数据:`, changeStats);
    console.log();

    // 测试 3: 扫描统计（优化后）
    console.log("📊 测试 3: 扫描统计（聚合查询）");
    const start3 = Date.now();
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
    const time3 = Date.now() - start3;
    console.log(`   ✅ 完成: 耗时: ${time3}ms`);
    console.log(`   数据:`, scanStats[0]);
    console.log();

    // 测试 4: 30天趋势（优化后）
    console.log("📊 测试 4: 30天变更趋势（聚合查询）");
    const start4 = Date.now();
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
    const time4 = Date.now() - start4;
    console.log(`   ✅ 完成: ${trendChangeRows.length} 个数据点, 耗时: ${time4}ms\n`);

    // 总结
    const totalTime = time1 + time2 + time3 + time4;
    console.log("📈 性能总结:");
    console.log(`   - 站点查询: ${time1}ms`);
    console.log(`   - 变更统计: ${time2}ms`);
    console.log(`   - 扫描统计: ${time3}ms`);
    console.log(`   - 趋势查询: ${time4}ms`);
    console.log(`   - 总耗时: ${totalTime}ms`);
    console.log();

    if (totalTime < 1000) {
      console.log("✅ 性能优秀！页面加载应该很快。");
    } else if (totalTime < 3000) {
      console.log("⚠️  性能一般，可能需要进一步优化。");
    } else {
      console.log("❌ 性能较差，需要优化查询或添加索引。");
    }

    process.exit(0);
  } catch (error) {
    console.error("\n❌ 测试失败:");
    console.error(error);
    process.exit(1);
  }
}

testPerformance();

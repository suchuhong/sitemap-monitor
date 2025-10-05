import { XMLParser } from "fast-xml-parser";
import { resolveDb } from "@/lib/db";
import { sitemaps, urls, scans, changes, sites } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { fetchWithCompression, retry } from "./net";
import { notifyChange, notifyScanComplete } from "./notify";
import { generateId } from "@/lib/utils/id";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

type ScanJob = {
  scanId: string;
  siteId: string;
};

export async function cronScan(maxSites?: number) {
  const db = resolveDb() as any;
  const now = Date.now();

  const activeSites = await db
    .select({
      id: sites.id,
      scanPriority: sites.scanPriority,
      scanIntervalMinutes: sites.scanIntervalMinutes,
      lastScanAt: sites.lastScanAt,
    })
    .from(sites)
    .where(eq(sites.enabled, true));

  type SiteWithDue = typeof activeSites[number] & { isDue: boolean };

  const dueSites = activeSites
    .map((site: typeof activeSites[number]): SiteWithDue => {
      const intervalMinutes = site.scanIntervalMinutes ?? 1440;
      const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000;
      const last = site.lastScanAt ? new Date(site.lastScanAt).getTime() : 0;
      return {
        ...site,
        isDue: !last || now - last >= intervalMs,
      };
    })
    .filter((site: SiteWithDue) => site.isDue)
    .sort((a: SiteWithDue, b: SiteWithDue) => {
      const priorityDiff = (b.scanPriority ?? 1) - (a.scanPriority ?? 1);
      if (priorityDiff !== 0) return priorityDiff;
      const aLast = a.lastScanAt ? new Date(a.lastScanAt).getTime() : 0;
      const bLast = b.lastScanAt ? new Date(b.lastScanAt).getTime() : 0;
      return aLast - bLast;
    });

  // 如果指定了 maxSites，则限制数量
  const sitesToScan = maxSites ? dueSites.slice(0, maxSites) : dueSites;

  const results: Array<Record<string, unknown>> = [];

  // 创建扫描任务（不等待执行完成，避免阻塞）
  for (const site of sitesToScan) {
    try {
      const scanId = generateId();
      await db
        .insert(scans)
        .values({ id: scanId, siteId: site.id, status: "queued" });

      // 异步执行扫描，不等待完成
      executeScan({ scanId, siteId: site.id })
        .then(() => {
          console.log(`[cronScan] Scan completed: ${scanId} for site ${site.id}`);
        })
        .catch((err) => {
          console.error(`[cronScan] Scan failed: ${scanId} for site ${site.id}`, err);
          // 确保失败时更新状态
          db.update(scans)
            .set({
              status: "failed",
              finishedAt: new Date(),
              error: err instanceof Error ? err.message : String(err),
            })
            .where(eq(scans.id, scanId))
            .catch(console.error);
        });

      results.push({ siteId: site.id, scanId, status: "queued" });
    } catch (err) {
      results.push({
        siteId: site.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    sitesChecked: activeSites.length,
    dueCount: activeSites.filter((s: typeof activeSites[number]) => {
      const intervalMinutes = s.scanIntervalMinutes ?? 1440;
      const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000;
      const last = s.lastScanAt ? new Date(s.lastScanAt).getTime() : 0;
      return !last || now - last >= intervalMs;
    }).length,
    processed: results.length,
    results
  };
}

export async function runScanNow(siteId: string) {
  const db = resolveDb() as any;
  const scanId = generateId();
  await db
    .insert(scans)
    .values({ id: scanId, siteId, status: "queued" });

  try {
    return await executeScan({ scanId, siteId });
  } catch (error) {
    // 确保失败时更新状态
    await db
      .update(scans)
      .set({
        status: "failed",
        finishedAt: new Date(),
        error: error instanceof Error ? error.message : String(error),
      })
      .where(eq(scans.id, scanId));
    throw error;
  }
}

export async function enqueueScan(siteId: string) {
  const db = resolveDb() as any;
  const scanId = generateId();

  console.log(`[enqueueScan] Starting for site ${siteId}`);

  // 检查是否已有该站点的运行中或排队中的扫描
  const existingScans = await db
    .select()
    .from(scans)
    .where(eq(scans.siteId, siteId));

  console.log(`[enqueueScan] Found ${existingScans.length} existing scans for site ${siteId}`);

  const hasActiveScans = existingScans.some((scan: any) =>
    scan.status === "running" || scan.status === "queued"
  );

  if (hasActiveScans) {
    const activeScan = existingScans.find((s: any) => s.status === "running" || s.status === "queued");
    console.log(`[enqueueScan] Active scan found: ${activeScan?.id} (${activeScan?.status})`);
    return {
      scanId: activeScan?.id,
      status: "already_running",
      message: "该站点已有扫描任务在执行中"
    };
  }

  // 创建新的扫描任务
  console.log(`[enqueueScan] Creating new scan ${scanId} for site ${siteId}`);
  
  try {
    await db
      .insert(scans)
      .values({ id: scanId, siteId, status: "queued" });
    
    console.log(`[enqueueScan] Successfully created scan ${scanId}`);
  } catch (err) {
    console.error(`[enqueueScan] Failed to create scan:`, err);
    throw err;
  }

  // 检测是否在 Serverless 环境中
  const isServerless = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY);
  
  console.log(`[enqueueScan] Environment: ${isServerless ? 'Serverless' : 'Long-running'}`);

  if (isServerless) {
    // Serverless 环境: 异步触发，不等待完成
    console.log(`[enqueueScan] Triggering background processing (async)`);
    processQueuedScans(1)
      .then(result => {
        console.log(`[enqueueScan] Background processing completed:`, result);
      })
      .catch(err => {
        console.error(`[enqueueScan] Background scan processing failed:`, err);
      });

    return { scanId, status: "queued" };
  } else {
    // 非 Serverless 环境: 同步执行，等待完成
    console.log(`[enqueueScan] Executing scan synchronously`);
    try {
      await executeScan({ scanId, siteId });
      console.log(`[enqueueScan] Scan completed successfully`);
      return { scanId, status: "success" };
    } catch (err) {
      console.error(`[enqueueScan] Scan failed:`, err);
      return { 
        scanId, 
        status: "failed", 
        error: err instanceof Error ? err.message : String(err) 
      };
    }
  }
}

/**
 * 启动队列中的扫描任务（异步，不等待完成）
 * 适用于 API 端点，快速返回
 */
export async function startQueuedScans(maxConcurrent = 1) {
  const db = resolveDb() as any;

  // 获取所有排队中的扫描任务
  const queuedScans = await db
    .select()
    .from(scans)
    .where(eq(scans.status, "queued"))
    .limit(maxConcurrent);

  if (queuedScans.length === 0) {
    return { started: 0, message: "没有待处理的扫描任务" };
  }

  // 异步启动所有任务，不等待完成
  const startedScans = [];
  for (const scan of queuedScans) {
    // 异步执行扫描，不等待
    // executeScan 内部会将状态从 queued 改为 running，然后改为 success/failed
    executeScan({ scanId: scan.id, siteId: scan.siteId })
      .then(() => {
        console.log(`[startQueuedScans] Scan completed: ${scan.id}`);
      })
      .catch(err => {
        console.error(`[startQueuedScans] Scan failed: ${scan.id}`, err);
        // executeScan 内部应该已经更新了状态，这里只是记录日志
        // 但为了保险，再次确保状态已更新
        db.update(scans)
          .set({
            status: "failed",
            finishedAt: new Date(),
            error: err instanceof Error ? err.message : String(err),
          })
          .where(eq(scans.id, scan.id))
          .catch(console.error);
      });

    startedScans.push({ scanId: scan.id, siteId: scan.siteId });
  }

  return {
    started: startedScans.length,
    scans: startedScans,
    message: `已启动 ${startedScans.length} 个扫描任务`
  };
}

/**
 * 处理数据库中排队的扫描任务（同步等待完成）
 * 适用于定时任务或需要等待结果的场景
 */
export async function processQueuedScans(maxConcurrent = 1) {
  const db = resolveDb() as any;

  console.log(`[processQueuedScans] Starting, maxConcurrent: ${maxConcurrent}`);

  // 获取所有排队中的扫描任务
  const queuedScans = await db
    .select()
    .from(scans)
    .where(eq(scans.status, "queued"))
    .limit(maxConcurrent);

  console.log(`[processQueuedScans] Found ${queuedScans.length} queued scans`);

  if (queuedScans.length === 0) {
    return { processed: 0, message: "没有待处理的扫描任务" };
  }

  const results = [];

  for (const scan of queuedScans) {
    console.log(`[processQueuedScans] Processing scan ${scan.id}`);
    try {
      // executeScan 内部会将状态设置为 running，这里不需要重复设置
      // 执行扫描
      const result = await executeScan({ scanId: scan.id, siteId: scan.siteId });
      results.push({ scanId: scan.id, status: "success", result });
      console.log(`[processQueuedScans] Scan ${scan.id} completed successfully`);
    } catch (err) {
      console.error(`[processQueuedScans] Scan ${scan.id} failed:`, err);

      // 确保失败时更新状态
      try {
        await db
          .update(scans)
          .set({
            status: "failed",
            finishedAt: new Date(),
            error: err instanceof Error ? err.message : String(err),
          })
          .where(eq(scans.id, scan.id));
        console.log(`[processQueuedScans] Updated scan ${scan.id} status to failed`);
      } catch (updateErr) {
        console.error(`[processQueuedScans] Failed to update scan status:`, updateErr);
      }

      results.push({
        scanId: scan.id,
        status: "failed",
        error: err instanceof Error ? err.message : String(err)
      });
    }
  }

  console.log(`[processQueuedScans] Completed, processed ${results.length} scans`);
  return { processed: results.length, results };
}

async function executeScan({ scanId, siteId }: ScanJob) {
  const db = resolveDb() as any;
  const startTime = new Date();
  
  console.log(`[executeScan] Starting scan ${scanId} for site ${siteId}`);
  
  let statusUpdated = false; // 标记状态是否已更新
  
  try {
    await db
      .update(scans)
      .set({ status: "running", startedAt: startTime })
      .where(eq(scans.id, scanId));
    console.log(`[executeScan] Updated scan ${scanId} status to running`);
  } catch (err) {
    console.error(`[executeScan] Failed to update scan status to running: ${scanId}`, err);
    throw err;
  }

  const smaps = await db
    .select()
    .from(sitemaps)
    .where(eq(sitemaps.siteId, siteId));

  let totalUrls = 0;
  let added = 0;
  let removed = 0;
  let updated = 0;
  const errors: string[] = [];

  try {
    for (const sm of smaps) {
      try {
        const result = await scanOneSitemap({ siteId, sitemap: sm, scanId });
        totalUrls += result.urlCount;
        added += result.urlsAdded;
        removed += result.urlsRemoved;
        updated += result.urlsUpdated;
      } catch (err) {
        errors.push(`${sm.url}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const status = errors.length ? "failed" : "success";
    const finishedAt = new Date();
    const duration = finishedAt.getTime() - startTime.getTime();

    try {
      await db
        .update(scans)
        .set({
          status,
          finishedAt,
          totalSitemaps: smaps.length,
          totalUrls,
          added,
          removed,
          updated,
          error: errors.length ? errors.join("; ") : null,
        })
        .where(eq(scans.id, scanId));
      
      statusUpdated = true; // 标记状态已更新
      console.log(`[executeScan] Scan ${scanId} completed with status: ${status}, totalUrls: ${totalUrls}, added: ${added}, removed: ${removed}, updated: ${updated}`);
    } catch (err) {
      console.error(`[executeScan] Failed to update scan status to ${status}: ${scanId}`, err);
      throw err;
    }

    // Update site's lastScanAt; do not let this affect scan status if it fails
    try {
      await db
        .update(sites)
        .set({ lastScanAt: finishedAt, updatedAt: finishedAt })
        .where(eq(sites.id, siteId));
    } catch (err) {
      console.warn(`[executeScan] Failed to update site lastScanAt for ${siteId}`, err);
      // Intentionally not throwing to avoid overwriting the already-updated scan status
    }

    // 发送扫描完成通知（包含所有状态）
    try {
      await notifyScanComplete(siteId, {
        scanId,
        status: status as "success" | "failed",
        totalSitemaps: smaps.length,
        totalUrls,
        added,
        removed,
        updated,
        error: errors.length ? errors.join("; ") : null,
        duration,
      });
    } catch (err) {
      console.warn("scan complete notification failed", siteId, err);
    }

    // 如果有变更，额外发送变更通知（保持向后兼容）
    if (!errors.length && (added || removed || updated)) {
      try {
        await notifyChange(siteId, { scanId, added, removed, updated });
      } catch (err) {
        console.warn("change notification failed", siteId, err);
      }
    }

    if (errors.length) {
      return { siteId, scanId, totalUrls, added, removed, updated, status, errors };
    }

    return { siteId, scanId, totalUrls, added, removed, updated, status };
  } catch (error) {
    const finishedAt = new Date();
    const duration = finishedAt.getTime() - startTime.getTime();
    const message = error instanceof Error ? error.message : String(error);

    try {
      await db
        .update(scans)
        .set({
          status: "failed",
          finishedAt,
          error: message,
        })
        .where(eq(scans.id, scanId));
      
      statusUpdated = true; // 标记状态已更新
    } catch (updateErr) {
      console.error(`Failed to update scan status to failed: ${scanId}`, updateErr);
      // 即使更新失败也要继续，让 finally 块处理
    }

    await db
      .update(sites)
      .set({ lastScanAt: finishedAt, updatedAt: finishedAt })
      .where(eq(sites.id, siteId))
      .catch((err: Error) => console.error(`Failed to update site lastScanAt: ${siteId}`, err));

    // 发送扫描失败通知
    try {
      await notifyScanComplete(siteId, {
        scanId,
        status: "failed",
        totalSitemaps: 0,
        totalUrls: 0,
        added: 0,
        removed: 0,
        updated: 0,
        error: message,
        duration,
      });
    } catch (err) {
      console.warn("scan failure notification failed", siteId, err);
    }

    throw error;
  } finally {
    // 最后的安全网：如果状态还没有更新，强制更新为 failed
    if (!statusUpdated) {
      console.error(`[SAFETY NET] Scan ${scanId} status was not updated, forcing to failed`);
      try {
        await db
          .update(scans)
          .set({
            status: "failed",
            finishedAt: new Date(),
            error: "Status update failed - forced by safety net",
          })
          .where(eq(scans.id, scanId));
      } catch (finalErr) {
        console.error(`[SAFETY NET] Failed to force update scan status: ${scanId}`, finalErr);
      }
    }
  }
}

type SitemapRow = typeof sitemaps.$inferSelect;

type ParsedSitemapUrl = {
  loc: string;
  lastmod?: string;
  changefreq?: string;
  priority?: string;
};

async function scanOneSitemap({
  siteId,
  sitemap: sm,
  scanId,
}: {
  siteId: string;
  sitemap: SitemapRow;
  scanId: string;
}) {
  const db = resolveDb() as any; // Auto-detect runtime
  const headers: Record<string, string> = {};
  if (sm.lastEtag) headers["If-None-Match"] = sm.lastEtag;
  if (sm.lastModified) headers["If-Modified-Since"] = sm.lastModified;

  let res: Response;
  try {
    // 使用更长的超时时间以支持大型 sitemap
    res = await retry(() => fetchWithCompression(sm.url, { timeout: 30000, headers }), 2);
  } catch (err) {
    await db
      .update(sitemaps)
      .set({ lastStatus: null, updatedAt: new Date() })
      .where(eq(sitemaps.id, sm.id));
    throw err;
  }

  const now = new Date();
  const sitemapUpdate: Partial<typeof sitemaps.$inferInsert> = {
    lastStatus: res.status,
    updatedAt: now,
  };
  const headerEtag = res.headers.get("etag");
  if (headerEtag !== null) sitemapUpdate.lastEtag = headerEtag;
  const headerLastModified = res.headers.get("last-modified");
  if (headerLastModified !== null) sitemapUpdate.lastModified = headerLastModified;

  if (res.status === 304) {
    await db.update(sitemaps).set(sitemapUpdate).where(eq(sitemaps.id, sm.id));
    return { changed: false, urlsAdded: 0, urlsRemoved: 0, urlsUpdated: 0, urlCount: 0 };
  }
  if (!res.ok) {
    await db.update(sitemaps).set(sitemapUpdate).where(eq(sitemaps.id, sm.id));
    throw new Error(`fetch failed with status ${res.status}`);
  }

  let xml: unknown;
  try {
    xml = xmlParser.parse(await res.text());
  } catch (err) {
    await db.update(sitemaps).set(sitemapUpdate).where(eq(sitemaps.id, sm.id));
    throw err instanceof Error ? err : new Error(String(err));
  }

  const list: ParsedSitemapUrl[] = extractUrlNodes(xml)
    .map((raw) => parseSitemapUrl(raw))
    .filter((node): node is ParsedSitemapUrl => Boolean(node));

  const locMap = new Map<
    string,
    {
      loc: string;
      lastmod: string | null;
      changefreq: string | null;
      priority: string | null;
    }
  >();

  for (const raw of list) {
    const loc = raw.loc.trim();
    if (!loc) continue;
    locMap.set(loc, {
      loc,
      lastmod: raw.lastmod ?? null,
      changefreq: raw.changefreq ?? null,
      priority: raw.priority ?? null,
    });
  }

  const existing = await db
    .select()
    .from(urls)
    .where(eq(urls.sitemapId, sm.id));
  const existingMap = new Map(existing.map((row: typeof urls.$inferSelect) => [row.loc, row]));

  const toAdd: Array<{
    loc: string;
    lastmod: string | null;
    changefreq: string | null;
    priority: string | null;
  }> = [];
  const toKeep: Array<{
    record: (typeof existing)[number];
    detail: {
      loc: string;
      lastmod: string | null;
      changefreq: string | null;
      priority: string | null;
    };
  }> = [];
  for (const [loc, detail] of locMap) {
    const record = existingMap.get(loc);
    if (record) {
      toKeep.push({ record, detail });
    } else {
      toAdd.push(detail);
    }
  }

  const toRemove = existing.filter((row: typeof urls.$inferSelect) => !locMap.has(row.loc));

  let updatedCount = 0;

  // 批量更新现有 URLs
  const urlUpdates: Array<{ id: string; changes: string[] }> = [];
  for (const { record, detail } of toKeep) {
    const changesForUrl: string[] = [];
    if (detail.lastmod && detail.lastmod !== record.lastmod) {
      changesForUrl.push(`lastmod ${record.lastmod ?? "-"} → ${detail.lastmod}`);
    }
    if (detail.changefreq && detail.changefreq !== record.changefreq) {
      changesForUrl.push(`changefreq ${record.changefreq ?? "-"} → ${detail.changefreq}`);
    }
    if (detail.priority && detail.priority !== record.priority) {
      changesForUrl.push(`priority ${record.priority ?? "-"} → ${detail.priority}`);
    }

    await db
      .update(urls)
      .set({
        lastSeenAt: now,
        lastmod: detail.lastmod ?? record.lastmod ?? null,
        changefreq: detail.changefreq ?? record.changefreq ?? null,
        priority: detail.priority ?? record.priority ?? null,
        status: "active",
      })
      .where(eq(urls.id, record.id));

    if (changesForUrl.length) {
      updatedCount += 1;
      urlUpdates.push({ id: record.id, changes: changesForUrl });
    }
  }

  // 批量插入更新的 changes
  if (urlUpdates.length > 0) {
    const updateChanges = urlUpdates.map(({ id, changes: changesForUrl }) => ({
      id: generateId(),
      siteId,
      scanId,
      urlId: id,
      type: "updated" as const,
      detail: `${toKeep.find(k => k.record.id === id)?.record.loc} | ${changesForUrl.join("; ")}`,
      source: "scanner" as const,
    }));

    for (const change of updateChanges) {
      await db.insert(changes).values(change);
    }
  }

  // 批量插入新 URLs
  if (toAdd.length > 0) {
    const newUrls = toAdd.map(detail => ({
      id: generateId(),
      siteId,
      sitemapId: sm.id,
      loc: detail.loc,
      lastmod: detail.lastmod,
      changefreq: detail.changefreq,
      priority: detail.priority,
      firstSeenAt: now,
      lastSeenAt: now,
      status: "active" as const,
    }));

    for (const url of newUrls) {
      await db.insert(urls).values(url);
      await db.insert(changes).values({
        id: generateId(),
        siteId,
        scanId,
        urlId: url.id,
        type: "added" as const,
        detail: url.loc,
        source: "scanner" as const,
      });
    }
  }

  // 批量更新移除的 URLs
  if (toRemove.length > 0) {
    for (const row of toRemove) {
      await db
        .update(urls)
        .set({ status: "inactive", lastSeenAt: now })
        .where(eq(urls.id, row.id));
      await db.insert(changes).values({
        id: generateId(),
        siteId,
        scanId,
        urlId: row.id,
        type: "removed" as const,
        detail: row.loc,
        source: "scanner" as const,
      });
    }
  }

  await db.update(sitemaps).set(sitemapUpdate).where(eq(sitemaps.id, sm.id));

  return {
    changed: true,
    urlsAdded: toAdd.length,
    urlsRemoved: toRemove.length,
    urlsUpdated: updatedCount,
    urlCount: locMap.size,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseSitemapUrl(value: unknown): ParsedSitemapUrl | undefined {
  if (!isRecord(value)) return undefined;
  const loc = typeof value.loc === "string" ? value.loc : "";
  if (!loc) return undefined;
  return {
    loc,
    lastmod: typeof value.lastmod === "string" ? value.lastmod : undefined,
    changefreq: typeof value.changefreq === "string" ? value.changefreq : undefined,
    priority: typeof value.priority === "string" ? value.priority : undefined,
  };
}

function extractUrlNodes(source: unknown): unknown[] {
  if (!isRecord(source)) return [];
  const urlset = source.urlset;
  if (!urlset) return [];

  if (Array.isArray(urlset)) return urlset;

  if (isRecord(urlset)) {
    const urls = urlset.url;
    if (Array.isArray(urls)) return urls;
    if (urls !== undefined) return [urls];
  }

  return [];
}

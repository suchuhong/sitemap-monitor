import { XMLParser } from "fast-xml-parser";
import { randomUUID } from "crypto";
import { resolveDb } from "@/lib/db";
import { sitemaps, urls, scans, changes, sites } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { fetchWithCompression, retry } from "./net";
import { notifyChange } from "./notify";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

type ScanJob = {
  scanId: string;
  siteId: string;
};

const scanQueue: ScanJob[] = [];
let processing = false;

export async function cronScan() {
  const db = resolveDb();
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

  const dueSites = activeSites
    .map((site) => {
      const intervalMinutes = site.scanIntervalMinutes ?? 1440;
      const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000;
      const last = site.lastScanAt ? new Date(site.lastScanAt).getTime() : 0;
      return {
        ...site,
        isDue: !last || now - last >= intervalMs,
      };
    })
    .filter((site) => site.isDue)
    .sort((a, b) => {
      const priorityDiff = (b.scanPriority ?? 1) - (a.scanPriority ?? 1);
      if (priorityDiff !== 0) return priorityDiff;
      const aLast = a.lastScanAt ? new Date(a.lastScanAt).getTime() : 0;
      const bLast = b.lastScanAt ? new Date(b.lastScanAt).getTime() : 0;
      return aLast - bLast;
    });

  const results: Array<Record<string, unknown>> = [];
  for (const site of dueSites) {
    try {
      const { scanId } = await enqueueScan(site.id);
      results.push({ siteId: site.id, scanId, status: "queued" });
    } catch (err) {
      results.push({
        siteId: site.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return { sitesChecked: activeSites.length, queued: dueSites.length, results };
}

export async function runScanNow(siteId: string) {
  const db = resolveDb();
  const scanId = randomUUID();
  await db
    .insert(scans)
    .values({ id: scanId, siteId, status: "queued", startedAt: new Date() });
  return executeScan({ scanId, siteId });
}

export async function enqueueScan(siteId: string) {
  const db = resolveDb();
  const scanId = randomUUID();
  await db
    .insert(scans)
    .values({ id: scanId, siteId, status: "queued", startedAt: new Date() });
  scanQueue.push({ scanId, siteId });
  void processQueue();
  return { scanId };
}

async function processQueue() {
  if (processing) return;
  const job = scanQueue.shift();
  if (!job) return;
  processing = true;
  try {
    await executeScan(job);
  } catch (err) {
    console.error("scan job failed", job.siteId, err instanceof Error ? err.stack : err);
  } finally {
    processing = false;
    if (scanQueue.length) void processQueue();
  }
}

async function executeScan({ scanId, siteId }: ScanJob) {
  const db = resolveDb();
  const startTime = new Date();
  await db
    .update(scans)
    .set({ status: "running", startedAt: startTime })
    .where(eq(scans.id, scanId));

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

    await db
      .update(sites)
      .set({ lastScanAt: finishedAt, updatedAt: finishedAt })
      .where(eq(sites.id, siteId));

    if (!errors.length && (added || removed || updated)) {
      try {
        await notifyChange(siteId, { scanId, added, removed, updated });
      } catch (err) {
        console.warn("notify failed", siteId, err);
      }
    }

    if (errors.length) {
      return { siteId, scanId, totalUrls, added, removed, updated, status, errors };
    }

    return { siteId, scanId, totalUrls, added, removed, updated, status };
  } catch (error) {
    const finishedAt = new Date();
    const message = error instanceof Error ? error.message : String(error);
    await db
      .update(scans)
      .set({
        status: "failed",
        finishedAt,
        error: message,
      })
      .where(eq(scans.id, scanId));
    await db
      .update(sites)
      .set({ lastScanAt: finishedAt, updatedAt: finishedAt })
      .where(eq(sites.id, siteId));
    throw error;
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
  const db = resolveDb();
  const headers: Record<string, string> = {};
  if (sm.lastEtag) headers["If-None-Match"] = sm.lastEtag;
  if (sm.lastModified) headers["If-Modified-Since"] = sm.lastModified;

  let res: Response;
  try {
    res = await retry(() => fetchWithCompression(sm.url, { timeout: 12000, headers }), 2);
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
  const existingMap = new Map(existing.map((row) => [row.loc, row]));

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

  const toRemove = existing.filter((row) => !locMap.has(row.loc));

  let updatedCount = 0;

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
      await db
        .insert(changes)
        .values({
          id: randomUUID(),
          siteId,
          scanId,
          urlId: record.id,
          type: "updated",
          detail: `${record.loc} | ${changesForUrl.join("; ")}`,
          source: "scanner",
        });
    }
  }

  for (const detail of toAdd) {
    const urlId = randomUUID();
    await db
      .insert(urls)
      .values({
        id: urlId,
        siteId,
        sitemapId: sm.id,
        loc: detail.loc,
        lastmod: detail.lastmod,
        changefreq: detail.changefreq,
        priority: detail.priority,
        firstSeenAt: now,
        lastSeenAt: now,
        status: "active",
      });
    await db
      .insert(changes)
      .values({
        id: randomUUID(),
        siteId,
        scanId,
        urlId,
        type: "added",
        detail: detail.loc,
        source: "scanner",
      });
  }

  for (const row of toRemove) {
    await db
      .update(urls)
      .set({ status: "inactive", lastSeenAt: now })
      .where(eq(urls.id, row.id));
    await db
      .insert(changes)
      .values({
        id: randomUUID(),
        siteId,
        scanId,
        urlId: row.id,
        type: "removed",
        detail: row.loc,
        source: "scanner",
      });
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

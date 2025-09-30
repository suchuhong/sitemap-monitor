import { XMLParser } from "fast-xml-parser";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
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
  const activeSites = await db
    .select()
    .from(sites)
    .where(eq(sites.enabled, true));
  const results: Array<Record<string, unknown>> = [];
  for (const s of activeSites) {
    try {
      results.push(await runScanNow(s.id));
    } catch (err) {
      results.push({
        siteId: s.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return { sites: activeSites.length, results };
}

export async function runScanNow(siteId: string) {
  const scanId = randomUUID();
  await db
    .insert(scans)
    .values({ id: scanId, siteId, status: "queued", startedAt: new Date() });
  return executeScan({ scanId, siteId });
}

export async function enqueueScan(siteId: string) {
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
    console.error("scan job failed", job.siteId, err);
  } finally {
    processing = false;
    if (scanQueue.length) void processQueue();
  }
}

async function executeScan({ scanId, siteId }: ScanJob) {
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
  const errors: string[] = [];

  try {
    for (const sm of smaps) {
      try {
        const r = await scanOneSitemap(siteId, sm);
        totalUrls += r.urlCount;
        added += r.urlsAdded;
        removed += r.urlsRemoved;
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
        error: errors.length ? errors.join("; ") : null,
      })
      .where(eq(scans.id, scanId));

    if (!errors.length && (added || removed)) {
      try {
        await notifyChange(siteId, { scanId, added, removed });
      } catch (err) {
        console.warn("webhook notify failed", siteId, err);
      }
    }

    if (errors.length) {
      return { siteId, scanId, totalUrls, added, removed, status, errors };
    }

    return { siteId, scanId, totalUrls, added, removed, status };
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

async function scanOneSitemap(siteId: string, sm: SitemapRow) {
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
    return { changed: false, urlsAdded: 0, urlsRemoved: 0, urlCount: 0 };
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

  for (const { record, detail } of toKeep) {
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
        urlId,
        type: "added",
        detail: detail.loc,
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
        urlId: row.id,
        type: "removed",
        detail: row.loc,
      });
  }

  await db.update(sitemaps).set(sitemapUpdate).where(eq(sitemaps.id, sm.id));

  return {
    changed: true,
    urlsAdded: toAdd.length,
    urlsRemoved: toRemove.length,
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

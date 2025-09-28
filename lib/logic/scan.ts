import { XMLParser } from "fast-xml-parser";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { sitemaps, urls, scans, changes, sites } from "@/lib/drizzle/schema";
import { eq } from "drizzle-orm";
import { fetchWithCompression } from "./net";
import { notifyChange } from "./notify";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

export async function cronScan() {
  const allSites = await db.select().from(sites); // You can filter enabled=true
  const results = [];
  for (const s of allSites) results.push(await scanSite(s.id));
  return { sites: allSites.length, results };
}

export async function scanSite(siteId: string) {
  const scanId = randomUUID();
  await db
    .insert(scans)
    .values({ id: scanId, siteId, status: "running", startedAt: new Date() });
  const smaps = await db
    .select()
    .from(sitemaps)
    .where(eq(sitemaps.siteId, siteId));

  let totalUrls = 0,
    added = 0,
    removed = 0;
  for (const sm of smaps) {
    const r = await scanOneSitemap(siteId, sm);
    totalUrls += r.urlCount;
    added += r.urlsAdded;
    removed += r.urlsRemoved;
  }

  await db
    .update(scans)
    .set({
      status: "success",
      finishedAt: new Date(),
      totalSitemaps: smaps.length,
      totalUrls,
      added,
      removed,
    })
    .where(eq(scans.id, scanId));

  if (added || removed) await notifyChange(siteId, { scanId, added, removed });
  return { scanId, totalUrls, added, removed };
}

async function scanOneSitemap(siteId: string, sm: any) {
  const headers: Record<string, string> = {};
  if (sm.lastEtag) headers["If-None-Match"] = sm.lastEtag;
  if (sm.lastModified) headers["If-Modified-Since"] = sm.lastModified;

  const res = await fetchWithCompression(sm.url, { timeout: 12000, headers });
  if (res.status === 304)
    return { changed: false, urlsAdded: 0, urlsRemoved: 0, urlCount: 0 };
  if (!res.ok)
    return { changed: false, urlsAdded: 0, urlsRemoved: 0, urlCount: 0 };

  const xml = xmlParser.parse(await res.text());
  const list = xml.urlset?.url
    ? Array.isArray(xml.urlset.url)
      ? xml.urlset.url
      : [xml.urlset.url]
    : [];
  const locs = list.map((u: any) => ({ loc: u.loc, lastmod: u.lastmod }));

  const existing = await db
    .select()
    .from(urls)
    .where(eq(urls.sitemapId, sm.id));
  const existingSet = new Set(existing.map((e) => e.loc));
  const newSet = new Set(locs.map((l) => l.loc));

  const toAdd = [...newSet].filter((x) => !existingSet.has(x));
  const toRemove = [...existingSet].filter((x) => !newSet.has(x));

  for (const loc of toAdd) {
    await db
      .insert(urls)
      .values({
        id: randomUUID(),
        siteId,
        sitemapId: sm.id,
        loc,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      });
    await db
      .insert(changes)
      .values({ id: randomUUID(), siteId, type: "added", detail: loc });
  }
  for (const loc of toRemove) {
    await db
      .insert(changes)
      .values({ id: randomUUID(), siteId, type: "removed", detail: loc });
  }

  await db
    .update(sitemaps)
    .set({
      lastEtag: res.headers.get("etag") ?? null,
      lastModified: res.headers.get("last-modified") ?? null,
      lastStatus: res.status,
      updatedAt: new Date(),
    })
    .where(eq(sitemaps.id, sm.id));

  return {
    changed: true,
    urlsAdded: toAdd.length,
    urlsRemoved: toRemove.length,
    urlCount: locs.length,
  };
}

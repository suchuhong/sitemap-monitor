import { resolveDb } from "@/lib/db";
import {
  sites,
  sitemaps,
  urls,
  scans,
  changes,
  notificationChannels,
  siteGroups,
} from "@/lib/drizzle/schema";
import { and, desc, eq, sql } from "drizzle-orm";

type DetailOptions = {
  siteId: string;
  ownerId: string;
  scansLimit?: number;
  changesLimit?: number;
};

export async function getSiteDetail({
  siteId,
  ownerId,
  scansLimit = 5,
  changesLimit = 20,
}: DetailOptions) {
  const db = resolveDb() as any;
  const siteRows = await db
    .select({
      id: sites.id,
      rootUrl: sites.rootUrl,
      robotsUrl: sites.robotsUrl,
      enabled: sites.enabled,
      tags: sites.tags,
      groupId: sites.groupId,
      scanPriority: sites.scanPriority,
      scanIntervalMinutes: sites.scanIntervalMinutes,
      lastScanAt: sites.lastScanAt,
      createdAt: sites.createdAt,
      updatedAt: sites.updatedAt,
    })
    .from(sites)
    .where(and(eq(sites.id, siteId), eq(sites.ownerId, ownerId)))
    .limit(1);

  const site = siteRows[0];
  if (!site) return null;

  const sitemapRows = await db
    .select({
      id: sitemaps.id,
      url: sitemaps.url,
      isIndex: sitemaps.isIndex,
      lastStatus: sitemaps.lastStatus,
      lastEtag: sitemaps.lastEtag,
      lastModified: sitemaps.lastModified,
      discoveredAt: sitemaps.discoveredAt,
      updatedAt: sitemaps.updatedAt,
    })
    .from(sitemaps)
    .where(eq(sitemaps.siteId, siteId))
    .orderBy(desc(sitemaps.updatedAt));

  const urlCounts = await db
    .select({
      sitemapId: urls.sitemapId,
      total: sql<number>`count(*)`,
      active: sql<number>`sum(case when ${urls.status} = 'active' then 1 else 0 end)`,
      inactive: sql<number>`sum(case when ${urls.status} = 'inactive' then 1 else 0 end)`,
    })
    .from(urls)
    .where(eq(urls.siteId, siteId))
    .groupBy(urls.sitemapId);

  const countsMap = new Map(
    urlCounts.map((row) => [
      row.sitemapId,
      {
        total: Number(row.total ?? 0),
        active: Number(row.active ?? 0),
        inactive: Number(row.inactive ?? 0),
      },
    ]),
  );

  const recentScans = await db
    .select({
      id: scans.id,
      status: scans.status,
      totalSitemaps: scans.totalSitemaps,
      totalUrls: scans.totalUrls,
      added: scans.added,
      removed: scans.removed,
      updated: scans.updated,
      startedAt: scans.startedAt,
      finishedAt: scans.finishedAt,
      error: scans.error,
    })
    .from(scans)
    .where(eq(scans.siteId, siteId))
    .orderBy(desc(scans.startedAt))
    .limit(scansLimit);

  const recentChanges = await db
    .select({
      id: changes.id,
      type: changes.type,
      detail: changes.detail,
      source: changes.source,
      occurredAt: changes.occurredAt,
    })
    .from(changes)
    .where(eq(changes.siteId, siteId))
    .orderBy(desc(changes.occurredAt))
    .limit(changesLimit);

  const sitemapsWithCounts = sitemapRows.map((row) => {
    const counts = countsMap.get(row.id) ?? { total: 0, active: 0, inactive: 0 };
    return {
      ...row,
      urlCounts: counts,
    };
  });

  const summary = sitemapsWithCounts.reduce(
    (acc, item) => {
      acc.totalUrls += item.urlCounts.total;
      acc.activeUrls += item.urlCounts.active;
      acc.inactiveUrls += item.urlCounts.inactive;
      return acc;
    },
    { totalUrls: 0, activeUrls: 0, inactiveUrls: 0 },
  );

  const latestScan = recentScans[0];
  const activity = {
    added: Number(latestScan?.added ?? 0),
    removed: Number(latestScan?.removed ?? 0),
    updated: Number(latestScan?.updated ?? 0),
    total: Number(latestScan?.totalUrls ?? summary.totalUrls ?? 0),
  };

  return {
    site: {
      ...site,
      tags: safeParseTags(site.tags),
    },
    sitemaps: sitemapsWithCounts,
    summary: {
      ...summary,
      activity,
    },
    recentScans,
    recentChanges,
    notifications: await fetchNotificationChannels(site.id),
    groups: await fetchGroups(ownerId),
  };
}

function safeParseTags(value: string | null | undefined) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed))
      return parsed.filter((item) => typeof item === "string" && item.trim()).map((s) => s.trim());
  } catch {}
  return [] as string[];
}

async function fetchNotificationChannels(siteId: string) {
  const db = resolveDb() as any;
  const rows = await db
    .select({
      id: notificationChannels.id,
      type: notificationChannels.type,
      target: notificationChannels.target,
      createdAt: notificationChannels.createdAt,
    })
    .from(notificationChannels)
    .where(eq(notificationChannels.siteId, siteId));
  return rows;
}

async function fetchGroups(ownerId: string) {
  const db = resolveDb() as any;
  const rows = await db
    .select({
      id: siteGroups.id,
      name: siteGroups.name,
      description: siteGroups.description,
      color: siteGroups.color,
    })
    .from(siteGroups)
    .where(eq(siteGroups.ownerId, ownerId))
    .orderBy(desc(siteGroups.createdAt));
  return rows;
}

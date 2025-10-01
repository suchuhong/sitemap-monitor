import { XMLParser } from "fast-xml-parser";
import { resolveDb } from "@/lib/db";
import { sites, sitemaps, urls } from "@/lib/drizzle/schema";
import { and, eq } from "drizzle-orm";
import { fetchWithCompression } from "./net";
import { generateId } from "@/lib/utils/id";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

const MAX_SITEMAP_DISCOVERY = 500;
const MAX_INDEX_DEPTH = 5;

export async function discover({
  rootUrl,
  ownerId,
  tags,
}: {
  rootUrl: string;
  ownerId: string;
  tags?: string[];
}) {
  const db = resolveDb();
  const robotsUrl = new URL("/robots.txt", rootUrl).toString();
  const smCandidates = await gatherInitialSitemaps(rootUrl, robotsUrl);
  const discovered = await collectSitemaps(smCandidates);

  const existing = await db
    .select({ id: sites.id })
    .from(sites)
    .where(and(eq(sites.ownerId, ownerId), eq(sites.rootUrl, rootUrl)))
    .limit(1);

  const siteId = existing[0]?.id ?? generateId();

  const serializedTags = serializeTags(tags);

  await db.transaction(async (tx) => {
    if (!existing[0]) {
      await tx
        .insert(sites)
        .values({
          id: siteId,
          ownerId,
          rootUrl,
          robotsUrl,
          tags: serializedTags,
        });
    } else {
      await tx
        .update(sites)
        .set({
          robotsUrl,
          updatedAt: new Date(),
          ...(serializedTags !== null ? { tags: serializedTags } : {}),
        })
        .where(eq(sites.id, siteId));
    }

    const existingSitemaps = await tx
      .select({ url: sitemaps.url })
      .from(sitemaps)
      .where(eq(sitemaps.siteId, siteId));
    const known = new Set(existingSitemaps.map((r) => r.url));

    for (const item of discovered) {
      if (known.has(item.url)) continue;
      await tx.insert(sitemaps).values({
        id: generateId(),
        siteId,
        url: item.url,
        isIndex: item.isIndex,
        discoveredAt: new Date(),
      });
      known.add(item.url);
    }
  });

  return { id: siteId, rootUrl };
}

export async function rediscoverSite({
  siteId,
  ownerId,
  rootUrl,
  tags,
}: {
  siteId: string;
  ownerId: string;
  rootUrl: string;
  tags?: string[];
}) {
  const db = resolveDb();
  const robotsUrl = new URL("/robots.txt", rootUrl).toString();
  const smCandidates = await gatherInitialSitemaps(rootUrl, robotsUrl);
  const discovered = await collectSitemaps(smCandidates);

  await db.transaction(async (tx) => {
    const [existing] = await tx
      .select({ ownerId: sites.ownerId })
      .from(sites)
      .where(eq(sites.id, siteId))
      .limit(1);
    if (!existing || existing.ownerId !== ownerId) throw new Error("not found");

    const serializedTags = serializeTags(tags);

    await tx
      .update(sites)
      .set({
        rootUrl,
        robotsUrl,
        updatedAt: new Date(),
        ...(serializedTags !== null ? { tags: serializedTags } : {}),
      })
      .where(eq(sites.id, siteId));

    await tx.delete(urls).where(eq(urls.siteId, siteId));
    await tx.delete(sitemaps).where(eq(sitemaps.siteId, siteId));

    for (const item of discovered) {
      await tx.insert(sitemaps).values({
        id: generateId(),
        siteId,
        url: item.url,
        isIndex: item.isIndex,
        discoveredAt: new Date(),
      });
    }
  });

  return { id: siteId, rootUrl };
}

function serializeTags(input?: string[]) {
  if (!input) return null;
  const normalized = Array.from(
    new Set(input.map((tag) => tag.trim()).filter(Boolean)),
  );
  if (normalized.length === 0) return null;
  return JSON.stringify(normalized);
}

async function gatherInitialSitemaps(
  rootUrl: string,
  robotsUrl: string,
): Promise<string[]> {
  const candidates: Set<string> = new Set();
  try {
    const res = await fetchWithCompression(robotsUrl, { timeout: 8000 });
    if (res.ok) {
      const txt = await res.text();
      txt.split(/\r?\n/).forEach((line) => {
        const match = line.match(/^\s*Sitemap:\s*(\S+)/i);
        if (match) {
          const resolved = safeResolve(match[1].trim(), rootUrl);
          if (resolved) candidates.add(resolved);
        }
      });
    }
  } catch (err) {
    console.warn("robots discovery failed", robotsUrl, err);
  }

  if (candidates.size === 0) {
    ["/sitemap.xml", "/sitemap_index.xml"].forEach((path) => {
      const resolved = safeResolve(path, rootUrl);
      if (resolved) candidates.add(resolved);
    });
  }

  return Array.from(candidates);
}

async function collectSitemaps(initial: string[]): Promise<
  Array<{ url: string; isIndex: boolean }>
> {
  const queue: Array<{ url: string; depth: number }> = initial
    .filter((url) => isHttpUrl(url))
    .map((url) => ({ url, depth: 0 }));
  const visited = new Set<string>();
  const discovered = new Map<string, { url: string; isIndex: boolean }>();

  while (queue.length && discovered.size < MAX_SITEMAP_DISCOVERY) {
    const { url, depth } = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);

    let res: Response;
    try {
      res = await fetchWithCompression(url, { timeout: 10000 });
    } catch (err) {
      console.warn("sitemap fetch failed", url, err);
      continue;
    }
    if (!res.ok) continue;

    let xml: unknown;
    try {
      xml = xmlParser.parse(await res.text());
    } catch (err) {
      console.warn("sitemap parse failed", url, err);
      continue;
    }

    const sitemapIndex = isRecord(xml) ? xml.sitemapindex : undefined;
    const isIndex = Boolean(sitemapIndex);
    discovered.set(url, { url, isIndex });

    if (isIndex && depth < MAX_INDEX_DEPTH) {
      const nodes = extractIndexNodes(sitemapIndex);
      for (const node of nodes) {
        const loc = typeof node?.loc === "string" ? node.loc : undefined;
        const nextUrl = loc ? safeResolve(loc, url) : undefined;
        if (!nextUrl || visited.has(nextUrl) || discovered.has(nextUrl)) continue;
        if (!isHttpUrl(nextUrl)) continue;
        if (queue.length + discovered.size >= MAX_SITEMAP_DISCOVERY) break;
        queue.push({ url: nextUrl, depth: depth + 1 });
      }
    }
  }

  return Array.from(discovered.values());
}

function safeResolve(candidate: string, base: string) {
  try {
    return new URL(candidate, base).toString();
  } catch {
    return undefined;
  }
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function extractIndexNodes(value: unknown) {
  if (Array.isArray(value)) return value as Array<{ loc?: string }>;
  if (isRecord(value)) {
    const nodes = value.sitemap;
    if (Array.isArray(nodes)) return nodes as Array<{ loc?: string }>;
    if (nodes && typeof nodes === "object") return [nodes as { loc?: string }];
  }
  return [] as Array<{ loc?: string }>;
}

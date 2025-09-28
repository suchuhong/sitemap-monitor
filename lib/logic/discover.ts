import { XMLParser } from "fast-xml-parser";
import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { sites, sitemaps } from "@/lib/drizzle/schema";
import { fetchWithCompression } from "./net";

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});

export async function discover({
  rootUrl,
  ownerId,
}: {
  rootUrl: string;
  ownerId: string;
}) {
  const siteId = randomUUID();
  const robotsUrl = new URL("/robots.txt", rootUrl).toString();
  const smCandidates: string[] = [];
  const res = await fetchWithCompression(robotsUrl, { timeout: 8000 });

  if (res.ok) {
    const txt = await res.text();
    txt.split(/\r?\n/).forEach((l) => {
      const m = l.match(/^\s*Sitemap:\s*(\S+)/i);
      if (m) smCandidates.push(m[1].trim());
    });
  }
  if (smCandidates.length === 0) {
    smCandidates.push(new URL("/sitemap.xml", rootUrl).toString());
    smCandidates.push(new URL("/sitemap_index.xml", rootUrl).toString());
  }

  await db.insert(sites).values({ id: siteId, ownerId, rootUrl, robotsUrl });

  for (const sm of smCandidates) await addSitemapRecursive(siteId, sm);
  return { id: siteId, rootUrl };
}

async function addSitemapRecursive(siteId: string, smUrl: string) {
  const res = await fetchWithCompression(smUrl, { timeout: 10000 });
  if (!res.ok) return;
  const xml = xmlParser.parse(await res.text());
  await upsertSitemap(siteId, smUrl, !!xml.sitemapindex);
  if (xml.sitemapindex?.sitemap) {
    const list = Array.isArray(xml.sitemapindex.sitemap)
      ? xml.sitemapindex.sitemap
      : [xml.sitemapindex.sitemap];
    for (const item of list) await addSitemapRecursive(siteId, item.loc);
  }
}

async function upsertSitemap(siteId: string, url: string, isIndex: boolean) {
  try {
    await db
      .insert(sitemaps)
      .values({
        id: randomUUID(),
        siteId,
        url,
        isIndex,
        discoveredAt: new Date(),
      });
  } catch {}
}

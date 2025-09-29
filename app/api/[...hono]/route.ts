import { Hono } from "hono";
import { handle } from "hono/vercel";
import { z } from "zod";
import { discover, rediscoverSite } from "@/lib/logic/discover";
import { scanSite, cronScan } from "@/lib/logic/scan";
import { getSiteDetail } from "@/lib/logic/site-detail";
import { db } from "@/lib/db";
import { users, sites, changes, sitemaps, urls, scans, webhooks } from "@/lib/drizzle/schema";
import { desc, and, eq, gte, lte } from "drizzle-orm";
import type { SQL } from "drizzle-orm";

export const config = { runtime: "nodejs" };

const app = new Hono<{ Variables: { userId: string } }>().basePath("/api");

// naive auth stub
app.use("*", async (c, next) => {
  const userId = "demo-user";
  await db
    .insert(users)
    .values({ id: userId, email: `${userId}@example.com` })
    .onConflictDoNothing();
  c.set("userId", userId);
  await next();
});

app.post("/sites", async (c) => {
  const schema = z.object({
    rootUrl: z.string().url(),
    tags: z.array(z.string()).optional(),
  });
  const body = await c.req.json();
  const { rootUrl, tags } = schema.parse(body);
  const site = await discover({
    rootUrl,
    ownerId: c.get("userId"),
    tags: normalizeTagsList(tags),
  });
  return c.json(site, 201);
});

app.get("/sites", async (c) => {
  const ownerId = c.get("userId");
  const rows = await db
    .select({
      id: sites.id,
      rootUrl: sites.rootUrl,
      robotsUrl: sites.robotsUrl,
      enabled: sites.enabled,
      tags: sites.tags,
      createdAt: sites.createdAt,
      updatedAt: sites.updatedAt,
    })
    .from(sites)
    .where(eq(sites.ownerId, ownerId))
    .orderBy(desc(sites.createdAt));

  return c.json({
    sites: rows.map((row) => ({
      ...row,
      tags: safeParseTags(row.tags),
    })),
  });
});

app.patch("/sites/:id", async (c) => {
  const id = c.req.param("id");
  const ownerId = c.get("userId");
  const schema = z
    .object({
      rootUrl: z.string().url().optional(),
      enabled: z.boolean().optional(),
      tags: z.array(z.string()).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: "no updates provided",
    });
  const body = schema.parse(await c.req.json());
  const normalizedTags = normalizeTagsList(body.tags);

  const [existing] = await db
    .select({ ownerId: sites.ownerId })
    .from(sites)
    .where(eq(sites.id, id))
    .limit(1);
  if (!existing || existing.ownerId !== ownerId)
    return c.json({ error: "not found" }, 404);

  if (body.rootUrl) {
    try {
      await rediscoverSite({
        siteId: id,
        ownerId,
        rootUrl: body.rootUrl,
        tags: normalizedTags,
      });
    } catch (err) {
      if (err instanceof Error && err.message === "not found")
        return c.json({ error: "not found" }, 404);
      throw err;
    }
  }

  const updatePayload: Record<string, unknown> = {};
  if (body.enabled !== undefined) updatePayload.enabled = body.enabled;
  if (normalizedTags !== undefined)
    updatePayload.tags = normalizedTags.length ? JSON.stringify(normalizedTags) : null;
  if (Object.keys(updatePayload).length)
    await db
      .update(sites)
      .set({ ...updatePayload, updatedAt: new Date() })
      .where(eq(sites.id, id));

  const detail = await getSiteDetail({ siteId: id, ownerId });
  if (!detail) return c.json({ error: "not found" }, 404);
  return c.json(detail);
});

app.delete("/sites/:id", async (c) => {
  const id = c.req.param("id");
  const ownerId = c.get("userId") as string;
  const [existing] = await db
    .select({ ownerId: sites.ownerId })
    .from(sites)
    .where(eq(sites.id, id))
    .limit(1);
  if (!existing || existing.ownerId !== ownerId)
    return c.json({ error: "not found" }, 404);

  await db.transaction(async (tx) => {
    await tx.delete(changes).where(eq(changes.siteId, id));
    await tx.delete(scans).where(eq(scans.siteId, id));
    await tx.delete(urls).where(eq(urls.siteId, id));
    await tx.delete(sitemaps).where(eq(sitemaps.siteId, id));
    await tx.delete(webhooks).where(eq(webhooks.siteId, id));
    await tx.delete(sites).where(eq(sites.id, id));
  });

  return c.json({ ok: true });
});

function safeParseTags(value: string | null | undefined) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed))
      return parsed.filter((item) => typeof item === "string" && item.trim()).map((s) => s.trim());
  } catch {}
  return [] as string[];
}

function normalizeTagsList(tags?: string[]) {
  if (!tags) return undefined;
  const normalized = Array.from(new Set(tags.map((tag) => tag.trim()).filter(Boolean)));
  return normalized;
}

app.get("/sites/export.csv", async (c) => {
  const rows = await db
    .select({
      id: sites.id,
      rootUrl: sites.rootUrl,
      robotsUrl: sites.robotsUrl,
      createdAt: sites.createdAt,
    })
    .from(sites)
    .orderBy(desc(sites.createdAt));
  const csv = ["id,rootUrl,robotsUrl,createdAt"]
    .concat(
      rows.map((r) =>
        [r.id, r.rootUrl, r.robotsUrl ?? "", r.createdAt ?? ""]
          .map((v) => `"${String(v).replaceAll('"', '""')}"`)
          .join(","),
      ),
    )
    .join("\n");
  return c.body(csv, 200, {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": "attachment; filename=sites-export.csv",
  });
});

app.get("/sites/:id", async (c) => {
  const id = c.req.param("id");
  const ownerId = c.get("userId");

  const detail = await getSiteDetail({ siteId: id, ownerId });
  if (!detail) return c.json({ error: "not found" }, 404);

  return c.json(detail);
});

app.post("/sites/:id/scan", async (c) => {
  const id = c.req.param("id");
  const r = await scanSite(id);
  return c.json(r);
});

app.post("/cron/scan", async (c) => {
  const token = c.req.header("authorization");
  if (!token || token !== `Bearer ${process.env.CRON_TOKEN}`)
    return c.body("unauthorized", 401);
  const r = await cronScan();
  return c.json(r);
});

export const GET = handle(app);
export const POST = handle(app);
export const PATCH = handle(app);
export const DELETE = handle(app);

app.post("/sites/:id/webhooks", async (c) => {
  type WebhookBody = { targetUrl?: unknown; secret?: unknown };

  // Accept form or JSON
  let targetUrl = "";
  let secret = "";
  if (c.req.header("content-type")?.includes("application/json")) {
    const payload = (await c.req.json()) as WebhookBody;
    if (typeof payload.targetUrl === "string") targetUrl = payload.targetUrl;
    if (typeof payload.secret === "string") secret = payload.secret;
  } else {
    const form = (await c.req.parseBody()) as Record<string, unknown>;
    if (typeof form.targetUrl === "string") targetUrl = form.targetUrl;
    if (typeof form.secret === "string") secret = form.secret;
  }
  if (!targetUrl) return c.json({ error: "targetUrl required" }, 400);
  // Upsert webhook
  const { db } = await import("@/lib/db");
  const { webhooks } = await import("@/lib/drizzle/schema");
  const { randomUUID } = await import("crypto");
  await db
    .insert(webhooks)
    .values({ id: randomUUID(), siteId: c.req.param("id"), targetUrl, secret });
  return c.json({ ok: true });
});

app.post("/sites/:id/test-webhook", async (c) => {
  const { notifyChange } = await import("@/lib/logic/notify");
  await notifyChange(c.req.param("id"), {
    scanId: "test",
    added: 1,
    removed: 0,
    updated: 0,
    type: "test",
  });
  return c.json({ ok: true });
});

app.get("/sites/:id/changes.csv", async (c) => {
  const id = c.req.param("id");
  const url = new URL(c.req.url);
  const type = url.searchParams.get("type") || "";
  const from = url.searchParams.get("from") || "";
  const to = url.searchParams.get("to") || "";

  const filters = [eq(changes.siteId, id)];

  if (type) filters.push(eq(changes.type, type));

  const parseToUnixSeconds = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;
    return Math.floor(date.getTime() / 1000);
  };

  const fromTs = from ? parseToUnixSeconds(from) : undefined;
  if (typeof fromTs === "number") filters.push(gte(changes.occurredAt, new Date(fromTs * 1000)));

  const toTs = to ? parseToUnixSeconds(to) : undefined;
  if (typeof toTs === "number") filters.push(lte(changes.occurredAt, new Date(toTs * 1000)));

  const [firstFilter, ...restFilters] = filters;
  let whereClause: SQL | undefined = firstFilter;
  for (const condition of restFilters) whereClause = and(whereClause!, condition);

  const list = await db
    .select({
      type: changes.type,
      detail: changes.detail,
      occurredAt: changes.occurredAt,
    })
    .from(changes)
    .where(whereClause)
    .orderBy(desc(changes.occurredAt));

  const rows = [["type", "detail", "occurredAt"]].concat(
    list.map((r) => [
      r.type,
      r.detail ?? "",
      new Date(Number(r.occurredAt || 0) * 1000).toISOString(),
    ]),
  );
  const csv = rows
    .map((r) =>
      r
        .map((v) => {
          const s = String(v).replaceAll('"', '""');
          return `"${s}"`;
        })
        .join(","),
    )
    .join("\n");

  return c.body(csv, 200, {
    "content-type": "text/csv; charset=utf-8",
    "content-disposition": `attachment; filename="changes-${id}.csv"`,
  });
});

app.post("/sites/import", async (c) => {
  const form = (await c.req.parseBody()) as Record<string, unknown>;
  let csv = "";
  const csvField = form["csv"];
  if (typeof csvField === "string" && csvField.trim()) csv = csvField.trim();
  const maybeFile = form.file;
  if (maybeFile && typeof maybeFile === "object" && "text" in maybeFile) {
    const file = maybeFile as File;
    csv = await file.text();
  }
  if (!csv) return c.json({ error: "no csv provided" }, 400);
  const { discover } = await import("@/lib/logic/discover");
  const lines = csv
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter(Boolean);
  const results = [];
  for (const line of lines) {
    if (!/^https?:\/\//i.test(line)) continue;
    try {
      results.push(await discover({ rootUrl: line, ownerId: c.get("userId") }));
    } catch (e) {
      console.error("import fail", line, e);
    }
  }
  return c.json({ ok: true, imported: results.length });
});

import { Hono } from "hono";
import { handle } from "hono/vercel";
import { z } from "zod";
import { discover } from "@/lib/logic/discover";
import { scanSite, cronScan } from "@/lib/logic/scan";
import { db } from "@/lib/db";
import { users } from "@/lib/drizzle/schema";

export const config = { runtime: "nodejs" };

const app = new Hono().basePath("/api");

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
  const schema = z.object({ rootUrl: z.string().url() });
  const body = await c.req.json();
  const { rootUrl } = schema.parse(body);
  const site = await discover({ rootUrl, ownerId: c.get("userId") });
  return c.json(site, 201);
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

app.post("/sites/:id/webhooks", async (c) => {
  // Accept form or JSON
  let targetUrl = "",
    secret = "";
  if (c.req.header("content-type")?.includes("application/json")) {
    const b = (await c.req.json()) as any;
    targetUrl = b.targetUrl;
    secret = b.secret ?? "";
  } else {
    const form = await c.req.parseBody();
    targetUrl = String((form as any).targetUrl ?? "");
    secret = String((form as any).secret ?? "");
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

  const { db } = await import("@/lib/db");
  const { changes } = await import("@/lib/drizzle/schema");
  const { eq, and, gte, lte } = await import("drizzle-orm");

  let list = await db.select().from(changes).where(eq(changes.siteId, id));

  if (type) list = list.filter((c: any) => c.type === type);
  if (from) {
    const ts = Math.floor(new Date(from).getTime() / 1000);
    list = list.filter((c: any) => Number(c.occurredAt ?? 0) >= ts);
  }
  if (to) {
    const ts = Math.floor(new Date(to).getTime() / 1000);
    list = list.filter((c: any) => Number(c.occurredAt ?? 0) <= ts);
  }

  const rows = [["type", "detail", "occurredAt"]].concat(
    list.map((r: any) => [
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
  const form = await c.req.parseBody();
  let csv = "";
  if (typeof form["csv"] === "string" && form["csv"].trim())
    csv = String(form["csv"]).trim();
  if (
    (form as any).file &&
    typeof (form as any).file === "object" &&
    "name" in (form as any).file
  ) {
    const file = (form as any).file as File;
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

app.get("/sites/export.csv", async (c) => {
  const { db } = await import("@/lib/db");
  const rows = (await db.all(
    sql`SELECT id, root_url as rootUrl, robots_url as robotsUrl, created_at as createdAt FROM sites ORDER BY created_at DESC`,
  )) as any[];
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

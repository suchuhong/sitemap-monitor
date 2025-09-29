import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
});

export const sites = sqliteTable("sites", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  rootUrl: text("root_url").notNull(),
  robotsUrl: text("robots_url"),
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  tags: text("tags"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
});

export const sitemaps = sqliteTable("sitemaps", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  url: text("url").notNull(),
  isIndex: integer("is_index", { mode: "boolean" }).default(false),
  lastEtag: text("last_etag"),
  lastModified: text("last_modified"),
  lastStatus: integer("last_status"),
  discoveredAt: integer("discovered_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
  updatedAt: integer("updated_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
});

export const urls = sqliteTable("urls", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  sitemapId: text("sitemap_id")
    .notNull()
    .references(() => sitemaps.id),
  loc: text("loc").notNull(),
  lastmod: text("lastmod"),
  changefreq: text("changefreq"),
  priority: text("priority"),
  firstSeenAt: integer("first_seen_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
  status: text("status").default("active"),
});

export const scans = sqliteTable("scans", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  startedAt: integer("started_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  totalSitemaps: integer("total_sitemaps").default(0),
  totalUrls: integer("total_urls").default(0),
  added: integer("added").default(0),
  removed: integer("removed").default(0),
  status: text("status").default("running"),
  error: text("error"),
});

export const changes = sqliteTable("changes", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  urlId: text("url_id").references(() => urls.id),
  type: text("type").notNull(),
  detail: text("detail"),
  occurredAt: integer("occurred_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
});

export const webhooks = sqliteTable("webhooks", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  targetUrl: text("target_url").notNull(),
  secret: text("secret"),
  createdAt: integer("created_at", { mode: "timestamp" }).default(
    sql`(unixepoch())`,
  ),
});

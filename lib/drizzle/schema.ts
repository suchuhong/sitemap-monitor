import { pgTable, text, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const users = pgTable("sitemap_monitor_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const siteGroups = pgTable("sitemap_monitor_site_groups", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const sites = pgTable("sitemap_monitor_sites", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id")
    .notNull()
    .references(() => users.id),
  rootUrl: text("root_url").notNull(),
  robotsUrl: text("robots_url"),
  enabled: boolean("enabled").default(true),
  tags: text("tags"),
  groupId: text("group_id").references(() => siteGroups.id),
  scanPriority: integer("scan_priority").default(1),
  scanIntervalMinutes: integer("scan_interval_minutes").default(1440),
  lastScanAt: timestamp("last_scan_at"),
  createdAt: timestamp("created_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const sitemaps = pgTable("sitemap_monitor_sitemaps", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  url: text("url").notNull(),
  isIndex: boolean("is_index").default(false),
  lastEtag: text("last_etag"),
  lastModified: text("last_modified"),
  lastStatus: integer("last_status"),
  discoveredAt: timestamp("discovered_at").default(sql`now()`),
  updatedAt: timestamp("updated_at").default(sql`now()`),
});

export const urls = pgTable("sitemap_monitor_urls", {
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
  firstSeenAt: timestamp("first_seen_at").default(sql`now()`),
  lastSeenAt: timestamp("last_seen_at").default(sql`now()`),
  status: text("status").default("active"),
});

export const scans = pgTable("sitemap_monitor_scans", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  startedAt: timestamp("started_at").default(sql`now()`),
  finishedAt: timestamp("finished_at"),
  totalSitemaps: integer("total_sitemaps").default(0),
  totalUrls: integer("total_urls").default(0),
  added: integer("added").default(0),
  removed: integer("removed").default(0),
  updated: integer("updated").default(0),
  status: text("status").default("running"),
  error: text("error"),
});

export const changes = pgTable("sitemap_monitor_changes", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  scanId: text("scan_id").references(() => scans.id),
  urlId: text("url_id").references(() => urls.id),
  type: text("type").notNull(),
  detail: text("detail"),
  source: text("source"),
  assignee: text("assignee"),
  status: text("status").default("open"),
  occurredAt: timestamp("occurred_at").default(sql`now()`),
});

export const webhooks = pgTable("sitemap_monitor_webhooks", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  targetUrl: text("target_url").notNull(),
  secret: text("secret"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

export const notificationChannels = pgTable("sitemap_monitor_notification_channels", {
  id: text("id").primaryKey(),
  siteId: text("site_id")
    .notNull()
    .references(() => sites.id),
  type: text("type").notNull(),
  target: text("target").notNull(),
  secret: text("secret"),
  createdAt: timestamp("created_at").default(sql`now()`),
});

# Sitemap Monitor 详细功能说明文档

## 目录

- [项目概述](#项目概述)
- [核心功能模块](#核心功能模块)
- [Sitemap 解析机制详解](#sitemap-解析机制详解)
- [扫描与变更检测](#扫描与变更检测)
- [通知系统](#通知系统)
- [数据库架构](#数据库架构)
- [API 接口详解](#api-接口详解)
- [前端页面功能](#前端页面功能)
- [任务队列与调度](#任务队列与调度)
- [性能优化与最佳实践](#性能优化与最佳实践)

---

## 项目概述

Sitemap Monitor 是一个企业级的 sitemap 监控平台，基于 Next.js 15 构建，采用 App Router 架构。项目的核心价值在于：

- **自动化监控**：持续追踪网站 sitemap 的变化，及时发现新增、删除和更新的 URL
- **智能解析**：递归解析 sitemap index，自动发现所有子 sitemap
- **多渠道通知**：支持 Webhook、Email、Slack 等多种通知方式
- **数据分析**：提供趋势分析、变更归因、分组管理等运营工具
- **高性能**：采用队列机制、增量扫描、HTTP 缓存等优化策略

### 技术架构

- **前端框架**：Next.js 15.5 (React 18.3)
- **API 层**：Hono (轻量级 Web 框架)
- **数据库**：SQLite + Drizzle ORM
- **XML 解析**：fast-xml-parser
- **UI 组件**：Radix UI + Tailwind CSS
- **类型安全**：TypeScript + Zod 验证

---

## 核心功能模块

### 1. 站点管理


#### 功能特性

- **站点接入**：通过根 URL 自动发现 sitemap
- **批量导入**：支持 CSV 格式批量导入站点
- **标签管理**：为站点添加自定义标签，便于分类
- **分组管理**：将站点组织到不同的分组中
- **启用/禁用**：灵活控制站点的监控状态
- **扫描配置**：自定义扫描优先级和扫描间隔

#### 实现细节

站点管理的核心逻辑位于 `lib/logic/discover.ts`，主要包含两个关键函数：

**discover() 函数**：用于新站点接入
```typescript
export async function discover({
  rootUrl,
  ownerId,
  tags,
}: {
  rootUrl: string;
  ownerId: string;
  tags?: string[];
})
```

工作流程：
1. 从 `robots.txt` 提取 sitemap URL
2. 如果 robots.txt 中没有，尝试默认路径 `/sitemap.xml` 和 `/sitemap_index.xml`
3. 递归解析 sitemap index，收集所有子 sitemap
4. 将站点和 sitemap 信息写入数据库
5. 支持标签序列化存储

**rediscoverSite() 函数**：用于更新已有站点
- 重新发现 sitemap（当站点 URL 变更时）
- 清除旧的 URL 和 sitemap 数据
- 重新解析并存储新的 sitemap 结构

---

## Sitemap 解析机制详解

### 解析流程

Sitemap 解析是整个系统的核心功能，采用多层递归策略：


#### 第一步：初始 Sitemap 发现

函数：`gatherInitialSitemaps(rootUrl, robotsUrl)`

```typescript
async function gatherInitialSitemaps(
  rootUrl: string,
  robotsUrl: string,
): Promise<string[]>
```

**处理逻辑**：

1. **解析 robots.txt**
   - 发送 HTTP 请求获取 robots.txt 内容
   - 使用正则表达式 `/^\s*Sitemap:\s*(\S+)/i` 匹配 Sitemap 声明
   - 支持相对路径和绝对路径的 URL 解析
   - 超时时间：8 秒

2. **回退策略**
   - 如果 robots.txt 中没有找到 sitemap，尝试常见路径：
     - `/sitemap.xml`
     - `/sitemap_index.xml`

3. **URL 规范化**
   - 使用 `safeResolve()` 函数处理相对路径
   - 过滤非 HTTP/HTTPS 协议的 URL
   - 去重处理

#### 第二步：递归收集 Sitemap

函数：`collectSitemaps(initial)`

```typescript
async function collectSitemaps(initial: string[]): Promise<
  Array<{ url: string; isIndex: boolean }>
>
```

**核心特性**：

1. **广度优先遍历**
   - 使用队列（queue）管理待处理的 sitemap
   - 每个 sitemap 携带深度信息 `{ url, depth }`

2. **安全限制**
   - `MAX_SITEMAP_DISCOVERY = 500`：最多发现 500 个 sitemap
   - `MAX_INDEX_DEPTH = 5`：最大递归深度为 5 层
   - 防止无限循环和资源耗尽

3. **XML 解析**
   - 使用 `fast-xml-parser` 解析 XML 内容
   - 配置：`ignoreAttributes: false`，保留属性信息
   - 自动识别 sitemap index 和普通 sitemap

4. **Sitemap Index 处理**
   - 检测 `<sitemapindex>` 标签
   - 提取所有 `<sitemap><loc>` 节点
   - 将子 sitemap 加入队列继续处理


5. **去重机制**
   - 使用 `visited` Set 记录已访问的 URL
   - 使用 `discovered` Map 存储最终结果
   - 避免重复请求和解析

#### 第三步：数据持久化

解析完成后，系统会：

1. **检查现有站点**
   - 查询数据库中是否已存在该站点
   - 如果存在，更新站点信息
   - 如果不存在，创建新站点记录

2. **存储 Sitemap 信息**
   - 对比数据库中已有的 sitemap
   - 只插入新发现的 sitemap
   - 记录 sitemap 类型（index 或普通）
   - 记录发现时间 `discoveredAt`

3. **事务保证**
   - 使用数据库事务确保数据一致性
   - 站点和 sitemap 的创建/更新在同一事务中完成

### XML 解析细节

#### XMLParser 配置

```typescript
const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "",
});
```

- `ignoreAttributes: false`：保留 XML 属性（如 lastmod、priority）
- `attributeNamePrefix: ""`：不为属性添加前缀

#### 节点提取逻辑

**Sitemap Index 节点提取**：

```typescript
function extractIndexNodes(value: unknown) {
  if (Array.isArray(value)) return value;
  if (isRecord(value)) {
    const nodes = value.sitemap;
    if (Array.isArray(nodes)) return nodes;
    if (nodes && typeof nodes === "object") return [nodes];
  }
  return [];
}
```

处理三种情况：
1. 直接是数组（多个 sitemap）
2. 单个 sitemap 对象
3. 嵌套在 sitemap 属性中


**URL 节点提取**（在扫描阶段使用）：

```typescript
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
```

### 网络请求优化

#### fetchWithCompression 函数

位于 `lib/logic/net.ts`，提供以下特性：

```typescript
export async function fetchWithCompression(url: string, opts: FetchOptions = {})
```

**功能特性**：

1. **压缩支持**
   - 自动添加 `Accept-Encoding: gzip, deflate, br` 头
   - 支持 Brotli、Gzip、Deflate 压缩算法
   - 减少网络传输量

2. **超时控制**
   - 默认超时：10 秒
   - 可自定义超时时间
   - 使用 AbortController 实现超时中断

3. **User-Agent**
   - 设置标识：`SitemapMonitorBot/1.0`
   - 便于网站管理员识别爬虫

4. **重试机制**
   - `retry()` 函数支持自动重试
   - 默认重试 2 次
   - 指数退避策略：200ms、400ms

---

## 扫描与变更检测

### 扫描触发方式

系统支持三种扫描触发方式：


#### 1. 手动扫描

- **触发方式**：用户在站点详情页点击"立即扫描"按钮
- **API 端点**：`POST /api/sites/:id/scan`
- **实现函数**：`runScanNow(siteId)`
- **特点**：立即执行，不进入队列

#### 2. 定时扫描（Cron）

- **触发方式**：外部定时任务调用 API
- **API 端点**：`POST /api/cron/scan`
- **实现函数**：`cronScan()`
- **认证**：需要提供 `CRON_TOKEN`
- **特点**：批量扫描所有启用的站点

**Cron 扫描逻辑**：

```typescript
export async function cronScan()
```

工作流程：
1. 查询所有 `enabled = true` 的站点
2. 计算每个站点是否到期需要扫描
   - 基于 `scanIntervalMinutes`（默认 1440 分钟 = 24 小时）
   - 对比 `lastScanAt` 时间戳
3. 按优先级排序
   - 首先按 `scanPriority`（1-5，数字越大优先级越高）
   - 其次按 `lastScanAt`（越久未扫描越优先）
4. 将到期站点加入扫描队列
5. 返回扫描统计信息

#### 3. 队列扫描

- **触发方式**：通过 `enqueueScan()` 加入队列
- **实现函数**：`enqueueScan(siteId)`
- **特点**：异步执行，避免并发冲突

**队列机制**：

```typescript
const scanQueue: ScanJob[] = [];
let processing = false;

async function processQueue()
```

- 单线程处理，确保同一时间只有一个扫描任务运行
- 任务完成后自动处理下一个
- 失败任务会记录错误但不阻塞队列

### 扫描执行流程

核心函数：`executeScan({ scanId, siteId })`


#### 阶段 1：初始化

1. 创建扫描记录（`scans` 表）
2. 设置状态为 `running`
3. 记录开始时间 `startedAt`

#### 阶段 2：遍历 Sitemap

1. 查询站点的所有 sitemap
2. 逐个调用 `scanOneSitemap()` 处理
3. 累计统计信息：
   - `totalUrls`：总 URL 数量
   - `added`：新增 URL 数量
   - `removed`：删除 URL 数量
   - `updated`：更新 URL 数量

#### 阶段 3：单个 Sitemap 扫描

函数：`scanOneSitemap({ siteId, sitemap, scanId })`

**HTTP 缓存优化**：

```typescript
const headers: Record<string, string> = {};
if (sm.lastEtag) headers["If-None-Match"] = sm.lastEtag;
if (sm.lastModified) headers["If-Modified-Since"] = sm.lastModified;
```

- 使用 ETag 和 Last-Modified 实现条件请求
- 如果服务器返回 304 Not Modified，跳过解析
- 大幅减少不必要的数据传输和处理

**URL 对比算法**：

1. **解析当前 sitemap**
   - 提取所有 `<url>` 节点
   - 解析 `loc`、`lastmod`、`changefreq`、`priority` 字段
   - 构建 URL Map：`Map<loc, detail>`

2. **查询数据库中的现有 URL**
   - 查询该 sitemap 下的所有 URL 记录
   - 构建现有 URL Map

3. **三向对比**
   - **新增 URL**：在当前 sitemap 中但不在数据库中
   - **保留 URL**：同时存在于两者中
   - **删除 URL**：在数据库中但不在当前 sitemap 中


4. **变更检测**

对于保留的 URL，检测以下字段的变化：
- `lastmod`：最后修改时间
- `changefreq`：更新频率
- `priority`：优先级

如果任何字段发生变化：
- 更新 URL 记录
- 创建 `updated` 类型的变更记录
- 记录具体变化内容

5. **数据库更新**

```typescript
// 新增 URL
for (const detail of toAdd) {
  const urlId = generateId();
  await db.insert(urls).values({
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
  await db.insert(changes).values({
    id: generateId(),
    siteId,
    scanId,
    urlId,
    type: "added",
    detail: detail.loc,
    source: "scanner",
  });
}

// 删除 URL
for (const row of toRemove) {
  await db.update(urls)
    .set({ status: "inactive", lastSeenAt: now })
    .where(eq(urls.id, row.id));
  await db.insert(changes).values({
    id: generateId(),
    siteId,
    scanId,
    urlId: row.id,
    type: "removed",
    detail: row.loc,
    source: "scanner",
  });
}
```

注意：删除的 URL 不会物理删除，而是标记为 `inactive`

#### 阶段 4：完成扫描

1. 更新扫描记录
   - 设置状态：`success` 或 `failed`
   - 记录完成时间 `finishedAt`
   - 保存统计信息和错误信息

2. 更新站点记录
   - 更新 `lastScanAt` 时间戳
   - 更新 `updatedAt` 时间戳

3. 触发通知
   - 如果有变更（added/removed/updated > 0）
   - 调用 `notifyChange()` 发送通知


### 变更记录结构

每条变更记录包含以下信息：

```typescript
{
  id: string;           // 变更 ID
  siteId: string;       // 所属站点
  scanId: string;       // 触发扫描
  urlId: string;        // 关联 URL
  type: string;         // 类型：added/removed/updated
  detail: string;       // 详细信息
  source: string;       // 来源：scanner
  assignee?: string;    // 负责人（可选）
  status: string;       // 状态：open/closed
  occurredAt: Date;     // 发生时间
}
```

**变更类型说明**：

- **added**：新增 URL
  - `detail` 字段存储完整 URL
  
- **removed**：删除 URL
  - `detail` 字段存储完整 URL
  
- **updated**：URL 元数据更新
  - `detail` 格式：`{url} | lastmod {old} → {new}; changefreq {old} → {new}`
  - 示例：`https://example.com/page | lastmod 2024-01-01 → 2024-01-15; priority 0.5 → 0.8`

---

## 通知系统

### 通知渠道

系统支持三种通知渠道：

#### 1. Webhook 通知

**配置方式**：
- API：`POST /api/sites/:id/notifications`
- Body：`{ "type": "webhook", "target": "https://...", "secret": "..." }`

**通知格式**：

```json
{
  "type": "sitemap.change",
  "siteId": "uuid",
  "siteSlug": "https://example.com",
  "scanId": "uuid",
  "added": 5,
  "removed": 2,
  "updated": 3,
  "ts": 1704067200
}
```

**安全机制**：
- 使用 HMAC-SHA256 生成签名
- 签名放在 `X-Sitemap-Signature` 头中
- 接收方可验证请求真实性


**签名生成**：

```typescript
async function createHmacSignature(secret: string, data: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(data));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}
```

使用 Web Crypto API，兼容 Edge Runtime

#### 2. Email 通知

**配置方式**：
- API：`POST /api/sites/:id/notifications`
- Body：`{ "type": "email", "target": "user@example.com" }`

**环境变量**：
```env
EMAIL_SMTP_HOST=smtp.example.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=user@example.com
EMAIL_SMTP_PASS=password
EMAIL_FROM=noreply@example.com
```

**邮件内容**：
- 主题：`[Sitemap Monitor] 站点 {siteSlug} 有新的 sitemap 变更`
- 包含 HTML 和纯文本两种格式
- 显示扫描 ID、变更统计、时间戳

**注意**：Email 功能在 Edge Runtime 中被禁用，需要使用 Node.js Runtime

#### 3. Slack 通知

**配置方式**：
- API：`POST /api/sites/:id/notifications`
- Body：`{ "type": "slack", "target": "https://hooks.slack.com/...", "secret": "token" }`

**消息格式**：

```json
{
  "text": "站点 *example.com* 有新的 sitemap 变更：新增 5 / 删除 2 / 更新 3",
  "blocks": [
    {
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "站点 *example.com* 有新的 sitemap 变更：新增 5 / 删除 2 / 更新 3"
      }
    },
    {
      "type": "context",
      "elements": [
        {
          "type": "mrkdwn",
          "text": "扫描 ID: uuid · 时间: 2024-01-01 12:00:00"
        }
      ]
    }
  ]
}
```


### 通知触发逻辑

函数：`notifyChange(siteId, payload)`

**触发条件**：
- 扫描成功完成
- 存在变更（added > 0 或 removed > 0 或 updated > 0）

**执行流程**：

1. 查询站点信息（获取 rootUrl 作为 siteSlug）
2. 构建通知信封（envelope）
3. 加载该站点的所有通知渠道
4. 并发发送到所有渠道
5. 记录发送失败的错误日志

**容错机制**：
- 单个渠道失败不影响其他渠道
- 超时控制（Webhook/Slack 默认 8 秒）
- 错误日志记录便于排查

### 通知渠道管理

**查询渠道**：
- API：`GET /api/sites/:id/notifications`
- 返回该站点配置的所有通知渠道

**删除渠道**：
- API：`DELETE /api/sites/:id/notifications/:notificationId`

**测试通知**：
- API：`POST /api/sites/:id/test-webhook`
- 发送测试通知，验证配置是否正确

---

## 数据库架构

### 核心表结构

#### users 表

```typescript
{
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  createdAt: integer("created_at", { mode: "timestamp" })
}
```

用户表，存储用户基本信息

#### sites 表

```typescript
{
  id: text("id").primaryKey(),
  ownerId: text("owner_id").references(() => users.id),
  rootUrl: text("root_url").notNull(),
  robotsUrl: text("robots_url"),
  enabled: integer("enabled", { mode: "boolean" }).default(true),
  tags: text("tags"),                              // JSON 数组
  groupId: text("group_id").references(() => siteGroups.id),
  scanPriority: integer("scan_priority").default(1),
  scanIntervalMinutes: integer("scan_interval_minutes").default(1440),
  lastScanAt: integer("last_scan_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" })
}
```


站点表，核心业务实体

**字段说明**：
- `tags`：JSON 字符串，存储标签数组
- `scanPriority`：扫描优先级（1-5）
- `scanIntervalMinutes`：扫描间隔（分钟）
- `lastScanAt`：上次扫描时间，用于计算下次扫描

#### sitemaps 表

```typescript
{
  id: text("id").primaryKey(),
  siteId: text("site_id").references(() => sites.id),
  url: text("url").notNull(),
  isIndex: integer("is_index", { mode: "boolean" }).default(false),
  lastEtag: text("last_etag"),
  lastModified: text("last_modified"),
  lastStatus: integer("last_status"),
  discoveredAt: integer("discovered_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" })
}
```

Sitemap 表，存储站点的所有 sitemap

**字段说明**：
- `isIndex`：是否为 sitemap index
- `lastEtag`：HTTP ETag，用于缓存验证
- `lastModified`：HTTP Last-Modified，用于缓存验证
- `lastStatus`：上次请求的 HTTP 状态码

#### urls 表

```typescript
{
  id: text("id").primaryKey(),
  siteId: text("site_id").references(() => sites.id),
  sitemapId: text("sitemap_id").references(() => sitemaps.id),
  loc: text("loc").notNull(),
  lastmod: text("lastmod"),
  changefreq: text("changefreq"),
  priority: text("priority"),
  firstSeenAt: integer("first_seen_at", { mode: "timestamp" }),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
  status: text("status").default("active")
}
```

URL 表，存储 sitemap 中的所有 URL

**字段说明**：
- `loc`：URL 地址
- `lastmod`、`changefreq`、`priority`：sitemap 标准字段
- `firstSeenAt`：首次发现时间
- `lastSeenAt`：最后一次出现时间
- `status`：`active` 或 `inactive`


#### scans 表

```typescript
{
  id: text("id").primaryKey(),
  siteId: text("site_id").references(() => sites.id),
  startedAt: integer("started_at", { mode: "timestamp" }),
  finishedAt: integer("finished_at", { mode: "timestamp" }),
  totalSitemaps: integer("total_sitemaps").default(0),
  totalUrls: integer("total_urls").default(0),
  added: integer("added").default(0),
  removed: integer("removed").default(0),
  updated: integer("updated").default(0),
  status: text("status").default("running"),
  error: text("error")
}
```

扫描记录表，存储每次扫描的结果

**状态值**：
- `queued`：已加入队列
- `running`：正在执行
- `success`：成功完成
- `failed`：执行失败

#### changes 表

```typescript
{
  id: text("id").primaryKey(),
  siteId: text("site_id").references(() => sites.id),
  scanId: text("scan_id").references(() => scans.id),
  urlId: text("url_id").references(() => urls.id),
  type: text("type").notNull(),
  detail: text("detail"),
  source: text("source"),
  assignee: text("assignee"),
  status: text("status").default("open"),
  occurredAt: integer("occurred_at", { mode: "timestamp" })
}
```

变更记录表，存储所有 URL 变更

**类型值**：
- `added`：新增 URL
- `removed`：删除 URL
- `updated`：更新 URL 元数据

#### webhooks 表（遗留）

```typescript
{
  id: text("id").primaryKey(),
  siteId: text("site_id").references(() => sites.id),
  targetUrl: text("target_url").notNull(),
  secret: text("secret"),
  createdAt: integer("created_at", { mode: "timestamp" })
}
```

遗留的 webhook 配置表，新版本使用 `notification_channels` 表


#### notification_channels 表

```typescript
{
  id: text("id").primaryKey(),
  siteId: text("site_id").references(() => sites.id),
  type: text("type").notNull(),
  target: text("target").notNull(),
  secret: text("secret"),
  createdAt: integer("created_at", { mode: "timestamp" })
}
```

通知渠道表，统一管理所有类型的通知

**类型值**：
- `webhook`：Webhook 通知
- `email`：邮件通知
- `slack`：Slack 通知

#### siteGroups 表

```typescript
{
  id: text("id").primaryKey(),
  ownerId: text("owner_id").references(() => users.id),
  name: text("name").notNull(),
  description: text("description"),
  color: text("color"),
  createdAt: integer("created_at", { mode: "timestamp" }),
  updatedAt: integer("updated_at", { mode: "timestamp" })
}
```

站点分组表，用于组织和管理站点

### 数据关系

```
users (1) ─── (N) sites
sites (1) ─── (N) sitemaps
sites (1) ─── (N) urls
sites (1) ─── (N) scans
sites (1) ─── (N) changes
sites (1) ─── (N) notification_channels
sitemaps (1) ─── (N) urls
scans (1) ─── (N) changes
urls (1) ─── (N) changes
siteGroups (1) ─── (N) sites
```

### 索引策略

建议为以下字段创建索引以优化查询性能：

```sql
CREATE INDEX idx_sites_owner ON sites(ownerId);
CREATE INDEX idx_sites_enabled ON sites(enabled);
CREATE INDEX idx_sitemaps_site ON sitemaps(siteId);
CREATE INDEX idx_urls_site ON urls(siteId);
CREATE INDEX idx_urls_sitemap ON urls(sitemapId);
CREATE INDEX idx_urls_status ON urls(status);
CREATE INDEX idx_scans_site ON scans(siteId);
CREATE INDEX idx_changes_site ON changes(siteId);
CREATE INDEX idx_changes_scan ON changes(scanId);
CREATE INDEX idx_changes_occurred ON changes(occurredAt);
```

---

## API 接口详解

### 认证机制

除了 `/api/cron/scan` 外，所有 API 都需要认证：


**认证方式**：
- 使用 Cookie 中的 session ID
- Cookie 名称：由 `SESSION_COOKIE_NAME` 常量定义
- 中间件验证用户身份并注入 `userId` 到上下文

**中间件实现**：

```typescript
app.use("*", async (c, next) => {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  if (!sessionId) return c.json({ error: "unauthorized" }, 401);

  const db = resolveDb() as any;
  const userRows = await db
    .select()
    .from(users)
    .where(eq(users.id, sessionId))
    .limit(1);
  const user = userRows[0];

  if (!user) return c.json({ error: "unauthorized" }, 401);

  c.set("userId", user.id);
  c.set("userEmail", user.email);
  c.set("db", db);
  await next();
});
```

### 站点管理 API

#### POST /api/sites

创建新站点

**请求体**：
```json
{
  "rootUrl": "https://example.com",
  "tags": ["production", "blog"]
}
```

**响应**：
```json
{
  "id": "uuid",
  "rootUrl": "https://example.com"
}
```

**处理流程**：
1. 验证 URL 格式（Zod schema）
2. 调用 `discover()` 函数
3. 自动发现并存储 sitemap
4. 返回站点 ID

#### GET /api/sites

获取站点列表

**响应**：
```json
{
  "sites": [
    {
      "id": "uuid",
      "rootUrl": "https://example.com",
      "robotsUrl": "https://example.com/robots.txt",
      "enabled": true,
      "tags": ["production", "blog"],
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**特性**：
- 只返回当前用户的站点
- 按创建时间倒序排列
- 自动解析 tags JSON 字符串


#### GET /api/sites/:id

获取站点详情

**响应**：
```json
{
  "site": {
    "id": "uuid",
    "rootUrl": "https://example.com",
    "robotsUrl": "https://example.com/robots.txt",
    "enabled": true,
    "tags": ["production"]
  },
  "summary": {
    "totalUrls": 120,
    "activeUrls": 118,
    "inactiveUrls": 2
  },
  "sitemaps": [
    {
      "id": "uuid",
      "url": "https://example.com/sitemap.xml",
      "isIndex": false,
      "urlCounts": {
        "total": 120,
        "active": 118,
        "inactive": 2
      },
      "lastStatus": 200
    }
  ],
  "recentScans": [
    {
      "id": "uuid",
      "status": "success",
      "startedAt": "2024-01-01T00:00:00Z",
      "finishedAt": "2024-01-01T00:05:00Z",
      "totalUrls": 120,
      "added": 1,
      "removed": 0,
      "updated": 2
    }
  ],
  "recentChanges": [
    {
      "id": "uuid",
      "type": "added",
      "detail": "https://example.com/new-page",
      "occurredAt": "2024-01-01T00:05:00Z"
    }
  ]
}
```

**实现**：调用 `getSiteDetail()` 函数，聚合多表数据

#### PATCH /api/sites/:id

更新站点

**请求体**（所有字段可选）：
```json
{
  "rootUrl": "https://example.com",
  "enabled": true,
  "tags": ["production", "updated"],
  "scanPriority": 3,
  "scanIntervalMinutes": 720,
  "groupId": "group-uuid"
}
```

**特殊处理**：
- 如果更新 `rootUrl`，会触发 `rediscoverSite()`
- 如果更新 `groupId` 为 null，会移除分组关联
- 更新 `groupId` 时会验证分组是否存在且属于当前用户


#### DELETE /api/sites/:id

删除站点

**响应**：
```json
{
  "ok": true
}
```

**级联删除**：
使用事务删除以下关联数据：
1. changes（变更记录）
2. scans（扫描记录）
3. urls（URL 记录）
4. sitemaps（Sitemap 记录）
5. notification_channels（通知渠道）
6. webhooks（遗留 Webhook）
7. sites（站点本身）

#### POST /api/sites/:id/scan

手动触发扫描

**响应**：
```json
{
  "ok": true,
  "status": "queued",
  "scanId": "uuid"
}
```

**实现**：调用 `enqueueScan()` 将任务加入队列

### 导入导出 API

#### POST /api/sites/import

批量导入站点

**请求方式 1**：表单上传文件
```
Content-Type: multipart/form-data
file: [CSV 文件]
```

**请求方式 2**：直接提交 CSV 文本
```json
{
  "csv": "https://example1.com\nhttps://example2.com"
}
```

**CSV 格式**：
- 每行一个 URL
- 只读取第一列
- 自动忽略空行
- 自动过滤无效 URL

**响应**：
```json
{
  "ok": true,
  "imported": 4,
  "results": [
    {
      "rootUrl": "https://example1.com",
      "status": "success",
      "siteId": "uuid"
    },
    {
      "rootUrl": "invalid-url",
      "status": "skipped",
      "message": "URL 必须以 http 或 https 开头"
    }
  ]
}
```


#### GET /api/sites/export.csv

导出站点列表

**响应**：
```csv
"id","rootUrl","robotsUrl","createdAt"
"uuid1","https://example1.com","https://example1.com/robots.txt","2024-01-01T00:00:00Z"
"uuid2","https://example2.com","https://example2.com/robots.txt","2024-01-02T00:00:00Z"
```

**响应头**：
```
Content-Type: text/csv; charset=utf-8
Content-Disposition: attachment; filename=sites-export.csv
```

#### GET /api/sites/:id/changes.csv

导出变更记录

**查询参数**：
- `type`：过滤变更类型（added/removed/updated）
- `from`：开始日期（ISO 8601 格式）
- `to`：结束日期（ISO 8601 格式）

**示例**：
```
GET /api/sites/uuid/changes.csv?type=added&from=2024-01-01&to=2024-01-31
```

**响应**：
```csv
"type","detail","occurredAt"
"added","https://example.com/new-page","2024-01-15T10:30:00Z"
"removed","https://example.com/old-page","2024-01-20T14:20:00Z"
```

### 扫描与变更 API

#### GET /api/sites/:id/scan-diff

获取扫描差异报告

**查询参数**：
- `scanId`：扫描 ID（必需）

**响应**：
```json
{
  "scanId": "uuid",
  "summary": {
    "added": 5,
    "removed": 2,
    "updated": 3
  },
  "items": [
    {
      "type": "added",
      "detail": "https://example.com/new-page",
      "occurredAt": "2024-01-01T00:05:00Z"
    }
  ],
  "startedAt": "2024-01-01T00:00:00Z",
  "finishedAt": "2024-01-01T00:05:00Z"
}
```

**用途**：
- 查看单次扫描的详细变更
- 生成变更报告
- 审计和追踪


### 通知管理 API

#### GET /api/sites/:id/notifications

获取通知渠道列表

**响应**：
```json
{
  "channels": [
    {
      "id": "uuid",
      "type": "webhook",
      "target": "https://webhook.example.com",
      "secret": "***",
      "createdAt": "2024-01-01T00:00:00Z"
    },
    {
      "id": "uuid",
      "type": "email",
      "target": "admin@example.com",
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ]
}
```

#### POST /api/sites/:id/notifications

添加通知渠道

**请求体**：
```json
{
  "type": "webhook",
  "target": "https://webhook.example.com",
  "secret": "optional-secret"
}
```

**类型说明**：
- `webhook`：target 为 Webhook URL
- `email`：target 为邮箱地址
- `slack`：target 为 Slack Webhook URL

#### DELETE /api/sites/:id/notifications/:notificationId

删除通知渠道

**响应**：
```json
{
  "ok": true
}
```

#### POST /api/sites/:id/test-webhook

测试通知配置

**响应**：
```json
{
  "ok": true
}
```

**功能**：
- 发送测试通知到所有配置的渠道
- 验证配置是否正确
- 不需要等待实际扫描

### Cron API

#### POST /api/cron/scan

定时扫描任务

**认证方式**（三选一）：
1. Authorization 头：`Bearer {CRON_TOKEN}`
2. X-Cron-Token 头：`{CRON_TOKEN}`
3. 查询参数：`?token={CRON_TOKEN}`

**响应**：
```json
{
  "sitesChecked": 10,
  "queued": 5,
  "results": [
    {
      "siteId": "uuid",
      "scanId": "uuid",
      "status": "queued"
    }
  ]
}
```


**工作原理**：
1. 查询所有 `enabled = true` 的站点
2. 计算哪些站点需要扫描（基于 `scanIntervalMinutes` 和 `lastScanAt`）
3. 按优先级排序（`scanPriority` 和 `lastScanAt`）
4. 将到期站点加入扫描队列
5. 返回统计信息

**部署建议**：
- 使用 Vercel Cron Jobs
- 使用 GitHub Actions
- 使用外部 Cron 服务（如 cron-job.org）

---

## 前端页面功能

### 页面结构

```
/                       # 首页
/dashboard              # 仪表盘
/dashboard/tasks        # 任务监控
/sites                  # 站点列表
/sites/new              # 新建站点
/sites/import           # 批量导入
/sites/groups           # 分组管理
/sites/bulk             # 批量操作
/sites/:id              # 站点详情
/styleguide             # 样式指南
/blog                   # 博客
/faq                    # 常见问题
```

### Dashboard 页面

**路径**：`/dashboard`

**功能**：
- 显示关键指标（24 小时内）
  - 站点总数
  - 变更总数
  - 扫描失败率
  - 平均扫描耗时
- 变更趋势图（30 天）
- 扫描次数最多的站点 Top 5
- 快捷操作入口

**数据来源**：
- 直接查询数据库（服务端渲染）
- 使用 Drizzle ORM 聚合查询
- 计算时间范围：`Date.now() - 24 * 60 * 60 * 1000`

### 站点列表页面

**路径**：`/sites`

**功能**：
- 表格展示所有站点
- 排序功能（按创建时间、更新时间）
- 筛选功能（按标签、分组、状态）
- 搜索功能（按 URL）
- 批量操作（启用/禁用、删除、分配分组）
- 导入/导出按钮

**实现技术**：
- 使用 `@tanstack/react-table` 构建表格
- 客户端状态管理
- 分页支持


### 站点详情页面

**路径**：`/sites/:id`

**功能模块**：

1. **站点信息卡片**
   - 根 URL
   - Robots.txt URL
   - 启用状态
   - 标签
   - 分组
   - 扫描配置

2. **Sitemap 列表**
   - 显示所有 sitemap
   - 标记 sitemap index
   - 显示 URL 统计（总数、活跃、失效）
   - 显示最后状态码

3. **扫描记录**
   - 最近 10 次扫描
   - 显示状态、时间、统计
   - 点击查看详细差异

4. **变更时间线**
   - 最近 50 条变更
   - 按时间倒序
   - 显示类型、详情、时间
   - 支持筛选和导出

5. **操作按钮**
   - 立即扫描
   - 编辑站点
   - 删除站点
   - 配置通知

### 批量导入页面

**路径**：`/sites/import`

**功能**：
- 文本框粘贴 CSV
- 文件上传
- 实时验证
- 进度显示
- 结果反馈

**用户体验**：
- 拖拽上传支持
- 错误高亮
- 成功/失败统计
- 详细错误信息

### 任务监控页面

**路径**：`/dashboard/tasks`

**功能**：
- 显示所有扫描任务
- 状态筛选（queued/running/success/failed）
- 实时刷新
- 错误日志查看
- 重试失败任务

---

## 任务队列与调度

### 队列实现

**内存队列**：

```typescript
const scanQueue: ScanJob[] = [];
let processing = false;
```

**特点**：
- 简单轻量
- 单进程内有效
- 重启后丢失

**适用场景**：
- 开发环境
- 小规模部署
- Serverless 环境（每个请求独立）


### 调度策略

#### 优先级计算

```typescript
const dueSites = activeSites
  .filter((site) => site.isDue)
  .sort((a, b) => {
    // 1. 按 scanPriority 排序（高优先级优先）
    const priorityDiff = (b.scanPriority ?? 1) - (a.scanPriority ?? 1);
    if (priorityDiff !== 0) return priorityDiff;
    
    // 2. 按 lastScanAt 排序（越久未扫描越优先）
    const aLast = a.lastScanAt ? new Date(a.lastScanAt).getTime() : 0;
    const bLast = b.lastScanAt ? new Date(b.lastScanAt).getTime() : 0;
    return aLast - bLast;
  });
```

#### 扫描间隔计算

```typescript
const intervalMinutes = site.scanIntervalMinutes ?? 1440; // 默认 24 小时
const intervalMs = Math.max(intervalMinutes, 5) * 60 * 1000; // 最小 5 分钟
const last = site.lastScanAt ? new Date(site.lastScanAt).getTime() : 0;
const isDue = !last || (Date.now() - last >= intervalMs);
```

**配置建议**：
- 重要站点：`scanPriority = 5`，`scanIntervalMinutes = 60`（每小时）
- 普通站点：`scanPriority = 3`，`scanIntervalMinutes = 360`（每 6 小时）
- 低频站点：`scanPriority = 1`，`scanIntervalMinutes = 1440`（每天）

### 并发控制

**当前实现**：单线程串行处理

```typescript
async function processQueue() {
  if (processing) return; // 防止并发
  const job = scanQueue.shift();
  if (!job) return;
  
  processing = true;
  try {
    await executeScan(job);
  } finally {
    processing = false;
    if (scanQueue.length) void processQueue(); // 处理下一个
  }
}
```

**优化方向**：
- 使用 Redis 队列（Bull、BullMQ）
- 支持多 worker 并发
- 任务持久化
- 失败重试机制

---

## 性能优化与最佳实践

### HTTP 缓存优化

#### ETag 和 Last-Modified

```typescript
const headers: Record<string, string> = {};
if (sm.lastEtag) headers["If-None-Match"] = sm.lastEtag;
if (sm.lastModified) headers["If-Modified-Since"] = sm.lastModified;
```

**效果**：
- 服务器返回 304 时跳过解析
- 减少 90% 以上的数据传输
- 大幅降低 CPU 使用


#### 压缩支持

```typescript
headers: {
  "accept-encoding": "gzip, deflate, br"
}
```

**效果**：
- XML 文件压缩率通常达到 80-90%
- 显著减少网络传输时间

### 数据库优化

#### 批量操作

使用事务批量插入/更新：

```typescript
await db.transaction(async (tx) => {
  for (const item of items) {
    await tx.insert(table).values(item);
  }
});
```

#### 索引优化

为高频查询字段创建索引：
- `sites.ownerId`
- `sites.enabled`
- `urls.siteId`
- `changes.occurredAt`

#### 查询优化

使用 `limit()` 限制结果集：

```typescript
const recentScans = await db
  .select()
  .from(scans)
  .where(eq(scans.siteId, siteId))
  .orderBy(desc(scans.startedAt))
  .limit(10); // 只取最近 10 条
```

### 错误处理

#### 网络请求容错

```typescript
try {
  res = await retry(() => fetchWithCompression(url, { timeout: 12000 }), 2);
} catch (err) {
  console.warn("sitemap fetch failed", url, err);
  continue; // 继续处理其他 sitemap
}
```

#### 解析容错

```typescript
try {
  xml = xmlParser.parse(await res.text());
} catch (err) {
  console.warn("sitemap parse failed", url, err);
  continue;
}
```

**原则**：
- 单个 sitemap 失败不影响其他
- 记录详细错误日志
- 更新状态便于排查

### 安全最佳实践

#### 输入验证

使用 Zod 验证所有输入：

```typescript
const schema = z.object({
  rootUrl: z.string().url(),
  tags: z.array(z.string()).optional(),
});
const body = schema.parse(await c.req.json());
```


#### SQL 注入防护

使用 Drizzle ORM 参数化查询：

```typescript
// 安全 ✓
await db.select().from(sites).where(eq(sites.id, id));

// 危险 ✗
await db.execute(`SELECT * FROM sites WHERE id = '${id}'`);
```

#### XSS 防护

转义 HTML 输出：

```typescript
function escapeHtml(input: string) {
  return input
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
```

#### CSRF 防护

- 使用 SameSite Cookie
- 验证 Referer 头
- 使用 CSRF Token

#### 权限验证

每个 API 都验证资源所有权：

```typescript
const site = await db.select().from(sites).where(eq(sites.id, id)).limit(1);
if (!site || site.ownerId !== userId) {
  return c.json({ error: "not found" }, 404);
}
```

### 监控与日志

#### 结构化日志

```typescript
console.log("[Notify]", {
  type: "sitemap.change",
  siteId,
  added,
  removed,
  updated,
});
```

#### 错误追踪

```typescript
console.error("scan job failed", job.siteId, err instanceof Error ? err.stack : err);
```

#### 性能监控

记录扫描耗时：

```typescript
const startTime = Date.now();
await executeScan(job);
const duration = Date.now() - startTime;
console.log(`Scan completed in ${duration}ms`);
```

### 扩展性建议

#### 水平扩展

- 使用 Redis 替代内存队列
- 部署多个 worker 实例
- 使用负载均衡

#### 数据库扩展

- 迁移到 PostgreSQL（更好的并发性能）
- 实施读写分离
- 使用连接池

#### 缓存策略

- Redis 缓存站点配置
- CDN 缓存静态资源
- 浏览器缓存优化

---

## 总结

Sitemap Monitor 是一个功能完整、架构清晰的企业级监控平台。核心优势包括：


1. **智能解析**
   - 递归解析 sitemap index
   - 自动发现子 sitemap
   - 支持多层嵌套结构

2. **高效扫描**
   - HTTP 缓存优化（ETag、Last-Modified）
   - 增量变更检测
   - 压缩传输支持

3. **灵活通知**
   - 多渠道支持（Webhook、Email、Slack）
   - 签名验证保证安全
   - 可配置通知规则

4. **完善的数据模型**
   - 清晰的表结构设计
   - 完整的关联关系
   - 支持历史追溯

5. **优秀的用户体验**
   - 直观的仪表盘
   - 批量操作支持
   - 实时状态更新

6. **可扩展架构**
   - 模块化设计
   - 易于集成
   - 支持二次开发

### 适用场景

- **SEO 监控**：追踪网站内容变化，优化搜索引擎收录
- **内容管理**：监控 CMS 发布流程，确保内容正确上线
- **合规审计**：记录网站变更历史，满足合规要求
- **竞品分析**：监控竞争对手网站更新
- **API 监控**：追踪 API 文档变化

### 未来展望

参考 `docs/roadmap.md` 了解更多计划中的功能：

- 更强大的分析工具
- AI 驱动的异常检测
- 更多集成选项
- 性能优化
- 企业级功能

---

## 附录

### 相关文档

- [README.md](../README.md) - 项目概览和快速开始
- [PAGINATION_GUIDE.md](./PAGINATION_GUIDE.md) - 分页实现指南
- [DATA_TABLE_USAGE.md](./DATA_TABLE_USAGE.md) - 数据表格使用指南
- [SEO_OPTIMIZATION_GUIDE.md](./SEO_OPTIMIZATION_GUIDE.md) - SEO 优化指南
- [webhook-channel-guide.md](./webhook-channel-guide.md) - Webhook 配置指南
- [stage-one-guide.md](./stage-one-guide.md) - 阶段一功能指南
- [stage-two-guide.md](./stage-two-guide.md) - 阶段二功能指南
- [stage-three-guide.md](./stage-three-guide.md) - 阶段三功能指南
- [roadmap.md](./roadmap.md) - 产品路线图

### 技术栈文档

- [Next.js 文档](https://nextjs.org/docs)
- [Hono 文档](https://hono.dev/)
- [Drizzle ORM 文档](https://orm.drizzle.team/)
- [fast-xml-parser 文档](https://github.com/NaturalIntelligence/fast-xml-parser)
- [Radix UI 文档](https://www.radix-ui.com/)
- [Tailwind CSS 文档](https://tailwindcss.com/)

---

**文档版本**：1.0  
**最后更新**：2025-10-04  
**维护者**：Sitemap Monitor Team

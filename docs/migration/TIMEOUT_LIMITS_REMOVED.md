# Vercel 超时限制移除说明

## 📋 更改概述

本次更新移除了所有针对 Vercel 10 秒超时限制的优化，使系统能够处理更大规模的 sitemap 和更长时间的扫描任务。

## 🔄 主要更改

### 1. 网络请求超时时间调整

**之前**: 8 秒超时（为适应 Vercel 10 秒限制）
**现在**: 30 秒超时（支持大型 sitemap）

影响的文件：
- `lib/logic/scan.ts` - Sitemap 获取超时
- `lib/logic/discover.ts` - Robots.txt 获取超时
- `lib/logic/notify.ts` - Webhook 和 Slack 通知超时

```typescript
// 之前
fetchWithCompression(sm.url, { timeout: 8000, headers })

// 现在
fetchWithCompression(sm.url, { timeout: 30000, headers })
```

### 2. 移除自动清理超时扫描

**之前**: 每次 cron 运行时自动清理超过 15 分钟的扫描
**现在**: 仅在手动调用 `/api/cron/cleanup` 时清理

```typescript
// 之前：cronScan 函数开始时自动清理
const timeoutThreshold = new Date(now - 15 * 60 * 1000);
// ... 自动清理逻辑

// 现在：移除了自动清理，仅保留手动清理 API
```

### 3. 移除站点数量限制

**之前**: 默认每次扫描 3 个站点
**现在**: 默认扫描所有到期的站点，可选限制

```typescript
// 之前
export async function cronScan(maxSites = 3)

// 现在
export async function cronScan(maxSites?: number)
```

API 调用：
```bash
# 扫描所有到期站点
POST /api/cron/scan

# 可选：限制扫描数量
POST /api/cron/scan?max=5
```

### 4. 清理 API 增强

**之前**: 固定 15 分钟超时阈值
**现在**: 可配置超时阈值，默认 60 分钟

```bash
# 使用默认 60 分钟超时
POST /api/cron/cleanup?token=YOUR_TOKEN

# 自定义超时时间（例如 30 分钟）
POST /api/cron/cleanup?token=YOUR_TOKEN&timeout=30
```

## 📊 性能影响

### 优点

✅ **支持大型 Sitemap**: 可以处理包含数千个 URL 的 sitemap
✅ **更可靠**: 不会因为人为的超时限制而失败
✅ **更灵活**: 可以根据实际需求调整扫描策略
✅ **更完整**: 扫描任务可以完整执行，不会被中断

### 注意事项

⚠️ **不适用于 Vercel Serverless**: 如果部署在 Vercel 上，仍然受到平台限制
⚠️ **需要长时间运行环境**: 建议部署在支持长时间运行的环境（如 VPS、Docker、云服务器）
⚠️ **资源消耗**: 长时间运行的扫描会占用更多资源

## 🚀 推荐部署环境

### 适合的环境

1. **VPS / 云服务器**
   - AWS EC2
   - DigitalOcean Droplets
   - Linode
   - 阿里云 ECS
   - 腾讯云 CVM

2. **容器化部署**
   - Docker
   - Kubernetes
   - AWS ECS
   - Google Cloud Run (增加超时限制)

3. **PaaS 平台（需配置）**
   - Railway (支持长时间运行)
   - Render (支持后台任务)
   - Fly.io (支持长时间运行)

### 不推荐的环境

❌ **Vercel Hobby/Free 计划** - 10 秒限制
❌ **Vercel Pro 计划** - 60 秒限制（除非 sitemap 很小）
❌ **Netlify Functions** - 10 秒限制
❌ **Cloudflare Workers** - CPU 时间限制

## 🔧 配置建议

### 1. 环境变量

更新 `.env` 文件：

```env
# 网络请求超时（毫秒）
WEBHOOK_TIMEOUT_MS=30000
SLACK_TIMEOUT_MS=30000

# Cron 认证令牌
CRON_TOKEN=your-secure-token
```

### 2. Cron 任务配置

#### 选项 A: 扫描所有到期站点（推荐用于 VPS）

```bash
# 每小时扫描一次
0 * * * * curl -X POST "http://localhost:3000/api/cron/scan" \
  -H "x-cron-token: your-token"
```

#### 选项 B: 分批扫描（推荐用于资源受限环境）

```bash
# 每 10 分钟扫描 5 个站点
*/10 * * * * curl -X POST "http://localhost:3000/api/cron/scan?max=5" \
  -H "x-cron-token: your-token"
```

#### 选项 C: 定期清理（可选）

```bash
# 每天清理一次超过 2 小时的卡住扫描
0 2 * * * curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=120" \
  -H "x-cron-token: your-token"
```

### 3. 使用 PM2 管理（Node.js 环境）

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "sitemap-monitor" -- start

# 设置开机自启
pm2 startup
pm2 save

# 查看日志
pm2 logs sitemap-monitor
```

### 4. 使用 Docker 部署

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

```bash
# 构建镜像
docker build -t sitemap-monitor .

# 运行容器
docker run -d \
  --name sitemap-monitor \
  -p 3000:3000 \
  -e DATABASE_URL="your-database-url" \
  -e CRON_TOKEN="your-token" \
  sitemap-monitor
```

## 📈 监控建议

### 1. 监控扫描时间

在数据库中查询扫描耗时：

```sql
SELECT 
  id,
  site_id,
  status,
  started_at,
  finished_at,
  EXTRACT(EPOCH FROM (finished_at - started_at)) as duration_seconds
FROM sitemap_monitor_scans
WHERE finished_at IS NOT NULL
ORDER BY started_at DESC
LIMIT 20;
```

### 2. 识别慢速站点

```sql
SELECT 
  s.root_url,
  AVG(EXTRACT(EPOCH FROM (sc.finished_at - sc.started_at))) as avg_duration,
  COUNT(*) as scan_count
FROM sitemap_monitor_scans sc
JOIN sitemap_monitor_sites s ON sc.site_id = s.id
WHERE sc.finished_at IS NOT NULL
  AND sc.status = 'success'
GROUP BY s.root_url
ORDER BY avg_duration DESC
LIMIT 10;
```

### 3. 设置告警

对于超过预期时间的扫描，可以设置告警：

```bash
#!/bin/bash
# check-long-scans.sh

LONG_SCANS=$(psql $DATABASE_URL -t -c "
  SELECT COUNT(*)
  FROM sitemap_monitor_scans
  WHERE status = 'running'
    AND started_at < NOW() - INTERVAL '30 minutes';
")

if [ "$LONG_SCANS" -gt 0 ]; then
  echo "⚠️  Found $LONG_SCANS scans running over 30 minutes"
  # 发送告警通知
fi
```

## 🔄 回滚方案

如果需要恢复 Vercel 兼容模式，可以：

1. 恢复 8 秒超时：
```bash
git revert <commit-hash>
```

2. 或手动修改：
```typescript
// lib/logic/scan.ts
fetchWithCompression(sm.url, { timeout: 8000, headers })

// lib/logic/discover.ts
fetchWithCompression(robotsUrl, { timeout: 8000 })

// lib/logic/notify.ts
const timeoutMs = normalizeTimeout(process.env.WEBHOOK_TIMEOUT_MS, 8000);
```

3. 恢复自动清理和站点限制：
```typescript
export async function cronScan(maxSites = 3) {
  // 添加自动清理逻辑
  // 添加 .slice(0, maxSites)
}
```

## 📚 相关文档

- [部署指南](./DEPLOYMENT_GUIDE.md) - 详细的部署说明
- [性能优化](./PERFORMANCE_OPTIMIZATION.md) - 性能优化建议
- [故障排查](./STUCK_SCANS_TROUBLESHOOTING.md) - 问题排查指南

## ❓ 常见问题

### Q: 我还在使用 Vercel，这些更改会影响我吗？

A: 是的，如果你在 Vercel 上部署，扫描可能会因为超时而失败。建议：
- 使用 `?max=1` 参数限制每次扫描数量
- 或迁移到支持长时间运行的平台

### Q: 如何知道我的扫描需要多长时间？

A: 查看数据库中的历史扫描记录，或在日志中查看扫描耗时。

### Q: 30 秒超时够用吗？

A: 对于大多数 sitemap 够用。如果需要更长时间，可以修改代码中的超时值。

### Q: 如何处理超大型 sitemap？

A: 考虑：
1. 增加超时时间到 60 秒或更长
2. 优化数据库查询
3. 使用批量处理
4. 分批扫描 URL

## 🎯 总结

本次更新移除了 Vercel 超时限制，使系统更适合在长时间运行环境中部署。如果你需要在 Vercel 上部署，请使用 `?max=` 参数控制扫描数量，或考虑迁移到其他平台。

---

**更新时间**: 2025年10月5日
**版本**: 2.0.0

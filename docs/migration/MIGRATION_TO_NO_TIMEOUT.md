# 迁移到无超时限制版本

## 🎯 迁移目标

从 Vercel 优化版本迁移到无超时限制版本，以支持更大规模的 sitemap 扫描。

## 📋 迁移前检查清单

在开始迁移前，请确认：

- [ ] 你的部署环境支持长时间运行（非 Vercel Hobby/Free）
- [ ] 数据库连接稳定且支持长时间查询
- [ ] 已备份当前数据库
- [ ] 已了解新版本的变更内容

## 🔄 迁移步骤

### 1. 更新代码

```bash
# 拉取最新代码
git pull origin main

# 安装依赖（如有更新）
pnpm install
```

### 2. 更新环境变量

编辑 `.env` 文件，更新超时配置：

```env
# 之前（可选）
# WEBHOOK_TIMEOUT_MS=8000
# SLACK_TIMEOUT_MS=8000

# 现在（可选）
WEBHOOK_TIMEOUT_MS=30000
SLACK_TIMEOUT_MS=30000
```

### 3. 测试扫描功能

在生产环境部署前，先在测试环境验证：

```bash
# 启动开发服务器
pnpm dev

# 测试单个站点扫描
curl -X POST "http://localhost:3000/api/sites/{SITE_ID}/scan" \
  -H "Cookie: session=YOUR_SESSION"

# 观察扫描是否能正常完成
```

### 4. 更新 Cron 配置

#### 如果使用系统 Cron

编辑 crontab：

```bash
crontab -e
```

添加或更新：

```bash
# 每小时扫描所有到期站点
0 * * * * curl -X POST "http://your-domain.com/api/cron/scan" \
  -H "x-cron-token: YOUR_TOKEN" >> /var/log/sitemap-cron.log 2>&1

# 可选：每天清理超时扫描
0 2 * * * curl -X POST "http://your-domain.com/api/cron/cleanup?timeout=120" \
  -H "x-cron-token: YOUR_TOKEN" >> /var/log/sitemap-cleanup.log 2>&1
```

#### 如果使用 PM2

创建 `ecosystem.config.js`：

```javascript
module.exports = {
  apps: [{
    name: 'sitemap-monitor',
    script: 'npm',
    args: 'start',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }],
  
  // Cron 任务
  cron_restart: '0 * * * *' // 每小时重启（可选）
};
```

#### 如果仍在 Vercel 上

**重要**: 如果你仍在 Vercel 上部署，需要保留限制：

在 API 调用中添加 `max` 参数：

```json
{
  "crons": [{
    "path": "/api/cron/scan?max=1",
    "schedule": "*/10 * * * *"
  }]
}
```

### 5. 部署到生产环境

#### VPS / 云服务器

```bash
# SSH 到服务器
ssh user@your-server

# 拉取最新代码
cd /path/to/sitemap-monitor
git pull origin main

# 安装依赖
pnpm install

# 构建
pnpm build

# 重启服务
pm2 restart sitemap-monitor
# 或
systemctl restart sitemap-monitor
```

#### Docker

```bash
# 构建新镜像
docker build -t sitemap-monitor:latest .

# 停止旧容器
docker stop sitemap-monitor

# 删除旧容器
docker rm sitemap-monitor

# 启动新容器
docker run -d \
  --name sitemap-monitor \
  -p 3000:3000 \
  -e DATABASE_URL="$DATABASE_URL" \
  -e CRON_TOKEN="$CRON_TOKEN" \
  --restart unless-stopped \
  sitemap-monitor:latest
```

### 6. 验证迁移

#### 检查扫描功能

```bash
# 手动触发扫描
curl -X POST "http://your-domain.com/api/cron/scan" \
  -H "x-cron-token: YOUR_TOKEN"

# 查看响应
# 应该看到类似：
# {
#   "sitesChecked": 10,
#   "dueCount": 5,
#   "processed": 5,
#   "results": [...]
# }
```

#### 检查数据库

```sql
-- 查看最近的扫描
SELECT 
  id,
  site_id,
  status,
  started_at,
  finished_at,
  EXTRACT(EPOCH FROM (finished_at - started_at)) as duration_seconds
FROM sitemap_monitor_scans
ORDER BY started_at DESC
LIMIT 10;

-- 检查是否有卡住的扫描
SELECT COUNT(*)
FROM sitemap_monitor_scans
WHERE status = 'running'
  AND started_at < NOW() - INTERVAL '1 hour';
```

#### 检查日志

```bash
# PM2 日志
pm2 logs sitemap-monitor

# Docker 日志
docker logs -f sitemap-monitor

# 系统日志
tail -f /var/log/sitemap-cron.log
```

## 🔍 迁移后监控

### 1. 监控扫描时间

创建监控脚本 `scripts/monitor-scan-duration.sh`：

```bash
#!/bin/bash

# 查询平均扫描时间
AVG_DURATION=$(psql $DATABASE_URL -t -c "
  SELECT AVG(EXTRACT(EPOCH FROM (finished_at - started_at)))
  FROM sitemap_monitor_scans
  WHERE finished_at > NOW() - INTERVAL '24 hours'
    AND status = 'success';
")

echo "Average scan duration (24h): ${AVG_DURATION}s"

# 如果平均时间超过 60 秒，发送告警
if (( $(echo "$AVG_DURATION > 60" | bc -l) )); then
  echo "⚠️  Warning: Average scan duration exceeds 60 seconds"
  # 发送告警通知
fi
```

### 2. 监控失败率

```bash
#!/bin/bash

# 查询失败率
FAILURE_RATE=$(psql $DATABASE_URL -t -c "
  SELECT 
    ROUND(
      100.0 * COUNT(*) FILTER (WHERE status = 'failed') / COUNT(*),
      2
    ) as failure_rate
  FROM sitemap_monitor_scans
  WHERE started_at > NOW() - INTERVAL '24 hours';
")

echo "Scan failure rate (24h): ${FAILURE_RATE}%"

# 如果失败率超过 10%，发送告警
if (( $(echo "$FAILURE_RATE > 10" | bc -l) )); then
  echo "⚠️  Warning: Scan failure rate exceeds 10%"
fi
```

### 3. 设置 Grafana/Prometheus（可选）

如果使用监控系统，添加以下指标：

- 扫描成功率
- 平均扫描时间
- 正在运行的扫描数量
- 队列中的扫描数量

## ⚠️ 常见问题

### Q: 迁移后扫描失败率增加了

**可能原因**:
1. 某些 sitemap 确实需要更长时间
2. 网络问题
3. 数据库连接问题

**解决方案**:
```bash
# 查看失败的扫描
psql $DATABASE_URL -c "
  SELECT s.root_url, sc.error, sc.started_at
  FROM sitemap_monitor_scans sc
  JOIN sitemap_monitor_sites s ON sc.site_id = s.id
  WHERE sc.status = 'failed'
    AND sc.started_at > NOW() - INTERVAL '24 hours'
  ORDER BY sc.started_at DESC;
"

# 针对性优化或禁用问题站点
```

### Q: 有些扫描仍然卡住

**解决方案**:
```bash
# 手动清理（超过 2 小时的）
curl -X POST "http://your-domain.com/api/cron/cleanup?timeout=120" \
  -H "x-cron-token: YOUR_TOKEN"

# 设置定期清理 cron
echo "0 */2 * * * curl -X POST 'http://your-domain.com/api/cron/cleanup?timeout=120' -H 'x-cron-token: YOUR_TOKEN'" | crontab -
```

### Q: 扫描时间比预期长

**优化建议**:

1. **优化数据库查询**:
```sql
-- 添加索引（如果还没有）
CREATE INDEX IF NOT EXISTS idx_urls_sitemap_loc 
  ON sitemap_monitor_urls(sitemap_id, loc);
```

2. **增加数据库连接池**:
```typescript
// lib/db.ts
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // 增加连接数
});
```

3. **分批处理 URL**:
```typescript
// 在 scanOneSitemap 中
const BATCH_SIZE = 100;
for (let i = 0; i < toAdd.length; i += BATCH_SIZE) {
  const batch = toAdd.slice(i, i + BATCH_SIZE);
  await processBatch(batch);
}
```

### Q: 如何回滚到之前的版本

```bash
# 查看提交历史
git log --oneline

# 回滚到特定提交
git revert <commit-hash>

# 或者硬回滚（谨慎使用）
git reset --hard <commit-hash>

# 重新部署
pnpm build
pm2 restart sitemap-monitor
```

## 📊 性能对比

### 迁移前（Vercel 优化版）

- ✅ 适合 Vercel 部署
- ✅ 不会超时
- ❌ 每次只能扫描少量站点
- ❌ 大型 sitemap 可能失败
- ❌ 需要频繁的 cron 调用

### 迁移后（无限制版）

- ✅ 支持大型 sitemap
- ✅ 可以一次扫描所有站点
- ✅ 更完整的扫描结果
- ❌ 不适合 Vercel Hobby/Free
- ❌ 需要长时间运行环境

## 🎯 最佳实践

1. **逐步迁移**: 先在测试环境验证，再部署到生产
2. **监控指标**: 设置监控和告警
3. **定期清理**: 设置定期清理卡住的扫描
4. **优化数据库**: 确保有适当的索引
5. **备份数据**: 迁移前备份数据库
6. **文档记录**: 记录迁移过程和遇到的问题

## 📚 相关文档

- [超时限制移除说明](./TIMEOUT_LIMITS_REMOVED.md)
- [部署指南](./DEPLOYMENT_GUIDE.md)
- [故障排查](./STUCK_SCANS_TROUBLESHOOTING.md)

## ✅ 迁移完成检查清单

- [ ] 代码已更新到最新版本
- [ ] 环境变量已更新
- [ ] Cron 任务已配置
- [ ] 扫描功能测试通过
- [ ] 数据库查询正常
- [ ] 日志输出正常
- [ ] 监控已设置
- [ ] 团队已通知

---

**迁移完成！** 🎉

如有问题，请查看相关文档或提交 Issue。

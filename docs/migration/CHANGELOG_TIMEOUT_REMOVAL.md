# 更新日志 - 移除 Vercel 超时限制

## 版本 2.0.0 - 2025-10-05

### 🚀 重大更改

#### 移除 Vercel 超时限制

为了支持更大规模的 sitemap 扫描和更长时间的任务执行，我们移除了所有针对 Vercel 10 秒超时的优化限制。

### 📝 详细更改

#### 1. 网络请求超时调整

- **Sitemap 获取**: 8 秒 → 30 秒
- **Robots.txt 获取**: 8 秒 → 30 秒  
- **Webhook 通知**: 8 秒 → 30 秒
- **Slack 通知**: 8 秒 → 30 秒

**影响的文件**:
- `lib/logic/scan.ts`
- `lib/logic/discover.ts`
- `lib/logic/notify.ts`
- `.env.example`

#### 2. 移除自动清理机制

- **之前**: 每次 `cronScan` 运行时自动清理超过 15 分钟的扫描
- **现在**: 仅在手动调用 `/api/cron/cleanup` 时清理

**原因**: 在非 Vercel 环境中，扫描可能合理地运行超过 15 分钟

#### 3. 移除默认站点数量限制

- **之前**: `cronScan(maxSites = 3)` - 默认每次扫描 3 个站点
- **现在**: `cronScan(maxSites?: number)` - 默认扫描所有到期站点

**API 变更**:
```bash
# 扫描所有到期站点（新默认行为）
POST /api/cron/scan

# 可选：限制扫描数量（向后兼容）
POST /api/cron/scan?max=5
```

#### 4. 清理 API 增强

新增可配置的超时阈值：

```bash
# 默认 60 分钟超时
POST /api/cron/cleanup?token=YOUR_TOKEN

# 自定义超时（例如 30 分钟）
POST /api/cron/cleanup?token=YOUR_TOKEN&timeout=30
```

**响应示例**:
```json
{
  "ok": true,
  "cleaned": 2,
  "timeoutMinutes": 60,
  "message": "Cleaned up 2 stuck scans (timeout: 60 minutes)"
}
```

### ⚠️ 破坏性变更

#### 不再适用于 Vercel Hobby/Free 计划

如果你在 Vercel 上部署，需要：

1. **使用 `max` 参数限制扫描数量**:
   ```json
   {
     "crons": [{
       "path": "/api/cron/scan?max=1",
       "schedule": "*/10 * * * *"
     }]
   }
   ```

2. **或迁移到其他平台**:
   - VPS (AWS EC2, DigitalOcean, Linode)
   - Docker 容器
   - Railway, Render, Fly.io

#### 环境变量更新

建议更新 `.env` 文件：

```env
# 之前
# WEBHOOK_TIMEOUT_MS=8000
# SLACK_TIMEOUT_MS=8000

# 现在
WEBHOOK_TIMEOUT_MS=30000
SLACK_TIMEOUT_MS=30000
```

### ✨ 新功能

#### 1. 灵活的扫描策略

```bash
# 扫描所有到期站点
curl -X POST "http://localhost:3000/api/cron/scan" \
  -H "x-cron-token: YOUR_TOKEN"

# 限制扫描 10 个站点
curl -X POST "http://localhost:3000/api/cron/scan?max=10" \
  -H "x-cron-token: YOUR_TOKEN"
```

#### 2. 可配置的清理超时

```bash
# 清理超过 2 小时的扫描
curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=120" \
  -H "x-cron-token: YOUR_TOKEN"
```

### 📊 性能提升

- ✅ 支持包含数千个 URL 的大型 sitemap
- ✅ 扫描不会因人为超时限制而中断
- ✅ 更完整的扫描结果
- ✅ 更灵活的部署选项

### 🔧 迁移指南

详细的迁移步骤请参考：
- [超时限制移除说明](docs/TIMEOUT_LIMITS_REMOVED.md)
- [迁移指南](docs/MIGRATION_TO_NO_TIMEOUT.md)

### 📚 新增文档

- `docs/TIMEOUT_LIMITS_REMOVED.md` - 详细的更改说明
- `docs/MIGRATION_TO_NO_TIMEOUT.md` - 完整的迁移指南

### 🐛 Bug 修复

无

### 🔄 向后兼容性

- ✅ API 端点保持不变
- ✅ 数据库结构无变化
- ✅ 支持 `?max=` 参数（向后兼容）
- ⚠️ 默认行为改变（不再限制站点数量）

### 📝 升级步骤

1. 拉取最新代码
2. 更新环境变量（可选）
3. 更新 Cron 配置
4. 测试扫描功能
5. 部署到生产环境

详细步骤请参考 [迁移指南](docs/MIGRATION_TO_NO_TIMEOUT.md)。

### ⚡ 快速开始

```bash
# 更新代码
git pull origin main

# 安装依赖
pnpm install

# 更新环境变量
cp .env.example .env
# 编辑 .env 文件

# 测试
pnpm dev

# 构建
pnpm build

# 部署
pnpm start
```

### 🎯 推荐配置

#### VPS / 云服务器

```bash
# Cron 配置
0 * * * * curl -X POST "http://localhost:3000/api/cron/scan" \
  -H "x-cron-token: YOUR_TOKEN"

# 可选：定期清理
0 2 * * * curl -X POST "http://localhost:3000/api/cron/cleanup?timeout=120" \
  -H "x-cron-token: YOUR_TOKEN"
```

#### Vercel（如果仍在使用）

```json
{
  "crons": [{
    "path": "/api/cron/scan?max=1",
    "schedule": "*/10 * * * *"
  }]
}
```

### 🙏 致谢

感谢所有提供反馈和建议的用户！

### 📞 支持

如有问题，请：
1. 查看 [故障排查文档](docs/STUCK_SCANS_TROUBLESHOOTING.md)
2. 查看 [迁移指南](docs/MIGRATION_TO_NO_TIMEOUT.md)
3. 提交 GitHub Issue

---

**完整更改**: [查看 Git Diff](https://github.com/your-repo/compare/v1.0.0...v2.0.0)

**发布日期**: 2025年10月5日

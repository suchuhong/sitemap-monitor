# OpenNext.js Cloudflare 迁移指南

本项目已从 `@cloudflare/next-on-pages` 迁移到 `opennextjs-cloudflare`，以获得更好的 Next.js 兼容性。

## 主要变更

### 1. 依赖更新
- 移除：`@cloudflare/next-on-pages`
- 添加：`opennextjs-cloudflare`

### 2. 构建脚本更新
- 旧：`next-on-pages`
- 新：`opennext build`

### 3. 输出目录更新
- 旧：`.vercel/output/static`
- 新：`.open-next/dist`

### 4. 新增配置文件
- `opennext.config.ts` - OpenNext.js 配置
- `types/cloudflare.d.ts` - Cloudflare 类型定义
- `app/not-found.tsx` - 404 页面

## 部署步骤

### 1. 安装依赖
```bash
pnpm install
```

### 2. 创建 KV 命名空间
```bash
# 创建缓存 KV
wrangler kv:namespace create "CACHE_KV"
wrangler kv:namespace create "CACHE_KV" --preview

# 创建标签缓存 KV
wrangler kv:namespace create "TAG_CACHE_KV"
wrangler kv:namespace create "TAG_CACHE_KV" --preview

# 创建队列（可选）
wrangler queues create sitemap-monitor-queue
```

### 3. 更新 wrangler.toml
将创建的 KV 命名空间 ID 更新到 `wrangler.toml` 中：
```toml
[[kv_namespaces]]
binding = "CACHE_KV"
id = "your-actual-kv-id"
preview_id = "your-actual-preview-id"
```

### 4. 构建和部署
```bash
# 构建
pnpm run build

# 部署
pnpm run deploy

# 或使用脚本一键部署
./scripts/deploy.sh
```

## 优势

1. **更好的 Next.js 兼容性** - 支持更多 Next.js 功能
2. **改进的缓存机制** - 使用 Cloudflare KV 进行增量静态再生
3. **更好的性能** - 优化的边缘运行时
4. **简化的配置** - 更直观的配置选项

## 注意事项

1. 确保所有环境变量已正确配置
2. 更新 Cloudflare Pages 项目的构建命令为 `pnpm run build`
3. 输出目录设置为 `.open-next/dist`
4. 如果使用自定义域名，确保 DNS 设置正确

## 故障排除

如果遇到构建或部署问题：

1. 清理缓存：`rm -rf .next .open-next node_modules && pnpm install`
2. 检查 Node.js 版本：推荐使用 Node.js 18+
3. 确保 wrangler 已登录：`wrangler auth login`
4. 检查 Cloudflare 配额和权限
# 快速开始指南

## 🚀 5 分钟体验新功能

### 前置条件

- ✅ 项目已启动：`npm run dev`
- ✅ 数据库已配置
- ✅ 至少有一个站点

### 步骤 1：体验页面通知（最简单）

1. **访问站点详情页面**
   ```
   http://localhost:3000/sites/{你的站点ID}
   ```

2. **点击"手动扫描"按钮**
   - 会看到 "扫描已启动" 的提示

3. **等待 10-30 秒**
   - 系统自动监控扫描状态
   - 无需刷新页面

4. **查看通知**
   - 扫描完成后会自动弹出通知
   - 显示详细的扫描结果
   - 页面自动刷新

**效果**：
```
✅ 扫描完成
新增 5 / 删除 2 / 更新 3 · 耗时 12.5s
```

### 步骤 2：配置 Webhook 通知（推荐）

1. **启动 Webhook 接收器**
   ```bash
   node examples/webhook-receiver.js
   ```
   
   会看到：
   ```
   🚀 Webhook 接收器已启动
   📍 监听端口: 4000
   🔗 Webhook URL: http://localhost:4000/webhook
   ```

2. **配置通知渠道**
   ```bash
   curl -X POST "http://localhost:3000/api/sites/{站点ID}/notifications" \
     -H "Cookie: session={你的session}" \
     -H "Content-Type: application/json" \
     -d '{
       "type": "webhook",
       "target": "http://localhost:4000/webhook",
       "secret": "your-secret-key"
     }'
   ```

3. **触发扫描**
   - 在页面上点击 "手动扫描"
   - 或使用 API：
   ```bash
   curl -X POST "http://localhost:3000/api/sites/{站点ID}/scan" \
     -H "Cookie: session={你的session}"
   ```

4. **查看 Webhook 接收器**
   - 会看到详细的通知日志
   - 包含完整的扫描结果

**效果**：
```
📨 收到 Webhook 请求
🔐 签名验证: ✅ 通过
📋 通知类型: scan.complete
🌐 站点: https://example.com
📊 扫描完成通知
状态: ✅ 成功
统计信息:
  • 总 Sitemap 数: 3
  • 总 URL 数: 150
  • 新增: 5
  • 删除: 2
  • 更新: 3
  • 耗时: 12.50 秒
```

### 步骤 3：测试队列处理（可选）

1. **查看队列状态**
   ```bash
   # 连接数据库
   psql $DATABASE_URL
   
   # 查看排队中的任务
   SELECT id, site_id, status, started_at 
   FROM sitemap_monitor_scans 
   WHERE status IN ('queued', 'running')
   ORDER BY started_at DESC;
   ```

2. **手动处理队列**
   ```bash
   curl -X POST "http://localhost:3000/api/cron/process-queue?max=3" \
     -H "x-cron-token: your-cron-token"
   ```

3. **清理超时任务**
   ```bash
   curl -X POST "http://localhost:3000/api/cron/cleanup" \
     -H "x-cron-token: your-cron-token"
   ```

## 🎯 常见场景

### 场景 1：测试扫描成功通知

```bash
# 1. 确保站点 URL 正确
# 2. 触发扫描
# 3. 等待通知
# 4. 查看结果
```

### 场景 2：测试扫描失败通知

```bash
# 1. 修改站点 URL 为无效地址
curl -X PATCH "http://localhost:3000/api/sites/{站点ID}" \
  -H "Cookie: session={你的session}" \
  -H "Content-Type: application/json" \
  -d '{"rootUrl": "https://invalid-url-12345.com"}'

# 2. 触发扫描
# 3. 等待失败通知
# 4. 查看错误信息
```

### 场景 3：测试重复扫描保护

```bash
# 1. 触发第一次扫描
curl -X POST "http://localhost:3000/api/sites/{站点ID}/scan" \
  -H "Cookie: session={你的session}"

# 2. 立即再次触发
curl -X POST "http://localhost:3000/api/sites/{站点ID}/scan" \
  -H "Cookie: session={你的session}"

# 3. 会收到 "该站点已有扫描任务在执行中" 的提示
```

## 📝 获取 Session Cookie

### 方法 1：浏览器开发者工具

1. 打开浏览器开发者工具（F12）
2. 切换到 "Application" 或 "存储" 标签
3. 找到 Cookies
4. 复制 `session` 的值

### 方法 2：使用 curl 登录

```bash
# 登录并保存 cookie
curl -X POST "http://localhost:3000/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email": "your@email.com", "password": "your-password"}' \
  -c cookies.txt

# 使用保存的 cookie
curl -X POST "http://localhost:3000/api/sites/{站点ID}/scan" \
  -b cookies.txt
```

## 🔍 调试技巧

### 查看浏览器控制台

```javascript
// 打开控制台（F12），输入：

// 查看当前监控的扫描
console.log('Monitored scans:', window.__scanMonitor);

// 手动触发状态检查
window.dispatchEvent(new Event('check-scans'));
```

### 查看网络请求

1. 打开浏览器开发者工具（F12）
2. 切换到 "Network" 标签
3. 触发扫描
4. 观察 API 请求和响应

### 查看服务器日志

```bash
# 查看 Next.js 开发服务器日志
# 会显示：
# - 扫描触发日志
# - 通知发送日志
# - 错误信息
```

## ⚠️ 常见问题

### Q: 页面通知不显示？

**A: 检查以下几点：**
1. 确认 Toaster 在 layout.tsx 中已配置
2. 查看浏览器控制台是否有错误
3. 确认 sonner 包已安装：`npm list sonner`

### Q: Webhook 接收器收不到通知？

**A: 检查：**
1. Webhook 接收器是否正在运行
2. 通知渠道是否正确配置
3. 端口是否被占用（默认 4000）
4. 查看服务器日志中的错误信息

### Q: 扫描一直卡在 running 状态？

**A: 解决方法：**
```bash
# 清理超时任务
curl -X POST "http://localhost:3000/api/cron/cleanup" \
  -H "x-cron-token: your-cron-token"
```

## 📚 下一步

- 📖 阅读 [完整文档](docs/README.md)
- 🔧 配置 [生产环境](docs/QUEUE_OPTIMIZATION.md#生产环境)
- 🎨 自定义 [通知样式](docs/FRONTEND_NOTIFICATIONS.md#扩展功能)
- 🚀 部署到 [Vercel](https://vercel.com)

## 💡 提示

- 扫描耗时取决于 Sitemap 大小和网络速度
- 建议在测试环境先验证功能
- 生产环境记得设置 CRON_TOKEN
- 定期清理超时任务

## 🎉 享受新功能！

现在你已经成功体验了所有新功能：
- ✅ 可靠的队列系统
- ✅ 完整的通知功能
- ✅ 实时的页面反馈

如有问题，请查看详细文档或提交 Issue。

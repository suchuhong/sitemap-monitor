# 定时任务调度器使用指南

本项目集成了内置的定时任务调度器，可以自动执行 sitemap 扫描任务，无需依赖外部 cron 服务。

## 功能特性

- ✅ **内置高级调度器**: 基于 `node-cron`，支持秒级到周级的任意 Cron 表达式
- ✅ **灵活配置**: 支持环境变量配置扫描间隔与时区
- ✅ **Web 管理界面**: 可视化控制调度器启停与手动扫描
- ✅ **优雅关闭**: 支持进程信号触发的安全停止
- ✅ **自定义任务**: 可添加多条自定义计划任务

## 快速开始

### 1. 环境配置

在 `.env` 文件中添加以下配置：

```env
# 启用内置调度器
ENABLE_INTERNAL_SCHEDULER=true

# Cron 表达式
SCAN_CRON_SCHEDULE=*/5 * * * *

# 时区设置
SCHEDULER_TIMEZONE=Asia/Shanghai

# 启用每日汇总 (可选)
ENABLE_DAILY_SUMMARY=true

# 可选：显式关闭内置调度器
# SCHEDULER_TYPE=disabled
# DISABLE_INTERNAL_SCHEDULER=true
```

### 2. 启动应用

```bash
# 开发环境 - 带调度器启动
npm run dev:scheduler

# 生产环境 - 带调度器启动
npm run start:scheduler

# 或者使用普通启动方式 (需要设置环境变量)
ENABLE_INTERNAL_SCHEDULER=true npm run dev
```

### 3. 管理界面

访问 `/admin/scheduler` 页面来管理调度器：

- 查看调度器状态
- 启动/停止调度器
- 手动触发扫描
- 查看活跃任务列表

## 调度器机制

项目仅保留高级调度器实现，基于 `node-cron` 按照 Cron 表达式执行扫描：

- 默认每 5 分钟运行一次 `cronScan`
- 支持任意 Cron 表达式与时区设置
- 支持通过 API 或管理界面增删自定义任务
- 可在环境变量中设置 `SCHEDULER_TYPE=disabled` 或 `DISABLE_INTERNAL_SCHEDULER=true` 来禁用内置调度器

## Cron 表达式示例

```bash
# 每5分钟
*/5 * * * *

# 每小时的第0分钟
0 * * * *

# 每天上午9点
0 9 * * *

# 工作日上午9点
0 9 * * 1-5

# 每周一上午9点
0 9 * * 1

# 每月1号午夜
0 0 1 * *
```

## API 接口

### 查看调度器状态

```bash
GET /api/scheduler/status
```

### 启动调度器

```bash
POST /api/scheduler/start
```

### 停止调度器

```bash
POST /api/scheduler/stop
```

### 手动触发一次扫描

```bash
POST /api/scheduler/scan
```

### 添加自定义任务 (仅高级模式)

```bash
POST /api/scheduler/tasks
Content-Type: application/json

{
  "name": "custom-scan",
  "schedule": "0 */2 * * *",
  "action": "scan"
}
```

### 删除自定义任务

```bash
DELETE /api/scheduler/tasks/custom-scan
```

## 监控和日志

调度器会输出详细的日志信息：

```
🚀 Starting application with internal scheduler...
📅 Scheduler type: advanced
⏰ Scan schedule: */5 * * * *
🌍 Timezone: Asia/Shanghai
Starting advanced cron scheduler...
Running scheduled scans...
Queued 3 sites for scanning
```

## 故障排除

### 调度器未启动

1. 检查环境变量 `ENABLE_INTERNAL_SCHEDULER=true`
2. 确认未设置 `SCHEDULER_TYPE=disabled` 或 `DISABLE_INTERNAL_SCHEDULER=true`
3. 查看应用启动日志

### Cron 表达式无效

1. 验证 Cron 表达式格式
2. 使用在线 Cron 表达式验证工具
3. 检查时区设置

### 扫描任务不执行

1. 检查站点是否启用 (`enabled = true`)
2. 确认扫描间隔设置
3. 查看扫描队列状态

## 最佳实践

1. **生产环境**: 启用内置调度器并结合监控及时发现异常
2. **扫描频率**: 根据站点更新频率合理设置 Cron 与时区
3. **资源监控**: 关注内存与 CPU 使用情况
4. **日志管理**: 定期清理或集中存储调度日志
5. **备份策略**: 定期备份数据库

## 自动触发扫描全流程

1. **设置环境变量**
   - `ENABLE_INTERNAL_SCHEDULER=true`：允许服务启动时加载调度器
   - `SCAN_CRON_SCHEDULE` 与 `SCHEDULER_TIMEZONE`：控制扫描频率与执行时区
   - `SCHEDULER_TYPE=disabled` 或 `DISABLE_INTERNAL_SCHEDULER=true`：如需禁用内置调度器
   - `CRON_TOKEN`：当需从外部系统命中 `POST /api/cron/scan` 时提供鉴权

2. **启动服务**
   - 直接运行 `next dev`，不做额外处理，是否启动调度器完全取决于当前环境变量（例如 ENABLE_INTERNAL_SCHEDULER、SCHEDULER_TYPE）。
   - `pnpm run dev:scheduler` 会执行 scripts/start-with-scheduler.js：脚本在启动 Next.js 之前强制设置 ENABLE_INTERNAL_SCHEDULER=true，若未指定则默认 SCHEDULER_TYPE=advanced、SCAN_CRON_SCHEDULE=*/5 * * * *、SCHEDULER_TIMEZONE=Asia/Shanghai，确保调度器随开发服务器一起运行。
   - 开发环境：`npm run dev:scheduler`
   - 生产环境：`npm run start:scheduler`
   - 或者在任何启动命令前注入环境变量，例如 `ENABLE_INTERNAL_SCHEDULER=true npm run dev`

3. **验证调度状态**
   - 打开 `/admin/scheduler` 页面查看运行状态
   - 调用 `GET /api/scheduler/status`，确认 `isRunning=true`
   - 日志中应出现 `Running scheduled scans...`、`Queued X sites for scanning`

4. **检查站点配置**
   - 确保站点 `enabled=true`
   - 按需调整 `scanPriority` 和 `scanIntervalMinutes` 以控制扫描顺序和频率

5. **手动触发与外部回退**
   - 使用 `POST /api/sites/:id/scan` 为单站排队，验证扫描链路
   - 若需要暂停调度器，可调用 `POST /api/scheduler/stop`
   - 保持调度器关闭时，可依赖外部 Cron 周期性请求 `POST /api/cron/scan`（需 `Authorization: Bearer <CRON_TOKEN>`）

6. **常见排错清单**
   - 没有扫描记录：检查环境变量、站点 `enabled`、`scanIntervalMinutes` 是否过大
   - 外部触发返回 401：确认 `CRON_TOKEN` 配置一致
   - 队列堆积：查看日志是否出现网络或数据库错误，必要时调整扫描间隔

## 与外部 Cron 的对比

| 特性 | 内置调度器 | 外部 Cron |
|------|------------|-----------|
| 部署复杂度 | 低 | 中等 |
| 配置管理 | 集中化 | 分散 |
| 状态监控 | 内置 | 需要额外工具 |
| 扩展性 | 中等 | 高 |
| 资源占用 | 中等 | 低 |

选择建议：
- **小型项目**: 使用内置调度器
- **大型项目**: 考虑外部 Cron + 内置调度器混合方案
- **云部署**: 优先考虑云服务的定时触发器

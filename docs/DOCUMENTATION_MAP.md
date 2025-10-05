# 🗺️ 文档地图

这是一个可视化的文档导航地图，帮助你快速找到需要的文档。

## 🎯 我想...

### 🚀 开始使用
```
你在这里 → [快速入门](RECENT_UPDATES.md) → [快速开始](guides/QUICK_START.md) → [详细功能](guides/DETAILED_FUNCTIONALITY.md)
```

### 🔧 解决问题
```
遇到问题 → [故障排查目录](troubleshooting/)
           ├─ 扫描卡住？ → [快速修复](troubleshooting/QUICK_FIX_STUCK_SCAN.md)
           ├─ 扫描不工作？ → [诊断指南](troubleshooting/SCAN_NOT_WORKING_DIAGNOSIS.md)
           └─ 想了解原因？ → [根本原因分析](troubleshooting/SCAN_STUCK_ROOT_CAUSE.md)
```

### 🗄️ 数据库迁移
```
需要迁移 → [立即应用迁移](migration/APPLY_MIGRATIONS_NOW.md)
           ├─ 详细步骤 → [迁移指南](migration/DATABASE_MIGRATION_GUIDE.md)
           ├─ 成功案例 → [迁移成功](migration/MIGRATION_SUCCESS.md)
           └─ 技术细节 → [Last Hash 说明](migration/LAST_HASH_EXPLANATION.md)
```

### ⚡ 提升性能
```
性能优化 → [优化目录](optimization/)
           ├─ 系统性能 → [性能优化指南](optimization/PERFORMANCE_OPTIMIZATION.md)
           ├─ 扫描超时 → [超时优化](optimization/SCAN_TIMEOUT_OPTIMIZATION.md)
           └─ 效果对比 → [性能对比](optimization/PERFORMANCE_COMPARISON.md)
```

### 🎨 了解功能
```
功能特性 → [功能目录](features/)
           ├─ 通知功能 → [扫描通知](features/SCAN_NOTIFICATIONS.md)
           ├─ 警告功能 → [运行中警告](features/RUNNING_SCAN_ALERT_FEATURE.md)
           └─ 优化功能 → [队列优化](features/QUEUE_OPTIMIZATION.md)
```

### 🚢 部署上线
```
部署配置 → [Vercel 部署](guides/VERCEL_DEPLOYMENT_GUIDE.md)
           ├─ Webhook 配置 → [Webhook 指南](guides/webhook-channel-guide.md)
           └─ 环境变量 → [README.md](../README.md#环境变量配置)
```

## 📚 按角色导航

### 👤 新用户
```
入口
 ├─ 1️⃣ [项目介绍](../README.md)
 ├─ 2️⃣ [快速入门](RECENT_UPDATES.md) ⭐
 ├─ 3️⃣ [快速开始](guides/QUICK_START.md)
 └─ 4️⃣ [详细功能](guides/DETAILED_FUNCTIONALITY.md)
```

### 👨‍💻 开发者
```
技术文档
 ├─ 📋 [会话总结](SESSION_SUMMARY.md)
 ├─ 🏗️ [目录结构](STRUCTURE.md)
 ├─ 🔍 [根本原因分析](troubleshooting/SCAN_STUCK_ROOT_CAUSE.md)
 ├─ ⚡ [性能优化](optimization/PERFORMANCE_OPTIMIZATION.md)
 └─ 🗄️ [数据库迁移](migration/DATABASE_MIGRATION_GUIDE.md)
```

### 🔧 运维人员
```
运维文档
 ├─ 🚀 [部署指南](guides/VERCEL_DEPLOYMENT_GUIDE.md)
 ├─ 🗄️ [迁移指南](migration/APPLY_MIGRATIONS_NOW.md)
 ├─ 🔧 [故障排查](troubleshooting/)
 └─ ⚙️ [Cron 配置](optimization/CRON_CONFIGURATION.md)
```

### 📊 产品经理
```
产品文档
 ├─ 🎯 [功能说明](guides/DETAILED_FUNCTIONALITY.md)
 ├─ 🎨 [功能特性](features/)
 ├─ 📈 [改进总结](IMPROVEMENTS_SUMMARY.md)
 └─ 🗺️ [产品路线图](roadmap.md)
```

## 🔍 按问题类型导航

### 扫描相关问题
```
扫描问题
 ├─ 卡住不动
 │   ├─ [快速修复](troubleshooting/QUICK_FIX_STUCK_SCAN.md) ⚡
 │   ├─ [根本原因](troubleshooting/SCAN_STUCK_ROOT_CAUSE.md)
 │   └─ [完整修复](troubleshooting/SCAN_STUCK_FIX_COMPLETE.md)
 │
 ├─ 不工作
 │   ├─ [诊断指南](troubleshooting/SCAN_NOT_WORKING_DIAGNOSIS.md)
 │   ├─ [手动扫描调试](troubleshooting/DEBUG_MANUAL_SCAN.md)
 │   └─ [手动扫描修复](troubleshooting/MANUAL_SCAN_FIX.md)
 │
 └─ 超时问题
     ├─ [超时优化](optimization/SCAN_TIMEOUT_OPTIMIZATION.md)
     ├─ [超时限制移除](migration/TIMEOUT_LIMITS_REMOVED.md)
     └─ [超时移除总结](migration/TIMEOUT_REMOVAL_SUMMARY.md)
```

### 数据库相关问题
```
数据库问题
 ├─ 需要迁移
 │   ├─ [立即应用](migration/APPLY_MIGRATIONS_NOW.md) ⭐
 │   ├─ [迁移指南](migration/DATABASE_MIGRATION_GUIDE.md)
 │   └─ [PostgreSQL 迁移](migration/POSTGRESQL_MIGRATION_GUIDE.md)
 │
 ├─ 迁移状态
 │   ├─ [迁移成功](migration/MIGRATION_SUCCESS.md)
 │   ├─ [迁移完成](migration/MIGRATION_COMPLETE.md)
 │   └─ [迁移总结](migration/MIGRATION_SUMMARY.md)
 │
 └─ 技术细节
     ├─ [Last Hash 说明](migration/LAST_HASH_EXPLANATION.md)
     ├─ [数据迁移报告](migration/DATA_MIGRATION_REPORT.md)
     └─ [索引创建报告](migration/INDEX_CREATION_REPORT.md)
```

### 性能相关问题
```
性能问题
 ├─ 系统慢
 │   ├─ [性能优化](optimization/PERFORMANCE_OPTIMIZATION.md)
 │   ├─ [性能对比](optimization/PERFORMANCE_COMPARISON.md)
 │   └─ [扫描优化](optimization/SCAN_OPTIMIZATION_SUMMARY.md)
 │
 └─ 配置优化
     ├─ [Cron 配置](optimization/CRON_CONFIGURATION.md)
     └─ [Cron 扫描优化](optimization/CRON_SCAN_OPTIMIZATION.md)
```

### 配置相关问题
```
配置问题
 ├─ 部署配置
 │   ├─ [Vercel 部署](guides/VERCEL_DEPLOYMENT_GUIDE.md)
 │   └─ [环境变量](../README.md#环境变量配置)
 │
 ├─ 通知配置
 │   ├─ [Webhook 指南](guides/webhook-channel-guide.md)
 │   ├─ [扫描通知](features/SCAN_NOTIFICATIONS.md)
 │   └─ [前端通知](features/FRONTEND_NOTIFICATIONS.md)
 │
 └─ 定时任务
     ├─ [Cron 配置](optimization/CRON_CONFIGURATION.md)
     └─ [Cron 优化](optimization/CRON_SCAN_OPTIMIZATION.md)
```

## 📖 按主题导航

### 使用指南
```
guides/
 ├─ 入门
 │   ├─ [快速开始](guides/QUICK_START.md)
 │   └─ [详细功能](guides/DETAILED_FUNCTIONALITY.md)
 │
 ├─ 功能使用
 │   ├─ [数据表使用](guides/DATA_TABLE_USAGE.md)
 │   └─ [分页指南](guides/PAGINATION_GUIDE.md)
 │
 ├─ 部署配置
 │   ├─ [Vercel 部署](guides/VERCEL_DEPLOYMENT_GUIDE.md)
 │   └─ [Webhook 配置](guides/webhook-channel-guide.md)
 │
 └─ 阶段指南
     ├─ [阶段一](guides/stage-one-guide.md)
     ├─ [阶段二](guides/stage-two-guide.md)
     └─ [阶段三](guides/stage-three-guide.md)
```

### 故障排查
```
troubleshooting/
 ├─ 快速修复 ⚡
 │   ├─ [扫描卡住](troubleshooting/QUICK_FIX_STUCK_SCAN.md)
 │   └─ [运行中扫描](troubleshooting/QUICK_FIX_RUNNING_SCANS.md)
 │
 ├─ 诊断调试
 │   ├─ [扫描不工作](troubleshooting/SCAN_NOT_WORKING_DIAGNOSIS.md)
 │   ├─ [手动扫描调试](troubleshooting/DEBUG_MANUAL_SCAN.md)
 │   └─ [手动扫描修复](troubleshooting/MANUAL_SCAN_FIX.md)
 │
 └─ 技术分析
     ├─ [根本原因](troubleshooting/SCAN_STUCK_ROOT_CAUSE.md)
     ├─ [完整修复](troubleshooting/SCAN_STUCK_FIX_COMPLETE.md)
     └─ [状态修复](troubleshooting/SCAN_STATUS_FIX.md)
```

### 数据库迁移
```
migration/
 ├─ 迁移指南 ⭐
 │   ├─ [立即应用](migration/APPLY_MIGRATIONS_NOW.md)
 │   ├─ [迁移指南](migration/DATABASE_MIGRATION_GUIDE.md)
 │   └─ [PostgreSQL 迁移](migration/POSTGRESQL_MIGRATION_GUIDE.md)
 │
 ├─ 迁移记录
 │   ├─ [迁移成功](migration/MIGRATION_SUCCESS.md)
 │   ├─ [迁移完成](migration/MIGRATION_COMPLETE.md)
 │   └─ [迁移总结](migration/MIGRATION_SUMMARY.md)
 │
 ├─ 超时移除
 │   ├─ [超时限制移除](migration/TIMEOUT_LIMITS_REMOVED.md)
 │   ├─ [超时移除总结](migration/TIMEOUT_REMOVAL_SUMMARY.md)
 │   └─ [迁移到无超时](migration/MIGRATION_TO_NO_TIMEOUT.md)
 │
 └─ 技术说明
     ├─ [Last Hash 说明](migration/LAST_HASH_EXPLANATION.md)
     ├─ [数据迁移报告](migration/DATA_MIGRATION_REPORT.md)
     └─ [索引创建报告](migration/INDEX_CREATION_REPORT.md)
```

### 性能优化
```
optimization/
 ├─ 优化指南
 │   ├─ [性能优化](optimization/PERFORMANCE_OPTIMIZATION.md)
 │   └─ [扫描优化](optimization/SCAN_OPTIMIZATION_SUMMARY.md)
 │
 ├─ 性能分析
 │   ├─ [性能对比](optimization/PERFORMANCE_COMPARISON.md)
 │   └─ [扫描超时优化](optimization/SCAN_TIMEOUT_OPTIMIZATION.md)
 │
 └─ 配置优化
     ├─ [Cron 配置](optimization/CRON_CONFIGURATION.md)
     └─ [Cron 扫描优化](optimization/CRON_SCAN_OPTIMIZATION.md)
```

### 功能特性
```
features/
 ├─ 通知功能
 │   ├─ [扫描通知](features/SCAN_NOTIFICATIONS.md)
 │   └─ [前端通知](features/FRONTEND_NOTIFICATIONS.md)
 │
 ├─ 警告功能
 │   └─ [运行中警告](features/RUNNING_SCAN_ALERT_FEATURE.md)
 │
 └─ 优化功能
     ├─ [队列优化](features/QUEUE_OPTIMIZATION.md)
     ├─ [SEO 优化](features/SEO_OPTIMIZATION_GUIDE.md)
     └─ [样式优化](features/STYLE_OPTIMIZATION.md)
```

## 🎯 快速跳转

### 最常用文档 ⭐
1. [快速入门](RECENT_UPDATES.md)
2. [快速开始](guides/QUICK_START.md)
3. [扫描卡住修复](troubleshooting/QUICK_FIX_STUCK_SCAN.md)
4. [立即应用迁移](migration/APPLY_MIGRATIONS_NOW.md)
5. [详细功能说明](guides/DETAILED_FUNCTIONALITY.md)

### 核心文档 📚
- [文档中心首页](README.md)
- [完整会话总结](SESSION_SUMMARY.md)
- [文档索引](DOCUMENTATION_INDEX.md)
- [目录结构](STRUCTURE.md)
- [项目 README](../README.md)

### 技术文档 🔧
- [根本原因分析](troubleshooting/SCAN_STUCK_ROOT_CAUSE.md)
- [性能优化指南](optimization/PERFORMANCE_OPTIMIZATION.md)
- [数据库迁移指南](migration/DATABASE_MIGRATION_GUIDE.md)
- [索引创建报告](migration/INDEX_CREATION_REPORT.md)

## 💡 使用提示

### 如何使用这个地图？

1. **按需求查找** - 使用"我想..."部分
2. **按角色查找** - 根据你的角色选择路径
3. **按问题查找** - 根据遇到的问题类型
4. **按主题浏览** - 系统地浏览某个分类

### 找不到需要的文档？

1. 查看 [文档索引](DOCUMENTATION_INDEX.md)
2. 查看 [目录结构](STRUCTURE.md)
3. 使用搜索功能
4. 查看 [文档中心首页](README.md)

### 文档阅读建议

- 🌟 标记的是推荐优先阅读的文档
- ⚡ 标记的是快速解决方案
- 📚 标记的是详细技术文档
- 🎯 标记的是核心功能文档

---

**提示**: 这个地图会随着文档的更新而更新。建议收藏本页面以便快速访问！

**最后更新**: 2025-10-05

# 扫描状态筛选修复

## 问题描述

扫描记录页面的状态筛选不正确，原因是前端筛选器的状态值与数据库中的实际状态值不匹配。

### 问题根源

**前端筛选器选项**：
- `success` - 成功
- `error` - 失败
- `warning` - 警告
- `pending` - 进行中

**数据库实际状态**：
- `success` - 成功
- `failed` - 失败（不是 `error`）
- `running` - 运行中（不是 `pending`）
- `queued` - 排队中（筛选器中缺失）

### 影响

1. 选择"失败"筛选时，查询 `status = 'error'`，但数据库中是 `'failed'`，导致查不到数据
2. 选择"进行中"筛选时，查询 `status = 'pending'`，但数据库中是 `'running'`，导致查不到数据
3. 缺少"排队中"状态的筛选选项

## 解决方案

### 1. 更新状态映射逻辑

在 `app/scans/page.tsx` 中添加状态映射：

```typescript
// 映射前端状态到数据库状态
let dbStatus: string | undefined;
switch (status) {
    case "success":
        dbStatus = "success";
        break;
    case "error":
        dbStatus = "failed";  // ✅ 映射到 failed
        break;
    case "pending":
        dbStatus = "running";  // ✅ 映射到 running
        break;
    case "queued":
        dbStatus = "queued";   // ✅ 新增 queued
        break;
}
```

### 2. 更新筛选器选项

在 `app/scans/_components/scans-filters.tsx` 中：

```typescript
<select>
    <option value="">全部状态</option>
    <option value="success">成功</option>
    <option value="error">失败</option>
    <option value="pending">运行中</option>  {/* ✅ 更新文案 */}
    <option value="queued">排队中</option>   {/* ✅ 新增选项 */}
</select>
```

### 3. 更新统计卡片

将 4 个卡片改为：
- 成功（success）
- 失败（failed）
- 运行中（running）
- 排队中（queued）✅ 新增

### 4. 更新表格显示

在 `app/scans/_components/scans-table.tsx` 中：

```typescript
<StatusIndicator status={statusMap[scan.status]}>
    {scan.status === "success" && "成功"}
    {scan.status === "error" && "失败"}
    {scan.status === "warning" && "排队中"}  {/* ✅ 使用 warning 表示排队 */}
    {scan.status === "pending" && "运行中"}  {/* ✅ 更新文案 */}
</StatusIndicator>
```

## 状态对照表

### 数据库状态 → 前端显示

| 数据库状态 | 前端状态 | 显示文本 | 颜色 |
|-----------|---------|---------|------|
| `success` | `success` | 成功 | 绿色 |
| `failed` | `error` | 失败 | 红色 |
| `running` | `pending` | 运行中 | 蓝色 |
| `queued` | `warning` | 排队中 | 黄色 |

### 筛选器映射

| 筛选器值 | 数据库查询 | 说明 |
|---------|-----------|------|
| `success` | `status = 'success'` | 成功的扫描 |
| `error` | `status = 'failed'` | 失败的扫描 |
| `pending` | `status = 'running'` | 正在运行的扫描 |
| `queued` | `status = 'queued'` | 排队中的扫描 |
| (空) | 无条件 | 显示所有状态 |

## 测试方法

### 1. 测试筛选功能

```bash
# 访问扫描记录页面
open http://localhost:3000/scans

# 测试各个筛选选项：
# 1. 选择"成功" - 应该显示 status='success' 的记录
# 2. 选择"失败" - 应该显示 status='failed' 的记录
# 3. 选择"运行中" - 应该显示 status='running' 的记录
# 4. 选择"排队中" - 应该显示 status='queued' 的记录
# 5. 选择"全部状态" - 应该显示所有记录
```

### 2. 验证数据库状态

```sql
-- 查看所有状态及其数量
SELECT status, COUNT(*) as count
FROM sitemap_monitor_scans
GROUP BY status
ORDER BY count DESC;

-- 应该看到：
-- success  | 100
-- failed   | 20
-- running  | 3
-- queued   | 5
```

### 3. 测试统计卡片

统计卡片应该正确显示各状态的数量：
- 成功：显示 `status='success'` 的数量
- 失败：显示 `status='failed'` 的数量
- 运行中：显示 `status='running'` 的数量
- 排队中：显示 `status='queued'` 的数量

## 相关文件

- `app/scans/page.tsx` - 主页面和数据查询
- `app/scans/_components/scans-filters.tsx` - 筛选器组件
- `app/scans/_components/scans-table.tsx` - 表格组件
- `lib/drizzle/schema.ts` - 数据库 schema

## 注意事项

1. **状态一致性**：确保前端和后端使用相同的状态值
2. **新增状态**：如果将来添加新状态，需要同时更新：
   - 数据库 schema
   - 筛选器选项
   - 状态映射逻辑
   - 统计卡片
   - 表格显示

3. **向后兼容**：如果数据库中有旧的状态值，需要考虑迁移或兼容处理

## 未来改进

### 1. 使用枚举类型

创建一个共享的状态枚举：

```typescript
// lib/types/scan-status.ts
export enum ScanStatus {
  SUCCESS = "success",
  FAILED = "failed",
  RUNNING = "running",
  QUEUED = "queued",
}

export const ScanStatusLabels = {
  [ScanStatus.SUCCESS]: "成功",
  [ScanStatus.FAILED]: "失败",
  [ScanStatus.RUNNING]: "运行中",
  [ScanStatus.QUEUED]: "排队中",
};
```

### 2. 统一状态管理

创建一个状态管理工具：

```typescript
// lib/utils/scan-status.ts
export function mapFrontendToDbStatus(frontendStatus: string): string {
  const mapping: Record<string, string> = {
    success: "success",
    error: "failed",
    pending: "running",
    queued: "queued",
  };
  return mapping[frontendStatus] || frontendStatus;
}

export function mapDbToFrontendStatus(dbStatus: string): string {
  const mapping: Record<string, string> = {
    success: "success",
    failed: "error",
    running: "pending",
    queued: "warning",
  };
  return mapping[dbStatus] || "warning";
}
```

### 3. 添加状态转换图

```
queued → running → success
                 ↘ failed
```

## 总结

通过添加状态映射逻辑和更新筛选器选项，现在扫描记录页面的状态筛选功能可以正常工作了。

**修复内容**：
- ✅ 添加前端到数据库的状态映射
- ✅ 更新筛选器选项（添加"排队中"）
- ✅ 更新统计卡片（4 个状态）
- ✅ 更新表格显示文案
- ✅ 确保状态一致性

**测试结果**：
- ✅ 筛选"成功"可以正确显示
- ✅ 筛选"失败"可以正确显示
- ✅ 筛选"运行中"可以正确显示
- ✅ 筛选"排队中"可以正确显示
- ✅ 统计卡片数量正确

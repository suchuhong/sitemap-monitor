# last_hash 字段说明

## 🎯 用途

`last_hash` 字段用于性能优化，存储 sitemap 内容的 SHA-256 哈希值。

## 🔍 工作原理

### 扫描流程

```
1. 获取 sitemap
   ↓
2. 计算内容 hash
   ↓
3. 与 last_hash 比较
   ↓
4a. 相同 → 跳过解析，直接返回 ✅ (性能优化)
4b. 不同 → 解析并更新数据库
```

### 代码逻辑

```typescript
// 计算当前内容的 hash
const bodyText = await res.text();
const computedHash = await sha256Hex(bodyText);

// 与上次的 hash 比较
if (sm.lastHash && sm.lastHash === computedHash) {
  // 内容未变化，跳过解析
  return { changed: false, urlsAdded: 0, urlsRemoved: 0, urlsUpdated: 0, urlCount: 0 };
}

// 内容有变化，继续解析
xml = xmlParser.parse(bodyText);
// ... 后续处理
```

## ❓ 是否需要更新现有数据？

### 答案：❌ 不需要

**原因**:

1. **自动更新机制**
   - 下次扫描时会自动计算并保存 hash
   - 无需手动初始化

2. **向后兼容**
   - 代码检查 `sm.lastHash` 存在才使用
   - NULL 值会被安全忽略
   - 不会导致错误或功能异常

3. **渐进式优化**
   - 随着扫描的进行，hash 会逐步填充
   - 第一次扫描：计算 hash 并保存
   - 第二次扫描：使用 hash 进行优化

### 当前状态

```sql
-- 查看现有数据
SELECT 
  id,
  url,
  last_hash,
  updated_at
FROM sitemap_monitor_sitemaps
LIMIT 5;

-- 预期结果：
-- last_hash 都是 NULL ✅ 这是正常的
```

### 首次扫描后

```sql
-- 扫描后再查看
SELECT 
  id,
  url,
  last_hash IS NOT NULL as has_hash,
  updated_at
FROM sitemap_monitor_sitemaps
LIMIT 5;

-- 预期结果：
-- has_hash 变为 true ✅
```

## 📊 性能影响

### 没有 hash 时（首次扫描）

```
获取 sitemap → 解析 XML → 对比数据库 → 更新
时间: ~100-500ms (取决于 sitemap 大小)
```

### 有 hash 且内容未变化时

```
获取 sitemap → 计算 hash → 比较 → 跳过解析
时间: ~10-50ms (节省 90% 时间) ✅
```

### 有 hash 但内容变化时

```
获取 sitemap → 计算 hash → 比较 → 解析 XML → 对比数据库 → 更新
时间: ~100-500ms (与首次扫描相同)
```

## 🎯 优化效果

### 场景 1: 频繁扫描，内容很少变化

**示例**: 每小时扫描一次，但 sitemap 每天才更新一次

- **优化前**: 每次都解析 XML，24 次 × 200ms = 4.8 秒/天
- **优化后**: 23 次跳过 + 1 次解析 = 23 × 20ms + 200ms = 0.66 秒/天
- **节省**: 86% 的处理时间 ✅

### 场景 2: 大型 sitemap

**示例**: 包含 10,000 个 URL 的 sitemap

- **优化前**: 解析 + 对比 10,000 条记录 = ~2-5 秒
- **优化后**: 内容未变化时跳过 = ~50ms
- **节省**: 98% 的处理时间 ✅

## 🔧 可选：手动初始化 hash

如果你想立即为所有现有 sitemap 生成 hash（不推荐，因为会自动生成）：

### 方法 1: 触发一次完整扫描

```bash
# 这会自动为所有 sitemap 生成 hash
DATABASE_URL="..." node scripts/scan-all-sites.js
```

### 方法 2: 使用初始化脚本（如果需要）

我可以创建一个脚本来批量初始化 hash，但通常不需要，因为：
- 会增加服务器负载
- 需要下载所有 sitemap
- 下次扫描时会自动生成

## ✅ 建议

### 推荐做法

1. **什么都不做** ✅
   - 让系统自然运行
   - hash 会在下次扫描时自动生成
   - 无需手动干预

2. **正常使用**
   - 继续正常扫描
   - 第一次扫描：生成 hash
   - 第二次扫描：开始享受优化

3. **监控效果**
   - 观察扫描时间
   - 有 hash 后应该会更快

### 不推荐做法

1. ❌ 手动初始化所有 hash
   - 增加服务器负载
   - 浪费带宽
   - 没有实际收益

2. ❌ 担心 NULL 值
   - NULL 是正常的初始状态
   - 不会影响功能
   - 会自动填充

## 📝 验证 hash 生成

### 触发一次扫描

```bash
# 在浏览器中点击"手动扫描"
# 或使用 API
curl -X POST "http://localhost:3000/api/sites/{site-id}/scan" \
  -H "Cookie: session=YOUR_SESSION"
```

### 检查 hash 是否生成

```sql
-- 查看扫描后的 hash
SELECT 
  url,
  last_hash,
  LENGTH(last_hash) as hash_length,
  updated_at
FROM sitemap_monitor_sitemaps
WHERE last_hash IS NOT NULL
LIMIT 5;

-- 预期结果：
-- hash_length 应该是 64 (SHA-256 的十六进制长度)
```

### 查看优化效果

```sql
-- 查看扫描时间
SELECT 
  id,
  started_at,
  finished_at,
  EXTRACT(EPOCH FROM (finished_at - started_at)) as duration_seconds
FROM sitemap_monitor_scans
ORDER BY started_at DESC
LIMIT 10;

-- 有 hash 后，相同内容的扫描应该更快
```

## 🎊 总结

### 关键点

- ✅ **不需要手动更新** - 会自动生成
- ✅ **NULL 值正常** - 不影响功能
- ✅ **渐进式优化** - 随着使用逐步生效
- ✅ **性能提升显著** - 内容未变化时节省 90%+ 时间

### 下一步

1. ✅ 迁移已完成
2. ✅ 字段已添加
3. ⏳ 正常使用即可
4. ⏳ 享受性能优化

---

**结论**: 不需要任何额外操作，系统会自动处理！

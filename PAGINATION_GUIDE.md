# 📄 分页功能使用指南

## 🚀 功能概览

我已经为项目添加了完善的分页功能，包括页码导航、每页显示数量选择、快速跳转等功能。这些组件可以在任何需要分页的列表页面中复用。

## 🛠️ 核心组件

### 1. Pagination 组件
主要的分页导航组件，提供完整的分页功能。

```tsx
<Pagination
  currentPage={page}
  totalPages={totalPages}
  pageSize={pageSize}
  total={total}
  baseUrl="/sites"
  searchParams={searchParams}
/>
```

**功能特性：**
- ✅ 首页/末页快速跳转
- ✅ 上一页/下一页导航
- ✅ 智能页码显示（省略号处理）
- ✅ 移动端适配
- ✅ 当前页面高亮
- ✅ 禁用状态处理

### 2. PageSizeSelector 组件
每页显示数量选择器。

```tsx
<PageSizeSelector
  currentPageSize={pageSize}
  baseUrl="/sites"
  searchParams={searchParams}
  options={[5, 10, 20, 50, 100]}
/>
```

**功能特性：**
- ✅ 自定义选项数组
- ✅ 自动重置到第一页
- ✅ 保持其他搜索参数

### 3. PageJumper 组件
快速跳转到指定页面。

```tsx
<PageJumper
  currentPage={page}
  totalPages={totalPages}
  baseUrl="/sites"
  searchParams={searchParams}
/>
```

**功能特性：**
- ✅ 数字输入验证
- ✅ 回车键快速跳转
- ✅ 范围限制（1 到最大页数）

### 4. DataTable 组件
通用数据表格组件，集成了完整的分页功能。

```tsx
<DataTable
  data={data}
  columns={columns}
  currentPage={page}
  pageSize={pageSize}
  totalItems={total}
  sort={sort}
  sortDirection={dir}
  baseUrl="/sites"
  searchParams={searchParams}
  emptyState={{
    title: "暂无数据",
    description: "还没有任何数据",
    action: { label: "添加数据", href: "/add" }
  }}
  pageSizeOptions={[10, 20, 50, 100]}
/>
```

## 📋 使用示例

### 1. 站点管理页面
位置：`/sites`

**特性：**
- 每页 5-100 条记录可选
- 支持按站点地址、创建时间排序
- 标签和分组过滤
- 快速跳转功能

### 2. 扫描记录页面
位置：`/scans`

**特性：**
- 每页 10-100 条记录可选
- 支持按状态、站点过滤
- 多列排序支持
- 实时状态显示

### 3. 博客文章列表
位置：`/blog/list`

**特性：**
- 每页 5-50 条记录可选
- 分类和状态过滤
- 发布时间排序
- 阅读量统计

## 🎯 实现步骤

### 步骤 1：页面参数处理
```tsx
export default async function ListPage({ searchParams }) {
  const params = await searchParams;
  
  const page = getInt(params, "page", 1);
  const pageSize = Math.min(getInt(params, "pageSize", 10), 100);
  const sort = getParam(params, "sort", "createdAt");
  const dir = getParam(params, "dir", "desc");
  
  // 其他过滤参数...
}
```

### 步骤 2：数据查询和分页
```tsx
// 计算偏移量
const offset = (page - 1) * pageSize;

// 查询总数
const [{ count }] = await db
  .select({ count: sql`count(*)` })
  .from(table)
  .where(conditions);

// 查询分页数据
const data = await db
  .select()
  .from(table)
  .where(conditions)
  .orderBy(orderByClause)
  .limit(pageSize)
  .offset(offset);
```

### 步骤 3：使用分页组件
```tsx
return (
  <div>
    {/* 数据表格 */}
    <DataTable
      data={data}
      columns={columns}
      currentPage={page}
      pageSize={pageSize}
      totalItems={total}
      baseUrl="/your-page"
      searchParams={{ sort, dir, filter }}
    />
  </div>
);
```

## 🎨 自定义配置

### 页面大小选项
```tsx
// 默认选项
pageSizeOptions={[10, 20, 50, 100]}

// 自定义选项
pageSizeOptions={[5, 15, 25, 50]}
```

### 分页显示控制
```tsx
<DataTable
  showPageSizeSelector={true}  // 显示页面大小选择器
  showPageJumper={true}        // 显示快速跳转
  // ...其他属性
/>
```

### 空状态自定义
```tsx
emptyState={{
  title: "暂无数据",
  description: "还没有任何记录",
  action: {
    label: "添加记录",
    href: "/add",
    // 或者 onClick: () => handleAdd()
  }
}}
```

## 📱 响应式设计

### 桌面端
- 完整的页码显示
- 首页/末页按钮
- 页面大小选择器
- 快速跳转输入框

### 移动端
- 简化的页码显示（当前页/总页数）
- 上一页/下一页按钮
- 垂直布局的控件

### 平板端
- 部分页码显示
- 保留主要功能
- 适中的控件大小

## 🔧 高级功能

### 1. URL 状态同步
所有分页状态都会同步到 URL，支持：
- 浏览器前进/后退
- 书签保存
- 链接分享

### 2. 搜索参数保持
在分页操作时，会保持其他搜索参数：
- 排序设置
- 过滤条件
- 搜索关键词

### 3. 智能页码显示
```
1 ... 5 6 [7] 8 9 ... 20
```
- 始终显示首页和末页
- 当前页前后各显示 2 页
- 用省略号表示跳跃

### 4. 性能优化
- 服务端分页，减少数据传输
- 智能缓存策略
- 延迟加载支持

## 📊 使用统计

### 当前实现页面
1. **站点管理** (`/sites`) - ✅ 已实现
2. **扫描记录** (`/scans`) - ✅ 已实现  
3. **博客列表** (`/blog/list`) - ✅ 已实现

### 推荐配置
- **小型列表**：5, 10, 20, 50 条/页
- **中型列表**：10, 20, 50, 100 条/页
- **大型列表**：20, 50, 100, 200 条/页

## 🚀 最佳实践

### 1. 性能优化
```tsx
// 限制最大页面大小
const pageSize = Math.min(getInt(params, "pageSize", 10), 100);

// 使用索引优化查询
.orderBy(indexedColumn)
.limit(pageSize)
.offset(offset)
```

### 2. 用户体验
```tsx
// 提供合理的默认值
const page = getInt(params, "page", 1);
const pageSize = getInt(params, "pageSize", 10);

// 显示加载状态
{loading && <LoadingTable />}
```

### 3. 错误处理
```tsx
// 页码范围验证
const totalPages = Math.max(1, Math.ceil(total / pageSize));
const validPage = Math.min(Math.max(1, page), totalPages);
```

### 4. SEO 优化
```tsx
// 分页页面的 meta 标签
export const metadata = {
  title: `页面标题 - 第${page}页`,
  description: `查看第${page}页的内容...`,
};
```

## 🎉 总结

通过这套完整的分页系统，您可以：

1. **快速实现** - 使用预构建组件快速添加分页功能
2. **高度定制** - 灵活配置页面大小、样式和行为
3. **用户友好** - 提供直观的导航和快速跳转功能
4. **性能优化** - 服务端分页减少数据传输
5. **响应式设计** - 适配所有设备尺寸
6. **SEO 友好** - URL 状态同步支持搜索引擎索引

这套分页系统将大大提升用户在浏览大量数据时的体验，同时保持良好的性能和可维护性。
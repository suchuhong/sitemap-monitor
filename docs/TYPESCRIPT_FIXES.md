# 🔧 TypeScript 类型错误修复指南

## 🚨 常见问题

在使用 DataTable 组件时，经常遇到以下 TypeScript 错误：

1. `'post' is of type 'unknown'`
2. `Property 'name' does not exist on type 'T'`
3. `'aValue' is possibly 'null'`

## ✅ 解决方案

### 1. 为 createColumn 添加泛型类型

#### 问题代码
```tsx
// ❌ 错误：没有类型参数
const columns = [
  createColumn({
    key: "title",
    render: (post) => <div>{post.title}</div>  // 错误：'post' is of type 'unknown'
  })
];
```

#### 修复代码
```tsx
// ✅ 正确：添加类型参数
type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  // ... 其他属性
};

const columns = [
  createColumn<BlogPost>({
    key: "title",
    render: (post) => <div>{post.title}</div>  // 正确：post 现在有正确的类型
  })
];
```

### 2. 为列渲染器添加泛型类型

#### 问题代码
```tsx
// ❌ 错误：没有类型参数
createColumn({
  key: "publishDate",
  render: columnRenderers.date((post) => post.publishDate)  // 可能的类型错误
})
```

#### 修复代码
```tsx
// ✅ 正确：添加类型参数
createColumn<BlogPost>({
  key: "publishDate",
  render: columnRenderers.date<BlogPost>((post) => post.publishDate)
})
```

### 3. 处理排序函数中的 null 值

#### 问题代码
```tsx
// ❌ 错误：没有处理 null 值
filteredData.sort((a, b) => {
  let aValue = a[sort as keyof typeof a];
  let bValue = b[sort as keyof typeof b];
  
  return aValue < bValue ? -1 : 1;  // 错误：可能为 null
});
```

#### 修复代码
```tsx
// ✅ 正确：处理 null 值
filteredData.sort((a, b) => {
  let aValue = a[sort as keyof typeof a];
  let bValue = b[sort as keyof typeof b];
  
  // 处理 null/undefined 值
  if (aValue == null && bValue == null) return 0;
  if (aValue == null) return dir === "asc" ? -1 : 1;
  if (bValue == null) return dir === "asc" ? 1 : -1;
  
  // 继续正常比较
  if (aValue instanceof Date) aValue = aValue.getTime();
  if (bValue instanceof Date) bValue = bValue.getTime();
  
  if (typeof aValue === 'string') aValue = aValue.toLowerCase();
  if (typeof bValue === 'string') bValue = bValue.toLowerCase();
  
  if (dir === "asc") {
    return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
  } else {
    return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
  }
});
```

## 📋 完整示例

### 博客文章列表

```tsx
import { DataTable, createColumn, columnRenderers } from "@/components/ui/data-table";

// 1. 定义数据类型
type BlogPost = {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  status: "published" | "draft" | "scheduled";
  publishDate: Date;
  readTime: number;
  views: number;
  tags: string[];
  author: string;
};

// 2. 定义列配置（注意泛型类型）
const columns = [
  createColumn<BlogPost>({
    key: "title",
    title: "文章标题",
    sortable: true,
    render: (post) => (
      <div className="space-y-1">
        <div className="font-medium text-primary hover:underline cursor-pointer">
          {post.title}
        </div>
        <div className="text-xs text-muted-foreground">
          {post.excerpt}
        </div>
      </div>
    ),
  }),
  createColumn<BlogPost>({
    key: "category",
    title: "分类",
    sortable: true,
    render: (post) => (
      <Badge variant="secondary">{post.category}</Badge>
    ),
  }),
  createColumn<BlogPost>({
    key: "publishDate",
    title: "发布时间",
    sortable: true,
    render: columnRenderers.date<BlogPost>((post) => post.publishDate),
  }),
  createColumn<BlogPost>({
    key: "tags",
    title: "标签",
    render: columnRenderers.tags<BlogPost>((post) => post.tags),
  }),
];

// 3. 使用 DataTable
<DataTable<BlogPost>
  data={paginatedPosts}
  columns={columns}
  currentPage={page}
  pageSize={pageSize}
  totalItems={total}
  // ... 其他属性
/>
```

### 扫描记录列表

```tsx
// 1. 定义数据类型
type ScanRecord = {
  id: string;
  siteId: string;
  siteName: string;
  status: "success" | "error" | "warning" | "pending";
  startedAt: Date;
  finishedAt: Date | null;
  duration: number;
  urlsFound: number;
  urlsAdded: number;
  urlsRemoved: number;
  urlsModified: number;
  errorMessage: string | null;
  priority: number;
};

// 2. 定义列配置
const columns = [
  createColumn<ScanRecord>({
    key: "siteName",
    title: "站点",
    sortable: true,
    render: (scan) => (
      <div className="space-y-1">
        <Link 
          href={`/sites/${scan.siteId}`}
          className="font-medium text-primary hover:underline"
        >
          {scan.siteName}
        </Link>
        <div className="text-xs text-muted-foreground">
          ID: {scan.siteId}
        </div>
      </div>
    ),
  }),
  createColumn<ScanRecord>({
    key: "status",
    title: "状态",
    sortable: true,
    render: (scan) => {
      const statusMap = {
        success: "success" as const,
        error: "error" as const,
        warning: "warning" as const,
        pending: "pending" as const,
      };
      return (
        <StatusIndicator status={statusMap[scan.status]}>
          {scan.status === "success" && "成功"}
          {scan.status === "error" && "失败"}
          {scan.status === "warning" && "警告"}
          {scan.status === "pending" && "进行中"}
        </StatusIndicator>
      );
    },
  }),
  createColumn<ScanRecord>({
    key: "startedAt",
    title: "开始时间",
    sortable: true,
    render: columnRenderers.date<ScanRecord>((scan) => scan.startedAt),
  }),
];
```

## 🎯 最佳实践

### 1. 始终定义数据类型
```tsx
// ✅ 好的做法
type User = {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
};

const columns = [
  createColumn<User>({
    // ...
  })
];
```

### 2. 为所有 createColumn 添加泛型
```tsx
// ✅ 好的做法
createColumn<User>({
  key: "name",
  title: "用户名",
  render: (user) => user.name  // user 有正确的类型
})
```

### 3. 为列渲染器添加泛型
```tsx
// ✅ 好的做法
render: columnRenderers.date<User>((user) => user.createdAt)
render: columnRenderers.tags<User>((user) => user.tags)
render: columnRenderers.status<User>((user) => user.isActive ? "success" : "error")
```

### 4. 处理可能为 null 的值
```tsx
// ✅ 好的做法
render: (user) => user.website ? (
  <a href={user.website}>{user.website}</a>
) : (
  <span className="text-muted-foreground">—</span>
)
```

### 5. 使用类型安全的状态映射
```tsx
// ✅ 好的做法
render: (user) => {
  const statusMap: Record<User['status'], "success" | "error" | "warning"> = {
    active: "success",
    inactive: "error",
    pending: "warning",
  };
  return <StatusIndicator status={statusMap[user.status]} />;
}
```

## 🔍 调试技巧

### 1. 使用 TypeScript 编译器检查
```bash
npx tsc --noEmit
```

### 2. 在 IDE 中查看类型信息
将鼠标悬停在变量上查看推断的类型。

### 3. 使用类型断言（谨慎使用）
```tsx
// 仅在确定类型正确时使用
const typedData = data as BlogPost[];
```

### 4. 添加运行时类型检查
```tsx
function isBlogPost(obj: any): obj is BlogPost {
  return obj && typeof obj.title === 'string' && typeof obj.id === 'string';
}

// 使用
if (isBlogPost(data)) {
  // data 现在是 BlogPost 类型
}
```

## 🎉 总结

通过正确使用 TypeScript 泛型和类型定义，我们可以：

1. ✅ **消除类型错误** - 所有变量都有正确的类型
2. ✅ **获得智能提示** - IDE 提供准确的代码补全
3. ✅ **提前发现错误** - 编译时捕获类型错误
4. ✅ **提高代码质量** - 类型安全的代码更可靠
5. ✅ **改善开发体验** - 更好的开发工具支持

记住：**始终为 `createColumn` 和列渲染器添加正确的泛型类型参数！**
# 📊 DataTable 组件使用指南

## 🚀 基本用法

DataTable 是一个通用的数据表格组件，支持排序、分页、自定义渲染等功能。

### 基础示例

```tsx
import { DataTable, createColumn, columnRenderers } from "@/components/ui/data-table";

// 定义数据类型
interface User {
  id: string;
  name: string;
  email: string;
  status: "active" | "inactive";
  createdAt: Date;
  tags: string[];
}

// 定义列配置
const columns = [
  createColumn<User>({
    key: "name",
    title: "用户名",
    sortable: true,
    render: (user) => (
      <div className="font-medium">{user.name}</div>
    ),
  }),
  createColumn<User>({
    key: "email",
    title: "邮箱",
    sortable: true,
  }),
  createColumn<User>({
    key: "status",
    title: "状态",
    render: columnRenderers.status<User>((user) => 
      user.status === "active" ? "success" : "pending"
    ),
  }),
  createColumn<User>({
    key: "createdAt",
    title: "创建时间",
    sortable: true,
    render: columnRenderers.date<User>((user) => user.createdAt),
  }),
  createColumn<User>({
    key: "tags",
    title: "标签",
    render: columnRenderers.tags<User>((user) => user.tags),
  }),
];

// 使用组件
<DataTable
  data={users}
  columns={columns}
  currentPage={page}
  pageSize={pageSize}
  totalItems={total}
  baseUrl="/users"
  searchParams={searchParams}
/>
```

## 🎨 列渲染器

### 1. 链接渲染器

#### link - 自定义链接
```tsx
createColumn<User>({
  key: "name",
  title: "用户名",
  render: columnRenderers.link<User>(
    (user) => `/users/${user.id}`,  // 获取链接
    (user) => user.name,            // 获取显示文本
    "font-medium"                   // 可选的 CSS 类名
  ),
})
```

#### linkByKey - 使用对象属性
```tsx
createColumn<User>({
  key: "website",
  title: "网站",
  render: columnRenderers.linkByKey<User>(
    "websiteUrl",  // 链接属性名
    "websiteName", // 显示文本属性名
    "text-blue-600"
  ),
})
```

#### internalLink - Next.js 内部链接
```tsx
createColumn<User>({
  key: "profile",
  title: "个人资料",
  render: columnRenderers.internalLink<User>(
    (user) => `/profile/${user.id}`,
    (user) => "查看资料"
  ),
})
```

### 2. 状态渲染器

```tsx
createColumn<User>({
  key: "status",
  title: "状态",
  render: columnRenderers.status<User>((user) => {
    switch (user.status) {
      case "active": return "success";
      case "pending": return "warning";
      case "blocked": return "error";
      default: return "pending";
    }
  }),
})
```

### 3. 日期渲染器

```tsx
createColumn<User>({
  key: "createdAt",
  title: "创建时间",
  render: columnRenderers.date<User>((user) => user.createdAt),
})

// 或者使用字符串/时间戳
createColumn<User>({
  key: "lastLogin",
  title: "最后登录",
  render: columnRenderers.date<User>((user) => user.lastLoginTimestamp),
})
```

### 4. 标签渲染器

```tsx
createColumn<User>({
  key: "tags",
  title: "标签",
  render: columnRenderers.tags<User>((user) => user.tags),
})
```

## 🔧 自定义渲染器

### 简单自定义
```tsx
createColumn<User>({
  key: "avatar",
  title: "头像",
  render: (user) => (
    <img 
      src={user.avatarUrl} 
      alt={user.name}
      className="w-8 h-8 rounded-full"
    />
  ),
})
```

### 复杂自定义
```tsx
createColumn<User>({
  key: "actions",
  title: "操作",
  render: (user, index) => (
    <div className="flex items-center space-x-2">
      <button 
        onClick={() => handleEdit(user.id)}
        className="text-primary hover:underline text-sm"
      >
        编辑
      </button>
      <button 
        onClick={() => handleDelete(user.id)}
        className="text-destructive hover:underline text-sm"
      >
        删除
      </button>
    </div>
  ),
})
```

## 📋 完整配置选项

### DataTable 属性

```tsx
interface DataTableProps<T> {
  data: T[];                          // 数据数组
  columns: Column<T>[];               // 列配置
  currentPage: number;                // 当前页码
  pageSize: number;                   // 每页大小
  totalItems: number;                 // 总记录数
  sort?: string;                      // 排序字段
  sortDirection?: "asc" | "desc";     // 排序方向
  baseUrl: string;                    // 基础URL
  searchParams?: Record<string, string>; // 搜索参数
  emptyState?: {                      // 空状态配置
    title: string;
    description?: string;
    action?: {
      label: string;
      href?: string;
      onClick?: () => void;
    };
  };
  className?: string;                 // 自定义样式
  pageSizeOptions?: number[];         // 页面大小选项
  showPageSizeSelector?: boolean;     // 显示页面大小选择器
  showPageJumper?: boolean;          // 显示快速跳转
}
```

### Column 属性

```tsx
interface Column<T> {
  key: string;                        // 列键名
  title: string;                      // 列标题
  sortable?: boolean;                 // 是否可排序
  render?: (item: T, index: number) => React.ReactNode; // 自定义渲染
  className?: string;                 // 单元格样式
  headerClassName?: string;           // 表头样式
}
```

## 🎯 实际使用案例

### 1. 用户管理表格

```tsx
const userColumns = [
  createColumn<User>({
    key: "avatar",
    title: "头像",
    render: (user) => (
      <img src={user.avatar} className="w-8 h-8 rounded-full" />
    ),
  }),
  createColumn<User>({
    key: "name",
    title: "用户名",
    sortable: true,
    render: columnRenderers.internalLink<User>(
      (user) => `/users/${user.id}`,
      (user) => user.name
    ),
  }),
  createColumn<User>({
    key: "email",
    title: "邮箱",
    sortable: true,
  }),
  createColumn<User>({
    key: "role",
    title: "角色",
    render: (user) => (
      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
        {user.role}
      </span>
    ),
  }),
  createColumn<User>({
    key: "status",
    title: "状态",
    render: columnRenderers.status<User>((user) => 
      user.isActive ? "success" : "pending"
    ),
  }),
  createColumn<User>({
    key: "createdAt",
    title: "注册时间",
    sortable: true,
    render: columnRenderers.date<User>((user) => user.createdAt),
  }),
];
```

### 2. 订单管理表格

```tsx
const orderColumns = [
  createColumn<Order>({
    key: "orderNumber",
    title: "订单号",
    sortable: true,
    render: columnRenderers.internalLink<Order>(
      (order) => `/orders/${order.id}`,
      (order) => order.orderNumber
    ),
  }),
  createColumn<Order>({
    key: "customer",
    title: "客户",
    render: (order) => (
      <div>
        <div className="font-medium">{order.customerName}</div>
        <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
      </div>
    ),
  }),
  createColumn<Order>({
    key: "amount",
    title: "金额",
    sortable: true,
    render: (order) => (
      <span className="font-medium">¥{order.amount.toFixed(2)}</span>
    ),
  }),
  createColumn<Order>({
    key: "status",
    title: "状态",
    render: columnRenderers.status<Order>((order) => {
      switch (order.status) {
        case "paid": return "success";
        case "pending": return "warning";
        case "cancelled": return "error";
        default: return "pending";
      }
    }),
  }),
  createColumn<Order>({
    key: "createdAt",
    title: "下单时间",
    sortable: true,
    render: columnRenderers.date<Order>((order) => order.createdAt),
  }),
];
```

## 🎨 样式自定义

### 表格样式
```tsx
<DataTable
  className="custom-table"
  // ... 其他属性
/>
```

### 列样式
```tsx
createColumn<User>({
  key: "name",
  title: "用户名",
  className: "min-w-[200px]",           // 单元格样式
  headerClassName: "bg-blue-50",        // 表头样式
})
```

## 🚀 性能优化

### 1. 使用 useMemo 缓存列配置
```tsx
const columns = useMemo(() => [
  createColumn<User>({
    key: "name",
    title: "用户名",
    // ...
  }),
  // ... 其他列
], []);
```

### 2. 避免在渲染函数中创建新对象
```tsx
// ❌ 不好的做法
render: (user) => ({ ...user, formatted: true })

// ✅ 好的做法
render: (user) => <span>{user.name}</span>
```

### 3. 使用 React.memo 优化组件
```tsx
const OptimizedDataTable = React.memo(DataTable);
```

## 📱 响应式设计

DataTable 组件已经内置了响应式设计：

- **桌面端**：显示完整的分页控件和所有列
- **平板端**：适中的控件大小，可能隐藏部分列
- **移动端**：简化的分页控件，优化的表格布局

### 自定义响应式列
```tsx
createColumn<User>({
  key: "description",
  title: "描述",
  className: "hidden md:table-cell", // 在移动端隐藏
})
```

## 🎉 总结

DataTable 组件提供了：

1. ✅ **类型安全** - 完整的 TypeScript 支持
2. ✅ **灵活配置** - 丰富的配置选项
3. ✅ **预置渲染器** - 常用的列渲染器
4. ✅ **自定义渲染** - 支持完全自定义
5. ✅ **响应式设计** - 适配所有设备
6. ✅ **性能优化** - 内置性能优化策略

通过合理使用这些功能，您可以快速构建出功能完整、用户体验良好的数据表格！
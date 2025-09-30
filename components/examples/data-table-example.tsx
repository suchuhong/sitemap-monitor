"use client";

import { DataTable, createColumn, columnRenderers } from "@/components/ui/data-table";

// 示例数据类型
interface ExampleUser {
  id: string;
  name: string;
  email: string;
  website?: string;
  status: "active" | "inactive" | "pending";
  createdAt: Date;
  tags: string[];
  profileUrl: string;
}

// 示例数据
const sampleUsers: ExampleUser[] = [
  {
    id: "1",
    name: "张三",
    email: "zhangsan@example.com",
    website: "https://zhangsan.com",
    status: "active",
    createdAt: new Date("2024-01-15"),
    tags: ["VIP", "开发者"],
    profileUrl: "/users/1",
  },
  {
    id: "2", 
    name: "李四",
    email: "lisi@example.com",
    status: "pending",
    createdAt: new Date("2024-01-20"),
    tags: ["新用户"],
    profileUrl: "/users/2",
  },
];

export function DataTableExample() {
  // 定义列配置
  const columns = [
    createColumn<ExampleUser>({
      key: "name",
      title: "用户名",
      sortable: true,
      render: columnRenderers.internalLink<ExampleUser>(
        (user) => user.profileUrl,
        (user) => user.name,
        "font-medium"
      ),
    }),
    createColumn<ExampleUser>({
      key: "email",
      title: "邮箱",
      sortable: true,
      render: (user) => (
        <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">
          {user.email}
        </a>
      ),
    }),
    createColumn<ExampleUser>({
      key: "website",
      title: "网站",
      render: (user) => user.website ? (
        <a 
          href={user.website} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-primary hover:underline"
        >
          访问网站
        </a>
      ) : (
        <span className="text-muted-foreground">—</span>
      ),
    }),
    createColumn<ExampleUser>({
      key: "status",
      title: "状态",
      render: columnRenderers.status<ExampleUser>((user) => {
        switch (user.status) {
          case "active": return "success";
          case "pending": return "warning";
          case "inactive": return "error";
          default: return "pending";
        }
      }),
    }),
    createColumn<ExampleUser>({
      key: "createdAt",
      title: "注册时间",
      sortable: true,
      render: columnRenderers.date<ExampleUser>((user) => user.createdAt),
    }),
    createColumn<ExampleUser>({
      key: "tags",
      title: "标签",
      render: columnRenderers.tags<ExampleUser>((user) => user.tags),
    }),
    createColumn<ExampleUser>({
      key: "actions",
      title: "操作",
      render: (user) => (
        <div className="flex items-center space-x-2">
          <button className="text-primary hover:underline text-sm">
            编辑
          </button>
          <button className="text-destructive hover:underline text-sm">
            删除
          </button>
        </div>
      ),
    }),
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">DataTable 使用示例</h2>
        <p className="text-muted-foreground">展示如何正确使用 DataTable 组件和列渲染器</p>
      </div>

      <DataTable
        data={sampleUsers}
        columns={columns}
        currentPage={1}
        pageSize={10}
        totalItems={sampleUsers.length}
        baseUrl="/example"
        searchParams={{}}
        emptyState={{
          title: "暂无用户数据",
          description: "还没有注册的用户",
          action: {
            label: "添加用户",
            href: "/users/new",
          },
        }}
        pageSizeOptions={[5, 10, 20]}
      />
    </div>
  );
}

// 使用示例的不同渲染器
export const renderExamples = {
  // 1. 基础链接渲染器
  basicLink: columnRenderers.link<ExampleUser>(
    (user) => `/users/${user.id}`,
    (user) => user.name
  ),

  // 2. 使用属性的链接渲染器
  linkByKey: columnRenderers.linkByKey<ExampleUser>(
    "profileUrl",  // href 属性
    "name",        // 显示文本属性
    "font-semibold"
  ),

  // 3. 内部链接渲染器
  internalLink: columnRenderers.internalLink<ExampleUser>(
    (user) => `/profile/${user.id}`,
    (user) => `查看 ${user.name} 的资料`
  ),

  // 4. 状态渲染器
  status: columnRenderers.status<ExampleUser>((user) => {
    if (user.status === "active") return "success";
    if (user.status === "pending") return "warning";
    return "error";
  }),

  // 5. 日期渲染器
  date: columnRenderers.date<ExampleUser>((user) => user.createdAt),

  // 6. 标签渲染器
  tags: columnRenderers.tags<ExampleUser>((user) => user.tags),
};
import { DataTable, createColumn, columnRenderers } from "@/components/ui/data-table";
import { Badge } from "@/components/ui/badge";
import type { Metadata } from "next";


export const metadata: Metadata = {
    title: "博客文章列表 - Sitemap Monitor",
    description: "浏览所有SEO优化和网站监控相关的博客文章",
};

// 模拟博客数据
const generateBlogPosts = (count: number) => {
    const categories = ["SEO优化", "技术实践", "搜索引擎", "WordPress", "移动SEO", "网站改版"];
    const statuses = ["published", "draft", "scheduled"] as const;

    return Array.from({ length: count }, (_, i) => ({
        id: `post-${i + 1}`,
        title: `博客文章标题 ${i + 1} - 关于网站地图监控和SEO优化的深度分析`,
        excerpt: `这是第 ${i + 1} 篇博客文章的摘要内容，介绍了网站监控的重要性和实施方法...`,
        category: categories[i % categories.length],
        status: statuses[i % statuses.length],
        publishDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
        readTime: Math.floor(Math.random() * 15) + 3,
        views: Math.floor(Math.random() * 10000),
        tags: ["SEO", "监控", "优化"].slice(0, Math.floor(Math.random() * 3) + 1),
        author: "Sitemap Monitor Team",
    }));
};

function getParam(
    sp: Record<string, string | string[]> | undefined,
    key: string,
    def: string,
) {
    const v = sp?.[key];
    if (!v) return def;
    return Array.isArray(v) ? v[0] : v;
}

function getInt(
    sp: Record<string, string | string[]> | undefined,
    key: string,
    def: number,
) {
    const n = parseInt(getParam(sp, key, String(def)), 10);
    return Number.isFinite(n) && n > 0 ? n : def;
}

export default async function BlogListPage({
    searchParams,
}: {
    searchParams?: Promise<Record<string, string | string[]>>;
}) {
    const params = (searchParams ? await searchParams : {}) as
        | Record<string, string | string[]>
        | undefined;

    const page = getInt(params, "page", 1);
    const pageSize = Math.min(getInt(params, "pageSize", 10), 50);
    const sort = getParam(params, "sort", "publishDate");
    const dir = getParam(params, "dir", "desc") as "asc" | "desc";
    const category = getParam(params, "category", "");
    const status = getParam(params, "status", "");

    // 生成模拟数据
    const allPosts = generateBlogPosts(156);

    // 过滤数据
    let filteredPosts = allPosts;
    if (category) {
        filteredPosts = filteredPosts.filter(post => post.category === category);
    }
    if (status) {
        filteredPosts = filteredPosts.filter(post => post.status === status);
    }

    // 排序
    filteredPosts.sort((a, b) => {
        let aValue = a[sort as keyof typeof a];
        let bValue = b[sort as keyof typeof b];

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

    const total = filteredPosts.length;
    const offset = (page - 1) * pageSize;
    const paginatedPosts = filteredPosts.slice(offset, offset + pageSize);

    // 定义博客文章类型
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

    // 定义表格列
    const columns = [
        createColumn<BlogPost>({
            key: "title",
            title: "文章标题",
            sortable: true,
            render: (post) => (
                <div className="space-y-1">
                    <div className="font-medium text-primary hover:underline cursor-pointer line-clamp-2">
                        {post.title}
                    </div>
                    <div className="text-xs text-muted-foreground line-clamp-2">
                        {post.excerpt}
                    </div>
                </div>
            ),
            className: "max-w-md",
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
            key: "status",
            title: "状态",
            sortable: true,
            render: (post) => {
                const statusConfig = {
                    published: { label: "已发布", variant: "success" as const },
                    draft: { label: "草稿", variant: "secondary" as const },
                    scheduled: { label: "定时发布", variant: "warning" as const },
                };
                const config = statusConfig[post.status];
                return <Badge variant={config.variant}>{config.label}</Badge>;
            },
        }),
        createColumn<BlogPost>({
            key: "publishDate",
            title: "发布时间",
            sortable: true,
            render: columnRenderers.date<BlogPost>((post) => post.publishDate),
        }),
        createColumn<BlogPost>({
            key: "readTime",
            title: "阅读时间",
            render: (post) => (
                <span className="text-sm text-muted-foreground">
                    {post.readTime} 分钟
                </span>
            ),
        }),
        createColumn<BlogPost>({
            key: "views",
            title: "浏览量",
            sortable: true,
            render: (post) => (
                <div className="text-sm">
                    <div className="font-medium">{post.views.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">次浏览</div>
                </div>
            ),
        }),
        createColumn<BlogPost>({
            key: "tags",
            title: "标签",
            render: columnRenderers.tags<BlogPost>((post) => post.tags),
        }),
    ];

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">博客文章管理</h1>
                    <p className="text-muted-foreground">管理和查看所有博客文章</p>
                </div>
            </div>

            {/* 过滤器 */}
            <div className="flex flex-wrap gap-4">
                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">分类:</label>
                    <select
                        value={category}
                        onChange={(e) => {
                            const params = new URLSearchParams(window.location.search);
                            if (e.target.value) {
                                params.set('category', e.target.value);
                            } else {
                                params.delete('category');
                            }
                            params.set('page', '1');
                            window.location.search = params.toString();
                        }}
                        className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    >
                        <option value="">全部分类</option>
                        <option value="SEO优化">SEO优化</option>
                        <option value="技术实践">技术实践</option>
                        <option value="搜索引擎">搜索引擎</option>
                        <option value="WordPress">WordPress</option>
                        <option value="移动SEO">移动SEO</option>
                        <option value="网站改版">网站改版</option>
                    </select>
                </div>

                <div className="flex items-center space-x-2">
                    <label className="text-sm font-medium">状态:</label>
                    <select
                        value={status}
                        onChange={(e) => {
                            const params = new URLSearchParams(window.location.search);
                            if (e.target.value) {
                                params.set('status', e.target.value);
                            } else {
                                params.delete('status');
                            }
                            params.set('page', '1');
                            window.location.search = params.toString();
                        }}
                        className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                    >
                        <option value="">全部状态</option>
                        <option value="published">已发布</option>
                        <option value="draft">草稿</option>
                        <option value="scheduled">定时发布</option>
                    </select>
                </div>
            </div>

            {/* 数据表格 */}
            <DataTable
                data={paginatedPosts}
                columns={columns}
                currentPage={page}
                pageSize={pageSize}
                totalItems={total}
                sort={sort}
                sortDirection={dir}
                baseUrl="/blog/list"
                searchParams={{
                    sort,
                    dir,
                    category,
                    status,
                }}
                emptyState={{
                    title: "暂无博客文章",
                    description: "还没有发布任何博客文章",
                    action: {
                        label: "创建文章",
                        href: "/blog/new",
                    },
                }}
                pageSizeOptions={[5, 10, 20, 50]}
            />
        </div>
    );
}
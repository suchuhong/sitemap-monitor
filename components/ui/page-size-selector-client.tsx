"use client";

import { useRouter } from "next/navigation";

interface PageSizeSelectorClientProps {
  currentPageSize: number;
  baseUrl: string;
  searchParams?: Record<string, string>;
  options?: number[];
}

export function PageSizeSelectorClient({
  currentPageSize,
  baseUrl,
  searchParams = {},
  options = [10, 20, 50, 100]
}: PageSizeSelectorClientProps) {
  const router = useRouter();

  const buildUrl = (newPageSize: number) => {
    const params = new URLSearchParams();
    
    // 添加现有的搜索参数，但重置页码为1
    Object.entries(searchParams).forEach(([key, value]) => {
      if (key !== 'page' && key !== 'pageSize') {
        params.set(key, value);
      }
    });
    
    params.set('page', '1');
    params.set('pageSize', newPageSize.toString());
    
    return `${baseUrl}?${params.toString()}`;
  };

  const handleChange = (newPageSize: number) => {
    router.push(buildUrl(newPageSize));
  };

  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-muted-foreground">每页显示</span>
      <select
        value={currentPageSize}
        onChange={(e) => handleChange(parseInt(e.target.value))}
        className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      >
        {options.map((size) => (
          <option key={size} value={size}>
            {size}
          </option>
        ))}
      </select>
      <span className="text-muted-foreground">条</span>
    </div>
  );
}
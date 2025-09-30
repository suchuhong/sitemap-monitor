"use client";

import { useRouter, useSearchParams } from "next/navigation";

interface ScansFiltersProps {
    status: string;
    site: string;
}

export function ScansFilters({ status, site }: ScansFiltersProps) {
    const router = useRouter();
    const searchParams = useSearchParams();

    const updateFilter = (key: string, value: string) => {
        const params = new URLSearchParams(searchParams.toString());
        if (value) {
            params.set(key, value);
        } else {
            params.delete(key);
        }
        params.set('page', '1');
        router.push(`/scans?${params.toString()}`);
    };

    return (
        <div className="flex flex-wrap gap-4">
            <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">状态:</label>
                <select
                    value={status}
                    onChange={(e) => updateFilter('status', e.target.value)}
                    className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
                >
                    <option value="">全部状态</option>
                    <option value="success">成功</option>
                    <option value="error">失败</option>
                    <option value="warning">警告</option>
                    <option value="pending">进行中</option>
                </select>
            </div>

            <div className="flex items-center space-x-2">
                <label className="text-sm font-medium">站点:</label>
                <input
                    type="text"
                    value={site}
                    onChange={(e) => updateFilter('site', e.target.value)}
                    placeholder="搜索站点..."
                    className="h-8 w-48 rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
            </div>
        </div>
    );
}
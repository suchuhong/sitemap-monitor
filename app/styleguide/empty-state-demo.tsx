'use client';

import { EmptyState } from "@/components/ui/empty-state";

export function EmptyStateDemo() {
  const handleClick = () => {
    alert("点击了添加按钮");
  };

  return (
    <EmptyState
      title="暂无数据"
      description="当前没有任何数据可显示，您可以添加一些内容"
      action={{
        label: "添加内容",
        onClick: handleClick,
      }}
    />
  );
}

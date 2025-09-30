'use client';

import { useTransition } from "react";
import { deleteGroupAction } from "./actions";
import { Button } from "@/components/ui/button";

export function DeleteGroupButton({ groupId }: { groupId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!confirm("确认删除该分组？相关站点将被标记为未分组。")) return;
    startTransition(async () => {
      const formData = new FormData();
      formData.append("id", groupId);
      await deleteGroupAction(formData);
    });
  };

  return (
    <Button type="button" size="sm" variant="destructive" disabled={isPending} onClick={handleDelete}>
      {isPending ? "删除中..." : "删除"}
    </Button>
  );
}

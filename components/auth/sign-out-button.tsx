'use client';

import { useTransition } from "react";
import { signOutAction } from "@/app/(actions)/auth";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      variant="ghost"
      className="text-sm font-medium text-muted-foreground hover:text-primary"
      onClick={() => startTransition(() => signOutAction())}
      disabled={pending}
    >
      {pending ? "退出中..." : "退出"}
    </Button>
  );
}

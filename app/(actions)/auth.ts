'use server';

import { redirect } from "next/navigation";
import { createUserSession, clearSession } from "@/lib/auth/session";

export type SignInState = {
  error?: string;
};

export async function signInAction(
  _prevState: SignInState,
  formData: FormData,
): Promise<SignInState> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail : "";
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) return { error: "" };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    return { error: "请输入合法邮箱地址" };
  }
  const redirectInput = formData.get("redirect");
  const redirectTarget = sanitizeRedirect(
    typeof redirectInput === "string" ? redirectInput : undefined,
  ) ?? "/dashboard";

  try {
    await createUserSession(normalizedEmail);
  } catch (err) {
    const message = err instanceof Error ? err.message : "登录失败，请重试";
    return { error: message };
  }

  redirect(redirectTarget);
  return { error: "" };
}

export async function signOutAction() {
  await clearSession();
  redirect("/?signedOut=1");
}

function sanitizeRedirect(value?: string) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

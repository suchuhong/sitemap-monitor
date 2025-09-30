'use server';

import { redirect } from "next/navigation";
import { createUserSession, clearSession } from "@/lib/auth/session";

type SignInState = {
  error?: string;
};

export async function signInAction(
  _prevState: SignInState | undefined,
  formData: FormData,
): Promise<SignInState | void> {
  const rawEmail = formData.get("email");
  const email = typeof rawEmail === "string" ? rawEmail : "";

  try {
    await createUserSession(email);
  } catch (err) {
    const message = err instanceof Error ? err.message : "登录失败，请重试";
    return { error: message };
  }

  redirect("/dashboard");
}

export async function signOutAction() {
  await clearSession();
  redirect("/login");
}

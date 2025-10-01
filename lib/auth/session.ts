import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { resolveDb } from "@/lib/db";
import { users } from "@/lib/drizzle/schema";
import { generateId } from "@/lib/utils/id";

export const SESSION_COOKIE_NAME = "sm_session";

const COOKIE_OPTIONS = {
  path: "/",
  httpOnly: true as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 30, // 30 days
};

type UserRecord = typeof users.$inferSelect;

export async function createUserSession(email: string): Promise<UserRecord> {
  const db = resolveDb();
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail) throw new Error("邮箱不能为空");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(normalizedEmail)) {
    throw new Error("请输入合法邮箱地址");
  }

  const [existing] = await db
    .select({ id: users.id, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  const user = existing ?? (await createUser(normalizedEmail));

  (await cookies()).set(SESSION_COOKIE_NAME, user.id, COOKIE_OPTIONS);
  return user;
}

export async function getCurrentUser(): Promise<UserRecord | null> {
  const session = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!session) return null;

  const db = resolveDb();
  const [user] = await db
    .select({ id: users.id, email: users.email, createdAt: users.createdAt })
    .from(users)
    .where(eq(users.id, session))
    .limit(1);

  return user ?? null;
}

export async function requireUser(options?: { redirectTo?: string }): Promise<UserRecord> {
  const user = await getCurrentUser();
  if (!user) {
    const target = sanitizeRedirect(options?.redirectTo) ?? "/dashboard";
    redirect(`/login?redirect=${encodeURIComponent(target)}`);
  }
  return user;
}

export async function clearSession() {
  const store = await cookies();
  if (store.get(SESSION_COOKIE_NAME)) {
    store.delete(SESSION_COOKIE_NAME);
  }
}

async function createUser(email: string): Promise<UserRecord> {
  const db = resolveDb();
  const user = { id: generateId(), email, createdAt: new Date() };
  await db.insert(users).values(user);
  return user;
}

function sanitizeRedirect(value?: string | null) {
  if (!value) return null;
  if (!value.startsWith("/")) return null;
  if (value.startsWith("//")) return null;
  return value;
}

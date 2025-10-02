'use server';

// Use Web Crypto API for Edge Runtime compatibility
const randomUUID = () => crypto.randomUUID();
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { resolveDb } from "@/lib/db";
import { siteGroups, sites } from "@/lib/drizzle/schema";
import { and, eq } from "drizzle-orm";

export async function createGroupAction(formData: FormData) {
  const user = await requireUser({ redirectTo: "/sites/groups" });
  const db = resolveDb({ runtimeHint: "edge" }) as any;
  const name = normalizeRequired(formData.get("name"));
  const description = normalizeOptional(formData.get("description"));
  const color = normalizeOptional(formData.get("color"));
  if (!name) {
    redirect(`/sites/groups?error=missing_name`);
  }

  const id = randomUUID();
  await db.insert(siteGroups).values({
    id,
    ownerId: user.id,
    name,
    description: description || null,
    color: color || null,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidatePath("/sites/groups");
  revalidatePath("/sites");
  redirect(`/sites/groups?created=${id}`);
}

export async function updateGroupAction(formData: FormData) {
  const user = await requireUser({ redirectTo: "/sites/groups" });
  const db = resolveDb({ runtimeHint: "edge" }) as any;
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect(`/sites/groups?error=missing_id`);
  const name = normalizeOptional(formData.get("name"));
  const description = normalizeOptional(formData.get("description"));
  const color = normalizeOptional(formData.get("color"));

  const [group] = await db
    .select({
      ownerId: siteGroups.ownerId,
      currentName: siteGroups.name,
      currentDescription: siteGroups.description,
      currentColor: siteGroups.color,
    })
    .from(siteGroups)
    .where(eq(siteGroups.id, id!))
    .limit(1);
  if (!group || group.ownerId !== user.id) redirect(`/sites/groups?error=not_found`);

  await db
    .update(siteGroups)
    .set({
      name: name || group.currentName,
      description: description ?? group.currentDescription,
      color: color ?? group.currentColor,
      updatedAt: new Date(),
    })
    .where(eq(siteGroups.id, id!));

  revalidatePath("/sites/groups");
  revalidatePath("/sites");
  redirect(`/sites/groups?updated=${id}`);
}

export async function deleteGroupAction(formData: FormData) {
  const user = await requireUser({ redirectTo: "/sites/groups" });
  const db = resolveDb({ runtimeHint: "edge" }) as any;
  const id = (formData.get("id") as string | null)?.trim();
  if (!id) redirect(`/sites/groups?error=missing_id`);

  const [group] = await db
    .select({ ownerId: siteGroups.ownerId })
    .from(siteGroups)
    .where(eq(siteGroups.id, id!))
    .limit(1);
  if (!group || group.ownerId !== user.id) redirect(`/sites/groups?error=not_found`);

  await db.delete(siteGroups).where(eq(siteGroups.id, id!));
  await db
    .update(sites)
    .set({ groupId: null, updatedAt: new Date() })
    .where(and(eq(sites.ownerId, user.id), eq(sites.groupId, id!)));

  revalidatePath("/sites/groups");
  revalidatePath("/sites");
  redirect(`/sites/groups?deleted=${id}`);
}

function normalizeRequired(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

function normalizeOptional(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed || null;
}

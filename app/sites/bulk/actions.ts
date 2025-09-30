'use server';

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { siteGroups, sites } from "@/lib/drizzle/schema";
import { and, eq, inArray } from "drizzle-orm";

type BulkAction = "assignGroup" | "clearGroup" | "appendTag" | "removeTag" | "replaceTags";

export async function performBulkAction(formData: FormData) {
  const user = await requireUser({ redirectTo: "/sites/bulk" });
  const siteIds = formData.getAll("siteId").map(String).filter(Boolean);
  if (!siteIds.length) redirect(`/sites/bulk?error=no_selection`);

  const action = String(formData.get("actionType") ?? "").trim() as BulkAction;
  switch (action) {
    case "assignGroup": {
      const groupId = (formData.get("groupId") as string | null)?.trim();
      if (!groupId) redirect(`/sites/bulk?error=missing_group`);
      const [group] = await db
        .select({ ownerId: siteGroups.ownerId })
        .from(siteGroups)
        .where(eq(siteGroups.id, groupId))
        .limit(1);
      if (!group || group.ownerId !== user.id) redirect(`/sites/bulk?error=group_not_found`);
      await db
        .update(sites)
        .set({ groupId, updatedAt: new Date() })
        .where(and(eq(sites.ownerId, user.id), inArray(sites.id, siteIds)));
      break;
    }
    case "clearGroup": {
      await db
        .update(sites)
        .set({ groupId: null, updatedAt: new Date() })
        .where(and(eq(sites.ownerId, user.id), inArray(sites.id, siteIds)));
      break;
    }
    case "appendTag": {
      const tag = normalizeTag(formData.get("tagValue"));
      if (!tag) redirect(`/sites/bulk?error=missing_tag`);
      await mutateTags(siteIds, user.id, (tags) => addTag(tags, tag));
      break;
    }
    case "removeTag": {
      const tag = normalizeTag(formData.get("tagValue"));
      if (!tag) redirect(`/sites/bulk?error=missing_tag`);
      await mutateTags(siteIds, user.id, (tags) => removeTag(tags, tag));
      break;
    }
    case "replaceTags": {
      const raw = normalizeTag(formData.get("tagList"));
      const tags = raw ? raw.split(",").map((item) => item.trim()).filter(Boolean) : [];
      await mutateTags(siteIds, user.id, () => tags);
      break;
    }
    default:
      redirect(`/sites/bulk?error=unknown_action`);
  }

  revalidatePath("/sites");
  revalidatePath("/dashboard");
  redirect(`/sites/bulk?success=1&count=${siteIds.length}`);
}

async function mutateTags(
  siteIds: string[],
  ownerId: string,
  updater: (tags: string[]) => string[],
) {
  const rows = await db
    .select({ id: sites.id, tags: sites.tags })
    .from(sites)
    .where(and(eq(sites.ownerId, ownerId), inArray(sites.id, siteIds)));

  for (const row of rows) {
    const current = parseTags(row.tags);
    const updated = Array.from(new Set(updater(current))).filter(Boolean);
    await db
      .update(sites)
      .set({ tags: updated.length ? JSON.stringify(updated) : null, updatedAt: new Date() })
      .where(eq(sites.id, row.id));
  }
}

function parseTags(value: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed))
      return parsed.filter((item) => typeof item === "string" && item.trim()).map((s) => s.trim());
  } catch {}
  return [] as string[];
}

function addTag(tags: string[], tag: string) {
  return tags.includes(tag) ? tags : [...tags, tag];
}

function removeTag(tags: string[], tag: string) {
  return tags.filter((item) => item !== tag);
}

function normalizeTag(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return "";
  return value.trim();
}

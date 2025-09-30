'use server';

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { changes, sites } from "@/lib/drizzle/schema";
import { and, eq } from "drizzle-orm";

const ALLOWED_STATUS = new Set(["open", "in_progress", "resolved"]);

export async function updateChangeAssignmentAction(formData: FormData) {
  const user = await requireUser();
  const siteId = String(formData.get("siteId") ?? "").trim();
  const changeId = String(formData.get("changeId") ?? "").trim();
  if (!siteId || !changeId) return;

  const source = normalizeText(formData.get("source"));
  const assignee = normalizeText(formData.get("assignee"));
  const statusRaw = normalizeText(formData.get("status")) ?? "open";
  const status = ALLOWED_STATUS.has(statusRaw) ? statusRaw : "open";

  const [site] = await db
    .select({ ownerId: sites.ownerId })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1);
  if (!site || site.ownerId !== user.id) return;

  await db
    .update(changes)
    .set({
      source: source ?? null,
      assignee: assignee ?? null,
      status,
    })
    .where(and(eq(changes.id, changeId), eq(changes.siteId, siteId)));

  revalidatePath(`/sites/${siteId}`);
  revalidatePath(`/dashboard/tasks`);
}

function normalizeText(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

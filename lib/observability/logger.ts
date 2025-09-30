import { randomUUID } from "crypto";
import { db } from "@/lib/db";
import { observabilityLogs } from "@/lib/drizzle/schema";

type LogLevel = "info" | "warning" | "error";

export async function logEvent({
  type,
  scope,
  message,
  payload,
  requestId,
  level = "info",
}: {
  type: string;
  scope: string;
  message?: string;
  payload?: Record<string, unknown> | null;
  requestId?: string | null;
  level?: LogLevel;
}) {
  try {
    await db.insert(observabilityLogs).values({
      id: randomUUID(),
      type,
      scope,
      level,
      message: message ?? null,
      requestId: requestId ?? null,
      payload: payload ? JSON.stringify(payload) : null,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error("[Observability] failed to record log", { error, type, scope, message });
  }
}

export function buildTraceContext(requestId?: string | null) {
  return {
    requestId: requestId ?? randomUUID(),
  };
}

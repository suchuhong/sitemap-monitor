export function generateId(): string {
  if (typeof crypto?.randomUUID === "function") {
    return crypto.randomUUID();
  }
  throw new Error("randomUUID is not supported in this environment");
}

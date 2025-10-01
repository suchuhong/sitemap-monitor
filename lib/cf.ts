import type { D1Database } from "@cloudflare/workers-types";

/**
 * Safely read Cloudflare Pages D1 binding without importing next-on-pages in dev.
 * On Cloudflare Pages, next-on-pages stores the request context on a global symbol:
 *   Symbol.for("__cloudflare-request-context__") => { env, cf, ctx }
 * We inspect that symbol to extract env.DB when present.
 */
export function getCfBindingEnvSafely(): { DB: D1Database } | undefined {
  try {
    const sym = Symbol.for("__cloudflare-request-context__");
    // @ts-expect-error: symbol-based access
    const cfCtx = (globalThis as any)?.[sym];
    const db = cfCtx?.env?.DB as D1Database | undefined;
    if (db) return { DB: db };
  } catch {
    // noop
  }
  return undefined;
}

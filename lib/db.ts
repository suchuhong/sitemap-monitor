// lib/db.ts
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";

type LibSQLDatabase = ReturnType<typeof drizzleLibSQL>;
type D1DatabaseClient = ReturnType<typeof drizzleD1>;
export type DatabaseClient = LibSQLDatabase | D1DatabaseClient;

type D1Binding = { DB: D1Database };

type ResolveDbOpts = {
  /** Cloudflare D1 binding (Edge on Cloudflare Pages/Workers) */
  bindingEnv?: D1Binding;
  /** Remote libSQL/Turso URL (Edge-safe). Prefer passing this on Edge. */
  url?: string;
  /** Auth token for libSQL/Turso (Edge-safe). Prefer passing this on Edge. */
  authToken?: string;
  /** Force runtime (when you know the context). Otherwise auto-detect. */
  runtimeHint?: "edge" | "node";
};

const globalForDb = globalThis as typeof globalThis & {
  __libsqlDb?: DatabaseClient;
  __d1Db?: DatabaseClient;
};

function detectEdgeRuntime(hint?: "edge" | "node") {
  if (hint) return hint === "edge";
  // Next.js Edge has no process.cwd; in Workers it’s undefined entirely.
  // Keep detection conservative and side-effect free.
  // eslint-disable-next-line no-restricted-globals
  const hasProcess = typeof process !== "undefined";
  // If process exists but cwd is missing, we’re likely on Edge.
  // If process is undefined, also Edge.
  return !hasProcess || !(hasProcess && typeof (process as any).cwd === "function");
}

/**
 * Resolve a Drizzle client that is safe for the current runtime.
 * - Edge: uses D1 (if provided) or libSQL over HTTP via @libsql/client/web
 * - Node: uses @libsql/client (supports file: and remote URLs)
 */
export function resolveDb(opts: ResolveDbOpts = {}): DatabaseClient {
  const { bindingEnv, url: urlArg, authToken: tokenArg, runtimeHint } = opts;

  // 1) If Cloudflare D1 binding is present, prefer it on either runtime.
  if (bindingEnv?.DB) {
    if (!globalForDb.__d1Db) {
      globalForDb.__d1Db = drizzleD1(bindingEnv.DB);
    }
    return globalForDb.__d1Db;
  }

  const isEdge = detectEdgeRuntime(runtimeHint);

  // 2) Edge path: use @libsql/client/web (HTTP only). No file: URLs, no process.*
  if (isEdge) {
    if (!globalForDb.__libsqlDb) {
      const url = urlArg ?? (typeof process !== "undefined" ? process.env.TURSO_DATABASE_URL : undefined);
      const authToken = tokenArg ?? (typeof process !== "undefined" ? process.env.TURSO_AUTH_TOKEN : undefined);

      if (!url) {
        throw new Error(
          "Edge runtime: no database available. Provide a D1 binding or pass a remote libSQL URL via resolveDb({ url, authToken })."
        );
      }
      if (url.startsWith("file:")) {
        throw new Error("Edge runtime: file:// databases are not supported. Use a remote HTTP URL.");
      }

      // Import the Edge-safe client only on Edge
      const { createClient } = require("@libsql/client/web"); // dynamic require keeps Node bundle clean
      const client = createClient({ url, authToken });
      globalForDb.__libsqlDb = drizzleLibSQL(client);
    }
    return globalForDb.__libsqlDb!;
  }

  // 3) Node path: @libsql/client (supports file: and remote)
  if (!globalForDb.__libsqlDb) {
    // Prefer explicit args; fall back to env on Node
    let url = urlArg ?? process.env.DB_URL ?? process.env.TURSO_DATABASE_URL;
    const authToken = tokenArg ?? process.env.DB_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN;

    if (!url) {
      throw new Error(
        "Node runtime: no DB URL. Set DB_URL/TURSO_DATABASE_URL or pass resolveDb({ url, authToken })."
      );
    }

    // Support local file DBs on Node only
    if (url.startsWith("file:")) {
      // Normalize `file:` to `file://` with an absolute path
      let filePath = url.replace("file:", "");
      if (filePath.startsWith("./")) {
        filePath = `${process.cwd()}/${filePath.slice(2)}`;
      }
      if (!filePath.startsWith("/")) {
        // relative path without ./ — anchor to cwd
        filePath = `${process.cwd()}/${filePath}`;
      }
      url = `file://${filePath}`;
      // Optional: console.log("Using local SQLite file:", url);
    }

    const { createClient } = require("@libsql/client"); // Node client
    const client = createClient({ url, authToken });
    globalForDb.__libsqlDb = drizzleLibSQL(client);
  }

  return globalForDb.__libsqlDb!;
}

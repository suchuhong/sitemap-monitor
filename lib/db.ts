// lib/db.ts
import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";

export type DatabaseClient = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  __sqliteDb?: DatabaseClient;
};

/**
 * Resolve a Drizzle client using better-sqlite3 for local SQLite database.
 */
export function resolveDb(): DatabaseClient {
  if (!globalForDb.__sqliteDb) {
    const dbUrl = process.env.DB_URL || "file:./drizzle/local.sqlite";
    
    // Extract file path from file: URL
    const dbPath = dbUrl.startsWith("file:") ? dbUrl.slice(5) : dbUrl;
    
    const sqlite = new Database(dbPath);
    globalForDb.__sqliteDb = drizzle(sqlite);
  }

  return globalForDb.__sqliteDb;
}

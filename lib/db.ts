// lib/db.ts
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

export type DatabaseClient = ReturnType<typeof drizzle>;

const globalForDb = globalThis as typeof globalThis & {
  __pgPool?: Pool;
  __pgDb?: DatabaseClient;
};

/**
 * Resolve a Drizzle client using node-postgres for PostgreSQL database.
 */
export function resolveDb(): DatabaseClient {
  if (!globalForDb.__pgDb) {
    const connectionString = process.env.DATABASE_URL;
    
    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is not set");
    }
    
    // Create connection pool
    if (!globalForDb.__pgPool) {
      globalForDb.__pgPool = new Pool({
        connectionString,
        max: 20, // Maximum number of clients in the pool
        idleTimeoutMillis: 30000, // Close idle clients after 30 seconds
        connectionTimeoutMillis: 10000, // Return an error after 10 seconds if connection could not be established
      });
    }
    
    globalForDb.__pgDb = drizzle(globalForDb.__pgPool);
  }

  return globalForDb.__pgDb;
}

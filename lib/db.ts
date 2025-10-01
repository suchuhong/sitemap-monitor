import { createClient } from "@libsql/client";
import { drizzle as drizzleLibSQL } from "drizzle-orm/libsql";
import { drizzle as drizzleD1 } from "drizzle-orm/d1";
import type { D1Database } from "@cloudflare/workers-types";

type LibSQLDatabase = ReturnType<typeof drizzleLibSQL>;
type D1DatabaseClient = ReturnType<typeof drizzleD1>;

export type DatabaseClient = LibSQLDatabase & D1DatabaseClient;

type D1Binding = {
  DB: D1Database;
};

const globalForDb = globalThis as typeof globalThis & {
  __libsqlDb?: DatabaseClient;
  __d1Db?: DatabaseClient;
};

export function resolveDb(bindingEnv?: D1Binding): DatabaseClient {
  if (bindingEnv?.DB) {
    if (!globalForDb.__d1Db)
      globalForDb.__d1Db = drizzleD1(bindingEnv.DB) as DatabaseClient;
    return globalForDb.__d1Db;
  }

  if (!globalForDb.__libsqlDb) {
    const url = process.env.DB_URL;
    if (!url) {
      throw new Error(
        "DB_URL is required when Cloudflare D1 binding is not provided. Set DB_URL in environment or supply env.DB to resolveDb().",
      );
    }
    const client = createClient({
      url,
      authToken: process.env.DB_AUTH_TOKEN,
    });
    globalForDb.__libsqlDb = drizzleLibSQL(client) as DatabaseClient;
  }

  return globalForDb.__libsqlDb;
}

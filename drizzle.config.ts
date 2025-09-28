import type { Config } from "drizzle-kit";
export default {
  out: "./drizzle",
  schema: "./lib/drizzle/schema.ts",
  dialect: "sqlite",
  dbCredentials: { url: process.env.DB_URL! },
} satisfies Config;

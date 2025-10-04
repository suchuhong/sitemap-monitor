import type { Config } from "drizzle-kit";
export default {
  out: "./drizzle",
  schema: "./lib/drizzle/schema.ts",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
} satisfies Config;

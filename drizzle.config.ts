import type { Config } from "drizzle-kit";

const url = process.env.DATABASE_URL ?? "file:./data/stride.db";
const dbPath = url.startsWith("file:") ? url.slice("file:".length) : url;

export default {
  schema: "./src/lib/db/schema.ts",
  out: "./src/lib/db/migrations",
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
  verbose: true,
  strict: true,
} satisfies Config;

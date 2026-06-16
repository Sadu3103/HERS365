import type { Config } from "drizzle-kit";

export default {
  schema: "./schema.ts",
  // [D-04] Tracked, versioned migrations live here and are committed to the repo.
  // Apply with `drizzle-kit migrate` (never `push` in prod — push is destructive).
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL || "postgres://localhost:5432/hers365",
  },
} satisfies Config;

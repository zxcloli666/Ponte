import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/shared/database/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: Deno.env.get("DATABASE_URL") ?? "postgres://ponte:ponte@localhost:5432/ponte",
  },
  verbose: true,
  strict: true,
});

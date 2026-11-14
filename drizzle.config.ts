import { defineConfig } from "drizzle-kit";

// Load DATABASE_URL from .env.local when running npm run db:* on your laptop.
try {
  process.loadEnvFile(".env.local");
} catch {
  // no .env.local: use variables already in the environment
}

export default defineConfig({
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: { url: process.env.DATABASE_URL! },
});

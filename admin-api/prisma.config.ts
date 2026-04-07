import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

const adminApiRoot = __dirname;
const monorepoRoot = resolve(adminApiRoot, "..");

// Match app env layout: later files override (local `admin-api/.env` wins over repo `.env.dev`).
for (const envPath of [
  resolve(monorepoRoot, ".env.dev"),
  resolve(monorepoRoot, ".env"),
  resolve(adminApiRoot, ".env"),
  resolve(adminApiRoot, ".env.local"),
]) {
  if (existsSync(envPath)) {
    loadEnv({ path: envPath, override: true });
  }
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: process.env["DATABASE_URL"] as string,
    shadowDatabaseUrl: process.env["SHADOW_DATABASE_URL"],
  },
});
